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

const MAX_EVIDENCE_RELIABILITY = 0.9

export function calculateEvidenceReliability(evidenceCount: number): number {
  if (evidenceCount <= 0) {
    return 0
  }

  return Math.min(MAX_EVIDENCE_RELIABILITY, evidenceCount / (evidenceCount + 2))
}

export function calculateEvidenceWeight(
  knowledge: EntityAttributeKnowledge | undefined,
): number {
  if (!knowledge || knowledge.confidence <= 0) {
    return 0
  }

  const confidence = Math.min(1, Math.max(0, knowledge.confidence))

  if (knowledge.evidenceCount <= 0) {
    return 0
  }

  const evidenceReliability = calculateEvidenceReliability(
    knowledge.evidenceCount,
  )

  return confidence + (1 - confidence) * evidenceReliability
}

export function scoreCandidate(
  answer: AnswerValue,
  knowledge: EntityAttributeKnowledge | undefined,
  attributeOccurrence = 1,
): CandidateScore {
  const evidenceWeight = calculateEvidenceWeight(knowledge)

  if (!knowledge || evidenceWeight <= 0) {
    return {
      entityId: knowledge?.entityId ?? '',
      score: 0,
      evidenceWeight: 0,
    }
  }

  const occurrence = Math.max(1, attributeOccurrence)
  const repetitionWeight = 1 / Math.sqrt(occurrence)
  const value = knowledge.value ? 'TRUE' : 'FALSE'
  const compatibility = COMPATIBILITY[answer][value]
  const contribution = evidenceWeight * compatibility * repetitionWeight

  return {
    entityId: knowledge.entityId,
    score: contribution,
    evidenceWeight,
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
