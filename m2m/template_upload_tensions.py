from common import ConnectToAPI, PerformAction, EditAction
from tensions import ExtractTensions

####################################
# Set the user-defined information #
# ##################################

# Set a flag to specify if you are performing a new tension measurements action, or editing an existing one with re-tensioning measurements
new_tensionMeasurements = False

# For extracting the tension measurements (required for BOTH performing new and editing existing actions), the following information is required:
csvFile         = '~/Desktop/tensionMeasurements.csv'
                                                            # Name and location of the input .csv file (must be a string ending in '.csv')
apaLayer        = 'X'                                       # Wire layer (must be given as one of 'X','U', 'V' or 'G')

# For uploading new tension measurements (i.e. performing a new action), the following information is required:
apa_uuid        = '49dcac80-4645-11ed-bb7f-0f80f77f8437'    # UUID of the Assembled APA on which the action is being performed (get from DB)
measurement_loc = 'daresbury'                               # Use one of the following: 'daresbury', 'chicago'
measurement_sys = 'laser1'                                  # Use one of the following: 'dwa1', 'dwa2, 'dwa3', 'laser1', 'laser2', 'laser3', 'laser4', 'laser5'
newAction_comms = 'This is a new single layer tension measurements action, uploaded via M2M'
                                                            # Free-form string, additional description or commentary if required

# For uploading re-tensioning measurements (i.e. editing an existing action), the following information is required:
action_id       = '6582feba5fedc88fb468a8d3'                # ID of the existing tension measurements action to be edited (get from DB)
replaced_wires  = '[none]'
                                                            # Free-form string, additional description or commentary if required
edtAction_comms = 'This is an existing single layer tension measurements action, edited via M2M'
                                                            # Free-form string, additional description or commentary if required

# ##################################


# Main script function
if __name__ == '__main__':
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

    print(f" Successfully extracted {len(tensions_sideA)} tensions for side A and {len(tensions_sideB)} for side B")

    # EITHER perform a new tension measurements action with 'tensions_sideA' and 'tensions_sideB' as part of the 'actionData' dictionary ...
    # OR edit an existing tension measurements action with 'tensions_sideA' and 'tensions_sideB' as part of the 'actionData_values' list of field values to be edited
    # For more general details about these options, please see the README and the 'template_perform_action.py' and 'template_edit_action.py' scripts respectively
    if new_tensionMeasurements:
        actionTypeFormID = 'x_tension_testing'
        componentUUID = apa_uuid
        actionData = {
            'apaLayer': apaLayer.lower(),
            'location': measurement_loc,
            'measurementSystem': measurement_sys,
            'measuredTensions_sideA': tensions_sideA,
            'measuredTensions_sideB': tensions_sideB,
            'replacedWireSegs': '',
            'comments': newAction_comms,
        }

        id = PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers)
        print(f" Successfully performed action with ID: {id}")
    else:
        actionID = action_id
        actionData_fields = [
            'measuredTensions_sideA',
            'measuredTensions_sideB',
            'replacedWireSegs',
            'comments',
        ]
        actionData_values = [
            tensions_sideA,
            tensions_sideB,
            replaced_wires,
            edtAction_comms,
        ]

        id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
        print(f" Successfully edited action with ID: {id}")
    
    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
