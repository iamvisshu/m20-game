import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
}

const supabase = createClient(url, key, {
  realtime: { transport: ws },
})

async function fetchAll(table, columns = '*') {
  const pageSize = 1000
  const rows = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    rows.push(...(data ?? []))

    if (!data || data.length < pageSize) break
  }

  return rows
}

const [entities, questions, entityCategories, categories] = await Promise.all([
  fetchAll('entities', 'id,canonical_name,active'),
  fetchAll('questions', 'id,text,primary_attribute_id,active'),
  fetchAll('entity_categories', 'entity_id,category_id'),
  fetchAll('categories', 'id,name,active'),
])

const categoryById = new Map(categories.map(c => [c.id, c.name]))
const entityCategoryMap = new Map()

for (const row of entityCategories) {
  if (!entityCategoryMap.has(row.entity_id)) {
    entityCategoryMap.set(row.entity_id, [])
  }
  entityCategoryMap.get(row.entity_id).push(categoryById.get(row.category_id))
}

console.log('\nM20 CATEGORY QUESTION FIT ANALYSIS')
console.log('==================================')
console.log(`Entities: ${entities.length}`)
console.log(`Questions: ${questions.length}`)
console.log(`Categories: ${categories.length}`)

for (const category of categories.filter(c => c.active !== false)) {
  const categoryEntities = entities.filter(e =>
    (entityCategoryMap.get(e.id) ?? []).includes(category.name)
  )

  console.log(`\n${category.name}: ${categoryEntities.length} entities`)

  const relevant = []

  for (const question of questions.filter(q => q.active !== false)) {
    let yes = 0
    let no = 0

    // Category fit is intentionally diagnostic only in Batch 26A.
    // We identify questions with no discriminatory value inside a category.
    const { data, error } = await supabase
      .from('entity_attributes')
      .select('entity_id,value_boolean')
      .eq('attribute_id', question.primary_attribute_id)

    if (error) throw error

    const values = new Map((data ?? []).map(r => [r.entity_id, r.value_boolean]))

    for (const entity of categoryEntities) {
      if (values.get(entity.id) === true) yes++
      else if (values.get(entity.id) === false) no++
    }

    if (yes > 0 && no > 0) {
      relevant.push({
        question: question.text,
        yes,
        no,
      })
    }
  }

  console.log(`Discriminating questions: ${relevant.length}/${questions.length}`)

  if (relevant.length) {
    for (const item of relevant.slice(0, 10)) {
      console.log(`  - ${item.question} [YES ${item.yes} / NO ${item.no}]`)
    }
  }
}

console.log('\nCATEGORY QUESTION FIT ANALYSIS: PASS')
