'use strict';
const deepmerge = require('deepmerge');
const fs = require('fs');
const Path = require('path');
const Glob = require('glob');

// Programming note:
// top level module code only executes once!
// This code will only be run by first require-er.

const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

function load_config_file(inpath)
{
    var loadpath = Path.resolve(inpath);
    // console.log("... looking for",inpath)
    if(fs.existsSync(loadpath)) {
      global.config = deepmerge(global.config,
                                require(loadpath), 
                                { arrayMerge: overwriteMerge });
      console.log("Loaded config file ",loadpath);
      return true;
    }
    return false;
}

if(!global.config) {
  global.config = {};

  // First, defaults.
  load_config_file("./config/defaults.js");

  // Then, load anything in the config directory.
  // This is used mainly for okd/container deployment, where there might be multiple files.
  var config_directory = process.env["SIETCH_CONFIG_DIR"] || "/etc/sietch.d";
  var config_files = Glob(config_directory+"/"+"*.js");
  for(var f of config_files) load_config_file(f);

  // some places the config file might be. 
  // Finally, any local config (for running on laptop, for example)
  load_config_file("./config/config.js");

  // Warning, this is a security hole. Testing environments only!
  // console.log("config:");
  // console.log(JSON.stringify(global.config,"",2));

  
}


module.exports = load_config_file;
