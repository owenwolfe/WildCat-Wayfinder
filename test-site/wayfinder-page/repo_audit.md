# Repo audit for `WildCat-Wayfinder-main (latest zip)`

## Good news compared with the earlier zip

- `files/campus-graph-map-editor.json` is now present, so the earlier missing campus graph problem is fixed.

## Current loading and UI risks

### 1. `versions/viewer.html` still fetches the wrong paths

The file loads JSON with requests like:

- `./campus-graph-map-editor.json`
- `./holt-floor-1.json`
- `./oconnell1.json`
- `./plumas1.json`

But in this repo the files live under:

- `files/campus-graph-map-editor.json`
- `files/holt-files/...`
- `files/o'connell-files/...`
- `files/plumas-files/...`

So `viewer.html` will still fail unless you either move copies beside the HTML file or update the fetch paths.

### 2. O'Connell floor metadata is inconsistent

- `files/o'connell-files/oconnell1.json` uses `buildingId = "building-id"`
- `files/o'connell-files/oconnell2.json` uses `buildingId = "building-id"`
- `files/o'connell-files/oconnell3.json` uses `buildingId = "building-oconnel"`
- `files/o'connell-files/oconnell4.json` uses `buildingId = "building-oconnel"`
- `oconnell2.json` reports `floorLevel = 1` even though it is floor 2
- `oconnell2.json` reports `floorLabel = "Floor 1"` even though it is floor 2

This can break:

- floor dropdowns
- floor labels in search results
- grouping nodes by building metadata
- any loader that trusts raw JSON metadata instead of filename or manifest overrides

### 3. The classes file is broader than the mapped buildings

`files/chico_classes_p.json` contains many buildings across campus, but the graph data in this repo only covers:

- Holt
- O'Connell
- Plumas
- campus exterior

That means class search must filter to supported building codes (`HOLT`, `OCNL`, `PLMS`) or clearly label unsupported results.

### 4. Some class meeting rooms do not exist in the graph files

Examples of scheduled rooms that appear in class data but are not currently mapped as graph destinations:

- Plumas: `001`, `116A`, `201`, `205`
- Holt: `125`, `173`, `187`, `307`, `309`, `329`, `337`, `350`, `352`, `357`
- O'Connell: `119`, `120`, `121`, `123`, `124`, `127`, `130`, `131`, `133`, `136`, `225`, `237`, `239`, `241`, `244`, `251`, `254`

These will fail class-to-room resolution unless the graph files add those destination nodes or the class search hides unresolved rooms.

### 5. All graph files still embed floor-plan image data

Each floor JSON includes `sourceImage.dataUrl`.

This is convenient for editing but heavy for production loading. The `files` directory is about 14 MB, much of that from embedded image payloads. For a live UI page, this will slow initial load.

### 6. The O'Connell folder name includes an apostrophe

`files/o'connell-files/...` is valid, but it is awkward in some build or deployment scripts and easy to mistype. It is safer to rely on a manifest instead of hardcoding these paths in many places.

## Recommendation

Use a manifest-driven loader for the new page and treat the raw floor JSON as graph content, not as trusted UI metadata.
