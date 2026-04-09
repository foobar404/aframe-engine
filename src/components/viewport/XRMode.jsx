import React, { useState, useEffect } from 'react';
import { BsHeadsetVr } from "react-icons/bs";

import "../../vr-components/haptics";
import "../../vr-components/paint-tool";
import "../../vr-components/move-tool";
import "../../vr-components/shapes-tool";
import "../../vr-components/vr-controller";
import "../../vr-components/vr-toolbelt";
import "../../vr-components/fly";
import "../../vr-components/smooth-turn";
import "../../vr-components/vertical-move";
import "../../vr-components/vr-save";
import "../../vr-components/ui-overlay";
import "../../vr-components/component-tool";
import "../../vr-components/csg-primitives"
import "../../vr-components/environment.js"
import "../../vr-components/gizmo.js"
import "../../vr-components/highlight.js"
import "../../vr-components/keyboard.js"
import "../../vr-components/particles.js"
import "../../vr-components/time-widget.js"
import "../../vr-components/visor.js"
import "../../vr-components/log-panel.js"


export const XRMode = () => {
    const [isVRSupported, setIsVRSupported] = useState(false);
    const [vrRig, setVrRig] = useState(null);

    useEffect(() => {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-vr').then(setIsVRSupported);
        }
    }, []);

    const createVRRig = () => {
        const sceneEl = AFRAME.scenes[0];
        if (!sceneEl) return null;

        const rig = document.createElement('a-entity');
        rig.id = 'admin-camera-rig';
        rig.setAttribute('position', '0 1.6 0');

        const camera = document.createElement('a-camera');
        camera.id = "admin-camera";
        camera.setAttribute('look-controls', '');
        camera.setAttribute('active', '');
        camera.setAttribute('visor', '');
        camera.setAttribute('log-panel', '');

        const leftController = document.createElement('a-entity');
        leftController.id = "admin-left-controller";
        leftController.setAttribute('oculus-touch-controls', 'hand: left');
        leftController.setAttribute('vr-controller', '');
        leftController.setAttribute('move-tool', 'hand: left; enabled: false');
        leftController.setAttribute('paint-tool', 'enabled: false');
        leftController.setAttribute('shapes-tool', 'enabled: true');
        leftController.setAttribute('component-tool', 'hand: left; enabled: false');
        leftController.setAttribute('fly', '');
        leftController.setAttribute('haptics', '');
        
        const rightController = document.createElement('a-entity');
        rightController.id = "admin-right-controller";
        rightController.setAttribute('oculus-touch-controls', 'hand: right');
        rightController.setAttribute('vr-controller', '');
        rightController.setAttribute('move-tool', 'hand: right; enabled: true');
        rightController.setAttribute('paint-tool', 'enabled: false');
        rightController.setAttribute('shapes-tool', 'enabled: false');
        rightController.setAttribute('smooth-turn', '');
        rightController.setAttribute('vertical-move', '');
        rightController.setAttribute('haptics', '');
        rightController.setAttribute('vr-save', '');
        rightController.setAttribute('component-tool', 'hand: right; enabled: false');

        const body = document.createElement('a-entity');
        body.id = 'admin-body';
        body.setAttribute('position', '0 .4 -0.3');
        body.setAttribute('rotation', '0 0 0');
        body.setAttribute('data-vr-tool-ui', 'true');
        body.setAttribute('vr-toolbelt', 'tools: paint-tool,move-tool,shapes-tool,component-tool; offset: 0 0.28 0.08');

        rig.appendChild(camera);
        rig.appendChild(leftController);
        rig.appendChild(rightController);
        rig.appendChild(body);
        sceneEl.appendChild(rig);

        return rig;
    };

    const removeVRRig = () => {
        vrRig?.remove();
        setVrRig(null);
    };

    const toggleVR = () => {
        const sceneEl = AFRAME.scenes[0];
        if (!sceneEl) return;

        if (sceneEl.is('vr-mode')) {
            sceneEl.exitVR();
            removeVRRig();
        } else {
            setVrRig(createVRRig());
            sceneEl.enterVR().catch((err) => {
                console.error('Failed to enter VR:', err);
                removeVRRig();
            });
        }
    };

    useEffect(() => {
        return () => removeVRRig();
    }, []);

    if (!isVRSupported) return null;

    return (
        <div className="xr-mode">
            <button
                className="bg-[var(--bg-dark)] hover:bg-[var(--secondary)] cursor-pointer rounded-md p-1 flex justify-center items-center gap-2"
                onClick={toggleVR}
                title="Toggle VR Mode">
                <BsHeadsetVr />
                <span>VR Mode</span>
            </button>
        </div>
    );
};

