import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import Events from '../lib/Events';
import ComponentsSidebar from './components/Sidebar';
import ModalTextures from './modals/ModalTextures';
import ModalHelp from './modals/ModalHelp';
import SceneGraph from './scenegraph/SceneGraph';
import CameraToolbar from './viewport/CameraToolbar';
import TransformToolbar from './viewport/TransformToolbar';
import ViewportHUD from './viewport/ViewportHUD';
import ThemeSwitcher from './ThemeSwitcher';

export default function Main() {
  const [state, setState] = useState({
    entity: null,
    inspectorEnabled: true,
    isHelpOpen: false,
    isModalTexturesOpen: false,
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
    const handleOpenTexturesModal = function (selectedTexture, textureOnClose) {
      setState(prev => ({
        ...prev,
        selectedTexture: selectedTexture,
        isModalTexturesOpen: true,
        textureOnClose: textureOnClose
      }));
    };

    const handleEntitySelect = (entity) => {
      setState(prev => ({ ...prev, entity: entity }));
    };

    const handleInspectorToggle = (enabled) => {
      setState(prev => ({ ...prev, inspectorEnabled: enabled }));
    };

    const handleOpenHelpModal = () => {
      setState(prev => ({ ...prev, isHelpOpen: true }));
    };

    Events.on('opentexturesmodal', handleOpenTexturesModal);
    Events.on('entityselect', handleEntitySelect);
    Events.on('inspectortoggle', handleInspectorToggle);
    Events.on('openhelpmodal', handleOpenHelpModal);

    return () => {
      Events.off('opentexturesmodal', handleOpenTexturesModal);
      Events.off('entityselect', handleEntitySelect);
      Events.off('inspectortoggle', handleInspectorToggle);
      Events.off('openhelpmodal', handleOpenHelpModal);
    };
  }, []);

  const onCloseHelpModal = () => {
    setState(prev => ({ ...prev, isHelpOpen: false }));
  };

  const onModalTextureOnClose = (value) => {
    setState(prev => ({ ...prev, isModalTexturesOpen: false }));
    if (state.textureOnClose) {
      state.textureOnClose(value);
    }
  };

  const toggleEdit = () => {
    if (state.inspectorEnabled) {
      AFRAME.INSPECTOR.close();
    } else {
      AFRAME.INSPECTOR.open();
    }
  };

  return (
    <div className="">
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
          <a
            onClick={() => {
              Events.emit('togglesidebar', { which: 'attributes' });
            }}
            title="Show components"
          >
            <FaPlus />
          </a>
        </div>
      )}

      <div
        id="inspectorContainer"
        className={state.inspectorEnabled ? '' : 'hidden'}
      >
        <SceneGraph
          scene={state.sceneEl}
          selectedEntity={state.entity}
          visible={state.visible.scenegraph}
        />

        <div id="viewportBar">
          <ThemeSwitcher />
          <CameraToolbar />
          <ViewportHUD />
          <TransformToolbar />
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
      <ModalTextures
        isOpen={state.isModalTexturesOpen}
        selectedTexture={state.selectedTexture}
        onClose={onModalTextureOnClose}
      />
    </div>
  );
}
