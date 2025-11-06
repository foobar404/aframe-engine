import React from 'react';
import PropTypes from 'prop-types';

function AssetPanel({ scene }) {
  const getAssets = () => {
    const assets = [];
    const assetElements = scene.querySelectorAll('a-assets > *');
    assetElements.forEach((el) => {
      assets.push({
        id: el.id,
        tagName: el.tagName.toLowerCase(),
        src: el.getAttribute('src') || el.getAttribute('value') || ''
      });
    });
    return assets;
  };

  const assets = getAssets();

  return (
    <div id="assetPanel" className="asset-panel">
      {/* <h3>Assets</h3> */}
      <ul>
        {assets.map((asset) => (
          <li key={asset.id}>
            {asset.tagName}: {asset.id} {asset.src && `(${asset.src})`}
          </li>
        ))}
      </ul>
    </div>
  );
}

AssetPanel.propTypes = {
  scene: PropTypes.object.isRequired
};

export default AssetPanel;