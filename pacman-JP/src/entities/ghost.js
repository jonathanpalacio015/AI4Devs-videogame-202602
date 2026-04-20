import { DIRS } from "../constants.js";
import { choice } from "../utils.js";

const CARDINALS = ["up", "down", "left", "right"];

function keyFromPoint(point) {
  return `${point.x},${point.y}`;
}

function bfsNextDirection(start, target, game) {
  if (start.x === target.x && start.y === target.y) {
    return null;
  }

  const queue = [start];
  let queueIndex = 0;
  const visited = new Set([keyFromPoint(start)]);
  const parent = new Map();

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;

    if (current.x === target.x && current.y === target.y) {
      let trace = keyFromPoint(current);
      let prev = parent.get(trace);
      while (prev && prev !== keyFromPoint(start)) {
        trace = prev;
        prev = parent.get(trace);
      }

      const [x, y] = trace.split(",").map(Number);
      const dx = x - start.x;
      const dy = y - start.y;
      return CARDINALS.find((dir) => DIRS[dir].x === dx && DIRS[dir].y === dy) || null;
    }

    for (const dir of CARDINALS) {
      const nx = current.x + DIRS[dir].x;
      const ny = current.y + DIRS[dir].y;
      if (!game.isWalkable(nx, ny)) {
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

export class Ghost {
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

  chooseDirection(game) {
    const start = this.getTile();
    const target = game.getGhostTarget(this, start);
    const routeDir = target ? bfsNextDirection(start, target, game) : null;

    if (routeDir && game.canMoveTile(start, routeDir)) {
      return routeDir;
    }

    const valid = CARDINALS.filter((dir) => game.canMoveTile(start, dir));
    return valid.length > 0 ? choice(valid) : this.dir;
  }

  update(dt, game) {
    this.repathClock += dt;
    if (this.isCentered()) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);

      if (this.repathClock >= this.repathInterval) {
        this.dir = this.chooseDirection(game);
        this.repathClock = 0;
      } else if (!game.canMoveTile(this.getTile(), this.dir)) {
        this.dir = this.chooseDirection(game);
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

    this.x = game.wrapX(this.x);
  }
}
