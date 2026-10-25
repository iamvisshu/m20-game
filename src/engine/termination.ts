import type { Candidate } from './candidateScoring'

export const DEFAULT_MAX_QUESTIONS = 20
export const DEFAULT_MIN_GUESS_CONFIDENCE = 0.65
export const DEFAULT_MIN_GUESS_GAP = 0.2

export type TerminationReason =
  'EARLY_GUESS' | 'QUESTION_LIMIT' | 'NO_QUESTIONS_REMAINING' | 'CONTINUE'

export interface TerminationConfig {
  maxQuestions: number
  minGuessConfidence: number
  minGuessGap: number
}

export interface TerminationResult {
  shouldGuess: boolean
  reason: TerminationReason
  candidate?: Candidate
  confidence?: number
  confidenceGap?: number
}

export function calculateCandidateConfidences(
  rankedCandidates: Candidate[],
): Array<Candidate & { confidence: number }> {
  if (rankedCandidates.length === 0) {
    return []
  }

  const maxScore = Math.max(
    ...rankedCandidates.map((candidate) => candidate.score),
  )

  const exponentials = rankedCandidates.map((candidate) =>
    Math.exp(candidate.score - maxScore),
  )

  const total = exponentials.reduce((sum, value) => sum + value, 0)

  if (total === 0) {
    return rankedCandidates.map((candidate) => ({
      ...candidate,
      confidence: 1 / rankedCandidates.length,
    }))
  }

  return rankedCandidates.map((candidate, index) => ({
    ...candidate,
    confidence: exponentials[index] / total,
  }))
}

export function evaluateTermination(
  rankedCandidates: Candidate[],
  questionsAsked: number,
  config: TerminationConfig = {
    maxQuestions: DEFAULT_MAX_QUESTIONS,
    minGuessConfidence: DEFAULT_MIN_GUESS_CONFIDENCE,
    minGuessGap: DEFAULT_MIN_GUESS_GAP,
  },
): TerminationResult {
  const top = rankedCandidates[0]

  if (!top) {
    return {
      shouldGuess: false,
      reason: 'CONTINUE',
    }
  }

  const confidences = calculateCandidateConfidences(rankedCandidates)
  const topConfidence = confidences[0]?.confidence ?? 0
  const secondConfidence = confidences[1]?.confidence ?? 0
  const confidenceGap = topConfidence - secondConfidence

  if (
    topConfidence >= config.minGuessConfidence &&
    confidenceGap >= config.minGuessGap
  ) {
    return {
      shouldGuess: true,
      reason: 'EARLY_GUESS',
      candidate: top,
      confidence: topConfidence,
      confidenceGap,
    }
  }

  if (questionsAsked >= config.maxQuestions) {
    return {
      shouldGuess: true,
      reason: 'QUESTION_LIMIT',
      candidate: top,
      confidence: topConfidence,
      confidenceGap,
    }
  }

  return {
    shouldGuess: false,
    reason: 'CONTINUE',
    confidence: topConfidence,
    confidenceGap,
  }
}
