# Local Python imports
from common import ConnectToAPI, GetAction, GetWorkflow, GetListOfWorkflows


# Main script function
if __name__ == '__main__':
    print()

    # Set up a connection to the database API and get the connection request headers
    # This must be done at the beginning of this main script function, but ONLY ONCE
    connection, headers = ConnectToAPI()

    # Retrieve a list of the workflow IDs of all currently existing 'APA Assembly' workflows
    workflowTypeFormID = 'APA_Assembly'
    workflowIDs = GetListOfWorkflows(workflowTypeFormID, connection, headers)
    
    print(f" Found {len(workflowIDs)} workflows with type form ID: '{workflowTypeFormID}'")
    print()

    # For each workflow ID ...
    for workflowID in workflowIDs:
        # Retrieve the corresponding workflow record
        workflow = GetWorkflow(workflowID, connection, headers)
        
        # For each action step in the workflow's path (i.e. excluding the first step, which is always related to component creation) ...
        for step in workflow['path'][1 : ]:
            # Check if the step has been performed, i.e. if it contains a valid action ID in its 'result' field
            # If so, retrieve the latest version of the corresponding action record, and pull out only the required information 
            # Additionally, retrieve the first version of the action record, and pull out the creation date, i.e. when the action was first performed
            actionID = step['result']
            actionInformation = {}

            if actionID is not '':
                action_latest = GetAction(actionID, connection, headers, version = 0)
                action_first = GetAction(actionID, connection, headers, version = 1)

        print()
    








    print()

    # Once all records have been retrieved, close the connection to the database API
    connection.close()