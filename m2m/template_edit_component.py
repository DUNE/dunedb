# Local Python imports
from common import EditComponent


# Main script function
if __name__ == '__main__':

    # Editing an existing component requires 3 pieces of information:
    #   - the UUID of the component to be edited
    #   - the names of any data fields to be edited
    #   - the new values of any data fields to be edited

    # Set the UUID of the component to be edited
    componentUUID = 'da820f60-130e-11ed-bf0a-f3cd78f73f46'

    # Set the names of any data fields to be edited
    componentData_fields = ['textField']

    # Set the new values of any data fields to be edited
    componentData_values = ['This component has been edited through the M2M application']

    # Edit and submit the component
    EditComponent(componentUUID, componentData_fields, componentData_values)

    print()
