/**
 * VR Save Component
 * Press the right thumbstick to save all changes to aframe-watcher.
 * Uses the page's hostname so it works from a headset on the same LAN.
 */
AFRAME.registerComponent('editor-vr-save', {
  init: function () {
    this._onSave = this._onSave.bind(this);
    this.el.addEventListener('thumbstickdown', this._onSave);
  },

  remove: function () {
    this.el.removeEventListener('thumbstickdown', this._onSave);
  },

  _pulse: function (intensity, duration) {
    this.el.emit('haptic-pulse', { intensity, duration }, false);
  },

  _onSave: async function () {
    const history = AFRAME.INSPECTOR && AFRAME.INSPECTOR.history;
    if (!history) {
      console.warn('[vr-save] AFRAME.INSPECTOR.history not found');
      this._pulse(1.0, 500);
      return;
    }

    const host = window.location.hostname;
    const watcherBase = `http://${host}:51234`;
    const actionList = history.actions || [];
    const assetsSnapshot = Array.from(document.querySelectorAll('a-assets > *')).map((el) => ({
      sourcePath: el.getAttribute('data-source-path') || null,
      id: el.id || null,
      tagName: el.tagName ? el.tagName.toLowerCase() : null,
      src:
        el.getAttribute('data-source-path') ||
        el.getAttribute('src') ||
        el.src ||
        null
    }));

    for (let i = actionList.length - 1; i >= 0; i--) {
      if (actionList[i].type === 'assetsync') {
        actionList.splice(i, 1);
      }
    }

    actionList.push({
      type: 'assetsync',
      payload: { assets: assetsSnapshot },
      timestamp: Date.now()
    });

    console.log('[vr-save] Saving to', watcherBase);
    this._pulse(0.3, 80);

    try {
      const res = await fetch(`${watcherBase}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(history.updates)
      });
      if (!res.ok) throw new Error(`/save returned ${res.status}`);
    } catch (err) {
      console.warn('[vr-save] /save failed:', err);
      this._pulse(1.0, 400);
      return;
    }

    if (actionList.length) {
      try {
        const res = await fetch(`${watcherBase}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actions: actionList })
        });
        if (res.ok) actionList.length = 0;
      } catch (err) {
        console.warn('[vr-save] /actions failed:', err);
      }
    }

    console.log('[vr-save] Saved successfully.');
    this._pulse(0.6, 200);
  }
});
