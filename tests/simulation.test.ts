import { describe, expect, it } from 'vitest'
import type { EntityAttributeKnowledge } from '../src/domain/knowledge'
import type { Question } from '../src/domain/question'
import { runSimulation, type SimulationReport } from '../src/engine/simulation'

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
] as const

const ENTITIES: Record<string, number[]> = {
  'water-bottle': [0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  smartphone: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  laptop: [1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  bicycle: [0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  dog: [0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0],
  cat: [0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0],
  eagle: [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0],
  apple: [0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  banana: [0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  coffee: [0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
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
    attributeId === 'is_fictional'
      ? 'biological'
      : attributeId === 'used_indoors' || attributeId === 'used_outdoors'
        ? 'usage'
        : attributeId === 'made_of_metal'
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

function createReport(answerProfile: 'EXACT' | 'REALISTIC'): SimulationReport {
  return runSimulation(ENTITY_IDS, QUESTIONS, createKnowledge(), {
    gamesPerEntity: 100,
    seed: 20261025,
    answerProfile,
  })
}

describe('engine simulation', () => {
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
      '\\nM20 Batch 15 EXACT baseline\\n',
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
      '\\nM20 Batch 15 REALISTIC baseline\\n',
      JSON.stringify(first, null, 2),
    )
  })
})
