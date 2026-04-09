AFRAME.registerSystem('ui-overlay', {
  schema: {
    distance: { type: 'number', default: 1.35 },
    pixelsPerUnit: { type: 'number', default: 420 },
    virtualWidth: { type: 'number', default: 1024 },
    virtualHeight: { type: 'number', default: 576 }
  },

  init: function () {
    this.root = document.createElement('a-entity');
    this.root.setAttribute('id', 'xr-ui-root-3d');
    this.root.object3D.position.set(0, 0, -this.data.distance);

    this._attachToCamera();
    this._onLoaded = () => this._attachToCamera();
    this._onCameraActive = () => this._attachToCamera();
    this._onEnterVr = () => this._attachToCamera();
    this._onExitVr = () => this._attachToCamera();
    this.sceneEl.addEventListener('loaded', this._onLoaded);
    this.sceneEl.addEventListener('camera-set-active', this._onCameraActive);
    this.sceneEl.addEventListener('enter-vr', this._onEnterVr);
    this.sceneEl.addEventListener('exit-vr', this._onExitVr);
  },

  remove: function () {
    this.sceneEl.removeEventListener('loaded', this._onLoaded);
    this.sceneEl.removeEventListener('camera-set-active', this._onCameraActive);
    this.sceneEl.removeEventListener('enter-vr', this._onEnterVr);
    this.sceneEl.removeEventListener('exit-vr', this._onExitVr);
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
  },

  getRoot: function () {
    return this.root;
  },

  toLocalPosition: function (x, y) {
    const px = Number(x) || 0;
    const py = Number(y) || 0;
    const ppu = this.data.pixelsPerUnit;
    const localX = (px - (this.data.virtualWidth * 0.5)) / ppu;
    const localY = ((this.data.virtualHeight * 0.5) - py) / ppu;
    return { x: localX, y: localY };
  },

  pxToUnits: function (value) {
    return (Number(value) || 0) / this.data.pixelsPerUnit;
  },

  _attachToCamera: function () {
    const activeCam = this.sceneEl.camera && this.sceneEl.camera.el ? this.sceneEl.camera.el : null;
    const cam =
      activeCam ||
      this.sceneEl.querySelector('[camera][active]') ||
      this.sceneEl.querySelector('[camera]') ||
      this.sceneEl.querySelector('a-camera');
    if (!cam || this.root.parentNode === cam) return;
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
    cam.appendChild(this.root);
  }
});

AFRAME.registerComponent('ui-panel', {
  schema: {
    title: { type: 'string', default: 'Panel' },
    html: { type: 'string', default: '' },
    x: { type: 'number', default: 16 },
    y: { type: 'number', default: 16 },
    width: { type: 'number', default: 280 },
    height: { type: 'number', default: 160 },
    padding: { type: 'number', default: 12 },
    visible: { type: 'boolean', default: true }
  },

  init: function () {
    this.uiOverlaySystem = this.el.sceneEl?.systems?.['ui-overlay'];
    this.panelEl = document.createElement('a-entity');
    this.bgEl = document.createElement('a-plane');
    this.titleEl = document.createElement('a-text');
    this.bodyEl = document.createElement('a-text');

    this.bgEl.setAttribute('material', 'color: #101a2a; opacity: 0.85; transparent: true; side: double');
    this.bgEl.setAttribute('render-order', '999');
    this.titleEl.setAttribute('align', 'left');
    this.titleEl.setAttribute('color', '#8ecae6');
    this.bodyEl.setAttribute('align', 'left');
    this.bodyEl.setAttribute('color', '#ecf3ff');

    this.panelEl.appendChild(this.bgEl);
    this.panelEl.appendChild(this.titleEl);
    this.panelEl.appendChild(this.bodyEl);
    this.uiOverlaySystem.getRoot().appendChild(this.panelEl);

    this.update({});
  },

  update: function () {
    const d = this.data;
    const pos = this.uiOverlaySystem.toLocalPosition(d.x, d.y);
    const w = this.uiOverlaySystem.pxToUnits(d.width);
    const h = this.uiOverlaySystem.pxToUnits(d.height);
    const pad = this.uiOverlaySystem.pxToUnits(d.padding);

    this.panelEl.object3D.position.set(pos.x + w * 0.5, pos.y - h * 0.5, 0);
    this.panelEl.object3D.visible = !!d.visible;

    this.bgEl.setAttribute('width', w);
    this.bgEl.setAttribute('height', h);

    this.titleEl.setAttribute('value', d.title);
    this.titleEl.setAttribute('width', Math.max(0.1, w - pad * 2));
    this.titleEl.object3D.position.set((-w * 0.5) + pad, (h * 0.5) - pad * 1.8, 0.003);

    this.bodyEl.setAttribute('value', stripHtml(d.html));
    this.bodyEl.setAttribute('width', Math.max(0.1, w - pad * 2));
    this.bodyEl.object3D.position.set((-w * 0.5) + pad, (h * 0.5) - pad * 4.5, 0.003);
  },

  remove: function () {
    if (this.panelEl && this.panelEl.parentNode) {
      this.panelEl.parentNode.removeChild(this.panelEl);
    }
  }
});

AFRAME.registerComponent('ui-label', {
  schema: {
    text: { type: 'string', default: 'Label' },
    x: { type: 'number', default: 20 },
    y: { type: 'number', default: 20 },
    size: { type: 'number', default: 14 },
    padding: { type: 'number', default: 8 },
    visible: { type: 'boolean', default: true }
  },

  init: function () {
    this.uiOverlaySystem = this.el.sceneEl?.systems?.['ui-overlay'];
    this.labelEl = document.createElement('a-entity');
    this.bgEl = document.createElement('a-plane');
    this.textEl = document.createElement('a-text');

    this.bgEl.setAttribute('material', 'color: #0d1524; opacity: 0.78; transparent: true; side: double');
    this.textEl.setAttribute('align', 'left');
    this.textEl.setAttribute('color', '#f8fbff');

    this.labelEl.appendChild(this.bgEl);
    this.labelEl.appendChild(this.textEl);
    this.uiOverlaySystem.getRoot().appendChild(this.labelEl);
    this.update({});
  },

  update: function () {
    const d = this.data;
    const estimatedWidth = Math.max(130, (String(d.text).length * d.size * 0.56) + (d.padding * 2));
    const estimatedHeight = d.size * 1.8 + d.padding;
    const pos = this.uiOverlaySystem.toLocalPosition(d.x, d.y);
    const w = this.uiOverlaySystem.pxToUnits(estimatedWidth);
    const h = this.uiOverlaySystem.pxToUnits(estimatedHeight);

    this.labelEl.object3D.position.set(pos.x + w * 0.5, pos.y - h * 0.5, 0.001);
    this.labelEl.object3D.visible = !!d.visible;

    this.bgEl.setAttribute('width', w);
    this.bgEl.setAttribute('height', h);

    this.textEl.setAttribute('value', d.text);
    this.textEl.setAttribute('width', Math.max(0.1, w - this.uiOverlaySystem.pxToUnits(d.padding * 2)));
    this.textEl.object3D.position.set((-w * 0.5) + this.uiOverlaySystem.pxToUnits(d.padding), 0, 0.003);
  },

  remove: function () {
    if (this.labelEl && this.labelEl.parentNode) {
      this.labelEl.parentNode.removeChild(this.labelEl);
    }
  }
});

AFRAME.registerComponent('ui-bar', {
  schema: {
    title: { type: 'string', default: 'Value' },
    value: { type: 'number', default: 100 },
    min: { type: 'number', default: 0 },
    max: { type: 'number', default: 100 },
    event: { type: 'string', default: '' },
    field: { type: 'string', default: 'current' },
    source: { type: 'selector', default: null },
    x: { type: 'number', default: 20 },
    y: { type: 'number', default: 72 },
    width: { type: 'number', default: 260 },
    visible: { type: 'boolean', default: true }
  },

  init: function () {
    this.uiOverlaySystem = this.el.sceneEl?.systems?.['ui-overlay'];
    this.barEl = document.createElement('a-entity');
    this.bgEl = document.createElement('a-plane');
    this.titleEl = document.createElement('a-text');
    this.trackEl = document.createElement('a-plane');
    this.fillEl = document.createElement('a-plane');
    this.minEl = document.createElement('a-text');
    this.maxEl = document.createElement('a-text');

    this.bgEl.setAttribute('material', 'color: #0d1524; opacity: 0.8; transparent: true; side: double');
    this.titleEl.setAttribute('align', 'left');
    this.titleEl.setAttribute('color', '#8ecae6');
    this.trackEl.setAttribute('material', 'color: #354a61; opacity: 0.95; transparent: true; side: double');
    this.fillEl.setAttribute('material', 'color: #56cfe1; opacity: 1; transparent: true; side: double');
    this.minEl.setAttribute('align', 'left');
    this.minEl.setAttribute('color', '#f8fbff');
    this.maxEl.setAttribute('align', 'right');
    this.maxEl.setAttribute('color', '#f8fbff');

    this.barEl.appendChild(this.bgEl);
    this.barEl.appendChild(this.titleEl);
    this.barEl.appendChild(this.trackEl);
    this.barEl.appendChild(this.fillEl);
    this.barEl.appendChild(this.minEl);
    this.barEl.appendChild(this.maxEl);
    this.uiOverlaySystem.getRoot().appendChild(this.barEl);

    this._sourceEl = this.data.source || this.el;
    this._onUpdate = (e) => {
      const next = e && e.detail ? e.detail[this.data.field] : null;
      if (typeof next !== 'number') return;
      this.el.setAttribute('ui-bar', 'value', next);
    };

    if (this.data.event) {
      this._sourceEl.addEventListener(this.data.event, this._onUpdate);
    }

    this.update({});
  },

  update: function (oldData) {
    oldData = oldData || {};
    const d = this.data;
    if (oldData.event !== undefined && oldData.event !== d.event) {
      this._sourceEl.removeEventListener(oldData.event, this._onUpdate);
      if (d.event) this._sourceEl.addEventListener(d.event, this._onUpdate);
    }

    if (oldData.source !== undefined && oldData.source !== d.source) {
      if (oldData.event) this._sourceEl.removeEventListener(oldData.event, this._onUpdate);
      this._sourceEl = d.source || this.el;
      if (d.event) this._sourceEl.addEventListener(d.event, this._onUpdate);
    }

    const clamped = Math.max(d.min, Math.min(d.max, d.value));
    const ratio = d.max > d.min ? (clamped - d.min) / (d.max - d.min) : 0;
    const w = this.uiOverlaySystem.pxToUnits(d.width);
    const h = this.uiOverlaySystem.pxToUnits(72);
    const pos = this.uiOverlaySystem.toLocalPosition(d.x, d.y);

    this.barEl.object3D.position.set(pos.x + w * 0.5, pos.y - h * 0.5, 0.001);
    this.barEl.object3D.visible = !!d.visible;

    this.bgEl.setAttribute('width', w);
    this.bgEl.setAttribute('height', h);

    this.titleEl.setAttribute('value', d.title);
    this.titleEl.setAttribute('width', Math.max(0.1, w - 0.04));
    this.titleEl.object3D.position.set((-w * 0.5) + 0.02, h * 0.26, 0.003);

    const trackW = w - 0.04;
    const trackH = 0.022;
    this.trackEl.setAttribute('width', trackW);
    this.trackEl.setAttribute('height', trackH);
    this.trackEl.object3D.position.set(0, 0.01, 0.003);

    const fillW = Math.max(0.001, trackW * ratio);
    this.fillEl.setAttribute('width', fillW);
    this.fillEl.setAttribute('height', trackH * 0.88);
    this.fillEl.object3D.position.set((-trackW * 0.5) + (fillW * 0.5), 0.01, 0.004);

    this.minEl.setAttribute('value', `${clamped.toFixed(0)}`);
    this.minEl.setAttribute('width', 0.22);
    this.minEl.object3D.position.set((-w * 0.5) + 0.02, -h * 0.24, 0.003);

    this.maxEl.setAttribute('value', `${d.max.toFixed(0)}`);
    this.maxEl.setAttribute('width', 0.22);
    this.maxEl.object3D.position.set((w * 0.5) - 0.02, -h * 0.24, 0.003);
  },

  remove: function () {
    if (this.data.event && this._sourceEl) {
      this._sourceEl.removeEventListener(this.data.event, this._onUpdate);
    }
    if (this.barEl && this.barEl.parentNode) {
      this.barEl.parentNode.removeChild(this.barEl);
    }
  }
});

AFRAME.registerComponent('ui-menu', {
  schema: {
    title: { type: 'string', default: 'Menu' },
    options: { type: 'array', default: ['Start', 'Reset'] },
    x: { type: 'number', default: 20 },
    y: { type: 'number', default: 160 },
    width: { type: 'number', default: 240 },
    emitEvent: { type: 'string', default: 'xr:menu-select' },
    target: { type: 'selector', default: null },
    visible: { type: 'boolean', default: true }
  },

  init: function () {
    this.uiOverlaySystem = this.el.sceneEl?.systems?.['ui-overlay'];
    this.menuEl = document.createElement('a-entity');
    this.bgEl = document.createElement('a-plane');
    this.titleEl = document.createElement('a-text');
    this.buttonsWrap = document.createElement('a-entity');

    this.bgEl.setAttribute('material', 'color: #0d1524; opacity: 0.88; transparent: true; side: double');
    this.titleEl.setAttribute('align', 'left');
    this.titleEl.setAttribute('color', '#8ecae6');

    this.menuEl.appendChild(this.bgEl);
    this.menuEl.appendChild(this.titleEl);
    this.menuEl.appendChild(this.buttonsWrap);

    this.uiOverlaySystem.getRoot().appendChild(this.menuEl);
    this.update({});
  },

  update: function () {
    const d = this.data;
    const options = Array.isArray(d.options) ? d.options : [String(d.options || '')];
    const optionCount = Math.max(1, options.length);
    const w = this.uiOverlaySystem.pxToUnits(d.width);
    const h = 0.13 + optionCount * 0.08;
    const pos = this.uiOverlaySystem.toLocalPosition(d.x, d.y);

    this.menuEl.object3D.position.set(pos.x + w * 0.5, pos.y - h * 0.5, 0.001);
    this.menuEl.object3D.visible = !!d.visible;

    this.bgEl.setAttribute('width', w);
    this.bgEl.setAttribute('height', h);

    this.titleEl.setAttribute('value', d.title);
    this.titleEl.setAttribute('width', Math.max(0.1, w - 0.04));
    this.titleEl.object3D.position.set((-w * 0.5) + 0.02, h * 0.34, 0.003);

    this._renderButtons();
  },

  remove: function () {
    if (this.menuEl && this.menuEl.parentNode) {
      this.menuEl.parentNode.removeChild(this.menuEl);
    }
  },

  _renderButtons: function () {
    while (this.buttonsWrap.firstChild) this.buttonsWrap.removeChild(this.buttonsWrap.firstChild);

    const options = Array.isArray(this.data.options) ? this.data.options : [String(this.data.options || '')];
    const w = this.uiOverlaySystem.pxToUnits(this.data.width);

    for (let i = 0; i < options.length; i++) {
      const label = String(options[i]);
      const btn = document.createElement('a-plane');
      const txt = document.createElement('a-text');

      btn.classList.add('clickable');
      btn.setAttribute('interactable', '');
      btn.setAttribute('material', 'color: #24415f; opacity: 0.96; transparent: true; side: double');
      btn.setAttribute('width', Math.max(0.1, w - 0.04));
      btn.setAttribute('height', 0.06);
      btn.object3D.position.set(0, 0.05 - (i * 0.08), 0.003);

      txt.setAttribute('value', label);
      txt.setAttribute('align', 'left');
      txt.setAttribute('color', '#f8fbff');
      txt.setAttribute('width', Math.max(0.1, w - 0.08));
      txt.object3D.position.set((-Math.max(0.1, w - 0.04) * 0.5) + 0.02, 0, 0.003);

      btn.appendChild(txt);
      btn.addEventListener('click', () => this._emitSelect(i, label));
      this.buttonsWrap.appendChild(btn);
    }
  },

  _emitSelect: function (index, value) {
    const detail = { index, value, source: this.el };

    const target = this.data.target || this.el;
    target.emit(this.data.emitEvent, detail);
    this.el.emit('xr:menu-select', detail);
  }
});

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}
