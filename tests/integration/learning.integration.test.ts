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

  it('preserves counters under concurrent learning for the same entity and attribute', async () => {
    const session = await ensureAnonymousSession()
    expect(session.user).toBeTruthy()

    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id')
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

    const { data: beforeKnowledge, error: beforeKnowledgeError } =
      await supabase
        .from('entity_attributes')
        .select(
          'value_boolean, confidence, evidence_count, positive_evidence, negative_evidence',
        )
        .eq('entity_id', entity.id)
        .eq('attribute_id', question.primary_attribute_id)
        .single()

    expect(beforeKnowledgeError).toBeNull()
    expect(beforeKnowledge).toBeTruthy()

    const gameIds = await Promise.all(
      Array.from({ length: 8 }, async () => {
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
            p_question_id: question.id,
            p_answer: 'YES',
          },
        )

        expect(answerError).toBeNull()
        expect(gameQuestionId).toBeTruthy()

        const { error: finalizeError } = await supabase.rpc('finalize_game', {
          p_game_id: gameId,
          p_guessed_entity_id: entity.id,
          p_correct: true,
        })

        expect(finalizeError).toBeNull()

        return gameId as string
      }),
    )

    expect(gameIds).toHaveLength(8)

    const results = await Promise.all(
      gameIds.map(async (gameId) => {
        const { data, error } = await supabase.rpc('apply_learning', {
          p_game_id: gameId,
        })

        expect(error).toBeNull()
        return data
      }),
    )

    expect(results).toEqual([1, 1, 1, 1, 1, 1, 1, 1])

    const { data: afterKnowledge, error: afterKnowledgeError } = await supabase
      .from('entity_attributes')
      .select(
        'value_boolean, confidence, evidence_count, positive_evidence, negative_evidence',
      )
      .eq('entity_id', entity.id)
      .eq('attribute_id', question.primary_attribute_id)
      .single()

    expect(afterKnowledgeError).toBeNull()
    expect(afterKnowledge).toBeTruthy()

    expect(afterKnowledge!.evidence_count).toBe(
      beforeKnowledge!.evidence_count + 8,
    )
    expect(afterKnowledge!.positive_evidence).toBe(
      beforeKnowledge!.positive_evidence + 8,
    )
    expect(afterKnowledge!.negative_evidence).toBe(
      beforeKnowledge!.negative_evidence,
    )
    expect(afterKnowledge!.value_boolean).toBe(true)
  }, 30000)

  it('is idempotent under concurrent duplicate learning retries', async () => {
    const session = await ensureAnonymousSession()
    expect(session.user).toBeTruthy()

    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id')
      .eq('active', true)
      .order('canonical_name', { ascending: true })
      .limit(1)
      .single()

    expect(entityError).toBeNull()
    expect(entity?.id).toBeTruthy()

    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    expect(questionError).toBeNull()
    expect(question?.id).toBeTruthy()

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
        p_question_id: question.id,
        p_answer: 'YES',
      },
    )

    expect(answerError).toBeNull()
    expect(gameQuestionId).toBeTruthy()

    const { error: finalizeError } = await supabase.rpc('finalize_game', {
      p_game_id: gameId,
      p_guessed_entity_id: entity.id,
      p_correct: true,
    })

    expect(finalizeError).toBeNull()

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        supabase.rpc('apply_learning', {
          p_game_id: gameId,
        }),
      ),
    )

    const errors = results.map((result) => result.error)
    const values = results.map((result) => result.data)

    expect(errors.every((error) => error === null)).toBe(true)
    expect(values.filter((value) => value === 1)).toHaveLength(1)
    expect(values.filter((value) => value === 0)).toHaveLength(7)
  }, 30000)

  it('isolates learning between independent games', async () => {
    const session = await ensureAnonymousSession()
    expect(session.user).toBeTruthy()

    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id')
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

    const { data: gameA, error: gameAError } = await supabase.rpc(
      'start_game',
      {},
    )
    expect(gameAError).toBeNull()
    expect(gameA).toBeTruthy()

    const { data: gameB, error: gameBError } = await supabase.rpc(
      'start_game',
      {},
    )
    expect(gameBError).toBeNull()
    expect(gameB).toBeTruthy()

    for (const gameId of [gameA, gameB]) {
      const { data: gameQuestionId, error: answerError } = await supabase.rpc(
        'record_answer',
        {
          p_game_id: gameId,
          p_question_id: question.id,
          p_answer: 'YES',
        },
      )

      expect(answerError).toBeNull()
      expect(gameQuestionId).toBeTruthy()

      const { error: finalizeError } = await supabase.rpc('finalize_game', {
        p_game_id: gameId,
        p_guessed_entity_id: entity.id,
        p_correct: true,
      })

      expect(finalizeError).toBeNull()
    }

    const { data: beforeKnowledge, error: beforeError } = await supabase
      .from('entity_attributes')
      .select('evidence_count, positive_evidence')
      .eq('entity_id', entity.id)
      .eq('attribute_id', question.primary_attribute_id)
      .single()

    expect(beforeError).toBeNull()
    expect(beforeKnowledge).toBeTruthy()

    const { data: firstApply, error: firstApplyError } = await supabase.rpc(
      'apply_learning',
      {
        p_game_id: gameA,
      },
    )

    expect(firstApplyError).toBeNull()
    expect(firstApply).toBe(1)

    const { data: afterGameA, error: afterGameAError } = await supabase
      .from('entity_attributes')
      .select('evidence_count, positive_evidence')
      .eq('entity_id', entity.id)
      .eq('attribute_id', question.primary_attribute_id)
      .single()

    expect(afterGameAError).toBeNull()
    expect(afterGameA!.evidence_count).toBe(beforeKnowledge!.evidence_count + 1)
    expect(afterGameA!.positive_evidence).toBe(
      beforeKnowledge!.positive_evidence + 1,
    )

    const { data: secondApply, error: secondApplyError } = await supabase.rpc(
      'apply_learning',
      {
        p_game_id: gameB,
      },
    )

    expect(secondApplyError).toBeNull()
    expect(secondApply).toBe(1)

    const { data: afterGameB, error: afterGameBError } = await supabase
      .from('entity_attributes')
      .select('evidence_count, positive_evidence')
      .eq('entity_id', entity.id)
      .eq('attribute_id', question.primary_attribute_id)
      .single()

    expect(afterGameBError).toBeNull()
    expect(afterGameB!.evidence_count).toBe(beforeKnowledge!.evidence_count + 2)
    expect(afterGameB!.positive_evidence).toBe(
      beforeKnowledge!.positive_evidence + 2,
    )
  }, 30000)

  it('rejects learning for a game owned by another user', async () => {
    const ownerSession = await ensureAnonymousSession()
    expect(ownerSession.user).toBeTruthy()

    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id')
      .eq('active', true)
      .order('canonical_name', { ascending: true })
      .limit(1)
      .single()

    expect(entityError).toBeNull()
    expect(entity?.id).toBeTruthy()

    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    expect(questionError).toBeNull()
    expect(question?.id).toBeTruthy()

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
        p_question_id: question.id,
        p_answer: 'YES',
      },
    )

    expect(answerError).toBeNull()
    expect(gameQuestionId).toBeTruthy()

    const { error: finalizeError } = await supabase.rpc('finalize_game', {
      p_game_id: gameId,
      p_guessed_entity_id: entity.id,
      p_correct: true,
    })

    expect(finalizeError).toBeNull()

    const ownerUserId = ownerSession.user.id

    const { data: otherSession, error: otherSessionError } =
      await supabase.auth.signInAnonymously()

    expect(otherSessionError).toBeNull()
    expect(otherSession?.user).toBeTruthy()
    expect(otherSession?.user.id).not.toBe(ownerUserId)

    const { data: learningResult, error: learningError } = await supabase.rpc(
      'apply_learning',
      {
        p_game_id: gameId,
      },
    )

    expect(learningResult).toBeNull()
    expect(learningError).not.toBeNull()
    expect(learningError?.message).toMatch(
      /completed correct game|permission|owner/i,
    )
  }, 30000)

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
