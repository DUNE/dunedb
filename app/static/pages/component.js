// Get the component's type form, and populate it with the component's actual submission
// Then disable the submission button (since the form is only to be displayed, not used)
window.addEventListener('load', populateForm);

async function populateForm()
{
  form = await Formio.createForm(document.getElementById('builtform'), form.schema, {readOnly: true});
  form.submission = component;
  form.nosubmit = true;
};

// When the 'Copy UUID' button is pressed, perform the copy to clipboard, and then change the button appearance to confirm
function CopyConfirm(componentUUID)
{
  var copyhelper = document.createElement("input");
  copyhelper.className = 'copyhelper'
  
  document.body.appendChild(copyhelper);
  
  copyhelper.value = componentUUID;
  copyhelper.select();
  
  document.execCommand('copy');
  document.body.removeChild(copyhelper);
  document.getElementById("copyButton").innerHTML = "Copied";
  document.getElementById("copyButton").style.backgroundColor = "green";
};

// When the 'Download List of Links' button is pressed, write a list of QR code links to a file and then download the file
function DownloadLinks(shortUuids)
{
  var links = "";
  
  for (shortUuid of shortUuids) {
    link = base_url + '/c/' + shortUuid + '\n';
    links = links.concat(link);
  }
  
  var links_save_url = window.URL.createObjectURL(new Blob([links], {type: "text/plain"}));
  
  $('#download_links').attr('href', links_save_url);
};