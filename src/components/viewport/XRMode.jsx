import React, { useState, useEffect } from 'react';
import Events from '../../lib/Events';
import { BsHeadsetVr } from "react-icons/bs";

import "../../vr-components/gizmo";
import "../../vr-components/haptics";
import "../../vr-components/killswitch";
import "../../vr-components/move-tool";
import "../../vr-components/paint-tool";
import "../../vr-components/shapes-tool";
import "../../vr-components/smart-move";
import "../../vr-components/time-widget";

const XRMode = () => {
    const [isVRSupported, setIsVRSupported] = useState(false);
    const [hasXRDevice, setHasXRDevice] = useState(false);
    const [vrRig, setVrRig] = useState(null);

    useEffect(() => {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-vr').then(setIsVRSupported);

            // Check for XR devices
            navigator.xr.enumerateDevices?.().then(devices => {
                setHasXRDevice(devices.length > 0);
            }).catch(() => {
                // Fallback: try to check if any XR device is available
                navigator.xr.requestSession?.('immersive-vr', { optionalFeatures: [] })
                    .then(session => {
                        session.end();
                        setHasXRDevice(true);
                    })
                    .catch(() => setHasXRDevice(false));
            });
        }
    }, []);

    const createVRRig = () => {
        const sceneEl = AFRAME.scenes[0];
        if (!sceneEl) return null;

        const rig = document.createElement('a-entity');
        rig.id = 'admin-camera-rig';
        rig.setAttribute('position', '0 1.6 0');

        const camera = document.createElement('a-entity');
        camera.id = "admin-camera";
        camera.setAttribute('camera', '');
        camera.setAttribute('look-controls', '');
        camera.setAttribute('active', '');

        const leftController = document.createElement('a-entity');
        leftController.id = "admin-left-controller";
        leftController.setAttribute('oculus-touch-controls', 'hand: left');
        leftController.setAttribute('shapes-tool', '');
        leftController.setAttribute('smart-move', '');
        leftController.setAttribute('haptics', '');

        const rightController = document.createElement('a-entity');
        rightController.id = "admin-right-controller";
        rightController.setAttribute('oculus-touch-controls', 'hand: right');
        rightController.setAttribute('laser-controls', '');
        rightController.setAttribute('move-tool', '');
        rightController.setAttribute('paint-tool', '');
        rightController.setAttribute('haptics', '');

        rig.appendChild(camera);
        rig.appendChild(leftController);
        rig.appendChild(rightController);
        sceneEl.appendChild(rig);

        return rig;
    };

    const removeVRRig = () => {
        vrRig?.remove();
        setVrRig(null);
    };

    const toggleVR = () => {
        if(!hasXRDevice){
            alert("No XR device detected.")
            return;
        }

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

export default XRMode;
