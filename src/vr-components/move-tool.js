AFRAME.registerComponent('move-tool', {
  schema: {
    enableTranslation: { type: 'boolean', default: true },
    enableRotation: { type: 'boolean', default: true },
    enableScale: { type: 'boolean', default: true },
    translationSensitivity: { type: 'number', default: 4.0 },
    rotationSensitivity: { type: 'number', default: 1.0 },
    scaleSensitivity: { type: 'number', default: 1.0 },
    pullPushSensitivity: { type: 'number', default: 2.0 }
  },

  init() {
    this.T = AFRAME.THREE;
    this.selectedObjects = [];
    this.isManipulating = false;
    this.isGripping = false;
    this.sphereRadius = 0.05;
    this.currentJoystick = { x: 0, y: 0 };
    this.startControllerPosition = new this.T.Vector3();
    this.startControllerRotation = new this.T.Euler();
    this.startObjectPositions = [];
    this.startObjectRotations = [];
    this.initialRayDistance = 0;
    this.gripOffset = new this.T.Vector3(); // Offset from sphere to object when gripped
    this.gripRotationOffset = new this.T.Euler(); // Rotation offset when gripped

    this.setupRaycaster();
    this.createSelectionSphere();
    this.bindEvents();
  },

  bindEvents() {
    const events = ['triggerdown', 'triggerup', 'gripdown', 'gripup', 'thumbstickmoved', 'bbuttondown', 'ybuttondown', 'xbuttondown', 'abuttondown'];
    events.forEach(event => this.el.addEventListener(event, this[`handle${event.replace('-', '').replace(/^\w/, c => c.toUpperCase())}`].bind(this)));
    this.el.sceneEl.addEventListener('clearSelection', this.clearSelection.bind(this));
  },

  setupRaycaster() {
    this.el.setAttribute('raycaster', {
      objects: '[editable]',
      far: 1000,
      showLine: true,
      lineColor: 'rgba(255,255,255,0.31)',
      lineOpacity: 0.5
    });
  },

  createSelectionSphere() {
    this.selectionSphere = document.createElement('a-entity');
    this.selectionSphere.setAttribute('geometry', `primitive: sphere; radius: ${this.sphereRadius}`);
    this.selectionSphere.setAttribute('position', '-0.07 -0.06 0.02');
    this.el.appendChild(this.selectionSphere);

    this.updateSphereVisual();
  },

  // Helper functions
  getEntityTransform(el) {
    const pos = el.getAttribute('position') || { x: 0, y: 0, z: 0 };
    const rot = el.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
    const scale = el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
    return { pos, rot, scale };
  },

  updateSphereSize(radius) {
    const oldRadius = this.sphereRadius;
    const newRadius = Math.max(0.02, Math.min(0.2, radius));

    // When scaling the selection/grab sphere, treat the right side as the origin.
    // That means we shift the sphere center left by the delta radius so the right-most
    // point remains fixed relative to the controller.
    const delta = newRadius - oldRadius;
    this.sphereRadius = newRadius;

    if (this.selectionSphere) {
      // Update geometry radius
      this.selectionSphere.setAttribute('geometry', `primitive: sphere; radius: ${this.sphereRadius}`);

      // Adjust the local X position of the sphere so the right side stays in place
      try {
        const pos = this.selectionSphere.getAttribute('position') || { x: 0, y: 0, z: 0 };
        const newX = (parseFloat(pos.x) || 0) - delta;
        this.selectionSphere.setAttribute('position', `${newX} ${pos.y} ${pos.z}`);
      } catch (e) {
        // Fallback: use object3D if attribute parsing fails
        const objPos = this.selectionSphere.object3D.position;
        objPos.x = objPos.x - delta;
        this.selectionSphere.object3D.position.set(objPos.x, objPos.y, objPos.z);
      }
    }
  },

  updateSphereVisual(isGripping) {
    if (!this.selectionSphere) return;
    const color = isGripping ? '#23b391' : '#000000';
    const opacity = isGripping ? 1.0 : 0.3;
    const scale = isGripping ? '0.8 0.8 0.8' : '1 1 1'; // Shrink when gripping

    this.selectionSphere.setAttribute('material', `color: ${color}; opacity: ${opacity}; transparent: true;`);

    // Use animation for smooth scale transition
    this.selectionSphere.setAttribute('animation', `
      property: scale; 
      to: ${scale}; 
      dur: 150; 
      easing: easeOutQuad
    `);
  },

  // Event handlers
  handleTriggerdown() {
    const rc = this.el.components.raycaster;
    if (rc?.intersectedEls.length > 0) {
      const target = rc.intersectedEls[0];
      if (target?.hasAttribute('editable')) {
        // Store initial ray distance for trigger-based ray tracking
        const intersection = rc.intersections[0];
        if (intersection) {
          this.initialRayDistance = intersection.distance;
        }
        this.selectAndStartManipulation(target);
      }
    }
  },

  handleTriggerup() {
    if (this.isManipulating) this.endManipulation();
    this.clearSelection();
  },

  handleGripdown() {
    this.isGripping = true;
    this.updateSphereVisual(true);

    const spherePos = new this.T.Vector3();
    this.selectionSphere.object3D.getWorldPosition(spherePos);

    const target = Array.from(document.querySelectorAll('[editable]')).find(el => {
      if (!el.object3D) return false;
      const objectPos = new this.T.Vector3();
      el.object3D.getWorldPosition(objectPos);
      return spherePos.distanceTo(objectPos) < this.sphereRadius + 0.1;
    });

    if (target) {
      // Calculate offset from sphere to object when gripping starts
      const objectPos = new this.T.Vector3();
      target.object3D.getWorldPosition(objectPos);
      this.gripOffset.copy(objectPos).sub(spherePos);

      // Store initial rotation offset between controller and object
      const { rot: controllerRot } = this.getEntityTransform(this.el);
      const { rot: objectRot } = this.getEntityTransform(target);
      this.gripRotationOffset.set(
        (objectRot.x - controllerRot.x) * Math.PI / 180,
        (objectRot.y - controllerRot.y) * Math.PI / 180,
        (objectRot.z - controllerRot.z) * Math.PI / 180
      );

      this.selectAndStartManipulation(target);
    }
  },

  handleGripup() {
    this.isGripping = false;
    this.updateSphereVisual(false);
    if (this.isManipulating) this.endManipulation();
    this.clearSelection();
  },

  handleThumbstickmoved(e) {
    this.currentJoystick.x = e.detail?.x || 0;
    this.currentJoystick.y = e.detail?.y || 0;
  },

  // Duplicate and Delete functions
  handleBbuttondown() {
    this.duplicateSelected();
  },

  handleYbuttondown() {
    this.duplicateSelected();
  },

  handleXbuttondown() {
    this.deleteSelected();
  },

  handleAbuttondown() {
    this.deleteSelected();
  },

  async duplicateSelected() {
    if (this.selectedObjects.length === 0) return;

    this.selectedObjects.forEach(async (el) => {
      // Create new entity instead of cloning to avoid issues
      const clone = document.createElement('a-entity');

      // Generate new unique ID
      const newId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      clone.id = newId;

      // Copy all attributes except id
      Array.from(el.attributes).forEach(attr => {
        if (attr.name !== 'id') {
          clone.setAttribute(attr.name, attr.value);
        }
      });

      // Get current exact transform (position, rotation, scale) from the element
      const { pos, rot, scale } = this.getEntityTransform(el);

      // Set duplicated object to exact same position and orientation
      clone.setAttribute('position', { x: pos.x, y: pos.y, z: pos.z });
      clone.setAttribute('rotation', { x: rot.x, y: rot.y, z: rot.z });
      clone.setAttribute('scale', { x: scale.x, y: scale.y, z: scale.z });

      // Ensure material and geometry are properly set
      if (el.hasAttribute('material')) {
        clone.setAttribute('material', el.getAttribute('material'));
      }
      if (el.hasAttribute('geometry')) {
        clone.setAttribute('geometry', el.getAttribute('geometry'));
      }

      // Add editable attribute if original had it
      if (el.hasAttribute('editable')) {
        clone.setAttribute('editable', '');
      }

      // Add to scene
      el.parentNode.appendChild(clone);

      // Save to scene via API
      try {
        const sceneEntity = {
          id: newId,
          tagName: el.tagName.toLowerCase(),
          properties: {
            position: `${pos.x} ${pos.y} ${pos.z}`,
            rotation: `${rot.x} ${rot.y} ${rot.z}`,
            scale: `${scale.x} ${scale.y} ${scale.z}`,
            material: el.hasAttribute('material') ? el.getAttribute('material') : undefined,
            geometry: el.hasAttribute('geometry') ? el.getAttribute('geometry') : undefined,
            editable: el.hasAttribute('editable')
          }
        };

        await fetch(`/api/projects/${encodeURIComponent(window.PROJECT_DATA.path)}/scenes/${encodeURIComponent(window.PROJECT_DATA.activeScene)}`, {
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
      } catch (err) {
        console.error('Error saving duplicated entity:', err);
      }
    });
  },

  async deleteSelected() {
    if (this.selectedObjects.length === 0) return;

    this.selectedObjects.forEach(async (el) => {
      // Remove wireframe mode before deletion
      this.setWireframeMode(el, false);

      // Remove from API first
      if (el.id) {
        try {
          const response = await fetch(`/api/projects/${encodeURIComponent(window.PROJECT_DATA.path)}/scenes/${encodeURIComponent(window.PROJECT_DATA.activeScene)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operation: {
                action: 'remove',
                id: el.id
              }
            })
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (err) {
          console.error('Error removing entity from scene:', err);
        }
      }

      // Remove from DOM
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    // Clear selection after deletion
    this.clearSelection();
  },

  // Selection and manipulation
  selectAndStartManipulation(target) {
    this.clearSelection();
    this.selectObject(target);
    this.startManipulation();
  },

  selectObject(el) {
    if (this.selectedObjects.includes(el)) return;
    this.selectedObjects.push(el);
    this.setWireframeMode(el, true);
  },

  clearSelection() {
    this.selectedObjects.forEach(el => this.setWireframeMode(el, false));
    this.selectedObjects = [];
  },

  setWireframeMode(el, wireframe) {
    if (!el || !el.object3D) return;

    el.object3D.traverse((child) => {
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            if (mat) mat.wireframe = wireframe;
          });
        } else {
          child.material.wireframe = wireframe;
        }
      }
    });
  },

  startManipulation() {
    if (this.selectedObjects.length === 0) return;
    this.isManipulating = true;

    const { pos, rot } = this.getEntityTransform(this.el);
    this.startControllerPosition.set(pos.x, pos.y, pos.z);
    this.startControllerRotation.set(rot.x * Math.PI / 180, rot.y * Math.PI / 180, rot.z * Math.PI / 180);

    this.startObjectPositions = this.selectedObjects.map(o => {
      const { pos } = this.getEntityTransform(o);
      return new this.T.Vector3(pos.x, pos.y, pos.z);
    });
    this.startObjectRotations = this.selectedObjects.map(o => {
      const { rot } = this.getEntityTransform(o);
      return new this.T.Euler(rot.x * Math.PI / 180, rot.y * Math.PI / 180, rot.z * Math.PI / 180);
    });
  },

  updateSingleHandedManipulation() {
    // Use different manipulation based on trigger vs grip
    if (this.isGripping) {
      this.updateGripManipulation();
    } else {
      this.updateRayTracking();
    }
  },

  updateGripManipulation() {
    // Get current sphere position in world space
    const spherePos = new this.T.Vector3();
    this.selectionSphere.object3D.getWorldPosition(spherePos);

    // Get current controller rotation
    const { rot: currentControllerRot } = this.getEntityTransform(this.el);

    // Move objects to follow the sphere position maintaining their grip offset
    this.selectedObjects.forEach((o, i) => {
      if (this.data.enableTranslation) {
        // Calculate new position: sphere position + original offset
        const newPos = spherePos.clone().add(this.gripOffset);
        o.setAttribute('position', { x: newPos.x, y: newPos.y, z: newPos.z });
      }

      // Apply rotation: current controller rotation + original offset
      if (this.data.enableRotation) {
        // Invert the applied rotation offset so the grab-sphere rotates opposite to the controller
        const newRotation = {
          x: currentControllerRot.x - (this.gripRotationOffset.x * 180 / Math.PI),
          y: currentControllerRot.y - (this.gripRotationOffset.y * 180 / Math.PI),
          z: currentControllerRot.z - (this.gripRotationOffset.z * 180 / Math.PI)
        };
        o.setAttribute('rotation', newRotation);
      }
    });
  },

  updateRayTracking() {
    // Get current ray direction and origin from raycaster
    const raycaster = this.el.components.raycaster.raycaster;
    if (!raycaster) return;

    // Calculate the new position along the ray at the original intersection distance
    const newPosition = raycaster.ray.origin.clone().add(
      raycaster.ray.direction.clone().multiplyScalar(this.initialRayDistance)
    );

    // Move all selected objects to the current ray intersection point
    this.selectedObjects.forEach((o, i) => {
      if (this.data.enableTranslation) {
        // Simply place the object at the current ray intersection point
        o.setAttribute('position', { x: newPosition.x, y: newPosition.y, z: newPosition.z });
      }
    });
  },

  updateRayDistanceFromCurrentPosition() {
    // Update the ray distance based on the current position of the first selected object
    // This prevents snapping back after push/pull operations
    if (this.selectedObjects.length === 0) return;

    const raycaster = this.el.components.raycaster.raycaster;
    if (!raycaster) return;

    // Get current position of first selected object
    const objectPos = new this.T.Vector3();
    this.selectedObjects[0].object3D.getWorldPosition(objectPos);

    // Calculate new distance from ray origin to current object position
    this.initialRayDistance = raycaster.ray.origin.distanceTo(objectPos);
  },

  endManipulation() {
    this.isManipulating = false;
    this.saveTransforms();
  },

  // Joystick controls
  handlePushPullRay(intensity) {
    if (this.selectedObjects.length === 0) return;

    // Get ray direction from raycaster for push/pull along ray
    const raycaster = this.el.components.raycaster.raycaster;
    if (!raycaster) return;

    const rayDirection = raycaster.ray.direction.clone();

    this.selectedObjects.forEach(el => {
      // Move object along ray direction (negative intensity = away, positive = towards)
      // Inverted and increased speed by 3x
      const move = rayDirection.multiplyScalar(-intensity * this.data.pullPushSensitivity * 0.06);
      const { pos } = this.getEntityTransform(el);
      el.setAttribute('position', { x: pos.x + move.x, y: pos.y + move.y, z: pos.z + move.z });
    });
  },

  handlePullPush(intensity) {
    const camera = this.el.sceneEl.camera.el;
    if (!camera) return;

    const cameraPos = new this.T.Vector3();
    camera.object3D.getWorldPosition(cameraPos);

    this.selectedObjects.forEach(el => {
      const objectPos = new this.T.Vector3();
      el.object3D.getWorldPosition(objectPos);
      const direction = objectPos.sub(cameraPos).normalize();
      const move = direction.multiplyScalar(intensity * this.data.pullPushSensitivity * 0.02);
      const { pos } = this.getEntityTransform(el);
      el.setAttribute('position', { x: pos.x + move.x, y: pos.y + move.y, z: pos.z + move.z });
    });
  },

  handleGripPull() {
    if (this.selectedObjects.length === 0) return;
    const controllerPos = new this.T.Vector3();
    this.el.object3D.getWorldPosition(controllerPos);

    this.selectedObjects.forEach(el => {
      const objectPos = new this.T.Vector3();
      el.object3D.getWorldPosition(objectPos);
      const direction = controllerPos.clone().sub(objectPos).normalize();
      const move = direction.multiplyScalar(this.data.pullPushSensitivity * 0.02);
      const { pos } = this.getEntityTransform(el);
      el.setAttribute('position', { x: pos.x + move.x, y: pos.y + move.y, z: pos.z + move.z });
    });
  },

  handleSmoothScale(intensity, deltaTime) {
    if (!this.data.enableScale || Math.abs(intensity) < 0.1) return;
    const dt = deltaTime / 1000;
    const scaleRate = 1 + (intensity * this.data.scaleSensitivity * dt * 2);

    this.selectedObjects.forEach(el => {
      const { scale } = this.getEntityTransform(el);
      const newScale = {
        x: Math.max(0.1, Math.min(10, scale.x * scaleRate)),
        y: Math.max(0.1, Math.min(10, scale.y * scaleRate)),
        z: Math.max(0.1, Math.min(10, scale.z * scaleRate))
      };
      el.setAttribute('scale', newScale);
    });
  },

  handleSmoothSphereScale(intensity, deltaTime) {
    if (Math.abs(intensity) < 0.1) return;
    const dt = deltaTime / 1000;
    const scaleRate = 1 + (intensity * dt * 3);
    const newRadius = Math.max(0.02, Math.min(0.2, this.sphereRadius * scaleRate));
    this.updateSphereSize(newRadius);
  },

  saveTransforms() {
    this.selectedObjects.forEach(async (el) => {
      const { pos, rot, scale } = this.getEntityTransform(el);

      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(window.PROJECT_DATA.path)}/scenes/${encodeURIComponent(window.PROJECT_DATA.activeScene)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: {
              action: 'update',
              id: el.id,
              properties: {
                position: `${pos.x} ${pos.y} ${pos.z}`,
                rotation: `${rot.x} ${rot.y} ${rot.z}`,
                scale: `${scale.x} ${scale.y} ${scale.z}`
              }
            }
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (err) {
        console.error('Scene save error:', err);
      }
    });
  },

  tick(time, deltaTime) {
    // Check if push/pull is being used (takes priority over ray tracking)
    const isPushPulling = this.selectedObjects.length > 0 && Math.abs(this.currentJoystick.y) > 0.1;
    const wasPushPulling = this.wasPushPulling || false;

    // Update ray distance after push/pull ends to prevent snapping back
    if (wasPushPulling && !isPushPulling && this.isManipulating && this.selectedObjects.length > 0) {
      this.updateRayDistanceFromCurrentPosition();
    }

    // Only do ray tracking if not push/pulling
    if (this.isManipulating && this.selectedObjects.length > 0 && !isPushPulling) {
      this.updateSingleHandedManipulation();
    }

    if (this.isGripping && this.selectedObjects.length > 0) {
      this.handleGripPull();
    }

    // Handle smooth scaling with left/right joystick (but not during push/pull)
    if (this.selectedObjects.length > 0 && Math.abs(this.currentJoystick.x) > 0.1 && !isPushPulling) {
      this.handleSmoothScale(this.currentJoystick.x, deltaTime);
    }

    // Handle push/pull along raycast with up/down joystick when objects are selected (takes priority)
    if (isPushPulling) {
      this.handlePushPullRay(this.currentJoystick.y);
    }

    // Store previous push/pull state for next frame
    this.wasPushPulling = isPushPulling;

    // Handle smooth sphere scaling with left/right joystick when not manipulating and no objects selected
    if (!this.isManipulating && this.selectedObjects.length === 0 && Math.abs(this.currentJoystick.x) > 0.1) {
      this.handleSmoothSphereScale(this.currentJoystick.x, deltaTime);
    }
  }
});

