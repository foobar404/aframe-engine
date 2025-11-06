import React, { useState, useEffect, useCallback } from 'react';
import { FaArrowsAlt, FaRedo, FaExpand } from 'react-icons/fa';
import { TbGizmo } from "react-icons/tb";
import Events from '../../lib/Events';

function TransformToolbar() {
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

  const onLocalChange = useCallback((e) => {
    const local = e.target.checked;
    setLocalSpace(local);
    Events.emit('transformspacechanged', local ? 'local' : 'world');
  }, []);

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
        <FaExpand />
      </a>

      <span className="local-transform">
        <input
          id="local"
          type="checkbox"
          title="Toggle between local and world space transforms"
          checked={localSpace || selectedTransform === 'scale'}
          disabled={selectedTransform === 'scale' || selectedTransform === 'all'}
          onChange={onLocalChange}
        />
        <label
          htmlFor="local"
          title="Toggle between local and world space transforms"
        >
          local
        </label>
      </span>
    </div>
  );
}

export default TransformToolbar;
