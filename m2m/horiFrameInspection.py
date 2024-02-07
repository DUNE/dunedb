# General Python imports
import pandas as pd
import os
import sys


###############################################
## Extract results from the input .xlsx file ##
###############################################
def ExtractResults(dataFile):
    # Check that the specified data file exists ... if not, exit and print an appropriate error message
    dataFile_exists = os.path.isfile(dataFile)

    if not dataFile_exists:
        sys.exit(" ExtractResults() - ERROR: the specified input file does not exist! \n")
    
    # Extract the results from the (only) sheet in the data file, and save them directly into a Pandas dataframe
    # Some of the rows and columns are empty (from pre-defined spacing in the spreadsheet), so remove them after extracting the entire set
    # The spreadsheet doesn't have particularly helpful column names, so create some new ones (which will also be used for the per-row parameter keys)
    # Immediately replace all 'nan's with empty strings (the 'nan's may come from empty cells in the data file, but will not be allowed as JSON during upload)
    # Convert the column of hole names to strings, and truncate the others to 3 decimal place floats
    dict_results = pd.read_excel(dataFile, header = 0, usecols = 'B : L', engine = 'openpyxl', nrows = 56)
    dict_results = dict_results.dropna(how = 'all', axis = 0)
    dict_results = dict_results.dropna(how = 'all', axis = 1)
    dict_results.columns = ['x', 'y', 'z', 'dist_1stHole', 'deviat_1stHole', 'dist_prevHole', 'deviat_prevHole', 'Hole']
    dict_results = dict_results.fillna('')
    dict_results['Hole'] = dict_results['Hole'].astype(str)
    dict_results = dict_results.round(pd.Series([3, 3, 3, 3, 3, 3, 3], index = ['x', 'y', 'z', 'dist_1stHole', 'deviat_1stHole', 'dist_prevHole', 'deviat_prevHole']))
    
    # Convert the dataframe into a nested Python dictionary, where each top-level entry takes the following {key, value} form:
    #   - key   : index of row in the data file
    #   - value : sub-dictionary consisting of [key, value] pairs for the point name and the various per-point parameters
    dict_results = dict_results.to_dict(orient = 'index')

    # Return the dictionary
    return dict_results

