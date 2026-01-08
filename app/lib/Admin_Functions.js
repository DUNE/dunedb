const MUUID = require('uuid-mongodb');

const Actions = require('./Actions');
const { db } = require('./db');
const Components = require('./Components');
const logger = require('../lib/logger');
const utils = require('./utils');


async function cleanComponentRecords(typeFormId) {
  let deleteCondition = null;

  if (typeFormId === 'ALL_COMPONENTS') {
    deleteCondition = { $unset: { 'data.name': "" } };
  } else if (typeFormId === 'APAFrame') {
    deleteCondition = { $unset: { 'data.frameNumber': "" } };
  } else if (typeFormId === 'AssembledAPA') {
    deleteCondition = { $unset: { 'data.apaNumberAtLocation': "" } };
  } else if (typeFormId === 'DWA') {
    deleteCondition = { $unset: { 'data.dwaNumber': "" } };
  } else if (typeFormId === 'DWAPDB') {
    deleteCondition = { $unset: { 'data.pdbNumber': "" } };
  }

  const matchCondition = (typeFormId === 'ALL') ? {} : { formId: typeFormId };

  const result = await db.collection('components')
    .updateMany(
      matchCondition,
      deleteCondition,
    )

  if (result.ok === 0) throw new Error(`Admin_Functions::cleanComponentRecords() - failed to delete fields from the component records!`);

  return typeFormId;
}


// NOT WORKING ... KEEPS GIVING A 'MongoNetworkTimeoutError: connection <monitor> to 172.19.0.2:27017 timed out' ERROR
// Might be due to querying too many (i.e. all!) action records ... works fine with a smaller number (specifying a single action type)
async function addComponentInfoToActionRecords() {
  db.collection('actions')
    .find({})
    .forEach(async function (actionRecord) {
      const componentRecord = await Components.retrieve(actionRecord.componentUuid);
      const componentName = (componentRecord) ? componentRecord.data.componentName : '[no component record found!]';
      const componentTypeFormId = (componentRecord) ? componentRecord.formId : '[no component record found!]';
      const componentTypeFormName = (componentRecord) ? componentRecord.formName : '[no component record found!]';

      const result = db.collection('actions')
        .updateOne(
          { _id: actionRecord._id },
          {
            $set: {
              'componentName': componentName,
              'componentTypeFormId': componentTypeFormId,
              'componentTypeFormName': componentTypeFormName,
            }
          },
        );

    });

  return 'ALL_ACTIONS';
}

module.exports = {
  cleanComponentRecords,
//  addComponentInfoToActionRecords,
}
