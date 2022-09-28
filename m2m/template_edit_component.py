# Local Python imports
from common import ConnectToAPI, EditComponent


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Editing of an existing component requires three pieces of information to be pre-defined:
    #   - the UUID of the component to be edited
    #   - the names of any data fields to be edited
    #   - the new values of any data fields to be edited
    componentUUID = '5f9ea420-3e88-11ed-9114-03f8483882ff'
    componentData_fields = ['textField']
    componentData_values = [
        'This component has been edited through the M2M application']

    # Call the component editing function, which takes the UUID, data field names and new field values as its first three arguments
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    EditComponent(componentUUID, componentData_fields,
                  componentData_values, connection, headers)

    ########################################

    print()

    # Once all components have been edited and submitted, close the connection to the database API
    connection.close()
