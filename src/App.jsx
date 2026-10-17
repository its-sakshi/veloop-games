
import { useState } from 'react'
import GamesCarousel from './components/GamesCarousel'
import GamePage from './pages/GamePage'
import './App.css'

const GAME_ENTRY_COST = 20

function App() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [tokenBalance, setTokenBalance] = useState(100)
  const [entryMessage, setEntryMessage] = useState('')

  const handlePlay = (game) => {
    if (tokenBalance < GAME_ENTRY_COST) {
      setEntryMessage(
        `Not enough Tokens! You need ${GAME_ENTRY_COST} Tokens to play, but you have ${tokenBalance}.`
      )
      return
    }

    setTokenBalance((balance) => balance - GAME_ENTRY_COST)
    setEntryMessage('')
    setSelectedGame(game)
  }

  const handleBack = () => {
    setSelectedGame(null)
    setEntryMessage('')
  }

  if (selectedGame) {
    return (
      <GamePage
        game={selectedGame}
        onBack={handleBack}
        tokenBalance={tokenBalance}
      />
    )
  }

  return (
    <div className="veloop-page">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(event) => event.preventDefault()}
        >
          <span className="brand-mark">V</span>
          <span>
            VELOOP <span className="brand-light">rewards</span>
          </span>
        </a>

        <div className="token-balance" aria-live="polite">
          <span className="token-icon" aria-hidden="true">✦</span>
          <span>
            {tokenBalance}
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

        {entryMessage && (
          <div
            role="alert"
            style={{
              margin: '0 0 24px',
              padding: '14px 18px',
              border: '1px solid #f0a0a0',
              borderRadius: '12px',
              background: '#35202b',
              color: '#ffd5d5',
            }}
          >
            {entryMessage}
            <button
              type="button"
              onClick={() => setEntryMessage('')}
              style={{
                marginLeft: '12px',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

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
