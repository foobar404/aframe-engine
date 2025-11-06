import React, { useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ComponentsContainer from './ComponentsContainer';
import Events from '../../lib/Events';

function Sidebar({ entity, visible }) {
  const [updateKey, setUpdateKey] = useState(0);

  const onComponentRemove = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    setUpdateKey(prev => prev + 1);
  }, [entity]);

  const onComponentAdd = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    setUpdateKey(prev => prev + 1);
  }, [entity]);

  useEffect(() => {
    Events.on('componentremove', onComponentRemove);
    Events.on('componentadd', onComponentAdd);
    return () => {
      Events.off('componentremove', onComponentRemove);
      Events.off('componentadd', onComponentAdd);
    };
  }, [onComponentRemove, onComponentAdd]);

  if (entity && visible) {
    return (
      <div id="sidebar">
        <ComponentsContainer entity={entity} />
      </div>
    );
  } else {
    return <div />;
  }
}

Sidebar.propTypes = {
  entity: PropTypes.object,
  visible: PropTypes.bool
};

export default Sidebar;
