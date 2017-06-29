**********
Grid Table
**********

A grid table is a representation of the actual data table that appears when rendering a grid, both
in normal and in pivot mode.  The grid table creates the user interface for interactive sorting and
filtering.  The grid table gets its data directly from the _:doc:`data view<data_view>`.

There are two ways that grid tables are used within the wcgraph library:

* Under the control of a WCGRID instance.  This is how it works when the grid is in non-pivot mode.
  The grid table has full features enabled (it controls sorting, filtering, and paging within the
  view).

* Under the control of a PivotControl instance.  This is how it works when the grid is in pivot
  mode.  The grid table has filtering disabled (because the pivot control handles filtering).

  - The data view provides the grid table with pivotted data.  This means that the rows and columns
    returned by ``DataView#getData()`` and the type information provided by
    ``DataView.getTypeInfo()`` reflect the fact that we are looking at a transformation of the data
    provided by the data source.

  - The pivot control sets the grouping, pivotting, and filtering of the view.

  - The grid table still controls sorting and paging.

Features
========

Sorting
  When this feature is enabled, the column heading becomes clickable to allow sorting by that
  column.  When you click a column which is already sorted, the sort direction is reversed.  You
  cannot sort by more than one column (i.e. sort by visit type, then by date).

  Sorting is allowed when the data is grouped, and when it is pivotted.

Filtering
  When this feature is enabled, a button labelled "add filter" is added to the right of the column
  header.  When you click this, a user interface element appears which can be used to set a filter
  on that column.

  Filtering is disabled *in the grid table* when it's used for group or pivot output.  The filtering
  is coordinated by the ``PivotControl`` instead.

Row selection
  When this feature is enabled, an extra column is added on the far left, which contains a checkbox
  - checking it selects the row.  There are API for getting and setting the selected rows.

  Row selection is not allowed when grouping or pivotting.

Row reordering
  When this feature is enabled, an extra column is added on the far right, which contains a button
  that can be used as a handle for dragging and dropping rows.

  Row reordering is not allowed when grouping or pivotting.

Editing
  When this feature is enabled, rows can be edited (details coming later).

  Editing is not allowed when grouping or pivotting.

Feature Flags
=============

All features default to being off.

* ``footer``
* ``sort``
* ``filter``
* ``group``
* ``pivot``
* ``rowSelect``
* ``rowReorder``
* ``add``
* ``edit``
* ``delete``
* ``limit``
* ``tabletool``
* ``blockUI``
* ``progress``

Feature Configuration
=====================

Footer
------

* ``footer.field``
* ``footer.format``
* ``footer.aggregate``

Limit
-----

``limit.method`` : string
  Must be one of:

  + **more** — Place a button at the bottom of the table, which when clicked shows more rows.
  + **paging** — Use traditional paging.

``limit.threshold`` : number
  The minimum number of rows required before the limit kicks in; if there are fewer rows then they
  are all shown.  When using the "more" limit method, this many rows are shown initially.

``limit.chunkSize`` : number
  + With the "more" limit method, how many additional rows to load each time the "more" button is
    clicked / revealed.
  + With the "paging" limit method, how many rows are on each page.

BlockUI
-------

``blockUI.wholePage`` : boolean
  If true, then the whole page is blocked when a View is doing work.  If false, only the affected
  Grid Tables are blocked.

Progress
--------

``progress.method`` : string
  Must be one of:

  + **NProgress** — Renders a progress bar using the NProgress library.
  + **jQueryUI** — Renders a progress bar using the jQuery UI library.  Only works when the
    ``blockUI`` feature is turned on.

API
===

.. js:function:: GridTable.prototype.draw()

.. js:function:: GridTable.prototype.getSelectedRows()

.. js:function:: GridTable.prototype.setSelectedRows()
