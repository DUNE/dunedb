// Import routes
const routes = [
  require('./actions'),
  require('./components'),
  require('./jobs'),
  require('./processes'),
  require('./search'),
  require('./start'),
  require('./tags'),
  require('./tests'),
  require('./users'),
  require('./workflows'),
];

// Routes with prepended paths
const api = require('./api');

const paths = [
  { path: '/autocomplete', route: require('./autocomplete') },
  { path: '/json', route: api },
  { path: '/api', route: api },
];

module.exports = { routes, paths };
