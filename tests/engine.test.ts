import { describe, expect, it } from 'vitest'

import { rankCandidates, scoreCandidate } from '../src/engine/candidateScoring'
import {
  calculateInformationGain,
  selectBestQuestion,
} from '../src/engine/questionSelection'
import {
  calculateCandidateConfidences,
  evaluateTermination,
} from '../src/engine/termination'

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

  it('uses evidence quality without allowing it to dominate confidence', () => {
    const lowEvidence = scoreCandidate('YES', {
      ...knowledge,
      confidence: 0.5,
      evidenceCount: 1,
    })

    const highEvidence = scoreCandidate('YES', {
      ...knowledge,
      confidence: 0.5,
      evidenceCount: 20,
    })

    expect(highEvidence.score).toBeGreaterThan(lowEvidence.score)
    expect(highEvidence.score).toBeLessThanOrEqual(1)
  })

  it('reduces repeated-attribute influence with diminishing returns', () => {
    const first = scoreCandidate('YES', knowledge, 1)
    const second = scoreCandidate('YES', knowledge, 2)
    const fourth = scoreCandidate('YES', knowledge, 4)

    expect(first.score).toBeGreaterThan(second.score)
    expect(second.score).toBeGreaterThan(fourth.score)
  })

  it('keeps unknown or missing knowledge neutral', () => {
    expect(scoreCandidate('YES', undefined).score).toBe(0)

    expect(
      scoreCandidate('YES', {
        ...knowledge,
        confidence: 0,
      }).score,
    ).toBe(0)
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
  it('normalizes candidate scores into probabilities', () => {
    const result = calculateCandidateConfidences([
      { entityId: 'water-bottle', score: 2 },
      { entityId: 'phone', score: 0 },
      { entityId: 'stone', score: 0 },
    ])

    expect(result[0].confidence).toBeCloseTo(0.786986, 5)
    expect(result[1].confidence).toBeCloseTo(0.106507, 5)
    expect(result[2].confidence).toBeCloseTo(0.106507, 5)
    expect(
      result.reduce((sum, candidate) => sum + candidate.confidence, 0),
    ).toBeCloseTo(1)
  })

  it('handles negative raw scores without changing relative confidence', () => {
    const positive = calculateCandidateConfidences([
      { entityId: 'water-bottle', score: 2 },
      { entityId: 'phone', score: 0 },
      { entityId: 'stone', score: 0 },
    ])

    const shifted = calculateCandidateConfidences([
      { entityId: 'water-bottle', score: -8 },
      { entityId: 'phone', score: -10 },
      { entityId: 'stone', score: -10 },
    ])

    expect(shifted[0].confidence).toBeCloseTo(positive[0].confidence, 10)
    expect(shifted[1].confidence).toBeCloseTo(positive[1].confidence, 10)
    expect(shifted[2].confidence).toBeCloseTo(positive[2].confidence, 10)
  })

  it('guesses when normalized confidence and separation are sufficient', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 2 },
        { entityId: 'phone', score: 0 },
        { entityId: 'stone', score: 0 },
      ],
      3,
    )

    expect(result.shouldGuess).toBe(true)
    expect(result.reason).toBe('EARLY_GUESS')
    expect(result.candidate?.entityId).toBe('water-bottle')
    expect(result.confidence).toBeCloseTo(0.786986, 5)
    expect(result.confidenceGap).toBeCloseTo(0.68048, 5)
  })

  it('continues when normalized confidence is insufficient', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 0.2 },
        { entityId: 'phone', score: 0.15 },
        { entityId: 'stone', score: 0.1 },
      ],
      3,
    )

    expect(result.shouldGuess).toBe(false)
    expect(result.reason).toBe('CONTINUE')
    expect(result.confidence).toBeLessThan(0.65)
  })

  it('guesses at the question limit even without sufficient confidence', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 0.2 },
        { entityId: 'phone', score: 0.15 },
        { entityId: 'stone', score: 0.1 },
      ],
      20,
    )

    expect(result.shouldGuess).toBe(true)
    expect(result.reason).toBe('QUESTION_LIMIT')
    expect(result.candidate?.entityId).toBe('water-bottle')
  })

  it('continues when evidence is insufficient and the limit is not reached', () => {
    const result = evaluateTermination(
      [
        { entityId: 'water-bottle', score: 0.2 },
        { entityId: 'phone', score: 0.19 },
      ],
      3,
    )

    expect(result.shouldGuess).toBe(false)
    expect(result.reason).toBe('CONTINUE')
  })
})
