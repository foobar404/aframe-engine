import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import NumberWidget from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

function Vec2Widget({ onChange, value }) {
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
  }, [value, currentValue]);

  const handleChange = (name, newValue) => {
    const updatedValue = { ...currentValue, [name]: parseFloat(newValue.toFixed(5)) };
    setCurrentValue(updatedValue);
    if (onChange) {
      onChange(name, updatedValue);
    }
  };

  return (
    <div className="vec2">
      <NumberWidget name="x" value={currentValue.x} onChange={handleChange} />
      <NumberWidget name="y" value={currentValue.y} onChange={handleChange} />
    </div>
  );
}

Vec2Widget.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object.isRequired
};

export default Vec2Widget;
