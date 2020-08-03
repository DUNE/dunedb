"use strict";
var request = require('request');
var util    = require('util');

class TimeStats{
  constructor() {
    this.timeTotal = 0;
    this.callsTotal = 0;
  }
  start() {
    this.callsTotal++;
    this.tstart = Date.now();
  }
  end(){
    var dt = Date.now()-this.tstart;
    this.timeTotal += dt;
  }
  toString(){
    return `${this.callsTotal} calls, ${(this.timeTotal/1000).toFixed(3)} s, ${(this.timeTotal/this.callsTotal).toFixed(0)} ms/call`;
  }
}

function SietchConnect(config)
{
  this.auth = config || require('./api_config2.json');
  this.request_params = {
    method: "POST",
    headers: { 'content-type': 'application/json' },
    url: this.auth.url + "/machineAuthenticate",
    body: JSON.stringify(this.auth.client_credentials)
  };
  this.stat_total  =new TimeStats();
  this.stats = {};

  this.connect = async function() {
    console.log("Connecting..",this.request_params);
    var response = await util.promisify(request)(this.request_params);
    // console.log(response);
    if(response.statusCode != 200) throw new Error('Error in connect(). Response code '+response.statusCode+'\n'+ response.body);
    this.token = response.body;
    // console.log("got access token",this.token)
    return true;
  }

  this.api = async function(method,route,data) {
    
    // stats:
    var r = route.split('/')[0]
    this.stats[r] = this.stats[r] || new TimeStats();
    this.stats[r].start();
    this.stat_total.start();

    var req = {
        method: method,
        url: this.auth.url + "/api" + route,
        headers: { 
          authorization: 'Bearer ' + this.token, 
          'content-type': 'application/json' },
      };
    // console.log("req",req);
    if(data) {
      req.body = JSON.stringify(data);
      // console.log('posting',req.body);
    }
    var response = await util.promisify(request)(req);
    if(response.statusCode != 200) throw new Error("API call failed: \n"+(response.body));

    this.stats[r].end();
    this.stat_total.end();

    return JSON.parse(response.body);
  }

  this.get = async function(route) {
    return this.api("GET",route);
  }
  this.post = async function(route,data) {
    return this.api("POST",route,data);
  }

  this.report = function() {
    console.log(`Total:  `,this.stat_total.toString());
    for(var r in this.stats) {
    console.log(`${r}  `,this.stats[r].toString());
    }
  }
}

module.exports = SietchConnect
