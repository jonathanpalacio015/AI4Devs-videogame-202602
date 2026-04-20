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

    // Swipe gesture support
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });
    window.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.currentDir = dx > 0 ? "right" : "left";
      } else {
        this.currentDir = dy > 0 ? "down" : "up";
      }
    }, { passive: true });

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
