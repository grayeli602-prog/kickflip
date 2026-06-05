// Trick definitions and animation system

export const TRICKS = {
  ollie:        { name: 'Ollie',        xp: 10,  airTime: 0.55, flipX: 0,        spinY: 0,        flipAxis: 'x', sound: 'pop' },
  kickflip:     { name: 'Kickflip',     xp: 25,  airTime: 0.65, flipX: Math.PI*2, spinY: 0,       flipAxis: 'x', sound: 'flip' },
  heelflip:     { name: 'Heelflip',     xp: 25,  airTime: 0.65, flipX: -Math.PI*2, spinY: 0,      flipAxis: 'x', sound: 'flip' },
  popshuvit:    { name: 'Pop Shuvit',   xp: 20,  airTime: 0.6,  flipX: 0,        spinY: Math.PI,  flipAxis: 'y', sound: 'pop' },
  bs180:        { name: 'BS 180',       xp: 30,  airTime: 0.65, flipX: 0,        spinY: Math.PI,  flipAxis: 'y', sound: 'pop' },
  varialflip:   { name: 'Varial Flip',  xp: 40,  airTime: 0.7,  flipX: Math.PI*2, spinY: Math.PI, flipAxis: 'x', sound: 'flip' },
  hardflip:     { name: 'Hardflip',     xp: 50,  airTime: 0.75, flipX: Math.PI*2, spinY: -Math.PI,flipAxis: 'x', sound: 'flip' },
  treflip:      { name: 'Tre Flip',     xp: 80,  airTime: 0.85, flipX: Math.PI*2, spinY: Math.PI*2,flipAxis:'x', sound: 'flip' },
  doubleflip:   { name: 'Double Flip',  xp: 60,  airTime: 0.8,  flipX: Math.PI*4, spinY: 0,       flipAxis: 'x', sound: 'flip' },
  fskickflip:   { name: 'FS Kickflip',  xp: 70,  airTime: 0.8,  flipX: Math.PI*2, spinY: Math.PI, flipAxis: 'x', sound: 'flip' },
  grind:        { name: 'Frontside Grind', xp: 35, airTime: 0,  flipX: 0,        spinY: 0,        flipAxis: 'x', sound: 'grind' },
};

// Combo input sequences → trick name
export const COMBO_INPUTS = [
  { seq: ['popshuvit', 'kickflip'], result: 'treflip' },
  { seq: ['ollie', 'bs180'],       result: 'bs180' },
  { seq: ['kickflip', 'kickflip'], result: 'doubleflip' },
  { seq: ['heelflip', 'heelflip'], result: 'doubleflip' },
  { seq: ['bs180', 'kickflip'],    result: 'fskickflip' },
];

export class TrickSystem {
  constructor(board, audio, ui) {
    this.board = board;
    this.audio = audio;
    this.ui = ui;

    this.currentTrick = null;
    this.trickProgress = 0; // 0→1
    this.trickQueue = [];    // pending inputs within combo window
    this.comboWindowTimer = 0;
    this.COMBO_WINDOW = 0.4;

    this.isAirborne = false;
    this.boardY = 0;          // board y base
    this.peakY = 0;
    this.gravity = -22;
    this.velocityY = 0;

    this.cleanLandingWindow = 0.1; // seconds near peak
    this.nearPeakTimer = 0;
    this.isNearPeak = false;
    this.onTrickComplete = null; // callback(trick, isClean)
    this.onSlam = null;
  }

  executeTrick(trickId) {
    if (!this.isAirborne && trickId !== 'grind') {
      this._launch(trickId);
    } else if (this.isAirborne) {
      // queue combo input
      this.trickQueue.push(trickId);
      this.comboWindowTimer = this.COMBO_WINDOW;
      this._checkComboQueue();
    }
  }

  _launch(trickId) {
    const t = TRICKS[trickId];
    if (!t) return;
    this.isAirborne = true;
    this.currentTrick = trickId;
    this.trickProgress = 0;
    this.velocityY = Math.sqrt(2 * Math.abs(this.gravity) * (t.airTime * t.airTime * Math.abs(this.gravity) / 2));
    this.board.isAirborne = true;
    this.trickDuration = t.airTime;
    this._startFlipAnim(t);
    this.audio?.play(t.sound);
    this.ui?.showTrickName(t.name);
  }

  _startFlipAnim(t) {
    this._flipStart = this.board.group.rotation.x;
    this._spinStart = this.board.group.rotation.y;
    this._flipTarget = t.flipX;
    this._spinTarget = t.spinY;
    this._animTime = 0;
    this._animDuration = t.airTime * 0.75;
  }

  _checkComboQueue() {
    for (const combo of COMBO_INPUTS) {
      if (combo.seq.length > this.trickQueue.length) continue;
      const recent = this.trickQueue.slice(-combo.seq.length);
      if (recent.every((id, i) => id === combo.seq[i])) {
        // Resolve combo
        const r = TRICKS[combo.result];
        if (r) {
          this.currentTrick = combo.result;
          this._startFlipAnim(r);
          this.ui?.showTrickName(r.name);
          this.trickQueue = [];
        }
      }
    }
  }

  update(dt) {
    if (!this.isAirborne) return;

    // Physics
    this.velocityY += this.gravity * dt;
    this.board.group.position.y += this.velocityY * dt;

    // Flip animation
    this._animTime += dt;
    const progress = Math.min(1, this._animTime / Math.max(0.01, this._animDuration));
    const ease = progress < 0.5 ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    this.board.flipAngle = this._flipStart + (this._flipTarget - this._flipStart) * ease;
    this.board.bodyRotation = this._spinStart + (this._spinTarget - this._spinStart) * ease;

    // Clean landing window: within 100ms of peak
    const atPeak = Math.abs(this.velocityY) < 3;
    if (atPeak) this.nearPeakTimer += dt;
    else this.nearPeakTimer = 0;

    // Landed
    if (this.board.group.position.y <= this.boardY) {
      this.board.group.position.y = this.boardY;
      this.isAirborne = false;
      this.board.isAirborne = false;
      const landed = this.currentTrick;
      const isClean = this.nearPeakTimer > 0.05 && this.nearPeakTimer < 0.2;

      // Snap to upright
      this.board.flipAngle = 0;
      this.board.bodyRotation = 0;

      this.currentTrick = null;
      this.trickQueue = [];
      this.nearPeakTimer = 0;
      this.velocityY = 0;

      this.board.triggerLandFlash();
      this.audio?.play(isClean ? 'land_clean' : 'land');

      if (this.onTrickComplete) {
        this.onTrickComplete(TRICKS[landed], isClean);
      }
    }

    // Combo window decay
    if (this.comboWindowTimer > 0) {
      this.comboWindowTimer -= dt;
    }
  }

  setBaseY(y) {
    this.boardY = y;
    this.board.baseY = y;
  }
}
