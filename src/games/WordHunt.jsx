import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./WordHunt.css";

// ==========================================
// 10 GAME LEVELS
// ==========================================

const LEVELS = [
  {
    name: "Warm Up",
    size: 6,
    words: ["GAME", "PLAY", "WORD"],
    time: 90,
  },
  {
    name: "Brain Spark",
    size: 7,
    words: ["BRAIN", "SMART", "HAPPY", "QUEST"],
    time: 100,
  },
  {
    name: "Word Explorer",
    size: 8,
    words: ["NINJA", "LASER", "QUEST", "POWER", "MAGIC"],
    time: 110,
  },
  {
    name: "Letter Storm",
    size: 8,
    words: ["PUZZLE", "PLANET", "ROCKET", "GALAXY", "ORBIT"],
    time: 115,
  },
  {
    name: "Mind Master",
    size: 9,
    words: ["VICTORY", "CHALLENGE", "REWARD", "MISSION", "ENERGY"],
    time: 125,
  },
  {
    name: "Word Wizard",
    size: 9,
    words: ["TREASURE", "DIAMOND", "JOURNEY", "FANTASY", "MYSTERY"],
    time: 130,
  },
  {
    name: "Puzzle Pro",
    size: 10,
    words: ["ADVENTURE", "DISCOVER", "STRATEGY", "RAINBOW", "LEGEND"],
    time: 140,
  },
  {
    name: "Elite Hunter",
    size: 10,
    words: ["CHAMPION", "UNIVERSE", "FIREWORK", "POWERFUL", "TREASURE"],
    time: 145,
  },
  {
    name: "Word Legend",
    size: 11,
    words: ["IMAGINATION", "CELEBRATION", "WONDERFUL", "KNOWLEDGE"],
    time: 160,
  },
  {
    name: "Ultimate Hunt",
    size: 13,
    words: ["CONSTELLATION", "EXPLORATION", "MASTERPIECE", "CHAMPIONS"],
    time: 180,
  },
];

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const rand = (n) => Math.floor(Math.random() * n);

const cellKey = (r, c) => `${r}-${c}`;

// ==========================================
// PUZZLE GENERATOR
// ==========================================

function createPuzzle(level) {
  const { size, words } = level;

  // Retry the entire puzzle if a word cannot be placed.
  for (let puzzleAttempt = 0; puzzleAttempt < 30; puzzleAttempt++) {
    const grid = Array.from(
      { length: size },
      () => Array(size).fill("")
    );

    const placements = {};
    let allPlaced = true;

    const sortedWords = [...words].sort(
      (a, b) => b.length - a.length
    );

    for (const word of sortedWords) {
      let placed = false;

      for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
        const [dr, dc] = DIRECTIONS[rand(DIRECTIONS.length)];

        const row = rand(size);
        const col = rand(size);

        const endRow = row + dr * (word.length - 1);
        const endCol = col + dc * (word.length - 1);

        if (
          endRow < 0 ||
          endRow >= size ||
          endCol < 0 ||
          endCol >= size
        ) {
          continue;
        }

        let fits = true;

        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;

          const existing = grid[r][c];

          if (existing && existing !== word[i]) {
            fits = false;
            break;
          }
        }

        if (!fits) continue;

        const cells = [];

        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;

          grid[r][c] = word[i];
          cells.push(cellKey(r, c));
        }

        placements[word] = cells;
        placed = true;
      }

      if (!placed) {
        allPlaced = false;
        break;
      }
    }

    if (!allPlaced) continue;

    // Fill empty cells with random letters.
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c]) {
          grid[r][c] = ALPHABET[rand(26)];
        }
      }
    }

    return { grid, placements };
  }

  // A safe fallback: retry generation rather than showing
  // a puzzle containing words that cannot be found.
  throw new Error(`Unable to generate puzzle for ${level.name}`);
}

// ==========================================
// WORD SELECTION
// ==========================================

function getLine(start, end) {
  const dr = end.r - start.r;
  const dc = end.c - start.c;

  if (dr === 0 && dc === 0) {
    return [start];
  }

  const isStraight =
    dr === 0 ||
    dc === 0 ||
    Math.abs(dr) === Math.abs(dc);

  if (!isStraight) {
    return [];
  }

  const steps = Math.max(Math.abs(dr), Math.abs(dc));

  const sr = Math.sign(dr);
  const sc = Math.sign(dc);

  return Array.from({ length: steps + 1 }, (_, i) => ({
    r: start.r + sr * i,
    c: start.c + sc * i,
  }));
}

// ==========================================
// MAIN WORD HUNT COMPONENT
// ==========================================

export default function WordHunt({
  onExit,
  onBack,
  onGameComplete,
}) {
  const [levelIndex, setLevelIndex] = useState(0);

  const [puzzle, setPuzzle] = useState(() =>
    createPuzzle(LEVELS[0])
  );

  const [found, setFound] = useState([]);
  const [selection, setSelection] = useState([]);

  const [dragging, setDragging] = useState(false);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].time);

  const [status, setStatus] = useState("intro");

  const [hintWord, setHintWord] = useState("");
  const [message, setMessage] = useState(
    "Find all the hidden words!"
  );

  const [hints, setHints] = useState(3);
  const [showPause, setShowPause] = useState(false);

  const completedRef = useRef(false);
  const finalReportedRef = useRef(false);

  const level = LEVELS[levelIndex];
  const words = level.words;

  const foundSet = useMemo(
    () => new Set(found),
    [found]
  );

  // ========================================
  // EXIT GAME
  // ========================================

  const exitGame = useCallback(() => {
    if (onExit) {
      onExit();
    } else if (onBack) {
      onBack();
    }
  }, [onExit, onBack]);

  // ========================================
  // LOAD LEVEL
  // ========================================

  const loadLevel = useCallback((index) => {
    const nextLevel = LEVELS[index];

    if (!nextLevel) return;

    setLevelIndex(index);

    setPuzzle(createPuzzle(nextLevel));

    setFound([]);
    setSelection([]);
    setDragging(false);

    setTimeLeft(nextLevel.time);

    setHintWord("");
    setMessage("Find all the hidden words!");

    setShowPause(false);

    completedRef.current = false;

    setStatus("playing");
  }, []);

  // ========================================
  // START GAME
  // ========================================

  const startGame = () => {
    setScore(0);
    setHints(3);

    finalReportedRef.current = false;

    loadLevel(0);
  };

  // ========================================
  // TIMER
  // ========================================

  useEffect(() => {
    if (status !== "playing" || showPause) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) =>
        current <= 1 ? 0 : current - 1
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status, showPause, levelIndex]);

  // Handle timeout separately from the timer updater.
  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      setDragging(false);
      setSelection([]);
      setStatus("failed");
      setMessage("Time is up! Try again.");
    }
  }, [timeLeft, status]);

  // ========================================
  // COMPLETE LEVEL
  // ========================================

  const completeLevel = useCallback(
    (finalFound) => {
      if (completedRef.current) return;

      completedRef.current = true;

      const bonus = Math.max(0, timeLeft) * 2;

      const levelScore =
        finalFound.length * 100 + bonus;

      setScore((current) => current + levelScore);

      setStatus("levelComplete");

      setMessage("Amazing! You found every word.");
    },
    [timeLeft]
  );

  // ========================================
  // START WORD SELECTION
  // ========================================

  const startSelection = (r, c) => {
    if (status !== "playing" || showPause) return;

    setDragging(true);

    setSelection([{ r, c }]);
  };

  // ========================================
  // UPDATE WORD SELECTION
  // ========================================

  const updateSelection = (r, c) => {
    if (!dragging || status !== "playing") return;

    const start = selection[0];

    if (!start) return;

    const line = getLine(start, { r, c });

    if (line.length > 0 && line.length <= level.size) {
      setSelection(line);
    }
  };

  // ========================================
  // FINISH WORD SELECTION
  // ========================================

  const finishSelection = useCallback(() => {
    if (!dragging || status !== "playing") return;

    setDragging(false);

    if (!selection.length) {
      setSelection([]);
      return;
    }

    const selectedWord = selection
      .map(({ r, c }) => puzzle.grid[r]?.[c] || "")
      .join("");

    const reverseWord = selectedWord
      .split("")
      .reverse()
      .join("");

    const matched = words.find(
      (word) =>
        !foundSet.has(word) &&
        (
          word === selectedWord ||
          word === reverseWord
        )
    );

    if (matched) {
      const nextFound = [...found, matched];

      setFound(nextFound);

      setScore(
        (current) => current + matched.length * 10
      );

      setMessage(
        `+${matched.length * 10} points! ${matched} found!`
      );

      setHintWord("");

      if (nextFound.length === words.length) {
        completeLevel(nextFound);
      }
    } else {
      setMessage("Not quite! Try another word.");
    }

    setSelection([]);
  }, [
    dragging,
    status,
    selection,
    puzzle,
    words,
    foundSet,
    found,
    completeLevel,
  ]);

  // ========================================
  // GLOBAL POINTER EVENTS
  // ========================================

  useEffect(() => {
    const stopSelection = () => {
      if (dragging) {
        finishSelection();
      }
    };

    window.addEventListener(
      "pointerup",
      stopSelection
    );

    window.addEventListener(
      "pointercancel",
      stopSelection
    );

    return () => {
      window.removeEventListener(
        "pointerup",
        stopSelection
      );

      window.removeEventListener(
        "pointercancel",
        stopSelection
      );
    };
  }, [dragging, finishSelection]);

  // ========================================
  // HINT SYSTEM
  // ========================================

  const useHint = () => {
    if (
      hints <= 0 ||
      status !== "playing" ||
      showPause
    ) {
      return;
    }

    const remaining = words.filter(
      (word) => !foundSet.has(word)
    );

    if (!remaining.length) return;

    const word = remaining[rand(remaining.length)];

    const cells = puzzle.placements[word];

    setHints((current) => current - 1);

    setHintWord(word);

    setMessage(`Hint: look for ${word[0]}...`);

    if (cells?.length) {
      const [r, c] = cells[0]
        .split("-")
        .map(Number);

      setSelection([{ r, c }]);

      window.setTimeout(() => {
        setSelection((current) =>
          current.length === 1 &&
          current[0].r === r &&
          current[0].c === c
            ? []
            : current
        );
      }, 1200);
    }
  };

  // ========================================
  // LEVEL PROGRESSION
  // ========================================

  const nextLevel = () => {
    if (levelIndex < LEVELS.length - 1) {
      loadLevel(levelIndex + 1);
      return;
    }

    // Report the final score only once, after the
    // player confirms the final results screen.
    if (!finalReportedRef.current) {
      finalReportedRef.current = true;

      onGameComplete?.({
        score,
        xp: Math.max(20, Math.floor(score / 25)),
        reason: "all_levels_completed",
      });
    }

    setStatus("victory");
  };

  // ========================================
  // RETRY LEVEL
  // ========================================

  const retryLevel = () => {
    loadLevel(levelIndex);
  };

  // ========================================
  // GRID HELPERS
  // ========================================

  const isSelected = (r, c) =>
    selection.some(
      (cell) => cell.r === r && cell.c === c
    );

  const isFoundCell = (r, c) =>
    words.some(
      (word) =>
        foundSet.has(word) &&
        puzzle.placements[word]?.includes(
          cellKey(r, c)
        )
    );

  // ========================================
  // TIME FORMAT
  // ========================================

  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60)
      .toString()
      .padStart(2, "0")}`;

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="wh-shell">
      <div className="wh-orb wh-orb-a" />
      <div className="wh-orb wh-orb-b" />

      {/* HEADER */}

      <header className="wh-header">
        <button
          className="wh-back"
          onClick={exitGame}
        >
          ← BACK
        </button>

        <div className="wh-brand">
          <span>✦</span> WORD <b>HUNT</b>
        </div>

        <div className="wh-header-right">
          VELOOP ARCADE
        </div>
      </header>

      <main className="wh-main">

        {/* ================================= */}
        {/* INTRO SCREEN */}
        {/* ================================= */}

        {status === "intro" && (
          <section className="wh-intro">
            <div className="wh-eyebrow">
              THE ULTIMATE WORD CHALLENGE
            </div>

            <h1>
              WORD <em>HUNT</em>
            </h1>

            <p className="wh-subtitle">
              Search the grid. Discover hidden words.
              Climb all 10 levels.
            </p>

            <div className="wh-preview">
              <div className="wh-preview-grid">
                { "GAMEPLAYREWARDSCHALLENGEPOINTSVICTORY"
                  .split("")
                  .slice(0, 36)
                  .map((letter, i) => (
                    <span
                      key={i}
                      className={
                        i >= 4 && i <= 9
                          ? "wh-preview-lit"
                          : ""
                      }
                    >
                      {letter}
                    </span>
                  ))}
              </div>

              <div className="wh-preview-side">
                <span>✦</span>
                <b>10 LEVELS</b>
                <small>
                  From beginner to word legend
                </small>

                <span>⌕</span>
                <b>8 DIRECTIONS</b>
                <small>
                  Search every way possible
                </small>

                <span>★</span>
                <b>BIG REWARDS</b>
                <small>
                  Earn score and XP
                </small>
              </div>
            </div>

            <div className="wh-intro-stats">
              <div>
                <strong>10</strong>
                <small>LEVELS</small>
              </div>

              <div>
                <strong>8</strong>
                <small>DIRECTIONS</small>
              </div>

              <div>
                <strong>3</strong>
                <small>STARTER HINTS</small>
              </div>
            </div>

            <button
              className="wh-primary"
              onClick={startGame}
            >
              START WORD HUNT <span>➜</span>
            </button>

            <p className="wh-how">
              DRAG ACROSS LETTERS TO SELECT A WORD
            </p>
          </section>
        )}

        {/* ================================= */}
        {/* GAME SCREEN */}
        {/* ================================= */}

        {(
          status === "playing" ||
          status === "levelComplete" ||
          status === "failed" ||
          status === "victory"
        ) && (
          <section className="wh-game">

            {/* GAME HEADING */}

            <div className="wh-game-heading">
              <div>
                <div className="wh-eyebrow">
                  WORD HUNT CHALLENGE
                </div>

                <h2>{level.name}</h2>
              </div>

              <button
                className="wh-pause"
                disabled={
                  status !== "playing"
                }
                onClick={() =>
                  setShowPause((v) => !v)
                }
              >
                {showPause
                  ? "▶ RESUME"
                  : "Ⅱ PAUSE"}
              </button>
            </div>

            {/* LEVEL TRACK */}

            <div className="wh-level-track">
              {LEVELS.map((item, i) => (
                <div
                  key={item.name}
                  className={[
                    "wh-level-dot",
                    i < levelIndex ? "done" : "",
                    i === levelIndex ? "active" : "",
                  ].join(" ")}
                  title={item.name}
                >
                  {i < levelIndex
                    ? "✓"
                    : i + 1}
                </div>
              ))}
            </div>

            {/* HUD */}

            <div className="wh-hud">
              <div>
                <small>SCORE</small>
                <strong>
                  {score.toLocaleString()}
                </strong>
              </div>

              <div>
                <small>TIME LEFT</small>

                <strong
                  className={
                    timeLeft <= 15
                      ? "wh-danger"
                      : ""
                  }
                >
                  {formatTime(timeLeft)}
                </strong>
              </div>

              <div>
                <small>LEVEL</small>
                <strong>
                  {levelIndex + 1}
                  <i>/10</i>
                </strong>
              </div>

              <div>
                <small>FOUND</small>
                <strong>
                  {found.length}
                  <i>/{words.length}</i>
                </strong>
              </div>
            </div>

            {/* PROGRESS BAR */}

            <div className="wh-progress">
              <span
                style={{
                  width: `${
                    (found.length / words.length) * 100
                  }%`,
                }}
              />
            </div>

            {/* PLAY AREA */}

            <div className="wh-play-area">

              {/* LETTER GRID */}

              <div className="wh-board-panel">
                <div className="wh-board-top">
                  <span>
                    ⌕ HIDDEN WORD GRID
                  </span>

                  <span>
                    {level.size} × {level.size}
                  </span>
                </div>

                <div
                  className="wh-grid"
                  style={{
                    "--grid-size": level.size,
                  }}
                  onContextMenu={(e) =>
                    e.preventDefault()
                  }
                >
                  {puzzle.grid.map((row, r) =>
                    row.map((letter, c) => (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        className={[
                          "wh-cell",
                          isSelected(r, c)
                            ? "selected"
                            : "",
                          isFoundCell(r, c)
                            ? "found"
                            : "",
                        ].join(" ")}
                        disabled={
                          status !== "playing" ||
                          showPause
                        }
                        onPointerDown={(e) => {
                          e.preventDefault();
                          startSelection(r, c);
                        }}
                        onPointerEnter={() =>
                          updateSelection(r, c)
                        }
                        onClick={() => {
                          if (
                            !dragging &&
                            status === "playing" &&
                            !showPause
                          ) {
                            setSelection([{ r, c }]);
                          }
                        }}
                        aria-label={
                          `Row ${r + 1}, column ${c + 1}, ${letter}`
                        }
                      >
                        {letter}
                      </button>
                    ))
                  )}
                </div>

                <div className="wh-board-message">
                  {message}
                </div>
              </div>

              {/* WORD LIST */}

              <aside className="wh-word-panel">
                <div className="wh-word-heading">
                  <span>✦</span>

                  <div>
                    <b>FIND THESE WORDS</b>

                    <small>
                      {found.length} OF {words.length}
                      {" "}DISCOVERED
                    </small>
                  </div>
                </div>

                <div className="wh-word-list">
                  {words.map((word) => (
                    <div
                      key={word}
                      className={[
                        "wh-word",
                        foundSet.has(word)
                          ? "word-found"
                          : "",
                        hintWord === word
                          ? "word-hint"
                          : "",
                      ].join(" ")}
                    >
                      <span>
                        {foundSet.has(word)
                          ? "✓"
                          : "⌕"}
                      </span>

                      <b>{word}</b>

                      {foundSet.has(word) && (
                        <small>FOUND</small>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  className="wh-hint"
                  onClick={useHint}
                  disabled={
                    hints <= 0 ||
                    status !== "playing" ||
                    showPause
                  }
                >
                  💡 USE HINT
                  <span>{hints} LEFT</span>
                </button>

                <p className="wh-hint-note">
                  Hints reveal a word to search for.
                  Use them wisely!
                </p>
              </aside>
            </div>

            {/* GAME INSTRUCTIONS */}

            <div className="wh-controls-note">
              <span>
                ↗ SELECT IN ANY DIRECTION
              </span>

              <span>
                ✦ {words.length - found.length}
                {" "}WORDS REMAINING
              </span>
            </div>

            {/* ================================= */}
            {/* PAUSE OVERLAY */}
            {/* ================================= */}

            {showPause && status === "playing" && (
              <div className="wh-overlay">
                <div className="wh-modal">
                  <div className="wh-modal-icon">
                    Ⅱ
                  </div>

                  <h2>GAME PAUSED</h2>

                  <p>
                    Take a breath, hunter.
                    Your progress is safe.
                  </p>

                  <button
                    className="wh-primary"
                    onClick={() =>
                      setShowPause(false)
                    }
                  >
                    RESUME GAME
                  </button>

                  <button
                    className="wh-secondary"
                    onClick={exitGame}
                  >
                    EXIT GAME
                  </button>
                </div>
              </div>
            )}

            {/* ================================= */}
            {/* LEVEL COMPLETE */}
            {/* ================================= */}

            {status === "levelComplete" && (
              <div className="wh-overlay">
                <div className="wh-modal">
                  <div className="wh-modal-icon">
                    ★
                  </div>

                  <div className="wh-eyebrow">
                    LEVEL COMPLETE
                  </div>

                  <h2>WORD MASTER!</h2>

                  <p>
                    You discovered every hidden word.
                  </p>

                  <div className="wh-modal-score">
                    +{words.length * 100 + timeLeft * 2}
                    {" "}BONUS POINTS
                  </div>

                  <button
                    className="wh-primary"
                    onClick={nextLevel}
                  >
                    {levelIndex === LEVELS.length - 1
                      ? "SEE FINAL RESULTS"
                      : "UNLOCK NEXT LEVEL"}
                    {" "}
                    <span>➜</span>
                  </button>

                  <button
                    className="wh-secondary"
                    onClick={exitGame}
                  >
                    EXIT TO GAMES
                  </button>
                </div>
              </div>
            )}

            {/* ================================= */}
            {/* FAILED */}
            {/* ================================= */}

            {status === "failed" && (
              <div className="wh-overlay">
                <div className="wh-modal">
                  <div className="wh-modal-icon">
                    ⌛
                  </div>

                  <div className="wh-eyebrow">
                    TIME'S UP
                  </div>

                  <h2>KEEP HUNTING!</h2>

                  <p>
                    You found {found.length} of{" "}
                    {words.length} words.
                    Give it another try.
                  </p>

                  <button
                    className="wh-primary"
                    onClick={retryLevel}
                  >
                    RETRY LEVEL ↻
                  </button>

                  <button
                    className="wh-secondary"
                    onClick={exitGame}
                  >
                    EXIT TO GAMES
                  </button>
                </div>
              </div>
            )}

            {/* ================================= */}
            {/* FINAL VICTORY */}
            {/* ================================= */}

            {status === "victory" && (
              <div className="wh-overlay">
                <div className="wh-modal">
                  <div className="wh-modal-icon">
                    🏆
                  </div>

                  <div className="wh-eyebrow">
                    ALL 10 LEVELS COMPLETE
                  </div>

                  <h2>WORD LEGEND!</h2>

                  <p>
                    You conquered every puzzle.
                    Incredible work!
                  </p>

                  <div className="wh-modal-score">
                    FINAL SCORE: {score.toLocaleString()}
                  </div>

                  <div className="wh-modal-score">
                    XP EARNED:{" "}
                    {Math.max(20, Math.floor(score / 25))}
                  </div>

                  <button
                    className="wh-primary"
                    onClick={startGame}
                  >
                    PLAY AGAIN ↻
                  </button>

                  <button
                    className="wh-secondary"
                    onClick={exitGame}
                  >
                    RETURN TO GAMES
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* FOOTER */}

      <footer className="wh-footer">
        <span>VELOOP ARCADE</span>

        <span>
          SEARCH · FIND · <b>WIN</b>
        </span>

        <span>WORD HUNT</span>
      </footer>
    </div>
  );
}