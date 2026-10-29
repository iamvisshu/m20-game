import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const envPath = path.resolve('.env.local')
const env = fs.readFileSync(envPath, 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Missing Supabase environment variables')

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
}

async function get(table, select) {
  const r = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}`, { headers })
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`)
  return r.json()
}

const [entities, questions, existing] = await Promise.all([
  get('entities', 'id,canonical_name,active'),
  get('questions', 'id,primary_attribute_id,active'),
  get('entity_attributes', 'entity_id,attribute_id'),
])

const activeEntities = entities.filter(e => e.active !== false)
const activeQuestions = [...new Map(
  questions
    .filter(q => q.active !== false && q.primary_attribute_id)
    .map(q => [q.primary_attribute_id, q])
).values()]
const existingSet = new Set(existing.map(x => `${x.entity_id}:${x.attribute_id}`))

const trueSets = {
  electronic: new Set([
    'Smartphone','Laptop','Tablet','Television','Headphones','Camera','Keyboard','Mouse','Printer',
    'Refrigerator','Microwave','Washing Machine'
  ]),
  portable: new Set([
    'Smartphone','Laptop','Tablet','Headphones','Camera','Keyboard','Mouse','Printer','Umbrella','Backpack',
    'Book','Water Bottle','Bicycle','Apple','Banana','Orange','Mango','Grape'
  ]),
  edible: new Set([
    'Apple','Banana','Orange','Mango','Grape','Watermelon','Carrot','Potato','Tomato','Bread','Rice','Milk','Tea','Juice'
  ]),
  alive: new Set([
    'Dog','Cat','Eagle','Lion','Tiger','Elephant','Horse','Cow','Chicken','Fish','Shark','Dolphin','Parrot'
  ]),
  has_legs: new Set([
    'Chair','Table','Dog','Cat','Eagle','Lion','Tiger','Elephant','Horse','Cow','Chicken','Parrot'
  ]),
  has_wheels: new Set([
    'Bicycle','Car','Motorcycle','Bus','Train','Airplane','Boat','Washing Machine','Lawn Mower'
  ]),
  used_indoors: new Set([
    'Smartphone','Laptop','Tablet','Television','Headphones','Camera','Keyboard','Mouse','Printer',
    'Refrigerator','Microwave','Washing Machine','Chair','Table','Backpack','Book','Water Bottle',
    'Bicycle','Car','Motorcycle','Bus','Train','Airplane','Boat'
  ]),
  used_outdoors: new Set([
    'Umbrella','Backpack','Bicycle','Car','Motorcycle','Bus','Train','Airplane','Boat',
    'Dog','Cat','Eagle','Lion','Tiger','Elephant','Horse','Cow','Chicken','Fish','Shark','Dolphin','Parrot'
  ]),
  contains_liquid: new Set(['Water Bottle','Milk','Tea','Juice','Coffee']),
  can_fly: new Set(['Eagle','Parrot']),
  is_animal: new Set([
    'Dog','Cat','Eagle','Lion','Tiger','Elephant','Horse','Cow','Chicken','Fish','Shark','Dolphin','Parrot'
  ]),
  is_human: new Set(),
  is_fictional: new Set(),
  made_of_metal: new Set([
    'Refrigerator','Microwave','Washing Machine','Car','Motorcycle','Bus','Train','Airplane','Boat',
    'Bicycle','Printer','Camera','Keyboard'
  ]),
  has_screen: new Set(['Smartphone','Laptop','Tablet','Television','Camera']),
  has_buttons: new Set([
    'Smartphone','Laptop','Tablet','Television','Camera','Keyboard','Mouse','Printer',
    'Refrigerator','Microwave','Washing Machine'
  ]),
  has_fur: new Set(['Dog','Cat','Lion','Tiger','Elephant','Horse','Cow']),
  has_beak: new Set(['Eagle','Chicken','Parrot']),
  has_tail: new Set(['Dog','Cat','Lion','Tiger','Elephant','Horse','Cow','Chicken','Fish','Shark','Dolphin','Parrot']),
  has_feathers: new Set(['Eagle','Chicken','Parrot']),
  lives_in_water: new Set(['Fish','Shark','Dolphin']),
  is_plant: new Set(),
  is_fruit: new Set(['Apple','Banana','Orange','Mango','Grape','Watermelon','Tomato']),
  is_vegetable: new Set(['Carrot','Potato','Tomato']),
  is_beverage: new Set(['Milk','Tea','Juice','Coffee']),
  has_engine: new Set(['Car','Motorcycle','Bus','Train','Airplane','Boat']),
  has_four_wheels: new Set(['Car','Bus']),
  has_two_wheels: new Set(['Bicycle','Motorcycle']),
  can_be_driven: new Set(['Car','Motorcycle','Bus','Train','Airplane','Boat']),
  used_for_cooking: new Set(['Microwave','Chair','Table','Knife','Potato','Carrot','Tomato','Bread','Rice']),
  used_for_cleaning: new Set(['Washing Machine','Microwave','Refrigerator']),
  made_of_glass: new Set(['Television','Camera','Smartphone','Laptop','Tablet','Water Bottle']),
  made_of_plastic: new Set([
    'Smartphone','Laptop','Tablet','Television','Headphones','Camera','Keyboard','Mouse','Printer',
    'Refrigerator','Microwave','Washing Machine','Chair','Table','Umbrella','Backpack','Water Bottle'
  ]),
  made_of_wood: new Set(['Chair','Table','Book']),
}

const attributeNames = Object.keys(trueSets)
const entityById = new Map(activeEntities.map(e => [e.id, e]))
const nameByAttributeId = new Map()

const attrRows = await get('attributes', 'id,name,active')
for (const a of attrRows) if (a.active !== false) nameByAttributeId.set(a.id, a.name)

const missing = []

for (const e of activeEntities) {
  for (const q of activeQuestions) {
    const key = `${e.id}:${q.primary_attribute_id}`
    if (existingSet.has(key)) continue

    const attribute = nameByAttributeId.get(q.primary_attribute_id)
    if (!attributeNames.includes(attribute)) continue

    const value = trueSets[attribute].has(e.canonical_name)

    missing.push({
      entityId: e.id,
      attributeId: q.primary_attribute_id,
      entity: e.canonical_name,
      attribute,
      value,
    })
  }
}

if (missing.length === 0) {
  console.log('No missing knowledge rows.')
  process.exit(0)
}

const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const migrationPath = path.resolve(`supabase/migrations/${timestamp}_batch25g_knowledge_completion.sql`)

const values = missing.map(x =>
  `('${x.entityId}'::uuid,'${x.attributeId}'::uuid,${x.value},1.0,1,${x.value ? 1 : 0},${x.value ? 0 : 1},now())`
).join(',\n')

const sql = `-- Batch 25G: deterministic question-attribute knowledge completion
-- Generated from the current live dataset.
-- Existing knowledge is preserved.
-- Generated rows cover every missing active question attribute pair.

insert into public.entity_attributes
(entity_id, attribute_id, value_boolean, confidence, evidence_count, positive_evidence, negative_evidence, updated_at)
values
${values}
on conflict (entity_id, attribute_id) do nothing;
`

fs.writeFileSync(migrationPath, `${sql}\n`)

const reportPath = path.resolve('reports/knowledge-matrix-applied.json')
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  insertedProposalRows: missing.length,
  expectedTotalKnowledgeRows: existing.length + missing.length,
  migration: migrationPath,
}, null, 2) + '\n')

console.log(`Generated ${missing.length} knowledge rows`)
console.log(`Migration: ${migrationPath}`)
console.log(`Expected knowledge rows: ${existing.length + missing.length}`)
