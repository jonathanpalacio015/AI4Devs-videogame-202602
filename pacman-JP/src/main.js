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

const ui = new UISystem();
const audio = new AudioSystem();
const input = new InputSystem();
const leaderboard = new LeaderboardSystem(5);

let game = null;

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

  try {
    const activeGame = ensureGame();
    setMenuNotice("");
    helpPanel.classList.add("hidden");
    hideMenu();
    ui.hideOverlay();
    activeGame.setPlayerName(playerNameInput.value);
    activeGame.setDifficulty(difficultySelect.value);
    activeGame.restart();
  } catch (error) {
    console.error("[NeonRush] bootstrap/start error:", error);
    setMenuNotice(`No se pudo iniciar el juego: ${error.message}`);
    showMenu();
  }
}

input.bind({ mobileRoot: mobileControls, pauseBtn });
ui.renderLeaderboard(leaderboard.getAll());

startBtn.addEventListener("click", startGame);

howBtn.addEventListener("click", () => {
  helpPanel.classList.remove("hidden");
});

closeHelpBtn.addEventListener("click", () => {
  helpPanel.classList.add("hidden");
});

clearRankingBtn.addEventListener("click", () => {
  leaderboard.clear();
  ui.renderLeaderboard(leaderboard.getAll());
  game?.updateHud();
});

setMenuNotice("Pulsa 'Jugar ahora' para cargar el laberinto.", "info");

try {
  ensureGame();
  setMenuNotice("");
} catch (error) {
  console.error("[NeonRush] preload error:", error);
  setMenuNotice(`Carga inicial incompleta: ${error.message}`);
}
