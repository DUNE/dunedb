# Local Python imports
from common import EditAction


# Main script function
if __name__ == '__main__':

    # Editing an existing action requires 3 pieces of information:
    #   - the ID of the action to be edited
    #   - the names of any data fields to be edited
    #   - the new values of any data fields to be edited

    # Set the ID of the action to be edited
    actionID = '62ea52ad08d4250014a0afe7'

    # Set the names of any data fields to be edited
    actionData_fields = ['name', 'measurement']

    # Set the new values of any data fields to be edited
    actionData_values = ['Edited M2M Action', 1.12358]

    # Edit and submit the action
    EditAction(actionID, actionData_fields, actionData_values)

    print()
