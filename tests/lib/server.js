/**
 * Functions used for common test setup/teardown.
 * @module setup
 */

const http = require('http');
const url = require('url');
const fs = require('fs');

const serveHandler = require('serve-handler');
const _ = require('lodash');

const reflectCgi = (req, res, u) => {
  let o = {
    data: _.map(Object.keys(u.query).sort(), (k) => {
    	let x = u.query[k];
      return {
      	name: k,
				value: typeof x === 'string' ? x
					: Array.isArray(x) ? x.join(',')
					: JSON.stringify(x)
      };
    }),
    typeInfo: [{
      field: 'name',
      type: 'string'
    }, {
      field: 'value',
      type: 'string'
    }]
  };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(o));
};

const autoLimit = (req, res, u) => {
	res.setHeader('Content-Type', 'application/json');
	fs.readFile('tests/data/random1000.json', 'utf8', (err, data) => {
		if (err != null) {
			res.end();
		}
		json = JSON.parse(data);
		if (u.query.state) {
			json.data = _.filter(json.data, (d) => d.state === u.query.state);
		}
		if (u.query.limit != null) {
			json.data = json.data.slice(0, u.query.limit);
		}
		res.end(JSON.stringify(json));
	});
};

const ssr = {
	basic1: (req, res, u) => {
		if (req.method !== 'POST') {
			throw new Error('Must be a POST request');
		}

		let data = '';
		req.on('data', (chunk) => {
			data += chunk.toString(); // Collect the data chunks
		});

		req.on('end', () => {
			const result = JSON.parse(data).map((p) => `<pre>${JSON.stringify(p)}</pre>`);
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(result));
		});
	},
	basic2: (req, res, u) => {
		if (req.method !== 'POST') {
			throw new Error('Must be a POST request');
		}

		let data = '';
		req.on('data', (chunk) => {
			data += chunk.toString(); // Collect the data chunks
		});

		req.on('end', () => {
			const result = JSON.parse(data).map((p) => `<pre>${JSON.stringify(p)}</pre>`);
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify(result));
		});
	}
};

/**
 * Creates a handler for requests coming to the testing web server.
 *
 * @alias module:setup.handler
 * @param {object} opts Handler options, passed directly to [serve-handler](https://www.npmjs.com/package/serve-handler#options).
 */

const handler = (opts) => (req, res) => {
	try {
		let u = url.parse(req.url, true);
		switch (u.pathname) {
		case '/reflect/cgi':
			return reflectCgi(req, res, u);
		case '/ds/autolimit':
			return autoLimit(req, res, u);
		case '/ssr/basic1':
			return ssr.basic1(req, res, u);
		case '/ssr/basic2':
			return ssr.basic2(req, res, u);
		default:
			return serveHandler(req, res, opts);
		}
	}
	catch (e) {
		res.setHeader('Content-Type', 'text/plain');
		res.statusCode = 500;
		res.end(e.stack);
		const u = url.parse(req.url, true);
		console.error('METHOD:', req.method);
		console.error('PATH:  ', u.pathname);
		console.error('QUERY: ', u.query);
		console.error(e);
	}
};

module.exports = {
	handler: handler
};
