import React from 'react';
import PropTypes from 'prop-types';

function SelectWidget({ id, isMulti = false, name, onChange, options, value }) {
  // Sort options alphabetically for better organization
  const sortedOptions = [...options].sort((a, b) => {
    // Handle different types of values
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    return aStr.localeCompare(bStr);
  });

  // Group options if there are many (more than 8) for better organization
  const shouldGroup = sortedOptions.length > 8;
  const groupedOptions = shouldGroup ? chunkArray(sortedOptions, 4) : [sortedOptions];

  const handleOptionClick = (optionValue) => {
    if (onChange) {
      if (isMulti) {
        const currentValues = Array.isArray(value) ? value : [];
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter(v => v !== optionValue)
          : [...currentValues, optionValue];
        onChange(name, newValues);
      } else {
        onChange(name, optionValue);
      }
    }
  };

  const isSelected = (optionValue) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className={`select-widget ${shouldGroup ? 'grouped' : ''}`} id={id}>
      {groupedOptions.map((group, groupIndex) => (
        <div key={groupIndex} className="select-group">
          {group.map((optionValue) => (
            <button
              key={optionValue}
              className={`select-option ${isSelected(optionValue) ? 'selected' : ''}`}
              onClick={() => handleOptionClick(optionValue)}
              type="button"
            >
              {optionValue}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// Helper function to chunk array into groups
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
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
