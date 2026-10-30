import { describe, expect, it, vi } from 'vitest'
import type { AnswerValue } from '../src/domain/answer'
import type { EntityAttributeKnowledge } from '../src/domain/knowledge'
import type { Question } from '../src/domain/question'
import type { KnowledgeKey } from '../src/engine/questionSelection'
import {
  answerCurrentQuestion,
  finalizeCurrentGame,
  startGame,
} from '../src/features/game/gameService'
import type { GameRepository } from '../src/repositories/gameRepository'

const entityId = 'entity-1'
const questionId = 'question-1'
const gameId = 'game-1'
const categoryId = 'category-1'

const questions: Question[] = [
  {
    id: questionId,
    familyId: 'family-1',
    primaryAttributeId: 'attribute-1',
    text: 'Is it alive?',
    active: true,
  },
]

const knowledge = new Map<KnowledgeKey, EntityAttributeKnowledge>()

function createRepository(): GameRepository {
  return {
    startGame: vi.fn().mockResolvedValue(gameId),
    loadCandidates: vi.fn().mockResolvedValue([entityId]),
    loadQuestions: vi.fn().mockResolvedValue(questions),
    loadKnowledge: vi.fn().mockResolvedValue(knowledge),
    loadEntityNames: vi
      .fn()
      .mockResolvedValue(new Map([[entityId, 'Test Entity']])),
    loadCategoryIdsByEntity: vi
      .fn()
      .mockResolvedValue(new Map([[entityId, [categoryId]]])),
    recordAnswer: vi.fn().mockResolvedValue('answer-1'),
    finalizeGame: vi.fn().mockResolvedValue(undefined),
    applyLearning: vi.fn().mockResolvedValue(1),
  }
}

describe('gameService integration', () => {
  it('starts a game using repository data and creates engine state', async () => {
    const repository = createRepository()

    const activeGame = await startGame(repository, categoryId)

    expect(repository.startGame).toHaveBeenCalledWith(categoryId)
    expect(repository.loadCandidates).toHaveBeenCalledWith(categoryId)
    expect(repository.loadQuestions).toHaveBeenCalled()
    expect(repository.loadKnowledge).toHaveBeenCalledWith([entityId])
    expect(repository.loadEntityNames).toHaveBeenCalledWith([entityId])

    expect(activeGame.state.gameId).toBe(gameId)
    expect(activeGame.state.candidateIds).toEqual([entityId])
    expect(activeGame.entityNames.get(entityId)).toBe('Test Entity')
    expect(activeGame.state.currentQuestionId).toBe(questionId)
  })

  it('propagates repository errors when starting a game', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to start game')

    vi.mocked(repository.startGame).mockRejectedValue(repositoryError)

    await expect(startGame(repository, categoryId)).rejects.toThrow(
      'Failed to start game',
    )

    expect(repository.startGame).toHaveBeenCalledWith(categoryId)
    expect(repository.loadCandidates).not.toHaveBeenCalled()
    expect(repository.loadQuestions).not.toHaveBeenCalled()
    expect(repository.loadKnowledge).not.toHaveBeenCalled()
    expect(repository.loadEntityNames).not.toHaveBeenCalled()
  })

  it('propagates repository errors when loading candidates', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to load candidates')

    vi.mocked(repository.loadCandidates).mockRejectedValue(repositoryError)

    await expect(startGame(repository, categoryId)).rejects.toThrow(
      'Failed to load candidates',
    )

    expect(repository.startGame).toHaveBeenCalledWith(categoryId)
    expect(repository.loadCandidates).toHaveBeenCalledWith(categoryId)
    expect(repository.loadQuestions).toHaveBeenCalled()
    expect(repository.loadKnowledge).not.toHaveBeenCalled()
    expect(repository.loadEntityNames).not.toHaveBeenCalled()
  })

  it('propagates repository errors when loading questions', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to load questions')

    vi.mocked(repository.loadQuestions).mockRejectedValue(repositoryError)

    await expect(startGame(repository, categoryId)).rejects.toThrow(
      'Failed to load questions',
    )

    expect(repository.startGame).toHaveBeenCalledWith(categoryId)
    expect(repository.loadCandidates).toHaveBeenCalledWith(categoryId)
    expect(repository.loadQuestions).toHaveBeenCalled()
    expect(repository.loadKnowledge).not.toHaveBeenCalled()
    expect(repository.loadEntityNames).not.toHaveBeenCalled()
  })

  it('propagates repository errors when loading knowledge', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to load knowledge')

    vi.mocked(repository.loadKnowledge).mockRejectedValue(repositoryError)

    await expect(startGame(repository, categoryId)).rejects.toThrow(
      'Failed to load knowledge',
    )

    expect(repository.startGame).toHaveBeenCalledWith(categoryId)
    expect(repository.loadCandidates).toHaveBeenCalledWith(categoryId)
    expect(repository.loadQuestions).toHaveBeenCalled()
    expect(repository.loadKnowledge).toHaveBeenCalledWith([entityId])
    expect(repository.loadEntityNames).toHaveBeenCalledWith([entityId])
  })

  it('propagates repository errors when loading entity names', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to load entity names')

    vi.mocked(repository.loadEntityNames).mockRejectedValue(repositoryError)

    await expect(startGame(repository, categoryId)).rejects.toThrow(
      'Failed to load entity names',
    )

    expect(repository.startGame).toHaveBeenCalledWith(categoryId)
    expect(repository.loadCandidates).toHaveBeenCalledWith(categoryId)
    expect(repository.loadQuestions).toHaveBeenCalled()
    expect(repository.loadKnowledge).toHaveBeenCalledWith([entityId])
    expect(repository.loadEntityNames).toHaveBeenCalledWith([entityId])
  })

  it('records an answer through the repository and updates engine state', async () => {
    const repository = createRepository()
    const activeGame = await startGame(repository)

    const answer: AnswerValue = 'YES'

    const nextGame = await answerCurrentQuestion(activeGame, repository, answer)

    expect(repository.recordAnswer).toHaveBeenCalledWith(
      gameId,
      questionId,
      answer,
    )

    expect(nextGame.state.answers).toEqual([
      {
        questionId,
        answer,
      },
    ])

    expect(nextGame.state.askedQuestionIds).toContain(questionId)
  })

  it('propagates repository errors when recording an answer', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to record answer')

    vi.mocked(repository.recordAnswer).mockRejectedValue(repositoryError)

    const activeGame = await startGame(repository)

    await expect(
      answerCurrentQuestion(activeGame, repository, 'YES'),
    ).rejects.toThrow('Failed to record answer')

    expect(repository.recordAnswer).toHaveBeenCalledWith(
      gameId,
      questionId,
      'YES',
    )
  })

  it('finalizes a correct game and applies learning', async () => {
    const repository = createRepository()
    const activeGame = await startGame(repository)

    const gameAfterAnswer = await answerCurrentQuestion(
      activeGame,
      repository,
      'YES',
    )

    const finalState = await finalizeCurrentGame(
      {
        ...gameAfterAnswer,
        state: {
          ...gameAfterAnswer.state,
          guessedEntityId: entityId,
        },
      },
      repository,
      true,
    )

    expect(repository.finalizeGame).toHaveBeenCalledWith(gameId, entityId, true)

    expect(repository.applyLearning).toHaveBeenCalledWith(gameId)

    expect(finalState.status).toBe('COMPLETED')
    expect(finalState.outcome).toBe('CORRECT_GUESS')
    expect(finalState.guessedEntityId).toBe(entityId)
  })

  it('propagates repository errors when finalizing a game', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to finalize game')

    vi.mocked(repository.finalizeGame).mockRejectedValue(repositoryError)

    const activeGame = await startGame(repository)

    const gameReadyToFinalize = {
      ...activeGame,
      state: {
        ...activeGame.state,
        guessedEntityId: entityId,
      },
    }

    await expect(
      finalizeCurrentGame(gameReadyToFinalize, repository, true),
    ).rejects.toThrow('Failed to finalize game')

    expect(repository.finalizeGame).toHaveBeenCalledWith(gameId, entityId, true)

    expect(repository.applyLearning).not.toHaveBeenCalled()
  })

  it('propagates repository errors when applying learning', async () => {
    const repository = createRepository()
    const repositoryError = new Error('Failed to apply learning')

    vi.mocked(repository.applyLearning).mockRejectedValue(repositoryError)

    const activeGame = await startGame(repository)

    const gameReadyToFinalize = {
      ...activeGame,
      state: {
        ...activeGame.state,
        guessedEntityId: entityId,
      },
    }

    await expect(
      finalizeCurrentGame(gameReadyToFinalize, repository, true),
    ).rejects.toThrow('Failed to apply learning')

    expect(repository.finalizeGame).toHaveBeenCalledWith(gameId, entityId, true)

    expect(repository.applyLearning).toHaveBeenCalledWith(gameId)
  })

  it('finalizes a wrong game without applying learning', async () => {
    const repository = createRepository()
    const activeGame = await startGame(repository)

    const gameAfterAnswer = await answerCurrentQuestion(
      activeGame,
      repository,
      'YES',
    )

    const finalState = await finalizeCurrentGame(
      {
        ...gameAfterAnswer,
        state: {
          ...gameAfterAnswer.state,
          guessedEntityId: entityId,
        },
      },
      repository,
      false,
    )

    expect(repository.finalizeGame).toHaveBeenCalledWith(
      gameId,
      entityId,
      false,
    )

    expect(repository.applyLearning).not.toHaveBeenCalled()

    expect(finalState.status).toBe('COMPLETED')
    expect(finalState.outcome).toBe('WRONG_GUESS')
    expect(finalState.guessedEntityId).toBe(entityId)
  })
})
