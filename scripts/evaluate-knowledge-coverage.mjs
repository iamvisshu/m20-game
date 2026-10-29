import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Check .env.local.',
  )
}

const supabase = createClient(supabaseUrl, publishableKey, {
  realtime: {
    transport: ws,
  },
})

async function fetchTable(table, columns = '*') {
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
function percentage(value, total) {
  return total === 0 ? 0 : (value / total) * 100
}

async function main() {
  console.log('\nM20 KNOWLEDGE COVERAGE EVALUATION')
  console.log('=================================\n')

  const [
    entities,
    attributes,
    questions,
    entityAttributes,
  ] = await Promise.all([
    fetchTable(
      'entities',
      'id,canonical_name,active',
    ),
    fetchTable(
      'attributes',
      'id,name,active',
    ),
    fetchTable(
      'questions',
      'id,text,primary_attribute_id,active',
    ),
    fetchTable(
      'entity_attributes',
      'entity_id,attribute_id,value_boolean,confidence,evidence_count,positive_evidence,negative_evidence',
    ),
  ])

  const activeEntities = entities.filter((entity) => entity.active)
  const activeAttributes = attributes.filter((attribute) => attribute.active)
  const activeQuestions = questions.filter((question) => question.active)

  const entityById = new Map(
    activeEntities.map((entity) => [entity.id, entity]),
  )

  const attributeById = new Map(
    activeAttributes.map((attribute) => [attribute.id, attribute]),
  )

  const knownPairs = new Map(
    entityAttributes.map((row) => [
      `${row.entity_id}:${row.attribute_id}`,
      row,
    ]),
  )

  const questionAttributeIds = new Set(
    activeQuestions
      .map((question) => question.primary_attribute_id)
      .filter(Boolean),
  )

  const entityCoverage = activeEntities
    .map((entity) => {
      const known = activeAttributes.filter((attribute) =>
        knownPairs.has(`${entity.id}:${attribute.id}`),
      )

      const questionRelevantKnown = activeQuestions.filter((question) =>
        knownPairs.has(`${entity.id}:${question.primary_attribute_id}`),
      )

      return {
        entityId: entity.id,
        entity: entity.canonical_name,
        knownAttributes: known.length,
        totalAttributes: activeAttributes.length,
        coveragePercent: Number(
          percentage(known.length, activeAttributes.length).toFixed(2),
        ),
        knownQuestionAttributes: questionRelevantKnown.length,
        totalQuestions: activeQuestions.length,
        questionCoveragePercent: Number(
          percentage(
            questionRelevantKnown.length,
            activeQuestions.length,
          ).toFixed(2),
        ),
      }
    })
    .sort((a, b) => a.coveragePercent - b.coveragePercent)

  const attributeCoverage = activeAttributes
    .map((attribute) => {
      const knownEntities = activeEntities.filter((entity) =>
        knownPairs.has(`${entity.id}:${attribute.id}`),
      )

      const isQuestionAttribute = questionAttributeIds.has(attribute.id)

      return {
        attributeId: attribute.id,
        attribute: attribute.name,
        isQuestionAttribute,
        knownEntities: knownEntities.length,
        totalEntities: activeEntities.length,
        coveragePercent: Number(
          percentage(
            knownEntities.length,
            activeEntities.length,
          ).toFixed(2),
        ),
      }
    })
    .sort((a, b) => {
      if (a.isQuestionAttribute !== b.isQuestionAttribute) {
        return a.isQuestionAttribute ? -1 : 1
      }

      return a.coveragePercent - b.coveragePercent
    })

  const missingPairs = []

  for (const entity of activeEntities) {
    for (const attribute of activeAttributes) {
      const key = `${entity.id}:${attribute.id}`

      if (!knownPairs.has(key)) {
        const isQuestionAttribute = questionAttributeIds.has(attribute.id)

        missingPairs.push({
          entityId: entity.id,
          entity: entity.canonical_name,
          attributeId: attribute.id,
          attribute: attribute.name,
          isQuestionAttribute,
          priority: isQuestionAttribute ? 'HIGH' : 'NORMAL',
        })
      }
    }
  }

  const highPriorityMissingPairs = missingPairs.filter(
    (pair) => pair.isQuestionAttribute,
  )

  const entitiesWithLowCoverage = entityCoverage.filter(
    (entity) => entity.questionCoveragePercent < 50,
  )

  const weakQuestionAttributes = attributeCoverage.filter(
    (attribute) =>
      attribute.isQuestionAttribute &&
      attribute.coveragePercent < 50,
  )

  const totalPossiblePairs =
    activeEntities.length * activeAttributes.length

  const overallCoverage = percentage(
    knownPairs.size,
    totalPossiblePairs,
  )

  const report = {
    generatedAt: new Date().toISOString(),

    summary: {
      entities: activeEntities.length,
      attributes: activeAttributes.length,
      questions: activeQuestions.length,
      knowledgeRows: entityAttributes.length,

      possibleEntityAttributePairs: totalPossiblePairs,
      knownEntityAttributePairs: knownPairs.size,
      missingEntityAttributePairs: missingPairs.length,

      overallCoveragePercent: Number(
        overallCoverage.toFixed(2),
      ),

      questionAttributeCoveragePercent: Number(
        percentage(
          activeQuestions.filter((question) =>
            attributeCoverage.some(
              (attribute) =>
                attribute.attributeId === question.primary_attribute_id &&
                attribute.coveragePercent > 0,
            ),
          ).length,
          activeQuestions.length,
        ).toFixed(2),
      ),

      highPriorityMissingPairs: highPriorityMissingPairs.length,
      entitiesBelow50PercentQuestionCoverage:
        entitiesWithLowCoverage.length,
      weakQuestionAttributes: weakQuestionAttributes.length,
    },

    entityCoverage,

    attributeCoverage,

    priorityMissingKnowledge: highPriorityMissingPairs,

    allMissingKnowledge: missingPairs,
  }

  const reportsDir = path.resolve('reports')
  fs.mkdirSync(reportsDir, { recursive: true })

  const reportPath = path.join(
    reportsDir,
    'knowledge-coverage.json',
  )

  fs.writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2) + '\n',
  )

  console.log('DATASET')
  console.log('-------')
  console.log(`Entities: ${activeEntities.length}`)
  console.log(`Attributes: ${activeAttributes.length}`)
  console.log(`Questions: ${activeQuestions.length}`)
  console.log(`Knowledge rows: ${entityAttributes.length}`)
  console.log('')

  console.log('COVERAGE')
  console.log('--------')
  console.log(
    `Possible entity-attribute pairs: ${totalPossiblePairs}`,
  )
  console.log(
    `Known entity-attribute pairs: ${knownPairs.size}`,
  )
  console.log(
    `Missing entity-attribute pairs: ${missingPairs.length}`,
  )
  console.log(
    `Overall knowledge coverage: ${overallCoverage.toFixed(2)}%`,
  )
  console.log('')

  console.log('HIGH PRIORITY')
  console.log('-------------')
  console.log(
    `Missing question-attribute pairs: ${highPriorityMissingPairs.length}`,
  )
  console.log(
    `Entities below 50% question coverage: ${entitiesWithLowCoverage.length}`,
  )
  console.log(
    `Weak question attributes: ${weakQuestionAttributes.length}`,
  )
  console.log('')

  console.log('LOWEST ENTITY QUESTION COVERAGE')
  console.log('-------------------------------')

  for (const entity of entitiesWithLowCoverage.slice(0, 15)) {
    console.log(
      `- ${entity.entity}: ${entity.questionCoveragePercent}% (${entity.knownQuestionAttributes}/${entity.totalQuestions})`,
    )
  }

  console.log('')

  console.log('WEAKEST QUESTION ATTRIBUTES')
  console.log('---------------------------')

  for (const attribute of weakQuestionAttributes.slice(0, 15)) {
    console.log(
      `- ${attribute.attribute}: ${attribute.coveragePercent}% (${attribute.knownEntities}/${attribute.totalEntities})`,
    )
  }

  console.log('')

  console.log('TOP PRIORITY MISSING KNOWLEDGE')

  for (const pair of highPriorityMissingPairs.slice(0, 30)) {
    console.log(
      `- ${pair.entity} → ${pair.attribute}`,
    )
  }

  console.log('')
  console.log(`Report written to: ${reportPath}`)
  console.log('\nKNOWLEDGE COVERAGE EVALUATION: PASS')
}

main().catch((error) => {
  console.error('\nKNOWLEDGE COVERAGE EVALUATION: FAIL')
  console.error(error)
  process.exit(1)
})
