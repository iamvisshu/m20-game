import { describe, expect, it } from 'vitest'
import type { EntityAttributeKnowledge } from '../src/domain/knowledge'
import type { Question } from '../src/domain/question'
import {
  calculateAnswerStateProbabilities,
  calculateInformationGain,
  selectBestQuestion,
} from '../src/engine/questionSelection'

function knowledge(
  entityId: string,
  attributeId: string,
  value: boolean,
  confidence = 1,
): EntityAttributeKnowledge {
  return {
    entityId,
    attributeId,
    value,
    confidence,
    evidenceCount: 10,
    positiveEvidence: value ? 10 : 0,
    negativeEvidence: value ? 0 : 10,
  }
}

describe('question selection', () => {
  it('returns zero information gain for a single candidate', () => {
    expect(
      calculateInformationGain(
        ['a'],
        new Map([['a:portable', knowledge('a', 'portable', true)]]),
        'portable',
      ),
    ).toBe(0)
  })

  it('returns zero information gain when every candidate has identical knowledge', () => {
    const knowledgeMap = new Map([
      ['a:portable', knowledge('a', 'portable', true)],
      ['b:portable', knowledge('b', 'portable', true)],
      ['c:portable', knowledge('c', 'portable', true)],
    ])

    expect(
      calculateInformationGain(['a', 'b', 'c'], knowledgeMap, 'portable'),
    ).toBeCloseTo(0)
  })

  it('gives higher information gain to a balanced discriminator', () => {
    const knowledgeMap = new Map([
      ['a:balanced', knowledge('a', 'balanced', true)],
      ['b:balanced', knowledge('b', 'balanced', true)],
      ['c:balanced', knowledge('c', 'balanced', false)],
      ['d:balanced', knowledge('d', 'balanced', false)],
      ['a:weak', knowledge('a', 'weak', true)],
      ['b:weak', knowledge('b', 'weak', true)],
      ['c:weak', knowledge('c', 'weak', true)],
      ['d:weak', knowledge('d', 'weak', false)],
    ])

    const balanced = calculateInformationGain(
      ['a', 'b', 'c', 'd'],
      knowledgeMap,
      'balanced',
    )

    const weak = calculateInformationGain(
      ['a', 'b', 'c', 'd'],
      knowledgeMap,
      'weak',
    )

    expect(balanced).toBeGreaterThan(weak)
    expect(balanced).toBeGreaterThan(0)
  })

  it('uses meaningful probabilities for all five answer states', () => {
    const probabilities = calculateAnswerStateProbabilities(
      knowledge('a', 'portable', true, 1),
    )

    expect(probabilities.YES).toBeGreaterThan(probabilities.PROBABLY_YES)
    expect(probabilities.PROBABLY_YES).toBeGreaterThan(probabilities.UNKNOWN)
    expect(probabilities.UNKNOWN).toBeGreaterThan(probabilities.PROBABLY_NO)
    expect(probabilities.PROBABLY_NO).toBeGreaterThan(probabilities.NO)

    expect(
      Object.values(probabilities).reduce((sum, value) => sum + value, 0),
    ).toBeCloseTo(1)
  })

  it('softens answer probabilities when knowledge confidence is low', () => {
    const strong = calculateAnswerStateProbabilities(
      knowledge('a', 'portable', true, 1),
    )

    const weak = calculateAnswerStateProbabilities(
      knowledge('a', 'portable', true, 0.2),
    )

    expect(weak.YES).toBeLessThan(strong.YES)
    expect(weak.NO).toBeGreaterThan(strong.NO)
  })

  it('does not treat missing knowledge as a definite NO', () => {
    const probabilities = calculateAnswerStateProbabilities(undefined)

    for (const value of Object.values(probabilities)) {
      expect(value).toBeCloseTo(0.2)
    }
  })

  it('penalizes questions with poor candidate coverage', () => {
    const questions: Question[] = [
      {
        id: 'high-coverage',
        text: 'High coverage?',
        primaryAttributeId: 'balanced',
        active: true,
      },
      {
        id: 'low-coverage',
        text: 'Low coverage?',
        primaryAttributeId: 'rare',
        active: true,
      },
    ]

    const knowledgeMap = new Map([
      ['a:balanced', knowledge('a', 'balanced', true)],
      ['b:balanced', knowledge('b', 'balanced', false)],
      ['c:balanced', knowledge('c', 'balanced', true)],
      ['d:balanced', knowledge('d', 'balanced', false)],
      ['a:rare', knowledge('a', 'rare', true)],
    ])

    const selected = selectBestQuestion(
      questions,
      ['a', 'b', 'c', 'd'],
      knowledgeMap,
      new Set(),
    )

    expect(selected?.id).toBe('high-coverage')
  })

  it('penalizes repeated question families', () => {
    const questions: Question[] = [
      {
        id: 'previous-physical',
        text: 'Previous physical question?',
        primaryAttributeId: 'physical-1',
        questionFamilyId: 'physical',
        active: true,
      },
      {
        id: 'already-family',
        text: 'Another physical question?',
        primaryAttributeId: 'physical-2',
        questionFamilyId: 'physical',
        active: true,
      },
      {
        id: 'new-family',
        text: 'A functional question?',
        primaryAttributeId: 'functional',
        questionFamilyId: 'functional',
        active: true,
      },
    ]

    const knowledgeMap = new Map([
      ['a:physical-2', knowledge('a', 'physical-2', true)],
      ['b:physical-2', knowledge('b', 'physical-2', false)],
      ['a:functional', knowledge('a', 'functional', true)],
      ['b:functional', knowledge('b', 'functional', false)],
    ])

    const selected = selectBestQuestion(
      questions,
      ['a', 'b'],
      knowledgeMap,
      new Set(['previous-physical']),
    )

    expect(selected?.id).toBe('new-family')
  })

  it('respects question applicability when supplied', () => {
    const questions: Question[] = [
      {
        id: 'applicable',
        text: 'Applicable?',
        primaryAttributeId: 'portable',
        active: true,
      },
      {
        id: 'inapplicable',
        text: 'Not applicable?',
        primaryAttributeId: 'electronic',
        active: true,
      },
    ]

    const knowledgeMap = new Map([
      ['a:portable', knowledge('a', 'portable', true)],
      ['b:portable', knowledge('b', 'portable', false)],
      ['a:electronic', knowledge('a', 'electronic', true)],
      ['b:electronic', knowledge('b', 'electronic', false)],
    ])

    const selected = selectBestQuestion(
      questions,
      ['a', 'b'],
      knowledgeMap,
      new Set(),
      {
        applicabilityByQuestionId: new Map([
          ['applicable', 1],
          ['inapplicable', 0.1],
        ]),
      },
    )

    expect(selected?.id).toBe('applicable')
  })

  it('never selects an inactive or already-asked question', () => {
    const questions: Question[] = [
      {
        id: 'asked',
        text: 'Asked?',
        primaryAttributeId: 'portable',
        active: true,
      },
      {
        id: 'inactive',
        text: 'Inactive?',
        primaryAttributeId: 'electronic',
        active: false,
      },
      {
        id: 'available',
        text: 'Available?',
        primaryAttributeId: 'contains-liquid',
        active: true,
      },
    ]

    const knowledgeMap = new Map([
      ['a:portable', knowledge('a', 'portable', true)],
      ['b:portable', knowledge('b', 'portable', false)],
      ['a:electronic', knowledge('a', 'electronic', true)],
      ['b:electronic', knowledge('b', 'electronic', false)],
      ['a:contains-liquid', knowledge('a', 'contains-liquid', true)],
      ['b:contains-liquid', knowledge('b', 'contains-liquid', false)],
    ])

    const selected = selectBestQuestion(
      questions,
      ['a', 'b'],
      knowledgeMap,
      new Set(['asked']),
    )

    expect(selected?.id).toBe('available')
  })
})
