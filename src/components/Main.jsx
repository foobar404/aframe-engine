import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { Events } from '../lib/Events';
import { Sidebar as ComponentsSidebar } from './components/Sidebar';
import { ModalHelp } from './modals/ModalHelp';
import { SceneGraph } from './scenegraph/SceneGraph';
import { TransformToolbar } from './viewport/TransformToolbar';
import { XRMode } from './viewport/XRMode';
import { ViewportOverlay } from './viewport/ViewportOverlay';
import { insertNewAsset } from '../lib/assetsUtils';

function isInspectorOpen() {
  if (typeof document !== 'undefined' && document.body.classList.contains('aframe-inspector-opened')) {
    return true;
  }

  return Boolean(window.AFRAME?.INSPECTOR?.opened);
}

export function Main() {
  const hoveredEntityRef = useRef(null);
  const [state, setState] = useState({
    entity: null,
    inspectorEnabled: isInspectorOpen(),
    isHelpOpen: false,
    sceneEl: AFRAME.scenes[0],
    visible: {
      scenegraph: true,
      attributes: true
    }
  });

  useEffect(() => {
    const handleToggleSidebar = (event) => {
      if (event.which === 'all') {
        if (state.visible.scenegraph || state.visible.attributes) {
          setState(prev => ({
            ...prev,
            visible: {
              scenegraph: false,
              attributes: false
            }
          }));
        } else {
          setState(prev => ({
            ...prev,
            visible: {
              scenegraph: true,
              attributes: true
            }
          }));
        }
      } else if (event.which === 'attributes') {
        setState(prev => ({
          ...prev,
          visible: {
            ...prev.visible,
            attributes: !prev.visible.attributes
          }
        }));
      } else if (event.which === 'scenegraph') {
        setState(prev => ({
          ...prev,
          visible: {
            ...prev.visible,
            scenegraph: !prev.visible.scenegraph
          }
        }));
      }
    };

    Events.on('togglesidebar', handleToggleSidebar);

    return () => {
      Events.off('togglesidebar', handleToggleSidebar);
    };
  }, [state.visible.scenegraph, state.visible.attributes]);

  useEffect(() => {
    // Sync once on mount in case inspectortoggle event fired before listener registration.
    setState(prev => ({ ...prev, inspectorEnabled: isInspectorOpen() }));

    const handleEntitySelect = (entity) => {
      setState(prev => ({ ...prev, entity: entity }));
    };

    const handleInspectorToggle = (enabled) => {
      setState(prev => ({ ...prev, inspectorEnabled: enabled }));
    };

    const handleOpenHelpModal = () => {
      setState(prev => ({ ...prev, isHelpOpen: true }));
    };

    const handleRaycasterMouseEnter = (entity) => {
      hoveredEntityRef.current = entity || null;
    };

    const handleRaycasterMouseLeave = () => {
      hoveredEntityRef.current = null;
    };

    Events.on('entityselect', handleEntitySelect);
    Events.on('inspectortoggle', handleInspectorToggle);
    Events.on('openhelpmodal', handleOpenHelpModal);
    Events.on('raycastermouseenter', handleRaycasterMouseEnter);
    Events.on('raycastermouseleave', handleRaycasterMouseLeave);

    return () => {
      Events.off('entityselect', handleEntitySelect);
      Events.off('inspectortoggle', handleInspectorToggle);
      Events.off('openhelpmodal', handleOpenHelpModal);
      Events.off('raycastermouseenter', handleRaycasterMouseEnter);
      Events.off('raycastermouseleave', handleRaycasterMouseLeave);
    };
  }, []);

  const onCloseHelpModal = () => {
    setState(prev => ({ ...prev, isHelpOpen: false }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    document.body.classList.add('dragging-asset');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only remove the class if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      document.body.classList.remove('dragging-asset');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    document.body.classList.remove('dragging-asset');

    try {
      const assetData = JSON.parse(e.dataTransfer.getData('application/json'));

      if (assetData.type === 'asset') {
        // Handle Sketchfab models
        if (assetData.assetType === 'sketchfab') {
          // Create a new entity with gltf-model component
          const sceneEl = AFRAME.scenes[0];
          const newEntity = document.createElement('a-gltf-model');
          
          // Generate unique name
          let counter = 1;
          let entityName = assetData.name?.replace(/[^a-zA-Z0-9-_]/g, '') || 'sketchfab-model';
          let finalName = entityName;
          while (document.getElementById(finalName)) {
            finalName = `${entityName}-${counter}`;
            counter++;
          }
          
          newEntity.setAttribute('id', finalName);
          newEntity.setAttribute('position', '0 1.6 -2');
          newEntity.setAttribute('rotation', '0 0 0');
          newEntity.setAttribute('scale', '1 1 1');
          
          // Use the GLB URL if available, otherwise show instructions
          if (assetData.glbUrl) {
            newEntity.setAttribute('src', assetData.glbUrl);
            sceneEl.appendChild(newEntity);
            
            // Select the newly created entity
            Events.emit('entityselect', newEntity);
          } else {
            // Show instructions for downloading from Sketchfab
            const useModel = confirm(
              `This Sketchfab model requires manual download.\n\n` +
              `Click OK to create the entity, then:\n` +
              `1. Visit: ${assetData.value}\n` +
              `2. Download the model (GLB format)\n` +
              `3. Host it on your server\n` +
              `4. Update the 'src' property with your URL\n\n` +
              `Click Cancel to skip.`
            );
            
            if (useModel) {
              newEntity.setAttribute('src', '');
              sceneEl.appendChild(newEntity);
              Events.emit('entityselect', newEntity);
            }
          }
          
          return;
        }

        // Handle material presets
        if (assetData.assetType === 'material') {
          const dropTarget = hoveredEntityRef.current?.isEntity ? hoveredEntityRef.current : state.entity;
          if (!dropTarget) {
            return;
          }

          const legacyMaterialProps = {
            color: assetData.color,
            metalness: assetData.metalness,
            roughness: assetData.roughness,
            ...(assetData.opacity !== undefined ? { opacity: assetData.opacity } : {}),
            ...(assetData.transparent !== undefined ? { transparent: assetData.transparent } : {})
          };

          const materialProps =
            assetData.materialProps && typeof assetData.materialProps === 'object'
              ? assetData.materialProps
              : Object.fromEntries(
                  Object.entries(legacyMaterialProps).filter(([, value]) => value !== undefined && value !== null)
                );

          if (!Object.keys(materialProps).length) {
            return;
          }
          
          // Apply to material component
          dropTarget.setAttribute('material', materialProps);
          
          // Emit event to update history/UI state
          Events.emit('entityupdate', {
            entity: dropTarget,
            component: 'material',
            property: '',
            value: materialProps
          });
          
          return;
        }

        if (state.entity) {
          let valueToSet = assetData.value;

          // If it's a registry asset with a URL, create an asset and reference it
          if (assetData.assetType === 'registry' && assetData.value.startsWith('url(')) {
          // Extract URL from url(...)
          const urlMatch = assetData.value.match(/url\((.+)\)/);
          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1];

            // Generate a unique asset ID (check if assetData.id is valid)
            let assetId = assetData.id;

            // Check if the ID is valid and doesn't already exist
            if (!assetId || assetId.includes('/') || assetId.includes('.') || document.getElementById(assetId)) {
              // Generate a new ID from the filename or a generic name
              const urlParts = url.split('/');
              const filename = urlParts[urlParts.length - 1].split('.')[0];
              assetId = filename.replace(/[^a-zA-Z0-9-_]/g, '') || 'asset';

              // Make sure the ID is unique
              let counter = 1;
              let finalId = assetId;
              while (document.getElementById(finalId)) {
                finalId = `${assetId}-${counter}`;
                counter++;
              }
              assetId = finalId;
            }

            // Insert the new asset into the scene
            insertNewAsset('img', assetId, url, false, () => {
              Events.emit('assetadd', { id: assetId, src: url, tagName: 'img' });
            });

            // Use the asset reference instead of the URL
            valueToSet = '#' + assetId;
          }
        }

        // Apply the asset to the selected entity's material component
        if (state.entity.hasAttribute('material')) {
          state.entity.setAttribute('material', 'src', valueToSet);
        } else {
          state.entity.setAttribute('material', { src: valueToSet });
        }

        // Emit event to update history/UI state
        Events.emit('entityupdate', {
          entity: state.entity,
          component: 'material',
          property: 'src',
          value: valueToSet
        });
        }
      }
    } catch (error) {
      console.warn('Failed to parse dropped asset data:', error);
    }
  };

  function toggleEdit() {
    AFRAME.INSPECTOR.toggle();
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {!state.inspectorEnabled && (
        <a className="toggle-edit rounded-md bg-white text-black/50 p-1 border-3 border-black/50 font-bold" onClick={toggleEdit}>
          Show Editor
        </a>
      )}

      {!state.inspectorEnabled || state.visible.scenegraph ? null : (
        <div className="toggle-sidebar left">
          <a
            onClick={() => {
              Events.emit('togglesidebar', { which: 'scenegraph' });
            }}
            title="Show scenegraph"
          >
            <FaPlus />
          </a>
        </div>
      )}

      {state.inspectorEnabled &&
        state.entity &&
        !state.visible.attributes && (
          <div className="toggle-sidebar right">
            <a onClick={() => {
              Events.emit('togglesidebar', { which: 'attributes' });
            }}
              title="Show components" >
              <FaPlus />
            </a>
          </div>
        )}

      <div id="inspectorContainer"
        className={state.inspectorEnabled ? '' : 'hidden'}>

        <SceneGraph
          scene={state.sceneEl}
          selectedEntity={state.entity}
          visible={state.visible.scenegraph} />

        <div style={{ position: 'relative', flex: "1" }}>
          <div id="viewportBar">
            <XRMode />
            <TransformToolbar />
          </div>
          <ViewportOverlay />
        </div>

        <div id="rightPanel">
          <ComponentsSidebar
            entity={state.entity}
            visible={state.visible.attributes}
          />
        </div>
      </div>

      <ModalHelp
        isOpen={state.isHelpOpen}
        onClose={onCloseHelpModal}
      />
    </div>
  );
}
