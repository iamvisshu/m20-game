import { describe, expect, it } from 'vitest'

import { ensureAnonymousSession } from '../../src/lib/auth'
import { supabase } from '../../src/lib/supabase'

type Answer = 'YES' | 'PROBABLY_YES' | 'UNKNOWN' | 'PROBABLY_NO' | 'NO'

const TEST_TIMEOUT = 15000

async function getFixture() {
  const { data: entity, error: entityError } = await supabase
    .from('entities')
    .select('id, canonical_name')
    .eq('active', true)
    .order('canonical_name', { ascending: true })
    .limit(1)
    .single()

  expect(entityError).toBeNull()
  expect(entity?.id).toBeTruthy()

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, primary_attribute_id')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  expect(questionError).toBeNull()
  expect(question?.id).toBeTruthy()
  expect(question?.primary_attribute_id).toBeTruthy()

  return {
    entityId: entity.id,
    questionId: question.id,
    attributeId: question.primary_attribute_id,
  }
}

async function createCorrectLearningGame(
  entityId: string,
  questionId: string,
  answer: Answer,
) {
  const { data: gameId, error: startError } = await supabase.rpc(
    'start_game',
    {},
  )

  expect(startError).toBeNull()
  expect(gameId).toBeTruthy()

  const { data: gameQuestionId, error: answerError } = await supabase.rpc(
    'record_answer',
    {
      p_game_id: gameId,
      p_question_id: questionId,
      p_answer: answer,
    },
  )

  expect(answerError).toBeNull()
  expect(gameQuestionId).toBeTruthy()

  const { error: finalizeError } = await supabase.rpc('finalize_game', {
    p_game_id: gameId,
    p_guessed_entity_id: entityId,
    p_correct: true,
  })

  expect(finalizeError).toBeNull()

  const { data: applied, error: learningError } = await supabase.rpc(
    'apply_learning',
    {
      p_game_id: gameId,
    },
  )

  expect(learningError).toBeNull()
  expect(applied).toBe(1)

  return gameId
}

async function getKnowledge(entityId: string, attributeId: string) {
  const { data, error } = await supabase
    .from('entity_attributes')
    .select(
      'value_boolean, confidence, evidence_count, positive_evidence, negative_evidence',
    )
    .eq('entity_id', entityId)
    .eq('attribute_id', attributeId)
    .single()

  expect(error).toBeNull()
  expect(data).toBeTruthy()

  return data
}

describe('learning integration', () => {
  it(
    'creates learning evidence and remains idempotent',
    async () => {
      const session = await ensureAnonymousSession()
      expect(session.user).toBeTruthy()

      const { entityId, questionId, attributeId } = await getFixture()
      const baseline = await getKnowledge(entityId, attributeId)

      const { data: gameId, error: startError } = await supabase.rpc(
        'start_game',
        {},
      )

      expect(startError).toBeNull()
      expect(gameId).toBeTruthy()

      const { data: gameQuestionId, error: answerError } = await supabase.rpc(
        'record_answer',
        {
          p_game_id: gameId,
          p_question_id: questionId,
          p_answer: 'YES',
        },
      )

      expect(answerError).toBeNull()
      expect(gameQuestionId).toBeTruthy()

      const { error: finalizeError } = await supabase.rpc('finalize_game', {
        p_game_id: gameId,
        p_guessed_entity_id: entityId,
        p_correct: true,
      })

      expect(finalizeError).toBeNull()

      const { data: firstApply, error: firstLearningError } =
        await supabase.rpc('apply_learning', {
          p_game_id: gameId,
        })

      expect(firstLearningError).toBeNull()
      expect(firstApply).toBe(1)

      const { data: secondApply, error: secondLearningError } =
        await supabase.rpc('apply_learning', {
          p_game_id: gameId,
        })

      expect(secondLearningError).toBeNull()
      expect(secondApply).toBe(0)

      const knowledge = await getKnowledge(entityId, attributeId)

      expect(knowledge.evidence_count).toBe(baseline.evidence_count + 1)
      expect(knowledge.positive_evidence).toBeGreaterThan(
        baseline.positive_evidence,
      )
      expect(knowledge.negative_evidence).toBe(baseline.negative_evidence)
    },
    TEST_TIMEOUT,
  )

  it(
    'applies the exact learning weight for all five answer states',
    async () => {
      const session = await ensureAnonymousSession()
      expect(session.user).toBeTruthy()

      const { entityId, questionId, attributeId } = await getFixture()

      const baseline = await getKnowledge(entityId, attributeId)

      await createCorrectLearningGame(entityId, questionId, 'YES')
      const afterYes = await getKnowledge(entityId, attributeId)

      expect(afterYes.evidence_count).toBe(baseline.evidence_count + 1)
      expect(afterYes.positive_evidence).toBe(baseline.positive_evidence + 1)
      expect(afterYes.negative_evidence).toBe(baseline.negative_evidence)

      await createCorrectLearningGame(entityId, questionId, 'PROBABLY_YES')
      const afterProbablyYes = await getKnowledge(entityId, attributeId)

      expect(afterProbablyYes.evidence_count).toBe(afterYes.evidence_count + 1)
      expect(afterProbablyYes.positive_evidence).toBeCloseTo(
        afterYes.positive_evidence + 0.5,
        6,
      )
      expect(afterProbablyYes.negative_evidence).toBe(
        afterYes.negative_evidence,
      )

      await createCorrectLearningGame(entityId, questionId, 'UNKNOWN')
      const afterUnknown = await getKnowledge(entityId, attributeId)

      expect(afterUnknown.evidence_count).toBe(
        afterProbablyYes.evidence_count + 1,
      )
      expect(afterUnknown.positive_evidence).toBeCloseTo(
        afterProbablyYes.positive_evidence,
        6,
      )
      expect(afterUnknown.negative_evidence).toBeCloseTo(
        afterProbablyYes.negative_evidence,
        6,
      )

      await createCorrectLearningGame(entityId, questionId, 'PROBABLY_NO')
      const afterProbablyNo = await getKnowledge(entityId, attributeId)

      expect(afterProbablyNo.evidence_count).toBe(
        afterUnknown.evidence_count + 1,
      )
      expect(afterProbablyNo.positive_evidence).toBeCloseTo(
        afterUnknown.positive_evidence,
        6,
      )
      expect(afterProbablyNo.negative_evidence).toBeCloseTo(
        afterUnknown.negative_evidence + 0.5,
        6,
      )

      await createCorrectLearningGame(entityId, questionId, 'NO')
      const afterNo = await getKnowledge(entityId, attributeId)

      expect(afterNo.evidence_count).toBe(afterProbablyNo.evidence_count + 1)
      expect(afterNo.positive_evidence).toBeCloseTo(
        afterProbablyNo.positive_evidence,
        6,
      )
      expect(afterNo.negative_evidence).toBeCloseTo(
        afterProbablyNo.negative_evidence + 1,
        6,
      )

      const totalPositive =
        afterNo.positive_evidence - baseline.positive_evidence
      const totalNegative =
        afterNo.negative_evidence - baseline.negative_evidence

      expect(totalPositive).toBeCloseTo(1.5, 6)
      expect(totalNegative).toBeCloseTo(1.5, 6)
    },
    TEST_TIMEOUT,
  )

  it(
    'handles contradictory evidence without deleting established knowledge',
    async () => {
      const session = await ensureAnonymousSession()
      expect(session.user).toBeTruthy()

      const { entityId, questionId, attributeId } = await getFixture()

      const baseline = await getKnowledge(entityId, attributeId)

      await createCorrectLearningGame(entityId, questionId, 'YES')
      const afterPositive = await getKnowledge(entityId, attributeId)

      await createCorrectLearningGame(entityId, questionId, 'NO')
      const afterContradiction = await getKnowledge(entityId, attributeId)

      expect(afterPositive.evidence_count).toBe(baseline.evidence_count + 1)
      expect(afterContradiction.evidence_count).toBe(
        afterPositive.evidence_count + 1,
      )

      expect(afterContradiction.positive_evidence).toBe(
        afterPositive.positive_evidence,
      )

      expect(afterContradiction.negative_evidence).toBeGreaterThan(
        afterPositive.negative_evidence,
      )

      expect(afterContradiction.confidence).toBeGreaterThanOrEqual(0)
      expect(afterContradiction.confidence).toBeLessThanOrEqual(1)
    },
    TEST_TIMEOUT,
  )

  it(
    'does not learn from a correctly finalized game marked wrong',
    async () => {
      const session = await ensureAnonymousSession()
      expect(session.user).toBeTruthy()

      const { entityId, questionId, attributeId } = await getFixture()
      const baseline = await getKnowledge(entityId, attributeId)

      const { data: gameId, error: startError } = await supabase.rpc(
        'start_game',
        {},
      )

      expect(startError).toBeNull()
      expect(gameId).toBeTruthy()

      const { error: answerError } = await supabase.rpc('record_answer', {
        p_game_id: gameId,
        p_question_id: questionId,
        p_answer: 'YES',
      })

      expect(answerError).toBeNull()

      const { error: finalizeError } = await supabase.rpc('finalize_game', {
        p_game_id: gameId,
        p_guessed_entity_id: entityId,
        p_correct: false,
      })

      expect(finalizeError).toBeNull()

      const { data: applied, error: learningError } = await supabase.rpc(
        'apply_learning',
        {
          p_game_id: gameId,
        },
      )

      expect(applied).toBeNull()
      expect(learningError).not.toBeNull()

      const after = await getKnowledge(entityId, attributeId)

      expect(after.evidence_count).toBe(baseline.evidence_count)
      expect(after.positive_evidence).toBe(baseline.positive_evidence)
      expect(after.negative_evidence).toBe(baseline.negative_evidence)
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps learning audit tables protected from client access',
    async () => {
      const session = await ensureAnonymousSession()
      expect(session.user).toBeTruthy()

      const { data: evidence, error: evidenceError } = await supabase
        .from('evidence')
        .select('id')
        .limit(1)

      expect(evidence).toBeNull()
      expect(evidenceError).not.toBeNull()

      const { data: history, error: historyError } = await supabase
        .from('knowledge_history')
        .select('id')
        .limit(1)

      expect(history).toBeNull()
      expect(historyError).not.toBeNull()
    },
    TEST_TIMEOUT,
  )

  it(
    'does not treat missing evidence as NO',
    async () => {
      const session = await ensureAnonymousSession()
      expect(session.user).toBeTruthy()

      const { entityId, attributeId } = await getFixture()
      const knowledge = await getKnowledge(entityId, attributeId)

      expect(knowledge.evidence_count).toBeGreaterThanOrEqual(0)
      expect(knowledge.negative_evidence).toBeGreaterThanOrEqual(0)

      if (knowledge.evidence_count === 0) {
        expect(knowledge.negative_evidence).toBe(0)
      }
    },
    TEST_TIMEOUT,
  )
})
