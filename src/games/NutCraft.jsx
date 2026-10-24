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
        .nc-root{--lime:#c8ff43;--gold:#ffbd45;min-height:100dvh;box-sizing:border-box;padding:12px 18px 16px;color:#f8f8f0;background:radial-gradient(ellipse at 50% -10%,#303823 0%,#171b13 42%,#090b08 100%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-x:hidden}
        .nc-root *{box-sizing:border-box}.nc-shell{max-width:940px;margin:0 auto}
        .nc-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:0 auto 12px}
        .nc-logo{font-size:clamp(24px,3.5vw,36px);font-weight:1000;font-style:italic;letter-spacing:-1.6px;text-align:center;text-shadow:0 3px 0 #000,0 0 22px #c8ff4310;white-space:nowrap}.nc-logo span{color:var(--lime);text-shadow:0 2px 0 #394d12,0 0 18px #c8ff4325}
        .nc-stage{justify-self:end;border:1px solid #4b5b2b;border-radius:99px;padding:7px 11px;color:var(--lime);background:#202719;font-size:10px;font-weight:950;letter-spacing:.7px;white-space:nowrap;box-shadow:inset 0 1px #ffffff0a}
        .nc-btn{border:1px solid #e6ff9b70;border-radius:12px;padding:11px 17px;font-weight:950;letter-spacing:.4px;cursor:pointer;transition:transform .16s,filter .16s,box-shadow .16s;background:linear-gradient(135deg,#ddff79 0%,#c4f43d 48%,#aee52e 100%);color:#17200b;box-shadow:0 7px 18px #a9e82b20,inset 0 1px #ffffffa8,inset 0 -2px #6f9d1e40}
        .nc-btn:hover{filter:brightness(1.06);transform:translateY(-2px);box-shadow:0 10px 22px #a9e82b30,inset 0 1px #ffffffa8}.nc-btn:active{transform:translateY(0)}.nc-btn:focus-visible,.nc-bolt:focus-visible{outline:3px solid white;outline-offset:3px}
        .nc-ghost{justify-self:start;background:linear-gradient(180deg,#22271d,#171a13);border:1px solid #424a36;border-radius:11px;padding:9px 12px;color:#f5f7ed;font-weight:850;cursor:pointer;box-shadow:inset 0 1px #ffffff0b;transition:background .15s,border-color .15s}.nc-ghost:hover{background:#2a3021;border-color:#68784a}
        .nc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:8px}.nc-stat{position:relative;overflow:hidden;background:linear-gradient(145deg,#24291f,#181c15 72%);border:1px solid #3b4430;border-radius:15px;padding:10px 12px;text-align:center;min-width:0;box-shadow:0 8px 20px #0002,inset 0 1px #ffffff09}.nc-stat:before{content:"";position:absolute;top:0;left:14%;right:14%;height:1px;background:linear-gradient(90deg,transparent,#d8f99b35,transparent)}
        .nc-stat span{display:block;color:#b9c3ad;font-size:9px;font-weight:950;letter-spacing:1.2px}.nc-stat strong{display:block;margin-top:5px;font-size:21px;line-height:1.1;font-weight:950;font-variant-numeric:tabular-nums}
        .nc-instruction{display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;color:#dce5d0;font-size:11px;line-height:1.4;min-height:22px;margin:3px auto 8px}.nc-instruction:before{content:"";width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:var(--lime);box-shadow:0 0 11px #c8ff43a8}
        .nc-board{position:relative;isolation:isolate;width:min(100%,570px);height:clamp(300px,51vh,420px);margin:0 auto;border:1px solid #444b35;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at 50% 43%,#2a3021 0%,#191d15 48%,#10120d 100%);box-shadow:0 18px 42px #0005,inset 0 1px #ffffff0a,inset 0 0 38px #0005}
        .nc-board:before{content:"";position:absolute;inset:9px;border:1px solid #d4a34b28;border-radius:16px;pointer-events:none;z-index:20}.nc-board:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,#ffffff04,transparent 30%,transparent 70%,#0002);pointer-events:none;z-index:19}
        .nc-board-title{position:absolute;top:15px;left:0;right:0;text-align:center;font-size:9px;letter-spacing:2.2px;color:#e4bd75;font-weight:1000;text-shadow:0 1px 3px #000;z-index:21}
        .nc-board-center{position:absolute;left:50%;top:49%;width:clamp(175px,37vw,235px);height:clamp(175px,37vw,235px);transform:translate(-50%,-50%);border-radius:50%;border:8px solid #5c3518;background:repeating-radial-gradient(circle at 50% 50%,#b56a22 0 7px,#f5b84b 8px 12px,#6f3b18 13px 16px);box-shadow:0 0 0 3px #090b08,0 0 0 5px #b47b3030,0 0 35px #d78a2925,inset 0 0 0 3px #ffdc78,inset 0 0 20px #52260860;z-index:1}
        .nc-center-nut{position:absolute;left:50%;top:50%;width:42px;height:42px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 32% 25%,#ffe8a0 0%,#ffc94d 22%,#b96b13 65%,#61320e 100%);border:3px solid #ffdb7c;box-shadow:0 4px 8px #0008,inset 0 2px 3px #fff8}.nc-center-nut:after{content:"";position:absolute;left:10px;right:10px;top:16px;height:4px;border-radius:4px;background:#75420f;transform:rotate(45deg);box-shadow:0 1px #ffdf84}
        .nc-bar{position:absolute;left:50%;top:50%;height:38px;border-radius:11px;width:var(--len);max-width:70%;transform:translate(-50%,-50%) rotate(var(--angle));background:linear-gradient(180deg,#ffffff78 0%,var(--color) 19%,var(--color) 69%,#0005 100%);border:1px solid #ffffff70;box-shadow:0 7px 9px #000a,inset 0 2px 1px #ffffff55,inset 0 -3px 2px #0003;display:flex;align-items:center;justify-content:space-between;padding:0 8px;transition:opacity .24s,transform .28s cubic-bezier(.2,.8,.2,1)}.nc-bar:after{content:"";position:absolute;left:15px;right:15px;top:5px;height:2px;background:#ffffff35;border-radius:99px;pointer-events:none}.nc-bar.removed{opacity:0;pointer-events:none;transform:translate(-50%,-50%) rotate(var(--angle)) scale(.72)}
        .nc-bolt{width:29px;height:29px;flex:0 0 29px;border-radius:50%;border:3px solid #aab2b5;background:radial-gradient(circle at 30% 22%,#fff 0%,#d9e0e1 19%,#9ca6aa 42%,#626a6d 70%,#272c2e 100%);box-shadow:0 3px 5px #000a,inset 0 1px #fff;position:relative;cursor:pointer;padding:0;z-index:2}.nc-bolt:before{content:"";position:absolute;left:6px;right:6px;top:10px;height:4px;background:#41474a;border-radius:2px;transform:rotate(-35deg);box-shadow:0 1px #e7ebeb70}.nc-bolt.available{border-color:#d8ff84;box-shadow:0 0 0 3px #c8ff4340,0 0 15px #c8ff43a6,inset 0 1px #fff;animation:nc-glow 1.5s ease-in-out infinite}.nc-bolt.locked{filter:brightness(.64);cursor:not-allowed}
        @keyframes nc-glow{50%{box-shadow:0 0 0 5px #c8ff4322,0 0 20px #c8ff43d0,inset 0 1px #fff}}
        .nc-board-foot{position:absolute;bottom:13px;left:0;right:0;text-align:center;font-size:9px;font-weight:950;letter-spacing:1.7px;color:#a7b096;z-index:21}.nc-message{text-align:center;min-height:18px;margin:7px auto 3px;color:var(--lime);font-size:10px;font-weight:850}.nc-bottom{display:flex;align-items:center;justify-content:center;gap:11px;flex-wrap:wrap;margin:5px auto 0}.nc-tip{font-size:10px;color:#c0c9b4}.nc-tip b{color:var(--lime)}
        .nc-result{max-width:570px;margin:7px auto 0;padding:14px 16px;border:1px solid #414a32;border-radius:17px;background:linear-gradient(145deg,#22271d,#151811);text-align:center;box-shadow:0 10px 25px #0003,inset 0 1px #ffffff0a}.nc-result h2{margin:3px 0;color:var(--lime);font-size:clamp(23px,4vw,30px);font-weight:1000;letter-spacing:.5px}.nc-result p{margin:5px 0 12px;color:#c2c9b8;font-size:12px}.nc-result-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap}.nc-secondary{background:linear-gradient(180deg,#252a20,#191d15);color:#eff5e5;border:1px solid #48513a;box-shadow:inset 0 1px #ffffff0a}
        @media(max-width:560px){.nc-root{padding:9px 10px 12px}.nc-header{gap:5px;margin-bottom:9px}.nc-ghost{padding:8px 8px;font-size:11px}.nc-stage{padding:6px 7px;font-size:8px}.nc-logo{font-size:clamp(18px,5.4vw,25px);letter-spacing:-1px}.nc-stats{gap:6px}.nc-stat{padding:9px 3px;border-radius:12px}.nc-stat strong{font-size:18px}.nc-stat span{font-size:7px;letter-spacing:.6px}.nc-board{height:clamp(290px,45vh,370px);border-radius:18px}.nc-board-center{width:min(56vw,210px);height:min(56vw,210px)}.nc-bar{height:32px;max-width:74%;padding:0 6px}.nc-bolt{width:25px;height:25px;flex-basis:25px}.nc-bolt:before{top:9px;left:5px;right:5px}.nc-instruction{font-size:10px;margin:2px auto 6px}.nc-bottom{gap:8px}.nc-tip{width:100%;text-align:center}.nc-btn{padding:10px 12px;font-size:12px}.nc-result{padding:12px 10px}}
        @media(max-width:360px){.nc-root{padding-inline:7px}.nc-logo{font-size:17px}.nc-ghost{font-size:10px;padding:7px 6px}.nc-stage{font-size:7px;padding:6px}.nc-stat strong{font-size:16px}.nc-board{height:280px}.nc-board-center{width:165px;height:165px}.nc-bar{height:29px}.nc-bolt{width:22px;height:22px;flex-basis:22px}.nc-bolt:before{top:7px}}
        @media(max-height:720px) and (min-width:561px){.nc-root{padding-top:7px}.nc-header{margin-bottom:6px}.nc-stat{padding:8px}.nc-board{height:clamp(260px,43vh,330px)}.nc-instruction{margin:1px auto 4px}.nc-message{margin:3px auto}}
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
