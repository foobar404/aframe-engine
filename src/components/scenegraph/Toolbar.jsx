import React, { useState } from 'react';
import {
  FaPlus,
  FaPause,
  FaPlay,
  FaSave,
  FaQuestion,
  FaDownload,
  FaClock
} from 'react-icons/fa';
import Events from '../../lib/Events';
import { saveBlob } from '../../lib/utils';

function filterHelpers(scene, visible) {
  scene.traverse((o) => {
    if (o.userData.source === 'INSPECTOR') {
      o.visible = visible;
    }
  });
}

function getSceneName(scene) {
  return scene.id || slugify(window.location.host + window.location.pathname);
}

/**
 * Slugify the string removing non-word chars and spaces
 * @param  {string} text String to slugify
 * @return {string}      Slugified string
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '-') // Replace all non-word chars with -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Tools and actions.
 */
export default function Toolbar({ selectedEntity }) {
  const {
    isPlaying,
    primitivesList,
    isDropdownOpen,
    autosaveEnabled,
    addEntityWithPrimitive,
    toggleDropdown,
    exportSceneToGLTF,
    writeChanges,
    toggleScenePlaying,
    openHelpModal,
    toggleAutosave
  } = useToolbar(selectedEntity);

  return (
    <div id="toolbar">
      <div className="toolbar-container">
        <div className="relative">
          <button
            title="Add a new primitive"
            className="add-button"
            onClick={toggleDropdown}>
            <FaPlus />
          </button>
          {isDropdownOpen && (
            <div className="dropdown">
              <button
                onClick={() => addEntityWithPrimitive('a-entity')}>
                a-entity
              </button>
              {primitivesList.map((prim) => (
                <button
                  key={prim}
                  onClick={() => addEntityWithPrimitive(`${prim}`)}>
                  {prim}
                </button>
              ))}
            </div>
          )}
        </div>
        <a title={isPlaying ? 'Pause scene' : 'Resume scene'}
          className="toolbar-button"
          onClick={toggleScenePlaying}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </a>
        <a title="Export to GLTF"
          className="toolbar-button"
          onClick={exportSceneToGLTF}>
          <FaDownload />
        </a>
        <a title="Write changes with aframe-watcher."
          className="toolbar-button"
          onClick={writeChanges}>
          <FaSave />
        </a>
        <a title={autosaveEnabled ? 'Disable autosave' : 'Enable autosave (saves every 10s)'}
          className={`toolbar-button ${autosaveEnabled ? 'active' : ''}`}
          onClick={toggleAutosave}>
          <FaClock className={autosaveEnabled ? "text-[var(--primary)]" : ""} />
        </a>
        <a title="Help"
          className="toolbar-button"
          onClick={openHelpModal}>
          <FaQuestion />
        </a>
      </div>
    </div>
  );
}

function useToolbar(selectedEntity) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [primitivesList, setPrimitivesList] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const autosaveIntervalRef = React.useRef(null);

  React.useEffect(() => {
    if (window.AFRAME && AFRAME.primitives) {
      setPrimitivesList(Object.keys(AFRAME.primitives.primitives));
    }
  }, []);

  // Autosave effect
  React.useEffect(() => {
    if (autosaveEnabled) {
      autosaveIntervalRef.current = setInterval(() => {
        writeChanges();
      }, 10000); // Auto-save every 10 seconds
    } else {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
        autosaveIntervalRef.current = null;
      }
    }

    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [autosaveEnabled]);

  const exportSceneToGLTF = () => {
    const sceneName = getSceneName(AFRAME.scenes[0]);
    const scene = AFRAME.scenes[0].object3D;
    filterHelpers(scene, false);
    AFRAME.INSPECTOR.exporters.gltf.parse(
      scene,
      function (buffer) {
        filterHelpers(scene, true);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        saveBlob(blob, sceneName + '.glb');
      },
      function (error) {
        console.error(error);
      },
      { binary: true }
    );
  };

  const addEntityWithPrimitive = (primitiveName) => {
    Events.emit('entitycreate', {
      element: primitiveName,
      components: {},
      parent: selectedEntity || AFRAME.scenes[0]
    });
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const addEntity = () => {
    Events.emit('entitycreate', { element: 'a-entity', components: {} });
  };

  /**
   * Try to write changes with aframe-inspector-watcher.
   */
  const writeChanges = () => {
    fetch('http://localhost:51234/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(AFRAME.INSPECTOR.history.updates)
    }).catch(() => {
      alert(
        'aframe-watcher not running. This feature requires a companion service running locally. npm install aframe-watcher to save changes back to file. Read more at https://github.com/supermedium/aframe-watcher'
      );
      if (autosaveEnabled) setAutosaveEnabled(false);
    })
  };

  const toggleScenePlaying = () => {
    if (isPlaying) {
      AFRAME.scenes[0].pause();
      setIsPlaying(false);
      AFRAME.scenes[0].isPlaying = true;
      document.getElementById('aframeInspectorMouseCursor').play();
      return;
    }
    AFRAME.scenes[0].isPlaying = false;
    AFRAME.scenes[0].play();
    setIsPlaying(true);
  };

  const openHelpModal = () => {
    Events.emit('openhelpmodal');
  };

  const toggleAutosave = () => {
    setAutosaveEnabled(!autosaveEnabled);
  };

  return {
    isPlaying,
    primitivesList,
    isDropdownOpen,
    autosaveEnabled,
    addEntityWithPrimitive,
    toggleDropdown,
    exportSceneToGLTF,
    writeChanges,
    toggleScenePlaying,
    openHelpModal,
    toggleAutosave
  };
}

