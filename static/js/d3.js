const components = []; // list of nodes we will map to graphical elements
// const componentLinks = []; // list of edges we will map to arrows
const componentLookup = {}; // Lookup table of nodes. look up uuid to get to index into components[]
const componentLinkLookup = {}; // Lookup table of edges. look up uuid1+path+uuid2 to get index into componentLinks[]
const pathTypeLookup = {};
const nodes = []; // list of node coordinates, 1-1 mapping with componenta array
const links = []; // list of edge coordinates, 1-1 mapping with componentLinks array

var node; // d3 selector of node dom
var link; // d3 selectof of link dom

// var typeSet = d3.set([]); // individual types.

var simulation;


// color = d3.scaleOrdinal(types, d3.schemeCategory10);

function linkArc(d) {
  // console.log(d)
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
}


 mydrag = sim => {
  
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

function addComponentIfNotExists(component,parentUuid,updown)
{
  if(component.componentUuid in componentLookup) {
    return false; // already there
  }
  components.push(component);
  componentLookup[component.componentUuid] = components.length-1; // index in the array;

  // create new node position from the parent position.
  var parentIndex = componentLookup[parentUuid];
  if(isNaN(parentIndex)) throw new Error("wtf no parent");
  var newNode = Object.create(component); // copy parent info into prototype
  var parent = nodes[parentIndex];
  newNode.index = nodes.length;
  newNode.x  = parent.x;
  newNode.y  = parent.y;
  if(updown) newNode.y -= 2;
  else       newNode.y += 2;
  newNode.x += (Math.random()-0.5) * 2 * 5;
  nodes.push(newNode);
  return true;
}

function addLink(uuid1,uuid2,path)
{
  // typeSet.add(path);
  var i1 = componentLookup[uuid1];
  var i2 = componentLookup[uuid2];
  var name = uuid1+path+uuid2;
  if(name in componentLinkLookup) {
    return false;
  } else {
    var newLink = Object.create({name: name, uuid1: uuid1, uuid2: uuid2, path: path});
    newLink.index = links.length; 
    newLink.source = nodes[i1];
    newLink.target = nodes[i2];
    links.push(newLink);
    console.log("adding link",newLink);
  }
  pathTypeLookup
}

// 

async function getRel(uuid) {
  var data = await $.get(`/json/component/${uuid}/relationships`);
  if(data) console.log(data);
  else throw new Error("WTF")
  
  // add any new components to the web.
  addComponentIfNotExists({componentUuid:uuid});

  var linkedFrom = ((data||{}).linkedFrom)||{};
  for( var key in linkedFrom) {
    for(var o of linkedFrom[key] ) {
      var id = o.componentUuid;
      addComponentIfNotExists(o,uuid,true);
      addLink(id, uuid, o.path);
    }
   }

  var linkedTo = ((data||{}).linkedTo)||{};
  for( var key in linkedTo) {
    for( var o of linkedTo[key] ) {
      var id = o.componentUuid;
      addComponentIfNotExists(o,uuid,false);
      addLink(uuid,id,o.path);
    }
  }

  updateNodesAndEdges();
}


async function seedUuid(uuid) {
  components.push({componentUuid: uuid});
  nodes.push({});
  updateNodesAndEdges();
}

function nodeClicked(d)
{
  console.log('click',d);
  // lock this node's position:
  d.fx = d.x;
  d.fy = d.y;
  getRel(d.componentUuid);
  d3.event.stopPropagation();

}

function updateNodesAndEdges()
{
  node = node.data(nodes)
             .join(enter => {var newg = enter.append("g");
                      newg.call(mydrag(simulation))
                          .on("click",nodeClicked)
                      newg.append('circle')
                          .attr("stroke", "white")
                          .attr("stroke-width", 1.5)
                          .attr("r", 4);
                      newg.append("text")
                          .attr("x", 8)
                          .attr("y", "0.31em")
                          .text(d => d.name.substr(0,20) || d.componentUuid.substr(0,6))
                        .clone(true).lower()
                          .attr("fill", "none")
                          .attr("stroke", "white")
                          .attr("stroke-width", 3);
                      return newg; // essential, or it doesn't get re-assigned back on the 'node' list.
                    }
            );


  link = link.data(links)
              .join('path')
                .attr("stroke", "#000") //d => color(d.path))
                // .attr("marker-end", d => `url(${new URL(`#arrow-${d.path}`, location)})`);
                .attr("marker-end", `url(${new URL(`#arrow`, location)})`);

  
  // link.exit().remove();
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

}






function onTick() {
      link.attr("d", linkArc);
     // node = nodeg.selectAll("g").data(nodes);
      node.attr("transform", d => `translate(${d.x},${d.y})`);  
      // console.log("ontick --- ",node.size());
      // node.each(function(d,i) { console.log(d,i)} );
    // node.attr("cx", d => d.x)
    //     .attr("cy", d => d.y)

    // link.attr("x1", d => d.source.x)
    //     .attr("y1", d => d.source.y)
    //     .attr("x2", d => d.target.x)
    //     .attr("y2", d => d.target.y);
}

// Seed the very intial node:
var initial_uuid = '23b0d1d0-d680-11ea-9b68-078d4d50194b';



$(async function(){
    var initial_component = await $.get('/json/component/'+initial_uuid);
    initial_component.name = initial_component.data.name;
    components.push(initial_component);
    componentLookup[initial_uuid]=0;
    var newNode = Object.create(components[0]);
    newNode.fx = 0;
    newNode.fy = 0;
    nodes.push(newNode);





    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        // .force('gravity', linkDirectionGravity(links));

  
    svg = d3.select("div#svg-container")
      .append("svg");
    width = $('div#svg-container').width();
    height= $('div#svg-container').height();

    const initialScale = 3.0;
    const initialTranslate= { x:0, y:0 };

    svg.attr("preserveAspectRatio", "xMinYMin meet")
      .classed("svg-content", true)
      .attr('width',width)
      .attr('height',height)
      .attr("viewBox", [-width/2,-height/2,width,height].join(' '))
      .style("font", "10px sans-serif")
      // .style("background-color", 'red')
      ;

    const zoombox = svg.append('g')
                       .attr('transform',`translate(${initialTranslate.x},${initialTranslate.y})scale(${initialScale})`);
    
    svg.call(d3.zoom().on("zoom", function () {
         var x = d3.event.transform.x + initialTranslate.x;
         var y = d3.event.transform.y + initialTranslate.y;
         var k = d3.event.transform.k * initialScale;
         
         zoombox.attr("transform", `translate(${x}, ${y})scale(${k})`);
         // var f = 10/Math.sqrt(d3.event.transform.k);
         // svg.style("font",f.toFixed(1)+"px sans-serif");
      }));
  
    // Per-type markers, as they don't inherit styles.
    svg.append("defs")
      .append("marker")
        .attr("id", d => `arrow`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("path")
        .attr("fill","#000")
        .attr("d", "M0,-5L10,0L0,5");

    link = zoombox.append("g") 
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .attr("stroke","#000")
      .selectAll("path");
  
    nodeg = zoombox.append("g")
        .attr('class','nodes')
        .attr("fill", "currentColor")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");

     node = nodeg.selectAll("g");

  
    // invalidation.then(() => simulation.stop());
    console.log("nodes at start", node.size());
    node.each(function(d,i) { console.log(d,i)} );
    updateNodesAndEdges();
    console.log("nodes after first update", node.size());
    node.each(function(d,i) { console.log(d,i)} );
    // console.log(svg.node())
    // return svg.node();
    console.log("doing intial query")
    getRel(initial_uuid);
    simulation.on("tick",onTick)

})


// /// custom force
// function linkDirectionGravity(links) {
//   var id = d=>d.index,
//       strength = defaultStrength,
//       strengths,
//       nodes,
//       count,
//       bias,
//       random,
//       iterations = 1;

//   if (links == null) links = [];

//   function defaultStrength(link) {
//     return 1 / Math.min(count[link.source.index], count[link.target.index]);
//   }

//   function force(alpha) {
//     for (var k = 0, n = links.length; k < iterations; ++k) {
//       for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
//         link = links[i], source = link.source, target = link.target;
//         y = target.y + target.vy - source.y - source.vy;
//         target.vy -= strengths[i]*alpha;
//         // source.vy += strengths[i]*alpha;
//       }
//     }
//   }

//   function initialize() {
//     if (!nodes) return;


//     function find(nodeById, nodeId) {
//       var node = nodeById.get(nodeId);
//       if (!node) throw new Error("node not found: " + nodeId);
//       return node;
//     }

//     var i,
//         n = nodes.length,
//         m = links.length,
//         nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d])),
//         link;

//     for (i = 0, count = new Array(n); i < m; ++i) {
//       link = links[i], link.index = i;
//       if (typeof link.source !== "object") link.source = find(nodeById, link.source);
//       if (typeof link.target !== "object") link.target = find(nodeById, link.target);
//       count[link.source.index] = (count[link.source.index] || 0) + 1;
//       count[link.target.index] = (count[link.target.index] || 0) + 1;
//     }

//     for (i = 0, bias = new Array(m); i < m; ++i) {
//       link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
//     }

//     strengths = new Array(m), initializeStrength();
//   }

//   function initializeStrength() {
//     if (!nodes) return;

//     for (var i = 0, n = links.length; i < n; ++i) {
//       strengths[i] = +strength(links[i], i, links);
//     }
//   }


//   force.initialize = function(_nodes, _random) {
//     nodes = _nodes;
//     random = _random;
//     initialize();
//   };

//   force.links = function(_) {
//     return arguments.length ? (links = _, initialize(), force) : links;
//   };

//   force.id = function(_) {
//     return arguments.length ? (id = _, force) : id;
//   };

//   force.iterations = function(_) {
//     return arguments.length ? (iterations = +_, force) : iterations;
//   };

//   force.strength = function(_) {
//     return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initializeStrength(), force) : strength;
//   };

//   return force;
// }


