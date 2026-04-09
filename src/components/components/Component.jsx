import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FaClipboard, FaTrash } from 'react-icons/fa';
import { PropertyRow } from './PropertyRow';
import { Collapsible } from '../Collapsible';
import copy from 'clipboard-copy';
import { getComponentClipboardRepresentation } from '../../lib/entity';
import { shouldShowProperty } from '../../lib/utils';
import { Events } from '../../lib/Events';

const isSingleProperty = AFRAME.schema.isSingleProperty;

export function Component({ component, entity, isCollapsed, name }) {
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    Events.on('entityupdate', () => {
      setUpdateKey(prev => prev + 1);
    });
  }, []);

  // Get fresh component data to ensure updates are reflected
  const currentComponent = entity.components[name];
  const componentData = currentComponent ? currentComponent.data : component.data;

  const removeComponent = useCallback((event) => {
    var componentName = name;
    event.stopPropagation();
    if (
      confirm('Do you really want to remove component `' + componentName + '`?')
    ) {
      entity.removeAttribute(componentName);
      Events.emit('componentremove', {
        entity: entity,
        component: componentName
      });
    }
  }, [name, entity]);

  return (
    <Collapsible collapsed={isCollapsed}>
      <div className="componentHeader collapsible-header">
        <span className="componentTitle" title={name}>
          {name}
        </span>
        <div className="flex">
          <a title="Copy to clipboard"
            className="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              copy(
                getComponentClipboardRepresentation(
                  entity,
                  name.toLowerCase()
                )
              );
            }}>
            <FaClipboard />
          </a>
          <a title="Remove component"
            className="button"
            onClick={removeComponent}>
            <FaTrash />
          </a>
        </div>
      </div>
      <div className="collapsible-content">
        {isSingleProperty(currentComponent.schema) ? (
          <PropertyRow
            key={name}
            name={name}
            schema={AFRAME.components[name.split('__')[0]].schema}
            data={componentData}
            isSingle={true}
            entity={entity}
          />
        ) : (
          Object.keys(currentComponent.schema)
            .sort()
            .filter((propertyName) => shouldShowProperty(propertyName, currentComponent))
            .map((propertyName) => (
              <PropertyRow
                key={propertyName}
                name={`${name}.${propertyName}`}
                schema={currentComponent.schema[propertyName]}
                data={componentData[propertyName]}
                isSingle={false}
                entity={entity}
              />
            ))
        )}
      </div>
    </Collapsible>
  );
}

Component.propTypes = {
  component: PropTypes.any,
  entity: PropTypes.object,
  isCollapsed: PropTypes.bool,
  name: PropTypes.string
};


