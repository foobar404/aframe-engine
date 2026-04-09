window.AFRAME.registerComponent('fly', {
    schema: {
        enabled: { type: 'boolean', default: true },
        flySpeed: { type: 'number', default: 2 },
        turnSpeed: { type: 'number', default: .5 },
        strafeTurning: { type: 'boolean', default: false },
        accelerateEvent: { type: 'string', default: '' },
        ascendEvent: { type: 'string', default: '' }
    },

    SPEED_PRESETS: [2, 8, 20],

    init: function () {
        this.currentSpeedIndex = this.SPEED_PRESETS.indexOf(this.data.flySpeed);
        if (this.currentSpeedIndex < 0) this.currentSpeedIndex = 1;

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
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        this.verticalMove = new THREE.Vector3();

        this._onThumbstickMoved = this.onJoystickMoved.bind(this);
        this._onThumbstickDown = this.onJoystickClick.bind(this);
        this._onTriggerChanged = this.onTriggerChanged.bind(this);
        this._onGripChanged = this.onGripChanged.bind(this);

        // Resolve camera once scene is ready
        const onLoaded = () => this.findCamera();
        if (this.el.sceneEl?.hasLoaded) {
            this.findCamera();
        } else {
            this.el.sceneEl?.addEventListener('loaded', onLoaded, { once: true });
        }
        this._stopRigReadyListener = () => this.el.sceneEl?.removeEventListener('loaded', onLoaded);

        this.bindEvents();
    },

    findCamera: function () {
        const scene = this.el.sceneEl;
        if (!scene) return;

        // Prefer active camera, fallback to camera query.
        this.camera = scene.camera && scene.camera.el
            ? scene.camera.el
            : (scene.querySelector('[camera]') || scene.querySelector('a-camera'));

        if (this.camera) {
            // Get the camera's parent (should be the camera rig)
            this.cameraRig = this.camera.parentEl;
        } else {
            console.warn('[fly] No active camera found');
        }
    },

    bindEvents: function () {
        // Only bind to this controller (this.el)
        this.el.addEventListener('thumbstickmoved', this._onThumbstickMoved);
        this.el.addEventListener('thumbstickdown', this._onThumbstickDown);

        if (this.data.accelerateEvent) this.el.addEventListener(this.data.accelerateEvent, this._onTriggerChanged);
        if (this.data.ascendEvent) this.el.addEventListener(this.data.ascendEvent, this._onGripChanged);
    },

    remove: function () {
        this.el.removeEventListener('thumbstickmoved', this._onThumbstickMoved);
        this.el.removeEventListener('thumbstickdown', this._onThumbstickDown);
        if (this.data.accelerateEvent) this.el.removeEventListener(this.data.accelerateEvent, this._onTriggerChanged);
        if (this.data.ascendEvent) this.el.removeEventListener(this.data.ascendEvent, this._onGripChanged);
        if (this._stopRigReadyListener) this._stopRigReadyListener();
    },

    // Controller joystick - forward/backward movement and turning/strafing
    onJoystickMoved: function (evt) {
        if (!this.data.enabled) return;

        const d = evt.detail || {};
        const ax = d.axis || d.axes || [];
        const x = typeof d.x === 'number' ? d.x : (ax[0] || 0);
        const y = typeof d.y === 'number' ? d.y : (ax[1] || 0);
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

    // Joystick click - cycle through speed presets
    onJoystickClick: function (evt) {
        this.currentSpeedIndex = (this.currentSpeedIndex + 1) % this.SPEED_PRESETS.length;
        this.data.flySpeed = this.SPEED_PRESETS[this.currentSpeedIndex];
        this.el.emit('xr:fly-speed-changed', { speed: this.data.flySpeed, index: this.currentSpeedIndex });
        this.el.emit('haptic-pulse', { intensity: 0.3, duration: 40 }, false);
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
            this.el.emit('xr:locomotion-step', { dx: this.vector.x, dy: this.vector.y, dz: this.vector.z, mode: 'fly-forward' });
        }

        // Strafing movement (left/right relative to camera)
        if (this.movement.strafeLeft > 0 || this.movement.strafeRight > 0) {
            // Get camera's right direction (cross product of forward and up)
            this.camera.object3D.getWorldDirection(this.vector);
            this.right.crossVectors(this.vector, this.up).normalize();

            // Move in camera's right direction (fixed direction: left should be negative, right should be positive)
            this.right.multiplyScalar((this.movement.strafeLeft - this.movement.strafeRight) * speed);

            // Apply strafe movement to camera rig
            this.cameraRig.object3D.position.add(this.right);
            this.el.emit('xr:locomotion-step', { dx: this.right.x, dy: this.right.y, dz: this.right.z, mode: 'fly-strafe' });
        }

        // Turning (rotate the camera rig around world Y to avoid drift)
        if (this.movement.rotateLeft > 0 || this.movement.rotateRight > 0) {
            const yaw = (this.movement.rotateLeft - this.movement.rotateRight) * rotSpeed;
            this.cameraRig.object3D.rotation.y += yaw;
            this.cameraRig.object3D.updateMatrixWorld(true);
            this.el.emit('xr:turn-smooth-step', { yawDeg: THREE.MathUtils.radToDeg(yaw) });
        }
    },

    // Vertical movement using grip pressure
    updateVerticalMovement: function (deltaTime) {
        if (!this.camera || !this.cameraRig || this.gripPressure === 0) return;

        const dt = deltaTime / 1000; // Convert to seconds
        const speed = this.data.flySpeed * dt * 60 * 0.5; // Reduced speed by half

        // Full grip (>0.8) = fly up, half grip (0.3-0.8) = fly down
        if (this.gripPressure > 0) {
            // Full grip - fly straight up
            this.verticalMove.set(0, speed * this.gripPressure, 0);
            this.cameraRig.object3D.position.add(this.verticalMove);
            this.el.emit('xr:locomotion-step', { dx: this.verticalMove.x, dy: this.verticalMove.y, dz: this.verticalMove.z, mode: 'fly-vertical' });
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