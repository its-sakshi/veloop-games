
import { useEffect, useState } from 'react'

const GAME_DURATION = 15

function TapChallenge({ onBack, onGameOver }) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  // Countdown runs independently of tapping and score updates.
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          clearInterval(timer)
          setFinished(true)
          return 0
        }

        return previousTime - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Notify the parent once when the game ends.
  useEffect(() => {
    if (finished) {
      onGameOver?.(score)
    }
  }, [finished, score, onGameOver])

  const handleTap = () => {
    if (!finished) {
      setScore((currentScore) => currentScore + 1)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px',
        background: '#f5f7ff',
        color: '#161827',
        textAlign: 'center',
      }}
    >
      <button type="button" onClick={onBack}>
        ← Back to Games
      </button>

      <h1 style={{ marginTop: '28px' }}>Tap Challenge</h1>
      <p>Tap the target as many times as you can!</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
        <p>Time: <strong>{timeLeft}s</strong></p>
        <p>Score: <strong>{score}</strong></p>
      </div>

      {!finished ? (
        <button
          type="button"
          onClick={handleTap}
          aria-label="Tap target"
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            border: 'none',
            background: '#8b78f5',
            color: 'white',
            fontSize: '24px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 30px #8b78f555',
          }}
        >
          TAP!
        </button>
      ) : (
        <section>
          <h2>Game Over!</h2>
          <p>Your final score: <strong>{score}</strong></p>
          <button type="button" onClick={onBack}>
            Back to Games
          </button>
        </section>
      )}
    </main>
  )
}

export default TapChallenge
