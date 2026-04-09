/**
 * visor — cycles render modes on controller touch near the head.
 * Modes: normal → wireframe → xray → depth → normal …
 */
const VISOR_MODES    = ['normal', 'wireframe', 'xray', 'depth'];
const VISOR_COLORS   = { normal: '#22d3ee', wireframe: '#f97316', xray: '#a855f7', depth: '#22c55e' };
// depth colour ramp: near=hot, far=cool
const DEPTH_NEAR_COL = new THREE.Color('#ff4444');
const DEPTH_FAR_COL  = new THREE.Color('#4488ff');
const DEPTH_MAX      = 30; // metres

window.AFRAME.registerComponent('editor-visor', {
  schema: {
    offset: { type: 'vec3',   default: { x: 0, y: 0.15, z: -0.18 } },
    size:   { type: 'number', default: 0.22 }
  },

  init() {
    this._modeIdx  = 0;   // index into VISOR_MODES, 0 = normal
    this._cooldown = 0;
    this._saved    = new Map(); // mesh → saved material props
    this._mesh     = null;
    this._mat      = null;
    this._buildMesh();
  },

  remove() {
    this._restore();
    if (this._mesh) {
      this.el.object3D.remove(this._mesh);
      this._mesh.geometry.dispose();
      this._mat.dispose();
      this._mesh = this._mat = null;
    }
  },

  tick(t) {
    if (t - this._cooldown < 700) return;

    const halfSize  = this.data.size * 0.5;
    const worldPos  = new THREE.Vector3();
    this._mesh.getWorldPosition(worldPos);

    const controllers = this.el.sceneEl.querySelectorAll('[oculus-touch-controls], [laser-controls], [hand-controls]');
    let hit = false;
    controllers.forEach((ctrl) => {
      if (!ctrl.object3D) return;
      const cp = new THREE.Vector3();
      ctrl.object3D.getWorldPosition(cp);
      if (Math.abs(cp.x - worldPos.x) < halfSize &&
          Math.abs(cp.y - worldPos.y) < halfSize &&
          Math.abs(cp.z - worldPos.z) < halfSize) {
        hit = true;
      }
    });

    if (!hit) return;
    this._cooldown = t;

    // restore before switching so we have clean originals
    this._restore();
    this._modeIdx = (this._modeIdx + 1) % VISOR_MODES.length;
    const mode = VISOR_MODES[this._modeIdx];
    if (mode !== 'normal') this._applyMode(mode);
  },

  // ── apply ──────────────────────────────────────────────────────────────────

  _applyMode(mode) {
    const camPos = new THREE.Vector3();
    const cam = this.el.sceneEl.camera;
    if (cam) cam.getWorldPosition(camPos);

    this._eachMesh((mesh) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        // save originals once
        if (!this._saved.has(m)) {
          this._saved.set(m, {
            wireframe:   m.wireframe,
            transparent: m.transparent,
            opacity:     m.opacity,
            depthWrite:  m.depthWrite,
            color:       m.color ? m.color.clone() : null
          });
        }

        if (mode === 'wireframe') {
          m.wireframe = true;

        } else if (mode === 'xray') {
          m.transparent = true;
          m.opacity     = 0.15;
          m.depthWrite  = false;

        } else if (mode === 'depth') {
          if (!m.color) return;
          const wp = new THREE.Vector3();
          mesh.getWorldPosition(wp);
          const dist = wp.distanceTo(camPos);
          const t    = Math.min(dist / DEPTH_MAX, 1);
          m.color.lerpColors(DEPTH_NEAR_COL, DEPTH_FAR_COL, t);
        }

        m.needsUpdate = true;
      });
    });
  },

  _restore() {
    this._saved.forEach((orig, m) => {
      m.wireframe   = orig.wireframe;
      m.transparent = orig.transparent;
      m.opacity     = orig.opacity;
      m.depthWrite  = orig.depthWrite;
      if (orig.color && m.color) m.color.copy(orig.color);
      m.needsUpdate = true;
    });
    this._saved.clear();
  },

  _eachMesh(fn) {
    this.el.sceneEl.object3D.traverse((obj) => {
      if (!obj.isMesh || obj === this._mesh) return;
      const el = obj.el;
      if (el && (el.closest('[data-vr-tool-ui]') || el.closest('a-assets'))) return;
      fn(obj);
    });
  },

  // ── build invisible trigger volume ────────────────────────────────────────

  _buildMesh() {
    const { x, y, z } = this.data.offset;
    const s   = this.data.size;
    const geo = new THREE.BoxGeometry(s, s * 0.35, s * 1.4);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.visible = false;
    this._mesh = mesh;
    this._mat  = mat;
    this.el.object3D.add(mesh);
  }
});
