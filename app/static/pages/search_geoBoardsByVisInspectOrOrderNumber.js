// Declare variables to hold the (initially empty) user-specified visual inspection disposition, issue and/or order number
let disposition = null;
let issue = '';
let orderNumber = null;


// Main function
$(function () {
  // When the selected disposition is changed, get the newly selected disposition from the corresponding page element
  // If the disposition is valid, perform the disposition search using the current values of the disposition details variables
  $('#dispositionSelection').on('change', async function () {
    disposition = $('#dispositionSelection').val();

    if (disposition) performDispositionSearch();
  });

  // When the selected issue is changed, get the newly selected issue if it has a value, or otherwise reset the string
  // Then perform the disposition search using the current values of the disposition details variables
  $('#issueSelection').on('change', async function () {
    if ($('#issueSelection').val()) {
      issue = $('#issueSelection').val();
    } else {
      issue = '';
    };

    performDispositionSearch();
  });

  // When the entered order number is changed and the 'Enter' key is pressed, get the newly entered order number from the corresponding page element
  // If the order number is valid, perform the appropriate jQuery 'ajax' call to make the search
  document.getElementById('orderNumberSelection').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      orderNumber = $('#orderNumberSelection').val();

      if (orderNumber) {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/search/geoBoardsByOrderNumber/${orderNumber}`,
          dataType: 'json',
          success: postSuccess_orderNumber,
        }).fail(postFail);
      }
    }
  });
});


// Function to perform the appropriate jQuery 'ajax' call to make the disposition search
function performDispositionSearch() {
  $.ajax({
    contentType: 'application/json',
    method: 'GET',
    url: `/json/search/geoBoardsByVisualInspection/${disposition}?issue=${issue}`,
    dataType: 'json',
    success: postSuccess_disposition,
  }).fail(postFail);
}


// Set up a dictionary containing the visual inspection issue [key, string] pairs (taken directly from the 'Visual Inspection' action type form)
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
  fiducialPin: 'Fiducial pin problem',
  other: 'Other',
};


// Function to better format geometry board visual inspection results for display
function formatInspectionResults(results) {
  // First, extract the entire list of possible issue keys (including both 'true' and 'false' ones) from the inspection results
  const allIssueKeys = Object.keys(results.visualInspectionIssues);

  // Filter the list to only include those keys which are 'true'
  let issueKeys = allIssueKeys.filter(function (issueKey) { return results.visualInspectionIssues[issueKey] });

  // Create a list of corresponding issue strings to the 'true' keys (using the issues dictionary defined above)
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

  // Create and return an overall object of the formatted results
  const formattedResults = {
    issues: fullIssuesString,
    repairsDescription: results.descriptionOfAnyRepairs,
  };

  return formattedResults;
}


// Function to run for a successful search query by disposition
function postSuccess_disposition(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "5">The following geometry boards have been visually inspected and found to have the disposition: <b>${$('#dispositionSelection option:selected').text()}</b> and the issue: <b>${$('#issueSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "5">They are grouped by board part number, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no geometry boards with the specified disposition and issue</b>');
  } else {
    for (const boardGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "5">Found ${boardGroup.componentUuids.length} boards of part number ${boardGroup.partNumber}  (${boardGroup.partString})</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan = "5"><b>Part Number: ${boardGroup.partNumber}  (${boardGroup.partString})</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '10%'>Board UKID</th>
          <th scope = 'col' width = '15%'>Part of Order</th>
          <th scope = 'col' width = '25%'>Visual Inspection Action</th>
          <th scope = 'col' width = '25%'>Issue(s) Identified:</th>
          <th scope = 'col' width = '25%'>Repairs Description (if applicable)</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.componentUuids) {
        const inspectionData = formatInspectionResults(boardGroup.inspectionData[i]);

        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
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


// Set up a dictionary containing the visual inspection disposition [key, string] pairs (taken directly from the 'Visual Inspection' action type form)
const dispositionsDictionary = {
  useAsIs: 'Use As Is',
  repair: 'Repair',
  return: 'Return',
  scrap: 'Scrap',
  toBeDetermined: 'To be determined',
  boardIsConformant: 'Board Is Conformant',
};


// Function to run for a successful search query by order number
function postSuccess_orderNumber(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "4">The following geometry boards with order number: <b>${$('#orderNumberSelection').val()}</b> and at least one recorded visual inspection have been found.</td>
    </tr>
    <tr>
      <td colspan = "4">They are grouped by visual inspection disposition, and then ordered by last DB record edit (most recent at the top).
    </tr>
    <tr>
      <td colspan = "4"><b>Please note that only boards which have had a visual inspection performed on them are displayed here - there may be additional boards with this order number that have not had inspections performed.</b>
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no geometry boards with the specified order number and at least one recorded visual inspection</b>');
  } else {
    for (const boardGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "4">Found ${boardGroup.actionIds.length} boards with visual inspection disposition: <b>${dispositionsDictionary[boardGroup.disposition]}</b></td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const boardGroup of result) {
      const groupTitle = `
        <tr>
          <td colspan = "4"><b>Disposition: ${dispositionsDictionary[boardGroup.disposition]}</b></td>
        </tr>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '25%'>Board UKID</th>
          <th scope = 'col' width = '25%'>Visual Inspection Action</th>
          <th scope = 'col' width = '25%'>Issue(s) Ddentified</th>
          <th scope = 'col' width = '25%'>Repairs Description (if applicable)</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in boardGroup.actionIds) {
        const inspectionData = formatInspectionResults(boardGroup.inspectionData[i]);

        const boardText = `
          <tr>
            <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
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


// Function to run for a failed search query of either scenario
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};
