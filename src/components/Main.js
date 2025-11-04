import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from './AwesomeIcon';
import Events from '../lib/Events';
import ComponentsSidebar from './components/Sidebar';
import ModalTextures from './modals/ModalTextures';
import ModalHelp from './modals/ModalHelp';
import SceneGraph from './scenegraph/SceneGraph';
import CameraToolbar from './viewport/CameraToolbar';
import TransformToolbar from './viewport/TransformToolbar';
import ViewportHUD from './viewport/ViewportHUD';
import ThemeSwitcher from './ThemeSwitcher';

THREE.ImageUtils.crossOrigin = '';

export default function Main() {
  const [state, setState] = useState({
    entity: null,
    inspectorEnabled: true,
    isHelpOpen: false,
    isModalSponsorOpen: false,
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

  const onCloseModalSponsor = () => {
    setState(prev => ({ ...prev, isModalSponsorOpen: false }));
  };

  const toggleEdit = () => {
    if (state.inspectorEnabled) {
      AFRAME.INSPECTOR.close();
    } else {
      AFRAME.INSPECTOR.open();
    }
  };

  const renderComponentsToggle = () => {
    if (
      !state.inspectorEnabled ||
      !state.entity ||
      state.visible.attributes
    ) {
      return null;
    }
    return (
      <div className="toggle-sidebar right">
        <a
          onClick={() => {
            Events.emit('togglesidebar', { which: 'attributes' });
          }}
          title="Show components"
        >
          <AwesomeIcon icon={faPlus} />
        </a>
      </div>
    );
  };

  const renderSceneGraphToggle = () => {
    if (!state.inspectorEnabled || state.visible.scenegraph) {
      return null;
    }
    return (
      <div className="toggle-sidebar left">
        <a
          onClick={() => {
            Events.emit('togglesidebar', { which: 'scenegraph' });
          }}
          title="Show scenegraph"
        >
          <AwesomeIcon icon={faPlus} />
        </a>
      </div>
    );
  };

  const scene = state.sceneEl;
  const toggleButtonText = state.inspectorEnabled
    ? 'Back to Scene'
    : 'Inspect Scene';

  return (
    <div>
      <a className="toggle-edit" onClick={toggleEdit}>
        {toggleButtonText}
      </a>


      {renderSceneGraphToggle()}
      {renderComponentsToggle()}

      <div
        id="inspectorContainer"
        className={state.inspectorEnabled ? '' : 'hidden'}
      >
        <SceneGraph
          scene={scene}
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
