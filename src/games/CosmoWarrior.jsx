
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./CosmoWarrior.css";

const GAME_SECONDS = 90;
const START_LIVES = 3;
const PLAYER_SPEED = 440;
const POWERUP_TYPES = ["multi", "shield", "bomb", "laser", "coin"];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => Math.random() * (max - min) + min;

function makeEnemy(canvasWidth, wave) {
  const size = random(25, 36);
  return {
    x: random(size + 8, canvasWidth - size - 8),
    y: random(-150, -35),
    w: size,
    h: size * 0.82,
    speed: random(65, 105) + wave * 8,
    hp: wave >= 4 && Math.random() < 0.22 ? 2 : 1,
    fire: random(1.3, 3.4),
    type: Math.floor(random(0, 3)),
    drift: random(-35, 35),
    phase: random(0, Math.PI * 2),
  };
}

function makePowerup(x, y) {
  return {
    x,
    y,
    r: 13,
    type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
    speed: 95,
    spin: 0,
  };
}

export default function CosmoWarrior({
  onExit,
  onBack,
  onGameComplete,
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef({});
  const pointerRef = useRef({ active: false, x: 0, y: 0 });

  const [screen, setScreen] = useState("intro");

  const [hud, setHud] = useState({
    score: 0,
    time: GAME_SECONDS,
    lives: START_LIVES,
    wave: 1,
    coins: 0,
    power: "",
  });

  const exitGame = useCallback(() => {
    if (onExit) onExit();
    else if (onBack) onBack();
  }, [onExit, onBack]);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 800;
    const height = canvas?.clientHeight || 600;

    gameRef.current = {
      player: {
        x: width / 2,
        y: height - 82,
        w: 42,
        h: 54,
        invulnerable: 0,
        shield: 0,
        multi: 0,
        laser: 0,
      },

      bullets: [],
      enemyBullets: [],
      enemies: [],
      particles: [],
      powerups: [],

      score: 0,
      time: GAME_SECONDS,
      lives: START_LIVES,
      wave: 1,
      coins: 0,

      fireTimer: 0,
      spawnTimer: 0.4,
      elapsed: 0,
      shake: 0,
      running: true,
      completed: false,
      lastHud: 0,
      bombFlash: 0,
    };

    keysRef.current = {};
    pointerRef.current.active = false;

    setHud({
      score: 0,
      time: GAME_SECONDS,
      lives: START_LIVES,
      wave: 1,
      coins: 0,
      power: "",
    });

    setScreen("playing");
  }, []);

  const finishGame = useCallback(
    (reason = "complete") => {
      const g = gameRef.current;

      if (!g || g.completed) return;

      g.completed = true;
      g.running = false;

      setHud({
        score: g.score,
        time: Math.ceil(g.time),
        lives: g.lives,
        wave: g.wave,
        coins: g.coins,
        power: "",
      });

      setScreen("gameover");

      const xp = Math.max(
        5,
        Math.floor(g.score / 25) + g.wave * 2
      );

      if (onGameComplete) {
        onGameComplete({
          score: g.score,
          xp,
          reason,
          coins: g.coins,
        });
      }
    },
    [onGameComplete]
  );

  useEffect(() => {
    if (screen !== "playing") return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");

    let raf = 0;
    let last = performance.now();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      width = Math.max(280, rect.width);
      height = Math.max(360, rect.height);

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const g = gameRef.current;

      if (g) {
        g.player.x = clamp(g.player.x, 28, width - 28);
        g.player.y = clamp(
          g.player.y,
          height * 0.58,
          height - 45
        );
      }
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: random(0.5, 1.8),
      speed: random(12, 65),
      alpha: random(0.25, 0.9),
    }));

    const burst = (x, y, color, count = 12) => {
      const g = gameRef.current;

      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = random(45, 190);

        g.particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: random(0.25, 0.65),
          max: 0.65,
          r: random(1.5, 4),
          color,
        });
      }
    };

    const fire = (g) => {
      const p = g.player;

      const spread =
        p.multi > 0 ? [-15, 0, 15] : [0];

      spread.forEach((offset) => {
        g.bullets.push({
          x: p.x + offset,
          y: p.y - 26,
          vx: offset * 0.7,
          vy: -590,
          r: p.laser > 0 ? 5 : 3.5,
          laser: p.laser > 0,
        });
      });

      if (p.laser > 0) {
        g.bullets.push({
          x: p.x,
          y: p.y - 100,
          vx: 0,
          vy: -760,
          r: 8,
          laser: true,
        });
      }
    };

    const collectPower = (g, item) => {
      const p = g.player;

      if (item.type === "multi") p.multi = 9;
      if (item.type === "shield") p.shield = 8;
      if (item.type === "laser") p.laser = 8;

      if (item.type === "coin") {
        g.coins += 5;
        g.score += 50;
      }

      if (item.type === "bomb") {
        g.score += g.enemies.length * 20;

        g.enemies.forEach((e) =>
          burst(e.x, e.y, "#ffb84d", 8)
        );

        g.enemies = [];
        g.enemyBullets = [];
        g.bombFlash = 0.35;
      }

      burst(item.x, item.y, "#61eaff", 16);
    };

    const drawShip = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (
        p.invulnerable > 0 &&
        Math.floor(p.invulnerable * 12) % 2 === 0
      ) {
        ctx.globalAlpha = 0.35;
      }

      ctx.shadowBlur = 20;
      ctx.shadowColor = "#28dfff";
      ctx.fillStyle = "#13bff4";

      ctx.beginPath();
      ctx.moveTo(0, -31);
      ctx.lineTo(22, 22);
      ctx.lineTo(7, 14);
      ctx.lineTo(0, 24);
      ctx.lineTo(-7, 14);
      ctx.lineTo(-22, 22);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#dffaff";

      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(8, 13);
      ctx.lineTo(0, 8);
      ctx.lineTo(-8, 13);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff9d32";

      ctx.beginPath();
      ctx.moveTo(-7, 20);
      ctx.lineTo(-3, 37 + Math.random() * 8);
      ctx.lineTo(0, 20);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(7, 20);
      ctx.lineTo(3, 37 + Math.random() * 8);
      ctx.lineTo(0, 20);
      ctx.fill();

      if (p.shield > 0) {
        ctx.strokeStyle = "rgba(87,230,255,.9)";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#43eaff";

        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawEnemy = (e) => {
      ctx.save();
      ctx.translate(e.x, e.y);

      const colors = ["#ff526c", "#a66cff", "#6eea82"];

      ctx.shadowBlur = 13;
      ctx.shadowColor = colors[e.type];
      ctx.fillStyle = colors[e.type];

      ctx.beginPath();
      ctx.moveTo(0, -e.h / 2);
      ctx.lineTo(e.w / 2, -2);
      ctx.lineTo(e.w * 0.35, e.h / 2);
      ctx.lineTo(0, e.h / 3);
      ctx.lineTo(-e.w * 0.35, e.h / 2);
      ctx.lineTo(-e.w / 2, -2);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#10162e";

      ctx.fillRect(-e.w * 0.24, -3, 5, 5);
      ctx.fillRect(e.w * 0.1, -3, 5, 5);

      ctx.fillStyle = "#fff";
      ctx.fillRect(-e.w * 0.19, -2, 2, 2);
      ctx.fillRect(e.w * 0.15, -2, 2, 2);

      if (e.hp > 1) {
        ctx.strokeStyle = "#fff2a6";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          -e.w / 2 - 2,
          -e.h / 2 - 2,
          e.w + 4,
          e.h + 4
        );
      }

      ctx.restore();
    };

    const draw = (now) => {
      const g = gameRef.current;

      if (!g || !g.running) return;

      const dt = Math.min((now - last) / 1000, 0.035);
      last = now;

      g.elapsed += dt;
      g.time = Math.max(0, g.time - dt);
      g.wave = 1 + Math.floor(g.elapsed / 18);
      g.shake = Math.max(0, g.shake - dt * 22);
      g.bombFlash = Math.max(0, g.bombFlash - dt);

      const p = g.player;

      p.invulnerable = Math.max(0, p.invulnerable - dt);
      p.shield = Math.max(0, p.shield - dt);
      p.multi = Math.max(0, p.multi - dt);
      p.laser = Math.max(0, p.laser - dt);

      const key = keysRef.current;

      const dx =
        (key.ArrowRight || key.d || key.D ? 1 : 0) -
        (key.ArrowLeft || key.a || key.A ? 1 : 0);

      const dy =
        (key.ArrowDown || key.s || key.S ? 1 : 0) -
        (key.ArrowUp || key.w || key.W ? 1 : 0);

      if (pointerRef.current.active) {
        p.x +=
          (pointerRef.current.x - p.x) *
          Math.min(1, dt * 12);

        p.y +=
          (pointerRef.current.y - p.y) *
          Math.min(1, dt * 12);
      } else {
        p.x += dx * PLAYER_SPEED * dt;
        p.y += dy * PLAYER_SPEED * dt;
      }

      p.x = clamp(p.x, 27, width - 27);
      p.y = clamp(p.y, height * 0.55, height - 42);

      g.fireTimer -= dt;

      // Automatic firing
      if (g.fireTimer <= 0) {
        fire(g);
        g.fireTimer = p.laser > 0 ? 0.11 : 0.22;
      }

      g.spawnTimer -= dt;

      if (g.spawnTimer <= 0) {
        const count = Math.min(
          1 + Math.floor(g.wave / 3),
          3
        );

        for (let i = 0; i < count; i++) {
          g.enemies.push(makeEnemy(width, g.wave));
        }

        g.spawnTimer = Math.max(
          0.38,
          1.05 - g.wave * 0.07
        );
      }

      g.bullets.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      });

      g.enemyBullets.forEach((b) => {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      });

      g.enemies.forEach((e) => {
        e.y += e.speed * dt;

        e.x +=
          Math.sin(g.elapsed * 1.8 + e.phase) *
          e.drift *
          dt;

        e.fire -= dt;

        if (
          e.fire <= 0 &&
          e.y > 15 &&
          e.y < height * 0.75
        ) {
          const angle = Math.atan2(
            p.y - e.y,
            p.x - e.x
          );

          g.enemyBullets.push({
            x: e.x,
            y: e.y + 10,
            vx: Math.cos(angle) * 155,
            vy: Math.sin(angle) * 155 + 80,
            r: 4,
          });

          e.fire = random(2.0, 3.7);
        }
      });

      g.powerups.forEach((item) => {
        item.y += item.speed * dt;
        item.spin += dt * 3;
      });

      g.particles.forEach((part) => {
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.vx *= 0.985;
        part.vy *= 0.985;
        part.life -= dt;
      });

      // Player bullets versus enemies
      for (let i = g.bullets.length - 1; i >= 0; i--) {
        const b = g.bullets[i];
        let hit = false;

        for (
          let j = g.enemies.length - 1;
          j >= 0;
          j--
        ) {
          const e = g.enemies[j];

          if (
            Math.hypot(b.x - e.x, b.y - e.y) <
            e.w * 0.48 + b.r
          ) {
            e.hp--;
            hit = true;

            burst(b.x, b.y, "#7deaff", 4);

            if (e.hp <= 0) {
              g.score += 100;

              burst(
                e.x,
                e.y,
                ["#ff647b", "#bd8bff", "#78ff9d"][e.type],
                17
              );

              if (Math.random() < 0.16) {
                g.powerups.push(makePowerup(e.x, e.y));
              }

              g.enemies.splice(j, 1);
            }

            break;
          }
        }

        if (hit || b.y < -30) {
          g.bullets.splice(i, 1);
        }
      }

      // Enemy bullets versus player
      for (
        let i = g.enemyBullets.length - 1;
        i >= 0;
        i--
      ) {
        const b = g.enemyBullets[i];

        if (
          Math.hypot(b.x - p.x, b.y - p.y) <
            23 + b.r &&
          p.invulnerable <= 0
        ) {
          g.enemyBullets.splice(i, 1);

          if (p.shield <= 0) {
            g.lives--;
            p.invulnerable = 1.4;
            g.shake = 8;

            burst(p.x, p.y, "#4eeaff", 22);
          } else {
            burst(b.x, b.y, "#4eeaff", 7);
          }
        } else if (
          b.y > height + 25 ||
          b.x < -25 ||
          b.x > width + 25
        ) {
          g.enemyBullets.splice(i, 1);
        }
      }

      // Enemy collision with player
      for (
        let i = g.enemies.length - 1;
        i >= 0;
        i--
      ) {
        const e = g.enemies[i];

        if (
          Math.hypot(e.x - p.x, e.y - p.y) <
            27 + e.w * 0.35 &&
          p.invulnerable <= 0
        ) {
          g.enemies.splice(i, 1);
          burst(e.x, e.y, "#ff647b", 15);

          if (p.shield <= 0) {
            g.lives--;
            p.invulnerable = 1.4;
            g.shake = 9;
          }
        } else if (e.y > height + 35) {
          g.enemies.splice(i, 1);
        }
      }

      // Collect power-ups
      for (
        let i = g.powerups.length - 1;
        i >= 0;
        i--
      ) {
        const item = g.powerups[i];

        if (Math.hypot(item.x - p.x, item.y - p.y) < 34) {
          collectPower(g, item);
          g.powerups.splice(i, 1);
        } else if (item.y > height + 20) {
          g.powerups.splice(i, 1);
        }
      }

      g.bullets = g.bullets.filter(
        (b) =>
          b.y > -40 &&
          b.x > -30 &&
          b.x < width + 30
      );

      g.particles = g.particles.filter(
        (part) => part.life > 0
      );

      if (g.lives <= 0) {
        finishGame("defeated");
        return;
      }

      if (g.time <= 0) {
        finishGame("survived");
        return;
      }

      // Render arena
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      if (g.shake > 0) {
        ctx.translate(
          random(-g.shake, g.shake),
          random(-g.shake, g.shake)
        );
      }

      ctx.fillStyle = "#05091d";
      ctx.fillRect(0, 0, width, height);

      const nebula = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        10,
        width * 0.5,
        height * 0.35,
        height * 0.8
      );

      nebula.addColorStop(0, "rgba(31,50,120,.32)");
      nebula.addColorStop(1, "rgba(3,6,24,0)");

      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      stars.forEach((s) => {
        s.y += s.speed * dt;

        if (s.y > height) {
          s.y = 0;
          s.x = Math.random() * width;
        }

        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = "#bdefff";
        ctx.fillRect(s.x, s.y, s.r, s.r * 1.8);
      });

      ctx.globalAlpha = 1;

      if (g.bombFlash > 0) {
        ctx.fillStyle = `rgba(255,185,80,${g.bombFlash * 0.55})`;
        ctx.fillRect(0, 0, width, height);
      }

      g.bullets.forEach((b) => {
        ctx.save();
        ctx.shadowBlur = 13;
        ctx.shadowColor = b.laser ? "#ffdf66" : "#49eaff";
        ctx.fillStyle = b.laser ? "#fff3a6" : "#a9f7ff";

        ctx.beginPath();
        ctx.ellipse(
          b.x,
          b.y,
          b.r,
          b.r * 2.6,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });

      g.enemyBullets.forEach((b) => {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff4c7b";
        ctx.fillStyle = "#ff8aa4";

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      g.enemies.forEach(drawEnemy);

      g.powerups.forEach((item) => {
        const icons = {
          multi: "✦",
          shield: "⬡",
          bomb: "✹",
          laser: "⚡",
          coin: "$",
        };

        const colors = {
          multi: "#4eeaff",
          shield: "#68a8ff",
          bomb: "#ffb64d",
          laser: "#ff6ce0",
          coin: "#ffe16b",
        };

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.spin);
        ctx.shadowBlur = 16;
        ctx.shadowColor = colors[item.type];
        ctx.fillStyle = "rgba(8,19,48,.9)";
        ctx.strokeStyle = colors[item.type];
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(0, 0, item.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.rotate(-item.spin);
        ctx.fillStyle = colors[item.type];
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icons[item.type], 0, 1);
        ctx.restore();
      });

      g.particles.forEach((part) => {
        ctx.globalAlpha = Math.max(
          0,
          part.life / part.max
        );

        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      drawShip(p);
      ctx.restore();

      if (now - g.lastHud > 100) {
        g.lastHud = now;

        const active =
          p.multi > 0
            ? "MULTI SHOT"
            : p.shield > 0
              ? "SHIELD"
              : p.laser > 0
                ? "LASER"
                : "";

        setHud({
          score: g.score,
          time: Math.ceil(g.time),
          lives: g.lives,
          wave: g.wave,
          coins: g.coins,
          power: active,
        });
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const keyDown = (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
          e.key
        )
      ) {
        e.preventDefault();
      }

      keysRef.current[e.key === " " ? "Space" : e.key] = true;
    };

    const keyUp = (e) => {
      keysRef.current[e.key === " " ? "Space" : e.key] = false;
    };

    const point = (e) => {
      const rect = canvas.getBoundingClientRect();

      pointerRef.current = {
        active: true,
        x: e.clientX - rect.left,
        y: clamp(
          e.clientY - rect.top,
          height * 0.55,
          height - 42
        ),
      };
    };

    const pointerUp = () => {
      pointerRef.current.active = false;
    };

    const pointerMove = (e) => {
      if (e.buttons) point(e);
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    canvas.addEventListener("pointerdown", point);
    canvas.addEventListener("pointermove", pointerMove);

    window.addEventListener("pointerup", pointerUp);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();

      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);

      canvas.removeEventListener("pointerdown", point);
      canvas.removeEventListener("pointermove", pointerMove);

      window.removeEventListener("pointerup", pointerUp);
    };
  }, [screen, finishGame]);

  return (
    <div className="cw-shell">
      <div className="cw-stars-bg" />

      <header className="cw-header">
        <button
          className="cw-back"
          onClick={exitGame}
          aria-label="Return to games"
        >
          ← <span>BACK</span>
        </button>

        <div className="cw-brand">
          <span className="cw-brand-icon">✦</span>
          <span>
            COSMO <b>WARRIOR</b>
          </span>
        </div>
      </header>

      <main className="cw-main">
        {screen === "intro" && (
          <section className="cw-intro">
            <div className="cw-eyebrow">
              <span />
              GALACTIC ARCADE SHOOTER
              <span />
            </div>

            <h1>
              DEFEND THE <em>GALAXY</em>
            </h1>

            <p className="cw-subtitle">
              Pilot your ship. Blast the invaders. Become a legend.
            </p>

            <div className="cw-preview">
              <div className="cw-planet cw-planet-one" />
              <div className="cw-planet cw-planet-two" />
              <div className="cw-preview-ship">🚀</div>
              <div className="cw-preview-enemy">
                ✦　✦　✦　✦
              </div>
              <div className="cw-preview-laser">
                │　│　│
              </div>
            </div>

            <div className="cw-feature-row">
              <div>
                <span>✧</span>
                <b>ALIEN WAVES</b>
                <small>Survive the swarm</small>
              </div>

              <div>
                <span>⚡</span>
                <b>POWER UPS</b>
                <small>Upgrade your ship</small>
              </div>

              <div>
                <span>★</span>
                <b>BIG REWARDS</b>
                <small>Earn XP & coins</small>
              </div>
            </div>

            <div className="cw-intro-actions">
              <button className="cw-primary" onClick={startGame}>
                LAUNCH MISSION <span>➜</span>
              </button>

              <div className="cw-hint">
                MOVE: <b>WASD / ARROWS</b>
                <i>•</i>
                AIM: <b>TOUCH / MOUSE</b>
                <i>•</i>
                AUTO FIRE
              </div>
            </div>
          </section>
        )}

        <section
          className={`cw-arena-section ${
            screen !== "playing" ? "cw-hidden" : ""
          }`}
        >
          <div className="cw-hud">
            <div className="cw-hud-item">
              <small>SCORE</small>
              <strong>{hud.score.toLocaleString()}</strong>
            </div>

            <div className="cw-hud-item">
              <small>TIME LEFT</small>
              <strong>
                {hud.time}
                <i>s</i>
              </strong>
            </div>

            <div className="cw-hud-item">
              <small>WAVE</small>
              <strong>
                {String(hud.wave).padStart(2, "0")}
              </strong>
            </div>

            <div className="cw-hud-item">
              <small>HULL</small>
              <strong className="cw-lives">
                {"♥".repeat(Math.max(0, hud.lives))}
                <span>
                  {"♡".repeat(
                    Math.max(0, START_LIVES - hud.lives)
                  )}
                </span>
              </strong>
            </div>
          </div>

          <div className="cw-arena-frame">
            <div className="cw-arena-topline">
              <span>SECTOR 07 // DEEP SPACE</span>
              <span>{hud.power || "MISSION ACTIVE"}</span>
            </div>

            <canvas
              ref={canvasRef}
              className="cw-canvas"
              aria-label="Cosmo Warrior game arena"
            />

            <div className="cw-arena-bottom">
              <span>✦ {hud.coins} BONUS COINS</span>
              <span>DESTROY HOSTILES TO SCORE</span>
            </div>
          </div>

          <div className="cw-mobile-controls">
            <span>DRAG TO MOVE</span>
            <span>AUTO FIRE ENABLED ✦</span>
          </div>
        </section>

        {screen === "gameover" && (
          <section className="cw-gameover">
            <div className="cw-over-icon">✦</div>

            <div className="cw-eyebrow">MISSION REPORT</div>

            <h2>
              {hud.lives <= 0
                ? "SHIP DESTROYED"
                : "GALAXY SECURED"}
            </h2>

            <p>Your mission has ended, pilot.</p>

            <div className="cw-results">
              <div>
                <small>FINAL SCORE</small>
                <strong>{hud.score.toLocaleString()}</strong>
              </div>

              <div>
                <small>WAVE REACHED</small>
                <strong>
                  {String(hud.wave).padStart(2, "0")}
                </strong>
              </div>

              <div>
                <small>COINS FOUND</small>
                <strong>{hud.coins}</strong>
              </div>

              <div>
                <small>XP EARNED</small>
                <strong>
                  +
                  {Math.max(
                    5,
                    Math.floor(hud.score / 25) + hud.wave * 2
                  )}
                </strong>
              </div>
            </div>

            <div className="cw-over-actions">
              <button className="cw-primary" onClick={startGame}>
                PLAY AGAIN ↻
              </button>

              <button className="cw-secondary" onClick={exitGame}>
                RETURN TO GAMES
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="cw-footer">
        <span>VELOOP ARCADE</span>
        <span>
          ONE GALAXY. ONE HERO. <b>YOU.</b>
        </span>
        <span>✦ COSMO WARRIOR</span>
      </footer>
    </div>
  );
}
