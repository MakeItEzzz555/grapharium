/* Grapharium's data/layout engine. Calls never become containment. */
(function (root) {
  'use strict';
  const containment = new Set(['contains', 'method', 'defines', 'case_of']);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function create(data) {
    const nodes = data.n, edges = data.l, byId = new Map(), communities = new Map(), files = new Map();
    const parents = new Map(), children = new Map(), adjacency = new Map(), communityEdges = new Map();
    const conflicts = [], candidate = new Map();
    nodes.forEach((n, i) => {
      byId.set(n.id, i); adjacency.set(i, []); children.set(i, []);
      if (!communities.has(n.c)) communities.set(n.c, []);
      communities.get(n.c).push(i);
      if (n.file) { if (!files.has(n.file)) files.set(n.file, []); files.get(n.file).push(i); }
    });
    edges.forEach((e, i) => {
      if (!nodes[e.source] || !nodes[e.target]) return;
      adjacency.get(e.source).push(i); if (e.source !== e.target) adjacency.get(e.target).push(i);
      if (nodes[e.source].c === nodes[e.target].c) {
        const c = nodes[e.source].c;
        if (!communityEdges.has(c)) communityEdges.set(c, []);
        communityEdges.get(c).push(i);
      }
      if (!containment.has(e.relation) || e.confidence !== 'EXTRACTED') return;
      if (e.source === e.target || !nodes[e.source].file || nodes[e.source].file !== nodes[e.target].file) {
        conflicts.push({edge: i, reason: 'self or cross-file containment'}); return;
      }
      if (!candidate.has(e.target)) candidate.set(e.target, new Map());
      const options = candidate.get(e.target);
      if (!options.has(e.source)) options.set(e.source, i);
    });
    candidate.forEach((options, child) => {
      if (options.size === 1) {
        const [parent, edge] = options.entries().next().value; parents.set(child, {parent, edge});
      } else conflicts.push({child, reason: 'multiple explicit parents', edges: [...options.values()]});
    });
    // Functional parent graph: remove all edges in a cycle, without recursive stacks.
    const done = new Set();
    nodes.forEach((_, start) => {
      if (done.has(start)) return;
      const path = [], seen = new Map(); let cursor = start;
      while (parents.has(cursor) && !done.has(cursor)) {
        if (seen.has(cursor)) {
          path.slice(seen.get(cursor)).forEach(child => { conflicts.push({edge: parents.get(child).edge, reason: 'containment cycle'}); parents.delete(child); });
          break;
        }
        seen.set(cursor, path.length); path.push(cursor); cursor = parents.get(cursor).parent;
      }
      path.forEach(i => done.add(i));
    });
    parents.forEach((p, child) => children.get(p.parent).push(child));
    const depth = new Map();
    nodes.forEach((_, i) => {
      if (depth.has(i)) return;
      const path = []; let x = i;
      while (!depth.has(x)) { path.push(x); if (!parents.has(x)) break; x = parents.get(x).parent; }
      let d = depth.has(x) ? depth.get(x) + 1 : 0;
      while (path.length) depth.set(path.pop(), d++);
    });
    const searchText = nodes.map(n => (n.label + '\n' + n.file).toLowerCase());
    return {nodes, edges, byId, communities, files, parents, children, adjacency, communityEdges, conflicts, depth,
      search(q, limit = 24) { q = q.trim().toLowerCase(); const out = []; if (q.length < 2) return out; for (let i = 0; i < nodes.length && out.length < limit; i++) if (searchText[i].includes(q)) out.push(i); return out; }};
  }
  function category(n, depth) {
    if (n.type === 'document' || n.role === 'heading' || n.role === 'page') return 'document';
    if (/event|signal|notification/.test(n.role.toLowerCase())) return 'event';
    if (depth > 1) return 'moon';
    if (depth === 1) return 'planet';
    return n.klass || n.callable ? 'star' : 'asteroid';
  }
  function radius(n, degree) {
    return (n.klass ? 6.5 : n.callable ? 4 : 2.8) + Math.min(6, Math.log2(1 + degree) * .65);
  }
  function layout(model, indices, options = {}) {
    const orbit = options.orbit || 1, separation = options.separation || 1, depthLimit = options.depthLimit ?? options.depth ?? Infinity;
    const keep = new Set(indices), visible = new Set(), records = new Map(), systems = new Map();
    indices.forEach(i => { if (model.depth.get(i) <= depthLimit || i === options.selected) visible.add(i); });
    // Selected deep symbols keep their ancestors visible even below the expansion limit.
    if (options.selected != null && keep.has(options.selected)) {
      let i = options.selected;
      while (model.parents.has(i)) { i = model.parents.get(i).parent; if (keep.has(i)) visible.add(i); }
    }
    visible.forEach(i => {
      const n = model.nodes[i], r = radius(n, model.adjacency.get(i).length);
      records.set(i, {id: n.id, index: i, name: n.label, file: n.file, c: n.c, radius: r, category: category(n, model.depth.get(i)), x: 0, y: 0, z: 0, bound: r + 4, children: []});
      const key = n.file || '(unlocated)';
      if (!systems.has(key)) systems.set(key, {id: 'file:' + key, name: key.split('/').pop(), file: n.file, category: 'system', c: n.c, children: [], count: model.files.get(n.file)?.length || 1});
    });
    records.forEach((r, i) => {
      const p = model.parents.get(i), parent = p && records.get(p.parent);
      (parent || systems.get(model.nodes[i].file || '(unlocated)')).children.push(r);
      r.parent = parent ? parent.id : systems.get(model.nodes[i].file || '(unlocated)').id;
      r.provenance = parent ? 'EXTRACTED' : 'INFERRED_FILE';
    });
    const ordered = [...records.values()].sort((a, b) => model.depth.get(b.index) - model.depth.get(a.index));
    function placeChildren(parent) {
      const kids = parent.children, n = kids.length; if (!n) return;
      const maxR = Math.max(...kids.map(k => k.bound));
      const shell = Math.max(parent.radius || 10, maxR) + (Math.sqrt(n) * maxR * .95 + 12) * orbit;
      const rng = random(hash(parent.id)), rotation = rng() * Math.PI * 2;
      kids.forEach((k, i) => {
        const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), angle = i * 2.39996323 + rotation;
        k.dx = Math.cos(angle) * r * shell; k.dy = y * shell; k.dz = Math.sin(angle) * r * shell;
      });
      parent.bound = shell + maxR + 8;
    }
    ordered.forEach(placeChildren);
    const allSystems = [...systems.values()];
    allSystems.forEach(s => { s.radius = 8 + Math.log2(1 + s.count) * 2; s.bound = s.radius; placeChildren(s); });
    allSystems.sort((a, b) => b.bound - a.bound || a.id.localeCompare(b.id));
    // Spatial hash packs conservative system bounds. Bounded retries have a safe separated fallback.
    const maxBound = Math.max(1, ...allSystems.map(s => s.bound)), cell = maxBound * 2 * separation + 30, buckets = new Map();
    const rng = random(137), placed = []; let farX = 0;
    function cellKey(x, y, z) { return x + ',' + y + ',' + z; }
    function fits(s) {
      const x = Math.floor(s.x / cell), y = Math.floor(s.y / cell), z = Math.floor(s.z / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        for (const p of buckets.get(cellKey(x + dx, y + dy, z + dz)) || []) {
          if (Math.hypot(s.x - p.x, s.y - p.y, s.z - p.z) < (s.bound + p.bound) * separation + 24) return false;
        }
      }
      return true;
    }
    allSystems.forEach((s, i) => {
      let ok = false;
      for (let trial = 0; trial < 96; trial++) {
        const reach = Math.cbrt(i + 1) * maxBound * separation * (1.05 + trial * .018);
        s.x = (rng() - .5) * reach * 2; s.y = (rng() - .5) * reach; s.z = (rng() - .5) * reach * 2;
        if (fits(s)) { ok = true; break; }
      }
      if (!ok) { s.x = farX + s.bound * separation + 30; s.y = 0; s.z = 0; }
      farX = Math.max(farX, s.x + s.bound * separation);
      const key = cellKey(Math.floor(s.x / cell), Math.floor(s.y / cell), Math.floor(s.z / cell));
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(s); placed.push(s);
    });
    const queue = allSystems.slice();
    for (let i = 0; i < queue.length; i++) for (const c of queue[i].children) {
      c.x = queue[i].x + c.dx; c.y = queue[i].y + c.dy; c.z = queue[i].z + c.dz; queue.push(c);
    }
    return {nodes: [...records.values()], systems: allSystems, total: indices.length, hidden: indices.length - visible.size};
  }
  const api = {create, layout, hash, random, category};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GraphariumHierarchy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
