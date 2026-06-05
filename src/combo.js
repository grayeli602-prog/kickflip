// Combo chain logic, multiplier, score

export class ComboSystem {
  constructor() {
    this.score = 0;
    this.multiplier = 1;
    this.chain = 0;         // consecutive landed tricks
    this.maxMultiplier = 99;
    this.comboBuffer = [];  // trick names in current combo
    this.onChange = null;   // callback(score, multiplier, chain)
  }

  trickLanded(trick, isClean) {
    if (!trick) return;
    const baseXP = trick.xp || 10;
    const cleanBonus = isClean ? 1.5 : 1.0;
    const earned = Math.round(baseXP * this.multiplier * cleanBonus);
    this.score += earned;
    this.chain++;
    this.comboBuffer.push(trick.name);

    // Build multiplier
    if (this.chain === 2)       this.multiplier = 2;
    else if (this.chain === 3)  this.multiplier = 3;
    else if (this.chain === 5)  this.multiplier = 5;
    else if (this.chain === 8)  this.multiplier = 8;
    else if (this.chain === 12) this.multiplier = 10;
    else if (this.chain === 20) this.multiplier = 15;
    else if (this.chain >= 30)  this.multiplier = Math.min(this.maxMultiplier, this.chain);

    this._notify();
    return { earned, multiplier: this.multiplier, chain: this.chain, isClean };
  }

  slam() {
    const lost = this.multiplier > 1;
    this.multiplier = 1;
    this.chain = 0;
    this.comboBuffer = [];
    this._notify();
    return lost;
  }

  _notify() {
    if (this.onChange) this.onChange(this.score, this.multiplier, this.chain);
  }

  getComboString() {
    if (this.comboBuffer.length === 0) return '';
    if (this.comboBuffer.length === 1) return this.comboBuffer[0];
    return this.comboBuffer.slice(-3).join(' + ');
  }

  reset() {
    this.score = 0;
    this.multiplier = 1;
    this.chain = 0;
    this.comboBuffer = [];
    this._notify();
  }
}
