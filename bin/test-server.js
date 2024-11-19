#!/usr/bin/env node

const http = require('http');
const server = require('../tests/lib/server.js');

http.createServer(server.handler({
  cleanUrls: false,
	public: 'tests/pages'
})).listen(3000);
