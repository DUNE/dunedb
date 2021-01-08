// const whyohwhy = require('why-is-node-running') // should be your first require

global.config = require('./configuration.js');  // must be first
var database = require('./lib/database.js'); // Exports global 'db' variable
var App = require("./lib/app.js")

const http = require('http');
// var https = require('https');

global.BaseDir = __dirname;

// logging.
var pino = require("pino");
var pino_opts = {
    customLevels: {
        http: 29
    },
    // level: 'http',  // change to 'info' if you don't want the play-by-play of method calls
    level: 'info',  // change to 'info' if you don't want the play-by-play of method calls

};

if(process.env.NODE_ENV=='production') { 
    pino_opts.base = {deployment: config.deployment, hostname:require('os').hostname()}
} else {
    // never use this when running under pm2
    pino_opts.prettyPrint = {
        // messageFormat: "{levelLabel} {request.url} {msg}"
        ignore:'pid,hostname',
        translateTime: "SYS:HH:mm:ss"
    }

}

global.logger = require("pino")(pino_opts);

logger.info("Starting up in mode: ",(process.env.NODE_ENV)||'development'," deployment:",config.deployment)

// log.info('hi');
// log.warn({lang: 'fr'}, 'au revoir');
// var a = {a:1,b:2,thing:"blah"};
// log.info('thing',a)
// log.info(a);

// process.exit(1);


database.attach_to_database()
  .then(async function run(){
    var app = await App.create_app();
    await App.setup_routes(app);
    var httpServer = http.createServer(app);
    httpServer.listen(config.http_server_port, () => logger.info(`listening on port ${config.http_server_port}!`))  

    // var httpsServer = https.createServer(app);
    // console.log(config.https_server_port);
    // httpsServer.listen(config.https_server_port, () => console.log(`Example app listening on https port ${config.https_server_port}!`))  

  })

// setTimeout(function () {
//   whyohwhy() // logs out active handles that are keeping node running
// }, 3000)


