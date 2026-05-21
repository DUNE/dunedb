let inputString = null;

window.addEventListener('load', renderInputForm);


async function renderInputForm() {
  $('#inputStringSelection').on('change', async function () {
    inputString = $('#inputStringSelection').val();
  });

  $('#confirmButton').on('click', function () {
    $('#confirmButton').prop('disabled', true);
    $('#messages').empty();
    $('#messages').append('<b>Working ... once complete, you will be automatically redirected to an appropriate interface page</b>');

    if (inputString) {
      $.ajax({
        contentType: 'application/json',
        method: 'POST',
        url: `/json/administratorUtility/${inputString}`,
        dataType: 'json',
        success: postSuccess,
      }).fail(postFail);
    }
  })
}


function postSuccess(result) {    // Change as appropriate for the required utility
  window.location.href = `/componentTypes/list`;
}


function postFail(result, statusCode, statusMsg) {
  if (result.responseText) {
    console.log('POSTFAIL: ', result.responseText);
  } else {
    console.log('POSTFAIL: ', `${statusMsg} (${statusCode})`);
  }
};