export function insertNewAsset(
  type,
  id,
  src,
  anonymousCrossOrigin,
  onLoadedCallback
) {
  var element = null;
  switch (type) {
    case 'img':
      {
        element = document.createElement('img');
        element.id = id;
        element.src = src;
        if (anonymousCrossOrigin) {
          element.crossOrigin = 'anonymous';
        }
      }
      break;
  }

  if (element) {
    element.onload = function () {
      if (onLoadedCallback) {
        onLoadedCallback();
      }
    };
    
    // Find or create a-assets element
    var assetsElement = document.getElementsByTagName('a-assets')[0];
    if (!assetsElement) {
      // If no a-assets element exists, create one and append to scene
      assetsElement = document.createElement('a-assets');
      var sceneElement = document.getElementsByTagName('a-scene')[0];
      if (sceneElement) {
        sceneElement.appendChild(assetsElement);
      } else {
        console.error('No a-scene element found to append a-assets to');
        return;
      }
    }
    
    assetsElement.appendChild(element);
  }
}
