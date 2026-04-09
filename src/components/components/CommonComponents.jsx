import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { FaClipboard } from 'react-icons/fa';
import { InputWidget } from '../widgets/InputWidget';
import { PropertyRow } from './PropertyRow';
import { Collapsible } from '../Collapsible';
import { Mixin as Mixins } from './Mixins';
import { getEntityClipboardRepresentation } from '../../lib/entity';
import { Events } from '../../lib/Events';
import copy from 'clipboard-copy';

// @todo Take this out and use updateEntity?
function changeId(componentName, value) {
  var entity = AFRAME.INSPECTOR.selectedEntity;
  if (entity.id !== value) {
    entity.id = value;
    Events.emit('entityidchange', entity);
  }
}

export function CommonComponents({ entity }) {
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    Events.on('entityupdate', () => {
      setUpdateKey(prev => prev + 1);
    });
  }, []);

  return (
    <Collapsible id="componentEntityHeader" className="commonComponents">
      <div className="collapsible-header componentHeader">
        <span className="componentTitle">{entity.id || entity.localName}</span>

        <a title="Copy entity HTML to clipboard"
          className="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            copy(getEntityClipboardRepresentation(entity));
          }}>
          <FaClipboard />
        </a>
      </div>
      <div className="collapsible-content">
        <div className="propertyRow">
          <label htmlFor="id" className="text">
            ID
          </label>
          <InputWidget
            onChange={changeId}
            entity={entity}
            name="id"
            value={entity.id}
          />
        </div>
        <div className="propertyRow">
          <label className="text">class</label>
          <span>{entity.getAttribute('class')}</span>
        </div>
        {['position', 'rotation', 'scale', 'visible'].map((name) => {
          const schema = AFRAME.components[name].schema;
          var data = entity.object3D[name];
          if (name === 'rotation') {
            data = {
              x: THREE.MathUtils.radToDeg(entity.object3D.rotation.x),
              y: THREE.MathUtils.radToDeg(entity.object3D.rotation.y),
              z: THREE.MathUtils.radToDeg(entity.object3D.rotation.z)
            };
          }
          return (
            <PropertyRow
              key={`${name}-${updateKey}`}
              name={name}
              schema={schema}
              data={data}
              isSingle={true}
              entity={entity}
            />
          );
        })}
        <Mixins entity={entity} />
      </div>
    </Collapsible>
  );
}

CommonComponents.propTypes = {
  entity: PropTypes.object
};



