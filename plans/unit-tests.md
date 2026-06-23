# Plan: Migrate data-centric tests from DataVis GLIDE to DataVis ACE

## Goal

Recreate DataVis GLIDE's data-centric Selenium/Grid tests as headless Mocha + Chai unit tests in DataVis ACE. The migrated tests use the **same input data** and assert the **same outputs**, but inspect the result of `view.getData()` instead of reading table cells from a browser DOM. Group tests navigate the grouped-data object structure; aggregate tests inspect the aggregate result objects; and so on. The objective is equivalent coverage of the data layer (sorting, grouping, aggregates, filtering, type support, data sources, null handling) without a UI.

## Key facts

- ACE unit tests use **Mocha + Chai**, located in `tests/unit/{aggregate,filter,group,pivot}.js`, with helpers in `tests/unit/lib/{setup.js,env.js}`. They run via `npm run test:unit` (`mocha --timeout 10000 --recursive 'tests/unit/**/*.js'`); a single file runs with `mocha tests/unit/<file>.js`.
- The existing helper `loadFruitData()` parses `tests/data/third-party/fruit.csv` into a `LocalSource` + `ComputedView`. `getDataAsync(view)` promisifies `view.getData(cont)`. `resetAndGetData(view)` clears config and returns fresh data. `env.js` mocks `globalThis.window` for the headless environment.
- `getData()` return shape:
  - `isPlain` / `isGroup` / `isPivot` flags.
  - Plain: `data.data = [{ rowNum, rowData: { field: { value, orig, type, formatted } } }]`.
  - Group: `data.rowVals = [[groupVal], ...]`; `data.data[groupIdx] = [rows]`.
  - Pivot: `data.colVals`; `data.data[rowIdx][colIdx] = [rows]`.
  - Aggregates: `data.agg.results.group[aggIdx][rowIdx]`, `data.agg.results.pivot[aggIdx][colIdx]`, `data.agg.results.cell[aggIdx][rowIdx][colIdx]`, `data.agg.results.all[aggIdx]`; `data.agg.info` mirrors the structure.
- View configuration methods: `setSort({ field, direction })`, `setFilter(spec)`, `setGroup({ fieldNames, groupFunctions })`, `setPivot`, `setAggregate({ group, pivot, cell, all: [{ fun, fields }] })`, `reset`. All take `(spec, cont, { updateData: false, sendEvent: false, savePrefs: false })`.
- Aggregate functions: `count`, `countDistinct`, `sum`, `average`, `min`, `max`, `first`, `last`, `nth`, `values`, `valuesWithCounts`, `distinctValues`, `sumOverSum`, `countOverCount`.
- **Input data is portable.** ACE's `tests/data/templates/*.json5` are identical to GLIDE's, including `json-gen-input.json5`. Running `make -C tests/data` generates `random100.json` (plus `random500/1000/10000`, `.xml`, `.csv`) and the `nulls`/`blanks`/`empty-string`/etc. fixtures. The generated `random100.json` **embeds a `typeInfo` array** (per-field `type` plus `internalType` of `primitive` / `numeral` / `bignumber` / `moment`), so loading it into a `LocalSource` reproduces GLIDE's exact type behavior. These generated files are build products (gitignored, not currently present), so data generation must run before the unit tests.

## GLIDE data-centric tests and disposition

| GLIDE file (`tests/selenium/`) | Feature | Disposition |
|---|---|---|
| `sort.js` | Sort all types/variants asc/desc; grouped spot-checks | Port |
| `filter.js` | String `$in`/`$nin`; numeric `$eq`/`$ne`/`$lt`/`$gt`/`$lte`/`$gte` on int/float variants | Port |
| `aggregate.js` | count / countDistinct / sum / avg / min / max / values / valuesWithCounts grouped by fruit | Port (extend existing) |
| `group-funs.js` | Temporal grouping (year / quarter / month / week_iso / day_of_week / day / ...) | Port |
| `date_filter.js` | Date `$eq`/`$lte`/`$gte` plus relative `$this`/`$last` with granularity | Port (with fixed reference date) |
| `sources.js` | JSON / XML / CSV / Local / HTML-table sources | Partial (format decoding via Local source only) |
| `drilldown.js` | Drill from aggregate cell to rows | Do not port (see below) |
| `sourceParams.js` | Server CGI param-driven filtering | Exclude (needs server + form UI) |
| `auto-limit.js` | Server-side row limiting + warning | Exclude (server/UI) |
| `pagination.js` | Page rendering of rows | Exclude (UI; data layer has no paging) |
| `multi-grid.js` | Two Grids, shared vs. independent view | Exclude (UI; shared-view aspect trivial) |

UI-only files excluded entirely: `colconfig`, `row-customization`, `dnd`, `selection`, `active-row`, `operations`, `prefs`, `no-auto-save`, `cancel`, `format-strings`, `number-format-str`, `allowHtml`, `footer`, `google-chart`, and the UI half of `omnifilter`.

## Resolved design questions

1. **Overriding "current" date/time** (for relative date filters): no source change is required. `ComputedView.filter()` already derives "now" from the global `window.MIE.WC_DataVis.CURRENT_DATE` (`src/computed_view.js`, ~line 1391: `now = moment(getProp(window, 'MIE', 'WC_DataVis', 'CURRENT_DATE'))`). GLIDE already uses this hook (`tests/pages/grid/filters/date.html` sets `CURRENT_DATE = '2024-06-27'`). The migrated tests set/reset this global via a `setCurrentDate(str)` / `clearCurrentDate()` helper on the env-mocked `window`, in a `before()`/`after()` around the relative-date block.
2. **Drilldown**: there is no view-layer drill API. In the UI, "drill down" merely sets group/pivot, which is already covered by the grouping and pivot tests. No drilldown tests will be ported.
3. **Generated-count drift**: expected group counts and min/max will be confirmed by reading the regenerated data file rather than trusting GLIDE's embedded numbers.

## Plan of work

Phase 0 must complete first; Phases 1–7 can then proceed in parallel.

### Phase 0 — Infrastructure (blocks all)

- Add a data-generation prerequisite so `make -C tests/data` runs before the unit tests (e.g. an npm `pretest:unit` step or documented entry point). This generates `random100.json` and the null/blank fixtures.
- Extend `tests/unit/lib/setup.js` (DRY off `loadFruitData`):
  - `loadJsonData(fileName)` — read `tests/data/<file>.json` (data + embedded `typeInfo`) into a `LocalSource` + `ComputedView`.
  - `loadRandom100()` — convenience wrapper.
  - `setCurrentDate(str)` / `clearCurrentDate()` — set/reset `window.MIE.WC_DataVis.CURRENT_DATE`.
- Add navigation helpers in a new `tests/unit/lib/nav.js`:
  - `cellValue(data, field, idx)` — supports negative `idx` (mirrors GLIDE's `getCell(field, -1)`).
  - `cellOrig` / `cellFormatted` variants for `orig` / `formatted` comparisons.
  - `groupRows(data, rowVal)` — find `data.data[i]` where `rowVals[i]` deep-equals `rowVal`.
  - `aggResult(data, scope, aggIdx, rowIdx, colIdx)` — index into `agg.results`.
  - Reuse the existing `countRows(data)`.

### Phase 1 — Sorting (`tests/unit/sort.js`)

Port GLIDE's `sortInfo` table. For each `[field, min, max]` and each direction: `setSort`, then assert `cellValue(field, 0) === min` and `cellValue(field, -1) === max` (with a delta for float numeral representations). Grouped: `setGroup(['fruit'])` plus spot-check group counts via `groupRows().length`, and per-group min/max of the sorted field.

### Phase 2 — Filtering (`tests/unit/filter.js`, extend)

String `$in`/`$nin` on `fruit`/`country`; numeric operators across `int1..9` / `float1..9` variants. Assert `countRows` plus boundary cell values. Keep the existing fruit-based tests.

### Phase 3 — Aggregates (`tests/unit/aggregate.js`, extend)

Add `values`, `valuesWithCounts`, `distinctValues`, `min`, `max`, `average` across int/float/duration fields, grouped by fruit. Assert `agg.results.group[aggIdx][groupIdx]` against known sums/values.

### Phase 4 — Temporal grouping (`tests/unit/group_funs.js`)

`setGroup({ fieldNames: ['date1'], groupFunctions: { date1: 'year' } })` and similar for each temporal function on `date1-3` / datetime fields. Assert `rowVals` (group labels) and per-group counts.

### Phase 5 — Type support (`tests/unit/types.js`)

The main coverage gap. For each `internalType` (`primitive` / `numeral` / `bignumber` / `moment`) and each type (int / float / currency / date / time / datetime / duration), assert that decode (`rowData.value`), ordering (sort), and equality (filter) behave identically across the different representations of the same logical column family.

### Phase 6 — Date filtering (`tests/unit/date_filter.js`)

`$eq` / `$lte` / `$gte` exact and range, using GLIDE's deterministic date fixture. Relative `$this` / `$last` × granularity (DATE / WEEK / MONTH / QUARTER / YEAR): set `CURRENT_DATE` via `setCurrentDate('2024-06-27')` in a `before()` for the relative-date block, restore after. Assert row counts for each granularity against GLIDE's expected values.

### Phase 7 — Null / blank / empty (`tests/unit/nulls.js`)

Load `nulls.json` / `blanks.json` / `empty-string.json`. Assert null/blank sort placement, filter inclusion/exclusion, grouping into a null/blank group, and aggregate handling.

### Phase 8 — Source format decoding (optional)

Serve the same `random100` dataset as JSON and CSV through an HTTP source (with `globalThis.fetch` stubbed to return the file contents) and assert the decoded rows match each other and the local source. XML is not exercised: the XML branch of the source parser requires a DOM (`DOMParser` / `Document`), which is unavailable in the headless Node environment. No drilldown port (see resolved question 2).

## Relevant files

- `tests/unit/lib/setup.js` — add `loadJsonData` / `loadRandom100` / `setCurrentDate` / `clearCurrentDate`.
- `tests/unit/lib/env.js` — browser mock (reuse; verify moment / numeral / bignumber are available headless).
- `tests/unit/lib/nav.js` — new navigation/assertion helpers.
- `tests/unit/{sort,filter,aggregate,group_funs,types,date_filter,nulls}.js` — test files.
- `tests/data/Makefile` and `tests/data/templates/json-gen-input.json5` — data generation (already present).
- `src/view.js` / `src/computed_view.js` — `getData` / `setSort` / `setFilter` / `setGroup` / `setAggregate` and the `CURRENT_DATE` hook (oracle for shapes/behavior).
- GLIDE `tests/selenium/{sort,filter,aggregate,group-funs,date_filter}.js` — logic and expected-value oracle.
- GLIDE `tests/lib/grid.js` — `getCell` / `getNumRows` / `getAggResult` helpers to translate.

## Verification

1. `make -C tests/data` (or `make tests`) generates `random100.json` and fixtures.
2. `npm run test:unit` — all green; run per-file during development (`mocha tests/unit/sort.js`).
3. Cross-check counts / min / max against GLIDE's `sort.js` and `aggregate.js` embedded expected tables; confirm exact group counts by reading the regenerated file.
4. `npm run lint`.
5. Sanity-check the oracle: confirm a few ported tests fail correctly if the input data is swapped.

## Decisions and scope

- **Include**: sorting, filtering, aggregates, temporal grouping, type support, date filtering, null/blank handling.
- **Exclude**: `sourceParams`, `auto-limit`, `pagination`, `multi-grid`, and all UI-only tests.
- Ported tests use `random100.json` (with embedded `typeInfo`) as the shared input rather than `fruit.csv`, because `fruit.csv` lacks the type-representation breadth GLIDE exercises. The existing fruit-based tests stay as-is.
- Generated data files are build products; an npm `pretest:unit` step runs `make -C tests/data` before the unit tests.
- The existing `CURRENT_DATE` global is the date-override mechanism. The only source change was a one-line correctness fix in `src/types.js` (`universalCmp` now returns `0` for equal durations instead of falling through to `undefined`, which had broken duration sorting); no other source changes were required.

## Suspected bugs (found while porting)

- **`time` type decodes inconsistently across formats.** In `random100.json`, `time1` (format `HH:mm:ss`) decodes to a bare clock string (`"14:01:34"`), while `time2`/`time3` (12-hour formats) decode to full ISO moment strings (`"2000-01-01T19:01:34.000Z"`). Because the representations are not normalized to a common internal form, comparing them mixes a moment with a non-moment and throws `Cannot compare Moment w/ non-Moment` during sort/filter, and `$eq` filtering misbehaves (e.g. filtering `time3` by its own orig value `"2:01:34 PM"` matched all 100 rows instead of the expected subset). The other temporal types (`date`, `datetime`) and `duration` decode consistently and sort/filter correctly. The unit tests in `tests/unit/types.js` therefore cover full decode/order/equality invariance for the numeric internalTypes (int/float primitive/numeral/bignumber and currency) and ordering self-consistency for `date`/`datetime`/`duration`, but deliberately do not assert cross-representation `time` behavior. Fixing the `time` decoder to normalize all formats to one internal representation is the follow-up task.

- **Grouping by a field that contains `null` values crashes.** Grouping `nulls.json` by `fruit` (which has 11 `null` entries) throws `Cannot read properties of undefined (reading 'rows')` in `ComputedView.group` (`src/computed_view.js` ~line 2202): the metadata-tree path built from a `null` cell's `natRep.group` does not match any pre-built leaf, so `metadataLeaf` is `undefined`. Notably, grouping by a field whose empties are empty strings (`blanks.json`) works fine and produces a `""` group, so the bug is specific to JSON `null`. The unit tests in `tests/unit/nulls.js` therefore assert grouping-into-a-blank-group against `blanks.json` and skip grouping against `nulls.json`. The fix is to give `null` group keys a stable `natRep.group` path (treat `null` like the empty-string blank group).
