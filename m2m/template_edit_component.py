# Local Python imports
from common import EditComponent


# Main script function
if __name__ == '__main__':

    # Editing an existing component requires 3 pieces of information:
    #   - the UUID of the component to be edited
    #   - the names of any data fields to be edited
    #   - the new values of any data fields to be edited

    # Set the UUID of the component to be edited, as a string
    componentUUID = 'da820f60-130e-11ed-bf0a-f3cd78f73f46'

    # Set the names of any data fields to be edited, as a list of strings
    componentData_fields = ['textField']

    # Set the new values of any data fields to be edited, as a list of equal length to the field names list above
    componentData_values = ['Moving edit values to main function']

    # Edit and submit the component
    EditComponent(componentUUID, componentData_fields, componentData_values)

    print()
