from common import ConnectToAPI, PerformAction, EditAction
from horiFrameInspection import ExtractResults

####################################
# Set the user-defined information #
####################################

# Set a flag to specify if you are performing a new 'Horizontal Frame Inspection' action, or editing an existing one with updated results
new_horiInspection = False

# For extracting the analysis results (required for BOTH performing new and editing existing actions), the following information is required:
dataFile = '/user/majumdar/Desktop/horizontalInspections/F26_results.xlsx'     
                                                                     # Full path to the input data file (must be a string ending in '.xlsx')

# For uploading new inspection results (i.e. performing a new action), the following information is required:
frame_uuid               = '034e3680-c13c-11ee-823a-b1203622d8d8'    # UUID of the APA Frame on which the action is being performed (get from DB)
dataCollection_personnel = 'manchesterMetrology'                     # Who collected the raw data (use one of the following: 'manchesterMetrology', 'daresbury', 'cern')
dataCollection_date      = '2024-01-01T00:00:00+00:00'               # When the raw data was collected (in 'yyyy-MM-ddT00:00:00+00:00' format)
dataCollection_location  = 'dsm'                                     # Where the raw data was collected (use one of the following: 'dsm', 'daresbury', 'cern')
newAction_comms          = ''
                                                                     # Free-form string, additional description or commentary if required

# For uploading edited inspection results (i.e. editing an existing action), the following information is required:
action_id                = '65c3a4df0273db98a06e517a'                # ID of the existing frame surveys action to be edited (get from DB)
edtAction_comms          = ''
                                                                     # Free-form string, additional description or commentary if required

# ##################################


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading the results of a horizontal frame inspection (both new and edited) requires two steps:
    #   - extract the results from the input .xlsx file
    #   - perform a new 'Horizontal Frame Inspection' action, or edit an existing one

    # Call the extraction function ... this returns a Python dictionary containing the results
    dict_results = ExtractResults(dataFile)
    
    print(f" Successfully extracted inspection results")

    # EITHER perform a new 'Horizontal Frame Inspection' action with the dictionary as part of the 'actionData' dictionary ...
    # OR edit an existing 'Horizontal Frame Inspection' action with the dictionary in the list of field values to be edited
    # For more general details about these options, please see the README and the 'template_perform_action.py' and 'template_edit_action.py' scripts respectively
    if new_horiInspection:
        actionTypeFormID = 'HorizontalFrameInspection'
        componentUUID = frame_uuid
        actionData = {
            'dataCollectionPersonnel': dataCollection_personnel,
            'dataCollectionDate': dataCollection_date,
            'dataCollectionLocation': dataCollection_location,
            'comments': newAction_comms,
            'results': dict_results,
        }

        id = PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers)
        print(f" Successfully performed action with ID: {id}")
    else:
        actionID = action_id
        actionData_fields = [
            'results',
            'comments',
        ]
        actionData_values = [
            dict_results,
            edtAction_comms,
        ]

        id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
        print(f" Successfully edited action with ID: {id}")

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
