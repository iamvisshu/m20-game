import type { AnswerValue } from '../domain/answer'
import type { EntityAttributeKnowledge } from '../domain/knowledge'
import type { Question } from '../domain/question'

export type KnowledgeKey = `${string}:${string}`

export interface AnswerStateProbabilities {
  YES: number
  PROBABLY_YES: number
  UNKNOWN: number
  PROBABLY_NO: number
  NO: number
}

export interface QuestionCandidate {
  question: Question
  informationGain: number
  coverage: number
  reliability: number
  redundancyPenalty: number
  applicability: number
  categoryFit: number
  finalScore: number
}

export interface QuestionSelectionConfig {
  coverageWeight?: number
  reliabilityWeight?: number
  redundancyPenalty?: number
  categoryFitWeight?: number
  minimumApplicability?: number
  applicabilityByQuestionId?: Map<string, number>
  categoryFitByQuestionId?: Map<string, number>
  candidateWeights?: Map<string, number>
}

const DEFAULT_SELECTION_CONFIG: Required<
  Omit<
    QuestionSelectionConfig,
    'applicabilityByQuestionId' | 'categoryFitByQuestionId' | 'candidateWeights'
  >
> = {
  coverageWeight: 0.5,
  reliabilityWeight: 1,
  redundancyPenalty: 0.25,
  categoryFitWeight: 0.35,
  minimumApplicability: 0.25,
}

const ANSWER_STATES: AnswerValue[] = [
  'YES',
  'PROBABLY_YES',
  'UNKNOWN',
  'PROBABLY_NO',
  'NO',
]

const BASE_PROBABILITIES_TRUE: AnswerStateProbabilities = {
  YES: 0.7,
  PROBABLY_YES: 0.15,
  UNKNOWN: 0.1,
  PROBABLY_NO: 0.04,
  NO: 0.01,
}

const BASE_PROBABILITIES_FALSE: AnswerStateProbabilities = {
  YES: 0.01,
  PROBABLY_YES: 0.04,
  UNKNOWN: 0.1,
  PROBABLY_NO: 0.15,
  NO: 0.7,
}

const UNIFORM_PROBABILITY = 1 / ANSWER_STATES.length

function knowledgeKey(entityId: string, attributeId: string): KnowledgeKey {
  return `${entityId}:${attributeId}`
}

function entropy(probabilities: number[]): number {
  return probabilities.reduce((total, probability) => {
    if (probability <= 0) return total
    return total - probability * Math.log2(probability)
  }, 0)
}

function getBaseProbabilities(value: boolean): AnswerStateProbabilities {
  return value ? BASE_PROBABILITIES_TRUE : BASE_PROBABILITIES_FALSE
}

function getAnswerStateProbability(
  answer: AnswerValue,
  knowledge: EntityAttributeKnowledge | undefined,
): number {
  if (!knowledge || knowledge.confidence <= 0) {
    return UNIFORM_PROBABILITY
  }

  const confidence = Math.min(1, Math.max(0, knowledge.confidence))
  const baseProbability = getBaseProbabilities(knowledge.value)[answer]

  return confidence * baseProbability + (1 - confidence) * UNIFORM_PROBABILITY
}

export function calculateAnswerStateProbabilities(
  knowledge: EntityAttributeKnowledge | undefined,
): AnswerStateProbabilities {
  if (!knowledge || knowledge.confidence <= 0) {
    return {
      YES: UNIFORM_PROBABILITY,
      PROBABLY_YES: UNIFORM_PROBABILITY,
      UNKNOWN: UNIFORM_PROBABILITY,
      PROBABLY_NO: UNIFORM_PROBABILITY,
      NO: UNIFORM_PROBABILITY,
    }
  }

  const confidence = Math.min(1, Math.max(0, knowledge.confidence))
  const base = getBaseProbabilities(knowledge.value)

  const probabilities: AnswerStateProbabilities = {
    YES: base.YES * confidence + UNIFORM_PROBABILITY * (1 - confidence),
    PROBABLY_YES:
      base.PROBABLY_YES * confidence + UNIFORM_PROBABILITY * (1 - confidence),
    UNKNOWN: base.UNKNOWN * confidence + UNIFORM_PROBABILITY * (1 - confidence),
    PROBABLY_NO:
      base.PROBABLY_NO * confidence + UNIFORM_PROBABILITY * (1 - confidence),
    NO: base.NO * confidence + UNIFORM_PROBABILITY * (1 - confidence),
  }

  const total = ANSWER_STATES.reduce(
    (sum, answer) => sum + probabilities[answer],
    0,
  )

  return {
    YES: probabilities.YES / total,
    PROBABLY_YES: probabilities.PROBABLY_YES / total,
    UNKNOWN: probabilities.UNKNOWN / total,
    PROBABLY_NO: probabilities.PROBABLY_NO / total,
    NO: probabilities.NO / total,
  }
}

function calculateCoverage(
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  attributeId: string,
): number {
  if (candidateIds.length === 0) return 0

  const knownCandidates = candidateIds.filter((candidateId) => {
    const knowledge = knowledgeByEntityAttribute.get(
      knowledgeKey(candidateId, attributeId),
    )

    return Boolean(knowledge && knowledge.confidence > 0)
  }).length

  return knownCandidates / candidateIds.length
}

function calculateReliability(
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  attributeId: string,
): number {
  if (candidateIds.length === 0) return 0

  let weightedConfidence = 0
  let knownCandidates = 0

  for (const candidateId of candidateIds) {
    const knowledge = knowledgeByEntityAttribute.get(
      knowledgeKey(candidateId, attributeId),
    )

    if (!knowledge || knowledge.confidence <= 0) continue

    knownCandidates += 1
    weightedConfidence += Math.min(1, Math.max(0, knowledge.confidence))
  }

  if (knownCandidates === 0) return 0

  return weightedConfidence / knownCandidates
}

function calculateRedundancyPenalty(
  question: Question,
  questions: Question[],
  askedQuestionIds: Set<string>,
): number {
  if (askedQuestionIds.size === 0) return 0

  const askedQuestions = questions.filter((candidate) =>
    askedQuestionIds.has(candidate.id),
  )

  if (askedQuestions.length === 0) return 0

  const sameFamily = question.questionFamilyId
    ? askedQuestions.filter(
        (askedQuestion) =>
          askedQuestion.questionFamilyId === question.questionFamilyId,
      ).length
    : 0

  const sameAttribute = askedQuestions.filter(
    (askedQuestion) =>
      askedQuestion.primaryAttributeId === question.primaryAttributeId,
  ).length

  if (sameFamily > 0) return Math.min(1, 0.5 + sameFamily * 0.15)
  if (sameAttribute > 0) return Math.min(1, 0.25 + sameAttribute * 0.1)

  return 0
}

function normalizeCandidateWeights(
  candidateIds: string[],
  candidateWeights?: Map<string, number>,
): Map<string, number> {
  const weights = new Map<string, number>()

  if (!candidateWeights) {
    const uniformWeight = 1 / candidateIds.length

    for (const candidateId of candidateIds) {
      weights.set(candidateId, uniformWeight)
    }

    return weights
  }

  let total = 0

  for (const candidateId of candidateIds) {
    const weight = Math.max(0, candidateWeights.get(candidateId) ?? 0)
    weights.set(candidateId, weight)
    total += weight
  }

  if (total <= 0) {
    const uniformWeight = 1 / candidateIds.length

    for (const candidateId of candidateIds) {
      weights.set(candidateId, uniformWeight)
    }

    return weights
  }

  for (const candidateId of candidateIds) {
    weights.set(
      candidateId,
      (weights.get(candidateId) ?? 0) / total,
    )
  }

  return weights
}

function calculateExpectedEntropy(
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  attributeId: string,
  candidateWeights?: Map<string, number>,
): number {
  if (candidateIds.length <= 1) return 0

  const normalizedWeights = normalizeCandidateWeights(
    candidateIds,
    candidateWeights,
  )

  const answerProbabilities = ANSWER_STATES.map((answer) => {
    const probability = candidateIds.reduce((sum, candidateId) => {
      const knowledge = knowledgeByEntityAttribute.get(
        knowledgeKey(candidateId, attributeId),
      )

      return (
        sum +
        (normalizedWeights.get(candidateId) ?? 0) *
          getAnswerStateProbability(answer, knowledge)
      )
    }, 0)

    return {
      answer,
      probability,
    }
  })

  return answerProbabilities.reduce((expectedEntropy, state) => {
    if (state.probability <= 0) return expectedEntropy

    const posterior = candidateIds.map((candidateId) => {
      const knowledge = knowledgeByEntityAttribute.get(
        knowledgeKey(candidateId, attributeId),
      )

      return (
        ((normalizedWeights.get(candidateId) ?? 0) *
          getAnswerStateProbability(state.answer, knowledge)) /
        state.probability
      )
    })

    return expectedEntropy + state.probability * entropy(posterior)
  }, 0)
}

export function calculateInformationGain(
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  attributeId: string,
  candidateWeights?: Map<string, number>,
): number {
  if (candidateIds.length <= 1) return 0

  const normalizedWeights = normalizeCandidateWeights(
    candidateIds,
    candidateWeights,
  )

  const priorEntropy = entropy([...normalizedWeights.values()])
  const expectedPosteriorEntropy = calculateExpectedEntropy(
    candidateIds,
    knowledgeByEntityAttribute,
    attributeId,
    candidateWeights,
  )

  return Math.max(0, priorEntropy - expectedPosteriorEntropy)
}

export function selectBestQuestion(
  questions: Question[],
  candidateIds: string[],
  knowledgeByEntityAttribute: Map<KnowledgeKey, EntityAttributeKnowledge>,
  askedQuestionIds: Set<string>,
  config: QuestionSelectionConfig = {},
): Question | undefined {
  const selectionConfig = {
    ...DEFAULT_SELECTION_CONFIG,
    ...config,
  }

  const available = questions.filter((question) => {
    if (!question.active || askedQuestionIds.has(question.id)) {
      return false
    }

    const applicability =
      selectionConfig.applicabilityByQuestionId?.get(question.id) ?? 1

    return applicability >= selectionConfig.minimumApplicability
  })

  const scored: QuestionCandidate[] = available.map((question) => {
    const informationGain = calculateInformationGain(
      candidateIds,
      knowledgeByEntityAttribute,
      question.primaryAttributeId,
      selectionConfig.candidateWeights,
    )

    const coverage = calculateCoverage(
      candidateIds,
      knowledgeByEntityAttribute,
      question.primaryAttributeId,
    )

    const reliability = calculateReliability(
      candidateIds,
      knowledgeByEntityAttribute,
      question.primaryAttributeId,
    )

    const redundancyPenalty = calculateRedundancyPenalty(
      question,
      questions,
      askedQuestionIds,
    )

    const applicability =
      selectionConfig.applicabilityByQuestionId?.get(question.id) ?? 1

    const categoryFit =
      selectionConfig.categoryFitByQuestionId?.get(question.id) ?? 1

    const coverageFactor = 1 - selectionConfig.coverageWeight * (1 - coverage)

    const reliabilityFactor =
      1 - selectionConfig.reliabilityWeight * (1 - reliability)

    const redundancyFactor =
      1 - selectionConfig.redundancyPenalty * redundancyPenalty

    const categoryFitFactor =
      1 - selectionConfig.categoryFitWeight * (1 - categoryFit)

    const finalScore = Math.max(
      0,
      informationGain *
        coverageFactor *
        reliabilityFactor *
        redundancyFactor *
        categoryFitFactor *
        applicability,
    )

    return {
      question,
      informationGain,
      coverage,
      reliability,
      redundancyPenalty,
      applicability,
      categoryFit,
      finalScore,
    }
  })

  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore
    }

    if (b.informationGain !== a.informationGain) {
      return b.informationGain - a.informationGain
    }

    return (
      questions.findIndex((question) => question.id === a.question.id) -
      questions.findIndex((question) => question.id === b.question.id)
    )
  })

  return scored[0]?.question
}
