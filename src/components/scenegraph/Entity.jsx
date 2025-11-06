/* eslint-disable react/no-danger */
import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FaCaretDown, FaCaretRight, FaClone, FaEye, FaEyeSlash, FaTrash } from 'react-icons/fa';
import clsx from 'clsx';
import { removeEntity, cloneEntity } from '../../lib/entity';
import EntityRepresentation from './EntityRepresentation';
import Events from '../../lib/Events';

function Entity({
  id,
  depth,
  entity,
  isExpanded,
  isFiltering,
  isSelected,
  selectEntity,
  toggleExpandedCollapsed
}) {
  const onClick = useCallback(() => {
    selectEntity(entity);
    if(entity.children) toggleExpandedCollapsed(entity);
  }, [selectEntity, entity]);

  const onDoubleClick = useCallback(() => {
    Events.emit('objectfocus', entity.object3D);
  }, [entity]);

  const toggleVisibility = useCallback(() => {
    const visible = entity.object3D.visible;
    entity.setAttribute('visible', !visible);
  }, [entity]);

  const tagName = entity.tagName.toLowerCase();

  const className = clsx({
    active: isSelected,
    entity: true,
    novisible: !entity.object3D.visible,
    option: true
  });

  const indentStyle = {
    paddingLeft: `${depth * 20 + 8}px`
  };

  const hasChildren = entity.children && entity.children.length > 0;

  return (
    <div className={className} onClick={onClick} id={id}>
      {/* Tree lines and indentation */}
      <div className="tree-indent" style={indentStyle}>
        {Array.from({ length: depth }, (_, i) => (
          <div key={i} className="tree-line" style={{ left: `${i * 20}px` }} />
        ))}
        
        {/* Expand/collapse icon */}
        {hasChildren && (
          <button 
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpandedCollapsed(entity);
            }}
          >
            {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
          </button>
        )}
        
        {/* Entity content */}
        <div className="entity-content">
          <EntityRepresentation entity={entity} onDoubleClick={onDoubleClick} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="entity-actions">
        {tagName !== 'a-scene' && (
          <>
            <button 
              onClick={() => cloneEntity(entity)} 
              title="Clone entity" 
              className="action-btn clone-btn"
            >
              <FaClone />
            </button>
            <button 
              onClick={(event) => {
                event.stopPropagation();
                removeEntity(entity);
              }}
              title="Remove entity"
              className="action-btn delete-btn"
            >
              <FaTrash />
            </button>
          </>
        )}
        <button 
          className="action-btn visibility-btn" 
          title="Toggle entity visibility" 
          onClick={toggleVisibility}
        >
          {entity.object3D.visible ? <FaEye /> : <FaEyeSlash />}
        </button>
      </div>
    </div>
  );
}

Entity.propTypes = {
  id: PropTypes.string,
  depth: PropTypes.number,
  entity: PropTypes.object,
  isExpanded: PropTypes.bool,
  isFiltering: PropTypes.bool,
  isSelected: PropTypes.bool,
  selectEntity: PropTypes.func,
  toggleExpandedCollapsed: PropTypes.func
};

export default Entity;
