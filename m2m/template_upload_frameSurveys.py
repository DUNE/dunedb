from common import ConnectToAPI, EditAction
from frameSurveys import ExtractResults_IntakeM4Holes, ExtractResults_IntakePlanarity, SetupResults_IntakeXCorners, ExtractResults_InstallationSurveys

####################################
# Set the user-defined information #
####################################

# For uploading new or revised survey results, the following information is required:
actionId_intake        = '664b7666004486ec08abe2cb'    # ID of the existing 'Intake Surveys' action to be edited (get from DB)
actionId_installation  = '664b51b8004486ec08abe2bd'    # ID of the existing 'Installation Surveys' action to be edited (get from DB)
dataFile_intakeM4Holes = '/user/majumdar/Desktop/Frame_Surveys/UK_Frames/TEMPLATE_F000_m4Holes.xlsx'     
                                                       # Full path to the input data file containing INTAKE M4 HOLES SURVEY results (must be a string ending in '.xlsx')
values_intakeXCorners  = [0.15, 1.00, 0.85]
                                                       # Manual CROSS-CORNER measurement values (these should be provided by either Callum Holt or Ged Bell alongside the input data files)
dataFile_allAnalyses   = '/user/majumdar/Desktop/Frame_Surveys/UK_Frames/TEMPLATE_F000_analyses.xlsx'
                                                       # Full path to the input data file containing ALL OF THE ANALYSES' results (must be a string ending in '.xlsx')

# ##################################


# Main script function
if __name__ == '__main__':
    print()

    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Call the extraction and setup functions for intake survey results ... these each return a single Python dictionary
    dict_intakeM4Holes = ExtractResults_IntakeM4Holes(dataFile_intakeM4Holes)
    dict_intakeXCorners = SetupResults_IntakeXCorners(values_intakeXCorners)
    dict_intakePlanarity = ExtractResults_IntakePlanarity(dataFile_allAnalyses)

    # Edit an existing 'Intake Surveys' action with the dictionaries in the list of field values to be edited
    actionID = actionId_intake
    actionData_fields = [
        'intake_m4Holes',
        'intake_xCorners',
        'intake_planarity',
    ]
    actionData_values = [
        dict_intakeM4Holes,
        dict_intakeXCorners,
        dict_intakePlanarity,
    ]

    id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
    print(f' Successfully edited action with ID: {id}')
    print()
    
    # Call the extraction function for installation survey results ... this returns two Python dictionaries
    dict_installEnvelope, dict_installPlanarity = ExtractResults_InstallationSurveys(dataFile_allAnalyses)
    
    # Edit an existing 'Installation Surveys' action with the dictionaries in the list of field values to be edited
    actionID = actionId_installation
    actionData_fields = [
        'install_envelope',
        'install_planarity',
    ]
    actionData_values = [
        dict_installEnvelope,
        dict_installPlanarity,
    ]

  #  id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
  #  print(f' Successfully edited action with ID: {id}')
    print()

    ########################################
    
    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
