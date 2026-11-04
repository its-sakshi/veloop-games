import React, { useCallback, useEffect, useRef, useState } from "react";
import "./BubbleBlast.css";

const WIDTH = 480;
const HEIGHT = 640;
const RADIUS = 17;
const DIAMETER = RADIUS * 2;
const COLS = 13;
const ROW_GAP = 30;
const TOP = 62;
const SHOOTER_X = WIDTH / 2;
const SHOOTER_Y = 574;
const COLORS = ["blue", "pink", "green", "yellow", "purple"];

const COLOR_MAP = {
  blue: "#168bff",
  pink: "#f02bd6",
  green: "#39e64b",
  yellow: "#ffd52a",
  purple: "#9b4cff",
};

const randomColor = () =>
  COLORS[Math.floor(Math.random() * COLORS.length)];

const createBubble = (row, col, color) => ({
  row,
  col,
  color,
  x: col * DIAMETER + RADIUS + (row % 2 ? RADIUS : 0),
  y: TOP + row * ROW_GAP,
});

const createGrid = (level = 1) => {
  const grid = [];
  const rows = Math.min(4 + level, 8);
  const palette = COLORS.slice(0, Math.min(3 + Math.floor((level - 1) / 2), 5));

  for (let row = 0; row < rows; row++) {
    const rowBubbles = [];
    for (let col = 0; col < COLS; col++) {
      if (row >= 2 && Math.random() > 0.78) continue;
      rowBubbles.push(
        createBubble(row, col, palette[Math.floor(Math.random() * palette.length)])
      );
    }
    grid.push(...rowBubbles);
  }
  return grid;
};

const getNeighbors = (bubble, bubbles) => {
  const odd = bubble.row % 2 === 1;
  const offsets = odd
    ? [
        [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, 0], [1, 1],
      ]
    : [
        [-1, -1], [-1, 0],
        [0, -1], [0, 1],
        [1, -1], [1, 0],
      ];

  return offsets
    .map(([dr, dc]) =>
      bubbles.find(
        (item) =>
          item.row === bubble.row + dr &&
          item.col === bubble.col + dc
      )
    )
    .filter(Boolean);
};

const findMatches = (start, bubbles) => {
  const visited = new Set();
  const queue = [start];
  const matches = [];

  while (queue.length) {
    const current = queue.shift();
    const key = `${current.row}-${current.col}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (current.color !== start.color) continue;
    matches.push(current);

    getNeighbors(current, bubbles).forEach((neighbor) => {
      const neighborKey = `${neighbor.row}-${neighbor.col}`;
      if (!visited.has(neighborKey)) {
        queue.push(neighbor);
      }
    });
  }
  return matches;
};

const findFloating = (bubbles) => {
  const connected = new Set();
  const queue = bubbles.filter((bubble) => bubble.row === 0);

  while (queue.length) {
    const current = queue.shift();
    const key = `${current.row}-${current.col}`;

    if (connected.has(key)) continue;
    connected.add(key);

    getNeighbors(current, bubbles).forEach((neighbor) => {
      const neighborKey = `${neighbor.row}-${neighbor.col}`;
      if (!connected.has(neighborKey)) queue.push(neighbor);
    });
  }

  return bubbles.filter(
    (bubble) => !connected.has(`${bubble.row}-${bubble.col}`)
  );
};

const getBubblePosition = (row, col) => ({
  x: col * DIAMETER + RADIUS + (row % 2 ? RADIUS : 0),
  y: TOP + row * ROW_GAP,
});

const drawBubble = (ctx, x, y, color, radius = RADIUS) => {
  const base = COLOR_MAP[color] || COLOR_MAP.blue;
  ctx.save();

  const gradient = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    1,
    x,
    y,
    radius
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.16, base);
  gradient.addColorStop(0.78, base);
  gradient.addColorStop(1, "#071a48");

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    x - radius * 0.32,
    y - radius * 0.4,
    radius * 0.25,
    radius * 0.13,
    -0.55,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fill();
  ctx.restore();
};

const createGame = (level = 1) => ({
  bubbles: createGrid(level),
  current: randomColor(),
  next: randomColor(),
  angle: -Math.PI / 2,
  projectile: null,
  score: 0,
  shots: 0,
  level,
  status: "playing",
  message: "",
  particles: [],
  floating: [],
});

export default function BubbleBlast({ onExit, onBack, onGameComplete }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const animationRef = useRef(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState("playing");
  const [nextColor, setNextColor] = useState("pink");
  const [shots, setShots] = useState(0);

  const leaveGame = useCallback(() => {
    if (onExit) onExit();
    else if (onBack) onBack();
  }, [onExit, onBack]);

  const syncUI = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    setScore(game.score);
    setLevel(game.level);
    setStatus(game.status);
    setNextColor(game.next);
    setShots(game.shots);
  }, []);

  const startGame = useCallback((nextLevel = 1) => {
    gameRef.current = createGame(nextLevel);
    setScore(0);
    setLevel(nextLevel);
    setStatus("playing");
    setShots(0);
    setNextColor(gameRef.current.next);
  }, []);

  const aimAt = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game || game.status !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const angle = Math.atan2(y - SHOOTER_Y, x - SHOOTER_X);
    game.angle = Math.max(-Math.PI + 0.18, Math.min(-0.18, angle));
  }, []);

  const resolveShot = useCallback((game, ball) => {
    const occupied = new Set(
      game.bubbles.map((item) => `${item.row}-${item.col}`)
    );

    let best = null;
    let bestDistance = Infinity;

    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < COLS; col++) {
        const key = `${row}-${col}`;
        if (occupied.has(key)) continue;

        const position = getBubblePosition(row, col);
        const hasNeighbor = row === 0 || getNeighbors({ row, col }, game.bubbles).length > 0;
        if (!hasNeighbor) continue;

        const distance = Math.hypot(
          position.x - ball.x,
          position.y - ball.y
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          best = { row, col, ...position };
        }
      }
    }

    if (!best) {
      game.status = "lost";
      game.message = "No space left!";
      onGameComplete?.({ score: game.score, xp: 10, level: game.level, reason: "lost" });
      return;
    }

    const placed = {
      row: best.row,
      col: best.col,
      x: best.x,
      y: best.y,
      color: ball.color,
    };

    game.bubbles.push(placed);
    const matches = findMatches(placed, game.bubbles);

    if (matches.length >= 3) {
      const removed = new Set(
        matches.map((item) => `${item.row}-${item.col}`)
      );

      game.bubbles = game.bubbles.filter(
        (item) => !removed.has(`${item.row}-${item.col}`)
      );

      game.score += matches.length * 15;

      matches.forEach((item) => {
        for (let i = 0; i < 6; i++) {
          game.particles.push({
            x: item.x,
            y: item.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1,
            color: COLOR_MAP[item.color],
          });
        }
      });

      const floating = findFloating(game.bubbles);
      if (floating.length) {
        const floatingKeys = new Set(
          floating.map((item) => `${item.row}-${item.col}`)
        );

        game.bubbles = game.bubbles.filter(
          (item) => !floatingKeys.has(`${item.row}-${item.col}`)
        );

        game.score += floating.length * 25;
        game.floating.push(...floating);
      }
    }

    if (game.bubbles.length === 0) {
      game.status = "won";
      game.message = "LEVEL CLEARED!";
      onGameComplete?.({ score: game.score, xp: game.level * 25 + 50, level: game.level, reason: "won" });
    } else {
      const lowest = Math.max(...game.bubbles.map((item) => item.y));
      if (lowest > 495) {
        game.status = "lost";
        game.message = "BUBBLES REACHED THE BOTTOM!";
        onGameComplete?.({ score: game.score, xp: 10, level: game.level, reason: "lost" });
      }
    }
  }, [onGameComplete]);

  const shoot = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.status !== "playing" || game.projectile) return;

    const speed = 12;
    game.projectile = {
      x: SHOOTER_X + Math.cos(game.angle) * 35,
      y: SHOOTER_Y + Math.sin(game.angle) * 35,
      vx: Math.cos(game.angle) * speed,
      vy: Math.sin(game.angle) * speed,
      color: game.current,
    };

    game.current = game.next;
    game.next = randomColor();
    game.shots += 1;
    syncUI();
  }, [syncUI]);

  const handlePointerDown = (event) => {
    event.preventDefault();
    aimAt(event.clientX, event.clientY);
    shoot();
  };

  useEffect(() => {
    startGame(1);
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let lastUIUpdate = 0;

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, "#07143d");
      gradient.addColorStop(0.55, "#0b2860");
      gradient.addColorStop(1, "#07112f");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let i = 0; i < 40; i++) {
        const x = (i * 97 + 31) % WIDTH;
        const y = (i * 67 + 19) % HEIGHT;
        ctx.beginPath();
        ctx.arc(x, y, i % 5 === 0 ? 1.8 : 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${0.2 + (i % 4) * 0.12})`;
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(89,160,255,0.13)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 35);
      ctx.lineTo(WIDTH, 35);
      ctx.stroke();
    };

    const draw = (timestamp) => {
      const game = gameRef.current;
      if (!game) return;

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      drawBackground();

      // Ceiling line
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(0, 48);
      ctx.lineTo(WIDTH, 48);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bubbles
      game.bubbles.forEach((bubble) => {
        drawBubble(ctx, bubble.x, bubble.y, bubble.color);
      });

      // Aim Line Guide
      if (game.status === "playing" && !game.projectile) {
        const startX = SHOOTER_X + Math.cos(game.angle) * 35;
        const startY = SHOOTER_Y + Math.sin(game.angle) * 35;
        const endX = SHOOTER_X + Math.cos(game.angle) * 160;
        const endY = SHOOTER_Y + Math.sin(game.angle) * 160;

        ctx.save();
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = "rgba(75, 220, 255, 0.65)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      }

      // Cannon Base & Barrel (Properly aligned rotation center)
      ctx.save();
      ctx.translate(SHOOTER_X, SHOOTER_Y);
      ctx.rotate(game.angle + Math.PI / 2);

      ctx.fillStyle = "#167de2";
      ctx.beginPath();
      ctx.roundRect(-16, -32, 32, 45, 9);
      ctx.fill();

      ctx.strokeStyle = "#ffdf69";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Current bubble in launcher (centered at shooter base)
      drawBubble(ctx, SHOOTER_X, SHOOTER_Y, game.current, 16);

      // Projectile movement & collision
      if (game.projectile) {
        const ball = game.projectile;
        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x <= RADIUS || ball.x >= WIDTH - RADIUS) {
          ball.vx *= -1;
          ball.x = Math.max(RADIUS, Math.min(WIDTH - RADIUS, ball.x));
        }

        const hit = game.bubbles.some(
          (item) => Math.hypot(item.x - ball.x, item.y - ball.y) <= DIAMETER - 1
        );

        if (ball.y <= TOP + RADIUS || hit) {
          game.projectile = null;
          resolveShot(game, ball);
          syncUI();
        } else {
          drawBubble(ctx, ball.x, ball.y, ball.color);
        }
      }

      // Particles
      game.particles = game.particles.filter((p) => p.life > 0);
      game.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Floating falling bubbles
      game.floating = game.floating.filter((b) => b.y < HEIGHT + 30);
      game.floating.forEach((b) => {
        b.y += 9;
        drawBubble(ctx, b.x, b.y, b.color);
      });

      // Danger line
      ctx.strokeStyle = "rgba(255, 85, 100, 0.4)";
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(0, 505);
      ctx.lineTo(WIDTH, 505);
      ctx.stroke();
      ctx.setLineDash([]);

      if (timestamp - lastUIUpdate > 150) {
        syncUI();
        lastUIUpdate = timestamp;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [resolveShot, syncUI]);

  return (
    <div className="bubble-blast">
      <div className="bb-shell">
        <header className="bb-header">
          <button className="bb-back" onClick={leaveGame} aria-label="Back to games">
            ← <span>BACK</span>
          </button>
          <div className="bb-title-area">
            <span className="bb-eyebrow">VELOOP ARCADE</span>
            <h1>Bubble Blast</h1>
          </div>
          <div className="bb-level-badge">
            <span>LEVEL</span>
            <strong>{level}</strong>
          </div>
        </header>

        <div className="bb-stats">
          <div className="bb-stat">
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div className="bb-stat">
            <span>SHOTS</span>
            <strong>{shots}</strong>
          </div>
          <div className="bb-stat">
            <span>NEXT BUBBLE</span>
            <span
              className="bb-next-preview"
              style={{ "--bubble-color": COLOR_MAP[nextColor] }}
            />
          </div>
        </div>

        <div className="bb-board-wrap">
          <canvas
            ref={canvasRef}
            className="bb-canvas"
            width={WIDTH}
            height={HEIGHT}
            onPointerMove={(event) => aimAt(event.clientX, event.clientY)}
            onPointerDown={handlePointerDown}
            onContextMenu={(event) => event.preventDefault()}
            aria-label="Bubble Blast game board. Aim and tap or click to shoot."
          />

          {status !== "playing" && (
            <div className="bb-end-controls">
              {status === "won" ? (
                <button
                  className="bb-primary-btn"
                  onClick={() => startGame(level + 1)}
                >
                  Next Level <span>→</span>
                </button>
              ) : (
                <button
                  className="bb-primary-btn"
                  onClick={() => startGame(1)}
                >
                  Try Again <span>↻</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bb-instructions">
          <div className="bb-instruction-icon">🎯</div>
          <div>
            <strong>How to Play</strong>
            <p>
              Aim with your mouse or finger and tap to shoot. Match 3 or more bubbles of the same color to pop them!
            </p>
          </div>
        </div>

        <div className="bb-actions">
          <button className="bb-secondary-btn" onClick={() => startGame(1)}>
            ↻ Restart Game
          </button>
          <span className="bb-status">
            {status === "playing"
              ? "Keep matching bubbles!"
              : status === "won"
              ? "Level completed successfully!"
              : "Game over - try again"}
          </span>
        </div>
      </div>
    </div>
  );
}