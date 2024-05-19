import sys

from common import ConnectToAPI, EditAction
from tensions import ExtractTensions

####################################
# Set the user-defined information #
# ##################################

# For uploading (re-)tensioning measurements, the following information is required:
csvFile         = '/user/majumdar/Desktop/Tensions/V_layer_APA14.csv'
                                                            # Full path to the input data file (must be a string ending in '.csv')
apaLayer        = 'V'                                       # Wire layer (must be given as one of 'X','V', 'U' or 'G')
action_id       = '66479e9ab80c19b8c800f8ae'                # ID of the existing tension measurements action to be edited (get from DB)

# ##################################


# Main script function
if __name__ == '__main__':
    # This script can be run in two ways:
    #   1) if no command line arguments are specified, the global variables will use the default values given above
    #   2) if command line arguments are specified, the global variables will take the specified values, overriding the default values given above
    if len(sys.argv) > 1:
        csvFile   = sys.argv[1]
        apaLayer  = sys.argv[2]
        action_id = sys.argv[3]

    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading tension measurements (both new and re-tensionings) requires two steps:
    #   - extract the tension measurements from the input .csv file
    #   - perform a new tension measurements action, or edit an existing one

    # Call the extraction function ... this returns two Python lists - one for the tensions on side A, and the other for side B
    tensions_sideA, tensions_sideB = ExtractTensions(csvFile, apaLayer)

    # Edit an existing tension measurements action with 'tensions_sideA' and 'tensions_sideB' as part of the 'actionData_values' list of field values to be edited
    # For more general details about editing actions via M2M, please see the README and the 'template_edit_action.py' script
    actionID = action_id
    actionData_fields = [
        'measuredTensions_sideA',
        'measuredTensions_sideB',
    ]
    actionData_values = [
        tensions_sideA,
        tensions_sideB,
    ]

    id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
    print(f' Successfully edited action with ID: {id}')

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
