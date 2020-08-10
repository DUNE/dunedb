#!/usr/bin/env python3
# Source code from auth0 / APIs / test
# documentaiton at https://auth0.com/docs/quickstart/backend/nodejs/01-authorization

# basically:
# we send our client credential to authorizer.
# auth0 replies with a token that auth<accesstoken>
# this is added as authorization to the call to sietch
# sietch reads it and parses that (a) it's valid and not expired, and (b) extracting relevant user info (permissions)

# New method:
# Send a big auth token to Sietch
# Seitch replies with a

import json
import random
import timeit
import urllib.request

class SietchConnect:
  def __init__(self, credentials_file="sietch.creds"):
    with open(credentials_file) as json_file:
      self.config = json.load(json_file)
    print(self.config)

    self.connect()
    # 
    # Format: of config file: 
    # {
    #   "url": "https://dev.sietch.xyz",  
    #   "client_credentials": {
    #     "user_id": "m2m1234....",
    #     "secret": "secret1234..........."
    #   }
    # }

  def connect(self):
    url = self.config['url'] + "/machineAuthenticate"
    headers = { 'Content-Type': 'application/json'}
    data = json.dumps(self.config["client_credentials"]).encode("utf-8")
    req = urllib.request.Request(url,data,headers)
    response = urllib.request.urlopen(req)
    if(response.status!=200):
      raise Exception("Could not authenticate against Sietch server "+response.status)
    self.access_token = response.read().decode("utf-8")
    print("Connected!")

  def api(self,route,data=None):
    ### If data is undefined, this is a 'get' call; otherwise a 'post' call.
    url = self.config['url'] + "/api" + route
    headers = { 'Content-Type': 'application/json',
                'authorization': 'Bearer ' + self.access_token }
    encoded_data = None
    if(data is not None):
      encoded_data = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url,data=encoded_data,headers=headers)
    try:
      response = urllib.request.urlopen(req)
    except urllib.error.HTTPError as err:
      try:
        r = err.read()
        sietchResp = json.loads(r)
        sietchError = sietchResp["error"]
      except:
        raise err
      raise Exception("Sietch responded with: "+sietchError)
    payload = json.loads(response.read());
    return payload


if __name__ == "__main__":
  sietch = SietchConnect("sietch.creds") # or whatever file you have.
  # How to generate a new UUID for a component
  uuid = sietch.api('/generateComponentUuid')
  print(uuid)

  # Note that this move is somewhat dodgy, as we have not yet registered this object.
  # This is not a good thing. Still, it's allowed to submit the test before the object.

  # How to run a test on an existing component, with UUID as given
  test_result = {
    'componentUuid':uuid,
    'formId': 'does_it_blend',
    'formName': "Does It Blend?",
    'data': {
          'didItBlend' : True,
          'numberOfBits' : 12
          }
    }
  resp = sietch.api('/test',test_result)
  print(resp)

  # Let's retrieve that data to see if it's all good
  id = resp["_id"]
  record = sietch.api("/test/"+id)
  print(json.dumps(record,indent=2))
