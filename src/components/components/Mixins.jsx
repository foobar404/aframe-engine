import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Events from '../../lib/Events';

function Mixin({ entity }) {
  const getMixinValue = () => {
    return (entity.getAttribute('mixin') || '')
      .split(/\s+/g)
      .filter((v) => !!v);
  };

  const [mixins, setMixins] = useState(getMixinValue());

  useEffect(() => {
    setMixins(getMixinValue());
  }, [entity]);

  const getMixinOptions = useCallback(() => {
    const mixinIds = entity.mixinEls.map(function (mixin) {
      return mixin.id;
    });

    return Array.prototype.slice
      .call(document.querySelectorAll('a-mixin'))
      .filter(function (mixin) {
        return mixinIds.indexOf(mixin.id) === -1;
      })
      .sort()
      .map(function (mixin) {
        return mixin.id;
      });
  }, [entity]);

  const updateMixins = useCallback((selectedValues) => {
    setMixins(selectedValues);
    const mixinStr = selectedValues.join(' ');
    entity.setAttribute('mixin', mixinStr);

    Events.emit('entityupdate', {
      component: 'mixin',
      entity: entity,
      property: '',
      value: mixinStr
    });
  }, [entity]);

  const handleChange = (e) => {
    const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
    updateMixins(selectedValues);
  };

  return (
    <div className="mixinOptions">
      <div className="propertyRow">
        <span className="text">mixins</span>
        <select onChange={handleChange} className="w-full">
          {getMixinOptions().map((mixinId) => (
            <option key={mixinId}
              value={mixinId}
              selected={mixins.includes(mixinId)}>
              {mixinId}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

Mixin.propTypes = {
  entity: PropTypes.object.isRequired
};

export default Mixin;
