# M2M Client Scripts

A "machine-to-machine" (M2M) application is a way for a remote device (known as the "client") to communicate with the DB API directly, without the need for a human user and/or the web interface.

An example of the usefulness of such an application might be where a computer is making many automated measurements of a particular component, and each of these measurements need to be uploaded (as an action performed on the component) to the DB.  Instead of a human user manually creating an action record for each measurement through the web interface, a M2M application connecting the computer and the DB API would allow each one to be uploaded in a completely automated fashion.

This directory contains the code required to establish a connection between a client and the DB API, as well as a number of template scripts showing examples of how to use the M2M application.  All of the code is written in standard Python (**version 3.6** or above is recommended).


## Client Credentials

Before any communication between client and API can take place, the client must prove that it is actually authorised to communicate with the API.  This is done via **client credentials**, which are stored in the `client_credentials.py` file, and consist of the following:
 
* `client_id` : an ID string that identifies the client
* `client_secret` : a long alphanumeric string that acts like a password
* `auth0_domain` : the web address of the M2M application
* `db_domain` : the web address of the DB API

Each of the DB instances (development, staging and production) has its own set of credentials.

Upon creating a fresh Git clone of this directory, the `client_credentials.py` file will be empty - the credentials themselves are **not** stored on Github or made publically available.  **If and when you require credentials, <u>please contact one of the DB Development Team</u> - we will issue the appropriate credentials to you directly.**


## Backend Functions

The *backend* code, located in the `common.py` file, governs the underlying functioning of the M2M application.  **Users should not attempt to modify any backend code** - doing so could potentially lead to your M2M client becoming non-functional, and/or corrupt or incorrect data being sent to the DB.

However, users will still need to call the various backend functions in their own user-created scripts.  The available functions and required arguments are as follows:

* `ConnectToAPI()` : establish a connection between the client and the database API, returning the `connection` object and associated `headers`.  **This function must be called once at the start of every user-created script, and the connection must be manually closed at the end of the script.**
* `ConvertShortUUID(shortUUID, connection, headers)` : convert a short UUID into a full one, and check if the full UUID corresponds to an existing component record, returning the full UUID as a string if so, or an error message if not
    * `shortUUID` (string) : an existing short UUID, must be between 20 and 22 alphanumeric characters
    * `connection, headers` : objects returned by the `ConnectToAPI()` function

* `CreateComponent(componentTypeFormID, componentData, connection, headers)` : create a new component, returning the full UUID as a string
    * `componentTypeFormID` (string) : the type form ID of the component to be created
    * `componentData` (Python dictionary) : the data to be entered into the new component record's `component.data` section, arranged as a dictionary of `field: value` pairs  ... this is the same data that would be entered into the component's type form through the web interface
    * `connection, headers` : objects returned by the `ConnectToAPI()` function

* `GetComponent(componentUUID, connection, headers [, version])` : get a specified version of an existing component record, returning the record as a Python dictionary
    * `componentUUID` (string) : the UUID of the component to be retrieved
    * `connection, headers` : objects returned by the `ConnectToAPI()` function
    * `version` (integer) : [OPTIONAL] the desired version of the record to retrieve ... if not specified or set to '0', the most recent version will be retrieved

* `EditComponent(componentUUID, componentData_fields, componentData_values, connection, headers)` : edit an existing component record, returning the component's full UUID as a string
    * `componentUUID` (string) : the UUID of the component to be edited
    * `componentData_fields` (list of strings) : the component's type form field names which will have their values edited
    * `componentData_values` (list) : the new values of the fields specified in the `componentData_fields` list
    * `connection, headers` : objects returned by the `ConnectToAPI()` function

* `GetListOfComponents(componentTypeFormID, connection, headers)` : get a list of the UUIDs of all components of the specified component type, returning a Python list of the UUIDs
    * `componentTypeFormID` (string) : the type form ID of the components to be listed
    * `connection, headers` : objects returned by the `ConnectToAPI()` function

* `PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers)` : perform a new action on a specified component, returning the action ID as a string
    * `actionTypeFormID` (string) : the type form ID of the action to be created
    * `componentUUID` (string) : the UUID of the component on which the new action is to be performed
    * `actionData` (Python dictionary) : the data to be entered into the new action record's `action.data` section, arranged as a dictionary of `field: value` pairs  ... this is the same data that would be entered into the action's type form through the web interface
    * `connection, headers` : objects returned by the `ConnectToAPI()` function

* `GetAction(actionID, connection, headers [, version])` : get the latest version of an existing action record, returning the record as a Python dictionary
    * `actionID` (string) : the ID of the action to be retrieved
    * `connection, headers` : objects returned by the `ConnectToAPI()` function
    * `version` (integer) : [OPTIONAL] the desired version of the record to retrieve ... if not specified or set to '0', the most recent version will be retrieved

* `EditAction(actionID, actionData_fields, actionData_values, connection, headers)` : edit an existing action record, returning the action ID as a string
    * `actionID` (string) : the ID of the action to be edited
    * `actionData_fields` (list of strings) : the action's type form field names which will have their values edited
    * `actionData_values` (list) : the new values of the fields specified in the `actionData_fields` list
    * `connection, headers` : objects returned by the `ConnectToAPI()` function

* `GetListOfActions(actionTypeFormID, connection, headers)` : get a list of the action IDs of all actions of the specified action type, returning a Python list of the IDs
    * `actionTypeFormID` (string) : the type form ID of the actions to be listed
    * `connection, headers` : objects returned by the `ConnectToAPI()` function


## User-Created Scripts

Users should write their own dedicated Python scripts that are suited for whatever task they intend to use the M2M application for.  **The only requirement is that <u>your script(s) must call the appropriate backend functions as described above</u>, with the correctly ordered and formatted arguments as required.**

Apart from `ConnectToAPI()`, the backend functions may be combined in any order and/or number as required by the user.  For example, if multiple short UUIDs need to be converted and then new components created and submitted using the returned full UUIDs, a single user-created script containing a `for` loop may be used to cover the entire procedure.

This directory contains template scripts that show simple examples of how to use the various backend functions.


## Working with APA Wire Tension Measurements

Wire tension measurements can be uploaded to the APA DB using the M2M application, but when they are taken at the APA factories, these measurements are calculated and saved into bespoke spreadsheets.  Therefore, an additional step is required to extract the values from the spreadsheets and convert them into a format that the DB can accept.

The `ExtractTensions(csvFile, apaLayer)` function found in the `tensions.py` file handles this step.  **Users should not attempt to modify this code**, but the function should be used in a user-create script, as with the other backend functions described above.  The function takes the  following arguments:
   * `csvFile` (string) : an input file, in `.csv` format, containing (among other things) the tension measurements
   * `apaLayer` (string) : one of 'X', 'U', 'V' or 'G'

The function returns two Python lists, containing the tension measurements for each APA side (A and B).  **<u>These lists will always contain only the latest tension measurement for each wire or wire segment</u>** - thus, any wire re-tensioning is accounted for, as long as the new values are recorded in the correct column of the originating spreadsheet.

The `ExtractTensions()` function should be followed by a call to either the `PerformAction()` or `EditAction()` backend functions, depending on whether the tension measurements action is completely new or being edited due to re-tensioning.
