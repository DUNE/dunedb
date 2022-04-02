
const { NODE_ENV } = require("./constants");
const os = require('os');
const pino = require('pino');

const pino_opts = {customLevels: {http: 29}};

if (NODE_ENV == 'production')
{ 
  pino_opts.base = {level     : 'http',
                    deployment: NODE_ENV,
                    hostname  : os.hostname()}
}

module.exports = pino(pino_opts);

