jQuery.fn.extend({
	_isChecked: function () {
		return jQuery(this).attr('checked');
	},
	_isDisabled: function () {
		return jQuery(this).attr('disabled');
	},
	_makeDraggableField: function () {
		return jQuery(this)
			.draggable({
				classes: {
					'ui-draggable-handle': 'wcdv_drag_handle'
				},
				distance: 8, // FIXME Deprecated [1.12]: replacement will be in 1.13
				helper: 'clone',
				revert: true,
				revertDuration: 0
			});
	}
});
