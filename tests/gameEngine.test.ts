import { describe, expect, it } from 'vitest'
import type { EntityAttributeKnowledge } from '../src/domain/knowledge'
import type { Question } from '../src/domain/question'
import {
  abandonGame,
  answerQuestion,
  createGame,
  finalizeGuess,
  type GameEngineContext,
} from '../src/engine/gameEngine'

const questions: Question[] = [
  {
    id: 'portable',
    text: 'Is it portable?',
    primaryAttributeId: 'portable',
    active: true,
  },
  {
    id: 'electronic',
    text: 'Is it electronic?',
    primaryAttributeId: 'electronic',
    active: true,
  },
  {
    id: 'contains-liquid',
    text: 'Does it contain liquid?',
    primaryAttributeId: 'contains-liquid',
    active: true,
  },
]

const knowledge = new Map<string, EntityAttributeKnowledge>([
  [
    'water-bottle:portable',
    {
      entityId: 'water-bottle',
      attributeId: 'portable',
      value: true,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 5,
      negativeEvidence: 0,
    },
  ],
  [
    'phone:portable',
    {
      entityId: 'phone',
      attributeId: 'portable',
      value: true,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 5,
      negativeEvidence: 0,
    },
  ],
  [
    'stone:portable',
    {
      entityId: 'stone',
      attributeId: 'portable',
      value: false,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 0,
      negativeEvidence: 5,
    },
  ],
  [
    'water-bottle:electronic',
    {
      entityId: 'water-bottle',
      attributeId: 'electronic',
      value: false,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 0,
      negativeEvidence: 5,
    },
  ],
  [
    'phone:electronic',
    {
      entityId: 'phone',
      attributeId: 'electronic',
      value: true,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 5,
      negativeEvidence: 0,
    },
  ],
  [
    'stone:electronic',
    {
      entityId: 'stone',
      attributeId: 'electronic',
      value: false,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 0,
      negativeEvidence: 5,
    },
  ],
  [
    'water-bottle:contains-liquid',
    {
      entityId: 'water-bottle',
      attributeId: 'contains-liquid',
      value: true,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 5,
      negativeEvidence: 0,
    },
  ],
  [
    'phone:contains-liquid',
    {
      entityId: 'phone',
      attributeId: 'contains-liquid',
      value: false,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 0,
      negativeEvidence: 5,
    },
  ],
  [
    'stone:contains-liquid',
    {
      entityId: 'stone',
      attributeId: 'contains-liquid',
      value: false,
      confidence: 1,
      evidenceCount: 5,
      positiveEvidence: 0,
      negativeEvidence: 5,
    },
  ],
])

const context: GameEngineContext = {
  questions,
  knowledgeByEntityAttribute: knowledge,
  terminationConfig: {
    maxQuestions: 20,
    minGuessScore: 1.5,
    minGuessGap: 0.5,
  },
}

describe('game engine', () => {
  it('starts with the most informative question', () => {
    const game = createGame(
      ['water-bottle', 'phone', 'stone'],
      context,
      'game-1',
    )

    expect(game.status).toBe('IN_PROGRESS')
    expect(game.questionsAsked).toBe(0)
    expect(game.currentQuestionId).toBe('portable')
  })

  it('accumulates multiple answers and updates candidate ranking', () => {
    const game = createGame(
      ['water-bottle', 'phone', 'stone'],
      context,
      'game-2',
    )

    const firstTurn = answerQuestion(game, 'portable', 'YES', context)

    expect(firstTurn.state.status).toBe('IN_PROGRESS')
    expect(firstTurn.state.questionsAsked).toBe(1)
    expect(firstTurn.state.rankedCandidates[0]).toEqual({
      entityId: 'water-bottle',
      score: 1,
    })
    expect(firstTurn.state.rankedCandidates[1]).toEqual({
      entityId: 'phone',
      score: 1,
    })

    const secondTurn = answerQuestion(
      firstTurn.state,
      firstTurn.nextQuestion!.id,
      'NO',
      context,
    )

    expect(secondTurn.state.status).toBe('COMPLETED')
    expect(secondTurn.state.guessedEntityId).toBe('water-bottle')
    expect(secondTurn.state.questionsAsked).toBe(2)
    expect(secondTurn.state.terminationReason).toBe('EARLY_GUESS')
  })

  it('does not allow answering a stale question', () => {
    const game = createGame(
      ['water-bottle', 'phone', 'stone'],
      context,
      'game-3',
    )

    expect(() => answerQuestion(game, 'electronic', 'YES', context)).toThrow(
      'The supplied question is not the current question.',
    )
  })

  it('guesses when the question limit is reached', () => {
    const limitedContext: GameEngineContext = {
      ...context,
      terminationConfig: {
        maxQuestions: 1,
        minGuessScore: 100,
        minGuessGap: 100,
      },
    }

    const game = createGame(
      ['water-bottle', 'phone', 'stone'],
      limitedContext,
      'game-4',
    )

    const result = answerQuestion(game, 'portable', 'YES', limitedContext)

    expect(result.state.status).toBe('COMPLETED')
    expect(result.state.terminationReason).toBe('QUESTION_LIMIT')
    expect(result.state.guessedEntityId).toBe('water-bottle')
  })

  it('can finalize a correct guess', () => {
    const game = createGame(
      ['water-bottle', 'phone', 'stone'],
      context,
      'game-5',
    )

    const result = answerQuestion(game, 'portable', 'YES', context)

    const completed = answerQuestion(
      result.state,
      result.nextQuestion!.id,
      'NO',
      context,
    )

    const finalized = finalizeGuess(completed.state, true)

    expect(finalized.outcome).toBe('CORRECT_GUESS')
  })

  it('can abandon an in-progress game', () => {
    const game = createGame(
      ['water-bottle', 'phone', 'stone'],
      context,
      'game-6',
    )

    const abandoned = abandonGame(game)

    expect(abandoned.status).toBe('ABANDONED')
    expect(abandoned.outcome).toBe('PLAYER_GAVE_UP')
    expect(abandoned.currentQuestionId).toBeUndefined()
  })
})
