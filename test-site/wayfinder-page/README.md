# WildCat Wayfinder frontend page skeleton

This is a static page scaffold intended for a new page on `https://hack.adamschussel.com/`.

## Suggested page path

Use either:

- `https://hack.adamschussel.com/wayfinder/`
- or `https://hack.adamschussel.com/wayfinder/index.html`

## What this page already does

- loads the graph JSON for campus, Holt, O'Connell, and Plumas
- loads `chico_classes_p.json`
- corrects known bad metadata through `manifest.json`
- lets the user filter by building and floor
- lets the user search start and destination by entrance, room, or class
- shows a floor preview panel
- shows a route preview panel
- shows a class-coverage summary
- shows a data health panel with repo issues that can break the UI

## What still needs wiring

The page is a UI skeleton. The actual shortest-path engine should be connected by moving the graph build and A* logic out of `versions/viewer.html` into a reusable module and exposing it as:

```js
window.WayfinderEngine.findRoute({ start, destination, mode, graphs, classes })
```

There is an example contract in `engine-adapter.example.js`.

## Deployment layout

Place the page files like this:

```text
/wayfinder/index.html
/wayfinder/app.js
/wayfinder/styles.css
/wayfinder/manifest.json
```

Copy the repo data to:

```text
/wayfinder-data/files/campus-graph-map-editor.json
/wayfinder-data/files/chico_classes_p.json
/wayfinder-data/files/holt-files/...
/wayfinder-data/files/o'connell-files/...
/wayfinder-data/files/plumas-files/...
```

The provided `manifest.json` already points to those paths.

## Why the manifest matters

The raw JSON files are not consistent enough to drive the UI directly. In particular:

- `oconnell2.json` still says `floorLevel = 1`
- `oconnell2.json` still says `floorLabel = Floor 1`
- `oconnell1.json` and `oconnell2.json` still use `buildingId = building-id`

This skeleton uses the manifest as the source of truth so the page can still load correctly.

## Recommended next implementation step

Extract these parts from `versions/viewer.html` into a module:

1. `buildCombinedGraph`
2. `findNodeByInput` or the parts you want to keep
3. `runAStar`
4. the connector logic for stairs, elevators, and campus entrance links

Then call that module from `window.WayfinderEngine.findRoute`.
