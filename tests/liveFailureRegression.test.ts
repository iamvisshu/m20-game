import { describe, expect, it } from 'vitest'
import { adaptLiveDataset } from '../scripts/data/liveDatasetAdapter.mjs'
import {
  answerQuestion,
  createGame,
} from '../src/engine/gameEngine'

const TARGETS = [
  {
    name: 'Bus',
    targetId: 'e81cbd56-f47a-4e2b-9fba-93ab7fddb98a',
    wrongGuessId: 'e65e69b0-4190-475a-85b5-29b4a0b763fe',
    wrongGuess: 'Car',
  },
  {
    name: 'Cow',
    targetId: 'f97bf48e-ff66-463b-8f15-f9fafeb6198b',
    wrongGuessId: '6d6158e3-14a2-4613-b3e8-3fe9bd3e42ed',
    wrongGuess: 'Horse',
  },
  {
    name: 'Shark',
    targetId: 'a7ba8e39-ccfb-4f45-b134-fd221de9c306',
    wrongGuessId: '808f0817-4d01-4e45-bd51-3b27380da6f9',
    wrongGuess: 'Fish',
  },
  {
    name: 'Grape',
    targetId: '701ba361-2d37-4600-b355-1dbaad792460',
    wrongGuessId: '05e48061-eb88-48b5-a0c2-137bafe6e56a',
    wrongGuess: 'Mango',
  },
  {
    name: 'Potato',
    targetId: '2c451254-101a-40bd-ba9b-17a07de153fa',
    wrongGuessId: '3b0a58fd-0c7a-4c1e-9f20-5d4a7d7a0c1a',
    wrongGuess: 'Carrot',
  },
  {
    name: 'Juice',
    targetId: 'bc09520b-129a-45b0-9b98-771f0c248d02',
    wrongGuessId: 'f42fccdd-bd20-4d8c-9e3a-f8dee2cfc034',
    wrongGuess: 'Tea',
  },
  {
    name: 'Table',
    targetId: '29adb99e-2bc7-4597-8528-b7b5b134f4ce',
    wrongGuessId: '18550f0a-7e0c-4c93-9a5d-8f6b4e2c1d0a',
    wrongGuess: 'Chair',
  },
]

const MAX_QUESTIONS = 20

async function createLiveContext() {
  const adapted = await adaptLiveDataset()

  const knowledgeByEntityAttribute = new Map(
    adapted.knowledge.map((knowledge) => [
      `${knowledge.entityId}:${knowledge.attributeId}`,
      knowledge,
    ]),
  )

  const categoriesByEntityId = new Map(
    Object.entries(adapted.categoryIdsByEntity),
  )

  return {
    adapted,
    context: {
      questions: adapted.questions,
      knowledgeByEntityAttribute,
      categoriesByEntityId,
      terminationConfig: {
        maxQuestions: MAX_QUESTIONS,
        minGuessConfidence: 0.65,
        minGuessGap: 0.2,
      },
    },
  }
}

async function runLiveGame(targetId: string) {
  const { adapted, context } = await createLiveContext()

  const entities = new Map(
    adapted.entities.map((entity) => [
      entity.id,
      entity.canonicalName,
    ]),
  )

  const questions = new Map(
    adapted.questions.map((question) => [
      question.id,
      question,
    ]),
  )

  const candidates = adapted.entities.map(
    (entity) => entity.id,
  )

  let state = createGame(
    candidates,
    context,
    `b29-regression-${targetId}`,
  )

  const trace: Array<{
    questionId: string
    question: string
    answer: string
    topCandidates: string[]
  }> = []

  while (state.status === 'IN_PROGRESS') {
    if (state.questionsAsked >= MAX_QUESTIONS) {
      break
    }

    const questionId = state.currentQuestionId

    if (!questionId) {
      throw new Error(
        `No current question for target ${targetId}`,
      )
    }

    const question = questions.get(questionId)

    if (!question) {
      throw new Error(
        `Question not found: ${questionId}`,
      )
    }

    const knowledge =
      context.knowledgeByEntityAttribute.get(
        `${targetId}:${question.primaryAttributeId}`,
      )

    /*
     * Match the original B29 trace exactly:
     *
     * true  -> YES
     * false / missing -> NO
     */
    const answer =
      knowledge?.value === true
        ? 'YES'
        : 'NO'

    const result = answerQuestion(
      state,
      question.id,
      answer,
      context,
    )

    trace.push({
      questionId: question.id,
      question: question.text,
      answer,
      topCandidates: result.state.rankedCandidates
        .slice(0, 5)
        .map(
          (candidate) =>
            entities.get(candidate.entityId) ??
            candidate.entityId,
        ),
    })

    state = result.state
  }

  return {
    state,
    trace,
    entities,
  }
}

describe('B29 live failure regressions', () => {
  it.each(TARGETS)(
    '$name must not reproduce the captured wrong guess',
    async ({
      name,
      targetId,
      wrongGuessId,
      wrongGuess,
    }) => {
      const result = await runLiveGame(targetId)

      const guessedEntityId =
        result.state.guessedEntityId

      const guessedName = guessedEntityId
        ? result.entities.get(guessedEntityId) ??
          guessedEntityId
        : null

      /*
       * Regression condition:
       *
       * The captured B29 failure was:
       *   target -> wrongGuess
       *
       * Therefore the engine must no longer finish with
       * that exact wrong candidate.
       */
      expect(
        guessedEntityId,
        `${name} reproduced captured wrong guess ${wrongGuess}`,
      ).not.toBe(wrongGuessId)

      expect(
        guessedName,
        `${name} should be guessed correctly`,
      ).toBe(name)

      /*
       * The game must remain bounded by the normal
       * twenty-question limit.
       */
      expect(
        result.state.questionsAsked,
      ).toBeLessThanOrEqual(MAX_QUESTIONS)
    },
  )
})