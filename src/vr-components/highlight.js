AFRAME.registerComponent('highlight', {
  schema: {
    color: { type: 'color', default: '#90e0ef' },
    emissiveIntensity: { type: 'number', default: 0.65 },
    eventOn: { type: 'string', default: 'raycaster-intersected' },
    eventOff: { type: 'string', default: 'raycaster-intersected-cleared' }
  },

  init: function () {
    this._prev = null;
    this._on = () => this.setHighlighted(true);
    this._off = () => this.setHighlighted(false);

    this.el.addEventListener(this.data.eventOn, this._on);
    this.el.addEventListener(this.data.eventOff, this._off);
  },

  remove: function () {
    this.el.removeEventListener(this.data.eventOn, this._on);
    this.el.removeEventListener(this.data.eventOff, this._off);
    this.setHighlighted(false);
  },

  setHighlighted: function (on) {
    const mat = this.el.getAttribute('material') || {};
    if (on) {
      if (this._prev === null) {
        this._prev = {
          emissive: mat.emissive || '#000000',
          emissiveIntensity: typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : 0
        };
      }
      this.el.setAttribute('material', {
        emissive: this.data.color,
        emissiveIntensity: this.data.emissiveIntensity
      });
      return;
    }

    if (this._prev) {
      this.el.setAttribute('material', {
        emissive: this._prev.emissive,
        emissiveIntensity: this._prev.emissiveIntensity
      });
    }
  }
});
