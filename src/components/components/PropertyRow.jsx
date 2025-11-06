/* eslint-disable no-prototype-builtins */
import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import BooleanWidget from '../widgets/BooleanWidget';
import ColorWidget from '../widgets/ColorWidget';
import InputWidget from '../widgets/InputWidget';
import NumberWidget from '../widgets/NumberWidget';
import SelectWidget from '../widgets/SelectWidget';
import TextureWidget from '../widgets/TextureWidget';
import Vec4Widget from '../widgets/Vec4Widget';
import Vec3Widget from '../widgets/Vec3Widget';
import Vec2Widget from '../widgets/Vec2Widget';
import { updateEntity } from '../../lib/entity';
import { equal } from '../../lib/utils';

function PropertyRow({ componentname, data, entity, isSingle, name, schema }) {
  const id = componentname + ':' + name;

  const getWidget = useCallback(() => {
    let type = schema.type;

    if (componentname === 'material' && name === 'envMap') {
      // material envMap has the wrong type string, force it to map
      type = 'map';
    }

    if (
      (componentname === 'animation' ||
        componentname.startsWith('animation__')) &&
      name === 'loop'
    ) {
      // The loop property can be a boolean for an infinite loop or a number to set the number of iterations.
      // It's auto detected as number because the default value is 0, but for most use case we want an infinite loop
      // so we're forcing the type to boolean. In the future we could create a custom widget to allow user to choose
      // between infinite loop and number of iterations.
      type = 'boolean';
    }

    let value =
      type === 'selector'
        ? entity.getDOMAttribute(componentname)?.[name]
        : data;

    if (type === 'string' && value && typeof value !== 'string') {
      // Allow editing a custom type like event-set component schema
      value = schema.stringify(value);
    }

    const widgetProps = {
      name: name,
      onChange: function (name, value) {
        updateEntity(
          entity,
          componentname,
          !isSingle ? name : '',
          value
        );
      },
      value: value,
      id: id
    };
    const numberWidgetProps = {
      min: schema.hasOwnProperty('min') ? schema.min : -Infinity,
      max: schema.hasOwnProperty('max') ? schema.max : Infinity
    };

    if (schema.oneOf && schema.oneOf.length > 0) {
      return (
        <SelectWidget
          {...widgetProps}
          options={schema.oneOf}
          isMulti={schema.type === 'array'}
        />
      );
    }
    if (type === 'map') {
      return <TextureWidget {...widgetProps} />;
    }

    switch (type) {
      case 'number': {
        return <NumberWidget {...widgetProps} {...numberWidgetProps} />;
      }
      case 'int': {
        return (
          <NumberWidget {...widgetProps} {...numberWidgetProps} precision={0} />
        );
      }
      case 'vec2': {
        return <Vec2Widget {...widgetProps} />;
      }
      case 'vec3': {
        return <Vec3Widget {...widgetProps} />;
      }
      case 'vec4': {
        return <Vec4Widget {...widgetProps} />;
      }
      case 'color': {
        return <ColorWidget {...widgetProps} />;
      }
      case 'boolean': {
        return <BooleanWidget {...widgetProps} />;
      }
      default: {
        return <InputWidget {...widgetProps} />;
      }
    }
  }, [componentname, data, entity, id, isSingle, name, schema]);

  const isPropertyDefined = useCallback(() => {
    let definedValue;
    let defaultValue;
    // getDOMAttribute returns null if the component doesn't exist, and
    // in the case of a multi-properties component it returns undefined
    // if it exists but has the default values.
    if (isSingle) {
      definedValue = entity.getDOMAttribute(componentname);
      if (definedValue === null) return false;
      defaultValue =
        entity.components[componentname].schema.default;
      return !equal(definedValue, defaultValue);
    } else {
      definedValue = (entity.getDOMAttribute(componentname) || {})[
        name
      ];
      if (definedValue === undefined) return false;
      defaultValue =
        entity.components[componentname].schema[name].default;
      return !equal(definedValue, defaultValue);
    }
  }, [componentname, entity, isSingle, name]);

  const value =
    schema.type === 'selector'
      ? entity.getDOMAttribute(componentname)?.[name]
      : JSON.stringify(data);
  const title =
    name + '\n - type: ' + schema.type + '\n - value: ' + value;

  const className = clsx({
    propertyRow: true,
    propertyRowDefined: isPropertyDefined()
  });

  return (
    <div className={className}>
      <label htmlFor={id} className="text" title={title}>
        {name}
      </label>
      {getWidget()}
    </div>
  );
}

PropertyRow.propTypes = {
  componentname: PropTypes.string.isRequired,
  data: PropTypes.oneOfType([
    PropTypes.array.isRequired,
    PropTypes.bool.isRequired,
    PropTypes.number.isRequired,
    PropTypes.object.isRequired,
    PropTypes.string.isRequired
  ]),
  entity: PropTypes.object.isRequired,
  isSingle: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired
};

export default PropertyRow;
