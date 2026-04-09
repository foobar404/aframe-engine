import React, { useState, useEffect } from 'react';
import { BsHeadsetVr } from "react-icons/bs";

import "../../vr-components/editor-haptics";
import "../../vr-components/editor-paint-tool";
import "../../vr-components/editor-move-tool";
import "../../vr-components/editor-shapes-tool";
import "../../vr-components/editor-vr-controller";
import "../../vr-components/editor-vr-toolbelt";
import "../../vr-components/editor-fly";
import "../../vr-components/editor-smooth-turn";
import "../../vr-components/editor-vertical-move";
import "../../vr-components/editor-vr-save";
import "../../vr-components/editor-component-tool";
import "../../vr-components/editor-time-widget.js"
import "../../vr-components/editor-visor.js"
import "../../vr-components/editor-log-panel.js"


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
        camera.setAttribute('editor-visor', '');
        camera.setAttribute('editor-log-panel', '');

        const leftController = document.createElement('a-entity');
        leftController.id = "admin-left-controller";
        leftController.setAttribute('oculus-touch-controls', 'hand: left');
        leftController.setAttribute('editor-vr-controller', '');
        leftController.setAttribute('editor-move-tool', 'hand: left; enabled: false');
        leftController.setAttribute('editor-paint-tool', 'enabled: false');
        leftController.setAttribute('editor-shapes-tool', 'enabled: true');
        leftController.setAttribute('editor-component-tool', 'hand: left; enabled: false');
        leftController.setAttribute('editor-fly', '');
        leftController.setAttribute('editor-haptics', '');
        
        const rightController = document.createElement('a-entity');
        rightController.id = "admin-right-controller";
        rightController.setAttribute('oculus-touch-controls', 'hand: right');
        rightController.setAttribute('editor-vr-controller', '');
        rightController.setAttribute('editor-move-tool', 'hand: right; enabled: true');
        rightController.setAttribute('editor-paint-tool', 'enabled: false');
        rightController.setAttribute('editor-shapes-tool', 'enabled: false');
        rightController.setAttribute('editor-smooth-turn', '');
        rightController.setAttribute('editor-vertical-move', '');
        rightController.setAttribute('editor-haptics', '');
        rightController.setAttribute('editor-vr-save', '');
        rightController.setAttribute('editor-component-tool', 'hand: right; enabled: false');

        const body = document.createElement('a-entity');
        body.id = 'admin-body';
        body.setAttribute('position', '0 .4 -0.3');
        body.setAttribute('rotation', '0 0 0');
        body.setAttribute('data-vr-tool-ui', 'true');
        body.setAttribute('editor-vr-toolbelt', 'tools: editor-paint-tool,editor-move-tool,editor-shapes-tool,editor-component-tool; offset: 0 0.28 0.08');

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

