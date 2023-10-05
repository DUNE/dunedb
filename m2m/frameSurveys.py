# General Python imports
import pandas as pd
import os
import sys


#############################################################
## Extract frame survey results from the input .xlsx files ##
#############################################################
def ExtractSurveyResults(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(" ExtractSurveyResults() - ERROR: the specified input file does not exist! \n")
    
    # Extract the datapoints from the appropriate sheet in the data file, and save them directly into a Pandas dataframe
    # Note the following:
    #  - the sheet containing the datapoints will have a variable name, but will always be the first one (index = 0) in the file
    #  - some of the rows can be skipped immediately, since they only contain text and/or temporary calculations
    # Immediately replace all 'nan's with empty strings (the 'nan's will come from empty cells in the data file, but will not be allowed as JSON during upload)
    df_datapoints = pd.read_excel(dataFile, sheet_name = 0, header = 0, index_col = 0, usecols = 'A : L, N : S', engine = 'openpyxl', skiprows = [0, 1, 3, 18, 33, 40, 57, 78, 85, 86, 87])
    df_datapoints = df_datapoints.fillna('')
    
    # Assign better column titles ... because of the way the titles are arranged in the data file, some information gets lost during extraction
    df_datapoints.columns = ['Measured x (m)', 'Measured y (m)', 'Measured z (m)', 'x Correction (m)', 'y Correction (m)', 'z Correction (m)', 'Surface x (m)', 'Surface y (m)', 'Surface z (m)', 'Adapter', 'Comment', 'Nominal x (mm)', 'Nominal y (mm)', 'Nominal z (mm)', 'x Deviation (mm)', 'y Deviation (mm)', 'z Deviation (mm)']

    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : name of datapoint
    #   - value : sub-dictionary consisting of [key, value] pairs for the measured x, y, z, corrections, adapter, comment, nominal x, y z, and deviations
    dict_datapoints = df_datapoints.to_dict(orient = 'index')

    # Extract the envelope results from the appropriate sheet in the data file, and save them directly into a Pandas dataframe
    # Note the following:
    #   - we only need to extract the specific columns and rows containing the results, and can exclude the additional calculations in other cells
    #   - we need each row to have a unique index, but because some of them have identical measurement names (which would normally be used as the indices), restore the numerical indices instead
    # Immediately replace all 'nan's with empty strings (the 'nan's will come from empty cells in the data file, but will not be allowed as JSON during upload)
    df_envelope = pd.read_excel(dataFile, sheet_name = 'Envelope', header = 0, index_col = 0, usecols = 'A : I', engine = 'openpyxl', nrows = 25)
    df_envelope = df_envelope.reset_index()
    df_envelope = df_envelope.fillna('')
    
    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : index of the envelope measurement
    #   - value : sub-dictionary of measurements, consisting of [key, value] pairs for the measurement name and various recorded per-measurement parameters
    dict_envelope = df_envelope.to_dict(orient = 'index')

    # Extract the planarity results from the appropriate sheet in the data file, and save them directly into a Pandas dataframe
    # Note the following:
    #  - we only need to extract the specific columns and rows containing the results, and can exclude the additional calculations in other cells
    #  - some of the rows can be skipped immediately, since they only contain text and/or temporary calculations
    # Immediately replace all 'nan's with empty strings (the 'nan's will come from empty cells in the data file, but will not be allowed as JSON during upload)
    df_planarity = pd.read_excel(dataFile, sheet_name = 'DUNE parameters', header = 0, index_col = 0, usecols = 'A : E', engine = 'openpyxl', skiprows = [6, 13], nrows = 21)
    df_planarity = df_planarity.fillna('')

    # We only need the numerical part of the tolerance, so split the single tolerance column into individual columns containing the numerical and string parts
    # Then delete the column containing the string part (the original combined values are overridden by the numerical part)
    df_planarity[['Tolerance', 'Tolerance_Com']] = df_planarity['Tolerance'].str.split(' ', n = 1, expand = True)
    df_planarity['Tolerance'] = df_planarity['Tolerance'].astype(float)
    df_planarity = df_planarity.drop('Tolerance_Com', axis = 1)

    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : name of planarity measurement
    #   - value : sub-dictionary of measurements, consisting of [key, value] pairs for the actual measurement, the units, the tolerance, and a comment
    dict_planarity = df_planarity.to_dict(orient = 'index')

    # Return the dictionaries of datapoints, envelope results and planarity results
    return dict_datapoints, dict_envelope, dict_planarity

        