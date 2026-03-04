/**
 * React wrapper components for DataVis.
 *
 * Provides <DVSource> and <DVGrid> components that declaratively create
 * and manage DataVis Source, ComputedView, and Grid instances.
 *
 * Basic usage:
 *
 *   <DVSource type="http" url="/data.json">
 *     <DVGrid title="My Grid" columns={['col1', 'col2']} />
 *   </DVSource>
 *
 * @module components/react
 */

import React, { createContext, useContext, useEffect, useId, useRef } from 'react';
import { Source } from '../source.js';
import { ComputedView } from '../computed_view.js';
import { Grid } from '../grid.js';

// Context ----------------------------------------------------------------- //

/**
 * React context used to pass the ComputedView from <DVSource> down to
 * child components like <DVGrid>.
 */
var SourceContext = createContext(null);

// <DVSource> -------------------------------------------------------------- //

/**
 * Creates a DataVis Source and ComputedView, providing them to children via
 * context.  The Source is recreated when `type` or `url` change.
 *
 * @param {object} props
 * @param {string} props.type   Source type: 'http', 'local', or 'file'.
 * @param {string} [props.url]  URL to fetch data from (when type is 'http').
 * @param {React.ReactNode} props.children
 */
function DVSource(props) {
	var type = props.type;
	var url = props.url;
	var children = props.children;

	var viewRef = useRef(null);

	// Create (or recreate) the Source + ComputedView when config changes.
	if (viewRef.current === null ||
			viewRef.current._dvType !== type ||
			viewRef.current._dvUrl !== url) {
		var source = new Source({ type: type, url: url });
		var view = new ComputedView(source);
		// Stash config so we can detect changes on re-render.
		view._dvType = type;
		view._dvUrl = url;
		viewRef.current = view;
	}

	return (
		<SourceContext.Provider value={viewRef.current}>
			{children}
		</SourceContext.Provider>
	);
}

// <DVGrid> ---------------------------------------------------------------- //

/**
 * Renders a DataVis Grid into a container div.  Must be a descendant of
 * <DVSource> so that a ComputedView is available via context.
 *
 * @param {object} props
 * @param {string} [props.id]             DOM id for the grid container.  Auto-generated if omitted.
 * @param {string} [props.title]          Title shown in the grid's title bar.
 * @param {boolean} [props.showControls]  Whether to show grid controls.  Defaults to false.
 * @param {Array} [props.columns]         Column definitions (strings or objects).
 * @param {object} [props.features]       Table feature flags (limit, rowSelect, etc.).
 * @param {string} [props.className]      Additional CSS class(es) for the container div.
 * @param {object} [props.style]          Inline styles for the container div.
 */
function DVGrid(props) {
	var id = props.id;
	var title = props.title;
	var showControls = props.showControls;
	var columns = props.columns;
	var features = props.features;
	var className = props.className;
	var style = props.style;

	var computedView = useContext(SourceContext);
	var containerRef = useRef(null);
	var gridRef = useRef(null);
	var reactId = useId();

	// Fall back to a generated id when none is provided.
	var domId = id || 'dv-grid-' + reactId.replace(/:/g, '');

	// Build the Grid once the container div is in the DOM.
	useEffect(function () {
		if (containerRef.current === null || computedView === null) {
			return;
		}

		// Teardown previous grid instance if the effect re-fires.
		if (gridRef.current !== null) {
			containerRef.current.innerHTML = '';
			gridRef.current = null;
		}

		var defn = {
			id: domId,
			computedView: computedView,
			table: {}
		};

		if (columns !== undefined) {
			defn.table.columns = columns;
		}

		if (features !== undefined) {
			defn.table.features = features;
		}

		var opts = {};

		if (title !== undefined) {
			opts.title = title;
		}

		if (showControls !== undefined) {
			opts.showControls = showControls;
		}

		gridRef.current = new Grid(defn, opts);

		return function () {
			// Cleanup: clear the container so a fresh Grid can be created if
			// React re-mounts this component.
			if (containerRef.current !== null) {
				containerRef.current.innerHTML = '';
			}
			gridRef.current = null;
		};
	}, [computedView, domId, title, showControls, columns, features]);

	return (
		<div
			id={domId}
			ref={containerRef}
			className={className}
			style={style}
		/>
	);
}

export { DVSource, DVGrid, SourceContext };
