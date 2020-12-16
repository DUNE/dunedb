// const whyohwhy = require('why-is-node-running') // should be your first require

global.config = require('./configuration.js');  // must be first
var database = require('./lib/database.js'); // Exports global 'db' variable
var App = require("./lib/app.js")

var http = require('http');
// var https = require('https');

global.BaseDir = __dirname;



database.attach_to_database()
  .then(async function run(){
    var app = await App.create_app();
    await App.setup_routes(app);
    var httpServer = http.createServer(app);
    httpServer.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))  

    // var httpsServer = https.createServer(app);
    // console.log(config.https_server_port);
    // httpsServer.listen(config.https_server_port, () => console.log(`Example app listening on https port ${config.https_server_port}!`))  

  })

// setTimeout(function () {
//   whyohwhy() // logs out active handles that are keeping node running
// }, 3000)


