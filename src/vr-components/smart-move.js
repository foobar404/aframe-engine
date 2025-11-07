/**
 * Smart Move Component - Camera Rig Movement
 * 
 * Features:
 * - Controller-based camera rig movement
 * - Finds active camera and moves its parent (camera rig)
 * - Movement always follows camera's forward direction
 */

window.AFRAME.registerComponent('smart-move', {
  schema: {
    enabled: { type: 'boolean', default: true },
    flySpeed: { type: 'number', default: 1 },
    turnSpeed: { type: 'number', default: .25 },
    strafeTurning: { type: 'boolean', default: false }
  },

  init: function () {
    // Movement state - forward/backward and turning/strafing
    this.movement = {
      forward: 0,
      backward: 0,
      rotateLeft: 0,
      rotateRight: 0,
      strafeLeft: 0,
      strafeRight: 0
    };

    // Trigger pressure for speed control
    this.triggerPressure = 0;

    // Grip pressure for vertical movement
    this.gripPressure = 0;

    // Camera references
    this.camera = null;
    this.cameraRig = null;

    // Movement vectors
    this.vector = new THREE.Vector3();

    // Set up delayed initialization
    setTimeout(() => {
      this.findCamera();
      this.bindEvents();
    }, 1000);
    console.log('[SMART-MOVE] Camera rig movement component initialized');
  },

  findCamera: function () {
    // Look for active camera in the scene
    this.camera = this.el.sceneEl.camera.el;

    if (this.camera) {
      // Get the camera's parent (should be the camera rig)
      this.cameraRig = this.camera.parentEl;
    } else {
      console.warn('[SMART-MOVE] No active camera found');
    }
  },

  bindEvents: function () {
    console.log('[SMART-MOVE] Binding controller events...');

    // Only bind to this controller (this.el)
    this.el.addEventListener('thumbstickmoved', this.onJoystickMoved.bind(this));
    this.el.addEventListener('triggerchanged', this.onTriggerChanged.bind(this));
    this.el.addEventListener('thumbstickdown', this.onJoystickClick.bind(this));
    this.el.addEventListener('gripchanged', this.onGripChanged.bind(this));
  },

  // Controller joystick - forward/backward movement and turning/strafing
  onJoystickMoved: function (evt) {
    if (!this.data.enabled) return;

    const x = evt.detail.x; // X-axis for turning or strafing
    const y = evt.detail.y; // Y-axis for forward/backward
    const deadzone = 0.1;

    // Reset movement
    this.resetMovement();

    // Forward/backward movement (Y-axis)
    if (Math.abs(y) > deadzone) {
      if (y > 0) {
        this.movement.backward = Math.abs(y);
      } else {
        this.movement.forward = Math.abs(y);
      }
    }

    // X-axis: Turning or Strafing based on mode
    if (Math.abs(x) > deadzone) {
      if (this.data.strafeTurning) {
        // Strafe mode - left/right movement
        if (x > 0) {
          this.movement.strafeRight = Math.abs(x);
        } else {
          this.movement.strafeLeft = Math.abs(x);
        }
      } else {
        // Turn mode - left/right rotation
        if (x > 0) {
          this.movement.rotateRight = Math.abs(x);
        } else {
          this.movement.rotateLeft = Math.abs(x);
        }
      }
    }
  },

  // Joystick click - toggle strafe turning
  onJoystickClick: function (evt) {
    this.data.strafeTurning = !this.data.strafeTurning;
    console.log('[SMART-MOVE] Strafe turning:', this.data.strafeTurning ? 'ON' : 'OFF');
  },

  // Trigger pressure control for speed
  onTriggerChanged: function (evt) {
    this.triggerPressure = evt.detail.value; // 0 to 1
  },

  // Grip pressure control for vertical movement
  onGripChanged: function (evt) {
    this.gripPressure = evt.detail.value; // 0 to 1
  },

  resetMovement: function () {
    Object.keys(this.movement).forEach(key => {
      this.movement[key] = 0;
    });
  },

  // Main update loop
  tick: function (time, deltaTime) {
    if (!this.data.enabled) return;

    this.updateFlyMovement(deltaTime);
    this.updateVerticalMovement(deltaTime);
  },

  // Camera-based movement system
  updateFlyMovement: function (deltaTime) {
    if (!this.camera || !this.cameraRig) return;

    const dt = deltaTime / 1000; // Convert to seconds

    // Apply trigger pressure as speed multiplier (0.1 to 1.0 range)
    const triggerMultiplier = Math.max(0.1, Math.min(this.triggerPressure, .6));

    const speed = this.data.flySpeed * dt * 60 * triggerMultiplier;
    const rotSpeed = this.data.turnSpeed * dt * 60 * triggerMultiplier;

    // Forward/backward movement always follows camera's forward direction
    if (this.movement.forward > 0 || this.movement.backward > 0) {
      // Get camera's forward direction
      this.camera.object3D.getWorldDirection(this.vector);

      // Move in camera's forward direction
      this.vector.multiplyScalar(-(this.movement.forward - this.movement.backward) * speed);

      // Apply movement to camera rig
      this.cameraRig.object3D.position.add(this.vector);
    }

    // Strafing movement (left/right relative to camera)
    if (this.movement.strafeLeft > 0 || this.movement.strafeRight > 0) {
      // Get camera's right direction (cross product of forward and up)
      this.camera.object3D.getWorldDirection(this.vector);
      const right = new THREE.Vector3().crossVectors(this.vector, new THREE.Vector3(0, 1, 0)).normalize();

      // Move in camera's right direction (fixed direction: left should be negative, right should be positive)
      right.multiplyScalar((this.movement.strafeLeft - this.movement.strafeRight) * speed);

      // Apply strafe movement to camera rig
      this.cameraRig.object3D.position.add(right);
    }

    // Turning (rotate the camera rig)
    if (this.movement.rotateLeft > 0 || this.movement.rotateRight > 0) {
      this.cameraRig.object3D.rotateY((this.movement.rotateLeft - this.movement.rotateRight) * rotSpeed);
    }
  },

  // Vertical movement using grip pressure
  updateVerticalMovement: function (deltaTime) {
    if (!this.camera || !this.cameraRig || this.gripPressure === 0) return;

    const dt = deltaTime / 1000; // Convert to seconds
    const speed = this.data.flySpeed * dt * 60 * 0.5; // Reduced speed by half

    // Full grip (>0.8) = fly up, half grip (0.3-0.8) = fly down
    if (this.gripPressure > 0.8) {
      // Full grip - fly straight up
      const verticalMove = new THREE.Vector3(0, speed * this.gripPressure, 0);
      this.cameraRig.object3D.position.add(verticalMove);
    } else if (this.gripPressure > 0.3) {
      // Half grip - fly straight down
      const verticalMove = new THREE.Vector3(0, -speed * this.gripPressure, 0);
      this.cameraRig.object3D.position.add(verticalMove);
    }
  },

  // Public API methods
  enable: function () {
    this.data.enabled = true;
  },

  disable: function () {
    this.data.enabled = false;
    this.resetMovement();
  },
});