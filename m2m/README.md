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

The *backend* code, located in the `common.py` file, governs the general functioning of the M2M application.  **Users should not attempt to modify any backend code** - doing so could potentially lead to your M2M client becoming non-functional, or corrupt or incorrect data being sent to the DB.

However, users will still need to call the various backend functions in their own user-created scripts.  The available functions and required arguments are as follows:

* `ConvertShortUUID(shortUUID)` : convert a short UUID into a full one, returning the full UUID as a string
    * `shortUUID` (string) : an existing short UUID, must be between 20 and 22 alphanumeric characters

* `CreateComponent(typeFormID, data)` : create a new component
    * `typeFormID` (string) : the type form ID of the component to be created
    * `data` (Python dictionary) : the data to be entered into the new component record's `component.data` section, arranged as a dictionary of `field: value` pairs  ... this is the same data that would be entered into the component's type form through the web interface

* `EditComponent(componentUUID, componentData_fields, componentData_values)` : edit an existing component
    * `componentUUID` (string) : the UUID of the component to be edited
    * `componentData_fields` (list) : the component's type form field names which will have their values edited
    * `componentData_values` (list) : the new values of the fields specified in the `componentData_fields` list

* `PerformAction(typeFormID, componentUUID, data)` : perform a new action on a specified component
    * `typeFormID` (string) : the type form ID of the action to be created
    * `componentUUID` (string) : the UUID of the component on which the new action is to be performed
    * `data` (Python dictionary) : the data to be entered into the new action record's `action.data` section, arranged as a dictionary of `field: value` pairs  ... this is the same data that would be entered into the action's type form through the web interface

* `EditAction(actionID, actionData_fields, actionData_values)` : edit an existing action
    * `actionID` (string) : the ID of the action to be edited
    * `actionData_fields` (list) : the action's type form field names which will have their values edited
    * `actionData_values` (list) : the new values of the fields specified in the `actionData_fields` list

Each of the backend function is independent and self-contained, and covers the entire process of submitting a record to the DB: establishing a connection between the client and API, creating and populating a new component or action record or retrieving and editing an existing one, and then submitting the record to the DB.


## User-Created Scripts

Users should write their own dedicated scripts that are suited for whatever task they intend to use the M2M application for.  **The only requirement is that <u>your script(s) must call the appropriate backend function as described above</u>, with the correctly ordered and formatted arguments as required.**

This directory contains template scripts that show simple examples of how to create a new component, edit an existing component, perform a new action, and edit an existing action.
