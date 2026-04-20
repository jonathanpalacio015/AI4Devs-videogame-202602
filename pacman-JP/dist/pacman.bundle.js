(() => {
  // src/constants.js
  var TILE = {
    WALL: 0,
    PELLET: 1,
    EMPTY: 2,
    ENERGIZER: 3
  };
  var DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  var DIR_KEYS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    KeyW: "up",
    KeyS: "down",
    KeyA: "left",
    KeyD: "right"
  };
  var POWERUP_TYPES = {
    SLOW: "slow",
    TELEPORT: "teleport",
    SHIELD: "shield"
  };
  var FRUIT_TYPES = {
    CHERRY: "cherry"
  };
  var POWERUP_COLORS = {
    [POWERUP_TYPES.SLOW]: "#7ef4ff",
    [POWERUP_TYPES.TELEPORT]: "#ffd447",
    [POWERUP_TYPES.SHIELD]: "#99ff7f"
  };
  var FRUIT_COLORS = {
    [FRUIT_TYPES.CHERRY]: "#ff4f5e"
  };
  var BOARD_SIZE = 21;

  // src/utils.js
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function choice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function shuffle(input2) {
    const array = [...input2];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // src/entities/ghost.js
  var CARDINALS = ["up", "down", "left", "right"];
  function keyFromPoint(point) {
    return `${point.x},${point.y}`;
  }
  function bfsNextDirection(start, target, game2) {
    const startNode = { x: game2.wrapX(start.x), y: start.y };
    const targetNode = { x: game2.wrapX(target.x), y: target.y };
    if (startNode.x === targetNode.x && startNode.y === targetNode.y) {
      return null;
    }
    const queue = [startNode];
    let queueIndex = 0;
    const visited = /* @__PURE__ */ new Set([keyFromPoint(startNode)]);
    const parent = /* @__PURE__ */ new Map();
    while (queueIndex < queue.length) {
      const current = queue[queueIndex];
      queueIndex += 1;
      if (current.x === targetNode.x && current.y === targetNode.y) {
        let trace = keyFromPoint(current);
        let prev = parent.get(trace);
        while (prev && prev !== keyFromPoint(startNode)) {
          trace = prev;
          prev = parent.get(trace);
        }
        const [x, y] = trace.split(",").map(Number);
        const dx = x - start.x;
        const dy = y - start.y;
        return CARDINALS.find((dir) => DIRS[dir].x === dx && DIRS[dir].y === dy) || null;
      }
      for (const dir of CARDINALS) {
        const nx = game2.wrapX(current.x + DIRS[dir].x);
        const ny = current.y + DIRS[dir].y;
        if (!game2.isWalkable(nx, ny)) {
          continue;
        }
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          visited.add(key);
          parent.set(key, keyFromPoint(current));
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return null;
  }
  var Ghost = class {
    constructor(spawn, profile, house) {
      this.spawn = { ...spawn };
      this.x = spawn.x;
      this.y = spawn.y;
      this.house = { ...house };
      this.dir = choice(CARDINALS);
      this.baseSpeed = 4.1;
      this.speed = this.baseSpeed;
      this.color = profile.color;
      this.id = profile.id;
      this.role = profile.role;
      this.name = profile.name;
      this.scatterTarget = { ...profile.scatterTarget };
      this.mode = "normal";
      this.repathInterval = 0.28;
      this.repathClock = Math.random() * this.repathInterval;
    }
    reset() {
      this.x = this.spawn.x;
      this.y = this.spawn.y;
      this.mode = "normal";
      this.dir = choice(CARDINALS);
      this.repathClock = Math.random() * this.repathInterval;
    }
    setMode(mode) {
      if (this.mode !== "regenerating") {
        this.mode = mode;
      }
    }
    startRegeneration() {
      this.mode = "regenerating";
    }
    finishRegeneration(nextMode = "normal") {
      this.mode = nextMode;
    }
    isCentered() {
      return Math.abs(this.x - Math.round(this.x)) < 0.08 && Math.abs(this.y - Math.round(this.y)) < 0.08;
    }
    getTile() {
      return { x: Math.round(this.x), y: Math.round(this.y) };
    }
    chooseDirection(game2) {
      const start = this.getTile();
      const target = game2.getGhostTarget(this, start);
      const routeDir = target ? bfsNextDirection(start, target, game2) : null;
      if (routeDir && game2.canMoveTile(start, routeDir)) {
        return routeDir;
      }
      const valid = CARDINALS.filter((dir) => game2.canMoveTile(start, dir));
      return valid.length > 0 ? choice(valid) : this.dir;
    }
    update(dt, game2) {
      this.repathClock += dt;
      if (this.isCentered()) {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        if (this.repathClock >= this.repathInterval) {
          this.dir = this.chooseDirection(game2);
          this.repathClock = 0;
        } else if (!game2.canMoveTile(this.getTile(), this.dir)) {
          this.dir = this.chooseDirection(game2);
        }
      }
      const vec = DIRS[this.dir];
      const amount = this.speed * dt;
      const nextX = this.x + vec.x * amount;
      const nextY = this.y + vec.y * amount;
      if (vec.x !== 0) {
        this.x = nextX;
        this.y = Math.round(this.y);
      } else {
        this.y = nextY;
        this.x = Math.round(this.x);
      }
      this.x = game2.wrapX(this.x);
    }
  };

  // src/entities/player.js
  var Player = class {
    constructor(spawn) {
      this.spawn = { ...spawn };
      this.x = spawn.x;
      this.y = spawn.y;
      this.dir = "right";
      this.nextDir = "right";
      this.baseSpeed = 5.2;
      this.speed = this.baseSpeed;
      this.radius = 0.36;
      this.mouthAnim = 0;
    }
    reset() {
      this.x = this.spawn.x;
      this.y = this.spawn.y;
      this.dir = "right";
      this.nextDir = "right";
    }
    setDirection(dir) {
      if (DIRS[dir]) {
        this.nextDir = dir;
      }
    }
    isCentered() {
      return Math.abs(this.x - Math.round(this.x)) < 0.08 && Math.abs(this.y - Math.round(this.y)) < 0.08;
    }
    canMove(dir, game2) {
      const d = DIRS[dir];
      if (!d) {
        return false;
      }
      const testX = Math.round(this.x) + d.x;
      const testY = Math.round(this.y) + d.y;
      return game2.isWalkable(testX, testY);
    }
    update(dt, game2) {
      if (this.isCentered()) {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        if (this.canMove(this.nextDir, game2)) {
          this.dir = this.nextDir;
        } else if (!this.canMove(this.dir, game2)) {
          return;
        }
      }
      const vec = DIRS[this.dir];
      const amount = this.speed * dt;
      const nextX = this.x + vec.x * amount;
      const nextY = this.y + vec.y * amount;
      if (vec.x !== 0) {
        this.x = nextX;
        this.y = Math.round(this.y);
      } else {
        this.y = nextY;
        this.x = Math.round(this.x);
      }
      this.x = game2.wrapX(this.x);
      this.mouthAnim += dt * 13;
    }
  };

  // src/maze.js
  function makeGrid(size) {
    return Array.from({ length: size }, () => Array(size).fill(TILE.WALL));
  }
  function inBounds(x, y, size) {
    return x > 0 && y > 0 && x < size - 1 && y < size - 1;
  }
  function carveMaze(size, level) {
    const grid = makeGrid(size);
    const stack = [{ x: 1, y: 1 }];
    grid[1][1] = TILE.EMPTY;
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const directions = shuffle(Object.values(DIRS));
      let carved = false;
      for (const dir of directions) {
        const nx = current.x + dir.x * 2;
        const ny = current.y + dir.y * 2;
        if (!inBounds(nx, ny, size) || grid[ny][nx] !== TILE.WALL) {
          continue;
        }
        grid[current.y + dir.y][current.x + dir.x] = TILE.EMPTY;
        grid[ny][nx] = TILE.EMPTY;
        stack.push({ x: nx, y: ny });
        carved = true;
        break;
      }
      if (!carved) {
        stack.pop();
      }
    }
    const loopCount = 14 + Math.min(level * 2, 14);
    for (let i = 0; i < loopCount; i += 1) {
      const x = randInt(1, size - 2);
      const y = randInt(1, size - 2);
      if (grid[y][x] === TILE.WALL) {
        const neighbors = [
          grid[y - 1][x],
          grid[y + 1][x],
          grid[y][x - 1],
          grid[y][x + 1]
        ];
        const openNeighbors = neighbors.filter((cell) => cell !== TILE.WALL).length;
        if (openNeighbors >= 2) {
          grid[y][x] = TILE.EMPTY;
        }
      }
    }
    const tunnelY = Math.floor(size / 2);
    grid[tunnelY][0] = TILE.EMPTY;
    grid[tunnelY][size - 1] = TILE.EMPTY;
    grid[tunnelY][1] = TILE.EMPTY;
    grid[tunnelY][size - 2] = TILE.EMPTY;
    return grid;
  }
  function clearGhostHouse(grid, center) {
    for (let y = center.y - 1; y <= center.y + 1; y += 1) {
      for (let x = center.x - 1; x <= center.x + 1; x += 1) {
        grid[y][x] = TILE.EMPTY;
      }
    }
  }
  function placePellets(grid, avoid) {
    let totalPellets = 0;
    for (let y = 0; y < grid.length; y += 1) {
      for (let x = 0; x < grid[y].length; x += 1) {
        if (grid[y][x] !== TILE.EMPTY) {
          continue;
        }
        const isAvoid = avoid.some((cell) => cell.x === x && cell.y === y);
        if (!isAvoid) {
          grid[y][x] = TILE.PELLET;
          totalPellets += 1;
        }
      }
    }
    return totalPellets;
  }
  function placeEnergizers(grid) {
    const candidates = [
      { x: 1, y: 1 },
      { x: grid.length - 2, y: 1 },
      { x: 1, y: grid.length - 2 },
      { x: grid.length - 2, y: grid.length - 2 }
    ];
    let count = 0;
    for (const cell of candidates) {
      if (grid[cell.y][cell.x] === TILE.PELLET) {
        grid[cell.y][cell.x] = TILE.ENERGIZER;
        count += 1;
      }
    }
    return count;
  }
  function findEmptyCells(grid, blockedCells) {
    const empty = [];
    for (let y = 1; y < grid.length - 1; y += 1) {
      for (let x = 1; x < grid.length - 1; x += 1) {
        const isBlocked = blockedCells.some((cell) => cell.x === x && cell.y === y);
        if (!isBlocked && grid[y][x] === TILE.PELLET) {
          empty.push({ x, y });
        }
      }
    }
    return empty;
  }
  function placePowerUps(grid, level, blockedCells) {
    const powerUps = [];
    const types = [POWERUP_TYPES.SLOW, POWERUP_TYPES.TELEPORT, POWERUP_TYPES.SHIELD];
    const placements = 2 + Math.min(level, 3);
    for (let i = 0; i < placements; i += 1) {
      const candidates = findEmptyCells(grid, blockedCells);
      if (candidates.length === 0) {
        break;
      }
      const cell = choice(candidates);
      powerUps.push({
        type: choice(types),
        x: cell.x,
        y: cell.y,
        active: true,
        pulse: Math.random() * Math.PI
      });
    }
    return powerUps;
  }
  function generateLevel(level = 1) {
    const size = BOARD_SIZE;
    const grid = carveMaze(size, level);
    const playerSpawn = { x: 1, y: 1 };
    const ghostCenter = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
    clearGhostHouse(grid, ghostCenter);
    const ghostSpawns = [
      { x: ghostCenter.x, y: ghostCenter.y },
      { x: ghostCenter.x - 1, y: ghostCenter.y },
      { x: ghostCenter.x + 1, y: ghostCenter.y },
      { x: ghostCenter.x, y: ghostCenter.y + 1 }
    ];
    const avoid = [playerSpawn, ...ghostSpawns];
    let pelletCount = placePellets(grid, avoid);
    pelletCount -= placeEnergizers(grid);
    const powerUps = placePowerUps(grid, level, avoid);
    return {
      size,
      grid,
      playerSpawn,
      ghostSpawns,
      ghostHouseCenter: ghostCenter,
      powerUps,
      pelletCount
    };
  }

  // src/game.js
  var GHOST_PROFILES = [
    { id: 0, name: "Blinky", role: "blinky", color: "#ff4f5e", scatterTarget: { x: 19, y: 1 } },
    { id: 1, name: "Pinky", role: "pinky", color: "#ff8fc2", scatterTarget: { x: 1, y: 1 } },
    { id: 2, name: "Inky", role: "inky", color: "#4be5ff", scatterTarget: { x: 19, y: 19 } },
    { id: 3, name: "Clyde", role: "clyde", color: "#ffb347", scatterTarget: { x: 1, y: 19 } }
  ];
  var Game = class {
    constructor({ canvas: canvas2, ui: ui2, audio: audio2, input: input2, getBestScore = () => 0, onRunEnd = () => {
    } }) {
      this.canvas = canvas2;
      this.ctx = canvas2.getContext("2d");
      this.ui = ui2;
      this.audio = audio2;
      this.input = input2;
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
      this.stageTimeLimit = 120;
      this.stageTimeRemaining = 120;
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
      this.cellPx = 756 / BOARD_SIZE;
      this.loopRunning = false;
      this.deathAnim = null;
      this.victoryAnim = null;
      this.lastRenderTimestamp = 0;
      this.idleLoopDelayMs = 90;
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
      this.stageTimeLimit = this.getStageTimeLimit(level);
      this.stageTimeRemaining = this.stageTimeLimit;
      this.updateHud();
    }
    getStageTimeLimit(level) {
      const baseTimes = [120, 100, 85];
      const base = baseTimes[Math.min(level - 1, baseTimes.length - 1)];
      const diffFactor = this.difficulty === "easy" ? 1.4 : this.difficulty === "hard" ? 0.7 : 1;
      return Math.round(base * diffFactor);
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
      }
      this.updateHud();
    }
    loop(timestamp) {
      try {
        if (this.state === "running") {
          if (!this.lastTick) this.lastTick = timestamp;
          const dt = clamp((timestamp - this.lastTick) / 1e3, 0, 0.04);
          this.lastTick = timestamp;
          this.update(dt);
        } else {
          this.lastTick = timestamp;
        }
        if (this.shouldRender(timestamp)) {
          this.render();
        }
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
          (err.stack || "").split("\n").slice(1, 3).forEach((l, i) => this.ctx.fillText(l.trim(), 10, 50 + i * 16));
        } catch (_) {
        }
      }
      this.scheduleNextLoop();
    }
    scheduleNextLoop() {
      if (this.state === "running") {
        requestAnimationFrame((ts) => this.loop(ts));
        return;
      }
      setTimeout(() => {
        requestAnimationFrame((ts) => this.loop(ts));
      }, this.idleLoopDelayMs);
    }
    shouldRender(timestamp) {
      if (this.state === "running") {
        this.lastRenderTimestamp = timestamp;
        return true;
      }
      const intervalMs = this.deathAnim || this.victoryAnim ? 33 : 125;
      if (!this.lastRenderTimestamp || timestamp - this.lastRenderTimestamp >= intervalMs) {
        this.lastRenderTimestamp = timestamp;
        return true;
      }
      return false;
    }
    update(dt) {
      this.elapsed += dt;
      this.stageTimeRemaining = Math.max(0, this.stageTimeRemaining - dt);
      if (this.stageTimeRemaining <= 0) {
        this.handleTimeOut();
        return;
      }
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
      const baseAggression = this.getAggressionFactor();
      for (const ghost of this.ghosts) {
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
          text: "Superaste el MVP de Sir-pac. Puedes reiniciar para un nuevo laberinto procedural.",
          buttonText: "Reiniciar",
          onClick: () => this.restart()
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
        text: `Entrando al nivel ${this.level} con fantasmas m\xE1s inteligentes...`,
        buttonText: "Continuar",
        onClick: () => {
          this.setupLevel(this.level);
          this.state = "running";
          this.ui.hideOverlay();
          this.updateHud();
        }
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
      var _a;
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
      if (((_a = this.bonusFruit) == null ? void 0 : _a.active) && this.bonusFruit.x === tx && this.bonusFruit.y === ty) {
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
      var _a;
      if ((_a = this.bonusFruit) == null ? void 0 : _a.active) {
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
        active: true
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
    handleTimeOut() {
      this.statusText = "\xA1Tiempo agotado!";
      this.handlePlayerHit();
      if (this.lives > 0) {
        this.stageTimeRemaining = this.getStageTimeLimit(this.level);
      }
    }
    handlePlayerHit() {
      this.lives -= 1;
      this.ui.flash("lose");
      this.audio.hit();
      this.hitCooldown = 1;
      this.deathAnim = { timer: 50, x: this.player.x, y: this.player.y };
      if (this.lives <= 0) {
        this.state = "gameover";
        this.statusText = "Derrota";
        this.ui.showOverlay({
          title: "Game Over",
          text: "Los fantasmas dominaron el laberinto. Reinicia para intentarlo de nuevo.",
          buttonText: "Reintentar",
          onClick: () => this.restart()
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
          y: clamp(playerTile.y + prediction.y * 4, 1, this.grid.length - 2)
        };
      }
      if (ghost.role === "inky") {
        const prediction = DIRS[this.player.dir] || { x: 0, y: 0 };
        const lead = {
          x: clamp(playerTile.x + prediction.x * 2, 1, this.grid.length - 2),
          y: clamp(playerTile.y + prediction.y * 2, 1, this.grid.length - 2)
        };
        const blinky = this.ghosts.find((g) => g.role === "blinky") || this.ghosts[0];
        return {
          x: clamp(lead.x + (lead.x - Math.round(blinky.x)), 1, this.grid.length - 2),
          y: clamp(lead.y + (lead.y - Math.round(blinky.y)), 1, this.grid.length - 2)
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
        timedEffects.push("Energ\xEDa");
      }
      if (this.ghostSlowTimer > 0) {
        timedEffects.push("Slow");
      }
      if (this.shieldTimer > 0) {
        timedEffects.push("Escudo");
      }
      const status = timedEffects.length > 0 ? `${this.statusText} \u2022 ${timedEffects.join("/")}` : this.statusText;
      this.ui.updateHUD({
        score: this.score,
        lives: this.lives,
        level: this.level,
        status,
        bestScore: this.getBestScore(),
        levelProgress: this.getLevelProgress(),
        timeRemaining: this.stageTimeRemaining
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
      var _a;
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
      if ((_a = this.bonusFruit) == null ? void 0 : _a.active) {
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
      if (this.victoryAnim) {
        const alpha = this.victoryAnim.timer / 120 * 0.45;
        this.ctx.fillStyle = `rgba(153,255,127,${alpha})`;
        this.ctx.fillRect(0, 0, 756, 756);
      }
    }
  };

  // src/systems/audio.js
  var AudioSystem = class {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.enabled = true;
    }
    ensure() {
      if (!this.enabled) {
        return;
      }
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.11;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }
    beep({ frequency = 440, duration = 0.08, type = "square", volume = 0.2 }) {
      this.ensure();
      if (!this.ctx || !this.master) {
        return;
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(frequency, now);
      osc.type = type;
      gain.gain.setValueAtTime(1e-3, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(1e-3, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration);
    }
    pellet() {
      this.beep({ frequency: 660, duration: 0.05, type: "triangle", volume: 0.08 });
    }
    powerUp() {
      this.beep({ frequency: 330, duration: 0.09, type: "sawtooth", volume: 0.14 });
      this.beep({ frequency: 740, duration: 0.08, type: "triangle", volume: 0.14 });
    }
    hit() {
      this.beep({ frequency: 170, duration: 0.2, type: "square", volume: 0.18 });
    }
    victory() {
      this.beep({ frequency: 520, duration: 0.08, type: "triangle", volume: 0.14 });
      this.beep({ frequency: 690, duration: 0.1, type: "triangle", volume: 0.14 });
      this.beep({ frequency: 890, duration: 0.11, type: "triangle", volume: 0.14 });
    }
  };

  // src/systems/input.js
  var InputSystem = class {
    constructor() {
      this.currentDir = null;
      this.pauseRequested = false;
    }
    isEditableTarget(target) {
      if (!target) {
        return false;
      }
      const tag = target.tagName;
      return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }
    bind({ mobileRoot, pauseBtn: pauseBtn2 }) {
      window.addEventListener("keydown", (event) => {
        if (this.isEditableTarget(event.target)) {
          return;
        }
        if (DIR_KEYS[event.code]) {
          this.currentDir = DIR_KEYS[event.code];
          event.preventDefault();
        }
        if (event.code === "Space") {
          this.pauseRequested = true;
          event.preventDefault();
        }
      });
      if (mobileRoot) {
        mobileRoot.querySelectorAll("[data-dir]").forEach((btn) => {
          btn.addEventListener("pointerdown", () => {
            this.currentDir = btn.dataset.dir;
          });
        });
      }
      let touchStartX = 0;
      let touchStartY = 0;
      window.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
      }, { passive: true });
      window.addEventListener("touchend", (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.currentDir = dx > 0 ? "right" : "left";
        } else {
          this.currentDir = dy > 0 ? "down" : "up";
        }
      }, { passive: true });
      if (pauseBtn2) {
        pauseBtn2.addEventListener("click", () => {
          this.pauseRequested = true;
        });
      }
    }
    consumeDirection() {
      const dir = this.currentDir;
      this.currentDir = null;
      return dir;
    }
    consumePause() {
      const pause = this.pauseRequested;
      this.pauseRequested = false;
      return pause;
    }
  };

  // src/systems/leaderboard.js
  var STORAGE_KEY = "pacman-neon-rush-scores";
  function safeDate() {
    const now = /* @__PURE__ */ new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  var LeaderboardSystem = class {
    constructor(limit = 5) {
      this.limit = limit;
      this.scores = this.load();
    }
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return [];
        }
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) {
          return [];
        }
        return data.filter((item) => Number.isFinite(item.score) && Number.isFinite(item.level)).map((item) => ({
          player: typeof item.player === "string" && item.player.trim() ? item.player.trim().slice(0, 14) : "Anon",
          score: item.score,
          level: item.level,
          result: item.result || "partida",
          date: item.date || safeDate()
        })).sort((a, b) => b.score - a.score).slice(0, this.limit);
      } catch (e) {
        return [];
      }
    }
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
    }
    add({ score, level, result, player }) {
      this.scores.push({
        player: typeof player === "string" && player.trim() ? player.trim().slice(0, 14) : "Anon",
        score,
        level,
        result,
        date: safeDate()
      });
      this.scores.sort((a, b) => b.score - a.score);
      this.scores = this.scores.slice(0, this.limit);
      this.persist();
    }
    clear() {
      this.scores = [];
      this.persist();
    }
    getBestScore() {
      return this.scores.length > 0 ? this.scores[0].score : 0;
    }
    getAll() {
      return [...this.scores];
    }
  };

  // src/systems/ui.js
  var UISystem = class {
    constructor() {
      this.scoreValue = document.getElementById("scoreValue");
      this.livesValue = document.getElementById("livesValue");
      this.levelValue = document.getElementById("levelValue");
      this.statusValue = document.getElementById("statusValue");
      this.bestValue = document.getElementById("bestValue");
      this.timerValue = document.getElementById("timerValue");
      this.progressValue = document.getElementById("progressValue");
      this.progressFill = document.getElementById("progressFill");
      this.progressTrack = document.querySelector(".progress-track");
      this.leaderboardList = document.getElementById("leaderboardList");
      this.overlay = document.getElementById("overlay");
      this.overlayTitle = document.getElementById("overlayTitle");
      this.overlayText = document.getElementById("overlayText");
      this.overlayButton = document.getElementById("overlayButton");
      this.gameWrap = document.querySelector(".game-wrap");
    }
    updateHUD({ score, lives, level, status, bestScore = 0, levelProgress = 0, timeRemaining = 0 }) {
      this.scoreValue.textContent = String(score);
      this.livesValue.textContent = String(lives);
      this.levelValue.textContent = String(level);
      this.statusValue.textContent = status;
      this.bestValue.textContent = String(bestScore);
      const mins = Math.floor(timeRemaining / 60);
      const secs = Math.floor(timeRemaining % 60);
      this.timerValue.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
      this.timerValue.classList.toggle("timer-urgent", timeRemaining > 0 && timeRemaining <= 10);
      const progress = Math.max(0, Math.min(100, Math.round(levelProgress * 100)));
      this.progressValue.textContent = `${progress}%`;
      this.progressFill.style.width = `${progress}%`;
      this.progressTrack.setAttribute("aria-valuenow", String(progress));
    }
    renderLeaderboard(entries) {
      this.leaderboardList.innerHTML = "";
      if (!entries || entries.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Sin registros a\xFAn";
        this.leaderboardList.append(li);
        return;
      }
      for (const entry of entries) {
        const li = document.createElement("li");
        li.textContent = `${entry.player} \u2022 ${entry.score} pts \u2022 Nivel ${entry.level} \u2022 ${entry.result} \u2022 ${entry.date}`;
        this.leaderboardList.append(li);
      }
    }
    showOverlay({ title, text, buttonText = "Continuar", onClick }) {
      this.overlayTitle.textContent = title;
      this.overlayText.textContent = text;
      this.overlayButton.textContent = buttonText;
      this.overlay.classList.remove("hidden");
      this.overlayButton.onclick = () => {
        this.overlay.classList.add("hidden");
        if (onClick) {
          onClick();
        }
      };
    }
    hideOverlay() {
      this.overlay.classList.add("hidden");
    }
    flash(kind) {
      const className = kind === "win" ? "flash-win" : "flash-lose";
      this.gameWrap.classList.remove("flash-win", "flash-lose");
      this.gameWrap.classList.add(className);
      setTimeout(() => {
        this.gameWrap.classList.remove(className);
      }, 900);
    }
  };

  // src/main.js
  var canvas = document.getElementById("gameCanvas");
  var startBtn = document.getElementById("startBtn");
  var howBtn = document.getElementById("howBtn");
  var closeHelpBtn = document.getElementById("closeHelpBtn");
  var helpPanel = document.getElementById("helpPanel");
  var menu = document.getElementById("menu");
  var mobileControls = document.getElementById("mobileControls");
  var pauseBtn = document.getElementById("pauseBtn");
  var clearRankingBtn = document.getElementById("clearRankingBtn");
  var playerNameInput = document.getElementById("playerNameInput");
  var difficultySelect = document.getElementById("difficultySelect");
  var menuNotice = document.getElementById("menuNotice");
  var gameWrap = document.querySelector(".game-wrap");
  var ui = new UISystem();
  var audio = new AudioSystem();
  var input = new InputSystem();
  var leaderboard = new LeaderboardSystem(5);
  var game = null;
  var started = false;
  function setMenuNotice(message = "", tone = "error") {
    if (!menuNotice) {
      return;
    }
    menuNotice.textContent = message;
    menuNotice.classList.toggle("hidden", !message);
    menuNotice.classList.toggle("info", tone === "info");
  }
  function hideMenu() {
    menu.classList.add("hidden");
  }
  function showMenu() {
    menu.classList.remove("hidden");
  }
  function focusGameView() {
    if (!gameWrap) {
      return;
    }
    gameWrap.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
  function ensureGame() {
    if (game) {
      return game;
    }
    game = new Game({
      canvas,
      ui,
      audio,
      input,
      getBestScore: () => leaderboard.getBestScore(),
      onRunEnd: (result) => {
        leaderboard.add(result);
        ui.renderLeaderboard(leaderboard.getAll());
      }
    });
    return game;
  }
  function startGame(event) {
    event == null ? void 0 : event.preventDefault();
    if (started) {
      return;
    }
    try {
      const activeGame = ensureGame();
      started = true;
      setMenuNotice("");
      helpPanel.classList.add("hidden");
      hideMenu();
      ui.hideOverlay();
      activeGame.setPlayerName(playerNameInput.value);
      activeGame.setDifficulty(difficultySelect.value);
      activeGame.restart();
      focusGameView();
    } catch (error) {
      started = false;
      console.error("[NeonRush] bootstrap/start error:", error);
      setMenuNotice(`No se pudo iniciar el juego: ${error.message}`);
      showMenu();
    }
  }
  function openHowToPlay(event) {
    event == null ? void 0 : event.preventDefault();
    helpPanel.classList.remove("hidden");
  }
  input.bind({ mobileRoot: mobileControls, pauseBtn });
  ui.renderLeaderboard(leaderboard.getAll());
  if (startBtn) {
    startBtn.addEventListener("click", startGame);
  }
  playerNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      startGame(event);
    }
  });
  difficultySelect.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      startGame(event);
    }
  });
  if (howBtn) {
    howBtn.addEventListener("click", openHowToPlay);
  }
  if (closeHelpBtn) {
    closeHelpBtn.addEventListener("click", () => {
      helpPanel.classList.add("hidden");
    });
  }
  if (clearRankingBtn) {
    clearRankingBtn.addEventListener("click", () => {
      leaderboard.clear();
      ui.renderLeaderboard(leaderboard.getAll());
      game == null ? void 0 : game.updateHud();
    });
  }
  setMenuNotice("Pulsa 'Jugar ahora' para cargar el laberinto.", "info");
  try {
    ensureGame();
    setMenuNotice("Pulsa 'Jugar ahora' para iniciar la partida.", "info");
  } catch (error) {
    console.error("[NeonRush] preload error:", error);
    setMenuNotice(`Carga inicial incompleta: ${error.message}`);
  }
})();
