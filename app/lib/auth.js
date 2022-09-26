const auth0Strategy = require('passport-auth0');
const jsonwebtoken = require('jsonwebtoken');
const passport = require('passport');
const querystring = require('querystring');
const router = require('express').Router();
const url = require('url');
const util = require('util');

const { BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET } = require('./constants');
const logger = require('./logger');


/// Perform user login, and then redirect the user to the home page
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid email profile',
  audience: 'https://apa.dunedb.org/api/',
}), function (req, res) {
  res.redirect('/');
});


/// Perform the final stage of authentication, and then redirect the user to either the previously requested URL or the home page
router.get('/callback', function (req, res, next) {
  passport.authenticate('auth0', function (err, user, info) {
    if (err) return next(err);
    if (!user) return res.send(`${JSON.stringify(err)} \n \n ${JSON.stringify(user)}`);

    req.logIn(user, function (err) {
      if (err) return next(err);

      const returnTo = req.session.returnTo;
      delete req.session.returnTo;

      res.redirect(returnTo || '/');
    });
  })(req, res, next);
});


/// Perform user logout, and then redirect to the home page
router.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) { return next(err); }

    let returnTo = req.protocol + '://' + req.hostname;
    const port = req.connection.localPort;

    if (port !== undefined && port !== 80 && port !== 443) returnTo += ':' + port;
    returnTo = BASE_URL;

    let logoutURL = new url.URL(util.format('https://%s/v2/logout', AUTH0_DOMAIN));

    const searchString = querystring.stringify({
      client_id: AUTH0_CLIENT_ID,
      returnTo,
    });

    logoutURL.search = searchString;

    res.redirect(logoutURL);
  });
});


/// Set user information based on a provided M2M client access token
function set_m2m_user(req, res, next) {
  // Retrieve the authorization header from the provided 'req.headers' object, and check that the access token in the header is of 'Bearer' type
  const authString = req.header('authorization');

  if (!(authString.startsWith('Bearer '))) return res.status(401).send(`The access token in the 'authorization' header is not of 'Bearer' type!`);

  // Extract and decode the access token from the header
  const decodedToken = jsonwebtoken.decode(authString.split(' ')[1]);

  // Set the current user information equal to the decoded token (in order to store the M2M client's permissions information)
  // We also need to explicitly set the user information fields, so that they make at least some kind of sense when displayed!
  req.user = decodedToken;
  req.user.user_id = req.user.azp;      // This is the M2M client ID ... no idea why it's under the 'azp' field in the user object!
  req.user.displayName = 'M2M Client';  // Set the display name so that it is clear that a record was not inserted or edited by a human
  req.user.emails = ['none'];           // The 'emails' list must have length > 0, but the M2M client obviously doesn't have an email address

  // Continue with the next function in whatever sequence this one was called from
  next();
}


module.exports = function (app) {
  // Create an Auth0 strategy object that contains all of the user information required for logging in via Auth0
  const strategy = new auth0Strategy({
    domain: AUTH0_DOMAIN,
    clientID: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/callback`,
  }, function (accessToken, refreshToken, extraParams, profile, done) {
    // The 'accessToken' argument is the token to call the Auth0 API (this not needed in the most cases)
    // The 'id' field in the 'extraParams' argument contains the user's JSON web token
    // The 'profile' argument contains all of the information from the user

    // Decode the access token (note that this process does NOT verify the token and user credentials)
    const decodedToken = jsonwebtoken.decode(accessToken);

    // Set the user profile information based on the decoded token
    profile.permissions = decodedToken.permissions;
    profile.user_metadata = decodedToken[`${BASE_URL}/user_metadata`];
    profile.roles = decodedToken[`${BASE_URL}/roles`];

    logger.info(decodedToken, profile);

    // Return the complete user profile
    return done(null, profile);
  });

  // Configure the passport to use the Auth0 strategy, and the main DB app to use the passport
  passport.use(strategy);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function (user, done) { done(null, user); });
  passport.deserializeUser(function (user, done) { done(null, user); });

  // If a route with the '/api' prepend is requested, first call the 'set_m2m_user' function above
  app.use('/api', set_m2m_user);

  // Allow user information (in the 'req.user' object) to be directly accessible in .pug files (rather than having to be passed through routing arguments)
  app.use(function (req, res, next) {
    if (req.user) res.locals.user = { ...req.user };

    next();
  });

  // Use the standard router for authentication routes
  app.use('/', router);
};
