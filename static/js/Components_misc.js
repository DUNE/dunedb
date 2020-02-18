
///
/// New defaults for the File schema.

Formio.Components.components.file.schema = function(...extend) {
    return {
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

    };
  };


Formio.prototype.deleteFile = function(fileinfo) {
  if(fileinfo.storage=="url" && fileinfo.url) {
    $.ajax({type: "DELETE",
            url: fileinfo.url,
            success: function(msg) { console.log("File deleted"); }
    });
  }
  console.log(fileinfo);
}
