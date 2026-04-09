import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Events } from '../../lib/Events';

export function InputWidget({ id, name, onChange, value, allowAssetSelection = false, assetKinds = [] }) {
  const [currentValue, setCurrentValue] = useState(value || '');
  const assetTargetId = useRef(id ? `${id}-${Math.random().toString(36).slice(2, 10)}` : null);

  const isAssetKindAllowed = (kind) => {
    if (!assetKinds || assetKinds.length === 0) {
      return true;
    }
    return assetKinds.includes(kind);
  };

  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value || '');
    }
  }, [value, currentValue]);

  useEffect(() => {
    if (!allowAssetSelection || !assetTargetId.current) {
      return;
    }

    const onAssetSelect = (detail) => {
      if (!detail || detail.targetId !== assetTargetId.current) {
        return;
      }

      const nextValue = detail.value || '';
      setCurrentValue(nextValue);
      if (onChange) {
        onChange(name, nextValue);
      }
    };

    Events.on('assetselect', onAssetSelect);
    return () => {
      Events.off('assetselect', onAssetSelect);
    };
  }, [allowAssetSelection, name, onChange]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    if (onChange) {
      onChange(name, newValue);
    }
  };

  const handleFocus = () => {
    if (!allowAssetSelection || !assetTargetId.current) {
      return;
    }
    Events.emit('assettarget', {
      targetId: assetTargetId.current,
      assetKinds
    });
  };

  const handleDragOver = (e) => {
    if (!allowAssetSelection) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    if (!allowAssetSelection) {
      return;
    }

    e.preventDefault();
    try {
      const assetData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (assetData?.type !== 'asset') {
        return;
      }
      if (!isAssetKindAllowed(assetData.assetType)) {
        return;
      }

      const nextValue = assetData.value || '';
      setCurrentValue(nextValue);
      if (onChange) {
        onChange(name, nextValue);
      }
    } catch (error) {
      // Ignore non-asset drops.
    }
  };

  return (
    <input
      id={id}
      type="text"
      className="string"
      value={currentValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}

InputWidget.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.any,
  allowAssetSelection: PropTypes.bool,
  assetKinds: PropTypes.arrayOf(PropTypes.string)
};

