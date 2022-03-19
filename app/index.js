const { NODE_ENV, APP_PORT } = require('./lib/constants');
const { db } = require('./lib/db');
const logger = require('./lib/logger');

require('app-module-path').addPath(__dirname); // Set this as the base for all 'require' lines in future.

var createApp = require('./app');

let http;
const options = {};
if (NODE_ENV === 'development') {
  http = require('http');
} else {
  http = require('https');
  const certificate = process.env.HTTPS_CERTIFICATE;
  const key = process.env.HTTPS_KEY;

  if (!certificate)
    throw new Error('Certificate required in $HTTPS_CERTIFICATE environment variable in non-development environments.');
  if (!key)
    throw new Error('HTTPS Private Key required in $HTTPS_KEY environment variable in non-development environments.');

  options.key = key;
  options.cert = certificate;
}

logger.info(`Starting up in mode: ${NODE_ENV}`);

db.open()
  .then(async function run(){
    const app = await createApp();
    const server = http.createServer(options, app);

    function closeGracefully() {
      // see https://www.oesmith.co.uk/2012/01/08/graceful-shutdown-node-js-express.html
      // Shut down gracefully!
      logger.info("Closing on SIGTERM");
      server.close();
    }
    process.on('SIGINT', closeGracefully); 
    process.on('SIGHUP', closeGracefully); 

    server.on('close', async function () {
      // this runs after the above has completed. It allows us to close the database.
      logger.info("Web server closed. Shutting down DB connection.");
      await db.close();
      logger.info("Database shutdown complete.")

      process._getActiveHandles();
      process._getActiveRequests();
      process.exit();
    });

    server.listen(APP_PORT, () => logger.info(`listening on port ${APP_PORT}!`))  
  });
