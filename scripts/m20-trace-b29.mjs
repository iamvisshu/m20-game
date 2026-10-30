import fs from 'node:fs'
import path from 'node:path'

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8')
process.env.VITE_SUPABASE_URL = env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.*)$/m)?.[1]?.trim()

import { adaptLiveDataset } from './data/liveDatasetAdapter.mjs'
import {
  createGame,
  answerQuestion,
} from '../src/engine/gameEngine.ts'

const TARGETS = [
  'e81cbd56-f47a-4e2b-9fba-93ab7fddb98a',
  'f97bf48e-ff66-463b-8f15-f9fafeb6198b',
  'a7ba8e39-ccfb-4f45-b134-fd221de9c306',
  '701ba361-2d37-4600-b355-1dbaad792460',
  '2c451254-101a-40bd-ba9b-17a07de153fa',
  'bc09520c-129a-45b0-9b98-771f0c248d02',
  '29adb99e-2bc7-4597-8528-b7b5b134f4ce',
]

const adapted = await adaptLiveDataset()

const context = {
  questions: adapted.questions,
  knowledgeByEntityAttribute: new Map(
    adapted.knowledge.map((knowledge) => [
      `${knowledge.entityId}:${knowledge.attributeId}`,
      knowledge,
    ]),
  ),
  categoriesByEntityId: new Map(
    Object.entries(adapted.categoryIdsByEntity),
  ),
  terminationConfig: {
    maxQuestions: 20,
    minGuessConfidence: 0.65,
    minGuessGap: 0.2,
  },
}

const entities = new Map(
  adapted.entities.map((entity) => [entity.id, entity.canonicalName]),
)

const questions = new Map(
  adapted.questions.map((question) => [question.id, question]),
)

const candidates = adapted.entities.map((entity) => entity.id)

for (const targetId of TARGETS) {
  console.log('\n============================================================')
  console.log(
    `TARGET: ${entities.get(targetId) ?? targetId} (${targetId})`,
  )
  console.log('============================================================')

  let state = createGame(
    candidates,
    context,
    `b29-trace-${targetId}`,
  )

  while (state.status === 'IN_PROGRESS') {
    const question = questions.get(state.currentQuestionId)

    if (!question) {
      throw new Error(
        `Missing question ${state.currentQuestionId}`,
      )
    }

    const knowledge = context.knowledgeByEntityAttribute.get(
      `${targetId}:${question.primaryAttributeId}`,
    )

    const answer = knowledge?.value === true ? 'YES' : 'NO'

    const turn = answerQuestion(
      state,
      question.id,
      answer,
      context,
    )

    const top = turn.state.rankedCandidates.slice(0, 5)

    console.log(
      JSON.stringify({
        q: state.questionsAsked + 1,
        questionId: question.id,
        question: question.text,
        attributeId: question.primaryAttributeId,
        answer,
        topCandidates: top.map((candidate) => ({
          entity: entities.get(candidate.entityId) ?? candidate.entityId,
          entityId: candidate.entityId,
          score: candidate.score,
        })),
        terminationReason: turn.state.terminationReason,
        guessed:
          turn.state.guessedEntityId
            ? entities.get(turn.state.guessedEntityId) ??
              turn.state.guessedEntityId
            : null,
      }),
    )

    state = turn.state
  }

  console.log(
    `RESULT: target=${entities.get(targetId) ?? targetId} | ` +
      `guess=${entities.get(state.guessedEntityId) ?? state.guessedEntityId} | ` +
      `questions=${state.questionsAsked} | ` +
      `termination=${state.terminationReason}`,
  )
}
