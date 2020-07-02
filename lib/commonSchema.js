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

function validity(supplied_validity, old_record) 
{
	var v = {};
	var vold = (old_record||{}).validity || {};

	v.startDate = (supplied_validity.startDate) ? new Date(supplied_validity.startDate) : new Date();

	console.log("old version ", vold.version, "supplied version",supplied_validity.version);
	if(supplied_validity.version && supplied_validity.version <= vold.version)
		 throw new Error("Supplied version is smaller than existing version. Someone else may be editing this document right now.");
	// version number will be the newly supplied version if present. If not present,
	// it will be the old version plus one.
	// If no old version number, assign 1
	v.version = supplied_validity.version || ( (vold.version||0) +1);
	if(supplied_validity && supplied_validity.startDate) 
		v.startDate = new Date(supplied_validity.startDate);
	else 
		v.startDate = new Date(); // default to now.

	return v;
}



