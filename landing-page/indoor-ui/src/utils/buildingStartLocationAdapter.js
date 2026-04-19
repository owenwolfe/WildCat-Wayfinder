import plumas1 from "../data/buildings/plumas1.json";
import plumas2 from "../data/buildings/plumas2.json";
import plumas3 from "../data/buildings/plumas3.json";

import oconnell1 from "../data/buildings/oconnell1.json";
import oconnell2 from "../data/buildings/oconnell2.json";
import oconnell3 from "../data/buildings/oconnell3.json";
import oconnell4 from "../data/buildings/oconnell4.json";

import holt1 from "../data/buildings/holt-floor-1.json";
import holt2 from "../data/buildings/holt-floor-2.json";
import holt3 from "../data/buildings/holt-floor-3.json";

const FLOOR_EXPORTS = [
  { building: "Plumas Hall", buildingCode: "PLMS", floor: 1, data: plumas1 },
  { building: "Plumas Hall", buildingCode: "PLMS", floor: 2, data: plumas2 },
  { building: "Plumas Hall", buildingCode: "PLMS", floor: 3, data: plumas3 },

  { building: "O'Connell Technology Center", buildingCode: "OCNL", floor: 1, data: oconnell1 },
  { building: "O'Connell Technology Center", buildingCode: "OCNL", floor: 2, data: oconnell2 },
  { building: "O'Connell Technology Center", buildingCode: "OCNL", floor: 3, data: oconnell3 },
  { building: "O'Connell Technology Center", buildingCode: "OCNL", floor: 4, data: oconnell4 },

  { building: "Holt Hall", buildingCode: "HOLT", floor: 1, data: holt1 },
  { building: "Holt Hall", buildingCode: "HOLT", floor: 2, data: holt2 },
  { building: "Holt Hall", buildingCode: "HOLT", floor: 3, data: holt3 },
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function inferNodeType(id, rawType) {
  const type = String(rawType || "").toLowerCase();
  const nodeId = String(id || "").toLowerCase();

  if (type) return type;
  if (nodeId.startsWith("destination-")) return "room";
  if (nodeId.startsWith("portal-")) return "portal";
  if (nodeId.startsWith("transition-")) return "transition";
  if (nodeId.startsWith("junction-")) return "junction";

  return "location";
}

function getBestLabel(node) {
  return normalizeText(
    node.label ||
      node.name ||
      node.text ||
      node.title ||
      node.destination ||
      node.room ||
      node.roomNumber ||
      node.room_number ||
      node.facility_descr ||
      node.facilityDescr
  );
}

function getBestRoom(node) {
  return normalizeText(
    node.room ||
      node.roomNumber ||
      node.room_number ||
      node.destination ||
      ""
  );
}

function getBestBuildingCode(node, fallback) {
  return normalizeText(node.bldg_cd || node.buildingCode || fallback);
}

function makeLocationRecord(node, meta) {
  const nodeId = normalizeText(node.id);
  if (!nodeId) return null;

  const nodeType = inferNodeType(nodeId, node.type || node.kind || node.nodeType);
  const label = getBestLabel(node);
  const room = getBestRoom(node);
  const buildingCode = getBestBuildingCode(node, meta.buildingCode);

  let finalLabel = label;

  if (!finalLabel && room) {
    finalLabel = `${meta.building} Room ${room}`;
  }

  if (!finalLabel && nodeType === "room" && nodeId) {
    finalLabel = `${meta.building} ${nodeId}`;
  }

  if (!finalLabel) return null;

  const aliases = [
    finalLabel,
    room,
    buildingCode && room ? `${buildingCode}${room}` : "",
    buildingCode && room ? `${buildingCode} ${room}` : "",
    meta.building,
    buildingCode,
    node.label,
    node.name,
    node.destination,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return {
    label: finalLabel,
    type: nodeType,
    nodeId,
    building: meta.building,
    buildingCode,
    floor: meta.floor,
    room: room || null,
    aliases: [...new Set(aliases)],
  };
}

function walkForNodes(value, visit, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) walkForNodes(item, visit, seen);
    return;
  }

  const looksLikeNode =
    typeof value.id === "string" &&
    (value.label ||
      value.name ||
      value.text ||
      value.room ||
      value.roomNumber ||
      value.room_number ||
      value.type ||
      value.kind ||
      String(value.id).includes("-"));

  if (looksLikeNode) {
    visit(value);
  }

  for (const child of Object.values(value)) {
    walkForNodes(child, visit, seen);
  }
}

export function getRealStartLocations() {
  const results = [];
  const seenNodeIds = new Set();

  for (const floorExport of FLOOR_EXPORTS) {
    walkForNodes(floorExport.data, (node) => {
      const location = makeLocationRecord(node, floorExport);
      if (!location) return;

      if (seenNodeIds.has(location.nodeId)) return;
      seenNodeIds.add(location.nodeId);
      results.push(location);
    });
  }

  return results.sort((a, b) => {
    const byBuilding = String(a.building).localeCompare(String(b.building));
    if (byBuilding !== 0) return byBuilding;

    const byFloor = Number(a.floor || 0) - Number(b.floor || 0);
    if (byFloor !== 0) return byFloor;

    return String(a.label).localeCompare(String(b.label));
  });
}