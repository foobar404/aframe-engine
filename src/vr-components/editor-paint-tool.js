import { Events } from '../lib/Events';

window.AFRAME.registerComponent('editor-paint-tool', {
    schema: {
        enabled: { type: 'boolean', default: true },
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
        this.wireframeStates = new Map();
        this.colorPalette = null;
        this.colorSpheres = [];
        this.roughnessSpheres = [];
        this.metalnessSpheres = [];
        this.allPaletteSpheres = [];

        // Initialize current material from schema
        this.data.currentMaterial = `color: ${this.data.color}; roughness: ${this.data.roughness}; metalness: ${this.data.metalness};`;

        this.disableRaycasts();
        this.createPaintSphere();
        this.createColorPalette();
        this.createRingLabels();
        this.bindEvents();
        this.applyEnabledState();
    },

    update: function (oldData) {
        if (!oldData || typeof oldData.enabled === 'undefined') {
            this.applyEnabledState();
            return;
        }

        if (oldData.enabled !== this.data.enabled) {
            this.applyEnabledState();
        }
    },

    applyEnabledState: function () {
        if (this.paintSphere) {
            this.paintSphere.setAttribute('visible', !!this.data.enabled);
        }

        if (!this.data.enabled) {
            this.isPainting = false;
            this.hidePalette();
        }
    },

    onToolActivated: function () {
        this.applyEnabledState();
    },

    onToolDeactivated: function () {
        this.applyEnabledState();
    },

    disableRaycasts() {
        this.el.removeAttribute('laser-controls');
        this.el.removeAttribute('raycaster');
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
        this.el.addEventListener('triggerdown', this.handleTriggerDown.bind(this));

        // Grip = wireframe toggle
        this.el.addEventListener('gripdown', this.toggleWireframe.bind(this));

        // A/X = eyedropper
        this.el.addEventListener('abuttondown', this.eyedropper.bind(this));
        this.el.addEventListener('xbuttondown', this.eyedropper.bind(this));

        // Color palette toggle
        this.el.addEventListener('bbuttondown', this.showPalette.bind(this));
        this.el.addEventListener('bbuttonup', this.hidePalette.bind(this));
        this.el.addEventListener('ybuttondown', this.showPalette.bind(this));
        this.el.addEventListener('ybuttonup', this.hidePalette.bind(this));
    },

    handleTriggerDown() {
        if (!this.data.enabled) return;
        if (this.paletteVisible) {
            this.selectColor();
            return;
        }
        this.paintWithButton();
    },

    paintWithButton() {
        if (!this.data.enabled) return;
        // Single paint action with haptics for A/X buttons
        this.paintTarget();
        // Emit haptic feedback only for button presses
        this.el.emit('haptic-pulse', { intensity: 0.3, duration: 50 }, false);
    },

    toggleWireframe() {
        if (!this.data.enabled) return;
        const target = this.findPaintTargetBySphere();
        if (!target) return;

        target.setAttribute('material', { wireframe: true });
        Events.emit('entityupdate', {
            entity: target,
            component: 'material',
            property: '',
            value: target.getAttribute('material')
        });
        this.el.emit('haptic-pulse', { intensity: 0.4, duration: 60 }, false);
    },

    eyedropper() {
        if (!this.data.enabled) return;
        const target = this.findPaintTargetBySphere();
        if (!target) return;

        const mat = target.getAttribute('material');
        if (!mat) return;

        const get = (obj, key, fallback) => {
            if (typeof obj === 'string') {
                const m = obj.match(new RegExp(`${key}:\\s*([^;]+)`));
                return m ? m[1].trim() : fallback;
            }
            return obj[key] !== undefined ? String(obj[key]) : fallback;
        };

        const color = get(mat, 'color', this.data.color);
        const roughness = parseFloat(get(mat, 'roughness', this.data.roughness));
        const metalness = parseFloat(get(mat, 'metalness', this.data.metalness));

        this.data.color = color;
        this.data.roughness = isNaN(roughness) ? this.data.roughness : roughness;
        this.data.metalness = isNaN(metalness) ? this.data.metalness : metalness;
        this.data.currentMaterial = this.composeMaterialString();
        this.updatePaintSphere();
        this.updateRingLabels();

        this.el.emit('haptic-pulse', { intensity: 0.6, duration: 100 }, false);
    },

    startPainting() {
        if (!this.data.enabled) return;
        this.isPainting = true;
        this.paintTarget();
    },

    stopPainting() {
        if (!this.data.enabled) return;
        this.isPainting = false;
    },

    paintTarget() {
        if (!this.data.enabled) return;
        const target = this.findPaintTargetBySphere();
        if (target) this.applyPaintToTarget(target);
    },

    async applyPaintToTarget(target) {
        target.setAttribute('material', this.data.currentMaterial);
        Events.emit('entityupdate', {
            entity: target,
            component: 'material',
            property: '',
            value: target.getAttribute('material')
        });
    },

    updatePaintSphere() {
        if (this.paintSphere) {
            this.paintSphere.setAttribute('geometry', `primitive: sphere; radius: ${this.data.sphereRadius}`);
            this.paintSphere.setAttribute('material', this.data.currentMaterial);
        }
    },

    composeMaterialString() {
        return `color: ${this.data.color}; roughness: ${this.data.roughness}; metalness: ${this.data.metalness};`;
    },

    setCurrentMaterial(color) {
        this.data.color = color;
        this.data.currentMaterial = this.composeMaterialString();
        this.updatePaintSphere();
    },

    setRoughness(value) {
        this.data.roughness = parseFloat(value.toFixed(2));
        this.data.currentMaterial = this.composeMaterialString();
        this.updatePaintSphere();
        this.updateRingLabels();
    },

    setMetalness(value) {
        this.data.metalness = parseFloat(value.toFixed(2));
        this.data.currentMaterial = this.composeMaterialString();
        this.updatePaintSphere();
        this.updateRingLabels();
    },

    updateRingLabels() {
        if (this.roughnessLabel) {
            this.roughnessLabel.setAttribute('text', `value: Roughness: ${Math.round(this.data.roughness * 100)}%; color: #cccccc; align: left; width: 0.4; wrapCount: 30`);
        }
        if (this.metalnessLabel) {
            this.metalnessLabel.setAttribute('text', `value: Metalness: ${Math.round(this.data.metalness * 100)}%; color: #88bbee; align: left; width: 0.4; wrapCount: 30`);
        }
    },

    createRingLabels() {
        this.labelsContainer = document.createElement('a-entity');
        this.labelsContainer.setAttribute('visible', false);
        this.labelsContainer.setAttribute('rotation', '0 270 0');

        const makeLabel = (name, yOffset, textColor) => {
            const wrapper = document.createElement('a-entity');
            wrapper.setAttribute('position', `0 ${yOffset} 0`);

            const bg = document.createElement('a-entity');
            bg.setAttribute('geometry', 'primitive: plane; width: 0.14; height: 0.028');
            bg.setAttribute('material', 'color: #111111; opacity: 0.8; transparent: true; side: double');
            wrapper.appendChild(bg);

            const textEl = document.createElement('a-entity');
            textEl.setAttribute('text', `value: ${name}; color: ${textColor}; align: left; width: 0.4; wrapCount: 30`);
            textEl.setAttribute('position', '-0.065 0 0.002');
            wrapper.appendChild(textEl);

            this.labelsContainer.appendChild(wrapper);
            return textEl;
        };

        makeLabel('Color', 0, '#ffffff');
        this.roughnessLabel = makeLabel(`Roughness: ${Math.round(this.data.roughness * 100)}%`, 0.07, '#cccccc');
        this.metalnessLabel = makeLabel(`Metalness: ${Math.round(this.data.metalness * 100)}%`, 0.14, '#88bbee');

        this.el.sceneEl.appendChild(this.labelsContainer);
    },

    valueToGrayHex(v) {
        const lightness = Math.round(220 - v * 160);
        const h = lightness.toString(16).padStart(2, '0');
        return `#${h}${h}${h}`;
    },

    valueToMetalHex(v) {
        const r = Math.round(70 + v * 130).toString(16).padStart(2, '0');
        const g = Math.round(75 + v * 130).toString(16).padStart(2, '0');
        const b = Math.round(80 + v * 140).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    },

    addPropertyRing(type, yOffset) {
        const count = 16;
        const ringRadius = 0.12;
        const sphereSize = 0.013;
        for (let i = 0; i < count; i++) {
            const value = i / (count - 1);
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * ringRadius;
            const z = Math.sin(angle) * ringRadius;
            const color = type === 'roughness' ? this.valueToGrayHex(value) : this.valueToMetalHex(value);
            const mat = type === 'roughness'
                ? `color: ${color}; roughness: ${value.toFixed(2)}; metalness: 0;`
                : `color: ${color}; roughness: 0.3; metalness: ${value.toFixed(2)};`;
            const sphere = document.createElement('a-entity');
            sphere.setAttribute('geometry', `primitive: sphere; radius: ${sphereSize}`);
            sphere.setAttribute('material', mat);
            sphere.setAttribute('position', `${x.toFixed(4)} ${yOffset} ${z.toFixed(4)}`);
            sphere.setAttribute('scale', '1 0.3 1');
            sphere.setAttribute('class', 'palette-sphere');
            sphere.userData = { type, value, color };

            const pct = Math.round(value * 100);
            const label = document.createElement('a-entity');
            label.setAttribute('text', `value: ${pct}%; color: #ffffff; align: center; width: 0.12; wrapCount: 6`);
            label.setAttribute('position', `0 0.02 0`);
            label.setAttribute('rotation', '0 0 90');
            label.setAttribute('visible', false);
            sphere.appendChild(label);

            this.colorPalette.appendChild(sphere);
            if (type === 'roughness') this.roughnessSpheres.push(sphere);
            else this.metalnessSpheres.push(sphere);
            this.allPaletteSpheres.push(sphere);
        }
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
                colorSphere.setAttribute('class', 'palette-sphere');
                colorSphere.userData = { type: 'color', color: color };

                this.colorPalette.appendChild(colorSphere);
                this.colorSpheres.push(colorSphere);
                this.allPaletteSpheres.push(colorSphere);
            });
        });

        // Stack roughness and metalness rings above the color ring
        this.addPropertyRing('roughness', 0.07);
        this.addPropertyRing('metalness', 0.14);

        // Attach to scene instead of controller
        this.el.sceneEl.appendChild(this.colorPalette);
    },

    showPalette() {
        if (!this.data.enabled) return;
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

            if (this.labelsContainer) {
                this.updateRingLabels();
                this.labelsContainer.setAttribute('position', `${controllerPos.x + 0.22} ${controllerPos.y} ${controllerPos.z}`);
                // labels hidden for now
            }
        }
    },

    hidePalette() {
        this.paletteVisible = false;
        if (this.colorPalette) {
            this.colorPalette.setAttribute('visible', false);
            this.colorPalette.removeAttribute('animation');
        }
        if (this.labelsContainer) {
            this.labelsContainer.setAttribute('visible', false);
        }
    },

    selectColor() {
        if (!this.data.enabled) return;
        if (!this.paletteVisible) return;

        const hitSphere = this.findPaletteSphereByOverlap();
        if (hitSphere) {
            const { type, color, value } = hitSphere.userData;
            if (type === 'color') this.setCurrentMaterial(color);
            else if (type === 'roughness') this.setRoughness(value);
            else if (type === 'metalness') this.setMetalness(value);
            this.el.emit('haptic-pulse', { intensity: 0.5, duration: 80 }, false);
            this.highlightSelectedColor(hitSphere);
            this.hidePalette();
        }
    },

    getPaintSphereWorldPosition() {
        if (!this.paintSphere?.object3D) return null;
        const pos = new this.T.Vector3();
        this.paintSphere.object3D.getWorldPosition(pos);
        return pos;
    },

    findPaintTargetBySphere(tolerance = null) {
        const spherePos = this.getPaintSphereWorldPosition();
        if (!spherePos) return null;

        const threshold = tolerance !== null ? tolerance : this.data.sphereRadius * 2.5;
        const all = Array.from(this.el.sceneEl.querySelectorAll('*'));
        let best = null;
        let bestDist = Infinity;

        for (const el of all) {
            if (!el || el === this.el || el === this.el.sceneEl || !el.object3D) continue;

            const rig = document.getElementById('admin-camera-rig');
            if (rig && (el === rig || rig.contains(el))) continue;
            if (el.hasAttribute('data-vr-tool-ui') || el.closest('[controller-toolbelt]')) continue;
            if (el.closest('[editor-paint-tool]') || el.closest('a-assets')) continue;
            if (String(el.getAttribute('class') || '').includes('palette-sphere')) continue;

            const box = new this.T.Box3().setFromObject(el.object3D);
            let dist = Infinity;

            if (!box.isEmpty()) {
                dist = box.distanceToPoint(spherePos);
            } else {
                const worldPos = new this.T.Vector3();
                el.object3D.getWorldPosition(worldPos);
                dist = spherePos.distanceTo(worldPos);
            }

            if (dist <= threshold && dist < bestDist) {
                best = el;
                bestDist = dist;
            }
        }

        return best;
    },

    findPaletteSphereByOverlap() {
        const spherePos = this.getPaintSphereWorldPosition();
        if (!spherePos) return null;

        for (const sphere of this.allPaletteSpheres) {
            if (!sphere?.object3D) continue;
            const pos = new this.T.Vector3();
            sphere.object3D.getWorldPosition(pos);
            if (spherePos.distanceTo(pos) < this.data.sphereRadius + 0.015) return sphere;
        }

        return null;
    },

    checkSphereColorCollision() {
        if (!this.data.enabled) return;
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

    highlightSelectedColor(selected) {
        this.allPaletteSpheres.forEach(sphere => {
            sphere.removeAttribute('animation__highlight');
            const mat = sphere.getAttribute('material');
            if (mat && typeof mat === 'string') {
                sphere.setAttribute('material', mat.replace(/;\s*emissive:[^;]+/, ''));
            }
        });

        const baseColor = selected.userData.color || '#ffffff';
        const currentMat = selected.getAttribute('material');
        const matStr = typeof currentMat === 'string' ? currentMat : '';
        selected.setAttribute('material', `${matStr}; emissive: ${baseColor}`);
        selected.setAttribute('animation__highlight', 'property: scale; to: 1.5 1.5 1.5; dur: 200; dir: alternate; loop: 2; easing: easeOutElastic');
    },

    tick() {
        if (!this.data.enabled) return;
        // Continuous painting while trigger is held
        if (this.isPainting) {
            this.paintTarget();
        }

        // Color changes are trigger-driven while palette is visible.
        // Keep collision check disabled to avoid accidental color swaps.
        // this.checkSphereColorCollision();
    }
});