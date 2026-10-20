import { useEffect, useState } from 'react'
import type { AnswerValue } from './domain/answer'
import {
  getNextActiveQuestion,
  recordAnswer,
  startGame,
  type GameQuestion,
} from './lib/gameApi'

const ANSWERS: AnswerValue[] = [
  'YES',
  'PROBABLY_YES',
  'UNKNOWN',
  'PROBABLY_NO',
  'NO',
]

function App() {
  const [gameId, setGameId] = useState<string | null>(null)
  const [question, setQuestion] = useState<GameQuestion | null>(null)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [answering, setAnswering] = useState(false)
  const [gameFinished, setGameFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function initializeGame() {
      try {
        const id = await startGame()
        const nextQuestion = await getNextActiveQuestion(id)

        if (!cancelled) {
          setGameId(id)
          setQuestion(nextQuestion)
          setGameFinished(nextQuestion === null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to initialize game',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void initializeGame()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleAnswer(answer: AnswerValue) {
    if (!gameId || !question || answering) {
      return
    }

    setAnswering(true)
    setError(null)

    try {
      await recordAnswer(gameId, question.id, answer)

      const nextQuestion = await getNextActiveQuestion(gameId)

      setQuestionsAnswered((count) => count + 1)
      setQuestion(nextQuestion)
      setGameFinished(nextQuestion === null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record answer')
    } finally {
      setAnswering(false)
    }
  }

  if (loading) {
    return <h1>Starting M20...</h1>
  }

  if (error) {
    return (
      <>
        <h1>M20</h1>
        <p>Error: {error}</p>
      </>
    )
  }

  if (gameFinished) {
    return (
      <>
        <h1>M20</h1>
        <p>Game ID: {gameId}</p>
        <h2>Question set completed.</h2>
        <p>Questions answered: {questionsAnswered}</p>
      </>
    )
  }

  return (
    <>
      <h1>M20</h1>

      <p>Game ID: {gameId}</p>

      <p>Question {questionsAnswered + 1}</p>

      {question && (
        <>
          <h2>{question.text}</h2>

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
    </>
  )
}

export default App
