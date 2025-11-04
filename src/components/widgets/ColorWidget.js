import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';

function ColorWidget({ id, name, onChange, value = '#ffffff' }) {
  const color = new THREE.Color();
  const [currentValue, setCurrentValue] = useState(value);
  const [pickerValue, setPickerValue] = useState(() => '#' + color.set(value).getHexString());

  const setValue = (newValue) => {
    const newPickerValue = '#' + color.set(newValue).getHexString();

    setCurrentValue(newValue);
    setPickerValue(newPickerValue);

    if (onChange) {
      onChange(name, newValue);
    }
  };

  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value);
      setPickerValue('#' + color.set(value).getHexString());
    }
  }, [value, currentValue, color]);

  const getHexString = (val) => {
    return '#' + color.set(val).getHexString();
  };

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleKeyUp = (e) => {
    e.stopPropagation();
    // if (e.keyCode === 13)
    setValue(e.target.value);
  };

  const handleChangeText = (e) => {
    setCurrentValue(e.target.value);
  };

  return (
    <span className="color-widget">
      <input
        type="color"
        className="color"
        value={pickerValue}
        title={currentValue}
        onChange={handleChange}
      />
      <input
        id={id}
        type="text"
        className="color_value"
        value={currentValue}
        onKeyUp={handleKeyUp}
        onChange={handleChangeText}
      />
    </span>
  );
}

ColorWidget.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.string
};

ColorWidget.defaultProps = {
  value: '#ffffff'
};

export default ColorWidget;
