import { Events } from '../lib/Events';
import { generateEntityId } from '../lib/entity';

window.AFRAME.registerComponent('shapes-tool', {
  primitiveIndex: 0,
  availablePrimitives: [
    // geometry
    'box', 'sphere', 'cone', 'cylinder', 'torus',
    'dodecahedron', 'icosahedron', 'octahedron', 'tetrahedron',
    'plane', 'circle', 'ring', 'triangle',
    // scene objects
    'light-point', 'light-spot', 'light-directional', 'light-ambient',
    'camera', 'sound', 'text', 'gltf-model', 'image', 'video'
  ],
  META_TYPES: new Set([
    'light-point', 'light-spot', 'light-directional', 'light-ambient',
    'camera', 'sound', 'text', 'gltf-model', 'image', 'video'
  ]),
  brightColors: [
    '#FF0040', // Bright Red
    '#FF8000', // Bright Orange  
    '#FFFF00', // Bright Yellow
    '#80FF00', // Bright Lime
    '#00FF40', // Bright Green
    '#00FF80', // Bright Mint
    '#00FFFF', // Bright Cyan
    '#0080FF', // Bright Sky Blue
    '#0040FF', // Bright Blue
    '#8000FF', // Bright Purple
    '#FF00FF', // Bright Magenta
    '#FF0080'  // Bright Pink
  ],
  shapePreview: null,
  schema: {
    enabled: { type: 'boolean', default: true },
    primitive: { type: "string", default: "box" },
    showPreview: { type: "boolean", default: true }
  },

  init: function () {
    this._isDrawing = false;
    this._ghostEntity = null;
    this._ghostSize = 0.1;
    this._drawStartPos = new THREE.Vector3();
    this._drawStartRot = { x: 0, y: 0, z: 0 };
    this._drawColor = '#FFFFFF';

    this.createShapePreview();

    this.el.addEventListener('triggerdown', this.onTriggerDown.bind(this));
    this.el.addEventListener('triggerup', this.onTriggerUp.bind(this));
    this.el.addEventListener('ybuttondown', this.cycleShapeForward.bind(this));
    this.el.addEventListener('bbuttondown', this.cycleShapeForward.bind(this));
    this.el.addEventListener('xbuttondown', this.cycleShapeBackward.bind(this));
    this.el.addEventListener('abuttondown', this.cycleShapeBackward.bind(this));

    this.applyEnabledState();
  },

  update: function (oldData) {
    if (!oldData || typeof oldData.enabled === 'undefined') {
      this.applyEnabledState();
      return;
    }

    if (oldData.enabled !== this.data.enabled || oldData.showPreview !== this.data.showPreview) {
      this.applyEnabledState();
    }
  },

  applyEnabledState: function () {
    const visible = !!this.data.enabled && !!this.data.showPreview;
    if (this.shapePreview) this.shapePreview.setAttribute('visible', visible);
    if (this._previewLabel) this._previewLabel.setAttribute('visible', visible);
  },

  onToolActivated: function () {
    this.applyEnabledState();
  },

  onToolDeactivated: function () {
    this.applyEnabledState();
  },

  createShapePreview: function () {
    if (this.shapePreview) this.el.removeChild(this.shapePreview);
    if (this._previewLabel) this.el.removeChild(this._previewLabel);

    const primitive = this.availablePrimitives[this.primitiveIndex];
    const isMeta = this.META_TYPES.has(primitive);
    const visible = !!this.data.enabled && !!this.data.showPreview;

    this.shapePreview = document.createElement('a-entity');
    this.shapePreview.setAttribute('id', 'shape-preview');
    this.shapePreview.setAttribute('position', '0.007 -0.03 -0.08');
    this.shapePreview.setAttribute('visible', visible);
    this.shapePreview.setAttribute('geometry', `primitive: ${isMeta ? 'box' : primitive};`);
    this.shapePreview.setAttribute('scale', '0.03 0.03 0.03');
    this.shapePreview.setAttribute('animation', 'property: rotation; to: 360 360 360; loop: true; dur: 9000; easing: linear');

    this._previewLabel = document.createElement('a-entity');
    this._previewLabel.setAttribute('position', '0.007 -0.01 -0.11');
    this._previewLabel.setAttribute('rotation', '-90 0 0');
    this._previewLabel.setAttribute('visible', visible);

    const bg = document.createElement('a-entity');
    bg.setAttribute('geometry', 'primitive: plane; width: 0.1; height: 0.018');
    bg.setAttribute('material', 'color: #111111; opacity: 0.75; transparent: true; shader: flat; side: double');

    const txt = document.createElement('a-entity');
    txt.setAttribute('text', `value: ${primitive}; align: center; color: #4fc3f7; width: 0.09; wrapCount: 18; baseline: center`);
    txt.setAttribute('position', '0 0 0.001');

    this._previewLabel.appendChild(bg);
    this._previewLabel.appendChild(txt);

    this.el.appendChild(this.shapePreview);
    this.el.appendChild(this._previewLabel);
    setTimeout(() => this.applyNormalMaterial(), 50);
  },

  applyNormalMaterial: function () {
    if (!this.shapePreview?.object3D) return;

    this.shapePreview.object3D.traverse((child) => {
      if (child.geometry && child.material) {
        const material = new THREE.MeshNormalMaterial();
        const primitive = this.availablePrimitives[this.primitiveIndex];

        // Double-sided for 2D primitives
        if (this.is2D(primitive)) {
          material.side = THREE.DoubleSide;
        }

        child.material = material;
      }
    });
  },

  cycleShapeForward: function () {
    if (!this.data.enabled) return;
    this.primitiveIndex = (this.primitiveIndex + 1) % this.availablePrimitives.length;
    this.createShapePreview();
  },

  cycleShapeBackward: function () {
    if (!this.data.enabled) return;
    this.primitiveIndex = (this.primitiveIndex - 1 + this.availablePrimitives.length) % this.availablePrimitives.length;
    this.createShapePreview();
  },

  onTriggerDown: function () {
    if (!this.data.enabled || this._isDrawing) return;
    this._isDrawing = true;
    this._ghostSize = 0.1;
    this._drawColor = this.brightColors[Math.floor(Math.random() * this.brightColors.length)];

    this._drawStartPos.copy(this.getSpawnPosition());
    this._drawStartRot = this.getSpawnRotation();

    const primitive = this.availablePrimitives[this.primitiveIndex];
    const isMeta = this.META_TYPES.has(primitive);
    this._isMetaPlacement = isMeta;

    this._ghostEntity = document.createElement('a-entity');
    this._ghostEntity.setAttribute('geometry', `primitive: ${isMeta ? 'box' : primitive};`);
    this._ghostEntity.setAttribute('material', `color: ${this._drawColor}; opacity: 0.5; transparent: true; wireframe: true;`);
    this._ghostEntity.setAttribute('position', `${this._drawStartPos.x} ${this._drawStartPos.y} ${this._drawStartPos.z}`);
    this._ghostEntity.setAttribute('rotation', `${this._drawStartRot.x} ${this._drawStartRot.y} ${this._drawStartRot.z}`);
    this._ghostEntity.setAttribute('scale', `${this._ghostSize} ${this._ghostSize} ${this._ghostSize}`);
    this.el.sceneEl.appendChild(this._ghostEntity);

    if (this.shapePreview) this.shapePreview.setAttribute('visible', false);
    if (this._previewLabel) this._previewLabel.setAttribute('visible', false);
  },

  onTriggerUp: function () {
    if (!this._isDrawing) return;
    this._isDrawing = false;

    if (this._ghostEntity) {
      const size = this._ghostSize;
      const primitive = this.availablePrimitives[this.primitiveIndex];
      const pos = this._drawStartPos;
      const rot = this.getSpawnRotation();

      this._ghostEntity.parentNode?.removeChild(this._ghostEntity);
      this._ghostEntity = null;

      const entity = this.createGeometryEntity(primitive, pos, size, null, rot);
      this.el.sceneEl.appendChild(entity);
      entity.addEventListener('loaded', () => Events.emit('entitycreated', entity), { once: true });
      this.el.emit('haptic-pulse', { intensity: 1, duration: 80 }, false);
    }

    if (this.data.enabled && this.data.showPreview && this.shapePreview) {
      this.shapePreview.setAttribute('visible', true);
      if (this._previewLabel) this._previewLabel.setAttribute('visible', true);
    }
  },

  onPlaceShape: function () {
    if (!this.data.enabled) return;
    this.createPrimitive();
    this.el.emit("haptic-pulse", { intensity: 1, duration: 100 }, false);
  },

  createPrimitive: function () {
    const primitive = this.availablePrimitives[this.primitiveIndex];
    const worldPos = new THREE.Vector3();
    const rot = this.getSpawnRotation();
    this.el.object3D.getWorldPosition(worldPos);

    const entity = this.createGeometryEntity(primitive, worldPos, 0.1, null, rot);
    this.el.sceneEl.appendChild(entity);
    entity.addEventListener('loaded', () => {
      Events.emit('entitycreated', entity);
    }, { once: true });
  },

  createGeometryEntity: function (primitive, position, size, color, rotation) {
    if (this.META_TYPES.has(primitive)) {
      return this.createMetaEntity(primitive, position, rotation);
    }
    const entity = document.createElement('a-entity');
    const s = size ?? 0.1;
    const col = color ?? '#888888';

    entity.setAttribute('id', this.genID());
    entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    if (rotation) entity.setAttribute('rotation', `${rotation.x} ${rotation.y} ${rotation.z}`);
    entity.setAttribute('scale', `${s} ${s} ${s}`);
    entity.setAttribute('geometry', `primitive: ${primitive};`);
    entity.setAttribute('material', this.getMaterialString(primitive, col));

    return entity;
  },

  createMetaEntity: function (type, position, rotation) {
    const entity = document.createElement('a-entity');
    entity.setAttribute('id', this.genID());
    entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    if (rotation) entity.setAttribute('rotation', `${rotation.x} ${rotation.y} ${rotation.z}`);

    switch (type) {
      case 'light-point':
        entity.setAttribute('light', 'type: point; intensity: 1; distance: 5; color: #ffffff');
        entity.setAttribute('geometry', 'primitive: sphere; radius: 0.05');
        entity.setAttribute('material', 'color: #ffff88; emissive: #ffff88; emissiveIntensity: 1; shader: flat');
        break;
      case 'light-spot':
        entity.setAttribute('light', 'type: spot; intensity: 1; distance: 8; angle: 45; color: #ffffff');
        entity.setAttribute('geometry', 'primitive: cone; height: 0.15; radiusBottom: 0.05; radiusTop: 0.01');
        entity.setAttribute('material', 'color: #ffff88; emissive: #ffff88; emissiveIntensity: 1; shader: flat');
        break;
      case 'light-directional':
        entity.setAttribute('light', 'type: directional; intensity: 1; color: #ffffff');
        entity.setAttribute('geometry', 'primitive: box; width: 0.1; height: 0.1; depth: 0.1');
        entity.setAttribute('material', 'color: #ffffaa; emissive: #ffffaa; emissiveIntensity: 1; shader: flat');
        break;
      case 'light-ambient':
        entity.setAttribute('light', 'type: ambient; intensity: 0.5; color: #ffffff');
        entity.setAttribute('geometry', 'primitive: sphere; radius: 0.08');
        entity.setAttribute('material', 'color: #ffffff; wireframe: true; shader: flat');
        break;
      case 'camera':
        entity.setAttribute('camera', '');
        entity.setAttribute('geometry', 'primitive: box; width: 0.1; height: 0.08; depth: 0.12');
        entity.setAttribute('material', 'color: #222222');
        break;
      case 'sound':
        entity.setAttribute('sound', 'autoplay: false; loop: false');
        entity.setAttribute('geometry', 'primitive: sphere; radius: 0.06');
        entity.setAttribute('material', 'color: #4488ff; wireframe: true');
        break;
      case 'text':
        entity.setAttribute('text', 'value: Text; align: center; color: #ffffff; width: 2');
        entity.setAttribute('scale', '1 1 1');
        break;
      case 'gltf-model':
        entity.setAttribute('gltf-model', '');
        entity.setAttribute('geometry', 'primitive: box; width: 0.15; height: 0.15; depth: 0.15');
        entity.setAttribute('material', 'color: #aaaaaa; wireframe: true');
        break;
      case 'image':
        entity.setAttribute('geometry', 'primitive: plane; width: 1; height: 0.75');
        entity.setAttribute('material', 'color: #ffffff; side: double');
        break;
      case 'video':
        entity.setAttribute('geometry', 'primitive: plane; width: 1.78; height: 1');
        entity.setAttribute('material', 'color: #000000; side: double');
        break;
    }
    return entity;
  },

  is2D: function (primitive) {
    return ['plane', 'circle', 'ring', 'triangle'].includes(primitive);
  },

  getMaterialString: function (primitive, color) {
    const col = color ?? '#888888';
    const material = `color: ${col}; roughness: 0.7; metalness: 0.1;`;
    return this.is2D(primitive) ? `${material}; side: double` : material;
  },

  tick: function () {
    if (!this._isDrawing || !this._ghostEntity) return;

    const rot = this.getSpawnRotation();
    this._ghostEntity.setAttribute('rotation', `${rot.x} ${rot.y} ${rot.z}`);

    if (this._isMetaPlacement) return;

    const currentPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(currentPos);
    const dist = currentPos.distanceTo(this._drawStartPos);
    this._ghostSize = Math.max(0.05, dist * 2);
    this._ghostEntity.setAttribute('scale', `${this._ghostSize} ${this._ghostSize} ${this._ghostSize}`);
  },

  getSpawnRotation: function () {
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    this.el.object3D.getWorldQuaternion(quat);
    euler.setFromQuaternion(quat, 'YXZ');
    return {
      x: euler.x * (180 / Math.PI),
      y: euler.y * (180 / Math.PI),
      z: euler.z * (180 / Math.PI)
    };
  },

  getSpawnPosition: function () {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    this.el.object3D.getWorldPosition(pos);
    this.el.object3D.getWorldQuaternion(quat);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    pos.addScaledVector(forward, 0.35);
    return pos;
  },

  saveEntityToProject: function () {},

  genID: function () {
    return generateEntityId('a-entity');
  }
});

