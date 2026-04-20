import { DIR_KEYS } from "../constants.js";

export class InputSystem {
  constructor() {
    this.currentDir = null;
    this.pauseRequested = false;
  }

  bind({ mobileRoot, pauseBtn }) {
    window.addEventListener("keydown", (event) => {
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

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
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
}
