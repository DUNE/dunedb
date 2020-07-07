# Sietch

This project is the code that will be used to run the DUNE experiment APA construction database.


## Machne-to-Machine (m2m) interface

To submit a database record, use the `client/upload_to_db2.py` script.  You will need a small configuration file `api_config2.json` to make it work; talk to Nathaniel to get such an authentication file.

## API

To use the m2m api, see [docs/api.md](docs/api.md)
To see metadata schemas used, see [docs/schemas](docs/schemas)

## Getting Started

See [sietch.xyz]

### Prerequisites

- Node.js
- npm
- Mongodb
- auth0.com developer account (free)

### Installing

For installing a fresh copy of this db system:

- Make sure node.js and npm are [installed](https://developers.redhat.com/hello-world/nodejs/) on this system. 
- `npm install`
- Create a `config.js` file for configurations. This file should simply export overrides for what is in `configuration.js`
- Install mongodb. Start the server.  
- Provide the connection details to mongo in `config.js`
- In config.js, set the auth0 tokens and secrets required to do logins.

To run it, 
```
node index.js
```

Use `nodemon` for testing. Use `pm2` to keep a server alive.

## Contributing

Talk to Nathaniel.  Join the `apa_db` channel on the DUNE Slack.


## Code organization

`index.js` is the launch point. (Also the home page. FIXME)

`/pug` contains only Pug templates, which are used to render web pages.

`/routes` contains the Express route functions, which in turn mostly call the Pug render routines.

`/routes/api.js` has all the low-level API calls accessible, see [docs/api.md](docs/api.md)

`/lib` has all the internals. Database should be accessed ONLY through functions in these source files.  It is FORBIDDEN to write to the database in any way other than these.

`/static` contains files used by the front-end only.  All files in here are statically presented to the client under the root path.  (i.e. `./static/images/logo.png` is available to the browser as `/images/logo.png`)

`/local` contains files used by the front-end, and will override or append to files in the `/static` area. This is indended for local overrides for debugging.

`/client` contains example files showing how to use the API.js

`/scss` contains SCSS files that are rendered into CSS files dynamicaly.

`/dbTools` are some scripts used in development and for schema evolution

`/dbSeed` are some JSON forms used to set up defaults in first-time intialization of the entire database 

`/configuration.js` describes the default configuration.  Some elements will need overriding to work.  Overrides are to be put in `/config.js`  FIXME make a config directory
## Authors

* **Nathaniel Tagg** - *Otterbein University* - http://neutrino.otterbein.edu


## Notes

[Working notes](docs/.md)