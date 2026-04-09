AFRAME.registerComponent('smooth-turn', {
    schema: {
        speedDeg: { type: 'number', default: 120 },     // deg/sec at full deflection
        deadzone: { type: 'number', default: 0.15 },
        cameraRig: { type: 'selector', default: null }
    },
    init() {
        this.x = 0;
        const getX = (e) => { const d = e.detail || {}; const ax = d.axis || d.axes || []; return typeof d.x === 'number' ? d.x : (ax[0] || 0); };
        this._onThumb = (e) => { this.x = getX(e); };
        this._onAxis  = (e) => { this.x = getX(e); };
        this._resolveRig(); this.el.addEventListener('thumbstickmoved', this._onThumb);
        this.el.addEventListener('axismove', this._onAxis);
    },
    update() { this._resolveRig(); },
    remove() {
        this.el.removeEventListener('thumbstickmoved', this._onThumb);
        this.el.removeEventListener('axismove', this._onAxis);
    },
    tick(t, dt) {
        if (!this.rig) { this._resolveRig(); return; }
        let x = this.x;
        if (Math.abs(x) < this.data.deadzone) return;
        x = -x;
        const yawDeg = this.data.speedDeg * x * (dt / 1000);
        this.rig.object3D.rotation.y += yawDeg * Math.PI / 180;
    },
    _resolveRig() {
        if (this.data.cameraRig) { this.rig = this.data.cameraRig; return; }
        let el = this.el.sceneEl?.camera?.el;
        while (el?.parentElement && el.parentElement !== this.el.sceneEl) el = el.parentElement;
        this.rig = el || null;
    }
});