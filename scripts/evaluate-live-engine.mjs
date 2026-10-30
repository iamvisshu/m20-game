import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { adaptLiveDataset } from './data/liveDatasetAdapter.mjs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Load them from .env.local before running.'
  );
}

const supabase = createClient(supabaseUrl, publishableKey, {
  realtime: {
    transport: ws,
  },
});

const reportsDir = path.resolve('reports');
fs.mkdirSync(reportsDir, { recursive: true });

async function fetchTable(table, columns = '*') {
  const { data, error } = await supabase
    .from(table)
    .select(columns);

  if (error) {
    throw new Error(`Failed to load ${table}: ${error.message}`);
  }

  return data ?? [];
}

async function main() {
  console.log('M20 LIVE ENGINE EVALUATION');
  console.log('==========================');

  const [
    entities,
    attributes,
    questions,
    entityAttributes,
    entityCategories,
    categories,
  ] = await Promise.all([
    fetchTable('entities'),
    fetchTable('attributes'),
    fetchTable('questions'),
    fetchTable('entity_attributes'),
    fetchTable('entity_categories'),
    fetchTable('categories'),
  ]);

  console.log(`Entities: ${entities.length}`);
  console.log(`Attributes: ${attributes.length}`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Entity-attribute rows: ${entityAttributes.length}`);
  console.log(`Entity-category rows: ${entityCategories.length}`);
  console.log('');

  const rawDataset = {
    entities,
    attributes,
    questions,
    entityAttributes,
    entityCategories,
    categories,
  };

  const adapted = await adaptLiveDataset();

  const engineEntities = adapted.entities;
  const engineQuestions = adapted.questions;
  const knowledgeByEntityAttribute = new Map(
    adapted.knowledge.map((knowledge) => [
      `${knowledge.entityId}:${knowledge.attributeId}`,
      knowledge,
    ]),
  );

  console.log('ENGINE INPUT');
  console.log('------------');
  console.log(`Entities: ${engineEntities.length}`);
  console.log(`Questions: ${engineQuestions.length}`);
  console.log(`Knowledge entries: ${knowledgeByEntityAttribute.size}`);
  console.log('');

  const { runSimulation } = await import('../src/engine/simulation.ts');

  const candidateIds = engineEntities.map((entity) => entity.id);

  const report = runSimulation(
    candidateIds,
    engineQuestions,
    knowledgeByEntityAttribute,
    {
      maxQuestions: 20,
      minGuessConfidence: 0.65,
      minGuessGap: 0.2,
    }
  );

  console.log('SIMULATION');
  console.log('----------');
  console.log(`Accuracy: ${(report.accuracy * 100).toFixed(2)}%`);
  console.log(`Average questions: ${report.averageQuestions.toFixed(2)}`);
  console.log(`Median questions: ${report.medianQuestions}`);
  console.log(`Max questions: ${report.maxQuestions}`);
  console.log(`Early guesses: ${(report.earlyGuessRate * 100).toFixed(2)}%`);
  console.log(`No-question games: ${report.noQuestionGames}`);
  console.log(`Wrong guesses: ${report.wrongGuesses}`);
  console.log(`Final confidence: ${report.averageFinalConfidence.toFixed(4)}`);
  console.log(`Confidence gap: ${report.averageConfidenceGap.toFixed(4)}`);
  console.log(`Effectiveness: ${report.effectiveness.toFixed(4)}`);
  console.log('');

  const failedEntities = report.perEntity
    .filter((result) => !result.correct)
    .map((result) => ({
      targetEntityId: result.targetEntityId,
      guessedEntityId: result.guessedEntityId,
      questionsAsked: result.questionsAsked,
      finalConfidence: result.finalConfidence,
      confidenceGap: result.confidenceGap,
    }));

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      supabaseUrl,
      dataset: {
        categories: categories.length,
        entities: entities.length,
        attributes: attributes.length,
        questions: questions.length,
        entityAttributes: entityAttributes.length,
        entityCategories: entityCategories.length,
      },
    },
    engineInput: {
      entities: engineEntities.length,
      questions: engineQuestions.length,
      knowledgeEntries: knowledgeByEntityAttribute.size,
    },
    config: {
      maxQuestions: 20,
      minGuessConfidence: 0.65,
      minGuessGap: 0.2,
    },
    metrics: {
      accuracy: report.accuracy,
      averageQuestions: report.averageQuestions,
      medianQuestions: report.medianQuestions,
      maxQuestions: report.maxQuestions,
      earlyGuessRate: report.earlyGuessRate,
      noQuestionGames: report.noQuestionGames,
      wrongGuesses: report.wrongGuesses,
      averageFinalConfidence: report.averageFinalConfidence,
      averageConfidenceGap: report.averageConfidenceGap,
      effectiveness: report.effectiveness,
    },
    failedEntities,
    perEntity: report.perEntity,
  };

  const outputPath = path.join(reportsDir, 'live-engine-evaluation.json');

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8'
  );

  console.log(`Report written to: ${outputPath}`);

  if (engineEntities.length === 0) {
    throw new Error('LIVE ENGINE EVALUATION: FAIL — no entities available.');
  }

  if (engineQuestions.length === 0) {
    throw new Error('LIVE ENGINE EVALUATION: FAIL — no questions available.');
  }

  if (knowledgeByEntityAttribute.size === 0) {
    throw new Error(
      'LIVE ENGINE EVALUATION: FAIL — no knowledge entries available.'
    );
  }

  console.log('');
  console.log('LIVE ENGINE EVALUATION: PASS');
}

main().catch((error) => {
  console.error('');
  console.error('LIVE ENGINE EVALUATION: FAIL');
  console.error(error);
  process.exit(1);
});
