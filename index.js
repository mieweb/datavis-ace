import jQuery from 'jquery';

// Don't try to inline this code, it won't work. Imports are lifted,
// and this code needs to run before we import jQuery UI. Yes, this
// is an unhinged workaround.

import original_jQuery from './global-jquery.js';

export { deepCopy } from './src/util/deepCopy.js';
export { OrdMap } from './src/util/ordmap.js';
export { ParamInput } from './src/source_param.js';
export { Source, FileSource } from './src/source.js';
export { ComputedView } from './src/computed_view.js';
export { MirageView } from './src/mirage_view.js';
export { Prefs } from './src/prefs.js';
export { PrefsBackend, PREFS_BACKEND_REGISTRY } from './src/prefs_backend.js';
export { PrefsModule, PREFS_MODULE_REGISTRY } from './src/prefs_module.js';
export { Perspective } from './src/perspective.js';
export { Aggregate, AggregateInfo, AGGREGATE_REGISTRY } from './src/aggregates.js';
export * as Util from './src/util/misc.js';
export { Lock } from './src/util/lock.js';
export { types } from './src/types.js';
export { GroupFunction, GROUP_FUNCTION_REGISTRY } from './src/group_fun.js';

// We left the global jQuery around long enough for jQuery UI to install itself, and that same
// jQuery object has been used by all other plugins and DataVis code.  Now that we're all done,
// make it so nobody can access our jQuery, to avoid conflicts.

if (original_jQuery != null) {
  window.jQuery = original_jQuery;
}
else {
  delete window.jQuery;
}
