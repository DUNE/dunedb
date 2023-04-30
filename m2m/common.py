# General Python imports
import http.client
import json
import socket
import sys

# Local Python imports and variables
from client_credentials import client_id, client_secret, auth0_domain, db_domain


#############################################
## Set up a connection to the database API ##
#############################################
def ConnectToAPI():
    # First we must generate an access token (as a string) from Auth0, which will provide authorisation between the M2M client and the database API
    access_token, token_type = '', ''

    # Set the payload to be delivered via the connection to Auth0, containing all of the information required to identify this M2M client
    payload = (
        f'{{'
        f'"client_id": "{client_id}", '
        f'"client_secret": "{client_secret}", '
        f'"audience": "https://apa.dunedb.org/api/", '
        f'"grant_type": "client_credentials"'
        f'}}'
    )

    # Set up a connection to the Auth0 domain
    connection = http.client.HTTPSConnection(auth0_domain)

    # Request a response from the domain, using the provided credentials payload and specified headers
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    # Regardless of the success or failure of the request, make sure to close the connection cleanly
    try:
        connection.request('POST', '/oauth/token', body=payload,
                           headers={'content-type': 'application/json'})

        # Decode the response ... this will be a string containing the following information:
        #   - the client access token
        #   - the client scopes (i.e. permissions)
        #   - the access token type
        response = connection.getresponse()
        data = response.read().decode('utf-8')

        # Split the decoded response by double quotation marks, and then extract and set the access token and token type strings
        # The information in the response will always be in the same order, so we can use hardcoded indices to get the token and token type
        data_splits = data.split('\"')
        access_token, token_type = data_splits[3], data_splits[13]
    except http.client.HTTPException as e:
        print(f" ConnectToAPI() [POST /oauth/token] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(f" ConnectToAPI() [POST /oauth/token] - SOCKET TIMEOUT: {s} \n")
    finally:
        connection.close()

    # Set the headers to be used for all subsequent connection requests to any API routes
    headers = {
        'content-type': 'application/json',
        'authorization': f"{token_type} {access_token}"
    }

    # If the access token string is not empty, set up and return a connection to the database API, as well as the headers defined above
    # Otherwise, exit out now since there's no point in continuing (although even if the token is fine here, further checks will be performed by the API middleware)
    # Note that locally hosted APIs will need to use the non-SSL HTTP client (HTTP), whereas the staging and production instances will need the SSL one (HTTPS)
    if access_token is not '':
        if (db_domain == 'localhost:12313'):
            connection = http.client.HTTPConnection(db_domain, timeout=10)
        else:
            connection = http.client.HTTPSConnection(db_domain, timeout=10)

        return connection, headers
    else:
        sys.exit(" ConnectToAPI() - ERROR: could not get a valid access token! \n")


#########################################
## Convert a short UUID to a full UUID ##
#########################################
def ConvertShortUUID(shortUUID, connection, headers):
    # Request a response from the API route that converts a short UUID to a full UUID and then checks that it corresponds to an existing component record
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('GET', '/api/confirmShortUUID/' +
                           shortUUID, headers=headers)

        # The route returns a different string based on success or failure of the conversion from short to full UUID:
        #   - if successful (i.e. the full UUID corresponds to an existing component record), the full UUID is returned as a JSON formatted string (i.e. the UUID string within a JSON string)
        #   - if not successful, an error message is returned
        responseText = connection.getresponse().read().decode('utf-8')
        result = 'No matching component record!'

        if len(responseText) == 38:
            result = responseText[1: -1]

        # Return the result string
        return result
    except http.client.HTTPException as e:
        print(
            f" ConvertShortUUID() [GET /api/confirmShortUUID/shortUuid] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(
            f" ConvertShortUUID() [GET /api/confirmShortUUID/shortUuid] - SOCKET TIMEOUT: {s} \n")


############################
## Create a new component ##
############################
def CreateComponent(componentTypeFormID, componentData, connection, headers):
    # Request a response from the API route that generates new component UUID
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('GET', '/api/newComponentUUID', headers=headers)

        # The route returns the UUID as a JSON formatted string (i.e. the UUID string within a JSON string)
        componentUUID = connection.getresponse().read().decode('utf-8')[1: -1]

        # Declare a new empty Python dictionary to hold the component information to be uploaded
        # Then populate it with the absolutely critical information (the component's UUID and type form ID), as well as the 'data' object defined by the user
        # All other component record fields are added on the server side at submission
        component = {}
        component['componentUuid'] = componentUUID
        component['formId'] = componentTypeFormID
        component['data'] = componentData

        # An additional 'submit: true' field is always automatically added to the 'component.data' object by Formio for components submitted via the web interface
        # In order to keep the component records as consistent as possible between web interface and M2M client submissions, add this field in explicitly
        component['data']['submit'] = True

        ### TOFIX (krishmaj) 'component.data.typeRecordNumber' is not set when using M2M client script to create a new component ###

        # Serialise the component dictionary to a JSON formatted string (since it must be uploaded as such)
        componentJSON = json.dumps(component)

        # Request a response from the API route that submits a component record, using the serialised dictionary as the request body
        # If the request is successful, continue with the function ... otherwise print any raised exceptions
        try:
            connection.request('POST', '/api/component',
                               body=componentJSON, headers=headers)

            # The route returns a different string based on success (response code = 200) or failure (response code = anything else)
            #  - if successful, the full UUID of the submitted component is returned and set to the result string
            #  - if not successful, an error is returned and displayed on screen, and the result string is set to an 'invalid' indicator
            submissionResponse = connection.getresponse()
            result = 'none'

            if submissionResponse.status == 200:
                result = submissionResponse.read().decode('utf-8')
            else:
                print(submissionResponse.status, submissionResponse.reason)

            # Return the result string
            return result
        except http.client.HTTPException as e2:
            print(
                f" CreateComponent() [POST /api/component] - HTTP EXCEPTION: {e2} \n")
        except socket.timeout as s2:
            print(
                f" CreateComponent() [POST /api/component] - SOCKET TIMEOUT: {s2} \n")
    except http.client.HTTPException as e1:
        print(
            f" CreateComponent() [GET /api/newComponentUUID] - HTTP EXCEPTION: {e1} \n")
    except socket.timeout as s1:
        print(
            f" CreateComponent() [GET /api/newComponentUUID] - SOCKET TIMEOUT: {s1} \n")


###############################
## Get an existing component ##
###############################
def GetComponent(componentUUID, connection, headers, version=0):
    # Request a response from the API route that retrieves a specified version of an existing component record via its UUID (if no version is specified, the most recent one is retrieved)
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        url = f'/api/component/{componentUUID}'

        if version > 0:
            url += f'?version={version}'

        connection.request('GET', url, headers=headers)

        # The route response is the component record as a JSON document, but when decoded it becomes a standard string containing the JSON document
        # Therefore, deserialise the string to a Python dictionary so that it can be easily edited
        component = json.loads(connection.getresponse().read().decode('utf-8'))

        # If the provided UUID doesn't correspond to an existing component record, print an error and exit the function immediately
        if component == None:
            sys.exit(
                f" GetComponent() - ERROR: there is no component record with component UUID = {componentUUID} \n")

        # Return the Python dictionary containing the component record
        return component
    except http.client.HTTPException as e:
        print(
            f" GetComponent() [GET /api/component/componentUuid] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(
            f" GetComponent() [GET /api/component/componentUuid] - SOCKET TIMEOUT: {s} \n")


################################
## Edit an existing component ##
################################
def EditComponent(componentUUID, componentData_fields, componentData_values, connection, headers):
    # Request a response from the API route that retrieves the latest version of an existing component record via its UUID
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('GET', '/api/component/' +
                           componentUUID, headers=headers)

        # The route response is the component record as a JSON document, but when decoded it becomes a standard string containing the JSON document
        # Therefore, deserialise the string to a Python dictionary so that it can be easily edited
        component = json.loads(connection.getresponse().read().decode('utf-8'))

        # If the provided UUID doesn't correspond to an existing component record, print an error and exit the function immediately
        if component == None:
            sys.exit(
                f" EditComponent() - ERROR: there is no component record with component UUID = {componentUUID} \n")

        # For each component information field to be edited, assign the new value
        # Note that only existing fields in the 'component.data' object should be edited
        # Base component information (UUID, type form ID, etc.) should NOT be changed
        for index, fieldName in enumerate(componentData_fields):
            component['data'][fieldName] = componentData_values[index]

        # Serialise the edited component dictionary back to a JSON formatted string (since it must be uploaded as such)
        componentJSON = json.dumps(component)

        # Request a response from the API route that submits a component record, using the serialised dictionary as the request body
        # If the request is successful, continue with the function ... otherwise print any raised exceptions
        try:
            connection.request('POST', '/api/component',
                               body=componentJSON, headers=headers)

            # The route returns a different string based on success (response code = 200) or failure (response code = anything else)
            #  - if successful, the full UUID of the submitted component is returned and set to the result string
            #  - if not successful, an error is returned and displayed on screen, and the result string is set to an 'invalid' indicator
            submissionResponse = connection.getresponse()
            result = 'none'

            if submissionResponse.status == 200:
                result = submissionResponse.read().decode('utf-8')
            else:
                print(submissionResponse.status, submissionResponse.reason)

            # Return the result string
            return result
        except http.client.HTTPException as e2:
            print(
                f" EditComponent() [POST /api/component] - HTTP EXCEPTION: {e2} \n")
        except socket.timeout as s2:
            print(
                f" EditComponent() [POST /api/component] - SOCKET TIMEOUT: {s2} \n")
    except http.client.HTTPException as e1:
        print(
            f" EditComponent() [GET /api/component/componentUuid] - HTTP EXCEPTION: {e1} \n")
    except socket.timeout as s1:
        print(
            f" EditComponent() [GET /api/component/componentUuid] - SOCKET TIMEOUT: {s1} \n")


###################################################
## Get a list of all components of a single type ##
###################################################
def GetListOfComponents(componentTypeFormID, connection, headers):
    # Request a response from the API route that gets a list of component UUIDs for a given component type form ID
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('GET', '/api/components/' +
                           componentTypeFormID + '/list', headers=headers)

        # The route response is the list of component UUIDs as a JSON formatted string (i.e. a string within a string)
        responseText = connection.getresponse().read().decode('utf-8')

        # Split the inner string by commas ... this will create an actual Python list of the UUID strings
        componentUUIDs = responseText[1: -1].split(',')

        # Return the list of UUIDs
        return componentUUIDs
    except http.client.HTTPException as e:
        print(
            f" GetListOfComponents() [GET /api/components/typeFormId/list] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(
            f" GetListOfComponents() [GET /api/components/typeFormId/list] - SOCKET TIMEOUT: {s} \n")


##########################
## Perform a new action ##
##########################
def PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers):
    # Declare a new empty Python dictionary to hold the action information to be uploaded
    # Then populate it with the absolutely critical information (type form ID and component UUID) as well as the 'data' object defined by the user
    # All other action record fields are added on the server side at submission
    action = {}
    action['typeFormId'] = actionTypeFormID
    action['componentUuid'] = componentUUID
    action['data'] = actionData

    # An additional 'submit: true' field is always automatically added to the 'action.data' object by Formio for actions submitted via the web interface
    # In order to keep the action records as consistent as possible between web interface and M2M client submissions, add this field in explicitly
    action['data']['submit'] = True

    # Serialise the action dictionary to a JSON formatted string (since it must be uploaded as such)
    actionJSON = json.dumps(action)

    # Request a response from the API route that submits an action record, using the serialised dictionary as the request body
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('POST', '/api/action',
                           body=actionJSON, headers=headers)

        # The route returns a different string based on success (response code = 200) or failure (response code = anything else)
        #  - if successful, the ID of the submitted action is returned and set to the result string
        #  - if not successful, an error is returned and displayed on screen, and the result string is set to an 'invalid' indicator
        submissionResponse = connection.getresponse()
        result = 'none'

        if submissionResponse.status == 200:
            result = submissionResponse.read().decode('utf-8')
        else:
            print(submissionResponse.status, submissionResponse.reason)

        # Return the result string
        return result
    except http.client.HTTPException as e:
        print(
            f" PerformAction() [POST /api/action] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(
            f" PerformAction() [POST /api/action] - SOCKET TIMEOUT: {s} \n")


############################
## Get an existing action ##
############################
def GetAction(actionID, connection, headers, version=0):
    # Request a response from the API route that retrieves a specified version of an existing action record via its ID (if no version is specified, the most recent one is retrieved)
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        url = f'/api/action/{actionID}'

        if version > 0:
            url += f'?version={version}'

        connection.request('GET', url, headers=headers)

        # The route response is the action record as a JSON document, but when decoded it becomes a standard string containing the JSON document
        # Therefore, deserialise the string to a Python dictionary so that it can be easily edited
        action = json.loads(connection.getresponse().read().decode('utf-8'))

        # If the provided ID doesn't correspond to an existing action record, print an error and exit the function immediately
        if action == None:
            sys.exit(
                f" GetAction() - ERROR: there is no action record with action ID = {actionID} \n")

        # Return the Python dictionary containing the action record
        return action
    except http.client.HTTPException as e:
        print(
            f" GetAction() [GET /api/action/actionId] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(
            f" GetAction() [GET /api/action/actionId] - SOCKET TIMEOUT: {s} \n")


#############################
## Edit an existing action ##
#############################
def EditAction(actionID, actionData_fields, actionData_values, connection, headers):
    # Request a response from the API route that retrieves the latest version of an existing action record via its ID
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('GET', '/api/action/' + actionID, headers=headers)

        # The route response is the action record as a JSON document, but when decoded it becomes a standard string containing the JSON document
        # Therefore, deserialise the string to a Python dictionary so that it can be easily edited
        action = json.loads(connection.getresponse().read().decode('utf-8'))

        # If the provided ID doesn't correspond to an existing action record, print an error and exit the function immediately
        if action == None:
            sys.exit(
                f" EditAction() - ERROR: there is no action record with action ID = {actionID} \n")

        # For each action information field to be edited, assign the new value
        # Note that only existing fields in the 'action.data' object should be edited
        # Base action information (ID, type form ID, component UUID, etc.) should NOT be changed
        for index, fieldName in enumerate(actionData_fields):
            action['data'][fieldName] = actionData_values[index]

        # Serialise the edited action dictionary back to a JSON formatted string (since it must be uploaded as such)
        actionJSON = json.dumps(action)

        # Request a response from the API route that submits an action record, using the serialised dictionary as the request body
        # If the request is successful, continue with the function ... otherwise print any raised exceptions
        try:
            connection.request('POST', '/api/action',
                               body=actionJSON, headers=headers)

            # The route returns a different string based on success (response code = 200) or failure (response code = anything else)
            #  - if successful, the ID of the submitted action is returned and set to the result string
            #  - if not successful, an error is returned and displayed on screen, and the result string is set to an 'invalid' indicator
            submissionResponse = connection.getresponse()
            result = 'none'

            if submissionResponse.status == 200:
                result = submissionResponse.read().decode('utf-8')
            else:
                print(submissionResponse.status, submissionResponse.reason)

            # Return the result string
            return result
        except http.client.HTTPException as e2:
            print(
                f" EditAction() [POST /api/action] - HTTP EXCEPTION: {e2} \n")
        except socket.timeout as s2:
            print(
                f" EditAction() [POST /api/action] - SOCKET TIMEOUT: {s2} \n")
    except http.client.HTTPException as e1:
        print(
            f" EditAction() [GET /api/action/actionId] - HTTP EXCEPTION: {e1} \n")
    except socket.timeout as s1:
        print(
            f" EditAction() [GET /api/action/actionId] - SOCKET TIMEOUT: {s1} \n")


################################################
## Get a list of all actions of a single type ##
################################################
def GetListOfActions(actionTypeFormID, connection, headers):
    # Request a response from the API route that gets a list of action IDs for a given action type form ID
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    try:
        connection.request('GET', '/api/actions/' +
                           actionTypeFormID + '/list', headers=headers)

        # The route response is the list of action IDs as a JSON formatted string (i.e. a string within a string)
        responseText = connection.getresponse().read().decode('utf-8')

        # Split the inner string by commas ... this will create an actual Python list of the ID strings
        actionIDs = responseText[1: -1].split(',')

        # Return the list of IDs
        return actionIDs
    except http.client.HTTPException as e:
        print(
            f" GetListOfActions() [GET /api/actions/typeFormId/list] - HTTP EXCEPTION: {e} \n")
    except socket.timeout as s:
        print(
            f" GetListOfActions() [GET /api/actions/typeFormId/list] - SOCKET TIMEOUT: {s} \n")
