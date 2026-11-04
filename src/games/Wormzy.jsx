import React, { useCallback, useEffect, useState } from "react";
import "./Wormzy.css";

const SIZE = 8;

const LEVELS = [
  {
    apple: [1, 6],
    worm: [[6, 1], [6, 0], [7, 0]],
    walls: [[2, 2], [2, 3], [3, 3], [4, 3], [4, 5], [5, 5]],
    arrows: { "5,2": "right", "3,6": "up" },
  },
  {
    apple: [0, 6],
    worm: [[7, 1], [7, 0], [6, 0]],
    walls: [[1, 2], [2, 2], [3, 2], [4, 2], [4, 4], [5, 4], [6, 4], [2, 6]],
    arrows: { "6,2": "right", "3,5": "up", "1,5": "right" },
  },
  {
    apple: [1, 1],
    worm: [[6, 6], [7, 6], [7, 7]],
    walls: [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [5, 5], [4, 5], [3, 5], [2, 5]],
    arrows: { "6,4": "left", "1,4": "up", "1,2": "left" },
  },
  {
    apple: [0, 7],
    worm: [[7, 0], [7, 1], [6, 1]],
    walls: [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, 5], [5, 5], [6, 5]],
    arrows: { "6,2": "right", "2,4": "up", "2,6": "right" },
  },
  {
    apple: [0, 0],
    worm: [[7, 7], [6, 7], [6, 6]],
    walls: [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [5, 6], [4, 6]],
    arrows: { "6,5": "left", "3,3": "up", "0,3": "left" },
  },
];

const DIRECTIONS = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

const ARROW_SYMBOLS = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const createLevelState = (levelIndex) => {
  const config = LEVELS[levelIndex % LEVELS.length];

  return {
    worm: config.worm.map((position) => [...position]),
    apple: [...config.apple],
    walls: config.walls.map((position) => [...position]),
    arrows: config.arrows,
    moves: 0,
    status: "playing",
    message: "Guide Wormzy to the apple!",
  };
};

const getBestScore = () => {
  try {
    return Number(localStorage.getItem("wormzy-best")) || 0;
  } catch {
    return 0;
  }
};

export default function Wormzy({ onExit, onBack }) {
  const [level, setLevel] = useState(1);
  const [game, setGame] = useState(() => createLevelState(0));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(getBestScore);
  const [touchStart, setTouchStart] = useState(null);

  const leaveGame = useCallback(() => {
    if (onExit) onExit();
    else if (onBack) onBack();
  }, [onExit, onBack]);

  const saveBest = useCallback((value) => {
    setBest((previous) => {
      const updated = Math.max(previous, value);

      try {
        localStorage.setItem("wormzy-best", String(updated));
      } catch {
        // Storage unavailable fallback
      }

      return updated;
    });
  }, []);

  const moveWorm = useCallback((direction) => {
    const vector = DIRECTIONS[direction];
    if (!vector) return;

    setGame((previous) => {
      if (previous.status !== "playing") return previous;

      const head = previous.worm[0];
      const nextHead = [
        head[0] + vector.row,
        head[1] + vector.col,
      ];

      const [row, col] = nextHead;

      if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
        return {
          ...previous,
          message: "Watch the edge of the maze!",
        };
      }

      const isEating =
        row === previous.apple[0] &&
        col === previous.apple[1];

      const bodyToCheck = isEating
        ? previous.worm
        : previous.worm.slice(0, -1);

      const hitsBody = bodyToCheck.some(
        ([r, c]) => r === row && c === col
      );

      const hitsWall = previous.walls.some(
        ([r, c]) => r === row && c === col
      );

      if (hitsWall || hitsBody) {
        return {
          ...previous,
          message: hitsWall
            ? "Oops! That's a blocked path."
            : "Careful! Don't run into yourself.",
        };
      }

      const nextWorm = [
        nextHead,
        ...previous.worm.map((segment) => [...segment]),
      ];

      if (!isEating) {
        nextWorm.pop();
      }

      const moves = previous.moves + 1;

      if (isEating) {
        return {
          ...previous,
          worm: nextWorm,
          moves,
          status: "won",
          message: "Apple collected! Level complete!",
        };
      }

      const arrowDirection = previous.arrows[`${row},${col}`];

      return {
        ...previous,
        worm: nextWorm,
        moves,
        message: arrowDirection
          ? `Arrow tile! Follow the ${arrowDirection} path.`
          : "Keep going! Find the apple.",
      };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const keys = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      };

      const direction = keys[event.key];

      if (direction) {
        event.preventDefault();
        moveWorm(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveWorm]);

  const restartLevel = () => {
    setGame(createLevelState(level - 1));
  };

  const nextLevel = () => {
    const points = 100 + Math.max(0, 30 - game.moves) * 5;
    const newScore = score + points;

    setScore(newScore);
    saveBest(newScore);

    setLevel((previous) => previous + 1);
    setGame(createLevelState(level));
  };

  const restartGame = () => {
    setLevel(1);
    setScore(0);
    setGame(createLevelState(0));
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  const handleTouchEnd = (event) => {
    if (!touchStart) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;

    setTouchStart(null);

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      moveWorm(dx > 0 ? "right" : "left");
    } else {
      moveWorm(dy > 0 ? "down" : "up");
    }
  };

  const getWormSegment = (row, col) =>
    game.worm.findIndex(([r, c]) => r === row && c === col);

  const renderCell = (row, col) => {
    const segmentIndex = getWormSegment(row, col);
    const wall = game.walls.some(([r, c]) => r === row && c === col);
    const apple = game.apple[0] === row && game.apple[1] === col;
    const arrow = game.arrows[`${row},${col}`];

    let className = "wormzy-cell";

    if (wall) className += " wormzy-wall";
    if (segmentIndex === 0) className += " wormzy-head";
    if (segmentIndex > 0) className += " wormzy-body";
    if (apple) className += " wormzy-apple";
    if (arrow && !wall) className += " wormzy-arrow-cell";

    return (
      <div
        key={`${row}-${col}`}
        className={className}
        aria-label={
          wall
            ? "Obstacle"
            : apple
            ? "Apple"
            : segmentIndex >= 0
            ? "Wormzy"
            : arrow
            ? `Direction ${arrow}`
            : "Empty path"
        }
      >
        {arrow && !wall && (
          <span className={`wormzy-arrow wormzy-arrow-${arrow}`}>
            {ARROW_SYMBOLS[arrow]}
          </span>
        )}

        {apple && <span className="wormzy-apple-icon">🍎</span>}

        {segmentIndex === 0 && (
          <span className="wormzy-face">
            <span className="wormzy-eyes">
              <i />
              <i />
            </span>
            <span className="wormzy-smile" />
          </span>
        )}

        {segmentIndex > 0 && (
          <span className="wormzy-body-dot">
            {segmentIndex === 1 ? "•" : ""}
          </span>
        )}
      </div>
    );
  };

  return (
    <main className="wormzy-game">
      <div className="wormzy-shell">
        <header className="wormzy-header">
          <div className="wormzy-header-left">
            <button
              className="wormzy-back-btn"
              onClick={leaveGame}
              type="button"
            >
              ← BACK
            </button>

            <div className="wormzy-title-group">
              <span className="wormzy-eyebrow">ARCADE PUZZLE ADVENTURE</span>
              <h1>
                WORMZY<span>!</span>
              </h1>
              <p>Eat apples. Solve puzzles. Win!</p>
            </div>
          </div>

          <div className="wormzy-level-badge">
            <span>LEVEL</span>
            <strong>{level}</strong>
          </div>
        </header>

        <section className="wormzy-stats">
          <div className="wormzy-stat">
            <span>SCORE</span>
            <strong>{score.toLocaleString()}</strong>
          </div>

          <div className="wormzy-stat">
            <span>BEST</span>
            <strong>{best.toLocaleString()}</strong>
          </div>

          <div className="wormzy-stat">
            <span>MOVES</span>
            <strong>{game.moves}</strong>
          </div>
        </section>

        <section className="wormzy-board-panel">
          <div className="wormzy-board-heading">
            <div>
              <span className="wormzy-board-label">WORMZY'S MAZE</span>
              <small>Find the apple and reach the goal</small>
            </div>

            <span className="wormzy-level-tag">STAGE {level}</span>
          </div>

          <div
            className="wormzy-board"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => setTouchStart(null)}
            onContextMenu={(event) => event.preventDefault()}
            role="application"
            aria-label="Wormzy maze. Use arrow keys or swipe to guide the worm to the apple."
          >
            {Array.from({ length: SIZE }, (_, row) =>
              Array.from({ length: SIZE }, (_, col) => renderCell(row, col))
            )}

            {game.status === "won" && (
              <div className="wormzy-overlay">
                <div className="wormzy-result-card">
                  <span className="wormzy-result-icon">🍎</span>
                  <h2>Apple Collected!</h2>
                  <p>You guided Wormzy to the goal.</p>
                  <button className="wormzy-primary-btn" onClick={nextLevel}>
                    Next Level →
                  </button>
                  <button className="wormzy-secondary-text" onClick={restartGame}>
                    Restart Adventure
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="wormzy-message" aria-live="polite">
            <span className="wormzy-message-dot" />
            {game.message}
          </div>

          <div className="wormzy-controls">
            <span className="wormzy-controls-label">GUIDE WORMZY</span>
            <div className="wormzy-dpad">
              <button
                className="wormzy-direction up"
                aria-label="Move up"
                onClick={() => moveWorm("up")}
              >
                ↑
              </button>

              <div className="wormzy-dpad-row">
                <button
                  className="wormzy-direction"
                  aria-label="Move left"
                  onClick={() => moveWorm("left")}
                >
                  ←
                </button>
                <button
                  className="wormzy-direction"
                  aria-label="Move down"
                  onClick={() => moveWorm("down")}
                >
                  ↓
                </button>
                <button
                  className="wormzy-direction"
                  aria-label="Move right"
                  onClick={() => moveWorm("right")}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="wormzy-howto">
          <div className="wormzy-howto-icon">🐛</div>
          <div>
            <strong>How to play</strong>
            <p>
              Guide Wormzy with the arrow keys, buttons, or a swipe. Avoid
              obstacles and your own body. Reach the apple to complete the
              level!
            </p>
          </div>
        </section>

        <footer className="wormzy-footer">
          <button className="wormzy-restart-btn" onClick={restartLevel}>
            ↻ Restart Level
          </button>
          <span>Think smart. Find the path!</span>
        </footer>
      </div>
    </main>
  );
}