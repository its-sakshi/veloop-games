import React, { useCallback, useEffect, useRef, useState } from "react";
import "./MergeMaster.css";

const SIZE = 5;

const TILE_STYLES = {
  2: "mm-tile-2",
  4: "mm-tile-4",
  8: "mm-tile-8",
  16: "mm-tile-16",
  32: "mm-tile-32",
  64: "mm-tile-64",
  128: "mm-tile-128",
  256: "mm-tile-256",
  512: "mm-tile-512",
  1024: "mm-tile-1024",
  2048: "mm-tile-2048",
};

const createEmptyBoard = () =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

const randomTile = () => (Math.random() < 0.9 ? 2 : 4);

const spawnTile = (board, value = randomTile()) => {
  const empty = [];

  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push({ r, c });
    })
  );

  if (!empty.length) return board;

  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = value;

  return next;
};

const newGame = () => {
  let board = createEmptyBoard();
  board = spawnTile(board);
  board = spawnTile(board);

  return {
    board,
    score: 0,
    next: randomTile(),
    status: "playing",
    won: false,
  };
};

const slideLine = (line) => {
  const values = line.filter(Boolean);
  const merged = [];
  let gained = 0;

  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const value = values[i] * 2;
      merged.push(value);
      gained += value;
      i++;
    } else {
      merged.push(values[i]);
    }
  }

  while (merged.length < SIZE) merged.push(0);

  return { line: merged, gained };
};

const moveBoard = (board, direction) => {
  const next = createEmptyBoard();
  let gained = 0;

  for (let i = 0; i < SIZE; i++) {
    let line;

    if (direction === "left") {
      line = [...board[i]];
    } else if (direction === "right") {
      line = [...board[i]].reverse();
    } else if (direction === "up") {
      line = board.map((row) => row[i]);
    } else {
      line = board.map((row) => row[i]).reverse();
    }

    const result = slideLine(line);
    gained += result.gained;

    let output = result.line;

    if (direction === "right" || direction === "down") {
      output = [...output].reverse();
    }

    for (let j = 0; j < SIZE; j++) {
      if (direction === "left" || direction === "right") {
        next[i][j] = output[j];
      } else {
        next[j][i] = output[j];
      }
    }
  }

  const changed = board.some((row, r) =>
    row.some((value, c) => value !== next[r][c])
  );

  return { board: next, gained, changed };
};

const hasMoves = (board) => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;

      if (
        c < SIZE - 1 &&
        board[r][c] === board[r][c + 1]
      ) {
        return true;
      }

      if (
        r < SIZE - 1 &&
        board[r][c] === board[r + 1][c]
      ) {
        return true;
      }
    }
  }

  return false;
};

const getBestScore = () => {
  try {
    return Number(localStorage.getItem("merge-master-best")) || 0;
  } catch {
    return 0;
  }
};

export default function MergeMaster({ onExit, onBack, onGameComplete }) {
  const [game, setGame] = useState(newGame);
  const [best, setBest] = useState(getBestScore);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const touchStart = useRef(null);
  const boardRef = useRef(null);

  const leaveGame = useCallback(() => {
    if (onExit) onExit();
    else if (onBack) onBack();
  }, [onExit, onBack]);

  const updateBest = useCallback((score) => {
    setBest((previous) => {
      const updated = Math.max(previous, score);

      try {
        localStorage.setItem("merge-master-best", String(updated));
      } catch {
        // Best score remains available for the current session.
      }

      return updated;
    });
  }, []);

  const move = useCallback(
    (direction) => {
      setGame((previous) => {
        if (previous.status === "over") return previous;
        if (previous.status === "won" && !keepPlaying) return previous;

        const result = moveBoard(previous.board, direction);

        if (!result.changed) return previous;

        let board = spawnTile(result.board, previous.next);
        const score = previous.score + result.gained;

        const reached2048 =
          board.some((row) => row.some((value) => value >= 2048)) &&
          !previous.won;

        const status = !hasMoves(board)
          ? "over"
          : reached2048
          ? "won"
          : "playing";

        updateBest(score);
        setMoveCount((count) => count + 1);

        if (status === "over") {
          onGameComplete?.({ score, xp: Math.max(10, Math.floor(score / 35)), reason: "over" });
        }

        return {
          ...previous,
          board,
          score,
          next: randomTile(),
          status,
          won: previous.won || reached2048,
        };
      });
    },
    [keepPlaying, updateBest, onGameComplete]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      const directions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
        A: "left",
        D: "right",
        W: "up",
        S: "down",
      };

      const direction = directions[event.key];

      if (direction) {
        event.preventDefault();
        move(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move]);

  const restart = () => {
    setGame(newGame());
    setKeepPlaying(false);
    setMoveCount(0);
  };

  const continuePlaying = () => {
    setKeepPlaying(true);
    setGame((previous) => ({
      ...previous,
      status: "playing",
    }));
  };

  const handlePointerDown = (event) => {
    touchStart.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handlePointerUp = (event) => {
    if (!touchStart.current) return;

    const dx = event.clientX - touchStart.current.x;
    const dy = event.clientY - touchStart.current.y;

    touchStart.current = null;

    const threshold = 25;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  };

  const getTileClass = (value) => {
    if (!value) return "mm-tile mm-tile-empty";

    const style =
      TILE_STYLES[value] ||
      (value >= 2048 ? "mm-tile-2048" : "mm-tile-1024");

    return `mm-tile ${style}`;
  };

  return (
    <main className="merge-master">
      <div className="mm-shell">
        <header className="mm-header">
          <button className="mm-back" onClick={leaveGame} aria-label="Back to games">
            ← <span>BACK</span>
          </button>

          <div className="mm-brand">
            <span className="mm-eyebrow">VELOOP ARCADE</span>
            <h1>Merge Master<span>!</span></h1>
          </div>

          <div className="mm-level-badge">
            <span>BEST TILE</span>
            <strong>
              {Math.max(2, ...game.board.flat()).toLocaleString()}
            </strong>
          </div>
        </header>

        <section className="mm-stats">
          <div className="mm-stat">
            <span>YOUR SCORE</span>
            <strong>{game.score.toLocaleString()}</strong>
          </div>

          <div className="mm-stat">
            <span>BEST SCORE</span>
            <strong>{best.toLocaleString()}</strong>
          </div>

          <div className="mm-stat mm-next-stat">
            <span>NEXT BLOCK</span>
            <div className="mm-next-tile">
              <span className={getTileClass(game.next)}>
                {game.next}
              </span>
            </div>
          </div>
        </section>

        <section className="mm-game-panel">
          <div className="mm-board-heading">
            <div>
              <span className="mm-board-label">MERGE ARENA</span>
              <span className="mm-board-subtitle">
                Combine matching numbers
              </span>
            </div>

            <span className="mm-move-counter">
              MOVES <strong>{moveCount}</strong>
            </span>
          </div>

          <div
            ref={boardRef}
            className="mm-board"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              touchStart.current = null;
            }}
            onContextMenu={(event) => event.preventDefault()}
            role="application"
            aria-label="Merge Master game board. Swipe or use arrow keys to merge blocks."
          >
            {game.board.map((row, r) =>
              row.map((value, c) => (
                <div
                  key={`${r}-${c}`}
                  className={getTileClass(value)}
                  aria-label={value ? `Tile ${value}` : "Empty cell"}
                >
                  {value > 0 && (
                    <span className="mm-tile-value">
                      {value.toLocaleString()}
                    </span>
                  )}
                </div>
              ))
            )}

            {game.status === "over" && (
              <div className="mm-overlay">
                <div className="mm-result-card">
                  <span className="mm-result-icon">🏆</span>
                  <h2>No More Moves!</h2>
                  <p>Your final score: {game.score.toLocaleString()}</p>
                  <button onClick={restart} className="mm-primary-btn">
                    Play Again ↻
                  </button>
                </div>
              </div>
            )}

            {game.status === "won" && (
              <div className="mm-overlay">
                <div className="mm-result-card">
                  <span className="mm-result-icon">👑</span>
                  <h2>You Reached 2048!</h2>
                  <p>Fantastic! You've mastered the merge.</p>
                  <button
                    onClick={continuePlaying}
                    className="mm-primary-btn"
                  >
                    Keep Playing →
                  </button>
                  <button onClick={restart} className="mm-text-btn">
                    Start New Game
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mm-controls">
            <span className="mm-controls-label">MOVE BLOCKS</span>

            <div className="mm-direction-pad">
              <button
                aria-label="Move up"
                onClick={() => move("up")}
                className="mm-direction up"
              >
                ↑
              </button>

              <div className="mm-direction-row">
                <button
                  aria-label="Move left"
                  onClick={() => move("left")}
                  className="mm-direction"
                >
                  ←
                </button>

                <button
                  aria-label="Move down"
                  onClick={() => move("down")}
                  className="mm-direction"
                >
                  ↓
                </button>

                <button
                  aria-label="Move right"
                  onClick={() => move("right")}
                  className="mm-direction"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mm-instructions">
          <div className="mm-instruction-icon">🎮</div>
          <div>
            <strong>How to play</strong>
            <p>
              Use your arrow keys or swipe to move all blocks.
              Matching numbers merge into a bigger block.
              Reach 2048 and keep going for a higher score!
            </p>
          </div>
        </section>

        <footer className="mm-footer">
          <button className="mm-restart-btn" onClick={restart}>
            ↻ Restart Game
          </button>

          <span className="mm-footer-message">
            Think ahead. Merge smart!
          </span>
        </footer>
      </div>
    </main>
  );
}