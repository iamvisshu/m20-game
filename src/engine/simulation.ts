import type { AnswerValue } from '../domain/answer'
import { ANSWER_VALUES } from '../domain/answer'
import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { Question } from '../domain/question'
import { answerQuestion, createGame } from './gameEngine'
import type { GameEngineContext } from './gameEngine'
import type { Candidate } from './candidateScoring'
import { calculateCandidateConfidences } from './termination'

export type SimulationAnswerProfile = 'EXACT' | 'REALISTIC'

export interface SimulationEngineConfig {
  maxQuestions: number
  minGuessConfidence: number
  minGuessGap: number
}

export const DEFAULT_SIMULATION_ENGINE_CONFIG: SimulationEngineConfig = {
  maxQuestions: 20,
  minGuessConfidence: 0.65,
  minGuessGap: 0.2,
}

export interface SimulationConfig {
  gamesPerEntity: number
  seed: number
  answerProfile: SimulationAnswerProfile
  engineConfig?: Partial<SimulationEngineConfig>
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
  engineConfig: SimulationEngineConfig
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
  averageFinalCandidateCount: number
  averageFinalConfidenceGap: number
  perEntity: Record<string, SimulationEntityMetrics>
}

type SimulationKnowledge = EntityAttributeKnowledge | undefined

interface RandomSource {
  next(): number
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

function sampleWeightedAnswer(
  weights: Record<AnswerValue, number>,
  random: RandomSource,
): AnswerValue {
  const total = ANSWER_VALUES.reduce((sum, answer) => sum + weights[answer], 0)

  const target = random.next() * total
  let cumulative = 0

  for (const answer of ANSWER_VALUES) {
    cumulative += weights[answer]

    if (target < cumulative) {
      return answer
    }
  }

  return ANSWER_VALUES[ANSWER_VALUES.length - 1]
}

function sampleAnswer(
  knowledge: SimulationKnowledge,
  profile: SimulationAnswerProfile,
  random: RandomSource,
): AnswerValue {
  if (profile === 'EXACT') {
    return knowledge?.value === true ? 'YES' : 'NO'
  }

  if (!knowledge || knowledge.confidence <= 0) {
    return 'UNKNOWN'
  }

  return sampleWeightedAnswer(
    knowledge.value ? REALISTIC_TRUE_WEIGHTS : REALISTIC_FALSE_WEIGHTS,
    random,
  )
}

function calculateEntropy(candidates: Candidate[]): number {
  if (candidates.length <= 1) {
    return 0
  }

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

  const engineConfig: SimulationEngineConfig = {
    ...DEFAULT_SIMULATION_ENGINE_CONFIG,
    ...config.engineConfig,
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
  let totalFinalCandidateCount = 0
  let totalFinalConfidenceGap = 0

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
        terminationConfig: engineConfig,
      }

      let state = createGame(
        candidateIds,
        context,
        `simulation-${config.seed}-${targetEntityId}-${gameNumber}`,
      )

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

      const finalConfidences = calculateCandidateConfidences(
        state.rankedCandidates,
      )

      const finalConfidence = finalConfidences[0]?.confidence ?? 0
      const secondConfidence = finalConfidences[1]?.confidence ?? 0
      const finalConfidenceGap = finalConfidence - secondConfidence

      totalFinalConfidence += finalConfidence
      totalFinalCandidateCount += state.rankedCandidates.length
      totalFinalConfidenceGap += finalConfidenceGap

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

      switch (state.terminationReason) {
        case 'QUESTION_LIMIT':
          questionLimitGames += 1
          break

        case 'EARLY_GUESS':
          earlyGuessGames += 1
          break

        case 'NO_QUESTIONS_REMAINING':
          noQuestionsRemainingGames += 1
          break
      }
    }
  }

  const totalGames = candidateIds.length * config.gamesPerEntity

  const perEntityReport: Record<string, SimulationEntityMetrics> = {}

  for (const [entityId, metrics] of perEntity) {
    perEntityReport[entityId] = {
      games: metrics.games,
      correct: metrics.correct,
      accuracy: metrics.games === 0 ? 0 : metrics.correct / metrics.games,
      averageQuestions:
        metrics.games === 0 ? 0 : metrics.questions / metrics.games,
    }
  }

  return {
    seed: config.seed,
    answerProfile: config.answerProfile,
    engineConfig,
    totalGames,
    correctGames,
    wrongGames,
    accuracy: totalGames === 0 ? 0 : correctGames / totalGames,
    averageQuestions:
      totalGames === 0
        ? 0
        : questionCounts.reduce((sum, count) => sum + count, 0) / totalGames,
    medianQuestions: median(questionCounts),
    maxQuestions: questionCounts.length === 0 ? 0 : Math.max(...questionCounts),
    questionLimitRate: totalGames === 0 ? 0 : questionLimitGames / totalGames,
    earlyGuessRate: totalGames === 0 ? 0 : earlyGuessGames / totalGames,
    noQuestionsRemainingRate:
      totalGames === 0 ? 0 : noQuestionsRemainingGames / totalGames,
    wrongGuessRate: totalGames === 0 ? 0 : wrongGames / totalGames,
    averageFinalConfidence:
      totalGames === 0 ? 0 : totalFinalConfidence / totalGames,
    averageQuestionEffectiveness:
      totalGames === 0 ? 0 : totalQuestionEffectiveness / totalGames,
    averageFinalCandidateCount:
      totalGames === 0 ? 0 : totalFinalCandidateCount / totalGames,
    averageFinalConfidenceGap:
      totalGames === 0 ? 0 : totalFinalConfidenceGap / totalGames,
    perEntity: perEntityReport,
  }
}
