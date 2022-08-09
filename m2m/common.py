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

    # Attempt to request a response from the domain, using the provided credentials payload and specified headers, and print any raised exceptions
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


############################
## Create a new component ##
############################
def CreateComponent(typeFormID, data):
    # Set up a connection to the database API and the connection request headers
    connection, headers = ConnectToAPI()

    # Attempt to request a response from the API route for generating a new component UUID, using the passed headers
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    # Regardless of the success or failure of the request, make sure to close the connection cleanly
    try:
        connection.request('GET', '/api/newComponentUUID', headers=headers)

        # The route returns the UUID as a JSON formatted string (i.e. the UUID string within a JSON string), so slice it to get only the UUID string
        uuidResponse = connection.getresponse()
        componentUUID = uuidResponse.read().decode('utf-8')[1: -1]

        # Declare a new empty Python dictionary to hold the component information to be uploaded
        # Then populate it with the absolutely critical information (component UUID and type form ID) and the 'data' object defined by the user
        # All other component record fields are added on the server side at submission
        component = {}
        component['componentUuid'] = componentUUID
        component['formId'] = typeFormID
        component['data'] = data

        # For components submitted by human users, an additional 'submit' field is always automatically added to the 'component.data' object (and set to 'true') by Formio
        # In order to keep the component records as consistent as possible between human user and M2M client submissions, add this field in explicitly
        component['data']['submit'] = True

        ### TOFIX (krishmaj) 'component.data.typeRecordNumber' is not set when using M2M client script to create a new component ###

        # Serialise the component dictionary to a JSON formatted string (since it must be uploaded as such)
        componentJSON = json.dumps(component)

        # Attempt to request a response from the API route for submitting a component record, using the JSON string as the request body and the passed headers
        # If the request is successful, continue with the function ... otherwise print any raised exceptions
        try:
            connection.request('POST', '/api/component',
                               body=componentJSON, headers=headers)

            # Depending on the submission response (success = 200, or failure = anything else), print an appropriate message to screen
            # The success response from the route is simply the submitted component's UUID
            submissionResponse = connection.getresponse()

            if submissionResponse.status == 200:
                print(
                    f" CreateComponent() - successfully submitted component with UUID: {submissionResponse.read().decode('utf-8')}")
            else:
                print(submissionResponse.status, submissionResponse.reason)
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
    finally:
        connection.close()


################################
## Edit an existing component ##
################################
def EditComponent(componentUUID, componentData_fields, componentData_values):
    # Set up a connection to the database API and the connection request headers
    connection, headers = ConnectToAPI()

    # Attempt to request a response from the API route for retrieving the record of an existing component via its UUID, using the passed headers
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    # Regardless of the success or failure of the request, make sure to close the connection cleanly
    try:
        connection.request('GET', '/api/component/' +
                           componentUUID, headers=headers)

        # The route response is the component record as a JSON document, but when decoded it becomes a standard string containing the JSON document
        # Therefore, deserialise the string to a Python dictionary so that it can be easily edited
        componentResponse = connection.getresponse()
        component = json.loads(componentResponse.read().decode('utf-8'))

        # If the provided UUID doesn't match with an existing component record, print an error and exit the function immediately
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

        # Attempt to request a response from the API route for submitting a component record, using the JSON string as the request body and the passed headers
        # If the request is successful, continue with the function ... otherwise print any raised exceptions
        try:
            connection.request('POST', '/api/component',
                               body=componentJSON, headers=headers)

            # Depending on the submission response (success = 200, or failure = anything else), print an appropriate message to screen
            # The success response from the route is simply the submitted component's UUID
            submissionResponse = connection.getresponse()

            if submissionResponse.status == 200:
                print(
                    f" EditComponent() - successfully edited component with UUID: {submissionResponse.read().decode('utf-8')}")
            else:
                print(submissionResponse.status, submissionResponse.reason)
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
    finally:
        connection.close()


##########################
## Perform a new action ##
##########################
def PerformAction(typeFormID, componentUUID, data):
    # Declare a new empty Python dictionary to hold the action information to be uploaded
    # Then populate it with the absolutely critical information (type form ID and component UUID) and the 'data' object defined by the user
    # All other action record fields are added on the server side at submission
    action = {}
    action['typeFormId'] = typeFormID
    action['componentUuid'] = componentUUID
    action['data'] = data

    # For actions submitted by human users, an additional 'submit' field is always automatically added to the 'action.data' object (and set to 'true') by Formio
    # In order to keep the action records as consistent as possible between human user and M2M client submissions, add this field in explicitly
    action['data']['submit'] = True

    # Serialise the action dictionary to a JSON formatted string (since it must be uploaded as such)
    actionJSON = json.dumps(action)

    # Set up a connection to the database API and the connection request headers
    connection, headers = ConnectToAPI()

    # Attempt to request a response from the API route for submitting an action record, using the JSON string as the request body and the passed headers
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    # Regardless of the success or failure of the request, make sure to close the connection cleanly
    try:
        connection.request('POST', '/api/action',
                           body=actionJSON, headers=headers)

        # Depending on the submission response (success = 200, or failure = anything else), print an appropriate message to screen
        # The success response from the route is simply the submitted action's ID
        submissionResponse = connection.getresponse()

        if submissionResponse.status == 200:
            print(
                f" PerformAction() - successfully submitted action with ID: {submissionResponse.read().decode('utf-8')}")
        else:
            print(submissionResponse.status, submissionResponse.reason)
    except http.client.HTTPException as e1:
        print(
            f" PerformAction() [POST /api/action] - HTTP EXCEPTION: {e1} \n")
    except socket.timeout as s1:
        print(
            f" PerformAction() [POST /api/action] - SOCKET TIMEOUT: {s1} \n")
    finally:
        connection.close()


#############################
## Edit an existing action ##
#############################
def EditAction(actionID, actionData_fields, actionData_values):
    # Set up a connection to the database API and the connection request headers
    connection, headers = ConnectToAPI()

    # Attempt to request a response from the API route for retrieving the record of an existing action via its ID, using the passed headers
    # If the request is successful, continue with the function ... otherwise print any raised exceptions
    # Regardless of the success or failure of the request, make sure to close the connection cleanly
    try:
        connection.request('GET', '/api/action/' + actionID, headers=headers)

        # The route response is the action record as a JSON document, but when decoded it becomes a standard string containing the JSON document
        # Therefore, deserialise the string to a Python dictionary so that it can be easily edited
        actionResponse = connection.getresponse()
        action = json.loads(actionResponse.read().decode('utf-8'))

        # If the provided ID doesn't match with an existing action record, print an error and exit the function immediately
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

        # Attempt to request a response from the API route for submitting an action record, using the JSON string as the request body and the passed headers
        # If the request is successful, continue with the function ... otherwise print any raised exceptions
        try:
            connection.request('POST', '/api/action',
                               body=actionJSON, headers=headers)

            # Depending on the submission response (success = 200, or failure = anything else), print an appropriate message to screen
            # The success response from the route is simply the submitted action's ID
            submissionResponse = connection.getresponse()

            if submissionResponse.status == 200:
                print(
                    f" EditAction() - successfully edited action with ID: {submissionResponse.read().decode('utf-8')}")
            else:
                print(submissionResponse.status, submissionResponse.reason)
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
    finally:
        connection.close()
