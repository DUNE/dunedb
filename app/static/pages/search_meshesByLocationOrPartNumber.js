// Declare variables to hold the (initially empty) user-specified mesh location and/or part number
let location = null;
let partNumber = null;


// Main function
$(function () {
  // When the selected location is changed, get the newly selected location from the corresponding page element
  // If the location is valid, perform the appropriate jQuery 'ajax' call to make the search
  $('#locationSelection').on('change', async function () {
    location = $('#locationSelection').val();

    if (location) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/meshesByLocation/${location}`,
        dataType: 'json',
        success: postSuccess_location,
      }).fail(postFail);
    }
  });

  // When the selected mesh part number is changed, get the newly selected part number from the corresponding page element
  // If the part number is valid, perform the appropriate jQuery 'ajax' call to make the search
  $('#partNumberSelection').on('change', async function () {
    partNumber = $('#partNumberSelection').val();

    if (partNumber) {
      $.ajax({
        contentType: 'application/json',
        method: 'GET',
        url: `/json/search/meshesByPartNumber/${partNumber}`,
        dataType: 'json',
        success: postSuccess_partNumber,
      }).fail(postFail);
    }
  });
});



// Set up a dictionary containing the grounding mesh panel part number [key, string] pairs (taken directly from the 'Grounding Mesh Panel' component type form)
const partNumbersDictionary = {
  mesh29410560HeadEndLH: '294-10560 HEAD END - L/H',
  mesh29410561HeadEndRH: '294-10561 HEAD END - R/H',
  mesh29410562FootEndRH: '294-10562 FOOT END - R/H',
  mesh29410563FootEndLH: '294-10563 FOOT END - L/H',
  mesh29410564Centre: '294-10564 CENTRE',
};


// Function to run for a successful search query by location
function postSuccess_location(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following grounding mesh panels are at <b>${$('#locationSelection option:selected').text()}</b>.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by part number, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>There are no grounding mesh panels at the specified location</b>');
  } else {
    for (const meshGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${meshGroup.componentUuids.length} meshes with part number ${partNumbersDictionary[meshGroup.partNumber]}</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const meshGroup of result) {
      const groupTitle = `<b>Part Number: ${partNumbersDictionary[meshGroup.partNumber]}</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' width = '35%'>Mesh UUID</th>
          <th scope = 'col' width = '30%'>DUNE PID</th>
          <th scope = 'col' width = '20%'>Arrived On:</th>
          <th scope = 'col' width = '15%'>On APA:</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in meshGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.componentUuids[i]}</td>
            <td>${meshGroup.dunePids[i]}</td>
            <td>${meshGroup.receptionDates[i]}</td>
            <td>${meshGroup.installedOnAPA[i]}</td>
          </tr>`;

        $('#results').append(boardText);
      }

      $('#results').append('<br>');
    }
  }
};


// Function to run for a successful search query by part number
function postSuccess_partNumber(result) {
  // Make sure that the page element where the results will be displayed is empty, and then enter an initial message to display
  $('#results').empty();

  const resultsStart = `
    <tr>
      <td colspan = "3">The following grounding mesh panels with part number <b>${$('#partNumberSelection option:selected').text()}</b> have been received.</td>
    </tr>
    <tr>
      <td colspan = "3">They are grouped by location, and then ordered by last DB record edit (most recent at the top).
        <br>
        <hr>
      </td>
    </tr>`;

  $('#results').append(resultsStart);

  // If there are no search results, display a message to indicate this, but otherwise set up a table of the search results
  if (Object.keys(result).length === 0) {
    $('#results').append('<b>No grounding mesh panels of the given part number are at any location</b>');
  } else {
    for (const meshGroup of result) {
      const groupCount = `
        <tr>
          <td colspan = "3">Found ${meshGroup.componentUuids.length} meshes at ${dictionary_locations[meshGroup.receptionLocation]}</td>
        </tr>`;

      $('#results').append(groupCount);
    }

    $('#results').append('<br>');

    for (const meshGroup of result) {
      const groupTitle = `<b>Location: ${dictionary_locations[meshGroup.receptionLocation]}</b>`;

      $('#results').append(groupTitle);

      const tableStart = `
        <tr>
          <th scope = 'col' style = 'width: 35%'>Mesh UUID</th>
          <th scope = 'col' style = 'width: 30%'>DUNE PID:</th>
          <th scope = 'col' style = 'width: 20%'>Arrived On:</th>
          <th scope = 'col' style = 'width: 15%'>On APA:</th>
        </tr>`;

      $('#results').append(tableStart);

      for (const i in meshGroup.componentUuids) {
        const boardText = `
          <tr>
            <td><a href = '/component/${meshGroup.componentUuids[i]}' target = '_blank'</a>${meshGroup.componentUuids[i]}</td>
            <td>${meshGroup.dunePids[i]}</td>
            <td>${meshGroup.receptionDates[i]}</td>
            <td>${boardGroup.installedOnAPA[i]}</td>
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
