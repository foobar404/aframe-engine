/*
  Use <AwesomeIcon icon={faEye} /> instead of <FontAwesomeIcon icon={faEye} /> from @fortawesome/react-fontawesome
  Using FontAwesomeIcon component adds 66 kB minified to the bundle.
  Our AwesomeIcon does the same but less than 2 kB minified.
  svg-inline--fa class has been added to lib.styl
*/
import React from 'react';
import PropTypes from 'prop-types';

function asIcon(icon) {
  const width = icon[0];
  const height = icon[1];
  const vectorData = icon[4];
  let element;

  if (Array.isArray(vectorData)) {
    element = (
      <g>
        {vectorData.map((pathData, index) => (
          <path key={index} fill="currentColor" d={pathData} />
        ))}
      </g>
    );
  } else {
    element = <path fill="currentColor" d={vectorData} />;
  }

  return {
    width: width,
    height: height,
    icon: element
  };
}

function AwesomeIcon({ icon }) {
  const { width, height, icon: iconElement } = asIcon(icon.icon);
  return (
    <svg
      role="img"
      className={`svg-inline--fa fa-${icon.iconName}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
    >
      {iconElement}
    </svg>
  );
}

AwesomeIcon.propTypes = {
  icon: PropTypes.object.isRequired
};

export { AwesomeIcon };
