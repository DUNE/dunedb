const routes = [
  require('./actions'),
  require('./autocomplete'),
  require('./components'),
  require('./search'),
  require('./start'),
  require('./tags'),
  require('./users'),
  require('./workflows'),
];

const api = [
  require('./api/actions'),
  require('./api/components'),
  require('./api/forms'),
  require('./api/search'),
  require('./api/users'),
  require('./api/workflows'),
];

const paths = [
  { path: '/json', route: api },
  { path: '/api', route: api },
];

module.exports = { routes, paths };
