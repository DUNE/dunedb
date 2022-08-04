# Local Python imports
from common import CreateComponent


# Main script function
if __name__ == '__main__':

    # Creating a new component requires 2 pieces of information:
    #   - the component type form ID (for which a corresponding type form must already exist in the DB)
    #   - the component data (corresponding to the data to be entered into the type form)

    # Set the component type form ID, as a string
    typeFormID = 'basic_component'

    # Set the component data, as a Python dictionary where each field's name corresponds exactly to the corresponding type form input field name
    data = {
        'name': 'm2m Component 8',
        'textField': 'Showing Brian component creation'
    }

    # Create and submit the new component
    CreateComponent(typeFormID, data)

    print()
