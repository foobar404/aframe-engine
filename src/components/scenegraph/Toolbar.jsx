import React, { useState } from 'react';
import {
  FaPlus,
  FaSave,
} from 'react-icons/fa';
import { Events } from '../../lib/Events';

/**
 * Tools and actions.
 */
export function Toolbar({ selectedEntity }) {
  const {
    primitivesList,
    isDropdownOpen,
    addEntityWithPrimitive,
    toggleDropdown,
    writeChanges,
  } = useToolbar(selectedEntity);

  return (
    <div id="toolbar">
      <div className="toolbar-container">
        <div className="relative">
          <a title="Add a new primitive"
            className="toolbar-button"
            onClick={toggleDropdown}>
            <FaPlus />
          </a>
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
        <a title="Write changes with aframe-watcher."
          className="toolbar-button"
          onClick={writeChanges}>
          <FaSave />
        </a>
      </div>
    </div>
  );
}

function useToolbar(selectedEntity) {
  const [primitivesList, setPrimitivesList] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  React.useEffect(() => {
    if (window.AFRAME && AFRAME.primitives) {
      setPrimitivesList(Object.keys(AFRAME.primitives.primitives));
    }
  }, []);

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

  /**
   * Try to write changes with aframe-inspector-watcher.
   */
  const writeChanges = async () => {
    const actionList = AFRAME.INSPECTOR.history.actions || [];
    const watcherBase = `http://${window.location.hostname}:51234`;
    const assetsSnapshot = Array.from(document.querySelectorAll('a-assets > *')).map((el) => ({
      sourcePath: el.getAttribute('data-source-path') || null,
      id: el.id || null,
      tagName: el.tagName ? el.tagName.toLowerCase() : null,
      src:
        el.getAttribute('data-source-path') ||
        el.getAttribute('src') ||
        el.src ||
        null
    }));

    for (let i = actionList.length - 1; i >= 0; i--) {
      if (actionList[i].type === 'assetsync') {
        actionList.splice(i, 1);
      }
    }

    actionList.push({
      type: 'assetsync',
      payload: { assets: assetsSnapshot },
      timestamp: Date.now()
    });

    try {
      await fetch(`${watcherBase}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(AFRAME.INSPECTOR.history.updates)
      });
    } catch {
      alert(
        'aframe-watcher not running. This feature requires a companion service running locally. npm install aframe-watcher to save changes back to file. Read more at https://github.com/supermedium/aframe-watcher'
      );
      return;
    }

    try {
      const response = await fetch(`${watcherBase}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ actions: actionList })
      });

      if (response.ok) {
        actionList.length = 0;
      }
    } catch {
      // Legacy watcher versions may not support action sync endpoint.
    }
  };

  return {
    primitivesList,
    isDropdownOpen,
    addEntityWithPrimitive,
    toggleDropdown,
    writeChanges,
  };
}


