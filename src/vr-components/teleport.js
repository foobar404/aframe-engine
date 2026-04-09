AFRAME.registerComponent('teleport', {
  schema: {
    event: { type: 'string', default: 'abuttondown' },
    cameraRig: { type: 'selector', default: null },
    surfaces: { type: 'string', default: '.teleportable, [static-body]' },
    offsetY: { type: 'number', default: 0 }
  },

  init: function () {
    if (this.data.cameraRig) {
      this.rig = this.data.cameraRig;
    } else {
      const cam = this.el.sceneEl?.querySelector('[camera]') || this.el.sceneEl?.querySelector('a-camera');
      this.rig = cam ? cam.parentEl : null;
    }
    this._ray = new THREE.Raycaster();
    this._dir = new THREE.Vector3();
    this._origin = new THREE.Vector3();

    this._onEvent = () => this.tryTeleport();
    this.el.addEventListener(this.data.event, this._onEvent);
  },

  remove: function () {
    this.el.removeEventListener(this.data.event, this._onEvent);
  },

  tryTeleport: function () {
    if (!this.rig) return false;

    this.el.object3D.getWorldPosition(this._origin);
    this.el.object3D.getWorldDirection(this._dir);
    this._dir.multiplyScalar(-1);

    this._ray.set(this._origin, this._dir);
    this._ray.far = 20;

    const surfaces = this.el.sceneEl?.querySelectorAll(this.data.surfaces) || [];
    const meshes = [];
    for (let i = 0; i < surfaces.length; i++) {
      if (surfaces[i].object3D) meshes.push(surfaces[i].object3D);
    }

    const hits = this._ray.intersectObjects(meshes, true);
    if (!hits.length) return false;

    const p = hits[0].point;
    this.rig.object3D.position.set(p.x, p.y + this.data.offsetY, p.z);
    this.el.emit('xr:teleport-complete', { x: p.x, y: p.y, z: p.z });
    return true;
  }
});
