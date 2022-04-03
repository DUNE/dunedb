"use strict";

var short = require('short-uuid')(); // uses base58 by default

//
/// Short snippets
function deCamelCase(input)
{
  // input: someStrange_variableNumber09
  // output: Some Strange Variable Number 09
  var arr = input.replace(/(\d+)/,' $1')
                 .split(/(?=[A-Z])|[ _]/);

  var arr2 =[];
  for(var w of arr) arr2.push(w.charAt(0).toUpperCase()+w.slice(1));
  return arr2.join(' ');
}

function unshortenUuid(shortend)
{
  // It might be padded. Remove any trailing '-' used to pad to 22 chars.
  var txt = shortend.match('[^\-]*')[0];
  return short.toUUID(txt)
}

module.exports = {
 uuid_regex: ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})',

 // This is the new padded version: exactly 22 characters long, padded with trailing '-'.
 short_uuid_regex: ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ-]{22})',
 deCamelCase,
 unshortenUuid
}

