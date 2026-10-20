import { describe, expect, it } from 'vitest'

import { rankCandidates, scoreCandidate } from '../src/engine/candidateScoring'
import {
  calculateInformationGain,
  selectBestQuestion,
} from '../src/engine/questionSelection'
import { evaluateTermination } from '../src/engine/termination'

import type { EntityAttributeKnowledge } from '../src/domain/knowledge'
import type { Question } from '../src/domain/question'

describe('candidate scoring', () => {
  const knowledge: EntityAttributeKnowledge = {
    entityId: 'water-bottle',
    attributeId: 'portable',
    value: true,
    confidence: 1,
    evidenceCount: 5,
    positiveEvidence: 5,
    negativeEvidence: 0,
  }

  it('strongly supports a matching YES answer', () => {
    const result = scoreCandidate('YES', knowledge)

    expect(result.score).toBe(1)
  })

  it('strongly penalizes a conflicting NO answer', () => {
    const result = scoreCandidate('NO', knowledge)

    expect(result.score).toBe(-1)
  })

  it('does not punish an entity with unknown knowledge', () => {
    const result = scoreCandidate('YES', undefined)

    expect(result.score).toBe(0)
  })

  it('ranks matching candidates first', () => {
    const candidates = rankCandidates(
      ['water-bottle', 'stone'],
      'YES',
      new Map([
        ['water-bottle', knowledge],
        [
          'stone',
          {
            ...knowledge,
            entityId: 'stone',
            value: false,
          },
        ],
      ]),
    )

    expect(candidates[0]?.entityId).toBe('water-bottle')
  })
})

describe('question selection', () => {
  const questions: Question[] = [
    {
      id: 'portable',
      text: 'Can you carry it?',
      primaryAttributeId: 'portable',
      active: true,
    },
    {
      id: 'edible',
      text: 'Can you eat it?',
      primaryAttributeId: 'edible',
      active: true,
    },
  ]

  it('gives zero information gain without knowledge', () => {
    expect(calculateInformationGain(['a', 'b'], new Map(), 'portable')).toBe(0)
  })

  it('prefers an informative question', () => {
    const knowledge = new Map([
      [
        'a:portable',
        {
          entityId: 'a',
          attributeId: 'portable',
          value: true,
          confidence: 1,
          evidenceCount: 1,
          positiveEvidence: 1,
          negativeEvidence: 0,
        },
      ],
      [
        'b:portable',
        {
          entityId: 'b',
          attributeId: 'portable',
          value: false,
          confidence: 1,
          evidenceCount: 1,
          positiveEvidence: 0,
          negativeEvidence: 1,
        },
      ],
      [
        'a:edible',
        {
          entityId: 'a',
          attributeId: 'edible',
          value: true,
          confidence: 1,
          evidenceCount: 1,
          positiveEvidence: 1,
          negativeEvidence: 0,
        },
      ],
      [
        'b:edible',
        {
          entityId: 'b',
          attributeId: 'edible',
          value: true,
          confidence: 1,
          evidenceCount: 1,
          positiveEvidence: 1,
          negativeEvidence: 0,
        },
      ],
    ])

    const selected = selectBestQuestion(
      questions,
      ['a', 'b'],
      knowledge,
      new Set(),
    )

    expect(selected?.id).toBe('portable')
  })

  it('does not repeat an asked question', () => {
    const selected = selectBestQuestion(
      questions,
      ['a', 'b'],
      new Map(),
      new Set(['portable', 'edible']),
    )

    expect(selected).toBeUndefined()
  })
})

describe('termination', () => {
  it('guesses when the top candidate has sufficient separation', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 1 },
        { entityId: 'cup', score: 0.1 },
      ],
      3,
    )

    expect(result.shouldGuess).toBe(true)
    expect(result.reason).toBe('EARLY_GUESS')
    expect(result.candidate?.entityId).toBe('water-bottle')
  })

  it('guesses at the question limit', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 0.2 },
        { entityId: 'cup', score: 0.1 },
      ],
      20,
    )

    expect(result.shouldGuess).toBe(true)
    expect(result.reason).toBe('QUESTION_LIMIT')
  })

  it('continues when evidence is insufficient', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 0.2 },
        { entityId: 'cup', score: 0.15 },
      ],
      3,
    )

    expect(result.shouldGuess).toBe(false)
    expect(result.reason).toBe('CONTINUE')
  })
})
