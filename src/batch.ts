import { LayoutInputNode, LayoutLink, Layout } from "./layout";
import { GridRouter } from "./gridrouter";

/**
 * @property nudgeGap spacing between parallel edge segments
 * @property margin space around nodes
 * @property groupMargin space around groups
 */
export function gridify(
  pgLayout,
  nudgeGap: number,
  margin: number,
  groupMargin: number
) {
  pgLayout.cola.start(0, 0, 0, 10, false);
  const nodes = pgLayout.cola.nodes();
  const groups = pgLayout.cola.groups();
  const edges = pgLayout.powerGraph.powerEdges;
  const source = (e) => e.source.routerNode.id;
  const target = (e) => e.target.routerNode.id;

  return mkRouter(nodes, groups, margin, groupMargin).routeEdges<any>(
    edges,
    nudgeGap,
    source,
    target
  );
}

function mkRouter(nodes, groups, margin: number, groupMargin: number) {
  const routerNodes = nodes
    .map((d) => {
      return {
        name: d.name,
        bounds: d.bounds.inflate(-margin),
      };
    })
    .concat(
      groups.map((d) => {
        const hasLeaves = typeof d.leaves !== "undefined";
        const leaves = hasLeaves ? d.leaves.map((c) => c.index) : [];
        const hasGroups = typeof d.groups !== "undefined";
        const g = hasGroups ? d.groups.map((c) => nodes.length + c.id) : [];
        const children = g.concat(leaves);
        const bounds = d.bounds.inflate(-groupMargin);
        return { bounds, children };
      })
    )
    .map((d, i) => {
      d.id = i;
      return d;
    });

  const accessor = {
    getChildren: (v: any) => v.children,
    getBounds: (v) => v.bounds,
  };

  const groupPadding = margin - groupMargin;

  return new GridRouter(routerNodes, accessor, groupPadding);
}

export function powerGraphGridLayout(
  graph: { nodes: LayoutInputNode[]; links: LayoutLink<LayoutInputNode>[] },
  size: number[],
  grouppadding: number
) {
  var powerGraph;
  graph.nodes.forEach((v, i) => ((<any>v).index = i));
  new Layout()
    .avoidOverlaps(false)
    .nodes(graph.nodes)
    .links(graph.links)
    .powerGraphGroups(function(d) {
      powerGraph = d;
      powerGraph.groups.forEach((v) => (v.padding = grouppadding));
    });

  var n = graph.nodes.length;
  var edges = [];
  var vs = graph.nodes.slice(0);
  vs.forEach((v, i) => ((<any>v).index = i));

  powerGraph.groups.forEach((g) => {
    var sourceInd = (g.index = g.id + n);
    vs.push(g);
    if (typeof g.leaves !== "undefined")
      g.leaves.forEach((v) =>
        edges.push({ source: sourceInd, target: v.index })
      );
    if (typeof g.groups !== "undefined")
      g.groups.forEach((gg) =>
        edges.push({ source: sourceInd, target: gg.id + n })
      );
  });

  powerGraph.powerEdges.forEach((e) => {
    edges.push({ source: e.source.index, target: e.target.index });
  });

  // layout the flat graph with dummy nodes and edges
  new Layout()
    .size(size)
    .nodes(vs)
    .links(edges)
    .avoidOverlaps(false)
    .linkDistance(30)
    .symmetricDiffLinkLengths(5)
    .convergenceThreshold(1e-4)
    .start(100, 0, 0, 0, false);

  return {
    cola: new Layout()
      .convergenceThreshold(1e-3)
      .size(size)
      .avoidOverlaps(true)
      .nodes(graph.nodes)
      .links(graph.links)
      .groupCompactness(1e-4)
      .linkDistance(30)
      .symmetricDiffLinkLengths(5)
      .powerGraphGroups(function(d) {
        powerGraph = d;
        powerGraph.groups.forEach(function(v) {
          v.padding = grouppadding;
        });
      })
      .start(50, 0, 100, 0, false),
    powerGraph: powerGraph,
  };
}
