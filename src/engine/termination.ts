import type { Candidate } from './candidateScoring'

export const DEFAULT_MAX_QUESTIONS = 20
export const DEFAULT_MIN_GUESS_SCORE = 0.5
export const DEFAULT_MIN_GUESS_GAP = 0.25

export type TerminationReason =
  'EARLY_GUESS' | 'QUESTION_LIMIT' | 'NO_QUESTIONS_REMAINING' | 'CONTINUE'

export interface TerminationConfig {
  maxQuestions: number
  minGuessScore: number
  minGuessGap: number
}

export interface TerminationResult {
  shouldGuess: boolean
  reason: TerminationReason
  candidate?: Candidate
}

export function evaluateTermination(
  rankedCandidates: Candidate[],
  questionsAsked: number,
  config: TerminationConfig = {
    maxQuestions: DEFAULT_MAX_QUESTIONS,
    minGuessScore: DEFAULT_MIN_GUESS_SCORE,
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

  const secondScore = rankedCandidates[1]?.score ?? 0
  const scoreGap = top.score - secondScore

  if (top.score >= config.minGuessScore && scoreGap >= config.minGuessGap) {
    return {
      shouldGuess: true,
      reason: 'EARLY_GUESS',
      candidate: top,
    }
  }

  if (questionsAsked >= config.maxQuestions) {
    return {
      shouldGuess: true,
      reason: 'QUESTION_LIMIT',
      candidate: top,
    }
  }

  return {
    shouldGuess: false,
    reason: 'CONTINUE',
  }
}
