import { Game } from "./game.js";
import { AudioSystem } from "./systems/audio.js";
import { InputSystem } from "./systems/input.js";
import { LeaderboardSystem } from "./systems/leaderboard.js";
import { UISystem } from "./systems/ui.js";

const canvas = document.getElementById("gameCanvas");
const startBtn = document.getElementById("startBtn");
const howBtn = document.getElementById("howBtn");
const closeHelpBtn = document.getElementById("closeHelpBtn");
const helpPanel = document.getElementById("helpPanel");
const menu = document.getElementById("menu");
const mobileControls = document.getElementById("mobileControls");
const pauseBtn = document.getElementById("pauseBtn");
const clearRankingBtn = document.getElementById("clearRankingBtn");
const playerNameInput = document.getElementById("playerNameInput");
const difficultySelect = document.getElementById("difficultySelect");
const menuNotice = document.getElementById("menuNotice");
const gameWrap = document.querySelector(".game-wrap");

const ui = new UISystem();
const audio = new AudioSystem();
const input = new InputSystem();
const leaderboard = new LeaderboardSystem(5);

let game = null;
let started = false;
let clickCount = 0;
let startAttempts = 0;
let lastError = "none";

function createDiagPanel() {
  const panel = document.createElement("aside");
  panel.id = "diagPanel";
  panel.setAttribute("aria-live", "polite");
  panel.style.position = "fixed";
  panel.style.right = "8px";
  panel.style.bottom = "8px";
  panel.style.zIndex = "99999";
  panel.style.width = "min(92vw, 360px)";
  panel.style.maxHeight = "42vh";
  panel.style.overflow = "auto";
  panel.style.padding = "8px 10px";
  panel.style.borderRadius = "10px";
  panel.style.border = "1px solid rgba(255,79,140,0.45)";
  panel.style.background = "rgba(4,10,22,0.92)";
  panel.style.color = "#f4f7ff";
  panel.style.font = "12px/1.35 monospace";
  panel.textContent = "DIAG booting...";
  document.body.append(panel);
  return panel;
}

const diagPanel = createDiagPanel();

function getSnapshot() {
  const snap = game?.getDebugSnapshot?.();
  return {
    state: snap?.state || "no-game",
    playerReady: Boolean(snap?.playerReady),
    ghostCount: snap?.ghostCount ?? 0,
    frameCount: snap?.frameCount ?? 0,
    statusText: snap?.statusText || "n/a",
    loopRunning: Boolean(snap?.loopRunning),
  };
}

function paintDiag(reason = "tick") {
  if (!diagPanel) return;
  const s = getSnapshot();
  const menuVisible = menu ? !menu.classList.contains("hidden") : false;
  diagPanel.textContent = [
    "DIAG MODE ON",
    `reason=${reason}`,
    `clicks=${clickCount} startAttempts=${startAttempts}`,
    `menuVisible=${menuVisible} started=${started}`,
    `state=${s.state} loop=${s.loopRunning} frame=${s.frameCount}`,
    `playerReady=${s.playerReady} ghosts=${s.ghostCount}`,
    `status=${s.statusText}`,
    `lastError=${lastError}`,
  ].join("\n");
}

window.addEventListener("error", (event) => {
  lastError = `${event.message} @${event.filename}:${event.lineno}`;
  paintDiag("window.error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason?.message || String(event.reason);
  lastError = `promise: ${reason}`;
  paintDiag("unhandledrejection");
});

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
    block: "center",
  });
}

function ensureGame() {
  if (game) {
    paintDiag("ensureGame.cached");
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
    },
  });
  paintDiag("ensureGame.created");
  return game;
}

function startGame(event) {
  event?.preventDefault();
  startAttempts += 1;
  paintDiag("startGame.called");
  if (started) {
    paintDiag("startGame.already-started");
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
    paintDiag("startGame.success");
    focusGameView();
  } catch (error) {
    started = false;
    console.error("[NeonRush] bootstrap/start error:", error);
    setMenuNotice(`No se pudo iniciar el juego: ${error.message}`);
    showMenu();
    lastError = error?.stack || error?.message || String(error);
    paintDiag("startGame.error");
  }
}

function openHowToPlay(event) {
  event?.preventDefault();
  helpPanel.classList.remove("hidden");
}

// Global fallbacks for inline onclick attributes in index.html
window.__pacmanStart = startGame;
window.__pacmanHow = openHowToPlay;

document.addEventListener("pointerdown", () => {
  clickCount += 1;
  paintDiag("pointerdown");
}, { capture: true });

input.bind({ mobileRoot: mobileControls, pauseBtn });
ui.renderLeaderboard(leaderboard.getAll());

if (startBtn) {
  startBtn.addEventListener("click", startGame);
  startBtn.addEventListener("pointerup", startGame);
  startBtn.addEventListener("pointerdown", () => paintDiag("startBtn.pointerdown"));
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
  howBtn.addEventListener("pointerup", openHowToPlay);
  howBtn.addEventListener("pointerdown", () => paintDiag("howBtn.pointerdown"));
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
    game?.updateHud();
  });
}

setMenuNotice("Pulsa 'Jugar ahora' para cargar el laberinto.", "info");

try {
  ensureGame();
  setMenuNotice("Pulsa 'Jugar ahora'. Si no responde, el juego iniciará automáticamente.", "info");
  paintDiag("preload.success");
} catch (error) {
  console.error("[NeonRush] preload error:", error);
  setMenuNotice(`Carga inicial incompleta: ${error.message}`);
  lastError = error?.stack || error?.message || String(error);
  paintDiag("preload.error");
}

// Fallback: if the menu is still visible after a short delay, auto-start the run.
setTimeout(() => {
  if (!started && menu && !menu.classList.contains("hidden")) {
    startGame();
  }
}, 1200);

setInterval(() => paintDiag("heartbeat"), 500);
