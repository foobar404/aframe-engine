import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

import NumberWidget from './NumberWidget';
import { areVectorsEqual } from '../../lib/utils';

function Vec4Widget({ onChange, value }) {
  const [state, setState] = useState({
    x: value.x,
    y: value.y,
    z: value.z,
    w: value.w
  });

  const handleChange = useCallback((name, val) => {
    const newValue = parseFloat(val.toFixed(5));
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
  }, [value, state]);

  return (
    <div className="vec4">
      <NumberWidget name="x" value={state.x} onChange={handleChange} />
      <NumberWidget name="y" value={state.y} onChange={handleChange} />
      <NumberWidget name="z" value={state.z} onChange={handleChange} />
      <NumberWidget name="w" value={state.w} onChange={handleChange} />
    </div>
  );
}

Vec4Widget.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object.isRequired
};

export default Vec4Widget;
