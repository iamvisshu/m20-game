import type { AnswerValue } from '../domain/answer'
import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { Question } from '../domain/question'
import type { KnowledgeKey } from '../engine/questionSelection'

export interface GameRepository {
  startGame(categoryId?: string): Promise<string>

  loadCandidates(categoryId?: string): Promise<string[]>

  loadQuestions(): Promise<Question[]>

  loadKnowledge(
    entityIds: string[],
  ): Promise<Map<KnowledgeKey, EntityAttributeKnowledge>>

  loadEntityNames(entityIds: string[]): Promise<Map<string, string>>

  recordAnswer(
    gameId: string,
    questionId: string,
    answer: AnswerValue,
  ): Promise<string>

  finalizeGame(
    gameId: string,
    guessedEntityId: string,
    correct: boolean,
  ): Promise<void>

  applyLearning(gameId: string): Promise<number>
}
