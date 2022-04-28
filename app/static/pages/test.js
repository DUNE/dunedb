// Get the test's type form, and populate it with the test's actual submission
// Then disable the submission button (since the form is only to be displayed, not used)
window.addEventListener('load', populateForm);

async function populateForm()
{
  form = await Formio.createForm(document.getElementById('builtform'), form.schema, {readOnly: true});
  form.submission = test;
  form.nosubmit = true;
}

// For 'Wire Tension' type tests, build an additional section of the page for querying a single tension value
function GetWireTension()
{
  var layer = document.getElementById("wireLayer").value;
  var side = document.getElementById("apaSide").value;
  var number = document.getElementById("wireNumber").value;
  
  var keyName = `wires.${layer}.${side}[${number}]`;
  document.getElementById("tensionKey").value = keyName;
  
  var tension = test.data.wires[layer][side][number];
  document.getElementById("wireTension").value = tension;
};
