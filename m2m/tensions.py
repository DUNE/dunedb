# General Python imports
import pandas as pd
import numpy as np
import sys

# Global variables
apaLayers   = ['X', 'U', 'V', 'G']
columns_X_A = [ 7,  9, 11, 13, 15]
columns_X_B = [22, 24, 26, 28, 30]
columns_U_A = [24, 26, 28, 30, 32, 34]
columns_U_B = [41, 43, 45, 47, 49, 51]
columns_V_A = [26, 28, 30, 32, 34, 36]
columns_V_B = [44, 46, 48, 50, 52, 54]
columns_G_A = [ 7,  9, 11, 13, 15]
columns_G_B = [22, 24, 26, 28, 30]


########################################################
## Extract all wire tensions from the input .csv file ##
########################################################
def ExtractTensions(csvFile, apaLayer):
    # Check that the correct arguments have been provided ... if not, exit and print an appropriate error message
    if csvFile[-4 : ] != '.csv':
        sys.exit(" ExtractTensions() - ERROR: the specified input file is not a '.csv' type! \n")
    
    if apaLayer not in apaLayers:
        sys.exit(" ExtractTensions() - ERROR: invalid APA layer specified ... please use 'X','U', 'V' or 'G'! \n") 
    
    # Select the corresponding list of columns to extract from the .csv file for the given APA layer
    columns_A, columns_B = None, None
    
    if apaLayer == 'X':
        columns_A = columns_X_A
        columns_B = columns_X_B
    elif apaLayer == 'U':
        columns_A = columns_U_A
        columns_B = columns_U_B
    elif apaLayer == 'V':
        columns_A = columns_V_A
        columns_B = columns_V_B
    else:
        columns_A = columns_G_A
        columns_B = columns_G_B
    
    # First deal with the tensions on side A
    # # Extract the columns from the .csv file for this side into a Pandas dataframe (columns --> series)
    # Set the row with index = 10 as the first one to store (the 'header row') across all series, since the rows above this always contain some comments, miscellaneous calculations, etc.
    # Immediately replace all zeroes with 'NaN's ... this is required for the later step of merging the series
    df_sideA = pd.read_csv(csvFile, usecols = columns_A, header = 10, encoding = 'latin1')
    df_sideA = df_sideA.replace(0.0, np.nan)
    
    # Merge the tensions series such that the most recently measured tension of each wire / wire segment is kept, and any earlier values are discarded
    # Start by setting the final tensions series equal to whatever is in the last series of the dataframe ... i.e. the most recently measured tensions
    # Note that this series may in fact be partially or completely empty (i.e. filled with 'NaN's), depending on how many re-tensionings have been performed
    tensions_sideA = df_sideA[df_sideA.columns[-1]]
    
    # For each series in the dataframe except the last one, and in REVERSE ORDER ...
    # ... overwrite the final series by the 'combine_first' combination of its current value and the new series ...
    # ... where a current non-NaN value is kept in favour of a new non-NaN value in the same position, and a current NaN may be replaced by a new non-NaN if existing
    for column in df_sideA.columns[ : : -1]:
        tensions_sideA = tensions_sideA.combine_first(df_sideA[column])
    
    # Convert the final tensions series for this side into a Python list, since this is the format in which it will be uploaded to the APA DB
    # Replace any NaNs with actual zeroes, which is a better indication of a missing measurement on the DB side
    # Finally, remove the last element in the final series ... this is not actually a tensions measurement, but is a comment row in the original .csv file
    list_sideA = tensions_sideA.fillna(0.0).to_list()[ : -1]
    
    # Repeat the above for side B
    df_sideB = pd.read_csv(csvFile, usecols = columns_B, header = 10, encoding = 'latin1')
    df_sideB = df_sideB.replace(0.0, np.nan)
    tensions_sideB = df_sideB[df_sideB.columns[-1]]
    
    for column in df_sideB.columns[ : : -1]:
        tensions_sideB = tensions_sideB.combine_first(df_sideB[column])
    
    list_sideB = tensions_sideB.fillna(0.0).to_list()[ : -1]
    
    # Return the lists of tensions for both sides
    return list_sideA, list_sideB
