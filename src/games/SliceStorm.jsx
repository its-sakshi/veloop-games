import React, { useCallback, useEffect, useRef, useState } from "react";
import "./SliceStorm.css";

const ROUND_TIME = 60;
const STARTING_LIVES = 3;
const MAX_DPR = 2;

const FRUITS = [
  { emoji: "🍉", color: "#ff3158", light: "#ff9aa9", points: 10 },
  { emoji: "🍊", color: "#ff941f", light: "#ffe09b", points: 10 },
  { emoji: "🍏", color: "#45db69", light: "#d0ff9b", points: 10 },
  { emoji: "🍍", color: "#ffcc36", light: "#fff4a0", points: 15 },
  { emoji: "🍓", color: "#ff4775", light: "#ffb3c8", points: 15 },
  { emoji: "🥝", color: "#9be34b", light: "#edffb0", points: 15 },
  { emoji: "🍎", color: "#f43e45", light: "#ffaaaa", points: 10 },
  { emoji: "🍋", color: "#f7db32", light: "#fff6a0", points: 10 },
];

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;

  if (!length) return Math.hypot(px - ax, py - ay);

  const t = clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1);

  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function createGame(width, height) {
  return {
    width,
    height,
    fruits: [],
    particles: [],
    splashRings: [],
    trail: [],
    floatingTexts: [],
    spawnTimer: 0.5,
    elapsed: 0,
    score: 0,
    lives: STARTING_LIVES,
    timeLeft: ROUND_TIME,
    combo: 0,
    comboTimer: 0,
    round: 1,
    sliced: 0,
    pointerDown: false,
    lastPoint: null,
    shake: 0,
    finalReason: "",
    damageCooldown: 0,
    bombHitThisSwipe: false,
    lastMissPenaltyAt: 0,
  };
}

export default function SliceStorm({ onExit, onBack, onGameComplete }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const animationRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastHudRef = useRef(0);
  const statusRef = useRef("ready");
  const completedRef = useRef(false);
  const callbackRef = useRef(onGameComplete);

  const [status, setStatus] = useState("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [round, setRound] = useState(1);

  const updateStatus = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    callbackRef.current = onGameComplete;
  }, [onGameComplete]);

  // Keep the canvas drawing coordinates matched to its responsive CSS size.
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!gameRef.current) {
      gameRef.current = createGame(rect.width, rect.height);
      return;
    }

    const game = gameRef.current;
    const oldWidth = game.width || rect.width;
    const oldHeight = game.height || rect.height;

    // Preserve game object positions proportionally when the screen changes size.
    const scaleX = rect.width / oldWidth;
    const scaleY = rect.height / oldHeight;

    game.fruits.forEach((fruit) => {
      fruit.x = clamp(
        fruit.x * scaleX,
        fruit.radius,
        Math.max(fruit.radius, rect.width - fruit.radius)
      );
      fruit.y *= scaleY;
      fruit.vx *= scaleX;
      fruit.vy *= scaleY;
    });

    game.particles.forEach((particle) => {
      particle.x *= scaleX;
      particle.y *= scaleY;
    });

    game.trail.forEach((point) => {
      point.x *= scaleX;
      point.y *= scaleY;
    });

    game.splashRings.forEach((ring) => {
      ring.x *= scaleX;
      ring.y *= scaleY;
    });

    game.floatingTexts.forEach((item) => {
      item.x *= scaleX;
      item.y *= scaleY;
    });

    game.width = rect.width;
    game.height = rect.height;
  }, []);

  useEffect(() => {
    initCanvas();

    let resizeFrame = 0;
    const handleResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(initCanvas);
    };

    let observer;

    if (typeof ResizeObserver !== "undefined" && canvasRef.current) {
      observer = new ResizeObserver(handleResize);
      observer.observe(canvasRef.current);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [initCanvas]);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initCanvas();

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    gameRef.current = createGame(rect.width, rect.height);

    completedRef.current = false;
    lastFrameRef.current = 0;
    lastHudRef.current = 0;

    setScore(0);
    setLives(STARTING_LIVES);
    setTimeLeft(ROUND_TIME);
    setCombo(0);
    setXp(0);
    setRound(1);

    updateStatus("playing");
  }, [initCanvas, updateStatus]);

  const addSplash = useCallback((g, x, y, color, count = 24) => {
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(85, 300);
      const spark = i >= count - 7;

      g.particles.push({
        x: x + random(-4, 4),
        y: y + random(-4, 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: spark ? random(2, 4) : random(3, 8),
        life: spark ? 0.35 : random(0.4, 0.8),
        maxLife: spark ? 0.35 : 0.8,
        color: spark ? "#ffffff" : color,
        spark,
      });
    }

    g.splashRings.push({
      x,
      y,
      radius: 3,
      maxRadius: random(35, 55),
      life: 0.32,
      maxLife: 0.32,
      color,
    });

    g.splashRings.push({
      x,
      y,
      radius: 2,
      maxRadius: random(22, 38),
      life: 0.24,
      maxLife: 0.24,
      color: "#ffffff",
    });
  }, []);

  const loseLife = useCallback((g, x, y, message) => {
    if (g.lives <= 0) return;

    g.lives = Math.max(0, g.lives - 1);
    g.shake = 0.2;

    g.floatingTexts.push({
      x,
      y,
      text: message,
      color: "#ff526a",
      life: 0.8,
    });
  }, []);

  const sliceFruit = useCallback((g, fruit) => {
    if (fruit.sliced || fruit.missed) return;

    fruit.sliced = true;
    g.sliced += 1;
    g.combo += 1;
    g.comboTimer = 0.9;

    const multiplier = Math.min(g.combo, 5);
    const points = fruit.points * multiplier;

    g.score += points;

    addSplash(g, fruit.x, fruit.y, fruit.color, 26);

    g.floatingTexts.push({
      x: fruit.x,
      y: fruit.y - 12,
      text: g.combo >= 2
        ? `COMBO x${multiplier}  +${points}`
        : `+${points}`,
      color: g.combo >= 2 ? "#ffe16a" : "#ffffff",
      life: 0.85,
    });

    if (g.sliced % 12 === 0) g.round += 1;
  }, [addSplash]);

  const handleSlice = useCallback((g, point) => {
    if (!g.lastPoint) {
      g.lastPoint = point;
      return;
    }

    const { x: ax, y: ay } = g.lastPoint;
    const { x: bx, y: by } = point;

    if (Math.hypot(bx - ax, by - ay) > 2) {
      g.trail.push({
        x: bx,
        y: by,
        life: 0.22,
        maxLife: 0.22,
      });
    }

    let fruitCount = 0;
    let bombPenaltyApplied = false;

    for (const fruit of g.fruits) {
      if (fruit.sliced || fruit.missed) continue;

      const hitDistance = distanceToSegment(
        fruit.x,
        fruit.y,
        ax,
        ay,
        bx,
        by
      );

      if (hitDistance > fruit.radius + 7) continue;

      if (fruit.type === "bomb") {
        fruit.missed = true;
        addSplash(g, fruit.x, fruit.y, "#ff304f", 18);

        if (!bombPenaltyApplied && g.damageCooldown <= 0) {
          bombPenaltyApplied = true;
          g.damageCooldown = 0.8;
          loseLife(g, fruit.x, fruit.y - 12, "BOMB! -1 LIFE");
        } else {
          g.floatingTexts.push({
            x: fruit.x,
            y: fruit.y - 12,
            text: "BOMB!",
            color: "#ff526a",
            life: 0.45,
          });
        }
      } else {
        sliceFruit(g, fruit);
        fruitCount += 1;
      }
    }

    if (fruitCount > 1) {
      g.floatingTexts.push({
        x: (ax + bx) / 2,
        y: (ay + by) / 2 - 28,
        text: "NICE SLICE!",
        color: "#43eaff",
        life: 0.65,
      });
    }

    g.lastPoint = point;
  }, [addSplash, loseLife, sliceFruit]);

  // Convert pointer coordinates to the canvas's logical drawing coordinates.
  const getPointerPosition = useCallback((event, canvas, game) => {
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * game.width,
      y: ((event.clientY - rect.top) / rect.height) * game.height,
    };
  }, []);

  const handlePointerDown = (event) => {
    if (statusRef.current !== "playing") return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}

    game.pointerDown = true;
    game.lastPoint = getPointerPosition(event, canvas, game);
    game.bombHitThisSwipe = false;
  };

  const handlePointerMove = (event) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;

    if (
      !game ||
      !canvas ||
      !game.pointerDown ||
      statusRef.current !== "playing"
    ) {
      return;
    }

    event.preventDefault();

    handleSlice(
      game,
      getPointerPosition(event, canvas, game)
    );
  };

  const handlePointerUp = () => {
    const game = gameRef.current;
    if (!game) return;

    game.pointerDown = false;
    game.lastPoint = null;
    game.bombHitThisSwipe = false;
  };

  const finishGame = useCallback((g, reason) => {
    if (statusRef.current !== "playing") return;

    g.finalReason = reason;
    g.pointerDown = false;
    g.lastPoint = null;

    setScore(g.score);
    setLives(g.lives);
    setTimeLeft(Math.ceil(g.timeLeft));
    setCombo(0);
    setRound(g.round);
    setXp(Math.floor(g.score / 10));
    setBest((current) => Math.max(current, g.score));

    updateStatus("over");
  }, [updateStatus]);

  useEffect(() => {
    let alive = true;

    const draw = (timestamp) => {
      if (!alive) return;

      const canvas = canvasRef.current;
      const g = gameRef.current;

      if (!canvas || !g) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = Math.min(
        lastFrameRef.current
          ? (timestamp - lastFrameRef.current) / 1000
          : 0,
        0.035
      );

      lastFrameRef.current = timestamp;

      const width = g.width;
      const height = g.height;

      if (statusRef.current === "playing") {
        g.elapsed += dt;
        g.timeLeft = Math.max(0, ROUND_TIME - g.elapsed);
        g.spawnTimer -= dt;
        g.comboTimer -= dt;
        g.damageCooldown = Math.max(0, g.damageCooldown - dt);
        g.shake = Math.max(0, g.shake - dt);

        if (g.comboTimer <= 0) g.combo = 0;

        if (g.spawnTimer <= 0 && g.timeLeft > 0) {
          const count = Math.random() < 0.15 ? 3 : 2;
          const bombChance = Math.min(0.07 + g.round * 0.003, 0.12);

          for (let i = 0; i < count; i++) {
            const isBomb = Math.random() < bombChance;
            const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
            const radius = clamp(Math.min(width, height) * 0.075, 25, 50);
            const safeWidth = Math.max(width - radius * 2 - 20, 1);

            g.fruits.push({
              x: radius + 10 + Math.random() * safeWidth,
              y: height + radius + random(0, 35),
              vx: random(-75, 75),
              vy: -random(height * 0.8, height * 1.05),
              gravity: random(470, 590),
              radius,
              color: isBomb ? "#ff304f" : fruit.color,
              light: isBomb ? "#ff9b9b" : fruit.light,
              emoji: isBomb ? "" : fruit.emoji,
              type: isBomb ? "bomb" : "fruit",
              points: fruit.points,
              rotation: random(-0.3, 0.3),
              rotationSpeed: random(-1.5, 1.5),
              sliced: false,
              missed: false,
            });
          }

          g.spawnTimer =
            random(0.85, 1.15) * Math.max(0.75, 1 - g.round * 0.012);
        }

        for (const fruit of g.fruits) {
          if (fruit.sliced || fruit.missed) continue;

          fruit.x += fruit.vx * dt;
          fruit.y += fruit.vy * dt;
          fruit.vy += fruit.gravity * dt;
          fruit.rotation += fruit.rotationSpeed * dt;

          if (fruit.x < fruit.radius) {
            fruit.x = fruit.radius;
            fruit.vx = Math.abs(fruit.vx);
          } else if (fruit.x > width - fruit.radius) {
            fruit.x = width - fruit.radius;
            fruit.vx = -Math.abs(fruit.vx);
          }

          if (fruit.y > height + fruit.radius + 15 && fruit.vy > 0) {
            fruit.missed = true;
          }
        }

        g.fruits = g.fruits.filter(
          (fruit) => !fruit.sliced && !fruit.missed
        );

        if (g.lives <= 0) {
          g.lives = 0;
          finishGame(g, "lives");
        } else if (g.timeLeft <= 0) {
          g.timeLeft = 0;
          finishGame(g, "time");
        }

        if (timestamp - lastHudRef.current > 100) {
          lastHudRef.current = timestamp;
          setScore(g.score);
          setLives(g.lives);
          setTimeLeft(Math.ceil(g.timeLeft));
          setCombo(g.combo);
          setRound(g.round);
          setXp(Math.floor(g.score / 10));
          setBest((current) => Math.max(current, g.score));
        }
      }

      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#030b20");
      background.addColorStop(0.55, "#07132b");
      background.addColorStop(1, "#100723");

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 28; i++) {
        const x = (i * 97) % Math.max(width, 1);
        const y = (i * 137) % Math.max(height, 1);

        ctx.fillStyle = `rgba(31,126,255,${0.12 + (i % 4) * 0.06})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();

      if (g.shake > 0) {
        ctx.translate(
          random(-5, 5) * (g.shake / 0.2),
          random(-4, 4) * (g.shake / 0.2)
        );
      }

      for (const fruit of g.fruits) {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);

        if (fruit.type === "bomb") {
          ctx.shadowColor = "#ff263f";
          ctx.shadowBlur = 24;

          const bombGradient = ctx.createRadialGradient(
            -fruit.radius * 0.35,
            -fruit.radius * 0.4,
            2,
            0,
            0,
            fruit.radius * 1.2
          );

          bombGradient.addColorStop(0, "#69758d");
          bombGradient.addColorStop(0.28, "#242c40");
          bombGradient.addColorStop(0.78, "#080d19");
          bombGradient.addColorStop(1, "#02040a");

          ctx.fillStyle = bombGradient;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 4;
          ctx.strokeStyle = "#ff304f";
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ff405b";
          ctx.font = `900 ${fruit.radius * 1.25}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("!", 0, 2);
        } else {
          ctx.shadowColor = fruit.color;
          ctx.shadowBlur = 22;

          const gradient = ctx.createRadialGradient(
            -fruit.radius * 0.35,
            -fruit.radius * 0.4,
            2,
            0,
            0,
            fruit.radius * 1.2
          );

          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(0.12, fruit.light);
          gradient.addColorStop(0.62, fruit.color);
          gradient.addColorStop(1, "#29182b");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(255,255,255,.85)";
          ctx.stroke();

          ctx.font = `${fruit.radius * 1.5}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(fruit.emoji, 0, 2);
        }

        ctx.restore();
      }

      g.trail = g.trail.filter((p) => p.life > 0);
      for (const p of g.trail) {
        p.life -= dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.shadowColor = "#27eaff";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#e9ffff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + p.life * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      g.splashRings = g.splashRings.filter((ring) => ring.life > 0);
      for (const ring of g.splashRings) {
        ring.life -= dt;
        const progress = 1 - ring.life / ring.maxLife;
        ring.radius = ring.maxRadius * progress;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 4 * (1 - progress) + 1;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      g.particles = g.particles.filter((p) => p.life > 0);
      for (const p of g.particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt;
        p.vx *= 0.985;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.spark ? 10 : 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      g.floatingTexts = g.floatingTexts.filter((item) => item.life > 0);
      for (const item of g.floatingTexts) {
        item.life -= dt;
        item.y -= 42 * dt;

        ctx.save();
        ctx.globalAlpha = Math.min(1, item.life * 2);
        ctx.font = "900 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
        ctx.restore();
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [finishGame]);

  useEffect(() => {
    if (status !== "over" || completedRef.current) return;

    completedRef.current = true;

    if (callbackRef.current) {
      callbackRef.current({
        score: gameRef.current?.score || 0,
        xp: Math.floor((gameRef.current?.score || 0) / 10),
        reason: gameRef.current?.finalReason || "time",
      });
    }
  }, [status]);

  const leaveGame = () => {
    if (onExit) onExit();
    else if (onBack) onBack();
  };

  const pauseGame = () => {
    const g = gameRef.current;
    if (!g) return;

    g.pointerDown = false;
    g.lastPoint = null;
    updateStatus("paused");
  };

  const resumeGame = () => {
    lastFrameRef.current = 0;
    updateStatus("playing");
  };

  return (
    <main className="ss-game">
      <div className="ss-shell">
        <header className="ss-header">
          <button className="ss-back" onClick={leaveGame}>
            <span>←</span> BACK
          </button>

          <div className="ss-brand">
            <span className="ss-brand-icon">✦</span>
            VELOOP <b>ARCADE</b>
          </div>

          <div className="ss-round-pill">ROUND {round}</div>
        </header>

        <section className="ss-hero">
          <div className="ss-kicker">
            <span className="ss-pulse" />
            FRESH ARCADE ACTION
            <span className="ss-new">NEW GAME</span>
          </div>

          <h1>
            SLICE <span>STORM</span>
          </h1>

          <p className="ss-tagline">
            SLICE. <b>COMBO.</b> CONQUER.
          </p>
        </section>

        <section className="ss-board-wrap">
          <div className="ss-board-top">
            <span>
              SLICE ARENA <b>•</b> ROUND {round}
            </span>

            <span className="ss-live">
              <i />
              {status === "playing"
                ? "LIVE"
                : status === "paused"
                  ? "PAUSED"
                  : "ARCADE"}
            </span>
          </div>

          <div className="ss-stats">
            <div>
              <small>SCORE</small>
              <strong>{score.toLocaleString()}</strong>
            </div>

            <div>
              <small>TIME LEFT</small>
              <strong className={timeLeft <= 10 ? "urgent" : ""}>
                00:{String(timeLeft).padStart(2, "0")}
              </strong>
            </div>

            <div>
              <small>LIVES</small>
              <strong className="ss-lives">
                {"♥".repeat(lives)}
                <span>{"♥".repeat(STARTING_LIVES - lives)}</span>
              </strong>
            </div>

            <div>
              <small>BEST</small>
              <strong>{best.toLocaleString()}</strong>
            </div>
          </div>

          <div className="ss-board">
            <canvas
              ref={canvasRef}
              className="ss-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onLostPointerCapture={handlePointerUp}
              aria-label="Swipe across fruit to slice it and avoid bombs."
            />

            {status !== "playing" && (
              <div className="ss-overlay">
                <div className="ss-overlay-card">
                  <div className="ss-overlay-icon">
                    {status === "over"
                      ? "✦"
                      : status === "paused"
                        ? "Ⅱ"
                        : "⚔"}
                  </div>

                  <span className="ss-overlay-kicker">
                    {status === "over"
                      ? "ROUND COMPLETE"
                      : status === "paused"
                        ? "TAKE A BREATHER"
                        : "READY YOUR BLADE"}
                  </span>

                  <h2>
                    {status === "over"
                      ? "STORM ENDED"
                      : status === "paused"
                        ? "GAME PAUSED"
                        : "SLICE THE STORM"}
                  </h2>

                  <p>
                    {status === "over"
                      ? gameRef.current?.finalReason === "lives"
                        ? "All three lives are gone. Ready for another round?"
                        : "Time's up! Your final score is ready."
                      : status === "paused"
                        ? "Your timer is paused. Resume when you're ready."
                        : "Swipe through fruit to score points. Avoid bombs and chain combos for bonus points."}
                  </p>

                  {status === "over" && (
                    <div className="ss-final-score">
                      <span>FINAL SCORE</span>
                      <strong>{score.toLocaleString()}</strong>
                      <small>+{xp} XP EARNED</small>
                    </div>
                  )}

                  <button
                    className="ss-play"
                    onClick={
                      status === "paused" ? resumeGame : startGame
                    }
                  >
                    {status === "over"
                      ? "PLAY AGAIN"
                      : status === "paused"
                        ? "RESUME GAME"
                        : "START SLICING"}
                    <span>➜</span>
                  </button>

                  <small className="ss-hint">
                    60 SECONDS • 3 LIVES • ENDLESS COMBOS
                  </small>
                </div>
              </div>
            )}

            {status === "playing" && combo >= 2 && (
              <div className="ss-combo-badge">
                <span>COMBO</span>
                <strong>x{Math.min(combo, 5)}</strong>
              </div>
            )}
          </div>

          <div className="ss-board-footer">
            <span>
              <i className="ss-blue-dot" /> Slice fruit for points
            </span>
            <span>
              <i className="ss-red-dot" /> Avoid bombs
            </span>
            <span>
              <i className="ss-gold-dot" /> Chain combos for bonus
            </span>
          </div>
        </section>

        <section className="ss-controls">
          <div className="ss-instruction">
            <span className="ss-blade">⚔</span>

            <div>
              <strong>YOUR BLADE, YOUR RULES</strong>
              <small>
                Swipe with your mouse or finger. Slice several fruits in one
                motion for bonus points. Letting fruits fall is completely
                safe!
              </small>
            </div>
          </div>

          <button
            className="ss-small-play"
            onClick={
              status === "playing"
                ? pauseGame
                : status === "paused"
                  ? resumeGame
                  : startGame
            }
          >
            {status === "playing"
              ? "PAUSE"
              : status === "paused"
                ? "RESUME"
                : status === "over"
                  ? "PLAY AGAIN"
                  : "PLAY NOW"}
            <span>{status === "playing" ? "Ⅱ" : "▶"}</span>
          </button>
        </section>

        <footer className="ss-footer">
          <div className="ss-xp">
            <strong>+{xp} XP</strong>
            <span>SLICE FRUITS. EARN REWARDS.</span>
          </div>

          <div className="ss-footer-right">
            <span className="ss-level">ROUND {round}</span>

            <button
              onClick={
                status === "playing"
                  ? pauseGame
                  : status === "paused"
                    ? resumeGame
                    : startGame
              }
            >
              {status === "playing"
                ? "PAUSE"
                : status === "paused"
                  ? "RESUME"
                  : "PLAY AGAIN"}
              <span>➜</span>
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}