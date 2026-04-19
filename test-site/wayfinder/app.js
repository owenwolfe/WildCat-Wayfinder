const state = {
  manifest: null,
  rawGraphs: [],
  allNodes: [],
  classRecords: [],
  classIndex: [],
  supportedClasses: new Map(),
  selectedStart: null,
  selectedDestination: null,
  healthIssues: [],
  routeMapGroups: [],
  routeMapIndex: 0
};

const els = {
  loadDataBtn: document.getElementById("loadDataBtn"),
  dataStatus: document.getElementById("dataStatus"),
  dataSummary: document.getElementById("dataSummary"),
  buildingFilter: document.getElementById("buildingFilter"),
  floorFilter: document.getElementById("floorFilter"),
  //routeMode: document.getElementById("routeMode"),
  routeMode: null,
  startMode: document.getElementById("startMode"),
  destinationMode: document.getElementById("destinationMode"),
  startInput: document.getElementById("startInput"),
  destinationInput: document.getElementById("destinationInput"),
  startSuggestions: document.getElementById("startSuggestions"),
  destinationSuggestions: document.getElementById("destinationSuggestions"),
  startSelection: document.getElementById("startSelection"),
  destinationSelection: document.getElementById("destinationSelection"),
  resolveBtn: document.getElementById("resolveBtn"),
  previewBtn: document.getElementById("previewBtn"),
  resetBtn: document.getElementById("resetBtn"),
  metricBuildings: document.getElementById("metricBuildings"),
  metricFloors: document.getElementById("metricFloors"),
  metricClasses: document.getElementById("metricClasses"),
  floorPreviewLabel: document.getElementById("floorPreviewLabel"),
  floorPreview: document.getElementById("floorPreview"),
  routeStatus: document.getElementById("routeStatus"),
  routeSummary: document.getElementById("routeSummary"),
  routeMapLabel: document.getElementById("routeMapLabel"),
  routeMapImage: document.getElementById("routeMapImage"),
  routeMapOverlay: document.getElementById("routeMapOverlay"),
  routePolyline: document.getElementById("routePolyline"),
  routeMapStepLabel: document.getElementById("routeMapStepLabel"),
  routePrevBtn: document.getElementById("routePrevBtn"),
  routeNextBtn: document.getElementById("routeNextBtn"),
  classCoverage: document.getElementById("classCoverage"),
  healthPanel: document.getElementById("healthPanel")
};

const normalize = (value) => String(value || "").trim().toLowerCase();

function setStatus(text, kind = "") {
  els.dataStatus.textContent = text;
  els.dataStatus.className = `status-pill ${kind}`.trim();
}

function uid(buildingId, floorLevel, nodeId) {
  return `${buildingId || "unknown"}:${floorLevel ?? "na"}:${nodeId}`;
}

function getSelectedBuilding() {
  return els.buildingFilter.value || "all";
}

function getSelectedFloor() {
  return els.floorFilter.value || "all";
}

function currentFilter() {
  const building = getSelectedBuilding();
  const floor = getSelectedFloor();
  if (floor === "all") {
    return { building, floor: null };
  }
  const [buildingId, floorValue] = floor.split(":");
  return {
    building: building === "all" ? buildingId : building,
    floor: { buildingId, floorLevel: Number(floorValue) }
  };
}

function matchesCurrentFilter(entity, scope = "both") {
  const filter = currentFilter();

  if (scope === "destination") {
    return true;
  }

  if (filter.building !== "all" && entity.buildingKey !== filter.building) return false;
  if (filter.floor) {
    if (entity.buildingKey !== filter.floor.buildingId) return false;
    if (Number(entity.floorLevel) !== Number(filter.floor.floorLevel)) return false;
  }
  return true;
}

function getAllFloorOptions() {
  if (!state.manifest) return [];
  return state.manifest.buildings.flatMap((building) =>
    building.floors.map((floor) => ({
      value: `${building.id}:${floor.floorLevelOverride}`,
      label: `${building.label} · ${floor.floorLabelOverride}`,
      buildingId: building.id,
      floorLevel: floor.floorLevelOverride
    }))
  );
}

function getNodeDisplay(node) {
  const details = [node.buildingLabel || node.buildingId, node.floorLabel || `Floor ${node.floorLevel}`].filter(Boolean).join(" · ");
  return `${node.label}${details ? ` — ${details}` : ""}`;
}

function compareOption(a, b) {
  return [a.buildingLabel, a.floorLevel, a.label].join("|").localeCompare([b.buildingLabel, b.floorLevel, b.label].join("|"), undefined, { numeric: true, sensitivity: "base" });
}

function getFilteredNodePool(kind, scope = "both") {
  return state.allNodes.filter((node) => {
    if (!matchesCurrentFilter(node, scope)) return false;
    if (kind === "room") return node.kind === "destination" || Boolean(node.roomNumber);
    if (kind === "entrance") return node.kind === "entrance";
    return ["destination", "entrance"].includes(node.kind) || Boolean(node.roomNumber);
  });
}


function createLookupOptions(kind, query = "", scope = "both") {
  const q = normalize(query);
  const options = [];

  const nodeMatches = getFilteredNodePool(kind, scope)
    .filter((node) => {
      if (!q) return true;
      const haystack = [node.searchLabel, node.label, node.roomNumber, node.buildingLabel, node.floorLabel].map(normalize);
      return haystack.some((value) => value.includes(q));
    })
    .sort(compareOption);

  for (const node of nodeMatches) {
    options.push({
      value: node.searchLabel,
      detail: getNodeDisplay(node)
    });
  }

  if (kind === "class" || kind === "all") {
    const classMatches = state.classIndex
      .filter((entry) => matchesCurrentFilter(entry, scope))
      .filter((entry) => {
        if (!q) return true;
        const haystack = [entry.searchLabel, entry.label, entry.detail, entry.course?.subject, entry.course?.catalog_nbr, entry.meeting?.room]
          .map(normalize);
        return haystack.some((value) => value.includes(q));
      })
      .sort((a, b) => a.searchLabel.localeCompare(b.searchLabel, undefined, { numeric: true, sensitivity: "base" }));

    for (const entry of classMatches) {
      options.push({ value: entry.searchLabel, detail: entry.detail });
    }
  }

  const seen = new Set();
  return options.filter((option) => {
    const key = normalize(option.value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 200);
}

function renderDatalist(target, options) {
  target.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}"></option>`).join("");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clearRouteMap(message = "No floor selected") {
  state.routeMapGroups = [];
  state.routeMapIndex = 0;

  els.routeMapLabel.textContent = message;
  els.routeMapStepLabel.textContent = "No segment selected";
  els.routeMapImage.setAttribute("href", "");
  els.routeMapImage.setAttribute("width", "1000");
  els.routeMapImage.setAttribute("height", "1000");
  els.routePolyline.setAttribute("points", "");
  els.routeMapOverlay.setAttribute("viewBox", "0 0 1000 1000");

  if (els.routePrevBtn) els.routePrevBtn.disabled = true;
  if (els.routeNextBtn) els.routeNextBtn.disabled = true;
}

function updateRouteMapButtons() {
  const total = state.routeMapGroups.length;
  const current = state.routeMapIndex;

  els.routeMapStepLabel.textContent = total
    ? `${state.routeMapGroups[current].buildingLabel} · Floor ${state.routeMapGroups[current].floorLevel} · Step ${current + 1} of ${total}`
    : "No segment selected";

  if (els.routePrevBtn) els.routePrevBtn.disabled = current <= 0;
  if (els.routeNextBtn) els.routeNextBtn.disabled = current >= total - 1;
}

function renderRouteMapGroup(index) {
  const group = state.routeMapGroups[index];

  if (!group) {
    clearRouteMap();
    return;
  }

  const graphEntry = findGraphForFloor(group.buildingKey, group.floorLevel);
  const imageSrc = graphEntry?.data?.sourceImage?.dataUrl;

  state.routeMapIndex = index;
  updateRouteMapButtons();

  if (!graphEntry || !imageSrc) {
    els.routeMapLabel.textContent = `${group.buildingLabel} · Floor ${group.floorLevel}`;
    els.routeMapImage.setAttribute("href", "");
    els.routePolyline.setAttribute("points", "");
    els.routeMapOverlay.setAttribute("viewBox", "0 0 1000 1000");
    return;
  }

  const routeNodes = group.nodes
    .map((step) => state.allNodes.find((node) => node.uid === step.uid))
    .filter(Boolean);

  const points = routeNodes
    .map((node) => `${node.raw?.x ?? node.x},${node.raw?.y ?? node.y}`)
    .join(" ");

  els.routeMapLabel.textContent = `${group.buildingLabel} · Floor ${group.floorLevel}`;
  els.routePolyline.setAttribute("points", points);

  const loader = new Image();
  loader.onload = () => {
    const width = loader.naturalWidth || 1000;
    const height = loader.naturalHeight || 1000;

    els.routeMapImage.setAttribute("href", imageSrc);
    els.routeMapImage.setAttribute("x", "0");
    els.routeMapImage.setAttribute("y", "0");
    els.routeMapImage.setAttribute("width", String(width));
    els.routeMapImage.setAttribute("height", String(height));

    if (!routeNodes.length) {
      els.routeMapOverlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
      return;
    }

if (group.buildingKey !== "campus") {
  els.routeMapOverlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  return;
}

const xs = routeNodes.map((node) => node.raw?.x ?? node.x);
const ys = routeNodes.map((node) => node.raw?.y ?? node.y);

const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);

const pad = 120;
const viewX = Math.max(0, minX - pad);
const viewY = Math.max(0, minY - pad);
const viewMaxX = Math.min(width, maxX + pad);
const viewMaxY = Math.min(height, maxY + pad);
const viewW = Math.max(200, viewMaxX - viewX);
const viewH = Math.max(200, viewMaxY - viewY);

els.routeMapOverlay.setAttribute("viewBox", `${viewX} ${viewY} ${viewW} ${viewH}`);
  };

  loader.onerror = () => {
    els.routeMapImage.setAttribute("href", imageSrc);
    els.routeMapImage.setAttribute("width", "1000");
    els.routeMapImage.setAttribute("height", "1000");
    els.routeMapOverlay.setAttribute("viewBox", "0 0 1000 1000");
  };

  loader.src = imageSrc;
}

function getRouteFloorGroups(path) {
  const groups = [];
  let current = null;

  for (const step of path || []) {
    const key = `${step.buildingKey}:${step.floorLevel}`;
    if (!current || current.key !== key) {
      current = {
        key,
        buildingKey: step.buildingKey,
        buildingLabel: step.buildingLabel,
        floorLevel: step.floorLevel,
        nodes: []
      };
      groups.push(current);
    }
    current.nodes.push(step);
  }

  return groups;
}

function findGraphForFloor(buildingKey, floorLevel) {
  return state.rawGraphs.find((entry) =>
    entry.buildingKey === buildingKey &&
    Number(entry.floorLevelOverride) === Number(floorLevel)
  );
}

function renderRouteMap(result) {
  const groups = getRouteFloorGroups(result?.path || []);

  if (!groups.length) {
    clearRouteMap();
    return;
  }

  state.routeMapGroups = groups;
  state.routeMapIndex = 0;
  renderRouteMapGroup(0);
}

function renderSelection(element, entity) {
  if (!entity) {
    element.classList.add("empty");
    element.innerHTML = "No selection.";
    return;
  }
  element.classList.remove("empty");
  element.innerHTML = `
    <strong>${escapeHtml(entity.label)}</strong>
    <div>${escapeHtml(entity.typeLabel)}</div>
    <div class="small muted">${escapeHtml(entity.meta)}</div>
  `;
}

function renderFloorOptions() {
  const building = getSelectedBuilding();
  const options = [{ value: "all", label: "All floors" }].concat(
    getAllFloorOptions().filter((option) => building === "all" || option.buildingId === building)
  );
  els.floorFilter.innerHTML = options.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("");
}

function renderFloorPreview() {
  const building = getSelectedBuilding();
  const floor = getSelectedFloor();

  if (!state.allNodes.length) {
    els.floorPreviewLabel.textContent = "No floor selected";
    els.floorPreview.className = "preview-grid empty-state";
    els.floorPreview.textContent = "Load data to preview entrances, rooms, and nodes on a floor.";
    return;
  }

  let nodes = state.allNodes;
  if (building !== "all") nodes = nodes.filter((node) => node.buildingKey === building);
  if (floor !== "all") {
    const [buildingId, floorValue] = floor.split(":");
    nodes = nodes.filter((node) => node.buildingKey === buildingId && Number(node.floorLevel) === Number(floorValue));
  }

  const previewItems = [
    {
      title: "Entrances",
      items: nodes.filter((node) => node.kind === "entrance").map((node) => node.label)
    },
    {
      title: "Rooms / destinations",
      items: nodes.filter((node) => node.kind === "destination" || node.roomNumber).map((node) => node.label)
    },
    {
      title: "Vertical connectors",
      items: nodes.filter((node) => ["portal", "transition"].includes(node.kind)).map((node) => node.label)
    }
  ];

  const label = floor === "all"
    ? building === "all" ? "All mapped floors" : `${state.manifest.buildings.find((item) => item.id === building)?.label || building}`
    : getAllFloorOptions().find((option) => option.value === floor)?.label || floor;

  els.floorPreviewLabel.textContent = label;
  els.floorPreview.className = "preview-grid";
  els.floorPreview.innerHTML = previewItems.map((section) => `
    <article class="preview-card">
      <strong>${escapeHtml(section.title)}</strong>
      <div class="small muted">${section.items.length} items</div>
      <div>${section.items.slice(0, 12).map((item) => `<div>${escapeHtml(item)}</div>`).join("") || '<div class="muted">None</div>'}</div>
    </article>
  `).join("");
}

function renderClassCoverage() {
  if (!state.classRecords.length) {
    els.classCoverage.className = "stack-sm empty-state";
    els.classCoverage.textContent = "Load data to see which scheduled classes can resolve to mapped rooms.";
    return;
  }

  const supportedByCode = new Map();
  const missingByCode = new Map();

  for (const record of state.classIndex) {
    if (!supportedByCode.has(record.classCode)) supportedByCode.set(record.classCode, new Set());
    supportedByCode.get(record.classCode).add(record.meeting.room);
  }

  for (const issue of state.healthIssues.filter((item) => item.code === "class-room-missing")) {
    if (!missingByCode.has(issue.buildingCode)) missingByCode.set(issue.buildingCode, []);
    missingByCode.get(issue.buildingCode).push(issue.room);
  }

  const supportedBuildings = state.manifest.buildings.map((building) => ({
    building,
    supportedCount: [...(supportedByCode.get(building.classCode) || new Set())].length,
    missingRooms: missingByCode.get(building.classCode) || []
  }));

  els.classCoverage.className = "stack-sm";
  els.classCoverage.innerHTML = supportedBuildings.map(({ building, supportedCount, missingRooms }) => `
    <article class="coverage-item">
      <strong>${escapeHtml(building.label)}</strong>
      <div class="small muted">Class code ${escapeHtml(building.classCode)}</div>
      <div>Resolved class rooms: ${supportedCount}</div>
      <div>Missing mapped rooms: ${missingRooms.length ? escapeHtml(missingRooms.slice(0, 8).join(", ")) : "None found"}</div>
    </article>
  `).join("");
}

function renderHealth() {
  if (!state.healthIssues.length) {
    els.healthPanel.className = "stack-sm";
    els.healthPanel.innerHTML = `<article class="health-item issue-ok"><strong>No blocking issues found.</strong><div class="small muted">The validator did not detect missing files or broken JSON structure.</div></article>`;
    return;
  }

  els.healthPanel.className = "stack-sm";
  els.healthPanel.innerHTML = state.healthIssues.map((issue) => `
    <article class="health-item issue-${escapeHtml(issue.level)}">
      <strong>${escapeHtml(issue.title)}</strong>
      <div>${escapeHtml(issue.message)}</div>
    </article>
  `).join("");
}

function renderMetrics() {
  els.metricBuildings.textContent = String(state.manifest?.buildings?.length || 0);
  els.metricFloors.textContent = String(state.rawGraphs.length);
  els.metricClasses.textContent = String(state.classIndex.length);
}

function updateSuggestionLists() {
  renderDatalist(
    els.startSuggestions,
    createLookupOptions(els.startMode.value, els.startInput.value, "start")
  );

  renderDatalist(
    els.destinationSuggestions,
    createLookupOptions(els.destinationMode.value, els.destinationInput.value, "destination")
  );
}

function meetingLabel(course, meeting) {
  const courseName = `${course.subject} ${course.catalog_nbr}${course.class_section ? `-${course.class_section}` : ""}`;
  return `${courseName} — ${meeting.facility_descr || `${meeting.bldg_cd} ${meeting.room}`}`;
}

function buildClassIndex(records) {
  const supportedCodes = new Map(state.manifest.buildings.map((building) => [building.classCode, building]));
  const roomLookup = new Map();

  for (const node of state.allNodes) {
    if (!node.roomNumber && !/^\d/i.test(String(node.label || ""))) continue;
    const roomKey = node.roomNumber || String(node.label || "");
    const key = `${node.classCode}:${normalize(roomKey)}`;
    roomLookup.set(key, node);
  }

  const results = [];
  for (const course of records) {
    for (const meeting of course.meetings || []) {
      const building = supportedCodes.get(meeting.bldg_cd);
      if (!building || !meeting.room) continue;
      const node = roomLookup.get(`${meeting.bldg_cd}:${normalize(meeting.room)}`);
      if (!node) continue;
      results.push({
        id: `class:${course.class_nbr}:${meeting.bldg_cd}:${meeting.room}`,
        type: "class",
        typeLabel: "Class",
        label: meetingLabel(course, meeting),
        meta: `${course.descr || "Course"} · ${meeting.days || ""} ${formatTime(meeting.start_time)}-${formatTime(meeting.end_time)}`.trim(),
        buildingKey: building.id,
        buildingLabel: building.label,
        floorLevel: node.floorLevel,
        floorLabel: node.floorLabel,
        classCode: meeting.bldg_cd,
        searchLabel: meetingLabel(course, meeting),
        detail: `${course.descr || "Course"} · ${building.label} · room ${meeting.room}`,
        targetNode: node,
        meeting,
        course
      });
    }
  }
  return results;
}

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5).replace('.', ':');
}

function resolveEntity(rawValue, mode, scope = "both") {
  const value = normalize(rawValue);
  if (!value) return null;

  if (mode === "class" || mode === "all") {
    const foundClass = state.classIndex.find((entry) =>
      matchesCurrentFilter(entry, scope) &&
      (normalize(entry.searchLabel) === value || normalize(entry.label) === value)
    );

    if (foundClass) {
      return {
        ...foundClass,
        node: foundClass.targetNode
      };
    }
  }

  const candidates = getFilteredNodePool(mode, scope);
  const node = candidates.find((item) => {
    return [
      normalize(item.searchLabel),
      normalize(item.label),
      normalize(item.roomNumber),
      normalize(`${item.label} ${item.floorLabel || ""}`)
    ].includes(value);
  });

  if (!node) return null;

  return {
    id: node.uid,
    type: node.kind || "node",
    typeLabel: node.kind === "entrance" ? "Entrance" : "Room / destination",
    label: node.label,
    meta: `${node.buildingLabel || node.buildingKey} · ${node.floorLabel || `Floor ${node.floorLevel}`}`,
    buildingKey: node.buildingKey,
    buildingLabel: node.buildingLabel,
    floorLevel: node.floorLevel,
    floorLabel: node.floorLabel,
    node
  };
}

function renderRouteResult(result) {
  const noteHtml = result.note
    ? `<div class="small muted">${escapeHtml(result.note)}</div>`
    : "";

  els.routeSummary.className = "route-summary";
  els.routeSummary.innerHTML = `
    <article class="route-step">
      <strong>${escapeHtml(result.summary || "Route preview ready")}</strong>
      ${noteHtml}
    </article>
    ${(result.steps || []).map((step) => `
      <article class="route-step">
        <strong>${escapeHtml(step.title)}</strong>
        <div>${escapeHtml(step.detail)}</div>
      </article>
    `).join("")}
  `;
}

function fallbackRoute({ start, destination, mode }) {
  return {
    ok: true,
    summary: "UI skeleton is working. Route engine hook is still using fallback mode.",
    note: "Plug the A* logic from versions/viewer.html into window.WayfinderEngine.findRoute to replace this preview.",
    steps: [
      {
        title: "Start",
        detail: `${start.label} · ${start.meta}`
      },
      {
        title: mode === "accessible" ? "Accessibility preference" : mode === "stairs" ? "Stairs preference" : "Routing preference",
        detail: mode === "accessible" ? "Prefer elevators and accessible segments." : mode === "stairs" ? "Prefer stairs where available." : "Use the default routing rules."
      },
      {
        title: "Destination",
        detail: `${destination.label} · ${destination.meta}`
      }
    ]
  };
}

function computeHealthIssues() {
  const issues = [];
  const graphPaths = new Set(state.rawGraphs.map((item) => item.path));

  for (const building of state.manifest.buildings) {
    const levels = building.floors.map((floor) => floor.rawProject?.floorLevel);
    const ids = building.floors.map((floor) => floor.rawProject?.buildingId);
    const labels = building.floors.map((floor) => floor.rawProject?.floorLabel);

    building.floors.forEach((floor) => {
      if (!graphPaths.has(floor.path)) {
        issues.push({
          level: "error",
          title: `Missing file: ${floor.path}`,
          message: "The manifest references a file that was not loaded."
        });
      }
      if (floor.hasSourceImageDataUrl) {
        issues.push({
          level: "warn",
          title: `Large embedded image payload in ${shortPath(floor.path)}`,
          message: "This floor JSON still includes sourceImage.dataUrl, which increases download size and can slow the page."
        });
      }
    });

    if (building.id === "oconnell") {
      if (levels[1] === 1) {
        issues.push({
          level: "error",
          title: "O'Connell floor 2 metadata is incorrect",
          message: "oconnell2.json still reports floorLevel 1 and floorLabel Floor 1. A UI that trusts raw metadata will duplicate floors and mislabel room results."
        });
      }
      if (ids.slice(0, 2).some((value) => value === "building-id")) {
        issues.push({
          level: "warn",
          title: "O'Connell buildingId is inconsistent across floors",
          message: "oconnell1.json and oconnell2.json use building-id while later floors use building-oconnel. Grouping by raw buildingId will split the same building in the UI."
        });
      }
      if (labels[1] === "Floor 1") {
        issues.push({
          level: "warn",
          title: "O'Connell floor labels need overrides",
          message: "The manifest included here corrects the labels, but the underlying file should still be fixed."
        });
      }
    }
  }

  const roomLookup = new Map();
  for (const node of state.allNodes) {
    if (!node.roomNumber && !/^\d/i.test(String(node.label || ""))) continue;
    const roomKey = node.roomNumber || String(node.label || "");
    roomLookup.set(`${node.classCode}:${normalize(roomKey)}`, true);
  }

  const missingByBuilding = new Map();
  for (const course of state.classRecords) {
    for (const meeting of course.meetings || []) {
      if (!meeting.bldg_cd || !meeting.room) continue;
      if (!state.manifest.buildings.some((building) => building.classCode === meeting.bldg_cd)) continue;
      const key = `${meeting.bldg_cd}:${normalize(meeting.room)}`;
      if (!roomLookup.has(key)) {
        if (!missingByBuilding.has(meeting.bldg_cd)) missingByBuilding.set(meeting.bldg_cd, new Set());
        missingByBuilding.get(meeting.bldg_cd).add(String(meeting.room));
      }
    }
  }

  for (const [buildingCode, rooms] of missingByBuilding.entries()) {
    for (const room of rooms) {
      issues.push({
        level: "warn",
        title: `Class room missing from graph: ${buildingCode} ${room}`,
        message: "At least one class meeting points to a room that is not present as a graph destination node. Class-to-route search will not resolve for that room.",
        code: "class-room-missing",
        buildingCode,
        room
      });
    }
  }

  return issues;
}

function shortPath(path) {
  return String(path).split("/").slice(-2).join("/");
}

async function loadManifest() {
  const response = await fetch("./manifest.json");
  if (!response.ok) throw new Error(`Manifest load failed: ${response.status}`);
  return response.json();
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

async function loadData() {
  setStatus("Loading…");
  els.routeStatus.textContent = "Loading";
  els.routeSummary.className = "route-summary empty-state";
  els.routeSummary.textContent = "Loading manifest and JSON files…";

  state.manifest = await loadManifest();

  const graphEntries = [
    {
      type: "campus",
      path: state.manifest.campus.path,
      buildingIdOverride: state.manifest.campus.buildingIdOverride,
      buildingLabelOverride: state.manifest.campus.buildingLabelOverride,
      floorLevelOverride: state.manifest.campus.floorLevelOverride,
      floorLabelOverride: "Campus",
      classCode: null,
      buildingKey: "campus"
    },
    ...state.manifest.buildings.flatMap((building) =>
      building.floors.map((floor) => ({
        ...floor,
        type: "floor",
        buildingKey: building.id,
        buildingLabelOverride: floor.buildingLabelOverride || building.label,
        classCode: building.classCode,
        aliases: building.aliases || []
      }))
    )
  ];

  state.rawGraphs = await Promise.all(graphEntries.map(async (entry) => {
    const data = await loadJson(entry.path);
    return {
      ...entry,
      data,
      rawProject: data.project || {},
      hasSourceImageDataUrl: Boolean(data.sourceImage?.dataUrl)
    };
  }));

  state.classRecords = await loadJson(state.manifest.classDataPath);
  state.allNodes = state.rawGraphs.flatMap((entry) => {
    const nodes = Array.isArray(entry.data.nodes) ? entry.data.nodes : [];
    return nodes.map((node) => ({
      uid: uid(entry.buildingIdOverride, entry.floorLevelOverride, node.id),
      id: node.id,
      label: node.label || node.roomNumber || node.id,
      searchLabel: node.roomNumber ? `${node.roomNumber} — ${entry.buildingLabelOverride} ${entry.floorLabelOverride}` : `${node.label || node.id} — ${entry.buildingLabelOverride} ${entry.floorLabelOverride}`,
      roomNumber: node.roomNumber ? String(node.roomNumber) : "",
      kind: node.kind || "node",
      x: node.x,
      y: node.y,
      buildingId: entry.buildingIdOverride,
      buildingKey: entry.buildingKey,
      buildingLabel: entry.buildingLabelOverride,
      classCode: entry.classCode,
      floorLevel: entry.floorLevelOverride,
      floorLabel: entry.floorLabelOverride
    }));
  });

  state.classIndex = buildClassIndex(state.classRecords);
  state.healthIssues = computeHealthIssues();

  els.buildingFilter.innerHTML = [`<option value="all">All buildings</option>`].concat(
    state.manifest.buildings.map((building) => `<option value="${building.id}">${escapeHtml(building.label)}</option>`)
  ).join("");

  renderFloorOptions();
  renderMetrics();
  renderFloorPreview();
  renderHealth();
  renderClassCoverage();
  updateSuggestionLists();

  setStatus("Loaded", state.healthIssues.some((issue) => issue.level === "error") ? "warn" : "ok");
  els.dataSummary.textContent = `${state.rawGraphs.length} graph files and ${state.classRecords.length} class records loaded.`;
  els.routeStatus.textContent = "Ready";
  els.routeSummary.className = "route-summary empty-state";
  els.routeSummary.textContent = "Resolve a start and destination to preview the route.";
}

function resolveSelections() {
state.selectedStart = resolveEntity(els.startInput.value, els.startMode.value, "start");
state.selectedDestination = resolveEntity(els.destinationInput.value, els.destinationMode.value, "destination");  renderSelection(els.startSelection, state.selectedStart);
  renderSelection(els.destinationSelection, state.selectedDestination);

  const missing = [];
  if (!state.selectedStart) missing.push("start");
  if (!state.selectedDestination) missing.push("destination");
  if (missing.length) {
    els.routeStatus.textContent = "Needs attention";
    els.routeSummary.className = "route-summary empty-state";
    els.routeSummary.textContent = `Could not resolve: ${missing.join(" and ")}. Try a suggestion from the input list.`;
  } else {
    els.routeStatus.textContent = "Selections resolved";
    els.routeSummary.className = "route-summary empty-state";
    els.routeSummary.textContent = "Selections are ready. Preview the route to test the page flow.";
  }
}

async function previewRoute() {
  if (!state.selectedStart || !state.selectedDestination) {
    resolveSelections();
    if (!state.selectedStart || !state.selectedDestination) return;
  }

  //const mode = els.routeMode.value; //USE THIS TO CHANGE BETWEEN ROUTE PREFERENCES
  const mode = "default";
  els.routeStatus.textContent = "Previewing";
  let result;

  try {
    if (window.WayfinderEngine?.findRoute) {
      result = await window.WayfinderEngine.findRoute({
        start: state.selectedStart,
        destination: state.selectedDestination,
        mode,
        graphs: state.rawGraphs,
        classes: state.classRecords
      });
    } else {
      result = fallbackRoute({
        start: state.selectedStart,
        destination: state.selectedDestination,
        mode
      });
    }
  } catch (error) {
    result = {
      ok: false,
      summary: "Route preview failed",
      note: error.message,
      steps: []
    };
  }

  els.routeStatus.textContent = result.ok ? "Preview ready" : "Preview failed";
  renderRouteResult(result);
  renderRouteMap(result);
}

function resetSelections() {
  state.selectedStart = null;
  state.selectedDestination = null;
  els.startInput.value = "";
  els.destinationInput.value = "";
  renderSelection(els.startSelection, null);
  renderSelection(els.destinationSelection, null);
  els.routeStatus.textContent = "Idle";
  els.routeSummary.className = "route-summary empty-state";
  els.routeSummary.textContent = "Choose a start and destination, then preview the route.";
  updateSuggestionLists();
}

els.loadDataBtn.addEventListener("click", async () => {
  try {
    await loadData();
  } catch (error) {
    console.error(error);
    setStatus("Load failed", "error");
    els.dataSummary.textContent = error.message;
    els.routeStatus.textContent = "Load failed";
    els.routeSummary.className = "route-summary empty-state";
    els.routeSummary.textContent = error.message;
  }
});

els.buildingFilter.addEventListener("change", () => {
  renderFloorOptions();
  renderFloorPreview();
  updateSuggestionLists();
});

els.floorFilter.addEventListener("change", () => {
  renderFloorPreview();
  updateSuggestionLists();
});

els.startMode.addEventListener("change", updateSuggestionLists);
els.destinationMode.addEventListener("change", updateSuggestionLists);
els.startInput.addEventListener("input", updateSuggestionLists);
els.destinationInput.addEventListener("input", updateSuggestionLists);
els.resolveBtn.addEventListener("click", resolveSelections);
els.previewBtn.addEventListener("click", previewRoute);
els.resetBtn.addEventListener("click", resetSelections);

if (els.routePrevBtn) {
  els.routePrevBtn.addEventListener("click", () => {
    if (state.routeMapIndex > 0) {
      renderRouteMapGroup(state.routeMapIndex - 1);
    }
  });
}

if (els.routeNextBtn) {
  els.routeNextBtn.addEventListener("click", () => {
    if (state.routeMapIndex < state.routeMapGroups.length - 1) {
      renderRouteMapGroup(state.routeMapIndex + 1);
    }
  });
}

renderSelection(els.startSelection, null);
renderSelection(els.destinationSelection, null);
renderFloorOptions();
updateSuggestionLists();
clearRouteMap();