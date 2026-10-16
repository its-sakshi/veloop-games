
import { useState } from 'react'
import GamesCarousel from './components/GamesCarousel'
import GamePage from './pages/GamePage'
import './App.css'

function App() {
  const [selectedGame, setSelectedGame] = useState(null)

  const handlePlay = (game) => {
    setSelectedGame(game)
  }

  const handleBack = () => {
    setSelectedGame(null)
  }

  if (selectedGame) {
    return <GamePage game={selectedGame} onBack={handleBack} />
  }

  return (
    <div className="veloop-page">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark">V</span>
          <span>
            VELOOP <span className="brand-light">rewards</span>
          </span>
        </a>

        <div className="token-balance">
          <span className="token-icon" aria-hidden="true">✦</span>
          <span>
            20
            <small>TOKENS</small>
          </span>
        </div>
      </header>

      <main>
        <section className="welcome">
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
      </main>

      <footer className="page-footer">
        <span>VELOOP rewards</span>
        <span>Every game is a new opportunity.</span>
      </footer>
    </div>
  )
}

export default App
