# Local Python imports
from common import ConnectToAPI, GetListOfComponents, GetListOfActions


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Retrieving a list of all components of a single type requires only the component type form ID (NOT THE TYPE FORM NAME!)
    componentTypeFormID = 'basic_component_2'

    # Call the component listing function, which take the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of component UUIDs, with each UUID being an individual string
    componentUUIDs = GetListOfComponents(componentTypeFormID, connection, headers)

    print(f" Found {len(componentUUIDs)} components with type form ID '{componentTypeFormID}'")
    print(componentUUIDs)

    print()

    # Retrieving a list of all actions of a single type requires only the action type form ID (NOT THE TYPE FORM NAME!)
    actionTypeFormID = 'my_action'

    # Call the action listing function, which take the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of action IDs, with each ID being an individual string
    actionIDs = GetListOfActions(actionTypeFormID, connection, headers)

    print(f" Found {len(actionIDs)} actions with type form ID: '{actionTypeFormID}'")
    print(actionIDs)

    ########################################

    print()

    # Once all records have been retrieved, close the connection to the database API
    connection.close()
