# Local Python imports
from common import CreateComponent


# Main script function
if __name__ == '__main__':

    # Creating a new component requires 2 pieces of information:
    #   - the component type form ID (for which a corresponding type form must already exist in the DB)
    #   - the component data (corresponding to the data to be entered into the type form)

    # Set the component type form ID
    typeFormID = 'basic_component'

    # Set the component data
    data = {
        'name': 'M2M Component',
        'textField': 'This is a component created through the M2M application'
    }

    # Create and submit the new component
    CreateComponent(typeFormID, data)

    print()
