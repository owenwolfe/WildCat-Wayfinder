// Optional adapter contract for the existing route logic from versions/viewer.html.
// Copy the A* and graph-building logic into a module that exposes this shape,
// then load it before app.js and assign it on window.

window.WayfinderEngine = {
  async findRoute({ start, destination, mode, graphs, classes }) {
    // start and destination are normalized entities from app.js
    // graphs contains campus + building floor JSON
    // classes is chico_classes_p.json
    // Return shape expected by the UI:
    return {
      ok: true,
      summary: `Route engine connected in ${mode} mode.`,
      steps: [
        {
          title: "Start",
          detail: `${start.label} (${start.buildingLabel || "Campus"}, floor ${start.floorLevel ?? "-"})`
        },
        {
          title: "Finish",
          detail: `${destination.label} (${destination.buildingLabel || "Campus"}, floor ${destination.floorLevel ?? "-"})`
        }
      ]
    };
  }
};
