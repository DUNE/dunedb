const { NODE_ENV, APP_PORT } = require('./lib/constants');
const { db } = require('./lib/db');
const logger = require('./lib/logger');

require('app-module-path').addPath(__dirname); // Set this as the base for all 'require' lines in future.

var createApp = require('./app'); 
var http = require('http'); // to run the server

logger.info(`Starting up in mode: ${NODE_ENV}`)

db.open()
  .then(async function run(){
    var app = await createApp();

    var httpServer = http.createServer(app);

    function closeGracefully() {
      // see https://www.oesmith.co.uk/2012/01/08/graceful-shutdown-node-js-express.html
      // Shut down gracefully!
      logger.info("Closing on SIGTERM");
      httpServer.close();
    }
    process.on('SIGINT', closeGracefully); 
    process.on('SIGHUP', closeGracefully); 

    httpServer.on('close', async function () {
      // this runs after the above has completed. It allows us to close the database.
      logger.info("Web server closed. Shutting down DB connection.");
      await db.close();
      logger.info("Database shutdown complete.")

      process._getActiveHandles();
      process._getActiveRequests();
      process.exit();
    });

    httpServer.listen(APP_PORT, () => logger.info(`listening on port ${APP_PORT}!`))  
  });
