// storage.js — persistent stats via localStorage.
// One JSON blob keeps reads/writes simple and atomic.

const STORAGE_KEY = 'cryptCrawler.stats.v1';

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Storage.fresh();
      const parsed = JSON.parse(raw);
      // Defensive: fill in any missing fields if the schema ever expands.
      return Object.assign(Storage.fresh(), parsed);
    } catch (e) {
      // Corrupt JSON — start clean rather than crash.
      return Storage.fresh();
    }
  },

  save(stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  },

  fresh() {
    return {
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestTimeMs: null,
    };
  },

  // Called when the player wins a full run.
  recordWin(stats, runTimeMs) {
    stats.wins += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    if (stats.bestTimeMs == null || runTimeMs < stats.bestTimeMs) {
      stats.bestTimeMs = runTimeMs;
    }
    Storage.save(stats);
  },

  // Called when the player dies.
  recordLoss(stats) {
    stats.currentStreak = 0;
    Storage.save(stats);
  },
};
