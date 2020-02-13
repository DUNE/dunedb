const express = require('express');

var database = require('./database.js');
var MUUID = require('uuid-mongodb');
var Components = require('./Components.js');
var Forms = require('./Forms.js');
var Tests = require('./Tests.js');
var config = require('./config.js');


var user = {
  "displayName": "Nathaniel Tagg",
  "id": "google-oauth2|107502673290572302859",
  "user_id": "google-oauth2|107502673290572302859",
  "provider": "google-oauth2",
  "name": {
    "familyName": "Tagg",
    "givenName": "Nathaniel"
  },
  "emails": [
    {
      "value": "Ntagg@otterbein.edu"
    }
  ],
  "picture": "https://lh3.googleusercontent.com/a-/AAuE7mC1JHFXKj7e5pOBIIfJ2JzHm8q2MUBLrg7muzxOBg",
  "locale": "en",
  "nickname": "Ntagg"
};

function randomGaussian(mean,sigma) {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    var norm =  Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return (norm*sigma)+mean;
}

var sites = ['WIS','CHI','PSL','YAL'];

function pickRandom(arr)
{
  var i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

async function createWireTension(apa)
{
    var tensions = [];
    for(var i=0;i<1000;i++) 
        tensions.push(randomGaussian(100+i*0.05,20));
    var tensiondata = {data: tensions, min:Number.MAX_VALUE, max:Number.MIN_VALUE, non_numeric:0, mean:0};

    var tot = 0;
    for(var i=0;i<tensions.length;i++) {
        if(tensions[i]< tensiondata.min) tensiondata.min = tensions[i];
        if(tensions[i]> tensiondata.max) tensiondata.max = tensions[i];
        tensiondata.mean += tensions[i]/tensions.length;
    }

    var data = {"componentUuid":apa.componentUuid,
            "site":pickRandom(sites),
            "side":pickRandom(["A","B"]),
            "user":user.nickname,
            "measurementDate":(new Date()).toISOString(),
            "measurementVersion":"v1",
            "wireSegmentNumber": Math.floor(Math.random()*3)*1000,
            "arrayData":tensiondata, //{"data":[1,2,3],"min":1,"max":3,"non_numeric":0},
            "notes":"Auto-created dummy data populateWireTensions.js",
            "submit":true,
            };            
   var submission = {data: data, form_id:"wireTension" }        
   await Tests.saveTestData("wireTension",submission,"::1",user);
}


(async function(){
  try{
    await database.attach_to_database()
    // db.dropDatabase();

    // insert a new form.
    var new_record = {};
    new_record.schema = JSON.parse(require('fs').readFileSync(__dirname+"/wireTensionSchema.json")),
    new_record.version= 1;
    new_record.form_title = "Wire Tensioning Test";
    await Forms.saveForm("wireTension",new_record,null,null,user);

    // Now get some APAs.
    var apas = await Components.getComponents("APA");
    console.log(apas);
    for(var apa of apas.APA) {
        await createWireTension(apa);
        await createWireTension(apa);
        await createWireTension(apa);
        await createWireTension(apa);
    }

    console.log("done");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);

  }

})().then(console.log("done"));

