import { DIRS, POWERUP_COLORS, POWERUP_TYPES, TILE } from "./constants.js";
import { Ghost } from "./entities/ghost.js";
import { Player } from "./entities/player.js";
import { generateLevel } from "./maze.js";
import { clamp, choice, distance, randInt } from "./utils.js";

const GHOST_COLORS = ["#ff5e8f", "#7ef4ff", "#ffd447", "#c28fff"];

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
    this.player = null;
    this.ghosts = [];

    this.ghostSlowTimer = 0;
    this.frightTimer = 0;
    this.shieldTimer = 0;
    this.hitCooldown = 0;

    this.lastTick = 0;
    this.cellPx = 32;
    this.resizeObserver = null;

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.resize(), 100);
    });
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
      if (this.canvas.parentElement) {
        this.resizeObserver.observe(this.canvas.parentElement);
      }
    }
    this.setupLevel(this.level);
    this.render();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssSize = Math.min(this.canvas.clientWidth || 756, this.canvas.clientHeight || 756);
    this.canvas.width = Math.floor(cssSize * dpr);
    this.canvas.height = Math.floor(cssSize * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.grid.length > 0) {
      this.cellPx = cssSize / this.grid.length;
      this.render();
    }
  }

  setupLevel(level) {
    const data = generateLevel(level);
    this.grid = data.grid;
    this.powerUps = data.powerUps;
    this.pelletRemaining = data.pelletCount;
    this.totalPelletsInLevel = Math.max(1, data.pelletCount);

    this.player = new Player(data.playerSpawn);
    this.ghosts = data.ghostSpawns.map((spawn, idx) => new Ghost(spawn, GHOST_COLORS[idx % GHOST_COLORS.length], idx));

    const cssSize = Math.min(this.canvas.clientWidth || 756, this.canvas.clientHeight || 756);
    this.cellPx = cssSize / this.grid.length;
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
    requestAnimationFrame((ts) => this.loop(ts));
  }

  pauseToggle() {
    if (this.state === "running") {
      this.state = "paused";
      this.statusText = "Pausa";
    } else if (this.state === "paused") {
      this.state = "running";
      this.statusText = "En juego";
      requestAnimationFrame((ts) => this.loop(ts));
    }
    this.updateHud();
  }

  loop(timestamp) {
    if (this.state !== "running") {
      this.render();
      requestAnimationFrame((ts) => this.loop(ts));
      return;
    }

    if (!this.lastTick) {
      this.lastTick = timestamp;
    }

    const dt = clamp((timestamp - this.lastTick) / 1000, 0, 0.04);
    this.lastTick = timestamp;

    this.update(dt);
    this.render();
    requestAnimationFrame((ts) => this.loop(ts));
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

    this.player.update(dt, this);
    this.consumeCollectibles();

    for (const ghost of this.ghosts) {
      const baseAggression = this.getAggressionFactor();
      const slowFactor = this.ghostSlowTimer > 0 ? 0.66 : 1;
      const frightFactor = this.frightTimer > 0 ? 0.82 : 1;
      ghost.speed = ghost.baseSpeed * baseAggression * slowFactor * frightFactor;
      ghost.update(dt, this);
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
        this.lastTick = 0;
        this.updateHud();
        requestAnimationFrame((ts) => this.loop(ts));
      },
    });
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.elapsed = 0;
    this.setupLevel(this.level);
    this.state = "running";
    this.lastTick = 0;
    this.ui.hideOverlay();
    this.updateHud();
    requestAnimationFrame((ts) => this.loop(ts));
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
      const d = distance(this.player, ghost);
      if (d > 0.55) {
        continue;
      }

      if (this.frightTimer > 0) {
        this.score += 200;
        ghost.reset();
        this.audio.powerUp();
        this.statusText = "Fantasma capturado";
        this.hitCooldown = 0.25;
        return;
      }

      if (this.shieldTimer > 0) {
        this.score += 40;
        ghost.reset();
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
    const cornerTargets = [
      { x: 1, y: 1 },
      { x: this.grid.length - 2, y: 1 },
      { x: 1, y: this.grid.length - 2 },
      { x: this.grid.length - 2, y: this.grid.length - 2 },
    ];

    if (this.frightTimer > 0) {
      return cornerTargets[(ghost.id + randInt(0, 3)) % cornerTargets.length];
    }

    const aggression = this.getAggressionFactor();
    if (aggression > 1.35) {
      const prediction = DIRS[this.player.dir] || { x: 0, y: 0 };
      return {
        x: clamp(playerTile.x + prediction.x * 2, 1, this.grid.length - 2),
        y: clamp(playerTile.y + prediction.y * 2, 1, this.grid.length - 2),
      };
    }

    if (ghost.id % 2 === 0) {
      return playerTile;
    }

    return cornerTargets[(ghost.id + this.level) % cornerTargets.length];
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
    const size = this.grid.length;
    const side = size * this.cellPx;
    this.ctx.clearRect(0, 0, side, side);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
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

      this.ctx.fillStyle = this.frightTimer > 0 ? "#7ca8ff" : ghost.color;
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
    this.renderPlayer();
    this.renderGhosts();
  }
}
