/**
 * Bridge utilities for rendering @mieweb/ui React components into jQuery
 * elements used by the existing DataVis toolbar infrastructure.
 *
 * @module util/react_bridge
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@mieweb/ui/components/Button';
import '@mieweb/ui/styles.css';
import jQuery from 'jquery';

/**
 * Renders a Font Awesome icon as a React element, suitable for passing
 * to the Button component's leftIcon or rightIcon props.
 *
 * @param {object} props
 * @param {string} props.icon  Font Awesome class name (e.g. 'fa-columns').
 */
function FAIcon(props) {
	return React.createElement('i', {
		className: 'fa ' + props.icon,
		'aria-hidden': 'true',
		style: { marginRight: '0.25em' }
	});
}

/**
 * Creates a @mieweb/ui Button rendered into a jQuery-wrapped container element.
 *
 * The returned jQuery element can be appended to a toolbar the same way as a
 * regular jQuery button.  Call `updateReactButton` to change props later, and
 * `unmountReactButton` when the element is removed from the DOM.
 *
 * @param {object} opts
 * @param {string}   opts.text      Button label text.
 * @param {string}   [opts.icon]    Font Awesome icon class (e.g. 'fa-columns').
 * @param {string}   [opts.title]   Native tooltip text.
 * @param {string}   [opts.variant] Button variant: 'primary', 'secondary',
 *                                  'ghost', 'outline', 'danger', 'link'.
 *                                  Defaults to 'secondary'.
 * @param {string}   [opts.size]    Button size: 'sm', 'md', 'lg', 'icon'.
 *                                  Defaults to 'sm'.
 * @param {boolean}  [opts.disabled] Whether the button is disabled.
 * @param {function} [opts.onClick] Click event handler.
 * @returns {jQuery} jQuery-wrapped container element.
 */
function makeReactButton(opts) {
	var container = document.createElement('span');
	container.style.display = 'inline-block';
	container.style.verticalAlign = 'middle';

	var reactRoot = createRoot(container);

	var iconElement = opts.icon
		? React.createElement(FAIcon, { icon: opts.icon })
		: null;

	reactRoot.render(
		React.createElement(Button, {
			variant: opts.variant || 'secondary',
			size: opts.size || 'sm',
			title: opts.title || undefined,
			onClick: opts.onClick || undefined,
			leftIcon: iconElement,
			disabled: opts.disabled || false
		}, opts.text)
	);

	var $el = jQuery(container);
	$el.data('_reactRoot', reactRoot);
	$el.data('_reactOpts', opts);

	return $el;
}

/**
 * Re-renders a React button previously created by `makeReactButton` with
 * updated props.  Anything not specified in `newOpts` falls back to the
 * original options.
 *
 * @param {jQuery}  $el      The jQuery element returned by `makeReactButton`.
 * @param {object}  newOpts  Partial set of options to merge with the originals.
 */
function updateReactButton($el, newOpts) {
	var reactRoot = $el.data('_reactRoot');
	if (reactRoot == null) {
		return;
	}

	var opts = jQuery.extend({}, $el.data('_reactOpts'), newOpts);
	$el.data('_reactOpts', opts);

	var iconElement = opts.icon
		? React.createElement(FAIcon, { icon: opts.icon })
		: null;

	reactRoot.render(
		React.createElement(Button, {
			variant: opts.variant || 'secondary',
			size: opts.size || 'sm',
			title: opts.title || undefined,
			onClick: opts.onClick || undefined,
			leftIcon: iconElement,
			disabled: opts.disabled || false
		}, opts.text)
	);
}

/**
 * Unmounts a React button previously created by `makeReactButton`, cleaning
 * up the React root.
 *
 * @param {jQuery} $el  The jQuery element returned by `makeReactButton`.
 */
function unmountReactButton($el) {
	var reactRoot = $el.data('_reactRoot');
	if (reactRoot != null) {
		reactRoot.unmount();
		$el.removeData('_reactRoot');
		$el.removeData('_reactOpts');
	}
}

export { makeReactButton, updateReactButton, unmountReactButton };
