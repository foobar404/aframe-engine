/* eslint-disable react/no-danger */
import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  faCaretDown,
  faCaretRight,
  faClone,
  faEye,
  faEyeSlash,
  faTrashAlt
} from '@fortawesome/free-solid-svg-icons';
import { AwesomeIcon } from '../AwesomeIcon';
import clsx from 'clsx';
import { removeEntity, cloneEntity } from '../../lib/entity';
import EntityRepresentation from '../EntityRepresentation';
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
  const onClick = useCallback(() => selectEntity(entity), [selectEntity, entity]);

  const onDoubleClick = useCallback(() => {
    Events.emit('objectfocus', entity.object3D);
  }, [entity]);

  const toggleVisibility = useCallback(() => {
    const visible = entity.object3D.visible;
    entity.setAttribute('visible', !visible);
  }, [entity]);

  const tagName = entity.tagName.toLowerCase();

  // Clone and remove buttons if not a-scene.
  const cloneButton =
    tagName === 'a-scene' ? null : (
      <a
        onClick={() => cloneEntity(entity)}
        title="Clone entity"
        className="button"
      >
        <AwesomeIcon icon={faClone} />
      </a>
    );
  const removeButton =
    tagName === 'a-scene' ? null : (
      <a
        onClick={(event) => {
          event.stopPropagation();
          removeEntity(entity);
        }}
        title="Remove entity"
        className="button"
      >
        <AwesomeIcon icon={faTrashAlt} />
      </a>
    );

  // Add spaces depending on depth.
  const pad = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth);
  let collapse;
  if (entity.children.length > 0 && !isFiltering) {
    collapse = (
      <span
        onClick={() => toggleExpandedCollapsed(entity)}
        className="collapsespace"
      >
        {isExpanded ? (
          <AwesomeIcon icon={faCaretDown} />
        ) : (
          <AwesomeIcon icon={faCaretRight} />
        )}
      </span>
    );
  } else {
    collapse = <span className="collapsespace" />;
  }

  // Visibility button.
  const visible = entity.object3D.visible;
  const visibilityButton = (
    <i title="Toggle entity visibility" onClick={toggleVisibility}>
      {visible ? (
        <AwesomeIcon icon={faEye} />
      ) : (
        <AwesomeIcon icon={faEyeSlash} />
      )}
    </i>
  );

  // Class name.
  const className = clsx({
    active: isSelected,
    entity: true,
    novisible: !visible,
    option: true
  });

  return (
    <div className={className} onClick={onClick} id={id}>
      <span>
        {visibilityButton}
        <span
          className="entityChildPadding"
          dangerouslySetInnerHTML={{ __html: pad }}
        />
        {collapse}
        <EntityRepresentation
          entity={entity}
          onDoubleClick={onDoubleClick}
        />
      </span>
      <span className="entityActions">
        {cloneButton}
        {removeButton}
      </span>
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
