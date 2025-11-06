import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';

function AddComponent({ entity }) {
  /**
   * Add blank component.
   * If component is instanced, generate an ID.
   */
  const addComponent = useCallback((e) => {
    const componentName = e.target.value;
    if (!componentName) return;

    let finalComponentName = componentName;

    if (AFRAME.components[componentName].multiple) {
      let id = prompt(
        `Provide an ID for this component (e.g., 'foo' for ${componentName}__foo).`
      );
      if (id) {
        id = id
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '');
      }
      if (id) {
        finalComponentName = `${componentName}__${id}`;
      } else {
        const numberOfComponents = Object.keys(
          entity.components
        ).filter(function (name) {
          return (
            name === componentName || name.startsWith(`${componentName}__`)
          );
        }).length;
        if (numberOfComponents > 0) {
          id = numberOfComponents + 1;
          finalComponentName = `${componentName}__${id}`;
        }
      }
    }

    entity.setAttribute(finalComponentName, '');
    Events.emit('componentadd', { entity: entity, component: finalComponentName });
    e.target.value = ''; // Reset select
  }, [entity]);

  /**
   * Component dropdown options.
   */
  const getComponentsOptions = useCallback(() => {
    const usedComponents = Object.keys(entity.components);
    return Object.keys(AFRAME.components)
      .filter((componentName) => {
        if (
          AFRAME.components[componentName].sceneOnly &&
          !entity.isScene
        ) {
          return false;
        }

        return (
          AFRAME.components[componentName].multiple ||
          usedComponents.indexOf(componentName) === -1
        );
      })
      .sort();
  }, [entity]);

  if (!entity) {
    return <div />;
  }

  const options = getComponentsOptions();

  return (
    <div id="addComponentContainer">
      <select
        id="addComponent"
        className="w-full"
        onChange={addComponent}
        style={{ flex: 1, padding: '4px', fontSize: '12px' }}>
        <option value="">Add component...</option>
        {options.map((componentName) => (
          <option key={componentName} value={componentName}>
            {componentName}
          </option>
        ))}
      </select>
    </div>
  );
}

AddComponent.propTypes = {
  entity: PropTypes.object
};

export default AddComponent;
