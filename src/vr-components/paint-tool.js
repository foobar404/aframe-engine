window.AFRAME.registerComponent('paint-tool', {
    schema: {
        color: { type: 'string', default: '#FF0040' },
        roughness: { type: 'number', default: .6 },
        metalness: { type: 'number', default: 0 },
        opacity: { type: 'number', default: 1 },
        sphereRadius: { type: 'number', default: 0.01 } // Made smaller
    },

    init: function () {
        this.T = AFRAME.THREE;
        this.isPainting = false;
        this.paletteVisible = false;
        this.colorPalette = null;
        this.colorSpheres = [];

        // Initialize current material from schema
        this.data.currentMaterial = `color: ${this.data.color}; roughness: ${this.data.roughness}; metalness: ${this.data.metalness};`;

        this.setupRaycaster();
        this.createPaintSphere();
        this.createColorPalette();
        this.bindEvents();
    },

    setupRaycaster() {
        this.el.setAttribute('raycaster', {
            objects: '[editable]',
            far: 1000,
            showLine: true,
            lineColor: 'rgb(255,100,255)',
            lineOpacity: 0.8
        });
    },

    createPaintSphere() {
        // Create paint preview sphere - moved forward and to the right
        this.paintSphere = document.createElement('a-entity');
        this.paintSphere.setAttribute('geometry', `primitive: sphere; radius: ${this.data.sphereRadius}`);
        this.paintSphere.setAttribute('material', this.data.currentMaterial);
        this.paintSphere.setAttribute('position', '0 -0.03 -0.07');

        // Add subtle glow animation
        this.paintSphere.setAttribute('animation', 'property: scale; to: 1.1 1.1 1.1; dir: alternate; dur: 1000; loop: true; easing: easeInOutSine');

        this.el.appendChild(this.paintSphere);
    },

    bindEvents() {
        this.el.addEventListener('abuttondown', this.paintWithButton.bind(this));
        this.el.addEventListener('xbuttondown', this.paintWithButton.bind(this));

        // Color palette toggle
        this.el.addEventListener('bbuttondown', this.showPalette.bind(this));
        this.el.addEventListener('bbuttonup', this.hidePalette.bind(this));
        this.el.addEventListener('ybuttondown', this.showPalette.bind(this));
        this.el.addEventListener('ybuttonup', this.hidePalette.bind(this));
    },

    paintWithButton() {
        // Single paint action with haptics for A/X buttons
        this.paintTarget();
        // Emit haptic feedback only for button presses
        this.el.emit('haptic-pulse', { intensity: 0.3, duration: 50 }, false);
    },

    startPainting() {
        this.isPainting = true;
        this.paintTarget();
    },

    stopPainting() {
        this.isPainting = false;
    },

    paintTarget() {
        const rc = this.el.components.raycaster;
        if (rc?.intersectedEls.length > 0) {
            const target = rc.intersectedEls[0];
            if (target?.hasAttribute('editable')) {
                this.applyPaintToTarget(target);
            }
        }
    },

    async applyPaintToTarget(target) {
        // Apply current material to target
        target.setAttribute('material', this.data.currentMaterial);

        // Update scene if target has an ID
        if (target.id) {
            try {
                const response = await fetch(`/api/projects/${encodeURIComponent(window.PROJECT_DATA.path)}/scenes/${encodeURIComponent(window.PROJECT_DATA.activeScene)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        operation: {
                            action: 'update',
                            id: target.id,
                            properties: {
                                material: this.data.currentMaterial
                            }
                        }
                    })
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (err) {
                console.error('Paint save error:', err);
            }
        }
    },

    updatePaintSphere() {
        if (this.paintSphere) {
            this.paintSphere.setAttribute('geometry', `primitive: sphere; radius: ${this.data.sphereRadius}`);
            this.paintSphere.setAttribute('material', this.data.currentMaterial);
        }
    },

    setCurrentMaterial(color) {
        this.data.color = color;
        this.data.currentMaterial = `color: ${this.data.color}; roughness: ${this.data.roughness}; metalness: ${this.data.metalness};`;
        this.updatePaintSphere();
    },

    // Color Palette System
    generateColorRings() {
        const rings = [];

        // Helper: convert HSL to hex for a vivid base palette
        const hslToHex = (h, s, l) => {
            s /= 100;
            l /= 100;
            const k = n => (n + h / 30) % 12;
            const a = s * Math.min(l, 1 - l);
            const f = n => {
                const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        };

        // Base ring: 6 equally spaced hues
        const baseCount = 6;
        let base = [];
        for (let i = 0; i < baseCount; i++) {
            const hue = (i / baseCount) * 360;
            base.push(hslToHex(hue, 100, 50));
        }
        rings.push(base);

        // Generate subsequent rings by doubling colors through blending adjacent colors
        const ringCount = 4; // produces: 6,12,24,48
        let prev = base;
        for (let r = 1; r < ringCount; r++) {
            const next = [];
            const n = prev.length;
            for (let i = 0; i < n; i++) {
                const a = prev[i];
                const b = prev[(i + 1) % n];
                // Keep original color
                next.push(a);
                // Insert blend between a and b (midpoint)
                next.push(this.blendColors(a, b, 0.5));
            }
            rings.push(next);
            prev = next;
        }

        return rings;
    },

    getComplementaryColor(hexColor) {
        // Convert hex to RGB
        const hex = hexColor.replace('#', '');
        const r = 255 - parseInt(hex.substr(0, 2), 16);
        const g = 255 - parseInt(hex.substr(2, 2), 16);
        const b = 255 - parseInt(hex.substr(4, 2), 16);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    blendColors(color1, color2, ratio = 0.5) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');

        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);

        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);

        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    createColorPalette() {
        // Create main palette container attached to world, not controller
        this.colorPalette = document.createElement('a-entity');
        this.colorPalette.setAttribute('visible', false);

        const rings = this.generateColorRings().slice(3);
        this.colorSpheres = [];

        rings.forEach((ring, ringIndex) => {
            const radius = 0.08 + (ringIndex * 0.04); // Increasing radius for each ring
            const sphereSize = 0.015 - (ringIndex * 0.002); // Decreasing size for outer rings

            ring.forEach((color, colorIndex) => {
                const angle = (colorIndex / ring.length) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;

                const colorSphere = document.createElement('a-entity');
                // Create flattened sphere (scale Y to make it flat)
                colorSphere.setAttribute('geometry', `primitive: sphere; radius: ${sphereSize}`);
                colorSphere.setAttribute('material', `color: ${color}; roughness: 0.7;`);
                colorSphere.setAttribute('position', `${x} 0 ${z}`);
                colorSphere.setAttribute('scale', `1 0.3 1`); // Flatten the sphere
                colorSphere.setAttribute('class', 'color-option');
                colorSphere.userData = { color: color };

                this.colorPalette.appendChild(colorSphere);
                this.colorSpheres.push(colorSphere);
            });
        });

        // Attach to scene instead of controller
        this.el.sceneEl.appendChild(this.colorPalette);
    },

    showPalette() {
        this.paletteVisible = true;
        if (this.colorPalette) {
            // Position palette at controller's current location when shown
            const controllerPos = new this.T.Vector3();
            this.el.object3D.getWorldPosition(controllerPos);

            // Position palette directly at controller location
            this.colorPalette.setAttribute('position', `${controllerPos.x} ${controllerPos.y} ${controllerPos.z}`);
            this.colorPalette.setAttribute('visible', true);

            // Add gentle rotation animation
            this.colorPalette.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 20000; loop: true; easing: linear');
        }
    },

    hidePalette() {
        this.paletteVisible = false;
        if (this.colorPalette) {
            this.colorPalette.setAttribute('visible', false);
            this.colorPalette.removeAttribute('animation');
        }
    },

    selectColor() {
        if (!this.paletteVisible) return;

        const rc = this.el.components.raycaster;
        if (rc?.intersectedEls.length > 0) {
            const target = rc.intersectedEls[0];
            if (target?.hasAttribute('class') && target.getAttribute('class').includes('color-option')) {
                const selectedColor = target.userData.color;
                this.setCurrentMaterial(selectedColor);

                // Haptic feedback for color selection
                this.el.emit('haptic-pulse', { intensity: 0.5, duration: 80 }, false);

                // Hide palette after selection
                this.hidePalette();
            }
        }
    },

    checkSphereColorCollision() {
        if (!this.paletteVisible || !this.paintSphere || !this.paintSphere.object3D) return;

        // Get paint sphere world position
        const spherePos = new this.T.Vector3();
        this.paintSphere.object3D.getWorldPosition(spherePos);

        // Check collision with each color sphere
        this.colorSpheres.forEach(colorSphere => {
            // Skip if the color sphere's 3D object isn't ready yet
            if (!colorSphere.object3D) return;

            const colorPos = new this.T.Vector3();
            colorSphere.object3D.getWorldPosition(colorPos);

            const distance = spherePos.distanceTo(colorPos);
            const collisionDistance = this.data.sphereRadius + 0.015; // paint sphere radius + color sphere radius

            if (distance < collisionDistance) {
                // Collision detected - update color
                const selectedColor = colorSphere.userData.color;
                if (selectedColor !== this.data.color) {
                    this.setCurrentMaterial(selectedColor);

                    // Haptic feedback for color selection
                    this.el.emit('haptic-pulse', { intensity: 0.5, duration: 80 }, false);

                    // Add visual feedback to selected color sphere
                    this.highlightSelectedColor(colorSphere);
                }
            }
        });
    },

    highlightSelectedColor(colorSphere) {
        // Remove previous highlights
        this.colorSpheres.forEach(sphere => {
            sphere.removeAttribute('animation__highlight');
            const material = sphere.getAttribute('material');
            if (material && typeof material === 'string') {
                sphere.setAttribute('material', material.replace(/; emissive: #[0-9A-Fa-f]{6}/, ''));
            }
        });

        // Add highlight to selected sphere
        const baseColor = colorSphere.userData.color;
        const currentMaterial = colorSphere.getAttribute('material');
        const materialString = typeof currentMaterial === 'string' ? currentMaterial : '';
        colorSphere.setAttribute('material', `${materialString}; emissive: ${baseColor}`);
        colorSphere.setAttribute('animation__highlight', 'property: scale; to: 1.3 1.3 1.3; dur: 200; dir: alternate; loop: 2; easing: easeOutElastic');
    },

    tick() {
        // Continuous painting while trigger is held
        if (this.isPainting) {
            this.paintTarget();
        }

        // Check for sphere collision with color palette
        this.checkSphereColorCollision();
    }
});