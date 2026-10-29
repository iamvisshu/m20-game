import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const migrationsDir = path.join(root, 'supabase', 'migrations')

if (!fs.existsSync(migrationsDir)) {
  throw new Error(`Missing migrations directory: ${migrationsDir}`)
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()

const migrations = files.map((file) => ({
  file,
  sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8'),
}))

const combinedSql = migrations.map(({ sql }) => sql).join('\n')

function countInsertStatements(tableName) {
  const pattern = new RegExp(
    `insert\\s+into\\s+public\\.${tableName}\\b`,
    'gi',
  )

  return [...combinedSql.matchAll(pattern)].length
}

function extractQuotedValuesAfterInsert(tableName, columnName) {
  const values = []

  const statementPattern = new RegExp(
    `insert\\s+into\\s+public\\.${tableName}\\s*\\(([^)]*)\\)\\s*values\\s*([\\s\\S]*?);`,
    'gi',
  )

  for (const match of combinedSql.matchAll(statementPattern)) {
    const columns = match[1]
      .split(',')
      .map((column) => column.trim().replace(/^"|"$/g, ''))

    const columnIndex = columns.findIndex(
      (column) => column.toLowerCase() === columnName.toLowerCase(),
    )

    if (columnIndex === -1) continue

    const valuesBlock = match[2]

    const rowMatches = valuesBlock.matchAll(/\(([^()]*)\)/g)

    for (const rowMatch of rowMatches) {
      const row = rowMatch[1]

      const fields = []
      let current = ''
      let inString = false

      for (let index = 0; index < row.length; index += 1) {
        const character = row[index]

        if (character === "'" && row[index + 1] === "'") {
          current += "''"
          index += 1
          continue
        }

        if (character === "'") {
          inString = !inString
          current += character
          continue
        }

        if (character === ',' && !inString) {
          fields.push(current.trim())
          current = ''
          continue
        }

        current += character
      }

      fields.push(current.trim())

      if (fields.length <= columnIndex) continue

      const value = fields[columnIndex]

      if (
        value.startsWith("'") &&
        value.endsWith("'") &&
        value.length >= 2
      ) {
        values.push(value.slice(1, -1).replaceAll("''", "'"))
      }
    }
  }

  return values
}

function normalize(value) {
  return value.trim().toLowerCase()
}

function findDuplicates(values) {
  const seen = new Map()
  const duplicates = []

  for (const value of values) {
    const normalized = normalize(value)

    if (seen.has(normalized)) {
      duplicates.push(value)
    } else {
      seen.set(normalized, value)
    }
  }

  return [...new Set(duplicates)]
}

const entityNames = extractQuotedValuesAfterInsert(
  'entities',
  'canonical_name',
)

const attributeNames = extractQuotedValuesAfterInsert(
  'attributes',
  'name',
)

const duplicateEntities = findDuplicates(entityNames)
const duplicateAttributes = findDuplicates(attributeNames)

console.log('\nM20 Dataset Validation\n')
console.log(`Migration files scanned: ${files.length}`)

console.log(
  `Entity INSERT statements: ${countInsertStatements('entities')}`,
)
console.log(
  `Attribute INSERT statements: ${countInsertStatements('attributes')}`,
)

console.log(`Entity rows detected: ${entityNames.length}`)
console.log(`Attribute rows detected: ${attributeNames.length}`)

if (duplicateEntities.length > 0) {
  console.error('\nDuplicate canonical entities detected:')

  for (const name of duplicateEntities) {
    console.error(`- ${name}`)
  }

  process.exit(1)
}

if (duplicateAttributes.length > 0) {
  console.error('\nDuplicate attributes detected:')

  for (const name of duplicateAttributes) {
    console.error(`- ${name}`)
  }

  process.exit(1)
}

console.log('Duplicate entity check: PASS')
console.log('Duplicate attribute check: PASS')
console.log('\nDataset validation completed successfully.')
