"use strict";

const ObjectID = require('mongodb').ObjectID;
var MUUID = require('uuid-mongodb');



module.exports = {
	insertion,
	validity,
};


function insertion(req) 
{
	if(!req) throw new Error("No request object in commenSchema/insertion");
	if(!req.user) throw new Error("No user info");
	const {user_id, displayName, emails} = req.user;  // equivalent to user_id = user.user_id, etc
    
	return {
		insertDate: new Date(),
		ip: req.ip,
		user:  {user_id, displayName, emails}
	};
}


//
//
// Ideas:
// This doesn't track heredity.
// Maybe instead of supplying a validity object, the client should supply the
// old record validity, and then add a 'new validity' object.
// need:
// requested start date
// ancestor version
// biggest existing version number.


function validity(supplied_validity, old_record) 
{
	var v = {};
	var vnew = supplied_validity || {};
	var vold = (old_record||{}).validity || {};

	v.startDate = (vnew.startDate) ? new Date(vnew.startDate) : new Date();

	console.log("old version ", vold.version, "supplied version",vnew.version);
	if(vnew.version && vnew.version <= vold.version)
		 throw new Error("Supplied version is smaller than existing version. Someone else may be editing this document right now.");
	// version number will be the newly supplied version if present. If not present,
	// it will be the old version plus one.
	// If no old version number, assign 1
	v.version = vnew.version || ( (vold.version||0) +1);
	if(vnew && vnew.startDate) 
		v.startDate = new Date(vnew.startDate);
	else 
		v.startDate = new Date(); // default to now.

	return v;
}



