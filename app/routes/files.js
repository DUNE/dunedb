"use strict";

const express = require('express');
const permissions = require('lib/permissions.js');
const mongo = require('mongodb');
const Busboy = require('busboy');
const moment = require('moment');
// const { db } = require('./db'); // Exports global 'db' variable
let sharp = require('sharp'); // image resizing library and crap
const { BASE_URL } = require('../lib/constants');
const logger = require('../lib/logger');
/// submit file data0

var router = express.Router();


module.exports = router;
// These routes are obsolete, but leaving them here for future reference.


// // Save files to disk.
// // Could be used instead of mongo if we want local file access.
// var file_upload_middleware = require('express-fileupload')();
// router.post("/disk",permissions.checkPermission("tests:view"),file_upload_middleware,async function(req, res,next){
//     logger.info('/disk',req.files);
//     if (!req.files || Object.keys(req.files).length === 0) {
//       return res.status(400).send('No files were uploaded.');
//     }

//     for(var key in req.files) {
//       var fileinfo = req.files[key];
//       var outfile = __dirname+"/files/"+fileinfo.name; // Fixme better sorting, collisions
//       fileinfo.mv(outfile,function(err){
//         if (err) return res.status(500).send(err);

//          res.json({
//           url: BASE_URL+'/disk/'+fileinfo.name,
//           name: fileinfo.name,
//           size: fileinfo.size
//          });
//       });

//     }
// });

// // /// file retrieval
// router.use('/disk',express.static(__dirname+"/files"));


//https://stackoverflow.com/questions/10623798/how-do-i-read-the-contents-of-a-node-js-stream-into-a-string-variable
function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  });
}


// save a file sent as a base64 string.
// ?filename=blah will set filename to blah.png
router.post("/gridfsBase64",permissions.checkPermission("tests:submit"),
  async function(req, res,next){
    try{
      logger.info("/file/gridfsBase64 data");
   
      // This version uses the bodyParser to get a JSON string. But it intrerpreter limits, 
      // and is usless overhead anyay.
      //   if(req.body.dataURI) {
      //     dataURI = req.body.dataURI;


      // the data will come in via req which is a readable stream.
      var dataURI = await streamToString(req);
    
      if (!/data:image\//.test(dataURI)) {
        logger.info('ImageDataURI :: Error :: It seems that it is not an Image Data URI. Couldn\'t match "data:image\/"');
        return null;
      }

      let regExMatches = dataURI.match('data:image/(.*);base64,(.*)');
      var imageType= regExMatches[1]; // eg '.png'

      var dataBuffer= Buffer.from(regExMatches[2], 'base64');
      var filename = req.query.filename || 'datauri_'+(new Date()).toISOString();
      filename = filename+imageType;

      // We can save the buffer to file to test this;
      // const fs = require('fs');
      // fs.writeFile('filename',dataBuffer,(err) => {
      //   if (err) throw err; logger.info('The file has been saved!'); });

      var bucket = new mongo.GridFSBucket(db);
      bucket.openUploadStream(filename,{contentType:"image/"+imageType})
        .on('finish',function(gridfs_record){
            logger.info("upload to mongo finished");
            logger.info(gridfs_record);
            var url = BASE_URL + req.baseUrl;
            if (url.substr(-1) != '/') url += '/'; // ensure trailing slash
            url+="gridfs/";
            var response = {
              url: url+gridfs_record._id.toString(),
             name: gridfs_record._id.toString(),
             size: gridfs_record.length
            };
            logger.info("responding to uploader with:",response);
            res.json(response);
          })
        .end(dataBuffer);

    } catch(err) {
      logger.error(err);
      res.status(400).json({error:err});
    }

});


// Save a file.

router.post("/gridfs",permissions.checkPermission("tests:submit"),
  async function(req, res,next){
    logger.info("/file/gridfs");
    var bucket = new mongo.GridFSBucket(db);


    // looking at https://github.com/richardgirges/express-fileupload/blob/master/lib/processMultipart.js
    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      logger.info('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
      file.pipe(bucket.openUploadStream(filename,{contentType:mimetype||"application/octet-stream"}))
      .on('error',function(err) {
            return res.status(500).json({error:"bucket.pipe: "+err});
            })
          .on('finish',function(gridfs_record){
            logger.info("upload to mongo finished");
            logger.info(gridfs_record);
            var url = BASE_URL + req.baseUrl;
            if (url.substr(-1) != '/') url += '/'; // ensure trailing slash
            url+="gridfs/";
            var response = {
              url: url+gridfs_record._id.toString(),
             name: gridfs_record._id.toString(),
             size: gridfs_record.length
            };
            logger.info("responding to uploader with:",response);
            res.json(response);
          });
      // file.on('data', function(data) {
      //   logger.info('File [' + fieldname + '] got ' + data.length + ' bytes');
      // });
      file.on('end', function() {
        logger.info('File [' + fieldname + '] Finished');
      });
    });
    // busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
    //   logger.info('Field [' + fieldname + ']: value: ' + inspect(val));
    // });
    // busboy.on('finish', function() {
    //   logger.info('Done parsing form!');
    //   res.writeHead(303, { Connection: 'close', Location: '/' });
    //   res.end();
    // });
    req.pipe(busboy);
  });

// Retrieve a file.
// GET /file/gridfs/<objectid>.suffix
// where objectid is a mongo 24-char hex lookup
// and .suffix is current ignored if present.
router.get('/gridfs/:objectid([a-f0-9]{24})(\.)?:suffix?', function(req,res,next){

  if(req.query.resize) return get_and_resize(req,res,next);
  try {
    db.collection('fileActivity').updateOne({_id:req.params.objectid},
                                        {$set: {last_retrieval: new Date()}},
                                        {upsert:true});

    const bucket = new mongo.GridFSBucket(db);
    bucket.openDownloadStream(mongo.ObjectID(req.params.objectid))
    .on('file',function(obj){
        // res.set('Content-Disposition', `attachment; filename=${obj.filename}`);
        if(obj.contentType)      res.set('Content-Type', obj.contentType);
        else                     res.set('Content-Type', 'application/octet-stream');
        res.set('Cache-Control','public, max-age=604800, immutable'); // Because we're using a unique ObjectiD as the key, URL is guarenteed unique. Always cache.
        logger.info("gridfs found file",obj);
    })
    .on('error',function(err){
      logger.error("Error retrieving file /gridfs/"+req.params.objectid);
      logger.error(err);
      res.status(400).json({error:err})

    })
    .pipe(res);
  } catch(err) {
    res.status(400).json({error:err})
  }
});

// get and resize image/
function get_and_resize(req,res,next)
{
  try{
    logger.info("resizing output image");
    var transformer = sharp()
                        .resize(parseInt(req.query.resize))
                        .on('info',logger.info);

    db.collection('fileActivity').updateOne({_id:req.params.objectid},
                                        {$set: {last_retrieval: new Date()}},
                                        {upsert:true});

 
    const bucket = new mongo.GridFSBucket(db);
    bucket.openDownloadStream(mongo.ObjectID(req.params.objectid))
      .on('file',function(obj){
          if(obj.contentType)      res.set('Content-Type', obj.contentType);
          else                     res.set('Content-Type', 'application/octet-stream');
          res.set('Cache-Control','public, max-age=604800, immutable'); // Because we're using a unique ObjectiD as the key, URL is guarenteed unique. Always cache.
          logger.info("gridfs found file",obj);
      })
      .on('error',function(err){
        logger.error("Error retrieving file /gridfs/"+req.params.objectid);
        logger.error(err);
        res.status(400).json({error:err})

      })
      .pipe(transformer)
      .pipe(res);
  } catch(err) {
    res.status(400).json({error:err})
  }

}

// delete a file, 
// called when user pushes the 'x' button next to a falsely-uploaded file.
// router.delete('/gridfs/:objectid', permissions.checkPermission("tests:submit"), async function(req,res,next){
//   logger.info("deleting",req.params.objectid);
//   const bucket = new mongo.GridFSBucket(db);
//   try {
//     await bucket.delete(mongo.ObjectID(req.params.objectid));
//     return res.status(200);
//   } catch(err) {
//     logger.error(err);
//     return res.status(400).json({"error":err})
//   }

// });

// Instead of the above, mark a file for possible deletion
router.delete('/gridfs/:objectid', permissions.checkPermission("tests:submit"), async function(req,res,next){
  logger.info("marking for deletion:",req.params.objectid);
  await db.collection('fileActivity').updateOne({_id:req.params.objectid},
                                        {$set: {delete_requested: new Date()}},
                                        {upsert:true});
  return res.status(200);
});



