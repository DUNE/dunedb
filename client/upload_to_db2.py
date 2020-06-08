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

import http.client
import json
import random
import timeit

#these are the secret parameters obtained from auth0
with open('api_config2.json') as json_file:
    config = json.load(json_file)
print(config)

record_id = ''

# 
# Format: of config file: 
#  {
# "client_credentials": {
# 	"client_id" : "xxxx",
# 	"client_secret": "xxxxxxxxxxxxxxx",
# 	"audience": "https://dev-xxxxxxxx.auth0.com/api/v2/",
# 	"grant_type":"client_credentials"
# 	},
# "auth_host": "dev-xxxxxx.auth0.com",
# "host": "localhost",
# "port": 12313
# }
#
# 

def send_data(object):
	# conn = http.client.HTTPSConnection(config["host"],config["port"])
	conn = http.client.HTTPConnection(config["host"],config["port"])

	# First, authorize this client against auth0:
	headers = { 'content-type': "application/json" }
	conn.request("POST", "/machineAuthenticate", json.dumps(config["client_credentials"]), headers)
	res = conn.getresponse()
	access_token = res.read().decode("utf-8")
	# print("access token")
	# print(access_token)

	# Then, make the actual call to our server with the data.
	headers = { 'authorization': 'Bearer '+access_token ,
	            'Content-type' : 'application/json' }
	conn.request("POST", "/api/test/", json.dumps(object), headers=headers)

	res = conn.getresponse()
	data = res.read().decode("utf-8")
	# print(data)
	return json.loads(data)

def get_data(record_id):
	# conn = http.client.HTTPSConnection(config["host"],config["port"])
	conn = http.client.HTTPConnection(config["host"],config["port"])

	# First, authorize this client against auth0:
	headers = { 'content-type': "application/json" }
	conn.request("POST", "/machineAuthenticate", json.dumps(config["client_credentials"]), headers)
	res = conn.getresponse()
	access_token = res.read().decode("utf-8")

	headers = { 'authorization': 'Bearer '+access_token}
	# headers = { 'authorization': "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1FTTJPVFF6UVRBeU9ETkNSRVkzTnpZNVFVRkZRakEyT0RBMlJFSkRSVE15UWpVNE1qazROUSJ9.eyJpc3MiOiJodHRwczovL2Rldi1wc2VyYmZpdy5hdXRoMC5jb20vIiwic3ViIjoiVjNuSmhVSU1ZN2Rib0Vpd2oyd1o0T3h2WUNhV2h5aGZAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vZGV2LXBzZXJiZml3LmF1dGgwLmNvbS9hcGkvdjIvIiwiaWF0IjoxNTc5MjEyMTc4LCJleHAiOjE1NzkyOTg1NzgsImF6cCI6IlYzbkpoVUlNWTdkYm9FaXdqMndaNE94dllDYVdoeWhmIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.lpZD_WqWiPNvTizS1QLPhVtfEHV5Ns2c2hZXymK_Ld2DYYHfmTOstM0x7CnQkemRZccARRm8iIZUz1Ek5-ZA7ZkJVkD6okwJuSUBpsxTAYAYPsvXgPaEhDMgQ313VpOiY4BQh4CdNcMHzq6Cs6KUS11tG8R1RON7pArXIFYcTs1UeG4RI6hzXT7iCiUWlVytRfHpaI6NAgVOkmwnf9Yyj_e0_l_lzXaDLn97eH_gw4B5OwnY-hzj0mfMqEqGtFQI-JLteKrvDzkMSW65P1pjxjzv-ImcfJ8W9nQ1llhVmcGTMPZzGMC9xijC3jgC6SVvABmExRLOQEtwdAxHqECP9Q" }
	conn.request("GET", "/api/test/"+record_id, headers=headers)

	res = conn.getresponse()
	data = res.read().decode("utf-8")
	# print(data)
	return json.loads(data)

if __name__ == "__main__":


  data_to_send = { 'form_id': 'apitest',  # required! This is the "table" data goes into.
  					'data': {
  						'name' : 'mynamehere',
  						'big_array': [random.random() for _ in range(10000)]
  						}
  					}



  retval = send_data(data_to_send)
  print(retval)
  record_id = retval['_id']
  print(get_data(record_id))


  # send_time = timeit.timeit(test_send, number=10)
  # print("Send time %f"%send_time)
  # retrieve_time = timeit.timeit(test_get, number=10)
  # print("Retrieve time: %f"%retrieve_time)
