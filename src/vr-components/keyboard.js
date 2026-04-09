AFRAME.registerComponent('keyboard', {
  schema: {
    enabled: { type: 'boolean', default: true },
    target: { type: 'selector', default: null }
  },

  init: function () {
    this._down = (e) => {
      if (!this.data.enabled) return;
      const target = this.data.target || this.el;
      target.emit('xr:key-down', { key: e.key, code: e.code, source: this.el });
      this.el.emit('xr:key-down', { key: e.key, code: e.code });
    };

    this._up = (e) => {
      if (!this.data.enabled) return;
      const target = this.data.target || this.el;
      target.emit('xr:key-up', { key: e.key, code: e.code, source: this.el });
      this.el.emit('xr:key-up', { key: e.key, code: e.code });
    };

    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
  },

  remove: function () {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
  }
});
