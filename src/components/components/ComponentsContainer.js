import React, { useEffect, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import AddComponent from './AddComponent';
import Component from './Component';
import CommonComponents from './CommonComponents';
import DEFAULT_COMPONENTS from './DefaultComponents';
import Events from '../../lib/Events';

function ComponentsContainer({ entity }) {
  const [updateKey, setUpdateKey] = useState(0);

  const onEntityUpdate = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    if (detail.component === 'mixin') {
      setUpdateKey(prev => prev + 1);
    }
  }, [entity]);

  useEffect(() => {
    Events.on('entityupdate', onEntityUpdate);
    return () => Events.off('entityupdate', onEntityUpdate);
  }, [onEntityUpdate]);

  const renderedComponents = useMemo(() => {
    const components = entity ? entity.components : {};
    const definedComponents = Object.keys(components).filter(function (key) {
      return DEFAULT_COMPONENTS.indexOf(key) === -1;
    });

    return definedComponents.sort().map(function (key) {
      return (
        <Component
          isCollapsed={definedComponents.length > 2}
          component={components[key]}
          entity={entity}
          key={key}
          name={key}
        />
      );
    });
  }, [entity, updateKey]);

  return (
    <div className="components">
      <CommonComponents entity={entity} />
      <AddComponent entity={entity} />
      {renderedComponents}
    </div>
  );
}

ComponentsContainer.propTypes = {
  entity: PropTypes.object
};

export default ComponentsContainer;
