import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function BooleanWidget({ id, name, onChange, value = false }) {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value);
    }
  }, [value, currentValue]);

  const handleChange = (e) => {
    const newValue = e.target.checked;
    setCurrentValue(newValue);
    if (onChange) {
      onChange(name, newValue);
    }
  };

  return (
    <div className="boolean-widget">
      <input
        id={id}
        type="checkbox"
        checked={currentValue}
        value={currentValue}
        onChange={handleChange}
      />
      <label htmlFor={id}>
        <span className="boolean-text">{currentValue ? 'ON' : 'OFF'}</span>
      </label>
    </div>
  );
}

BooleanWidget.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.bool
};

BooleanWidget.defaultProps = {
  value: false
};

export default BooleanWidget;
