# Local Python imports
from common import ConnectToAPI, EditAction


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Editing of an existing action requires three pieces of information to be pre-defined:
    #   - the ID of the action to be edited
    #   - the names of any data fields to be edited
    #   - the new values of any data fields to be edited
    actionID = '63340ac79708eb30e6403cb9'
    actionData_fields = ['name', 'measurement']
    actionData_values = ['M2M Action (edited)', 19.07]

    # Call the action editing function, which takes the ID, data field names and new field values as its first three arguments
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    EditAction(actionID, actionData_fields,
               actionData_values, connection, headers)

    ########################################

    print()

    # Once all actions have been edited and submitted, close the connection to the database API
    connection.close()
