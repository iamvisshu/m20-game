import type { AnswerValue } from './answer'

export type GameStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'

export type GameOutcome =
  'CORRECT_GUESS' | 'WRONG_GUESS' | 'PLAYER_GAVE_UP' | 'QUESTION_LIMIT_REACHED'

export interface GameAnswer {
  questionId: string
  answer: AnswerValue
}

export interface GameState {
  gameId: string
  candidateIds: string[]
  answers: GameAnswer[]
  askedQuestionIds: string[]
  rankedCandidates: Array<{
    entityId: string
    score: number
  }>
  questionsAsked: number
  status: GameStatus
  terminationReason?: 'EARLY_GUESS' | 'QUESTION_LIMIT' | 'CONTINUE'
  guessedEntityId?: string
  outcome?: GameOutcome
  currentQuestionId?: string
}
