import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  FaDatabase,
  FaFilter,
  FaFile,
  FaFileAudio,
  FaFileImage,
  FaFileVideo,
  FaFolderOpen,
  FaPalette,
  FaTrash,
  FaCube
} from 'react-icons/fa';
import { Events } from '../../lib/Events';

const MATERIAL_PRESETS = [
  { id: 'studio-matte', name: 'Studio Matte', description: 'Neutral non-metal base.', shader: 'standard', color: '#d9dde5', metalness: 0, roughness: 0.95 },
  { id: 'glossy-plastic', name: 'Glossy Plastic', description: 'Saturated polished plastic.', shader: 'standard', color: '#ff4d4d', metalness: 0, roughness: 0.18 },
  { id: 'brushed-aluminum', name: 'Brushed Aluminum', description: 'Soft industrial metal.', shader: 'standard', color: '#b7c0c8', metalness: 0.9, roughness: 0.45 },
  { id: 'polished-chrome', name: 'Polished Chrome', description: 'Mirror-like specular metal.', shader: 'standard', color: '#f2f4f8', metalness: 1, roughness: 0.06 },
  { id: 'warm-gold', name: 'Warm Gold', description: 'Jewelry-style reflective gold.', shader: 'standard', color: '#d6b44b', metalness: 1, roughness: 0.22 },
  { id: 'aged-copper', name: 'Aged Copper', description: 'Duller aged copper tone.', shader: 'standard', color: '#a56a43', metalness: 1, roughness: 0.55 },
  { id: 'ceramic-white', name: 'Ceramic White', description: 'Smooth painted ceramic.', shader: 'standard', color: '#f7f7f5', metalness: 0, roughness: 0.28 },
  { id: 'black-rubber', name: 'Black Rubber', description: 'Very rough low-spec surface.', shader: 'standard', color: '#202124', metalness: 0, roughness: 0.98 },
  { id: 'clear-glass', name: 'Clear Glass', description: 'Transparent glossy glass.', shader: 'standard', color: '#dff8ff', metalness: 0, roughness: 0.02, opacity: 0.2, transparent: true },
  { id: 'frosted-glass', name: 'Frosted Glass', description: 'Soft translucent diffusion.', shader: 'standard', color: '#d5eef2', metalness: 0, roughness: 0.75, opacity: 0.48, transparent: true },
  { id: 'neon-cyan', name: 'Neon Cyan', description: 'Emissive signage look.', shader: 'standard', color: '#0f2f36', emissive: '#28ffd9', emissiveIntensity: 1.6, metalness: 0, roughness: 0.32 },
  { id: 'hot-lava', name: 'Hot Lava', description: 'Warm emissive accent.', shader: 'standard', color: '#2e1208', emissive: '#ff5a1f', emissiveIntensity: 1.2, metalness: 0.05, roughness: 0.7 },
  { id: 'flat-poster', name: 'Flat Poster', description: 'Unlit flat-color shader.', shader: 'flat', color: '#5a7dff' },
  { id: 'flat-shadow', name: 'Flat Shadow', description: 'Unlit dark matte style.', shader: 'flat', color: '#1f2430' },
  { id: 'wire-blueprint', name: 'Wire Blueprint', description: 'Flat wireframe visualization.', shader: 'flat', color: '#53d2ff', wireframe: true },
  { id: 'hologram', name: 'Hologram', description: 'Transparent flat sci-fi look.', shader: 'flat', color: '#74f0ff', opacity: 0.35, transparent: true, side: 'double' }
];

const MATERIAL_PROP_KEYS = [
  'shader',
  'color',
  'metalness',
  'roughness',
  'emissive',
  'emissiveIntensity',
  'opacity',
  'transparent',
  'side',
  'wireframe',
  'fog'
];

function getMaterialProps(material) {
  const props = {};
  MATERIAL_PROP_KEYS.forEach((key) => {
    if (material[key] !== undefined) {
      props[key] = material[key];
    }
  });
  return props;
}

function materialTags(material) {
  const tags = [`shader:${material.shader || 'standard'}`];
  if (material.metalness !== undefined) tags.push(`m:${material.metalness}`);
  if (material.roughness !== undefined) tags.push(`r:${material.roughness}`);
  if (material.emissive && material.emissive !== '#000' && material.emissive !== '#000000') tags.push('emissive');
  if (material.transparent || (material.opacity !== undefined && material.opacity < 1)) tags.push(`alpha:${material.opacity ?? 1}`);
  if (material.wireframe) tags.push('wire');
  return tags;
}

function sanitizeId(raw) {
  return (raw || 'asset')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function inferAssetTag(fileName, mimeType) {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg|ktx2|basis)$/.test(name)) return 'img';
  if (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/.test(name)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac)$/.test(name)) return 'audio';
  return 'a-asset-item';
}

function inferAssetKind(tag, src) {
  const t = (tag || '').toLowerCase();
  const s = (src || '').toLowerCase();

  if (t === 'img') return 'image';
  if (t === 'video') return 'video';
  if (t === 'audio') return 'audio';
  if (t === 'a-asset-item') {
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(s)) return 'image';
    if (/\.(mp4|webm|ogg|mov)$/.test(s)) return 'video';
    if (/\.(mp3|wav|ogg|aac|flac)$/.test(s)) return 'audio';
    return 'model';
  }

  return 'other';
}

function toAssetRecord(el) {
  const src = el.getAttribute('src') || el.src || '';
  const sourcePath = el.getAttribute('data-source-path') || '';
  const tag = el.tagName.toLowerCase();
  return {
    id: el.id || '',
    src,
    sourcePath,
    tag,
    kind: inferAssetKind(tag, src),
    value: el.id ? `#${el.id}` : src,
    el,
    isDummy: false
  };
}

function getKindIcon(kind) {
  if (kind === 'image') return <FaFileImage />;
  if (kind === 'video') return <FaFileVideo />;
  if (kind === 'audio') return <FaFileAudio />;
  if (kind === 'model') return <FaCube />;
  return <FaFile />;
}

function MaterialSphere({ material, isActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 80;
    const height = 60;
    const radius = 22;
    const cx = width / 2;
    const cy = height / 2;

    canvas.width = width;
    canvas.height = height;

    // Background.
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#1f2738');
    bg.addColorStop(1, '#0f1422');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Checkerboard under transparent materials.
    const alpha = material.opacity ?? 1;
    const transparent = material.transparent || alpha < 1;
    if (transparent) {
      const size = 6;
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          const odd = ((x / size) + (y / size)) % 2 === 0;
          ctx.fillStyle = odd ? '#2f3647' : '#1a2234';
          ctx.fillRect(x, y, size, size);
        }
      }
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    if (material.shader === 'flat') {
      ctx.fillStyle = material.color || '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const roughness = material.roughness ?? 1;
      const shine = Math.max(0.15, 1 - roughness);
      const grad = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.45,
        radius * 0.12,
        cx,
        cy,
        radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.22 * shine, material.color || '#ffffff');
      grad.addColorStop(1, '#0b0f1c');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Extra specular highlight for metallic surfaces.
      const metalness = material.metalness ?? 0;
      if (metalness > 0.2) {
        ctx.globalAlpha = Math.min(0.55, metalness * 0.45);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx - 8, cy - 11, 8, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
    }

    if (material.wireframe) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius - Math.abs(i) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy + i * 4);
        ctx.lineTo(cx + radius, cy + i * 4);
        ctx.stroke();
      }
    }

    if (material.emissive && material.emissive !== '#000' && material.emissive !== '#000000') {
      ctx.shadowColor = material.emissive;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = material.emissive;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // Rim.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }, [material, isActive]);

  return <canvas ref={canvasRef} className="material-sphere-canvas" />;
}

export function AssetPanel({ scene }) {
  const [activeTab, setActiveTab] = useState('assets');
  const [assets, setAssets] = useState([]);
  const [assetFilter, setAssetFilter] = useState('all');
  const [assetTarget, setAssetTarget] = useState(null);

  const assetAction = useCallback((action, payload = {}) => {
    let assetsEl = document.querySelector('a-assets');

    if ((action === 'set' || action === 'remove') && !assetsEl) {
      assetsEl = document.createElement('a-assets');
      const targetScene = scene || AFRAME.scenes[0];
      targetScene?.appendChild(assetsEl);
    }

    if (action === 'get') {
      if (!assetsEl) return [];
      return Array.from(assetsEl.children).map(toAssetRecord);
    }

    if (action === 'set') {
      const id = payload.id;
      const src = payload.src;
      const sourcePath = payload.sourcePath;
      const tag = payload.tag || 'img';
      if (!id || !src) return null;

      let el = document.getElementById(id);
      if (!el || el.tagName.toLowerCase() !== tag) {
        if (el) el.remove();
        el = document.createElement(tag);
        el.setAttribute('id', id);
        assetsEl.appendChild(el);
      }

      el.setAttribute('src', src);
      if (sourcePath) {
        el.setAttribute('data-source-path', sourcePath);
      } else {
        el.removeAttribute('data-source-path');
      }
      if (tag === 'video' || tag === 'audio') {
        el.setAttribute('crossorigin', 'anonymous');
      }

      return toAssetRecord(el);
    }

    if (action === 'remove') {
      if (!assetsEl) return false;

      let el = null;
      if (payload.el && assetsEl.contains(payload.el)) {
        el = payload.el;
      }

      if (!el && payload.id) {
        el = Array.from(assetsEl.children).find((child) => child.id === payload.id) || null;
      }

      if (!el && payload.src) {
        el = Array.from(assetsEl.children).find((child) => {
          const childSrc = child.getAttribute('src') || child.src || '';
          return childSrc === payload.src;
        }) || null;
      }

      if (!el) return false;

      const removedRecord = toAssetRecord(el);
      el.remove();
      return removedRecord;
    }

    return null;
  }, [scene]);

  const refreshAssets = useCallback(() => {
    setAssets(assetAction('get'));
  }, [assetAction]);

  useEffect(() => {
    refreshAssets();
    Events.on('assetadd', refreshAssets);
    Events.on('assetremove', refreshAssets);
    return () => {
      Events.off('assetadd', refreshAssets);
      Events.off('assetremove', refreshAssets);
    };
  }, [refreshAssets]);

  useEffect(() => {
    const onSetAssetTarget = (detail) => {
      if (!detail?.targetId) {
        setAssetTarget(null);
        return;
      }

      const kinds = Array.isArray(detail.assetKinds) ? detail.assetKinds : [];
      setAssetTarget({ targetId: detail.targetId, assetKinds: kinds });

      if (kinds.length === 1) {
        setAssetFilter(kinds[0]);
      }
    };

    Events.on('assettarget', onSetAssetTarget);
    return () => {
      Events.off('assettarget', onSetAssetTarget);
    };
  }, []);

  const filteredAssets = useMemo(() => {
    if (assetFilter === 'all') return assets;
    return assets.filter(asset => asset.kind === assetFilter);
  }, [assets, assetFilter]);

  const targetFilteredAssets = useMemo(() => {
    if (!assetTarget?.assetKinds || assetTarget.assetKinds.length === 0) {
      return filteredAssets;
    }
    return filteredAssets.filter(asset => assetTarget.assetKinds.includes(asset.kind));
  }, [filteredAssets, assetTarget]);

  const displayAssets = useMemo(() => {
    return targetFilteredAssets;
  }, [targetFilteredAssets]);

  const getUniqueAssetId = useCallback((rawName) => {
    const base = sanitizeId(rawName);
    let id = base;
    let i = 1;
    while (document.getElementById(id)) {
      id = `${base}-${i}`;
      i += 1;
    }
    return id;
  }, []);

  const addFiles = useCallback((fileList) => {
    const entries = Array.from(fileList || [])
      .map((item) => {
        if (item instanceof File) {
          return {
            file: item,
            relativePath: item.webkitRelativePath || item.name,
            absolutePath: item.path || ''
          };
        }

        if (item && item.file instanceof File) {
          return {
            file: item.file,
            relativePath: item.relativePath || item.file.webkitRelativePath || item.file.name,
            absolutePath: item.absolutePath || item.file.path || ''
          };
        }

        return null;
      })
      .filter(Boolean);

    if (!entries.length) return;

    entries.forEach(({ file, relativePath, absolutePath }) => {
      const idSeed = relativePath || file.name;
      const id = getUniqueAssetId(idSeed);
      const src = relativePath || file.name;
      const tag = inferAssetTag(file.name, file.type);
      const sourcePath = absolutePath || relativePath || file.name;
      const created = assetAction('set', { id, src, tag, sourcePath });
      if (created) {
        Events.emit('assetadd', {
          id: created.id,
          src: created.src,
          sourcePath: created.sourcePath,
          tagName: created.tag
        });
      }
    });

    refreshAssets();
  }, [assetAction, getUniqueAssetId, refreshAssets]);

  const collectDirectoryFiles = useCallback(async (dirHandle, basePath = '') => {
    const out = [];

    for await (const [name, handle] of dirHandle.entries()) {
      const currentPath = basePath ? `${basePath}/${name}` : name;
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        out.push({ file, relativePath: currentPath });
      } else if (handle.kind === 'directory') {
        const nested = await collectDirectoryFiles(handle, currentPath);
        out.push(...nested);
      }
    }

    return out;
  }, []);

  const onFolderPickerClick = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      alert('Directory picker is not supported in this browser.');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      const pickedFiles = await collectDirectoryFiles(dirHandle, dirHandle.name);
      addFiles(pickedFiles);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('Failed to read selected folder:', err);
      }
    }
  }, [addFiles, collectDirectoryFiles]);

  const removeAsset = (asset) => {
    if (!asset || asset.isDummy) return;

    const removed = assetAction('remove', {
      id: asset.id,
      src: asset.src,
      el: asset.el
    });

    if (removed) {
      refreshAssets();
      Events.emit('assetremove', {
        id: removed.id,
        src: removed.src,
        sourcePath: removed.sourcePath,
        tagName: removed.tag
      });
    }
  };

  const handleAssetDragStart = (e, asset) => {
    if (asset.isDummy) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetType: asset.kind,
      value: asset.value,
      src: asset.src,
      id: asset.id,
      name: asset.id
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAssetClick = useCallback((asset) => {
    if (asset.isDummy || !assetTarget?.targetId) {
      return;
    }

    if (assetTarget.assetKinds?.length > 0 && !assetTarget.assetKinds.includes(asset.kind)) {
      return;
    }

    Events.emit('assetselect', {
      targetId: assetTarget.targetId,
      value: asset.value,
      id: asset.id,
      src: asset.src,
      tagName: asset.tag,
      kind: asset.kind
    });
    setAssetTarget(null);
  }, [assetTarget]);

  const applyMaterialPreset = useCallback((material) => {
    const selectedEntity = AFRAME.INSPECTOR?.selectedEntity;
    if (!selectedEntity) {
      alert('Select an entity in the scene graph first.');
      return;
    }

    const props = getMaterialProps(material);

    selectedEntity.setAttribute('material', props);
    Events.emit('entityupdate', {
      entity: selectedEntity,
      component: 'material',
      property: '',
      value: selectedEntity.getAttribute('material')
    });
  }, []);

  const handleMaterialDragStart = (e, material) => {
    const materialProps = getMaterialProps(material);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetType: 'material',
      value: 'material-preset',
      id: material.id,
      name: material.name,
      materialProps,
      ...materialProps
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div id="assetPanel" className="asset-panel">
      <div className="asset-tabs">
        <button className={`tab ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>
          <FaDatabase /> Assets
        </button>
        <button className={`tab ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>
          <FaPalette /> Materials
        </button>
      </div>

      {activeTab === 'assets' && (
        <div className="asset-section">
          <div className="asset-toolbar">
            <div className="asset-filter-compact">
              <FaFilter />
              <select id="assetFilter" value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="image">Img</option>
                <option value="video">Vid</option>
                <option value="audio">Aud</option>
                <option value="model">3D</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div
            className="asset-dropzone compact"
            onClick={onFolderPickerClick}
            role="button"
            tabIndex={0}
          >
            <FaFolderOpen /> Click to select asset folder
          </div>

          <div className="asset-grid compact-5">
            {displayAssets.map((asset) => (
              <div
                key={asset.id || asset.src}
                className={`asset-item compact ${asset.isDummy ? 'dummy' : ''}`}
                draggable={!asset.isDummy}
                onDragStart={(e) => handleAssetDragStart(e, asset)}
                onClick={() => handleAssetClick(asset)}
                title={asset.id || asset.src || 'Asset'}
              >
                <div className="asset-icon">{getKindIcon(asset.kind)}</div>
                <div className="asset-name">{asset.id || '(no id)'}</div>
                <div className="asset-details">{asset.kind}</div>
                {!asset.isDummy && (
                  <button
                    className="asset-remove-icon"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAsset(asset);
                    }}
                    title="Remove">
                    <FaTrash />
                  </button>
                )}
              </div>
            ))}
            {!displayAssets.length && <div className="asset-empty">No assets found</div>}
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="asset-section">
          <h4 className="asset-section-title">Material Presets</h4>
          <div className="asset-grid">
            {MATERIAL_PRESETS.map((material) => (
              <div
                key={material.id}
                className="asset-item material-item"
                draggable
                onDragStart={(e) => handleMaterialDragStart(e, material)}
                onClick={() => applyMaterialPreset(material)}
                title="Click to apply to selected entity"
              >
                <div className="material-color-band" style={{ backgroundColor: material.color || '#7b8796' }} />
                <MaterialSphere material={material} isActive={activeTab === 'materials'} />
                <div className="asset-info">
                  <span className="asset-name">{material.name}</span>
                  <span className="asset-details">{material.description || 'Material preset'}</span>
                  <div className="material-tags">
                    {materialTags(material).map((tag) => (
                      <span key={`${material.id}-${tag}`} className="material-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

AssetPanel.propTypes = {
  scene: PropTypes.object
};
