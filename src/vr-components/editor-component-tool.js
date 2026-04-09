import { Events } from '../lib/Events.js';
import { createEntity } from '../lib/entity.js';

const SKIP = new Set(['position', 'rotation', 'scale', 'visible', 'id', 'data-raycastable']);
const ROW_H = 32;
const PAGE_SIZE = 9;
const SCENE_RAY_OBJECTS = '[geometry], [gltf-model], [data-raycastable], [text], a-text, .clickable, .control';
const UI_RAY_OBJECTS = '[data-component-tool-button]';

window.AFRAME.registerComponent('editor-component-tool', {
  schema: {
    enabled: { type: 'boolean', default: true },
    hand:    { type: 'string', default: 'right', oneOf: ['left', 'right'] }
  },

  init() {
    this.selectedEntity  = null;
    this.addMode         = false;
    this.editMode        = null;
    this.assetMode       = false;
    this.pendingApplyVal = null;
    this.pageOffset      = 0;
    this._btnMap        = new Map();   // a-plane element → action fn
    this.panelRoot      = null;
    this._uiSys         = null;
    this._lastScroll    = 0;
    this._hoveredBtn    = null;
    this._kbMode         = null;   // active keyboard: { label, value, applyVal, shift }
    this._boundKbKey     = null;

    this._setupLaser();
    this._initPanel();
    this._bindEvents();
    this._applyEnabled();
  },

  update(oldData) {
    if (oldData && oldData.enabled !== this.data.enabled) this._applyEnabled();
  },

  remove() {
    this._stopKeyboard();
    this._setHoveredButton(null);
    if (this.panelRoot?.parentNode) this.panelRoot.parentNode.removeChild(this.panelRoot);
    (this._activationEvents || []).forEach((eventName) => {
      this.el.removeEventListener(eventName, this._boundActivate);
    });
    this.el.removeEventListener('thumbstickmoved', this._boundThumb);
    if (this._onEntityUpdate) Events.off('entityupdate', this._onEntityUpdate);
  },

  onToolActivated()   { this._applyEnabled(); },
  onToolDeactivated() { this._closePanel(); },

  // ─── setup ────────────────────────────────────────────────────────────────

  _applyEnabled() {
    if (!this.data.enabled) this._closePanel();
  },

  _setupLaser() {
    this.el.setAttribute('laser-controls', `hand: ${this.data.hand}; lineColor: #f39c12; lineOpacity: 0.85;`);
    this._setRayTargets(SCENE_RAY_OBJECTS);
  },

  _setRayTargets(objectsSelector) {
    this.el.setAttribute('raycaster', `far: 400; showLine: true; objects: ${objectsSelector};`);
  },

  _initPanel() {
    this.panelRoot = document.createElement('a-entity');
    this.panelRoot.setAttribute('data-vr-tool-ui', 'true');

    const attach = () => {
      const sys = this._sys();
      if (!sys) { setTimeout(attach, 100); return; }
      this.panelRoot.object3D.visible = false;
      sys.getRoot().appendChild(this.panelRoot);
    };

    if (this.el.sceneEl.hasLoaded) {
      setTimeout(attach, 50);
    } else {
      this.el.sceneEl.addEventListener('loaded', () => setTimeout(attach, 50), { once: true });
    }
  },

  _bindEvents() {
    this._boundActivate = () => { if (this.data.enabled) this._onTrigger(); };
    this._boundThumb   = (e) => { if (this.data.enabled) this._onThumb(e); };
    this._activationEvents = ['triggerdown', 'abuttondown', 'xbuttondown', 'gripdown'];
    this._activationEvents.forEach((eventName) => {
      this.el.addEventListener(eventName, this._boundActivate);
    });
    this.el.addEventListener('thumbstickmoved', this._boundThumb);

    this._onEntityUpdate = ({ entity }) => {
      if (entity === this.selectedEntity && this.panelRoot?.object3D?.visible) {
        this._build();
      }
    };
    Events.on('entityupdate', this._onEntityUpdate);
  },

  // ─── input ────────────────────────────────────────────────────────────────

  _onTrigger() {
    const uiBtn = this._getUiButtonHit();
    if (uiBtn) {
      const action = this._btnMap.get(uiBtn);
      if (action) action();
      return;
    }

    if (this.panelRoot?.object3D?.visible) {
      return;
    }

    // No panel hit — select a scene entity
    const rc = this.el.components.raycaster;
    if (!rc) return;
    for (const hit of (rc.intersections || [])) {
      const el = hit?.object?.el;
      if (!el?.isEntity || !el.object3D) continue;
      if (el.hasAttribute('data-vr-tool-ui') || el.closest('[data-vr-tool-ui]')) continue;
      const rig = document.getElementById('admin-camera-rig');
      if (rig && rig.contains(el)) continue;
      if (el.closest('a-assets')) continue;
      this._select(el);
      return;
    }
  },

  _onThumb(e) {
    if (!this.panelRoot?.object3D?.visible) return;
    const y = e.detail?.y ?? 0;
    if (Math.abs(y) < 0.5) return;
    const now = Date.now();
    if (now - this._lastScroll < 400) return;
    this._lastScroll = now;
    this.pageOffset = Math.max(0, this.pageOffset + (y > 0 ? 1 : -1));
    this._build();
  },

  tick() {
    if (!this.data.enabled || !this.panelRoot?.object3D?.visible) {
      this._setHoveredButton(null);
      return;
    }

    this._setHoveredButton(this._getUiButtonHit());
  },

  // ─── state ────────────────────────────────────────────────────────────────

  _select(entity) {
    this.selectedEntity  = entity;
    this.addMode         = false;
    this.editMode        = null;
    this.pendingApplyVal = null;
    this.pageOffset      = 0;
    this._setRayTargets(UI_RAY_OBJECTS);
    this._build();
    this.panelRoot.object3D.visible = true;
  },

  _closePanel() {
    this._stopKeyboard();
    this._setHoveredButton(null);
    this._setRayTargets(SCENE_RAY_OBJECTS);
    if (this.panelRoot) this.panelRoot.object3D.visible = false;
    this.selectedEntity  = null;
    this.addMode         = false;
    this.editMode        = null;
    this.assetMode       = false;
    this.pendingApplyVal = null;
    this.pageOffset      = 0;
  },

  _startKeyboard(label, value, applyVal) {
    this._stopKeyboard();
    this._kbMode = { label, value: String(value ?? ''), applyVal, shift: false };
    this._boundKbKey = (e) => this._onKbKey(e);
    window.addEventListener('keydown', this._boundKbKey);
    this._build();
  },

  _stopKeyboard() {
    if (this._boundKbKey) {
      window.removeEventListener('keydown', this._boundKbKey);
      this._boundKbKey = null;
    }
    this._kbMode = null;
  },

  _onKbKey(e) {
    if (!this._kbMode) return;
    e.preventDefault();
    if (e.key === 'Enter') {
      const { applyVal, value } = this._kbMode;
      this._stopKeyboard();
      applyVal(value);
    } else if (e.key === 'Escape') {
      this._stopKeyboard();
      this._build();
    } else if (e.key === 'Backspace') {
      this._kbMode.value = this._kbMode.value.slice(0, -1);
      this._build();
    } else if (e.key.length === 1) {
      this._kbMode.value += e.key;
      this._build();
    }
  },

  _buildKeyboardPanel(sys) {
    const kb = this._kbMode;
    const PX = 180, PY = 28, PW = 520;
    const KW = 37, KH = 30, GAP = 3;
    const PAD = 18;
    const STRIDE = KH + GAP + 2;
    const ROWS = [
      ['1','2','3','4','5','6','7','8','9','0','-','_'],
      ['q','w','e','r','t','y','u','i','o','p','.','/'],
      ['a','s','d','f','g','h','j','k','l',';',"'"],
      ['z','x','c','v','b','n','m',',','@','#','!'],
    ];
    const ROW12 = 12 * KW + 11 * GAP;
    const PH = 66 + 30 + ROWS.length * STRIDE + STRIDE + 50;

    this._bg(sys, PX, PY, PW, PH);
    this._text(sys, `Edit: ${kb.label}`, '#8ecae6', PX + 12, PY + 18, 420);

    const draft = (kb.value + '|').slice(-46) || '|';
    this._text(sys, draft, '#ffffffcc', PX + 12, PY + 46, 620, 0.005);

    const baseY = PY + 96;
    ROWS.forEach((row, ri) => {
      const rowW = row.length * KW + (row.length - 1) * GAP;
      const rowX = PX + PAD + Math.round((ROW12 - rowW) / 2);
      const rowY = baseY + ri * STRIDE;
      row.forEach((key, ki) => {
        const display = kb.shift ? key.toUpperCase() : key;
        this._btn(sys, display, rowX + ki * (KW + GAP), rowY, KW, KH, '#1a3a5a', () => {
          kb.value += display;
          if (kb.shift) kb.shift = false;
          this._build();
        });
      });
    });

    const specY = baseY + ROWS.length * STRIDE;
    const specX = PX + PAD;
    const capsW = 2 * KW + GAP;
    const delW  = 2 * KW + GAP;
    const spaceW = ROW12 - capsW - delW - 2 * GAP;
    this._btn(sys, 'Caps', specX, specY, capsW, KH, kb.shift ? '#2a9d8f' : '#1a3a5a', () => {
      kb.shift = !kb.shift; this._build();
    });
    this._btn(sys, ' ', specX + capsW + GAP, specY, spaceW, KH, '#1a3a5a', () => {
      kb.value += ' '; this._build();
    });
    this._btn(sys, '\u232b', specX + capsW + GAP + spaceW + GAP, specY, delW, KH, '#5a2d1c', () => {
      kb.value = kb.value.slice(0, -1); this._build();
    });

    const footY = specY + STRIDE + 6;
    this._btn(sys, '\u2715 Cancel', PX + 10, footY, 140, 32, '#553', () => {
      this._stopKeyboard(); this._build();
    });
    this._btn(sys, '\u2713 Apply', PX + PW - 154, footY, 140, 32, '#2a9d8f', () => {
      const v = kb.value;
      const fn = kb.applyVal;
      this._stopKeyboard();
      fn(v);
    });
  },

  // ─── panel build ──────────────────────────────────────────────────────────

  _sys() {
    if (!this._uiSys) this._uiSys = this.el.sceneEl.systems['ui-overlay'];
    return this._uiSys;
  },

  _clear() {
    this._setHoveredButton(null);
    this._btnMap.clear();
    while (this.panelRoot.firstChild) this.panelRoot.removeChild(this.panelRoot.firstChild);
  },

  _getUiButtonHit() {
    if (!this.panelRoot?.object3D?.visible) return null;

    const rc = this.el.components.raycaster;
    if (!rc) return null;

    for (const hit of (rc.intersections || [])) {
      const el = hit?.object?.el;
      if (!el) continue;
      let node = el;
      while (node && node !== this.panelRoot) {
        if (this._btnMap.has(node)) return node;
        node = node.parentElement;
      }
    }

    return null;
  },

  _setHoveredButton(btn) {
    if (this._hoveredBtn === btn) return;
    if (this._hoveredBtn) this._paintButtonHover(this._hoveredBtn, false);
    this._hoveredBtn = btn;
    if (this._hoveredBtn) this._paintButtonHover(this._hoveredBtn, true);
  },

  _paintButtonHover(btn, active) {
    const color = btn.dataset.baseColor || '#2f3f55';
    const opacity = active ? 1 : 0.93;
    const scale = active ? 1.04 : 1;
    btn.setAttribute('material', `color: ${color}; opacity: ${opacity}; transparent: true; side: double`);
    btn.object3D.scale.set(scale, scale, scale);
  },

  _build() {
    const sys = this._sys();
    if (!sys || !this.panelRoot || !this.selectedEntity) return;
    this._clear();
    if (this._kbMode)            this._buildKeyboardPanel(sys);
    else if (this.assetMode)     this._buildAssetPanel(sys);
    else if (this.editMode)      this._buildPropsPanel(sys);
    else if (this.addMode)       this._buildAddPanel(sys);
    else                         this._buildListPanel(sys);
  },

  // ─── list panel ───────────────────────────────────────────────────────────

  _buildListPanel(sys) {
    const entity = this.selectedEntity;
    const comps  = Object.keys(entity.components || {}).filter(c => !SKIP.has(c));
    const page   = comps.slice(this.pageOffset * PAGE_SIZE, (this.pageOffset + 1) * PAGE_SIZE);
    const PX = 332, PY = 28, PW = 360;
    const PH = 100 + page.length * (ROW_H + 4) + 44;

    this._bg(sys, PX, PY, PW, PH);
    this._text(sys, 'Component Tool',  '#8ecae6', PX + 12, PY + 18, 300);
    this._text(sys, `Entity: ${entity.id || entity.tagName.toLowerCase()}`, '#aac4de', PX + 12, PY + 40, 300);
    this._text(sys, 'Components:',     '#7a9db5', PX + 12, PY + 62, 300);

    page.forEach((name, i) => {
      const rowY = PY + 82 + i * (ROW_H + 4);
      this._row(sys, name, PX, rowY, PW, () => {
        entity.removeAttribute(name);
        Events.emit('entityupdate', { entity, component: name, property: '', value: null });
        this._build();
      });
    });

    const footY = PY + PH - 40;
    this._btn(sys, '+ Add', PX + 10, footY, 80, 30, '#2a9d8f', () => {
      this.addMode = true; this.pageOffset = 0; this._build();
    });
    this._btn(sys, 'Assets', PX + 96, footY, 80, 30, '#5a3e8a', () => {
      this.assetMode = true; this.pageOffset = 0; this._build();
    });

    const total = Math.ceil(comps.length / PAGE_SIZE);
    if (this.pageOffset > 0) {
      this._btn(sys, '< Prev', PX + 184, footY, 60, 30, '#334', () => { this.pageOffset--; this._build(); });
    }
    if (this.pageOffset + 1 < total) {
      this._btn(sys, 'Next >', PX + 252, footY, 60, 30, '#334', () => { this.pageOffset++; this._build(); });
    }
    this._btn(sys, 'Close', PX + PW - 82, footY, 68, 30, '#553', () => this._closePanel());
  },

  _row(sys, name, PX, rowY, PW, removeFn) {
    this._btn(sys, name, PX + 8, rowY + 2, PW - 54, ROW_H - 4, '#1a3352', () => {
      this.editMode = { compName: name };
      this.pageOffset = 0;
      this._build();
    });
    this._btn(sys, 'X', PX + PW - 42, rowY + 2, 34, ROW_H - 4, '#c0392b', removeFn);
  },

  // ─── asset panel ───────────────────────────────────────────────────────────

  _buildAssetPanel(sys) {
    const assets = Array.from(this.el.sceneEl.querySelectorAll('a-assets > *'));
    const page   = assets.slice(this.pageOffset * PAGE_SIZE, (this.pageOffset + 1) * PAGE_SIZE);
    const total  = Math.ceil(assets.length / PAGE_SIZE);
    const PX = 332, PY = 28, PW = 360;
    const PH = 82 + Math.max(1, page.length) * (ROW_H + 4) + 44;

    this._bg(sys, PX, PY, PW, PH);
    this._text(sys, this.pendingApplyVal ? 'Pick Asset' : 'Assets', '#c3a6ff', PX + 12, PY + 18, 300);
    this._text(sys, `${assets.length} asset(s)`, '#aac4de', PX + 12, PY + 40, 300);

    if (page.length === 0) {
      this._text(sys, 'No assets found', '#778899', PX + 12, PY + 64, 300);
    }

    page.forEach((asset, i) => {
      const rowY = PY + 60 + i * (ROW_H + 4);
      const tag  = asset.tagName.toLowerCase();
      const id   = asset.id ? `#${asset.id}` : '';
      const src  = asset.getAttribute('src') || asset.getAttribute('href') || '';
      const label = `${id || tag} ${src.split('/').pop()}`.trim().slice(0, 30);
      this._btn(sys, label, PX + 8, rowY + 2, PW - 54, ROW_H - 4, this.pendingApplyVal ? '#3a1a6a' : '#2a1a4a', () => {
        if (this.pendingApplyVal) {
          const val = asset.id ? `#${asset.id}` : (src || '');
          const apply = this.pendingApplyVal;
          this.pendingApplyVal = null;
          this.assetMode = false;
          apply(val);
        } else {
          this._createEntityFromAsset(asset);
        }
      });
      this._btn(sys, 'X', PX + PW - 42, rowY + 2, 34, ROW_H - 4, '#c0392b', () => {
        asset.parentNode?.removeChild(asset);
        this._build();
      });
    });

    const footY = PY + PH - 40;
    this._btn(sys, '< Back', PX + 8, footY, 80, 30, '#555', () => {
      this.pendingApplyVal = null;
      this.assetMode = false; this.pageOffset = 0; this._build();
    });
    if (this.pageOffset > 0) {
      this._btn(sys, 'Prev', PX + 96, footY, 70, 30, '#334', () => { this.pageOffset--; this._build(); });
    }
    if (this.pageOffset + 1 < total) {
      this._btn(sys, 'Next', PX + 174, footY, 70, 30, '#334', () => { this.pageOffset++; this._build(); });
    }
    this._btn(sys, 'Close', PX + PW - 82, footY, 68, 30, '#553', () => this._closePanel());
  },

  _getAssetRef(asset) {
    if (!asset) return '';
    const id = asset.id ? `#${asset.id}` : '';
    const src = asset.getAttribute('src') || asset.getAttribute('href') || '';
    return id || src || '';
  },

  _getSpawnPosition() {
    const T = AFRAME?.THREE;
    if (!T) return { x: 0, y: 1.6, z: -2 };

    if (this.selectedEntity?.object3D) {
      const p = new T.Vector3();
      this.selectedEntity.object3D.getWorldPosition(p);
      return { x: p.x, y: p.y + 0.5, z: p.z };
    }

    const cam = document.getElementById('admin-camera') || this.el.sceneEl?.camera?.el;
    if (cam?.object3D) {
      const p = new T.Vector3();
      const d = new T.Vector3();
      cam.object3D.getWorldPosition(p);
      cam.object3D.getWorldDirection(d);
      p.add(d.multiplyScalar(1.5));
      return { x: p.x, y: p.y, z: p.z };
    }

    return { x: 0, y: 1.6, z: -2 };
  },

  _createEntityFromAsset(asset) {
    const assetRef = this._getAssetRef(asset);
    if (!assetRef) return;

    const tag = asset.tagName.toLowerCase();
    const rawSrc = (asset.getAttribute('src') || asset.getAttribute('href') || '').toLowerCase();
    const isModel = /\.(gltf|glb|obj|fbx|dae)(\?|#|$)/.test(rawSrc);
    const isVideo = tag === 'video' || /\.(mp4|webm|mov|ogg)(\?|#|$)/.test(rawSrc);
    const isAudio = tag === 'audio' || /\.(mp3|wav|aac|flac|ogg)(\?|#|$)/.test(rawSrc);

    const components = {
      position: this._getSpawnPosition(),
      editable: '',
      'data-raycastable': 'true'
    };

    if (isAudio) {
      components.sound = `src: ${assetRef}; autoplay: false; loop: false`;
      components.geometry = 'primitive: sphere; radius: 0.12';
      components.material = 'color: #4f86ff; wireframe: true';
    } else if (tag === 'img' || isVideo) {
      components.geometry = isVideo
        ? 'primitive: plane; width: 1.78; height: 1'
        : 'primitive: plane; width: 1; height: 0.75';
      components.material = `src: ${assetRef}; side: double; shader: standard`;
    } else if (isModel) {
      if (/\.(gltf|glb)(\?|#|$)/.test(rawSrc)) {
        components['gltf-model'] = assetRef;
      } else if (/\.obj(\?|#|$)/.test(rawSrc)) {
        components['obj-model'] = `obj: ${assetRef}`;
      } else {
        components['gltf-model'] = assetRef;
      }
      components.scale = { x: 1, y: 1, z: 1 };
    } else {
      components.geometry = 'primitive: box; width: 0.6; height: 0.6; depth: 0.6';
      components.material = `src: ${assetRef}`;
    }

    createEntity({ element: 'a-entity', components }, (entity) => {
      this.selectedEntity = entity;
      this.editMode = null;
      this.addMode = false;
      this.pendingApplyVal = null;
      this.assetMode = false;
      this.pageOffset = 0;
      this._build();
    });
  },

  // ─── add panel ────────────────────────────────────────────────────────────

  _buildAddPanel(sys) {
    const entity  = this.selectedEntity;
    const existing = new Set(Object.keys(entity.components || {}));
    const avail   = Object.keys(AFRAME.components || {})
      .filter(c => !existing.has(c) && !SKIP.has(c))
      .sort();

    const page = avail.slice(this.pageOffset * PAGE_SIZE, (this.pageOffset + 1) * PAGE_SIZE);
    const PX = 332, PY = 28, PW = 360;
    const PH = 72 + page.length * (ROW_H + 4) + 44;

    this._bg(sys, PX, PY, PW, PH);
    this._text(sys, 'Add Component', '#8ecae6', PX + 12, PY + 18, 300);
    this._text(sys, `Entity: ${entity.id || entity.tagName.toLowerCase()}`, '#aac4de', PX + 12, PY + 40, 300);

    page.forEach((name, i) => {
      const btnY = PY + 62 + i * (ROW_H + 4);
      this._btn(sys, name, PX + 8, btnY, PW - 16, ROW_H, '#1a3352', () => {
        entity.setAttribute(name, '');
        Events.emit('entityupdate', { entity, component: name, property: '', value: '' });
        this.addMode = false; this.pageOffset = 0; this._build();
      });
    });

    const footY = PY + PH - 40;
    this._btn(sys, '< Back', PX + 8, footY, 80, 30, '#555', () => {
      this.addMode = false; this.pageOffset = 0; this._build();
    });

    const total = Math.ceil(avail.length / PAGE_SIZE);
    if (this.pageOffset > 0) {
      this._btn(sys, '^ Prev', PX + 98, footY, 70, 30, '#333', () => { this.pageOffset--; this._build(); });
    }
    if (this.pageOffset + 1 < total) {
      this._btn(sys, 'v Next', PX + 180, footY, 70, 30, '#333', () => { this.pageOffset++; this._build(); });
    }
  },

  // ─── helpers ──────────────────────────────────────────────────────────────

  _bg(sys, PX, PY, PW, PH) {
    const pos = sys.toLocalPosition(PX, PY);
    const pw  = sys.pxToUnits(PW);
    const ph  = sys.pxToUnits(PH);
    const bg  = document.createElement('a-plane');
    bg.setAttribute('width',  pw);
    bg.setAttribute('height', ph);
    bg.setAttribute('material', 'color: #0d1624; opacity: 0.94; transparent: true; side: double');
    bg.setAttribute('render-order', '999');
    bg.object3D.position.set(pos.x + pw * 0.5, pos.y - ph * 0.5, 0);
    this.panelRoot.appendChild(bg);
  },

  _text(sys, value, color, px, py, widthPx, z = 0.003) {
    const pos = sys.toLocalPosition(px, py);
    const t   = document.createElement('a-text');
    t.setAttribute('value', value);
    t.setAttribute('color', color);
    t.setAttribute('width', sys.pxToUnits(widthPx));
    t.setAttribute('wrap-count', Math.max(6, String(value).length + 2));
    t.setAttribute('align', 'left');
    t.object3D.position.set(pos.x, pos.y, z);
    this.panelRoot.appendChild(t);
  },

  _btn(sys, label, px, py, bw, bh, color, action) {
    const pos = sys.toLocalPosition(px, py);
    const w   = sys.pxToUnits(bw);
    const h   = sys.pxToUnits(bh);

    const btn = document.createElement('a-plane');
    btn.setAttribute('class', 'control clickable');
    btn.setAttribute('data-raycastable', 'true');
    btn.setAttribute('data-vr-tool-ui', 'true');
    btn.setAttribute('data-component-tool-button', 'true');
    btn.dataset.baseColor = color;
    btn.setAttribute('width',  w);
    btn.setAttribute('height', h);
    btn.setAttribute('material', `color: ${color}; opacity: 0.93; transparent: true; side: double`);
    btn.setAttribute('render-order', '1001');
    btn.object3D.position.set(pos.x + w * 0.5, pos.y - h * 0.5, 0.004);

    const txt = document.createElement('a-text');
    txt.setAttribute('value', label);
    txt.setAttribute('color', '#fff');
    txt.setAttribute('width', Math.max(0.06, w * 0.92));
    txt.setAttribute('wrap-count', Math.max(4, label.length + 2));
    txt.setAttribute('align', 'center');
    txt.object3D.position.set(0, 0, 0.002);
    btn.appendChild(txt);

    this.panelRoot.appendChild(btn);
    this._btnMap.set(btn, action);
    return btn;
  },

  // ─── props panel ──────────────────────────────────────────────────────────

  _buildPropsPanel(sys) {
    const entity  = this.selectedEntity;
    const { compName } = this.editMode;
    const inst = entity.components[compName];
    if (!inst) { this.editMode = null; this._build(); return; }

    // Use the live instance schema — this reflects updateSchema() calls
    // (e.g. geometry updates its schema based on the current primitive type)
    const schema   = inst.schema;
    const isSingle = typeof schema.type === 'string';
    const curVal   = entity.getAttribute(compName);

    let props;
    if (isSingle) {
      props = [{ name: compName, def: schema, current: curVal }];
    } else {
      const cur = (typeof curVal === 'object' && curVal !== null) ? curVal : {};
      props = Object.keys(schema).map(k => ({
        name:    k,
        def:     schema[k],
        current: cur[k] !== undefined ? cur[k] : schema[k].default
      }));
    }

    const page  = props.slice(this.pageOffset * PAGE_SIZE, (this.pageOffset + 1) * PAGE_SIZE);
    const total = Math.ceil(props.length / PAGE_SIZE);
    const PX = 300, PY = 28, PW = 440;
    const PH = 86 + page.length * (ROW_H + 6) + 44;

    this._bg(sys, PX, PY, PW, PH);
    this._text(sys, `Edit: ${compName}`, '#8ecae6', PX + 12, PY + 18, 360);
    this._text(sys, `Entity: ${entity.id || entity.tagName.toLowerCase()}`, '#aac4de', PX + 12, PY + 40, 360);

    page.forEach((prop, i) => {
      const rowY = PY + 64 + i * (ROW_H + 6);
      this._propRow(sys, entity, compName, prop, isSingle, PX, rowY, PW);
    });

    const footY = PY + PH - 40;
    this._btn(sys, '< Back', PX + 8, footY, 90, 30, '#555', () => {
      this._stopTextInput(); this.editMode = null; this.pageOffset = 0; this._build();
    });
    if (this.pageOffset > 0) {
      this._btn(sys, 'Prev', PX + 106, footY, 70, 30, '#334', () => { this.pageOffset--; this._build(); });
    }
    if (this.pageOffset + 1 < total) {
      this._btn(sys, 'Next', PX + 184, footY, 70, 30, '#334', () => { this.pageOffset++; this._build(); });
    }
    this._btn(sys, 'Close', PX + PW - 82, footY, 70, 30, '#553', () => this._closePanel());
  },

  _propRow(sys, entity, compName, prop, isSingle, PX, rowY, PW) {
    const { name, def, current } = prop;
    const type = def.type || 'string';

    this._text(sys, name, '#b0c4d8', PX + 10, rowY + 16, 118, 0.005);

    const applyVal = (v) => {
      if (isSingle) entity.setAttribute(compName, v);
      else          entity.setAttribute(compName, { [name]: v });
      Events.emit('entityupdate', { entity, component: compName, property: name, value: v });
      this._build();
    };

    const CX = PX + 134;
    const RX = PX + PW - 40;

    if (type === 'boolean') {
      const on = current === true || current === 'true';
      this._btn(sys, on ? 'ON' : 'OFF', CX, rowY + 2, 84, ROW_H - 4, on ? '#2a9d8f' : '#555', () => applyVal(!on));

    } else if (type === 'number' || type === 'int') {
      const step = type === 'int' ? 1 : 0.1;
      const val  = parseFloat(current) || 0;
      const disp = type === 'int' ? String(Math.round(val)) : val.toFixed(2);
      this._text(sys, disp, '#fff', CX, rowY + 16, 68, 0.005);
      this._btn(sys, '-', CX + 74, rowY + 3, 30, ROW_H - 6, '#2d3f55', () => applyVal(parseFloat((val - step).toFixed(4))));
      this._btn(sys, '+', CX + 110, rowY + 3, 30, ROW_H - 6, '#2d3f55', () => applyVal(parseFloat((val + step).toFixed(4))));

    } else if (type === 'vec2') {
      const v = { x: parseFloat(current?.x) || 0, y: parseFloat(current?.y) || 0 };
      ['x', 'y'].forEach((axis, i) => {
        const ox = CX + i * 132;
        this._text(sys, `${axis}:${v[axis].toFixed(2)}`, '#aad', ox, rowY + 16, 84, 0.005);
        this._btn(sys, '-', ox + 88, rowY + 3, 22, ROW_H - 6, '#2d3f55', () => applyVal({ ...v, [axis]: parseFloat((v[axis] - 0.1).toFixed(3)) }));
        this._btn(sys, '+', ox + 112, rowY + 3, 22, ROW_H - 6, '#2d3f55', () => applyVal({ ...v, [axis]: parseFloat((v[axis] + 0.1).toFixed(3)) }));
      });

    } else if (type === 'vec3') {
      const v = { x: parseFloat(current?.x) || 0, y: parseFloat(current?.y) || 0, z: parseFloat(current?.z) || 0 };
      ['x', 'y', 'z'].forEach((axis, i) => {
        const ox = CX + i * 88;
        this._text(sys, `${axis}:${v[axis].toFixed(1)}`, '#aad', ox, rowY + 16, 54, 0.005);
        this._btn(sys, '-', ox + 56, rowY + 3, 16, ROW_H - 6, '#2d3f55', () => applyVal({ ...v, [axis]: parseFloat((v[axis] - 0.1).toFixed(3)) }));
        this._btn(sys, '+', ox + 74, rowY + 3, 16, ROW_H - 6, '#2d3f55', () => applyVal({ ...v, [axis]: parseFloat((v[axis] + 0.1).toFixed(3)) }));
      });

    } else if (type === 'vec4') {
      const v = { x: parseFloat(current?.x) || 0, y: parseFloat(current?.y) || 0, z: parseFloat(current?.z) || 0, w: parseFloat(current?.w) || 0 };
      ['x', 'y', 'z', 'w'].forEach((axis, i) => {
        const ox = CX + i * 64;
        this._text(sys, `${axis}:${v[axis].toFixed(1)}`, '#aad', ox, rowY + 16, 38, 0.005);
        this._btn(sys, '-', ox + 40, rowY + 3, 14, ROW_H - 6, '#2d3f55', () => applyVal({ ...v, [axis]: parseFloat((v[axis] - 0.1).toFixed(3)) }));
        this._btn(sys, '+', ox + 56, rowY + 3, 14, ROW_H - 6, '#2d3f55', () => applyVal({ ...v, [axis]: parseFloat((v[axis] + 0.1).toFixed(3)) }));
      });

    } else if (type === 'color') {
      const hex = String(current || '#808080').replace('#', '').padStart(6, '0');
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
      const S = 16;
      [['R', r, 0], ['G', g, 1], ['B', b, 2]].forEach(([lbl, val, i]) => {
        const ox = CX + i * 88;
        this._text(sys, `${lbl}:${val}`, '#aad', ox, rowY + 16, 54, 0.005);
        this._btn(sys, '-', ox + 56, rowY + 3, 16, ROW_H - 6, '#2d3f55', () => applyVal(`#${toHex(i===0?val-S:r)}${toHex(i===1?val-S:g)}${toHex(i===2?val-S:b)}`));
        this._btn(sys, '+', ox + 74, rowY + 3, 16, ROW_H - 6, '#2d3f55', () => applyVal(`#${toHex(i===0?val+S:r)}${toHex(i===1?val+S:g)}${toHex(i===2?val+S:b)}`));
      });

    } else if (def.oneOf?.length) {
      const opts = def.oneOf.map(String);
      const idx  = opts.indexOf(String(current ?? ''));
      const cur  = idx >= 0 ? idx : 0;
      this._btn(sys, '<', CX, rowY + 2, 26, ROW_H - 4, '#2d3f55', () => applyVal(opts[(cur - 1 + opts.length) % opts.length]));
      this._text(sys, opts[cur] || '', '#fff', CX + 30, rowY + 16, 150, 0.005);
      this._btn(sys, '>', CX + 186, rowY + 2, 26, ROW_H - 4, '#2d3f55', () => applyVal(opts[(cur + 1) % opts.length]));

    } else if (type === 'selector' || name === 'src') {
      const raw  = current?.id ? `#${current.id}` : String(current ?? def.default ?? '');
      const disp = raw.slice(0, 20) || '(none)';
      this._text(sys, disp, '#aad8ff', CX, rowY + 16, 148, 0.005);
      this._btn(sys, 'Pick', CX + 154, rowY + 2, 54, ROW_H - 4, '#5a3e8a', () => {
        this.pendingApplyVal = applyVal;
        this.assetMode = true;
        this.pageOffset = 0;
        this._build();
      });

    } else {
      const disp = String(current !== undefined ? current : (def.default ?? '')).slice(0, 20) || '(empty)';
      this._text(sys, disp, '#778899', CX, rowY + 16, 162, 0.005);
      this._btn(sys, 'Edit', CX + 168, rowY + 2, 60, ROW_H - 4, '#1a5280', () => {
        this._startKeyboard(name, current, applyVal);
      });
    }

    this._btn(sys, 'R', RX, rowY + 3, 32, ROW_H - 6, '#3a3028', () => applyVal(def.default));
  }
});
