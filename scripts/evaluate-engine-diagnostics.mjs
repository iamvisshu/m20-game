import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const envPath = path.resolve('.env.local')
const env = fs.readFileSync(envPath, 'utf8')

const supabaseUrl =
  env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim()

const publishableKey =
  env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1]?.trim()

if (!supabaseUrl || !publishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

const supabase = createClient(supabaseUrl, publishableKey, {
  realtime: { transport: ws },
})

const tables = {
  entities: 'entities',
  attributes: 'attributes',
  questions: 'questions',
  knowledge: 'entity_attributes',
}

async function load(table) {
  const rows = []
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(`${table}: ${error.message}`)

    rows.push(...(data ?? []))

    if (!data || data.length < pageSize) break
  }

  return rows
}

const entities = await load(tables.entities)
const attributes = await load(tables.attributes)
const questions = await load(tables.questions)
const knowledge = await load(tables.knowledge)

const questionAttributeIds = new Set(
  questions.map((q) => q.primary_attribute_id),
)

const knowledgeByEntity = new Map()
const knowledgeByAttribute = new Map()

for (const row of knowledge) {
  if (!questionAttributeIds.has(row.attribute_id)) continue

  if (!knowledgeByEntity.has(row.entity_id)) {
    knowledgeByEntity.set(row.entity_id, [])
  }

  knowledgeByEntity.get(row.entity_id).push(row)

  if (!knowledgeByAttribute.has(row.attribute_id)) {
    knowledgeByAttribute.set(row.attribute_id, [])
  }

  knowledgeByAttribute.get(row.attribute_id).push(row)
}

const attributeNameById = new Map(
  attributes.map((a) => [a.id, a.name]),
)

const entityNameById = new Map(
  entities.map((e) => [e.id, e.canonical_name]),
)

const entityCoverage = entities
  .map((entity) => {
    const rows = knowledgeByEntity.get(entity.id) ?? []
    const known = new Set(rows.map((r) => r.attribute_id))

    return {
      entity: entity.canonical_name,
      known: known.size,
      coverage: known.size / questions.length,
    }
  })
  .sort((a, b) => a.coverage - b.coverage)

const attributeCoverage = questions
  .map((question) => {
    const rows = knowledgeByAttribute.get(question.primary_attribute_id) ?? []
    const knownEntities = new Set(rows.map((r) => r.entity_id))

    return {
      attributeId: question.primary_attribute_id,
      attribute:
        attributeNameById.get(question.primary_attribute_id) ?? 'UNKNOWN',
      question: question.text,
      known: knownEntities.size,
      coverage: knownEntities.size / entities.length,
    }
  })
  .sort((a, b) => a.coverage - b.coverage)

const contradictions = knowledge
  .filter((row) => questionAttributeIds.has(row.attribute_id))
  .filter(
    (row) =>
      row.positive_evidence > 0 &&
      row.negative_evidence > 0,
  )
  .map((row) => ({
    entity: entityNameById.get(row.entity_id) ?? row.entity_id,
    attribute:
      attributeNameById.get(row.attribute_id) ?? row.attribute_id,
    value: row.value_boolean,
    confidence: row.confidence,
    evidenceCount: row.evidence_count,
    positiveEvidence: row.positive_evidence,
    negativeEvidence: row.negative_evidence,
  }))

const report = {
  generatedAt: new Date().toISOString(),

  dataset: {
    entities: entities.length,
    attributes: attributes.length,
    questions: questions.length,
    knowledgeRows: knowledge.length,
  },

  entityCoverage,

  weakestAttributes: attributeCoverage.slice(0, 15),

  strongestAttributes: [...attributeCoverage]
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 15),

  contradictions,

  diagnosis: {
    averageEntityCoverage:
      entityCoverage.reduce((sum, x) => sum + x.coverage, 0) /
      entityCoverage.length,

    entitiesBelow50Percent:
      entityCoverage.filter((x) => x.coverage < 0.5).length,

    attributesBelow50Percent:
      attributeCoverage.filter((x) => x.coverage < 0.5).length,

    contradictoryKnowledgeRows: contradictions.length,

    likelyBottleneck:
      contradictions.length > 0
        ? 'KNOWLEDGE_CONTRADICTIONS'
        : attributeCoverage.filter((x) => x.coverage < 0.5).length >
            questions.length * 0.5
          ? 'KNOWLEDGE_COVERAGE'
          : 'ENGINE_SCORING_OR_QUESTION_SELECTION',
  },
}

fs.mkdirSync('reports', { recursive: true })

const output = path.resolve('reports/engine-diagnostics.json')

fs.writeFileSync(
  output,
  JSON.stringify(report, null, 2) + '\n',
)

console.log('')
console.log('M20 ENGINE DIAGNOSTICS')
console.log('======================')
console.log('')
console.log(`Entities: ${entities.length}`)
console.log(`Questions: ${questions.length}`)
console.log(`Knowledge rows: ${knowledge.length}`)
console.log('')
console.log('ENTITY COVERAGE')
console.log('---------------')

for (const row of entityCoverage.slice(0, 15)) {
  console.log(
    `- ${row.entity}: ${row.known}/${questions.length} (${(row.coverage * 100).toFixed(2)}%)`,
  )
}

console.log('')
console.log('WEAKEST ATTRIBUTES')
console.log('------------------')

for (const row of attributeCoverage.slice(0, 15)) {
  console.log(
    `- ${row.attribute}: ${row.known}/${entities.length} (${(row.coverage * 100).toFixed(2)}%)`,
  )
}

console.log('')
console.log(`Contradictory knowledge rows: ${contradictions.length}`)
console.log(
  `Entities below 50% coverage: ${report.diagnosis.entitiesBelow50Percent}`,
)
console.log(
  `Attributes below 50% coverage: ${report.diagnosis.attributesBelow50Percent}`,
)
console.log('')
console.log(
  `LIKELY BOTTLENECK: ${report.diagnosis.likelyBottleneck}`,
)
console.log('')
console.log(`Report written to: ${output}`)
console.log('')
