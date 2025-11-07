window.AFRAME.registerComponent('time-widget', {
  schema: {
    hand: { type: "string", default: "right" }
  },
  
  init: function () {
    // Only create time display on right controller
    if (this.data.hand !== 'right') return;
    
    this.timeDisplay = null;
    this.updateInterval = null;
    
    // FPS tracking variables
    this.fpsDisplay = null;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.fpsUpdateInterval = 500; // Update FPS every 500ms
    
    // Battery tracking variables
    this.batteryDisplay = null;
    this.batteryLevel = 0;
    this.batteryCharging = false;
    
    this.createTimeDisplay();
    this.startUpdateLoop();
  },

  createTimeDisplay: function() {
    // Create curved plane for the time display - positioned on wrist
    const timeContainer = document.createElement('a-entity');
    
    // Create date display (smaller, above time)
    this.dateDisplay = document.createElement('a-entity');
    this.dateDisplay.setAttribute('text', {
      value: this.getFormattedDate(),
      color: '#111111',
      align: 'center',
      width: 0.2,
      font: 'roboto'
    });
    this.dateDisplay.setAttribute('position', '0 0.03 -0.01');
    timeContainer.appendChild(this.dateDisplay);
    
    // Create main time text (12-hour format with AM/PM)
    this.timeDisplay = document.createElement('a-entity');
    this.timeDisplay.setAttribute('text', {
      value: this.getFormattedTime(),
      color: '#000000',
      align: 'center',
      width: .25,
      font: 'roboto'
    });
    this.timeDisplay.setAttribute('position', '0 0 0');
    timeContainer.appendChild(this.timeDisplay);
    
    // Create seconds display (smaller, below time)
    this.secondsDisplay = document.createElement('a-entity');
    this.secondsDisplay.setAttribute('text', {
      value: this.getFormattedSeconds(),
      color: '#111111',
      align: 'center',
      width: 0.15,
      font: 'roboto'
    });
    this.secondsDisplay.setAttribute('position', '.035 0 -0.01');
    timeContainer.appendChild(this.secondsDisplay);
    
    // Create FPS display (smaller, bottom)
    this.fpsDisplay = document.createElement('a-entity');
    this.fpsDisplay.setAttribute('text', {
      value: 'FPS: 60',
      color: '#111111',
      align: 'center',
      width: 0.2,
      font: 'roboto'
    });
    this.fpsDisplay.setAttribute('position', '-0.02 -0.03 -0.01');
    timeContainer.appendChild(this.fpsDisplay);
    
    // Create battery display (smaller, bottom right)
    this.batteryDisplay = document.createElement('a-entity');
    this.batteryDisplay.setAttribute('text', {
      value: 'BAT: --',
      color: '#111111',
      align: 'center',
      width: 0.2,
      font: 'roboto'
    });
    this.batteryDisplay.setAttribute('position', '0.02 -0.03 -0.01');
    timeContainer.appendChild(this.batteryDisplay);
    
    this.el.appendChild(timeContainer);
    
    // Initialize battery monitoring
    this.initBatteryMonitoring();
  },

  getFormattedDate: function() {
    const now = new Date();
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return now.toLocaleDateString('en-US', options);
  },

  getFormattedTime: function() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${hours}:${minutes} ${ampm}`;
  },

  getFormattedSeconds: function() {
    const now = new Date();
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `:${seconds}`;
  },

  initBatteryMonitoring: function() {
    // Try to get battery info from navigator.getBattery (for system battery)
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        this.batteryLevel = Math.round(battery.level * 100);
        this.batteryCharging = battery.charging;
        
        // Listen for battery events
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = Math.round(battery.level * 100);
        });
        
        battery.addEventListener('chargingchange', () => {
          this.batteryCharging = battery.charging;
        });
      }).catch(() => {
      });
    }
    
    // Try to get VR controller battery info
    this.checkVRControllerBattery();
  },

  checkVRControllerBattery: function() {
    // Check for WebXR gamepad battery info
    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.requestSession('immersive-vr').then((session) => {
        const updateControllerBattery = () => {
          const frame = session.requestAnimationFrame(() => {
            const inputSources = session.inputSources;
            for (let source of inputSources) {
              if (source.gamepad && source.gamepad.hapticActuators) {
                // Some VR systems expose battery through gamepad extensions
                if (source.gamepad.battery !== undefined) {
                  this.batteryLevel = Math.round(source.gamepad.battery * 100);
                  return;
                }
              }
            }
          });
        };
        
        // Update controller battery periodically
        setInterval(updateControllerBattery, 5000);
      }).catch(() => {
        // XR session not available, fallback to estimates
      });
    }
  },

  getBatteryDisplay: function() {
    if (this.batteryLevel === 0) {
      return 'BAT: --';
    }
    
    let batteryColor = '#111111';
    
    // Update battery display color
    if (this.batteryDisplay) {
      this.batteryDisplay.setAttribute('text', 'color', batteryColor);
    }
    
    return `⚡${this.batteryLevel}%`;
  },

  startUpdateLoop: function() {
    // Update time every second to show seconds
    this.updateInterval = setInterval(() => {
      if (this.timeDisplay && this.secondsDisplay && this.dateDisplay && this.fpsDisplay && this.batteryDisplay) {
        this.timeDisplay.setAttribute('text', 'value', this.getFormattedTime());
        this.secondsDisplay.setAttribute('text', 'value', this.getFormattedSeconds());
        this.dateDisplay.setAttribute('text', 'value', this.getFormattedDate());
        this.fpsDisplay.setAttribute('text', 'value', `${this.fps} FPS`);
        this.batteryDisplay.setAttribute('text', 'value', this.getBatteryDisplay());
      }
    }, 1000);
  },

  tick: function(time, deltaTime) {
    // Only track FPS on right controller
    if (this.data.hand !== 'right') return;
    
    this.frameCount++;
    
    // Update FPS calculation every 500ms
    if (time - this.lastTime >= this.fpsUpdateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (time - this.lastTime));
      this.frameCount = 0;
      this.lastTime = time;
    }
  },

  remove: function() {
    // Clean up interval when component is removed
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
});