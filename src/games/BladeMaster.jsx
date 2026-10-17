
import { useCallback, useEffect, useRef, useState } from 'react'

const GAME_DURATION = 30
const KNIFE_LIMIT = 10
const THROW_COOLDOWN = 450
const COLLISION_GAP = 0.28

function BladeMaster({ onBack }) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [score, setScore] = useState(0)
  const [knives, setKnives] = useState([])
  const [finished, setFinished] = useState(false)
  const [message, setMessage] = useState(
    'Tap THROW to launch a knife!'
  )
  const [rotation, setRotation] = useState(0)

  const targetAngle = useRef(0)
  const knifeCount = useRef(0)
  const lastThrow = useRef(0)
  const knivesRef = useRef([])
  const finishedRef = useRef(false)

  // Keep the latest knives available to collision detection.
  const updateKnives = (nextKnives) => {
    knivesRef.current = nextKnives
    setKnives(nextKnives)
  }

  const endGame = useCallback((text) => {
    if (finishedRef.current) return

    finishedRef.current = true
    setFinished(true)
    setMessage(text)
  }, [])

  // Animate the target without tying rotation to mouse clicks.
  
  // Animate the target only while the round is active.
  // Keep the wheel rotating even when the round ends.
useEffect(() => {
  let frameId
  let previousTime = 0

  const animate = (time) => {
    if (previousTime) {
      const delta = Math.min(time - previousTime, 40)
      targetAngle.current += delta * 0.00055
      setRotation(targetAngle.current)
    }

    previousTime = time
    frameId = requestAnimationFrame(animate)
  }

  frameId = requestAnimationFrame(animate)

  return () => cancelAnimationFrame(frameId)
}, [])


  // Countdown uses elapsed time, so rapid clicking cannot pause it.
  useEffect(() => {
    if (finished) return

    const endTime = Date.now() + timeLeft * 1000

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((endTime - Date.now()) / 1000)
      )

      setTimeLeft(remaining)

      if (remaining <= 0) {
        endGame('Time is up!')
      }
    }, 100)

    return () => clearInterval(timer)
  }, [finished, endGame])

  const throwKnife = useCallback(() => {
    if (finishedRef.current) return

    const now = Date.now()

    if (now - lastThrow.current < THROW_COOLDOWN) return
    lastThrow.current = now

    const nextCount = knifeCount.current

    // Never allow more than the configured knife limit.
    if (nextCount >= KNIFE_LIMIT) return

    // The throw targets a fixed direction in screen space.
    // Convert that direction into the rotating target's coordinates.
    const screenAngle = -Math.PI / 2
    const targetLocalAngle = screenAngle - targetAngle.current

    const collision = knivesRef.current.some((knife) => {
      const difference = Math.atan2(
        Math.sin(knife.angle - targetLocalAngle),
        Math.cos(knife.angle - targetLocalAngle)
      )

      return Math.abs(difference) < COLLISION_GAP
    })

    if (collision) {
      endGame('Collision! Your knife hit another knife.')
      return
    }

    const newKnife = {
      id: `${now}-${nextCount}`,
      angle: targetLocalAngle,
    }

    knifeCount.current += 1

    updateKnives([...knivesRef.current, newKnife])
    setScore((current) => current + 10)
    setMessage('Nice throw! Keep going.')

    if (knifeCount.current >= KNIFE_LIMIT) {
      endGame('Stage cleared! Excellent throwing!')
    }
  }, [endGame])

  const restart = () => {
    targetAngle.current = 0
    knifeCount.current = 0
    lastThrow.current = 0
    finishedRef.current = false

    setRotation(0)
    setTimeLeft(GAME_DURATION)
    setScore(0)
    updateKnives([])
    setFinished(false)
    setMessage('Tap THROW to launch a knife!')
  }

  return (
    <main className="blade-page">
      <style>{`
        .blade-page {
          min-height: 100vh;
          padding: 22px 16px 36px;
          box-sizing: border-box;
          background: radial-gradient(circle at top, #29345a, #101322 70%);
          color: #f7f7ff;
          text-align: center;
          font-family: Arial, sans-serif;
        }

        .blade-topbar {
          max-width: 650px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .blade-button {
          border: 1px solid #555d82;
          border-radius: 10px;
          padding: 10px 15px;
          background: #222943;
          color: white;
          cursor: pointer;
          font-weight: 700;
        }

        .blade-stats {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin: 20px auto;
        }

        .blade-stat {
          min-width: 95px;
          padding: 12px 18px;
          box-sizing: border-box;
          border: 1px solid #394568;
          border-radius: 12px;
          background: #1a2035;
        }

        .blade-stat small {
          display: block;
          color: #aeb7d9;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .blade-stat strong {
          font-size: 23px;
        }

        .blade-arena {
          width: min(100%, 380px);
          aspect-ratio: 1;
          position: relative;
          margin: 24px auto;
          border-radius: 50%;
          background: radial-gradient(circle, #111729, #090d18);
          border: 2px solid #52628c;
          box-shadow: 0 0 35px #407dff22, inset 0 0 30px #000;
          overflow: hidden;
          touch-action: manipulation;
        }

        .blade-target {
          position: absolute;
          width: 58%;
          height: 58%;
          left: 21%;
          top: 21%;
          box-sizing: border-box;
          border-radius: 50%;
          border: 9px solid #6c3518;
          background:
            repeating-radial-gradient(circle, transparent 0 17px, #b76c2e 18px 20px),
            radial-gradient(circle, #f6c46b 0 12%, #d98b35 13% 29%, #9d4a22 30% 43%, #d99b49 44% 66%, #8c441f 67%);
          box-shadow: inset 0 0 12px #3e180c, 0 0 0 3px #d79b4a;
        }

        .blade-bullseye {
          position: absolute;
          width: 18%;
          height: 18%;
          top: 41%;
          left: 41%;
          border-radius: 50%;
          background: radial-gradient(circle, #fff1a0, #ff8b1f 48%, #b92e17 52%);
          border: 3px solid #ffd879;
          box-shadow: 0 0 22px #ff9b28;
          box-sizing: border-box;
        }

        /* Knives point inward from the target's outer edge. */
        .blade-stuck-knife {
          position: absolute;
          left: 50%;
          top: 2%;
          width: 5px;
          height: 48%;
          transform-origin: 50% 100%;
          border-radius: 4px;
          background: linear-gradient(to right, #a7b4d1, #f7fbff, #7385a8);
          box-shadow: 0 0 5px #7db7ff;
        }

        .blade-stuck-knife::before {
          content: "";
          position: absolute;
          top: 0;
          left: -5px;
          width: 15px;
          height: 24px;
          background: linear-gradient(90deg, #a9b9d4, #fff, #7788a9);
          clip-path: polygon(50% 0, 100% 80%, 50% 100%, 0 80%);
        }

        .blade-launch {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          border: 3px solid #b9ff72;
          background: linear-gradient(#6cdb28, #248a12);
          color: white;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 0 24px #6cdb2860;
        }

        .blade-launch:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .blade-message {
          min-height: 24px;
          color: #ffdf83;
          font-weight: 700;
        }

        .blade-instructions {
          color: #b5bdd8;
          font-size: 13px;
          line-height: 1.6;
        }

        @media (max-width: 420px) {
          .blade-stat {
            min-width: 75px;
            padding: 10px;
          }

          .blade-stat strong {
            font-size: 19px;
          }

          .blade-arena {
            width: min(100%, 330px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .blade-launch {
            box-shadow: none;
          }
        }
      `}</style>

      <header className="blade-topbar">
        <button className="blade-button" onClick={onBack}>
          ← Back
        </button>

        <strong>⚔ BLADE MASTER</strong>

        <span style={{ color: '#ffdc78', fontWeight: 800 }}>
          STAGE 1
        </span>
      </header>

      <h1>Aim. Throw. Hit Perfect!</h1>

      <p className="blade-instructions">
        Throw knives at the rotating target. Avoid hitting a knife already stuck.
      </p>

      <section className="blade-stats">
        <div className="blade-stat">
          <small>TIME</small>
          <strong>{timeLeft}s</strong>
        </div>

        <div className="blade-stat">
          <small>SCORE</small>
          <strong>{score}</strong>
        </div>

        <div className="blade-stat">
          <small>KNIVES</small>
          <strong>{knives.length}/{KNIFE_LIMIT}</strong>
        </div>
      </section>

      <div className="blade-arena" aria-label="Rotating knife target">
        <div
          className="blade-target"
          style={{ transform: `rotate(${rotation}rad)` }}
        >
          <div className="blade-bullseye" />

          {knives.map((knife) => (
            <div
              key={knife.id}
              className="blade-stuck-knife"
              style={{
                transform: `rotate(${knife.angle}rad)`,
              }}
            />
          ))}
        </div>
      </div>

      <p className="blade-message" aria-live="polite">
        {message}
      </p>

      {finished ? (
        <section>
          <h2>
            {message.startsWith('Stage cleared')
              ? 'Stage Cleared!'
              : 'Round Over!'}
          </h2>

          <p>
            Your score: <strong>{score}</strong>
          </p>

          <button className="blade-button" onClick={restart}>
            Play Again
          </button>

          <button
            className="blade-button"
            style={{ marginLeft: 10 }}
            onClick={onBack}
          >
            No Thanks
          </button>
        </section>
      ) : (
        <button
          className="blade-launch"
          onClick={throwKnife}
          disabled={finished}
        >
          THROW
        </button>
      )}

      <p className="blade-instructions" style={{ marginTop: 22 }}>
        Each successful throw earns 10 points. Throw up to 10 knives or finish
        when the timer expires.
      </p>
    </main>
  )
}

export default BladeMaster
