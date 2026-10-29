import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const values = {};

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[match[1].trim()] = value;
  }

  return values;
}

const env = {
  ...readEnvFile(path.join(root, '.env')),
  ...readEnvFile(path.join(root, '.env.local')),
  ...process.env,
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const publishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !publishableKey) {
  console.error('\nMissing Supabase configuration.');
  console.error('Expected VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('in .env.local or the environment.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, publishableKey, {
  realtime: {
    transport: ws,
  },
});

console.log('\nM20 Real Dataset Evaluation');
console.log('============================');
console.log(`Supabase: ${supabaseUrl}`);

const { data: authData, error: authError } =
  await supabase.auth.signInAnonymously();

if (authError) {
  console.error('\nAnonymous authentication failed:');
  console.error(authError.message);
  process.exit(1);
}

if (!authData.session) {
  console.error('\nAnonymous authentication returned no session.');
  process.exit(1);
}

async function fetchAll(table, columns = '*') {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`\nFailed reading ${table}:`);
      console.error(error.message);
      process.exit(1);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return rows;
}

const [
  categories,
  entities,
  attributes,
  questions,
  entityCategories,
  entityAttributes,
  aliases,
] = await Promise.all([
  fetchAll('categories'),
  fetchAll('entities'),
  fetchAll('attributes'),
  fetchAll('questions'),
  fetchAll('entity_categories'),
  fetchAll('entity_attributes'),
  fetchAll('entity_aliases'),
]);

const activeCategories = categories.filter((row) => row.active !== false);
const activeEntities = entities.filter((row) => row.active !== false);
const activeAttributes = attributes.filter((row) => row.active !== false);
const activeQuestions = questions.filter((row) => row.active !== false);

const entityIds = new Set(activeEntities.map((row) => row.id));
const attributeIds = new Set(activeAttributes.map((row) => row.id));

const validEntityAttributes = entityAttributes.filter(
  (row) =>
    entityIds.has(row.entity_id) &&
    attributeIds.has(row.attribute_id),
);

const validEntityCategories = entityCategories.filter((row) =>
  entityIds.has(row.entity_id),
);

const validAliases = aliases.filter((row) =>
  entityIds.has(row.entity_id),
);

const validQuestions = activeQuestions.filter((row) =>
  attributeIds.has(row.primary_attribute_id),
);

const entityAttributeCounts = new Map(
  activeEntities.map((entity) => [entity.id, 0]),
);

for (const row of validEntityAttributes) {
  entityAttributeCounts.set(
    row.entity_id,
    (entityAttributeCounts.get(row.entity_id) ?? 0) + 1,
  );
}

const attributeEntityCounts = new Map(
  activeAttributes.map((attribute) => [attribute.id, 0]),
);

for (const row of validEntityAttributes) {
  attributeEntityCounts.set(
    row.attribute_id,
    (attributeEntityCounts.get(row.attribute_id) ?? 0) + 1,
  );
}

const categoryEntityCounts = new Map(
  activeCategories.map((category) => [category.id, 0]),
);

for (const row of validEntityCategories) {
  categoryEntityCounts.set(
    row.category_id,
    (categoryEntityCounts.get(row.category_id) ?? 0) + 1,
  );
}

const weakEntities = activeEntities
  .map((entity) => ({
    name: entity.canonical_name,
    attributeCount: entityAttributeCounts.get(entity.id) ?? 0,
  }))
  .filter((row) => row.attributeCount === 0)
  .sort((a, b) => a.name.localeCompare(b.name));

const weakAttributes = activeAttributes
  .map((attribute) => ({
    name: attribute.name,
    entityCount: attributeEntityCounts.get(attribute.id) ?? 0,
  }))
  .filter((row) => row.entityCount < 2)
  .sort((a, b) => a.entityCount - b.entityCount || a.name.localeCompare(b.name));

const orphanQuestions = activeQuestions
  .filter((question) => !attributeIds.has(question.primary_attribute_id))
  .map((question) => question.text);

const uncategorizedEntities = activeEntities
  .filter(
    (entity) =>
      !validEntityCategories.some(
        (row) => row.entity_id === entity.id,
      ),
  )
  .map((entity) => entity.canonical_name)
  .sort();

const entitiesWithoutAliases = activeEntities
  .filter(
    (entity) =>
      !validAliases.some(
        (row) => row.entity_id === entity.id,
      ),
  )
  .map((entity) => entity.canonical_name)
  .sort();

const attributeCoverageValues = activeEntities.map(
  (entity) => entityAttributeCounts.get(entity.id) ?? 0,
);

const averageAttributesPerEntity =
  attributeCoverageValues.length === 0
    ? 0
    : attributeCoverageValues.reduce((sum, value) => sum + value, 0) /
      attributeCoverageValues.length;

const report = {
  generatedAt: new Date().toISOString(),
  source: {
    supabaseUrl,
    authenticatedAnonymously: true,
  },
  dataset: {
    categories: activeCategories.length,
    entities: activeEntities.length,
    attributes: activeAttributes.length,
    questions: activeQuestions.length,
    aliases: validAliases.length,
    entityAttributes: validEntityAttributes.length,
    entityCategories: validEntityCategories.length,
  },
  coverage: {
    averageAttributesPerEntity,
    weakEntities,
    weakAttributes,
    orphanQuestions,
    uncategorizedEntities,
    entitiesWithoutAliases,
    questionsWithValidAttributes: validQuestions.length,
  },
};

console.log('\nDATASET');
console.log('-------');
console.log(`Categories:              ${report.dataset.categories}`);
console.log(`Entities:                ${report.dataset.entities}`);
console.log(`Attributes:              ${report.dataset.attributes}`);
console.log(`Questions:               ${report.dataset.questions}`);
console.log(`Aliases:                 ${report.dataset.aliases}`);
console.log(`Entity-attribute rows:   ${report.dataset.entityAttributes}`);
console.log(`Entity-category rows:    ${report.dataset.entityCategories}`);

console.log('\nCOVERAGE');
console.log('--------');
console.log(
  `Average attributes/entity: ${averageAttributesPerEntity.toFixed(2)}`,
);
console.log(
  `Questions with valid attributes: ${validQuestions.length}/${activeQuestions.length}`,
);
console.log(`Entities with zero attributes: ${weakEntities.length}`);
console.log(`Attributes with <2 entities: ${weakAttributes.length}`);
console.log(`Uncategorized entities: ${uncategorizedEntities.length}`);
console.log(`Entities without aliases: ${entitiesWithoutAliases.length}`);

if (weakEntities.length > 0) {
  console.log('\nWEAK ENTITIES');
  for (const row of weakEntities) {
    console.log(`- ${row.name}: ${row.attributeCount} attributes`);
  }
}

if (weakAttributes.length > 0) {
  console.log('\nWEAK ATTRIBUTES');
  for (const row of weakAttributes) {
    console.log(`- ${row.name}: ${row.entityCount} entities`);
  }
}

if (orphanQuestions.length > 0) {
  console.log('\nORPHAN QUESTIONS');
  for (const question of orphanQuestions) {
    console.log(`- ${question}`);
  }
}

if (uncategorizedEntities.length > 0) {
  console.log('\nUNCATEGORIZED ENTITIES');
  for (const entity of uncategorizedEntities) {
    console.log(`- ${entity}`);
  }
}

if (entitiesWithoutAliases.length > 0) {
  console.log('\nENTITIES WITHOUT ALIASES');
  for (const entity of entitiesWithoutAliases) {
    console.log(`- ${entity}`);
  }
}

const reportsDir = path.join(root, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const reportPath = path.join(reportsDir, 'dataset-evaluation.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(`\nReport written to: ${path.relative(root, reportPath)}`);
console.log('\nM20 real dataset evaluation completed successfully.');
