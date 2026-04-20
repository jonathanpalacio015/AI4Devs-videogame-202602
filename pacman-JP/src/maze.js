import { BOARD_SIZE, DIRS, POWERUP_TYPES, TILE } from "./constants.js";
import { choice, randInt, shuffle } from "./utils.js";

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
        grid[y][x + 1],
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
    { x: grid.length - 2, y: grid.length - 2 },
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
      pulse: Math.random() * Math.PI,
    });
  }

  return powerUps;
}

export function generateLevel(level = 1) {
  const size = BOARD_SIZE;
  const grid = carveMaze(size, level);

  const playerSpawn = { x: 1, y: 1 };
  const ghostCenter = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  clearGhostHouse(grid, ghostCenter);

  const ghostSpawns = [
    { x: ghostCenter.x, y: ghostCenter.y },
    { x: ghostCenter.x - 1, y: ghostCenter.y },
    { x: ghostCenter.x + 1, y: ghostCenter.y },
    { x: ghostCenter.x, y: ghostCenter.y + 1 },
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
    pelletCount,
  };
}
