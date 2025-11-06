import React from 'react';
import PropTypes from 'prop-types';
import { FaCamera, FaCube, FaFont, FaLightbulb, FaObjectGroup, FaCircle, FaMinus, FaLayerGroup, FaCopy, FaUser, FaGlobe, FaBox, FaSquare, FaCaretUp, FaDotCircle, FaRing, FaPlayCircle, FaVideo, FaVolumeUp, FaLink, FaImage, FaFileVideo } from 'react-icons/fa';

function EntityRepresentation({ entity, onDoubleClick }) {
  if (!entity) {
    return null;
  }

  const iconMap = {
    camera: { icon: FaCamera, color: '#ff6b6b' },
    mesh: { icon: FaCube, color: '#4ecdc4' },
    light: { icon: FaLightbulb, color: '#ffd93d' },
    text: { icon: FaFont, color: '#6c5ce7' },
    group: { icon: FaObjectGroup, color: '#a29bfe' },
    sprite: { icon: FaCircle, color: '#fd79a8' },
    points: { icon: FaCircle, color: '#00b894' },
    line: { icon: FaMinus, color: '#e17055' },
    lineloop: { icon: FaMinus, color: '#e17055' },
    linesegments: { icon: FaMinus, color: '#e17055' },
    lod: { icon: FaLayerGroup, color: '#fdcb6e' },
    instancedmesh: { icon: FaCopy, color: '#00cec9' },
    skinnedmesh: { icon: FaUser, color: '#ff7675' },
    default: { icon: FaBox, color: '#95a5a6' },
    scene: { icon: FaGlobe, color: '#9b59b6' },
    // A-Frame primitives
    'a-box': { icon: FaCube, color: '#4ecdc4' },
    'a-camera': { icon: FaCamera, color: '#ff6b6b' },
    'a-circle': { icon: FaDotCircle, color: '#fd79a8' },
    'a-cone': { icon: FaCaretUp, color: '#e17055' },
    'a-cursor': { icon: FaDotCircle, color: '#00b894' },
    'a-curvedimage': { icon: FaImage, color: '#6c5ce7' },
    'a-cylinder': { icon: FaSquare, color: '#a29bfe' },
    'a-dodecahedron': { icon: FaCube, color: '#fdcb6e' },
    'a-gltf-model': { icon: FaCube, color: '#00cec9' },
    'a-icosahedron': { icon: FaCube, color: '#ff7675' },
    'a-image': { icon: FaImage, color: '#6c5ce7' },
    'a-light': { icon: FaLightbulb, color: '#ffd93d' },
    'a-link': { icon: FaLink, color: '#9b59b6' },
    'a-obj-model': { icon: FaCube, color: '#95a5a6' },
    'a-octahedron': { icon: FaCube, color: '#4ecdc4' },
    'a-plane': { icon: FaSquare, color: '#a29bfe' },
    'a-ring': { icon: FaRing, color: '#fd79a8' },
    'a-sky': { icon: FaGlobe, color: '#9b59b6' },
    'a-sound': { icon: FaVolumeUp, color: '#e17055' },
    'a-sphere': { icon: FaCircle, color: '#00b894' },
    'a-tetrahedron': { icon: FaCube, color: '#fdcb6e' },
    'a-text': { icon: FaFont, color: '#6c5ce7' },
    'a-torus': { icon: FaRing, color: '#fd79a8' },
    'a-torus-knot': { icon: FaRing, color: '#e17055' },
    'a-triangle': { icon: FaPlayCircle, color: '#00cec9' },
    'a-video': { icon: FaVideo, color: '#ff7675' },
    'a-videosphere': { icon: FaFileVideo, color: '#95a5a6' }
  };

  // Find the appropriate icon, prioritizing A-Frame primitives over Three.js object types
  let matchedIcon = null;
  
  // First, check for A-Frame primitives by tag name
  const primitiveMatch = Object.entries(iconMap).find(([type]) => 
    type.startsWith('a-') && entity.tagName && entity.tagName.toLowerCase() === type
  );
  
  if (primitiveMatch) {
    matchedIcon = primitiveMatch[1];
  } else {
    // If no A-Frame primitive match, check for Three.js object types and special cases
    const objectMatch = Object.entries(iconMap).find(([type]) => {
      if (type === 'scene') {
        return entity.tagName && entity.tagName.toLowerCase() === 'a-scene';
      }
      if (type === 'default') {
        return entity.tagName && entity.tagName.toLowerCase() === 'a-entity' && 
               !entity.getObject3D('mesh') && !entity.getObject3D('camera') && 
               !entity.getObject3D('light') && !entity.getObject3D('text');
      }
      return entity.getObject3D(type);
    });
    
    if (objectMatch) {
      matchedIcon = objectMatch[1];
    }
  }

  const icons = matchedIcon ? [<matchedIcon.icon key="entity-icon" style={{ color: matchedIcon.color, marginRight: '4px' }} />] : [];

  return (
    <span className="entityPrint flex" onDoubleClick={onDoubleClick}>
      {icons.length > 0 && <span className="entityIcons flex">{icons}</span>}
      <span>{entity.id || entity.localName}</span>
    </span>
  );
}

export default EntityRepresentation;
