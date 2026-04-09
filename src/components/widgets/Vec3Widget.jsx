import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { NumberWidget } from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

export function Vec3Widget({ id, name, onChange, value = [0, 0, 0], precision = 2 }) {
  const [currentValue, setCurrentValue] = useState({
    x: value.x,
    y: value.y,
    z: value.z
  });

  useEffect(() => {
    if (!areVectorsEqual(value, currentValue)) {
      setCurrentValue({
        x: value.x,
        y: value.y,
        z: value.z
      });
    }
  }, [value]);

  const handleChange = (axisName, newValue) => {
    const updatedValue = { ...currentValue, [axisName]: parseFloat(newValue.toFixed(2)) };
    setCurrentValue(updatedValue);
    if (onChange) {
      onChange(name, updatedValue);
    }
  };

  return (
    <div className="vec3">
      <div className="vec-input-wrapper">
        <NumberWidget name="x" value={currentValue.x} onChange={handleChange} precision={2} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="y" value={currentValue.y} onChange={handleChange} precision={2} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="z" value={currentValue.z} onChange={handleChange} precision={2} />
      </div>
    </div>
  );
}

Vec3Widget.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object.isRequired
};

