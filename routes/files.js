
const express = require('express');
const permissions = require('../permissions.js');
const config = require('../configuration.js');
const mongo = require('mongodb');
const Busboy = require('busboy');

/// submit file data0

var router = express.Router();


module.exports = router;
// These routes are obsolete, but leaving them here for future reference.


// Save files to disk:
var file_upload_middleware = require('express-fileupload')();
router.post("/disk",permissions.checkPermission("tests:view"),file_upload_middleware,async function(req, res,next){
    console.log('/disk',req.files);
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    for(var key in req.files) {
      var fileinfo = req.files[key];
      var outfile = __dirname+"/files/"+fileinfo.name; // Fixme better sorting, collisions
      fileinfo.mv(outfile,function(err){
        if (err) return res.status(500).send(err);

         res.json({
          url: config.my_url+'/disk/'+fileinfo.name,
          name: fileinfo.name,
          size: fileinfo.size
         });
      });

    }
})

// /// file retrieval
router.use('/disk',express.static(__dirname+"/files"));




router.post("/gridfs",permissions.checkPermission("tests:submit"),
  async function(req, res,next){
    console.log("/file/gridfs");
    var bucket = new mongo.GridFSBucket(db);


    // looking at https://github.com/richardgirges/express-fileupload/blob/master/lib/processMultipart.js
    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
      file.pipe(bucket.openUploadStream(filename,{contentType:mimetype}))
      .on('error',function(err) {
            return res.status(500).json({error:"bucket.pipe: "+err});
            })
          .on('finish',function(gridfs_record){
            console.log("upload to mongo finished");
            console.dir(gridfs_record);
            var url = config.my_url + req.baseUrl;
            if (url.substr(-1) != '/') url += '/'; // ensure trailing slash
            url+="gridfs/";
            var response = {
              url: url+gridfs_record._id.toString(),
             name: gridfs_record._id.toString(),
             size: gridfs_record.length
            };
            console.log("responding to uploader with:",response);
            res.json(response);
          });
      // file.on('data', function(data) {
      //   console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
      // });
      file.on('end', function() {
        console.log('File [' + fieldname + '] Finished');
      });
    });
    // busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
    //   console.log('Field [' + fieldname + ']: value: ' + inspect(val));
    // });
    // busboy.on('finish', function() {
    //   console.log('Done parsing form!');
    //   res.writeHead(303, { Connection: 'close', Location: '/' });
    //   res.end();
    // });
    req.pipe(busboy);
  });


// Retrieve a file.
router.get('/gridfs/:objectid', function(req,res,next){
  const bucket = new mongo.GridFSBucket(db);
  bucket.openDownloadStream(mongo.ObjectID(req.params.objectid))
  .on('file',function(obj){
      res.set('Content-Disposition', `attachment; filename=${obj.filename}`);
      if(obj.contentType)      res.set('Content-Type', obj.contentType);
      else                     res.set('Content-Type', 'application/octet-stream');
    console.log("gridfs found file",obj);
  })
  .pipe(res);

});

// delete a file, 
// called when user pushes the 'x' button next to a falsely-uploaded file.
router.delete('/gridfs/:objectid', permissions.checkPermission("tests:submit"), async function(req,res,next){
  console.log("deleting",req.params.objectid);
  const bucket = new mongo.GridFSBucket(db);
  try {
    await bucket.delete(mongo.ObjectID(req.params.objectid));
    return res.status(200);
  } catch(err) {
    console.error(err);
    return res.status(400).json({"error":err})
  }

});





