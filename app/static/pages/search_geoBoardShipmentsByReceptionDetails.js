// Declare variables to hold the (initially empty) user-specified geometry board shipment reception details
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

  // Get and set the value of any search parameter that is changed
  // If an optional parameter is changed to have no value, just reset the string
  $('#shipmentStatusSelection').on('change', async function () {
    shipmentStatus = $('#shipmentStatusSelection').val();
  });

  $('#originLocationSelection').on('change', async function () {
    if ($('#originLocationSelection').val()) {
      originLocation = $('#originLocationSelection').val();
    } else {
      originLocation = '';
    }
  });

  $('#destinationLocationSelection').on('change', async function () {
    if ($('#destinationLocationSelection').val()) {
      destinationLocation = $('#destinationLocationSelection').val();
    } else {
      destinationLocation = '';
    }
  });

  earliestDateForm.on('change', function () {
    if ((earliestDateForm.isValid()) && (earliestDateForm.submission.data.earliestDate)) {
      earliestDate = ((earliestDateForm.submission.data.earliestDate).split('T'))[0];
    } else {
      earliestDate = '';
    }
  });

  latestDateForm.on('change', function () {
    if ((latestDateForm.isValid()) && (latestDateForm.submission.data.latestDate)) {
      latestDate = ((latestDateForm.submission.data.latestDate).split('T'))[0];
    } else {
      latestDate = '';
    }
  });

  $('#receptionCommentSelection').on('change', async function () {
    if ($('#receptionCommentSelection').val()) {
      receptionComment = $('#receptionCommentSelection').val();
    } else {
      receptionComment = '';
    }
  });

  // When the confirmation button is pressed, perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable the button while the current search is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);
    $('#summary1').empty().append('<b>Working ...</b>');
    $('#results1').empty();

    if (shipmentStatus !== '') {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/geoBoardShipmentsByReceptionDetails?shipmentStatus=${shipmentStatus}&originLocation=${originLocation}&destinationLocation=${destinationLocation}&earliestDate=${earliestDate}&latestDate=${latestDate}&receptionComment=${receptionComment}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  })
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page elements where the results will be displayed are all empty
  $('#summary1').empty();
  $('#results1').empty();

  // If there are no search results, display a message to indicate this
  // Otherwise, set up an initial message to display, and a table of the search results
  if (Object.keys(result).length === 0) {
    $('#summary1').append('<b>There are no geometry board shipments matching the specified parameters</b>');
  } else {
    const resultsCount = `
      <tr>
        <td colspan = "7"><b>Found ${result.length} matching geometry board shipments</b>
          <br>
          <hr>
        </td>
      </tr>`;

    $('#summary1').append(resultsCount);

    const tableStart = `
      <tr>
        <th style = 'width: 8%'>Shipment</th>
        <th style = 'width: 12%'>Origin</th>
        <th style = 'width: 12%'>Destination</th>
        <th style = 'width: 12%'>Creation Date</th>
        <th style = 'width: 12%'>Reception Date</th>
        <th style = 'width: 25%'>Shipment Reception Comment</th>
        <th style = 'width: 19%'>Search Comment</th>
      </tr>`;

    $('#results1').append(tableStart);

    for (const shipment of result) {
      let actionIdLinkLine = `<td>${shipment.receptionDate}</td>`;

      if (shipment.receptionDate !== '[n.a.]') actionIdLinkLine = `<td><a href = '/action/${shipment.receptionActionId}' target = '_blank'</a>${shipment.receptionDate}</td>`;

      const boardText = `
        <tr>
          <td><a href = '/component/${shipment.uuid}' target = '_blank'</a>${shipment.numberOfBoards} Boards</td>
          <td>${dictionary_locations[shipment.origin]}</td>
          <td>${dictionary_locations[shipment.destination]}</td>
          <td>${shipment.creationDate}</td>
          ${actionIdLinkLine}
          <td>${shipment.receptionComment}</td>
          <td>${shipment.searchComment}</td>
        </tr>`;

      $('#results1').append(boardText);
    }
  }

  // Re-enable the confirmation button for the next search
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

  // Re-enable the confirmation button for the next search
  $('#confirmButton').prop('disabled', false);
};
