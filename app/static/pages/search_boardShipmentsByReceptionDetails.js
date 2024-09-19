// Declare variables to hold the (initially empty) user-specified board shipment reception details
let shipmentStatus = '';
let originLocation = '';
let destinationLocation = '';
let earliestDate = '';
let latestDate = '';
let receptionComment = '';


// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // When the selected shipment status is changed, get the newly selected status
  $('#shipmentStatusSelection').on('change', async function () {
    shipmentStatus = $('#shipmentStatusSelection').val();
  });

  // When the selected origin location is changed, get the newly selected location if it has a value, or otherwise reset the string
  $('#originLocationSelection').on('change', async function () {
    if ($('#originLocationSelection').val()) {
      originLocation = $('#originLocationSelection').val();
    } else {
      originLocation = '';
    }
  });

  // When the selected destination location is changed, get the newly selected location if it has a value, or otherwise reset the string
  $('#destinationLocationSelection').on('change', async function () {
    if ($('#destinationLocationSelection').val()) {
      destinationLocation = $('#destinationLocationSelection').val();
    } else {
      destinationLocation = '';
    }
  });

  // Create a Formio form consisting of a date/time picker, and render it in the page element called 'earliestdateform'
  const earliestDateSchema = {
    components: [{
      type: 'datetime',
      key: 'earliestDate',
      hideLabel: true,
      input: true,
      enableTime: false,
    }],
  }

  const earliestDateForm = await Formio.createForm(document.getElementById('earliestdateform'), earliestDateSchema);

  // When the earliest reception date is changed, get the newly set date if it is valid and has a value, or otherwise reset the string
  // Note that the search library function expects only the 'date' part of the date/time string, so split and isolate it accordingly
  earliestDateForm.on('change', function () {
    if ((earliestDateForm.isValid()) && (earliestDateForm.submission.data.earliestDate)) {
      earliestDate = ((earliestDateForm.submission.data.earliestDate).split('T'))[0];
    } else {
      earliestDate = '';
    }
  });

  // Create a Formio form consisting of a date/time picker, and render it in the page element called 'latestdateform'
  const latestDateSchema = {
    components: [{
      type: 'datetime',
      key: 'latestDate',
      hideLabel: true,
      input: true,
      enableTime: false,
    }],
  }

  const latestDateForm = await Formio.createForm(document.getElementById('latestdateform'), latestDateSchema);

  // When the latest reception date is changed, get the newly set date if it is valid and has a value, or otherwise reset the string
  // Note that the search library function expects only the 'date' part of the date/time string, so split and isolate it accordingly
  latestDateForm.on('change', function () {
    if ((latestDateForm.isValid()) && (latestDateForm.submission.data.latestDate)) {
      latestDate = ((latestDateForm.submission.data.latestDate).split('T'))[0];
    } else {
      latestDate = '';
    }
  });

  // When the shipment reception comment is changed, get the newly indicated comment if it has a value, or otherwise reset the string
  $('#receptionCommentSelection').on('change', async function () {
    if ($('#receptionCommentSelection').val()) {
      receptionComment = $('#receptionCommentSelection').val();
    } else {
      receptionComment = '';
    }
  });

  // When the 'Perform Search' button is pressed, perform the search using the appropriate jQuery 'ajax' call and the current values of the reception details variables
  // Additionally, disable the 'Perform Search' button while the current search is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);

    if (shipmentStatus !== '') {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/boardShipmentsByReceptionDetails?shipmentStatus=${shipmentStatus}&originLocation=${originLocation}&destinationLocation=${destinationLocation}&earliestDate=${earliestDate}&latestDate=${latestDate}&receptionComment=${receptionComment}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  })
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "4">The following geometry board shipments have been found matching the specified search criteria.</td>
    </tr>
    <tr>
      <td colspan = "4"><br><hr></td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>Found no matching geometry board shipments</b>');
  } else {
    const resultsCount = `
      <tr>
        <td colspan = "3"><b>Found ${result.length} matching geometry board shipments</b></td>
      </tr>`;

    $('#results').append(resultsCount);
    $('#results').append('<br>');

    const tableStart = `
      <tr>
        <th scope = 'col' width = '18%'>Shipment UUID</th>
        <th scope = 'col' width = '7%'>Boards</th>
        <th scope = 'col' width = '9%'>Origin</th>
        <th scope = 'col' width = '9%'>Destination</th>
        <th scope = 'col' width = '9%'>Creation Date</th>
        <th scope = 'col' width = '9%'>Reception Date</th>
        <th scope = 'col' width = '27%'>Shipment Reception Comment</th>
        <th scope = 'col' width = '12%'>Search Comment</th>
      </tr>`;

    $('#results').append(tableStart);

    for (const shipment of result) {
      let actionIdLinkLine = `<td>${shipment.receptionDate}</td>`;

      if (shipment.receptionDate !== '(none)') actionIdLinkLine = `<td><a href = '/action/${shipment.receptionActionId}' target = '_blank'</a>${shipment.receptionDate}</td>`;

      const boardText = `
        <tr>
          <td><a href = '/component/${shipment.uuid}' target = '_blank'</a>${shipment.uuid}</td>
          <td>${shipment.numberOfBoards}</td>
          <td>${dictionary_locations[shipment.origin]}</td>
          <td>${dictionary_locations[shipment.destination]}</td>
          <td>${shipment.creationDate}</td>
          ${actionIdLinkLine}
          <td>${shipment.receptionComment}</td>
          <td>${shipment.searchComment}</td>
        </tr>`;

      $('#results').append(boardText);
    }
  }

  // Re-enable the 'Perform Search' button for the next search
  $('#confirmButton').prop('disabled', false);
};


// Function to run for a failed search query
function postFail(result, statusCode, statusMsg) {
  // If the query result contains a response message, display it, and if not, display any status message and error code instead
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }

  // Re-enable the 'Perform Search' button for the next search
  $('#confirmButton').prop('disabled', false);
};
