
import { useCallback, useEffect, useRef, useState } from 'react'

const GAME_DURATION = 30
const KNIFE_LIMIT = 10
const THROW_DURATION = 500
const COLLISION_GAP = 0.20

function BladeMaster({ onBack }) {
  const [screen, setScreen] = useState('intro')
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [score, setScore] = useState(0)
  const [knives, setKnives] = useState([])
  const [rotation, setRotation] = useState(0)
  const [isThrowing, setIsThrowing] = useState(false)
  const [message, setMessage] = useState('Watch the gaps. Time your throw!')
  const [impact, setImpact] = useState(false)

  const rotationRef = useRef(0)
  const knivesRef = useRef([])
  const scoreRef = useRef(0)
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

    if (throwTimeoutRef.current !== null) {
      window.clearTimeout(throwTimeoutRef.current)
      throwTimeoutRef.current = null
    }

    setIsThrowing(false)
    setMessage(result)
    setScreen('result')
  }, [])

  // The wheel keeps rotating in one direction and gets faster
  // as more knives successfully land.
  useEffect(() => {
    if (screen !== 'playing') return

    let frameId
    let previousTime = 0

    const animate = (now) => {
      if (previousTime !== 0 && !finishedRef.current) {
        const delta = Math.min(now - previousTime, 40)
        const landed = knivesRef.current.length
        const speedLevel = Math.floor(landed / 3)
        const speed = 0.0012 + speedLevel * 0.0003

        rotationRef.current += delta * speed
        setRotation(rotationRef.current)
      }

      previousTime = now
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [screen])

  // The timer is independent of the throwing animation.
  useEffect(() => {
    if (screen !== 'playing') return

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
        endGame('Time is up!')
      }
    }, 100)

    return () => window.clearInterval(timerId)
  }, [screen, endGame])

  useEffect(() => {
    return () => {
      if (throwTimeoutRef.current !== null) {
        window.clearTimeout(throwTimeoutRef.current)
      }

      if (impactTimeoutRef.current !== null) {
        window.clearTimeout(impactTimeoutRef.current)
      }
    }
  }, [])

  const startGame = () => {
    clearGameTimeouts()
    gameIdRef.current += 1

    rotationRef.current = 0
    knivesRef.current = []
    scoreRef.current = 0
    finishedRef.current = false
    throwingRef.current = false
    resultRef.current = ''
    startedAtRef.current = Date.now()
    timeRef.current = GAME_DURATION

    setRotation(0)
    setKnives([])
    setScore(0)
    setTimeLeft(GAME_DURATION)
    setIsThrowing(false)
    setImpact(false)
    setMessage('Watch the gaps. Time your throw!')
    setScreen('playing')
  }

  const throwKnife = () => {
    if (screen !== 'playing') return
    if (finishedRef.current || throwingRef.current) return
    if (timeRef.current <= 0) return
    if (knivesRef.current.length >= KNIFE_LIMIT) return

    const currentGameId = gameIdRef.current

    throwingRef.current = true
    setIsThrowing(true)
    setImpact(false)
    setMessage('Knife in flight!')

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

      /*
       * Knife artwork points outward from the wheel center.
       * Its neutral screen angle is -PI / 2.
       *
       * Because the wheel rotates, the local angle for a new
       * upward throw is -rotation. Compare existing local angles
       * against that incoming angle to detect actual overlap.
       */
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
        setMessage('Collision! Your knife hit another knife.')

        impactTimeoutRef.current = window.setTimeout(() => {
          impactTimeoutRef.current = null

          if (gameIdRef.current === currentGameId) {
            endGame('Collision! Your knife hit another knife.')
          }
        }, 450)

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
      setMessage('Perfect throw! +10 points.')

      if (nextKnives.length >= KNIFE_LIMIT) {
        endGame('Stage cleared! Excellent throwing!')
      }
    }, THROW_DURATION)
  }

  const returnHome = () => {
    clearGameTimeouts()
    gameIdRef.current += 1
    finishedRef.current = true
    throwingRef.current = false

    setIsThrowing(false)
    setImpact(false)
    setScreen('intro')
  }

  const isCleared = resultRef.current.startsWith('Stage cleared')

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
      <style>{`
        .bm-page {
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          box-sizing: border-box;
          padding: clamp(14px, 3vw, 28px);
          overflow-x: clip;
          color: #effffb;
          background:
            radial-gradient(ellipse at 50% 5%, #2c5148 0%, transparent 48%),
            linear-gradient(180deg, #142f2b, #091718 85%);
          font-family: Inter, system-ui, Arial, sans-serif;
          text-align: center;
        }

        .bm-shell {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        .bm-header {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: clamp(6px, 2vw, 14px);
          margin: 0 auto 20px;
        }

        .bm-home,
        .bm-secondary {
          padding: 9px 12px;
          border: 1px solid #416d64;
          border-radius: 10px;
          background: #18332f;
          color: #f3fffc;
          font-size: clamp(11px, 2.7vw, 15px);
          font-weight: 800;
          cursor: pointer;
        }

        .bm-logo {
          min-width: 0;
          color: #fff4d5;
          font-size: clamp(17px, 4.5vw, 34px);
          font-weight: 1000;
          font-style: italic;
          letter-spacing: -1px;
          text-shadow: 0 3px 0 #654021, 0 0 18px #ffac3940;
          white-space: nowrap;
        }

        .bm-logo span {
          color: #ffb331;
        }

        .bm-stage {
          padding: 9px 10px;
          border: 1px solid #41675e;
          border-radius: 10px;
          color: #a9f8df;
          background: #172e2d;
          font-size: clamp(9px, 2.2vw, 12px);
          font-weight: 900;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .bm-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin: 14px 0;
        }

        .bm-stat {
          min-width: 0;
          padding: 12px 5px;
          border: 1px solid #385e55;
          border-radius: 12px;
          background: linear-gradient(145deg, #193532, #122926);
          box-shadow: inset 0 1px #ffffff08;
        }

        .bm-stat small {
          display: block;
          color: #9de8d6;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .bm-stat strong {
          display: block;
          margin-top: 5px;
          color: #fff;
          font-size: clamp(18px, 4.5vw, 24px);
          font-variant-numeric: tabular-nums;
        }

        .bm-warning {
          color: #ffcc65 !important;
        }

        .bm-hint {
          margin: 10px 0;
          color: #b9d5d1;
          font-size: 13px;
          line-height: 1.6;
        }

        .bm-arena {
          position: relative;
          width: 100%;
          max-width: 430px;
          aspect-ratio: .82;
          margin: 18px auto;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid #42665d;
          border-radius: 18px;
          background:
            repeating-linear-gradient(
              90deg,
              transparent 0 38px,
              #a3e2c510 40px 45px,
              transparent 47px 78px
            ),
            radial-gradient(ellipse at 50% 25%, #203f37, #0c1c1e 78%);
          box-shadow: inset 0 0 50px #0005, 0 12px 35px #0003;
        }

        .bm-target {
          position: absolute;
          z-index: 2;
          top: 5%;
          left: 50%;
          width: min(76%, 310px);
          aspect-ratio: 1;
          box-sizing: border-box;
          border: 9px solid #71340f;
          border-radius: 50%;
          background:
            repeating-radial-gradient(
              circle,
              transparent 0 11px,
              #a24b13 12px 16px,
              #f2aa35 17px 21px,
              #b65d19 22px 27px
            ),
            radial-gradient(
              circle,
              #a54d0c 0 18%,
              #f5b343 19% 55%,
              #a74c13 56% 77%,
              #f3a637 78%
            );
          box-shadow:
            0 0 0 3px #a9571d,
            0 0 0 6px #4b2818,
            0 0 28px #ffb34a30,
            inset 0 0 0 3px #ffd36a,
            inset 0 0 20px #632c0d;
          transform-origin: center;
        }

        .bm-target::before {
          content: "";
          position: absolute;
          inset: 5%;
          border: 3px solid #ffca59;
          border-radius: 50%;
          opacity: .8;
          pointer-events: none;
        }

        .bm-target::after {
          content: "";
          position: absolute;
          inset: 25%;
          border: 3px solid #f3ad37;
          border-radius: 50%;
          opacity: .6;
          pointer-events: none;
        }

        .bm-bullseye {
          position: absolute;
          left: 42%;
          top: 42%;
          width: 16%;
          height: 16%;
          border: 3px solid #df8e22;
          border-radius: 50%;
          box-sizing: border-box;
          background: radial-gradient(circle, #9b4308, #bd650e);
          pointer-events: none;
        }

        /* A stuck knife's point faces away from the wheel center. */
        .bm-stuck {
          position: absolute;
          top: 0;
          left: calc(50% - 4px);
          width: 8px;
          height: 49%;
          transform-origin: 50% 100%;
          border-radius: 4px;
          background: linear-gradient(
            90deg,
            #369ca4,
            #b8ffff 45%,
            #f0ffff 50%,
            #5fcbd0
          );
          box-shadow: 0 0 7px #6cf7ff72, 0 2px 3px #0009;
          pointer-events: none;
        }

        .bm-stuck::before {
          content: "";
          position: absolute;
          top: -19px;
          left: -5px;
          width: 18px;
          height: 23px;
          background: linear-gradient(90deg, #7be3e5, #efffff 48%, #6ccbd1);
          clip-path: polygon(50% 0, 100% 80%, 50% 100%, 0 80%);
          filter: drop-shadow(0 0 4px #69f6ff);
        }

        .bm-handle {
          position: absolute;
          top: -24px;
          left: -4px;
          width: 16px;
          height: 27px;
          border: 2px solid #08683b;
          border-radius: 4px;
          box-sizing: border-box;
          background: repeating-linear-gradient(
            0deg,
            #08743d 0 5px,
            #26bd69 6px 10px
          );
        }

        .bm-handle::after {
          content: "";
          position: absolute;
          top: 7px;
          left: -5px;
          width: 22px;
          height: 5px;
          border-radius: 3px;
          background: #168e4e;
        }

        .bm-launcher {
          position: absolute;
          z-index: 4;
          left: 50%;
          bottom: 7%;
          width: 52px;
          height: 100px;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .bm-launcher-knife,
        .bm-flying-knife {
          position: absolute;
          left: 21px;
          width: 10px;
          height: 65px;
          border-radius: 3px;
          background: linear-gradient(
            90deg,
            #329aa2,
            #bafafa 40%,
            #f0ffff 52%,
            #48b5bb
          );
          box-shadow: 0 0 15px #68f6ff80;
        }

        .bm-launcher-knife {
          top: 0;
        }

        .bm-launcher-knife::before,
        .bm-flying-knife::before {
          content: "";
          position: absolute;
          top: -20px;
          left: -5px;
          width: 20px;
          height: 25px;
          background: linear-gradient(90deg, #72dfe3, #f4ffff 48%, #6ecbd1);
          clip-path: polygon(50% 0, 100% 80%, 50% 100%, 0 80%);
        }

        .bm-launcher-knife::after,
        .bm-flying-knife::after {
          content: "";
          position: absolute;
          bottom: -24px;
          left: -3px;
          width: 16px;
          height: 26px;
          border: 2px solid #08713f;
          border-radius: 4px;
          box-sizing: border-box;
          background: repeating-linear-gradient(
            0deg,
            #0c7b41 0 5px,
            #2ac36e 6px 10px
          );
        }

        .bm-flying-knife {
          z-index: 6;
          left: calc(50% - 5px);
          bottom: 7%;
          animation: bm-fly ${THROW_DURATION}ms cubic-bezier(.25,.7,.25,1) forwards;
          pointer-events: none;
        }

        @keyframes bm-fly {
          from { transform: translateY(0); }
          to { transform: translateY(calc(-1 * var(--bm-flight-distance))); }
        }

        .bm-queue {
          position: absolute;
          z-index: 3;
          left: 9px;
          bottom: 9%;
          display: flex;
          flex-direction: column-reverse;
          gap: 5px;
          pointer-events: none;
        }

        .bm-queue-knife {
          position: relative;
          width: 18px;
          height: 23px;
          filter: drop-shadow(0 0 3px #63efff4d);
        }

        .bm-queue-knife::before {
          content: "";
          position: absolute;
          top: 0;
          left: 4px;
          width: 12px;
          height: 17px;
          background: #9af5f5;
          clip-path: polygon(50% 0, 100% 80%, 50% 100%, 0 80%);
        }

        .bm-queue-knife::after {
          content: "";
          position: absolute;
          top: 15px;
          left: 8px;
          width: 7px;
          height: 8px;
          border-radius: 2px;
          background: #24a65d;
        }

        .bm-queue-knife.used {
          opacity: .13;
          filter: none;
        }

        .bm-message {
          min-height: 24px;
          margin: 12px 0;
          color: #ffdf8d;
          font-size: 14px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .bm-throw,
        .bm-play {
          display: block;
          width: min(100%, 320px);
          min-height: 54px;
          margin: 14px auto;
          padding: 14px 20px;
          border: 1px solid #65ffab;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(180deg, #29d47d, #087844);
          box-shadow: 0 0 25px #24f48a35, inset 0 1px #ffffff66;
          font-size: 18px;
          font-weight: 1000;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .bm-throw:disabled {
          border-color: #426e5b;
          background: linear-gradient(#376a53, #244b3c);
          color: #b2d2c2;
          box-shadow: none;
          cursor: not-allowed;
        }

        .bm-intro-title {
          margin: 24px auto 10px;
          max-width: 600px;
          color: #fff4d5;
          font-size: clamp(32px, 7vw, 54px);
          font-weight: 1000;
          font-style: italic;
          line-height: 1.02;
          letter-spacing: -1.5px;
          text-shadow: 0 4px 0 #654021, 0 0 22px #ffa93450;
        }

        .bm-intro-title span {
          display: block;
          color: #ffb333;
        }

        .bm-tagline {
          margin: 10px 0 18px;
          color: #b9f6e4;
          font-size: clamp(11px, 2.5vw, 14px);
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .bm-panel {
          width: 100%;
          box-sizing: border-box;
          margin: 20px auto 0;
          padding: clamp(16px, 4vw, 24px);
          border: 1px solid #426b5b;
          border-radius: 18px;
          background: linear-gradient(145deg, #1b3933, #102521);
          box-shadow: 0 12px 32px #0003, inset 0 1px #ffffff08;
        }

        .bm-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 18px 0;
        }

        .bm-feature {
          min-width: 0;
          padding: 14px 6px;
          border: 1px solid #426b5b;
          border-radius: 12px;
          background: #17312c;
          color: #ffe7aa;
          font-size: clamp(9px, 2vw, 12px);
          font-weight: 900;
        }

        .bm-feature strong {
          display: block;
          margin-bottom: 8px;
          font-size: 25px;
        }

        .bm-xp {
          color: #45c7ff;
          font-size: 30px;
          font-weight: 1000;
          text-shadow: 0 0 18px #159dff54;
        }

        .bm-result {
          margin: 20px 0 8px;
          color: #ffd469;
          font-size: clamp(26px, 7vw, 40px);
          font-weight: 1000;
          text-shadow: 0 0 18px #ffb12b60;
        }

        .bm-result-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }

        .bm-result-buttons .bm-play {
          margin: 0;
        }

        .bm-impact {
          position: absolute;
          z-index: 8;
          top: 22%;
          left: 50%;
          width: 48px;
          height: 48px;
          border: 3px solid #fff4a5;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 25px #ffae38, inset 0 0 18px #ffad32;
          animation: bm-impact .4s ease-out both;
          pointer-events: none;
        }

        @keyframes bm-impact {
          from { opacity: 1; scale: .5; }
          to { opacity: 0; scale: 1.5; }
        }

        @media (max-width: 420px) {
          .bm-page {
            padding: 12px;
          }

          .bm-header {
            gap: 5px;
            margin-bottom: 18px;
          }

          .bm-logo {
            font-size: clamp(15px, 4.2vw, 19px);
            letter-spacing: -.5px;
          }

          .bm-home {
            padding: 8px 7px;
            font-size: 11px;
          }

          .bm-stage {
            padding: 8px 5px;
            font-size: 9px;
            letter-spacing: .5px;
          }

          .bm-arena {
            width: 100%;
            aspect-ratio: .85;
          }

          .bm-target {
            width: 76%;
            border-width: 7px;
          }

          .bm-queue {
            left: 5px;
            gap: 3px;
          }

          .bm-queue-knife {
            transform: scale(.82);
            margin-block: -2px;
          }

          .bm-stats {
            gap: 5px;
          }

          .bm-stat {
            padding: 9px 3px;
          }

          .bm-stat small {
            font-size: 9px;
            letter-spacing: .5px;
          }

          .bm-stat strong {
            font-size: 18px;
          }

          .bm-features {
            gap: 6px;
          }

          .bm-feature {
            padding: 12px 3px;
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bm-flying-knife {
            animation-duration: 1ms;
          }

          .bm-impact {
            animation-duration: 1ms;
          }
        }
      `}</style>

      <div className="bm-shell">
        {screen === 'intro' && (
          <>
            <header className="bm-header">
              <button className="bm-home" onClick={onBack}>
                ← Home
              </button>

              <div className="bm-logo">
                BLADE <span>MASTER</span>
              </div>

              <div className="bm-stage">STAGE 1</div>
            </header>

            <h1 className="bm-intro-title">
              AIM. THROW.
              <span>HIT PERFECT!</span>
            </h1>

            <p className="bm-tagline">
              THROW KNIVES. BREAK RECORDS.
            </p>

            <div className="bm-arena">
              {renderTarget(true)}

              <div className="bm-launcher">
                <div className="bm-launcher-knife" />
              </div>
            </div>

            <section className="bm-panel">
              <strong>READY FOR THE CHALLENGE?</strong>

              <div className="bm-features">
                <div className="bm-feature">
                  <strong>⚔</strong>
                  AIM & THROW
                </div>

                <div className="bm-feature">
                  <strong>◎</strong>
                  AVOID HITS
                </div>

                <div className="bm-feature">
                  <strong>★</strong>
                  BREAK RECORDS
                </div>
              </div>

              <p className="bm-hint">
                Throw between the knives. Every safe hit earns 10 points.
                <br />
                The target gets faster as your score rises!
              </p>

              <div className="bm-xp">+20 XP</div>

              <button className="bm-play" onClick={startGame}>
                ▶ PLAY NOW
              </button>
            </section>
          </>
        )}

        {screen === 'playing' && (
          <>
            <header className="bm-header">
              <button className="bm-home" onClick={returnHome}>
                ← Home
              </button>

              <div className="bm-logo">
                BLADE <span>MASTER</span>
              </div>

              <div className="bm-stage">
                STAGE {1 + Math.floor(knives.length / 3)}
              </div>
            </header>

            <div className="bm-stats">
              <div className="bm-stat">
                <small>TIME</small>
                <strong className={timeLeft <= 5 ? 'bm-warning' : ''}>
                  {timeLeft}s
                </strong>
              </div>

              <div className="bm-stat">
                <small>SCORE</small>
                <strong>{score}</strong>
              </div>

              <div className="bm-stat">
                <small>KNIVES LEFT</small>
                <strong>{KNIFE_LIMIT - knives.length}</strong>
              </div>
            </div>

            <p className="bm-hint">
              Tap THROW when there's a safe gap between the knives.
            </p>

            <div className="bm-arena">
              <div className="bm-queue" aria-label="Remaining knives">
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
            </div>

            <p className="bm-message" aria-live="polite">
              {message}
            </p>

            <button
              className="bm-throw"
              onClick={throwKnife}
              disabled={
                isThrowing ||
                knives.length >= KNIFE_LIMIT ||
                timeLeft <= 0
              }
            >
              {isThrowing ? '⚔ THROWING...' : '⚔ THROW'}
            </button>

            <p className="bm-hint">
              Each successful throw = 10 points. Watch the rotation speed!
            </p>
          </>
        )}

        {screen === 'result' && (
          <>
            <header className="bm-header">
              <button className="bm-home" onClick={returnHome}>
                ← Home
              </button>

              <div className="bm-logo">
                BLADE <span>MASTER</span>
              </div>

              <div className="bm-stage">STAGE 1</div>
            </header>

            <div className="bm-arena">
              {renderTarget(false)}
            </div>

            <h2 className="bm-result">
              {isCleared ? 'STAGE CLEARED!' : 'ROUND OVER!'}
            </h2>

            <p className="bm-message">{message}</p>

            <div className="bm-stats">
              <div className="bm-stat">
                <small>FINAL SCORE</small>
                <strong>{score}</strong>
              </div>

              <div className="bm-stat">
                <small>KNIVES LANDED</small>
                <strong>{knives.length}/{KNIFE_LIMIT}</strong>
              </div>
            </div>

            <div className="bm-result-buttons">
              <button className="bm-play" onClick={startGame}>
                ↻ PLAY AGAIN
              </button>

              <button className="bm-secondary" onClick={returnHome}>
                HOME
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default BladeMaster
