import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';
import Select from 'react-select';

function AddComponent({ entity }) {
  const [value, setValue] = useState(null);

  /**
   * Add blank component.
   * If component is instanced, generate an ID.
   */
  const addComponent = useCallback((selectedValue) => {
    setValue(null);

    let componentName = selectedValue.value;

    if (AFRAME.components[componentName].multiple) {
      let id = prompt(
        `Provide an ID for this component (e.g., 'foo' for ${componentName}__foo).`
      );
      if (id) {
        id = id
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '');
        // With the transform, id could be empty string, so we need to check again.
      }
      if (id) {
        componentName = `${componentName}__${id}`;
      } else {
        // If components already exist, be sure to suffix with an id,
        // if it's first one, use the component name without id.
        const numberOfComponents = Object.keys(
          entity.components
        ).filter(function (name) {
          return (
            name === componentName || name.startsWith(`${componentName}__`)
          );
        }).length;
        if (numberOfComponents > 0) {
          id = numberOfComponents + 1;
          componentName = `${componentName}__${id}`;
        }
      }
    }

    entity.setAttribute(componentName, '');
    Events.emit('componentadd', { entity: entity, component: componentName });
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
      .map(function (val) {
        return { value: val, label: val };
      })
      .toSorted(function (a, b) {
        return a.label === b.label ? 0 : a.label < b.label ? -1 : 1;
      });
  }, [entity]);

  if (!entity) {
    return <div />;
  }

  const options = getComponentsOptions();

  return (
    <div id="addComponentContainer">
      <p id="addComponentHeader">COMPONENTS</p>
      <Select
        id="addComponent"
        className="addComponent"
        classNamePrefix="select"
        options={options}
        isClearable={false}
        isSearchable
        placeholder="Add component..."
        noOptionsMessage={() => 'No components found'}
        onChange={addComponent}
        value={value}
      />
    </div>
  );
}

AddComponent.propTypes = {
  entity: PropTypes.object
};

export default AddComponent;
