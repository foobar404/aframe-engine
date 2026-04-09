AFRAME.registerComponent('vignette', {
    schema: {
        color: { type: 'color', default: '#000000' },
        radius: { type: 'number', default: 0.75 },      // 0..1, outer radius (normalized)
        innerRadius: { type: 'number', default: 0.18 }, // 0..1, inner clear radius (donut hole)
        opacity: { type: 'number', default: 1.0 },      // 0..1, max darkening
        distance: { type: 'number', default: 0.12 }     // meters in front of camera
    },

    init: function () {
        this._makeRing();
        this._updateQuad = this._updateQuad.bind(this);
        this.el.addEventListener('componentchanged', this._updateQuad);
    },

    update: function (oldData) {
        // recreate geometry if radii changed
        const needGeomUpdate = !this.geo || (oldData && (oldData.radius !== this.data.radius || oldData.innerRadius !== this.data.innerRadius));
        if (needGeomUpdate) {
            this._rebuildRingGeometry();
        }
        if (this.mat) {
            this.mat.color.set(this.data.color);
            this.mat.opacity = this.data.opacity;
            this.mat.needsUpdate = true;
        }
    },

    tick: function () { this._updateQuad(); },

    remove: function () {
        this.el.removeEventListener('componentchanged', this._updateQuad);
        if (!this.mesh) return;
        this.el.object3D.remove(this.mesh);
        this.geo.dispose(); this.mat.dispose();
        this.mesh = this.geo = this.mat = null;
    },

    _makeRing: function () {
        // create a flat ring geometry in normalized units (inner/outer between 0..1)
        // actual world size is controlled by mesh.scale in _updateQuad
        const inner = Math.max(0, Math.min(1, this.data.innerRadius));
        const outer = Math.max(inner + 0.001, Math.min(1, this.data.radius));
        const segments = 64;
        const geo = new THREE.RingGeometry(inner, outer, segments);
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.data.color), transparent: true, opacity: this.data.opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 1000;
        mesh.frustumCulled = false;
        this.geo = geo; this.mat = mat; this.mesh = mesh;
        this.el.object3D.add(mesh);
    },

    _rebuildRingGeometry: function () {
        if (this.mesh) {
            // remove and dispose existing geometry
            this.el.object3D.remove(this.mesh);
            if (this.geo) this.geo.dispose();
            if (this.mat) this.mat.dispose();
            this.mesh = this.geo = this.mat = null;
        }
        this._makeRing();
    },

    _updateQuad: function () {
        const cam = this.el.getObject3D('camera') || this.el.object3DMap.camera;
        if (!cam || !this.mesh) return;

        const dist = this.data.distance;
        const fov = ('isPerspectiveCamera' in cam && cam.isPerspectiveCamera) ? THREE.MathUtils.degToRad(cam.fov) : Math.PI / 3;
        const aspect = cam.aspect || (this.el.sceneEl && this.el.sceneEl.canvas ? this.el.sceneEl.canvas.width / this.el.sceneEl.canvas.height : 1);
        const h = 2 * Math.tan(fov / 2) * dist;
        const w = h * aspect;

        this.mesh.position.set(0, 0, -dist);
        // scale ring so it appears round on screen: use the smaller dimension
        // to compute a uniform scale, then stretch to match aspect horizontally
        const minSize = Math.min(w, h);
        const scaleX = minSize * aspect;
        const scaleY = minSize;
        this.mesh.scale.set(scaleX, scaleY, 1);

        // keep on top
        this.mesh.material.depthTest = false;
        this.mesh.material.depthWrite = false;
    }
});
