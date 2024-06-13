# General Python imports
import pandas as pd
import os
import sys


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
            'Tolerance': 2.0,
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

