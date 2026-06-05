// XP, Ranks, Mastery, Unlock Tree

const RANKS = [
  'Parking Lot', 'Weekend Warrior', 'Street Rat', 'Local Am', 'Flow Rider',
  'Sponsored Am', 'Shop Pro', 'Regional Pro', 'National Pro', 'Legend',
  'Hall of Fame', 'Myth', 'Ghost',
];

// XP thresholds per rank boundary
const RANK_XP = [0, 200, 500, 1000, 2000, 4000, 7000, 12000, 20000, 35000, 60000, 100000, 160000];

// Mastery thresholds for each trick (lands required to unlock next tier)
const MASTERY_UNLOCKS = [10, 25, 50, 100, 200, 350, 500, 750, 1000, Infinity];

// Board upgrade thresholds per mastery count
const BOARD_UPGRADE_THRESHOLDS = [0, 10, 25, 50, 100, 200, 350, 500, 750, 1000];

export class Progression {
  constructor() {
    this._load();
  }

  _defaults() {
    return {
      xp: 0,
      rankIndex: 0,
      mastery: {
        ollie: 0, kickflip: 0, heelflip: 0, popshuvit: 0,
        bs180: 0, varialflip: 0, hardflip: 0, treflip: 0,
        doubleflip: 0, fskickflip: 0, grind: 0,
      },
      boardTiers: { deck: 0, wheel: 0, truck: 0, grip: 0 },
      sessionBest: { score: 0, combo: 0, multiplier: 0 },
      allTimeBest: { score: 0, combo: 0, multiplier: 0 },
    };
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem('kickflip_progress') || 'null');
      if (saved) {
        this.data = { ...this._defaults(), ...saved };
        // Ensure all mastery keys exist
        const dm = this._defaults().mastery;
        this.data.mastery = { ...dm, ...this.data.mastery };
      } else {
        this.data = this._defaults();
      }
    } catch {
      this.data = this._defaults();
    }
  }

  save() {
    localStorage.setItem('kickflip_progress', JSON.stringify(this.data));
  }

  addXP(amount) {
    this.data.xp += Math.max(0, amount);
    this._checkRankUp();
    this.save();
  }

  _checkRankUp() {
    while (
      this.data.rankIndex < RANK_XP.length - 1 &&
      this.data.xp >= RANK_XP[this.data.rankIndex + 1]
    ) {
      this.data.rankIndex++;
      return true; // rank up happened
    }
    return false;
  }

  recordTrick(trickId, isClean) {
    if (!this.data.mastery[trickId] && this.data.mastery[trickId] !== 0) {
      this.data.mastery[trickId] = 0;
    }
    this.data.mastery[trickId]++;

    // Update board tiers based on aggregate mastery
    this._updateBoardTiers();
    this.save();
    return this.data.mastery[trickId];
  }

  _updateBoardTiers() {
    const totals = { deck: 0, wheel: 0, truck: 0, grip: 0 };
    let i = 0;
    for (const [id, count] of Object.entries(this.data.mastery)) {
      // Each trick type contributes to different parts
      const keys = Object.keys(totals);
      totals[keys[i % keys.length]] += count;
      i++;
    }
    for (const [part, total] of Object.entries(totals)) {
      for (let t = BOARD_UPGRADE_THRESHOLDS.length - 1; t >= 0; t--) {
        if (total >= BOARD_UPGRADE_THRESHOLDS[t]) {
          this.data.boardTiers[part] = t;
          break;
        }
      }
    }
  }

  getMasteryTier(trickId) {
    const count = this.data.mastery[trickId] || 0;
    for (let i = MASTERY_UNLOCKS.length - 1; i >= 0; i--) {
      if (count >= MASTERY_UNLOCKS[i]) return i + 1;
    }
    return 0;
  }

  getRankName() {
    const idx = this.data.rankIndex;
    if (idx < RANKS.length) return RANKS[idx];
    // Procedural titles beyond last
    const extra = idx - RANKS.length + 1;
    return `PHANTOM ${extra}`;
  }

  getRankProgress() {
    const idx = this.data.rankIndex;
    const low = RANK_XP[Math.min(idx, RANK_XP.length - 1)];
    const high = RANK_XP[Math.min(idx + 1, RANK_XP.length - 1)];
    if (low === high) return 1;
    return (this.data.xp - low) / (high - low);
  }

  getRankTier() {
    return Math.floor(this.data.rankIndex / 2);
  }

  updateSessionBest(score, combo, multiplier) {
    const s = this.data.sessionBest;
    s.score = Math.max(s.score, score);
    s.combo = Math.max(s.combo, combo);
    s.multiplier = Math.max(s.multiplier, multiplier);

    const a = this.data.allTimeBest;
    const improved = score > a.score || combo > a.combo || multiplier > a.multiplier;
    a.score = Math.max(a.score, score);
    a.combo = Math.max(a.combo, combo);
    a.multiplier = Math.max(a.multiplier, multiplier);
    if (improved) this.save();
  }

  resetSession() {
    this.data.sessionBest = { score: 0, combo: 0, multiplier: 0 };
    this.save();
  }

  getBoardTiers() { return { ...this.data.boardTiers }; }
  getMasteryAll() { return { ...this.data.mastery }; }
  getAllTimeBest() { return { ...this.data.allTimeBest }; }
  getXP() { return this.data.xp; }
  getRankIndex() { return this.data.rankIndex; }
}
