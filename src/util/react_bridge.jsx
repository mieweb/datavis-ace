/**
 * Bridge utilities for rendering @mieweb/ui React components into jQuery
 * elements used by the existing DataVis toolbar infrastructure.
 *
 * @module util/react_bridge
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@mieweb/ui/components/Button';
import { Checkbox } from '@mieweb/ui/components/Checkbox';
import { RadioGroup, Radio } from '@mieweb/ui/components/Radio';
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
 * @param {string}   [opts.className] Additional CSS classes for the button.
 * @param {object}   [opts.attrs]   Extra HTML attributes to spread onto the
 *                                  button element (e.g. data-* attributes).
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

	var buttonProps = jQuery.extend({
		variant: opts.variant || 'secondary',
		size: opts.size || 'sm',
		title: opts.title || undefined,
		onClick: opts.onClick || undefined,
		leftIcon: iconElement,
		disabled: opts.disabled || false,
		className: opts.className || undefined
	}, opts.attrs || {});

	reactRoot.render(
		React.createElement(Button, buttonProps, opts.text)
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

	var buttonProps = jQuery.extend({
		variant: opts.variant || 'secondary',
		size: opts.size || 'sm',
		title: opts.title || undefined,
		onClick: opts.onClick || undefined,
		leftIcon: iconElement,
		disabled: opts.disabled || false,
		className: opts.className || undefined
	}, opts.attrs || {});

	reactRoot.render(
		React.createElement(Button, buttonProps, opts.text)
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

/**
 * Creates a @mieweb/ui Checkbox rendered into a jQuery-wrapped container element.
 *
 * The returned jQuery element can be appended to a toolbar the same way as any
 * jQuery element.  Call `updateReactCheckbox` to change props later (e.g.
 * disabled state).
 *
 * @param {object} opts
 * @param {string}   opts.label     Checkbox label text.
 * @param {boolean}  [opts.checked] Initial checked state.  Defaults to false.
 * @param {boolean}  [opts.disabled] Whether the checkbox is disabled.
 * @param {string}   [opts.size]    Checkbox size: 'sm', 'md', 'lg'.
 *                                  Defaults to 'sm'.
 * @param {function} [opts.onChange] Called with (isChecked) when the user
 *                                  toggles the checkbox.
 * @returns {jQuery} jQuery-wrapped container element.
 */
function makeReactCheckbox(opts) {
	var container = document.createElement('span');
	container.style.display = 'inline-block';
	container.style.verticalAlign = 'middle';

	var reactRoot = createRoot(container);

	var checked = opts.checked != null ? opts.checked : false;

	function renderCheckbox(root, currentOpts, currentChecked) {
		root.render(
			React.createElement(Checkbox, {
				label: currentOpts.label || '',
				checked: currentChecked,
				size: currentOpts.size || 'sm',
				disabled: currentOpts.disabled || false,
				onChange: function () {
					var newChecked = !currentChecked;
					var $el = jQuery(container);
					$el.data('_reactChecked', newChecked);
					renderCheckbox(root, $el.data('_reactOpts'), newChecked);
					if (typeof currentOpts.onChange === 'function') {
						currentOpts.onChange(newChecked);
					}
				}
			})
		);
	}

	renderCheckbox(reactRoot, opts, checked);

	var $el = jQuery(container);
	$el.data('_reactRoot', reactRoot);
	$el.data('_reactOpts', opts);
	$el.data('_reactChecked', checked);

	return $el;
}

/**
 * Re-renders a React checkbox previously created by `makeReactCheckbox` with
 * updated props.  Does not change the checked state unless `newOpts.checked`
 * is explicitly provided.
 *
 * @param {jQuery}  $el      The jQuery element returned by `makeReactCheckbox`.
 * @param {object}  newOpts  Partial set of options to merge.
 */
function updateReactCheckbox($el, newOpts) {
	var reactRoot = $el.data('_reactRoot');
	if (reactRoot == null) {
		return;
	}

	var opts = jQuery.extend({}, $el.data('_reactOpts'), newOpts);
	$el.data('_reactOpts', opts);

	var checked = newOpts.checked != null ? newOpts.checked : $el.data('_reactChecked');
	$el.data('_reactChecked', checked);

	var container = $el[0];

	function renderCheckbox(root, currentOpts, currentChecked) {
		root.render(
			React.createElement(Checkbox, {
				label: currentOpts.label || '',
				checked: currentChecked,
				size: currentOpts.size || 'sm',
				disabled: currentOpts.disabled || false,
				onChange: function () {
					var newChecked = !currentChecked;
					$el.data('_reactChecked', newChecked);
					renderCheckbox(root, $el.data('_reactOpts'), newChecked);
					if (typeof currentOpts.onChange === 'function') {
						currentOpts.onChange(newChecked);
					}
				}
			})
		);
	}

	renderCheckbox(reactRoot, opts, checked);
}

/**
 * Creates a @mieweb/ui RadioGroup rendered into a jQuery-wrapped container
 * element.
 *
 * The returned jQuery element can be appended to a toolbar the same way as
 * any jQuery element.  Call `updateReactRadioButtons` to change props later
 * (e.g. disabled state).
 *
 * @param {object} opts
 * @param {string}   [opts.name]        Name attribute for the radio group.
 * @param {string}   [opts.value]       Currently selected value.
 * @param {string}   [opts.label]       Group label text.
 * @param {boolean}  [opts.disabled]    Whether all radios are disabled.
 * @param {string}   [opts.size]        Radio size: 'sm', 'md', 'lg'.
 *                                      Defaults to 'sm'.
 * @param {string}   [opts.orientation]  'horizontal' or 'vertical'.
 *                                      Defaults to 'horizontal'.
 * @param {Array}    opts.values        Array of {label, value} objects.
 * @param {function} [opts.onValueChange] Called with the newly selected value.
 * @returns {jQuery} jQuery-wrapped container element.
 */
function makeReactRadioButtons(opts) {
	var container = document.createElement('span');
	container.style.display = 'inline-block';
	container.style.verticalAlign = 'middle';

	var reactRoot = createRoot(container);

	var currentValue = opts.value != null ? opts.value : '';

	function renderRadio(root, currentOpts, selectedValue) {
		var children = (currentOpts.values || []).map(function (v) {
			return React.createElement(Radio, {
				key: v.value,
				value: v.value,
				label: v.label
			});
		});

		root.render(
			React.createElement(RadioGroup, {
				name: currentOpts.name || undefined,
				value: selectedValue,
				label: currentOpts.label || undefined,
				disabled: currentOpts.disabled || false,
				size: currentOpts.size || 'sm',
				orientation: currentOpts.orientation || 'horizontal',
				onValueChange: function (newValue) {
					var $el = jQuery(container);
					$el.data('_reactRadioValue', newValue);
					renderRadio(root, $el.data('_reactOpts'), newValue);
					if (typeof currentOpts.onValueChange === 'function') {
						currentOpts.onValueChange(newValue);
					}
				}
			}, children)
		);
	}

	renderRadio(reactRoot, opts, currentValue);

	var $el = jQuery(container);
	$el.data('_reactRoot', reactRoot);
	$el.data('_reactOpts', opts);
	$el.data('_reactRadioValue', currentValue);

	return $el;
}

/**
 * Re-renders a React radio group previously created by
 * `makeReactRadioButtons` with updated props.  Does not change the selected
 * value unless `newOpts.value` is explicitly provided.
 *
 * @param {jQuery}  $el      The jQuery element returned by
 *                            `makeReactRadioButtons`.
 * @param {object}  newOpts  Partial set of options to merge.
 */
function updateReactRadioButtons($el, newOpts) {
	var reactRoot = $el.data('_reactRoot');
	if (reactRoot == null) {
		return;
	}

	var opts = jQuery.extend({}, $el.data('_reactOpts'), newOpts);
	$el.data('_reactOpts', opts);

	var selectedValue = newOpts.value != null ? newOpts.value : $el.data('_reactRadioValue');
	$el.data('_reactRadioValue', selectedValue);

	var container = $el[0];

	function renderRadio(root, currentOpts, val) {
		var children = (currentOpts.values || []).map(function (v) {
			return React.createElement(Radio, {
				key: v.value,
				value: v.value,
				label: v.label
			});
		});

		root.render(
			React.createElement(RadioGroup, {
				name: currentOpts.name || undefined,
				value: val,
				label: currentOpts.label || undefined,
				disabled: currentOpts.disabled || false,
				size: currentOpts.size || 'sm',
				orientation: currentOpts.orientation || 'horizontal',
				onValueChange: function (newValue) {
					$el.data('_reactRadioValue', newValue);
					renderRadio(root, $el.data('_reactOpts'), newValue);
					if (typeof currentOpts.onValueChange === 'function') {
						currentOpts.onValueChange(newValue);
					}
				}
			}, children)
		);
	}

	renderRadio(reactRoot, opts, selectedValue);
}

/**
 * Creates a toggle button rendered as a @mieweb/ui Button that switches
 * between two Font Awesome icons based on its checked state.  Designed as a
 * React replacement for the jQuery `_makeIconCheckbox` pattern.
 *
 * The returned jQuery element exposes `_isChecked()` for backward
 * compatibility with code that reads the toggle state.
 *
 * @param {object} opts
 * @param {string}   opts.onIcon     FA icon class shown when checked.
 * @param {string}   opts.offIcon    FA icon class shown when unchecked.
 * @param {boolean}  [opts.checked]  Initial checked state.  Defaults to false.
 * @param {boolean}  [opts.disabled] Whether the toggle is disabled.
 * @param {string}   [opts.title]    Tooltip text.
 * @param {string}   [opts.variant]  Button variant.  Defaults to 'ghost'.
 * @param {string}   [opts.size]     Button size.  Defaults to 'icon'.
 * @param {string}   [opts.className] Additional CSS classes for the button.
 * @param {object}   [opts.attrs]    Extra HTML attributes.
 * @param {function} [opts.onChange]  Called with (isChecked) after toggle.
 * @returns {jQuery} jQuery-wrapped container element.
 */
function makeReactIconToggle(opts) {
	var container = document.createElement('span');
	container.style.display = 'inline-block';
	container.style.verticalAlign = 'middle';

	var reactRoot = createRoot(container);
	var checked = opts.checked != null ? opts.checked : false;

	function renderToggle(root, currentOpts, currentChecked) {
		var iconClass = currentChecked ? currentOpts.onIcon : currentOpts.offIcon;
		var iconElement = React.createElement(FAIcon, { icon: iconClass });

		var buttonProps = jQuery.extend({
			variant: currentOpts.variant || 'ghost',
			size: currentOpts.size || 'icon',
			title: currentOpts.title || undefined,
			disabled: currentOpts.disabled || false,
			className: currentOpts.className || undefined,
			leftIcon: iconElement,
			'aria-pressed': currentChecked,
			onClick: function () {
				var newChecked = !currentChecked;
				var $el = jQuery(container);
				$el.data('_reactToggleChecked', newChecked);
				renderToggle(root, $el.data('_reactOpts'), newChecked);
				if (typeof currentOpts.onChange === 'function') {
					currentOpts.onChange(newChecked);
				}
			}
		}, currentOpts.attrs || {});

		root.render(React.createElement(Button, buttonProps));
	}

	renderToggle(reactRoot, opts, checked);

	var $el = jQuery(container);
	$el.data('_reactRoot', reactRoot);
	$el.data('_reactOpts', opts);
	$el.data('_reactToggleChecked', checked);

	// Backward-compatible API so callers can read the toggle state.
	$el._isChecked = function () {
		return $el.data('_reactToggleChecked');
	};

	return $el;
}

/**
 * Re-renders a React icon toggle previously created by
 * `makeReactIconToggle` with updated props.
 *
 * @param {jQuery}  $el      The jQuery element returned by
 *                            `makeReactIconToggle`.
 * @param {object}  newOpts  Partial set of options to merge.
 */
function updateReactIconToggle($el, newOpts) {
	var reactRoot = $el.data('_reactRoot');
	if (reactRoot == null) {
		return;
	}

	var opts = jQuery.extend({}, $el.data('_reactOpts'), newOpts);
	$el.data('_reactOpts', opts);

	var checked = newOpts.checked != null ? newOpts.checked : $el.data('_reactToggleChecked');
	$el.data('_reactToggleChecked', checked);

	function renderToggle(root, currentOpts, currentChecked) {
		var iconClass = currentChecked ? currentOpts.onIcon : currentOpts.offIcon;
		var iconElement = React.createElement(FAIcon, { icon: iconClass });

		var buttonProps = jQuery.extend({
			variant: currentOpts.variant || 'ghost',
			size: currentOpts.size || 'icon',
			title: currentOpts.title || undefined,
			disabled: currentOpts.disabled || false,
			className: currentOpts.className || undefined,
			leftIcon: iconElement,
			'aria-pressed': currentChecked,
			onClick: function () {
				var newChecked = !currentChecked;
				$el.data('_reactToggleChecked', newChecked);
				renderToggle(root, $el.data('_reactOpts'), newChecked);
				if (typeof currentOpts.onChange === 'function') {
					currentOpts.onChange(newChecked);
				}
			}
		}, currentOpts.attrs || {});

		root.render(React.createElement(Button, buttonProps));
	}

	renderToggle(reactRoot, opts, checked);
}

export {
	makeReactButton, updateReactButton, unmountReactButton,
	makeReactCheckbox, updateReactCheckbox,
	makeReactRadioButtons, updateReactRadioButtons,
	makeReactIconToggle, updateReactIconToggle
};
