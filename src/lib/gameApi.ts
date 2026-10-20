import type { AnswerValue } from '../domain/answer'
import { supabase } from './supabase'

export interface GameQuestion {
  id: string
  text: string
  primary_attribute_id: string
  question_family_id: string | null
  active: boolean
}

export async function startGame(categoryId?: string) {
  const { data, error } = await supabase.rpc(
    'start_game',
    categoryId
      ? {
          p_category_id: categoryId,
        }
      : {},
  )

  if (error) {
    throw new Error(`Failed to start game: ${error.message}`)
  }

  if (!data) {
    throw new Error('start_game returned no game ID')
  }

  return data
}

export async function getNextActiveQuestion(
  gameId: string,
): Promise<GameQuestion | null> {
  const { data: askedQuestions, error: askedError } = await supabase
    .from('game_questions')
    .select('question_id')
    .eq('game_id', gameId)

  if (askedError) {
    throw new Error(`Failed to load asked questions: ${askedError.message}`)
  }

  const askedQuestionIds = new Set(
    (askedQuestions ?? []).map((gameQuestion) => gameQuestion.question_id),
  )

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, text, primary_attribute_id, question_family_id, active')
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (questionsError) {
    throw new Error(`Failed to load questions: ${questionsError.message}`)
  }

  return (
    questions?.find((question) => !askedQuestionIds.has(question.id)) ?? null
  )
}

export async function recordAnswer(
  gameId: string,
  questionId: string,
  answer: AnswerValue,
) {
  const { data, error } = await supabase.rpc('record_answer', {
    p_game_id: gameId,
    p_question_id: questionId,
    p_answer: answer,
  })

  if (error) {
    throw new Error(`Failed to record answer: ${error.message}`)
  }

  return data
}
