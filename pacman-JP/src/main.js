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
  return game;
}

function startGame(event) {
  event?.preventDefault();
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
  event?.preventDefault();
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
    game?.updateHud();
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
