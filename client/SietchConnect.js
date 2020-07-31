var request = require('request');
var util    = require('util');

function SietchConnect(config)
{
  this.auth = config || require('./api_config2.json');
  this.request_params = {
    method: "POST",
    headers: { 'content-type': 'application/json' },
    url: this.auth.url + "/machineAuthenticate",
    body: JSON.stringify(this.auth.client_credentials)
  };

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
