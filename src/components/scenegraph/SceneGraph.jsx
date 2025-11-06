/* eslint-disable no-unused-vars, react/no-danger */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FaSearch, FaTimes } from 'react-icons/fa';
import debounce from 'lodash.debounce';

import Entity from './Entity';
import Toolbar from './Toolbar';
import Events from '../../lib/Events';

function SceneGraph({ scene, selectedEntity, visible }) {
  const [entities, setEntities] = useState([]);
  const [filter, setFilter] = useState('');
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const expandedElementsRef = useRef(new WeakMap([[scene, true]]));

  const includeInSceneGraph = useCallback((element) => {
    return !(
      element.dataset.isInspector ||
      !element.isEntity ||
      element.isInspector ||
      'aframeInspector' in element.dataset
    );
  }, []);

  const isExpanded = useCallback((x) => expandedElementsRef.current.get(x) === true, []);

  const toggleExpandedCollapsed = useCallback((x) => {
    const current = expandedElementsRef.current.get(x) === true;
    expandedElementsRef.current.set(x, !current);
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const expandToRoot = useCallback((x) => {
    let curr = x.parentNode;
    while (curr !== undefined && curr.isEntity) {
      expandedElementsRef.current.set(curr, true);
      curr = curr.parentNode;
    }
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const rebuildEntityOptionsCallback = useCallback(() => {
    const ents = [{ depth: 0, entity: scene }];
    const treeIterate = (element, depth) => {
      if (!element) {
        return;
      }
      depth += 1;
      for (let i = 0; i < element.children.length; i++) {
        let entity = element.children[i];
        if (!includeInSceneGraph(entity)) {
          continue;
        }
        ents.push({
          entity: entity,
          depth: depth,
          id: 'sgnode' + ents.length
        });
        treeIterate(entity, depth);
      }
    };
    treeIterate(scene, 0);
    setEntities(ents);
    setFilteredEntities(getFilteredEntities(filter, ents));
  }, [scene, filter, includeInSceneGraph]);

  const rebuildEntityOptions = useMemo(() => debounce(rebuildEntityOptionsCallback, 0), [rebuildEntityOptionsCallback]);

  const updateFilteredEntitiesCallback = useCallback((filt) => {
    setFilteredEntities(getFilteredEntities(filt, entities));
  }, [entities]);

  const updateFilteredEntities = useMemo(() => debounce(updateFilteredEntitiesCallback, 100), [updateFilteredEntitiesCallback]);

  const getFilteredEntities = useCallback((filt, ents) => {
    ents = ents || entities;
    if (!filt) {
      return ents;
    }
    return ents.filter((entityOption) => {
      return filterEntity(entityOption.entity, filt);
    });
  }, [entities]);

  const isVisibleInSceneGraph = useCallback((x) => {
    let curr = x.parentNode;
    if (!curr) {
      return false;
    }
    while (curr?.isEntity) {
      if (!isExpanded(curr)) {
        return false;
      }
      curr = curr.parentNode;
    }
    return true;
  }, [isExpanded]);

  const selectEntity = useCallback((entity) => {
    let found = false;
    for (let i = 0; i < filteredEntities.length; i++) {
      const entityOption = filteredEntities[i];
      if (entityOption.entity === entity) {
        setSelectedIndex(i);
        setTimeout(() => {
          const node = document.getElementById('sgnode' + i);
          const scrollableContainer = document.querySelector(
            '#scenegraph .outliner'
          );
          if (!node || !scrollableContainer) return;
          const containerRect = scrollableContainer.getBoundingClientRect();
          const nodeRect = node.getBoundingClientRect();
          const isVisible =
            nodeRect.top >= containerRect.top &&
            nodeRect.bottom <= containerRect.bottom;
          if (!isVisible) {
            node.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        expandToRoot(entity);
        Events.emit('entityselect', entity);
        found = true;
        break;
      }
    }
    if (!found) {
      setSelectedIndex(-1);
    }
  }, [filteredEntities, expandToRoot]);

  const selectIndex = useCallback((index) => {
    if (index >= 0 && index < entities.length) {
      selectEntity(entities[index].entity);
    }
  }, [entities, selectEntity]);

  const previousExpandedIndexTo = useCallback((i) => {
    for (let prevIter = i - 1; prevIter >= 0; prevIter--) {
      const prevEl = entities[prevIter].entity;
      if (isVisibleInSceneGraph(prevEl)) {
        return prevIter;
      }
    }
    return -1;
  }, [entities, isVisibleInSceneGraph]);

  const nextExpandedIndexTo = useCallback((i) => {
    for (
      let nextIter = i + 1;
      nextIter < entities.length;
      nextIter++
    ) {
      const nextEl = entities[nextIter].entity;
      if (isVisibleInSceneGraph(nextEl)) {
        return nextIter;
      }
    }
    return -1;
  }, [entities, isVisibleInSceneGraph]);

  const onEntityUpdate = useCallback((detail) => {
    if (detail.component === 'mixin' || detail.component === 'visible') {
      rebuildEntityOptions();
    }
  }, [rebuildEntityOptions]);

  const onChildAttachedDetached = useCallback((event) => {
    if (includeInSceneGraph(event.detail.el)) {
      rebuildEntityOptions();
    }
  }, [includeInSceneGraph, rebuildEntityOptions]);

  const onChangeFilter = useCallback((evt) => {
    const filt = evt.target.value;
    setFilter(filt);
    updateFilteredEntities(filt);
  }, [updateFilteredEntities]);

  const clearFilter = useCallback(() => {
    setFilter('');
    updateFilteredEntities('');
  }, [updateFilteredEntities]);

  const onFilterKeyUp = useCallback((event) => {
    if (event.keyCode === 27) {
      clearFilter();
    }
  }, [clearFilter]);

  const onKeyDown = useCallback((event) => {
    switch (event.keyCode) {
      case 37: // left
      case 38: // up
      case 39: // right
      case 40: // down
        event.preventDefault();
        event.stopPropagation();
        break;
    }
  }, []);

  const onKeyUp = useCallback((event) => {
    if (selectedEntity === null) {
      return;
    }
    switch (event.keyCode) {
      case 37: // left
        if (isExpanded(selectedEntity)) {
          toggleExpandedCollapsed(selectedEntity);
        }
        break;
      case 38: // up
        selectIndex(previousExpandedIndexTo(selectedIndex));
        break;
      case 39: // right
        if (!isExpanded(selectedEntity)) {
          toggleExpandedCollapsed(selectedEntity);
        }
        break;
      case 40: // down
        selectIndex(nextExpandedIndexTo(selectedIndex));
        break;
    }
  }, [selectedEntity, isExpanded, toggleExpandedCollapsed, selectIndex, previousExpandedIndexTo, selectedIndex, nextExpandedIndexTo]);

  useEffect(() => {
    rebuildEntityOptions();
    Events.on('entityidchange', rebuildEntityOptions);
    Events.on('entityupdate', onEntityUpdate);
    document.addEventListener('child-attached', onChildAttachedDetached);
    document.addEventListener('child-detached', onChildAttachedDetached);
    return () => {
      Events.off('entityidchange', rebuildEntityOptions);
      Events.off('entityupdate', onEntityUpdate);
      document.removeEventListener('child-attached', onChildAttachedDetached);
      document.removeEventListener('child-detached', onChildAttachedDetached);
    };
  }, [rebuildEntityOptions, onEntityUpdate, onChildAttachedDetached]);

  useEffect(() => {
    selectEntity(selectedEntity);
  }, [selectedEntity, selectEntity]);

  return (
    <div id="scenegraph" className="scenegraph" >
      <button
        onClick={() => AFRAME.INSPECTOR.close()}
        className="exit">
        <FaTimes className="w-4 h-4 m-auto" />
      </button>

      <div className="scenegraph-toolbar">
        <Toolbar selectedEntity={selectedEntity} />
        <div className="search">
          <input
            id="filter"
            className="min-h-10"
            placeholder="Search..."
            onChange={onChangeFilter}
            onKeyUp={onFilterKeyUp}
            value={filter}
          />

          {filter && (
            <a onClick={clearFilter} className="button">
              <FaTimes />
            </a>
          )}

          {!filter && <FaSearch className="top-4!" />}
        </div>
      </div>
      <div className="outliner"
        tabIndex="0"
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}>

        {filteredEntities.map((entityOption, idx) => {
          if (!isVisibleInSceneGraph(entityOption.entity) && !filter) return null;

          return (
            <Entity
              {...entityOption}
              key={idx}
              isFiltering={!!filter}
              isExpanded={isExpanded(entityOption.entity)}
              isSelected={selectedEntity === entityOption.entity}
              selectEntity={selectEntity}
              toggleExpandedCollapsed={toggleExpandedCollapsed}
            />
          );
        })}
      </div>
    </div>
  );
}

SceneGraph.propTypes = {
  scene: PropTypes.object,
  selectedEntity: PropTypes.object,
  visible: PropTypes.bool
};

SceneGraph.defaultProps = {
  selectedEntity: ''
};

export default SceneGraph;

function filterEntity(entity, filter) {
  if (!filter) {
    return true;
  }

  // Check if the ID, tagName, class, selector includes the filter.
  if (
    entity.id.toUpperCase().indexOf(filter.toUpperCase()) !== -1 ||
    entity.tagName.indexOf(filter.toUpperCase()) !== -1 ||
    entity.classList.contains(filter) ||
    entity.matches(filter)
  ) {
    return true;
  }

  return false;
}
