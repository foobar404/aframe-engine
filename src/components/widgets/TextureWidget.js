import React from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';

function getUrlFromId(assetId) {
  return (
    assetId.length > 1 &&
    document.querySelector(assetId) &&
    document.querySelector(assetId).getAttribute('src')
  );
}

function GetFilename(url) {
  if (url) {
    var m = url.toString().match(/.*\/(.+?)\./);
    if (m && m.length > 1) {
      return m[1];
    }
  }
  return '';
}

function insertNewAsset(type, id, src) {
  var element = null;
  switch (type) {
    case 'img':
      {
        element = document.createElement('img');
        element.id = id;
        element.src = src;
      }
      break;
  }
  if (element) {
    document.getElementsByTagName('a-assets')[0].appendChild(element);
  }
}

function insertOrGetImageAsset(src) {
  var id = GetFilename(src);
  // Search for already loaded asset by src
  var element = document.querySelector("a-assets > img[src='" + src + "']");

  if (element) {
    id = element.id;
  } else {
    // Check if first char of the ID is a number (Non a valid ID)
    // In that case a 'i' preffix will be added
    if (!isNaN(parseInt(id[0], 10))) {
      id = 'i' + id;
    }
    if (document.getElementById(id)) {
      var i = 1;
      while (document.getElementById(id + '_' + i)) {
        i++;
      }
      id += '_' + i;
    }
    insertNewAsset('img', id, src);
  }

  return id;
}

export default function TextureWidget({ id, name, onChange, value = '' }) {
  const [currentValue, setCurrentValue] = React.useState(value || '');
  const [valueType, setValueType] = React.useState(null);
  const [url, setUrl] = React.useState(null);
  const canvasRef = React.useRef();

  const setValue = React.useCallback((newValue) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function paintPreviewWithImage(image) {
      var filename = image.src.replace(/^.*[\\/]/, '');
      if (image !== undefined && image.width > 0) {
        canvas.title = filename;
        var scale = canvas.width / image.width;
        context.drawImage(
          image,
          0,
          0,
          image.width * scale,
          image.height * scale
        );
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function paintPreview(texture) {
      var image = texture.image;
      paintPreviewWithImage(image);
    }

    function getTextureFromSrc(src) {
      for (var hash in AFRAME.INSPECTOR.sceneEl.systems.material.textureCache) {
        // The key in textureCache is not always a json.
        // For example <a-videosphere src="#video"> gives a "video" key in textureCache.
        // So we check for '{' before using JSON.parse here.
        if (hash[0] === '{' && JSON.parse(hash).src === src) {
          return AFRAME.INSPECTOR.sceneEl.systems.material.textureCache[hash];
        }
      }
      return null;
    }

    var textureUrl;
    var isAssetHash = newValue[0] === '#';
    var isAssetImg = newValue instanceof HTMLImageElement;
    var isAssetVideo = newValue instanceof HTMLVideoElement;
    var isAssetCanvas = newValue instanceof HTMLCanvasElement;
    var isAssetElement = isAssetImg || isAssetVideo || isAssetCanvas;

    if (isAssetCanvas) {
      textureUrl = null;
    } else if (isAssetImg || isAssetVideo) {
      textureUrl = newValue.src;
    } else if (isAssetHash) {
      textureUrl = getUrlFromId(newValue);
    } else {
      textureUrl = AFRAME.utils.srcLoader.parseUrl(newValue);
    }

    var texture = getTextureFromSrc(newValue);
    var currentValueType = null;
    currentValueType = isAssetElement || isAssetHash ? 'asset' : 'url';
    if (!isAssetVideo && texture) {
      texture.then(paintPreview);
    } else if (!isAssetVideo && textureUrl) {
      // The image still didn't load
      var image = new Image();
      image.addEventListener(
        'load',
        () => {
          paintPreviewWithImage(image);
        },
        false
      );
      image.src = textureUrl;
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    setCurrentValue(isAssetElement ? '#' + newValue.id : newValue);
    setValueType(currentValueType);
    setUrl(textureUrl);
  }, []);

  React.useEffect(() => {
    setValue(value || '');
  }, [value, setValue]);

  React.useEffect(() => {
    // This will be triggered typically when the element is changed directly with
    // element.setAttribute.
    if (!Object.is(value, currentValue)) {
      setValue(value);
    }
  }, [value, currentValue, setValue]);

  const notifyChanged = React.useCallback((newValue) => {
    if (onChange) {
      onChange(name, newValue);
    }
    setCurrentValue(newValue);
  }, [onChange, name]);

  const handleChange = React.useCallback((e) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    notifyChanged(newValue);
  }, [notifyChanged]);

  const removeMap = React.useCallback(() => {
    setValue('');
    notifyChanged('');
  }, [setValue, notifyChanged]);

  const openDialog = React.useCallback(() => {
    Events.emit('opentexturesmodal', currentValue, (image) => {
      if (!image) {
        return;
      }
      var newValue = image.value;
      if (image.type !== 'asset') {
        var assetId = insertOrGetImageAsset(image.src);
        newValue = '#' + assetId;
      }

      if (onChange) {
        onChange(name, newValue);
      }

      setValue(newValue);
    });
  }, [currentValue, onChange, name, setValue]);

  let hint = '';
  if (currentValue) {
    if (valueType === 'asset') {
      hint = 'Asset ID: ' + currentValue;
      if (url !== null) {
        hint += '\nURL: ' + url;
      }
    } else {
      hint = 'URL: ' + currentValue;
    }
  }

  return (
    <span className="texture">
      <input
        id={id}
        className="map_value string"
        type="text"
        title={hint}
        value={currentValue}
        onChange={handleChange}
      />
      <canvas
        ref={canvasRef}
        width="32"
        height="16"
        title={hint}
        onClick={openDialog}
      />
    </span>
  );
}
