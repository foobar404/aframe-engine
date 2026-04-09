window.AFRAME.registerComponent('editor-vr-controller', {
    schema: {
        size: { type: 'number', default: 0.01 },
        offset: { type: 'vec3', default: { x: 0, y: 0, z: -0.05 } }
    },

    init() {
        this.T = AFRAME.THREE;
        this.hoveredEl = null;
        this._cursorPos = new this.T.Vector3();
        this._elPos = new this.T.Vector3();
        this._controls = [];
        this._onTrigger = this._onTrigger.bind(this);
        this.el.addEventListener('triggerdown', this._onTrigger);
        this._buildCursor();
        // cache controls list — rebuild when scene changes
        this._refreshControls();
        this.el.sceneEl.addEventListener('child-attached', () => this._refreshControls());
        this.el.sceneEl.addEventListener('child-detached', () => this._refreshControls());
    },

    remove() {
        this.el.removeEventListener('triggerdown', this._onTrigger);
        if (this.cursor?.parentNode) this.cursor.parentNode.removeChild(this.cursor);
    },

    _buildCursor() {
        this.cursor = document.createElement('a-entity');
        this.cursor.setAttribute('geometry', `primitive: sphere; radius: ${this.data.size}`);
        this.cursor.setAttribute('material', 'color: #444444; metalness: 1');
        this.cursor.setAttribute('position', `${this.data.offset.x} ${this.data.offset.y} ${this.data.offset.z}`);
        this.cursor.setAttribute('class', 'control');
        this.cursor.setAttribute('data-vr-tool-ui', 'true');
        this.el.appendChild(this.cursor);
    },

    _refreshControls() {
        this._controls = Array.from(this.el.sceneEl.querySelectorAll('.control'));
    },

    _getCursorPos() {
        if (!this.cursor?.object3D) return null;
        this.cursor.object3D.getWorldPosition(this._cursorPos);
        return this._cursorPos;
    },

    _findHovered() {
        const pos = this._getCursorPos();
        if (!pos) return null;
        const reach = this.data.size * 0.5 + 0.025;
        for (const el of this._controls) {
            if (el === this.cursor || !el.object3D) continue;
            el.object3D.getWorldPosition(this._elPos);
            if (pos.distanceTo(this._elPos) < reach) return el;
        }
        return null;
    },

    _onTrigger() {
        if (!this.hoveredEl) return;
        this.hoveredEl.emit('vr-select', { controller: this.el }, false);
        this.el.emit('haptic-pulse', { intensity: 0.4, duration: 60 }, false);
    },

    tick() {
        const hit = this._findHovered();

        if (hit !== this.hoveredEl) {
            if (this.hoveredEl) this.hoveredEl.emit('vr-hover-end', { controller: this.el }, false);
            if (hit) {
                hit.emit('vr-hover', { controller: this.el }, false);
                // auto-select on collision
                hit.emit('vr-select', { controller: this.el }, false);
                this.el.emit('haptic-pulse', { intensity: 0.4, duration: 60 }, false);
            }
            this.hoveredEl = hit;
        }

        const color = hit ? '#00ffcc' : '#ffffff';
        const opacity = hit ? '0.4' : '0.15';
        this.cursor.setAttribute('material', `color: ${color};`);
    }
});
