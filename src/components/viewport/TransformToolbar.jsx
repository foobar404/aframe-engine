import React, { useState, useEffect, useCallback } from 'react';
import { FaArrowsAlt, FaRedo, FaExpandArrowsAlt, FaGlobe } from 'react-icons/fa';
import { TbGizmo } from "react-icons/tb";
import { MdMyLocation } from "react-icons/md";
import { Events } from '../../lib/Events';

export function TransformToolbar() {
  const [selectedTransform, setSelectedTransform] = useState('translate');
  const [localSpace, setLocalSpace] = useState(false);

  const onTransformModeChange = useCallback((mode) => {
    setSelectedTransform(mode);
  }, []);

  const onTransformSpaceChange = useCallback(() => {
    const newLocal = !localSpace;
    setLocalSpace(newLocal);
    Events.emit('transformspacechanged', newLocal ? 'local' : 'world');
  }, [localSpace]);

  const changeTransformMode = useCallback((mode) => {
    setSelectedTransform(mode);
    Events.emit('transformmodechange', mode);
  }, []);

  const onLocalChange = useCallback(() => {
    const newLocal = !localSpace;
    setLocalSpace(newLocal);
    Events.emit('transformspacechanged', newLocal ? 'local' : 'world');
  }, [localSpace]);

  useEffect(() => {
    Events.on('transformmodechange', onTransformModeChange);
    Events.on('transformspacechange', onTransformSpaceChange);
    return () => {
      Events.off('transformmodechange', onTransformModeChange);
      Events.off('transformspacechange', onTransformSpaceChange);
    };
  }, [onTransformModeChange, onTransformSpaceChange]);

  return (
    <div id="transformToolbar" className="toolbarButtons">
      <a onClick={() => changeTransformMode("all")}
        className={`button ${selectedTransform === 'all' ? 'active' : ''}`}>
        <TbGizmo />
      </a>
      <a onClick={() => changeTransformMode("translate")}
        className={`button ${selectedTransform === 'translate' ? 'active' : ''}`}>
        <FaArrowsAlt />
      </a>
      <a onClick={() => changeTransformMode("rotate")}
        className={`button ${selectedTransform === 'rotate' ? 'active' : ''}`}>
        <FaRedo />
      </a>
      <a onClick={() => changeTransformMode("scale")}
        className={`button ${selectedTransform === 'scale' ? 'active' : ''}`}>
        <FaExpandArrowsAlt />
      </a>

      <a 
        onClick={onLocalChange}
        className={`button ${localSpace ? 'active' : ''}`}
        title={localSpace ? "Local Space" : "World Space"}
        style={{ 
          opacity: selectedTransform === 'scale' || selectedTransform === 'all' ? 0.3 : 1,
          pointerEvents: selectedTransform === 'scale' || selectedTransform === 'all' ? 'none' : 'auto'
        }}
      >
        {localSpace ? <MdMyLocation /> : <FaGlobe />}
      </a>
    </div>
  );
}

