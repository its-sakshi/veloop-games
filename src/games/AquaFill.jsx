import React, { useCallback, useEffect, useRef, useState } from "react";
import "./AquaFill.css";

const WIDTH = 800;
const HEIGHT = 600;

const LEVELS = [
  {
    source: { x: 105, y: 75 },
    glass: { x: 330, y: 465, w: 140, h: 105 },
    obstacles: [
      { x: 175, y: 230, w: 150, h: 18 },
      { x: 510, y: 335, w: 145, h: 18 },
    ],
    target: 55,
    hint: "Draw a path to guide the water into the glass.",
  },
  {
    source: { x: 90, y: 70 },
    glass: { x: 570, y: 465, w: 135, h: 105 },
    obstacles: [
      { x: 180, y: 185, w: 180, h: 18 },
      { x: 390, y: 300, w: 160, h: 18 },
      { x: 170, y: 405, w: 150, h: 18 },
    ],
    target: 55,
    hint: "The glass is far away. Create a long guiding path.",
  },
  {
    source: { x: 700, y: 75 },
    glass: { x: 320, y: 465, w: 145, h: 105 },
    obstacles: [
      { x: 470, y: 180, w: 150, h: 18 },
      { x: 270, y: 300, w: 190, h: 18 },
      { x: 100, y: 390, w: 160, h: 18 },
    ],
    target: 55,
    hint: "Water starts on the right. Guide it back toward the center.",
  },
  {
    source: { x: 100, y: 75 },
    glass: { x: 590, y: 465, w: 135, h: 105 },
    obstacles: [
      { x: 175, y: 170, w: 200, h: 18 },
      { x: 420, y: 260, w: 180, h: 18 },
      { x: 210, y: 350, w: 210, h: 18 },
    ],
    target: 60,
    hint: "Use the platforms to redirect the water.",
  },
  {
    source: { x: 400, y: 75 },
    glass: { x: 105, y: 465, w: 140, h: 105 },
    obstacles: [
      { x: 280, y: 165, w: 240, h: 18 },
      { x: 390, y: 270, w: 220, h: 18 },
      { x: 260, y: 375, w: 180, h: 18 },
    ],
    target: 45,
    hint: "Guide the water down and to the left, avoiding the platforms.",
  },
  {
    source: { x: 90, y: 75 },
    glass: { x: 330, y: 465, w: 140, h: 105 },
    obstacles: [
      { x: 180, y: 150, w: 160, h: 18 },
      { x: 430, y: 220, w: 180, h: 18 },
      { x: 210, y: 300, w: 170, h: 18 },
      { x: 450, y: 380, w: 150, h: 18 },
    ],
    target: 65,
    hint: "There are more obstacles now. Plan your route carefully.",
  },
  {
    source: { x: 710, y: 75 },
    glass: { x: 100, y: 465, w: 145, h: 105 },
    obstacles: [
      { x: 480, y: 155, w: 180, h: 18 },
      { x: 270, y: 245, w: 200, h: 18 },
      { x: 390, y: 335, w: 190, h: 18 },
      { x: 160, y: 405, w: 150, h: 18 },
    ],
    target: 65,
    hint: "The water must travel across the entire board.",
  },
  {
    source: { x: 400, y: 75 },
    glass: { x: 590, y: 465, w: 135, h: 105 },
    obstacles: [
      { x: 170, y: 150, w: 180, h: 18 },
      { x: 420, y: 190, w: 180, h: 18 },
      { x: 180, y: 290, w: 200, h: 18 },
      { x: 440, y: 365, w: 160, h: 18 },
    ],
    target: 65,
    hint: "Create a path that avoids the platforms.",
  },
  {
    source: { x: 95, y: 75 },
    glass: { x: 330, y: 465, w: 140, h: 105 },
    obstacles: [
      { x: 150, y: 145, w: 210, h: 18 },
      { x: 420, y: 220, w: 220, h: 18 },
      { x: 170, y: 290, w: 180, h: 18 },
      { x: 410, y: 365, w: 200, h: 18 },
      { x: 270, y: 410, w: 110, h: 18 },
    ],
    target: 70,
    hint: "Only a carefully drawn route will fill the glass.",
  },
  {
    source: { x: 700, y: 75 },
    glass: { x: 320, y: 465, w: 155, h: 105 },
    obstacles: [
      { x: 480, y: 130, w: 160, h: 18 },
      { x: 250, y: 205, w: 220, h: 18 },
      { x: 100, y: 285, w: 200, h: 18 },
      { x: 390, y: 350, w: 220, h: 18 },
      { x: 180, y: 410, w: 150, h: 18 },
    ],
    target: 70,
    hint: "Final challenge! Guide enough water into the glass.",
  },
];

const createInitialGame = () => ({
  particles: [],
  fill: 0,
  released: false,
  status: "playing",
  line: [],
  stars: 0,
  message: "Draw a line to guide the water!",
});

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx +
        (point.y - start.y) * dy) /
        (dx * dx + dy * dy)
    )
  );

  const closestX = start.x + t * dx;
  const closestY = start.y + t * dy;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

export default function AquaFill({ onExit, onBack }) {
  const [level, setLevel] = useState(1);
  const [game, setGame] = useState(createInitialGame);
  const [totalStars, setTotalStars] = useState(0);

  const boardRef = useRef(null);
  const gameRef = useRef(game);
  const levelRef = useRef(level);
  const drawingRef = useRef(false);
  const lastSpawnRef = useRef(0);
  const totalSpawnedRef = useRef(0);

  const config = LEVELS[level - 1];

  const leaveGame = useCallback(() => {
    if (onExit) onExit();
    else if (onBack) onBack();
  }, [onExit, onBack]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const updateGame = useCallback((updates) => {
    setGame((previous) => {
      const next = { ...previous, ...updates };
      gameRef.current = next;
      return next;
    });
  }, []);

  const resetLevel = useCallback(() => {
    const fresh = createInitialGame();
    gameRef.current = fresh;
    setGame(fresh);
    drawingRef.current = false;
    lastSpawnRef.current = 0;
    totalSpawnedRef.current = 0;
  }, []);

  const getPointerPosition = (event) => {
    const board = boardRef.current;
    if (!board) return null;

    const rect = board.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const startDrawing = (event) => {
    if (gameRef.current.released || gameRef.current.status !== "playing") {
      return;
    }

    event.preventDefault();

    const point = getPointerPosition(event);
    if (!point) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    drawingRef.current = true;

    updateGame({
      line: [point],
      message: "Keep drawing your water path!",
    });
  };

  const continueDrawing = (event) => {
    if (!drawingRef.current) return;

    event.preventDefault();

    const point = getPointerPosition(event);
    if (!point) return;

    setGame((previous) => {
      if (previous.released || previous.status !== "playing") return previous;

      const last = previous.line[previous.line.length - 1];

      if (
        last &&
        Math.hypot(point.x - last.x, point.y - last.y) < 5
      ) {
        return previous;
      }

      const next = {
        ...previous,
        line: [...previous.line, point],
      };

      gameRef.current = next;
      return next;
    });
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const releaseWater = () => {
    if (game.status !== "playing" || game.released) return;

    lastSpawnRef.current = 0;
    totalSpawnedRef.current = 0;

    updateGame({
      released: true,
      particles: [],
      message: "Water is flowing! Watch it reach the glass.",
    });
  };

  const finishLevel = useCallback((filled) => {
    const stars = filled >= 90 ? 3 : filled >= 75 ? 2 : 1;

    setGame((previous) => {
      const next = {
        ...previous,
        fill: 100,
        status: "won",
        stars,
        message: "Amazing! You filled the glass!",
      };

      gameRef.current = next;
      return next;
    });

    setTotalStars((previous) => previous + stars);
  }, []);

  // Water particle simulation with robust line and platform collision.
  useEffect(() => {
    if (!game.released || game.status !== "playing") return;

    let frameId;
    let lastTime = 0;
    let elapsed = 0;

    const tick = (time) => {
      if (!lastTime) lastTime = time;

      const delta = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;
      elapsed += delta;

      const current = gameRef.current;
      const currentConfig = LEVELS[levelRef.current - 1];

      if (!current || current.status !== "playing") return;

      let particles = [...current.particles];
      let fill = current.fill;

      const MAX_SPAWN = 100;
      if (
        elapsed - lastSpawnRef.current > 4 &&
        totalSpawnedRef.current < MAX_SPAWN
      ) {
        particles.push({
          x: currentConfig.source.x + (Math.random() - 0.5) * 8,
          y: currentConfig.source.y + 14,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 1.0,
          id: `${time}-${Math.random()}`,
        });

        lastSpawnRef.current = elapsed;
        totalSpawnedRef.current += 1;
      }

      const line = current.line;

      particles = particles.filter((particle) => {
        particle.vy = Math.min(particle.vy + 0.12 * delta, 5);
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        // Collide with drawn line segments.
        for (let i = 0; i < line.length - 1; i++) {
          const start = line[i];
          const end = line[i + 1];

          if (distanceToSegment(particle, start, end) < 7) {
            const slope = end.x - start.x;
            particle.vx += Math.sign(slope || 1) * 0.3;
            particle.vy = Math.max(0.3, particle.vy * 0.25);
            particle.y = Math.min(start.y, end.y) - 3;
            break;
          }
        }

        // Collide with level platforms (obstacles).
        for (const obstacle of currentConfig.obstacles) {
          if (
            particle.x >= obstacle.x - 2 &&
            particle.x <= obstacle.x + obstacle.w + 2 &&
            particle.y >= obstacle.y - 5 &&
            particle.y <= obstacle.y + 6 &&
            particle.vy > 0
          ) {
            particle.y = obstacle.y - 5;
            particle.vy = 0.3;
            particle.vx += 0.2;
          }
        }

        // Count water that enters the glass.
        const glass = currentConfig.glass;

        if (
          particle.x >= glass.x + 5 &&
          particle.x <= glass.x + glass.w - 5 &&
          particle.y >= glass.y + 4 &&
          particle.y <= glass.y + glass.h
        ) {
          fill += 0.65;
          return false;
        }

        // Remove particles outside the board.
        return (
          particle.x > -15 &&
          particle.x < WIDTH + 15 &&
          particle.y < HEIGHT + 15
        );
      });

      fill = Math.min(fill, 100);

      if (fill >= currentConfig.target) {
        finishLevel(fill);
        return;
      }

      if (
        totalSpawnedRef.current >= MAX_SPAWN &&
        particles.length === 0 &&
        fill < currentConfig.target
      ) {
        const lostState = {
          ...current,
          particles: [],
          status: "lost",
          message: "You lost! Play again.",
        };
        gameRef.current = lostState;
        setGame(lostState);
        return;
      }

      const next = {
        ...current,
        particles,
        fill,
      };

      gameRef.current = next;
      setGame(next);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [game.released, game.status, finishLevel]);

  const nextLevel = () => {
    if (level >= LEVELS.length) {
      setGame({
        ...createInitialGame(),
        status: "complete",
        message: "You completed all 10 levels!",
      });
      return;
    }

    setLevel((previous) => previous + 1);
    resetLevel();
  };

  const restartGame = () => {
    setLevel(1);
    setTotalStars(0);
    resetLevel();
  };

  const clearLine = () => {
    if (game.released || game.status !== "playing") return;

    updateGame({
      line: [],
      message: "Draw a new guiding line.",
    });
  };

  const linePoints = game.line
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const glassFillHeight = (game.fill / 100) * (config.glass.h - 10);

  return (
    <main className="aquafill-game">
      <div className="aquafill-shell">
        <header className="aquafill-header">
          <div className="aquafill-header-main">
            <button className="aquafill-back" onClick={leaveGame}>
              ← BACK
            </button>

            <div>
              <span className="aquafill-eyebrow">
                ARCADE PUZZLE ADVENTURE
              </span>
              <h1>
                AQUA<span>FILL!</span>
              </h1>
              <p>Think. Draw. Fill!</p>
            </div>
          </div>

          <div className="aquafill-level-badge">
            <span>LEVEL</span>
            <strong>{level}/10</strong>
          </div>
        </header>

        <section className="aquafill-stats">
          <div>
            <span>LEVEL</span>
            <strong>{level} / 10</strong>
          </div>
          <div>
            <span>GLASS FILL</span>
            <strong>{Math.min(100, Math.round((game.fill / config.target) * 100))}%</strong>
          </div>
          <div>
            <span>STARS EARNED</span>
            <strong>⭐ {totalStars}</strong>
          </div>
        </section>

        <section className="aquafill-game-panel">
          <div className="aquafill-board-heading">
            <div>
              <strong>WATER PUZZLE</strong>
              <small>{config.hint}</small>
            </div>
            <span className="aquafill-stage">STAGE {level}</span>
          </div>

          <div
            className="aquafill-board"
            ref={boardRef}
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onLostPointerCapture={stopDrawing}
          >
            <svg
              className="aquafill-svg"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="aqua-water" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67eaff" />
                  <stop offset="100%" stopColor="#087bea" />
                </linearGradient>

                <linearGradient id="aqua-glass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a7f4ff" stopOpacity=".35" />
                  <stop offset="100%" stopColor="#4bbcff" stopOpacity=".08" />
                </linearGradient>

                <clipPath id="aqua-glass-clip">
                  <rect
                    x={config.glass.x + 7}
                    y={config.glass.y + 7}
                    width={config.glass.w - 14}
                    height={config.glass.h - 12}
                    rx="8"
                  />
                </clipPath>
              </defs>

              {/* Decorative background */}
              {Array.from({ length: 35 }, (_, index) => (
                <circle
                  key={index}
                  cx={(index * 137) % WIDTH}
                  cy={(index * 83) % HEIGHT}
                  r={(index % 3) + 1}
                  fill="#a4eaff"
                  opacity=".22"
                />
              ))}

              {/* Obstacles / Platforms */}
              {config.obstacles.map((obstacle, index) => (
                <g key={index}>
                  <rect
                    x={obstacle.x}
                    y={obstacle.y}
                    width={obstacle.w}
                    height={obstacle.h}
                    rx="7"
                    fill="#087d91"
                    stroke="#55d9e9"
                    strokeWidth="3"
                  />
                  <path
                    d={`M ${obstacle.x + 10} ${obstacle.y + 5} l ${obstacle.w - 25} 0`}
                    stroke="#a4f8ff"
                    strokeOpacity=".3"
                    strokeWidth="2"
                  />
                </g>
              ))}

              {/* Drawn line */}
              {game.line.length > 1 && (
                <>
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity=".2"
                    strokeWidth="17"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#e9fcff"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#43bdfc"
                    strokeWidth="2"
                    strokeDasharray="5 10"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Source pipe */}
              <g>
                <path
                  d={`M ${config.source.x - 25} ${config.source.y - 30}
                      h 42 v 22 h -42 z`}
                  fill="#1453aa"
                  stroke="#63dfff"
                  strokeWidth="4"
                  rx="5"
                />
                <circle
                  cx={config.source.x}
                  cy={config.source.y}
                  r="14"
                  fill="#2ebdff"
                  stroke="#a6f3ff"
                  strokeWidth="3"
                />
              </g>

              {/* Water particles */}
              {game.particles.map((particle) => (
                <g key={particle.id}>
                  <circle
                    cx={particle.x}
                    cy={particle.y}
                    r="5"
                    fill="url(#aqua-water)"
                  />
                  <circle
                    cx={particle.x - 1.5}
                    cy={particle.y - 2}
                    r="1.5"
                    fill="#d9ffff"
                  />
                </g>
              ))}

              {/* Glass */}
              <g>
                <rect
                  x={config.glass.x}
                  y={config.glass.y}
                  width={config.glass.w}
                  height={config.glass.h}
                  rx="13"
                  fill="url(#aqua-glass)"
                  stroke="#d7f5ff"
                  strokeWidth="8"
                />

                <rect
                  x={config.glass.x + 7}
                  y={config.glass.y + config.glass.h - 7 - glassFillHeight}
                  width={config.glass.w - 14}
                  height={glassFillHeight}
                  fill="url(#aqua-water)"
                  clipPath="url(#aqua-glass-clip)"
                />

                <path
                  d={`M ${config.glass.x + 20} ${config.glass.y + 18}
                      v ${config.glass.h - 38}`}
                  stroke="#ffffff"
                  strokeOpacity=".5"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                <path
                  d={`M ${config.glass.x + 8} ${config.glass.y + 5}
                      h ${config.glass.w - 16}`}
                  stroke="#ffffff"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            </svg>

            {!game.released && game.line.length === 0 && (
              <div className="aquafill-draw-prompt">
                <span>✎</span>
                Draw a line here
              </div>
            )}

            {game.status === "won" && (
              <div className="aquafill-overlay">
                <div className="aquafill-result-card">
                  <div className="aquafill-result-icon">🥳</div>
                  <h2>Level Complete!</h2>
                  <p>You made the glass happy!</p>
                  <div className="aquafill-earned-stars">
                    {"⭐".repeat(game.stars)}
                  </div>
                  <button className="aquafill-primary" onClick={nextLevel}>
                    {level === 10 ? "Finish Game" : "Next Level →"}
                  </button>
                </div>
              </div>
            )}

            {game.status === "lost" && (
              <div className="aquafill-overlay">
                <div className="aquafill-result-card">
                  <div className="aquafill-result-icon">❌</div>
                  <h2>You Lost!</h2>
                  <p>Play again and draw a better path.</p>
                  <button className="aquafill-primary" onClick={resetLevel}>
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {game.status === "complete" && (
              <div className="aquafill-overlay">
                <div className="aquafill-result-card">
                  <div className="aquafill-result-icon">🏆</div>
                  <h2>All 10 Levels Complete!</h2>
                  <p>You earned {totalStars} stars. Fantastic work!</p>
                  <button className="aquafill-primary" onClick={restartGame}>
                    Play Again
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="aquafill-message">
            <span className="aquafill-live-dot" />
            {game.message}
          </div>

          <div className="aquafill-progress">
            <div className="aquafill-progress-label">
              <span>GLASS FILL PROGRESS</span>
              <strong>
                {Math.min(100, Math.round((game.fill / config.target) * 100))}%
              </strong>
            </div>
            <div className="aquafill-progress-track">
              <div
                className="aquafill-progress-value"
                style={{
                  width: `${Math.min(100, (game.fill / config.target) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="aquafill-actions">
            <button
              className="aquafill-secondary"
              onClick={clearLine}
              disabled={game.released || game.line.length === 0}
            >
              ↻ Clear Line
            </button>

            <button
              className="aquafill-primary aquafill-release"
              onClick={releaseWater}
              disabled={game.released || game.status !== "playing"}
            >
              💧 Release Water
            </button>

            <button className="aquafill-secondary" onClick={resetLevel}>
              Restart
            </button>
          </div>
        </section>

        <section className="aquafill-instructions">
          <div className="aquafill-instruction-icon">✏️</div>
          <div>
            <strong>How to play</strong>
            <p>
              Draw a line with your mouse or finger to guide the water.
              Press Release Water and try to fill the glass to the target.
              Complete all 10 levels and earn stars!
            </p>
          </div>
        </section>

        <footer className="aquafill-footer">
          <span>THINK SMART. DRAW BETTER. FILL THE GLASS!</span>
          <span>⭐ {totalStars} STARS</span>
        </footer>
      </div>
    </main>
  );
}