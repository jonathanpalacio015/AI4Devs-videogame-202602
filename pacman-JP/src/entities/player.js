import { DIRS } from "../constants.js";

export class Player {
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

  canMove(dir, game) {
    const d = DIRS[dir];
    if (!d) {
      return false;
    }

    const testX = Math.round(this.x) + d.x;
    const testY = Math.round(this.y) + d.y;
    return game.isWalkable(testX, testY);
  }

  update(dt, game) {
    if (this.isCentered()) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);

      if (this.canMove(this.nextDir, game)) {
        this.dir = this.nextDir;
      } else if (!this.canMove(this.dir, game)) {
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

    this.x = game.wrapX(this.x);
    this.mouthAnim += dt * 13;
  }
}
