window.AFRAME.registerComponent('editor-vertical-move', {
    schema: {
        enabled: { type: 'boolean', default: true },
        speed:   { type: 'number',  default: 4 },
        deadzone:{ type: 'number',  default: 0.15 },
        cameraRig: { type: 'selector', default: null }
    },

    SPEED_PRESETS: [4, 12, 28],

    init() {
        this.y = 0;
        this.cameraRig = null;
        this.currentSpeedIndex = 0;
        this.data.speed = this.SPEED_PRESETS[0];

        const axisY = (d) => { const a = d.axis || d.axes || []; return typeof d.y === 'number' ? d.y : (a[1] || 0); };
        this._onThumb = (e) => { this.y = axisY(e.detail || {}); };
        this._onAxis  = (e) => { this.y = axisY(e.detail || {}); };
        this._onThumbDown = () => {
            this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.SPEED_PRESETS.length;
            this.data.speed = this.SPEED_PRESETS[this.currentSpeedIndex];
            this.el.emit('haptic-pulse', { intensity: 0.3, duration: 40 }, false);
        };

        this.el.addEventListener('thumbstickmoved', this._onThumb);
        this.el.addEventListener('axismove', this._onAxis);
        this.el.addEventListener('thumbstickdown', this._onThumbDown);

        const onLoaded = () => this._resolveRig();
        if (this.el.sceneEl?.hasLoaded) { this._resolveRig(); } else { this.el.sceneEl?.addEventListener('loaded', onLoaded, { once: true }); }
        this._stopReady = () => this.el.sceneEl?.removeEventListener('loaded', onLoaded);
    },

    update() { this._resolveRig(); },

    remove() {
        this.el.removeEventListener('thumbstickmoved', this._onThumb);
        this.el.removeEventListener('axismove', this._onAxis);
        this.el.removeEventListener('thumbstickdown', this._onThumbDown);
        if (this._stopReady) this._stopReady();
    },

    tick(t, dt) {
        if (!this.data.enabled || !this.cameraRig) return;
        const raw = this.y;
        const y = Math.abs(raw) > this.data.deadzone ? raw : 0;
        if (!y) return;

        // Stick up (negative y) = ascend, stick down (positive y) = descend
        const move = -y * this.data.speed * (dt / 1000);
        this.cameraRig.object3D.position.y += move;
    },

    _resolveRig() {
        if (this.data.cameraRig) {
            this.cameraRig = this.data.cameraRig;
            return;
        }
        // Walk up to find rig by convention
        let el = this.el.parentElement;
        while (el && el !== this.el.sceneEl) {
            if ((el.id || '').includes('rig') || (el.id || '').includes('camera')) {
                this.cameraRig = el;
                return;
            }
            el = el.parentElement;
        }
        this.cameraRig = this.el.parentElement || null;
    }
});
