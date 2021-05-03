#!/usr/bin/env node 
"use strict";

var request = require('request');
var util    = require('util');
var SietchConnect = require('../client/SietchConnect.js');
var fs = require('fs');
var sanitize_filename = require("sanitize-filename");

var arequest = util.promisify(request);
var sietch = new SietchConnect(
{
  "url": "http://localhost:12313",
  "client_credentials": {
    "user_id": "m2m3e36a366c56b139b",
    "secret": "secreta0f760f1d15a7691bdbb3fce3e3209e767678ed746c6dcbbb87f38bd961aabfc3fc605d2972d4ee11ab1c1b2a09d37a3047ee8f51d46478898839bfb7892ab59"
  }
});


async function main()
{
  await sietch.connect();
  await sietch.post("/course/trialCourse",
  {
    courseId:"trialCourse",
    name: "How to play the flute",
    icon: null,
    tags: [ "flute" ],
    path: [
      {
        type: 'component',
        formId: "Protodune APA",
        advice: "Don't take any wooden nickels",
        identifier: "componentUuid",      
      },

      {
        type: 'test',
        formId: "prototype_apa_Uwind",
        advice: "hup",
        identifier: "componentUuid",      
      },

      {
        type: 'job',
        formId: "work1",
        advice: "hup",
        identifier: "data.componentUuid",      
      },

    ]

  });

}


main().then(console.log("Done!"));