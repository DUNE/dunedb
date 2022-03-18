const { db } = require('../lib/db');
var MUUID = require('uuid-mongodb');
var uuid = require('uuid');
var componentslib = require('../lib/Components.js');

function pickRandom(arr)
{
  var i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

var napa = 3;

var nboards = 10;

var components = [];

var boards = [];


for(var i=0;i<nboards;i++)
{
  var sites = ['WIS','CHI','PSL','YAL'];
  var msecs = Date.now()+Math.floor(Math.random() * 0x100000); // Add up to 1 minute to time to randomize. 
  var board = {
    componentUuid: MUUID.from(uuid.v1({msecs})),
    type: "Geometry Board",
    boardSerialNumber: "UGEO-"+pickRandom(sites)+"-"+Math.floor(Math.random()*10000),
  }
  board.name = board.boardSerialNumber;
  boards.push(board);
  components.push(board);
}


for(var i=0;i<napa; i++) {
  var sites = ['WIS','CHI','PSL','YAL'];

  var msecs = Date.now()+Math.floor(Math.random() * 0x100000); // Add up to 17 minute to time to randomize. 
  var frame = {
    componentUuid:  MUUID.from(uuid.v1({msecs})),
    type: "Frame",
    name: "Frame "+ i
  }
  components.push(frame);
  var msecs = Date.now()+Math.floor(Math.random() * 0x100000); // Add up to 17 minute to time to randomize. 
  var apa = {
      componentUuid:  MUUID.from(uuid.v1({msecs})),
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
    // db.dropDatabase();
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

