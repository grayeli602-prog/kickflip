// Web Audio API sound manager (no external files required — synthesized sounds)

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.6;
    this.musicVolume = 0.3;
    this.enabled = true;
    this._musicOsc = null;
    this._musicGain = null;
    this._musicTick = 0;
    this._musicInterval = null;
    this._pendingInit = false;
    this._loadSettings();
  }

  _loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('kickflip_audio') || '{}');
      this.masterVolume = s.master ?? 0.6;
      this.musicVolume = s.music ?? 0.3;
      this.enabled = s.enabled ?? true;
    } catch {}
  }

  saveSettings() {
    localStorage.setItem('kickflip_audio', JSON.stringify({
      master: this.masterVolume, music: this.musicVolume, enabled: this.enabled
    }));
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  play(soundId) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const gain = ctx.createGain();
    gain.gain.value = this.masterVolume;
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (soundId) {
      case 'pop': this._synthPop(ctx, gain, now); break;
      case 'flip': this._synthFlip(ctx, gain, now); break;
      case 'land': this._synthLand(ctx, gain, now); break;
      case 'land_clean': this._synthCleanLand(ctx, gain, now); break;
      case 'slam': this._synthSlam(ctx, gain, now); break;
      case 'grind': this._synthGrind(ctx, gain, now); break;
      case 'combo5': this._synthComboMilestone(ctx, gain, now, 5); break;
      case 'combo10': this._synthComboMilestone(ctx, gain, now, 10); break;
      case 'combo25': this._synthComboMilestone(ctx, gain, now, 25); break;
    }
  }

  _synthPop(ctx, dest, t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.type = 'square';
    osc.start(t); osc.stop(t + 0.12);
  }

  _synthFlip(ctx, dest, t) {
    const noise = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    noise.connect(filt); filt.connect(g); g.connect(dest);
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(800, t);
    noise.frequency.linearRampToValueAtTime(200, t + 0.15);
    filt.type = 'bandpass'; filt.frequency.value = 600;
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    noise.start(t); noise.stop(t + 0.2);
  }

  _synthLand(ctx, dest, t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.type = 'square';
    osc.start(t); osc.stop(t + 0.16);
  }

  _synthCleanLand(ctx, dest, t) {
    this._synthLand(ctx, dest, t);
    // Add ding
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(dest);
    osc2.frequency.value = 1200;
    osc2.type = 'sine';
    g2.gain.setValueAtTime(0.4, t + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc2.start(t + 0.05); osc2.stop(t + 0.45);
  }

  _synthSlam(ctx, dest, t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.start(t); osc.stop(t + 0.4);
  }

  _synthGrind(ctx, dest, t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(dest);
    osc.type = 'sawtooth';
    osc.frequency.value = 150 + Math.random() * 50;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.45);
  }

  _synthComboMilestone(ctx, dest, t, level) {
    const freqs = level >= 25 ? [600, 800, 1000, 1300]
      : level >= 10 ? [400, 600, 800] : [300, 500];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(dest);
      osc.frequency.value = f;
      osc.type = 'sine';
      const dt = i * 0.08;
      g.gain.setValueAtTime(0.3, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.3);
      osc.start(t + dt); osc.stop(t + dt + 0.35);
    });
  }

  startMusic() {
    if (!this.enabled || this._musicInterval) return;
    const ctx = this._ensureCtx();
    // Simple lo-fi beat pattern
    const beatPattern = [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    let step = 0;
    this._musicInterval = setInterval(() => {
      if (!this.enabled) return;
      if (beatPattern[step % beatPattern.length]) {
        const gain = ctx.createGain();
        gain.gain.value = this.masterVolume * this.musicVolume;
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        this._synthPop(ctx, gain, now);
      }
      step++;
    }, 250);
  }

  stopMusic() {
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }
  }

  setMasterVolume(v) { this.masterVolume = v; this.saveSettings(); }
  setMusicVolume(v) { this.musicVolume = v; this.saveSettings(); }
  setEnabled(v) {
    this.enabled = v;
    if (!v) this.stopMusic();
    this.saveSettings();
  }
}
