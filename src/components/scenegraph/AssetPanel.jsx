import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';

function AssetPanel({ scene }) {
  const [assetsImages, setAssetsImages] = useState([]);
  const [registryImages, setRegistryImages] = useState([]);

  const generateFromRegistry = useCallback(() => {
    if (!AFRAME.INSPECTOR?.assetsLoader?.images) return;

    AFRAME.INSPECTOR.assetsLoader.images.forEach((imageData) => {
      var image = new Image();
      image.addEventListener('load', () => {
        setRegistryImages(prev => [...prev, {
          id: imageData.id,
          src: imageData.fullPath,
          thumbSrc: imageData.fullThumbPath,
          width: imageData.width,
          height: imageData.height,
          name: imageData.id,
          type: 'registry',
          tags: imageData.tags || [],
          value: 'url(' + imageData.fullPath + ')'
        }]);
      });
      image.src = imageData.fullThumbPath;
    });
  }, []);

  const generateFromAssets = useCallback(() => {
    setAssetsImages([]);
    
    // Get all asset types: img, video, audio, a-asset-item
    const assetSelectors = ['a-assets img', 'a-assets video', 'a-assets audio', 'a-assets a-asset-item'];
    const allAssets = [];
    
    assetSelectors.forEach(selector => {
      const assets = Array.prototype.slice.call(document.querySelectorAll(selector));
      assets.forEach(asset => {
        // For a-asset-item, we need to check if it's an image
        if (asset.tagName === 'A-ASSET-ITEM') {
          // Check if it's an image type
          const itemType = asset.getAttribute('type') || '';
          if (itemType.startsWith('image/') || !itemType) {
            // Try to get src from the asset item
            const src = asset.getAttribute('src') || asset.src;
            if (src) {
              allAssets.push({
                element: asset,
                src: src,
                id: asset.id,
                type: 'asset-item',
                tagName: asset.tagName.toLowerCase()
              });
            }
          }
        } else {
          // Regular img, video, audio elements
          allAssets.push({
            element: asset,
            src: asset.src || asset.getAttribute('src'),
            id: asset.id,
            type: 'asset',
            tagName: asset.tagName.toLowerCase()
          });
        }
      });
    });
    
    // Process each asset
    allAssets.forEach(asset => {
      if (asset.tagName === 'img' || asset.type === 'asset-item') {
        // Handle images
        var image = new Image();
        image.addEventListener('load', () => {
          setAssetsImages(prev => [...prev, {
            id: asset.id,
            src: image.src,
            width: image.width,
            height: image.height,
            name: asset.id,
            type: 'asset',
            value: asset.type === 'asset-item' ? asset.src : '#' + asset.id,
            assetType: asset.tagName
          }]);
        });
        image.src = asset.src;
      } else if (asset.tagName === 'video') {
        // Handle videos (show poster or first frame)
        setAssetsImages(prev => [...prev, {
          id: asset.id,
          src: asset.element.poster || asset.src,
          width: asset.element.width || 320,
          height: asset.element.height || 240,
          name: asset.id,
          type: 'asset',
          value: '#' + asset.id,
          assetType: 'video'
        }]);
      } else if (asset.tagName === 'audio') {
        // Handle audio (show a generic audio icon or waveform if available)
        setAssetsImages(prev => [...prev, {
          id: asset.id,
          src: '', // No thumbnail for audio
          width: 100,
          height: 100,
          name: asset.id,
          type: 'asset',
          value: '#' + asset.id,
          assetType: 'audio'
        }]);
      }
    });
  }, []);

  const onAssetsImagesLoad = useCallback(() => {
    generateFromRegistry();
  }, [generateFromRegistry]);

  useEffect(() => {
    generateFromAssets();
    
    // Always try to load registry assets
    if (AFRAME.INSPECTOR?.assetsLoader) {
      if (!AFRAME.INSPECTOR.assetsLoader.hasLoaded) {
        AFRAME.INSPECTOR.assetsLoader.load();
      }
      // Always generate from registry, even if already loaded
      generateFromRegistry();
    }
  }, [generateFromAssets, generateFromRegistry]);

  useEffect(() => {
    Events.on('assetsimagesload', onAssetsImagesLoad);
    return () => Events.off('assetsimagesload', onAssetsImagesLoad);
  }, [onAssetsImagesLoad]);

  useEffect(() => {
    const handleAssetAdded = () => {
      generateFromAssets();
    };

    Events.on('assetadd', handleAssetAdded);
    Events.on('assetremove', handleAssetAdded);
    
    return () => {
      Events.off('assetadd', handleAssetAdded);
      Events.off('assetremove', handleAssetAdded);
    };
  }, [generateFromAssets]);

  const handleDragStart = (e, asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetType: asset.type,
      value: asset.value,
      src: asset.src,
      id: asset.id
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div id="assetPanel" className="asset-panel">
      {assetsImages.length > 0 && (
        <div className="asset-section">
          <h4 className="asset-section-title">Scene Assets</h4>
          <div className="asset-grid">
            {assetsImages.map((image) => (
              <div 
                key={image.id} 
                className="asset-item"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, image)}
              >
                {image.assetType === 'video' ? (
                  <div className="asset-thumbnail video-placeholder">
                    <video 
                      src={image.src} 
                      style={{width: '100%', height: '60px', objectFit: 'cover'}}
                      muted
                    />
                    <div className="video-overlay">▶</div>
                  </div>
                ) : image.assetType === 'audio' ? (
                  <div className="asset-thumbnail audio-placeholder">
                    <div className="audio-icon">♪</div>
                  </div>
                ) : (
                  <img
                    src={image.src}
                    alt={image.name}
                    className="asset-thumbnail"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="asset-info">
                  <span className="asset-name">{image.name}</span>
                  <span className="asset-details">
                    {image.assetType === 'video' && 'Video • '}
                    {image.assetType === 'audio' && 'Audio • '}
                    {image.width && image.height ? `${image.width}×${image.height}` : 'Asset'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="asset-section">
        <h4 className="asset-section-title">Registry Assets</h4>
        <div className="asset-grid">
          {registryImages.map((image) => (
            <div 
              key={image.id} 
              className="asset-item"
              draggable="true"
              onDragStart={(e) => handleDragStart(e, image)}
            >
              <img
                src={image.thumbSrc}
                alt={image.name}
                className="asset-thumbnail"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="asset-info">
                <span className="asset-name">{image.name}</span>
                <span className="asset-details">
                  {image.width}×{image.height}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

AssetPanel.propTypes = {
  scene: PropTypes.object.isRequired
};

export default AssetPanel;