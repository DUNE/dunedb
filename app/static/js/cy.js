var cy;
var layoutOpts;
var layout;

async function getRel(cy,uuid) {
  var data = await $.get(`/json/component/${uuid}/relationships`);
  if(data) console.log(data);
  var toAdd = [];
  for( var o of ((data||{}).linkedFrom||[]) ) {
    var id = o.componentUuid;
    // console.log(id);
    if( cy.getElementById( id ).length == 0 ) {
      // console.log('add from',id);
      toAdd.push(
        {group:"nodes", data:{id:id, name: id.substr(0,5), type: o.type}},
        {group:"edges", data:{id: id+uuid, name: o.path, source: id, target: uuid}},
      );
    }
  }

  for( var o of ((data||{}).linkedTo||[]) ) {
    var id = o.componentUuid;
    if( cy.getElementById( id ).length == 0 ) {
      // console.log('add to',id);
      toAdd.push(
        {group:"nodes", data:{id:id, name: id.substr(0,5)}},
        {group:"edges", data:{id:uuid+id, source: uuid, target: id}},
      );
    }
  }
  var col =  cy.collection();
  col = col.union(cy.add(toAdd));
  var layout = cy.layout(layoutOpts);
  // layout.run(col);
  layout.run();
  // layout.run()
  // col.layout(layoutOpts).run();
  // layout.run(col);
  // var layout = cy.layout(layoutOpts);
  // layout.one("layoutstop",function(){
  //   // cy.animate({fit:{}});
  // });
  // layout.run();
  // cy.fit();


}
$(function(){

  // .then(function(data))
  // // get us some data.
  // $.get('http://localhost:12313/json/component/2ee21d70-d680-11ea-9b68-078d4d50194b/relationships')
  // .then(data){
  //   for(var )
  // }

  layoutOpts= {name:"cose", animate: "end"};

  cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [
     { group: 'nodes', data:{id:"A", name:"AAA"}},
     { group: 'nodes', data:{id:"B", name:"BBB"}},
     { group: 'nodes', data:{id:"C", name:"CCC"}},
     { group: 'edges', data:{id:'e1', source:'A', target:'B'}},
     { group: 'edges', data:{id:'e2', source:'A', target:'C'}},
    ],
    style: [ // the stylesheet for the graph
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(name)'
          }
        },
        {
          selector: 'node[type="Paper"]',
          style: {
            'background-color': '#822',
          }
        },

        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],
  });
  layout = cy.layout({name:"cose"});

  cy.on("tap",function(event){
    if(event && event.target  && event.target.group && event.target.group()=="nodes") {
      console.log(event.target.id());
      getRel(cy,event.target.id());
    }
  });

  var initial_uuid = '23b0d1d0-d680-11ea-9b68-078d4d50194b';
  cy.add({group:'nodes',data:{id:initial_uuid, name:initial_uuid.substr(0,5)}});
  getRel(cy,initial_uuid);


})