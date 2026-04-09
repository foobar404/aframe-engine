/* eslint-disable no-prototype-builtins */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { FaUndo } from 'react-icons/fa';

import { BooleanWidget } from '../widgets/BooleanWidget';
import { ColorWidget } from '../widgets/ColorWidget';
import { InputWidget } from '../widgets/InputWidget';
import { NumberWidget } from '../widgets/NumberWidget';
import { SelectWidget } from '../widgets/SelectWidget';
import { TextureWidget } from '../widgets/TextureWidget';
import { Vec4Widget } from '../widgets/Vec4Widget';
import { Vec3Widget } from '../widgets/Vec3Widget';
import { Vec2Widget } from '../widgets/Vec2Widget';
import { updateEntity } from '../../lib/entity';
import { equal } from '../../lib/utils';
import copy from 'clipboard-copy';

export function PropertyRow({ data, entity, isSingle, name, schema }) {
  const [componentName, propertyName] = isSingle ? [name, name] : name.includes('.') ? name.split('.') : [name, name];
  const [isCopied, setIsCopied] = useState(false);
  const id = componentName + ':' + propertyName;

  const getAssetKinds = (type) => {
    const prop = propertyName.toLowerCase();
    const comp = componentName.toLowerCase();

    if (type === 'map' || prop.includes('map')) {
      return ['image', 'video'];
    }

    if (prop === 'src' || schema.type === 'selector') {
      if (comp === 'sound' || comp === 'audio' || prop.includes('audio')) {
        return ['audio'];
      }
      if (comp.includes('video')) {
        return ['video'];
      }
      if (comp === 'material') {
        return ['image', 'video'];
      }
      if (comp.includes('gltf') || comp.includes('obj-model') || comp.includes('fbx') || comp.includes('collada')) {
        return ['model'];
      }
      return ['image', 'video', 'audio', 'model', 'other'];
    }

    return [];
  };

  const getWidgetType = () => {
    let type = schema.type;

    // Special cases for type overrides
    if (componentName === 'material' && propertyName === 'envMap') type = 'map';
    if ((componentName === 'animation' || componentName.startsWith('animation__')) && propertyName === 'loop') type = 'boolean';

    return type;
  };

  const getWidgetValue = (type) => {
    const value = type === 'selector' ? entity.getDOMAttribute(componentName)?.[propertyName] : data;
    return type === 'string' && value && typeof value !== 'string' ? schema.stringify(value) : value;
  };

  const createWidgetProps = (value, type) => ({
    name: propertyName,
    onChange: (propName, value) => updateEntity(entity, componentName, !isSingle ? propName : '', value),
    value,
    id,
    assetKinds: getAssetKinds(type),
    allowAssetSelection:
      type === 'map' ||
      schema.type === 'selector' ||
      propertyName === 'src' ||
      propertyName.toLowerCase().includes('map')
  });

  const getWidget = () => {
    const type = getWidgetType();
    const value = getWidgetValue(type);
    const widgetProps = createWidgetProps(value, type);

    // Handle special cases first
    if (schema.oneOf?.length > 0) {
      return <SelectWidget {...widgetProps} options={schema.oneOf} isMulti={schema.type === 'array'} />;
    }
    if (type === 'map') return <TextureWidget {...widgetProps} />;

    // Handle number types with min/max
    const numberProps = {
      min: schema.min ?? -Infinity,
      max: schema.max ?? Infinity
    };

    switch (type) {
      case 'number': return <NumberWidget {...widgetProps} {...numberProps} />;
      case 'int': return <NumberWidget {...widgetProps} {...numberProps} precision={0} />;
      case 'vec2': return <Vec2Widget {...widgetProps} />;
      case 'vec3': return <Vec3Widget {...widgetProps} />;
      case 'vec4': return <Vec4Widget {...widgetProps} />;
      case 'color': return <ColorWidget {...widgetProps} />;
      case 'boolean': return <BooleanWidget {...widgetProps} />;
      default: return <InputWidget {...widgetProps} />;
    }
  };

  const isPropertyDefined = () => {
    const definedValue = isSingle
      ? entity.getDOMAttribute(componentName)
      : (entity.getDOMAttribute(componentName) || {})[propertyName];

    if (definedValue === null || definedValue === undefined) return false;

    const defaultValue = isSingle
      ? entity.components[componentName].schema.default
      : entity.components[componentName].schema[propertyName].default;

    return !equal(definedValue, defaultValue);
  };

  const resetToDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultValue = isSingle
      ? entity.components[componentName].schema.default
      : entity.components[componentName].schema[propertyName].default;

    updateEntity(entity, componentName, !isSingle ? propertyName : '', defaultValue);
  };

  const copyPropertyToClipboard = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const value = schema.type === 'selector' ? entity.getDOMAttribute(componentName)?.[propertyName] : data;
    const formattedValue = schema.type === 'string' && value && typeof value !== 'string' 
      ? schema.stringify(value) 
      : schema.stringify ? schema.stringify(value) : JSON.stringify(value);
    
    const clipboardText = `${propertyName}="${formattedValue}"`;
    copy(clipboardText);
    
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };

  const value = schema.type === 'selector' ? entity.getDOMAttribute(componentName)?.[propertyName] : JSON.stringify(data);
  const title = `${propertyName}\n - type: ${schema.type}\n - value: ${value}\n - Click to copy to clipboard`;

  return (
    <div className={clsx('propertyRow', { propertyRowDefined: isPropertyDefined() })}>
      <label htmlFor={id} className={clsx('text', { copied: isCopied })} title={title} onClick={copyPropertyToClipboard} style={{ cursor: 'pointer' }}>
        {propertyName}
      </label>
      <div className="widget-container">
        <button
          className="reset-btn"
          onClick={resetToDefault}
          title="Reset to default value">
          <FaUndo />
        </button>
        {getWidget()}
      </div>
    </div>
  );
}

PropertyRow.propTypes = {
  data: PropTypes.any,
  entity: PropTypes.object.isRequired,
  isSingle: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired
};

