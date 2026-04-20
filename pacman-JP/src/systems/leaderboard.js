const STORAGE_KEY = "pacman-neon-rush-scores";

function safeDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export class LeaderboardSystem {
  constructor(limit = 5) {
    this.limit = limit;
    this.scores = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter((item) => Number.isFinite(item.score) && Number.isFinite(item.level))
        .map((item) => ({
          player: typeof item.player === "string" && item.player.trim() ? item.player.trim().slice(0, 14) : "Anon",
          score: item.score,
          level: item.level,
          result: item.result || "partida",
          date: item.date || safeDate(),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, this.limit);
    } catch {
      return [];
    }
  }

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.scores));
  }

  add({ score, level, result, player }) {
    this.scores.push({
      player: typeof player === "string" && player.trim() ? player.trim().slice(0, 14) : "Anon",
      score,
      level,
      result,
      date: safeDate(),
    });
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, this.limit);
    this.persist();
  }

  clear() {
    this.scores = [];
    this.persist();
  }

  getBestScore() {
    return this.scores.length > 0 ? this.scores[0].score : 0;
  }

  getAll() {
    return [...this.scores];
  }
}