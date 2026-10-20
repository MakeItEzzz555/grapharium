# Roadmap

## Current experimental preview

- [x] Graphify converter and local offline rendering
- [x] Typed/provenance-aware edges
- [x] Containment graph with cycle/multi-parent rejection
- [x] 3D file hubs and nested stars/planets/moons
- [x] Batched GPU instancing and basic LOD
- [x] Aura connections and transparent firmaments
- [x] Search, inspector, keyboard navigation, quality controls
- [x] Synthetic tests and CI configuration
- [ ] Public repository publication (requires explicit approval)
- [ ] Hero images, screenshots, logo and demo video (later phase)

## Next milestones

### Rendering polish
- [ ] Professional visual critique on real and synthetic snapshots; consistent scale and light response
- [ ] Stronger relation-specific aura styles and selected-path emphasis with confidence legend
- [ ] Optional shader bloom/atmospheric scattering that stays disabled on low-end GPUs
- [ ] Better nested enclosure readability without sphere intersections and occlusion
- [ ] Smooth but restrained camera motion and optional guided architectural tour
- [ ] Selection via accessible symbol list for canvas-only operations

### Performance and quality
- [ ] Reproducible Brave, Safari, Firefox performance and memory benchmarks with system details
- [ ] Profile large-community expansion, glyph counts and link filtering; tighter LOD
- [ ] Progressive parse / streaming normalization for very large graph exports
- [ ] WebGL context loss/recovery, reduced-motion tests and browser resizing regression

### Product and ecosystem
- [ ] Read Graphify schema variants and publish a compatibility matrix
- [ ] Automated integration with the Graphify command workflow
- [ ] Safe export of screenshots, static snapshots and camera positions
- [ ] Publish package with signed or hashed pinned runtime assets
- [ ] Optional documentation and new architecture-specific visual modes
