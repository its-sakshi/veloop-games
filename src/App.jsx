
import GamesCarousel from './components/GamesCarousel'
import './App.css'

function App() {
  const handlePlay = (game) => {
    console.log('Selected game:', game.name)
  }

  return (
    <main className="veloop-page">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="VELOOP home">
          <span className="brand-mark">V</span>
          <span>
            VELOOP<span className="brand-light"> rewards</span>
          </span>
        </a>

        <div className="token-balance">
          <span className="token-icon">✦</span>
          <span>
            20 <small>TOKENS</small>
          </span>
        </div>
      </header>

      <section className="welcome" id="home">
        <p className="eyebrow">YOUR NEXT REWARD STARTS HERE</p>

        <h1>
          Play games.
          <br />
          <span>Earn rewards.</span>
        </h1>

        <p className="welcome-copy">
          Take a break, play something fun, and collect rewards along the way.
        </p>

        <div className="welcome-tag">
          <span className="status-dot" />
          Your next adventure is waiting
        </div>
      </section>

      <GamesCarousel onPlay={handlePlay} />

      <footer className="page-footer">
        <span>VELOOP rewards</span>
        <span>Every game is a new opportunity.</span>
      </footer>
    </main>
  )
}

export default App
