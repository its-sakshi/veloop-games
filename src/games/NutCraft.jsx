import React, { useEffect, useState } from "react";

const COLORS = ["#f04432", "#269ce9", "#8bdc35", "#a95be8", "#f4b52f", "#20c5b7"];
const LEVELS = [
  { name: "Warm Up", angles: [-25, 28, 0, -35], lengths: [190, 190, 175, 170] },
  { name: "Crossed Wires", angles: [35, -30, 0, -48, 28], lengths: [200, 195, 180, 165, 165] },
  { name: "Master Builder", angles: [-38, 32, 0, -27, 40, -5], lengths: [205, 205, 185, 175, 170, 155] },
];
const makePieces = (stage) => LEVELS[stage].angles.map((angle, i) => ({
  id: `${stage}-${i}`, color: COLORS[(i + stage) % COLORS.length], angle,
  length: LEVELS[stage].lengths[i], removed: false,
}));

export default function NutCraft({ onBack = () => {} }) {
  const [stage, setStage] = useState(0);
  const [pieces, setPieces] = useState(() => makePieces(0));
  const [time, setTime] = useState(90);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("playing");
  const [message, setMessage] = useState("Remove the glowing bolts to free each bar.");
  const left = pieces.filter(p => !p.removed).length;
  const reset = (s = stage) => {
    setPieces(makePieces(s)); setTime(90); setMoves(0); setStatus("playing");
    setMessage("Remove the glowing bolts to free each bar.");
  };

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => setTime(t => {
      if (t <= 1) { window.clearInterval(timer); setStatus("timeout"); setMessage("Time's up! Give it another try."); return 0; }
      return t - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [status, stage]);

  useEffect(() => {
    if (left === 0 && status === "playing") {
      setStatus("won");
      setScore(s => s + Math.max(100, time * 10 - moves * 5));
      setMessage("Perfect! Every bar is free.");
    }
  }, [left, status, time, moves]);

  const remove = (piece, index) => {
    if (status !== "playing" || piece.removed) return;
    // Only the uppermost remaining bar can be removed; each successful removal reveals the next.
    const topIndex = pieces.reduce((top, p, i) => !p.removed ? i : top, -1);
    if (index !== topIndex) { setMessage("That bolt is covered! Remove a glowing top-layer bolt first."); return; }
    setPieces(old => old.map(p => p.id === piece.id ? { ...p, removed: true } : p));
    setMoves(m => m + 1);
    setMessage("Nice move! Keep clearing the board.");
  };

  const next = () => {
    const s = Math.min(stage + 1, LEVELS.length - 1);
    setStage(s); reset(s);
  };
  const restartAll = () => { setStage(0); setScore(0); reset(0); };

  return (
    <main className="nc-root">
      <style>{`
        .nc-root{--lime:#c4f63d;--gold:#ffbf43;min-height:100dvh;box-sizing:border-box;padding:14px 20px 18px;color:#f7f8ef;background:radial-gradient(ellipse at 50% 5%,#272d1d 0%,#11140f 55%,#0a0c09 100%);font-family:Inter,system-ui,sans-serif}
        .nc-root *{box-sizing:border-box}.nc-shell{max-width:900px;margin:0 auto}
        .nc-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:0 auto 14px}
        .nc-logo{font-size:clamp(23px,3.4vw,34px);font-weight:1000;font-style:italic;letter-spacing:-1.4px;text-align:center;text-shadow:0 3px #0008}.nc-logo span{color:var(--lime)}
        .nc-stage{justify-self:end;border:1px solid #414c27;border-radius:99px;padding:8px 12px;color:var(--lime);font-size:11px;font-weight:900;white-space:nowrap}
        .nc-btn{border:0;border-radius:12px;padding:12px 18px;font-weight:950;letter-spacing:.3px;cursor:pointer;transition:transform .15s,filter .15s;background:linear-gradient(120deg,#d5ff69,#b5eb2e);color:#15190c;box-shadow:0 7px 20px #a9e82b20}
        .nc-btn:hover{filter:brightness(1.06);transform:translateY(-1px)}.nc-btn:focus-visible,.nc-bolt:focus-visible{outline:3px solid white;outline-offset:3px}
        .nc-ghost{justify-self:start;background:#1a1e16;border:1px solid #3b422f;border-radius:10px;padding:9px 12px;color:#fff;font-weight:800;cursor:pointer}
        .nc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
        .nc-stat{background:linear-gradient(145deg,#20241b,#151811);border:1px solid #343a2c;border-radius:15px;padding:12px;text-align:center;min-width:0}
        .nc-stat span{display:block;color:#b4bea5;font-size:9px;font-weight:900;letter-spacing:1.2px}.nc-stat strong{display:block;margin-top:5px;font-size:22px}
        .nc-instruction{text-align:center;color:#d9e3cb;font-size:12px;min-height:24px;margin:5px auto 10px}
        .nc-board{position:relative;width:min(100%,570px);height:clamp(320px,57vh,470px);margin:0 auto;border:1px solid #3a402d;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at center,#252b1d,#141710 72%,#10120d);box-shadow:inset 0 0 32px #0005}
        .nc-board:before{content:"";position:absolute;inset:12px;border:1px solid #4b351c;border-radius:14px;pointer-events:none}
        .nc-board-title{position:absolute;top:18px;left:0;right:0;text-align:center;font-size:10px;letter-spacing:2px;color:#e7b45a;font-weight:1000}
        .nc-board-center{position:absolute;left:50%;top:51%;width:clamp(180px,42vw,250px);height:clamp(180px,42vw,250px);transform:translate(-50%,-50%);border-radius:50%;border:8px solid #5a3518;background:repeating-radial-gradient(circle at 50% 50%,#b56a22 0 7px,#f5b84b 8px 12px,#6f3b18 13px 16px);box-shadow:0 0 0 3px #0a0b08,0 0 30px #d78a2922,inset 0 0 0 3px #ffdc78}
        .nc-center-nut{position:absolute;left:50%;top:50%;width:38px;height:38px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd66b,#b96b13 60%,#61320e);border:3px solid #ffd57b;box-shadow:0 4px 8px #0008}
        .nc-bar{position:absolute;left:50%;top:50%;height:38px;border-radius:10px;width:var(--len);max-width:70%;transform:translate(-50%,-50%) rotate(var(--angle));background:linear-gradient(180deg,#ffffff55 0%,var(--color) 23%,var(--color) 75%,#0005 100%);border:2px solid #ffffff40;box-shadow:0 6px 7px #0009,inset 0 2px #ffffff45;display:flex;align-items:center;justify-content:space-between;padding:0 10px;transition:opacity .2s,transform .25s}
        .nc-bar.removed{opacity:0;pointer-events:none;transform:translate(-50%,-50%) rotate(var(--angle)) scale(.75)}
        .nc-bolt{width:30px;height:30px;border-radius:50%;border:3px solid #7d8589;background:radial-gradient(circle at 32% 24%,#fff,#b6c0c3 30%,#60686c 68%,#282c2e);box-shadow:0 3px 5px #0009;position:relative;cursor:pointer;padding:0}
        .nc-bolt:before{content:"";position:absolute;left:6px;right:6px;top:11px;height:4px;background:#41474a;border-radius:2px;transform:rotate(-35deg)}
        .nc-bolt.available{box-shadow:0 0 0 3px #c4f63d50,0 0 14px #c4f63d;animation:nc-glow 1.3s ease-in-out infinite}
        .nc-bolt.locked{filter:brightness(.58);cursor:not-allowed}
        @keyframes nc-glow{50%{box-shadow:0 0 0 5px #c4f63d25,0 0 19px #c4f63d}}
        .nc-board-foot{position:absolute;bottom:15px;left:0;right:0;text-align:center;font-size:9px;font-weight:900;letter-spacing:1.5px;color:#9da58f}
        .nc-message{text-align:center;min-height:20px;margin:9px auto 5px;color:var(--lime);font-size:11px;font-weight:800}
        .nc-bottom{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:7px auto 0}
        .nc-tip{font-size:11px;color:#bfc8b2}.nc-tip b{color:var(--lime)}
        .nc-result{max-width:570px;margin:8px auto 0;padding:13px 16px;border:1px solid #3b432e;border-radius:17px;background:#1b2017;text-align:center}
        .nc-result h2{margin:3px 0;color:var(--lime);font-size:clamp(22px,4vw,30px);font-weight:1000}.nc-result p{margin:4px 0 12px;color:#c2c9b8;font-size:12px}
        .nc-result-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap}.nc-secondary{background:#1d2218;color:#eff5e5;border:1px solid #414a32;box-shadow:none}
        @media(max-width:520px){.nc-root{padding:10px 12px 14px}.nc-header{gap:6px;margin-bottom:10px}.nc-ghost{padding:8px 9px;font-size:12px}.nc-stage{padding:7px 8px;font-size:9px}.nc-logo{font-size:clamp(19px,5.6vw,27px);letter-spacing:-1px}.nc-stats{gap:6px}.nc-stat{padding:10px 4px;border-radius:12px}.nc-stat strong{font-size:19px}.nc-stat span{font-size:8px;letter-spacing:.6px}.nc-board{height:clamp(300px,49vh,390px);border-radius:18px}.nc-board-center{width:min(58vw,220px);height:min(58vw,220px)}.nc-bar{height:32px}.nc-bolt{width:25px;height:25px}.nc-bolt:before{top:9px;left:5px;right:5px}.nc-instruction{font-size:11px;margin-bottom:7px}.nc-bottom{gap:9px}.nc-tip{width:100%;text-align:center}.nc-btn{padding:11px 14px}}
        @media(max-height:720px) and (min-width:521px){.nc-root{padding-top:8px}.nc-header{margin-bottom:8px}.nc-stat{padding:8px}.nc-board{height:clamp(280px,48vh,350px)}.nc-instruction{margin:2px auto 6px}.nc-message{margin:4px auto}}
        @media(prefers-reduced-motion:reduce){.nc-root *{animation:none!important;transition:none!important}}
      `}</style>
      <div className="nc-shell">
        <header className="nc-header">
          <button className="nc-ghost" onClick={onBack} type="button">← Home</button>
          <div className="nc-logo">NUT<span>CRAFT</span></div>
          <span className="nc-stage">STAGE {stage + 1}</span>
        </header>
        <section className="nc-stats">
          <div className="nc-stat"><span>TIME LEFT</span><strong>{`0${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`}</strong></div>
          <div className="nc-stat"><span>SCORE</span><strong>{score}</strong></div>
          <div className="nc-stat"><span>BARS LEFT</span><strong>{left}</strong></div>
        </section>
        <div className="nc-instruction">{status === "playing" ? LEVELS[stage].name + " · " + message : message}</div>
        <section className="nc-board" aria-label="NutCraft puzzle board">
          <div className="nc-board-title">TWIST • REMOVE • MASTER</div>
          <div className="nc-board-center"><div className="nc-center-nut" /></div>
          {pieces.map((piece, i) => (
            <div key={piece.id} className={`nc-bar ${piece.removed ? "removed" : ""}`}
              style={{ "--color": piece.color, "--angle": `${piece.angle}deg`, "--len": `${piece.length}px`, zIndex: i + 2 }}>
              {[0, 1].map(side => (
                <button key={side} className={`nc-bolt ${i === pieces.reduce((top, p, idx) => !p.removed ? idx : top, -1) ? "available" : "locked"}`}
                  type="button" aria-label={`Remove ${piece.id} bolt ${side + 1}`}
                  onClick={() => remove(piece, i)} />
              ))}
            </div>
          ))}
          <div className="nc-board-foot">BOLTS REMOVED: {moves}</div>
        </section>
        <div className="nc-message" role="status">{status === "playing" ? "✦ Clear the top layer to reveal the next bar." : message}</div>
        {status === "playing" && <div className="nc-bottom">
          <div className="nc-tip">🟢 Glowing bolts are available to remove.</div>
          <button className="nc-btn nc-secondary" onClick={() => reset()} type="button">↻ RESTART</button>
        </div>}
        {(status === "won" || status === "timeout") && <section className="nc-result">
          <h2>{status === "won" ? "PUZZLE SOLVED!" : "TIME'S UP!"}</h2>
          <p>{status === "won" ? "Great work, builder. Ready for a tougher board?" : "Try again and beat the clock."}</p>
          <div className="nc-result-actions">
            {status === "won" && stage < LEVELS.length - 1 && <button className="nc-btn" onClick={next} type="button">NEXT STAGE →</button>}
            <button className="nc-btn nc-secondary" onClick={() => reset()} type="button">↻ TRY AGAIN</button>
            {stage === LEVELS.length - 1 && status === "won" && <button className="nc-btn" onClick={restartAll} type="button">PLAY FROM START</button>}
          </div>
        </section>}
      </div>
    </main>
  );
}
