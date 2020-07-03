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


## Authors

* **Nathaniel Tagg** - *Otterbein University* - http://neutrino.otterbein.edu


## Notes

[Working notes](docs/.md)