
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./ToiletTactics.css";

const GAME_TIME = 90;
const MAX_HEALTH = 100;
const MAX_AMMO = 12;

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ENEMY_TYPES = [
  { type: "basic", hp: 1, speed: 55, reward: 100, size: 24, color: "#58dfff" },
  { type: "fast", hp: 1, speed: 100, reward: 180, size: 20, color: "#ff6b9b" },
  { type: "armored", hp: 3, speed: 36, reward: 250, size: 33, color: "#ffb94d" },
];

function createEnemy(width, height, wave) {
  const roll = Math.random();

  const kind =
    roll < Math.min(0.15 + wave * 0.02, 0.35)
      ? ENEMY_TYPES[2]
      : roll < 0.48
        ? ENEMY_TYPES[1]
        : ENEMY_TYPES[0];

  const side = Math.floor(Math.random() * 3);

  return {
    x:
      side === 0
        ? random(30, width - 30)
        : side === 1
          ? -35
          : width + 35,
    y: side === 0 ? -35 : random(35, height * 0.65),
    hp: kind.hp + (kind.type === "armored" && wave >= 6 ? 1 : 0),
    maxHp: kind.hp + (kind.type === "armored" && wave >= 6 ? 1 : 0),
    speed: kind.speed + wave * 2.5,
    reward: kind.reward,
    size: kind.size,
    color: kind.color,
    type: kind.type,
    wobble: random(0, 6),
  };
}

export default function ToiletTactics({
  onExit,
  onBack,
  onGameComplete,
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  const pointerRef = useRef({
    x: 0,
    y: 0,
    firing: false,
  });

  const [screen, setScreen] = useState("intro");

  const [hud, setHud] = useState({
    score: 0,
    health: MAX_HEALTH,
    time: GAME_TIME,
    wave: 1,
    ammo: MAX_AMMO,
    coins: 0,
  });

  const exitGame = useCallback(() => {
    if (onExit) onExit();
    else if (onBack) onBack();
  }, [onExit, onBack]);

  // Initialize game state. The real canvas dimensions are applied
  // by resize() after the playing screen has mounted.
  const startGame = useCallback(() => {
    gameRef.current = {
      player: {
        x: 0,
        y: 0,
        angle: -Math.PI / 2,
        invulnerable: 0,
      },
      enemies: [],
      bullets: [],
      particles: [],
      drops: [],
      score: 0,
      health: MAX_HEALTH,
      time: GAME_TIME,
      wave: 1,
      ammo: MAX_AMMO,
      coins: 0,
      elapsed: 0,
      spawnTimer: 0.5,
      fireCooldown: 0,
      reloadTimer: 0,
      hudTimer: 0,
      running: true,
      finished: false,
    };

    pointerRef.current = {
      x: 0,
      y: 0,
      firing: false,
    };

    setHud({
      score: 0,
      health: MAX_HEALTH,
      time: GAME_TIME,
      wave: 1,
      ammo: MAX_AMMO,
      coins: 0,
    });

    setScreen("playing");
  }, []);

  const finishGame = useCallback(
    (reason) => {
      const game = gameRef.current;

      if (!game || game.finished) return;

      game.finished = true;
      game.running = false;

      setHud({
        score: game.score,
        health: game.health,
        time: Math.ceil(game.time),
        wave: game.wave,
        ammo: game.ammo,
        coins: game.coins,
      });

      setScreen("over");

      onGameComplete?.({
        score: game.score,
        xp: Math.max(
          10,
          Math.floor(game.score / 30) + game.wave * 3
        ),
        coins: game.coins,
        reason,
      });
    },
    [onGameComplete]
  );

  useEffect(() => {
    if (screen !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let animationId;
    let lastTime = performance.now();
    let width = 0;
    let height = 0;
    let dpr = 1;

    // FIX: Keep the player at the actual centre of the canvas.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      width = Math.max(280, rect.width);
      height = Math.max(340, rect.height);

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const game = gameRef.current;

      if (game) {
        // Always centre the attacking character horizontally.
        game.player.x = width / 2;

        // Keep the attacking character near the bottom.
        game.player.y = height - 65;
      }
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const burst = (game, x, y, color, amount = 12) => {
      for (let i = 0; i < amount; i++) {
        const angle = random(0, Math.PI * 2);
        const speed = random(45, 190);

        game.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: random(0.25, 0.7),
          size: random(2, 5),
          color,
        });
      }
    };

    const fire = (game) => {
      if (
        game.ammo <= 0 ||
        game.fireCooldown > 0 ||
        game.reloadTimer > 0
      ) {
        return;
      }

      const player = game.player;
      const target = pointerRef.current;

      player.angle = Math.atan2(
        target.y - player.y,
        target.x - player.x
      );

      [-0.045, 0, 0.045].forEach((spread) => {
        const angle = player.angle + spread;

        game.bullets.push({
          x: player.x + Math.cos(angle) * 24,
          y: player.y + Math.sin(angle) * 24,
          vx: Math.cos(angle) * 640,
          vy: Math.sin(angle) * 640,
          life: 1.1,
        });
      });

      game.ammo--;
      game.fireCooldown = 0.19;

      if (game.ammo === 0) {
        game.reloadTimer = 1.2;
      }
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(
        0,
        0,
        width,
        height
      );

      gradient.addColorStop(0, "#0b1d35");
      gradient.addColorStop(1, "#050b18");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // City skyline
      for (let i = 0; i < 13; i++) {
        const buildingWidth = width / 12;
        const x = i * buildingWidth;
        const buildingHeight = 55 + ((i * 37) % 105);

        ctx.fillStyle = i % 2 ? "#102b46" : "#15263e";

        ctx.fillRect(
          x,
          height - buildingHeight,
          buildingWidth - 5,
          buildingHeight
        );

        ctx.fillStyle = "#37c9ed";

        for (
          let y = height - buildingHeight + 12;
          y < height - 10;
          y += 17
        ) {
          for (
            let wx = x + 8;
            wx < x + buildingWidth - 8;
            wx += 15
          ) {
            ctx.globalAlpha = 0.4;
            ctx.fillRect(wx, y, 4, 6);
          }
        }
      }

      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(65, 205, 240, 0.12)";

      for (let y = height - 35; y < height; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const drawToilet = (enemy) => {
      ctx.save();

      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(enemy.wobble) * 0.05);

      ctx.shadowBlur = 14;
      ctx.shadowColor = enemy.color;

      // Toilet tank
      ctx.fillStyle = "#e3edf3";
      ctx.strokeStyle = "#8196a8";
      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.roundRect(
        -enemy.size * 0.43,
        -enemy.size * 0.9,
        enemy.size * 0.86,
        enemy.size * 0.5,
        5
      );

      ctx.fill();
      ctx.stroke();

      // Toilet bowl
      ctx.beginPath();

      ctx.ellipse(
        0,
        enemy.size * 0.12,
        enemy.size * 0.62,
        enemy.size * 0.48,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();
      ctx.stroke();

      // Bowl opening
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#17263a";

      ctx.beginPath();

      ctx.ellipse(
        0,
        enemy.size * 0.08,
        enemy.size * 0.37,
        enemy.size * 0.23,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();

      // Eyes
      ctx.fillStyle = enemy.color;

      ctx.beginPath();
      ctx.arc(
        -enemy.size * 0.19,
        -enemy.size * 0.34,
        3.2,
        0,
        Math.PI * 2
      );

      ctx.arc(
        enemy.size * 0.19,
        -enemy.size * 0.34,
        3.2,
        0,
        Math.PI * 2
      );

      ctx.fill();

      // Armor health bar
      if (enemy.maxHp > 1) {
        ctx.fillStyle = "#26344c";

        ctx.fillRect(
          -enemy.size / 2,
          -enemy.size - 9,
          enemy.size,
          4
        );

        ctx.fillStyle = "#ffb84d";

        ctx.fillRect(
          -enemy.size / 2,
          -enemy.size - 9,
          enemy.size * (enemy.hp / enemy.maxHp),
          4
        );
      }

      ctx.restore();
    };

    const drawPlayer = (player) => {
      ctx.save();

      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      ctx.shadowBlur = 18;
      ctx.shadowColor = "#39d9ff";

      ctx.fillStyle = "#172d4c";
      ctx.strokeStyle = "#75eaff";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Helmet
      ctx.fillStyle = "#b8d4e9";

      ctx.beginPath();
      ctx.arc(0, -3, 12, Math.PI, 0);
      ctx.fill();

      // Visor
      ctx.fillStyle = "#35dfff";
      ctx.fillRect(-9, -4, 18, 6);

      // Blaster
      ctx.fillStyle = "#ffca65";
      ctx.fillRect(8, -5, 25, 10);

      ctx.fillStyle = "#e8fcff";
      ctx.fillRect(26, -3, 8, 6);

      ctx.restore();
    };

    const update = (dt, now) => {
      const game = gameRef.current;

      if (!game || !game.running) return;

      const player = game.player;

      game.elapsed += dt;
      game.time = Math.max(0, game.time - dt);
      game.wave = 1 + Math.floor(game.elapsed / 16);

      game.fireCooldown = Math.max(
        0,
        game.fireCooldown - dt
      );

      player.invulnerable = Math.max(
        0,
        player.invulnerable - dt
      );

      player.angle = Math.atan2(
        pointerRef.current.y - player.y,
        pointerRef.current.x - player.x
      );

      if (pointerRef.current.firing) {
        fire(game);
      }

      // Reloading
      if (game.reloadTimer > 0) {
        game.reloadTimer -= dt;

        if (game.reloadTimer <= 0) {
          game.ammo = MAX_AMMO;
        }
      }

      // Spawn invaders
      game.spawnTimer -= dt;

      if (game.spawnTimer <= 0) {
        const count = Math.min(
          1 + Math.floor(game.wave / 3),
          3
        );

        for (let i = 0; i < count; i++) {
          game.enemies.push(
            createEnemy(width, height, game.wave)
          );
        }

        game.spawnTimer = Math.max(
          0.4,
          1.2 - game.wave * 0.06
        );
      }

      // Move enemies towards the player
      for (
        let i = game.enemies.length - 1;
        i >= 0;
        i--
      ) {
        const enemy = game.enemies[i];

        enemy.wobble += dt * 3;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const distance = Math.max(
          1,
          Math.hypot(dx, dy)
        );

        enemy.x += (dx / distance) * enemy.speed * dt;
        enemy.y += (dy / distance) * enemy.speed * dt;

        if (
          distance < enemy.size + 18 &&
          player.invulnerable <= 0
        ) {
          game.health = Math.max(
            0,
            game.health -
              (enemy.type === "armored" ? 18 : 12)
          );

          player.invulnerable = 0.75;

          burst(game, enemy.x, enemy.y, "#ff8b63", 10);

          game.enemies.splice(i, 1);
        }
      }

      // Move bullets
      for (const bullet of game.bullets) {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
      }

      // Bullet collision
      for (
        let i = game.bullets.length - 1;
        i >= 0;
        i--
      ) {
        const bullet = game.bullets[i];
        let collided = false;

        for (
          let j = game.enemies.length - 1;
          j >= 0;
          j--
        ) {
          const enemy = game.enemies[j];

          const distance = Math.hypot(
            bullet.x - enemy.x,
            bullet.y - enemy.y
          );

          if (distance < enemy.size * 0.65 + 5) {
            enemy.hp--;
            collided = true;

            burst(
              game,
              bullet.x,
              bullet.y,
              "#7deeff",
              4
            );

            if (enemy.hp <= 0) {
              game.score += enemy.reward;

              if (Math.random() < 0.17) {
                game.drops.push({
                  x: enemy.x,
                  y: enemy.y,
                  type:
                    Math.random() < 0.5
                      ? "health"
                      : "coin",
                  life: 8,
                });
              }

              burst(
                game,
                enemy.x,
                enemy.y,
                enemy.color,
                18
              );

              game.enemies.splice(j, 1);
            }

            break;
          }
        }

        if (
          collided ||
          bullet.life <= 0 ||
          bullet.x < -30 ||
          bullet.x > width + 30 ||
          bullet.y < -30 ||
          bullet.y > height + 30
        ) {
          game.bullets.splice(i, 1);
        }
      }

      // Collect power-ups
      for (
        let i = game.drops.length - 1;
        i >= 0;
        i--
      ) {
        const drop = game.drops[i];

        drop.y += 28 * dt;
        drop.life -= dt;

        if (
          Math.hypot(
            drop.x - player.x,
            drop.y - player.y
          ) < 29
        ) {
          if (drop.type === "health") {
            game.health = Math.min(
              MAX_HEALTH,
              game.health + 22
            );
          } else {
            game.coins += 5;
            game.score += 50;
          }

          burst(
            game,
            drop.x,
            drop.y,
            drop.type === "health"
              ? "#5cff9a"
              : "#ffd45c",
            12
          );

          game.drops.splice(i, 1);
        } else if (drop.life <= 0) {
          game.drops.splice(i, 1);
        }
      }

      // Particles
      for (const particle of game.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;

        particle.vx *= 0.98;
        particle.vy *= 0.98;

        particle.life -= dt;
      }

      game.particles = game.particles.filter(
        (particle) => particle.life > 0
      );

      if (game.health <= 0) {
        finishGame("city_overrun");
        return;
      }

      if (game.time <= 0) {
        finishGame("city_defended");
        return;
      }

      if (now - game.hudTimer > 100) {
        game.hudTimer = now;

        setHud({
          score: game.score,
          health: game.health,
          time: Math.ceil(game.time),
          wave: game.wave,
          ammo: game.ammo,
          coins: game.coins,
        });
      }
    };

    const render = () => {
      const game = gameRef.current;
      if (!game) return;

      ctx.clearRect(0, 0, width, height);

      drawBackground();

      // Power-ups
      game.drops.forEach((drop) => {
        ctx.save();

        ctx.shadowBlur = 15;

        ctx.shadowColor =
          drop.type === "health"
            ? "#5cff9a"
            : "#ffd45c";

        ctx.fillStyle =
          drop.type === "health"
            ? "#5cff9a"
            : "#ffd45c";

        ctx.beginPath();
        ctx.arc(drop.x, drop.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#102033";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
          drop.type === "health" ? "+" : "$",
          drop.x,
          drop.y
        );

        ctx.restore();
      });

      // Projectiles
      game.bullets.forEach((bullet) => {
        ctx.save();

        ctx.shadowBlur = 13;
        ctx.shadowColor = "#5beaff";
        ctx.fillStyle = "#e7fcff";

        ctx.beginPath();
        ctx.arc(
          bullet.x,
          bullet.y,
          4,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.restore();
      });

      game.enemies.forEach(drawToilet);

      // Particles
      game.particles.forEach((particle) => {
        ctx.globalAlpha = Math.max(
          0,
          particle.life / 0.7
        );

        ctx.fillStyle = particle.color;

        ctx.beginPath();

        ctx.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          Math.PI * 2
        );

        ctx.fill();
      });

      ctx.globalAlpha = 1;

      if (
        game.player.invulnerable <= 0 ||
        Math.floor(game.player.invulnerable * 14) % 2 === 0
      ) {
        drawPlayer(game.player);
      }
    };

    const frame = (now) => {
      const dt = Math.min(
        (now - lastTime) / 1000,
        0.035
      );

      lastTime = now;

      update(dt, now);

      if (gameRef.current?.running) {
        render();
        animationId = requestAnimationFrame(frame);
      }
    };

    const getPointerPosition = (event) => {
      const rect = canvas.getBoundingClientRect();

      pointerRef.current.x = event.clientX - rect.left;
      pointerRef.current.y = event.clientY - rect.top;
    };

    const pointerDown = (event) => {
      getPointerPosition(event);

      pointerRef.current.firing = true;

      canvas.setPointerCapture?.(event.pointerId);
    };

    const pointerMove = (event) => {
      getPointerPosition(event);
    };

    const pointerUp = () => {
      pointerRef.current.firing = false;
    };

    const keyDown = (event) => {
      if (
        event.code === "Space" ||
        event.code === "Enter"
      ) {
        event.preventDefault();
        pointerRef.current.firing = true;
      }

      if (event.key.toLowerCase() === "r") {
        const game = gameRef.current;

        if (
          game &&
          game.ammo < MAX_AMMO &&
          game.reloadTimer <= 0
        ) {
          game.reloadTimer = 1.2;
        }
      }
    };

    const keyUp = (event) => {
      if (
        event.code === "Space" ||
        event.code === "Enter"
      ) {
        pointerRef.current.firing = false;
      }
    };

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);

    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    animationId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationId);

      observer.disconnect();

      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);

      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, [screen, finishGame]);

  const reload = () => {
    const game = gameRef.current;

    if (
      game &&
      game.ammo < MAX_AMMO &&
      game.reloadTimer <= 0
    ) {
      game.reloadTimer = 1.2;
    }
  };

  const fireDown = (event) => {
    event.preventDefault();
    pointerRef.current.firing = true;
  };

  const fireUp = (event) => {
    event.preventDefault();
    pointerRef.current.firing = false;
  };

  return (
    <div className="tt-shell">
      <div className="tt-glow tt-glow-one" />
      <div className="tt-glow tt-glow-two" />

      <header className="tt-header">
        <button className="tt-back" onClick={exitGame}>
          ← <span>BACK</span>
        </button>

        <div className="tt-logo">
          <span>✦</span> TOILET <b>TACTICS</b>
        </div>

        <div className="tt-header-tag">
          CITY DEFENSE UNIT
        </div>
      </header>

      <main className="tt-main">
        {screen === "intro" && (
          <section className="tt-intro">
            <div className="tt-kicker">
              <i /> EMERGENCY ALERT <i />
            </div>

            <h1>
              TOILET <em>TACTICS</em>
            </h1>

            <p className="tt-lead">
              The invasion is here. Keep your aim steady and defend the city!
            </p>

            <div className="tt-hero">
              <div className="tt-building tt-building-a" />
              <div className="tt-building tt-building-b" />
              <div className="tt-drone">◈</div>

              <div className="tt-toilet-hero">
                <span className="tt-toilet-eyes">●　●</span>
                <span className="tt-toilet-mouth">⌣</span>
              </div>

              <div className="tt-guard-hero">◉</div>
              <div className="tt-laser-hero" />

              <div className="tt-hero-caption">
                HOSTILE TOILETS DETECTED
              </div>
            </div>

            <div className="tt-feature-grid">
              <div>
                <span>⚔</span>
                <b>EPIC BATTLES</b>
                <small>Fight waves of toilet invaders</small>
              </div>

              <div>
                <span>▣</span>
                <b>POWER-UP DROPS</b>
                <small>Collect health and bonus coins</small>
              </div>

              <div>
                <span>🏆</span>
                <b>MISSION REWARDS</b>
                <small>Earn points and XP</small>
              </div>
            </div>

            <button className="tt-play" onClick={startGame}>
              START DEFENSE <span>➜</span>
            </button>

            <p className="tt-instructions">
              AIM WITH MOUSE OR TOUCH · HOLD TO FIRE · PRESS R TO RELOAD
            </p>
          </section>
        )}

        {screen === "playing" && (
          <section className="tt-game">
            <div className="tt-hud">
              <div>
                <small>SCORE</small>
                <strong>{hud.score.toLocaleString()}</strong>
              </div>

              <div>
                <small>TIME LEFT</small>
                <strong className="tt-time">
                  {hud.time}<i>s</i>
                </strong>
              </div>

              <div>
                <small>WAVE</small>
                <strong>{String(hud.wave).padStart(2, "0")}</strong>
              </div>

              <div>
                <small>CITY HEALTH</small>
                <strong className="tt-health-number">
                  {hud.health}%
                </strong>
              </div>

              <div>
                <small>AMMO</small>
                <strong>
                  {hud.ammo}<i>/{MAX_AMMO}</i>
                </strong>
              </div>
            </div>

            <div className="tt-health-track">
              <span style={{ width: `${hud.health}%` }} />
            </div>

            <div className="tt-canvas-wrap">
              <div className="tt-canvas-label">
                <span>SECTOR 09 · DOWNTOWN</span>

                <span>
                  THREAT LEVEL:{" "}
                  {hud.wave > 4 ? "CRITICAL" : "ELEVATED"}
                </span>
              </div>

              <canvas
                ref={canvasRef}
                className="tt-canvas"
                aria-label="Toilet Tactics game arena"
              />

              <div className="tt-canvas-foot">
                <span>◈ {hud.coins} BONUS COINS</span>

                <span>
                  {hud.ammo === 0
                    ? "RELOADING..."
                    : "HOLD TO FIRE"}
                </span>
              </div>
            </div>

            <div className="tt-mobile-actions">
              <span>TOUCH THE ARENA TO AIM</span>

              <button
                onPointerDown={fireDown}
                onPointerUp={fireUp}
                onPointerCancel={fireUp}
                onPointerLeave={fireUp}
              >
                HOLD TO FIRE ✦
              </button>

              <button onClick={reload}>
                RELOAD ↻
              </button>
            </div>
          </section>
        )}

        {screen === "over" && (
          <section className="tt-over">
            <div className="tt-kicker">
              <i /> MISSION REPORT <i />
            </div>

            <div className="tt-trophy">🏆</div>

            <h2>
              {hud.health <= 0
                ? "CITY OVERRUN"
                : "CITY DEFENDED!"}
            </h2>

            <p>
              {hud.health <= 0
                ? "The toilets broke through the defense. Regroup, commander."
                : "Outstanding work! The city is safe... for now."}
            </p>

            <div className="tt-results">
              <div>
                <small>FINAL SCORE</small>
                <strong>{hud.score.toLocaleString()}</strong>
              </div>

              <div>
                <small>WAVE REACHED</small>
                <strong>{hud.wave}</strong>
              </div>

              <div>
                <small>CITY HEALTH</small>
                <strong>{hud.health}%</strong>
              </div>

              <div>
                <small>COINS EARNED</small>
                <strong>{hud.coins}</strong>
              </div>
            </div>

            <button className="tt-play" onClick={startGame}>
              PLAY AGAIN ↻
            </button>

            <button className="tt-return" onClick={exitGame}>
              RETURN TO GAMES
            </button>
          </section>
        )}
      </main>

      <footer className="tt-footer">
        <span>VELOOP ARCADE</span>
        <span>FLUSH. FIGHT. SURVIVE. <b>WIN.</b></span>
        <span>TOILET TACTICS ©</span>
      </footer>
    </div>
  );
}
