
var record;
var easyMDE;
var docId;

function myImageUpload(inFile,onSuccess,onError) {

  if(!inFile.type) {return onError("No file type can be verified")};
  if(!inFile.type.startsWith('image/')) { return onError("File type is not image/*")};
  var suffix = inFile.name.split('.').pop();
  var formData  = new FormData();
  console.log('infile',inFile);
  formData.append('image',inFile);
  $.ajax({
    url:'/file/gridfs',
    type: 'POST',
    processData: false,
    contentType: false,
    data: formData,
    })
    .done((data)=>{
      onSuccess(data.url+"."+suffix);
    })
    .fail((a,b,c)=>{
      onError(b);
    });
}
$(async function(){
  docId = window.location.pathname.match(/.*\/(.*)\/edit$/)[1];
  console.log("docId",docId)
  easyMDE = new EasyMDE({element: document.getElementById('markdowneditor'),
                         maxHeight:"450px",
                         uploadImage: true,
                         imageUploadFunction: myImageUpload,
                         });
  record = null;

  function update() {
    $('#docId').text(docId);
    easyMDE.value(record.data);
    if(record.insertion)
      $('#last_edited').text(`${record.insertion.user.displayName} on ${record.insertion.insertDate}`)
    if(record.validity)
      $('#version').text(`${record.validity.version}`);
  }



  record = await $.get("/json/doc/"+docId+"?orDefault=true");
  console.log("rec",record)
  update(easyMDE,record) 

  async function saveDoc(){
    record = record || {};
    record.docId = docId;
    record.data = easyMDE.value();
    delete record.validity;
    console.log("submitting",record);
    record = await $.post("/json/doc/"+docId,record)
                    .fail(function(a1,a2,a3) {
                      console.log('fail',a1,a2,a3)
                      $('#error').text('error');
                    })
    update(easyMDE,record)
  }

  $(".save").on("click",saveDoc);
})
