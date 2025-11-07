/**
 * Gizmo Component - 3D Axis Indicator
 * 
 * Features:
 * - Shows true X, Y, Z axis at all times
 * - Red = X axis, Green = Y axis, Blue = Z axis
 * - Always shows world space orientation
 * - Configurable size and visibility
 * - Perfect for controller orientation debugging
 */

window.AFRAME.registerComponent('gizmo', {
  schema: {
    size: { type: 'number', default: 0.1 },
    visible: { type: 'boolean', default: true },
    lineWidth: { type: 'number', default: 0.005 },
    showLabels: { type: 'boolean', default: true },
    labelSize: { type: 'number', default: 0.5 },
    worldSpace: { type: 'boolean', default: false }
  },

  init: function () {
    this.gizmoContainer = null;
    this.worldSpaceContainer = null;
    this.axes = {
      x: null,
      y: null,
      z: null
    };
    this.labels = {
      x: null,
      y: null,
      z: null
    };
    
    this.createGizmo();
  },

  createGizmo: function () {
    // Main gizmo container
    this.gizmoContainer = document.createElement('a-entity');
    this.gizmoContainer.setAttribute('visible', this.data.visible);
    
    if (this.data.worldSpace) {
      // For world space gizmo, create a separate container that ignores parent rotation
      this.worldSpaceContainer = document.createElement('a-entity');
      this.worldSpaceContainer.appendChild(this.gizmoContainer);
      this.el.appendChild(this.worldSpaceContainer);
    } else {
      // For local space, attach directly to element
      this.el.appendChild(this.gizmoContainer);
    }
    
    this.createAxes();
    
    // Create axis labels if enabled
    if (this.data.showLabels) {
      this.createLabels();
    }
    
    // Create center point
    const centerPoint = document.createElement('a-sphere');
    centerPoint.setAttribute('radius', this.data.lineWidth * 2);
    centerPoint.setAttribute('color', '#ffffff');
    centerPoint.setAttribute('position', '0 0 0');
    this.gizmoContainer.appendChild(centerPoint);
  },

  createAxes: function () {
    // Create X axis (Red)
    this.axes.x = document.createElement('a-cylinder');
    this.axes.x.setAttribute('radius', this.data.lineWidth);
    this.axes.x.setAttribute('height', this.data.size);
    this.axes.x.setAttribute('color', '#ff0000'); // Red
    this.axes.x.setAttribute('position', `${this.data.size / 2} 0 0`);
    this.axes.x.setAttribute('rotation', '0 0 90');
    this.gizmoContainer.appendChild(this.axes.x);
    
    // Create Y axis (Green)
    this.axes.y = document.createElement('a-cylinder');
    this.axes.y.setAttribute('radius', this.data.lineWidth);
    this.axes.y.setAttribute('height', this.data.size);
    this.axes.y.setAttribute('color', '#00ff00'); // Green
    this.axes.y.setAttribute('position', `0 ${this.data.size / 2} 0`);
    this.axes.y.setAttribute('rotation', '0 0 0');
    this.gizmoContainer.appendChild(this.axes.y);
    
    // Create Z axis (Blue)
    this.axes.z = document.createElement('a-cylinder');
    this.axes.z.setAttribute('radius', this.data.lineWidth);
    this.axes.z.setAttribute('height', this.data.size);
    this.axes.z.setAttribute('color', '#0000ff'); // Blue
    this.axes.z.setAttribute('position', `0 0 ${this.data.size / 2}`);
    this.axes.z.setAttribute('rotation', '90 0 0');
    this.gizmoContainer.appendChild(this.axes.z);
  },

  createLabels: function () {
    // X label (Red)
    this.labels.x = document.createElement('a-text');
    this.labels.x.setAttribute('value', 'X');
    this.labels.x.setAttribute('color', '#ff0000');
    this.labels.x.setAttribute('position', `${this.data.size + 0.01} 0 0`);
    this.labels.x.setAttribute('align', 'center');
    this.labels.x.setAttribute('width', this.data.labelSize);
    this.labels.x.setAttribute('font', 'roboto');
    this.labels.x.setAttribute('billboard', '');
    this.gizmoContainer.appendChild(this.labels.x);
    
    // Y label (Green)
    this.labels.y = document.createElement('a-text');
    this.labels.y.setAttribute('value', 'Y');
    this.labels.y.setAttribute('color', '#00ff00');
    this.labels.y.setAttribute('position', `0 ${this.data.size + 0.01} 0`);
    this.labels.y.setAttribute('align', 'center');
    this.labels.y.setAttribute('width', this.data.labelSize);
    this.labels.y.setAttribute('font', 'roboto');
    this.labels.y.setAttribute('billboard', '');
    this.gizmoContainer.appendChild(this.labels.y);
    
    // Z label (Blue)
    this.labels.z = document.createElement('a-text');
    this.labels.z.setAttribute('value', 'Z');
    this.labels.z.setAttribute('color', '#0000ff');
    this.labels.z.setAttribute('position', `0 0 ${this.data.size + 0.01}`);
    this.labels.z.setAttribute('align', 'center');
    this.labels.z.setAttribute('width', this.data.labelSize);
    this.labels.z.setAttribute('font', 'roboto');
    this.labels.z.setAttribute('billboard', '');
    this.gizmoContainer.appendChild(this.labels.z);
  },

  tick: function () {
    if (this.data.worldSpace && this.worldSpaceContainer) {
      // Get the world rotation of the parent element to counter-rotate the gizmo
      const parentWorldTransform = this.el.object3D.matrixWorld;
      const parentWorldQuaternion = new THREE.Quaternion();
      parentWorldTransform.decompose(new THREE.Vector3(), parentWorldQuaternion, new THREE.Vector3());
      
      // Invert the parent's world rotation to keep gizmo aligned with world axes
      const inverseQuaternion = parentWorldQuaternion.clone().invert();
      
      // Apply the inverse rotation to the gizmo container
      this.gizmoContainer.object3D.quaternion.copy(inverseQuaternion);
    }
  },

  update: function (oldData) {
    // Handle property updates
    if (this.gizmoContainer) {
      if (oldData.visible !== this.data.visible) {
        this.gizmoContainer.setAttribute('visible', this.data.visible);
      }
      
      if (oldData.size !== this.data.size || 
          oldData.lineWidth !== this.data.lineWidth ||
          oldData.showLabels !== this.data.showLabels) {
        // Recreate gizmo with new parameters
        this.remove();
        this.createGizmo();
      }
    }
  },

  // Public API methods
  show: function () {
    if (this.gizmoContainer) {
      this.gizmoContainer.setAttribute('visible', true);
      this.data.visible = true;
    }
  },

  hide: function () {
    if (this.gizmoContainer) {
      this.gizmoContainer.setAttribute('visible', false);
      this.data.visible = false;
    }
  },

  toggle: function () {
    if (this.data.visible) {
      this.hide();
    } else {
      this.show();
    }
  },

  setSize: function (size) {
    this.data.size = size;
    this.update({});
  },

  remove: function () {
    // Clean up
    if (this.data.worldSpace && this.worldSpaceContainer && this.worldSpaceContainer.parentNode) {
      this.worldSpaceContainer.parentNode.removeChild(this.worldSpaceContainer);
    } else if (this.gizmoContainer && this.gizmoContainer.parentNode) {
      this.gizmoContainer.parentNode.removeChild(this.gizmoContainer);
    }
  }
});