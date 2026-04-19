(() => {
  const FLOOR_GAP = 220;
  const DEFAULT_STAIR_COST = 6.0;
  const DEFAULT_ELEVATOR_COST = 4.0;
  const EXTERIOR_TO_BUILDING_COST = 1.0;

  const MANUAL_ENTRANCE_BINDINGS = {
    "Entrance 1": "osm-node-5861595676",
    "Entrance 2": "osm-node-5863721909",
    "Entrance 3": "osm-node-5861595671",
    "Entrance 4": "osm-node-12057911483",
    "Entrance 5": "osm-node-12016281847",
    "Entrance 6": "osm-node-12016281847",
    "Entrance 7": "osm-node-10123224954",
    "Entrance 8": "osm-node-10123224954",
    "North Entrance": "osm-node-12217284210",
    "South Entrance": "osm-node-7706177462",
    "Plumas:Entrance 1": "osm-node-5862340455",
    "Plumas:Entrance 2": "osm-node-12058464553",
    "Plumas:Entrance 3": "osm-node-5849825672"
  };

  let cachedKey = null;
  let cachedGraph = null;

  function makeUid(buildingId, floorLevel, nodeId) {
    return `${buildingId}:${floorLevel}:${nodeId}`;
  }

  function visualZForFloor(floorLevel) {
    return floorLevel * FLOOR_GAP;
  }

  function addAdjEdge(adjacency, fromId, toId, cost, kind, bidirectional = true) {
    if (!adjacency.has(fromId)) adjacency.set(fromId, []);
    adjacency.get(fromId).push({ to: toId, cost, kind });

    if (bidirectional) {
      if (!adjacency.has(toId)) adjacency.set(toId, []);
      adjacency.get(toId).push({ to: fromId, cost, kind });
    }
  }

  function distanceScaled(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function pairNearestTransitions(lowerFloorNodes, upperFloorNodes) {
    const pairs = [];
    const usedUpper = new Set();

    for (const a of lowerFloorNodes) {
      let bestIndex = -1;
      let bestDist = Infinity;

      for (let i = 0; i < upperFloorNodes.length; i++) {
        if (usedUpper.has(i)) continue;
        const b = upperFloorNodes[i];
        const dx = a.raw.x - b.raw.x;
        const dy = a.raw.y - b.raw.y;
        const d = Math.hypot(dx, dy);

        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        usedUpper.add(bestIndex);
        pairs.push([a, upperFloorNodes[bestIndex]]);
      }
    }

    return pairs;
  }

  function reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      path.push(current);
    }
    return path.reverse();
  }

  function centroidFor(nodes) {
    if (!nodes.length) return { cx: 0, cy: 0 };
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    return {
      cx: (Math.min(...xs) + Math.max(...xs)) / 2,
      cy: (Math.min(...ys) + Math.max(...ys)) / 2
    };
  }

  class MinHeap {
    constructor() {
      this.data = [];
    }

    push(item) {
      this.data.push(item);
      this.bubbleUp(this.data.length - 1);
    }

    pop() {
      if (this.data.length === 0) return null;
      const top = this.data[0];
      const end = this.data.pop();
      if (this.data.length > 0) {
        this.data[0] = end;
        this.bubbleDown(0);
      }
      return top;
    }

    bubbleUp(index) {
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (this.data[parent].priority <= this.data[index].priority) break;
        [this.data[parent], this.data[index]] = [this.data[index], this.data[parent]];
        index = parent;
      }
    }

    bubbleDown(index) {
      const length = this.data.length;
      while (true) {
        let left = index * 2 + 1;
        let right = index * 2 + 2;
        let smallest = index;

        if (left < length && this.data[left].priority < this.data[smallest].priority) {
          smallest = left;
        }
        if (right < length && this.data[right].priority < this.data[smallest].priority) {
          smallest = right;
        }
        if (smallest === index) break;

        [this.data[index], this.data[smallest]] = [this.data[smallest], this.data[index]];
        index = smallest;
      }
    }
  }

  function cacheKeyFor(graphs, mode) {
    const parts = graphs.map((g) => {
      const nodeCount = Array.isArray(g.data?.nodes) ? g.data.nodes.length : 0;
      const edgeCount = Array.isArray(g.data?.edges) ? g.data.edges.length : 0;
      return `${g.path}|${g.buildingKey}|${g.floorLevelOverride}|${nodeCount}|${edgeCount}`;
    });
    return `${mode}::${parts.sort().join("||")}`;
  }

  function getModeCosts(mode) {
    if (mode === "accessible") {
      return {
        stairCost: Infinity,
        elevatorCost: DEFAULT_ELEVATOR_COST
      };
    }

    if (mode === "stairs") {
      return {
        stairCost: 3.0,
        elevatorCost: 8.0
      };
    }

    return {
      stairCost: DEFAULT_STAIR_COST,
      elevatorCost: DEFAULT_ELEVATOR_COST
    };
  }

  function buildCombinedGraph(graphs, mode) {
    const key = cacheKeyFor(graphs, mode);
    if (cachedKey === key && cachedGraph) return cachedGraph;

    const costs = getModeCosts(mode);

    const floors = graphs.map((entry) => ({
      buildingKey: entry.buildingKey,
      buildingId: entry.buildingIdOverride || entry.rawProject?.buildingId || entry.buildingKey,
      buildingLabel: entry.buildingLabelOverride || entry.rawProject?.buildingName || entry.buildingKey,
      floorLevel: entry.floorLevelOverride ?? entry.rawProject?.floorLevel ?? 0,
      floorLabel: entry.floorLabelOverride || `Floor ${entry.floorLevelOverride ?? entry.rawProject?.floorLevel ?? 0}`,
      pixelsPerMeter: entry.data?.calibration?.pixelsPerMeter || 50,
      data: entry.data,
      path: entry.path
    }));

    const floorLookup = new Map(floors.map((f) => [`${f.buildingKey}:${f.floorLevel}`, f]));
    const holtPPM = floorLookup.get("holt:1")?.pixelsPerMeter || 16.41385;
    const campusPPM = floorLookup.get("campus:0")?.pixelsPerMeter || 1.28326;
    const oconnellPPM =
      floorLookup.get("oconnell:1")?.pixelsPerMeter ||
      floorLookup.get("oconnell:2")?.pixelsPerMeter ||
      21.88513;

    const campusScale = holtPPM / campusPPM;
    const oconnellScale = holtPPM / oconnellPPM;

    const rawNodes = [];
    for (const floor of floors) {
      for (const n of floor.data.nodes || []) {
        rawNodes.push({
          ...n,
          uid: makeUid(floor.buildingId, floor.floorLevel, n.id),
          floorKey: `${floor.buildingKey}:${floor.floorLevel}`,
          floorLevel: floor.floorLevel,
          floorLabel: floor.floorLabel,
          buildingKey: floor.buildingKey,
          buildingId: floor.buildingId,
          buildingLabel: floor.buildingLabel,
          pixelsPerMeter: floor.pixelsPerMeter
        });
      }
    }

    const buildingCentroids = new Map();
    for (const buildingKey of [...new Set(rawNodes.map((n) => n.buildingKey))]) {
      buildingCentroids.set(
        buildingKey,
        centroidFor(rawNodes.filter((n) => n.buildingKey === buildingKey))
      );
    }

    function scaleForBuilding(buildingKey) {
      if (buildingKey === "campus") return campusScale;
      if (buildingKey === "oconnell") return oconnellScale;
      return 1.0;
    }

    const allNodes = rawNodes.map((n) => {
      const c = buildingCentroids.get(n.buildingKey) || { cx: 0, cy: 0 };
      const scale = scaleForBuilding(n.buildingKey);

      return {
        ...n,
        raw: { x: n.x, y: n.y },
        x: (n.x - c.cx) * scale,
        y: -(n.y - c.cy) * scale,
        z: visualZForFloor(n.floorLevel)
      };
    });

    const nodeMap = new Map();
    const adjacency = new Map();

    for (const n of allNodes) {
      nodeMap.set(n.uid, n);
      adjacency.set(n.uid, []);
    }

    for (const floor of floors) {
      for (const e of floor.data.edges || []) {
        const from = makeUid(floor.buildingId, floor.floorLevel, e.from);
        const to = makeUid(floor.buildingId, floor.floorLevel, e.to);
        const cost = Number.isFinite(e.lengthMeters) ? e.lengthMeters : 1.0;
        addAdjEdge(adjacency, from, to, cost, "walkway", !!e.bidirectional);
      }
    }

    for (const buildingKey of [...new Set(floors.map((f) => f.buildingKey).filter((k) => k !== "campus"))]) {
      const buildingFloors = floors
        .filter((f) => f.buildingKey === buildingKey)
        .sort((a, b) => a.floorLevel - b.floorLevel);

      for (let i = 0; i < buildingFloors.length - 1; i++) {
        const low = allNodes.filter(
          (n) =>
            n.buildingKey === buildingKey &&
            n.floorLevel === buildingFloors[i].floorLevel &&
            n.kind === "transition"
        );

        const high = allNodes.filter(
          (n) =>
            n.buildingKey === buildingKey &&
            n.floorLevel === buildingFloors[i + 1].floorLevel &&
            n.kind === "transition"
        );

        for (const [a, b] of pairNearestTransitions(low, high)) {
          if (Number.isFinite(costs.stairCost)) {
            addAdjEdge(adjacency, a.uid, b.uid, costs.stairCost, "stairs", true);
          }
        }
      }
    }

    for (const buildingKey of [...new Set(allNodes.map((n) => n.buildingKey).filter((k) => k !== "campus"))]) {
      const portals = allNodes.filter(
        (n) => n.buildingKey === buildingKey && n.kind === "portal"
      );

      for (let i = 0; i < portals.length; i++) {
        for (let j = i + 1; j < portals.length; j++) {
          if (portals[i].floorLevel === portals[j].floorLevel) continue;
          addAdjEdge(adjacency, portals[i].uid, portals[j].uid, costs.elevatorCost, "elevator", true);
        }
      }
    }

    const campusNodes = allNodes.filter((n) => n.buildingKey === "campus");

    for (const buildingKey of [...new Set(allNodes.map((n) => n.buildingKey).filter((k) => k !== "campus"))]) {
      const groundEntrances = allNodes.filter(
        (n) =>
          n.buildingKey === buildingKey &&
          n.floorLevel === 1 &&
          n.kind === "entrance"
      );

      for (const entrance of groundEntrances) {
        let chosenCampus = null;

        const manualCampusId =
          MANUAL_ENTRANCE_BINDINGS[entrance.label] ||
          MANUAL_ENTRANCE_BINDINGS[`${buildingKey}:${entrance.label}`];

        if (manualCampusId) {
          const cleanId = String(manualCampusId).replace(/@0$/, "");
          chosenCampus = campusNodes.find((n) => n.id === cleanId);
        }

        if (!chosenCampus) {
          let bestDist = Infinity;
          for (const campus of campusNodes) {
            const d = distanceScaled(entrance, campus);
            if (d < bestDist) {
              bestDist = d;
              chosenCampus = campus;
            }
          }
        }

        if (chosenCampus) {
          addAdjEdge(adjacency, chosenCampus.uid, entrance.uid, EXTERIOR_TO_BUILDING_COST, "building-entry", true);
        }
      }
    }

    cachedKey = key;
    cachedGraph = { allNodes, nodeMap, adjacency };
    return cachedGraph;
  }

  function routeNoteForMode(mode) {
    return "";
  }

  function labelForNode(node) {
    return `${node.label || node.id} · ${node.buildingLabel} · Floor ${node.floorLevel}`;
  }

  function summarizePath(pathNodes) {
    const steps = [];

    if (!pathNodes.length) return steps;

    steps.push({
      title: "Start",
      detail: labelForNode(pathNodes[0])
    });

    for (let i = 1; i < pathNodes.length - 1; i++) {
      const prev = pathNodes[i - 1];
      const current = pathNodes[i];
      const next = pathNodes[i + 1];

      const floorChanged = prev.floorLevel !== next.floorLevel;
      const buildingChanged = prev.buildingKey !== next.buildingKey || current.buildingKey !== next.buildingKey;

      if (current.kind === "portal" && floorChanged) {
        steps.push({
          title: "Use elevator",
          detail: labelForNode(current)
        });
        continue;
      }

      if (current.kind === "transition" && floorChanged) {
        steps.push({
          title: "Use stairs",
          detail: labelForNode(current)
        });
        continue;
      }

      if (current.kind === "entrance" && buildingChanged) {
        steps.push({
          title: current.buildingKey === "campus" ? "Move through campus" : "Use entrance",
          detail: labelForNode(current)
        });
      }
    }

    steps.push({
      title: "Destination",
      detail: labelForNode(pathNodes[pathNodes.length - 1])
    });

    return steps;
  }

  async function runShortestPath(startId, goalId, graph) {
    const { allNodes, nodeMap, adjacency } = graph;

    if (!nodeMap.has(startId) || !nodeMap.has(goalId)) {
      throw new Error("Start or destination node was not found in the combined graph.");
    }

    const cameFrom = new Map();
    const dist = new Map();
    const closed = new Set();
    const heap = new MinHeap();

    for (const n of allNodes) {
      dist.set(n.uid, Infinity);
    }

    dist.set(startId, 0);
    heap.push({ id: startId, priority: 0 });

    while (true) {
      let popped = heap.pop();
      while (popped && closed.has(popped.id)) {
        popped = heap.pop();
      }

      if (!popped) break;

      const current = popped.id;
      if (current === goalId) break;
      closed.add(current);

      for (const edge of adjacency.get(current) || []) {
        if (closed.has(edge.to)) continue;

        const tentative = dist.get(current) + edge.cost;
        if (tentative < dist.get(edge.to)) {
          cameFrom.set(edge.to, current);
          dist.set(edge.to, tentative);
          heap.push({ id: edge.to, priority: tentative });
        }
      }
    }

    if (!cameFrom.has(goalId) && startId !== goalId) {
      return null;
    }

    const finalPathIds = startId === goalId ? [startId] : reconstructPath(cameFrom, goalId);
    const finalPathNodes = finalPathIds.map((id) => nodeMap.get(id));

    return {
      cost: dist.get(goalId),
      pathIds: finalPathIds,
      pathNodes: finalPathNodes
    };
  }

function colorForKind(kind) {
  switch (kind) {
    case "entrance": return "green";
    case "destination": return "red";
    case "junction": return "purple";
    case "anchor": return "gray";
    case "portal": return "cyan";
    case "transition": return "gold";
    default: return "blue";
  }
}

function buildLineTrace(nodeMap, adjacency, edgeKind, name, color, width) {
  const x = [];
  const y = [];
  const z = [];
  const seen = new Set();

  for (const [fromId, edges] of adjacency.entries()) {
    for (const edge of edges) {
      if (edge.kind !== edgeKind) continue;
      const key = [fromId, edge.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const a = nodeMap.get(fromId);
      const b = nodeMap.get(edge.to);
      if (!a || !b) continue;

      x.push(a.x, b.x, null);
      y.push(a.y, b.y, null);
      z.push(a.z, b.z, null);
    }
  }

  return {
    type: "scatter3d",
    mode: "lines",
    name,
    x, y, z,
    hoverinfo: "none",
    line: { color, width }
  };
}

function makeScatterForIds(nodeMap, name, ids, color, size) {
  return {
    type: "scatter3d",
    mode: "markers",
    name,
    x: ids.map((id) => nodeMap.get(id)?.x).filter((v) => v != null),
    y: ids.map((id) => nodeMap.get(id)?.y).filter((v) => v != null),
    z: ids.map((id) => nodeMap.get(id)?.z).filter((v) => v != null),
    text: ids
      .map((id) => nodeMap.get(id))
      .filter(Boolean)
      .map((n) => `${n.label || n.id} · ${n.buildingLabel} · Floor ${n.floorLevel}`),
    hoverinfo: "text",
    marker: { size, color }
  };
}

function makePathTrace(pathNodes, name, color, width) {
  return {
    type: "scatter3d",
    mode: "lines+markers",
    name,
    x: pathNodes.map((n) => n.x),
    y: pathNodes.map((n) => n.y),
    z: pathNodes.map((n) => n.z),
    hoverinfo: "none",
    line: { color, width },
    marker: { color, size: 5 }
  };
}

function renderPlot(graph, startId, goalId, pathNodes = []) {
  const plotEl = document.getElementById("plot");
  if (!plotEl || !window.Plotly) return;

  const { allNodes, nodeMap, adjacency } = graph;

  const nodeTrace = {
    type: "scatter3d",
    mode: "markers",
    name: "nodes",
    x: allNodes.map((n) => n.x),
    y: allNodes.map((n) => n.y),
    z: allNodes.map((n) => n.z),
    text: allNodes.map((n) => `${n.label || n.id} · ${n.buildingLabel} · Floor ${n.floorLevel} [${n.kind}]`),
    hoverinfo: "text",
    marker: {
      size: 4,
      color: allNodes.map((n) => colorForKind(n.kind)),
      opacity: 0.82
    }
  };

  const traces = [
    buildLineTrace(nodeMap, adjacency, "walkway", "walkways", "lightgray", 3),
    buildLineTrace(nodeMap, adjacency, "stairs", "stairs", "saddlebrown", 6),
    buildLineTrace(nodeMap, adjacency, "elevator", "elevators", "teal", 6),
    buildLineTrace(nodeMap, adjacency, "building-entry", "entry links", "black", 5),
    nodeTrace,
    makeScatterForIds(nodeMap, "start", startId ? [startId] : [], "lime", 10),
    makeScatterForIds(nodeMap, "goal", goalId ? [goalId] : [], "red", 10),
    makePathTrace(pathNodes, "path", "magenta", 8)
  ];

  Plotly.react(plotEl, traces, {
    margin: { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      aspectmode: "data",
      camera: { eye: { x: 1.5, y: -1.7, z: 1.2 } }
    },
    legend: { x: 0.01, y: 0.99 }
  }, { responsive: true });
}

  window.WayfinderEngine = {
    async findRoute({ start, destination, mode, graphs }) {
      const graph = buildCombinedGraph(graphs, mode);
      const startId = start?.node?.uid;
      const goalId = destination?.node?.uid;

      const result = await runShortestPath(startId, goalId, graph);

      if (!result) {
        return {
          ok: false,
          summary: "No path found.",
          note: "The graph loaded, but no connected route exists between those selections."
        };
      }

      renderPlot(graph, startId, goalId, result.pathNodes);

      return {
        ok: true,
        summary: `Route found. Cost ${result.cost.toFixed(2)} across ${result.pathNodes.length} nodes.`,
        note: routeNoteForMode(mode),
        steps: summarizePath(result.pathNodes),
        path: result.pathNodes.map((n) => ({
          uid: n.uid,
          id: n.id,
          label: n.label || n.id,
          buildingKey: n.buildingKey,
          buildingLabel: n.buildingLabel,
          floorLevel: n.floorLevel,
          kind: n.kind,
          x: n.x,
          y: n.y,
          z: n.z
        }))
      };
    }
  };
})();