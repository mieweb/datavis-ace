// GridRenderer {{{1

var GridRenderer = makeSubclass(Object, function () {
});

// FIXME: We don't need all these, we only need "unableToRender."  However, mixinEventHandling()
// can't traverse the class hierarchy, so trying to subscribe to "unableToRender" from a GridTable
// will not work (because "unableToRender" isn't in the GridTable subclass' event list).  So for a
// quick workaround, we just put all the events that any subclass may use here.  But the real fix
// should be to make mixinEventHandling() traverse up the superclass chain.

mixinEventHandling(GridRenderer, 'GridRenderer', [
		'columnResize'        // A column is resized.
	, 'unableToRender'      // A grid renderer can't render the data in the view it's bound to.
	, 'limited'             // The grid table isn't rendering all possible rows.
	, 'unlimited'           // The grid table is rendering all possible rows.
	, 'csvReady'            // CSV data has been generated.
	, 'generateCsvProgress' // CSV generation progress.
]);

// .registry {{{2

GridRenderer.registry = OrdMap.fromArray([{
	name: 'table_plain',
	cls: GridTablePlain
}, {
	name: 'table_group_detail',
	cls: GridTableGroupDetail
}, {
	name: 'table_group_summary',
	cls: GridTableGroupSummary
}, {
	name: 'table_pivot',
	cls: GridTablePivot
}, {
	name: 'mustache',
	cls: GridRendererMustache
}], 'name');

// #canRender {{{2

GridRenderer.prototype.canRender = function () {
	throw new Error('ABSTRACT');
};

// #draw {{{2

GridRenderer.prototype.draw = function (root, opts, cont) {
	var self = this;

	debug.info('GRID RENDERER // DRAW', 'Beginning draw operation; opts = %O', opts);

	self.colConfig = self.grid.colConfig;

	opts = opts || self.drawOpts;

	self.root = root;

	return self.view.getData(function (data) {
		debug.info('GRID RENDERER // DRAW', 'Data = %O', data);

		return self.view.getTypeInfo(function (typeInfo) {
			debug.info('GRID RENDERER // DRAW', 'TypeInfo = %O', typeInfo.asMap());

			if ((data.isPlain && !self.canRender('plain'))
					|| (data.isGroup && !self.canRender('group'))
					|| (data.isPivot && !self.canRender('pivot'))) {

				debug.info('GRID RENDERER // DRAW', 'Unable to render data using current grid table: { isPlain = %s ; isGroup = %s ; isPivot = %s }', data.isPlain, data.isGroup, data.isPivot);

				return self.fire('unableToRender');
			}

			self.data = data;
			self.typeInfo = typeInfo;

			self.timing.start(['Grid Renderer', 'Draw']);

			return cont(data, typeInfo);
		});
	});
};

// GridRendererMustache {{{1

var GridRendererMustache = makeSubclass(GridRenderer, function () {
});

// #canRender {{{2

GridRendererMustache.prototype.canRender = function (what) {
	return what === 'plain';
};

// #draw {{{2

GridRendererMustache.prototype.draw = function () {
	var self = this;

	return self.super.draw(function (data, typeInfo) {
		console.log('yay');
	});
};
