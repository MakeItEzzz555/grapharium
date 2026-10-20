# Living Galaxy — 3D Visual Design

Grapharium's full-repository overview positions real Graphify communities along four irregular spiral arms. A separate seeded 3D particle field follows the same pattern. The bodies and their **actual relationships** share a rotating transform so nothing disconnects as the galaxy moves.

**21st.dev inspiration:** https://21st.dev/@easemize/components/spiral-animation. This is an original procedural Three.js implementation, not a copied 21st.dev component or externally hosted shader.

## Bodies and halos

- Main functions and classes can appear as **smooth golden suns**, with an animated plasma-style surface shader and procedurally generated radial corona.
- Systems use cool blue spheres with rotating golden halo bands. Suns use warm rings and pulsing coronas.
- GPU-instanced torus halos rotate and precess; no per-object geometry allocation is needed.
- Decorative galaxy dust is a single Points geometry with deterministic, tinted spiral-arm positions.
- Community detail keeps verified parent/child layout from the graph model; the galaxy overview is a higher-level spatial metaphor.

## Animated relationships

Two instanced meshes draw each selected relationship: a thin readable central beam and a wider additive aura. Shared shader uniforms animate intensity waves along the connection.

Extremely high-degree nodes can create hundreds of overlapping links. A degree-aware attenuation dims these overlaps without changing relationships, dropping inspector links, or misrepresenting parenthood. The overview Balanced preset shows a bounded selection of strongest inter-community connections, while the inspector still indexes everything.

## Motion safety

Animations use requestAnimationFrame while the tab is visible. Hidden pages stop continuous rendering. System reduced-motion preferences disable motion initially, and a user-controlled checkbox explicitly enables or pauses it. Pausing must **preserve the current galaxy rotation**. The camera can still orbit and pan without changing node relationships.

## Browser validation

Run the unit tests and JavaScript syntax checks. Verify Brave loads the private Graphify graph without uncaught errors. Compare two readings of GraphariumDiagnostics().galaxyRotation and .animationTime over real elapsed time. Both must progress while enabled and remain static when paused.

Check search/drill-down into a large community, halo/connection appearance, camera controls, and layout/visibility changes. Browser smoke tests do not establish sustained FPS or memory performance.

**Privacy:** Screenshots and generated HTML of private repository graphs stay outside Git; use the synthetic example for public screenshots.
