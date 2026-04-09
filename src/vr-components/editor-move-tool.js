import { Events } from '../lib/Events';
import { cloneEntity } from '../lib/entity';

if (!AFRAME.components['editor-move-tool']) {
AFRAME.registerComponent('editor-move-tool', {
  schema: {
    enabled: { type: 'boolean', default: true },
    hand: { type: 'string', default: 'right', oneOf: ['left', 'right'] },
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
    this.startControllerPosition = new this.T.Vector3();
    this.startControllerRotation = new this.T.Euler();
    this.startObjectPositions = [];
    this.startObjectRotations = [];
    this.initialRayDistance = 0;
    this.gripObjectInSphereSpace = new Map(); // entity → Matrix4 weld offset
    this._rayGroupOffsets = new Map(); // entity → Vector3 offset from primary ray target
    this._rayPrimaryTarget = null;
    this.isResizingSphere = false;
    this.isTriggerDown = false;
    this.isScaling = false;
    this.scaleStartControllerPos = new this.T.Vector3();
    this.scaleStartObjectScales = [];
    this.gripStartControllerPos = new this.T.Vector3();
    this.gripStartSphereRadius = 0.05;
    this.qControllerWorld = new this.T.Quaternion();
    this.qTargetWorld = new this.T.Quaternion();
    this.qSphereLocal = new this.T.Quaternion();
    this._lastGroupToggleTime = 0;

    this.setupLaser();
    this.createSelectionSphere();
    this.bindEvents();
    this.applyEnabledState();
    this._sphereOverlapTarget = null;
    this._sphereOverlapTargets = new Set();
  },

  update(oldData) {
    if (!oldData || typeof oldData.enabled === 'undefined') {
      this.applyEnabledState();
      return;
    }

    if (oldData.enabled !== this.data.enabled) {
      this.applyEnabledState();
    }

    if (oldData.hand !== this.data.hand && this.selectionSphere) {
      this.selectionSphere.setAttribute('position', this.getSphereOffset());
    }
  },

  bindEvents() {
    const events = ['triggerdown', 'triggerup', 'gripdown', 'gripup', 'bbuttondown', 'ybuttondown', 'xbuttondown', 'abuttondown'];
    this.boundToolHandlers = this.boundToolHandlers || {};
    events.forEach((event) => {
      const handlerName = `handle${event.replace('-', '').replace(/^\w/, c => c.toUpperCase())}`;
      const bound = (evt) => {
        if (!this.data.enabled) return;
        this[handlerName](evt);
      };
      this.boundToolHandlers[event] = bound;
      this.el.addEventListener(event, bound);
    });
    this.el.sceneEl.addEventListener('clearSelection', this.clearSelection.bind(this));
  },

  applyEnabledState() {
    if (this.selectionSphere) {
      this.selectionSphere.object3D.visible = !!this.data.enabled;
    }

    if (!this.data.enabled) {
      this.isGripping = false;
      if (this.isManipulating) {
        this.endManipulation();
      }
      this.clearSelection();
    }
  },

  onToolActivated() {
    this.applyEnabledState();
  },

  onToolDeactivated() {
    this.applyEnabledState();
  },

  setupLaser() {
    // laser-controls provides both the visible beam and raycaster in one component.
    // We configure only raycaster params; laser-controls owns the visual line.
    this.el.setAttribute('laser-controls', `hand: ${this.data.hand}; lineColor: #23b391; lineOpacity: 0.8;`);
    this.el.setAttribute('raycaster', 'far: 400; showLine: true;');
  },

  getSphereOffset() {
    const isLeft = this.data.hand === 'left';
    return `${isLeft ? '0.07' : '-0.07'} -0.06 0.02`;
  },

  createSelectionSphere() {
    const T = this.T;
    const container = new T.Object3D();

    // Wireframe shell
    const shellGeo = new T.IcosahedronGeometry(1, 1);
    this._shellMat = new T.MeshBasicMaterial({
      color: 0x23b391,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      depthTest: false
    });
    this._shellMesh = new T.Mesh(shellGeo, this._shellMat);

    // Inner translucent fill
    const fillGeo = new T.SphereGeometry(0.82, 16, 12);
    this._fillMat = new T.MeshBasicMaterial({
      color: 0x0d2e28,
      transparent: true,
      opacity: 0.22,
      depthTest: false,
      side: T.FrontSide
    });
    this._fillMesh = new T.Mesh(fillGeo, this._fillMat);

    container.add(this._shellMesh);
    container.add(this._fillMesh);
    container.renderOrder = 998;

    this.selectionSphere = document.createElement('a-entity');
    this.selectionSphere.setAttribute('position', this.getSphereOffset());
    this.el.appendChild(this.selectionSphere);

    this.selectionSphere.addEventListener('loaded', () => {
      this.selectionSphere.object3D.add(container);
      this._sphereContainer = container;
      this._updateSphereScale();
    }, { once: true });
  },

  _updateSphereScale() {
    if (!this._sphereContainer) return;
    this._sphereContainer.scale.setScalar(this.sphereRadius);
  },

  // Helper functions
  getEntityTransform(el) {
    const pos = el.getAttribute('position') || { x: 0, y: 0, z: 0 };
    const rot = el.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
    const scale = el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
    return { pos, rot, scale };
  },

  updateTransformRealtime(el, component, value) {
    el.setAttribute(component, value);
    Events.emit('entityupdate', {
      entity: el,
      component,
      property: '',
      value
    });
  },

  setWorldPositionRealtime(el, worldPos) {
    if (!el || !el.object3D || !worldPos) return;

    const parentEl = el.parentElement;
    const parentInv = new this.T.Matrix4();
    if (parentEl && parentEl.object3D) {
      parentEl.object3D.updateMatrixWorld(true);
      parentInv.copy(parentEl.object3D.matrixWorld).invert();
    }

    const localPos = worldPos.clone().applyMatrix4(parentInv);
    this.updateTransformRealtime(el, 'position', {
      x: localPos.x,
      y: localPos.y,
      z: localPos.z
    });
  },

  updateSphereSize(radius) {
    const oldRadius = this.sphereRadius;
    const newRadius = Math.max(0.02, Math.min(0.5, radius));
    const delta = newRadius - oldRadius;
    this.sphereRadius = newRadius;

    this._updateSphereScale();

    const sign = this.data.hand === 'left' ? 1 : -1;
    try {
      const pos = this.selectionSphere.getAttribute('position') || { x: 0, y: 0, z: 0 };
      const newX = (parseFloat(pos.x) || 0) + sign * delta;
      this.selectionSphere.setAttribute('position', `${newX} ${pos.y} ${pos.z}`);
    } catch (e) {
      const objPos = this.selectionSphere.object3D.position;
      objPos.x += sign * delta;
      this.selectionSphere.object3D.position.set(objPos.x, objPos.y, objPos.z);
    }
  },

  // STATES: idle | hover | grip
  updateSphereVisual(state) {
    if (!this._shellMat || !this._fillMat) return;

    if (state === 'grip') {
      this._shellMat.color.setHex(0x36ffcc);
      this._shellMat.opacity = 1.0;
      this._fillMat.color.setHex(0x0a4a3a);
      this._fillMat.opacity = 0.45;
      if (this._sphereContainer) this._sphereContainer.scale.setScalar(this.sphereRadius * 0.85);
    } else if (state === 'scale') {
      this._shellMat.color.setHex(0xff44cc);
      this._shellMat.opacity = 1.0;
      this._fillMat.color.setHex(0x3a0030);
      this._fillMat.opacity = 0.45;
      if (this._sphereContainer) this._sphereContainer.scale.setScalar(this.sphereRadius * 0.85);
    } else if (state === 'hover') {
      this._shellMat.color.setHex(0xffe066);
      this._shellMat.opacity = 0.95;
      this._fillMat.color.setHex(0x2a2000);
      this._fillMat.opacity = 0.3;
      if (this._sphereContainer) this._sphereContainer.scale.setScalar(this.sphereRadius * 1.08);
    } else {
      this._shellMat.color.setHex(0x23b391);
      this._shellMat.opacity = 0.7;
      this._fillMat.color.setHex(0x0d2e28);
      this._fillMat.opacity = 0.22;
      this._updateSphereScale();
    }
  },

  syncGrabSphereRotation(target) {
    if (!this.selectionSphere?.object3D || !target?.object3D) return;

    this.el.object3D.getWorldQuaternion(this.qControllerWorld);
    target.object3D.getWorldQuaternion(this.qTargetWorld);

    this.qSphereLocal.copy(this.qControllerWorld).invert().multiply(this.qTargetWorld);
    this.selectionSphere.object3D.quaternion.copy(this.qSphereLocal);
    this.selectionSphere.object3D.updateMatrixWorld(true);
  },

  resetGrabSphereRotation() {
    if (!this.selectionSphere?.object3D) return;
    this.selectionSphere.object3D.rotation.set(0, 0, 0);
    this.selectionSphere.object3D.updateMatrixWorld(true);
  },

  isSelectableEntity(el) {
    if (!el || el === this.el || el === this.el.sceneEl) {
      return false;
    }

    if (!el.object3D) {
      return false;
    }

    const rig = document.getElementById('admin-camera-rig');
    if (rig && (el === rig || rig.contains(el))) {
      return false;
    }

    if (el.hasAttribute('data-vr-tool-ui') || el.closest('[controller-toolbelt]')) {
      return false;
    }

    if (el.closest('[editor-move-tool]') || el.closest('a-assets')) {
      return false;
    }

    return true;
  },

  normalizeSelectableEntity(el) {
    let current = el;

    while (current && current !== this.el.sceneEl) {
      if (this.isSelectableEntity(current)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  },

  getLaserRaycaster() {
    // laser-controls creates a child raycaster; also check component on this.el directly.
    return this.el.components.raycaster || null;
  },

  findRaycastTarget() {
    const rc = this.getLaserRaycaster();
    if (!rc) return null;

    for (const hit of rc.intersections || []) {
      const hitEl = hit?.object?.el || null;
      const target = this.normalizeSelectableEntity(hitEl);
      if (target) return target;
    }

    return null;
  },

  getRayDistanceForTarget(target) {
    const rc = this.getLaserRaycaster();
    if (!rc) return 1;

    for (const hit of rc.intersections || []) {
      let hitEl = hit?.object?.el || null;
      while (hitEl && hitEl !== this.el.sceneEl) {
        if (hitEl === target) return Math.max(0.05, hit.distance || 1);
        hitEl = hitEl.parentElement;
      }
    }

    return rc.intersections?.[0]?.distance || 1;
  },

  findSphereOverlapTargets() {
    const spherePos = new this.T.Vector3();
    this.selectionSphere.object3D.getWorldPosition(spherePos);
    const sphere = new this.T.Sphere(spherePos, this.sphereRadius);

    const allEls = Array.from(this.el.sceneEl.querySelectorAll('*'));
    const uniqueTargets = new Set();
    allEls.forEach((el) => {
      const target = this.normalizeSelectableEntity(el);
      if (target) uniqueTargets.add(target);
    });

    const results = [];

    uniqueTargets.forEach((target) => {
      if (!target.object3D) return;

      const box = new this.T.Box3().setFromObject(target.object3D);

      if (box.isEmpty()) {
        // For entities like a-text whose mesh children build async,
        // check origin and walk direct children for any non-empty bounds.
        const targetPos = new this.T.Vector3();
        target.object3D.getWorldPosition(targetPos);
        if (spherePos.distanceTo(targetPos) <= this.sphereRadius * 3) {
          results.push(target);
          return;
        }
        let hit = false;
        target.object3D.traverse((child) => {
          if (hit || child === target.object3D) return;
          const cb = new this.T.Box3().setFromObject(child);
          if (!cb.isEmpty() && cb.intersectsSphere(sphere)) hit = true;
        });
        if (hit) results.push(target);
        return;
      }

      if (!box.intersectsSphere(sphere)) return;

      const inset = box.clone().expandByScalar(-this.sphereRadius);
      if (!inset.isEmpty() && inset.containsPoint(spherePos)) return;

      results.push(target);
    });

    return this.filterToTopLevel(results);
  },

  findSphereOverlapTarget() {
    return this.findSphereOverlapTargets()[0] ?? null;
  },

  // Group helpers
  generateGroupId() {
    return 'grp-' + Math.random().toString(36).slice(2, 8);
  },

  getGroupMembers(groupId) {
    if (!groupId) return [];
    return Array.from(this.el.sceneEl.querySelectorAll(`[data-group="${groupId}"]`))
      .filter(el => this.isSelectableEntity(el));
  },

  assignGroup(entities) {
    const existingIds = new Set();
    entities.forEach(el => {
      const gid = el.getAttribute('data-group');
      if (gid) existingIds.add(gid);
    });
    const groupId = existingIds.size > 0 ? [...existingIds][0] : this.generateGroupId();
    entities.forEach(el => el.setAttribute('data-group', groupId));
    if (existingIds.size > 1) {
      existingIds.forEach(old => {
        if (old === groupId) return;
        this.getGroupMembers(old).forEach(el => el.setAttribute('data-group', groupId));
      });
    }
    return groupId;
  },

  ungroupEntities(entities) {
    const groupIds = new Set(entities.map(el => el.getAttribute('data-group')).filter(Boolean));
    groupIds.forEach(gid => {
      this.getGroupMembers(gid).forEach(el => el.removeAttribute('data-group'));
    });
  },

  expandByGroup(targets) {
    const expanded = new Set(targets);
    targets.forEach(el => {
      const gid = el.getAttribute('data-group');
      if (gid) this.getGroupMembers(gid).forEach(m => expanded.add(m));
    });
    return Array.from(expanded);
  },

  filterToTopLevel(entities) {
    const unique = Array.from(new Set((entities || []).filter(Boolean)));
    const all = new Set(unique);
    return unique.filter((el) => {
      let current = el.parentElement;
      while (current && current !== this.el.sceneEl) {
        if (all.has(current)) return false;
        current = current.parentElement;
      }
      return true;
    });
  },

  // Event handlers
  handleTriggerdown() {
    this.isTriggerDown = true;
    if (this.isGripping && this.isManipulating && this.selectedObjects.length > 0) {
      this.startScaling();
      return;
    }
    const target = this.findRaycastTarget();
    if (!target) return;

    const distance = this.getRayDistanceForTarget(target);
    this.initialRayDistance = distance > 0 ? distance : 1;

    const targets = this.filterToTopLevel(this.expandByGroup([target]));
    this.clearSelection();
    targets.forEach(t => this.selectObject(t));

    // Store offsets of group members relative to the primary raycasted entity
    this._rayPrimaryTarget = target;
    this._rayGroupOffsets = new Map();
    const primaryPos = new this.T.Vector3();
    target.object3D.getWorldPosition(primaryPos);
    targets.forEach(t => {
      if (t === target) return;
      const tPos = new this.T.Vector3();
      t.object3D.getWorldPosition(tPos);
      this._rayGroupOffsets.set(t, tPos.clone().sub(primaryPos));
    });

    this.startManipulation();
  },

  handleTriggerup() {
    this.isTriggerDown = false;
    if (this.isScaling) {
      this.isScaling = false;
      this.updateSphereVisual('grip');
      return;
    }
    if (this.isManipulating) this.endManipulation();
    this.clearSelection();
  },

  handleGripdown() {
    this.isGripping = true;
    if (this.isTriggerDown && this.isManipulating && this.selectedObjects.length > 0) {
      this.updateSphereVisual('scale');
      this.startScaling();
      return;
    }
    this.updateSphereVisual('grip');

    const sphereTargets = this.findSphereOverlapTargets();

    if (sphereTargets.length > 0) {
      // Auto-group when more than one entity is grabbed simultaneously
      if (sphereTargets.length > 1) {
        this.assignGroup(sphereTargets);
      }
      // Expand to all group members
      const targets = this.filterToTopLevel(this.expandByGroup(sphereTargets));

      this.selectionSphere.object3D.updateMatrixWorld(true);
      const sphereWorldInv = new this.T.Matrix4().copy(this.selectionSphere.object3D.matrixWorld).invert();

      this.gripObjectInSphereSpace.clear();
      this.clearSelection();

      targets.forEach((target) => {
        target.object3D.updateMatrixWorld(true);
        const weld = new this.T.Matrix4().copy(sphereWorldInv).multiply(target.object3D.matrixWorld);
        this.gripObjectInSphereSpace.set(target, weld);
        this.selectObject(target);
      });

      this.startManipulation();
    } else {
      // Gripping empty air — entering sphere-resize mode
      this.isResizingSphere = true;
      this.el.object3D.getWorldPosition(this.gripStartControllerPos);
      this.gripStartSphereRadius = this.sphereRadius;
    }
  },

  handleGripup() {
    this.isGripping = false;
    this.isResizingSphere = false;
    this.isScaling = false;
    this.updateSphereVisual('idle');
    if (this.isManipulating) this.endManipulation();
    this.clearSelection();
  },

  handleThumbstickmoved(e) {
    // Joystick input is intentionally reserved for movement.
  },

  consumeButtonEvent(evt) {
    if (!evt) return;
    if (typeof evt.preventDefault === 'function') evt.preventDefault();
    if (typeof evt.stopImmediatePropagation === 'function') evt.stopImmediatePropagation();
    if (typeof evt.stopPropagation === 'function') evt.stopPropagation();
  },

  // Duplicate and Delete functions
  handleBbuttondown(evt) {
    const now = Date.now();
    if (now - this._lastGroupToggleTime < 120) {
      this.consumeButtonEvent(evt);
      return;
    }

    const sphereTargets = this.findSphereOverlapTargets();
    const source = sphereTargets.length > 0 ? sphereTargets : this.selectedObjects;
    const targets = this.filterToTopLevel(this.expandByGroup(source));

    if (targets.some((el) => el.hasAttribute('data-group'))) {
      this._lastGroupToggleTime = now;
      this.ungroupEntities(targets);
      targets.forEach((el) => {
        Events.emit('entityupdate', { entity: el, component: 'data-group', property: '', value: null });
      });
      this.clearSelection();
      targets.forEach((el) => this.selectObject(el));
      this.el.emit('haptic-pulse', { intensity: 0.35, duration: 60 }, false);
      this.consumeButtonEvent(evt);
      return;
    }

    if (targets.length > 1) {
      this._lastGroupToggleTime = now;
      const groupId = this.assignGroup(targets);
      targets.forEach((el) => {
        Events.emit('entityupdate', { entity: el, component: 'data-group', property: '', value: groupId });
      });
      this.clearSelection();
      targets.forEach((el) => this.selectObject(el));
      this.el.emit('haptic-pulse', { intensity: 0.45, duration: 70 }, false);
      this.consumeButtonEvent(evt);
      return;
    }

    // Single ungrouped target — duplicate it.
    if (targets.length === 1) {
      this.duplicateSelected();
      this.el.emit('haptic-pulse', { intensity: 0.4, duration: 60 }, false);
    }

    this.consumeButtonEvent(evt);
  },

  handleYbuttondown(evt) {
    this.handleBbuttondown(evt);
  },

  handleXbuttondown() {
    this.deleteSelected();
  },

  handleAbuttondown() {
    this.handleXbuttondown();
  },

  async duplicateSelected() {
    if (this.selectedObjects.length === 0) return;

    this.selectedObjects.forEach((el) => {
      // flushToDOM ensures live component state (geometry, material, etc.)
      // is written back to DOM attributes before cloning.
      el.flushToDOM(true);

      const clone = el.cloneNode(true);
      // Strip id so A-Frame assigns a fresh one.
      clone.removeAttribute('id');

      el.parentNode.insertBefore(clone, el.nextSibling);

      clone.addEventListener('loaded', () => {
        // Offset clone slightly so it's not hidden behind the original.
        const pos = clone.getAttribute('position') || { x: 0, y: 0, z: 0 };
        clone.setAttribute('position', { x: +pos.x + 0.1, y: +pos.y + 0.1, z: +pos.z });
        Events.emit('entityclone', clone);
      }, { once: true });
    });
  },

  async deleteSelected() {
    if (this.selectedObjects.length === 0) return;

    this.selectedObjects.forEach((el) => {
      this.setWireframeMode(el, false);
      const oldParent = el.parentNode;
      if (oldParent) {
        oldParent.removeChild(el);
        Events.emit('entityremoved', { entity: el, oldParent });
      }
    });

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
    this.resetGrabSphereRotation();
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
    this.selectionSphere.object3D.updateMatrixWorld(true);
    const sphereWorld = this.selectionSphere.object3D.matrixWorld;

    this.selectedObjects.forEach((o) => {
      if (!o.object3D) return;

      const weld = this.gripObjectInSphereSpace.get(o);
      if (!weld) return;

      const newWorldMatrix = new this.T.Matrix4().copy(sphereWorld).multiply(weld);

      const parentEl = o.parentElement;
      const parentWorldInv = new this.T.Matrix4();
      if (parentEl && parentEl.object3D) {
        parentEl.object3D.updateMatrixWorld(true);
        parentWorldInv.copy(parentEl.object3D.matrixWorld).invert();
      }

      const localMatrix = parentWorldInv.multiply(newWorldMatrix);
      const pos = new this.T.Vector3();
      const quat = new this.T.Quaternion();
      const scale = new this.T.Vector3();
      localMatrix.decompose(pos, quat, scale);

      const euler = new this.T.Euler().setFromQuaternion(quat, 'YXZ');

      if (this.data.enableTranslation) {
        this.updateTransformRealtime(o, 'position', { x: pos.x, y: pos.y, z: pos.z });
      }
      if (this.data.enableRotation) {
        this.updateTransformRealtime(o, 'rotation', {
          x: euler.x * 180 / Math.PI,
          y: euler.y * 180 / Math.PI,
          z: euler.z * 180 / Math.PI
        });
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

    // Move primary target to ray point; offset group members to maintain relative positions
    this.selectedObjects.forEach((o) => {
      if (!this.data.enableTranslation) return;
      const offset = this._rayGroupOffsets?.get(o);
      const pos = offset ? newPosition.clone().add(offset) : newPosition.clone();
      this.setWorldPositionRealtime(o, pos);
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
      const move = rayDirection.clone().multiplyScalar(-intensity * this.data.pullPushSensitivity * 0.06);
      const worldPos = new this.T.Vector3();
      el.object3D.getWorldPosition(worldPos);
      worldPos.add(move);
      this.setWorldPositionRealtime(el, worldPos);
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
      const worldPos = new this.T.Vector3();
      el.object3D.getWorldPosition(worldPos);
      worldPos.add(move);
      this.setWorldPositionRealtime(el, worldPos);
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
      const worldPos = new this.T.Vector3();
      el.object3D.getWorldPosition(worldPos);
      worldPos.add(move);
      this.setWorldPositionRealtime(el, worldPos);
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
      this.updateTransformRealtime(el, 'scale', newScale);
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
    this.selectedObjects.forEach((el) => {
      Events.emit('entityupdate', { entity: el, component: 'position', property: '', value: el.getAttribute('position') || { x: 0, y: 0, z: 0 } });
      Events.emit('entityupdate', { entity: el, component: 'rotation', property: '', value: el.getAttribute('rotation') || { x: 0, y: 0, z: 0 } });
      Events.emit('entityupdate', { entity: el, component: 'scale', property: '', value: el.getAttribute('scale') || { x: 1, y: 1, z: 1 } });
    });
  },

  tick(time, deltaTime) {
    if (!this.data.enabled) return;

    // Hover state: check if sphere overlaps anything while not gripping
    if (!this.isGripping && !this.isManipulating) {
      const hoveredArr = this.findSphereOverlapTargets();
      const newSet = new Set(hoveredArr);
      const changed = newSet.size !== this._sphereOverlapTargets.size ||
        hoveredArr.some(t => !this._sphereOverlapTargets.has(t));
      if (changed) {
        this._sphereOverlapTargets = newSet;
        this._sphereOverlapTarget = hoveredArr[0] ?? null;
        this.updateSphereVisual(newSet.size > 0 ? 'hover' : 'idle');
      }
    }

    if (this.isResizingSphere) {
      const currentPos = new this.T.Vector3();
      this.el.object3D.getWorldPosition(currentPos);
      // Vertical hand movement drives radius: up = bigger, down = smaller
      const deltaY = currentPos.y - this.gripStartControllerPos.y;
      const newRadius = Math.max(0.02, Math.min(0.5, this.gripStartSphereRadius + deltaY * 4));
      this.updateSphereSize(newRadius);
      return;
    }

    if (this.isScaling) {
      this.updateScaling();
    } else if (this.isManipulating && this.selectedObjects.length > 0) {
      this.updateSingleHandedManipulation();
    }
  },

  startScaling() {
    this.isScaling = true;
    this.updateSphereVisual('scale');
    this.el.object3D.getWorldPosition(this.scaleStartControllerPos);
    this.scaleStartObjectScales = this.selectedObjects.map(o => {
      const { scale } = this.getEntityTransform(o);
      return { x: scale.x, y: scale.y, z: scale.z };
    });
  },

  updateScaling() {
    const currentPos = new this.T.Vector3();
    this.el.object3D.getWorldPosition(currentPos);
    const deltaY = currentPos.y - this.scaleStartControllerPos.y;
    // ~0.3m up = 2x, ~0.3m down = 0.5x
    const scaleFactor = Math.max(0.05, 1 + deltaY * 3.5);
    this.selectedObjects.forEach((o, i) => {
      if (!this.data.enableScale) return;
      const base = this.scaleStartObjectScales[i];
      if (!base) return;
      this.updateTransformRealtime(o, 'scale', {
        x: Math.max(0.05, Math.min(10, base.x * scaleFactor)),
        y: Math.max(0.05, Math.min(10, base.y * scaleFactor)),
        z: Math.max(0.05, Math.min(10, base.z * scaleFactor))
      });
    });
  }
});
}

