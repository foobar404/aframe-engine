import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { faClipboard, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import PropertyRow from './PropertyRow';
import Collapsible from '../Collapsible';
import copy from 'clipboard-copy';
import { getComponentClipboardRepresentation } from '../../lib/entity';
import { shouldShowProperty } from '../../lib/utils';
import Events from '../../lib/Events';

const isSingleProperty = AFRAME.schema.isSingleProperty;

/**
 * Single component.
 */
function Component({ component, entity, isCollapsed, name }) {
  const [currentEntity, setCurrentEntity] = useState(entity);
  const [currentName, setCurrentName] = useState(name);
  const [updateKey, setUpdateKey] = useState(0);

  const onEntityUpdate = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    if (detail.component === name) {
      setUpdateKey(prev => prev + 1);
    }
  }, [entity, name]);

  useEffect(() => {
    Events.on('entityupdate', onEntityUpdate);
    return () => Events.off('entityupdate', onEntityUpdate);
  }, [onEntityUpdate]);

  useEffect(() => {
    setCurrentEntity(entity);
  }, [entity]);

  useEffect(() => {
    setCurrentName(name);
  }, [name]);

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

  /**
   * Render propert(ies) of the component.
   */
  const renderPropertyRows = useCallback(() => {
    const componentData = component;

    if (isSingleProperty(componentData.schema)) {
      const componentName = name;
      const schema = AFRAME.components[componentName.split('__')[0]].schema;
      return (
        <PropertyRow
          key={componentName}
          name={componentName}
          schema={schema}
          data={componentData.data}
          componentname={componentName}
          isSingle={true}
          entity={entity}
        />
      );
    }

    return Object.keys(componentData.schema)
      .sort()
      .filter((propertyName) => shouldShowProperty(propertyName, componentData))
      .map((propertyName) => (
        <PropertyRow
          key={propertyName}
          name={propertyName}
          schema={componentData.schema[propertyName]}
          data={componentData.data[propertyName]}
          componentname={name}
          isSingle={false}
          entity={entity}
        />
      ));
  }, [component, name, entity]);

  return (
    <Collapsible collapsed={isCollapsed} key={updateKey}>
      <div className="componentHeader collapsible-header">
        <span className="componentTitle" title={name}>
          <span>{name}</span>
        </span>
        <div className="componentHeaderActions">
          <a
            title="Copy to clipboard"
            className="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              copy(
                getComponentClipboardRepresentation(
                  currentEntity,
                  name.toLowerCase()
                )
              );
            }}
          >
            <AwesomeIcon icon={faClipboard} />
          </a>
          <a
            title="Remove component"
            className="button"
            onClick={removeComponent}
          >
            <AwesomeIcon icon={faTrashAlt} />
          </a>
        </div>
      </div>
      <div className="collapsible-content">{renderPropertyRows()}</div>
    </Collapsible>
  );
}

Component.propTypes = {
  component: PropTypes.any,
  entity: PropTypes.object,
  isCollapsed: PropTypes.bool,
  name: PropTypes.string
};

export default Component;
