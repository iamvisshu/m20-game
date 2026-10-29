import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import ws from 'ws'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws },
})

async function fetchAll(table, columns) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)

  if (error) throw new Error(`${table}: ${error.message}`)
  return data ?? []
}

const [entities, questions, knowledge] = await Promise.all([
  fetchAll('entities', 'id,canonical_name,active'),
  fetchAll('questions', 'id,text,primary_attribute_id,active'),
  fetchAll(
    'entity_attributes',
    'entity_id,attribute_id,value_boolean,confidence,evidence_count,positive_evidence,negative_evidence',
  ),
])

const activeEntities = entities.filter((e) => e.active !== false)
const activeQuestions = questions.filter(
  (q) => q.active !== false && q.primary_attribute_id,
)

const existing = new Set(
  knowledge.map((k) => `${k.entity_id}:${k.attribute_id}`),
)

const proposals = []

for (const entity of activeEntities) {
  for (const question of activeQuestions) {
    const key = `${entity.id}:${question.primary_attribute_id}`

    if (existing.has(key)) continue

    proposals.push({
      entity_id: entity.id,
      entity: entity.canonical_name,
      question_id: question.id,
      question: question.text,
      attribute_id: question.primary_attribute_id,
      classification: 'REVIEW_REQUIRED',
      value_boolean: null,
      confidence: null,
      reason: 'Missing question-attribute knowledge; requires curated truth.',
    })
  }
}

const output = {
  generated_at: new Date().toISOString(),
  summary: {
    entities: activeEntities.length,
    questions: activeQuestions.length,
    existing_knowledge_rows: knowledge.length,
    missing_pairs: proposals.length,
    auto_safe: 0,
    review_required: proposals.length,
  },
  proposals,
}

const reportDir = path.resolve('reports')
fs.mkdirSync(reportDir, { recursive: true })

const outputPath = path.join(reportDir, 'knowledge-matrix-proposal.json')
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)

console.log('\nM20 KNOWLEDGE MATRIX GENERATOR')
console.log('==============================')
console.log(`Entities: ${activeEntities.length}`)
console.log(`Questions: ${activeQuestions.length}`)
console.log(`Existing knowledge: ${knowledge.length}`)
console.log(`Missing pairs: ${proposals.length}`)
console.log(`AUTO_SAFE: 0`)
console.log(`REVIEW_REQUIRED: ${proposals.length}`)
console.log(`Report: ${outputPath}`)
console.log('\nKNOWLEDGE MATRIX GENERATION: PASS')
