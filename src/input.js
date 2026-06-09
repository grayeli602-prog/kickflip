// Motion-primitive button layout
// Each button sends a single action string on press.

const DEFAULT_BUTTONS = [
  // Left cluster (top to bottom: SPIN L, FLIP L, SHUV F)
  { id: 'btn-sl',  label: 'SPIN\n←',  action: 'spin_l', side: 'left',  row: 0 },
  { id: 'btn-fl',  label: 'FLIP\n←',  action: 'flip_l', side: 'left',  row: 1 },
  { id: 'btn-sf',  label: 'SHUV\nF',  action: 'shuv_f', side: 'left',  row: 2 },
  // Right cluster (top to bottom: SPIN R, FLIP R, SHUV B)
  { id: 'btn-sr',  label: 'SPIN\n→',  action: 'spin_r', side: 'right', row: 0 },
  { id: 'btn-fr',  label: 'FLIP\n→',  action: 'flip_r', side: 'right', row: 1 },
  { id: 'btn-sb',  label: 'SHUV\nB',  action: 'shuv_b', side: 'right', row: 2 },
  // Center bottom: POP
  { id: 'btn-pop', label: 'POP',       action: 'pop',    side: 'center', row: 0 },
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
    try { return JSON.parse(localStorage.getItem('kickflip_input') || '{}'); }
    catch { return {}; }
  }

  _saveSettings() {
    localStorage.setItem('kickflip_input', JSON.stringify(this.settings));
  }

  _buildButtons() {
    this.overlay.querySelectorAll('.game-btn').forEach(el => el.remove());
    this.buttons = [];

    const style   = this.settings.style   || 'retro';
    const opacity = this.settings.opacity ?? 0.75;
    const size    = this.settings.size    || 'm';
    const sizeMap = { s: 52, m: 66, l: 84 };
    const btnSize = sizeMap[size];

    DEFAULT_BUTTONS.forEach(def => {
      const pos = this.settings[def.id] || this._defaultPos(def, btnSize);
      const el = document.createElement('div');
      el.className = 'game-btn';
      el.dataset.id = def.id;

      const isPop = def.id === 'btn-pop';
      const displaySize = isPop ? Math.round(btnSize * 1.35) : btnSize;

      Object.assign(el.style, {
        position:         'absolute',
        left:             pos.x + 'px',
        top:              pos.y + 'px',
        width:            displaySize + 'px',
        height:           displaySize + 'px',
        display:          'flex',
        alignItems:       'center',
        justifyContent:   'center',
        textAlign:        'center',
        whiteSpace:       'pre',
        fontFamily:       "'Press Start 2P', monospace",
        fontSize:         isPop ? '10px' : '7px',
        lineHeight:       '1.35',
        color:            isPop ? '#ffee00' : '#e0ff00',
        userSelect:       'none',
        WebkitUserSelect: 'none',
        touchAction:      'none',
        pointerEvents:    'all',
        zIndex:           20,
        cursor:           'pointer',
        transition:       'transform 0.06s',
        opacity:          opacity,
        ...this._styleForMode(style, displaySize, isPop),
      });

      el.textContent = def.label;

      const onDown = (e) => {
        e.preventDefault();
        el.style.transform = 'scale(0.88)';
        this.onInput(def.action);
      };
      const onUp = (e) => {
        e.preventDefault();
        el.style.transform = 'scale(1)';
      };

      el.addEventListener('touchstart', onDown, { passive: false });
      el.addEventListener('touchend',   onUp,   { passive: false });
      el.addEventListener('mousedown',  onDown);
      el.addEventListener('mouseup',    onUp);

      this.overlay.appendChild(el);
      this.buttons.push({ def, el, btnSize: displaySize });
    });
  }

  _defaultPos(def, btnSize) {
    const W = window.innerWidth, H = window.innerHeight;
    const margin = 18;
    const spacing = btnSize + 10;
    const isPop = def.id === 'btn-pop';
    const popSize = Math.round(btnSize * 1.35);

    if (isPop) {
      return { x: Math.round(W / 2 - popSize / 2), y: H - margin - popSize };
    }
    if (def.side === 'left') {
      return { x: margin, y: H - margin - btnSize - def.row * spacing };
    }
    return { x: W - margin - btnSize, y: H - margin - btnSize - def.row * spacing };
  }

  _styleForMode(style, size, isPop) {
    if (style === 'minimal') {
      return {
        border: `2px solid rgba(${isPop ? '255,238,0' : '224,255,0'},0.65)`,
        borderRadius: '6px',
        background: 'transparent',
      };
    } else if (style === 'invisible') {
      return { border: 'none', background: 'transparent', color: 'transparent' };
    } else { // retro
      const col = isPop ? '#ffee00' : '#e0ff00';
      return {
        border:      `3px solid ${col}`,
        background:  'rgba(0,0,0,0.6)',
        boxShadow:   `0 0 8px rgba(${isPop ? '255,238,0' : '224,255,0'},0.35)`,
        borderRadius: '5px',
      };
    }
  }

  _bindGlobal() {
    const keyMap = {
      ' ':       'pop',
      'q':       'flip_l',
      'w':       'flip_r',
      'a':       'shuv_f',
      's':       'shuv_b',
      'z':       'spin_l',
      'x':       'spin_r',
      'ArrowLeft': 'flip_l',
      'ArrowRight':'flip_r',
    };
    document.addEventListener('keydown', e => {
      const action = keyMap[e.key];
      if (action) this.onInput(action);
    });
  }

  applySettings(s) {
    Object.assign(this.settings, s);
    this._saveSettings();
    this._buildButtons();
  }

  getSettings() { return { ...this.settings }; }

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
      startX = e.clientX; startY = e.clientY;
      startLeft = parseInt(el.style.left); startTop = parseInt(el.style.top);
      el.setPointerCapture(e.pointerId);
      el.onpointermove = (ev) => {
        el.style.left = (startLeft + ev.clientX - startX) + 'px';
        el.style.top  = (startTop  + ev.clientY - startY) + 'px';
      };
      el.onpointerup = () => {
        const btnDef = this.buttons.find(b => b.el === el)?.def;
        if (btnDef) {
          this.settings[btnDef.id] = { x: parseInt(el.style.left), y: parseInt(el.style.top) };
          this._saveSettings();
        }
        el.onpointermove = null; el.onpointerup = null;
      };
    };
  }
}
