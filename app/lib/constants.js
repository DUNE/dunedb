const crypto = require('crypto');

const DB_NAME = process.env.DATABASE_NAME || 'dunedb';
const APP_PORT = process.env.APP_PORT || 12313;

/**
 * Here we set project-wide constants, pulling from the environment and defaulting to safe values where applicable
 * @constant
 */
module.exports = {
  // Database Constants
  DB_NAME,
  DB_URL: process.env.DATABASE_URL || `mongodb://localhost:27017/${DB_NAME}`,
  DB_CA: process.env.DATABASE_CA,            // Certificate authority and intermediate certificates for trust
  DB_CERTKEY: process.env.DATABASE_CERTKEY,  // Certificate and key in PEM format

  // App Constants
  APP_PORT,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL || `http://localhost:${APP_PORT}`,
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(128).toString('hex'),

  // Auth0 Constants
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
};
