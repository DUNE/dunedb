"use strict";

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


module.exports = {
 uuid_regex: ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})',
 short_uuid_regex: ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{21,22})',
 deCamelCase,

}

