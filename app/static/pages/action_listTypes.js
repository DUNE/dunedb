// When the user enters a new type form ID and presses the 'Create' button, redirect them to the page for creating the new type form
$('button.NewTypeButton').click(function () {
  window.location.href = '/actionTypes/' + $('button.NewTypeButton').parents('.modal-content').find('input').val() + '/new';
})

// When the user enters a new type form ID and presses the 'Enter' key, redirect them to the page for creating the new type form
$('input').on("keyup", function (e) {
  if (e.key === "Enter") {
    window.location.href = '/actionTypes/' + $(this).val() + '/new';
  }
})
