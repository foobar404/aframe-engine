import React, { useState, useEffect, useCallback } from 'react';
import Events from '../../lib/Events';
import EntityRepresentation from "../scenegraph/EntityRepresentation"

export function ViewportOverlay() {
    const [hoveredEntity, setHoveredEntity] = useState(null);

    const onRaycasterMouseEnter = useCallback((el) => {
        setHoveredEntity(el);
    }, []);

    const onRaycasterMouseLeave = useCallback(() => {
        setHoveredEntity(null);
    }, []);

    useEffect(() => {
        Events.on('raycastermouseenter', onRaycasterMouseEnter);
        Events.on('raycastermouseleave', onRaycasterMouseLeave);
        return () => {
            Events.off('raycastermouseenter', onRaycasterMouseEnter);
            Events.off('raycastermouseleave', onRaycasterMouseLeave);
        };
    }, [onRaycasterMouseEnter, onRaycasterMouseLeave]);

    return (
        <div id="viewportOverlay" className="viewport-overlay">
            <div className="overlay-bottom" hidden={!hoveredEntity}>
                <p className="text-md font-bold">
                    <EntityRepresentation entity={hoveredEntity} />
                </p>
            </div>
        </div>
    );
}