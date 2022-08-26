// Declare a variable to hold the (initially empty) user-specified visual inspection disposition
let disposition = null;


/// Main function
$(function () {
  // When the selected disposition is changed ...
  $('#dispositionSelection').on('change', async function () {
    // Get the newly selected disposition from the corresponding page element
    disposition = $('#dispositionSelection').val();

    // If the disposition is valid ...
    if (disposition) {
      // Perform a jQuery 'ajax' call to make the search via the URL
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/byVisualInspection/${disposition}`,
        dataType: 'json',
        success: postSuccess_disposition,
      }).fail(postFail);
    }
  });
});


// Set up a dictionary containing the inspection issue [key, string] pairs (taken from the 'Visual Inspection' action type form)
const issuesDictionary = {
  packagingDamaged: 'Packaging damaged',
  scratches: 'Scratches',
  exposedCopper: 'Exposed copper',
  interruptedTraces: 'Copper trace(s) interrupted',
  chipped: 'PCB chipped',
  notFlat: 'PCB not flat',
  incorrectGeometry: 'Incorrect geometry',
  incorrectThickness: 'Incorrect thickness',
  qrCodeProblem: 'QR code problem',
  millMaxHolePlating: 'Issues with mill-max hole plating',
  extraneousMaterialOnBoard: 'Extraneous material on board',
  other: 'Other',
};


/// Function to better format geometry board visual inspection results for display
function formatInspectionResults(results) {
  // First, extract the entire list of possible issue keys (including both 'true' and 'false' ones) from the inspection results
  const allIssueKeys = Object.keys(results.visualInspectionIssues);

  // Filter the list to only include those keys which are 'true'
  let issueKeys = allIssueKeys.filter(function (issueKey) { return results.visualInspectionIssues[issueKey] });

  // Create a list of corresponding issue strings to the 'true' keys (using the [key, string] dictionary define above)
  let issueStrings = [];

  for (const issueKey of issueKeys) {
    issueStrings.push(issuesDictionary[issueKey]);
  }

  // If one of the issues is 'Other', we want to include the additional non-conformance information string
  // So replace the issue string with one that has the additional information appended
  const indexOfOther = issueStrings.indexOf('Other');

  if (indexOfOther >= 0) issueStrings[indexOfOther] = `Other (${results.additionalNonConformanceDescription})`;

  // Create a single string displaying all issue strings in one go (we may as well do this here since it's also part of the formatting)
  let fullIssuesString = '';

  for (const issue of issueStrings) {
    fullIssuesString += `[${issue}]  `;
  }

  // Create and return an overall object of the now-formatted results
  const formattedResults = {
    issues: fullIssuesString,
    repairsDescription: results.descriptionOfAnyRepairs,
  };

  return formattedResults;
}


/// Function to run for a successful search query by disposition
function postSuccess_disposition(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "5">The following geometry boards have been visually inspected and found to have the disposition: <b>${$('#dispositionSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "5">They are grouped by board part number, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, i.e. no geometry boards of any part number with the specified disposition, display a message to indicate this
  // Otherwise, set up a table of the search results, displaying any relevant and useful geometry board information
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no geometry boards with the specified disposition</b>');
  } else {
    for (const boardGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${boardGroup.componentUuids.length} boards of part number ${boardGroup.partNumber}  (${boardGroup.partString})</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `<b>Part Number: ${boardGroup.partNumber}  (${boardGroup.partString})</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '23%'>Board UUID</th>
          <th scope = 'col' width = '5%'>UKID</th>
          <th scope = 'col' width = '10%'>Order Number</th>
          <th scope = 'col' width = '15%'>Visual Inspection Record</th>
          <th scope = 'col' width = '25%'>Issue(s) Identified</th>
          <th scope = 'col' width = '22%'>Repairs Description (if applicable)</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.componentUuids) {
        const inspectionData = formatInspectionResults(boardGroup.inspectionData[i]);

        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.componentUuids[i]}</td>
            <td>${boardGroup.ukids[i]}</td>
            <td><a href = '/component/${boardGroup.batchUuids[i]}' target = '_blank'</a>${boardGroup.orderNumbers[i]}</td>
            <td><a href = '/action/${boardGroup.actionIds[i]}' target = '_blank'</a>${boardGroup.actionIds[i]}</td>
            <td>${inspectionData.issues}</td>
            <td>${inspectionData.repairsDescription}</td>
          </tr>`;


        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }
};


/// Function to run for a failed search query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it
  // Otherwise, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};
