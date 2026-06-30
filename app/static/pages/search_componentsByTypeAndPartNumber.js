// Declare variables to hold the user-specified search parameters
let componentType = null;
let boardPartNumber = null;
let meshPartNumber = null;
let componentPartString = null;
let acceptanceStatus = 'any';
let toothStripStatus = 'any';

// Run a specific function when the page is loaded
window.addEventListener('load', renderSearchForms);


// Function to run when the page is loaded
async function renderSearchForms() {
  // Get and set the value of any search parameter that is changed
  $('#typeSelection').on('change', async function () {
    componentType = $('#typeSelection').val();
  });

  $('#boardPartNumberSelection').on('change', async function () {
    boardPartNumber = $('#boardPartNumberSelection').val();
  });

  $('#meshPartNumberSelection').on('change', async function () {
    meshPartNumber = $('#meshPartNumberSelection').val();
  });

  $('#acceptanceStatusSelection').on('change', async function () {
    acceptanceStatus = $('#acceptanceStatusSelection').val();
  });

  $('#toothStripStatusSelection').on('change', async function () {
    toothStripStatus = $('#toothStripStatusSelection').val();
  });

  // When the confirmation button is pressed, perform the search using the appropriate jQuery 'ajax' call and the current values of the search parameters
  // Additionally, disable the button while the current search is being performed
  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);
    $('#summary1').empty().append('<b>Working ...</b>');
    $('#summary2').empty();
    $('#summary3').empty();
    $('#results1').empty();
    $('#results2').empty();
    $('#results3').empty();

    let componentPartNumber = null;

    if (componentType) {
      if (componentType === 'GeometryBoard' && boardPartNumber) {
        componentPartNumber = boardPartNumber;
        componentPartString = $('#boardPartNumberSelection option:selected').text();
      } else if (componentType === 'GroundingMeshPanel' && meshPartNumber) {
        componentPartNumber = meshPartNumber;
        componentPartString = $('#meshPartNumberSelection option:selected').text();
      }

      if (componentPartNumber) {
        $.ajax({
          contentType: 'application/json',
          method: 'GET',
          url: `/json/search/componentsByTypeAndPartNumber/${componentType}/${componentPartNumber}/${acceptanceStatus}/${toothStripStatus}`,
          dataType: 'json',
          success: postSuccess,
        }).fail(postFail);
      }
    }
  });
}


// Function to run for a successful search query
function postSuccess(result) {
  // Make sure that the page elements where the results will be displayed are all empty
  $('#summary1').empty();
  $('#summary2').empty();
  $('#summary3').empty();
  $('#results1').empty();
  $('#results2').empty();
  $('#results3').empty();

  // If there are no search results, display a message to indicate this
  // Otherwise, set up an initial message to display (dependent on the selected component type), and a table of the search results (with the layout being specific to the selected component type)
  if (Object.keys(result).length === 0) {
    $('#summary1').append('<b>There are no components of this part number and with the specified optional filters at any location</b>');
  } else {
    if ($('#typeSelection option:selected').val() === 'GeometryBoard') {
      for (const boardGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.location]}</b> - ${boardGroup.componentUuids.length} boards</td>
          </tr>`;

        $('#summary1').append(groupCount);
      }

      $('#summary1').append('<br>');

      for (const boardGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.location]}</b> - ${boardGroup.componentUuids.length} boards</td>
          </tr>`;

        $('#summary2').append(groupCount);
      }

      $('#summary2').append('<br>');

      for (const boardGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.location]}</b> - ${boardGroup.componentUuids.length} boards</td>
          </tr>`;

        $('#summary3').append(groupCount);
      }

      $('#summary3').append('<br>');

      const tableStart_accepted = `
        <tr>
          <th style = 'width: 23%'>UKID</th>
          <th style = 'width: 42%'>Date at Location</th>
          <th style = 'width: 35%'>Installed on APA</th>
        </tr>`;

      const tableStart_rejected = `
        <tr>
          <th style = 'width: 23%'>UKID</th>
          <th style = 'width: 42%'>Date at Location</th>
          <th style = 'width: 35%'>Rejection info</th>
        </tr>`;

      for (const boardGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.location]}</b></td>
          </tr>`;

        $('#results1').append(groupTitle);

        if (boardGroup.location === 'rejected') {
          $('#results1').append(tableStart_rejected);
        } else {
          $('#results1').append(tableStart_accepted);
        }

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.datesAtLocation[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results1').append(boardText);
        }

        $('#results1').append('<br>');
      }

      for (const boardGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.location]}</b></td>
          </tr>`;

        $('#results2').append(groupTitle);

        if (boardGroup.location === 'rejected') {
          $('#results2').append(tableStart_rejected);
        } else {
          $('#results2').append(tableStart_accepted);
        }

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.datesAtLocation[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results2').append(boardText);
        }

        $('#results2').append('<br>');
      }

      for (const boardGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[boardGroup.location]}</b></td>
          </tr>`;

        $('#results3').append(groupTitle);

        if (boardGroup.location === 'rejected') {
          $('#results3').append(tableStart_rejected);
        } else {
          $('#results3').append(tableStart_accepted);
        }

        for (const i in boardGroup.componentUuids) {
          const boardText = `
            <tr>
              <td><a href = '/component/${boardGroup.componentUuids[i]}' target = '_blank'</a>${boardGroup.ukids[i]}</td>
              <td>${boardGroup.datesAtLocation[i]}</td>
              <td>${boardGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results3').append(boardText);
        }

        $('#results3').append('<br>');
      }
    } else if ($('#typeSelection option:selected').val() === 'GroundingMeshPanel') {
      for (const meshGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.location]}</b> - ${meshGroup.componentUuids.length} mesh panels</td>
          </tr>`;

        $('#summary1').append(groupCount);
      }

      $('#summary1').append('<br>');

      for (const meshGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.location]}</b> - ${meshGroup.componentUuids.length} mesh panels</td>
          </tr>`;

        $('#summary2').append(groupCount);
      }

      $('#summary2').append('<br>');

      for (const meshGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupCount = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.location]}</b> - ${meshGroup.componentUuids.length} mesh panels</td>
          </tr>`;

        $('#summary3').append(groupCount);
      }

      $('#summary3').append('<br>');

      const tableStart = `
        <tr>
          <th style = 'width: 23%'>UKID</th>
          <th style = 'width: 42%'>Date at Location</th>
          <th style = 'width: 35%'>Installed on APA</th>
        </tr>`;

      for (const meshGroup of result.slice(0, (result.length / 3) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.location]}</b></td>
          </tr>`;

        $('#results1').append(groupTitle);
        $('#results1').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.datesAtLocation[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results1').append(meshText);
        }

        $('#results1').append('<br>');
      }

      for (const meshGroup of result.slice((result.length / 3) + 1, (2 * (result.length / 3)) + 1)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.location]}</b></td>
          </tr>`;

        $('#results2').append(groupTitle);
        $('#results2').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.datesAtLocation[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results2').append(meshText);
        }

        $('#results2').append('<br>');
      }

      for (const meshGroup of result.slice((2 * (result.length / 3)) + 1, result.length)) {
        const groupTitle = `
          <tr>
            <td colspan = "3"><b>Location: ${dictionary_locations[meshGroup.location]}</b></td>
          </tr>`;

        $('#results3').append(groupTitle);
        $('#results3').append(tableStart);

        for (const i in meshGroup.componentUuids) {
          const meshText = `
            <tr>
              <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.dunePids[i].split('-')[1]}</td>
              <td>${meshGroup.datesAtLocation[i]}</td>
              <td>${meshGroup.installedOnAPA[i]}</td>
            </tr>`;

          $('#results3').append(meshText);
        }

        $('#results3').append('<br>');
      }
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
