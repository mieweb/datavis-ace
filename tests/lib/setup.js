const handler = require('serve-handler');
const http = require('http');

function server() {
	before(async function () {
		server = http.createServer((request, response) => {
			return handler(request, response, {
				public: 'tests/pages',
				cleanUrls: false
			});
		});

		return server.listen(3000, () => {
			console.log('Running at http://localhost:3000');
		});
	});

	after(async function () {
		return server.close();
	});
}

exports.server = server;
