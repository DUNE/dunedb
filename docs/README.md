# DUNE DB

The Quality Assurance app for the Deep Underground Neutrino Experiment frame manufacturing process.

## Machine-to-Machine (m2m) interface

To submit a database record, use the `client/upload_to_db2.py` script.  You will need a small configuration file `api_config2.json` to make it work; talk to Nathaniel to get such an authentication file.

## API

To use the m2m api, see [docs/api.md](api.md)
To see metadata schemas used, see [docs/schemas.md](schemas.md)

## Getting Started

Have a recent version of Docker installed and execute:

```bash
$ docker compose up
```

## Contributing

Join the `apa_db` channel on the DUNE Slack.

### Design principles

In general, I try to make the URL routes human-readable and explicable.  The only hard-to-type things should be ID numbers for specific entries or components.

Human-usable routes and API routes have similar structure.  For example:
https://apa.dunedb.org/component/abcd123...  yields a view of the component
https://apa.dunedb.org/json/component/abcd123...  can be gotten from the browser, for a JSON document with the component info
https://apa.dunedb.org/api/component/abcd123...  gets the JSON document using an machine-to-machine authentication suitable for scripts.

## Code organization

The app is located in the `/app` directory.  Brief outline:

* `/app/index.js` is the launch point. (Also the home page. FIXME)
* `/app/lib` contains app logic
* `/app/pug` contains only Pug templates, which are used to render web pages.
* `/app/routes` contains the Express route functions, which in turn mostly call the Pug render routines.
* `/app/routes/api` has all the low-level API calls accessible, see [docs/api.md](api.md)
* `/app/schemas` are some JSON forms used to set up defaults in first-time intialization of the entire database 
* `/app/static` contains static files accessible to the UI, and SCSS files that are rendered into CSS files dynamicaly.
* `/client` contains example files showing how to use the API.js
* `/dbTools` are some scripts used in development and for schema evolution

## Authors

* **Nathaniel Tagg** - https://github.com/nathanieltagg
* **Krish Majumdar** - https://github.com/krishmaj
* **Micah Henning** - https://micah.soy
