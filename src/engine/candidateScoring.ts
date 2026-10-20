import type { AnswerValue } from '../domain/answer'
import type { EntityAttributeKnowledge } from '../domain/knowledge'

export interface Candidate {
  entityId: string
  score: number
}

export interface CandidateScore {
  entityId: string
  score: number
  evidenceWeight: number
}

const COMPATIBILITY: Record<AnswerValue, Record<'TRUE' | 'FALSE', number>> = {
  YES: {
    TRUE: 1,
    FALSE: -1,
  },
  PROBABLY_YES: {
    TRUE: 0.5,
    FALSE: -0.5,
  },
  UNKNOWN: {
    TRUE: 0,
    FALSE: 0,
  },
  PROBABLY_NO: {
    TRUE: -0.5,
    FALSE: 0.5,
  },
  NO: {
    TRUE: -1,
    FALSE: 1,
  },
}

export function scoreCandidate(
  answer: AnswerValue,
  knowledge: EntityAttributeKnowledge | undefined,
): CandidateScore {
  if (!knowledge || knowledge.confidence <= 0) {
    return {
      entityId: knowledge?.entityId ?? '',
      score: 0,
      evidenceWeight: 0,
    }
  }

  const value = knowledge.value ? 'TRUE' : 'FALSE'
  const compatibility = COMPATIBILITY[answer][value]
  const contribution = knowledge.confidence * compatibility

  return {
    entityId: knowledge.entityId,
    score: contribution,
    evidenceWeight: knowledge.confidence,
  }
}

export function rankCandidates(
  candidateIds: string[],
  answer: AnswerValue,
  knowledgeByEntity: Map<string, EntityAttributeKnowledge>,
): Candidate[] {
  return candidateIds
    .map((entityId) => {
      const result = scoreCandidate(answer, knowledgeByEntity.get(entityId))

      return {
        entityId,
        score: result.score,
      }
    })
    .sort((a, b) => b.score - a.score)
}
