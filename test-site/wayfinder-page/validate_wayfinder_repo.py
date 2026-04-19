#!/usr/bin/env python3
import json
import os
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "wildcat_latest", "WildCat-Wayfinder-main", "files"))

SUPPORTED = {
    "HOLT": "holt-files",
    "OCNL": "o'connell-files",
    "PLMS": "plumas-files",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


room_sets = defaultdict(set)
issues = []

for folder in ["holt-files", "o'connell-files", "plumas-files"]:
    folder_path = os.path.join(ROOT, folder)
    for name in sorted(os.listdir(folder_path)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(folder_path, name)
        data = load_json(path)
        project = data.get("project", {})
        if data.get("sourceImage", {}).get("dataUrl"):
            issues.append(f"WARN: embedded source image present in {folder}/{name}")
        if folder == "o'connell-files" and name == "oconnell2.json":
            if project.get("floorLevel") != 2:
                issues.append("ERROR: oconnell2.json floorLevel is not 2")
            if project.get("floorLabel") != "Floor 2":
                issues.append("WARN: oconnell2.json floorLabel is not Floor 2")
        for node in data.get("nodes", []):
            room = str(node.get("roomNumber") or "").strip()
            if room:
                building_code = next(code for code, folder_name in SUPPORTED.items() if folder_name == folder)
                room_sets[building_code].add(room)

classes = load_json(os.path.join(ROOT, "chico_classes_p.json"))
missing = defaultdict(set)
for course in classes:
    for meeting in course.get("meetings", []):
        code = meeting.get("bldg_cd")
        room = str(meeting.get("room") or "").strip()
        if code in SUPPORTED and room and room not in room_sets[code]:
            missing[code].add(room)

for code, rooms in sorted(missing.items()):
    issues.append(f"WARN: {code} class rooms missing from graph: {', '.join(sorted(rooms))}")

print("Wayfinder repo validation")
print("root:", ROOT)
print()
for issue in issues:
    print(issue)
