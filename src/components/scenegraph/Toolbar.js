import React, { useState } from 'react';
import {
  FaPlus,
  FaPause,
  FaPlay,
  FaSave,
  FaQuestion,
  FaDownload
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
export default function Toolbar() {
  const [isPlaying, setIsPlaying] = useState(false);

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

  const addEntity = () => {
    Events.emit('entitycreate', { element: 'a-entity', components: {} });
  };

  /**
   * Try to write changes with aframe-inspector-watcher.
   */
  const writeChanges = () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:51234/save');
    xhr.onerror = () => {
      alert(
        'aframe-watcher not running. This feature requires a companion service running locally. npm install aframe-watcher to save changes back to file. Read more at https://github.com/supermedium/aframe-watcher'
      );
    };
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(AFRAME.INSPECTOR.history.updates));
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

  return (
    <div id="toolbar">
      <div className="toolbarActions">
        <a
          className="button"
          title="Add a new entity"
          onClick={addEntity}
        >
          <FaPlus />
        </a>
        <a
          id="playPauseScene"
          className="button"
          title={isPlaying ? 'Pause scene' : 'Resume scene'}
          onClick={toggleScenePlaying}
        >
          {isPlaying ? (
            <FaPause />
          ) : (
            <FaPlay />
          )}
        </a>
        <a
          className="gltfIcon"
          title="Export to GLTF"
          onClick={exportSceneToGLTF}
        >
          <FaDownload />
        </a>
        <a
          className="button"
          title="Write changes with aframe-watcher."
          onClick={writeChanges}
        >
          <FaSave />
        </a>
        <div className="helpButtonContainer">
          <a className="button" title="Help" onClick={openHelpModal}>
            <FaQuestion />
          </a>
        </div>
      </div>
    </div>
  );
}
