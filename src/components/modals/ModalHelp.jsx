import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Modal from './Modal';

let shortcuts = [
  [
    { key: ['w'], description: 'Translate' },
    { key: ['e'], description: 'Rotate' },
    { key: ['r'], description: 'Scale' },
    { key: ['d'], description: 'Duplicate selected entity' },
    { key: ['f'], description: 'Focus on selected entity' },
    { key: ['g'], description: 'Toggle grid visibility' },
    { key: ['n'], description: 'Add new entity' },
    { key: ['o'], description: 'Toggle local between global transform' },
    { key: ['delete | backspace'], description: 'Delete selected entity' }
  ],
  [
    { key: ['0'], description: 'Toggle panels' },
    { key: ['1'], description: 'Perspective view' },
    { key: ['2'], description: 'Left view' },
    { key: ['3'], description: 'Right view' },
    { key: ['4'], description: 'Top view' },
    { key: ['5'], description: 'Bottom view' },
    { key: ['6'], description: 'Back view' },
    { key: ['7'], description: 'Front view' },

    { key: ['ctrl | cmd', 'c'], description: 'Copy selected entity' },
    { key: ['ctrl | cmd', 'v'], description: 'Paste entity' },
    { key: ['h'], description: 'Show this help' },
    { key: ['esc'], description: 'Unselect entity' },
    { key: ['ctrl', 'alt', 'i'], description: 'Switch Edit and VR Modes' }
  ]
];

function ModalHelp({ isOpen: initialIsOpen, onClose }) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <Modal
      title="Shortcuts"
      isOpen={isOpen}
      onClose={handleClose}
      extraCloseKeyCode={72}
    >
      <div className="help-lists">
        {shortcuts.map(function (column, idx) {
          return (
            <ul className="help-list" key={idx}>
              {column.map(function (shortcut) {
                return (
                  <li key={shortcut.key} className="help-key-unit">
                    {shortcut.key.map(function (key) {
                      return (
                        <kbd key={key} className="help-key">
                          <span>{key}</span>
                        </kbd>
                      );
                    })}
                    <span className="help-key-def">
                      {shortcut.description}
                    </span>
                  </li>
                );
              })}
            </ul>
          );
        })}
      </div>
    </Modal>
  );
}

ModalHelp.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func
};

export default ModalHelp;
