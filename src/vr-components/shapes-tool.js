window.AFRAME.registerComponent('shapes-tool', {
  primitiveIndex: 0,
  availablePrimitives: [
    'box', 'sphere', 'cone', 'cylinder', 'torus',
    'dodecahedron', 'icosahedron', 'octahedron', 'tetrahedron',
    'plane', 'circle', 'ring', 'triangle'
  ],
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
    primitive: { type: "string", default: "box" },
    showPreview: { type: "boolean", default: true }
  },

  init: function () {
    this.createShapePreview();

    // Event listeners
    this.el.addEventListener('xbuttondown', this.onPlaceShape.bind(this));
    this.el.addEventListener('abuttondown', this.onPlaceShape.bind(this));
    this.el.addEventListener('ybuttondown', this.cycleShapeForward.bind(this));
    this.el.addEventListener('bbuttondown', this.cycleShapeBackward.bind(this));
  },

  createShapePreview: function () {
    // Remove existing preview
    if (this.shapePreview) {
      this.el.removeChild(this.shapePreview);
    }

    const primitive = this.availablePrimitives[this.primitiveIndex];

    // Create preview
    this.shapePreview = document.createElement('a-entity');
    this.shapePreview.setAttribute('id', 'shape-preview');
    this.shapePreview.setAttribute('position', '0.007 -0.03 -0.08');
    this.shapePreview.setAttribute('visible', this.data.showPreview);
    this.shapePreview.setAttribute('geometry', `primitive: ${primitive};`);
    this.shapePreview.setAttribute('scale', '0.03 0.03 0.03');
    this.shapePreview.setAttribute('animation', 'property: rotation; to: 360 360 360; loop: true; dur: 9000; easing: linear');

    this.el.appendChild(this.shapePreview);

    // Apply normal material after a brief delay to ensure geometry is loaded
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
    this.primitiveIndex = (this.primitiveIndex + 1) % this.availablePrimitives.length;
    this.createShapePreview();
  },

  cycleShapeBackward: function () {
    this.primitiveIndex = (this.primitiveIndex - 1 + this.availablePrimitives.length) % this.availablePrimitives.length;
    this.createShapePreview();
  },

  onPlaceShape: function () {
    this.createPrimitive();
    this.el.emit("haptic-pulse", { intensity: 1, duration: 100 }, false);
  },

  createPrimitive: function () {
    const primitive = this.availablePrimitives[this.primitiveIndex];
    const worldPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(worldPos);

    const entity = this.createGeometryEntity(primitive, worldPos);
    this.el.sceneEl.appendChild(entity);
    this.saveEntityToProject(entity, primitive, worldPos);
  },

  createGeometryEntity: function (primitive, position) {
    const entity = document.createElement('a-entity');

    entity.setAttribute('id', this.genID());
    entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    entity.setAttribute('scale', '0.1 0.1 0.1');
    entity.setAttribute('geometry', `primitive: ${primitive};`);
    entity.setAttribute('material', this.getMaterialString(primitive));
    entity.setAttribute('grabbable', '');
    entity.setAttribute('collision', '');
    entity.setAttribute('editable', '');

    return entity;
  },

  is2D: function (primitive) {
    return ['plane', 'circle', 'ring', 'triangle'].includes(primitive);
  },

  getMaterialString: function (primitive) {
    // Get random bright color
    const randomColor = this.brightColors[Math.floor(Math.random() * this.brightColors.length)];
    const material = `color: ${randomColor}; roughness:.6; metalness:1;`;
    return this.is2D(primitive) ? `${material}; side: double` : material;
  },

  saveEntityToProject: async function (entity) {
    const sceneEntity = {
      id: entity.id,
      tagName: "a-entity",
      properties: {
        position: entity.getAttribute('position'),
        scale: entity.getAttribute('scale'),
        geometry: entity.getAttribute('geometry'),
        material: entity.getAttribute('material'),
        editable: true,
      }
    };

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(window.PROJECT_DATA.path)}/scenes/${encodeURIComponent(window.PROJECT_DATA.activeScene)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: {
            action: 'add',
            entity: sceneEntity
          }
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error adding shape to scene:', err);
    }
  },

  genID: function () {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
  }
});

