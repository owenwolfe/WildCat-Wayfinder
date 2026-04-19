import { getSearchableClassRecords } from "./chicoClassAdapter";
import chicoRoomNodeMap from "../data/chico_room_node_map.json";

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

export function buildRoomKey(building, room) {
  return `${String(building || "").trim()}|${String(room || "").trim()}`;
}

export function scoreClassMatch(query, classRecord) {
  const q = normalizeText(query);
  if (!q) return -1;

  const course = normalizeText(classRecord.course);
  const title = normalizeText(classRecord.title);
  const building = normalizeText(
    classRecord.building || classRecord.building_code
  );
  const room = normalizeText(classRecord.room);
  const facilityId = normalizeText(classRecord.facility_id);

  const combined = normalizeText(
    [
      classRecord.course,
      classRecord.title,
      classRecord.building,
      classRecord.building_code,
      classRecord.room,
      classRecord.facility_id,
      classRecord.displayLabel,
      classRecord.displaySubtext,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (course === q) return 100;
  if (title === q) return 95;
  if (combined === q) return 90;
  if (course.startsWith(q)) return 85;
  if (title.startsWith(q)) return 80;
  if (course.includes(q)) return 75;
  if (title.includes(q)) return 70;
  if (combined.includes(q)) return 60;
  if (facilityId === q) return 90;
  if (building.includes(q) || room === q) return 50;

  const qWords = q.split(" ").filter(Boolean);
  const combinedWords = new Set(combined.split(" ").filter(Boolean));
  const matchedWords = qWords.filter((word) => combinedWords.has(word)).length;

  if (matchedWords > 0) {
    return 40 + matchedWords;
  }

  return -1;
}

export function findClassMatches(query, classRecords, limit = 8) {
  return classRecords
    .map((record) => ({
      ...record,
      score: scoreClassMatch(query, record),
    }))
    .filter((record) => record.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.course || "").localeCompare(String(b.course || ""))
    )
    .slice(0, limit);
}

export function resolveRoomDestinationToNode({ building, room }, roomNodeMap) {
  const trimmedBuilding = String(building || "").trim();
  const trimmedRoom = String(room || "").trim();

  if (!trimmedBuilding || !trimmedRoom) {
    return {
      ok: false,
      reason: "Destination building and room are required.",
      nodeId: null,
      match: null,
      unresolved: false,
    };
  }

  const byFacility = roomNodeMap[trimmedRoom] || null;
  const byBuildingRoom =
    roomNodeMap[buildRoomKey(trimmedBuilding, trimmedRoom)] || null;

  const nodeId = byBuildingRoom || byFacility || null;

  if (!nodeId) {
    return {
      ok: true,
      reason: null,
      nodeId: null,
      match: {
        building: trimmedBuilding,
        room: trimmedRoom,
      },
      unresolved: true,
    };
  }

  return {
    ok: true,
    reason: null,
    nodeId,
    match: {
      building: trimmedBuilding,
      room: trimmedRoom,
    },
    unresolved: false,
  };
}

export function resolveClassDestinationToNode(classRecord, roomNodeMap) {
  if (!classRecord) {
    return {
      ok: false,
      reason: "No class was selected.",
      nodeId: null,
      match: null,
      unresolved: false,
    };
  }

  const facilityId = String(classRecord.facility_id || "").trim();
  const building = String(
    classRecord.building || classRecord.building_code || ""
  ).trim();
  const room = String(classRecord.room || "").trim();

  const nodeId =
    (facilityId && roomNodeMap[facilityId]) ||
    roomNodeMap[buildRoomKey(building, room)] ||
    null;

  if (!nodeId) {
    return {
      ok: true,
      reason: null,
      nodeId: null,
      match: classRecord,
      unresolved: true,
    };
  }

  return {
    ok: true,
    reason: null,
    nodeId,
    match: classRecord,
    unresolved: false,
  };
}

export function resolveDestinationToNode(
  { mode, building, room, selectedClass },
  { roomNodeMap }
) {
  if (mode === "room") {
    return resolveRoomDestinationToNode({ building, room }, roomNodeMap);
  }

  if (mode === "class") {
    return resolveClassDestinationToNode(selectedClass, roomNodeMap);
  }

  return {
    ok: false,
    reason: "Unknown destination mode.",
    nodeId: null,
    match: null,
    unresolved: false,
  };
}

export const sampleRoomNodeMap = chicoRoomNodeMap;
export const sampleClassRecords = getSearchableClassRecords();