from common import ConnectToAPI, PerformAction, EditAction
from tensions import ExtractTensions


# Main script function
if __name__ == '__main__':
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Uploading tension measurements requires two steps:
    #   - extract the tension measurements from the input .csv file
    #   - perform a new tension measurements action, or edit an existing one

    # Set the two arguments required to extract the tension measurements:
    #   - the name of the input .csv file (must be a string ending in '.csv')
    #   - the wire layer (must be given as one of 'X','U', 'V' or 'G')
    csvFile = '~/Desktop/tensions/APA4_U_layer.csv'
    apaLayer = 'U'

    # Call the extraction function ... this returns two Python lists - one for the tensions on side A, and the other for side B
    tensions_sideA, tensions_sideB = ExtractTensions(csvFile, apaLayer)

    print(f" Successfully extracted {len(tensions_sideA)} tensions for side A and {len(tensions_sideB)} for side B")

    # EITHER perform a new tension measurements action with 'tensions_sideA' and 'tensions_sideB' as part of the 'actionData' dictionary ...
    # OR edit an existing tension measurements action with 'tensions_sideA' and 'tensions_sideB' as part of the 'actionData_values' list of field values to be edited
    # For more details about these options, please see the README, as well as the 'template_perform_action.py' and 'template_edit_action.py' scripts respectively

    ########################################

    print()

    # Once all actions have been performed and submitted, close the connection to the database API
    connection.close()
