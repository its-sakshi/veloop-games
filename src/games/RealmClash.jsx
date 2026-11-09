import React, { useState, useEffect, useRef, useCallback } from "react";
import "./RealmClash.css";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// SOUND SYNTHESIZER
class SoundFx {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playTone(freq, type, duration, vol = 0.1) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  march() { this.playTone(180, "triangle", 0.05, 0.03); }
  clash() { this.playTone(120, "sawtooth", 0.08, 0.06); }
  capture() {
    this.playTone(440, "sine", 0.1, 0.1);
    setTimeout(() => this.playTone(880, "sine", 0.2, 0.1), 100);
  }
  win() {
    [523, 659, 783, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sine", 0.3, 0.12), i * 120);
    });
  }
  lose() {
    [300, 260, 220, 180].forEach((f, i) => {
      setTimeout(() => this.playTone(f, "sawtooth", 0.3, 0.12), i * 140);
    });
  }
}
const sfx = new SoundFx();

// CAMPAIGN LEVELS
const LEVELS = [
  {
    level: 1,
    name: "Outpost Skirmish",
    towers: [
      { id: 1, x: 150, y: 300, owner: "player", count: 25, maxCount: 60 },
      { id: 2, x: 650, y: 300, owner: "enemy", count: 20, maxCount: 60 },
      { id: 3, x: 400, y: 180, owner: "neutral", count: 10, maxCount: 40 },
    ],
    aiInterval: 2500,
  },
  {
    level: 2,
    name: "Twin Valleys",
    towers: [
      { id: 1, x: 150, y: 180, owner: "player", count: 30, maxCount: 60 },
      { id: 2, x: 150, y: 420, owner: "player", count: 20, maxCount: 60 },
      { id: 3, x: 650, y: 180, owner: "enemy", count: 30, maxCount: 60 },
      { id: 4, x: 650, y: 420, owner: "enemy", count: 20, maxCount: 60 },
      { id: 5, x: 400, y: 300, owner: "neutral", count: 15, maxCount: 50 },
    ],
    aiInterval: 2000,
  },
  {
    level: 3,
    name: "Crossfire Citadel",
    towers: [
      { id: 1, x: 120, y: 300, owner: "player", count: 35, maxCount: 70 },
      { id: 2, x: 400, y: 120, owner: "neutral", count: 20, maxCount: 50 },
      { id: 3, x: 400, y: 480, owner: "neutral", count: 20, maxCount: 50 },
      { id: 4, x: 680, y: 180, owner: "enemy", count: 30, maxCount: 60 },
      { id: 5, x: 680, y: 420, owner: "enemy", count: 30, maxCount: 60 },
    ],
    aiInterval: 1700,
  },
  {
    level: 4,
    name: "The Iron Keep",
    towers: [
      { id: 1, x: 120, y: 180, owner: "player", count: 30, maxCount: 60 },
      { id: 2, x: 120, y: 420, owner: "player", count: 30, maxCount: 60 },
      { id: 3, x: 400, y: 300, owner: "enemy", count: 45, maxCount: 80 },
      { id: 4, x: 680, y: 180, owner: "enemy", count: 25, maxCount: 60 },
      { id: 5, x: 680, y: 420, owner: "enemy", count: 25, maxCount: 60 },
    ],
    aiInterval: 1400,
  },
  {
    level: 5,
    name: "Realm Domination",
    towers: [
      { id: 1, x: 100, y: 300, owner: "player", count: 40, maxCount: 80 },
      { id: 2, x: 300, y: 150, owner: "neutral", count: 25, maxCount: 60 },
      { id: 3, x: 300, y: 450, owner: "neutral", count: 25, maxCount: 60 },
      { id: 4, x: 500, y: 150, owner: "enemy", count: 35, maxCount: 70 },
      { id: 5, x: 500, y: 450, owner: "enemy", count: 35, maxCount: 70 },
      { id: 6, x: 700, y: 300, owner: "enemy", count: 50, maxCount: 90 },
    ],
    aiInterval: 1200,
  },
];

export default function RealmClash({ onBack, onExit }) {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gold, setGold] = useState(100);
  // States: 'instruction', 'playing', 'won', 'lost', 'complete'
  const [gameState, setGameState] = useState("instruction");
  const [showShop, setShowShop] = useState(false);

  // UPGRADES
  const [upgrades, setUpgrades] = useState({
    speed: 1,
    spawnRate: 1,
    startUnits: 0,
  });

  const canvasRef = useRef(null);
  const towersRef = useRef([]);
  const unitsRef = useRef([]);
  const selectedTowerRef = useRef(null);
  const dragPosRef = useRef(null);

  const handleBack = () => {
    if (onBack) onBack();
    else if (onExit) onExit();
    else window.history.back();
  };

  // INITIALIZE LEVEL
  const initLevel = useCallback((lvlNum, startState = "playing") => {
    const config = LEVELS[lvlNum - 1];
    towersRef.current = config.towers.map((t) => ({
      ...t,
      count: t.owner === "player" ? t.count + upgrades.startUnits : t.count,
    }));
    unitsRef.current = [];
    selectedTowerRef.current = null;
    dragPosRef.current = null;
    setGameState(startState);
  }, [upgrades.startUnits]);

  useEffect(() => {
    // Show instruction card initially when level 1 is loaded
    initLevel(currentLevel, currentLevel === 1 ? "instruction" : "playing");
  }, [currentLevel, initLevel]);

  // AI LOGIC
  useEffect(() => {
    if (gameState !== "playing") return;
    const config = LEVELS[currentLevel - 1];

    const aiTimer = setInterval(() => {
      const enemyTowers = towersRef.current.filter((t) => t.owner === "enemy");
      const targetTowers = towersRef.current.filter((t) => t.owner !== "enemy");

      if (enemyTowers.length > 0 && targetTowers.length > 0) {
        const source = enemyTowers[Math.floor(Math.random() * enemyTowers.length)];
        const target = targetTowers[Math.floor(Math.random() * targetTowers.length)];

        if (source.count > 10) {
          const sendCount = Math.floor(source.count / 2);
          source.count -= sendCount;

          for (let i = 0; i < sendCount; i++) {
            unitsRef.current.push({
              id: Math.random(),
              fromId: source.id,
              toId: target.id,
              x: source.x + (Math.random() - 0.5) * 20,
              y: source.y + (Math.random() - 0.5) * 20,
              targetX: target.x,
              targetY: target.y,
              owner: "enemy",
              speed: 1.2,
            });
          }
        }
      }
    }, config.aiInterval);

    return () => clearInterval(aiTimer);
  }, [currentLevel, gameState]);

  // MAIN GAME LOOP (RENDER & PHYSICS)
  useEffect(() => {
    let animationFrameId;
    let spawnCounter = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Background Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // 2. Tower Unit Generation Rate (Only when active)
      if (gameState === "playing") {
        spawnCounter++;
        if (spawnCounter % Math.max(20, 60 - upgrades.spawnRate * 8) === 0) {
          towersRef.current.forEach((t) => {
            if (t.owner !== "neutral" && t.count < t.maxCount) {
              t.count += 1;
            }
          });
        }
      }

      // 3. Draw Drag Line
      if (selectedTowerRef.current && dragPosRef.current) {
        ctx.beginPath();
        ctx.moveTo(selectedTowerRef.current.x, selectedTowerRef.current.y);
        ctx.lineTo(dragPosRef.current.x, dragPosRef.current.y);
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Update & Draw Units
      if (gameState === "playing") {
        unitsRef.current = unitsRef.current.filter((unit) => {
          const dx = unit.targetX - unit.x;
          const dy = unit.targetY - unit.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 8) {
            // Reached Target Tower
            const targetTower = towersRef.current.find((t) => t.id === unit.toId);
            if (targetTower) {
              if (targetTower.owner === unit.owner) {
                targetTower.count += 1;
              } else {
                targetTower.count -= 1;
                sfx.clash();
                if (targetTower.count <= 0) {
                  targetTower.owner = unit.owner;
                  targetTower.count = Math.abs(targetTower.count);
                  sfx.capture();
                }
              }
            }
            return false;
          }

          unit.x += (dx / dist) * unit.speed;
          unit.y += (dy / dist) * unit.speed;

          return true;
        });
      }

      // Render Units Always
      unitsRef.current.forEach((unit) => {
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = unit.owner === "player" ? "#3b82f6" : "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 5. DRAW DETAILED 3D FORTRESS TOWERS
      towersRef.current.forEach((t) => {
        const isSelected = selectedTowerRef.current?.id === t.id;
        const isPlayer = t.owner === "player";
        const isEnemy = t.owner === "enemy";

        const primaryColor = isPlayer ? "#3b82f6" : isEnemy ? "#ef4444" : "#9ca3af";
        const darkColor = isPlayer ? "#1e40af" : isEnemy ? "#991b1b" : "#4b5563";
        const lightColor = isPlayer ? "#93c5fd" : isEnemy ? "#fca5a5" : "#e5e7eb";
        const auraColor = isPlayer
          ? "rgba(59, 130, 246, 0.25)"
          : isEnemy
          ? "rgba(239, 68, 68, 0.25)"
          : "rgba(156, 163, 175, 0.15)";

        // A. Base Aura
        const auraRadius = isSelected ? 48 : 40;
        const grad = ctx.createRadialGradient(t.x, t.y, 10, t.x, t.y, auraRadius);
        grad.addColorStop(0, auraColor);
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.beginPath();
        ctx.arc(t.x, t.y, auraRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Selection Ring Animation
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 42, 0, Math.PI * 2);
          ctx.strokeStyle = "#ffcc00";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // B. Stone Shadow
        ctx.beginPath();
        ctx.ellipse(t.x, t.y + 22, 28, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fill();

        // C. Main Tower Body
        const tw = 40;
        const th = 48;
        const tx = t.x - tw / 2;
        const ty = t.y - th / 2;

        ctx.fillStyle = "#334155";
        ctx.fillRect(tx, ty, tw, th);
        ctx.fillStyle = "#475569";
        ctx.fillRect(tx, ty, tw * 0.5, th);
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.strokeRect(tx, ty, tw, th);

        // Stone Brick Lines
        ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
        ctx.lineWidth = 1.5;
        [ty + 12, ty + 24, ty + 36].forEach((ly) => {
          ctx.beginPath();
          ctx.moveTo(tx, ly);
          ctx.lineTo(tx + tw, ly);
          ctx.stroke();
        });

        // D. Battlements
        const battlementWidth = 8;
        const battlementHeight = 8;
        ctx.fillStyle = "#1e293b";

        for (let i = 0; i < 4; i++) {
          const bx = tx + i * 11;
          ctx.fillRect(bx, ty - battlementHeight, battlementWidth, battlementHeight);
          ctx.strokeRect(bx, ty - battlementHeight, battlementWidth, battlementHeight);
        }

        // E. Arch Doorway
        ctx.beginPath();
        ctx.arc(t.x, ty + th - 6, 7, Math.PI, 0, false);
        ctx.rect(t.x - 7, ty + th - 6, 14, 6);
        ctx.fillStyle = "#090d16";
        ctx.fill();
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // F. Faction Flag
        ctx.beginPath();
        ctx.moveTo(t.x, ty - battlementHeight);
        ctx.lineTo(t.x, ty - battlementHeight - 16);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(t.x, ty - battlementHeight - 16);
        ctx.lineTo(t.x + 14, ty - battlementHeight - 11);
        ctx.lineTo(t.x, ty - battlementHeight - 6);
        ctx.fillStyle = primaryColor;
        ctx.fill();
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // G. Faction Banner Stripe
        ctx.fillStyle = primaryColor;
        ctx.fillRect(t.x - 6, ty + 8, 12, 18);
        ctx.strokeStyle = darkColor;
        ctx.strokeRect(t.x - 6, ty + 8, 12, 18);

        // H. Troop Count Badge
        const badgeY = ty + th + 14;

        ctx.beginPath();
        ctx.roundRect(t.x - 20, badgeY - 10, 40, 20, 10);
        ctx.fillStyle = darkColor;
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#ffcc00" : lightColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 13px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(t.count.toString(), t.x, badgeY);
        ctx.shadowBlur = 0;
      });

      // 6. Win / Loss Check
      if (gameState === "playing") {
        const playerTowers = towersRef.current.filter((t) => t.owner === "player");
        const enemyTowers = towersRef.current.filter((t) => t.owner === "enemy");

        if (enemyTowers.length === 0 && unitsRef.current.filter((u) => u.owner === "enemy").length === 0) {
          setGameState("won");
          setGold((g) => g + 50 + currentLevel * 10);
          sfx.win();
        } else if (playerTowers.length === 0 && unitsRef.current.filter((u) => u.owner === "player").length === 0) {
          setGameState("lost");
          sfx.lose();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, currentLevel, upgrades]);

  // TOUCH & MOUSE EVENT HANDLERS
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const handlePointerDown = (e) => {
    sfx.init();
    if (gameState !== "playing") return;
    const pos = getCanvasCoords(e);
    const clicked = towersRef.current.find(
      (t) => Math.hypot(t.x - pos.x, t.y - pos.y) < 32
    );

    if (clicked && clicked.owner === "player") {
      selectedTowerRef.current = clicked;
      dragPosRef.current = pos;
    }
  };

  const handlePointerMove = (e) => {
    if (selectedTowerRef.current) {
      dragPosRef.current = getCanvasCoords(e);
    }
  };

  const handlePointerUp = (e) => {
    if (!selectedTowerRef.current) return;
    const pos = getCanvasCoords(e);
    const target = towersRef.current.find(
      (t) => Math.hypot(t.x - pos.x, t.y - pos.y) < 32
    );

    if (target && target.id !== selectedTowerRef.current.id) {
      const source = selectedTowerRef.current;
      const sendCount = Math.floor(source.count / 2);
      source.count -= sendCount;

      for (let i = 0; i < sendCount; i++) {
        unitsRef.current.push({
          id: Math.random(),
          fromId: source.id,
          toId: target.id,
          x: source.x + (Math.random() - 0.5) * 20,
          y: source.y + (Math.random() - 0.5) * 20,
          targetX: target.x,
          targetY: target.y,
          owner: "player",
          speed: 1.5 + upgrades.speed * 0.3,
        });
      }
      sfx.march();
    }

    selectedTowerRef.current = null;
    dragPosRef.current = null;
  };

  const buyUpgrade = (type) => {
    const costs = {
      speed: upgrades.speed * 40,
      spawnRate: upgrades.spawnRate * 50,
      startUnits: (upgrades.startUnits + 1) * 60,
    };

    if (gold >= costs[type]) {
      setGold((g) => g - costs[type]);
      setUpgrades((u) => ({ ...u, [type]: u[type] + (type === "startUnits" ? 5 : 1) }));
    }
  };

  const startGame = () => {
    sfx.init();
    setGameState("playing");
  };

  return (
    <main className="realmclash-game">
      <div className="realmclash-shell">
        {/* TOP HEADER */}
        <header className="realmclash-header">
          <div className="realmclash-header-main">
            <button className="realmclash-back" onClick={handleBack}>
              ← BACK
            </button>
            <div>
              <span className="realmclash-eyebrow">TACTICAL TOWER CONQUEST</span>
              <h1>
                REALM<span>CLASH!</span>
              </h1>
              <p>Build. Battle. Conquer!</p>
            </div>
          </div>

          <div className="realmclash-gold-badge">
            <span>🪙</span>
            <strong>{gold} Gold</strong>
          </div>
        </header>

        {/* STATS BAR */}
        <section className="realmclash-stats">
          <div>
            <span>STAGE</span>
            <strong>Level {currentLevel} / 5</strong>
          </div>
          <div>
            <span>TROOP SPEED</span>
            <strong>+{upgrades.speed * 15}%</strong>
          </div>
          <div>
            <span>RECRUIT SPEED</span>
            <strong>+{upgrades.spawnRate * 10}%</strong>
          </div>
          <div>
            <span>GARRISON BONUS</span>
            <strong>+{upgrades.startUnits} Units</strong>
          </div>
        </section>

        {/* GAME BOARD */}
        <section className="realmclash-panel">
          <div className="realmclash-board-heading">
            <div>
              <strong>{LEVELS[currentLevel - 1].name}</strong>
              <small>Drag from blue towers to capture enemy bases!</small>
            </div>
            <button
              className="realmclash-btn-shop"
              onClick={() => setShowShop(true)}
            >
              🛠️ ARMORY SHOP
            </button>
          </div>

          <div className="realmclash-board">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="realmclash-canvas"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {/* OVERLAY: ENTRY INSTRUCTIONS */}
            {gameState === "instruction" && (
              <div className="realmclash-overlay">
                <div className="realmclash-card realmclash-instruction-card">
                  <div className="realmclash-card-icon">⚔️</div>
                  <h2>HOW TO PLAY REALM CLASH</h2>
                  <p>Command your armies and conquer all hostile towers to claim victory!</p>

                  <div className="realmclash-factions-list">
                    <div className="realmclash-faction-item">
                      <span className="realmclash-dot blue" />
                      <div>
                        <strong>Blue Towers = YOU (Player)</strong>
                        <small>Generates your troops over time. Drag from here to attack!</small>
                      </div>
                    </div>

                    <div className="realmclash-faction-item">
                      <span className="realmclash-dot red" />
                      <div>
                        <strong>Red Towers = ENEMY (AI)</strong>
                        <small>Hostile fortresses that actively attack your bases.</small>
                      </div>
                    </div>

                    <div className="realmclash-faction-item">
                      <span className="realmclash-dot grey" />
                      <div>
                        <strong>Grey Towers = NEUTRAL OUTPOSTS</strong>
                        <small>Unclaimed bases with weak garrisons. Capture them early!</small>
                      </div>
                    </div>
                  </div>

                  <div className="realmclash-attack-rule">
                    <span>👉</span>
                    <div>
                      <strong>HOW TO ATTACK:</strong>
                      <small>Click/touch & drag a line from your Blue tower to any target tower!</small>
                    </div>
                  </div>

                  <button
                    className="realmclash-btn-primary realmclash-start-btn"
                    onClick={startGame}
                  >
                    START PLAYING ⚔️
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: WIN */}
            {gameState === "won" && (
              <div className="realmclash-overlay">
                <div className="realmclash-card">
                  <div className="realmclash-card-icon">🏆</div>
                  <h2>VICTORY!</h2>
                  <p>You conquered the realm and expanded your empire!</p>
                  <div className="realmclash-rewards">
                    <span>+50 Gold 🪙</span>
                  </div>
                  <button
                    className="realmclash-btn-primary"
                    onClick={() => {
                      if (currentLevel < LEVELS.length) {
                        setCurrentLevel((l) => l + 1);
                      } else {
                        setGameState("complete");
                      }
                    }}
                  >
                    {currentLevel < LEVELS.length ? "Next Level →" : "Claim Ultimate Trophy"}
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: LOSS */}
            {gameState === "lost" && (
              <div className="realmclash-overlay">
                <div className="realmclash-card">
                  <div className="realmclash-card-icon">💀</div>
                  <h2>DEFEAT!</h2>
                  <p>Your towers fell to the red march. Upgrade and try again!</p>
                  <button
                    className="realmclash-btn-primary"
                    onClick={() => initLevel(currentLevel, "playing")}
                  >
                    Try Again ↻
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: GAME COMPLETE */}
            {gameState === "complete" && (
              <div className="realmclash-overlay">
                <div className="realmclash-card">
                  <div className="realmclash-card-icon">👑</div>
                  <h2>REALM CONQUERED!</h2>
                  <p>All 5 regions are under your reign!</p>
                  <button
                    className="realmclash-btn-primary"
                    onClick={() => setCurrentLevel(1)}
                  >
                    Restart Campaign
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY: ARMORY SHOP */}
            {showShop && (
              <div className="realmclash-overlay">
                <div className="realmclash-card">
                  <h2>ARMORY UPGRADES</h2>
                  <p>Spend gold to empower your armies!</p>

                  <div className="realmclash-upgrades-grid">
                    <div className="realmclash-upgrade-item">
                      <div>
                        <strong>Marching Speed</strong>
                        <small>Level {upgrades.speed}</small>
                      </div>
                      <button
                        onClick={() => buyUpgrade("speed")}
                        disabled={gold < upgrades.speed * 40}
                      >
                        {upgrades.speed * 40} Gold 🪙
                      </button>
                    </div>

                    <div className="realmclash-upgrade-item">
                      <div>
                        <strong>Recruit Speed</strong>
                        <small>Level {upgrades.spawnRate}</small>
                      </div>
                      <button
                        onClick={() => buyUpgrade("spawnRate")}
                        disabled={gold < upgrades.spawnRate * 50}
                      >
                        {upgrades.spawnRate * 50} Gold 🪙
                      </button>
                    </div>

                    <div className="realmclash-upgrade-item">
                      <div>
                        <strong>Starting Garrison</strong>
                        <small>+{upgrades.startUnits} Units</small>
                      </div>
                      <button
                        onClick={() => buyUpgrade("startUnits")}
                        disabled={gold < (upgrades.startUnits + 1) * 60}
                      >
                        {(upgrades.startUnits + 1) * 60} Gold 🪙
                      </button>
                    </div>
                  </div>

                  <button
                    className="realmclash-btn-secondary"
                    onClick={() => setShowShop(false)}
                  >
                    Close Shop
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="realmclash-actions">
            <button
              className="realmclash-btn-secondary"
              onClick={() => initLevel(currentLevel, "playing")}
            >
              ↻ Restart Stage
            </button>
            <button
              className="realmclash-btn-primary"
              onClick={() => setShowShop(true)}
            >
              🪙 Upgrade Armory
            </button>
          </div>
        </section>

        {/* INSTRUCTIONS */}
        <section className="realmclash-instructions">
          <div className="realmclash-instruction-icon">⚔️</div>
          <div>
            <strong>How to Play</strong>
            <p>
              Click/touch and drag a line from your Blue Tower to any Grey or Red tower[cite: 4]. 
              Dispatching troops cuts your tower count in half to march towards the target!
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}