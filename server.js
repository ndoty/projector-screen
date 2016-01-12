var http = require('http');

http.createServer(function(req, res) {
    res.end('Hello, Raspberry Pi');
}).listen(80);
