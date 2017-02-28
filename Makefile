SOURCE=$(wildcard src/*.js)

.PHONY:	doc

dist/wcdatavis.js:	wcdatavis.src $(SOURCE)
	./bin/jspp -o $@ $<
	cp $@ examples/

doc:
	rm -rf jsdoc
	jsdoc -c jsdoc_conf.json src
	$(MAKE) -C doc html
