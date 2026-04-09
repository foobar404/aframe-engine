import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { PropertyRow } from './PropertyRow';
import { Collapsible } from '../Collapsible';
import { Events } from '../../lib/Events';

export function PrimitiveComponents({ entity }) {
	const [, setUpdateKey] = useState(0);

	useEffect(() => {
		const handler = (detail) => {
			if (detail && detail.entity && detail.entity !== entity) {
				return;
			}
			setUpdateKey(prev => prev + 1);
		};

		Events.on('entityupdate', handler);
		Events.on('componentadd', handler);
		Events.on('componentremove', handler);

		return () => {
			Events.off('entityupdate', handler);
			Events.off('componentadd', handler);
			Events.off('componentremove', handler);
		};
	}, [entity]);

	if (!entity) return null;

	const tagName = entity.tagName.toLowerCase();
	const primitive = AFRAME.primitives?.primitives?.[tagName];
	const primitiveMappings = primitive?.mappings || primitive?.mapping;
	if (!primitiveMappings) return null;

	const seen = new Set();
	const rows = Object.keys(primitiveMappings).reduce((acc, primitiveProp) => {
		const mappedPath = primitiveMappings[primitiveProp];
		if (!mappedPath || seen.has(mappedPath)) return acc;
		seen.add(mappedPath);

		const [componentName, ...propertyPath] = mappedPath.split('.');
		if (!componentName || propertyPath.length === 0) return acc;

		const propertyName = propertyPath.join('.');
		const component = entity.components?.[componentName];
		if (!component || !component.schema || !component.schema[propertyName]) return acc;

		acc.push({
			key: `${primitiveProp}:${mappedPath}`,
			name: `${componentName}.${propertyName}`,
			schema: component.schema[propertyName],
			data: component.data ? component.data[propertyName] : undefined
		});
		return acc;
	}, []);

	if (rows.length === 0) return null;

	return (
		<Collapsible>
			<div className="componentHeader collapsible-header">
				<span className="componentTitle">Primitive</span>
			</div>
			<div className="collapsible-content">
				{rows.map(({ key, name, schema, data }) => (
					<PropertyRow
						key={key}
						name={name}
						schema={schema}
						data={data}
						isSingle={false}
						entity={entity}
					/>
				))}
			</div>
		</Collapsible>
	);
}

PrimitiveComponents.propTypes = {
	entity: PropTypes.object
};
