import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import NumberWidget from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

function Vec3Widget({ onChange, value }) {
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
  }, [value, currentValue]);

  const handleChange = (name, newValue) => {
    const updatedValue = { ...currentValue, [name]: parseFloat(newValue.toFixed(5)) };
    setCurrentValue(updatedValue);
    if (onChange) {
      onChange(name, updatedValue);
    }
  };

  return (
    <div className="vec3">
      <div className="vec-input-wrapper">
        <NumberWidget name="x" value={currentValue.x} onChange={handleChange} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="y" value={currentValue.y} onChange={handleChange} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="z" value={currentValue.z} onChange={handleChange} />
      </div>
    </div>
  );
}

Vec3Widget.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object.isRequired
};

export default Vec3Widget;
