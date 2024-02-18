from common import ConnectToAPI, EditAction
from frameInspections import ExtractM4HoleResults

####################################
# Set the user-defined information #
####################################

# For uploading new or revised inspection results, the following information is required:
dataFile_m4Holes = '/user/majumdar/Desktop/horizontalInspections/UK_Frames/F000_results.xlsx'     
                                                                     # Full path to the input data file (must be a string ending in '.xlsx')
action_id        = '65c3a4df0273db98a06e517a'                        # ID of the existing frame surveys action to be edited (get from DB)
edtAction_comms  = ''                                                # Free-form string, additional description or commentary if desired

# ##################################


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading the results of a horizontal frame inspection (both new and revised) requires two steps:
    #   - extract the M4 hole measurement results from the input .xlsx file
    #   - edit an 'Horizontal Frame Inspection' action

    # Call the extraction function ... this returns a Python dictionary containing the results
    dict_m4Holes = ExtractM4HoleResults(dataFile_m4Holes)
    
    # Edit an existing 'Horizontal Frame Inspection' action with the dictionary in the list of field values to be edited
    # For more general details about editing actions via M2M, please see the README and the 'template_edit_action.py' script
    actionID = action_id
    actionData_fields = [
        'm4Holes',
        'comments',
    ]
    actionData_values = [
        dict_m4Holes,
        edtAction_comms,
    ]

    id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
    print(f' Successfully edited action with ID: {id}')

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
