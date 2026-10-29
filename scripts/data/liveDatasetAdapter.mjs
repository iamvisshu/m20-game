import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY'
  )
}

const supabase = createClient(supabaseUrl, publishableKey, {
  realtime: {
    transport: ws,
  },
})

async function fetchTable(table, columns) {
  const rows = []
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to load ${table}: ${error.message}`)
    }

    rows.push(...(data ?? []))

    if (!data || data.length < pageSize) break
  }

  return rows
}
export async function adaptLiveDataset() {
  const [
    entities,
    attributes,
    questions,
    entityAttributes,
    categories,
    entityCategories,
  ] = await Promise.all([
    fetchTable(
      'entities',
      'id,canonical_name,description,active',
    ),
    fetchTable(
      'attributes',
      'id,name,value_type,description,active',
    ),
    fetchTable(
      'questions',
      'id,text,primary_attribute_id,question_family_id,active',
    ),
    fetchTable(
      'entity_attributes',
      'entity_id,attribute_id,value_boolean,confidence,evidence_count,positive_evidence,negative_evidence',
    ),
    fetchTable(
      'categories',
      'id,name,description,active',
    ),
    fetchTable(
      'entity_categories',
      'entity_id,category_id',
    ),
  ])

  // entity_aliases is intentionally not exposed to the anonymous
  // gameplay client by RLS. Aliases are not required by the game
  // engine itself, so the live engine adapter leaves them empty.
  // Entity resolution remains a separate concern.
  const domainEntities = entities.map((row) => ({
    id: row.id,
    canonicalName: row.canonical_name,
    aliases: [],
    ...(row.description ? { description: row.description } : {}),
    active: row.active,
  }))

  const domainAttributes = attributes.map((row) => ({
    id: row.id,
    name: row.name,
    valueType: row.value_type,
    ...(row.description ? { description: row.description } : {}),
    active: row.active,
  }))

  const domainQuestions = questions.map((row) => ({
    id: row.id,
    text: row.text,
    primaryAttributeId: row.primary_attribute_id,
    ...(row.question_family_id
      ? { questionFamilyId: row.question_family_id }
      : {}),
    active: row.active,
  }))

  const knowledgeByEntityAttribute = entityAttributes
    .filter(
      (row) =>
        row.value_boolean !== null &&
        row.confidence !== null &&
        row.evidence_count !== null,
    )
    .map((row) => ({
      entityId: row.entity_id,
      attributeId: row.attribute_id,
      value: row.value_boolean,
      confidence: row.confidence,
      evidenceCount: row.evidence_count,
      positiveEvidence: row.positive_evidence,
      negativeEvidence: row.negative_evidence,
    }))

  const categoriesByEntity = new Map()

  for (const row of entityCategories) {
    const current = categoriesByEntity.get(row.entity_id) ?? []
    current.push(row.category_id)
    categoriesByEntity.set(row.entity_id, current)
  }

  const activeEntities = domainEntities.filter((entity) => entity.active)
  const activeAttributes = domainAttributes.filter(
    (attribute) => attribute.active,
  )
  const activeQuestions = domainQuestions.filter((question) => question.active)

  const knowledgeMap = new Map(
    knowledgeByEntityAttribute.map((knowledge) => [
      `${knowledge.entityId}:${knowledge.attributeId}`,
      knowledge,
    ]),
  )

  const invalidQuestions = activeQuestions.filter(
    (question) =>
      !activeAttributes.some(
        (attribute) => attribute.id === question.primaryAttributeId,
      ),
  )

  const invalidKnowledge = knowledgeByEntityAttribute.filter(
    (knowledge) =>
      !activeEntities.some((entity) => entity.id === knowledge.entityId) ||
      !activeAttributes.some(
        (attribute) => attribute.id === knowledge.attributeId,
      ),
  )

  const uncategorizedEntities = activeEntities.filter(
    (entity) => !categoriesByEntity.has(entity.id),
  )

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      supabaseUrl,
      tables: [
        'entities',
        'entity_aliases',
        'attributes',
        'questions',
        'entity_attributes',
        'categories',
        'entity_categories',
      ],
    },
    entities: activeEntities,
    attributes: activeAttributes,
    questions: activeQuestions,
    categories,
    entityCategories,
    knowledge: knowledgeByEntityAttribute,
    knowledgeMap: Object.fromEntries(knowledgeMap),
    categoryIdsByEntity: Object.fromEntries(categoriesByEntity),
    summary: {
      entities: activeEntities.length,
      attributes: activeAttributes.length,
      questions: activeQuestions.length,
      categories: categories.length,
      entityAttributeRows: knowledgeByEntityAttribute.length,
      entityCategoryRows: entityCategories.length,
      invalidQuestions: invalidQuestions.length,
      invalidKnowledgeRows: invalidKnowledge.length,
      uncategorizedEntities: uncategorizedEntities.length,
    },
  }

  return output
}

async function main() {
  const output = await adaptLiveDataset()

  console.log('M20 Live Dataset → Domain Adapter')
  console.log('==================================')
  console.log(`Entities: ${output.summary.entities}`)
  console.log(`Attributes: ${output.summary.attributes}`)
  console.log(`Questions: ${output.summary.questions}`)
  console.log(`Categories: ${output.summary.categories}`)
  console.log(`Knowledge rows: ${output.summary.entityAttributeRows}`)
  console.log(`Entity-category rows: ${output.summary.entityCategoryRows}`)
  console.log()
  console.log(`Invalid questions: ${output.summary.invalidQuestions}`)
  console.log(`Invalid knowledge rows: ${output.summary.invalidKnowledgeRows}`)
  console.log(`Uncategorized entities: ${output.summary.uncategorizedEntities}`)

  if (output.summary.invalidQuestions > 0) {
    throw new Error(
      `Found ${output.summary.invalidQuestions} active question(s) with invalid attribute references.`,
    )
  }

  if (output.summary.invalidKnowledgeRows > 0) {
    throw new Error(
      `Found ${output.summary.invalidKnowledgeRows} knowledge row(s) with invalid references.`,
    )
  }

  console.log()
  console.log('DOMAIN ADAPTER: PASS')

  process.stdout.write(JSON.stringify(output, null, 2))
}

main().catch((error) => {
  console.error()
  console.error('DOMAIN ADAPTER: FAIL')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
