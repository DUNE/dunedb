// Get the job's type form, and populate it with the job's actual submission
// Then disable the submission button (since the form is only to be displayed, not used)
window.addEventListener('load', populateForm);

async function populateForm()
{
  form = await Formio.createForm(document.getElementById('builtform'), form.schema, {readOnly: true});
  form.submission = job;
  form.nosubmit = true;
};
