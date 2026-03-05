/**
 * Bridge utilities for rendering @mieweb/ui React components into jQuery
 * elements used by the existing DataVis toolbar infrastructure.
 *
 * @module util/react_bridge
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { Button } from '@mieweb/ui/components/Button';
import { Checkbox } from '@mieweb/ui/components/Checkbox';
import { DropdownItem, DropdownSeparator } from '@mieweb/ui/components/Dropdown';
import { RadioGroup, Radio } from '@mieweb/ui/components/Radio';
import { Select } from '@mieweb/ui/components/Select';
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

/**
 * Creates a @mieweb/ui Select rendered into a jQuery-wrapped container element.
 *
 * The returned jQuery element mimics enough of the native `<select>` jQuery API
 * so that existing GridControl code can interact with it:
 *
 *   - `.val()`          — get or set the current value
 *   - `.selectedText()` — get the display text of the currently selected option
 *   - `.setOptions(opts)` — replace all options
 *   - `.setDisabledValues(vals)` — disable options by value
 *
 * @param {object} opts
 * @param {string}   [opts.placeholder]  Placeholder text.
 * @param {string}   [opts.label]        Accessible label for the select.
 * @param {boolean}  [opts.hideLabel]    Visually hide the label (still available
 *                                       to screen readers).  Defaults to true.
 * @param {string}   [opts.size]         Size: 'sm', 'md', 'lg'.  Defaults to 'sm'.
 * @param {boolean}  [opts.disabled]     Whether the select is disabled.
 * @param {string}   [opts.className]    Additional CSS class names.
 * @param {Array<{value:string, label:string}>} [opts.options]
 *                                       Initial set of options.
 * @param {function} [opts.onChange]      Called with (value, label) when the user
 *                                       selects an option.
 * @returns {jQuery} jQuery-wrapped container element with helper methods.
 */
function makeReactSelect(opts) {
	var container = document.createElement('span');
	container.style.display = 'inline-block';
	container.style.verticalAlign = 'middle';

	var reactRoot = createRoot(container);

	var state = {
		value: opts.value || '',
		options: opts.options || [],
		disabledValues: {}
	};

	function renderSelect() {
		var selectOptions = state.options.map(function (o) {
			return {
				value: o.value,
				label: o.label,
				disabled: !!state.disabledValues[o.value]
			};
		});

		reactRoot.render(
			React.createElement(Select, {
				options: selectOptions,
				value: state.value,
				onValueChange: function (newValue) {
					state.value = newValue;
					renderSelect();
					if (typeof opts.onChange === 'function') {
						var selectedOpt = state.options.filter(function (o) {
							return o.value === newValue;
						})[0];
						opts.onChange(newValue, selectedOpt ? selectedOpt.label : newValue);
					}
				},
				placeholder: opts.placeholder || '',
				label: opts.label || opts.placeholder || '',
				hideLabel: opts.hideLabel != null ? opts.hideLabel : true,
				size: opts.size || 'sm',
				disabled: opts.disabled || false,
				className: opts.className || undefined
			})
		);
	}

	renderSelect();

	var $el = jQuery(container);
	$el.data('_reactRoot', reactRoot);
	$el.data('_reactSelectState', state);
	$el.data('_reactSelectRender', renderSelect);
	$el.data('_reactSelectOpts', opts);

	/**
	 * Get or set the current value, jQuery `.val()` style.
	 * When setting, re-renders the component.
	 *
	 * @param {string} [newVal]  If provided, sets the value.
	 * @returns {string|jQuery}  Current value (getter) or $el (setter).
	 */
	$el.val = function (newVal) {
		if (arguments.length === 0) {
			return state.value;
		}
		state.value = newVal;
		renderSelect();
		return $el;
	};

	/**
	 * Get the display label of the currently selected option.
	 *
	 * @returns {string}
	 */
	$el.selectedText = function () {
		var match = state.options.filter(function (o) {
			return o.value === state.value;
		})[0];
		return match ? match.label : '';
	};

	/**
	 * Replace all options and re-render.
	 *
	 * @param {Array<{value:string, label:string}>} newOptions
	 */
	$el.setOptions = function (newOptions) {
		state.options = newOptions || [];
		renderSelect();
		return $el;
	};

	/**
	 * Mark specific option values as disabled and re-render.
	 *
	 * @param {Object.<string, boolean>} disabledMap  Keys are values,
	 *   truthy = disabled.
	 */
	$el.setDisabledValues = function (disabledMap) {
		state.disabledValues = disabledMap || {};
		renderSelect();
		return $el;
	};

	/**
	 * Convenience: disable one option by value.
	 */
	$el.disableOption = function (value) {
		state.disabledValues[value] = true;
		renderSelect();
		return $el;
	};

	/**
	 * Convenience: enable one option by value.
	 */
	$el.enableOption = function (value) {
		delete state.disabledValues[value];
		renderSelect();
		return $el;
	};

	/**
	 * Get the current options array.
	 *
	 * @returns {Array<{value:string, label:string}>}
	 */
	$el.getOptions = function () {
		return state.options;
	};

	return $el;
}

/**
 * Re-renders a React select previously created by `makeReactSelect` with
 * updated props.
 *
 * @param {jQuery}  $el      The jQuery element returned by `makeReactSelect`.
 * @param {object}  newOpts  Partial set of options to merge with the originals.
 */
function updateReactSelect($el, newOpts) {
	var opts = jQuery.extend({}, $el.data('_reactSelectOpts'), newOpts);
	$el.data('_reactSelectOpts', opts);

	var state = $el.data('_reactSelectState');
	if (newOpts.options) {
		state.options = newOpts.options;
	}
	if (newOpts.value != null) {
		state.value = newOpts.value;
	}
	var renderSelect = $el.data('_reactSelectRender');
	if (typeof renderSelect === 'function') {
		renderSelect();
	}
}

/**
 * Creates a @mieweb/ui Dropdown rendered into a jQuery-wrapped container
 * element, used as a popup sort menu for grid column headers.
 *
 * The trigger is a Font Awesome sort icon (stacked ascending / descending
 * arrows).  The dropdown body contains DropdownItems for each sort option
 * and a DropdownSeparator between groups.
 *
 * Call `setSortDirection` on the returned jQuery element to update the
 * visual sort indicator.  Call `unmountReactSortDropdown` when cleaning up.
 *
 * @param {object} opts
 * @param {Array}    opts.items            Menu items.  Each entry is either
 *                                         the string '----' (separator) or an
 *                                         object with {name, icon, callback}.
 *                                         `icon` is an FA class like
 *                                         'fa-sort-amount-asc'.
 * @param {string}   opts.orientation      'horizontal' or 'vertical'.
 * @param {string}   opts.fontMethod       'font' or 'svg' (flags value).
 * @param {string}   opts.sortIconClass    Unique CSS class for this sort icon.
 * @param {string}   opts.orientationClass CSS class shared by all icons in
 *                                         this orientation (e.g.
 *                                         'wcdv_sort_icon_horizontal').
 * @param {string}   [opts.initialDir]     Initial sort direction: null, 'asc',
 *                                         or 'desc'.
 * @returns {jQuery} jQuery-wrapped container element.
 */
/**
 * Portal-based dropdown that renders its menu at document.body level so it is
 * never clipped by overflow:hidden/auto ancestors (e.g. the scrollable table).
 *
 * API mirrors a tiny subset of @mieweb/ui Dropdown — just enough for the sort
 * icon use-case — but positions via `position:fixed` inside a React portal.
 */
function PortalDropdown(props) {
	var trigger  = props.trigger;
	var children = props.children;
	var placement = props.placement || 'bottom-start';
	var width    = props.width || 'auto';

	var _openState = React.useState(false);
	var isOpen  = _openState[0];
	var setOpen = _openState[1];

	// Start offscreen so useLayoutEffect can measure before paint
	var _posState = React.useState({ top: -9999, left: -9999 });
	var pos    = _posState[0];
	var setPos = _posState[1];

	var triggerRef = React.useRef(null);
	var menuRef    = React.useRef(null);

	// Close on outside click or Escape
	React.useEffect(function () {
		if (!isOpen) return;

		function onDown(e) {
			if (triggerRef.current && triggerRef.current.contains(e.target)) return;
			if (menuRef.current && menuRef.current.contains(e.target)) return;
			setOpen(false);
		}
		function onKey(e) {
			if (e.key === 'Escape') setOpen(false);
		}

		document.addEventListener('mousedown', onDown, true);
		document.addEventListener('keydown', onKey, true);
		return function () {
			document.removeEventListener('mousedown', onDown, true);
			document.removeEventListener('keydown', onKey, true);
		};
	}, [isOpen]);

	// Position the menu using actual measured dimensions (runs before paint)
	React.useLayoutEffect(function () {
		if (!isOpen || !menuRef.current || !triggerRef.current) return;

		var triggerRect = triggerRef.current.getBoundingClientRect();
		var menuRect    = menuRef.current.getBoundingClientRect();
		var menuH = menuRect.height;
		var menuW = menuRect.width;

		var top  = triggerRect.bottom + 4;
		var left = placement === 'bottom-end'
			? triggerRect.right - menuW
			: triggerRect.left;

		// Flip above if menu would overflow below viewport
		if (top + menuH > window.innerHeight) {
			top = triggerRect.top - menuH - 4;
		}

		// Clamp so menu stays within viewport
		if (left + menuW > window.innerWidth) {
			left = window.innerWidth - menuW - 8;
		}
		if (left < 0) left = 8;
		if (top  < 0) top  = 8;

		setPos({ top: top, left: left });
	}, [isOpen, placement]);

	var menuId = React.useId();

	function handleToggle() {
		if (!isOpen) {
			// Reset position offscreen so useLayoutEffect can remeasure
			setPos({ top: -9999, left: -9999 });
		}
		setOpen(function (v) { return !v; });
	}

	var triggerElement = React.cloneElement(trigger, {
		onClick: handleToggle,
		'aria-haspopup': 'menu',
		'aria-expanded': isOpen,
		'aria-controls': isOpen ? menuId : undefined
	});

	var widthStyle = typeof width === 'number'
		? { width: width + 'px' }
		: {};

	var menu = isOpen
		? createPortal(
			React.createElement(
				'div',
				{
					ref: menuRef,
					id: menuId,
					role: 'menu',
					style: Object.assign({
						position: 'fixed',
						zIndex: 99999,
						top: pos.top + 'px',
						left: pos.left + 'px',
						minWidth: '12rem',
						borderRadius: '0.75rem',
						border: '1px solid #e5e5e5',
						backgroundColor: '#fff',
						boxShadow: '0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)'
					}, widthStyle)
				},
				children
			),
			document.body
		)
		: null;

	return React.createElement(
		'div',
		{ ref: triggerRef, style: { display: 'inline-flex', position: 'relative' } },
		triggerElement,
		menu
	);
}

function makeReactSortDropdown(opts) {
	var container = document.createElement('span');
	container.style.display = 'inline-block';
	container.style.verticalAlign = 'middle';
	container.classList.add('wcdv_sort_dropdown');
	container.classList.add(opts.sortIconClass);
	container.classList.add(opts.orientationClass);

	var reactRoot = createRoot(container);

	var state = {
		dir: opts.initialDir || null
	};

	function buildSortArrows(dir) {
		var ascClasses = 'fa fa-sort-asc';
		var descClasses = 'fa fa-sort-desc';

		if (opts.fontMethod === 'font') {
			ascClasses += ' fa-stack-1x';
			descClasses += ' fa-stack-1x';
		}

		if (dir != null) {
			// The FA icon "fa-sort-desc" points downward, "fa-sort-asc" points
			// upward.  When sorting ASC the downward arrow is the "active" one
			// (indicating the direction of increasing values) and vice-versa.
			if (dir.toUpperCase() === 'ASC') {
				descClasses += ' wcdv_sort_arrow_active';
				ascClasses += ' wcdv_sort_arrow_inactive';
			}
			else {
				ascClasses += ' wcdv_sort_arrow_active';
				descClasses += ' wcdv_sort_arrow_inactive';
			}
		}

		return [
			React.createElement('span', { className: ascClasses, key: 'asc' }),
			React.createElement('span', { className: descClasses, key: 'desc' })
		];
	}

	function renderDropdown() {
		// -- trigger --------------------------------------------------------
		var triggerClasses = 'wcdv_sort_icon ' + opts.orientationClass;

		if (opts.fontMethod === 'font') {
			triggerClasses += ' fa fa-stack';
		}
		else {
			triggerClasses += ' fa-layers';
		}

		if (opts.orientation === 'horizontal') {
			triggerClasses += ' fa-rotate-270';
		}

		var trigger = React.createElement(
			'span',
			{ className: triggerClasses, style: { cursor: 'pointer' } },
			buildSortArrows(state.dir)
		);

		// -- items ----------------------------------------------------------
		var children = [];
		var items = opts.items || [];

		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (item === '----') {
				children.push(
					React.createElement(DropdownSeparator, { key: 'sep-' + i })
				);
			}
			else {
				children.push(
					React.createElement(
						DropdownItem,
						{
							key: 'item-' + i,
							icon: item.icon
								? React.createElement('i', {
									className: 'fa ' + item.icon,
									'aria-hidden': 'true'
								})
								: undefined,
							onClick: item.callback
						},
						item.name
					)
				);
			}
		}

		reactRoot.render(
			React.createElement(
				PortalDropdown,
				{ trigger: trigger, placement: 'bottom-start', width: 'auto' },
				children
			)
		);
	}

	renderDropdown();

	var $el = jQuery(container);
	$el.data('_reactRoot', reactRoot);
	$el.data('_reactSortState', state);
	$el.data('_reactSortRender', renderDropdown);

	/**
	 * Update the visual sort direction indicator.
	 *
	 * @param {string|null} dir  'asc', 'desc', or null to clear.
	 */
	$el.setSortDirection = function (dir) {
		state.dir = dir;
		renderDropdown();
		return $el;
	};

	return $el;
}

/**
 * Unmounts a React sort dropdown previously created by
 * `makeReactSortDropdown`, cleaning up the React root.
 *
 * @param {jQuery} $el  The jQuery element returned by `makeReactSortDropdown`.
 */
function unmountReactSortDropdown($el) {
	var reactRoot = $el.data('_reactRoot');
	if (reactRoot != null) {
		reactRoot.unmount();
		$el.removeData('_reactRoot');
		$el.removeData('_reactSortState');
		$el.removeData('_reactSortRender');
	}
}

export {
	makeReactButton, updateReactButton, unmountReactButton,
	makeReactCheckbox, updateReactCheckbox,
	makeReactRadioButtons, updateReactRadioButtons,
	makeReactIconToggle, updateReactIconToggle,
	makeReactSelect, updateReactSelect,
	makeReactSortDropdown, unmountReactSortDropdown
};
