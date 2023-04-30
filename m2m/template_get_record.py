# Local Python imports
from common import ConnectToAPI, GetComponent, GetAction


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Retrieving an existing component record requires only the UUID
    componentUUID = '5f9ea420-3e88-11ed-9114-03f8483882ff'

    # Call the component retrieval function, which take the UUID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # The optional fourth argument is the desired version of the component record ... if this is not specified or set to '0', the most recent version will be retrieved
    # If successful, the function returns the latest version of the component record as a Python dictionary (if not, an error message is automatically displayed)
    component = GetComponent(componentUUID, connection, headers, version=0)
    print(component)

    print()

    # Retrieving an existing action record requires only the ID
    actionID = '63340ac79708eb30e6403cb9'

    # Call the action retrieval function, which take the ID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # The optional fourth argument is the desired version of the action record ... if this is not specified or set to '0', the most recent version will be retrieved
    # If successful, the function returns the latest version of the action record as a Python dictionary (if not, an error message is automatically displayed)
    action = GetAction(actionID, connection, headers, version=0)
    print(action)

    ########################################

    print()

    # Once all records have been retrieved, close the connection to the database API
    connection.close()
