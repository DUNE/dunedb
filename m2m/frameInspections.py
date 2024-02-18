# General Python imports
import pandas as pd
import os
import sys


#####################################################################################
## Extract VERTICAL INSPECTION envelope analysis results from the input .xlsx file ##
#####################################################################################
def ExtractEnvelopeResults(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(' ExtractEnvelopeResults() - ERROR: the specified input file does not exist! \n')
    
    # Extract the envelope results from the appropriate sheet in the data file, and save them directly into a Pandas dataframe
    # We need each row to have a unique index, but because some of them have identical measurement names (which would normally be used as the indices), restore the numerical indices instead
    # Immediately replace all 'nan's with empty strings (the 'nan's will come from empty cells in the data file, but will not be allowed as JSON during upload)
    df_envelope = pd.read_excel(dataFile, sheet_name = 'Envelope', header = 0, index_col = 0, usecols = 'A : I', engine = 'openpyxl', nrows = 29)
    df_envelope = df_envelope.reset_index()
    df_envelope = df_envelope.fillna('')
    
    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : index of measurement
    #   - value : sub-dictionary consisting of [key, value] pairs for the measurement name and the various per-measurement parameters
    dict_envelope = df_envelope.to_dict(orient = 'index')

    print(f' ExtractEnvelopeResults() - INFO: successfully extracted envelope analysis results')

    # Return the dictionary
    return dict_envelope


#####################################################################################
## Extract VERTICAL INSPECTION planarity analysis results from the input .csv file ##
#####################################################################################
def ExtractPlanarityResults(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(' ExtractPlanarityResults() - ERROR: the specified input file does not exist! \n')
    
    # Extract the planarity results from the file, and save them directly into a Pandas dataframe (excluding the additional metadata at the top of the data file)
    # Immediately replace all 'nan's with empty strings (the 'nan's come from empty cells in the data file, but will not be allowed as JSON during upload)
    df_planarity = pd.read_csv(dataFile, header = 4, encoding = 'latin1')
    df_planarity = df_planarity.fillna('')
    
    # Split the single tolerance column into individual columns containing the numerical tolerance, the units and the tolerance comment
    # Then delete the tolerance comment column (the original tolerance column is overridden by the new numerical tolerance column)
    df_planarity[['Tolerance', 'Units', 'Tolerance_Com']] = df_planarity['Tolerance'].str.split(' ', n = 2, expand = True)
    df_planarity = df_planarity.drop('Tolerance_Com', axis = 1)

    # Convert the string-type numerical tolerances into float-types
    # Note that we must ignore the commentary rows ... these have empty strings in the numerical tolerance column, which will obviously give errors when attempting to convert
    df_planarity['Tolerance'][ 0 : 10] = df_planarity['Tolerance'][ 0 : 10].astype(float)
    df_planarity['Tolerance'][11 : 17] = df_planarity['Tolerance'][11 : 17].astype(float)
    df_planarity['Tolerance'][18 : 20] = df_planarity['Tolerance'][18 : 20].astype(float)
    df_planarity['Tolerance'][21 :   ] = df_planarity['Tolerance'][21 :   ].astype(float)
    
    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : index of measurement
    #   - value : sub-dictionary consisting of [key, value] pairs for the measurement name, actual measurement, the tolerance, a comment and the units
    dict_planarity = df_planarity.to_dict(orient = 'index')

    print(f' ExtractPlanarityResults() - INFO: successfully extracted planarity analysis results')

    # Return the dictionary
    return dict_planarity


#########################################################################################
## Extract HORIZONTAL INSPECTION M4 hole measurement results from the input .xlsx file ##
#########################################################################################
def ExtractM4HoleResults(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(' ExtractM4HoleResults() - ERROR: the specified input file does not exist! \n')
    
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

    print(f' ExtractM4HoleResults() - INFO: successfully extracted M4 hole measurement results')

    # Return the dictionary
    return dict_m4Holes
