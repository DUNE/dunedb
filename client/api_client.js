const express = require('express');

var request = require('request');
var util    = require('util');

function SietchConnect(config)
{
  this.auth = config || require('./api_config2.json');
  this.request_params = {
    method: "POST",
    headers: { 'content-type': 'application/json' },
    url: this.auth.url + "/oauth/token",
    body: JSON.stringify(this.auth.client_credentials)
  };

  this.connect = async function() {
    var response = await util.promisify(request)(this.request_params);
    this.token = response.body;
    // console.log(this.token);
  }

  this.api = async function(method,route,data) {
    var req = {
        method: method,
        url: this.auth.url + "/api" + route,
        headers: { 
          authorization: 'Bearer ' + this.token, 
          'content-type': 'application/json' },
      };
    // console.log("req",req);
    if(data) req.body = JSON.stringify(data);
    var response = await util.promisify(request)(req);
    return JSON.parse(response.body);
  }

  this.get = async function(route) {
    return this.api("GET",route);
  }
  this.post = async function(route,data) {
    return this.api("POST",route,data);
  }
}

module.exports = SietchConnect
