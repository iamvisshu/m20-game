import type { AnswerValue } from '../domain/answer'
import { ANSWER_VALUES } from '../domain/answer'
import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { Question } from '../domain/question'
import { answerQuestion, createGame } from './gameEngine'
import type { GameEngineContext } from './gameEngine'
import type { Candidate } from './candidateScoring'
import { calculateCandidateConfidences } from './termination'

export type SimulationAnswerProfile = 'EXACT' | 'REALISTIC'

export interface SimulationConfig {
  gamesPerEntity: number
  seed: number
  answerProfile: SimulationAnswerProfile
  maxSafetySteps?: number
}

export type SimulationKnowledgeKey = `${string}:${string}`

export interface SimulationEntityMetrics {
  games: number
  correct: number
  accuracy: number
  averageQuestions: number
}

export interface SimulationReport {
  seed: number
  answerProfile: SimulationAnswerProfile
  totalGames: number
  correctGames: number
  wrongGames: number
  accuracy: number
  averageQuestions: number
  medianQuestions: number
  maxQuestions: number
  questionLimitRate: number
  earlyGuessRate: number
  noQuestionsRemainingRate: number
  wrongGuessRate: number
  averageFinalConfidence: number
  averageQuestionEffectiveness: number
  perEntity: Record<string, SimulationEntityMetrics>
}

interface RandomSource {
  next(): number
}

function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0

  return {
    next() {
      state += 0x6d2b79f5
      let value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    },
  }
}

const REALISTIC_TRUE_WEIGHTS: Record<AnswerValue, number> = {
  YES: 0.7,
  PROBABLY_YES: 0.15,
  UNKNOWN: 0.1,
  PROBABLY_NO: 0.04,
  NO: 0.01,
}

const REALISTIC_FALSE_WEIGHTS: Record<AnswerValue, number> = {
  YES: 0.01,
  PROBABLY_YES: 0.04,
  UNKNOWN: 0.1,
  PROBABLY_NO: 0.15,
  NO: 0.7,
}

function sampleAnswer(
  targetKnowledge: EntityAttributeKnowledge | undefined,
  profile: SimulationAnswerProfile,
  random: RandomSource,
): AnswerValue {
  if (!targetKnowledge) {
    return 'UNKNOWN'
  }

  if (profile === 'EXACT') {
    return targetKnowledge.value ? 'YES' : 'NO'
  }

  const weights = targetKnowledge.value
    ? REALISTIC_TRUE_WEIGHTS
    : REALISTIC_FALSE_WEIGHTS

  const roll = random.next()
  let cumulative = 0

  for (const answer of ANSWER_VALUES) {
    cumulative += weights[answer]

    if (roll < cumulative) {
      return answer
    }
  }

  return 'NO'
}

function calculateEntropy(candidates: Candidate[]): number {
  const confidences = calculateCandidateConfidences(candidates)

  return confidences.reduce((entropy, candidate) => {
    if (candidate.confidence <= 0) {
      return entropy
    }

    return entropy - candidate.confidence * Math.log2(candidate.confidence)
  }, 0)
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

export function runSimulation(
  candidateIds: string[],
  questions: Question[],
  knowledgeByEntityAttribute: Map<
    SimulationKnowledgeKey,
    EntityAttributeKnowledge
  >,
  config: SimulationConfig,
): SimulationReport {
  if (candidateIds.length === 0) {
    throw new Error('Simulation requires at least one candidate')
  }

  if (questions.length === 0) {
    throw new Error('Simulation requires at least one question')
  }

  const random = createSeededRandom(config.seed)
  const maxSafetySteps = config.maxSafetySteps ?? 100
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  )

  const questionCounts: number[] = []
  let correctGames = 0
  let wrongGames = 0
  let questionLimitGames = 0
  let earlyGuessGames = 0
  let noQuestionsRemainingGames = 0
  let totalQuestionEffectiveness = 0
  let totalFinalConfidence = 0

  const perEntity = new Map<
    string,
    {
      games: number
      correct: number
      questions: number
    }
  >()

  for (const entityId of candidateIds) {
    perEntity.set(entityId, {
      games: 0,
      correct: 0,
      questions: 0,
    })
  }

  for (const targetEntityId of candidateIds) {
    for (
      let gameNumber = 0;
      gameNumber < config.gamesPerEntity;
      gameNumber += 1
    ) {
      const context: GameEngineContext = {
        questions,
        knowledgeByEntityAttribute,
      }

      let state = createGame(candidateIds, context, `simulation-${config.seed}`)

      let questionEffectiveness = 0
      let safetySteps = 0

      while (state.status === 'IN_PROGRESS') {
        safetySteps += 1

        if (safetySteps > maxSafetySteps) {
          throw new Error(
            `Simulation exceeded safety limit for target ${targetEntityId}`,
          )
        }

        const questionId = state.currentQuestionId

        if (!questionId) {
          throw new Error(
            `Simulation game has no current question for target ${targetEntityId}`,
          )
        }

        const question = questionById.get(questionId)

        if (!question) {
          throw new Error(`Question not found: ${questionId}`)
        }

        const beforeEntropy = calculateEntropy(state.rankedCandidates)

        const targetKnowledge = knowledgeByEntityAttribute.get(
          `${targetEntityId}:${question.primaryAttributeId}`,
        )

        const answer = sampleAnswer(
          targetKnowledge,
          config.answerProfile,
          random,
        )

        const turn = answerQuestion(state, questionId, answer, context)

        const afterEntropy = calculateEntropy(turn.state.rankedCandidates)

        questionEffectiveness += beforeEntropy - afterEntropy
        state = turn.state
      }

      const guessedEntityId = state.guessedEntityId
      const correct = guessedEntityId === targetEntityId

      questionCounts.push(state.questionsAsked)
      totalQuestionEffectiveness +=
        state.questionsAsked > 0
          ? questionEffectiveness / state.questionsAsked
          : 0

      const finalConfidence =
        state.rankedCandidates.length > 0
          ? (calculateCandidateConfidences(state.rankedCandidates)[0]
              ?.confidence ?? 0)
          : 0

      totalFinalConfidence += finalConfidence

      const entityMetrics = perEntity.get(targetEntityId)

      if (!entityMetrics) {
        throw new Error(`Missing simulation metrics for ${targetEntityId}`)
      }

      entityMetrics.games += 1
      entityMetrics.questions += state.questionsAsked

      if (correct) {
        correctGames += 1
        entityMetrics.correct += 1
      } else {
        wrongGames += 1
      }

      if (state.terminationReason === 'QUESTION_LIMIT') {
        questionLimitGames += 1
      }

      if (state.terminationReason === 'EARLY_GUESS') {
        earlyGuessGames += 1
      }

      if (state.terminationReason === 'NO_QUESTIONS_REMAINING') {
        noQuestionsRemainingGames += 1
      }
    }
  }

  const totalGames = candidateIds.length * config.gamesPerEntity

  return {
    seed: config.seed,
    answerProfile: config.answerProfile,
    totalGames,
    correctGames,
    wrongGames,
    accuracy: correctGames / totalGames,
    averageQuestions:
      questionCounts.reduce((sum, count) => sum + count, 0) / totalGames,
    medianQuestions: median(questionCounts),
    maxQuestions: Math.max(...questionCounts),
    questionLimitRate: questionLimitGames / totalGames,
    earlyGuessRate: earlyGuessGames / totalGames,
    noQuestionsRemainingRate: noQuestionsRemainingGames / totalGames,
    wrongGuessRate: wrongGames / totalGames,
    averageFinalConfidence: totalFinalConfidence / totalGames,
    averageQuestionEffectiveness: totalQuestionEffectiveness / totalGames,
    perEntity: Object.fromEntries(
      [...perEntity.entries()].map(([entityId, metrics]) => [
        entityId,
        {
          games: metrics.games,
          correct: metrics.correct,
          accuracy: metrics.correct / metrics.games,
          averageQuestions: metrics.questions / metrics.games,
        },
      ]),
    ),
  }
}
