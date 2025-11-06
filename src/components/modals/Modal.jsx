import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

function Modal({
  id,
  children,
  isOpen: initialIsOpen,
  extraCloseKeyCode,
  closeOnClickOutside,
  onClose,
  title
}) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const self = useRef();

  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleGlobalKeydown = useCallback((event) => {
    if (
      isOpen &&
      (event.keyCode === 27 ||
        (extraCloseKeyCode && event.keyCode === extraCloseKeyCode))
    ) {
      close();
      event.stopPropagation();
    }
  }, [isOpen, extraCloseKeyCode, close]);

  const shouldClickDismiss = useCallback((event) => {
    var target = event.target;
    if (target.tagName === 'INPUT' && target.type === 'file') {
      return false;
    }
    if (target === self.current || self.current.contains(target)) {
      return false;
    }
    return true;
  }, []);

  const handleGlobalMousedown = useCallback((event) => {
    if (
      closeOnClickOutside &&
      isOpen &&
      shouldClickDismiss(event)
    ) {
      if (typeof onClose === 'function') {
        onClose();
      }
    }
  }, [closeOnClickOutside, isOpen, shouldClickDismiss, onClose]);

  useEffect(() => {
    document.addEventListener('keyup', handleGlobalKeydown);
    document.addEventListener('mousedown', handleGlobalMousedown);
    return () => {
      document.removeEventListener('keyup', handleGlobalKeydown);
      document.removeEventListener('mousedown', handleGlobalMousedown);
    };
  }, [handleGlobalKeydown, handleGlobalMousedown]);

  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  return (
    <div
      id={id}
      className={isOpen ? 'modal' : 'modal hide'}
    >
      <div className="modal-content" ref={self}>
        <div className="modal-header">
          <span className="close" onClick={close}>
            ×
          </span>
          <h3>{title}</h3>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  id: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element])
    .isRequired,
  isOpen: PropTypes.bool,
  extraCloseKeyCode: PropTypes.number,
  closeOnClickOutside: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.string
};

Modal.defaultProps = {
  closeOnClickOutside: true
};

export default Modal;
