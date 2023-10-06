from common import ConnectToAPI, PerformAction, EditAction
from frameSurveys import ExtractSurveyResults

####################################
# Set the user-defined information #
####################################

# Set a flag to specify if you are performing a new frame surveys action, or editing an existing one with updated survey results
new_frameSurveys = False

# For extracting the survey results (required for BOTH performing new and editing existing actions), the following information is required:
dataFile = '/user/majumdar/Desktop/surveys/frame 7.xlsx'     
                                                             # Name and location of the input .xlsx file (must be a string ending in '.xlsx')

# For uploading new survey results (i.e. performing a new action), the following information is required:
frame_uuid       = '2367e340-5ed5-11ee-9e07-d11ab28594c8'    # UUID of the APA Frame on which the action is being performed (get from DB)
surveys_date     = '2023-09-29'                              # Date on which the surveys were performed (in 'yyyy-MM-dd' format)
surveys_location = 'dsm'                                     # Location at which the surveys were performed (use one of the following: 'dsm', 'daresbury', 'cern')
newAction_comms  = 'This is a new frame surveys action, uploaded via M2M'
                                                             # Free-form string, additional description or commentary if required

# For uploading edited survey results (i.e. editing an existing action), the following information is required:
action_id        = '6516ec526af6fed6fbf7aaa6'                # ID of the existing frame surveys action to be edited (get from DB)
edtAction_comms  = 'This is an edited frame surveys action, uploaded via M2M'
                                                             # Free-form string, additional description or commentary if required

# ##################################


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading frame survey results (both new and edited) requires two steps:
    #   - extract the datapoints and results from the input .xlsx file
    #   - perform a new frame surveys action, or edit an existing one

    # Call the extraction function ... this returns Python dictionaries of the datapoints and various results
    dict_datapoints, dict_envelope, dict_planarity = ExtractSurveyResults(dataFile)

    print(f" Successfully extracted frame survey results")

    # EITHER perform a new frame surveys action with the dictionaries as part of the 'actionData' dictionary ...
    # OR edit an existing frame surveys action with the dictionaries in the list of field values to be edited
    # For more general details about these options, please see the README and the 'template_perform_action.py' and 'template_edit_action.py' scripts respectively
    if new_frameSurveys:
        actionTypeFormID = 'FrameSurveys'
        componentUUID = frame_uuid
        actionData = {
            'surveysDate': surveys_date,
            'surveysLocation': surveys_location,
            'comments': newAction_comms,
            'datapoints': dict_datapoints,
            'envelope': dict_envelope,
            'planarity': dict_planarity,
        }

        id = PerformAction(actionTypeFormID, componentUUID, actionData, connection, headers)
        print(f" Successfully performed action with ID: {id}")
    else:
        actionID = action_id
        actionData_fields = [
            'datapoints',
            'envelope',
            'planarity',
            'comments',
        ]
        actionData_values = [
            dict_datapoints,
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
