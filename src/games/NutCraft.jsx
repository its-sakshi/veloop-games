import React, { useEffect, useState } from "react";
import "./NutCraft.css";

const COLORS = ["#00f0ff", "#ff007f", "#39ff14", "#b000ff", "#ffe600", "#00ffcc"];
const LEVELS = [
  { name: "Grid Sector 01", angles: [-25, 28, 0, -35], lengths: [190, 190, 175, 170] },
  { name: "Matrix Overload", angles: [35, -30, 0, -48, 28], lengths: [200, 195, 180, 165, 165] },
  { name: "Core Architect", angles: [-38, 32, 0, -27, 40, -5], lengths: [205, 205, 185, 175, 170, 155] },
];

const makePieces = (stage) => LEVELS[stage].angles.map((angle, i) => ({
  id: `${stage}-${i}`, 
  color: COLORS[(i + stage) % COLORS.length], 
  angle,
  length: LEVELS[stage].lengths[i], 
  removed: false,
}));

export default function NutCraft({ onBack = () => {} }) {
  const [stage, setStage] = useState(0);
  const [pieces, setPieces] = useState(() => makePieces(0));
  const [time, setTime] = useState(90);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("playing");
  const [message, setMessage] = useState("Target glowing nodes to unlock data bars.");

  const left = pieces.filter(p => !p.removed).length;

  const reset = (s = stage) => {
    setPieces(makePieces(s)); 
    setTime(90); 
    setMoves(0); 
    setStatus("playing");
    setMessage("Target glowing nodes to unlock data bars.");
  };

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => setTime(t => {
      if (t <= 1) { 
        window.clearInterval(timer); 
        setStatus("timeout"); 
        setMessage("System timeout! Sequence failed."); 
        return 0; 
      }
      return t - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [status, stage]);

  useEffect(() => {
    if (left === 0 && status === "playing") {
      setStatus("won");
      setScore(s => s + Math.max(100, time * 10 - moves * 5));
      setMessage("Sector successfully cleared!");
    }
  }, [left, status, time, moves]);

  const removePiece = (piece, index) => {
    if (status !== "playing" || piece.removed) return;
    
    const activeIndices = pieces.map((p, idx) => (!p.removed ? idx : -1)).filter(idx => idx !== -1);
    const topIndex = activeIndices[activeIndices.length - 1];

    if (index !== topIndex) { 
      setMessage("Node obstructed! Clear top-layer nodes first."); 
      return; 
    }

    setPieces(old => old.map(p => p.id === piece.id ? { ...p, removed: true } : p));
    setMoves(m => m + 1);
    setMessage("Node purged. Proceed with sequence.");
  };

  const nextStage = () => {
    const s = Math.min(stage + 1, LEVELS.length - 1);
    setStage(s); 
    reset(s);
  };

  const restartAll = () => { 
    setStage(0); 
    setScore(0); 
    reset(0); 
  };

  return (
    <main className="nc-root">
      <div className="nc-shell">
        <header className="nc-header">
          <button className="nc-ghost" onClick={onBack} type="button">◄ BACK</button>
          <div className="nc-logo">NUT <span>CRAFT</span></div>
          <span className="nc-stage">SYS.{stage + 1}</span>
        </header>

        <section className="nc-stats">
          <div className="nc-stat">
            <span>TIME</span>
            <strong>{`0${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`}</strong>
          </div>
          <div className="nc-stat">
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>
          <div className="nc-stat">
            <span>REMAINING</span>
            <strong>{left}</strong>
          </div>
        </section>

        <div className="nc-instruction">
          {status === "playing" ? `${LEVELS[stage].name} // ${message}` : message}
        </div>

        <section className="nc-board" aria-label="NutCraft cyber board">
          <div className="nc-board-title">QUANTUM • LOCK • MATRIX</div>
          <div className="nc-board-center">
            <div className="nc-center-nut" />
          </div>

          {pieces.map((piece, i) => {
            const activeIndices = pieces.map((p, idx) => (!p.removed ? idx : -1)).filter(idx => idx !== -1);
            const topIndex = activeIndices[activeIndices.length - 1];
            const isTop = i === topIndex;

            return (
              <div 
                key={piece.id} 
                className={`nc-bar ${piece.removed ? "removed" : ""}`}
                style={{ 
                  "--color": piece.color, 
                  "--angle": `${piece.angle}deg`, 
                  "--len": `${piece.length}px`, 
                  zIndex: i + 2 
                }}
              >
                {[0, 1].map(side => (
                  <button 
                    key={side} 
                    className={`nc-bolt ${isTop && !piece.removed ? "available" : "locked"}`}
                    type="button" 
                    aria-label={`Remove node ${piece.id}`}
                    onClick={() => removePiece(piece, i)} 
                  />
                ))}
              </div>
            );
          })}

          <div className="nc-board-foot">PURGES: {moves}</div>
        </section>

        <div className="nc-message" role="status">
          {status === "playing" ? "⚡ Purge glowing nodes to unpin data bars." : message}
        </div>

        {status === "playing" && (
          <div className="nc-bottom">
            <div className="nc-tip">⚡ <b>Glowing nodes</b> are unlocked for purging.</div>
            <button className="nc-btn nc-secondary" onClick={() => reset()} type="button">↻ RESET</button>
          </div>
        )}

        {(status === "won" || status === "timeout") && (
          <section className="nc-result">
            <h2>{status === "won" ? "CORE CLEARED!" : "SYSTEM FAILURE!"}</h2>
            <p>{status === "won" ? "Outstanding protocol execution." : "Reinitialize sequence to try again."}</p>
            <div className="nc-result-actions">
              {status === "won" && stage < LEVELS.length - 1 && (
                <button className="nc-btn" onClick={nextStage} type="button">NEXT SECTOR →</button>
              )}
              <button className="nc-btn nc-secondary" onClick={() => reset()} type="button">↺ REBOOT</button>
              {stage === LEVELS.length - 1 && status === "won" && (
                <button className="nc-btn" onClick={restartAll} type="button">FULL RESTART</button>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}