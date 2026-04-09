import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { NumberWidget } from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

export function Vec2Widget({ id, name, onChange, value = [0, 0], precision = 2 }) {
  const [currentValue, setCurrentValue] = useState({
    x: value.x,
    y: value.y
  });

  useEffect(() => {
    if (!areVectorsEqual(value, currentValue)) {
      setCurrentValue({
        x: value.x,
        y: value.y
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
    <div className="vec2">
      <div className="vec-input-wrapper">
        <NumberWidget name="x" value={currentValue.x} onChange={handleChange} precision={2} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="y" value={currentValue.y} onChange={handleChange} precision={2} />
      </div>
    </div>
  );
}

Vec2Widget.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object.isRequired
};

