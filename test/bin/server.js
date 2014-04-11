#!/usr/bin/env node
// ex: filetype=javascript
var static = require('node-static');

var fileServer = new static.Server('test/');

require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    }).resume();
}).listen(8080);
