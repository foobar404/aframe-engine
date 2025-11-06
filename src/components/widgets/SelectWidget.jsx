import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

function SelectWidget({ id, isMulti = false, name, onChange, options, value }) {
  const [currentValue, setCurrentValue] = useState(() => {
    if (isMulti) {
      return value.map((choice) => ({ value: choice, label: choice }));
    } else {
      return { value: value, label: value };
    }
  });

  useEffect(() => {
    if (value !== (isMulti ? currentValue.map(v => v.value) : currentValue.value)) {
      if (isMulti) {
        setCurrentValue(value.map((choice) => ({ value: choice, label: choice })));
      } else {
        setCurrentValue({ value: value, label: value });
      }
    }
  }, [value, isMulti, currentValue]);

  const handleChange = (newValue) => {
    setCurrentValue(newValue);
    if (onChange) {
      onChange(
        name,
        isMulti ? newValue.map((option) => option.value) : newValue.value
      );
    }
  };

  const selectOptions = options.map((optionValue) => {
    return { value: optionValue, label: optionValue };
  });

  return (
    <Select
      id={id}
      className="select-widget"
      classNamePrefix="select"
      options={selectOptions}
      isMulti={isMulti}
      isClearable={false}
      isSearchable
      placeholder=""
      value={currentValue}
      noOptionsMessage={() => 'No value found'}
      onChange={handleChange}
    />
  );
}

SelectWidget.propTypes = {
  id: PropTypes.string,
  isMulti: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  options: PropTypes.array.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.array
  ]).isRequired
};

SelectWidget.defaultProps = {
  isMulti: false
};

export default SelectWidget;
