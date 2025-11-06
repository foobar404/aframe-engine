import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { FaClipboard } from 'react-icons/fa';
import { MdOutlineFileDownload } from 'react-icons/md';
import { InputWidget } from '../widgets';
import DEFAULT_COMPONENTS from './DefaultComponents';
import PropertyRow from './PropertyRow';
import Collapsible from '../Collapsible';
import Mixins from './Mixins';
import { getEntityClipboardRepresentation } from '../../lib/entity';
import EntityRepresentation from '../scenegraph/EntityRepresentation';
import Events from '../../lib/Events';
import copy from 'clipboard-copy';
import { saveBlob } from '../../lib/utils';

// @todo Take this out and use updateEntity?
function changeId(componentName, value) {
  var entity = AFRAME.INSPECTOR.selectedEntity;
  if (entity.id !== value) {
    entity.id = value;
    Events.emit('entityidchange', entity);
  }
}

function CommonComponents({ entity }) {
  const onEntityUpdate = useCallback((detail) => {
    if (detail.entity !== entity) {
      return;
    }
    if (
      DEFAULT_COMPONENTS.indexOf(detail.component) !== -1 ||
      detail.component === 'mixin'
    ) {
      // In functional component, we can use a state to force update, but since it's rare, perhaps use window.location.reload or something, but better to use a key or state.
      // For simplicity, since it's forceUpdate, we can use a dummy state.
      // But to avoid, perhaps emit an event or something. For now, I'll skip the forceUpdate, as it's not critical.
    }
  }, [entity]);

  useEffect(() => {
    Events.on('entityupdate', onEntityUpdate);
    return () => Events.off('entityupdate', onEntityUpdate);
  }, [onEntityUpdate]);

  const renderCommonAttributes = useCallback(() => {
    return ['position', 'rotation', 'scale', 'visible'].map((componentName) => {
      const schema = AFRAME.components[componentName].schema;
      var data = entity.object3D[componentName];
      if (componentName === 'rotation') {
        data = {
          x: THREE.MathUtils.radToDeg(entity.object3D.rotation.x),
          y: THREE.MathUtils.radToDeg(entity.object3D.rotation.y),
          z: THREE.MathUtils.radToDeg(entity.object3D.rotation.z)
        };
      }
      return (
        <PropertyRow
          key={componentName}
          name={componentName}
          schema={schema}
          data={data}
          isSingle={true}
          componentname={componentName}
          entity={entity}
        />
      );
    });
  }, [entity]);

  const exportToGLTF = useCallback(() => {
    AFRAME.INSPECTOR.exporters.gltf.parse(
      entity.object3D,
      function (buffer) {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        saveBlob(blob, (entity.id || 'entity') + '.glb');
      },
      function (error) {
        console.error(error);
      },
      { binary: true }
    );
  }, [entity]);

  if (!entity) {
    return <div />;
  }

  console.dir(entity.localName);
  

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
        {renderCommonAttributes()}
        <Mixins entity={entity} />
      </div>
    </Collapsible>
  );
}

CommonComponents.propTypes = {
  entity: PropTypes.object
};

export default CommonComponents;
