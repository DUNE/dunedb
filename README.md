# The DUNE APA Construction Database

This repository contains all of the code required for the DUNE APA Construction Database (referred to as the 'APA DB' for short).  This database is designed to store all records relating to the manufacture, testing, quality assurance and transport of the DUNE APA frames and their constituent components.

Please note that this README is intended for <u>**database developers**</u> - for user documentation, please consult the [Github Wiki](https://github.com/DUNE/dunedb/wiki).


## Getting Started

The DB code is designed to run on a **docker** system, so you will need to have a (relatively) recent version of Docker installed on the computer or server on which you intend to run the DB.  Once this is done, and you have performed a `git clone` of this (`dunedb`) repository, executing the following command when in the `app` directory will set up and start a new DB instance:

```
docker compose up -d
```

Note that the `-d` flag above indicates that the DB will run in 'detached' mode, i.e. the live logs will not be shown.  To access the logs once the DB is running, please run the following command in the `app` directory:

```
docker compose logs -f app
```

To stop the DB instance at any point, simply run the following command in the `app` directory:

```
docker compose down
```


## Code Organisation

The code in this respository is organised as follows (for simplicity, normally hidden directories and files are not listed here):

* `/app` : contains all of the code required for the APA DB app
    * `/lib` : JavaScript functions that operate directly on and with the MongoDB database
    * `/pug` : Pug templates for the web interface pages
    * `/routes` : JavaScript functions that dictate which `/lib` functions are called when a user accesses a specific web interface URL, and which `/pug` template is displayed for that URL
    * `/scss` : static CSS styling, compiled at DB startup
    * `/static` : various functions that operate at the web interface's individual page level
        * `/css` : additional CSS style guides for specific pages
        * `/formio` : JavaScript code that governs the behaviour and appearance of the various Formio form components used by the web interface
        * `/images` : images that are used by the web interface
        * `/js` : non-specific page level JavaScript functions, as well as external third-party libraries
        * `/pages` : JavaScript code that governs the behaviour of specific pages (with each file in this subdirectory corresponding to the same-named file in the `/pug` subdirectory)
    * `app.js` : the main APA DB app
    * `index.js` : the 'launch point' for starting, connecting to and stopping the APA DB app
* `/m2m` : contains standalone Python code for the machine-to-machine ('M2M') client scripts ... please see the [dedicated README](https://github.com/DUNE/dunedb/tree/staging/m2m#readme) for full details
* `/okd` : files required for deployment of the APA DB on the OKD system at Fermilab


## Authors

* [**Krish Majumdar**](https://github.com/krishmaj)
* [**Micah Henning**](https://micah.soy)
* [**Brian Rebel**](https://github.com/bjrebel)
* [**Nathaniel Tagg**](https://github.com/nathanieltagg) (former)
