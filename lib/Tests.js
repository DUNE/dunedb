"use strict";

const database = require("./database.js");
const ObjectID = require('mongodb').ObjectID;
var MUUID = require('uuid-mongodb');
const commonSchema = require("./commonSchema");
const permissions = require('./permissions');


function TestsModule(type) {
    this._type = type || "test";
    this._collection = 'tests';
    this._formCollection = 'testForms';
    if(this._type == 'job'){
     this._collection = "jobs";
     this._formCollection = 'jobForms';
}

TestsModule.prototype.save = async function(input, req)
{
    // Save. The input object should be as the schema:
    //  
    // supplied by caller:

    // componentUuid,  // BSON component UUID. Required for 'test', should not be there for 'job'
    // formId: <string>, 
    // formRecordId: <ObjectId>,  // objectID of the form record used.
    // state: <string>         // Required. "submitted" for final data, "draft" for a draft verison.
    //                         // Also reserved: 'trash'
    // data: { ...  }      // actual test data. (Also contains uuid?)
    // metadata: { ... }   // optional, Formio stuff.

    // supplied by API:
    //{}
    // _id: <ObjectId>,    // Auto-set by Mongo, Includes insertion timestamp redundantly.
    // recordType: <string>   //  "test" or "job" respectively
    // insertion: <insertion block>

    // Returns the ObjectID of the saved record.
    //
    // req must contain user and ip objects.

    if(!input) throw new Error("saveTestData: no input data provided");
    if(!input.formId) throw new Error("saveTestData: formId not defined");
    if(!input.formName) throw new Error("saveTestData: formName not defined");
    // Ensure ObjectID typing:
    input.formObjectId = new ObjectID(input.formObjectId);
    if(!ObjectID.isValid(input.formObjectId) ) throw new Error("saveTestData: formObjectId not correctly");
    if(!input.data) throw new Error("saveTestData: no data given");

    var record = {...input};

    // Ensure componentID in binary form.
    if(this._type === "test") {
        if(!input.componentUuid) throw new Error("Tests::save() No componentUuid provided.");
        record.componentUuid = MUUID.from(input.componentUuid);
    } 
    record.recordType = this._type; // required
    console.log('req.user',req.user);
    record.insertion = commonSchema.insertion(req);

    // metadata.
    record.state = record.state || 'submitted'; // ensure 'state' is set.
    console.log("Tests::save()",record.formId,record.state);

    if(!permissions.hasPermission(req,this._collection+':submit'))  throw new Error("You don't have permission to edit forms.");
    
    var result;
    var draft_id = input._id;

    // If it's a draft and already has a record number, replace it.
    if(input.state == "draft" && draft_id) {
      // replace with updated draft.
      record._id = ObjectID(draft_id);
      var old = await this.retrieve(record._id);
      if(old.state !== "draft") throw new Error("Attempted to replace final submission of a form.")
      var result = await db.collection(this._collection).replaceOne({_id: ObjectID(draft_id)}, record);
      if(result.modifiedCount!=1) throw new Error("Update draft test document failed.");
      console.log("updated record id",record._id)
      return record._id;
    } else {
      delete record._id;
      var result = await db.collection(this._collection).insertOne(record);
      console.log("inserted record id",result.ops[0]._id);
      // delete in the background if there was a draft.
      if(draft_id) this.deleteDraft(draft_id).then(
        ()=>{console.log("deleted draft "+draft_id);});
      return result.ops[0];
    }
  }

TestsModule.prototype.retrieve = async function(record_id)
  {
    console.log("Tests::retrieve() ",this._collection,record_id);
    var record = await db.collection(this._collection).findOne({_id: new ObjectID(record_id)});
    return record;
  }


TestsModule.prototype.listRecent = async function(formId,N,skip)
  {

    N = N || 30;
    skip = skip || 0;
    var query = {state:'submitted'};
    if(formId) query.formId = formId;
    var p = await db.collection(this._collection).aggregate(
                            [ { '$match' : query },
                              { '$sort' : { 'insertion.insertDate': -1 } },
                              { '$skip' : skip },
                              { '$limit' : N },
                              { '$lookup': {
                                            from: this._formCollection,
                                            localField: "formObjectId",
                                            foreignField: "_id",
                                            as: "forms"   
                                           }},
                              { '$project' : {formId: 1, 
                                              formObjectId:1, 
                                              // forms: 1,
                                              // form: {$arrayElemAt: [ "$forms", 0 ]}, 
                                              formName: {$arrayElemAt: [ "$forms.formName", 0 ] }, 
                                              insertDate: '$insertion.insertDate', 
                                              user:'$insertion.user'}}
                            ])
            .toArray();
    // var p = await db.collection(this._collection)
    //                   .find(query)
    //                   .sort({ 'insertion.insertDate': -1 })
    //                   .limit(N)
    //                   .project( {formId: 1, "form.form_title":1, insertDate: 1, user:1} )
    //                   .toArray();
      console.log("listRecent",p)
      return p;
  }


TestsModule.prototype.listComponentTests = async function(componentUuid, formId)
  {
    var query = {"componentUuid": MUUID.from(componentUuid),
                 "state" : "submitted"};
    if(formId) query.formId = formId;
    var p = await db.collection(this._collection).aggregate(
                            [ { '$match' : query },
                              { '$sort' : { 'insertion.insertDate': -1 } },
                              { '$lookup': {
                                            from: this._formCollection,
                                            localField: "formObjectId",
                                            foreignField: "_id",
                                            as: "forms"   
                                           }},
                              { '$project' : {formId: 1, 
                                              formName: {$arrayElemAt: [ "$forms.formName", 0 ] }, 
                                              insertion: true, _id: true}}
                            ])
            .toArray();

      console.log("peformed of type",formId||"all",":");
      console.log(JSON.stringify(p,null,2));
      return p;
  }

TestsModule.prototype.listUserDrafts = async function(user_id)
  {
    var query = {"state": "draft"};
    if(user_id) query["insertion.user.user_id"] = user_id;
    var p = await db.collection(this._collection).aggregate(
                            [ { '$match' : query },
                              { '$sort' : { 'insertion.insertDate': -1 } },
                              { '$lookup': {
                                            from: this._formCollection,
                                            localField: "formObjectId",
                                            foreignField: "_id",
                                            as: "form"   
                                           }},
                              // { '$project' : {formId: 1, formName: '$form[0].formName', insertDate: 'insertion.insertDate', user:'insertion.user'}}
                            ])
            .toArray();


      console.log("listUserDrafts",user_id||"all",":");
      console.dir(p);
      return p;
  }

TestsModule.prototype.deleteDraft = async function(record_id)
  {
    // caller should check authorization
    return await db.collection(this._collection).deleteOne({_id: ObjectID(record_id), state:'draft'});
  }
}


module.exports = function(type) { return new TestsModule(type) };
