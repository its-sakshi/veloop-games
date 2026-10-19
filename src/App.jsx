import { useEffect, useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUpRight,
  FiCheck,
  FiChevronRight,
  FiGrid,
  FiSearch,
  FiX,
  FiZap,
} from "react-icons/fi";
import {
  LuGamepad2,
  LuCoins,
  LuMousePointer2,
  LuSparkles,
} from "react-icons/lu";
import games from "./data/gamesData";
import GamePage from "./pages/GamePage";
import "./App.css";

const GAME_ENTRY_COST = 20;
const categories = ["All games", "Action", "Puzzle", "Arcade", "Strategy"];

function App() {
  const [selectedGame, setSelectedGame] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(100);
  const [entryMessage, setEntryMessage] = useState("");
  const [category, setCategory] = useState("All games");
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const carouselRef = useRef(null);
  const carouselPaused = useRef({ hover: false, focus: false, touch: false });

  useEffect(() => {
    const track = carouselRef.current;
    if (!track) return;
    track.scrollLeft = 0;
    carouselPaused.current = {
      hover: track.matches(":hover"),
      focus: track.contains(document.activeElement),
      touch: false,
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let previousTime;
    let remainder = 0;
    let direction = 1;
    const slide = (time) => {
      const elapsed =
        previousTime === undefined ? 0 : Math.min(time - previousTime, 50);
      previousTime = time;
      const paused = Object.values(carouselPaused.current).some(Boolean);
      const limit = track.scrollWidth - track.clientWidth;
      if (!paused && !reducedMotion.matches && limit > 0) {
        // Accumulate fractional pixels for consistent movement on every display.
        remainder += elapsed * 0.04;
        const distance = Math.floor(remainder);
        remainder -= distance;
        if (distance > 0) {
          const next = track.scrollLeft + distance * direction;
          track.scrollLeft = Math.max(0, Math.min(limit, next));
          // Travel back through the row at the end, without a sudden reset.
          if (next >= limit) direction = -1;
          if (next <= 0) direction = 1;
        }
      }
      frame = window.requestAnimationFrame(slide);
    };
    frame = window.requestAnimationFrame(slide);
    return () => window.cancelAnimationFrame(frame);
  }, [category, query, selectedGame]);
  const visibleGames = games.filter(
    (game) =>
      (category === "All games" || game.category === category) &&
      game.name.toLowerCase().includes(query.toLowerCase().trim()),
  );

  const handlePlay = (game) => {
    if (tokenBalance < GAME_ENTRY_COST) {
      setEntryMessage(
        `You need ${GAME_ENTRY_COST} tokens to enter. Your balance is ${tokenBalance} tokens.`,
      );
      return;
    }
    setTokenBalance((balance) => balance - GAME_ENTRY_COST);
    setEntryMessage("");
    setSelectedGame(game);
    window.scrollTo(0, 0);
  };
  const browseGames = () =>
    document.getElementById("games").scrollIntoView({ behavior: "smooth" });

  if (selectedGame)
    return (
      <GamePage
        game={selectedGame}
        tokenBalance={tokenBalance}
        onBack={() => {
          setSelectedGame(null);
          setEntryMessage("");
        }}
      />
    );

  return (
    <div className="veloop-page">
      <header className="topbar shell">
        <a className="brand" href="#home" aria-label="Veloop Rewards home">
          <span className="brand-mark">
            v<span>↗</span>
          </span>
          <span>
            veloop<span className="brand-light">rewards</span>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#games" className="nav-active">
            Discover games
          </a>
          <a href="#how-it-works">
            How it works <FiArrowUpRight />
          </a>
        </nav>
        <div
          className="token-balance"
          aria-label={`${tokenBalance} tokens available`}
          aria-live="polite"
        >
          <span className="coin-icon">
            <LuCoins />
          </span>
          <span>
            <strong>{tokenBalance}</strong> <small>tokens</small>
          </span>
        </div>
      </header>

      <main className="shell" id="home">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> YOUR EVERYDAY PLAYGROUND
            </p>
            <h1 id="hero-title">
              A little play.
              <br />A lot of{" "}
              <span>
                possibility
                <svg viewBox="0 0 400 20" aria-hidden="true">
                  <path d="M4 14 Q180 -6 395 9" />
                </svg>
                .
              </span>
            </h1>
            <p className="hero-description">
              Turn your downtime into game time. Find your next challenge, put
              your skills to the test, and play for rewards.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={browseGames}>
                Find your game <FiArrowUpRight />
              </button>
              <span className="hero-note">
                <FiCheck /> No downloads. Just play.
              </span>
            </div>
            <div className="hero-meta">
              <span>
                <strong>13</strong> games to explore
              </span>
              <span className="meta-line" />
              <span>
                <strong>20</strong> tokens per entry
              </span>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Discover Blade Master, Nutcraft and Bubble Blast"
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="spark spark-one">✳</span>
            <span className="spark spark-two">+</span>
            <span className="visual-caption">
              LESS SCROLLING. MORE PLAYING.
            </span>
            <img
              className="hero-poster poster-left"
              src={games[1].image}
              alt="Nutcraft game poster"
            />
            <img
              className="hero-poster poster-right"
              src={games[8].image}
              alt="Bubble Blast Legend game poster"
            />
            <img
              className="hero-poster poster-main"
              src={games[0].image}
              alt="Blade Master game poster"
            />
            <div className="floating-label">
              <span>
                <FiZap />
              </span>
              <div>
                Meet your next obsession
                <small>Pick a challenge. Make it yours.</small>
              </div>
            </div>
          </div>
        </section>

        <section
          className="play-guide"
          id="how-it-works"
          aria-label="How it works"
        >
          <div className="guide-intro">
            <LuSparkles />
            <strong>
              Good times.
              <br />
              Three simple steps.
            </strong>
          </div>
          <div className="guide-step">
            <span>01</span>
            <p>
              <strong>Find your favourite</strong>
              <small>Something for every kind of player.</small>
            </p>
          </div>
          <FiChevronRight className="guide-arrow" />
          <div className="guide-step">
            <span>02</span>
            <p>
              <strong>Use your tokens</strong>
              <small>Enter any game for 20 tokens.</small>
            </p>
          </div>
          <FiChevronRight className="guide-arrow" />
          <div className="guide-step">
            <span>03</span>
            <p>
              <strong>Play your way</strong>
              <small>Take on a new challenge.</small>
            </p>
          </div>
        </section>

        <section
          className="games-section"
          id="games"
          aria-labelledby="games-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE FUN STARTS HERE</p>
              <h2 id="games-title">
                Your next <span>“one more game.”</span>
              </h2>
            </div>
            <span className="collection-count">
              <FiGrid /> 13 games. Endless good times.
            </span>
          </div>
          <div className="library-toolbar">
            <div className="category-tabs" aria-label="Game categories">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "category active" : "category"}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item === "All games" && <LuGamepad2 />}
                  {item}
                  {item === "All games" && <span>13</span>}
                </button>
              ))}
            </div>
            <label className="search">
              <FiSearch />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a game…"
                aria-label="Search games"
              />
              {query && (
                <button
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    searchRef.current.focus();
                  }}
                >
                  <FiX />
                </button>
              )}
            </label>
          </div>
          {entryMessage && (
            <div className="entry-alert" role="alert">
              <span>{entryMessage}</span>
              <button
                onClick={() => setEntryMessage("")}
                aria-label="Dismiss message"
              >
                <FiX />
              </button>
            </div>
          )}
          <div className="results-line" aria-live="polite">
            <span>
              {visibleGames.length}{" "}
              {visibleGames.length === 1 ? "game" : "games"} to discover
            </span>
            <span>
              <span className="live-dot" /> A challenge for every mood
            </span>
          </div>
          <div
            className="game-grid"
            ref={carouselRef}
            role="region"
            aria-label="Game carousel. Scroll to explore games."
            tabIndex={0}
            onMouseEnter={() => {
              carouselPaused.current.hover = true;
            }}
            onMouseLeave={() => {
              carouselPaused.current.hover = false;
            }}
            onFocusCapture={() => {
              carouselPaused.current.focus = true;
            }}
            onBlurCapture={(event) => {
              carouselPaused.current.focus = event.currentTarget.contains(
                event.relatedTarget,
              );
            }}
            onTouchStart={() => {
              carouselPaused.current.touch = true;
            }}
            onTouchEnd={() => {
              carouselPaused.current.touch = false;
            }}
            onTouchCancel={() => {
              carouselPaused.current.touch = false;
            }}
          >
            {visibleGames.map((game, index) => (
              <article className="game-card" key={game.id}>
                <button
                  className="poster-button"
                  onClick={() => handlePlay(game)}
                  aria-label={`Open ${game.name} for 20 tokens`}
                >
                  <img
                    src={game.image}
                    alt={`${game.name} official game poster`}
                    loading={index < 4 ? "eager" : "lazy"}
                    width="1054"
                    height="1492"
                  />
                  <span className="poster-hover">
                    <span>
                      <LuMousePointer2 /> Let’s play
                    </span>
                  </span>
                </button>
                <div className="card-info">
                  <div className="card-category">
                    {game.category}
                    <span>{game.id === 1 ? "PLAYABLE" : "PREVIEW"}</span>
                  </div>
                  <h3>{game.name}</h3>
                  <div className="card-bottom">
                    <span>
                      <LuCoins /> <strong>20</strong>{" "}
                      <small>tokens / entry</small>
                    </span>
                    <button
                      onClick={() => handlePlay(game)}
                      aria-label={`${game.id === 1 ? "Play" : "Preview"} ${game.name} for 20 tokens`}
                    >
                      <span>{game.id === 1 ? "Play now" : "Preview"}</span>
                      <FiArrowUpRight />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {visibleGames.length === 0 && (
            <div className="empty-state">
              <FiSearch />
              <h3>No games found</h3>
              <p>Try a different name or explore all games.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setQuery("");
                  setCategory("All games");
                }}
              >
                Show all games <FiArrowRight />
              </button>
            </div>
          )}
          <p className="catalog-note">
            <FiZap /> Blade Master is ready to play. Explore previews of the
            other games.
          </p>
        </section>
        <section className="bottom-banner">
          <span className="banner-icon">
            <LuGamepad2 />
          </span>
          <div>
            <p>YOUR NEXT FAVOURITE IS ONE CLICK AWAY</p>
            <h2>
              Take a break. <span>Make it a good one.</span>
            </h2>
          </div>
          <button onClick={browseGames} aria-label="Back to game library">
            <FiArrowDown />
          </button>
        </section>
      </main>
      <footer className="page-footer shell">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark">
            v<span>↗</span>
          </span>
          <span>
            veloop<span className="brand-light">rewards</span>
          </span>
        </a>
        <span>A little challenge. A little escape. A whole lot of fun.</span>
        <a href="#home">
          Back to top <FiArrowUpRight />
        </a>
      </footer>
    </div>
  );
}

export default App;
