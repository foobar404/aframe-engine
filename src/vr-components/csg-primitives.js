AFRAME.registerComponent('csg-primitive', {
  schema: {
    shape: { type: 'string', default: 'box' },
    op: { type: 'string', default: 'add' },
    size: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
    radius: { type: 'number', default: 0.5 },
    height: { type: 'number', default: 1 }
  },

  init: function () {
    this.applyGeometry();
  },

  update: function () {
    this.applyGeometry();
  },

  applyGeometry: function () {
    const d = this.data;
    if (d.shape === 'sphere') {
      this.el.setAttribute('geometry', { primitive: 'sphere', radius: d.radius });
    } else if (d.shape === 'cylinder') {
      this.el.setAttribute('geometry', { primitive: 'cylinder', radius: d.radius, height: d.height });
    } else {
      this.el.setAttribute('geometry', { primitive: 'box', width: d.size.x, height: d.size.y, depth: d.size.z });
    }

    this.el.setAttribute('data-csg-op', d.op);
  }
});
