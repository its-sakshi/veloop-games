
function GamePage({ game, onBack }) {
  if (!game) {
    return (
      <main style={{ padding: '40px', color: 'white' }}>
        <h1>Game not found</h1>
        <button onClick={onBack}>Back to Home</button>
      </main>
    )
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
      <button onClick={onBack}>← Back to Games</button>

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

      <p>Welcome! Your game page is ready.</p>
      <p>Gameplay will be added in a later step.</p>
    </main>
  )
}

export default GamePage
