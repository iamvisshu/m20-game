import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { adaptLiveDataset } from '../scripts/data/liveDatasetAdapter.mjs'
import { runSimulation } from '../src/engine/simulation'

describe('M20 live engine evaluation', () => {
  it(
    'runs the real engine against the live Supabase dataset',
    async () => {
      console.log('\nM20 LIVE ENGINE EVALUATION')
      console.log('==========================\n')

      const adapted = await adaptLiveDataset()

      const engineEntities = adapted.entities
      const engineQuestions = adapted.questions

      const knowledgeByEntityAttribute = new Map(
        adapted.knowledge.map((knowledge) => [
          `${knowledge.entityId}:${knowledge.attributeId}`,
          knowledge,
        ]),
      )

      console.log('ENGINE INPUT')
      console.log('------------')
      console.log(`Entities: ${engineEntities.length}`)
      console.log(`Questions: ${engineQuestions.length}`)
      console.log(`Knowledge entries: ${knowledgeByEntityAttribute.size}`)
      console.log('')

      expect(engineEntities).toHaveLength(53)
      expect(engineQuestions).toHaveLength(34)
      expect(knowledgeByEntityAttribute.size).toBe(1802)

      console.log('DIAGNOSTIC')
      console.log('----------')

      const sampleQuestion = engineQuestions[0]
      console.log('Sample question:', JSON.stringify(sampleQuestion, null, 2))

      const sampleKnowledge = Array.from(
        knowledgeByEntityAttribute.values(),
      ).slice(0, 10)

      console.log(
        'Sample knowledge:',
        JSON.stringify(sampleKnowledge, null, 2),
      )

      const matchingKnowledge = Array.from(
        knowledgeByEntityAttribute.values(),
      ).filter(
        (knowledge) =>
          knowledge.attributeId === sampleQuestion.primaryAttributeId,
      )

      console.log(
        `Knowledge rows matching first question attribute: ${matchingKnowledge.length}`,
      )

      const matchingEntities = new Set(
        matchingKnowledge.map((knowledge) => knowledge.entityId),
      )

      console.log(
        `Distinct entities with first question attribute: ${matchingEntities.size}`,
      )
      console.log('')

      const candidateIds = engineEntities.map((entity) => entity.id)

      const report = runSimulation(
        candidateIds,
        engineQuestions,
        knowledgeByEntityAttribute,
        {
          gamesPerEntity: 1,
          seed: 20261029,
          answerProfile: 'EXACT',
          engineConfig: {
            maxQuestions: 20,
            minGuessConfidence: 0.65,
            minGuessGap: 0.2,
          },
        },
      )

      console.log('SIMULATION')
      console.log('----------')
      console.log(`Total games: ${report.totalGames}`)
      console.log(`Correct games: ${report.correctGames}`)
      console.log(`Wrong games: ${report.wrongGames}`)
      console.log(`Accuracy: ${(report.accuracy * 100).toFixed(2)}%`)
      console.log(`Average questions: ${report.averageQuestions.toFixed(2)}`)
      console.log(`Median questions: ${report.medianQuestions}`)
      console.log(`Max questions: ${report.maxQuestions}`)
      console.log(
        `Question-limit rate: ${(report.questionLimitRate * 100).toFixed(2)}%`,
      )
      console.log(
        `Early guesses: ${(report.earlyGuessRate * 100).toFixed(2)}%`,
      )
      console.log(
        `No-question games: ${(report.noQuestionsRemainingRate * 100).toFixed(2)}%`,
      )
      console.log(
        `Wrong guesses: ${(report.wrongGuessRate * 100).toFixed(2)}%`,
      )
      console.log(
        `Final confidence: ${report.averageFinalConfidence.toFixed(4)}`,
      )
      console.log(
        `Confidence gap: ${report.averageFinalConfidenceGap.toFixed(4)}`,
      )
      console.log(
        `Effectiveness: ${report.averageQuestionEffectiveness.toFixed(4)}`,
      )
      console.log(
        `Final candidate count: ${report.averageFinalCandidateCount.toFixed(2)}`,
      )
      console.log('')

      const failedEntities = Object.entries(report.perEntity)
        .filter(([, result]) => result.accuracy < 1)
        .map(([targetEntityId, result]) => ({
          targetEntityId,
          ...result,
        }))

      const output = {
        generatedAt: new Date().toISOString(),
        dataset: {
          entities: engineEntities.length,
          questions: engineQuestions.length,
          knowledgeEntries: knowledgeByEntityAttribute.size,
        },
        config: {
          gamesPerEntity: 1,
          seed: 20261029,
          answerProfile: 'EXACT',
          maxQuestions: 20,
          minGuessConfidence: 0.65,
          minGuessGap: 0.2,
        },
        report,
        failedEntities,
      }

      const reportsDir = path.resolve('reports')
      fs.mkdirSync(reportsDir, { recursive: true })

      const reportPath = path.join(
        reportsDir,
        'live-engine-evaluation.json',
      )

      fs.writeFileSync(
        reportPath,
        JSON.stringify(output, null, 2) + '\n',
      )

      expect(report.totalGames).toBe(53)
      expect(report.correctGames + report.wrongGames).toBe(
        report.totalGames,
      )
      expect(report.totalGames).toBeGreaterThan(0)
      expect(report.accuracy).toBeGreaterThanOrEqual(0)
      expect(report.accuracy).toBeLessThanOrEqual(1)

      console.log(`Failed entities: ${failedEntities.length}`)
      console.log(`Report written to: ${reportPath}`)
      console.log('\nLIVE ENGINE EVALUATION: PASS')
    },
    120_000,
  )
})
