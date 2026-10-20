# Contributing to Grapharium

Contributions are welcome after the public repository is published.

## Principles

1. Preserve graph semantics. An extracted calls edge must not become an explicit parent; inferred containment must not be displayed as verified.
2. Preserve offline use: all runtime dependencies must be bundled, licensed and pinned.
3. Keep synthetic examples and tests public-safe. Do not commit private Graphify exports, source filenames, screenshots of proprietary code, credentials or generated HTML.
4. Favor performance measured per reproducible dataset, browser, GPU and quality preset, not exaggerated universal FPS claims.
5. Prefer coherent industrial/aerospace design, keyboard usability, reduced motion and legible relationships over noisy decoration.

## Checks

~~~bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
node tests/hierarchy.test.js
node --check hierarchy.js && node --check universe.js && node --check viewer.js
python3 build_viewer.py examples/demo-graph.json
~~~

For renderer changes, also test a WebGL browser with search, selection, hierarchy depth, sliders, orbit, pan, zoom, large-community expansion and zero uncaught JavaScript errors.

## Pull requests

Keep changes small, explain architectural trade-offs, mention quantitative performance measurements and accessibility impacts. Add unit tests for new hierarchy rules, edge types, or binary compatibility assumptions. Keep public samples synthetic and avoid modifying upstream source repositories.
