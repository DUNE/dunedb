from common import ConnectToAPI, PerformAction, EditAction
from vertFrameInspection import ExtractEnvelopeResults, ExtractPlanarityResults

####################################
# Set the user-defined information #
####################################

# Set a flag to specify if you are performing a new 'Vertical Frame Inspection' action, or editing an existing one with updated results
new_vertInspection = False

# For extracting the analysis results (required for BOTH performing new and editing existing actions), the following information is required:
dataFile_envelope  = ''     
                                                                     # Full path to the input .xlsx file for ENVELOPE results (must be a string ending in '.xlsx')
dataFile_planarity = '/user/majumdar/Desktop/inspectionResults/F21VL_PSL_MANM_results.csv'     
                                                                     # Full path to the input .xlsx file for PLANARITY results (must be a string ending in '.csv')

# For uploading new inspection results (i.e. performing a new action), the following information is required:
frame_uuid               = '2367e340-5ed5-11ee-9e07-d11ab28594c8'    # UUID of the APA Frame on which the action is being performed (get from DB)
dataCollection_personnel = 'manchesterMetrology'                     # Who collected the raw data (use one of the following: 'manchesterMetrology', 'daresbury', 'cern')
dataCollection_date      = '2024-01-01'                              # When the raw data was collected (in 'yyyy-MM-dd' format)
dataCollection_location  = 'dsm'                                     # Where the raw data was collected (use one of the following: 'dsm', 'daresbury', 'cern')
newAction_comms          = ''
                                                                     # Free-form string, additional description or commentary if required

# For uploading edited inspection results (i.e. editing an existing action), the following information is required:
action_id                = '6591a8b06a93b6fe4e1a3a91'                # ID of the existing frame surveys action to be edited (get from DB)
edtAction_comms          = 'v3 - uploaded planarity analysis results via M2M (plus empty dictionary of envelope analysis results)'
                                                                     # Free-form string, additional description or commentary if required

# ##################################


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading the analysis results of a vertical frame inspection (both new and edited) requires two steps:
    #   - extract the results from the input .xlsx and .csv files (for envelope and planarity analysis respectively)
    #   - perform a new 'Vertical Frame Inspection' action, or edit an existing one

    # Call the extraction functions ... these each return a Python dictionary containing the respective results
    dict_envelope = {}
#####    dict_envelope = ExtractPlanarityResults(dataFile_envelope)
    dict_planarity = ExtractPlanarityResults(dataFile_planarity)

    print(f" Successfully extracted inspection analysis results")

    # EITHER perform a new 'Vertical Frame Inspection' action with the dictionaries as part of the 'actionData' dictionary ...
    # OR edit an existing 'Vertical Frame Inspection' action with the dictionaries in the list of field values to be edited
    # For more general details about these options, please see the README and the 'template_perform_action.py' and 'template_edit_action.py' scripts respectively
    if new_vertInspection:
        actionTypeFormID = 'FrameVerticalInspection'
        componentUUID = frame_uuid
        actionData = {
            'dataCollectionPersonnel': dataCollection_personnel,
            'dataCollectionDate': dataCollection_date,
            'dataCollectionLocation': dataCollection_location,
            'comments': newAction_comms,
            'envelope': dict_envelope,
            'planarity': dict_planarity,
        }

        id = PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers)
        print(f" Successfully performed action with ID: {id}")
    else:
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
        print(f" Successfully edited action with ID: {id}")

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()