import { useCallback, useEffect, useState } from 'react'
import type { AnswerValue } from './domain/answer'
import type { Category } from './domain/entity'
import {
  answerCurrentQuestion,
  finalizeCurrentGame,
  startGame,
  type ActiveGame,
} from './features/game/gameService'
import { supabaseGameRepository } from './repositories'
import { ensureAnonymousSession } from './lib/auth'
import './App.css'

const MAX_QUESTIONS = 20

const ANSWERS: Array<{
  value: AnswerValue
  label: string
  description: string
}> = [
  {
    value: 'YES',
    label: 'Yes',
    description: 'Definitely',
  },
  {
    value: 'PROBABLY_YES',
    label: 'Probably yes',
    description: 'Most likely',
  },
  {
    value: 'UNKNOWN',
    label: 'Not sure',
    description: 'I cannot tell',
  },
  {
    value: 'PROBABLY_NO',
    label: 'Probably no',
    description: 'Probably not',
  },
  {
    value: 'NO',
    label: 'No',
    description: 'Definitely not',
  },
]

function App() {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  )
  const [game, setGame] = useState<ActiveGame | null>(null)
  const [answering, setAnswering] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [resultFinalized, setResultFinalized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true)
    setError(null)

    try {
      await ensureAnonymousSession()
      const loadedCategories = await supabaseGameRepository.loadCategories()

      setCategories(loadedCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        await ensureAnonymousSession()
        const loadedCategories = await supabaseGameRepository.loadCategories()

        if (!cancelled) {
          setCategories(loadedCategories)
          setCategoriesLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load categories',
          )
          setCategoriesLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCategorySelect = useCallback(async (categoryId?: string) => {
    setError(null)
    setGame(null)
    setResultFinalized(false)
    setSelectedCategoryId(categoryId ?? null)

    try {
      await ensureAnonymousSession()

      const activeGame = await startGame(supabaseGameRepository, categoryId)

      setGame(activeGame)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    }
  }, [])

  const handleRestart = useCallback(() => {
    setGame(null)
    setResultFinalized(false)
    setError(null)
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

  if (categoriesLoading) {
    return (
      <main className="app-shell">
        <section className="status-screen" aria-live="polite">
          <div className="brand-mark" aria-hidden="true">
            M20
          </div>

          <p className="eyebrow">Twenty questions, reimagined</p>
          <h1>Get ready.</h1>

          <p className="status-message">Loading categories...</p>

          <div className="loading-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    )
  }

  if (error && !game) {
    return (
      <main className="app-shell">
        <section className="status-screen" aria-live="polite">
          <div className="brand-mark" aria-hidden="true">
            M20
          </div>

          <p className="eyebrow">Something went wrong</p>
          <h1>We couldn't get things ready.</h1>

          <p className="status-message status-message--error">{error}</p>

          <button
            className="primary-button"
            type="button"
            onClick={() => void loadCategories()}
          >
            Try again
          </button>
        </section>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="app-shell">
        <section className="game-container category-screen">
          <header className="app-header">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                M20
              </span>

              <div>
                <span className="brand-name">M20</span>
                <span className="brand-tagline">Think. Answer. Guess.</span>
              </div>
            </div>
          </header>

          <div className="category-intro">
            <p className="eyebrow">Start a game</p>

            <h1>What are you thinking about?</h1>

            <p>
              Choose a category to help M20 narrow things down faster. Or let
              M20 search across everything.
            </p>
          </div>

          <div
            className="category-list"
            role="group"
            aria-label="Choose a category"
          >
            <button
              className="category-card category-card--all"
              type="button"
              onClick={() => void handleCategorySelect()}
            >
              <span className="category-card__icon" aria-hidden="true">
                ✦
              </span>

              <span className="category-card__content">
                <span className="category-card__name">Everything</span>

                <span className="category-card__description">
                  Search across all available categories
                </span>
              </span>

              <span className="category-card__arrow" aria-hidden="true">
                →
              </span>
            </button>

            {categories.map((category) => (
              <button
                className="category-card"
                key={category.id}
                type="button"
                onClick={() => void handleCategorySelect(category.id)}
              >
                <span className="category-card__icon" aria-hidden="true">
                  {getCategoryIcon(category.name)}
                </span>

                <span className="category-card__content">
                  <span className="category-card__name">{category.name}</span>

                  {category.description && (
                    <span className="category-card__description">
                      {category.description}
                    </span>
                  )}
                </span>

                <span className="category-card__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>

          <footer className="game-footer">
            <span>M20</span>
            <span aria-hidden="true">•</span>
            <span>Powered by what you know</span>
          </footer>
        </section>
      </main>
    )
  }

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  )

  const guessedEntityId = game.state.guessedEntityId
  const guessedEntityName = guessedEntityId
    ? (game.entityNames.get(guessedEntityId) ?? guessedEntityId)
    : null

  const gameFinished = game.state.status === 'COMPLETED'
  const questionNumber = game.state.questionsAsked + 1
  const progress = Math.min(
    (game.state.questionsAsked / MAX_QUESTIONS) * 100,
    100,
  )

  if (gameFinished) {
    return (
      <main className="app-shell">
        <section className="game-container result-screen">
          <header className="app-header">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true">
                M20
              </span>

              <span className="brand-name">M20</span>
            </div>

            <button
              className="header-action"
              type="button"
              onClick={handleRestart}
            >
              New game
            </button>
          </header>

          <div className="result-card">
            <p className="eyebrow">My guess</p>

            <div className="result-icon" aria-hidden="true">
              ?
            </div>

            <h1>I think you're thinking of...</h1>

            <p className="guess-name">
              {guessedEntityName ?? 'Something I could not identify'}
            </p>

            <p className="result-meta">
              I figured that out in {game.state.questionsAsked}{' '}
              {game.state.questionsAsked === 1 ? 'question' : 'questions'}.
            </p>

            {!resultFinalized ? (
              <div className="confirmation-section">
                <p className="confirmation-question">Was I right?</p>

                <div className="confirmation-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={finalizing}
                    onClick={() => void handleGuessConfirmation(true)}
                  >
                    {finalizing ? 'Saving...' : 'Yes, you got it'}
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    disabled={finalizing}
                    onClick={() => void handleGuessConfirmation(false)}
                  >
                    No, try again
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`feedback-message ${
                  game.state.outcome === 'CORRECT_GUESS'
                    ? 'feedback-message--success'
                    : 'feedback-message--neutral'
                }`}
                role="status"
              >
                {game.state.outcome === 'CORRECT_GUESS'
                  ? 'Great! I learned from this game.'
                  : 'Thanks! Your feedback helps M20 improve.'}
              </div>
            )}

            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
      </main>
    )
  }

  const currentQuestionId = game.state.currentQuestionId

  const currentQuestion = currentQuestionId
    ? game.context.questions.find(
        (question) => question.id === currentQuestionId,
      )
    : undefined

  return (
    <main className="app-shell">
      <section className="game-container">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              M20
            </span>

            <div>
              <span className="brand-name">M20</span>
              <span className="brand-tagline">Think. Answer. Guess.</span>
            </div>
          </div>

          <div className="header-right">
            {selectedCategory && (
              <span className="category-badge">{selectedCategory.name}</span>
            )}

            <div className="question-counter" aria-label="Question progress">
              <span className="question-counter__current">
                {Math.min(game.state.questionsAsked + 1, MAX_QUESTIONS)}
              </span>

              <span className="question-counter__separator">/</span>

              <span>{MAX_QUESTIONS}</span>
            </div>
          </div>
        </header>

        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={MAX_QUESTIONS}
          aria-valuenow={game.state.questionsAsked}
          aria-label={`Question ${Math.min(
            game.state.questionsAsked + 1,
            MAX_QUESTIONS,
          )} of ${MAX_QUESTIONS}`}
        >
          <div className="progress-value" style={{ width: `${progress}%` }} />
        </div>

        <div className="game-intro">
          <p className="eyebrow">Question {questionNumber}</p>

          <h1>Let's figure it out.</h1>

          <p>
            Answer as best you can. You can choose <strong>Not sure</strong> if
            you don't know.
          </p>
        </div>

        {currentQuestion ? (
          <div className="question-card">
            <h2>{currentQuestion.text}</h2>

            <div
              className="answer-list"
              aria-label="Choose your answer"
              role="group"
            >
              {ANSWERS.map((answer) => (
                <button
                  className="answer-button"
                  key={answer.value}
                  type="button"
                  disabled={answering}
                  onClick={() => void handleAnswer(answer.value)}
                >
                  <span className="answer-button__content">
                    <span className="answer-button__label">{answer.label}</span>

                    <span className="answer-button__description">
                      {answer.description}
                    </span>
                  </span>

                  <span className="answer-button__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>

            <div className="interaction-status" aria-live="polite">
              {answering ? (
                <>
                  <span className="small-spinner" aria-hidden="true" />
                  Thinking...
                </>
              ) : (
                'Choose the answer that fits best.'
              )}
            </div>
          </div>
        ) : (
          <div className="question-card question-card--empty" role="status">
            <div className="loading-indicator" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <p>Preparing the next question...</p>
          </div>
        )}

        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}

        <footer className="game-footer">
          <span>M20</span>
          <span aria-hidden="true">•</span>
          <span>
            {selectedCategory
              ? `Playing ${selectedCategory.name}`
              : 'Playing everything'}
          </span>
        </footer>
      </section>
    </main>
  )
}

function getCategoryIcon(categoryName: string): string {
  switch (categoryName.toLowerCase()) {
    case 'animals':
      return '🐾'
    case 'food':
      return '🍎'
    case 'food & drinks':
      return '🍽'
    case 'technology':
      return '⌘'
    case 'vehicles':
      return '🚗'
    case 'household':
      return '⌂'
    default:
      return '✦'
  }
}

export default App
