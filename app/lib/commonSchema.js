
'use strict';

const logger = require('./logger');
const ObjectID = require('mongodb').ObjectID;

var MUUID = require('uuid-mongodb');

module.exports = {insertion,
                  validity};


function insertion(req) 
{
  /// Usage:
  ///   commonSchema.insertion(req)
  ///
  /// This function returns the insertion data to be added to any (and all) DB entries
  /// This data is interpreted from the user information provided in 'req'
  
  if(!req)
  {
    throw new Error("commonSchema::insertion() - no 'req' request object has been given!");
  }
  
  if(!req.user)
  {
    throw new Error("commonSchema::insertion() - no user information is present in the 'req' request object!");
  }
  
  const {user_id, displayName, emails} = req.user;
  
  return {insertDate: new Date(),
          ip        : req.ip,
          user      : {user_id, displayName, emails}};
}


function validity(supplied_validity, old_record) 
{
  /// Usage:
  ///   commonSchema.validity(validity, old_record)
  ///
  /// This function returns the validity data to be added to any (and all) DB entries
  /// This data is interpreted from the supplied validity information, combined with the same from an old DB entry if provided
  
  var v    = {};
  var vnew = supplied_validity || {};
  var vold = (old_record || {}).validity || {};
  
  v.startDate = (vnew.startDate) ? new Date(vnew.startDate) : new Date();
  
  if(vnew.version && vnew.version <= vold.version)
  {
    throw new Error("commonSchema::validity() - the provided version number is smaller than the existing value ... someone else may already be editing this DB record!");
  }
  
  v.version = vnew.version || ((parseInt(vold.version) || 0) + 1);
  
  if(vnew && vnew.startDate) 
    v.startDate = new Date(vnew.startDate);
  else 
    v.startDate = new Date();
  
  return v;
}

