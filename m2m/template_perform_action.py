# Local Python imports
from common import PerformAction


# Main script function
if __name__ == '__main__':

    # Performing a new action requires 3 pieces of information:
    #   - the action type form ID (for which a corresponding type form must already exist in the DB)
    #   - the UUID of the component on which the action is being performed (which must already exist in the DB)
    #   - the action data (corresponding to the data to be entered into the type form)

    # Set the action type form ID
    typeFormID = 'my_action'

    # Set the component UUID
    componentUUID = 'da820f60-130e-11ed-bf0a-f3cd78f73f46'

    # Set the action data
    data = {
        'name': 'M2M Action',
        'actionPerformedAfterFormsCleanup': True,
        'measurement': 1.123
    }

    # Perform and submit the new action
    PerformAction(typeFormID, componentUUID, data)

    print()
