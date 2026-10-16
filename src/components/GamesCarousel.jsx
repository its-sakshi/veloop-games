
import { useCallback, useEffect, useRef, useState } from 'react'
import games from '../data/gamesData'
import GameCard from './GameCard'
import styles from './GamesCarousel.module.css'

function GamesCarousel({ onPlay }) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index) => {
    const track = trackRef.current
    const card = track?.children[index]

    if (!track || !card) return

    track.scrollTo({
      left: card.offsetLeft - track.offsetLeft,
      behavior: 'smooth',
    })

    setActiveIndex(index)
  }, [])

  const updateActiveIndex = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const cards = Array.from(track.children)
    if (!cards.length) return

    let nearestIndex = 0
    let nearestDistance = Infinity

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - track.scrollLeft)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    setActiveIndex(nearestIndex)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frameId

    const handleScroll = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(updateActiveIndex)
    }

    track.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      track.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frameId)
    }
  }, [updateActiveIndex])

  useEffect(() => {
    if (paused) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % games.length
        goTo(next)
        return next
      })
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [paused, goTo])

  return (
    <section
      className={styles.section}
      aria-labelledby="games-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false)
        }
      }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>PICK YOUR CHALLENGE</p>
          <h2 id="games-title">Games for you</h2>
        </div>
        <span className={styles.count}>13 GAMES</span>
      </div>

      <div
        className={styles.track}
        ref={trackRef}
        aria-label="Available games"
      >
        {games.map((game) => (
          <GameCard key={game.id} game={game} onPlay={onPlay} />
        ))}
      </div>

      <div className={styles.dots} aria-label="Choose a game">
        {games.map((game, index) => (
          <button
            key={game.id}
            type="button"
            className={`${styles.dot} ${
              index === activeIndex ? styles.activeDot : ''
            }`}
            aria-label={`Go to ${game.name}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </section>
  )
}

export default GamesCarousel
