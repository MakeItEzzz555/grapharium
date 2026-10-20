#!/usr/bin/env python3
"""Read-only Graphify snapshot -> standalone offline 3D HTML viewer.

Does not write inside the Graphify repository or source graphify-out folder.
"""
import collections
import json
import os
import pathlib
import sys

src = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "/private/tmp/dynamicisland-droppy-codex/graphify-out/graph.json")
dst = pathlib.Path(__file__).resolve().parent
raw = json.loads(src.read_text(encoding="utf-8"))
original = raw.get("nodes", [])
original_edges = raw.get("links", [])
nodes = []
group_members = collections.Counter()
group_names = {}
index = {}
for o in original:
    ident = str(o.get("id", ""))
    if not ident or ident in index:
        continue
    c = int(o.get("community") or 0)
    index[ident] = len(nodes)
    nodes.append({
        "id": ident,
        "label": str(o.get("label") or ident),
        "c": c,
        "file": str(o.get("source_file") or ""),
        "loc": str(o.get("source_location") or ""),
        "type": str(o.get("file_type") or ""),
        "klass": bool(o.get("_callable_class")),
        "role": str(o.get("type") or ""),
    })
    group_members[c] += 1
    label = o.get("community_name")
    if label and (c not in group_names or group_names[c].startswith("Community ")):
        group_names[c] = str(label)

edges = []
between = collections.Counter()
for e in original_edges:
    if not isinstance(e, dict):
        continue
    a, b = e.get("source"), e.get("target")
    if isinstance(a, dict):
        a = a.get("id")
    if isinstance(b, dict):
        b = b.get("id")
    a, b = index.get(str(a)), index.get(str(b))
    if a is None or b is None or a == b:
        continue
    edges.append([a,b])
    ca, cb = nodes[a]["c"],nodes[b]["c"]
    if ca != cb:
        between[tuple(sorted((ca,cb)))] += 1

groups = [
    {"c":c, "name":group_names.get(c,"Community "+str(c)), "count":count}
    for c,count in sorted(group_members.items(), key=lambda x:(-x[1], x[0]))
]
payload = {
    "commit": str(raw.get("built_at_commit", "unknown")),
    "n": nodes,
    "l": edges,
    "g": groups,
    "gl": [[c1,c2,w] for (c1,c2),w in between.items()]
}
serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
# Make it safe to embed in a <script> tag even if source symbols contain markup.
serialized = (serialized.replace("<", r"\u003c").replace(">",r"\u003e")
              .replace("&",r"\u0026").replace("\u2028",r"\u2028")
              .replace("\u2029",r"\u2029"))
template = (dst/"template.html").read_text(encoding="utf-8")
assert template.count("/*GRAPH_DATA*/") == 1
html = template.replace("/*GRAPH_DATA*/","const ALL = "+serialized+";")
target = dst/"DynamicIsland-Graphify-3D.html"
target.write_text(html, encoding="utf-8")
(dst/"README.txt").write_text(
    "DYNAMICISLAND GRAPHIFY — OFFLINE INTERACTIVE 3D VIEWER\n\n"
    "Open DynamicIsland-Graphify-3D.html in Brave, Safari or Chrome.\n"
    "Keep 3d-force-graph.min.js in the SAME folder as the HTML.\n\n"
    "Controls: left-drag to orbit, scroll to zoom, right-drag to pan;\n"
    "click a community to inspect classes/functions; click a symbol for metadata;\n"
    "search by class/function/file, adjust spacing and visible community count;\n"
    "tune large-file separation, relationship lengths, and planet size contrast;\n"
    "toggle derived source-file planets to see their orbiting code symbols;\n"
    "planet size uses code symbols per source file, not bytes or lines of code;\n"
    "click All communities to return, Fit view to recenter.\n\n"
    "Source snapshot: "+str(src)+"\n"
    "Graph SHA: "+str(raw.get("built_at_commit","unknown"))+"\n"
    "This is a read-only SNAPSHOT. It does not update automatically.\n"
    "Refresh by running:\n"
    "  python3 "+str(dst/"build_viewer.py")+" "+str(src)+"\n"
    "Do not place this viewer inside active Codex or Claude worktrees.\n",
    encoding="utf-8"
)
print("Source:", src)
print("Output:", target, f"({target.stat().st_size:,} bytes)")
print(f"Nodes: {len(nodes):,}; links: {len(edges):,}; communities: {len(groups):,}; inter-cluster links: {len(between):,}")
print("Snapshot commit:", raw.get("built_at_commit"))
