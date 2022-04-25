JSDOC=./node_modules/.bin/jsdoc
SOURCE=$(shell find src -type f -name '*.js')
DIST_FILES=$(addprefix dist/,wcdatavis.js wcdatavis.min.js wcdatavis.css)
EXAMPLE_FILES=$(patsubst dist/%,examples/%,$(DIST_FILES))

.PHONY:	doc jsdoc mkdocs clean tags examples serve test tests
.PHONY:	setup teardown npm-setup npm-teardown python-setup python-teardown

all:	$(DIST_FILES)

npm-setup:
	@if [ -f .nvmrc ] ; then printf '\033[34;1mPlease run `nvm use` to ensure the right version of Node is used.\033[0m\n' ; fi
	npm install

npm-teardown:
	rm -rf node_modules

python-setup:
	pyenv virtualenv datavis
	pyenv local datavis
	pip install -r requirements.txt

python-teardown:
	-pyenv virtualenv-delete -f datavis
	-pyenv local --unset

setup:	npm-setup python-setup
teardown:	npm-teardown python-teardown

dist/wcdatavis.js:	rollup.config.js datavis.js $(SOURCE)
	npm run rollup

dist/wcdatavis.min.js:	dist/wcdatavis.js
	npm run uglify

doc:	jsdoc mkdocs
	$(MAKE) -C tests jsdoc

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
