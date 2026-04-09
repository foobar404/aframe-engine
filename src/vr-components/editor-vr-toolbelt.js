const TOOL_COLORS = {
    'editor-paint-tool':      '#e74c3c',
    'editor-shapes-tool':     '#3498db',
    'editor-move-tool':       '#2ecc71',
    'gizmo':                  '#9b59b6',
    'editor-component-tool':  '#f39c12',
};

const DEFAULT_COLOR = '#95a5a6';

window.AFRAME.registerComponent('editor-vr-toolbelt', {
    schema: {
        tools:  { type: 'string', default: 'paint-tool' },
        offset: { type: 'vec3',   default: { x: 0, y: 0.06, z: 0.04 } }
    },

    init() {
        this.toolList    = [];
        this.activeIndex = 0;
        this.cubes       = [];
        this._build();
    },

    update(oldData) {
        if (!oldData || oldData.tools !== this.data.tools) this._build();
    },

    remove() {
        if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
    },

    _build() {
        if (this.container?.parentNode) this.container.parentNode.removeChild(this.container);
        this.cubes    = [];
        this.toolList = this.data.tools.split(',').map(t => t.trim()).filter(Boolean);

        this.container = document.createElement('a-entity');
        this.container.setAttribute('position', `${this.data.offset.x} ${this.data.offset.y} ${this.data.offset.z}`);
        this.container.setAttribute('rotation', '0 0 0'); // lay flat, face up on back of hand
        this.container.setAttribute('data-vr-tool-ui', 'true');
        this.el.appendChild(this.container);

        const spacing = 0.055;
        const startX  = -((this.toolList.length - 1) * spacing) / 2;

        this.toolList.forEach((tool, i) => {
            const color = TOOL_COLORS[tool] || DEFAULT_COLOR;

            const cube = document.createElement('a-entity');
            cube.setAttribute('geometry', 'primitive: box; width: 0.045; height: 0.045; depth: 0.045');
            cube.setAttribute('material', `color: ${color}; opacity: 0.9`);
            cube.setAttribute('position', `${(startX + i * spacing).toFixed(4)} 0 0`);
            cube.setAttribute('class', 'control');
            cube.setAttribute('data-vr-tool-ui', 'true');

            const label = document.createElement('a-entity');
            label.setAttribute('text', `value: ${tool.replace(/-tool$/, '')}; align: center; width: 0.3; color: #ffffff; side: double`);
            label.setAttribute('position', '0 0.042 0');
            cube.appendChild(label);

            cube.addEventListener('vr-select',    (e) => this._selectTool(i, e.detail?.controller));
            cube.addEventListener('vr-hover',     () => this._onHover(i, true));
            cube.addEventListener('vr-hover-end', () => this._onHover(i, false));

            this.container.appendChild(cube);
            this.cubes.push({ cube, tool, color });
        });

        // defer activation until tool components have initialized
        setTimeout(() => this._selectTool(0, null, false), 50);
    },

    _selectTool(index, controllerEl, haptic = true) {
        this.activeIndex = index;
        const selectedTool = this.toolList[index];

        // Determine target: use provided controller, or fall back to all controllers in rig
        const targets = controllerEl
            ? [controllerEl]
            : Array.from(this.el.sceneEl?.querySelectorAll('[editor-vr-controller]') || []);

        targets.forEach(target => {
            this.toolList.forEach((tool, i) => {
                if (!target.hasAttribute(tool)) return;
                const enabled = i === index;
                target.setAttribute(tool, { enabled });
                const comp = target.components[tool];
                if (!comp) return;
                if (enabled  && comp.onToolActivated)   comp.onToolActivated();
                if (!enabled && comp.onToolDeactivated) comp.onToolDeactivated();
            });
        });

        this._updateVisuals();
        if (haptic && controllerEl) controllerEl.emit('haptic-pulse', { intensity: 0.3, duration: 50 }, false);
        this.el.emit('vrtoolchange', { tool: selectedTool, index }, false);
    },

    _onHover(index, isHovering) {
        const { cube, color } = this.cubes[index];
        const isActive = index === this.activeIndex;
        if (isHovering) {
            cube.setAttribute('material', 'color: #ffffff; opacity: 1');
            cube.setAttribute('scale', '1.2 1.2 1.2');
        } else {
            cube.setAttribute('material', `color: ${isActive ? '#ffffff' : color}; opacity: 0.9`);
            cube.setAttribute('scale', isActive ? '1.15 1.15 1.15' : '1 1 1');
        }
    },

    _updateVisuals() {
        this.cubes.forEach(({ cube, color }, i) => {
            const isActive = i === this.activeIndex;
            cube.setAttribute('material', `color: ${isActive ? '#ffffff' : color}; opacity: 0.9`);
            cube.setAttribute('scale', isActive ? '1.15 1.15 1.15' : '1 1 1');
        });
    }
});
