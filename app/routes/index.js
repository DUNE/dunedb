// Frontend interface routes
const routes = [
  require('./actions'),
  require('./components'),
  require('./processes'),
  require('./search'),
  require('./start'),
  require('./tags'),
  require('./users'),
  require('./workflows'),
];

// Backend and API routes (with prepended paths)
const api = [
  require('./api/actions'),
  require('./api/components'),
  require('./api/forms'),
  require('./api/search'),
  require('./api/users'),
  require('./api/workflows'),
];

const paths = [
  { path: '/autocomplete', route: require('./autocomplete') },
  { path: '/json', route: api },
  { path: '/api', route: api },
];

module.exports = { routes, paths };
