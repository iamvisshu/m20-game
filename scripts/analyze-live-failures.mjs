import fs from 'node:fs'
import path from 'node:path'
import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve('.env.local')
const env = fs.readFileSync(envPath, 'utf8')

const url = env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
const key = env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.*)$/m)?.[1]?.trim()

if (!url || !key) throw new Error('Missing Supabase environment variables')

const supabase = createClient(url, key, {
  realtime: { transport: ws },
})

const report = JSON.parse(
  fs.readFileSync(
    path.resolve('reports/live-engine-evaluation.json'),
    'utf8',
  ),
)

const failures = Object.entries(report.report?.perEntity ?? {})
  .filter(([, result]) => result.accuracy < 1)
  .map(([targetEntityId, result]) => ({
    targetEntityId,
    ...result,
  }))

const { data: entities, error } = await supabase
  .from('entities')
  .select('id,canonical_name')

if (error) throw new Error(error.message)

const names = new Map(
  (entities ?? []).map((entity) => [entity.id, entity.canonical_name]),
)

console.log('M20 LIVE FAILURE ANALYSIS')
console.log('=========================')
console.log(`Total games: ${report.report?.totalGames ?? 0}`)
console.log(`Failures: ${failures.length}`)
console.log(`Accuracy: ${((report.report?.accuracy ?? 0) * 100).toFixed(2)}%`)
console.log('')
console.log('FAILED ENTITIES:')

for (const failure of failures) {
  console.log(
    `- ${names.get(failure.targetEntityId) ?? failure.targetEntityId} | ` +
    `${failure.targetEntityId} | ` +
    `accuracy=${failure.accuracy} | ` +
    `questions=${failure.averageQuestions}`,
  )
}
