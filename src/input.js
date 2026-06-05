// Touch input system with customizable button layout

const DEFAULT_BUTTONS = [
  { id: 'btn-lt',  label: 'KICK',   tap: 'kickflip',  dbl: 'heelflip',  hold: null,   side: 'left',  index: 0 },
  { id: 'btn-lm',  label: 'SHOV',   tap: 'popshuvit', dbl: 'bs180',     hold: null,   side: 'left',  index: 1 },
  { id: 'btn-lb',  label: 'VARI',   tap: 'varialflip',dbl: 'hardflip',  hold: null,   side: 'left',  index: 2 },
  { id: 'btn-rt',  label: 'GRND',   tap: 'grind',     dbl: null,        hold: 'grind',side: 'right', index: 0 },
  { id: 'btn-rb',  label: 'OLL',    tap: 'ollie',     dbl: null,        hold: 'ollie',side: 'right', index: 1 },
];

export class InputSystem {
  constructor(overlay, onInput) {
    this.overlay = overlay;
    this.onInput = onInput;
    this.buttons = [];
    this.settings = this._loadSettings();
    this._buildButtons();
    this._bindGlobal();
  }

  _loadSettings() {
    try {
      return JSON.parse(localStorage.getItem('kickflip_input') || '{}');
    } catch { return {}; }
  }

  _saveSettings() {
    localStorage.setItem('kickflip_input', JSON.stringify(this.settings));
  }

  _buildButtons() {
    // Remove existing buttons
    this.overlay.querySelectorAll('.game-btn').forEach(el => el.remove());
    this.buttons = [];

    const style = this.settings.style || 'retro';
    const opacity = this.settings.opacity ?? 0.75;
    const size = this.settings.size || 'm';
    const sizeMap = { s: 52, m: 68, l: 88 };
    const btnSize = sizeMap[size];

    DEFAULT_BUTTONS.forEach((def, i) => {
      const pos = this.settings[def.id] || this._defaultPos(def, btnSize);
      const el = document.createElement('div');
      el.className = 'game-btn';
      el.dataset.id = def.id;
      el.dataset.tap = def.tap;
      el.dataset.dbl = def.dbl || '';
      el.dataset.hold = def.hold || '';
      el.textContent = def.label;

      Object.assign(el.style, {
        position: 'absolute',
        left: pos.x + 'px',
        top: pos.y + 'px',
        width: btnSize + 'px',
        height: btnSize + 'px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: size === 's' ? '7px' : size === 'l' ? '10px' : '8px',
        color: '#e0ff00',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        pointerEvents: 'all',
        zIndex: 20,
        cursor: 'pointer',
        transition: 'transform 0.08s',
        opacity: opacity,
        ...this._styleForMode(style, btnSize),
      });

      // Touch events
      let tapTimer = null;
      let holdTimer = null;
      let tapCount = 0;
      let isHeld = false;

      const onDown = (e) => {
        e.preventDefault();
        el.style.transform = 'scale(0.9)';
        isHeld = false;

        holdTimer = setTimeout(() => {
          if (def.hold) {
            isHeld = true;
            this.onInput(def.hold, 'hold');
          }
        }, 300);

        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => {
          if (!isHeld) {
            if (tapCount >= 2 && def.dbl) {
              this.onInput(def.dbl, 'double');
            } else {
              this.onInput(def.tap, 'tap');
            }
          }
          tapCount = 0;
        }, 200);
      };

      const onUp = (e) => {
        e.preventDefault();
        el.style.transform = 'scale(1)';
        clearTimeout(holdTimer);
      };

      el.addEventListener('touchstart', onDown, { passive: false });
      el.addEventListener('touchend', onUp, { passive: false });
      el.addEventListener('mousedown', onDown);
      el.addEventListener('mouseup', onUp);

      this.overlay.appendChild(el);
      this.buttons.push({ def, el, btnSize });
    });
  }

  _defaultPos(def, btnSize) {
    const W = window.innerWidth, H = window.innerHeight;
    const margin = 20;
    const spacing = btnSize + 12;
    if (def.side === 'left') {
      return { x: margin, y: H - margin - btnSize - def.index * spacing };
    } else {
      return { x: W - margin - btnSize, y: H - margin - btnSize - def.index * spacing };
    }
  }

  _styleForMode(style, size) {
    if (style === 'minimal') {
      return { border: '2px solid rgba(224,255,0,0.6)', borderRadius: '4px', background: 'transparent' };
    } else if (style === 'invisible') {
      return { border: 'none', background: 'transparent', color: 'transparent' };
    } else { // retro
      return {
        border: '3px solid #e0ff00',
        background: 'rgba(0,0,0,0.65)',
        boxShadow: '0 0 8px rgba(224,255,0,0.3)',
        borderRadius: '4px',
      };
    }
  }

  _bindGlobal() {
    // Keyboard fallback (dev/desktop)
    const keyMap = { q: 'kickflip', w: 'popshuvit', e: 'varialflip', r: 'grind', ' ': 'ollie', h: 'heelflip' };
    document.addEventListener('keydown', e => {
      if (keyMap[e.key]) this.onInput(keyMap[e.key], 'tap');
    });
  }

  applySettings(s) {
    Object.assign(this.settings, s);
    this._saveSettings();
    this._buildButtons();
  }

  getSettings() {
    return { ...this.settings };
  }

  enableDragMode(enabled) {
    this.buttons.forEach(({ el }) => {
      if (enabled) {
        el.style.cursor = 'move';
        el.style.border = '2px dashed #ff0';
        this._makeDraggable(el);
      } else {
        el.style.cursor = 'pointer';
        el.onpointerdown = null;
      }
    });
  }

  _makeDraggable(el) {
    let startX, startY, startLeft, startTop;
    el.onpointerdown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(el.style.left);
      startTop = parseInt(el.style.top);
      el.setPointerCapture(e.pointerId);
      el.onpointermove = (ev) => {
        el.style.left = (startLeft + ev.clientX - startX) + 'px';
        el.style.top = (startTop + ev.clientY - startY) + 'px';
      };
      el.onpointerup = () => {
        this.settings[el.dataset.id] = {
          x: parseInt(el.style.left),
          y: parseInt(el.style.top),
        };
        this._saveSettings();
        el.onpointermove = null;
        el.onpointerup = null;
      };
    };
  }
}
