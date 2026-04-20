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

const ui = new UISystem();
const audio = new AudioSystem();
const input = new InputSystem();
const leaderboard = new LeaderboardSystem(5);

input.bind({ mobileRoot: mobileControls, pauseBtn });

const game = new Game({
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

ui.renderLeaderboard(leaderboard.getAll());

function hideMenu() {
  menu.classList.add("hidden");
}

function showMenu() {
  menu.classList.remove("hidden");
}

startBtn.addEventListener("click", () => {
  hideMenu();
  ui.hideOverlay();
  game.setPlayerName(playerNameInput.value);
  game.setDifficulty(difficultySelect.value);
  game.restart();
});

howBtn.addEventListener("click", () => {
  helpPanel.classList.remove("hidden");
});

closeHelpBtn.addEventListener("click", () => {
  helpPanel.classList.add("hidden");
});

clearRankingBtn.addEventListener("click", () => {
  leaderboard.clear();
  ui.renderLeaderboard(leaderboard.getAll());
  game.updateHud();
});

ui.showOverlay({
  title: "Bienvenido a Neon Rush",
  text: "Empieza desde el botón Jugar ahora. Soporta teclado y controles táctiles.",
  buttonText: "Cerrar",
  onClick: () => {
    showMenu();
  },
});
