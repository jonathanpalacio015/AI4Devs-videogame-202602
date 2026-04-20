export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.enabled) {
      return;
    }

    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.11;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  beep({ frequency = 440, duration = 0.08, type = "square", volume = 0.2 }) {
    this.ensure();
    if (!this.ctx || !this.master) {
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(frequency, now);
    osc.type = type;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }

  pellet() {
    this.beep({ frequency: 660, duration: 0.05, type: "triangle", volume: 0.08 });
  }

  powerUp() {
    this.beep({ frequency: 330, duration: 0.09, type: "sawtooth", volume: 0.14 });
    this.beep({ frequency: 740, duration: 0.08, type: "triangle", volume: 0.14 });
  }

  hit() {
    this.beep({ frequency: 170, duration: 0.2, type: "square", volume: 0.18 });
  }

  victory() {
    this.beep({ frequency: 520, duration: 0.08, type: "triangle", volume: 0.14 });
    this.beep({ frequency: 690, duration: 0.1, type: "triangle", volume: 0.14 });
    this.beep({ frequency: 890, duration: 0.11, type: "triangle", volume: 0.14 });
  }
}
