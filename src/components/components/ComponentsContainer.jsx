import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AddComponent } from './AddComponent';
import { Component } from './Component';
import { CommonComponents } from './CommonComponents';
import { PrimitiveComponents } from './PrimitiveComponents';
import { Events } from '../../lib/Events';

const DEFAULT_COMPONENTS = ['visible', 'position', 'scale', 'rotation'];

export function ComponentsContainer({ entity }) {
  const [updateKey, setUpdateKey] = useState(0);

  const onEntityUpdate = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    setUpdateKey(prev => prev + 1);
  }, [entity]);

  const onComponentChange = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    setUpdateKey(prev => prev + 1);
  }, [entity]);

  useEffect(() => {
    Events.on('entityupdate', onEntityUpdate);
    Events.on('componentadd', onComponentChange);
    Events.on('componentremove', onComponentChange);
    return () => {
      Events.off('entityupdate', onEntityUpdate);
      Events.off('componentadd', onComponentChange);
      Events.off('componentremove', onComponentChange);
    };
  }, [onEntityUpdate, onComponentChange]);

  return (
    <div className="components">
      <CommonComponents entity={entity} />
      <PrimitiveComponents entity={entity} />
      <AddComponent entity={entity} />
      {entity &&
        Object.keys(entity.components)
          .filter(function (key) {
            return DEFAULT_COMPONENTS.indexOf(key) === -1;
          })
          .reverse()
          .map(function (key) {
            return (
              <Component
                isCollapsed={Object.keys(entity.components).filter(function (k) {
                  return DEFAULT_COMPONENTS.indexOf(k) === -1;
                }).length > 2}
                component={entity.components[key]}
                entity={entity}
                key={key}
                name={key}
              />
            );
          })}
    </div>
  );
}

ComponentsContainer.propTypes = {
  entity: PropTypes.object
};

