
import { useState } from 'react'
import BladeMaster from '../games/BladeMaster'

function GamePage({ game, onBack, tokenBalance }) {
  const [gameOverScore, setGameOverScore] = useState(null)

  if (!game) {
    return (
      <main style={{ padding: '40px', color: 'white' }}>
        <h1>Game not found</h1>
        <button onClick={onBack}>Back to Games</button>
      </main>
    )
  }

  // Connect the first carousel game to Tap Challenge.
  if (game.id === 1) {
  return <BladeMaster key={game.id} onBack={onBack} />
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7ff',
        color: '#161827',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <button type="button" onClick={onBack}>
          ← Back to Games
        </button>

        <strong>✦ {tokenBalance} Tokens remaining</strong>
      </header>

      <h1 style={{ marginTop: '48px' }}>{game.name}</h1>

      <img
        src={game.image}
        alt={game.name}
        style={{
          display: 'block',
          width: 'min(100%, 420px)',
          maxHeight: '420px',
          objectFit: 'contain',
          margin: '24px auto',
          borderRadius: '16px',
        }}
      />

      <p>This game is not playable yet.</p>
      <p>Try the first game to play Tap Challenge!</p>
    </main>
  )
}

export default GamePage
