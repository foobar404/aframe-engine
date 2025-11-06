import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function InputWidget({ id, name, onChange, value }) {
  const [currentValue, setCurrentValue] = useState(value || '');

  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value || '');
    }
  }, [value, currentValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    if (onChange) {
      onChange(name, newValue);
    }
  };

  return (
    <input
      id={id}
      type="text"
      className="string"
      value={currentValue}
      onChange={handleChange}
    />
  );
}

InputWidget.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.any
};

export default InputWidget;
