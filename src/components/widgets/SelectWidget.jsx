import React from 'react';
import PropTypes from 'prop-types';

function SelectWidget({ id, isMulti = false, name, onChange, options, value }) {
  const handleChange = (e) => {
    if (onChange) {
      if (isMulti) {
        const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
        onChange(name, selectedValues);
      } else {
        onChange(name, e.target.value);
      }
    }
  };

  return (
    <select
      id={id}
      name={name}
      className="select-widget"
      multiple={isMulti}
      value={isMulti ? undefined : value}
      onChange={handleChange}
    >
      {options.map((optionValue) => (
        <option
          key={optionValue}
          value={optionValue}
          selected={isMulti ? value.includes(optionValue) : undefined}
        >
          {optionValue}
        </option>
      ))}
    </select>
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
