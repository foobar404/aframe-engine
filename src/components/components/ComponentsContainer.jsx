import React from 'react';
import PropTypes from 'prop-types';
import AddComponent from './AddComponent';
import Component from './Component';
import CommonComponents from './CommonComponents';
import DEFAULT_COMPONENTS from './DefaultComponents';

function ComponentsContainer({ entity }) {
  return (
    <div className="components">
      <CommonComponents entity={entity} />
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

export default ComponentsContainer;
