import type { AnswerValue } from '../domain/answer'
import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { GameState } from '../domain/game'
import type { Question } from '../domain/question'
import { rankCandidates, scoreCandidate } from './candidateScoring'
import { type KnowledgeKey, selectBestQuestion } from './questionSelection'
import {
  DEFAULT_MAX_QUESTIONS,
  DEFAULT_MIN_GUESS_GAP,
  DEFAULT_MIN_GUESS_CONFIDENCE,
  calculateCandidateConfidences,
  evaluateTermination,
  type TerminationConfig,
  type TerminationResult,
} from './termination'

export interface GameEngineContext {
  questions: Question[]
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>
  categoriesByEntityId?: Map<string, string[]>
  terminationConfig?: TerminationConfig
}

export interface GameTurnResult {
  state: GameState
  termination: TerminationResult
  nextQuestion?: Question
}

function createGameId(): string {
  return crypto.randomUUID()
}

function rankCandidatesForAnswers(
  candidateIds: string[],
  answers: GameState['answers'],
  questions: Question[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
): Array<{ entityId: string; score: number }> {
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  )

  return candidateIds
    .map((entityId) => {
      let score = 0
      const attributeOccurrences = new Map<string, number>()

      for (const gameAnswer of answers) {
        const question = questionsById.get(gameAnswer.questionId)

        if (!question) {
          throw new Error(`Question not found: ${gameAnswer.questionId}`)
        }

        const attributeId = question.primaryAttributeId
        const occurrence = (attributeOccurrences.get(attributeId) ?? 0) + 1

        attributeOccurrences.set(attributeId, occurrence)

        const knowledge = knowledgeByEntityAttribute.get(
          `${entityId}:${attributeId}`,
        )

        score += scoreCandidate(gameAnswer.answer, knowledge, occurrence).score
      }

      return {
        entityId,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
}

function getTerminationConfig(context: GameEngineContext): TerminationConfig {
  return (
    context.terminationConfig ?? {
      maxQuestions: DEFAULT_MAX_QUESTIONS,
      minGuessConfidence: DEFAULT_MIN_GUESS_CONFIDENCE,
      minGuessGap: DEFAULT_MIN_GUESS_GAP,
    }
  )
}

function calculateCategoryFitByQuestionId(
  candidateIds: string[],
  questions: Question[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  categoriesByEntityId: Map<string, string[]> | undefined,
): Map<string, number> {
  const result = new Map<string, number>()

  if (!categoriesByEntityId || candidateIds.length === 0) {
    return result
  }

  const categoryCounts = new Map<string, number>()

  for (const candidateId of candidateIds) {
    const categories = categoriesByEntityId.get(candidateId) ?? []

    for (const categoryId of categories) {
      categoryCounts.set(
        categoryId,
        (categoryCounts.get(categoryId) ?? 0) + 1,
      )
    }
  }

  const dominantCategory = [...categoryCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]

  if (!dominantCategory) {
    return result
  }

  const [categoryId, categoryCount] = dominantCategory
  const dominance = categoryCount / candidateIds.length

  if (dominance < 0.5) {
    return result
  }

  const categoryCandidateIds = candidateIds.filter((candidateId) =>
    (categoriesByEntityId.get(candidateId) ?? []).includes(categoryId),
  )

  if (categoryCandidateIds.length <= 1) {
    return result
  }

  for (const question of questions) {
    const knownValues = categoryCandidateIds
      .map((candidateId) =>
        knowledgeByEntityAttribute.get(
          `${candidateId}:${question.primaryAttributeId}`,
        ),
      )
      .filter(
        (knowledge): knowledge is EntityAttributeKnowledge =>
          Boolean(knowledge && knowledge.confidence > 0),
      )

    if (knownValues.length === 0) {
      result.set(question.id, 0)
      continue
    }

    const yesCount = knownValues.filter((knowledge) => knowledge.value).length
    const noCount = knownValues.length - yesCount

    const discrimination =
      Math.min(yesCount, noCount) / Math.max(1, knownValues.length / 2)

    const coverage = knownValues.length / categoryCandidateIds.length

    result.set(
      question.id,
      Math.max(0, Math.min(1, discrimination * coverage)),
    )
  }

  return result
}

function getNextQuestion(
  state: GameState,
  context: GameEngineContext,
): Question | undefined {
  const categoryFitByQuestionId = calculateCategoryFitByQuestionId(
    state.candidateIds,
    context.questions,
    context.knowledgeByEntityAttribute,
    context.categoriesByEntityId,
  )

  const candidateConfidences = calculateCandidateConfidences(
    state.rankedCandidates,
  )

  const candidateWeights = new Map(
    candidateConfidences.map((candidate) => [
      candidate.entityId,
      candidate.confidence,
    ]),
  )

  return selectBestQuestion(
    context.questions,
    state.candidateIds,
    context.knowledgeByEntityAttribute,
    new Set(state.askedQuestionIds),
    {
      categoryFitByQuestionId,
      candidateWeights,
    },
  )
}

export function createGame(
  candidateIds: string[],
  context: GameEngineContext,
  gameId = createGameId(),
): GameState {
  if (candidateIds.length === 0) {
    throw new Error('A game requires at least one candidate.')
  }

  const initialRankings = rankCandidates(
    candidateIds,
    'UNKNOWN',
    new Map(),
  ).map((candidate) => ({
    entityId: candidate.entityId,
    score: candidate.score,
  }))

  const state: GameState = {
    gameId,
    candidateIds: [...candidateIds],
    answers: [],
    askedQuestionIds: [],
    rankedCandidates: initialRankings,
    questionsAsked: 0,
    status: 'IN_PROGRESS',
  }

  const nextQuestion = getNextQuestion(state, context)

  if (!nextQuestion) {
    throw new Error('No active questions are available.')
  }

  return {
    ...state,
    currentQuestionId: nextQuestion.id,
  }
}

export function answerQuestion(
  state: GameState,
  questionId: string,
  answer: AnswerValue,
  context: GameEngineContext,
): GameTurnResult {
  if (state.status !== 'IN_PROGRESS') {
    throw new Error('Cannot answer a completed or abandoned game.')
  }

  if (state.currentQuestionId !== questionId) {
    throw new Error('The supplied question is not the current question.')
  }

  if (state.askedQuestionIds.includes(questionId)) {
    throw new Error('Question has already been answered.')
  }

  const nextAnswers = [
    ...state.answers,
    {
      questionId,
      answer,
    },
  ]

  const nextAskedQuestionIds = [...state.askedQuestionIds, questionId]

  const questionsAsked = state.questionsAsked + 1

  const rankedCandidates = rankCandidatesForAnswers(
    state.candidateIds,
    nextAnswers,
    context.questions,
    context.knowledgeByEntityAttribute,
  )

  const nextState: GameState = {
    ...state,
    answers: nextAnswers,
    askedQuestionIds: nextAskedQuestionIds,
    rankedCandidates,
    questionsAsked,
    currentQuestionId: undefined,
  }

  const termination = evaluateTermination(
    rankedCandidates,
    questionsAsked,
    getTerminationConfig(context),
  )

  if (termination.shouldGuess) {
    const guessedEntityId = termination.candidate?.entityId

    return {
      state: {
        ...nextState,
        status: 'COMPLETED',
        terminationReason: termination.reason,
        guessedEntityId,
      },
      termination,
    }
  }

  const nextQuestion = getNextQuestion(nextState, context)

  if (!nextQuestion) {
    const fallbackCandidate = rankedCandidates[0]

    if (!fallbackCandidate) {
      throw new Error('Cannot complete game without a candidate.')
    }

    const noQuestionsRemainingTermination: TerminationResult = {
      shouldGuess: true,
      reason: 'NO_QUESTIONS_REMAINING',
      candidate: fallbackCandidate,
    }

    return {
      state: {
        ...nextState,
        status: 'COMPLETED',
        terminationReason: 'NO_QUESTIONS_REMAINING',
        guessedEntityId: fallbackCandidate.entityId,
        currentQuestionId: undefined,
      },
      termination: noQuestionsRemainingTermination,
    }
  }

  return {
    state: {
      ...nextState,
      terminationReason: 'CONTINUE',
      currentQuestionId: nextQuestion.id,
    },
    termination,
    nextQuestion,
  }
}

export function finalizeGuess(state: GameState, correct: boolean): GameState {
  if (state.status !== 'COMPLETED') {
    throw new Error('There is no completed guess to finalize.')
  }

  return {
    ...state,
    outcome: correct ? 'CORRECT_GUESS' : 'WRONG_GUESS',
  }
}

export function abandonGame(state: GameState): GameState {
  if (state.status !== 'IN_PROGRESS') {
    throw new Error('Only an in-progress game can be abandoned.')
  }

  return {
    ...state,
    status: 'ABANDONED',
    outcome: 'PLAYER_GAVE_UP',
    currentQuestionId: undefined,
  }
}
