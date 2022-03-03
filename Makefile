JSDOC=./node_modules/.bin/jsdoc
SOURCE=$(shell find src -type f -name '*.js')
DIST_FILES=$(addprefix dist/,wcdatavis.js wcdatavis.min.js wcdatavis.css)
EXAMPLE_FILES=$(patsubst dist/%,examples/%,$(DIST_FILES))
DOC_PUB_PATH=zeus.med-web.com:~/public_html/datavis

.PHONY:	all doc doc-publish doc-clean doc-serve jsdoc mkdocs serve tests test examples clean tags
.DEFAULT:	all

all:	$(DIST_FILES)

dist/wcdatavis.js:	rollup.config.js datavis.js $(SOURCE)
	npm run rollup

dist/wcdatavis.min.js:	dist/wcdatavis.js
	npm run uglify

doc:	jsdoc mkdocs
	$(MAKE) -C tests $@
	@printf '\033[32;1mRun `make doc-publish` to publish documentation to $(DOC_PUB_PATH)\033[0m\n'

doc-publish:	doc
	rsync -a --delete doc/html/ $(DOC_PUB_PATH)/manual/
	rsync -a --delete jsdoc/ $(DOC_PUB_PATH)/jsdoc/
	$(MAKE) -C tests $@

doc-clean:
	rm -rf doc/html
	rm -rf jsdoc
	$(MAKE) -C tests $@

doc-serve:
	mkdocs serve

jsdoc:
	$(JSDOC) -p -c jsdoc_conf.json src

mkdocs:
	mkdocs build

serve:
	npm run http-server

tests:	$(DIST_FILES)
	$(MAKE) -C tests

test:	tests
	npm run test

examples:	tests $(EXAMPLE_FILES)
	cp tests/data/*.json examples/test

$(EXAMPLE_FILES):examples/%:	dist/%
	cp $^ $@

clean:
	$(MAKE) -C tests clean
	rm -rf doc/html
	rm -f dist/wcdatavis.js dist/wcdatavis.min.js
	rm -f $(EXAMPLE_FILES)
	rm -f examples/test/*.json
	rm -rf jsdoc

tags:
	ctags -R -f TAGS --languages=JavaScript --sort=foldcase src
