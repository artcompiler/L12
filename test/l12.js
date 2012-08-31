(function() {
  packages = {

    // Lazily construct the package hierarchy from class names.
    root: function(classes) {
      var map = {};

      function find(name, data) {
        var node = map[name], i;
        if (!node) {
          node = map[name] = data || {name: name, children: []};
          if (name.length) {
            node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
            node.parent.children.push(node);
            node.key = name.substring(i + 1);
          }
        }
        return node;
      }

      classes.forEach(function(d) {
        find(d.name, d);
      });

      return map[""];
    },

    // Return a list of imports for the given array of nodes.
    imports: function(nodes) {
      var map = {},
          imports = [];

      // Compute a map from name to node.
      nodes.forEach(function(d) {
        map[d.name] = d;
      });

      // For each import, construct a link from the source to target node.
      nodes.forEach(function(d) {
        if (d.imports) d.imports.forEach(function(i) {
          imports.push({source: map[d.name], target: map[i]});
        });
      });

      return imports;
    }

  };
})();

var radius = 960 / 2,
    splines = [];

var cluster = d3.layout.cluster()
    .size([360, radius - 120])
    .sort(null)
    .value(function(d) { return d.size; });

var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.85)
    .radius(function(d) { return d.y; })
    .angle(function(d) { return d.x / 180 * Math.PI; });

var vis = d3.select("#chart").append("svg")
    .attr("width", radius * 2)
    .attr("height", radius * 2)
  .append("g")
    .attr("transform", "translate(" + radius + "," + radius + ")");

function showGraph(classes) {
    vis.selectAll("g.node").remove()
    vis.selectAll("path.link").remove()
  var nodes = cluster.nodes(packages.root(classes)),
      links = packages.imports(nodes);

  vis.selectAll("path.link")
      .data(splines = bundle(links))
    .enter().append("path")
      .attr("class", "link")
      .attr("stroke", "steelblue")
      .attr("fill", "none")
      .attr("d", line);

  vis.selectAll("g.node")
      .data(nodes.filter(function(n) { return !n.children; }))
    .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
    .append("text")
      .attr("dx", function(d) { return d.x < 180 ? 8 : -8; })
      .attr("dy", ".31em")
      .attr("fill", "grey")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
      .attr("id", function(d) { return d.key })
      .text(function(d) { return getLabel(d); });
}

function getLabel(d) {
    var node = nodeMap[d.key]
    switch (node.class) {
    case "Fixture":
	return node.elts[1].elts[0].elts[0]
    case "Identifier":
	return d.key+":"+node.elts[0]
    default:
	return d.key+":"+node.class
    }
}

d3.select(window).on("mousemove", function() {
  vis.selectAll("path.link")
      .data(splines)
      .attr("d", line.tension(Math.min(1, d3.event.clientX / 960)));
});

var prevClasses = []

d3.select(window).on("mousedown", function() {
    drawGraph(d3.event.target)
});

function removeNode(nodes, id) {
    $.each(nodes, function(i, v) {
	if (v && v.name === id) {
	    delete nodes[i]
	}
    })
}

function getChildren(elts, imports) {
    var classes = []
    if (elts) {
	$.each(elts, function(i, v) {
	    if ($.isArray(v)) {
		classes = classes.concat(getChildren(v, imports))
	    }
	    else if (v.id) { 
		classes.push({"name": v.id, "imports": []})
	    }
	});
    }
    return classes
}

var nodeMap = {}
var fixtureMap = {}
var edgeMap = {}

function makeNodeMap(ast) {
    if ($.isArray(ast)) {
	$.each(ast, function(i, v) {
	    if ($.isArray(v)) {
		makeNodeMap(v)
	    }
	    if (v.id) {
		nodeMap[v.id] = v
	    }
	    if (v.class == "Fixture") {
		fixtureMap[v.id] = v
	    }
	    if (v.tag === "path") {
		var nn = v.id.split("N")
		var n0 = "N" + nn[1]
		var n1 = "N" + nn[2]		
		if (edgeMap[n0] === void 0) {
		    edgeMap[n0] = [ ]
		}
		if (edgeMap[n1] === void 0) {
		    edgeMap[n1] = [ ]
		}
		edgeMap[n0].push(n1)
		edgeMap[n1].push(n0)
	    }

	    if (v.elts) {
		makeNodeMap(v.elts)
	    }
	})
    }
    if (ast.id) {
	nodeMap[ast.id] = ast
    }
    if (ast.elts) {
	makeNodeMap(ast.elts)
    }
}

function getFixtures() {
    var classes = []
    $.each(fixtureMap, function (i, v) {
	classes.push({name: i, imports: []})
    })
    return classes
}

d3.json("todos.js.l7.l11.l9", function(ast) {
    var elts = ast[0][0].elts
    makeNodeMap(elts)
    d3.json("todos.js.l7.l11.l9.l12", function(ast) {


    var classes = getFixtures()
    showGraph(classes)
});

function drawGraph(target) {
    var graph = getGraph(target)
    var classes = [ ]
    $.each(graph, function(a, b) {
	classes.push({name: a, imports: b})
    })
    vis.selectAll("g.node").remove()
    vis.selectAll("path.link").remove()
    showGraph(classes)
}

function getGraph(target) {
    var node = d3.select(target)
    var id = node.attr("id")
    var edges = edgeMap[id]
    var graph = { }
    graph[id] = edges
    $.each(edges, function(i, v) {
	if (graph[v] === void 0) {
	    graph[v] = [ ]
	}
	graph[v].push(id)
    })
    return graph
}

function drawEdges(target) {
    var node = d3.select(target)
    var edges = d3.selectAll("path[id*="+node.attr("id")+"]")
    edges.attr("stroke", "red")
    edges.attr("stroke-width", "1")
    edges.attr("stroke-opacity", "1")
    node.selectAll("*").each(function (v, i, j) { 
	var node = d3.select(this)
	var edges = d3.selectAll("path[id*="+node.attr("id")+"]")
	edges.attr("stroke", "red")
	edges.attr("stroke-width", "1")
	edges.attr("stroke-opacity", "1")
    })
}

