
import './App.css'

const games = [
  { id: 1, name: 'Game One', category: 'Featured game', color: '#8d7aff', icon: '🎮' },
  { id: 2, name: 'Game Two', category: 'Quick challenge', color: '#43c6ac', icon: '🧩' },
  { id: 3, name: 'Game Three', category: 'Daily fun', color: '#ffb45e', icon: '🎯' },
  { id: 4, name: 'Game Four', category: 'Brain training', color: '#ff7d9c', icon: '🕹️' },
  { id: 5, name: 'Game Five', category: 'Popular game', color: '#65a9ff', icon: '🚀' },
]

function App() {
  return (
    <main className="veloop-page">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="VELOOP home">
          <span className="brand-mark">V</span>
          <span>VELOOP<span className="brand-light"> rewards</span></span>
        </a>

        <div className="token-balance" aria-label="Token balance">
          <span className="token-icon">✦</span>
          <span>20 <small>TOKENS</small></span>
        </div>
      </header>

      <section className="welcome" id="home">
        <p className="eyebrow">YOUR NEXT REWARD STARTS HERE</p>
        <h1>Play games.<br /><span>Earn rewards.</span></h1>
        <p className="welcome-copy">
          Take a break, play something fun, and collect rewards along the way.
        </p>
        <div className="welcome-tag">
          <span className="status-dot" />
          Your next adventure is waiting
        </div>
      </section>

      <section className="games-section" aria-labelledby="games-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PICK YOUR CHALLENGE</p>
            <h2 id="games-heading">Games for you</h2>
          </div>
          <span className="game-count">13 GAMES</span>
        </div>

        <div className="games-track">
          {games.map((game) => (
            <article className="game-card" key={game.id}>
              <div
                className="game-art"
                style={{ '--game-accent': game.color }}
              >
                <span className="art-orb art-orb-one" />
                <span className="art-orb art-orb-two" />
                <span className="game-emoji" aria-hidden="true">{game.icon}</span>
                <span className="game-category">{game.category}</span>
              </div>

              <div className="game-footer">
                <div className="game-reward">
                  <span className="reward-gem">✦</span>
                  <span>20 <small>Tokens</small></span>
                </div>
                <button className="play-button" type="button">
                  Play Now <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="carousel-dots" aria-label="Carousel page indicators">
          <span className="carousel-dot active" />
          <span className="carousel-dot" />
          <span className="carousel-dot" />
        </div>
      </section>

      <footer className="page-footer">
        <span>VELOOP rewards</span>
        <span>Every game is a new opportunity.</span>
      </footer>
    </main>
  )
}

export default App
