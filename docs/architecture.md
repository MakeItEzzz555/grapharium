# Technical architecture

## Data flow

Graphify graph.json → Python normalization → script-safe embedded JSON → browser model → validated containment forest → bounded orbital layout → Three.js instanced renderer + inspector.

## Correctness contract

- Keep the input read-only. Original graph directed/multigraph metadata and exact relation/confidence strings are retained.
- Containment is only formed from EXTRACTED edges with relations contains, method, case_of, defines, source and target in the same source file, one unique parent per child, no cycle.
- Calls, references, inherited/implements, inferred and ambiguous edges remain graph relationships, never verified parenthood.
- Document and source file hubs are visual grouping constructs rather than actual AST parents. Include provenance in the inspector.
- A globally undirected Graphify graph does not prove causal runtime direction from raw source/target ordering.

## Layout

Files are spatially separated systems. A deterministic seeded golden-angle 3D distribution places children around verified parents; conservative system bounds are packed via spatial buckets and bounded fallback. Positioning is irregular on purpose and stable across regenerations with the same graph.

Hierarchy depth is a lazy visibility budget: hidden nodes and edges remain indexed for search, and selecting a deep node re-opens its verified ancestor chain.

## Rendering

Three.js v0.158.0 is locally bundled. The viewer creates shared static geometries and one InstancedMesh per symbol category, with batched connection cylinders and optional low-opacity translucent/wireframe enclosures. Geometry is rebuilt on explicit scene changes; no continuous animation loop is required, reducing idle GPU work.

Quality presets cap visible graph relationships at 320, 850 or 1700 edges. Enclosure budgets vary with quality. Full graph search and adjacency inspection remain available regardless of draw caps.

## Risks and limits

- A generated HTML can be megabytes and include private symbol paths. Never commit it by default.
- Rendering many thousands of individual nodes at once is intentionally avoided; community detail is the primary unit.
- Derived file sizes use symbol counts. Reliable LoC/bytes metrics would require explicit upstream metadata.
- Inferred edge visualizations should remain distinguishable from verified relationships.
- Edge-order grouping prioritizes extracted/selected edges; detailed performance testing and camera-transition polish remain future work.

## Measurement

Record browser version, GPU, render settings, node/edge counts, view and capture method. The renderer exposes a GraphariumDiagnostics() console function for visible bodies, edges, firmaments, draw calls, triangles and hierarchy conflict counts. This is a point-in-time diagnostic, **not** an FPS benchmark or an elapsed-time study.
