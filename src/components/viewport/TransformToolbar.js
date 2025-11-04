import React, { useState, useEffect, useCallback } from 'react';
import {
  faArrowsAlt,
  faRotateRight,
  faUpRightAndDownLeftFromCenter
} from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import clsx from 'clsx';
import Events from '../../lib/Events';

var TransformButtons = [
  { value: 'translate', icon: <AwesomeIcon icon={faArrowsAlt} /> },
  { value: 'rotate', icon: <AwesomeIcon icon={faRotateRight} /> },
  {
    value: 'scale',
    icon: <AwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
  }
];

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

  const renderTransformButtons = () => {
    return TransformButtons.map((option, i) => {
      const selected = option.value === selectedTransform;
      const classes = clsx({
        button: true,
        active: selected
      });

      return (
        <a
          title={option.value}
          key={i}
          onClick={() => changeTransformMode(option.value)}
          className={classes}
        >
          {option.icon}
        </a>
      );
    });
  };

  return (
    <div id="transformToolbar" className="toolbarButtons">
      {renderTransformButtons()}
      <span className="local-transform">
        <input
          id="local"
          type="checkbox"
          title="Toggle between local and world space transforms"
          checked={localSpace || selectedTransform === 'scale'}
          disabled={selectedTransform === 'scale'}
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
