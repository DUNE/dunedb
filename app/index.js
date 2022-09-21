const { NODE_ENV, APP_PORT } = require('./lib/constants');
const { db } = require('./lib/db');
const logger = require('./lib/logger');

var createApp = require('./app');
let http;
const options = {};

if (NODE_ENV === 'development') {
  http = require('http');
} else {
  http = require('https');

  const certificate = process.env.HTTPS_CERTIFICATE;
  const key = process.env.HTTPS_KEY;

  if (!certificate) throw new Error('A certificate is required in the $HTTPS_CERTIFICATE environment variable when working in non-development environments!');
  if (!key) throw new Error('A HTTPS private key is required in the $HTTPS_KEY environment variable when working in non-development environments!');

  options.key = key;
  options.cert = certificate;
}

logger.info(`Starting up in '${NODE_ENV}' environment!`);

db.open()
  .then(async function run() {
    const app = await createApp();
    const server = http.createServer(options, app);

    // Shut down the server gracefully ... see https://www.oesmith.co.uk/2012/01/08/graceful-shutdown-node-js-express.html
    function closeGracefully() {
      logger.info('Closing on SIGTERM');
      server.close();
    }

    process.on('SIGINT', closeGracefully);
    process.on('SIGHUP', closeGracefully);

    // Once the server is shut down using the function above, close the database
    server.on('close', async function () {
      logger.info('Web server closed ... shutting down database connection ...');

      await db.close();
      logger.info('Database shutdown complete!')

      process._getActiveHandles();
      process._getActiveRequests();
      process.exit();
    });

    server.listen(APP_PORT, () => logger.info(`Listening on port ${APP_PORT}!`))
  });
