# General Python imports
import pandas as pd
import os
import sys

# Local Python imports
from common import ConnectToAPI, EditAction

######################################
## Set the user-defined information ##
######################################

# For uploading new or revised survey results, the following information is required:
actionId_intake        = '664b7666004486ec08abe2cb'    # ID of the existing 'Intake Surveys' action to be edited (get from DB)
actionId_installation  = '664b51b8004486ec08abe2bd'    # ID of the existing 'Installation Surveys' action to be edited (get from DB)
dataFile_intakeM4Holes = '/user/majumdar/Desktop/Frame_Surveys/UK_Frames/TEMPLATE_F000_m4Holes.xlsx'     
                                                       # Full path to the input data file containing INTAKE M4 HOLES SURVEY results (must be a string ending in '.xlsx')
values_intakeXCorners  = [0.15, 1.00, 0.85]
                                                       # Manual CROSS-CORNER measurement values (these should be provided by either Callum Holt or Ged Bell alongside the input data files)
dataFile_allAnalyses   = '/user/majumdar/Desktop/Frame_Surveys/UK_Frames/TEMPLATE_F000_analyses.xlsx'
                                                       # Full path to the input data file containing ALL OF THE ANALYSES' results (must be a string ending in '.xlsx')

######################################


#################################################################################
## Extract INTAKE SURVEY M4 hole measurement results from the input .xlsx file ##
#################################################################################
def ExtractResults_IntakeM4Holes(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(' ExtractResults_IntakeM4Holes() - ERROR: the specified input file does not exist! \n')
    
    # Extract the results from the (only) sheet in the data file, and save them directly into a Pandas dataframe
    # Some of the rows and columns are empty (from pre-defined spacing in the spreadsheet), so remove them after extracting the entire set
    # The spreadsheet doesn't have particularly helpful column names, so create some new ones (which will also be used for the per-row parameter keys)
    # Immediately replace all 'nan's with empty strings (the 'nan's may come from empty cells in the data file, but will not be allowed as JSON during upload)
    # Convert the column of hole names to strings, and truncate the others to 3 decimal place floats
    dict_m4Holes = pd.read_excel(dataFile, header = 0, usecols = 'B : L', engine = 'openpyxl', nrows = 56)
    dict_m4Holes = dict_m4Holes.dropna(how = 'all', axis = 0)
    dict_m4Holes = dict_m4Holes.dropna(how = 'all', axis = 1)
    dict_m4Holes.columns = ['x', 'y', 'z', 'dist_1stHole', 'deviat_1stHole', 'dist_prevHole', 'deviat_prevHole', 'Hole']
    dict_m4Holes = dict_m4Holes.fillna('')
    dict_m4Holes['Hole'] = dict_m4Holes['Hole'].astype(str)
    dict_m4Holes = dict_m4Holes.round(pd.Series([3, 3, 3, 3, 3, 3, 3], index = ['x', 'y', 'z', 'dist_1stHole', 'deviat_1stHole', 'dist_prevHole', 'deviat_prevHole']))
    
    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : index of row in the data file
    #   - value : sub-dictionary consisting of [key, value] pairs for the point name and the various per-point parameters
    dict_m4Holes = dict_m4Holes.to_dict(orient = 'index')

    print(f' ExtractResults_IntakeM4Holes() - INFO: successfully extracted \'Intake Survey M4 Hole Measurement\' results')

    # Return the dictionary
    return dict_m4Holes


################################################################################
## Extract INTAKE SURVEY planarity analysis results from the input .xlsx file ##
################################################################################
def ExtractResults_IntakePlanarity(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(' ExtractResults_IntakePlanarity() - ERROR: the specified input file does not exist! \n')
    
    # Extract the M4 hole-based planarity analysis results from the appropriate sheet in the data file, and save them directly into a Pandas dataframe
    # We need each row to have a unique index, but because some of them have identical measurement names (which would normally be used as the indices), restore the numerical indices instead
    # Immediately replace any and all 'nan's with empty strings (the 'nan's will come from empty cells in the data file, but will not be allowed as JSON during upload)
    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   * key   : index of measurement
    #   * value : sub-dictionary consisting of [key, value] pairs for the measurement name and the various per-measurement parameters
    df_planarity = pd.read_excel(dataFile, sheet_name = 'DUNE parameters w M4', header = 5, index_col = 0, usecols = 'A : E', engine = 'openpyxl', nrows = 29)
    df_planarity = df_planarity.reset_index()
    df_planarity = df_planarity.fillna('')
    
    dict_planarity = df_planarity.to_dict(orient = 'index')

    print(f' ExtractResults_IntakePlanarity() - INFO: successfully extracted \'Intake Survey Planarity Analysis\' results')

    # Return the dictionary
    return dict_planarity


##################################################################################
## Set INTAKE SURVEY CROSS-CORNER measurement results from the provided values  ##
##################################################################################
def SetupResults_IntakeXCorners(values):
    # Set up a dictionary for the manual cross-corner measurements ... 
    # ... each individual entry in this dictionary should be in the same format as the entries in the intake survey planarity analysis dictionary
    dict_intakeXCorners = {
        0: {
            'Measurement': 'Frame Cross Dimensions',
            'Actual': values[0],
            'Units': 'mm',
            'Tolerance': 0.25,
            'Comment': '',
        },
        1: {
            'Measurement': 'Cross Dimensions Pre-Release',
            'Actual': values[1],
            'Units': 'mm',
            'Tolerance': 2.0,
            'Comment': '',
        },
        2: {
            'Measurement': 'Cross Dimensions Post-Release',
            'Actual': values[2],
            'Units': 'mm',
            'Tolerance': 3.0,
            'Comment': '',
        },
    }
    
    print(f' SetupResults_IntakeXCorners() - INFO: successfully set up \'Intake Survey Cross Corner Measurement\' results')

    # Return the dictionary
    return dict_intakeXCorners


#####################################################################################################
## Extract INSTALLATION SURVEY (envelope and planarity) analysis results from the input .xlsx file ##
#####################################################################################################
def ExtractResults_InstallationSurveys(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(' ExtractResults_InstallationSurveys() - ERROR: the specified input file does not exist! \n')
    
    # For each of the sets of analysis results (envelope and M6/10/20 holes-based planarity), we must do the following steps:
    # - extract the analysis results from the appropriate sheet in the data file, and save them directly into a Pandas dataframe
    # - we need each row to have a unique index, but because some of them have identical measurement names (which would normally be used as the indices), restore the numerical indices instead
    # - immediately replace any and all 'nan's with empty strings (the 'nan's will come from empty cells in the data file, but will not be allowed as JSON during upload)
    # - convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #     * key   : index of measurement
    #     * value : sub-dictionary consisting of [key, value] pairs for the measurement name and the various per-measurement parameters
    df_envelope = pd.read_excel(dataFile, sheet_name = 'Envelope', header = 5, index_col = 0, usecols = 'A : I', engine = 'openpyxl', nrows = 30)
    df_envelope = df_envelope.reset_index()
    df_envelope = df_envelope.fillna('')
    
    dict_envelope = df_envelope.to_dict(orient = 'index')

    print(f' ExtractResults_InstallationSurveys() - INFO: successfully extracted \'Installation Survey Envelope Analysis\' results')

    df_planarity = pd.read_excel(dataFile, sheet_name = 'DUNE parameters', header = 5, index_col = 0, usecols = 'A : E', engine = 'openpyxl', nrows = 29)
    df_planarity = df_planarity.reset_index()
    df_planarity = df_planarity.fillna('')
    
    dict_planarity = df_planarity.to_dict(orient = 'index')

    print(f' ExtractResults_InstallationSurveys() - INFO: successfully extracted \'Installation Survey Planarity Analysis\' results')

    # Return both dictionaries
    return dict_envelope, dict_planarity


##########################
## Main script function ##
##########################
if __name__ == '__main__':
    print()

    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

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

    id = EditAction(actionID, actionData_fields, actionData_values, connection, headers)
    print(f' Successfully edited action with ID: {id}')
    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
