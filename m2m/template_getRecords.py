# Local Python imports
from common import ConnectToAPI, GetComponent, GetListOfComponents, GetAction, GetListOfActions


# Main script function
if __name__ == '__main__':
    print()
    
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Retrieving a single existing component record requires only the UUID
    # Call the component retrieval function, which take the UUID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # The optional fourth argument is the desired version of the component record ... if this is not specified or set to '0', the most recent version will be retrieved
    # If successful, the function returns the latest version of the component record as a Python dictionary (if not, an error message is automatically displayed)
    componentUUID = '5f9ea420-3e88-11ed-9114-03f8483882ff'

    component = GetComponent(componentUUID, connection, headers, version = 0)
    print(component)
    print()

    # Retrieving a list of all components of a single type requires only the component type form ID (NOT THE TYPE FORM NAME!)
    # Call the component listing function, which take the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of component UUIDs, with each UUID being an individual string
    componentTypeFormID = 'basic_component_2'

    componentUUIDs = GetListOfComponents(componentTypeFormID, connection, headers)
    print(f" Found {len(componentUUIDs)} components with type form ID '{componentTypeFormID}'")
    print(componentUUIDs)

    # Retrieving a single existing action record requires only the ID
    # Call the action retrieval function, which take the ID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # The optional fourth argument is the desired version of the action record ... if this is not specified or set to '0', the most recent version will be retrieved
    # If successful, the function returns the latest version of the action record as a Python dictionary (if not, an error message is automatically displayed)
    actionID = '63340ac79708eb30e6403cb9'

    action = GetAction(actionID, connection, headers, version = 0)
    print(action)
    print()
    
    # Retrieving a list of all actions of a single type requires only the action type form ID (NOT THE TYPE FORM NAME!)
    # Call the action listing function, which take the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of action IDs, with each ID being an individual string
    actionTypeFormID = 'my_action'

    actionIDs = GetListOfActions(actionTypeFormID, connection, headers)
    print(f" Found {len(actionIDs)} actions with type form ID: '{actionTypeFormID}'")
    print(actionIDs)

    ########################################

    print()

    # Once all records have been retrieved, close the connection to the database API
    connection.close()
