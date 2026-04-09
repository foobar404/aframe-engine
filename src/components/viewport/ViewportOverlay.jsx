import React, { useState, useEffect, useCallback } from 'react';
import { FaCube, FaMagnet } from 'react-icons/fa';
import { Events } from '../../lib/Events';
import { EntityRepresentation } from "../scenegraph/EntityRepresentation"

export function ViewportOverlay() {
    const [hoveredEntity, setHoveredEntity] = useState(null);
    const [wireframeEnabled, setWireframeEnabled] = useState(false);
    const [snappingEnabled, setSnappingEnabled] = useState(false);
    const [translationSnap, setTranslationSnap] = useState(1);
    const [rotationSnapDeg, setRotationSnapDeg] = useState(15);
    const [scaleSnap, setScaleSnap] = useState(0.5);

    const emitSnapValues = useCallback((enabled, nextValues = {}) => {
        const translate = nextValues.translationSnap ?? translationSnap;
        const rotationDeg = nextValues.rotationSnapDeg ?? rotationSnapDeg;
        const scale = nextValues.scaleSnap ?? scaleSnap;

        if (!enabled) {
            Events.emit('translationsnapchanged', null);
            Events.emit('rotationsnapchanged', null);
            Events.emit('scalesnapchanged', null);
            return;
        }

        Events.emit('translationsnapchanged', translate);
        Events.emit('rotationsnapchanged', (rotationDeg * Math.PI) / 180);
        Events.emit('scalesnapchanged', scale);
    }, [translationSnap, rotationSnapDeg, scaleSnap]);

    const onRaycasterMouseEnter = useCallback((el) => {
        setHoveredEntity(el);
    }, []);

    const onRaycasterMouseLeave = useCallback(() => {
        setHoveredEntity(null);
    }, []);

    const toggleWireframe = useCallback(() => {
        const newWireframeState = !wireframeEnabled;
        setWireframeEnabled(newWireframeState);
        
        // Apply wireframe to all mesh materials in the scene
        const scene = AFRAME.scenes[0];
        if (scene) {
            scene.object3D.traverse((object) => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => {
                            if (mat) mat.wireframe = newWireframeState;
                        });
                    } else {
                        object.material.wireframe = newWireframeState;
                    }
                }
            });
        }
        
        Events.emit('wireframetoggle', newWireframeState);
    }, [wireframeEnabled]);

    const toggleSnapping = useCallback(() => {
        const newSnappingState = !snappingEnabled;
        setSnappingEnabled(newSnappingState);
        emitSnapValues(newSnappingState);
    }, [snappingEnabled, emitSnapValues]);

    const updateSnapAmount = useCallback((field, rawValue) => {
        const parsed = parseFloat(rawValue);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return;
        }

        if (field === 'translate') {
            setTranslationSnap(parsed);
            if (snappingEnabled) {
                emitSnapValues(true, { translationSnap: parsed });
            }
            return;
        }

        if (field === 'rotate') {
            setRotationSnapDeg(parsed);
            if (snappingEnabled) {
                emitSnapValues(true, { rotationSnapDeg: parsed });
            }
            return;
        }

        if (field === 'scale') {
            setScaleSnap(parsed);
            if (snappingEnabled) {
                emitSnapValues(true, { scaleSnap: parsed });
            }
        }
    }, [snappingEnabled, emitSnapValues]);

    useEffect(() => {
        Events.on('raycastermouseenter', onRaycasterMouseEnter);
        Events.on('raycastermouseleave', onRaycasterMouseLeave);
        return () => {
            Events.off('raycastermouseenter', onRaycasterMouseEnter);
            Events.off('raycastermouseleave', onRaycasterMouseLeave);
        };
    }, [onRaycasterMouseEnter, onRaycasterMouseLeave]);

    return (
        <div className="viewport-overlay">
            <div className="overlay-top">
                <button 
                    className={`wireframe-toggle ${wireframeEnabled ? 'active' : ''}`}
                    onClick={toggleWireframe}
                    title="Toggle Wireframe Mode"
                >
                    <FaCube />
                </button>
                <button 
                    className={`snap-toggle ${snappingEnabled ? 'active' : ''}`}
                    onClick={toggleSnapping}
                    title="Toggle Transform Snapping"
                >
                    <FaMagnet />
                </button>
                <div className="snap-controls" title="Adjust snap amount">
                    <label>
                        Move
                        <input
                            type="number"
                            min="0.001"
                            step="0.1"
                            value={translationSnap}
                            onChange={(e) => updateSnapAmount('translate', e.target.value)}
                        />
                    </label>
                    <label>
                        Rotate
                        <input
                            type="number"
                            min="0.1"
                            step="1"
                            value={rotationSnapDeg}
                            onChange={(e) => updateSnapAmount('rotate', e.target.value)}
                        />
                    </label>
                    <label>
                        Scale
                        <input
                            type="number"
                            min="0.001"
                            step="0.1"
                            value={scaleSnap}
                            onChange={(e) => updateSnapAmount('scale', e.target.value)}
                        />
                    </label>
                </div>
            </div>
            <div className="overlay-bottom" hidden={!hoveredEntity}>
                <p className="text-md font-bold">
                    <EntityRepresentation entity={hoveredEntity} />
                </p>
            </div>
        </div>
    );
}