


// https://observablehq.com/@d3/mobile-patent-suits
var links,types,data, height, color;
var links2, nodes2;

$(async function(){
  var csv = await $.get("/suits.csv");
  links = d3.csvParse(csv);
  types = Array.from(new Set(links.map(d => d.type)));
  data = ({nodes: Array.from(new Set(links.flatMap(l => [l.source, l.target])), id => ({id})), links})
  height = 600;
  width = 800;
  color = d3.scaleOrdinal(types, d3.schemeCategory10);

  function linkArc(d) {
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
  }
  drag = simulation => {
  
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
  console.log(links);

  (function()
    {
    console.log("data.nodes",data.nodes);
    links2 = data.links.map(d => Object.create(d)); // list of empty object, but with prototype (default) values of data.links.
    nodes2 = data.nodes.map(d => Object.create(d)); // ditto nodes.
    const simulation = d3.forceSimulation(nodes2)
        .force("link", d3.forceLink(links2).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("x", d3.forceX())
        .force("y", d3.forceY());
  
 
    height = 600;
    width = 600;

    const svg = d3.select("div#svg-container")
      .append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .classed("svg-content", true)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("font", "12px sans-serif")
        // .style("background-color", 'red')
        ;
   
    // Per-type markers, as they don't inherit styles.
    svg.append("defs").selectAll("marker")
      .data(types)
      .join("marker")
        .attr("id", d => `arrow-${d}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("path")
        .attr("fill", color)
        .attr("d", "M0,-5L10,0L0,5");
  
    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(links2)
      .join("path")
        .attr("stroke", d => color(d.type))
        .attr("marker-end", d => `url(${new URL(`#arrow-${d.type}`, location)})`);
  
    const node = svg.append("g")
        .attr("fill", "currentColor")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
      .selectAll("g")
      .data(nodes2)
      .join("g")
        .call(drag(simulation));
  
    node.append("circle")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .attr("r", 4);
  
    node.append("text")
        .attr("x", 8)
        .attr("y", "0.31em")
        .text(d => d.id)
      .clone(true).lower()
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 3);
  
    simulation.on("tick", () => {
      link.attr("d", linkArc);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
  
    // invalidation.then(() => simulation.stop());
  
    console.log(svg.node())
    return svg.node();
  })()

})

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

