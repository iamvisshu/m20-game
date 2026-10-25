import type { AnswerValue } from '../../domain/answer'
import type { GameState } from '../../domain/game'
import {
  answerQuestion,
  createGame,
  finalizeGuess,
} from '../../engine/gameEngine'
import type { GameEngineContext } from '../../engine/gameEngine'
import type { GameRepository } from '../../repositories/gameRepository'

export interface ActiveGame {
  state: GameState
  context: GameEngineContext
  entityNames: Map<string, string>
}

export async function startGame(
  repository: GameRepository,
  categoryId?: string,
): Promise<ActiveGame> {
  const gameId = await repository.startGame(categoryId)

  const [candidateIds, questions] = await Promise.all([
    repository.loadCandidates(categoryId),
    repository.loadQuestions(),
  ])

  const [knowledgeByEntityAttribute, entityNames] = await Promise.all([
    repository.loadKnowledge(candidateIds),
    repository.loadEntityNames(candidateIds),
  ])

  const context: GameEngineContext = {
    questions,
    knowledgeByEntityAttribute,
  }

  const state = createGame(candidateIds, context, gameId)

  return {
    state,
    context,
    entityNames,
  }
}

export async function answerCurrentQuestion(
  activeGame: ActiveGame,
  repository: GameRepository,
  answer: AnswerValue,
): Promise<ActiveGame> {
  const questionId = activeGame.state.currentQuestionId

  if (!questionId) {
    throw new Error('No current question is available.')
  }

  const result = answerQuestion(
    activeGame.state,
    questionId,
    answer,
    activeGame.context,
  )

  await repository.recordAnswer(activeGame.state.gameId, questionId, answer)

  return {
    ...activeGame,
    state: result.state,
  }
}

export async function finalizeCurrentGame(
  activeGame: ActiveGame,
  repository: GameRepository,
  correct: boolean,
): Promise<GameState> {
  const guessedEntityId = activeGame.state.guessedEntityId

  if (!guessedEntityId) {
    throw new Error('No guessed entity is available.')
  }

  await repository.finalizeGame(
    activeGame.state.gameId,
    guessedEntityId,
    correct,
  )

  if (correct) {
    await repository.applyLearning(activeGame.state.gameId)
  }

  const finalState = finalizeGuess(activeGame.state, correct)

  return finalState
}
