import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { Question } from '../domain/question'

export type KnowledgeKey = `${string}:${string}`

export interface QuestionCandidate {
  question: Question
  informationGain: number
}

function entropy(probability: number): number {
  if (probability <= 0 || probability >= 1) {
    return 0
  }

  return (
    -probability * Math.log2(probability) -
    (1 - probability) * Math.log2(1 - probability)
  )
}

function knowledgeKey(entityId: string, attributeId: string): KnowledgeKey {
  return `${entityId}:${attributeId}`
}

export function calculateInformationGain(
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  attributeId: string,
): number {
  if (candidateIds.length <= 1) return 0

  let trueWeight = 0
  let knownWeight = 0

  for (const candidateId of candidateIds) {
    const knowledge = knowledgeByEntityAttribute.get(
      knowledgeKey(candidateId, attributeId),
    )

    if (!knowledge || knowledge.confidence <= 0) continue

    const weight = knowledge.confidence

    if (knowledge.value) {
      trueWeight += weight
    }

    knownWeight += weight
  }

  if (knownWeight === 0) return 0

  const probabilityTrue = trueWeight / knownWeight

  return entropy(probabilityTrue)
}

export function selectBestQuestion(
  questions: Question[],
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  askedQuestionIds: Set<string>,
): Question | undefined {
  const available = questions.filter(
    (question) => question.active && !askedQuestionIds.has(question.id),
  )

  const scored: QuestionCandidate[] = available.map((question) => ({
    question,
    informationGain: calculateInformationGain(
      candidateIds,
      knowledgeByEntityAttribute,
      question.primaryAttributeId,
    ),
  }))

  scored.sort((a, b) => b.informationGain - a.informationGain)

  return scored[0]?.question
}
