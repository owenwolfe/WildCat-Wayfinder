import { useMemo, useState } from "react";
import {
  findStartLocationMatches,
  resolveStartToNode,
  sampleLocations,
} from "./utils/resolve_start_to_node_helper";
import {
  findClassMatches,
  resolveDestinationToNode,
  sampleClassRecords,
  sampleRoomNodeMap,
} from "./utils/resolve_destination_to_node_helper";

export default function App() {
  const [startQuery, setStartQuery] = useState("");
  const [selectedStart, setSelectedStart] = useState(null);

  const [destinationMode, setDestinationMode] = useState("room");
  const [destinationBuilding, setDestinationBuilding] = useState("");
  const [destinationRoom, setDestinationRoom] = useState("");
  const [classQuery, setClassQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);

  const [generated, setGenerated] = useState(false);
  const [generatedStartNodeId, setGeneratedStartNodeId] = useState(null);
  const [generatedEndNodeId, setGeneratedEndNodeId] = useState(null);

  const buildings = [
    "O'Connell Center",
    "Library West",
    "Marston Science Library",
    "Reitz Union",
    "Turlington Hall",
  ];

  const startMatches = useMemo(() => {
    if (!startQuery.trim()) return [];
    return findStartLocationMatches(startQuery, sampleLocations);
  }, [startQuery]);

  const classMatches = useMemo(() => {
    if (!classQuery.trim()) return [];
    return findClassMatches(classQuery, sampleClassRecords);
  }, [classQuery]);

  const previewStartLabel = selectedStart
    ? selectedStart.label
    : "Search and select a starting location";

  const previewDestinationLabel = useMemo(() => {
    if (destinationMode === "room") {
      if (destinationBuilding && destinationRoom) {
        return `${destinationBuilding} - Room ${destinationRoom}`;
      }
      if (destinationBuilding) {
        return `${destinationBuilding} - select room`;
      }
      return "Choose destination building and room";
    }

    if (selectedClass) {
      return `${selectedClass.course} - ${selectedClass.building} ${selectedClass.room}`;
    }

    return "Search and select a class";
  }, [destinationMode, destinationBuilding, destinationRoom, selectedClass]);

  function handleSelectStart(location) {
    setSelectedStart(location);
    setStartQuery(location.label);
  }

  function handleSelectClass(classRecord) {
    setSelectedClass(classRecord);
    setClassQuery(`${classRecord.course} - ${classRecord.building} ${classRecord.room}`);
  }

function handleGenerateRoute() {
  const startResult = selectedStart
    ? { ok: true, nodeId: selectedStart.nodeId, location: selectedStart }
    : resolveStartToNode(startQuery, sampleLocations);

  if (!startResult.ok) {
    alert(startResult.reason);
    return;
  }

  const destinationResult = resolveDestinationToNode(
    {
      mode: destinationMode,
      building: destinationBuilding,
      room: destinationRoom,
      selectedClass,
    },
    {
      roomNodeMap: sampleRoomNodeMap,
    }
  );

  if (!destinationResult.ok) {
    alert(destinationResult.reason);
    return;
  }

  const startNodeId = startResult.nodeId;
  const endNodeId = destinationResult.nodeId;

  console.log("Start node to send to algorithm:", startNodeId);
  console.log("Destination node to send to algorithm:", endNodeId);

  setGenerated(true);
  setGeneratedStartNodeId(startNodeId);
  setGeneratedEndNodeId(endNodeId);

  if (!endNodeId) {
    console.log("Destination selected, but no mapped node exists yet.");
    return;
  }

  // const path = findPath(startNodeId, endNodeId);
}

  function resetClassSelection(value) {
    setClassQuery(value);
    setSelectedClass(null);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Campus Route Finder
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Enter where you are and where you want to go.
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            Start with a searchable start location, then choose a destination by
            building plus room or class search.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-500">Route Form</p>
              <h2 className="text-2xl font-semibold">Build your route</h2>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Follow these steps</p>
                <p className="mt-1">
                  Step 1: Search and select a start location. Step 2: Choose how
                  to enter the destination. Step 3: Generate the route.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Step 1
                </p>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Start Location
                </label>
                <p className="mb-3 text-sm text-slate-500">
                  Search for a campus place, building entrance, room, or indoor
                  location.
                </p>

                <input
                  type="text"
                  value={startQuery}
                  onChange={(e) => {
                    setStartQuery(e.target.value);
                    setSelectedStart(null);
                  }}
                  placeholder="Example: Plaza of the Americas, O'Connell Center Room 120"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
                />

                <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {startMatches.length > 0 ? (
                    <div className="space-y-2">
                      {startMatches.map((item) => {
                        const active = selectedStart?.nodeId === item.nodeId;
                        return (
                          <button
                            key={item.nodeId}
                            type="button"
                            onClick={() => handleSelectStart(item)}
                            className={`w-full rounded-lg px-3 py-3 text-left text-sm transition ${
                              active
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <div className="font-medium">{item.label}</div>
                            <div className={`text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                              {item.type}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white px-3 py-3 text-sm text-slate-500">
                      {startQuery.trim()
                        ? "No matching start locations"
                        : "Start typing to search locations"}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Step 2
                  </p>
                  <p className="text-sm font-semibold text-slate-900">Destination</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose destination by building and room or by class search.
                  </p>
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setDestinationMode("room")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      destinationMode === "room"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Building + Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationMode("class")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      destinationMode === "class"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    Class Search
                  </button>
                </div>

                {destinationMode === "room" ? (
                  <div className="space-y-3">
                    <select
                      value={destinationBuilding}
                      onChange={(e) => setDestinationBuilding(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                    >
                      <option value="">Select destination building</option>
                      {buildings.map((building) => (
                        <option key={building} value={building}>
                          {building}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={destinationRoom}
                      onChange={(e) => setDestinationRoom(e.target.value)}
                      placeholder="Enter room number"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={classQuery}
                      onChange={(e) => resetClassSelection(e.target.value)}
                      placeholder="Search by class name or course code"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
                    />

                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                      {classMatches.length > 0 ? (
                        <div className="space-y-2">
                          {classMatches.map((item) => {
                            const active = selectedClass?.facility_id === item.facility_id;
                            return (
                              <button
                                key={`${item.course}-${item.facility_id}`}
                                type="button"
                                onClick={() => handleSelectClass(item)}
                                className={`w-full rounded-lg px-3 py-3 text-left text-sm transition ${
                                  active
                                    ? "bg-slate-900 text-white"
                                    : "bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <div className="font-medium">{item.course}</div>
                                <div className={`text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                                  {item.building} {item.room}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-white px-3 py-3 text-sm text-slate-500">
                          {classQuery.trim()
                            ? "No matching classes"
                            : "Start typing to search classes"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Step 3
                </p>
                <button
                  type="button"
                  onClick={handleGenerateRoute}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-semibold text-white transition hover:scale-[1.01]"
                >
                  Generate Route
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
              <p className="text-sm font-medium text-slate-500">Route Preview</p>
              <h3 className="mt-1 text-2xl font-semibold">
                {generated ? "Generated route" : "Preview"}
              </h3>

              <div className="mt-5 space-y-3">
                <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">
                  Start: {previewStartLabel}
                </div>
                <div className="rounded-xl bg-slate-200 px-4 py-3 text-sm text-slate-700">
                  Destination: {previewDestinationLabel}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Start node id: {generatedStartNodeId || "No start node generated yet"}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  Destination node id: {generatedEndNodeId || "No destination node generated yet"}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
