'use strict';
const deepmerge = require('deepmerge');
const fs = require('fs');
const path = require('path');

// Programming note:
// top level module code only executes once!
// This code will only be run by first require-er.

const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

function load_config_file(inpath)
{
    var loadpath = path.resolve(inpath);
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

  load_config_file("./config/defaults.js");


  // some places the config file might be. 
  load_config_file("./config/config.js")
  || load_config_file("/run/secrets/config.js")
  || load_config_file("/etc/sietch.d/config.js")
  || load_config_file("/config/config.js")

  // Warning, this is a security hole. Testing environments only!
  // console.log("config:");
  // console.log(JSON.stringify(global.config,"",2));

  
}


module.exports = load_config_file;
