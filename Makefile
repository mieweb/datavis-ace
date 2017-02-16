SOURCE=$(wildcard src/*.js)

dist/wcdatavis.js:	wcdatavis.src $(SOURCE)
	./bin/jspp -o $@ $<
