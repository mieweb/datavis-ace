# Plan: Multi-Column Sort — ACE Engine

This is the **engine half** of the Multi-Column Sort feature (DataVis Q2 2026 OKR 1). It covers
only the changes to the DataVis ACE package (the Acquisition + Computation Engine). The
user-interface half — header badges, shift-click handling, context-menu additions — lives in the
DataVis GLIDE repository and is tracked separately in
`datavis-glide/plans/multi-column-sort-ui.md`.

## Background

Today the grid supports sorting by a single column per orientation. A sort is represented by a
`View~SortSpec` whose `vertical` and `horizontal` members are **single objects**. Clicking a column
header replaces any previous sort entirely.

The engine has long anticipated multi-column sort: two FIXME comments mark the exact change sites,
both reading *"This will need to be adjusted when we support multiple sorts. Both directions should
be stable when we do that, or else it won't work as expected."*

- [src/view.js](../src/view.js#L1698)
- [src/computed_view.js](../src/computed_view.js#L1171)

The goal of this plan is to make the engine accept and correctly apply an **array of sort specs per
orientation**, sorted by priority (first spec is primary, second breaks ties, and so on), while
remaining fully backward compatible with saved perspectives that contain a single spec.

## Design

### Sort spec shape

Change `sortSpec.vertical` (and `sortSpec.horizontal`) from a single spec object to an **array of
spec objects**, in priority order:

```
sortSpec.vertical = [ specPrimary, specSecondary, specTertiary, ... ];
```

Each element keeps the existing per-spec shape (one of `View~SortSpecVertPlain`,
`View~SortSpecVertGroup`, `View~SortSpecVertPivot`, etc.), including its own `dir` of `"ASC"`/`"DESC"`.

### Backward compatibility (critical)

Old perspectives and any external callers may still pass a single object. Normalize on the way in so
the rest of the engine only ever deals with arrays:

```javascript
function normalizeSortSpec(sortSpec) {
	var self = this;
	if (sortSpec == null) {
		return sortSpec;
	}
	if (sortSpec.vertical != null && !_.isArray(sortSpec.vertical)) {
		sortSpec.vertical = [sortSpec.vertical];
	}
	if (sortSpec.horizontal != null && !_.isArray(sortSpec.horizontal)) {
		sortSpec.horizontal = [sortSpec.horizontal];
	}
	return sortSpec;
}
```

Normalization must run wherever a spec enters the engine: `setSort`, and the prefs `load` path.

### Chained, stable comparison

The current sort derives a single `sortSourceFn` + field type info (`fti`) and builds a `comparison`
function from one spec. For multi-column sort this becomes a loop, in priority order, that builds a
per-spec `sortSourceFn` and `cmp`, then a **chained comparator**: the first spec whose comparison is
non-zero decides the order; if all are equal the rows are considered equal.

Both ASC and DESC must be **stable** (resolves the FIXMEs). `mergeSort4` is already stable; ensure
DESC stability by negating the comparison result rather than relying on the
"sort-ascending-then-reverse" trick currently described in the comment block above
[src/computed_view.js#L1171](../src/computed_view.js#L1171).

The value-based `pigeonHole` algorithm is not a general comparator and can only ever be a terminal
(last) key. Guard against using it for a non-terminal position in the chain (fall back to
`mergeSort` chaining when a value-based spec is not the last element).

## Implementation Steps

### 1. Update the `View~SortSpec` typedefs — `src/view.js`

- Update the `View~SortSpec` typedef block at [src/view.js#L472](../src/view.js#L472) so `vertical`
  and `horizontal` are documented as **arrays** of their respective per-orientation spec types.
- Keep the existing `View~SortSpecVert*` / `View~SortSpecHoriz*` element typedefs unchanged (they
  describe a single element of the array).

### 2. Normalize and store arrays — `src/view.js` / `src/computed_view.js`

- Add the `normalizeSortSpec` helper (private to the view layer).
- `View.prototype.getSort` ([src/view.js#L995](../src/view.js#L995)) — returns the array-shaped spec
  as stored (no behavior change beyond shape).
- `View.prototype.clearSort` ([src/view.js#L1007](../src/view.js#L1007)) — unchanged; clearing still
  sets the spec to `null`.
- `ComputedView.prototype.setSort` ([src/computed_view.js#L427](../src/computed_view.js#L427)) — run
  `normalizeSortSpec` on the incoming spec before the `_.isEqual` difference check and before
  delegating to `self.super['View'].setSort`. The existing dedupe/`isDifferent` logic then works on
  normalized arrays.
- `ComputedView.prototype.getSort` ([src/computed_view.js#L466](../src/computed_view.js#L466)) and
  `clearSort` ([src/computed_view.js#L478](../src/computed_view.js#L478)) — no structural change.

### 3. Build the chained comparator — `src/computed_view.js#sort`

In `ComputedView.prototype.sort` ([src/computed_view.js#L491](../src/computed_view.js#L491)):

- The block that currently derives a single `spec`, `sortSourceFn`, `fti`, and `comparison`
  (culminating at the FIXME and `comparison` definition around
  [src/computed_view.js#L1171](../src/computed_view.js#L1171)) must iterate the spec array in
  priority order.
- For each spec element, reuse the existing per-spec resolution logic (the large
  `if (spec.field != null) … else if (spec.pivotFieldIndex != null) …` cascade) to produce that
  element's `sortSourceFn` and `fti`, then `determineCmp(spec, fti)` for its `cmp`.
- Compose a single chained comparator:

  ```javascript
  comparison = function (a, b) {
  	var self = this, i, c, asc;
  	for (i = 0; i < keys.length; i += 1) {
  		c = keys[i].cmp(keys[i].source(a), keys[i].source(b));
  		if (c !== 0) {
  			asc = keys[i].dir.toUpperCase() === 'ASC';
  			return asc ? c < 0 : c > 0;
  		}
  	}
  	return false; // equal: preserve input order (stable)
  };
  ```

  (Here `keys` is the array of `{ source, cmp, dir }` derived per spec element. `mergeSort4`
  expects the boolean "a-before-b" predicate currently used by the engine.)

- Keep the existing `packBundle` / `unpackBundle` / `makeFinishCb` machinery; only the comparator
  construction changes.
- Preserve the `pigeonHole` path for a single value-based terminal key; when the chain mixes a
  value-based spec with others, the value-based spec must be the last key, and the whole chain runs
  through `mergeSort4`.

### 4. Persist arrays in perspectives — `src/prefs_module.js`

- The prefs `save` path serializes `getSort()` output; arrays serialize as JSON with no change.
- The prefs `load` path must run `normalizeSortSpec` on `config.sort` before calling `setSort`, so a
  legacy single-object perspective is upgraded to a one-element array. (Setting via `setSort` already
  normalizes, but normalize explicitly here too for clarity and to keep `_.isEqual` comparisons
  consistent.)

### 5. Resolve the FIXMEs

- Remove/replace both FIXME comments once both directions are stable:
  - [src/view.js#L1698](../src/view.js#L1698)
  - [src/computed_view.js#L1171](../src/computed_view.js#L1171)

## Constraints

- **IE11 compatibility**: source uses `var`, function declarations, `var self = this`; no arrow
  functions, template strings, destructuring, ES6 classes/modules. Follow existing ACE conventions.
- **System design**: do not change the public `setSort`/`getSort`/`clearSort` signatures. The only
  contract change is that `sortSpec.vertical`/`horizontal` may now be arrays (with single objects
  still accepted and normalized).
- **Stability**: both ASC and DESC must be stable; this is a hard requirement for tie-breaking to
  work.
- **Performance**: chained comparison adds a constant factor per extra key. Negligible for hundreds
  of rows; benchmark for 10,000+ and keep the per-key resolution out of the inner comparison loop
  (resolve `sortSourceFn`/`cmp` once, before sorting — as written above).

## Tests

ACE's unit tests live under `tests/unit/` and run headlessly with **Mocha + Chai** (no browser, no Selenium) — each test drives a `ComputedView` directly and inspects the structured result of `getData()` rather than rendered table cells. Shared fixtures and navigation helpers live in `tests/unit/lib/`:

- `lib/setup.js` — builds a `Source` + `ComputedView` around fixture data and exposes the operation helpers used throughout: `loadRandom100()` (the shared 100-row, all-types fixture), `sortBy(view, field, dir)`, `groupBy`, `filterBy`, `getDataAsync(view)`, `resetAndGetData(view)`, `fieldTypes(file)`, and the `CONFIG_OPTS` constant (`{ updateData: false, sendEvent: false, savePrefs: false }`) that configures a view without triggering recomputation, events, or pref saves.
- `lib/nav.js` — pure data-structure navigation into a `getData()` result: `cell`/`cellValue`/`cellOrig` (with negative-index support), `groupCount`, `groupIndex`, `aggResult`, etc.
- `lib/env.js` — the headless environment mock (`window`, `document`, `Intl`, ...).

Run the whole suite with `npm run test:unit` (which regenerates the data fixtures first via the `pretest:unit` hook), or a single file with `npx mocha ./tests/unit/<file>.js`. The single source of truth for sort correctness is the view's own comparator, `types.registry.get(type).compare`, so the tests exercise every internal representation (primitive / numeral / BigNumber / moment) the way GLIDE's per-type pages did.

Multi-column coverage was added as a `describe('multi-column sort — chained, stable comparison', ...)` block at the end of [tests/unit/sort.js](../tests/unit/sort.js), reusing the existing `loadRandom100` fixture and `comparatorFor` oracle:

- **Normalization**: a single-object `vertical` spec passed to `setSort` is stored as a one-element array (`getSort().vertical` is the array form), and that one-element array sorts identically (same row order, including stable tie-break) to the legacy single object.
- **Chained order (plain)**: an array of two specs (`fruit` then `int1`) sorts by the primary key, then the secondary within equal primary values; a second case mixes directions (primary `ASC`, secondary `DESC`) to confirm each key's `dir` is independent.
- **Chained order (group)**: grouping by `country` and sorting by `[group count ASC, country ASC]` orders groups by the count aggregate, breaking ties by the group-field value.
- **Stability (both directions)**: rows are tagged with their original (unsorted) position via `rowId`; after sorting on a low-cardinality field (`boolean1`) both `ASC` and `DESC` preserve input order within every equal-key run (the assertion that resolves the two FIXMEs).
- **Value-based guard**: a value-based (`values`) key is refused when it is not the terminal key (`getData` still resolves, but `view.lastOps.sort` is `false`) and allowed when it is the last key.

Pivot-orientation chaining is exercised indirectly through the shared per-spec resolution cascade; a dedicated pivot multi-column case can be added once a pivot fixture with reliable ties is in place.

Run `npm run test:unit` and `npm run lint` before opening the PR.


## Delivery / Coordination

This engine change is a prerequisite for the GLIDE UI work. Recommended sequence:

1. Land this ACE PR.
2. Cut a new `datavis-ace` prerelease and bump the dependency in `datavis-glide/package.json`
   (currently `=4.0.0-PRE.2`).
3. Land the GLIDE UI PR (`datavis-glide/plans/multi-column-sort-ui.md`) against the new version.

## Out of Scope

- Drag-to-reorder sort priority.
- A dedicated sort-builder dialog.
- Any user-interface concerns (badges, shift-click, menus) — see the GLIDE plan.
