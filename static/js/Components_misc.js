
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
      url:"/savefile",

    };
  };
