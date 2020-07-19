// https://github.com/d3/d3-sankey Version 0.7.1. Copyright 2017 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array'), require('d3-collection'), require('d3-shape'))
    : typeof define === 'function' && define.amd ? define(['exports', 'd3-array', 'd3-collection', 'd3-shape'], factory)
      : (factory((global.d3 = global.d3 || {}), global.d3, global.d3, global.d3));
}(this, ((exports, d3Array, d3Collection, d3Shape) => {
  function targetDepth(d) {
    return d.target.depth;
  }

  function left(node) {
    return node.depth;
  }

  function right(node, n) {
    return n - 1 - node.height;
  }

  function justify(node, n) {
    return node.sourceLinks.length ? node.depth : n - 1;
  }

  function center(node) {
    return node.targetLinks.length ? node.depth
      : node.sourceLinks.length ? d3Array.min(node.sourceLinks, targetDepth) - 1
        : 0;
  }

  function constant(x) {
    return function () {
      return x;
    };
  }

  function ascendingSourceBreadth(a, b) {
    return ascendingBreadth(a.source, b.source) || a.index - b.index;
  }

  function ascendingTargetBreadth(a, b) {
    return ascendingBreadth(a.target, b.target) || a.index - b.index;
  }

  function ascendingBreadth(a, b) {
    return a.y0 - b.y0;
  }

  function value(d) {
    return d.value;
  }

  function nodeCenter(node) {
    return (node.y0 + node.y1) / 2;
  }

  function weightedSource(link) {
    return nodeCenter(link.source) * link.value;
  }

  function weightedTarget(link) {
    return nodeCenter(link.target) * link.value;
  }

  function defaultId(d) {
    return d.index;
  }

  function defaultNodes(graph) {
    return graph.nodes;
  }

  function defaultLinks(graph) {
    return graph.links;
  }

  function find(nodeById, id) {
    const node = nodeById.get(id);
    if (!node) throw new Error(`missing: ${id}`);
    return node;
  }

  const sankey = function () {
    let x0 = 0; let y0 = 0; let x1 = 1; let y1 = 1;
    // extent

    let dx = 24;
    // nodeWidth

    let py = 8;
    // nodePadding

    let id = defaultId;


    let align = justify;


    let nodes = defaultNodes;


    let links = defaultLinks;


    let iterations = 32;

    function sankey() {
      const graph = { nodes: nodes(...arguments), links: links(...arguments) };
      computeNodeLinks(graph);
      computeNodeValues(graph);
      computeNodeDepths(graph);
      computeNodeBreadths(graph, iterations);
      computeLinkBreadths(graph);
      return graph;
    }

    sankey.update = function (graph) {
      computeLinkBreadths(graph);
      return graph;
    };

    sankey.nodeId = function (_) {
      return arguments.length ? (id = typeof _ === 'function' ? _ : constant(_), sankey) : id;
    };

    sankey.nodeAlign = function (_) {
      return arguments.length ? (align = typeof _ === 'function' ? _ : constant(_), sankey) : align;
    };

    sankey.nodeWidth = function (_) {
      return arguments.length ? (dx = +_, sankey) : dx;
    };

    sankey.nodePadding = function (_) {
      return arguments.length ? (py = +_, sankey) : py;
    };

    sankey.nodes = function (_) {
      return arguments.length ? (nodes = typeof _ === 'function' ? _ : constant(_), sankey) : nodes;
    };

    sankey.links = function (_) {
      return arguments.length ? (links = typeof _ === 'function' ? _ : constant(_), sankey) : links;
    };

    sankey.size = function (_) {
      return arguments.length ? (x0 = y0 = 0, x1 = +_[0], y1 = +_[1], sankey) : [x1 - x0, y1 - y0];
    };

    sankey.extent = function (_) {
      return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], sankey) : [[x0, y0], [x1, y1]];
    };

    sankey.iterations = function (_) {
      return arguments.length ? (iterations = +_, sankey) : iterations;
    };

    // Populate the sourceLinks and targetLinks for each node.
    // Also, if the source and target are not objects, assume they are indices.
    function computeNodeLinks(graph) {
      graph.nodes.forEach((node, i) => {
        node.index = i;
        node.sourceLinks = [];
        node.targetLinks = [];
      });
      const nodeById = d3Collection.map(graph.nodes, id);
      graph.links.forEach((link, i) => {
        link.index = i;
        let source = link.source; let
          target = link.target;
        if (typeof source !== 'object') source = link.source = find(nodeById, source);
        if (typeof target !== 'object') target = link.target = find(nodeById, target);
        source.sourceLinks.push(link);
        target.targetLinks.push(link);
      });
    }

    // Compute the value (size) of each node by summing the associated links.
    function computeNodeValues(graph) {
      graph.nodes.forEach((node) => {
        node.value = node.totalCapacity;
        // node.value = Math.max(
        //   d3Array.sum(node.sourceLinks, value),
        //   d3Array.sum(node.targetLinks, value),
        // );
      });
    }

    // Iteratively assign the depth (x-position) for each node.
    // Nodes are assigned the maximum depth of incoming neighbors plus one;
    // nodes with no incoming links are assigned depth zero, while
    // nodes with no outgoing links are assigned the maximum depth.
    function computeNodeDepths(graph) {
      let nodes; let next; let
        x;

      for (nodes = graph.nodes, next = [], x = 0; nodes.length; ++x, nodes = next, next = []) {
        nodes.forEach((node) => {
          node.depth = x;
          node.sourceLinks.forEach((link) => {
            if (next.indexOf(link.target) < 0) {
              next.push(link.target);
            }
          });
        });
      }

      for (nodes = graph.nodes, next = [], x = 0; nodes.length; ++x, nodes = next, next = []) {
        nodes.forEach((node) => {
          node.height = x;
          node.targetLinks.forEach((link) => {
            if (next.indexOf(link.source) < 0) {
              next.push(link.source);
            }
          });
        });
      }

      const kx = (x1 - x0 - dx) / (x - 1);
      graph.nodes.forEach((node) => {
        node.x1 = (node.x0 = x0 + Math.max(0, Math.min(x - 1, Math.floor(align.call(null, node, x)))) * kx) + dx;
      });
    }

    function computeNodeBreadths(graph) {
      const columns = d3Collection.nest()
        .key(d => d.x0)
        .sortKeys(d3Array.ascending)
        .entries(graph.nodes)
        .map(d => d.values);

      //
      initializeNodeBreadth();
      resolveCollisions();
      for (let alpha = 1, n = iterations; n > 0; --n) {
        relaxRightToLeft(alpha *= 0.99);
        resolveCollisions();
        relaxLeftToRight(alpha);
        resolveCollisions();
      }

      function initializeNodeBreadth() {
        const ky = d3Array.min(columns, nodes => (y1 - y0 - (nodes.length - 1) * py) / d3Array.sum(nodes, value));

        columns.forEach((nodes) => {
          nodes.forEach((node, i) => {
            node.y1 = (node.y0 = i) + node.value * ky;
          });
        });

        graph.links.forEach((link) => {
          link.width = link.value * ky;
        });
      }

      function relaxLeftToRight(alpha) {
        columns.forEach((nodes) => {
          nodes.forEach((node) => {
            if (node.targetLinks.length) {
              const dy = (d3Array.sum(node.targetLinks, weightedSource) / d3Array.sum(node.targetLinks, value) - nodeCenter(node)) * alpha;
              node.y0 += dy, node.y1 += dy;
            }
          });
        });
      }

      function relaxRightToLeft(alpha) {
        columns.slice().reverse().forEach((nodes) => {
          nodes.forEach((node) => {
            if (node.sourceLinks.length) {
              const dy = (d3Array.sum(node.sourceLinks, weightedTarget) / d3Array.sum(node.sourceLinks, value) - nodeCenter(node)) * alpha;
              node.y0 += dy, node.y1 += dy;
            }
          });
        });
      }

      function resolveCollisions() {
        columns.forEach((nodes) => {
          let node;


          let dy;


          let y = y0;


          const n = nodes.length;


          let i;

          // Push any overlapping nodes down.
          nodes.sort(ascendingBreadth);
          for (i = 0; i < n; ++i) {
            node = nodes[i];
            dy = y - node.y0;
            if (dy > 0) node.y0 += dy, node.y1 += dy;
            y = node.y1 + py;
          }

          // If the bottommost node goes outside the bounds, push it back up.
          dy = y - py - y1;
          if (dy > 0) {
            y = (node.y0 -= dy), node.y1 -= dy;

            // Push any overlapping nodes back up.
            for (i = n - 2; i >= 0; --i) {
              node = nodes[i];
              dy = node.y1 + py - y;
              if (dy > 0) node.y0 -= dy, node.y1 -= dy;
              y = node.y0;
            }
          }
        });
      }
    }

    function computeLinkBreadths(graph) {
      graph.nodes.forEach((node) => {
        node.sourceLinks.sort(ascendingTargetBreadth);
        node.targetLinks.sort(ascendingSourceBreadth);
      });
      graph.nodes.forEach((node) => {
        let y0 = node.y0; let
          y1 = y0;
        node.sourceLinks.forEach((link) => {
          link.y0 = y0 + link.width / 2, y0 += link.width;
        });
        node.targetLinks.forEach((link) => {
          link.y1 = y1 + link.width / 2, y1 += link.width;
        });
      });
    }

    return sankey;
  };

  function horizontalSource(d) {
    return [d.source.x1, d.y0];
  }

  function horizontalTarget(d) {
    return [d.target.x0, d.y1];
  }

  const sankeyLinkHorizontal = function () {
    return d3Shape.linkHorizontal()
      .source(horizontalSource)
      .target(horizontalTarget);
  };

  exports.sankey = sankey;
  exports.sankeyCenter = center;
  exports.sankeyLeft = left;
  exports.sankeyRight = right;
  exports.sankeyJustify = justify;
  exports.sankeyLinkHorizontal = sankeyLinkHorizontal;

  Object.defineProperty(exports, '__esModule', { value: true });
})));
