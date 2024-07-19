# Local Python imports
from common import ConnectToAPI, ConvertShortUUID


# Main script function
if __name__ == '__main__':
    print()
    
    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Set the short UUID string to be converted (this must be between 20 and 22 characters long)
    shortUUID = 'sYYtwWFURzCyHVYavMrQDd'

    # Call the conversion function, which takes the short UUID string as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # The 'result' string returned by the function will either be the full UUID or an error message
    result = ConvertShortUUID(shortUUID, connection, headers)
    print(f" Conversion Result: {shortUUID} -> {result}")

    print()

    # If many short UUIDs need to be converted, this can be performed in a loop
    # Set a list of short UUID strings
    shortUUIDs = [
        'sYYtwWFURzCyHVYavMrQDd',
        '7SA6ENka8QCAVnThtemoWD',
        'rjUYvNNz5yB6iiVRtQ9aSS',
        '7HYqy87RYbfnf7FEPtcCJH',
    ]

    # For each short UUID in the list ...
    for listed_shortUUID in shortUUIDs:
        # Call the conversion function, which takes the short UUID string as its first argument
        # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
        # The 'result' string returned by the function will either be the full UUID or an error message
        listed_result = ConvertShortUUID(listed_shortUUID, connection, headers)
        print(f" Conversion Result: {listed_shortUUID} -> {listed_result}")

    ########################################

    print()

    # Once all conversions have been performed, close the connection to the database API
    connection.close()
