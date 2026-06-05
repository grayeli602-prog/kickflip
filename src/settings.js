// Settings screen manager

export class Settings {
  constructor(overlay, input, audio, renderer, leaderboard, progression, onClose) {
    this.overlay = overlay;
    this.input = input;
    this.audio = audio;
    this.renderer = renderer;
    this.leaderboard = leaderboard;
    this.progression = progression;
    this.onClose = onClose;
    this.panel = null;
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show() {
    if (this.panel) this.panel.remove();
    this.visible = true;
    this.panel = document.createElement('div');
    Object.assign(this.panel.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.92)',
      zIndex: '50',
      overflowY: 'auto',
      fontFamily: "'Press Start 2P', monospace",
      color: '#e0ff00',
      padding: '24px',
      display: 'flex', flexDirection: 'column', gap: '20px',
    });

    this.panel.innerHTML = this._buildHTML();
    document.body.appendChild(this.panel);
    this._bindEvents();
  }

  hide() {
    if (this.panel) { this.panel.remove(); this.panel = null; }
    this.visible = false;
    if (this.onClose) this.onClose();
  }

  _buildHTML() {
    const input = this.input.getSettings();
    const best = this.progression.getAllTimeBest();
    const rankName = this.progression.getRankName();
    const tiers = this.progression.getBoardTiers();
    const mastery = this.progression.getMasteryAll();

    return `
    <div style="max-width:480px;margin:0 auto;width:100%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <span style="font-size:18px;letter-spacing:4px">SETTINGS</span>
        <button id="s-close" style="${btnStyle()}">✕ CLOSE</button>
      </div>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">PLAYER</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="s-name" type="text" maxlength="10" value="${this.leaderboard.getPlayerName()}"
            style="background:#111;border:2px solid #e0ff00;color:#e0ff00;padding:8px;
                   font-family:inherit;font-size:10px;width:120px;text-transform:uppercase"/>
          <button id="s-name-save" style="${btnStyle()}">SAVE</button>
        </div>
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">RANK: ${rankName}</div>
        <div style="font-size:9px">ALL-TIME BEST SCORE: ${best.score.toLocaleString()}</div>
        <div style="font-size:9px">BEST COMBO: ${best.combo}x</div>
        <div style="font-size:9px">BEST MULTIPLIER: ${best.multiplier}x</div>
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">AUDIO</div>
        ${this._slider('s-master', 'MASTER VOL', this.audio.masterVolume, 0, 1, 0.05)}
        ${this._slider('s-music', 'MUSIC VOL', this.audio.musicVolume, 0, 1, 0.05)}
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">DISPLAY</div>
        ${this._select('s-pixel', 'PIXELATION', ['low','medium','high'],
          this.renderer.pixelLevel || 'medium')}
        ${this._select('s-camera', 'CAMERA', ['cinematic','standard','overhead'],
          this.renderer.cameraPreset || 'standard')}
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">CONTROLS</div>
        ${this._select('s-btnstyle', 'BTN STYLE', ['retro','minimal','invisible'],
          input.style || 'retro')}
        ${this._slider('s-opacity', 'BTN OPACITY', input.opacity ?? 0.75, 0.1, 1, 0.05)}
        ${this._select('s-size', 'BTN SIZE', ['s','m','l'], input.size || 'm')}
        <button id="s-drag" style="${btnStyle()}">REPOSITION BUTTONS</button>
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">BOARD VIEWER</div>
        ${Object.entries(tiers).map(([part, tier]) =>
          `<div style="font-size:9px;margin-bottom:4px">${part.toUpperCase()}: Tier ${tier}/9</div>`
        ).join('')}
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">MASTERY</div>
        ${Object.entries(mastery).map(([t, c]) =>
          `<div style="font-size:9px;margin-bottom:3px">${t}: ${c} lands</div>`
        ).join('')}
      </section>

      <section>
        <button id="s-reset-session" style="${btnStyle('red')}">RESET SESSION</button>
      </section>

      <section>
        <div style="font-size:10px;color:#888;margin-bottom:12px">LEADERBOARD</div>
        <div id="s-scores" style="font-size:9px">Loading...</div>
      </section>
    </div>`;
  }

  _slider(id, label, val, min, max, step) {
    return `<div style="margin-bottom:10px">
      <div style="font-size:9px;margin-bottom:4px">${label}: <span id="${id}-val">${Math.round(val*100)}%</span></div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"
        style="width:100%;accent-color:#e0ff00"/>
    </div>`;
  }

  _select(id, label, options, current) {
    const opts = options.map(o =>
      `<option value="${o}" ${o === current ? 'selected' : ''}>${o.toUpperCase()}</option>`
    ).join('');
    return `<div style="margin-bottom:10px">
      <div style="font-size:9px;margin-bottom:4px">${label}</div>
      <select id="${id}" style="background:#111;border:2px solid #e0ff00;color:#e0ff00;
        font-family:inherit;font-size:9px;padding:4px">${opts}</select>
    </div>`;
  }

  _bindEvents() {
    const get = (id) => this.panel.querySelector('#' + id);
    const on = (id, ev, fn) => get(id)?.addEventListener(ev, fn);

    on('s-close', 'click', () => this.hide());

    on('s-name-save', 'click', () => {
      this.leaderboard.setPlayerName(get('s-name').value || 'SKATER');
    });

    const liveSlider = (id, setter) => {
      on(id, 'input', (e) => {
        const v = parseFloat(e.target.value);
        setter(v);
        const label = get(id + '-val');
        if (label) label.textContent = Math.round(v * 100) + '%';
      });
    };
    liveSlider('s-master', v => this.audio.setMasterVolume(v));
    liveSlider('s-music', v => this.audio.setMusicVolume(v));
    liveSlider('s-opacity', v => this.input.applySettings({ opacity: v }));

    on('s-pixel', 'change', (e) => this.renderer.setPixelLevel(e.target.value));
    on('s-camera', 'change', (e) => this.renderer.setCameraPreset(e.target.value));
    on('s-btnstyle', 'change', (e) => this.input.applySettings({ style: e.target.value }));
    on('s-size', 'change', (e) => this.input.applySettings({ size: e.target.value }));

    on('s-drag', 'click', () => {
      this.hide();
      this.input.enableDragMode(true);
      setTimeout(() => this.input.enableDragMode(false), 8000);
    });

    on('s-reset-session', 'click', () => {
      this.progression.resetSession();
      this.hide();
    });

    // Load leaderboard
    this.leaderboard.getTopScores(10).then(scores => {
      const el = get('s-scores');
      if (!el) return;
      if (!scores.length) { el.textContent = 'No scores yet.'; return; }
      el.innerHTML = scores.map((s, i) =>
        `<div style="margin-bottom:4px">${i+1}. ${s.name} — ${s.score.toLocaleString()}</div>`
      ).join('');
    });
  }
}

function btnStyle(variant = 'default') {
  const bg = variant === 'red' ? 'rgba(120,0,0,0.8)' : 'rgba(0,0,0,0.8)';
  return `background:${bg};border:2px solid #e0ff00;color:#e0ff00;
    font-family:inherit;font-size:9px;padding:8px 12px;cursor:pointer`;
}
