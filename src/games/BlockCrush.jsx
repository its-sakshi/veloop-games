import React, { useCallback, useEffect, useRef, useState } from "react";
import "./BlockCrush.css";

const COLS = 7;
const ROWS = 5;
const BALL_RADIUS = 6;
const BASE_BALL_SPEED = 390;
const COLORS = ["#ff424d", "#ff8a16", "#ffc928", "#42d85c", "#19c7ed", "#2877ff", "#a83cff"];

function makeLevel(level = 1) {
  const values = [
    [90, 80, 70, 80, 90, 70, 80],
    [60, 50, 40, 50, 60, 40, 50],
    [30, 20, 20, 20, 30, 20, 30],
    [15, 10, 10, 10, 15, 10, 15],
    [5, 5, 0, 5, 5, 0, 5],
  ];

  return values.map((row, r) =>
    row.map((value, c) => ({
      id: `${level}-${r}-${c}`,
      row: r,
      col: c,
      hp: value ? value + (level - 1) * 5 : 0,
      maxHp: value ? value + (level - 1) * 5 : 0,
      color: COLORS[(r + c + 1) % COLORS.length],
    }))
  );
}

export default function BlockCrush({ onWin, onExit, onBack, onGameComplete }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gameRef = useRef(null);

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("Aim with your pointer, then launch!");
  const [power, setPower] = useState("normal");
  const [soundOn, setSoundOn] = useState(true);
  const [best, setBest] = useState(0);
  const [activePowers, setActivePowers] = useState([]);

  const resetGameState = useCallback((nextLevel = 1) => {
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 700;
    const height = canvas?.clientHeight || 520;

    const paddleW = Math.min(116, width * 0.22);

    gameRef.current = {
      width,
      height,
      level: nextLevel,
      paddle: {
        x: width / 2,
        y: height - 30,
        w: paddleW,
        h: 12,
      },
      ball: {
        x: width / 2,
        y: height - 48,
        vx: 0,
        vy: 0,
        r: BALL_RADIUS,
        active: false,
      },
      extraBalls: [],
      fireBall: false,
      powerMultiplier: 1,
      powerTimers: {},
      aimX: width / 2,
      blocks: makeLevel(nextLevel),
      particles: [],
      powerups: [],
      multi: 1,
      shield: false,
      wide: false,
      timeBonus: 0,
      lastShot: 0,
    };

    setLevel(nextLevel);
    setBallsLeft(3);
    setPower("normal");
    setActivePowers([]);
    setStatus("ready");
    setMessage(
      nextLevel === 1
        ? "Aim with your pointer, then launch!"
        : `Level ${nextLevel}: crush every block!`
    );
  }, []);

  useEffect(() => {
    resetGameState(1);
  }, [resetGameState]);

  // Responsive canvas resizing. Game coordinates are scaled with the canvas.
  const resizeGame = useCallback(() => {
    const canvas = canvasRef.current;
    const g = gameRef.current;

    if (!canvas || !g) return;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const oldW = g.width || rect.width;
    const oldH = g.height || rect.height;

    const scaleX = rect.width / oldW;
    const scaleY = rect.height / oldH;

    g.width = rect.width;
    g.height = rect.height;

    g.paddle.x *= scaleX;
    g.paddle.y = rect.height - 30;

    g.paddle.w = Math.min(
      g.wide ? rect.width * 0.3 : 116,
      rect.width * (g.wide ? 0.3 : 0.22)
    );

    g.ball.x *= scaleX;
    g.ball.y *= scaleY;

    g.ball.x = Math.max(
      g.ball.r,
      Math.min(rect.width - g.ball.r, g.ball.x)
    );

    g.ball.y = Math.min(
      rect.height - 40,
      Math.max(8, g.ball.y)
    );

    g.aimX *= scaleX;
    g.aimX = Math.max(
      g.paddle.w / 2,
      Math.min(rect.width - g.paddle.w / 2, g.aimX)
    );

    g.paddle.x = Math.max(
      g.paddle.w / 2,
      Math.min(rect.width - g.paddle.w / 2, g.paddle.x)
    );

    g.extraBalls.forEach((ball) => {
      ball.x *= scaleX;
      ball.y *= scaleY;
      ball.x = Math.max(ball.r, Math.min(rect.width - ball.r, ball.x));
      ball.y = Math.max(8, Math.min(rect.height - 10, ball.y));
    });

    g.particles.forEach((particle) => {
      particle.x *= scaleX;
      particle.y *= scaleY;
    });

    g.powerups.forEach((item) => {
      item.x *= scaleX;
      item.y *= scaleY;
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeGame();

    let observer;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => resizeGame());
      observer.observe(canvas);
    }

    window.addEventListener("resize", resizeGame);
    window.addEventListener("orientationchange", resizeGame);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resizeGame);
      window.removeEventListener("orientationchange", resizeGame);
    };
  }, [resizeGame]);

  const spawnParticles = (g, x, y, color, count = 9) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 35 + Math.random() * 90;

      g.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        color,
      });
    }
  };

  const drawRoundedRect = (ctx, x, y, w, h, radius, fill, stroke) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const draw = useCallback((timestamp) => {
    const canvas = canvasRef.current;
    const g = gameRef.current;

    if (!canvas || !g) {
      frameRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dt = Math.min(
      (timestamp - (lastTimeRef.current || timestamp)) / 1000,
      0.032
    );

    lastTimeRef.current = timestamp;

    const { width, height } = g;

    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#061326");
    bg.addColorStop(0.55, "#030914");
    bg.addColorStop(1, "#0b0620");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(44,149,255,.08)";
    ctx.lineWidth = 1;

    const gridSize = Math.max(20, Math.min(28, width / 24));

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();

    const pad = Math.max(10, width * 0.035);
    const gap = Math.max(4, width * 0.008);
    const blockW = (width - pad * 2 - gap * (COLS - 1)) / COLS;
    const blockH = Math.max(22, Math.min(34, height * 0.065));
    const top = Math.max(22, height * 0.055);

    // Blocks
    g.blocks.forEach((row, r) =>
      row.forEach((block, c) => {
        if (block.hp <= 0) return;

        const x = pad + c * (blockW + gap);
        const y = top + r * (blockH + gap);
        const ratio = block.hp / block.maxHp;

        ctx.save();
        ctx.shadowColor = block.color;
        ctx.shadowBlur = 10;

        drawRoundedRect(
          ctx,
          x,
          y,
          blockW,
          blockH,
          6,
          block.color,
          "rgba(255,255,255,.72)"
        );

        ctx.shadowBlur = 0;

        const sheen = ctx.createLinearGradient(x, y, x, y + blockH);
        sheen.addColorStop(0, "rgba(255,255,255,.34)");
        sheen.addColorStop(0.45, "rgba(255,255,255,.02)");
        sheen.addColorStop(1, "rgba(0,0,0,.32)");

        drawRoundedRect(
          ctx,
          x + 2,
          y + 2,
          blockW - 4,
          blockH - 4,
          4,
          sheen
        );

        ctx.fillStyle = "#fff";
        ctx.font = `900 ${Math.max(
          12,
          Math.min(18, blockW * 0.34)
        )}px Orbitron, Rajdhani, system-ui, sans-serif`;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,.85)";
        ctx.shadowBlur = 3;

        ctx.fillText(
          block.hp,
          x + blockW / 2,
          y + blockH / 2 + 1
        );

        if (ratio < 0.5) {
          ctx.fillStyle = "rgba(0,0,0,.28)";
          ctx.fillRect(
            x + 4,
            y + blockH - 4,
            (blockW - 8) * (1 - ratio),
            2
          );
        }

        ctx.restore();
      })
    );

    // Power-ups
    g.powerups = g.powerups.filter((p) => p.y < height + 20);

    g.powerups.forEach((p) => {
      if (status === "playing") p.y += 75 * dt;

      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#06101e";
      ctx.font = "900 11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        p.type === "multi"
          ? "×3"
          : p.type === "wide"
          ? "↔"
          : p.type === "shield"
          ? "◇"
          : p.type === "fire"
          ? "✹"
          : p.type === "boost"
          ? "ϟ"
          : "+",
        p.x,
        p.y
      );

      ctx.restore();

      if (
        status === "playing" &&
        Math.abs(p.x - g.paddle.x) < g.paddle.w / 2 + 10 &&
        Math.abs(p.y - g.paddle.y) < 20
      ) {
        if (p.type === "multi") {
          g.multi = 3;

          const source = g.ball.active
            ? g.ball
            : g.extraBalls.find((b) => b.active) || g.ball;

          const baseSpeed = Math.max(
            BASE_BALL_SPEED,
            Math.hypot(source.vx, source.vy)
          );

          g.extraBalls = [-0.42, 0.42].map((spread) => ({
            x: source.x,
            y: source.y,
            vx: source.vx * 0.65 + spread * baseSpeed,
            vy: source.vy,
            r: BALL_RADIUS,
            active: true,
          }));
        }

        if (p.type === "wide") {
          g.wide = true;
          g.paddle.w = Math.min(width * 0.34, 190);
          g.powerTimers.wide = 12;
        }

        if (p.type === "shield") {
          g.shield = true;
          g.powerTimers.shield = 1;
        }

        if (p.type === "time") {
          g.timeBonus += 1;
          setBallsLeft((n) => n + 1);
        }

        if (p.type === "fire") {
          g.fireBall = true;
          g.powerTimers.fire = 10;
        }

        if (p.type === "boost") {
          g.powerMultiplier = 1.35;
          g.powerTimers.boost = 10;
        }

        setPower(p.type);
        setActivePowers((current) => [
          ...new Set([...current, p.type]),
        ]);

        setMessage(`${p.type.toUpperCase()} activated! Keep playing to use the boost.`);
        p.collected = true;
      }

      p.collected = p.collected || false;
    });

    g.powerups = g.powerups.filter((p) => !p.collected);

    // Power timer updates
    if (status === "playing") {
      Object.keys(g.powerTimers).forEach((key) => {
        if (g.powerTimers[key] > 0) {
          g.powerTimers[key] -= dt;
        }

        if (g.powerTimers[key] <= 0) {
          if (key === "wide") {
            g.wide = false;
            g.paddle.w = Math.min(116, width * 0.22);
          }

          if (key === "fire") g.fireBall = false;
          if (key === "boost") g.powerMultiplier = 1;

          delete g.powerTimers[key];

          setActivePowers((current) =>
            current.filter((item) => item !== key)
          );
        }
      });
    }

    // Extra balls
    (g.extraBalls || []).forEach((extra) => {
      if (!extra.active || status !== "playing") return;

      extra.x += extra.vx * dt;
      extra.y += extra.vy * dt;

      if (extra.x < extra.r) {
        extra.x = extra.r;
        extra.vx = Math.abs(extra.vx);
      }

      if (extra.x > width - extra.r) {
        extra.x = width - extra.r;
        extra.vx = -Math.abs(extra.vx);
      }

      if (extra.y < 8) extra.vy = Math.abs(extra.vy);

      const ep = g.paddle;

      if (
        extra.vy > 0 &&
        extra.y + extra.r >= ep.y - ep.h / 2 &&
        extra.x >= ep.x - ep.w / 2 - extra.r &&
        extra.x <= ep.x + ep.w / 2 + extra.r
      ) {
        extra.y = ep.y - ep.h / 2 - extra.r;
        extra.vy = -Math.abs(extra.vy);
        extra.vx += (extra.x - ep.x) * 2;
      }

      if (extra.y > height + 18) extra.active = false;

      let extraHit = false;

      g.blocks.forEach((row, r) =>
        row.forEach((block, c) => {
          if (extraHit || block.hp <= 0) return;

          const bx = pad + c * (blockW + gap);
          const by = top + r * (blockH + gap);

          if (
            extra.x + extra.r < bx ||
            extra.x - extra.r > bx + blockW ||
            extra.y + extra.r < by ||
            extra.y - extra.r > by + blockH
          ) {
            return;
          }

          const points = block.hp;
          block.hp = 0;

          if (!g.fireBall) extra.vy *= -1;

          extraHit = true;

          spawnParticles(
            g,
            bx + blockW / 2,
            by + blockH / 2,
            block.color,
            10
          );

          setScore((n) => n + points);
          setXp((n) => n + Math.max(1, Math.floor(points / 10)));
        })
      );

      ctx.save();

      ctx.shadowColor = g.fireBall ? "#ff702d" : "#32baff";
      ctx.shadowBlur = g.fireBall ? 28 : 18;

      const eg = ctx.createRadialGradient(
        extra.x - 3,
        extra.y - 4,
        1,
        extra.x,
        extra.y,
        extra.r + 2
      );

      eg.addColorStop(0, "#fff");
      eg.addColorStop(0.42, g.fireBall ? "#ffb36b" : "#8df4ff");
      eg.addColorStop(1, g.fireBall ? "#ff702d" : "#168aff");

      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(extra.x, extra.y, extra.r + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // Primary ball
    const ball = g.ball;

    if (ball.active && status === "playing") {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      }

      if (ball.x > width - ball.r) {
        ball.x = width - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }

      if (ball.y < 8) {
        ball.y = 8;
        ball.vy = Math.abs(ball.vy);
      }

      const p = g.paddle;

      if (
        ball.vy > 0 &&
        ball.y + ball.r >= p.y - p.h / 2 &&
        ball.y - ball.r <= p.y + p.h / 2 &&
        ball.x >= p.x - p.w / 2 - ball.r &&
        ball.x <= p.x + p.w / 2 + ball.r
      ) {
        ball.y = p.y - p.h / 2 - ball.r;

        const offset = (ball.x - p.x) / (p.w / 2);
        const angle = offset * 1.05;
        const speed = Math.hypot(ball.vx, ball.vy);

        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.max(170, Math.cos(angle) * speed);
      }

      let hitSomething = false;

      g.blocks.forEach((row, r) =>
        row.forEach((block, c) => {
          if (block.hp <= 0 || hitSomething) return;

          const bx = pad + c * (blockW + gap);
          const by = top + r * (blockH + gap);

          if (
            ball.x + ball.r < bx ||
            ball.x - ball.r > bx + blockW ||
            ball.y + ball.r < by ||
            ball.y - ball.r > by + blockH
          ) {
            return;
          }

          const pointsEarned = block.hp;
          block.hp = 0;

          const nearestX = Math.max(
            bx,
            Math.min(ball.x, bx + blockW)
          );

          const nearestY = Math.max(
            by,
            Math.min(ball.y, by + blockH)
          );

          const dx = ball.x - nearestX;
          const dy = ball.y - nearestY;

          if (!g.fireBall) {
            if (Math.abs(dx) > Math.abs(dy)) {
              ball.vx *= -1;
            } else {
              ball.vy *= -1;
            }
          }

          spawnParticles(g, nearestX, nearestY, block.color, 12);

          setScore((currentScore) => currentScore + pointsEarned);
          setXp((currentXp) =>
            currentXp + Math.max(1, Math.floor(pointsEarned / 10))
          );

          if (Math.random() < 0.48) {
            const types = [
              "multi",
              "wide",
              "shield",
              "time",
              "fire",
              "boost",
            ];

            const type = types[Math.floor(Math.random() * types.length)];

            const colors = {
              multi: "#25d9ff",
              wide: "#8cff35",
              shield: "#ffc928",
              time: "#ff63e8",
              fire: "#ff702d",
              boost: "#e66aff",
            };

            g.powerups.push({
              x: bx + blockW / 2,
              y: by + blockH / 2,
              type,
              color: colors[type],
            });
          }

          hitSomething = true;
        })
      );
    }

    // Ball/life handling
    if (status === "playing") {
      if (ball.active && ball.y > height + 18) {
        if (g.shield) {
          ball.y = height - 42;
          ball.vy = -Math.abs(ball.vy || BASE_BALL_SPEED * 0.7);
          ball.active = true;
          g.shield = false;

          delete g.powerTimers.shield;

          setActivePowers((current) =>
            current.filter((item) => item !== "shield")
          );

          setMessage("SHIELD saved your ball! Keep crushing blocks.");
        } else {
          ball.active = false;
        }
      }

      (g.extraBalls || []).forEach((extra) => {
        if (extra.active && extra.y > height + 18) {
          extra.active = false;
        }
      });

      const anyBallActive =
        ball.active || (g.extraBalls || []).some((b) => b.active);

      if (!anyBallActive) {
        g.multi = 1;
        g.extraBalls = [];

        setBallsLeft((left) => {
          const next = left - 1;

          if (next <= 0) {
            setStatus("over");
            setMessage("Out of balls! Try again and crush more blocks.");
          } else {
            setStatus("ready");
            setMessage("Ball returned. Adjust your aim and launch again!");
          }

          return Math.max(0, next);
        });
      }

      const remaining = g.blocks.flat().filter((b) => b.hp > 0).length;

      if (remaining === 0) {
        ball.active = false;
        (g.extraBalls || []).forEach((b) => (b.active = false));

        setStatus("levelup");
        setMessage(`Level ${g.level} cleared! Ready for the next challenge?`);
        setBest((b) => Math.max(b, score + 100));

        if (onWin) onWin();
        if (onGameComplete) onGameComplete();
      }
    }

    // Aim line
    if (
      ![g.ball, ...(g.extraBalls || [])].some((b) => b.active) &&
      status === "ready"
    ) {
      const startX = g.paddle.x;
      const startY = g.paddle.y - 16;
      const aimOffset = g.aimX - width / 2;
      const dy = -Math.max(120, height * 0.46);

      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = "rgba(76,221,255,.65)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + aimOffset * 0.65, startY + dy);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();
    }

    // Paddle
    const p = g.paddle;

    ctx.save();
    ctx.shadowColor = "#1e9dff";
    ctx.shadowBlur = 20;

    const paddleGradient = ctx.createLinearGradient(
      p.x - p.w / 2,
      p.y,
      p.x + p.w / 2,
      p.y
    );

    paddleGradient.addColorStop(0, "#ffb52a");
    paddleGradient.addColorStop(0.24, "#ff4b28");
    paddleGradient.addColorStop(0.5, "#092a56");
    paddleGradient.addColorStop(0.76, "#ff4b28");
    paddleGradient.addColorStop(1, "#ffc62d");

    drawRoundedRect(
      ctx,
      p.x - p.w / 2,
      p.y - p.h / 2,
      p.w,
      p.h,
      7,
      paddleGradient,
      "#ffce59"
    );

    drawRoundedRect(
      ctx,
      p.x - p.w * 0.18,
      p.y - 2,
      p.w * 0.36,
      4,
      3,
      "#28eaff"
    );

    ctx.restore();

    // Primary ball drawing
    if (ball.active) {
      const ballGrad = ctx.createRadialGradient(
        ball.x - 3,
        ball.y - 4,
        1,
        ball.x,
        ball.y,
        ball.r + 2
      );

      ballGrad.addColorStop(0, "#fff");
      ballGrad.addColorStop(0.42, g.fireBall ? "#ffb36b" : "#8df4ff");
      ballGrad.addColorStop(1, g.fireBall ? "#ff702d" : "#168aff");

      ctx.save();
      ctx.shadowColor = g.fireBall ? "#ff702d" : "#32baff";
      ctx.shadowBlur = g.fireBall ? 28 : 18;
      ctx.fillStyle = g.fireBall ? "#ff9b37" : ballGrad;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Particles
    g.particles = g.particles.filter((particle) => particle.life > 0);

    g.particles.forEach((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;

      ctx.globalAlpha = Math.max(
        0,
        particle.life / particle.maxLife
      );

      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    frameRef.current = requestAnimationFrame(draw);
  }, [score, status, spawnParticles]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  // Pointer and touch aiming
  const aimAt = (event) => {
    const canvas = canvasRef.current;
    const g = gameRef.current;

    if (!canvas || !g || (status !== "ready" && status !== "playing")) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const halfPaddle = g.paddle.w / 2;

    const x = Math.max(
      halfPaddle + 4,
      Math.min(
        g.width - halfPaddle - 4,
        event.clientX - rect.left
      )
    );

    g.aimX = x;
    g.paddle.x = x;

    if (status === "ready" && !g.ball.active) {
      g.ball.x = x;
    }
  };

  const launch = () => {
    const g = gameRef.current;

    if (!g || status !== "ready" || ballsLeft <= 0) return;

    const aimOffset = g.aimX - g.width / 2;

    const angle = Math.max(
      -0.95,
      Math.min(0.95, aimOffset / (g.width * 0.45))
    );

    const speed =
      BASE_BALL_SPEED *
      (g.multi === 3 ? 1.05 : 1) *
      (g.powerMultiplier || 1);

    g.ball.vx = Math.sin(angle) * speed;
    g.ball.vy = -Math.cos(angle) * speed;
    g.ball.active = true;

    setStatus("playing");
    setMessage("Crush the blocks! Catch power-ups with your paddle.");
  };

  const nextLevel = () => {
    resetGameState(level + 1);
  };

  const restart = () => {
    setScore(0);
    setXp(0);
    resetGameState(1);
  };

  const leaveGame = () => {
    if (onExit) onExit();
    else if (onBack) onBack();
  };

  return (
    <main className="bc-game">
      <div className="bc-shell">
        <header className="bc-header">
          <button
            className="bc-back"
            onClick={leaveGame}
            aria-label="Back to games"
          >
            ← <span>BACK</span>
          </button>

          <div className="bc-brand">
            <span className="bc-brand-mark">◆</span>
            <span>
              VELOOP <b>ARCADE</b>
            </span>
          </div>

          <button
            className={`bc-sound ${soundOn ? "is-on" : ""}`}
            onClick={() => setSoundOn((v) => !v)}
            aria-label="Toggle sound"
          >
            {soundOn ? "♫" : "♪"}
          </button>
        </header>

        <section className="bc-hero">
          <div className="bc-kicker">
            <span className="bc-pulse" />
            ARCADE CHALLENGE
            <span className="bc-new">NEW GAME</span>
          </div>

          <h1>
            <span>BLOCK</span> <strong>CRUSH</strong>
          </h1>

          <p>
            BREAK BLOCKS. <b>WIN BIG.</b>
          </p>

          <div className="bc-stats">
            <div>
              <small>SCORE</small>
              <strong>{score.toLocaleString()}</strong>
            </div>
            <div>
              <small>LEVEL</small>
              <strong>{level.toString().padStart(2, "0")}</strong>
            </div>
            <div>
              <small>BALLS LEFT</small>
              <strong>{ballsLeft}</strong>
            </div>
            <div>
              <small>BEST</small>
              <strong>{Math.max(best, score).toLocaleString()}</strong>
            </div>
          </div>
        </section>

        <section className="bc-layout">
          <aside className="bc-power-column">
            <div className={`bc-power ${activePowers.includes("fire") ? "is-active" : ""}`}>
              <span className="bc-power-icon fire">✹</span>
              <b>FIRE BALL</b>
              <small>{activePowers.includes("fire") ? "ACTIVE" : "Smash through"}</small>
            </div>

            <div className={`bc-power ${activePowers.includes("multi") ? "is-active" : ""}`}>
              <span className="bc-power-icon multi">×3</span>
              <b>MULTI BALL</b>
              <small>{activePowers.includes("multi") ? "ACTIVE" : "Triple the fun"}</small>
            </div>

            <div className={`bc-power ${activePowers.includes("wide") ? "is-active" : ""}`}>
              <span className="bc-power-icon wide">↔</span>
              <b>WIDE PADDLE</b>
              <small>{activePowers.includes("wide") ? "ACTIVE" : "Catch more"}</small>
            </div>
          </aside>

          <div className="bc-board-wrap">
            <div className="bc-board-top">
              <span>LEVEL {level}</span>
              <span className="bc-live-dot">● LIVE BOARD</span>
            </div>

            <canvas
              ref={canvasRef}
              className="bc-canvas"
              onPointerMove={aimAt}
              onPointerDown={aimAt}
              aria-label="Block Crush game board"
            />

            {status !== "playing" && (
              <div className="bc-board-overlay">
                <div className="bc-overlay-card">
                  <span className="bc-overlay-symbol">
                    {status === "levelup"
                      ? "★"
                      : status === "over"
                      ? "↻"
                      : "➤"}
                  </span>

                  <h2>
                    {status === "levelup"
                      ? "LEVEL CLEARED!"
                      : status === "over"
                      ? "GAME OVER"
                      : "AIM. CRUSH. REPEAT."}
                  </h2>

                  <p>{message}</p>

                  {status === "ready" && (
                    <button className="bc-launch" onClick={launch}>
                      LAUNCH BALL <span>➜</span>
                    </button>
                  )}

                  {status === "levelup" && (
                    <button className="bc-launch" onClick={nextLevel}>
                      NEXT LEVEL <span>➜</span>
                    </button>
                  )}

                  {status === "over" && (
                    <button className="bc-launch" onClick={restart}>
                      PLAY AGAIN <span>↻</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="bc-power-column right">
            <div className={`bc-power ${activePowers.includes("shield") ? "is-active" : ""}`}>
              <span className="bc-power-icon shield">⬡</span>
              <b>SHIELD</b>
              <small>{activePowers.includes("shield") ? "READY TO SAVE" : "Save the ball"}</small>
            </div>

            <div className="bc-power">
              <span className="bc-power-icon time">◷</span>
              <b>TIME+</b>
              <small>+1 ball</small>
            </div>

            <div className={`bc-power ${activePowers.includes("boost") ? "is-active" : ""}`}>
              <span className="bc-power-icon boost">ϟ</span>
              <b>POWER UP</b>
              <small>{activePowers.includes("boost") ? "SPEED BOOST" : "Faster ball"}</small>
            </div>
          </aside>
        </section>

        <section className="bc-controls">
          <div className="bc-aim-copy">
            <span className="bc-aim-dot" />
            <div>
              <b>YOUR MOVE</b>
              <small>
                Move your pointer or drag on the board to steer the paddle
                during play. Aim, then launch.
              </small>
            </div>
          </div>

          <button
            className="bc-launch bc-launch-bottom"
            onClick={launch}
            disabled={status !== "ready" || ballsLeft <= 0}
          >
            LAUNCH BALL <span>➜</span>
          </button>
        </section>

        <section className="bc-feature-row">
          <div>
            <span className="bc-feature-icon purple">◆</span>
            <p>
              <b>CRUSH BLOCKS</b>
              <small>Break blocks and clear the board.</small>
            </p>
          </div>

          <div>
            <span className="bc-feature-icon gold">♜</span>
            <p>
              <b>COLLECT ITEMS</b>
              <small>Catch power-ups for boosts.</small>
            </p>
          </div>

          <div>
            <span className="bc-feature-icon green">↗</span>
            <p>
              <b>LEVEL UP</b>
              <small>Complete levels to grow stronger.</small>
            </p>
          </div>

          <div>
            <span className="bc-feature-icon coin">◉</span>
            <p>
              <b>WIN REWARDS</b>
              <small>Earn score and XP as you play.</small>
            </p>
          </div>
        </section>

        <footer className="bc-footer">
          <div>
            <strong>+{xp} XP</strong>
            <span>BREAK ALL BLOCKS & WIN!</span>
            <small>Can you clear every level?</small>
          </div>

          <div className="bc-footer-actions">
            <span className="bc-foot-tag">LEVEL {level}</span>

            <button
              onClick={
                status === "levelup"
                  ? nextLevel
                  : status === "over"
                  ? restart
                  : launch
              }
              disabled={status === "playing"}
            >
              {status === "levelup"
                ? "NEXT LEVEL"
                : status === "over"
                ? "PLAY AGAIN"
                : status === "playing"
                ? "CRUSHING..."
                : "PLAY NOW"}
              <span>▶</span>
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}