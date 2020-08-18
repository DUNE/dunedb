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
                          .text(d => d.name || d.componentUuid.substr(0,6))
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
    nodes.push(newNode);





    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

  
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
      .style("font", "12px sans-serif")
      .style("background-color", 'red')

    const zoombox = svg.append('g')
                       .attr('transform',`translate(${initialTranslate.x},${initialTranslate.y})scale(${initialScale})`);
    
    svg.call(d3.zoom().on("zoom", function () {
         var x = d3.event.transform.x + initialTranslate.x;
         var y = d3.event.transform.y + initialTranslate.y;
         var k = d3.event.transform.k * initialScale;
         
         zoombox.attr("transform", `translate(${x}, ${y})scale(${k})`)
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




// https://observablehq.com/@d3/mobile-patent-suits
// var links,types,data, height, color;

// $(async function(){
//   var csv = await $.get("/suits.csv");
//   links = d3.csvParse(csv);
//   types = Array.from(new Set(links.map(d => d.type)));
//   data = ({nodes: Array.from(new Set(links.flatMap(l => [l.source, l.target])), id => ({id})), links})
//   height = 600;
//   width = 800;
//   color = d3.scaleOrdinal(types, d3.schemeCategory10);

//   function linkArc(d) {
//   const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
//   return `
//     M${d.source.x},${d.source.y}
//     A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
//   `;
//   }
//   drag = simulation => {
  
//   function dragstarted(d) {
//     if (!d3.event.active) simulation.alphaTarget(0.3).restart();
//     d.fx = d.x;
//     d.fy = d.y;
//   }
  
//   function dragged(d) {
//     d.fx = d3.event.x;
//     d.fy = d3.event.y;
//   }
  
//   function dragended(d) {
//     if (!d3.event.active) simulation.alphaTarget(0);
//     d.fx = null;
//     d.fy = null;
//   }
  
//   return d3.drag()
//       .on("start", dragstarted)
//       .on("drag", dragged)
//       .on("end", dragended);
// }
//   console.log(links);

//   (function()
//     {
  
//     const links = data.links.map(d => Object.create(d));
//     const nodes = data.nodes.map(d => Object.create(d));
  
//     const simulation = d3.forceSimulation(nodes)
//         .force("link", d3.forceLink(links).id(d => d.id))
//         .force("charge", d3.forceManyBody().strength(-400))
//         .force("x", d3.forceX())
//         .force("y", d3.forceY());
  
//     const svg = d3.select("#svgd3")
//         .attr("viewBox", [-width / 2, -height / 2, width, height])
//         .style("font", "12px sans-serif");
  
//     // Per-type markers, as they don't inherit styles.
//     svg.append("defs").selectAll("marker")
//       .data(types)
//       .join("marker")
//         .attr("id", d => `arrow-${d}`)
//         .attr("viewBox", "0 -5 10 10")
//         .attr("refX", 15)
//         .attr("refY", -0.5)
//         .attr("markerWidth", 6)
//         .attr("markerHeight", 6)
//         .attr("orient", "auto")
//       .append("path")
//         .attr("fill", color)
//         .attr("d", "M0,-5L10,0L0,5");
  
//     const link = svg.append("g")
//         .attr("fill", "none")
//         .attr("stroke-width", 1.5)
//       .selectAll("path")
//       .data(links)
//       .join("path")
//         .attr("stroke", d => color(d.type))
//         .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);
  
//     const node = svg.append("g")
//         .attr("fill", "currentColor")
//         .attr("stroke-linecap", "round")
//         .attr("stroke-linejoin", "round")
//       .selectAll("g")
//       .data(nodes)
//       .join("g")
//         .call(drag(simulation));
  
//     node.append("circle")
//         .attr("stroke", "white")
//         .attr("stroke-width", 1.5)
//         .attr("r", 4);
  
//     node.append("text")
//         .attr("x", 8)
//         .attr("y", "0.31em")
//         .text(d => d.id)
//       .clone(true).lower()
//         .attr("fill", "none")
//         .attr("stroke", "white")
//         .attr("stroke-width", 3);
  
//     simulation.on("tick", () => {
//       link.attr("d", linkArc);
//       node.attr("transform", d => `translate(${d.x},${d.y})`);
//     });
  
//     // invalidation.then(() => simulation.stop());
  
//     console.log(svg.node())
//     return svg.node();
//   })()

// })

// 
// d4 example, simple bar chart
// var svg = d3.select("#d3");
// var margin = 200;
// var width = svg.attr("width") - margin;
// var height = svg.attr("height") - margin;
 
//  svg.append("text")
//     .attr("transform", "translate(100,0)")
//     .attr("x", 50).attr("y", 50)
//     .attr("font-size", "20px")
//     .attr("class", "title")
//     .text("Population bar chart")
    
//  var x = d3.scaleBand().range([0, width]).padding(0.4),
//  y = d3.scaleLinear().range([height, 0]);
    
//  var g = svg.append("g")
//     .attr("transform", "translate(" + 100 + "," + 100 + ")");

//  d3.csv("/data.csv").then(function(data){
       
//     x.domain(data.map(function(d) { return d.year; }));
//     y.domain([0, d3.max(data, function(d) { return d.population; })]);
             
//     g.append("g")
//        .attr("transform", "translate(0," + height + ")")
//        .call(d3.axisBottom(x))
//        .append("text")
//        .attr("y", height - 250)
//        .attr("x", width - 100)
//        .attr("text-anchor", "end")
//        .attr("font-size", "18px")
//        .attr("stroke", "blue").text("year");
       
//     g.append("g")
//        .append("text")
//        .attr("transform", "rotate(-90)")
//        .attr("y", 6)
//        .attr("dy", "-5.1em")
//        .attr("text-anchor", "end")
//        .attr("font-size", "18px")
//        .attr("stroke", "blue")
//        .text("population");
                 
//     g.append("g")
//        .attr("transform", "translate(0, 0)")
//        .call(d3.axisLeft(y))

//     g.selectAll(".bar")
//        .data(data)
//        .enter()
//        .append("rect")
//        .attr("class", "bar")
//        .on("mouseover", onMouseOver) 
//        .on("mouseout", onMouseOut)   
//        .attr("x", function(d) { return x(d.year); })
//        .attr("y", function(d) { return y(d.population); })
//        .attr("width", x.bandwidth()).transition()
//        .ease(d3.easeLinear).duration(200)
//        .delay(function (d, i) {
//           return i * 25;
//        })
          
//     .attr("height", function(d) { return height - y(d.population); });
//  });
  
  
//  function onMouseOver(d, i) {
//     d3.select(this)
//     .attr('class', 'highlight');
       
//     d3.select(this)
//        .transition()     
//        .duration(200)
//        .attr('width', x.bandwidth() + 5)
//        .attr("y", function(d) { return y(d.population) - 10; })
//        .attr("height", function(d) { return height - y(d.population) + 10; });
      
//     g.append("text")
//        .attr('class', 'val')
//        .attr('x', function() {
//           return x(d.year);
//        })
       
//     .attr('y', function() {
//        return y(d.value) - 10;
//     })
//  }
  
//  function onMouseOut(d, i) {
     
//     d3.select(this)
//        .attr('class', 'bar');
    
//     d3.select(this)
//        .transition()     
//        .duration(200)
//        .attr('width', x.bandwidth())
//        .attr("y", function(d) { return y(d.population); })
//        .attr("height", function(d) { return height - y(d.population); });
    
//     d3.selectAll('.val')
//        .remove()
//  }

//  })

