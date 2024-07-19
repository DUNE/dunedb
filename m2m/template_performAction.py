# Local Python imports
from common import ConnectToAPI, PerformAction


# Main script function
if __name__ == '__main__':
    print()
    
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Performing a new action requires three pieces of information to be pre-defined:
    #   - the action's type form ID (a string, for which a corresponding type form must already exist in the DB)
    #   - the UUID of the component on which the action is being performed (which must already exist in the DB)
    #   - the action data (a Python dictionary, corresponding to the data to be entered into the type form)
    actionTypeFormID = 'my_action'
    componentUUID = '5f9ea420-3e88-11ed-9114-03f8483882ff'
    actionData = {
        'name': 'M2M Action',
        'actionPerformedAfterFormsCleanup': True,
        'measurement': 12.04,
    }

    # Call the action performance function, which takes the action type form ID, component UUID and action data as its first three arguments
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns the ID of the performed action (if not, an error message is automatically displayed)
    id = PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers)
    print(f" Successfully performed action with ID: {id}")

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
