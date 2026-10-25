import { useEffect, useState } from 'react'
import type { AnswerValue } from './domain/answer'
import {
  answerCurrentQuestion,
  finalizeCurrentGame,
  startGame,
  type ActiveGame,
} from './features/game/gameService'
import { supabaseGameRepository } from './repositories'

const ANSWERS: AnswerValue[] = [
  'YES',
  'PROBABLY_YES',
  'UNKNOWN',
  'PROBABLY_NO',
  'NO',
]

function App() {
  const [game, setGame] = useState<ActiveGame | null>(null)
  const [answering, setAnswering] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [resultFinalized, setResultFinalized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initializeGame() {
      try {
        const activeGame = await startGame(supabaseGameRepository)

        if (!cancelled) {
          setGame(activeGame)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize game',
          )
        }
      }
    }

    void initializeGame()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAnswer(answer: AnswerValue) {
    if (!game || answering || finalizing) {
      return
    }

    setAnswering(true)
    setError(null)

    try {
      const nextGame = await answerCurrentQuestion(
        game,
        supabaseGameRepository,
        answer,
      )

      setGame(nextGame)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process answer')
    } finally {
      setAnswering(false)
    }
  }

  async function handleGuessConfirmation(correct: boolean) {
    if (!game || finalizing || resultFinalized) {
      return
    }

    setFinalizing(true)
    setError(null)

    try {
      const finalState = await finalizeCurrentGame(
        game,
        supabaseGameRepository,
        correct,
      )

      setGame({
        ...game,
        state: finalState,
      })

      setResultFinalized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize game')
    } finally {
      setFinalizing(false)
    }
  }

  if (!game) {
    return (
      <>
        <h1>M20</h1>
        {error ? <p>Error: {error}</p> : <p>Starting M20...</p>}
      </>
    )
  }

  const guessedEntityId = game.state.guessedEntityId
  const guessedEntityName = guessedEntityId
    ? (game.entityNames.get(guessedEntityId) ?? guessedEntityId)
    : null

  const gameFinished = game.state.status === 'COMPLETED'

  if (gameFinished) {
    return (
      <>
        <h1>M20</h1>

        <p>Game ID: {game.state.gameId}</p>

        <h2>I think you are thinking of: {guessedEntityName ?? 'Unknown'}</h2>

        <p>Questions answered: {game.state.questionsAsked}</p>

        {!resultFinalized ? (
          <>
            <p>Was I right?</p>

            <button
              type="button"
              disabled={finalizing}
              onClick={() => void handleGuessConfirmation(true)}
            >
              Yes
            </button>

            <button
              type="button"
              disabled={finalizing}
              onClick={() => void handleGuessConfirmation(false)}
            >
              No
            </button>
          </>
        ) : (
          <p>
            {game.state.outcome === 'CORRECT_GUESS'
              ? 'Great! I learned from this game.'
              : 'Thanks! I will keep this game as feedback.'}
          </p>
        )}

        {error && <p>Error: {error}</p>}
      </>
    )
  }

  const currentQuestionId = game.state.currentQuestionId

  const currentQuestion = currentQuestionId
    ? game.context.questions.find(
        (question) => question.id === currentQuestionId,
      )
    : undefined

  return (
    <>
      <h1>M20</h1>

      <p>Game ID: {game.state.gameId}</p>

      <p>Question {game.state.questionsAsked + 1}</p>

      {currentQuestion && (
        <>
          <h2>{currentQuestion.text}</h2>

          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              disabled={answering}
              onClick={() => void handleAnswer(answer)}
            >
              {answer}
            </button>
          ))}
        </>
      )}

      {error && <p>Error: {error}</p>}
    </>
  )
}

export default App
