# An example file for Nicola, working on the wire board measurements, as example of a workflow
# Might be useful to others (like me)
# --NJT

import SietchConnect
import json

# sietch = SietchConnect.SietchConnect("nicola.creds") # or whatever file you have.
sietch = SietchConnect.SietchConnect("localhost_config.json") # or whatever file you have.

board_id = "board ID 123132";
board_type = "X-layer Head Board A"

# we will say everything has type 

# Is there already a component with the given board ID?
r = sietch.api("/search/component?limit=1",{
    "type": board_type,
    "data.board_id": board_id,
  });

print r;

uuid = "";
if(len(r)>0) :
  uuid = r[0]['componentUuid'];
  print "Object already exists with uuid " + uuid
else:
  # this object does not yet exist. Create it.

  # How to generate a new UUID for a component
  uuid = sietch.api('/generateComponentUuid')
  print(uuid)

  # create that object
  r = sietch.api("/component/"+uuid,{
    "type" : board_type,
    "data" : {
      "board_id": board_id,
      "name": board_type + ' ' + board_id
    }
    })

  print "Inserted", r

# Does this object already have test data?

test_type = 'thickness_measurment_type_123'

tests = sietch.api("/search/test/thickness_measurment_type_123",
  {"componentUuid":uuid});

print str(len(tests)) + " have been run on this board already."

# # How to run a test on an existing component, with UUID as given

# This next bit will only work if you create the 'thickness_measurement_type_123' Test form 
# in Sietch before running this.  However, that form doesn't need to match the data - 
# it will only be used for manual editing or display.  The data gets stored no matter what you put in here.
test_result = {
  'componentUuid':uuid,
  'formId': 'thickness_measurment_type_123',
  'data': {
        'didItBlend' : True,
        'numberOfBits' : 12
        }
  }

resp = sietch.api('/test',test_result)
# Response should be a simple identifier for the inserted record
print(resp)

# Let's retrieve that data to see if it's all good
id = resp
record = sietch.api("/test/"+id)
print(json.dumps(record,indent=2))
