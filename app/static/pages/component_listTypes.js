// When the user enters a new type form ID and presses the 'Create' button, redirect them to the page for creating the new type form
document.getElementById('NewTypeButton').addEventListener('click', function () {
  window.location.href = `/componentTypes/${document.getElementById('formId').value}/new`;
});

// When the user enters a new type form ID and presses the 'Enter' key, redirect them to the page for creating the new type form
document.getElementById('formId').addEventListener('keyup', function (e) {
  if (e.key === 'Enter') window.location.href = `/componentTypes/${this.value}/new`;
});
