// HUD, trick callouts, impact frames, screen effects

export class UI {
  constructor(overlay) {
    this.overlay = overlay;
    this._build();
    this.showTrickNames = true;
    this.showCombo = true;
    this._trickQueue = [];
    this._impactCanvas = null;
    this._impactCtx = null;
    this._shakeX = 0;
    this._shakeY = 0;
    this._shakeTime = 0;
    this._freezeTime = 0;
    this._pendingImpact = false;
  }

  _build() {
    this.overlay.innerHTML = `
      <canvas id="impact-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5"></canvas>
      <div id="hud-score" style="position:absolute;top:16px;left:16px;font-family:'Press Start 2P',monospace;
        font-size:clamp(10px,3vw,16px);color:#e0ff00;text-shadow:0 0 8px rgba(224,255,0,0.6);
        pointer-events:none;line-height:1.6">
        <div id="hud-score-val">0</div>
        <div id="hud-rank" style="font-size:9px;color:#aaaaff;margin-top:4px">PARKING LOT</div>
        <div id="hud-xp-bar-wrap" style="width:120px;height:4px;border:1px solid #aaaaff;margin-top:4px">
          <div id="hud-xp-bar" style="height:100%;background:#aaaaff;width:0%"></div>
        </div>
      </div>
      <div id="hud-multi" style="position:absolute;top:16px;right:16px;font-family:'Press Start 2P',monospace;
        font-size:clamp(10px,3vw,16px);color:#ff6600;text-shadow:0 0 8px rgba(255,100,0,0.6);
        pointer-events:none;text-align:right">
        <div id="hud-multi-val" style="display:none">1x</div>
      </div>
      <div id="trick-stack" style="position:absolute;left:50%;top:40%;transform:translateX(-50%);
        pointer-events:none;text-align:center;min-width:200px"></div>
      <button id="btn-settings" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);
        background:transparent;border:2px solid rgba(224,255,0,0.4);color:#e0ff00;
        font-family:'Press Start 2P',monospace;font-size:9px;padding:6px 10px;cursor:pointer;
        pointer-events:all;z-index:20;letter-spacing:2px">MENU</button>
      <div id="clean-flash" style="position:absolute;inset:0;pointer-events:none;
        background:transparent;display:none"></div>
      <div id="slam-text" style="position:absolute;left:50%;top:35%;transform:translateX(-50%);
        font-family:'Press Start 2P',monospace;font-size:24px;color:#ff2200;
        text-shadow:0 0 16px red;pointer-events:none;display:none">SLAM!</div>
    `;

    this._impactCanvas = this.overlay.querySelector('#impact-canvas');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
  }

  _resizeCanvas() {
    if (!this._impactCanvas) return;
    this._impactCanvas.width = window.innerWidth;
    this._impactCanvas.height = window.innerHeight;
    this._impactCtx = this._impactCanvas.getContext('2d');
  }

  onSettingsClick(fn) {
    this.overlay.querySelector('#btn-settings')?.addEventListener('click', fn);
  }

  updateScore(score, multiplier, chain, rankName, xpProgress) {
    const sv = this.overlay.querySelector('#hud-score-val');
    if (sv) sv.textContent = score.toLocaleString();

    const mv = this.overlay.querySelector('#hud-multi-val');
    if (mv) {
      if (multiplier > 1) {
        mv.style.display = 'block';
        mv.textContent = multiplier + 'x';
        mv.style.fontSize = Math.min(32, 12 + multiplier) + 'px';
      } else {
        mv.style.display = 'none';
      }
    }

    const rn = this.overlay.querySelector('#hud-rank');
    if (rn) rn.textContent = rankName;

    const xb = this.overlay.querySelector('#hud-xp-bar');
    if (xb) xb.style.width = (xpProgress * 100) + '%';
  }

  showTrickName(name) {
    if (!this.showTrickNames) return;
    const stack = this.overlay.querySelector('#trick-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.textContent = name;
    Object.assign(el.style, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 'clamp(16px,5vw,28px)',
      color: '#e0ff00',
      textShadow: '0 0 12px rgba(224,255,0,0.8)',
      opacity: '1',
      transition: 'opacity 0.6s, transform 0.6s',
      marginBottom: '4px',
      display: 'block',
    });
    stack.prepend(el);

    // Fade and float upward
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-40px)';
    });
    setTimeout(() => el.remove(), 700);

    // Keep stack to 3 entries
    while (stack.children.length > 3) stack.removeChild(stack.lastChild);
  }

  showClean() {
    const el = this.overlay.querySelector('#clean-flash');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = 'rgba(255,255,100,0.15)';
    this.showTrickName('CLEAN!');
    setTimeout(() => { el.style.display = 'none'; }, 150);
  }

  showSlam() {
    const el = this.overlay.querySelector('#slam-text');
    if (!el) return;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 800);
    this.triggerShake(0.6);
  }

  triggerImpactFrame(x, y) {
    // 1-2 frame freeze handled by caller; we draw a pixelated shockwave ring
    this._pendingImpact = { x, y, r: 0, maxR: 80, alpha: 1.0 };
    this._freezeTime = 0.05; // pause 2 frames
  }

  triggerShake(intensity = 0.3) {
    this._shakeTime = 0.25 * intensity;
    this._shakeAmplitude = 12 * intensity;
  }

  update(dt, container) {
    // Screen shake
    if (this._shakeTime > 0) {
      this._shakeTime -= dt;
      const a = this._shakeAmplitude * (this._shakeTime / 0.25);
      this._shakeX = (Math.random() - 0.5) * a;
      this._shakeY = (Math.random() - 0.5) * a;
      if (container) container.style.transform = `translate(${this._shakeX}px,${this._shakeY}px)`;
    } else {
      if (container) container.style.transform = '';
    }

    // Impact ring
    if (this._pendingImpact) {
      const imp = this._pendingImpact;
      const ctx = this._impactCtx;
      if (ctx) {
        ctx.clearRect(0, 0, this._impactCanvas.width, this._impactCanvas.height);
        imp.r += 120 * dt;
        imp.alpha -= dt * 4;
        if (imp.alpha > 0) {
          // Pixelated ring: draw concentric squares
          ctx.strokeStyle = `rgba(255,255,200,${imp.alpha})`;
          ctx.lineWidth = 4;
          const s = imp.r;
          ctx.strokeRect(imp.x - s, imp.y - s, s * 2, s * 2);
          ctx.strokeStyle = `rgba(224,255,0,${imp.alpha * 0.5})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(imp.x - s * 0.7, imp.y - s * 0.7, s * 1.4, s * 1.4);
        } else {
          ctx.clearRect(0, 0, this._impactCanvas.width, this._impactCanvas.height);
          this._pendingImpact = null;
        }
      }
    }
  }

  showComboMilestone(chain) {
    const msgs = { 5: '5 COMBO!', 10: '10 COMBO!!', 25: 'ON FIRE!!!', 50: 'LEGENDARY!' };
    if (msgs[chain]) this.showTrickName(msgs[chain]);
  }

  showRankUp(rankName) {
    const el = document.createElement('div');
    el.textContent = `RANK UP!\n${rankName}`;
    Object.assign(el.style, {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '20px',
      color: '#ffdd00',
      textShadow: '0 0 20px #ffdd00',
      textAlign: 'center',
      whiteSpace: 'pre',
      zIndex: '30',
      pointerEvents: 'none',
      transition: 'opacity 1.5s',
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 1500);
    setTimeout(() => el.remove(), 3000);
  }
}
