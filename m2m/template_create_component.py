# Local Python imports
from common import ConnectToAPI, CreateComponent


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Creation of a new component requires two pieces of information to be pre-defined:
    #   - the component's type form ID (a string, for which a corresponding type form must already exist in the DB)
    #   - the component's data (a Python dictionary, corresponding to the data to be entered into the type form)
    componentTypeFormID = 'basic_component'
    componentData = {
        'name': 'New M2M Component',
        'textField': 'This is a component created through the M2M application'
    }

    # Call the component creation function, which takes the type form ID and data as its first two arguments
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns the UUID of the created component (if not, an error message is automatically displayed)
    uuid = CreateComponent(componentTypeFormID,
                           componentData, connection, headers)
    print(f" Successfully submitted component with UUID: {uuid}")

    ########################################

    print()

    # Once all components have been created and submitted, close the connection to the database API
    connection.close()
