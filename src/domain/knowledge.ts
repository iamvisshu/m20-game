import type { AnswerValue } from './answer'
import type { Attribute } from './attribute'
import type { Entity } from './entity'

export type KnowledgeValue = boolean

export interface Evidence {
  id: string
  gameId: string
  entityId: Entity['id']
  attributeId: Attribute['id']
  questionId: string
  answer: AnswerValue
}

export interface EntityAttributeKnowledge {
  entityId: Entity['id']
  attributeId: Attribute['id']
  value: KnowledgeValue
  confidence: number
  evidenceCount: number
  positiveEvidence: number
  negativeEvidence: number
}

export function calculateKnowledgeConfidence(
  positiveEvidence: number,
  negativeEvidence: number,
): number {
  const total = positiveEvidence + negativeEvidence

  if (total === 0) {
    return 0
  }

  return positiveEvidence / total
}
