import { useCallback, useEffect, useRef, useState } from 'react'
import './BladeMaster.css'

const GAME_DURATION = 30
const KNIFE_LIMIT = 10
const MAX_LIVES = 3
const THROW_DURATION = 400
const COLLISION_GAP = 0.22

export default function BladeMaster({ onBack }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [knives, setKnives] = useState([])
  const [rotation, setRotation] = useState(0)
  const [isThrowing, setIsThrowing] = useState(false)
  const [message, setMessage] = useState('Tap START to begin session!')
  const [impact, setImpact] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const rotationRef = useRef(0)
  const knivesRef = useRef([])
  const scoreRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const finishedRef = useRef(false)
  const throwingRef = useRef(false)
  const startedAtRef = useRef(0)
  const timeRef = useRef(GAME_DURATION)
  const throwTimeoutRef = useRef(null)
  const impactTimeoutRef = useRef(null)
  const gameIdRef = useRef(0)
  const resultRef = useRef('')

  const updateKnives = (next) => {
    knivesRef.current = next
    setKnives(next)
  }

  const clearGameTimeouts = () => {
    if (throwTimeoutRef.current !== null) {
      window.clearTimeout(throwTimeoutRef.current)
      throwTimeoutRef.current = null
    }

    if (impactTimeoutRef.current !== null) {
      window.clearTimeout(impactTimeoutRef.current)
      impactTimeoutRef.current = null
    }
  }

  const endGame = useCallback((result) => {
    if (finishedRef.current) return

    finishedRef.current = true
    throwingRef.current = false
    resultRef.current = result

    clearGameTimeouts()
    setIsThrowing(false)
    setMessage(result)
    setIsGameOver(true)
  }, [])

  // Dynamic cyber-wheel rotation (only runs when isPlaying is true)
  useEffect(() => {
    if (!isPlaying || isGameOver) return

    let frameId
    let previousTime = 0

    const animate = (now) => {
      if (previousTime !== 0 && !finishedRef.current) {
        const delta = Math.min(now - previousTime, 40)
        const landed = knivesRef.current.length
        const speedLevel = Math.floor(landed / 3)
        const speed = 0.0015 + speedLevel * 0.0004

        rotationRef.current += delta * speed
        setRotation(rotationRef.current)
      }

      previousTime = now
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, isGameOver])

  // Countdown timer loop (only runs when isPlaying is true)
  useEffect(() => {
    if (!isPlaying || isGameOver) return

    const timerId = window.setInterval(() => {
      if (finishedRef.current) return

      const elapsed = (Date.now() - startedAtRef.current) / 1000
      const remaining = Math.max(
        0,
        GAME_DURATION - Math.floor(elapsed)
      )

      if (remaining !== timeRef.current) {
        timeRef.current = remaining
        setTimeLeft(remaining)
      }

      if (remaining <= 0) {
        endGame('System Timeout!')
      }
    }, 100)

    return () => window.clearInterval(timerId)
  }, [isPlaying, isGameOver, endGame])

  useEffect(() => {
    return () => {
      clearGameTimeouts()
    }
  }, [])

  const startPlayingSession = () => {
    clearGameTimeouts()
    gameIdRef.current += 1

    rotationRef.current = 0
    knivesRef.current = []
    scoreRef.current = 0
    livesRef.current = MAX_LIVES
    finishedRef.current = false
    throwingRef.current = false
    resultRef.current = ''
    startedAtRef.current = Date.now()
    timeRef.current = GAME_DURATION

    setRotation(0)
    setKnives([])
    setScore(0)
    setLives(MAX_LIVES)
    setTimeLeft(GAME_DURATION)
    setIsThrowing(false)
    setImpact(false)
    setMessage('Target locked. Time your launch!')
    setIsGameOver(false)
    setIsPlaying(true)
  }

  const throwKnife = () => {
    if (!isPlaying || isGameOver) return
    if (finishedRef.current || throwingRef.current) return
    if (timeRef.current <= 0) return
    if (knivesRef.current.length >= KNIFE_LIMIT) return

    const currentGameId = gameIdRef.current

    throwingRef.current = true
    setIsThrowing(true)
    setImpact(false)
    setMessage('Blade in transit...')

    throwTimeoutRef.current = window.setTimeout(() => {
      throwTimeoutRef.current = null

      if (
        gameIdRef.current !== currentGameId ||
        finishedRef.current
      ) {
        throwingRef.current = false
        setIsThrowing(false)
        return
      }

      const targetAngle = rotationRef.current
      const incomingLocalAngle = -targetAngle

      const collision = knivesRef.current.some((knife) => {
        const difference = Math.atan2(
          Math.sin(knife.angle - incomingLocalAngle),
          Math.cos(knife.angle - incomingLocalAngle)
        )

        return Math.abs(difference) < COLLISION_GAP
      })

      throwingRef.current = false
      setIsThrowing(false)

      if (collision) {
        setImpact(true)
        livesRef.current -= 1
        setLives(livesRef.current)

        if (livesRef.current <= 0) {
          setMessage('Critical Failure! Out of lives.')
          impactTimeoutRef.current = window.setTimeout(() => {
            impactTimeoutRef.current = null
            if (gameIdRef.current === currentGameId) {
              endGame('Critical Failure! Out of lives.')
            }
          }, 350)
        } else {
          setMessage(`Collision Alert! Lives remaining: ${livesRef.current}`)
        }

        return
      }

      const landedKnife = {
        id: `${currentGameId}-${Date.now()}-${knivesRef.current.length}`,
        angle: incomingLocalAngle,
      }

      const nextKnives = [...knivesRef.current, landedKnife]
      updateKnives(nextKnives)

      scoreRef.current += 10
      setScore(scoreRef.current)
      setMessage('Direct Hit! +10 pts')

      if (nextKnives.length >= KNIFE_LIMIT) {
        endGame('Mission Complete! Core Cleared!')
      }
    }, THROW_DURATION)
  }

  const isCleared = resultRef.current.startsWith('Mission Complete')

  const renderTarget = (decorative = false) => (
    <div
      className="bm-target"
      style={{
        transform: `translateX(-50%) rotate(${rotation}rad)`,
      }}
    >
      <div className="bm-bullseye" />

      {(decorative
        ? [0.4, 1.3, 2.6, 3.8, 5.1]
        : knives.map((knife) => knife.angle)
      ).map((angle, index) => (
        <div
          key={decorative ? `decor-${index}` : knives[index]?.id}
          className="bm-stuck"
          style={{ transform: `rotate(${angle}rad)` }}
        >
          <div className="bm-handle" />
        </div>
      ))}
    </div>
  )

  return (
    <main className="bm-page">
      <div className="bm-shell">
        {!isGameOver ? (
          <>
            <header className="bm-header">
              <button className="bm-home" onClick={onBack}>
                ◄ BACK
              </button>

              <div className="bm-logo">
                BLADE <span>MASTER</span>
              </div>

              <div className="bm-stage">
                SECTOR {1 + Math.floor(knives.length / 3)}
              </div>
            </header>

            <div className="bm-stats bm-stats-playing">
              <div className="bm-stat">
                <small>TIME</small>
                <strong className={timeLeft <= 5 ? 'bm-warning' : ''}>
                  {timeLeft}s
                </strong>
              </div>

              <div className="bm-stat">
                <small>LIVES</small>
                <strong className="bm-lives-display">
                  {'❤️'.repeat(lives)}
                </strong>
              </div>

              <div className="bm-stat">
                <small>SCORE</small>
                <strong>{score}</strong>
              </div>

              <div className="bm-stat">
                <small>BLADES LEFT</small>
                <strong>{KNIFE_LIMIT - knives.length}</strong>
              </div>
            </div>

            <p className="bm-hint">
              Tap LAUNCH when a clean sector opens up on the core.
            </p>

            <div className="bm-arena">
              <div className="bm-queue" aria-label="Remaining blades">
                {Array.from({ length: KNIFE_LIMIT }, (_, index) => (
                  <div
                    key={index}
                    className={`bm-queue-knife ${
                      index < knives.length ? 'used' : ''
                    }`}
                  />
                ))}
              </div>

              {renderTarget(false)}

              {!isThrowing && (
                <div className="bm-launcher">
                  <div className="bm-launcher-knife" />
                </div>
              )}

              {isThrowing && (
                <div
                  key={`${gameIdRef.current}-${knives.length}`}
                  className="bm-flying-knife"
                  style={{ '--bm-flight-distance': 'min(58vw, 270px)' }}
                />
              )}

              {impact && <div className="bm-impact" />}

              {!isPlaying && (
                <div className="bm-start-overlay">
                  <div className="bm-overlay-content">
                    <h3>SYSTEM LOCKED</h3>
                    <p>Ready your blades and clear the core.</p>
                    <button className="bm-play" onClick={startPlayingSession}>
                      ▶ START PLAYING
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="bm-message" aria-live="polite">
              {message}
            </p>

            <button
              className="bm-throw"
              onClick={throwKnife}
              disabled={
                !isPlaying ||
                isThrowing ||
                knives.length >= KNIFE_LIMIT ||
                timeLeft <= 0
              }
            >
              {isThrowing ? '⚡ LAUNCHING...' : '⚡ LAUNCH BLADE'}
            </button>

            <p className="bm-hint">
              Core rotation accelerates as more blades latch on.
            </p>
          </>
        ) : (
          <>
            <header className="bm-header">
              <button className="bm-home" onClick={onBack}>
                ◄ EXIT
              </button>

              <div className="bm-logo">
                CYBER <span>BLADE</span>
              </div>

              <div className="bm-stage">REPORT</div>
            </header>

            <div className="bm-arena">
              {renderTarget(false)}
            </div>

            <h2 className="bm-result">
              {isCleared ? 'MISSION SUCCESS!' : 'SESSION TERMINATED'}
            </h2>

            <p className="bm-message">{message}</p>

            <div className="bm-stats">
              <div className="bm-stat">
                <small>FINAL SCORE</small>
                <strong>{score}</strong>
              </div>

              <div className="bm-stat">
                <small>BLADES EMBEDDED</small>
                <strong>{knives.length}/{KNIFE_LIMIT}</strong>
              </div>
            </div>

            <div className="bm-result-buttons">
              <button className="bm-play" onClick={startPlayingSession}>
                ↺ REBOOT SYSTEM
              </button>

              <button className="bm-secondary" onClick={onBack}>
                MAIN MENU
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}