
'use strict';

const Cache = require("lib/Cache.js");
const Components = require("lib/Components.js")('component');
const deepmerge = require('deepmerge');
const Forms = require("lib/Forms.js");
const logger = require('./logger');

module.exports = {list};


Cache.add('componentTypes', async function()
{
  var types = await Components.getTypes();
  var forms = await Forms.list('componentForms');
  
  var componentTypes = deepmerge(types, forms);
  
  return componentTypes;
}, ['componentCountsByType', 'formlist_componentForms']);



async function list()
{
  /// Usage:
  ///   ComponentTypes.list()
  ///
  /// This function returns the following values for each component type:
  ///   - component count
  ///   - formId
  ///   - formName
  ///   - tags
  
  var types =  await Cache.current('componentTypes');
  
  return types;
}

