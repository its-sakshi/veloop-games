
import styles from './GameCard.module.css'

function GameCard({ game, onPlay }) {
  return (
    <article className={styles.card}>
      <div className={styles.artwork}>
        <img
          className={styles.gameImage}
          src={game.image}
          alt={game.name}
          loading={game.id <= 3 ? 'eager' : 'lazy'}
          draggable="false"
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.reward}>
          <img src="/assets/multi_token.jpeg" alt="" />
          <span>
            <strong>20</strong>
            <small>Tokens</small>
          </span>
        </div>

        <button
          type="button"
          className={styles.playButton}
          onClick={() => onPlay(game)}
        >
          <span>Play Now</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </article>
  )
}

export default GameCard
