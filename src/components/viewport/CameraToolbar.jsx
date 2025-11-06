import React, { useState, useEffect, useCallback, useRef } from 'react';
import Select from 'react-select';
import Events from '../../lib/Events';

const options = [
  {
    value: 'perspective',
    event: 'cameraperspectivetoggle',
    payload: null,
    label: 'Perspective'
  },
  {
    value: 'ortholeft',
    event: 'cameraorthographictoggle',
    payload: 'left',
    label: 'Left View'
  },
  {
    value: 'orthoright',
    event: 'cameraorthographictoggle',
    payload: 'right',
    label: 'Right View'
  },
  {
    value: 'orthotop',
    event: 'cameraorthographictoggle',
    payload: 'top',
    label: 'Top View'
  },
  {
    value: 'orthobottom',
    event: 'cameraorthographictoggle',
    payload: 'bottom',
    label: 'Bottom View'
  },
  {
    value: 'orthoback',
    event: 'cameraorthographictoggle',
    payload: 'back',
    label: 'Back View'
  },
  {
    value: 'orthofront',
    event: 'cameraorthographictoggle',
    payload: 'front',
    label: 'Front View'
  }
];

function getOption(value) {
  return options.filter((opt) => opt.value === value)[0];
}

function CameraToolbar() {
  const [selectedCamera, setSelectedCamera] = useState('perspective');
  const justChangedCamera = useRef(false);

  const onCameraToggle = useCallback((data) => {
    if (justChangedCamera.current) {
      justChangedCamera.current = false;
      return;
    }
    setSelectedCamera(data.value);
  }, []);

  const onChange = useCallback((option) => {
    justChangedCamera.current = true;
    setSelectedCamera(option.value);
    Events.emit(option.event, option.payload);
  }, []);

  useEffect(() => {
    Events.on('cameratoggle', onCameraToggle);
    return () => Events.off('cameratoggle', onCameraToggle);
  }, [onCameraToggle]);

  return (
    <div id="cameraToolbar">
      <Select
        id="cameraSelect"
        classNamePrefix="select"
        options={options}
        isClearable={false}
        isSearchable={false}
        value={getOption(selectedCamera)}
        onChange={onChange}
      />
    </div>
  );
}

export default CameraToolbar;
