export class UISystem {
  constructor() {
    this.scoreValue = document.getElementById("scoreValue");
    this.livesValue = document.getElementById("livesValue");
    this.levelValue = document.getElementById("levelValue");
    this.statusValue = document.getElementById("statusValue");
    this.bestValue = document.getElementById("bestValue");
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

  updateHUD({ score, lives, level, status, bestScore = 0, levelProgress = 0 }) {
    this.scoreValue.textContent = String(score);
    this.livesValue.textContent = String(lives);
    this.levelValue.textContent = String(level);
    this.statusValue.textContent = status;
    this.bestValue.textContent = String(bestScore);

    const progress = Math.max(0, Math.min(100, Math.round(levelProgress * 100)));
    this.progressValue.textContent = `${progress}%`;
    this.progressFill.style.width = `${progress}%`;
    this.progressTrack.setAttribute("aria-valuenow", String(progress));
  }

  renderLeaderboard(entries) {
    this.leaderboardList.innerHTML = "";
    if (!entries || entries.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Sin registros aún";
      this.leaderboardList.append(li);
      return;
    }

    for (const entry of entries) {
      const li = document.createElement("li");
      li.textContent = `${entry.player} • ${entry.score} pts • Nivel ${entry.level} • ${entry.result} • ${entry.date}`;
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
}
