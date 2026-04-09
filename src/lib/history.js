import {Events} from './Events';
import {generateEntityId} from './entity';

function ensureEntityId(entity) {
  if (entity && !entity.id) {
    entity.id = generateEntityId(entity.tagName.toLowerCase());
  }
}

export const updates = {};
export const actions = [];

function getEntityIndex(entity) {
  if (!entity || !entity.parentElement) {
    return -1;
  }

  return Array.from(entity.parentElement.children).indexOf(entity);
}

function stringifyComponentData(name, component) {
  if (!component) return null;
  const baseName = name.split('__')[0];
  const def = AFRAME.components[baseName];
  if (!def) return null;

  try {
    const data = component.data;
    if (data == null) return null;

    if (def.isSingleProperty) {
      const schema = def.schema;
      return schema.stringify ? schema.stringify(data) : String(data);
    }

    // Multi-property: stringify each key using its own property-type stringify
    const schema = def.schema;
    const out = {};
    Object.keys(data).forEach(prop => {
      if (prop.startsWith('_')) return;
      const val = data[prop];
      if (val == null) return;
      const propDef = schema[prop];
      if (propDef && typeof propDef.stringify === 'function') {
        out[prop] = propDef.stringify(val);
      } else if (typeof val !== 'object') {
        out[prop] = String(val);
      }
    });
    return AFRAME.utils.styleParser.stringify(out);
  } catch (e) {
    return null;
  }
}

function serializeEntity(entity) {
  if (!entity) {
    return null;
  }

  if (entity.flushToDOM) {
    entity.flushToDOM();
  }

  const components = {};
  if (entity.components) {
    Object.keys(entity.components).forEach((name) => {
      const value = stringifyComponentData(name, entity.components[name]);
      if (value !== null) {
        components[name] = value;
      }
    });
  }

  return {
    id: entity.id || null,
    tagName: entity.tagName ? entity.tagName.toLowerCase() : null,
    outerHTML: entity.outerHTML,
    components,
    parentId: entity.parentElement?.id || null,
    parentTagName: entity.parentElement?.tagName
      ? entity.parentElement.tagName.toLowerCase()
      : null,
    index: getEntityIndex(entity)
  };
}

function recordEntityToUpdates(entity) {
  if (!entity || !entity.components) {
    return;
  }
  ensureEntityId(entity);
  if (!entity.id) {
    return;
  }

  if (entity.flushToDOM) {
    entity.flushToDOM();
  }

  updates[entity.id] = updates[entity.id] || {};

  Object.keys(entity.components).forEach((name) => {
    const value = stringifyComponentData(name, entity.components[name]);
    if (value !== null) {
      updates[entity.id][name] = value;
    }
  });
}

function pushAction(type, payload) {
  actions.push({
    type,
    payload,
    timestamp: Date.now()
  });
}

/**
 * Store change to export.
 *
 * payload: entity, component, property, value.
 */
Events.on('entityupdate', (payload) => {
  let value = payload.value;

  const entity = payload.entity;
  ensureEntityId(entity);
  if (!entity.id) { return; }
  updates[entity.id] = updates[entity.id] || {};

  const component = AFRAME.components[payload.component];
  if (component) {
    if (payload.property) {
      const currentComponentValue = updates[entity.id][payload.component];
      if (typeof currentComponentValue === 'string') {
        try {
          updates[entity.id][payload.component] =
            AFRAME.utils.styleParser.parse(currentComponentValue) || {};
        } catch (e) {
          updates[entity.id][payload.component] = {};
        }
      } else if (typeof currentComponentValue !== 'object' || currentComponentValue === null) {
        updates[entity.id][payload.component] = {};
      }

      if (component.schema[payload.property]) {
        value = component.schema[payload.property].stringify(payload.value);
      }
      updates[entity.id][payload.component][payload.property] = value;
    } else {
      if (component.isSingleProperty) {
        const schema = component.schema;
        value = schema.stringify ? schema.stringify(value) : String(value);
      } else {
        const schema = component.schema;
        const raw = typeof value === 'object' && value !== null ? value : {};
        const out = {};
        Object.keys(raw).forEach(prop => {
          if (prop.startsWith('_') || raw[prop] == null) return;
          const propDef = schema[prop];
          if (propDef?.stringify) {
            out[prop] = propDef.stringify(raw[prop]);
          } else if (typeof raw[prop] !== 'object') {
            out[prop] = String(raw[prop]);
          }
        });
        value = AFRAME.utils.styleParser.stringify(out);
      }
      updates[entity.id][payload.component] = value;
    }
  }
});

Events.on('entitycreated', (entity) => {
  recordEntityToUpdates(entity);
  const serialized = serializeEntity(entity);
  pushAction('entitycreate', {
    entity: serialized,
    parentId: serialized ? serialized.parentId : null,
    index: serialized ? serialized.index : null
  });
});

Events.on('entityclone', (entity) => {
  recordEntityToUpdates(entity);
  const serialized = serializeEntity(entity);
  pushAction('entitycreate', {
    entity: serialized,
    source: 'clone',
    parentId: serialized ? serialized.parentId : null,
    index: serialized ? serialized.index : null
  });
});

Events.on('entityremoved', ({entity, oldParent}) => {
  pushAction('entitydelete', {
    entityId: entity?.id || null,
    entityTagName: entity?.tagName ? entity.tagName.toLowerCase() : null,
    oldParentId: oldParent?.id || null,
    oldParentTagName: oldParent?.tagName ? oldParent.tagName.toLowerCase() : null
  });
});

Events.on('entityreparent', ({entity, oldParent, newParent}) => {
  if (entity) recordEntityToUpdates(entity);
  pushAction('entityreparent', {
    entityId: entity?.id || null,
    entityTagName: entity?.tagName ? entity.tagName.toLowerCase() : null,
    oldParentId: oldParent?.id || null,
    oldParentTagName: oldParent?.tagName ? oldParent.tagName.toLowerCase() : null,
    newParentId: newParent?.id || null,
    newParentTagName: newParent?.tagName ? newParent.tagName.toLowerCase() : null,
    index: getEntityIndex(entity)
  });
});

Events.on('componentadd', ({entity, component}) => {
  if (!entity || !component) {
    return;
  }
  ensureEntityId(entity);

  const value = entity.components[component]
    ? stringifyComponentData(component, entity.components[component])
    : '';

  pushAction('componentadd', {
    entityId: entity.id || null,
    entityTagName: entity.tagName ? entity.tagName.toLowerCase() : null,
    component,
    value: value || ''
  });
});

Events.on('componentremove', ({entity, component}) => {
  if (!entity || !component) {
    return;
  }
  ensureEntityId(entity);
  pushAction('componentremove', {
    entityId: entity.id || null,
    entityTagName: entity.tagName ? entity.tagName.toLowerCase() : null,
    component
  });
});

function getAssetFromDetail(detail = {}) {
  const id = detail.id || null;
  const el = id ? document.getElementById(id) : null;
  const sourcePath = detail.sourcePath || el?.getAttribute?.('data-source-path') || null;

  return {
    id,
    tagName: detail.tagName || detail.tag || (el?.tagName ? el.tagName.toLowerCase() : null),
    src: sourcePath || detail.src || el?.getAttribute?.('src') || el?.src || null,
    sourcePath
  };
}

Events.on('assetadd', (detail) => {
  const asset = getAssetFromDetail(detail);
  if (!asset.id) {
    return;
  }

  pushAction('assetset', asset);
});

Events.on('assetremove', (detail) => {
  const asset = getAssetFromDetail(detail);
  if (!asset.id) {
    return;
  }

  pushAction('assetremove', asset);
});
