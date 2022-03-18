// Import routes
const routes = [
  require('./components'),
  require('./courses'),
  require('./docs'),
  require('./jobs'),
  require('./processes'),
  require('./search'),
  require('./tests'),
  require('./users'),
  require('./misc'), // includes entry route; TODO: rename
];

// Routes with prepended paths
const api = require('./api');

const paths = [
  { path: '/file', route: require('./files') },
  { path: '/autocomplete', route: require('./autocomplete') },
  { path: '/json', route: api },
  { path: '/api', route: api },
];

module.exports = { routes, paths };
