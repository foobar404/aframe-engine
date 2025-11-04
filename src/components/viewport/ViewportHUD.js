import React, { useState, useEffect, useCallback } from 'react';
import EntityRepresentation from '../EntityRepresentation';
import Events from '../../lib/Events';

function ViewportHUD() {
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
    <div id="viewportHud">
      <p>
        <EntityRepresentation entity={hoveredEntity} />
      </p>
    </div>
  );
}

export default ViewportHUD;
