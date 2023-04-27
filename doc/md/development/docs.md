# Writing & Building Documentation

To build all documentation, after installing the required dependencies, simply use `make doc`.  This builds both the JS API docs and the manual.

## JavaScript API Docs

The JavaScript API documentation is generated from the comments of the source code using *jsdoc*.  After installing the [Pre-Requisites](index.md#pre-requisites), run `make jsdoc` to build the JavaScript API documentation.  The result is in the `jsdoc` directory, which can be accessed via the [local server](http://localhost:5000/jsdoc/index.html).

## This Manual

The manual is written in Markdown using a Python program called *mkdocs*.  After installing the [Pre-Requisites](#pre-requisites), run `make mkdocs` to produce the documentation in the `doc/html` directory.  These can then be accessed via the [local server](http://localhost:5000/doc/html/index.html).

!!! tip
    When actively working on the documentation, you can also use `mkdocs serve` to start a separate server that only provides the documentation, but reloads automatically as you edit the pages.

When writing for the manual, the following links may be useful:

* [Writing Your Docs with MkDocs](https://www.mkdocs.org/user-guide/writing-your-docs/)
* [Python-Markdown Extensions](https://python-markdown.github.io/extensions/) — We use the `extra`, `admonition`, `codehilite`, `smarty`, and `toc` extensions.  We can always enable more as needed.

* [PyMdown Extensions](https://facelessuser.github.io/pymdown-extensions/extensions/arithmatex/) — We use the `details` and `superfences` extensions, the latter mostly for the automatic generation of mermaid diagrams.

* [Mermaid Syntax](https://mermaid-js.github.io/mermaid/#/./n00b-syntaxReference)

## Testing JS API Docs

Since tests are written in JavaScript, the libraries that help with testing are also documented with jsdoc.  You can build them by running `make jsdoc` in the `tests` directory, or by running `make doc` at the toplevel directory.  The resulting pages go into `tests/jsdoc` and can be accessed via the [local server](http://localhost:5000/tests/jsdoc/index.html).
