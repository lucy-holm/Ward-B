// Ward B (Godot) — top-down room map viewer. DEV-ONLY, NEVER SHIPPED.
//
// Served by tools/map_server.py, which is the ONLY thing that ever loads
// this file (see that file's header for why: export_presets.cfg excludes
// tools/* from the Web build, so this can't reach a build even served from
// this directory by accident).
//
// This is the Godot-engine counterpart to the Three.js build's
// src/devtools/map.ts — SAME interaction model, SAME SVG approach, SAME
// colour language, SAME ?room=/?layers= URL state — reading room geometry
// from tools/map_server.py's /rooms.json (itself sourced from
// tools/gen_rooms.py, the verified-byte-identical source of truth for
// Godot room layout; see that file's header) instead of importing TS room
// modules directly. Differences from the reference, and why:
//
//   - Plain browser JS, no build step, no bundler — matches the Godot side
//     having no Node toolchain at all (map_server.py is stdlib-only Python
//     for the same reason).
//   - LIVE REFRESH IS HAND-ROLLED, not a side effect of Vite HMR: this page
//     polls GET /version and, on change, refetches /rooms.json and redraws
//     IN PLACE — pan/zoom, the selected room, the selected level and the
//     layer toggles all survive a save. The reference gets this for free
//     from a full Vite reload (its own URL-state persistence exists to
//     survive THAT); this file has to do the "don't blank the view, don't
//     lose the camera" work itself. See renderRoom() below.
//   - No telemetry-replay layers. There is no Godot telemetry pipeline to
//     feed them (see map_server.py's header) — out of scope, not merely
//     unfinished.
//   - Two Godot-specific additions the reference doesn't have: a
//     "design-law" layer (patrol clearance + inspection-distance
//     visualisation, ROOM_AUTHORING_GODOT.md §4) and per-light circuit tags
//     for the light axis (room16's "bay" breaker). See drawDesignLaw() and
//     drawLights() below.
//   - Real directional sight CONES per patrol leg, using
//     core/tuning.gd's ORDERLY_CONE_DEG, in addition to the reference's
//     conservative "ignores facing" swept-radius band (kept, for the same
//     "is anything at all within range" read the reference uses it for).

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // --- layers ----------------------------------------------------------------
  // Same bottom-to-top draw order convention as map.ts's LAYERS. 'designlaw'
  // is the one entry with no reference counterpart — see this file's header.
  const LAYERS = [
    { id: 'grid', label: 'grid' },
    { id: 'height', label: 'height zones / ramps' },
    { id: 'stairwells', label: 'stairwells (levels)' },
    { id: 'colliders', label: 'colliders' },
    { id: 'blocks', label: 'blocks (mesh)' },
    { id: 'triggers', label: 'triggers / plates' },
    { id: 'patrols', label: 'patrols + sight' },
    { id: 'designlaw', label: 'design-law (clearance + inspection)' },
    { id: 'spawnexits', label: 'spawn / exits' },
    { id: 'interactables', label: 'interactables' },
    { id: 'scrawls', label: 'scrawls' },
    { id: 'iconpanels', label: 'door icon panels' },
    { id: 'lights', label: 'lights (+ circuits)' },
  ];
  // Layers that are OFF until asked for. `designlaw` draws an ~8.2 m
  // inspection-distance circle around EVERY keypad and scrawl — in a room
  // with four scrawls that is five overlapping 16 m discs laid over a 12 m
  // room, which buries the geometry it is meant to help you judge. It is an
  // audit overlay you reach for deliberately, not ambient context, so it
  // starts off. Everything else is cheap and legible always-on.
  const OFF_BY_DEFAULT = new Set(['designlaw']);
  const DEFAULT_LAYER_IDS = new Set(
    LAYERS.map((l) => l.id).filter((id) => !OFF_BY_DEFAULT.has(id)));
  const ALL_LAYER_IDS = LAYERS.map((l) => l.id);

  // --- colour language, ported 1:1 from src/devtools/map.ts --------------
  const STATE_COLORS = { both: '#59605a', lucid: '#4a7fb5', unmed: '#b5574a' };

  // gen_rooms.py's MATERIALS dict, plus 'phosphor'/'breaker' (special-cased
  // there too — see its comment) and 'keypad' (a Godot-only MatName; the
  // reference's MatName union has no equivalent). Same hex FAMILY as the
  // reference's MAT_COLORS where the name is shared, so a room author who
  // knows that palette isn't relearning one.
  const MAT_COLORS = {
    wall: '#8b8f8a', wall2: '#77807a', floor: '#3c423e', ceil: '#313632',
    prop: '#8a8266', bed: '#7a6f66', door: '#a8925c', chain: '#5f6d75',
    pill: '#c8d0c9', pad: '#66707e', dispenser: '#7e8a96', plate: '#8f9a6d',
    glow: '#d9e8cf', phosphor: '#bfffc9', breaker: '#cf7b2e', keypad: '#4a6b7a',
  };

  const TYPE_COLORS = {
    dispenser: '#5fb0d9', keypad: '#d9a05f', door: '#c9b458',
    pill_cup: '#e8e8e8', pill_pickup: '#e8e8e8', switch: '#c96fe0',
    shape_key: '#ffffff', shape_lock: '#e07fd9', push_block: '#8fd9a0',
  };

  const PATROL_COLORS = ['#e05555', '#e0a83f', '#4fc3dd', '#b06fe0', '#5fd98a'];

  const GHOST_OPACITY = 0.15;
  function levelGhost(itemLevel, selectedLevel) {
    if (itemLevel == null || selectedLevel == null || itemLevel === selectedLevel) return {};
    return { opacity: GHOST_OPACITY, 'stroke-dasharray': '0.2 0.15' };
  }

  // --- SVG helpers -------------------------------------------------------
  function el(name, attrs, title) {
    const n = document.createElementNS(SVG_NS, name);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (title) {
      const t = document.createElementNS(SVG_NS, 'title');
      t.textContent = title;
      n.appendChild(t);
    }
    return n;
  }

  function rectFromBounds(minX, minZ, maxX, maxZ, attrs, title) {
    return el('rect', { x: minX, y: minZ, width: maxX - minX, height: maxZ - minZ, ...attrs }, title);
  }

  function labelEl(x, z, text, attrs) {
    const t = el('text', {
      x, y: z, 'font-size': 0.45, 'font-family': 'ui-monospace, monospace',
      fill: '#8a948c', 'text-anchor': 'middle', ...(attrs || {}),
    });
    t.textContent = text;
    return t;
  }

  // --- draw: grid --------------------------------------------------------
  function drawGrid(g, floor) {
    for (let x = Math.ceil(floor.minX); x <= floor.maxX; x++) {
      g.appendChild(el('line', {
        x1: x, y1: floor.minZ, x2: x, y2: floor.maxZ,
        stroke: '#252a25', 'stroke-width': x % 2 === 0 ? 0.035 : 0.015,
      }));
      if (x % 2 === 0) g.appendChild(labelEl(x, floor.minZ - 0.35, String(x)));
    }
    for (let z = Math.ceil(floor.minZ); z <= floor.maxZ; z++) {
      g.appendChild(el('line', {
        x1: floor.minX, y1: z, x2: floor.maxX, y2: z,
        stroke: '#252a25', 'stroke-width': z % 2 === 0 ? 0.035 : 0.015,
      }));
      if (z % 2 === 0) g.appendChild(labelEl(floor.minX - 0.5, z + 0.16, String(z), { 'text-anchor': 'end' }));
    }
    g.appendChild(labelEl((floor.minX + floor.maxX) / 2, floor.minZ - 1.2, 'N (−Z)',
      { 'font-size': 0.6, fill: '#5f6b62' }));
  }

  // --- draw: colliders / blocks -------------------------------------------
  function drawColliders(g, colliders, selectedLevel) {
    for (const c of colliders) {
      g.appendChild(rectFromBounds(c.minX, c.minZ, c.maxX, c.maxZ,
        { fill: STATE_COLORS[c.state], 'fill-opacity': 0.9, ...levelGhost(c.level, selectedLevel) },
        `collider${c.name ? ` '${c.name}'` : ''} x[${c.minX}, ${c.maxX}] z[${c.minZ}, ${c.maxZ}] states:${c.state}` +
          (c.level ? ` level:${c.level}` : '')));
    }
  }

  // Unlike the reference's blockHasCollider (which cross-references a
  // SEPARATE colliders array with state-compatibility rules), a Godot block
  // dict already carries its own hasCollider flag — the generator pairs
  // mesh+collider in one call (see map_server.py's _wall_entries docstring),
  // so there is nothing to search for here.
  function drawBlocks(g, blocks, selectedLevel) {
    for (const b of blocks) {
      const attrs = {
        fill: 'none', stroke: MAT_COLORS[b.mat] || '#888a86', 'stroke-width': 0.06,
        ...levelGhost(b.level, selectedLevel),
      };
      if (!b.hasCollider) attrs['stroke-dasharray'] = '0.25 0.15';
      if (b.state && b.state !== 'both') {
        attrs.fill = STATE_COLORS[b.state];
        attrs['fill-opacity'] = 0.25;
      }
      // The light axis (core/light_object.gd): a 'lit' mesh dies with the
      // breaker, a 'dark' one is glow paint invisible until the lights go
      // out. Tinted distinctly from the state-filter fill (which uses the
      // SAME blue/red the colliders layer uses) so the two axes don't read
      // as one one signal — light-gating never touches collision (see
      // Room.block()'s docstring; ROOM_AUTHORING_GODOT.md §3), so conflating
      // their colours would misrepresent that they're independent.
      if (b.light === 'lit') { attrs.stroke = '#e8d44d'; attrs['stroke-dasharray'] = '0.12 0.08'; }
      if (b.light === 'dark') { attrs.stroke = '#bfffc9'; attrs['stroke-dasharray'] = '0.12 0.08'; }
      const title = `${b.kind ? b.kind + ' ' : 'block '}${b.mat}${b.name ? ` '${b.name}'` : ''} ` +
        `x[${b.minX}, ${b.maxX}] z[${b.minZ}, ${b.maxZ}]` +
        (b.state !== 'both' ? ` states:${b.state}` : '') +
        (b.light ? ` [${b.light}-only]` : '') +
        (!b.hasCollider ? ' (mesh only, no collider)' : '') +
        (b.level ? ` level:${b.level}` : '');
      g.appendChild(rectFromBounds(b.minX, b.minZ, b.maxX, b.maxZ, attrs, title));
    }
  }

  // --- draw: triggers / plates --------------------------------------------
  function drawTriggers(g, triggers) {
    for (const t of triggers) {
      const fill = t.state === 'both' ? '#9d6fe0' : STATE_COLORS[t.state];
      g.appendChild(rectFromBounds(t.minX, t.minZ, t.maxX, t.maxZ,
        { fill, 'fill-opacity': t.state === 'both' ? 0.3 : 0.45, stroke: '#9d6fe0', 'stroke-width': 0.05 },
        `trigger '${t.id}' x[${t.minX}, ${t.maxX}] z[${t.minZ}, ${t.maxZ}] states:${t.state}`));
      g.appendChild(labelEl((t.minX + t.maxX) / 2, (t.minZ + t.maxZ) / 2, t.id,
        { fill: '#c9aef0', 'font-size': 0.45 }));
    }
  }

  // --- draw: height zones / ramps / stairwells ----------------------------
  function drawHeight(g, zones, ramps) {
    for (const z of zones) {
      g.appendChild(rectFromBounds(z.minX, z.minZ, z.maxX, z.maxZ,
        { fill: '#4a5d6e', 'fill-opacity': 0.35, stroke: '#6d8699', 'stroke-width': 0.04 },
        `heightZone y=${z.y} x[${z.minX}, ${z.maxX}] z[${z.minZ}, ${z.maxZ}]`));
      g.appendChild(labelEl((z.minX + z.maxX) / 2, (z.minZ + z.maxZ) / 2, `y=${z.y}`,
        { fill: '#9db8cc', 'font-size': 0.55 }));
    }
    for (const r of ramps) {
      g.appendChild(rectFromBounds(r.minX, r.minZ, r.maxX, r.maxZ,
        { fill: '#5e6e4a', 'fill-opacity': 0.35, stroke: '#87996d', 'stroke-width': 0.04 },
        `ramp axis:${r.axis} y ${r.yLow}→${r.yHigh} x[${r.minX}, ${r.maxX}] z[${r.minZ}, ${r.maxZ}]`));
      const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
      const [x1, z1, x2, z2] = r.axis === 'x'
        ? [r.minX + 0.3, cz, r.maxX - 0.3, cz]
        : [cx, r.minZ + 0.3, cx, r.maxZ - 0.3];
      g.appendChild(el('line', { x1, y1: z1, x2, y2: z2, stroke: '#b3c996', 'stroke-width': 0.06, 'marker-end': 'url(#arrow)' }));
      g.appendChild(labelEl(x1, z1 - 0.25, `y=${r.yLow}`, { fill: '#b3c996', 'font-size': 0.4 }));
      g.appendChild(labelEl(x2, z2 - 0.25, `y=${r.yHigh}`, { fill: '#b3c996', 'font-size': 0.4 }));
    }
  }

  function drawStairwells(g, stairwells) {
    for (const s of stairwells) {
      g.appendChild(rectFromBounds(s.minX, s.minZ, s.maxX, s.maxZ,
        { fill: '#8a6a3f', 'fill-opacity': 0.35, stroke: '#c99a5f', 'stroke-width': 0.05 },
        `stairwell '${s.id}' axis:${s.axis} ${s.levelAtLow}(y=${s.yLow}) -> ${s.levelAtHigh}(y=${s.yHigh}) ` +
          `x[${s.minX}, ${s.maxX}] z[${s.minZ}, ${s.maxZ}]`));
      const cx = (s.minX + s.maxX) / 2, cz = (s.minZ + s.maxZ) / 2;
      const [x1, z1, x2, z2] = s.axis === 'x'
        ? [s.minX + 0.3, cz, s.maxX - 0.3, cz]
        : [cx, s.minZ + 0.3, cx, s.maxZ - 0.3];
      g.appendChild(el('line', { x1, y1: z1, x2, y2: z2, stroke: '#e0b878', 'stroke-width': 0.08, 'marker-end': 'url(#arrow)' }));
      g.appendChild(labelEl(x1, z1 - 0.25, s.levelAtLow, { fill: '#e0b878', 'font-size': 0.42 }));
      g.appendChild(labelEl(x2, z2 - 0.25, s.levelAtHigh, { fill: '#e0b878', 'font-size': 0.42 }));
      g.appendChild(labelEl(cx, cz + 0.35, s.id, { fill: '#e0b878', 'font-size': 0.4 }));
    }
  }

  // --- draw: spawn / exits -------------------------------------------------
  function drawSpawnExits(g, spawn, exits) {
    for (const x of exits) {
      g.appendChild(rectFromBounds(x.minX, x.minZ, x.maxX, x.maxZ,
        { fill: '#3fae5a', 'fill-opacity': 0.35, stroke: '#3fae5a', 'stroke-width': 0.04 },
        `exit → ${x.to} x[${x.minX}, ${x.maxX}] z[${x.minZ}, ${x.maxZ}]`));
      g.appendChild(labelEl((x.minX + x.maxX) / 2, (x.minZ + x.maxZ) / 2 + 0.16, `→ ${x.to}`,
        { fill: '#7ee39b', 'font-size': 0.5 }));
    }
    // Forward at yaw theta is (-sin theta, -cos theta) in (x, z): yaw 0
    // faces north (-Z, up on this map) — identical convention to the
    // reference's drawSpawnExits, since gen_rooms.py's spawn yaw and the
    // Three.js build's use the same axis/rotation sense.
    g.appendChild(el('polygon', {
      points: '0,-0.6 0.38,0.42 0,0.16 -0.38,0.42', fill: '#f0e68c',
      transform: `translate(${spawn.x} ${spawn.z}) rotate(${(-spawn.yaw * 180) / Math.PI})`,
    }, `spawn (${spawn.x}, ${spawn.z}) yaw=${spawn.yaw}`));
  }

  // --- draw: interactables / scrawls / icon panels / lights ----------------
  function drawInteractables(g, interactables, selectedLevel) {
    for (const it of interactables) {
      const c = it.color || TYPE_COLORS[it.type] || '#ffffff';
      const ghost = levelGhost(it.level, selectedLevel);
      g.appendChild(el('circle', {
        cx: it.pos[0], cy: it.pos[2], r: 0.18, fill: c, stroke: '#14171a', 'stroke-width': 0.04, ...ghost,
      }, `${it.type} "${it.id}" pos[${it.pos.join(', ')}]` +
        (it.state !== 'both' ? ` states:${it.state}` : '') +
        (it.light ? ` [${it.light}-only]` : '') +
        (it.shape ? ` shape:${it.shape}` : '') +
        (it.shapes ? ` requires:[${it.shapes.join(', ')}]` : '')));
      g.appendChild(labelEl(it.pos[0], it.pos[2] - 0.35, it.id, { fill: c, 'font-size': 0.4, ...ghost }));
    }
  }

  function drawIconPanels(g, iconPanels) {
    for (const p of iconPanels) {
      const n = p.shapes.length;
      const spacing = 0.4;
      const startX = p.pos[0] - ((n - 1) * spacing) / 2;
      const required = p.shapes.map((s) => s.shape).join(', ');
      p.shapes.forEach((s, i) => {
        g.appendChild(el('rect', {
          x: startX + i * spacing - 0.12, y: p.pos[2] - 0.12, width: 0.24, height: 0.24,
          fill: s.color || '#ffffff', stroke: '#14171a', 'stroke-width': 0.03,
        }, `iconPanel '${p.id}' shape ${i}: ${s.shape} (${s.color}) — requires [${required}]`));
      });
      g.appendChild(labelEl(p.pos[0], p.pos[2] + 0.5, p.id, { fill: '#e0c9f0', 'font-size': 0.4 }));
    }
  }

  function drawScrawls(g, scrawls, selectedLevel) {
    for (const s of scrawls) {
      const ghost = levelGhost(s.level, selectedLevel);
      g.appendChild(el('circle', {
        cx: s.pos[0], cy: s.pos[2], r: 0.12, fill: s.ink === 'phosphor' ? '#bfffc9' : '#d98fb0', ...ghost,
      }, `scrawl "${s.text}" pos[${s.pos.join(', ')}] size:${s.size}` +
        (s.ink === 'phosphor' ? ' ink:phosphor' : '') +
        (s.light ? ` [${s.light}-only]` : '')));
      g.appendChild(labelEl(s.pos[0], s.pos[2] + 0.55, `“${s.text.split('\n')[0]}”`,
        { fill: '#d98fb0', 'font-size': 0.38, 'font-style': 'italic', ...ghost }));
    }
  }

  function drawLights(g, lights) {
    for (const l of lights) {
      g.appendChild(el('circle', {
        cx: l.pos[0], cy: l.pos[2], r: 0.16, fill: '#e8d44d', 'fill-opacity': 0.8,
      }, `light (${l.pos[0]}, ${l.pos[2]}) circuit:${l.circuit}`));
      // THE LIGHT AXIS's circuit tag — a Godot-only addition (see this
      // file's header). Only rendered for a non-default circuit (room16's
      // "bay" is currently the sole consumer — see core/atmosphere.gd's
      // CIRCUITS block) so the ~350 ordinary "house" fittings across the
      // ward don't each grow a redundant label.
      if (l.circuit && l.circuit !== 'house') {
        g.appendChild(labelEl(l.pos[0], l.pos[2] + 0.38, l.circuit,
          { fill: '#e8d44d', 'font-size': 0.32 }));
      }
    }
  }

  // --- draw: patrols + real sight cones -------------------------------------
  //
  // Two visual layers per route, both from core/tuning.gd's live numbers
  // (never hardcoded — see fetchRooms(), which hands `tuning` all the way
  // down here):
  //
  //   1. THE SWEPT ENVELOPE (kept from the reference, same construction:
  //      the closed loop drawn at 2*sightRange stroke width with round
  //      caps/joins IS the "every point within sightRange of any leg" band).
  //      Conservative and facing-blind, on purpose — the same "useful for
  //      the inspection-distance intuition, not a simulation" reasoning
  //      map.ts's drawPatrols documents. Low, near-invisible opacity: it is
  //      backdrop context, not the headline signal.
  //   2. REAL DIRECTIONAL CONES, one per leg, anchored at the leg's START
  //      waypoint and pointed at its END waypoint — literally "the
  //      detection cone along patrol legs" the task asks for, at
  //      ORDERLY_CONE_DEG (55 deg total) and ORDERLY_SIGHT_RANGE (6m),
  //      brighter than the envelope so it reads as the primary signal.
  function drawPatrols(g, patrols, selectedLevel, tuning) {
    const range = tuning.ORDERLY_SIGHT_RANGE;
    const halfAngle = (tuning.ORDERLY_CONE_DEG / 2) * (Math.PI / 180);

    patrols.forEach((p, i) => {
      const pts = p.points;
      if (pts.length === 0) return;
      const color = PATROL_COLORS[i % PATROL_COLORS.length];
      const ghost = levelGhost(p.level, selectedLevel);
      const closed = [...pts, pts[0]];
      const ptStr = closed.map((w) => `${w.x},${w.z}`).join(' ');

      g.appendChild(el('polyline', {
        points: ptStr, fill: 'none', stroke: color, 'stroke-width': range * 2,
        'stroke-opacity': 0.07, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...ghost,
      }, `swept sight envelope r=${range}m [${p.name}]${p.level ? ` level:${p.level}` : ''}`));

      const n = pts.length;
      for (let li = 0; li < n; li++) {
        const a = pts[li], c = pts[(li + 1) % n];
        const dx = c.x - a.x, dz = c.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 1e-6) continue;
        const heading = Math.atan2(dz, dx);
        const a0 = heading - halfAngle, a1 = heading + halfAngle;
        const p1x = a.x + range * Math.cos(a0), p1z = a.z + range * Math.sin(a0);
        const p2x = a.x + range * Math.cos(a1), p2z = a.z + range * Math.sin(a1);
        const danger = p.dangerLegs && p.dangerLegs.includes(li);
        g.appendChild(el('path', {
          d: `M ${a.x},${a.z} L ${p1x},${p1z} A ${range} ${range} 0 0 1 ${p2x},${p2z} Z`,
          fill: color, 'fill-opacity': 0.14, stroke: color, 'stroke-width': 0.02,
          'stroke-opacity': 0.4, ...ghost,
        }, `sight cone, leg ${li}→${(li + 1) % n} [${p.name}] range=${range}m cone=${tuning.ORDERLY_CONE_DEG}°`));
        // The leg itself, redrawn bold red on top when check_rooms.gd's
        // wedge-bug rule would fail on it (< ORDERLY_RADIUS + 0.1 from an
        // always-solid collider) — see drawDesignLaw's header for why this
        // check lives server-side, computed once, not re-derived here.
        if (danger) {
          g.appendChild(el('line', {
            x1: a.x, y1: a.z, x2: c.x, y2: c.z, stroke: '#ff3b3b', 'stroke-width': 0.14,
            'stroke-opacity': 0.85, ...ghost,
          }, `WEDGE-BUG RISK: leg ${li}→${(li + 1) % n} [${p.name}] passes too close to an always-solid collider`));
        }
      }

      g.appendChild(el('polyline', { points: ptStr, fill: 'none', stroke: color, 'stroke-width': 0.08, ...ghost }));
      pts.forEach((w, idx) => {
        const danger = p.dangerWaypoints && p.dangerWaypoints.includes(idx);
        g.appendChild(el('circle', {
          cx: w.x, cy: w.z, r: danger ? 0.3 : 0.22,
          fill: danger ? '#ff3b3b' : color, stroke: danger ? '#ffffff' : 'none', 'stroke-width': 0.03, ...ghost,
        }, `waypoint ${idx} (${w.x}, ${w.z}) [${p.name}]` + (danger ? ' — WEDGE-BUG RISK' : '')));
        g.appendChild(labelEl(w.x + 0.35, w.z - 0.25, String(idx),
          { fill: color, 'text-anchor': 'start', 'font-size': 0.5, ...ghost }));
      });
      g.appendChild(labelEl(pts[0].x, pts[0].z + 0.75, p.name, { fill: color, 'font-size': 0.5, ...ghost }));
    });
  }

  // --- draw: design-law overlay (Godot-only — see this file's header) -----
  //
  // Both checks below are pre-computed SERVER-SIDE (map_server.py's
  // _compute_patrol_danger / _nearest_leg_dist), ported term-for-term from
  // tools/check_rooms.gd's own _check_patrol algorithm — not re-implemented
  // here — so "does the map agree with the real validator" stays a code
  // comparison against ONE source of the geometry (Python), not two
  // (Python here, JS there) that could quietly drift apart. This layer only
  // draws what the server already flagged.
  //
  // Patrol clearance red-highlighting is drawn inside drawPatrols (it needs
  // to interleave with the patrol polyline/waypoints, not sit on top as a
  // separate pass) — this function draws the OTHER design-law visual, the
  // inspection-distance circle around every keypad and scrawl.
  function drawDesignLaw(g, inspectionPoints, inspectionDistanceM) {
    for (const ip of inspectionPoints) {
      const color = ip.danger ? '#ff6b4a' : '#5c8a5c';
      g.appendChild(el('circle', {
        cx: ip.x, cy: ip.z, r: inspectionDistanceM, fill: 'none', stroke: color,
        'stroke-width': 0.05, 'stroke-dasharray': '0.3 0.2', 'stroke-opacity': ip.danger ? 0.85 : 0.35,
      }, `inspection point '${ip.label}' (${ip.kind}) — nearest patrol leg ` +
        `${ip.nearestLegDist == null ? 'n/a' : ip.nearestLegDist.toFixed(2) + 'm'}, ` +
        `needs ≥${inspectionDistanceM.toFixed(2)}m for a full ${2.5}s reaction` +
        (ip.danger ? ' — TOO CLOSE' : '')));
      if (ip.danger) {
        g.appendChild(el('circle', { cx: ip.x, cy: ip.z, r: 0.08, fill: '#ff6b4a' }));
      }
    }
  }

  // --- URL state -----------------------------------------------------------
  function readUrl() {
    const q = new URLSearchParams(location.search);
    const room = q.get('room') || 'room1';
    const raw = q.get('layers');
    const level = q.get('level');
    const layers = raw === null
      ? new Set(DEFAULT_LAYER_IDS)
      : new Set(ALL_LAYER_IDS.filter((id) => raw.split(',').includes(id)));
    return { room, layers, level };
  }

  function writeUrl(room, layers, level) {
    const q = new URLSearchParams();
    q.set('room', room);
    if (layers.size !== LAYERS.length) q.set('layers', [...layers].join(','));
    if (level != null) q.set('level', level);
    history.replaceState(null, '', `?${q.toString()}`);
  }

  // --- app state -------------------------------------------------------------
  const state = readUrl();
  let payload = null;         // last successful /rooms.json body
  let lastVersion = null;     // last seen /version value
  let currentLevel = null;    // level actually selected for the current room
  let viewBox = null;         // { x, y, w, h } — persists across in-place redraws

  const viewport = document.getElementById('viewport');
  const errorBox = document.getElementById('error');
  const roomSelect = document.getElementById('room-select');
  const levelSelect = document.getElementById('level-select');
  const layersBox = document.getElementById('layers');
  const statusLine = document.getElementById('status-line');
  const resetViewBtn = document.getElementById('reset-view');

  let svgEl = null;

  function ensureSvg() {
    if (svgEl) return svgEl;
    svgEl = el('svg', {});
    wireInteraction(svgEl);
    viewport.appendChild(svgEl);
    return svgEl;
  }

  function applyViewBox() {
    if (!svgEl || !viewBox) return;
    svgEl.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }

  function defaultViewBoxForFloor(floor) {
    const M = 2.5; // margin (m), matches the reference's out-of-bounds label margin
    return { x: floor.minX - M, y: floor.minZ - M, w: (floor.maxX - floor.minX) + 2 * M, h: (floor.maxZ - floor.minZ) + 2 * M };
  }

  // --- pan / zoom ------------------------------------------------------------
  // NOT present in the reference viewer at all (its viewBox is purely
  // computed, never interactive) — added here because the task explicitly
  // calls out "pan/zoom ... must survive a save" as part of the live-refresh
  // bar, which only makes sense if the tool has pan/zoom to begin with.
  const MIN_W = 2, MAX_W = 400; // world-metres of viewBox width, clamps zoom range
  function wireInteraction(svg) {
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!viewBox) return;
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      const worldX = viewBox.x + mx * viewBox.w;
      const worldZ = viewBox.y + my * viewBox.h;
      const factor = Math.pow(1.0015, e.deltaY);
      const newW = Math.max(MIN_W, Math.min(MAX_W, viewBox.w * factor));
      const scale = newW / viewBox.w;
      const newH = viewBox.h * scale;
      viewBox = { x: worldX - mx * newW, y: worldZ - my * newH, w: newW, h: newH };
      applyViewBox();
    }, { passive: false });

    let drag = null;
    svg.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      drag = { startX: e.clientX, startY: e.clientY, vb: { ...viewBox } };
      svg.classList.add('panning');
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - drag.startX) / rect.width) * drag.vb.w;
      const dz = ((e.clientY - drag.startY) / rect.height) * drag.vb.h;
      viewBox = { x: drag.vb.x - dx, y: drag.vb.y - dz, w: drag.vb.w, h: drag.vb.h };
      applyViewBox();
    });
    window.addEventListener('mouseup', () => {
      drag = null;
      svg.classList.remove('panning');
    });
  }

  resetViewBtn.addEventListener('click', () => {
    const room = payload && payload.rooms[state.room];
    if (room && room.floor) {
      viewBox = defaultViewBoxForFloor(activeFloor(room, currentLevel));
      applyViewBox();
    }
  });

  // --- level helpers ---------------------------------------------------------
  function activeFloor(room, levelId) {
    if (room.levels && room.levels.length) {
      const lvl = room.levels.find((l) => l.id === levelId) || room.levels[0];
      if (lvl && lvl.floor) return { minX: lvl.floor[0], maxX: lvl.floor[1], minZ: lvl.floor[2], maxZ: lvl.floor[3] };
    }
    return room.floor;
  }

  function populateLevelSelect(room, requested) {
    levelSelect.replaceChildren();
    if (!room.levels || room.levels.length === 0) {
      levelSelect.hidden = true;
      return null;
    }
    levelSelect.hidden = false;
    for (const lvl of room.levels) {
      const opt = document.createElement('option');
      opt.value = lvl.id;
      opt.textContent = `${lvl.id} (y=${lvl.baseY})`;
      levelSelect.appendChild(opt);
    }
    const selected = requested && room.levels.some((l) => l.id === requested) ? requested : room.levels[0].id;
    levelSelect.value = selected;
    return selected;
  }

  // --- error / status panel ---------------------------------------------------
  function updateErrorAndStatus() {
    const room = payload && payload.rooms[state.room];
    const moduleError = payload && payload.moduleError;
    const roomError = room && !room.ok ? room.error : null;

    if (moduleError) {
      errorBox.hidden = false;
      errorBox.textContent = `gen_rooms.py failed to import:\n\n${moduleError}`;
    } else if (roomError) {
      errorBox.hidden = false;
      errorBox.textContent = `${state.room}() failed to build:\n\n${roomError}` +
        (room.stale ? '\n\n(showing the last successfully built geometry for this room, below)' : '');
    } else {
      errorBox.hidden = true;
    }

    if (!payload) {
      statusLine.textContent = 'connecting…';
      statusLine.classList.remove('stale');
      return;
    }
    const brokenCount = Object.values(payload.rooms).filter((r) => !r.ok).length;
    const now = new Date().toLocaleTimeString();
    let line = `last refresh ${now} — ${payload.roomIds.length} rooms`;
    if (brokenCount > 0) line += `, ${brokenCount} broken`;
    statusLine.textContent = line;
    statusLine.classList.toggle('stale', brokenCount > 0);
  }

  // --- room selector -----------------------------------------------------------
  function rebuildRoomSelect() {
    const prev = roomSelect.value;
    roomSelect.replaceChildren();
    for (const id of payload.roomIds) {
      const r = payload.rooms[id];
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = r.ok ? `${id} — ${r.name}` : `${id} — ⚠ broken`;
      roomSelect.appendChild(opt);
    }
    const want = payload.rooms[state.room] ? state.room : (payload.rooms[prev] ? prev : payload.roomIds[0]);
    state.room = want;
    roomSelect.value = want;
  }

  // --- render ------------------------------------------------------------------
  // resetView=true on an actual room/level switch (a fresh camera makes
  // sense — you just picked a different room); false on every poll-driven
  // redraw, which is the whole point of the exercise (see this file's header).
  function renderRoom(resetView) {
    const svg = ensureSvg();
    updateErrorAndStatus();

    const room = payload && payload.rooms[state.room];
    if (!room || !room.floor) {
      // Never built successfully even once — nothing to draw. This is the
      // one case where a blank view is correct (there is no "last good" to
      // fall back to), matching the reference's own load-error behaviour.
      svg.replaceChildren();
      currentLevel = null;
      return;
    }

    currentLevel = populateLevelSelect(room, state.level);
    const floor = activeFloor(room, currentLevel);

    if (resetView || !viewBox) viewBox = defaultViewBoxForFloor(floor);

    svg.replaceChildren();
    applyViewBox();

    svg.appendChild(rectFromBounds(floor.minX, floor.minZ, floor.maxX, floor.maxZ, { fill: '#1c211c' },
      `floor x[${floor.minX}, ${floor.maxX}] z[${floor.minZ}, ${floor.maxZ}]`));

    if (room.startDark) {
      svg.appendChild(labelEl((floor.minX + floor.maxX) / 2, floor.minZ - 1.85, 'LIGHTS: OFF AT START',
        { 'font-size': 0.55, fill: '#c96fe0' }));
    }

    const defs = el('defs');
    const marker = el('marker', { id: 'arrow', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' });
    marker.appendChild(el('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#b3c996' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    const groups = {};
    for (const l of LAYERS) {
      const g = el('g', { id: `layer-${l.id}` });
      if (!state.layers.has(l.id)) g.setAttribute('display', 'none');
      groups[l.id] = g;
      svg.appendChild(g);
    }

    const activeLevel = room.levels && room.levels.find((l) => l.id === currentLevel);
    const zones = activeLevel ? activeLevel.heightZones : room.heightZones;
    const ramps = activeLevel ? activeLevel.ramps : room.ramps;

    drawGrid(groups.grid, floor);
    drawHeight(groups.height, zones, ramps);
    drawStairwells(groups.stairwells, room.stairwells);
    drawColliders(groups.colliders, room.colliders, currentLevel);
    drawBlocks(groups.blocks, room.blocks, currentLevel);
    drawTriggers(groups.triggers, room.triggers);
    drawPatrols(groups.patrols, room.patrols, currentLevel, payload.tuning);
    drawDesignLaw(groups.designlaw, room.inspectionPoints, payload.inspectionDistanceM);
    drawSpawnExits(groups.spawnexits, room.spawn, room.exits);
    drawInteractables(groups.interactables, room.interactables, currentLevel);
    drawScrawls(groups.scrawls, room.scrawls, currentLevel);
    drawIconPanels(groups.iconpanels, room.iconPanels);
    drawLights(groups.lights, room.lights);

    writeUrl(state.room, state.layers, currentLevel);
  }

  // --- layer checkboxes --------------------------------------------------------
  for (const l of LAYERS) {
    const lab = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.layers.has(l.id);
    cb.addEventListener('change', () => {
      if (cb.checked) state.layers.add(l.id);
      else state.layers.delete(l.id);
      writeUrl(state.room, state.layers, currentLevel);
      const g = document.getElementById(`layer-${l.id}`);
      if (g) g.setAttribute('display', cb.checked ? 'inline' : 'none');
    });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(` ${l.label}`));
    layersBox.appendChild(lab);
  }

  roomSelect.addEventListener('change', () => {
    state.room = roomSelect.value;
    state.level = null; // new room's level set may not share the old id
    renderRoom(true);
  });
  levelSelect.addEventListener('change', () => {
    state.level = levelSelect.value;
    renderRoom(true);
  });

  // --- fetch / poll --------------------------------------------------------------
  async function fetchRooms() {
    const res = await fetch('/rooms.json', { cache: 'no-store' });
    payload = await res.json();
  }

  async function pollVersion() {
    try {
      const res = await fetch('/version', { cache: 'no-store' });
      const { version } = await res.json();
      if (version !== lastVersion) {
        lastVersion = version;
        await fetchRooms();
        rebuildRoomSelect();
        renderRoom(false); // IN PLACE — see this file's header
      }
    } catch (e) {
      // A transient fetch failure (server mid-restart) shows in the status
      // line only — never touches the SVG, per the same "don't blank on a
      // transient error" rule the error box follows.
      statusLine.textContent = `poll failed: ${e instanceof Error ? e.message : String(e)}`;
      statusLine.classList.add('stale');
    }
  }

  async function main() {
    await fetchRooms();
    const v = await fetch('/version', { cache: 'no-store' }).then((r) => r.json());
    lastVersion = v.version;
    rebuildRoomSelect();
    renderRoom(true);
    setInterval(pollVersion, 500);
  }

  main();
})();
