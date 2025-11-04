import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

function NumberWidget({
  id,
  max = Infinity,
  min = -Infinity,
  name,
  onChange,
  precision = 3,
  step = 1,
  value = 0
}) {
  const [currentValue, setCurrentValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(
    typeof value === 'number' ? value.toFixed(precision) : ''
  );
  const inputRef = useRef();
  const distanceRef = useRef(0);
  const onMouseDownValueRef = useRef(0);
  const prevPointerRef = useRef([0, 0]);

  useEffect(() => {
    // This will be triggered typically when the element is changed directly with
    // element.setAttribute.

    // We use Object.is instead of === for comparison here so that comparing two NaN doesn't trigger an infinite update.
    // Object.is(NaN, NaN) is true, NaN === NaN is false
    if (!Object.is(value, currentValue)) {
      setCurrentValue(value);
      setDisplayValue(value.toFixed(precision));
    }
  }, [value, currentValue, precision]);

  const setValue = useCallback((newValue) => {
    if (newValue === currentValue) return;

    if (newValue !== undefined) {
      if (precision === 0) {
        newValue = parseInt(newValue);
      } else {
        newValue = parseFloat(newValue);
      }

      // If we inadvertently typed a character in the field, set value to the previous value from props
      if (isNaN(newValue)) {
        newValue = value;
      }

      if (newValue < min) {
        newValue = min;
      }
      if (newValue > max) {
        newValue = max;
      }

      setCurrentValue(newValue);
      setDisplayValue(newValue.toFixed(precision));

      if (onChange) {
        onChange(name, parseFloat(newValue.toFixed(5)));
      }
    }
  }, [currentValue, precision, value, min, max, onChange, name]);

  const onMouseMove = useCallback((event) => {
    const pointer = [event.clientX, event.clientY];
    const delta =
      pointer[0] - prevPointerRef.current[0] - (pointer[1] - prevPointerRef.current[1]);
    distanceRef.current += delta;

    // Add minimum tolerance to reduce unintentional drags when clicking on input.
    // if (Math.abs(delta) <= 2) { return; }

    let newValue =
      onMouseDownValueRef.current +
      ((distanceRef.current / (event.shiftKey ? 5 : 50)) * step) / 2;
    newValue = Math.min(max, Math.max(min, newValue));
    if (currentValue !== newValue) {
      setValue(newValue);
    }
    prevPointerRef.current = [event.clientX, event.clientY];
  }, [currentValue, max, min, step, setValue]);

  const onMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    if (Math.abs(distanceRef.current) < 2) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [onMouseMove]);

  const onMouseDown = useCallback((event) => {
    event.preventDefault();
    distanceRef.current = 0;
    onMouseDownValueRef.current = currentValue;
    prevPointerRef.current = [event.clientX, event.clientY];
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
  }, [currentValue, onMouseMove, onMouseUp]);

  const onBlur = useCallback(() => {
    setValue(parseFloat(inputRef.current.value));
  }, [setValue]);

  const handleChange = useCallback((e) => {
    setCurrentValue(e.target.value);
    setDisplayValue(e.target.value);
  }, []);

  const onKeyDown = useCallback((event) => {
    event.stopPropagation();

    // enter.
    if (event.keyCode === 13) {
      inputRef.current.blur();
      return;
    }

    // up.
    if (event.keyCode === 38) {
      setValue(parseFloat(currentValue) + 0.01);
      return;
    }

    // down.
    if (event.keyCode === 40) {
      setValue(parseFloat(currentValue) - 0.01);
      return;
    }
  }, [currentValue, setValue]);

  return (
    <input
      id={id}
      ref={inputRef}
      className="number"
      type="text"
      value={displayValue}
      onKeyDown={onKeyDown}
      onChange={handleChange}
      onMouseDown={onMouseDown}
      onBlur={onBlur}
    />
  );
}

NumberWidget.propTypes = {
  id: PropTypes.string,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  precision: PropTypes.number,
  step: PropTypes.number,
  value: PropTypes.number
};

NumberWidget.defaultProps = {
  min: -Infinity,
  max: Infinity,
  value: 0,
  precision: 3,
  step: 1
};

export default NumberWidget;
