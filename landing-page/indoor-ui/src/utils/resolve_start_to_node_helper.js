import { getRealStartLocations } from "./buildingStartLocationAdapter";
export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

export function buildSearchText(location) {
  return normalizeText([
    location.label,
    location.building,
    location.room,
    location.aliases?.join(" "),
    location.type,
  ].filter(Boolean).join(" "));
}

export function scoreLocationMatch(query, location) {
  const q = normalizeText(query);
  if (!q) return -1;

  const label = normalizeText(location.label);
  const searchText = buildSearchText(location);

  if (label === q) return 100;
  if (searchText === q) return 95;
  if (label.startsWith(q)) return 90;
  if (searchText.startsWith(q)) return 80;
  if (label.includes(q)) return 70;
  if (searchText.includes(q)) return 60;

  const qWords = q.split(" ").filter(Boolean);
  const searchWords = new Set(searchText.split(" ").filter(Boolean));
  const matchedWords = qWords.filter((word) => searchWords.has(word)).length;

  if (matchedWords > 0) {
    return 40 + matchedWords;
  }

  return -1;
}

export function findStartLocationMatches(query, locations, limit = 8) {
  return locations
    .map((location) => ({
      ...location,
      score: scoreLocationMatch(query, location),
    }))
    .filter((location) => location.score >= 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function resolveStartToNode(query, locations) {
  const matches = findStartLocationMatches(query, locations, 1);
  const bestMatch = matches[0];

  if (!bestMatch) {
    return {
      ok: false,
      reason: "No matching start location found.",
      nodeId: null,
      location: null,
    };
  }

  return {
    ok: true,
    reason: null,
    nodeId: bestMatch.nodeId,
    location: bestMatch,
  };
}


export const sampleLocations = getRealStartLocations();

/*
Example use inside App.jsx

import { useMemo, useState } from "react";
import {
  findStartLocationMatches,
  resolveStartToNode,
  sampleLocations,
} from "./utils/resolveStartToNode";

const [startQuery, setStartQuery] = useState("");
const [selectedStart, setSelectedStart] = useState(null);

const startMatches = useMemo(() => {
  if (!startQuery.trim()) return [];
  return findStartLocationMatches(startQuery, sampleLocations);
}, [startQuery]);

function handleSelectStart(location) {
  setSelectedStart(location);
  setStartQuery(location.label);
}

function handleGenerateRoute() {
  const startResult = selectedStart
    ? { ok: true, nodeId: selectedStart.nodeId, location: selectedStart }
    : resolveStartToNode(startQuery, sampleLocations);

  if (!startResult.ok) {
    alert(startResult.reason);
    return;
  }

  const startNodeId = startResult.nodeId;
  console.log("Send this to the routing algorithm:", startNodeId);
}
*/
