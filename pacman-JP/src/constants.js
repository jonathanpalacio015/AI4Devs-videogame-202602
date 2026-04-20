export const TILE = {
  WALL: 0,
  PELLET: 1,
  EMPTY: 2,
  ENERGIZER: 3,
};

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const DIR_KEYS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export const POWERUP_TYPES = {
  SLOW: "slow",
  TELEPORT: "teleport",
  SHIELD: "shield",
};

export const FRUIT_TYPES = {
  CHERRY: "cherry",
};

export const POWERUP_COLORS = {
  [POWERUP_TYPES.SLOW]: "#7ef4ff",
  [POWERUP_TYPES.TELEPORT]: "#ffd447",
  [POWERUP_TYPES.SHIELD]: "#99ff7f",
};

export const FRUIT_COLORS = {
  [FRUIT_TYPES.CHERRY]: "#ff4f5e",
};

export const BOARD_SIZE = 21;
