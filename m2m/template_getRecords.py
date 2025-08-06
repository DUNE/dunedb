# Local Python imports
from common import ConnectToAPI, GetComponent, GetComponents_byTypeRecordNumber, GetListOfComponents, GetAction, GetListOfActions, GetWorkflow, GetListOfWorkflows


# Main script function
if __name__ == '__main__':
    print()

    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    ########################################
    # User-defined script functionality goes here

    # Call the component retrieval function, which takes the UUID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # The optional fourth argument is the desired version of the component record ... if this is not specified or set to '0', the most recent version will be retrieved
    # If successful, the function returns the latest version of the component record as a Python dictionary (if not, an error message is automatically displayed)
    componentUUID = '5f9ea420-3e88-11ed-9114-03f8483882ff'

    component = GetComponent(componentUUID, connection, headers, version = 0)
    print(component)
    print()

    # Call the component list retrieval function, which takes the type form ID and type record number as its first and second arguments respectively
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of component records (which can be empty, i.e. len() = 0, if there are no matching components)
    componentTypeFormID = 'basic_component_2'
    typeRecordNumber = 1

    components = GetComponents_byTypeRecordNumber(componentTypeFormID, typeRecordNumber, connection, headers)
    print(f" Found {len(components)} components with type form ID '{componentTypeFormID}' and type record number = {typeRecordNumber}")
    print(components)
    print()

    # Call the component listing function, which takes the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of component UUIDs, with each UUID being an individual string
    componentTypeFormID = 'basic_component_2'

    componentUUIDs = GetListOfComponents(componentTypeFormID, connection, headers)
    print(f" Found {len(componentUUIDs)} components with type form ID '{componentTypeFormID}'")
    print(componentUUIDs)
    print()

    # Call the action retrieval function, which takes the ID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # The optional fourth argument is the desired version of the action record ... if this is not specified or set to '0', the most recent version will be retrieved
    # If successful, the function returns the latest version of the action record as a Python dictionary (if not, an error message is automatically displayed)
    actionID = '63340ac79708eb30e6403cb9'

    action = GetAction(actionID, connection, headers, version = 0)
    print(action)
    print()

    # Call the action listing function, which takes the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns a list of action IDs, with each ID being an individual string
    actionTypeFormID = 'my_action'

    actionIDs = GetListOfActions(actionTypeFormID, connection, headers)
    print(f" Found {len(actionIDs)} actions with type form ID: '{actionTypeFormID}'")
    print(actionIDs)
    print()

    # Call the workflow retrieval function, which takes the ID as its first argument
    # The second and third arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns the latest version of the workflow record as a Python dictionary (if not, an error message is automatically displayed)
    workflowID = '668ed67ee7db83204afd723f'

    workflow = GetWorkflow(workflowID, connection, headers)
    print(workflow)
    print()

    # Call the workflow listing function, which takes the type form ID as its first argument
    # The last two arguments must ALWAYS be 'connection' and 'headers' respectively
    # If successful, the function returns two lists - one of workflow IDs (with each ID being an individual string), and the other of workflow statuses
    workflowTypeFormID = 'APA_Assembly'

    workflowIDs, workflowStatuses = GetListOfWorkflows(workflowTypeFormID, connection, headers)
    print(f" Found {len(workflowIDs)} workflows with type form ID: '{workflowTypeFormID}'")
    print(workflowIDs)
    print(workflowStatuses)
    print()

    ########################################

    print()

    # Once all records have been retrieved, close the connection to the database API
    connection.close()
