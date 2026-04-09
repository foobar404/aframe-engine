const LOG_PANEL_STATE_KEY = '__AFRAME_LOG_PANEL_STATE__';

function getPanelState() {
  if (!window[LOG_PANEL_STATE_KEY]) {
    window[LOG_PANEL_STATE_KEY] = {
      buffer: [],
      listeners: new Set(),
      patched: false,
      original: {}
    };
  }
  return window[LOG_PANEL_STATE_KEY];
}

function safeStringify(value) {
  if (value instanceof Error) {
    return value.stack || value.message || String(value);
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (e) {
    return Object.prototype.toString.call(value);
  }
}

function formatEntry(level, args) {
  const text = Array.from(args).map(safeStringify).join(' ');
  const tag = level.toUpperCase();
  return `${tag}: ${text}`;
}

function patchConsoleIfNeeded(maxBuffer) {
  const state = getPanelState();
  if (state.patched) return;

  ['log', 'warn', 'error'].forEach((level) => {
    const original = console[level];
    state.original[level] = original.bind(console);

    console[level] = (...args) => {
      try {
        const line = formatEntry(level, args);
        state.buffer.push(line);
        if (state.buffer.length > maxBuffer) {
          state.buffer.splice(0, state.buffer.length - maxBuffer);
        }
        state.listeners.forEach((fn) => fn(line));
      } catch (e) {
        // Never break console behavior.
      }

      state.original[level](...args);
    };
  });

  state.patched = true;
}

function unpatchConsoleIfUnused() {
  const state = getPanelState();
  if (!state.patched || state.listeners.size > 0) return;

  ['log', 'warn', 'error'].forEach((level) => {
    if (state.original[level]) {
      console[level] = state.original[level];
    }
  });

  state.patched = false;
}

if (!AFRAME.components['log-panel']) {
  AFRAME.registerComponent('log-panel', {
    schema: {
      enabled: { type: 'boolean', default: true },
      maxLines: { type: 'int', default: 12 },
      maxBuffer: { type: 'int', default: 400 },
      width: { type: 'number', default: 0.62 },
      height: { type: 'number', default: 0.34 },
      fadeDelayMs: { type: 'int', default: 3500 },
      fadeDurationMs: { type: 'int', default: 5000 },
      offset: { type: 'vec3', default: { x: 0.34, y: -0.14, z: -0.68 } }
    },

    init() {
      this.lines = [];
      this.lastLogAt = 0;
      this.state = getPanelState();
      patchConsoleIfNeeded(this.data.maxBuffer);

      this.panel = document.createElement('a-entity');
      this.panel.setAttribute('position', `${this.data.offset.x} ${this.data.offset.y} ${this.data.offset.z}`);
      this.panel.setAttribute('data-vr-tool-ui', 'true');

      this.bg = document.createElement('a-plane');
      this.bg.setAttribute('width', this.data.width);
      this.bg.setAttribute('height', this.data.height);
      this.bg.setAttribute('material', 'color: #0a1020; opacity: 0; transparent: true; side: double');
      this.bg.object3D.position.set(0, 0, 0);

      this.title = document.createElement('a-text');
      this.title.setAttribute('value', 'Console Log');
      this.title.setAttribute('color', '#8ecae6');
      this.title.setAttribute('align', 'left');
      this.title.setAttribute('width', (this.data.width - 0.05) * 1.35);
      this.title.object3D.position.set(-this.data.width * 0.48, this.data.height * 0.42, 0.003);

      this.body = document.createElement('a-text');
      this.body.setAttribute('value', '');
      this.body.setAttribute('color', '#f7fbff');
      this.body.setAttribute('align', 'left');
      this.body.setAttribute('width', (this.data.width - 0.05) * 1.7);
      this.body.setAttribute('wrap-count', 72);
      this.body.setAttribute('baseline', 'top');
      this.body.setAttribute('opacity', 1);
      this.body.object3D.position.set(-this.data.width * 0.48, this.data.height * 0.3, 0.003);

      this.panel.appendChild(this.bg);
      this.panel.appendChild(this.title);
      this.panel.appendChild(this.body);
      this.el.appendChild(this.panel);

      this._onLogEntry = (line) => {
        this.pushLine(line);
      };

      this.state.listeners.add(this._onLogEntry);

      const recent = this.state.buffer.slice(-this.data.maxLines);
      recent.forEach((line) => this.pushLine(line));
    },

    update() {
      if (!this.panel) return;
      this.panel.object3D.visible = !!this.data.enabled;
    },

    tick(time) {
      if (!this.data.enabled || !this.body || !this.lastLogAt) return;

      const ageMs = Math.max(0, time - this.lastLogAt);
      if (ageMs <= this.data.fadeDelayMs) {
        this.body.setAttribute('opacity', 1);
        return;
      }

      const fadeProgress = Math.min(1, (ageMs - this.data.fadeDelayMs) / Math.max(1, this.data.fadeDurationMs));
      const opacity = Math.max(0, 1 - fadeProgress);
      this.body.setAttribute('opacity', opacity);
    },

    remove() {
      if (this.panel?.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
      }

      if (this.state && this._onLogEntry) {
        this.state.listeners.delete(this._onLogEntry);
      }

      unpatchConsoleIfUnused();
    },

    pushLine(line) {
      this.lines.push(line);
      if (this.lines.length > this.data.maxLines) {
        this.lines.splice(0, this.lines.length - this.data.maxLines);
      }
      this.lastLogAt = performance.now();
      this.body.setAttribute('opacity', 1);
      this.body.setAttribute('value', this.lines.join('\n'));
    }
  });
}
