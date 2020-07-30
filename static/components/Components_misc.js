
///
/// New defaults for the File schema.

Formio.Components.components.file.schema = function(...extend) {
    return Formio.Components.components.field.schema({
      type: 'file',
      label: 'Upload',
      key: 'file',
      image: false,
      privateDownload: false,
      imageSize: '200',
      filePattern: '*',
      fileMinSize: '0KB',
      fileMaxSize: '1GB',
      uploadOnly: false,
      storage:"url",
      url:"/file/gridfs",

    }, ...extend);
  };

// // new defaults
// var formio_default_component_schema_fn = Formio.Components.components.component.schema;
// Formio.Components.components.component.schema = function(...extend)
// {
//   return formio_default_component_schema_fn({
//     labelPosition:'left-right'
//   },...extend);
// }


Formio.prototype.deleteFile = function(fileinfo) {
  if(fileinfo.storage=="url" && fileinfo.url) {
    $.ajax({type: "DELETE",
            url: fileinfo.url,
            success: function(msg) { console.log("File deleted"); }
    });
  }
  console.log(fileinfo);
}

