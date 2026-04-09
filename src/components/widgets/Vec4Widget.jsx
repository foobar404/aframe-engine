import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

import { NumberWidget } from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

export function Vec4Widget({ id, name, onChange, value = [0, 0, 0, 0], precision = 2 }) {
  const [state, setState] = useState({
    x: value.x,
    y: value.y,
    z: value.z,
    w: value.w
  });

  const handleChange = useCallback((name, val) => {
    const newValue = parseFloat(val.toFixed(2));
    setState(prevState => {
      const newState = { ...prevState, [name]: newValue };
      if (onChange) {
        onChange(name, newState);
      }
      return newState;
    });
  }, [onChange]);

  useEffect(() => {
    if (!areVectorsEqual(value, state)) {
      setState({
        x: value.x,
        y: value.y,
        z: value.z,
        w: value.w
      });
    }
  }, [value]);

  return (
    <div className="vec4">
      <div className="vec-input-wrapper">
        <NumberWidget name="x" value={state.x} onChange={handleChange} precision={2} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="y" value={state.y} onChange={handleChange} precision={2} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="z" value={state.z} onChange={handleChange} precision={2} />
      </div>
      <div className="vec-input-wrapper">
        <NumberWidget name="w" value={state.w} onChange={handleChange} precision={2} />
      </div>
    </div>
  );
}

Vec4Widget.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object.isRequired
};

