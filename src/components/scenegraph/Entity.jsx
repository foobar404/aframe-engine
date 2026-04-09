/* eslint-disable react/no-danger */
import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { FaCaretDown, FaCaretRight, FaClone, FaEye, FaEyeSlash, FaMinus, FaTrash } from 'react-icons/fa';
import clsx from 'clsx';
import { removeEntity, cloneEntity, generateEntityId } from '../../lib/entity';
import { EntityRepresentation } from './EntityRepresentation';
import { Events } from '../../lib/Events';

export function Entity({
  id,
  depth,
  entity,
  isExpanded,
  isFiltering,
  isSelected,
  selectEntity,
  toggleExpandedCollapsed,
  collapseAll
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const onClick = useCallback(() => {
    selectEntity(entity);
    if (entity.children) toggleExpandedCollapsed(entity);
  }, [selectEntity, entity]);

  const onDoubleClick = useCallback(() => {
    Events.emit('objectfocus', entity.object3D);
  }, [entity]);

  const toggleVisibility = useCallback(() => {
    const visible = entity.getAttribute('visible') !== false;
    entity.setAttribute('visible', !visible);
    Events.emit('entityupdate', { entity, component: 'visible', value: !visible });
  }, [entity]);

  const handleDragStart = useCallback((e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    // Ensure entity has an ID for reliable lookup during drop
    if (!entity.id) {
      entity.id = generateEntityId(entity.tagName.toLowerCase());
    }
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'entity',
      entityId: entity.id
    }));
    Events.emit('entitydragstart', entity);
  }, [entity]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data.type === 'asset' && data.assetType === 'material') {
        const legacyMaterialProps = {
          color: data.color,
          metalness: data.metalness,
          roughness: data.roughness,
          ...(data.opacity !== undefined ? { opacity: data.opacity } : {}),
          ...(data.transparent !== undefined ? { transparent: data.transparent } : {})
        };

        const materialProps =
          data.materialProps && typeof data.materialProps === 'object'
            ? data.materialProps
            : Object.fromEntries(
                Object.entries(legacyMaterialProps).filter(([, value]) => value !== undefined && value !== null)
              );

        if (Object.keys(materialProps).length) {
          entity.setAttribute('material', materialProps);
          Events.emit('entityupdate', {
            entity,
            component: 'material',
            property: '',
            value: materialProps
          });
          selectEntity(entity);
        }
        return;
      }
      
      if (data.type === 'entity') {
        // Find the dragged entity by ID (always set in handleDragStart)
        const draggedEntity = document.getElementById(data.entityId);
        
        if (!draggedEntity || draggedEntity === entity) {
          return;
        }

        // Check if trying to drop into own descendant
        let parent = entity;
        while (parent) {
          if (parent === draggedEntity) {
            console.warn('Cannot move entity into its own descendant');
            return;
          }
          parent = parent.parentElement;
        }

        // Perform the reparenting
        const oldParent = draggedEntity.parentElement;
        entity.appendChild(draggedEntity);
        
        // Emit custom events
        Events.emit('entityreparent', {
          entity: draggedEntity,
          oldParent: oldParent,
          newParent: entity
        });

        // Expand the new parent to show the moved child
        if (!isExpanded) {
          toggleExpandedCollapsed(entity);
        }
      }
    } catch (error) {
      console.warn('Failed to reparent entity:', error);
    }
  }, [entity, isExpanded, toggleExpandedCollapsed, selectEntity]);

  const tagName = entity.tagName.toLowerCase();

  const className = clsx({
    active: isSelected,
    entity: true,
    novisible: !entity.object3D.visible,
    option: true,
    'drag-over': isDragOver
  });

  const indentStyle = {
    paddingLeft: `${depth * 20 + 8}px`
  };

  const hasChildren = entity.children && entity.children.length > 0;

  return (
    <div 
      className={className} 
      onClick={onClick} 
      id={id}
      draggable={tagName !== 'a-scene'}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
              className="action-btn clone-btn">
              <FaClone />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                removeEntity(entity);
              }}
              title="Remove entity"
              className="action-btn delete-btn">
              <FaTrash />
            </button>
          </>
        )}
        {depth === 0 && (
          <button
            className="action-btn collapse-all-btn"
            title="Collapse all"
            onClick={(e) => {
              e.stopPropagation();
              collapseAll();
            }}>
            <FaMinus />
          </button>
        )}
        <button
          className="action-btn visibility-btn"
          title="Toggle entity visibility"
          onClick={toggleVisibility}>
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
  toggleExpandedCollapsed: PropTypes.func,
  collapseAll: PropTypes.func
};

