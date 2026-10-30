import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { Question } from '../domain/question'
import type { KnowledgeKey } from '../engine/questionSelection'
import { supabase } from '../lib/supabase'
import type { GameRepository } from './gameRepository'
import type { AnswerValue } from '../domain/answer'

export const supabaseGameRepository: GameRepository = {
  async startGame(categoryId) {
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
  },

  async loadCandidates(categoryId) {
    let query = supabase
      .from('entities')
      .select('id')

      .order('canonical_name', { ascending: true })

    if (categoryId) {
      const { data, error } = await supabase
        .from('entity_categories')
        .select('entity_id')
        .eq('category_id', categoryId)

      if (error) {
        throw new Error(`Failed to load category candidates: ${error.message}`)
      }

      const entityIds = data.map((row) => row.entity_id)

      if (entityIds.length === 0) {
        return []
      }

      query = query.in('id', entityIds)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to load candidates: ${error.message}`)
    }

    return data.map((row) => row.id)
  },

  async loadQuestions(): Promise<Question[]> {
    const { data, error } = await supabase
      .from('questions')
      .select('id, text, primary_attribute_id, question_family_id, active')

      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to load questions: ${error.message}`)
    }

    return data.map((row) => ({
      id: row.id,
      text: row.text,
      primaryAttributeId: row.primary_attribute_id,
      questionFamilyId: row.question_family_id ?? undefined,
      active: row.active,
    }))
  },

  async loadKnowledge(entityIds) {
    if (entityIds.length === 0) {
      return new Map()
    }

    const { data, error } = await supabase
      .from('entity_attributes')
      .select(
        'entity_id, attribute_id, value_boolean, confidence, evidence_count, positive_evidence, negative_evidence',
      )
      .in('entity_id', entityIds)

    if (error) {
      throw new Error(`Failed to load knowledge: ${error.message}`)
    }

    const knowledge = new Map<KnowledgeKey, EntityAttributeKnowledge>()

    for (const row of data) {
      if (typeof row.value_boolean !== 'boolean') {
        continue
      }

      knowledge.set(`${row.entity_id}:${row.attribute_id}`, {
        entityId: row.entity_id,
        attributeId: row.attribute_id,
        value: row.value_boolean,
        confidence: row.confidence,
        evidenceCount: row.evidence_count,
        positiveEvidence: row.positive_evidence,
        negativeEvidence: row.negative_evidence,
      })
    }

    return knowledge
  },

  async loadEntityNames(entityIds) {
    if (entityIds.length === 0) {
      return new Map()
    }

    const { data, error } = await supabase
      .from('entities')
      .select('id, canonical_name')
      .in('id', entityIds)

    if (error) {
      throw new Error(`Failed to load entity names: ${error.message}`)
    }

    return new Map(
      (data ?? []).map((entity) => [entity.id, entity.canonical_name]),
    )
  },

  async loadCategoryIdsByEntity(entityIds) {
    if (entityIds.length === 0) {
      return new Map()
    }

    const { data, error } = await supabase
      .from('entity_categories')
      .select('entity_id, category_id')
      .in('entity_id', entityIds)

    if (error) {
      throw new Error(
        `Failed to load entity categories: ${error.message}`,
      )
    }

    const categoriesByEntity = new Map<string, string[]>()

    for (const row of data ?? []) {
      const categories = categoriesByEntity.get(row.entity_id) ?? []
      categories.push(row.category_id)
      categoriesByEntity.set(row.entity_id, categories)
    }

    return categoriesByEntity
  },

  async recordAnswer(gameId: string, questionId: string, answer: AnswerValue) {
    const { data, error } = await supabase.rpc('record_answer', {
      p_game_id: gameId,
      p_question_id: questionId,
      p_answer: answer,
    })

    if (error) {
      throw new Error(`Failed to record answer: ${error.message}`)
    }

    if (!data) {
      throw new Error('record_answer returned no game-question ID')
    }

    return data
  },

  async applyLearning(gameId) {
    const { data, error } = await supabase.rpc('apply_learning', {
      p_game_id: gameId,
    })

    if (error) {
      throw new Error(`Failed to apply learning: ${error.message}`)
    }

    return data ?? 0
  },

  async finalizeGame(
    gameId: string,
    guessedEntityId: string,
    correct: boolean,
  ) {
    const { error } = await supabase.rpc('finalize_game', {
      p_game_id: gameId,
      p_guessed_entity_id: guessedEntityId,
      p_correct: correct,
    })

    if (error) {
      throw new Error(`Failed to finalize game: ${error.message}`)
    }
  },

  async loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description, active')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Failed to load categories: ${error.message}`)
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      active: row.active,
    }))
  },
}
