
'use strict';

var short = require('short-uuid')();

module.exports = 
{
  uuid_regex: ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})',
  short_uuid_regex: ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ-]{22})',
  
  deCamelCase,
  unshortenUuid
};


function deCamelCase(input)
{
  /// Usage:
  ///   utils.deCamelCase(input)
  ///
  /// Example: an input of 'someStrange_variableNumber09' ...
  ///          ... returns 'Some Strange Variable Number 09'
    
  var arr = input.replace(/(\d+)/,' $1')
                 .split(/(?=[A-Z])|[ _]/);
  
  var arr2 = [];
  
  for(var w of arr)
  {
    arr2.push(w.charAt(0).toUpperCase() + w.slice(1));
  }
  
  return arr2.join(' ');
}


function unshortenUuid(shortUuid)
{
  /// Usage:
  ///   utils.unshortenUuid(shortUuid)
  ///
  /// This function converts a shortened (21 or 22 character) UUID to a full (36 character) UUID
  
  var txt = shortUuid.match('[^\-]*')[0];
  
  return short.toUUID(txt)
}

