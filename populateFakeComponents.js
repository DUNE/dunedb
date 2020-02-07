const express = require('express');

var database = require('./database.js');
var MUUID = require('uuid-mongodb');
var componentslib = require('./components.js');
var config = require('./config.js');

function pickRandom(arr)
{
  var i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

var napa = 2;

var nboards = 10;

var components = [];

var boards = [];


for(var i=0;i<nboards;i++)
{
    var sites = ['WIS','CHI','PSL','YAL'];

  var board = {

    componentUuid: MUUID.v1(),
    type: "Geometry Board",
    boardSerialNumber: "UGEO-"+pickRandom(sites)+"-"+Math.floor(Math.random()*10000),
  }
  board.name = board.boardSerialNumber;
  boards.push(board);
  components.push(board);
}


for(var i=0;i<napa; i++) {
  var sites = ['WIS','CHI','PSL','YAL'];

  var frame = {
    componentUuid:  MUUID.v1(),
    type: "Frame",
    name: "Frame "+ i
  }
  components.push(frame);
  var apa = {
      componentUuid:  MUUID.v1(),
      type: "APA",    
      apaSerialNumber: "APA-"+pickRandom(sites)+"-"+Math.floor(Math.random()*10000),
      frame: i,
      apaFrameUuid: frame.componentUuid.toString(),
      geometryBoards: []
  }
  apa.name = apa.apaSerialNumber;
  for(var j=0;j<10;j++) {
    var b = boards[Math.floor(Math.random()*boards.length)];
    apa.geometryBoards.push({boardPosition:j, componentUuid: b.componentUuid.toString()});
  }
  components.push(apa);
}


(async function(){
  try{
    await database.attach_to_database()
    db.dropDatabase();
    for(c of components) {
      await componentslib.saveComponent(c,{user:"populateFakeComponents",ip:"::1"});
    }
    console.log("done");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);

  }

})().then(console.log("done"));

