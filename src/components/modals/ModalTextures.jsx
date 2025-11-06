import React, {useState, useRef, useEffect, useCallback} from 'react';
import PropTypes from 'prop-types';
import { FaSearch } from 'react-icons/fa';
import Events from '../../lib/Events';
import Modal from './Modal';
import { insertNewAsset } from '../../lib/assetsUtils';

function getFilename(url, converted = false) {
  var filename = url.split('/').pop();
  if (converted) {
    filename = getValidId(filename);
  }
  return filename;
}

function isValidId(id) {
  // The correct re should include : and . but A-frame seems to fail while accessing them
  var re = /^[A-Za-z]+[\w-]*$/;
  return re.test(id);
}

function getValidId(name) {
  // info.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '')
  return name
    .split('.')
    .shift()
    .replace(/\s/, '-')
    .replace(/^\d+\s*/, '')
    .replace(/[\W]/, '')
    .toLowerCase();
}

function ModalTextures({ isOpen: initialIsOpen, onClose, selectedTexture }) {
  const [filterText, setFilterText] = useState('');
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [assetsImages, setAssetsImages] = useState([]);
  const [registryImages, setRegistryImages] = useState([]);
  const [addNewDialogOpened, setAddNewDialogOpened] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [preview, setPreview] = useState({
    width: 0,
    height: 0,
    src: '',
    id: '',
    name: '',
    filename: '',
    type: '',
    value: '',
    loaded: false
  });

  const imageName = useRef();
  const previewRef = useRef();
  const registryGallery = useRef();

  const generateFromRegistry = useCallback(() => {
    AFRAME.INSPECTOR.assetsLoader.images.forEach((imageData) => {
      var image = new Image();
      image.addEventListener('load', () => {
        setRegistryImages(prev => [...prev, {
          id: imageData.id,
          src: imageData.fullPath,
          width: imageData.width,
          height: imageData.height,
          name: imageData.id,
          type: 'registry',
          tags: imageData.tags,
          value: 'url(' + imageData.fullPath + ')'
        }]);
      });
      image.src = imageData.fullThumbPath;
    });
  }, []);

  const generateFromAssets = useCallback(() => {
    setAssetsImages([]);
    Array.prototype.slice
      .call(document.querySelectorAll('a-assets img'))
      .forEach((asset) => {
        var image = new Image();
        image.addEventListener('load', () => {
          setAssetsImages(prev => [...prev, {
            id: asset.id,
            src: image.src,
            width: image.width,
            height: image.height,
            name: asset.id,
            type: 'asset',
            value: '#' + asset.id
          }]);
        });
        image.src = asset.src;
      });
  }, []);

  const onAssetsImagesLoad = useCallback(() => {
    generateFromRegistry();
  }, [generateFromRegistry]);

  const onCloseModal = useCallback((value) => {
    if (onClose) {
      onClose(value);
    }
  }, [onClose]);

  const selectTexture = useCallback((value) => {
    if (onClose) {
      onClose(value);
    }
  }, [onClose]);

  const onNewUrl = useCallback((event) => {
    if (event.keyCode !== 13) {
      return;
    }

    function onImageLoaded() {
      var src = previewRef.current.src;
      setPreview({
        width: previewRef.current.naturalWidth,
        height: previewRef.current.naturalHeight,
        src: src,
        id: '',
        name: getFilename(src, true),
        filename: getFilename(src),
        type: 'new',
        loaded: true,
        value: 'url(' + src + ')'
      });
      previewRef.current.removeEventListener('load', onImageLoaded);
    }
    previewRef.current.addEventListener('load', onImageLoaded);
    previewRef.current.src = event.target.value;

    imageName.current.focus();
  }, []);

  const isValidAsset = useCallback(() => {
    let validUrl = isValidId(preview.name);
    let validAsset = preview.loaded && validUrl;
    return validAsset;
  }, [preview]);

  const clear = useCallback(() => {
    setPreview({
      width: 0,
      height: 0,
      src: '',
      id: '',
      filename: '',
      name: '',
      type: '',
      loaded: false,
      value: ''
    });
    setNewUrl('');
  }, []);

  const addNewAsset = useCallback(() => {
    insertNewAsset(
      'img',
      preview.name,
      preview.src,
      true,
      function () {
        generateFromAssets();
        // Select the newly added texture
        selectTexture({
          id: preview.name,
          src: preview.src,
          width: preview.width,
          height: preview.height,
          name: preview.name,
          type: 'asset',
          value: '#' + preview.name
        });
        setAddNewDialogOpened(false);
        clear();
      }
    );
  }, [preview, generateFromAssets, selectTexture, clear]);

  const onNameKeyUp = useCallback((event) => {
    if (event.keyCode === 13 && isValidAsset()) {
      addNewAsset();
    }
  }, [isValidAsset, addNewAsset]);

  const onNameChanged = useCallback((event) => {
    setPreview(prev => ({ ...prev, name: event.target.value }));
  }, []);

  const toggleNewDialog = useCallback(() => {
    setAddNewDialogOpened(prev => !prev);
  }, []);

  const onUrlChange = useCallback((e) => {
    setNewUrl(e.target.value);
  }, []);

  const onChangeFilter = useCallback((e) => {
    setFilterText(e.target.value);
  }, []);

  const renderRegistryImages = useCallback(() => {
    let selectSample = function (image) {
      setPreview({
        width: image.width,
        height: image.height,
        src: image.src,
        id: '',
        name: getFilename(image.name, true),
        filename: getFilename(image.src),
        type: 'registry',
        loaded: true,
        value: 'url(' + image.src + ')'
      });
      imageName.current.focus();
    };

    var filterTextUpper = filterText.toUpperCase();

    return registryImages
      .filter((image) => {
        return (
          image.id.toUpperCase().indexOf(filterTextUpper) > -1 ||
          image.name.toUpperCase().indexOf(filterTextUpper) > -1 ||
          image.tags.indexOf(filterTextUpper) > -1
        );
      })
      .map(function (image) {
        let imageClick = () => selectSample(image);
        return (
          <li key={image.src} onClick={imageClick}>
            <img width="155px" height="155px" src={image.src} />
            <div className="detail">
              <span className="title">{image.name}</span>
              <span>{getFilename(image.src)}</span>
              <span>
                {image.width} x {image.height}
              </span>
            </div>
          </li>
        );
      });
  }, [filterText, registryImages]);

  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  useEffect(() => {
    Events.on('assetsimagesload', onAssetsImagesLoad);
    generateFromAssets();
    return () => Events.off('assetsimagesload', onAssetsImagesLoad);
  }, [onAssetsImagesLoad, generateFromAssets]);

  useEffect(() => {
    if (isOpen && !AFRAME.INSPECTOR.assetsLoader.hasLoaded) {
      AFRAME.INSPECTOR.assetsLoader.load();
    }
  }, [isOpen]);

  let validUrl = isValidId(preview.name);
  let validAsset = isValidAsset();

  return (
    <Modal
      id="textureModal"
      title="Textures"
      isOpen={isOpen}
      onClose={onCloseModal}
      closeOnClickOutside={false}
    >
      <div>
        <div className="newimage">
          <div className="new_asset_options">
            <span>Load a new texture from one of these sources:</span>
            <ul>
              <li>
                <span>From URL (and press Enter):</span>{' '}
                <input
                  type="text"
                  className="imageUrl"
                  value={newUrl}
                  onChange={onUrlChange}
                  onKeyUp={onNewUrl}
                />
              </li>
              <li>
                <span>From assets registry: </span>
                <div className="assets search">
                  <input
                    placeholder="Filter..."
                    value={filterText}
                    onChange={onChangeFilter}
                  />
                  <FaSearch />
                </div>
                <ul ref={registryGallery} className="gallery">
                  {renderRegistryImages()}
                </ul>
              </li>
            </ul>
          </div>
          <div className="preview">
            Name:{' '}
            <input
              ref={imageName}
              className={
                preview.name.length > 0 && !validUrl ? 'error' : ''
              }
              type="text"
              value={preview.name}
              onChange={onNameChanged}
              onKeyUp={onNameKeyUp}
            />
            <img
              ref={previewRef}
              width="155px"
              height="155px"
              src={preview.src}
              style={{ visibility: preview.src ? 'visible' : 'hidden' }}
            />
            {preview.loaded ? (
              <div className="detail">
                <span className="title" title={preview.filename}>
                  {preview.filename}
                </span>
                <br />
                <span>
                  {preview.width} x {preview.height}
                </span>
              </div>
            ) : (
              <span />
            )}
            <br />
            <button disabled={!validAsset} onClick={addNewAsset}>
              LOAD THIS TEXTURE
            </button>
          </div>
        </div>
      </div>
      <div className={addNewDialogOpened ? 'hide' : ''}>
        <ul className="gallery">
          {assetsImages
            .sort(function (a, b) {
              return a.id > b.id;
            })
            .map(function (image) {
              let textureClick = () => selectTexture(image);
              var selectedClass =
                selectedTexture === '#' + image.id ? 'selected' : '';
              return (
                <li
                  key={image.id}
                  onClick={textureClick}
                  className={selectedClass}
                >
                  <img width="155px" height="155px" src={image.src} />
                  <div className="detail">
                    <span className="title">{image.name}</span>
                    <span>{getFilename(image.src)}</span>
                    <span>
                      {image.width} x {image.height}
                    </span>
                  </div>
                </li>
              );
            })}
        </ul>
      </div>
    </Modal>
  );
}

ModalTextures.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  selectedTexture: PropTypes.string
};

export default ModalTextures;
