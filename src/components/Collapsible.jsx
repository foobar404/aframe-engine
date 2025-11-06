import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

function Collapsible({ className, collapsed = false, children, id }) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const toggleVisibility = (event) => {
    // Don't collapse if we click on actions like clipboard
    if (event.target.nodeName === 'A') return;
    setIsCollapsed(!isCollapsed);
  };

  const rootClassNames = {
    collapsible: true,
    component: true,
    collapsed: isCollapsed
  };
  if (className) {
    rootClassNames[className] = true;
  }
  const rootClasses = clsx(rootClassNames);

  const contentClasses = clsx({
    content: true,
    hide: isCollapsed
  });

  return (
    <div id={id} className={rootClasses}>
      <div className="static" onClick={toggleVisibility}>
        <div className="collapse-button" />
        {children[0]}
      </div>
      <div className={contentClasses}>{children[1]}</div>
    </div>
  );
}

Collapsible.propTypes = {
  className: PropTypes.string,
  collapsed: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element])
    .isRequired,
  id: PropTypes.string
};

Collapsible.defaultProps = {
  collapsed: false
};

export default Collapsible;
