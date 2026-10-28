import React, { useEffect, useRef, useState } from "react";
import "./bowlexa.css";

const GAME_SECONDS = 60;
const XP_PER_STRIKE = 20;

const PIN_POSITIONS = [
  { x: 0, y: 0 },
  { x: -25, y: -28 }, { x: 25, y: -28 },
  { x: -50, y: -56 }, { x: 0, y: -56 }, { x: 50, y: -56 },
  { x: -75, y: -84 }, { x: -25, y: -84 }, { x: 25, y: -84 }, { x: 75, y: -84 },
];

const createPins = () =>
  PIN_POSITIONS.map((position, id) => ({ id, ...position, standing: true }));

export default function Bowlexa({ onBack, onWin }) {
  const [pins, setPins] = useState(createPins);
  const [aim, setAim] = useState(0);
  const [power, setPower] = useState(72);
  const [phase, setPhase] = useState("ready");
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [throws, setThrows] = useState(0);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [lastHit, setLastHit] = useState(0);
  const [message, setMessage] = useState("Adjust the aim, watch the ball move, then swing!");
  const rollTimer = useRef(null);

  const standing = pins.filter((pin) => pin.standing).length;

  useEffect(() => {
    if (phase === "result") return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setPhase("result");
          setMessage("Time's up! Great swinging.");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => () => window.clearTimeout(rollTimer.current), []);

  const resetGame = () => {
    window.clearTimeout(rollTimer.current);
    setPins(createPins());
    setAim(0);
    setPower(72);
    setPhase("ready");
    setTimeLeft(GAME_SECONDS);
    setThrows(0);
    setScore(0);
    setXp(0);
    setLastHit(0);
    setMessage("Adjust the aim, watch the ball move, then swing!");
  };

  const resetPins = () => {
    if (phase === "rolling") return;
    setPins(createPins());
    setLastHit(0);
    setMessage("Fresh rack! Adjust your aim and take the shot.");
  };

  const swing = () => {
    if (phase !== "ready" || timeLeft <= 0 || standing === 0) return;

    const shotAim = aim;
    const shotPower = power;
    // Map the aim slider to the width of the pin rack.
    const targetX = (shotAim / 45) * 75;
    // Power only widens the hit corridor; there is no random pin selection.
    const impactRadius = 7 + ((shotPower - 25) / 75) * 11;

    const hitIds = new Set(
      pins
        .filter((pin) => pin.standing)
        .filter((pin) => Math.abs(pin.x - targetX) <= impactRadius)
        .map((pin) => pin.id)
    );
    const hitCount = hitIds.size;

    setPhase("rolling");
    setThrows((current) => current + 1);
    setMessage("The ball is rolling toward your aim…");

    rollTimer.current = window.setTimeout(() => {
      setPins((current) =>
        current.map((pin) => ({
          ...pin,
          standing: pin.standing && !hitIds.has(pin.id),
        }))
      );

      const isStrike = hitCount === standing && hitCount > 0;
      const pointsEarned = hitCount * 100 + (isStrike ? 250 : 0);
      const xpEarned = isStrike ? XP_PER_STRIKE : Math.floor(hitCount / 2) * 2;

      setLastHit(hitCount);
      setScore((current) => current + pointsEarned);
      setXp((current) => current + xpEarned);
      setMessage(
        isStrike
          ? "STRIKE! All remaining pins are down!"
          : hitCount > 0
            ? `${hitCount} pin${hitCount === 1 ? "" : "s"} hit — the others stay standing.`
            : "Miss! No pins were in the ball's path. Adjust your aim."
      );

      if (hitCount > 0 && hitCount >= standing) {
        setPhase("result");
        setMessage("Perfect game! You cleared the lane.");
        onWin?.({ score: score + pointsEarned, xp: xp + xpEarned });
      } else {
        setPhase("ready");
      }
    }, 850);
  };

  return (
    <main className="bx-root">
      <div className="bx-shell">
        <header className="bx-header">
          <button className="bx-back" type="button" onClick={onBack} aria-label="Back to games">
            <span aria-hidden="true">←</span> <span className="bx-back-label">Games</span>
          </button>

          <div className="bx-brand" aria-label="Bowlexa">
            <span className="bx-brand-mark">B</span>
            <span className="bx-brand-name">BOWLEXA<small>AIM · SWING · STRIKE</small></span>
          </div>

          <div className="bx-xp">✦ <span>{xp} XP</span></div>
        </header>

        <section className="bx-hero">
          <div className="bx-hero-copy">
            <span className="bx-eyebrow">ARCADE CHALLENGE</span>
            <h1>Ready to <em>roll?</em></h1>
            <p>Swing the rope, knock ’em down, and earn XP with every great shot.</p>
          </div>

          <div className="bx-stats">
            <div className="bx-stat"><span>TIME LEFT</span><strong>00:{String(timeLeft).padStart(2, "0")}</strong></div>
            <div className="bx-stat"><span>YOUR SCORE</span><strong>{score.toLocaleString()}</strong></div>
            <div className="bx-stat"><span>PINS LEFT</span><strong>{standing}<i>/10</i></strong></div>
          </div>
        </section>

        <section className="bx-game-layout">
          <div className="bx-lane-card">
            <div className="bx-lane-top">
              <span><i className="bx-live-dot" /> LIVE LANE</span>
              <span>THROW #{throws}</span>
            </div>

            <div className={`bx-lane ${phase === "rolling" ? "is-rolling" : ""}`}>
              <div className="bx-lane-glow" />
              <div className="bx-lane-lines"><i /><i /><i /></div>
              <div className="bx-lane-arrows"><span>‹</span><span>‹</span><span>‹</span><span>‹</span><span>‹</span></div>

              <div className="bx-pin-rack" aria-label={`${standing} pins standing`}>
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    className={`bx-pin ${pin.standing ? "" : "is-down"}`}
                    style={{
                      "--pin-x": `${pin.x}px`,
                      "--pin-y": `${pin.y}px`,
                      "--pin-delay": `${pin.id * 24}ms`,
                    }}
                  >
                    <span className="bx-pin-stripe" />
                  </div>
                ))}
              </div>

              <div
                className={`bx-ball ${phase === "rolling" ? "is-swinging" : ""}`}
                style={{ "--aim": `${aim * 2.2}px` }}
                aria-label="Bowling ball"
              >
                <span className="bx-ball-holes"><i /><i /><i /></span>
              </div>

              <div className="bx-lane-footer"><span>✦</span> BOWLEXA LANES <span>✦</span></div>
              {phase === "rolling" && <div className="bx-impact">SWING!</div>}
            </div>

            <div className={`bx-message ${lastHit > 0 ? "has-hit" : ""}`} role="status" aria-live="polite">
              {message}
            </div>
          </div>

          <aside className="bx-controls">
            <div className="bx-panel-title"><span>YOUR SHOT</span><span className="bx-step">01 / 02</span></div>

            <label className="bx-control-label" htmlFor="bx-aim">
              Aim direction <strong>{aim > 0 ? "+" : ""}{aim}°</strong>
            </label>
            <input
              id="bx-aim" className="bx-range" type="range" min="-45" max="45" step="1"
              value={aim} disabled={phase !== "ready"}
              onChange={(event) => setAim(Number(event.target.value))}
            />
            <div className="bx-range-labels"><span>LEFT</span><span>CENTER</span><span>RIGHT</span></div>

            <label className="bx-control-label bx-power-label" htmlFor="bx-power">
              Swing power <strong>{power}%</strong>
            </label>
            <input
              id="bx-power" className="bx-range bx-power-range" type="range" min="25" max="100" step="1"
              value={power} disabled={phase !== "ready"}
              onChange={(event) => setPower(Number(event.target.value))}
            />
            <div className="bx-range-labels"><span>GENTLE</span><span>FULL POWER</span></div>

            <button className="bx-swing-btn" type="button" onClick={swing}
              disabled={phase !== "ready" || timeLeft <= 0 || standing === 0}>
              <span className="bx-swing-icon">↗</span>
              {phase === "rolling" ? "SWINGING…" : "SWING & STRIKE"}
              <span aria-hidden="true">→</span>
            </button>

            <button className="bx-reset-btn" type="button" onClick={resetPins} disabled={phase === "rolling"}>
              ↻ Reset pins
            </button>

            <div className="bx-tip">
              <span>✦ PRO TIP</span>
              <p>Keep your aim near the center and build up power for a stronger shot.</p>
            </div>
          </aside>
        </section>

        <section className="bx-bottom">
          <div className="bx-achievement">
            <span className="bx-ach-icon">♛</span>
            <div>
              <strong>{lastHit === 10 ? "PERFECT STRIKE!" : "CHASE THE STRIKE"}</strong>
              <p>{lastHit > 0 ? `Last swing: ${lastHit} pin${lastHit === 1 ? "" : "s"} knocked down` : "Knock down all 10 pins in one swing."}</p>
            </div>
          </div>
          <div className="bx-reward"><span>REWARD PER STRIKE</span><strong>+20 <i>XP</i></strong></div>
        </section>

        {phase === "result" && (
          <div className="bx-result-overlay" role="dialog" aria-modal="true" aria-labelledby="bx-result-title">
            <div className="bx-result-card">
              <div className="bx-result-trophy">♛</div>
              <span className="bx-eyebrow">LANE COMPLETE</span>
              <h2 id="bx-result-title">{standing === 0 ? "You nailed it!" : "Nice game!"}</h2>
              <p>You scored <strong>{score.toLocaleString()}</strong> points and earned <strong>{xp} XP</strong>.</p>
              <div className="bx-result-actions">
                <button className="bx-swing-btn" onClick={resetGame} type="button">PLAY AGAIN <span>→</span></button>
                <button className="bx-reset-btn" onClick={onBack} type="button">Back to games</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
