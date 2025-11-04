import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import Events from '../../lib/Events';

function Mixin({ entity }) {
  const getMixinValue = () => {
    return (entity.getAttribute('mixin') || '')
      .split(/\s+/g)
      .filter((v) => !!v)
      .map((v) => ({ label: v, value: v }));
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
        return { value: mixin.id, label: mixin.id };
      });
  }, [entity]);

  const updateMixins = useCallback((value) => {
    setMixins(value);
    const mixinStr = value.map((v) => v.value).join(' ');
    entity.setAttribute('mixin', mixinStr);

    Events.emit('entityupdate', {
      component: 'mixin',
      entity: entity,
      property: '',
      value: mixinStr
    });
  }, [entity]);

  return (
    <div className="mixinOptions">
      <div className="propertyRow">
        <span className="text">mixins</span>
        <span className="mixinValue">
          <Select
            id="mixinSelect"
            classNamePrefix="select"
            options={getMixinOptions()}
            isMulti
            isClearable={false}
            isSearchable
            placeholder="Add mixin..."
            noOptionsMessage={() => 'No mixins found'}
            onChange={updateMixins}
            value={mixins}
          />
        </span>
      </div>
    </div>
  );
}

Mixin.propTypes = {
  entity: PropTypes.object.isRequired
};

export default Mixin;
