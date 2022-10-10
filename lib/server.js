/*
 * Server-related tasks
STEPS:
import http and url
create a server
get the path,query param,method,headers and payload
listen to the server
create router
define the handler
map the exact router to the handler
construct the data object to send to the handler
route the request to the handler specified in the router
then define the chosenHandler to return the response to handlers
STEPS TO SETUP ENV_CONFIG: LOOK IN CONFIG.JS
SETTING THE HTTPS (first install openssl and then install the certificate and key in project)
setup the code for https also 
*/

// Dependencies

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
// const StringDecoder = require("string_decoder").StringDecoder
const { StringDecoder } = require('string_decoder');
// Defining the server function
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// Testing the file creation
// create the file
// _data.create('test', 'newFile', { foo: 'bar' }, function (err) {});
// read the file
// _data.read('test', 'newFile', function (err, data) {
//   console.log('This was the error', err, 'and this was the data', data);
// });
// update the fileconsole.log('This was the error', err);
// _data.update('test', 'newFile', { fizz: 'test' }, function (err, data) {
//   console.log('This was the error', err);
// });
// to delete the file
// _data.delete('test', 'newFile', function (err) {
//   console.log('This is the error ', err);
// });

// Instantiate the server module object

const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};
server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

// Server logic for both http and https servers
server.unifiedServer = function (req, res) {
  //Get the url and parse it
  const parsedUrl = url.parse(req.url, true);
  //Get the path
  const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
  //Get the query parameters
  const queryStringObj = parsedUrl.query;

  //Get the method requested by user(GET,POST,PUT...)
  const method = req.method.toLowerCase();
  //Get the header for the req
  const headers = req.headers;
  //Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function (data) {
    buffer += decoder.write(data);
  });
  req.on('end', function () {
    buffer += decoder.end();
    //Routing the handler as per the request
    const chosenHandler =
      typeof server.router[path] !== 'undefined'
        ? server.router[path]
        : handlers.notFound;
    //Creating the data object to send to the handler
    const data = {
      path,
      queryStringObj,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    //Route the request to the handler specified in the router
    chosenHandler(data, function (statusCode, payload) {
      // use the statuscode called back by the handler or else return 200
      statusCode = typeof statusCode == 'number' ? statusCode : 200;
      // use the payload called back by the handler or else return {}
      payload = typeof payload == 'object' ? payload : {};
      // convert the payload from JavaScript value to a JSON string,
      const payloadString = JSON.stringify(payload);
      // console the requested details to the console

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green, otherwise print red
      if (statusCode == 200) {
        debug(
          '\x1b[32m%s\x1b[0m',
          method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode
        );
      } else {
        debug(
          '\x1b[31m%s\x1b[0m',
          method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode
        );
      }
    });
  });
};

// define the router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// Init Script
server.init = function () {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, function () {
    console.log(
      '\x1b[36m%s\x1b[0m',
      'The HTTP server is running on port ' + config.httpPort
    );
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log(
      '\x1b[35m%s\x1b[0m',
      'The HTTPS server is running on port ' + config.httpsPort
    );
  });
};

module.exports = server;
