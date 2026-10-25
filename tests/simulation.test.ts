import { describe, expect, it } from 'vitest'
import type { EntityAttributeKnowledge } from '../src/domain/knowledge'
import type { Question } from '../src/domain/question'
import {
  runSimulation,
  type SimulationEngineConfig,
  type SimulationReport,
} from '../src/engine/simulation'

const ATTRIBUTE_IDS = [
  'electronic',
  'portable',
  'edible',
  'alive',
  'has_legs',
  'has_wheels',
  'used_indoors',
  'used_outdoors',
  'contains_liquid',
  'can_fly',
  'is_animal',
  'is_human',
  'is_fictional',
  'made_of_metal',
  'has_screen',
  'has_fur',
  'has_beak',
  'has_peel',
] as const

const ENTITIES: Record<string, number[]> = {
  'water-bottle': [0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  smartphone: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
  laptop: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
  bicycle: [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  dog: [0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
  cat: [0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
  eagle: [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0],
  apple: [0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  banana: [0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  coffee: [0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

const ENTITY_IDS = Object.keys(ENTITIES)

const QUESTIONS: Question[] = ATTRIBUTE_IDS.map((attributeId) => ({
  id: `question-${attributeId}`,
  text: `Is it ${attributeId}?`,
  primaryAttributeId: attributeId,
  questionFamilyId:
    attributeId === 'alive' ||
    attributeId === 'has_legs' ||
    attributeId === 'can_fly' ||
    attributeId === 'is_animal' ||
    attributeId === 'is_human' ||
    attributeId === 'is_fictional' ||
    attributeId === 'has_fur' ||
    attributeId === 'has_beak'
      ? 'biological'
      : attributeId === 'used_indoors' || attributeId === 'used_outdoors'
        ? 'usage'
        : attributeId === 'made_of_metal' ||
            attributeId === 'has_screen' ||
            attributeId === 'has_peel'
          ? 'composition'
          : 'physical',
  active: true,
}))

function createKnowledge(): Map<
  `${string}:${string}`,
  EntityAttributeKnowledge
> {
  const knowledge = new Map<`${string}:${string}`, EntityAttributeKnowledge>()

  for (const [entityId, values] of Object.entries(ENTITIES)) {
    values.forEach((value, index) => {
      const attributeId = ATTRIBUTE_IDS[index]

      knowledge.set(`${entityId}:${attributeId}`, {
        entityId,
        attributeId,
        value: value === 1,
        confidence: 1,
        evidenceCount: 10,
        positiveEvidence: value === 1 ? 10 : 0,
        negativeEvidence: value === 1 ? 0 : 10,
      })
    })
  }

  return knowledge
}

function createReport(
  answerProfile: 'EXACT' | 'REALISTIC',
  engineConfig?: Partial<SimulationEngineConfig>,
): SimulationReport {
  return runSimulation(ENTITY_IDS, QUESTIONS, createKnowledge(), {
    gamesPerEntity: 100,
    seed: 20261025,
    answerProfile,
    engineConfig,
  })
}

interface SweepCase {
  name: string
  engineConfig: SimulationEngineConfig
}

const SWEEP_CASES: SweepCase[] = [
  {
    name: 'baseline',
    engineConfig: {
      maxQuestions: 20,
      minGuessConfidence: 0.65,
      minGuessGap: 0.2,
    },
  },
  {
    name: 'more_confident',
    engineConfig: {
      maxQuestions: 20,
      minGuessConfidence: 0.75,
      minGuessGap: 0.25,
    },
  },
  {
    name: 'less_confident',
    engineConfig: {
      maxQuestions: 20,
      minGuessConfidence: 0.55,
      minGuessGap: 0.15,
    },
  },
  {
    name: 'larger_gap',
    engineConfig: {
      maxQuestions: 20,
      minGuessConfidence: 0.65,
      minGuessGap: 0.3,
    },
  },
  {
    name: 'smaller_gap',
    engineConfig: {
      maxQuestions: 20,
      minGuessConfidence: 0.65,
      minGuessGap: 0.1,
    },
  },
  {
    name: 'limit_14',
    engineConfig: {
      maxQuestions: 14,
      minGuessConfidence: 0.65,
      minGuessGap: 0.2,
    },
  },
  {
    name: 'limit_12',
    engineConfig: {
      maxQuestions: 12,
      minGuessConfidence: 0.65,
      minGuessGap: 0.2,
    },
  },
]

function printSweep(
  answerProfile: 'EXACT' | 'REALISTIC',
  reports: Array<{ name: string; report: SimulationReport }>,
): void {
  console.log(`\nM20 Batch 15C ${answerProfile} parameter sweep\n`)

  console.table(
    reports.map(({ name, report }) => ({
      configuration: name,
      accuracy: report.accuracy.toFixed(3),
      avgQuestions: report.averageQuestions.toFixed(3),
      earlyGuess: report.earlyGuessRate.toFixed(3),
      wrongGuess: report.wrongGuessRate.toFixed(3),
      questionLimit: report.questionLimitRate.toFixed(3),
      noQuestions: report.noQuestionsRemainingRate.toFixed(3),
      finalConfidence: report.averageFinalConfidence.toFixed(3),
      confidenceGap: report.averageFinalConfidenceGap.toFixed(3),
      effectiveness: report.averageQuestionEffectiveness.toFixed(3),
    })),
  )
}

describe('engine simulation', () => {
  it('keeps every simulation entity distinguishable', () => {
    const signatures = ENTITY_IDS.map((entityId) =>
      ATTRIBUTE_IDS.map(
        (attributeId) =>
          createKnowledge().get(`${entityId}:${attributeId}`)?.value,
      ).join('|'),
    )

    expect(new Set(signatures).size).toBe(ENTITY_IDS.length)
  })

  it('produces a deterministic exact-answer baseline', () => {
    const first = createReport('EXACT')
    const second = createReport('EXACT')

    expect(first).toEqual(second)
    expect(first.totalGames).toBe(1000)
    expect(first.maxQuestions).toBeLessThanOrEqual(20)
    expect(first.accuracy).toBeGreaterThanOrEqual(0)
    expect(first.accuracy).toBeLessThanOrEqual(1)
    expect(first.averageQuestions).toBeGreaterThan(0)
    expect(first.averageFinalConfidence).toBeGreaterThan(0)
    expect(first.averageQuestionEffectiveness).not.toBeNaN()

    console.log(
      '\nM20 Batch 15 EXACT baseline\n',
      JSON.stringify(first, null, 2),
    )
  })

  it('produces a deterministic realistic-answer baseline', () => {
    const first = createReport('REALISTIC')
    const second = createReport('REALISTIC')

    expect(first).toEqual(second)
    expect(first.totalGames).toBe(1000)
    expect(first.maxQuestions).toBeLessThanOrEqual(20)
    expect(first.accuracy).toBeGreaterThanOrEqual(0)
    expect(first.accuracy).toBeLessThanOrEqual(1)
    expect(first.averageQuestions).toBeGreaterThan(0)
    expect(first.averageFinalConfidence).toBeGreaterThan(0)
    expect(first.averageQuestionEffectiveness).not.toBeNaN()

    console.log(
      '\nM20 Batch 15 REALISTIC baseline\n',
      JSON.stringify(first, null, 2),
    )
  })

  it('runs a deterministic parameter sweep for engine tuning', () => {
    const exactReports = SWEEP_CASES.map(({ name, engineConfig }) => ({
      name,
      report: createReport('EXACT', engineConfig),
    }))

    const realisticReports = SWEEP_CASES.map(({ name, engineConfig }) => ({
      name,
      report: createReport('REALISTIC', engineConfig),
    }))

    printSweep('EXACT', exactReports)
    printSweep('REALISTIC', realisticReports)

    for (const { report } of [...exactReports, ...realisticReports]) {
      expect(report.totalGames).toBe(1000)
      expect(report.accuracy).toBeGreaterThanOrEqual(0)
      expect(report.accuracy).toBeLessThanOrEqual(1)
      expect(report.averageQuestions).toBeGreaterThan(0)
      expect(report.maxQuestions).toBeLessThanOrEqual(
        report.engineConfig.maxQuestions,
      )
    }

    const first = createReport('REALISTIC', SWEEP_CASES[0].engineConfig)
    const second = createReport('REALISTIC', SWEEP_CASES[0].engineConfig)

    expect(first).toEqual(second)
  }, 30_000)
})
