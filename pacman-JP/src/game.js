import { BOARD_SIZE, DIRS, FRUIT_COLORS, FRUIT_TYPES, POWERUP_COLORS, POWERUP_TYPES, TILE } from "./constants.js";
import { Ghost } from "./entities/ghost.js";
import { Player } from "./entities/player.js";
import { generateLevel } from "./maze.js";
import { clamp, choice, distance, randInt } from "./utils.js";

const GHOST_PROFILES = [
  { id: 0, name: "Blinky", role: "blinky", color: "#ff4f5e", scatterTarget: { x: 19, y: 1 } },
  { id: 1, name: "Pinky", role: "pinky", color: "#ff8fc2", scatterTarget: { x: 1, y: 1 } },
  { id: 2, name: "Inky", role: "inky", color: "#4be5ff", scatterTarget: { x: 19, y: 19 } },
  { id: 3, name: "Clyde", role: "clyde", color: "#ffb347", scatterTarget: { x: 1, y: 19 } },
];

export class Game {
  constructor({ canvas, ui, audio, input, getBestScore = () => 0, onRunEnd = () => {} }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.audio = audio;
    this.input = input;
    this.getBestScore = getBestScore;
    this.onRunEnd = onRunEnd;

    this.state = "menu";
    this.statusText = "Preparado";
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.maxMvpLevel = 3;
    this.difficulty = "normal";
    this.difficultyFactor = 1;
    this.currentPlayer = "Anon";
    this.elapsed = 0;

    this.grid = [];
    this.powerUps = [];
    this.pelletRemaining = 0;
    this.totalPelletsInLevel = 1;
    this.ghostHouseCenter = { x: 10, y: 10 };
    this.bonusFruit = null;
    this.fruitSpawnTimer = 0;
    this.player = null;
    this.ghosts = [];

    this.ghostSlowTimer = 0;
    this.frightTimer = 0;
    this.shieldTimer = 0;
    this.hitCooldown = 0;

    this.lastTick = 0;
    this.cellPx = 756 / BOARD_SIZE; // Fixed: buffer is always 756x756
    this.loopRunning = false; // guard against multiple RAF loops
    this.deathAnim = null;  // { timer, x, y }
    this.victoryAnim = null; // { timer }
    this.frameCount = 0;
    this.lastRenderTimestamp = 0;

    // Fixed 756x756 buffer – never changed so the canvas is never cleared by resize.
    this.canvas.width = 756;
    this.canvas.height = 756;
    this.setupLevel(this.level);
    this.render();
  }

  /** Returns the CSS display side-length of the canvas in pixels. */
  getDisplaySize() {
    const s = this.canvas.offsetWidth || this.canvas.clientWidth || 756;
    return s > 10 ? s : 756;
  }

  resize() {
    // Buffer stays fixed at 756x756. cellPx is always 756/BOARD_SIZE.
    // Nothing to do here – kept for ResizeObserver compatibility.
  }

  setupLevel(level) {
    const data = generateLevel(level);
    this.grid = data.grid;
    this.powerUps = data.powerUps;
    this.pelletRemaining = data.pelletCount;
    this.totalPelletsInLevel = Math.max(1, data.pelletCount);
    this.ghostHouseCenter = data.ghostHouseCenter;
    this.bonusFruit = null;
    this.fruitSpawnTimer = this.nextFruitSpawnTimer();

    this.player = new Player(data.playerSpawn);
    this.ghosts = data.ghostSpawns.map((spawn, idx) => {
      const profile = GHOST_PROFILES[idx % GHOST_PROFILES.length];
      return new Ghost(spawn, profile, this.ghostHouseCenter);
    });

    this.cellPx = 756 / BOARD_SIZE;
    this.statusText = `En juego (${this.difficulty})`;
    this.ghostSlowTimer = 0;
    this.frightTimer = 0;
    this.shieldTimer = 0;
    this.hitCooldown = 0;

    this.updateHud();
  }

  setDifficulty(mode = "normal") {
    const normalized = ["easy", "normal", "hard"].includes(mode) ? mode : "normal";
    this.difficulty = normalized;
    this.difficultyFactor = normalized === "easy" ? 0.9 : normalized === "hard" ? 1.14 : 1;
  }

  setPlayerName(name = "Anon") {
    const trimmed = String(name).trim();
    this.currentPlayer = trimmed ? trimmed.slice(0, 14) : "Anon";
  }

  start() {
    this.state = "running";
    this.statusText = "En juego";
    this.audio.ensure();
    this.updateHud();
    this.ensureLoop();
  }

  ensureLoop() {
    if (this.loopRunning) return;
    this.loopRunning = true;
    this.lastTick = 0;
    requestAnimationFrame((ts) => this.loop(ts));
  }

  pauseToggle() {
    if (this.state === "running") {
      this.state = "paused";
      this.statusText = "Pausa";
    } else if (this.state === "paused") {
      this.state = "running";
      this.statusText = "En juego";
      // loop keeps running; it checks state each frame
    }
    this.updateHud();
  }

  loop(timestamp) {
    try {
      this.frameCount += 1;

      if (this.state === "running") {
        if (!this.lastTick) this.lastTick = timestamp;
        const dt = clamp((timestamp - this.lastTick) / 1000, 0, 0.04);
        this.lastTick = timestamp;
        this.update(dt);
      } else {
        this.lastTick = timestamp; // keep lastTick current so no huge dt spike on resume
      }

      if (this.shouldRender(timestamp)) {
        this.render();
      }

      // Animate death/victory overlays
      if (this.deathAnim) {
        this.deathAnim.timer -= 1;
        if (this.deathAnim.timer <= 0) this.deathAnim = null;
      }
      if (this.victoryAnim) {
        this.victoryAnim.timer -= 1;
        if (this.victoryAnim.timer <= 0) this.victoryAnim = null;
      }
    } catch (err) {
      console.error("[NeonRush] loop error:", err);
      try {
        this.ctx.fillStyle = "#1a0000";
        this.ctx.fillRect(0, 0, 756, 80);
        this.ctx.fillStyle = "#ff4f5e";
        this.ctx.font = "bold 14px monospace";
        this.ctx.fillText("ERROR: " + err.message, 10, 30);
        this.ctx.font = "11px monospace";
        (err.stack || "").split("\n").slice(1, 3).forEach((l, i) =>
          this.ctx.fillText(l.trim(), 10, 50 + i * 16));
      } catch (_) {}
    }
    requestAnimationFrame((ts) => this.loop(ts));
  }

  shouldRender(timestamp) {
    // Full refresh while playing.
    if (this.state === "running") {
      this.lastRenderTimestamp = timestamp;
      return true;
    }

    // Throttle render when not playing to reduce CPU/GPU load.
    const intervalMs = (this.deathAnim || this.victoryAnim) ? 33 : 125;
    if (!this.lastRenderTimestamp || timestamp - this.lastRenderTimestamp >= intervalMs) {
      this.lastRenderTimestamp = timestamp;
      return true;
    }
    return false;
  }

  getDebugSnapshot() {
    return {
      state: this.state,
      statusText: this.statusText,
      playerReady: Boolean(this.player),
      ghostCount: this.ghosts?.length || 0,
      loopRunning: this.loopRunning,
      frameCount: this.frameCount,
      level: this.level,
      score: this.score,
    };
  }

  update(dt) {
    this.elapsed += dt;

    if (this.input.consumePause()) {
      this.pauseToggle();
      return;
    }

    const dir = this.input.consumeDirection();
    if (dir) {
      this.player.setDirection(dir);
    }

    this.ghostSlowTimer = Math.max(0, this.ghostSlowTimer - dt);
    this.frightTimer = Math.max(0, this.frightTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.updateBonusFruit(dt);

    this.player.update(dt, this);
    this.consumeCollectibles();

    for (const ghost of this.ghosts) {
      const baseAggression = this.getAggressionFactor();
      const slowFactor = this.ghostSlowTimer > 0 ? 0.66 : 1;

      if (ghost.mode !== "regenerating") {
        ghost.setMode(this.frightTimer > 0 ? "vulnerable" : "normal");
      }

      const modeFactor = ghost.mode === "vulnerable" ? 0.82 : ghost.mode === "regenerating" ? 1.18 : 1;
      ghost.speed = ghost.baseSpeed * baseAggression * slowFactor * modeFactor;
      ghost.update(dt, this);

      if (ghost.mode === "regenerating" && distance(ghost, this.ghostHouseCenter) < 0.6) {
        ghost.x = this.ghostHouseCenter.x;
        ghost.y = this.ghostHouseCenter.y;
        ghost.finishRegeneration(this.frightTimer > 0 ? "vulnerable" : "normal");
      }
    }

    this.resolveCollisions();

    if (this.pelletRemaining <= 0) {
      this.finishLevel();
    }

    this.updateHud();
  }

  finishLevel() {
    this.score += 350;
    this.ui.flash("win");

    if (this.level >= this.maxMvpLevel) {
      this.state = "victory";
      this.statusText = "Victoria";
      this.victoryAnim = { timer: 120 };
      this.audio.victory();
      this.ui.showOverlay({
        title: "Victoria Neon",
        text: "Superaste el MVP de Pac-Man Neon Rush. Puedes reiniciar para un nuevo laberinto procedural.",
        buttonText: "Reiniciar",
        onClick: () => this.restart(),
      });
      this.onRunEnd({ score: this.score, level: this.level, result: "victoria", player: this.currentPlayer });
      this.updateHud();
      return;
    }

    this.level += 1;
    this.state = "paused";
    this.audio.victory();
    this.ui.showOverlay({
      title: `Nivel ${this.level - 1} completado`,
      text: `Entrando al nivel ${this.level} con fantasmas más inteligentes...`,
      buttonText: "Continuar",
      onClick: () => {
        this.setupLevel(this.level);
        this.state = "running";
        this.ui.hideOverlay();
        this.updateHud();
        // loop already running via ensureLoop
      },
    });
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.elapsed = 0;
    this.deathAnim = null;
    this.victoryAnim = null;
    this.setupLevel(this.level);
    this.state = "running";
    this.ui.hideOverlay();
    this.render();
    this.updateHud();
    this.audio.ensure();
    this.ensureLoop();
  }

  isWalkable(x, y) {
    const xx = Math.round(this.wrapX(x));
    const yy = Math.round(y);
    if (yy < 0 || yy >= this.grid.length) {
      return false;
    }
    return this.grid[yy][xx] !== TILE.WALL;
  }

  canMoveTile(tile, dir) {
    const d = DIRS[dir];
    return this.isWalkable(tile.x + d.x, tile.y + d.y);
  }

  wrapX(x) {
    const w = this.grid.length;
    if (x < 0) {
      return w - 1 + x;
    }
    if (x > w - 1) {
      return x - w;
    }
    return x;
  }

  consumeCollectibles() {
    const tx = Math.round(this.player.x);
    const ty = Math.round(this.player.y);

    if (Math.abs(this.player.x - tx) > 0.18 || Math.abs(this.player.y - ty) > 0.18) {
      return;
    }

    const cell = this.grid[ty][tx];
    if (cell === TILE.PELLET) {
      this.grid[ty][tx] = TILE.EMPTY;
      this.pelletRemaining -= 1;
      this.score += 10;
      this.audio.pellet();
    }

    if (cell === TILE.ENERGIZER) {
      this.grid[ty][tx] = TILE.EMPTY;
      this.frightTimer = 7;
      this.score += 60;
      this.audio.powerUp();
    }

    for (const item of this.powerUps) {
      if (!item.active) {
        continue;
      }

      if (item.x === tx && item.y === ty) {
        this.activatePowerUp(item.type);
        item.active = false;
        this.score += 90;
        this.audio.powerUp();
      }
    }

    if (this.bonusFruit?.active && this.bonusFruit.x === tx && this.bonusFruit.y === ty) {
      this.score += this.bonusFruit.points;
      this.statusText = "Bonus de fruta";
      this.bonusFruit.active = false;
      this.fruitSpawnTimer = this.nextFruitSpawnTimer();
      this.audio.powerUp();
    }
  }

  nextFruitSpawnTimer() {
    return randInt(11, 19);
  }

  updateBonusFruit(dt) {
    if (this.bonusFruit?.active) {
      this.bonusFruit.timeLeft -= dt;
      this.bonusFruit.pulse += dt * 10;
      if (this.bonusFruit.timeLeft <= 0) {
        this.bonusFruit.active = false;
        this.fruitSpawnTimer = this.nextFruitSpawnTimer();
      }
      return;
    }

    this.fruitSpawnTimer -= dt;
    if (this.fruitSpawnTimer > 0) {
      return;
    }

    const cx = this.ghostHouseCenter.x;
    const cy = this.ghostHouseCenter.y;
    if (!this.isWalkable(cx, cy)) {
      this.fruitSpawnTimer = this.nextFruitSpawnTimer();
      return;
    }

    this.bonusFruit = {
      type: FRUIT_TYPES.CHERRY,
      x: cx,
      y: cy,
      points: 140 + this.level * 20,
      timeLeft: 8,
      pulse: 0,
      active: true,
    };
    this.statusText = "Fruta bonus en el centro";
  }

  activatePowerUp(type) {
    if (type === POWERUP_TYPES.SLOW) {
      this.ghostSlowTimer = Math.max(this.ghostSlowTimer, 7);
      this.statusText = "Power-up: Ralentizar";
      return;
    }

    if (type === POWERUP_TYPES.TELEPORT) {
      const target = this.findRandomSafeCell();
      this.player.x = target.x;
      this.player.y = target.y;
      this.statusText = "Power-up: Teletransporte";
      return;
    }

    if (type === POWERUP_TYPES.SHIELD) {
      this.shieldTimer = Math.max(this.shieldTimer, 8);
      this.statusText = "Power-up: Escudo";
    }
  }

  findRandomSafeCell() {
    const options = [];
    for (let y = 1; y < this.grid.length - 1; y += 1) {
      for (let x = 1; x < this.grid.length - 1; x += 1) {
        if (this.isWalkable(x, y)) {
          const distGhost = Math.min(...this.ghosts.map((g) => Math.hypot(g.x - x, g.y - y)));
          if (distGhost > 4) {
            options.push({ x, y });
          }
        }
      }
    }

    if (options.length === 0) {
      return { x: 1, y: 1 };
    }

    return choice(options);
  }

  resolveCollisions() {
    if (this.hitCooldown > 0) {
      return;
    }

    for (const ghost of this.ghosts) {
      if (ghost.mode === "regenerating") {
        continue;
      }

      const d = distance(this.player, ghost);
      if (d > 0.55) {
        continue;
      }

      if (ghost.mode === "vulnerable") {
        this.score += 200;
        ghost.startRegeneration();
        this.audio.powerUp();
        this.statusText = "Fantasma capturado";
        this.hitCooldown = 0.25;
        return;
      }

      if (this.shieldTimer > 0) {
        this.score += 40;
        ghost.startRegeneration();
        this.statusText = "Escudo activo";
        this.hitCooldown = 0.25;
        return;
      }

      this.handlePlayerHit();
      return;
    }
  }

  handlePlayerHit() {
    this.lives -= 1;
    this.ui.flash("lose");
    this.audio.hit();
    this.hitCooldown = 1;
    // Death animation: Pac-Man shrinks at current position
    this.deathAnim = { timer: 50, x: this.player.x, y: this.player.y };

    if (this.lives <= 0) {
      this.state = "gameover";
      this.statusText = "Derrota";
      this.ui.showOverlay({
        title: "Game Over",
        text: "Los fantasmas dominaron el laberinto. Reinicia para intentarlo de nuevo.",
        buttonText: "Reintentar",
        onClick: () => this.restart(),
      });
      this.onRunEnd({ score: this.score, level: this.level, result: "derrota", player: this.currentPlayer });
      this.updateHud();
      return;
    }

    this.statusText = "Golpe recibido";
    this.player.reset();
    for (const ghost of this.ghosts) {
      ghost.reset();
    }
  }

  getGhostTarget(ghost) {
    const playerTile = { x: Math.round(this.player.x), y: Math.round(this.player.y) };

    if (ghost.mode === "regenerating") {
      return this.ghostHouseCenter;
    }

    if (ghost.mode === "vulnerable") {
      return ghost.scatterTarget;
    }

    if (ghost.role === "blinky") {
      return playerTile;
    }

    if (ghost.role === "pinky") {
      const prediction = DIRS[this.player.dir] || { x: 0, y: 0 };
      return {
        x: clamp(playerTile.x + prediction.x * 4, 1, this.grid.length - 2),
        y: clamp(playerTile.y + prediction.y * 4, 1, this.grid.length - 2),
      };
    }

    if (ghost.role === "inky") {
      const prediction = DIRS[this.player.dir] || { x: 0, y: 0 };
      const lead = {
        x: clamp(playerTile.x + prediction.x * 2, 1, this.grid.length - 2),
        y: clamp(playerTile.y + prediction.y * 2, 1, this.grid.length - 2),
      };
      const blinky = this.ghosts.find((g) => g.role === "blinky") || this.ghosts[0];
      return {
        x: clamp(lead.x + (lead.x - Math.round(blinky.x)), 1, this.grid.length - 2),
        y: clamp(lead.y + (lead.y - Math.round(blinky.y)), 1, this.grid.length - 2),
      };
    }

    if (ghost.role === "clyde") {
      const d = Math.hypot(playerTile.x - ghost.x, playerTile.y - ghost.y);
      return d <= 5.5 ? ghost.scatterTarget : playerTile;
    }

    return playerTile;
  }

  getAggressionFactor() {
    const progress = 1 - this.pelletRemaining / this.totalPelletsInLevel;
    const lifeAssist = this.lives <= 1 ? -0.14 : 0;
    return clamp((1 + this.level * 0.085 + this.elapsed / 130 + progress * 0.42 + lifeAssist) * this.difficultyFactor, 0.94, 1.82);
  }

  getLevelProgress() {
    return 1 - this.pelletRemaining / this.totalPelletsInLevel;
  }

  countTotalCollectibles() {
    let total = 0;
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell === TILE.PELLET || cell === TILE.ENERGIZER) {
          total += 1;
        }
      }
    }
    return total;
  }

  updateHud() {
    const timedEffects = [];
    if (this.frightTimer > 0) {
      timedEffects.push("Energía");
    }
    if (this.ghostSlowTimer > 0) {
      timedEffects.push("Slow");
    }
    if (this.shieldTimer > 0) {
      timedEffects.push("Escudo");
    }

    const status = timedEffects.length > 0 ? `${this.statusText} • ${timedEffects.join("/")}` : this.statusText;
    this.ui.updateHUD({
      score: this.score,
      lives: this.lives,
      level: this.level,
      status,
      bestScore: this.getBestScore(),
      levelProgress: this.getLevelProgress(),
    });
  }

  drawTile(x, y, color, alpha = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * this.cellPx, y * this.cellPx, this.cellPx, this.cellPx);
    this.ctx.restore();
  }

  renderBoard() {
    this.ctx.clearRect(0, 0, 756, 756);

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const cell = this.grid[y][x];
        if (cell === TILE.WALL) {
          this.drawTile(x, y, "#102848");
          this.drawTile(x, y, "#1f4d7f", 0.27);
        }

        if (cell === TILE.PELLET || cell === TILE.ENERGIZER) {
          const radius = cell === TILE.PELLET ? this.cellPx * 0.07 : this.cellPx * 0.16;
          this.ctx.fillStyle = cell === TILE.ENERGIZER ? "#ffe083" : "#f2fdff";
          this.ctx.beginPath();
          this.ctx.arc((x + 0.5) * this.cellPx, (y + 0.5) * this.cellPx, radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    for (const item of this.powerUps) {
      if (!item.active) {
        continue;
      }

      item.pulse += 0.08;
      const radius = this.cellPx * (0.2 + Math.sin(item.pulse) * 0.03);
      this.ctx.fillStyle = POWERUP_COLORS[item.type];
      this.ctx.beginPath();
      this.ctx.arc((item.x + 0.5) * this.cellPx, (item.y + 0.5) * this.cellPx, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (this.bonusFruit?.active) {
      const cx = (this.bonusFruit.x + 0.5) * this.cellPx;
      const cy = (this.bonusFruit.y + 0.5) * this.cellPx;
      const radius = this.cellPx * (0.24 + Math.sin(this.bonusFruit.pulse) * 0.02);
      this.ctx.fillStyle = FRUIT_COLORS[this.bonusFruit.type];
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#ffdbe0";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 1.5, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  renderPlayer() {
    const cx = (this.player.x + 0.5) * this.cellPx;
    const cy = (this.player.y + 0.5) * this.cellPx;
    const radius = this.cellPx * this.player.radius;

    let angle = 0;
    if (this.player.dir === "right") angle = 0;
    if (this.player.dir === "left") angle = Math.PI;
    if (this.player.dir === "up") angle = -Math.PI / 2;
    if (this.player.dir === "down") angle = Math.PI / 2;

    const openness = (Math.sin(this.player.mouthAnim) + 1) * 0.22 + 0.08;

    this.ctx.fillStyle = "#ffd447";
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, radius, angle + openness, angle - openness + Math.PI * 2);
    this.ctx.closePath();
    this.ctx.fill();

    if (this.shieldTimer > 0) {
      this.ctx.strokeStyle = "#99ff7f";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  renderGhosts() {
    for (const ghost of this.ghosts) {
      const cx = (ghost.x + 0.5) * this.cellPx;
      const cy = (ghost.y + 0.5) * this.cellPx;
      const r = this.cellPx * 0.33;

      if (ghost.mode === "regenerating") {
        this.ctx.fillStyle = "#d8e9ff";
      } else if (ghost.mode === "vulnerable") {
        this.ctx.fillStyle = "#7ca8ff";
      } else {
        this.ctx.fillStyle = ghost.color;
      }
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
      this.ctx.rect(cx - r, cy, r * 2, r);
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.arc(cx - r * 0.35, cy - r * 0.1, r * 0.2, 0, Math.PI * 2);
      this.ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#081120";
      this.ctx.beginPath();
      this.ctx.arc(cx - r * 0.35, cy - r * 0.1, r * 0.09, 0, Math.PI * 2);
      this.ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.09, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  render() {
    this.renderBoard();
    if (this.player) {
      if (!this.deathAnim) {
        this.renderPlayer();
      } else {
        // Death animation: Pac-Man shrinks and closes mouth
        const progress = 1 - this.deathAnim.timer / 50;
        const cx = (this.deathAnim.x + 0.5) * this.cellPx;
        const cy = (this.deathAnim.y + 0.5) * this.cellPx;
        const radius = this.cellPx * 0.36 * (1 - progress);
        if (radius > 0) {
          this.ctx.fillStyle = "#ffd447";
          this.ctx.beginPath();
          const angle = progress * Math.PI;
          this.ctx.moveTo(cx, cy);
          this.ctx.arc(cx, cy, radius, angle, Math.PI * 2 - angle);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
    }
    if (this.ghosts && this.ghosts.length) this.renderGhosts();
    // Victory flash: bright overlay that fades
    if (this.victoryAnim) {
      const alpha = this.victoryAnim.timer / 120 * 0.45;
      this.ctx.fillStyle = `rgba(153,255,127,${alpha})`;
      this.ctx.fillRect(0, 0, 756, 756);
    }
  }
}
