/// <reference types="d3"/>
/// <reference types="../../"/>
/// <reference types="graphlib-dot"/>

module dotpowergraph {
  function makeSVG(addGridLines, mywidth, myheight) {
    var svg = d3
      .select("body")
      .append("svg")
      .attr("width", mywidth)
      .attr("height", myheight);
    return svg;
  }

  function gridify(svg, pgLayout, margin, groupMargin) {
    var routes = cola.gridify(pgLayout, 5, margin, groupMargin);
    svg.selectAll("path").remove();
    routes.forEach((route) => {
      var cornerradius = 5;
      var arrowwidth = 3;
      var arrowheight = 7;
      var p = cola.GridRouter.getRoutePath(
        route,
        cornerradius,
        arrowwidth,
        arrowheight
      );
      if (arrowheight > 0) {
        svg
          .append("path")
          .attr("class", "linkarrowoutline")
          .attr("d", p.arrowpath);
        svg
          .append("path")
          .attr("class", "linkarrow")
          .attr("d", p.arrowpath);
      }
      svg
        .append("path")
        .attr("class", "linkoutline")
        .attr("d", p.routepath)
        .attr("fill", "none");
      svg
        .append("path")
        .attr("class", "link")
        .attr("d", p.routepath)
        .attr("fill", "none");
    });

    svg
      .selectAll(".label")
      .transition()
      .attr("x", (d) => d.routerNode.bounds.cx())
      .attr("y", function(d) {
        var h = this.getBBox().height;
        return d.bounds.cy() + h / 3.5;
      });

    svg
      .selectAll(".node")
      .transition()
      .attr("x", (d) => d.routerNode.bounds.x)
      .attr("y", (d) => d.routerNode.bounds.y)
      .attr("width", (d) => d.routerNode.bounds.width())
      .attr("height", (d) => d.routerNode.bounds.height());

    let groupPadding = margin - groupMargin;
    svg
      .selectAll(".group")
      .transition()
      .attr("x", (d) => d.routerNode.bounds.x - groupPadding)
      .attr("y", (d) => d.routerNode.bounds.y + 2 * groupPadding)
      .attr("width", (d) => d.routerNode.bounds.width() - groupPadding)
      .attr("height", (d) => d.routerNode.bounds.height() - groupPadding);
  }

  function createPowerGraph(inputjson) {
    var size = [700, 700];

    var svg = <any>makeSVG(false, size[0], size[1]);
    var grouppadding = 0.01;

    inputjson.nodes.forEach((v) => {
      v.width = 70;
      v.height = 70;
    });

    var margin = 20;
    var groupMargin = 15;
    var pgLayout = cola.powerGraphGridLayout(inputjson, size, grouppadding);

    var node = svg
      .selectAll(".node")
      .data(inputjson.nodes)
      .enter()
      .append("rect")
      .attr("class", "node");
    node.append("title").text((d) => d.name);

    var label = svg
      .selectAll(".label")
      .data(inputjson.nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .text((d) => d.name.replace(/^u/, ""));

    gridify(svg, pgLayout, margin, groupMargin);
    let eventStart = {},
      ghosts = null;

    function getEventPos() {
      let ev = <any>d3.event;
      let e =
        typeof TouchEvent !== "undefined" &&
        ev.sourceEvent instanceof TouchEvent
          ? ev.sourceEvent.changedTouches[0]
          : ev.sourceEvent;
      return { x: e.clientX, y: e.clientY };
    }
    function dragStart(d) {
      ghosts = [1, 2].map((i) =>
        svg.append("rect").attr({
          class: "ghost",
          x: d.routerNode.bounds.x,
          y: d.routerNode.bounds.y,
          width: d.routerNode.bounds.width(),
          height: d.routerNode.bounds.height(),
        })
      );
      eventStart[d.routerNode.id] = getEventPos();
    }
    function getDragPos(d) {
      let p = getEventPos(),
        startPos = eventStart[d.routerNode.id];
      return {
        x: d.routerNode.bounds.x + p.x - startPos.x,
        y: d.routerNode.bounds.y + p.y - startPos.y,
      };
    }
    function drag(d) {
      var p = getDragPos(d);
      ghosts[1].attr(p);
    }
    function dragEnd(d) {
      let dropPos = getDragPos(d);
      delete eventStart[d.routerNode.id];
      d.x = dropPos.x;
      d.y = dropPos.y;
      ghosts.forEach((g) => g.remove());
      if (Object.keys(eventStart).length === 0) {
        gridify(svg, pgLayout, margin, groupMargin);
      }
    }
    let dragListener = d3
      .drag()
      .on("start", dragStart)
      .on("drag", drag)
      .on("end", dragEnd);
    node.call(dragListener);
    label.call(dragListener);
  }

  d3.text("graphdata/n26e35.dot", function(f) {
    var digraph = (graphlibDot as any).parse(f);

    var nodeNames = digraph.nodes();
    var nodes = new Array(nodeNames.length);
    nodeNames.forEach(function(name, i) {
      var v = (nodes[i] = digraph.node(name));
      v.id = i;
      v.name = name;
    });
    const dedges = <any[]>(digraph as any)._edges;
    let edges = [];
    for (let edge of dedges) {
      edges.push({
        source: digraph.node(edge.v).id,
        target: digraph.node(edge.w).id,
      });
    }
    createPowerGraph({ nodes: nodes, links: edges });
  });
}
