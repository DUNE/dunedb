from common import ConnectToAPI, EditAction
from frameInspections import ExtractEnvelopeResults, ExtractPlanarityResults

####################################
# Set the user-defined information #
####################################

# For uploading new or revised inspection results, the following information is required:
dataFile_envelope  = '/user/majumdar/Desktop/Vertical_Inspections/UK_Frames/F000.xlsx'     
                                                                     # Full path to the input data file for ENVELOPE results (must be a string ending in '.xlsx')
dataFile_planarity = '/user/majumdar/Desktop/Vertical_Inspections/UK_Frames/F000_results.csv'     
                                                                     # Full path to the input data file for PLANARITY results (must be a string ending in '.csv')
action_id          = '65bbf86bc073b158619c9d1a'                      # ID of the existing frame surveys action to be edited (get from DB)
edtAction_comms    = ''                                              # Free-form string, additional description or commentary if desired

# ##################################


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading the analysis results of a vertical frame inspection (both new and revised) requires two steps:
    #   - extract the envelope and planarity analysis results from the input .xlsx and .csv files respectively
    #   - edit an existing 'Vertical Frame Inspection' action

    # Call the extraction functions ... these each return a Python dictionary containing the respective results
    dict_envelope  = ExtractEnvelopeResults(dataFile_envelope)
    dict_planarity = ExtractPlanarityResults(dataFile_planarity)

    # Edit an existing 'Vertical Frame Inspection' action with the dictionaries in the list of field values to be edited
    # For more general details about editing actions via M2M, please see the README and the 'template_edit_action.py' script
    actionID = action_id
    actionData_fields = [
        'envelope',
        'planarity',
        'comments',
    ]
    actionData_values = [
        dict_envelope,
        dict_planarity,
        edtAction_comms,
    ]

    id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
    print(f' Successfully edited action with ID: {id}')

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
