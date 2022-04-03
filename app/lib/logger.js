const os = require('os');
const pino = require('pino');
const { NODE_ENV } = require("./constants");

const pino_opts = {
  customLevels: {
    http: 29
  },
};

if (NODE_ENV == 'production') { 
  pino_opts.base = {
    level:'http',
    deployment: NODE_ENV,
    hostname: os.hostname(),
  }
}

module.exports = pino(pino_opts);
