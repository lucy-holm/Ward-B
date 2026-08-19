#!/usr/bin/env python3
"""
Ward B — Godot room map viewer, dev server.

DEV-ONLY. NEVER SHIPPED. Same contract as tools/gen_rooms.py and every other
file under tools/: export_presets.cfg's Web preset excludes it explicitly
(`exclude_filter="tools/*,orderly/preview*"`, checked against that file while
building this), so nothing here can reach a build even by accident. Run it by
hand, next to the editor, while authoring a room.

    python3 tools/map_server.py                # http://127.0.0.1:8912/
    python3 tools/map_server.py --host 0.0.0.0  # reachable over Tailscale

Port 8912 is arbitrary but NOT free real estate: 8899 is
tools/verify_web.mjs's/measure_fps.mjs's web-export test server, 8091/8444
are tools/deploy_tailnet.sh's tunnelled build, 80 is tools/nginx-godot.conf.
8912 collided with nothing bound on this machine at the time of writing —
recheck with `lsof -nP -iTCP -sTCP:LISTEN` if that ever stops being true.

--- WHY THIS READS gen_rooms.py, NOT THE .tscn FILES -----------------------

tools/gen_rooms.py is the verified source of truth for room layout: a full
run reproduces every committed .tscn byte-for-byte (see its own header, and
ROOM_AUTHORING_GODOT.md's opening warning that the editor is a dead end).
Importing it and calling each roomN() function gets the exact same structured
data the generator itself works from — no .tscn text parsing, no headless
Godot process, no npm. `write_room()` only runs under `if __name__ ==
"__main__"` at the bottom of that file, so importing it is side-effect-free;
this file relies on that and re-verifies it isn't lying by never once calling
write_room() or write_materials() itself.

Patrol waypoints are the one thing NOT in the Python — they live in each
room's behaviour script as `const WAYPOINTS*: Array[Vector3]`, so this file
regex-parses rooms/<id>/<id>.gd for those constants, mirroring EXACTLY the
rule tools/check_rooms.gd's _check_patrol() uses (walk every constant whose
name starts with WAYPOINTS, not just one literally named that — an earlier
version of that validator looked for only `WAYPOINTS` and silently validated
nothing in every multi-orderly room). See parse_waypoints() below.

--- LIVE REFRESH, WITHOUT RE-IMPORTING ON EVERY POLL -----------------------

The client polls GET /version (~500ms) — a cheap mtime scan, no room code
executed — and only fetches GET /rooms.json (which reloads gen_rooms.py and
calls all 21+ roomN() functions) when that number changes. This is the
server-side half of "redraw in place, never blank on a transient error":

  - If the WHOLE MODULE fails to import (a syntax error mid-edit — likely,
    since Tom edits gen_rooms.py live while this server runs), every room
    keeps serving its LAST successfully-built geometry, tagged stale=true,
    plus a top-level moduleError carrying the traceback. The client always
    has something to draw.
  - If ONE roomN() function raises (a NameError inside just that room, the
    module otherwise importing fine), only THAT room's cache entry is marked
    stale/broken; every other room rebuilds fresh as normal. This is the
    direct Python analogue of map.ts's per-module try/catch in loadRoom().

--- OUT OF SCOPE ------------------------------------------------------------

The telemetry-replay layers (heatmap/paths/catches/quits) from the Three.js
viewer are NOT ported. There is no telemetry pipeline on the Godot side to
feed them (no fetch-room-telemetry.mjs equivalent, no D1 rows tagged
'godot'), so building the layers would just be dead UI. Say so once, here,
rather than half-build them.
"""

import argparse
import glob
import http.server
import importlib
import json
import math
import os
import re
import socket
import sys
import traceback

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
GODOT_ROOT = os.path.dirname(TOOLS_DIR)
ROOMS_DIR = os.path.join(GODOT_ROOT, "rooms")
CORE_DIR = os.path.join(GODOT_ROOT, "core")

DEFAULT_PORT = 8912

sys.path.insert(0, TOOLS_DIR)
import gen_rooms  # noqa: E402  — see header: import-only, never write_room()


# --- tuning.gd, read live so a numbers change re-derives everything --------
#
# core/tuning.gd is GDScript, not Python — no import path exists for it here,
# so this regex-scrapes `const NAME := <number>` / `const NAME: T = <number>`
# lines. Good enough: every constant this file needs is a bare float/int
# literal (see tuning.gd itself), never an expression.
_CONST_NUM_RE = re.compile(
    r"^\s*const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[A-Za-z_][A-Za-z0-9_]*)?\s*:?=\s*"
    r"(-?\d+\.?\d*)",
    re.MULTILINE,
)

# Fallback values, used ONLY if core/tuning.gd cannot be read at all (missing
# file, permissions) — never used silently in place of a value the file
# genuinely defines. Mirrors the constants shipped at the time this was
# written; see core/tuning.gd for the authoritative numbers.
_TUNING_FALLBACK = {
    "ORDERLY_RADIUS": 0.4,
    "ORDERLY_SIGHT_RANGE": 6.0,
    "ORDERLY_CONE_DEG": 55.0,
    "ORDERLY_GRACE_SEC": 0.6,
    "ORDERLY_CHASE_SPEED": 4.3,
}

# tools/check_rooms.gd's PATROL_MARGIN — not itself in tuning.gd (it is a
# validator constant, not a gameplay one), so it is named here instead of
# folded into the ORDERLY_RADIUS number. Keep this in sync with that file's
# `const PATROL_MARGIN := 0.1` if it ever moves.
PATROL_MARGIN = 0.1

# ROOM_AUTHORING_GODOT.md §4's reaction-time rule: "distance >= ~8.2m from
# the nearest point on any patrol leg", derived as
# (2.5 - ORDERLY_GRACE_SEC) * ORDERLY_CHASE_SPEED. Computed fresh from
# whatever load_tuning() reads, never hardcoded to 8.2 — the whole point is
# that a tuning change re-derives this circle instead of silently
# invalidating every room's comment about it (the exact trap
# KitDesign.min_inspection_distance() exists to avoid on the Godot side).
REACTION_TIME_SEC = 2.5


def load_tuning():
    path = os.path.join(CORE_DIR, "tuning.gd")
    try:
        with open(path, "r") as f:
            text = f.read()
    except OSError:
        return dict(_TUNING_FALLBACK)
    vals = dict(_TUNING_FALLBACK)
    for m in _CONST_NUM_RE.finditer(text):
        vals[m.group(1)] = float(m.group(2))
    return vals


# --- GDScript literal parsing helpers ---------------------------------------
# The generator hands some interactable metadata to Godot as pre-rendered
# GDScript literal STRINGS (model_props), because that is what the room
# scene format wants — see Room.shape_key()/shape_lock() in gen_rooms.py.
# These undo just enough of that rendering to recover a hex colour / plain
# string list for JSON, without a general GDScript parser.
_COLOR_LITERAL_RE = re.compile(
    r"Color\(\s*([\-0-9.eE]+)\s*,\s*([\-0-9.eE]+)\s*,\s*([\-0-9.eE]+)"
    r"(?:\s*,\s*[\-0-9.eE]+)?\s*\)"
)
_QUOTED_STRING_RE = re.compile(r'"([^"]*)"')


def _clamp01(v):
    return max(0.0, min(1.0, v))


def _rgb_floats_to_hex(r, g, b):
    return "#%02x%02x%02x" % (
        round(_clamp01(r) * 255),
        round(_clamp01(g) * 255),
        round(_clamp01(b) * 255),
    )


def _godot_color_literal_to_hex(lit):
    """'Color(0.2, 0.4, 0.8, 1.0)' -> '#3366cc'. None if it doesn't parse."""
    if not lit:
        return None
    m = _COLOR_LITERAL_RE.search(lit)
    if not m:
        return None
    return _rgb_floats_to_hex(float(m.group(1)), float(m.group(2)), float(m.group(3)))


def _godot_unquote(lit):
    """'"square"' -> 'square'."""
    if not lit:
        return None
    m = _QUOTED_STRING_RE.search(lit)
    return m.group(1) if m else lit


def _godot_string_array_to_list(lit):
    """'PackedStringArray("a", "b")' -> ['a', 'b']."""
    if not lit:
        return []
    return _QUOTED_STRING_RE.findall(lit)


def _color_tuple_to_hex(t):
    """A Room._color()-style (r, g, b, a) float tuple -> hex, for icon panels
    (icon_panel() stores the resolved tuple directly, not a Color literal
    string — see Room.icon_panel())."""
    if not t:
        return None
    r, g, b = t[0], t[1], t[2]
    return _rgb_floats_to_hex(r, g, b)


# --- waypoint parsing (rooms/<id>/<id>.gd) ----------------------------------
#
# Mirrors tools/check_rooms.gd's _check_patrol(): every constant whose name
# STARTS WITH "WAYPOINTS" and holds a non-empty array literal is a real
# patrol route. Room 8's `const WAYPOINTS: Array[Vector3] = WAYPOINTS_A` is
# an ALIAS (a bare identifier on the right, not a literal) added solely so
# that validator's older single-name lookup didn't skip the room outright —
# see the comment above it in room8.gd. It is reported (so "how many WAYPOINTS*
# constants did we find" checks still see it) but not drawn a second time:
# drawing the exact same four points again under a second colour would read
# as a bug in THIS tool, not as information about room 8.
_WAYPOINTS_CONST_RE = re.compile(
    r"const\s+(WAYPOINTS\w*)\s*:\s*Array\[Vector3\]\s*=\s*(\[[\s\S]*?\]|[A-Za-z_]\w*)"
)
_VEC3_RE = re.compile(
    r"Vector3\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)"
)
_SCALAR_CONST_RE = re.compile(
    r"const\s+([A-Za-z_]\w*)\s*(?::\s*[A-Za-z_]\w*)?\s*:?=\s*(-?\d+\.?\d*)\b"
)


def _resolve_component(raw, scalars):
    """A Vector3 component is usually a float literal ('3.2', '-5'), but a
    couple of rooms (room11's MEZZ_Y, room17's BALCONY_Y) use a local script
    constant for the Y so the orderly's very first frame — before setup()
    hands him world_levels — already sits at the right height. Resolve
    against that room's own scalar consts; fall back to 0.0 (documented,
    not silently wrong — callers get the raw text back too) since the map is
    a top-down XZ view and Y only feeds the level-tag heuristic below."""
    raw = raw.strip()
    try:
        return float(raw), True
    except ValueError:
        pass
    if raw in scalars:
        return scalars[raw], True
    return 0.0, False


def parse_waypoints(rid, script_filename):
    """Returns (routes, aliases, unresolved) for one room's behaviour script.

    routes: [{"name": "WAYPOINTS_A", "points": [{"x","y","z"}, ...]}]
    aliases: [{"name": "WAYPOINTS", "aliasOf": "WAYPOINTS_A"}]
    unresolved: [str] — raw text of any Y component that wasn't a literal
      and wasn't found among this file's own scalar consts (informational).
    """
    path = os.path.join(ROOMS_DIR, rid, script_filename)
    try:
        with open(path, "r") as f:
            text = f.read()
    except OSError:
        return [], [], []

    scalars = {m.group(1): float(m.group(2)) for m in _SCALAR_CONST_RE.finditer(text)}

    routes = []
    routes_by_name = {}
    aliases = []
    unresolved = []

    for m in _WAYPOINTS_CONST_RE.finditer(text):
        name, rhs = m.group(1), m.group(2)
        if not rhs.startswith("["):
            # Bare identifier -> alias of an already-parsed route (file order
            # guarantees the real constant is defined above its alias in
            # every shipped room; if a future room breaks that convention,
            # aliasOf is simply left null rather than raising).
            aliases.append({"name": name, "aliasOf": rhs if rhs in routes_by_name else None})
            continue
        points = []
        for vm in _VEC3_RE.finditer(rhs):
            x, xok = _resolve_component(vm.group(1), scalars)
            y, yok = _resolve_component(vm.group(2), scalars)
            z, zok = _resolve_component(vm.group(3), scalars)
            if not yok:
                unresolved.append("%s: y=%r" % (name, vm.group(2).strip()))
            points.append({"x": x, "y": y, "z": z})
        if points:
            route = {"name": name, "points": points}
            routes.append(route)
            routes_by_name[name] = route

    routes.sort(key=lambda r: r["name"])  # matches check_rooms.gd's sort_custom
    return routes, aliases, unresolved


def _tag_patrol_levels(routes, levels):
    """Heuristic: a route belongs to the level whose base_y is closest to
    the route's own (resolved) waypoint Y, within a small tolerance. Exact
    for every shipped room — room17's WAYPOINTS_B carries BALCONY_Y (3.4)
    verbatim as its Y, matching level 'balcony' base_y 3.4 exactly, and
    WAYPOINTS_A/C carry 0, matching 'ground'. Rooms with no `levels` (room11,
    which uses tier-1 height zones instead — see ROOM_AUTHORING_GODOT.md §7)
    never reach this at all: level stays null and nothing ghosts, the same
    "selectedLevel === null never ghosts" rule the reference viewer uses.
    A route whose Y doesn't land within tolerance of any level's base_y is
    left untagged rather than guessed at — it just never ghosts, which is
    the safe direction to fail in (visible on every level, not hidden)."""
    if not levels:
        return
    TOL = 0.05
    for route in routes:
        ys = [p["y"] for p in route["points"]]
        if not ys:
            continue
        avg_y = sum(ys) / len(ys)
        best = None
        best_d = None
        for lvl in levels:
            d = abs(lvl["baseY"] - avg_y)
            if best_d is None or d < best_d:
                best, best_d = lvl["id"], d
        if best is not None and best_d <= TOL:
            route["level"] = best
        else:
            route["level"] = None


# --- patrol-clearance geometry (ported from tools/check_rooms.gd) ----------
# Point/segment-vs-AABB distance, used only for the design-law overlay's red
# highlighting. Ported term-for-term from _point_box_dist / _point_seg_dist /
# _seg_hits_box (Liang-Barsky) / _seg_box_dist in tools/check_rooms.gd, so
# "does the map agree with the actual validator" is a straight code
# comparison, not a re-derivation that could quietly diverge.


def _point_box_dist(x, z, b):
    dx = max(max(b["minX"] - x, 0.0), x - b["maxX"])
    dz = max(max(b["minZ"] - z, 0.0), z - b["maxZ"])
    return math.hypot(dx, dz)


def _point_seg_dist(px, pz, x0, z0, x1, z1):
    dx, dz = x1 - x0, z1 - z0
    len_sq = dx * dx + dz * dz
    t = 0.0
    if len_sq > 0.0:
        t = max(0.0, min(1.0, ((px - x0) * dx + (pz - z0) * dz) / len_sq))
    ex, ez = x0 + t * dx, z0 + t * dz
    return math.hypot(px - ex, pz - ez)


def _seg_hits_box(x0, z0, x1, z1, b):
    t0, t1 = 0.0, 1.0
    dx, dz = x1 - x0, z1 - z0
    p = [-dx, dx, -dz, dz]
    q = [x0 - b["minX"], b["maxX"] - x0, z0 - b["minZ"], b["maxZ"] - z0]
    for i in range(4):
        if p[i] == 0.0:
            if q[i] < 0.0:
                return False
        else:
            r = q[i] / p[i]
            if p[i] < 0.0:
                if r > t1:
                    return False
                if r > t0:
                    t0 = r
            else:
                if r < t0:
                    return False
                if r < t1:
                    t1 = r
    return True


def _seg_box_dist(x0, z0, x1, z1, b):
    if _seg_hits_box(x0, z0, x1, z1, b):
        return 0.0
    best = min(_point_box_dist(x0, z0, b), _point_box_dist(x1, z1, b))
    for cx, cz in ((b["minX"], b["minZ"]), (b["maxX"], b["minZ"]),
                   (b["maxX"], b["maxZ"]), (b["minX"], b["maxZ"])):
        best = min(best, _point_seg_dist(cx, cz, x0, z0, x1, z1))
    return best


def _compute_patrol_danger(routes, always_colliders, need):
    """Tags each route with dangerWaypoints/dangerLegs index lists — the
    wedge-bug check from ROOM_AUTHORING_GODOT.md §4, run against ONLY
    always-solid colliders (state == 'both'), exactly like
    check_rooms.gd's `b.state_filter != -1` filter: a lucid-only blocker
    does not apply to the orderly, so it must not paint a false red leg
    here either."""
    for route in routes:
        pts = route["points"]
        n = len(pts)
        danger_wp = []
        for i, w in enumerate(pts):
            if any(_point_box_dist(w["x"], w["z"], b) < need for b in always_colliders):
                danger_wp.append(i)
        danger_legs = []
        for i in range(n):
            a, c = pts[i], pts[(i + 1) % n]
            if any(_seg_box_dist(a["x"], a["z"], c["x"], c["z"], b) < need
                   for b in always_colliders):
                danger_legs.append(i)
        route["dangerWaypoints"] = danger_wp
        route["dangerLegs"] = danger_legs


# --- Room -> JSON ------------------------------------------------------------


def _state_name(state):
    return state if state in ("lucid", "unmed") else "both"


def _wall_entries(walls):
    """Splits Room.walls (the shared mesh+collider tuple stream — see
    gen_rooms.py's Room._wall docstring) into two lists.

    Unlike the Three.js viewer's drawBlocks/blockHasCollider, which has to
    cross-reference a SEPARATE colliders array with state-compatibility
    rules to decide whether a mesh should render dashed, the Godot generator
    already pairs mesh and collider in one tuple per call — a wall_x() or
    block(..., collider=...) IS both at once, and a mesh-only band_x() or
    collider-only solid() simply omits the half it doesn't have. So a block
    is dashed here purely by checking its OWN collider slot, no
    cross-referencing needed.
    """
    colliders = []
    blocks = []
    for size, pos, mat, state, collider, name, level, light in walls:
        st = _state_name(state)
        if collider is not None:
            min_x, max_x, min_z, max_z = collider
            colliders.append({
                "minX": min_x, "maxX": max_x, "minZ": min_z, "maxZ": max_z,
                "state": st, "level": level, "name": name,
            })
        if size is not None:
            sx, sy, sz = size
            x, y, z = pos
            blocks.append({
                "minX": x - sx / 2.0, "maxX": x + sx / 2.0,
                "minZ": z - sz / 2.0, "maxZ": z + sz / 2.0,
                "mat": mat, "state": st, "level": level, "name": name,
                "light": light, "hasCollider": collider is not None,
                "y": y, "height": sy,
            })
    return colliders, blocks


def _mover_entries(movers):
    """Runtime-driven walls (room13's closing slabs) — mesh and collider are
    the SAME box (see Room.mover()'s docstring), always solid, never
    state-filtered. Folded into the blocks layer with kind='mover' so the
    layer toggle list stays the reference's list; a tooltip is enough to
    tell it apart from ordinary geometry."""
    out = []
    for name, size, pos, mat in movers:
        sx, sy, sz = size
        x, y, z = pos
        out.append({
            "minX": x - sx / 2.0, "maxX": x + sx / 2.0,
            "minZ": z - sz / 2.0, "maxZ": z + sz / 2.0,
            "mat": mat, "state": "both", "level": None, "name": name,
            "light": None, "hasCollider": True, "kind": "mover",
            "y": y, "height": sy,
        })
    return out


def _push_block_entries(push_blocks):
    """room20's crate: one block-layer entry (its mesh IS its collider —
    see Room.push_block()) plus one interactables-layer entry so it shows up
    as a ray target too, the same "one mechanism, two layers" treatment
    drawTriggers gives a pressurePlate() in the reference viewer."""
    blocks, interactables = [], []
    for name, iid, cx, cz, size, height, mat, label in push_blocks:
        blocks.append({
            "minX": cx - size / 2.0, "maxX": cx + size / 2.0,
            "minZ": cz - size / 2.0, "maxZ": cz + size / 2.0,
            "mat": mat, "state": "both", "level": None, "name": name,
            "light": None, "hasCollider": True, "kind": "push_block",
            "y": height / 2.0, "height": height,
        })
        interactables.append({
            "id": iid, "type": "push_block", "pos": [cx, height / 2.0, cz],
            "state": "both", "level": None, "light": None,
            "label": label, "shape": None, "color": None, "shapes": None,
        })
    return blocks, interactables


def _interactable_entries(interactables):
    out = []
    for (iid, itype, size, pos, mat, label, state, facing,
         model_script, model_props, light) in interactables:
        shape = None
        color = None
        shapes = None
        if model_props:
            if "color" in model_props:
                color = _godot_color_literal_to_hex(model_props["color"])
            if "shape" in model_props:
                shape = _godot_unquote(model_props["shape"])
            if "shapes" in model_props:
                shapes = _godot_string_array_to_list(model_props["shapes"])
        out.append({
            "id": iid, "type": itype, "pos": list(pos), "mat": mat,
            "label": label, "state": _state_name(state), "level": None,
            "facing": facing, "light": light, "shape": shape, "color": color,
            "shapes": shapes,
        })
    return out


def _icon_panel_entries(icon_panels):
    out = []
    for pid, shapes, colors, pos, rot_y, size in icon_panels:
        specs = [{"shape": s, "color": _color_tuple_to_hex(c)}
                 for s, c in zip(shapes, colors)]
        out.append({"id": pid, "shapes": specs, "pos": list(pos),
                     "rotY": rot_y, "size": size})
    return out


def _level_for_y(y, levels):
    """Which stacked level a bare (x, y, z) point sits on, for a Tier-2 room
    (see ROOM_AUTHORING_GODOT.md §7 — 'levels' rooms only; a room using
    tier-1 height zones/ramps instead has no `levels` at all and this
    returns None for it unconditionally, same as _tag_patrol_levels).

    Godot interactables and scrawls carry no `level` tag of their own (only
    colliders/blocks do — see Room.interactable()/Room.scrawl()), but they
    DO carry a real world Y, authored as base_y + a fixture/eye-height
    offset (~1.45 for a wall fixture, ~1.6-1.7 for a scrawl — see
    ROOM_AUTHORING_GODOT.md §2). So "which level is this point on" is "the
    highest level whose floor is at or below it" — the same reasoning as
    standing in a stacked building: you're on whichever floor's slab is
    under your feet, not whichever is numerically closest in height. A
    point below every level's base_y (should not happen for real fixture
    data) falls back to the lowest level rather than raising."""
    if not levels:
        return None
    at_or_below = [lvl for lvl in levels if lvl["baseY"] <= y + 1e-6]
    pool = at_or_below or levels
    return max(pool, key=lambda lvl: lvl["baseY"])["id"]


def _nearest_leg_dist(x, z, level, routes):
    """Closest approach of any SAME-LEVEL patrol leg to (x, z).

    A route with level=None (every route in a room with no `levels` at all,
    or one _tag_patrol_levels couldn't confidently place) is treated as
    applying to every point — the safe direction to fail in, since it can
    only ever produce an over-cautious flag, never hide a real one. Filtering
    by level at all matters specifically for room17-shaped rooms: without it
    a ground-floor keypad reads as endangered by the BALCONY orderly's loop
    purely because their XZ footprints overlap, even though
    Orderly._player_is_vulnerable() makes that orderly structurally unable
    to see or touch anyone standing on 'ground' — see room17.gd's header.
    """
    best = None
    for route in routes:
        r_level = route.get("level")
        if level is not None and r_level is not None and r_level != level:
            continue
        pts = route["points"]
        n = len(pts)
        for i in range(n):
            a, c = pts[i], pts[(i + 1) % n]
            d = _point_seg_dist(x, z, a["x"], a["z"], c["x"], c["z"])
            if best is None or d < best:
                best = d
    return best


def room_to_dict(room, rid, always_colliders_need, inspection_dist, gd_script_filename):
    """Room (gen_rooms.Room) -> a plain-JSON dict. Every field here is a
    direct, lossless translation of a Room attribute — see gen_rooms.py's
    Room class docstrings for what each one means; this function does not
    invent any new geometry, only reshapes tuples into named dict keys so
    map.js doesn't have to know positional tuple layouts."""
    colliders, blocks = _wall_entries(room.walls)
    blocks.extend(_mover_entries(room.movers))
    pb_blocks, pb_interactables = _push_block_entries(room.push_blocks)
    blocks.extend(pb_blocks)

    levels = []
    for lid, base_y, floor, zones, ramps in room.levels:
        levels.append({
            "id": lid, "baseY": base_y,
            "floor": list(floor) if floor else None,
            "heightZones": [
                {"minX": a, "maxX": b, "minZ": c, "maxZ": d, "y": y}
                for a, b, c, d, y in zones
            ],
            "ramps": [
                {"minX": a, "maxX": b, "minZ": c, "maxZ": d, "axis": ax,
                 "yLow": yl, "yHigh": yh}
                for a, b, c, d, ax, yl, yh in ramps
            ],
        })

    routes, aliases, unresolved = parse_waypoints(rid, gd_script_filename)
    _tag_patrol_levels(routes, levels)
    _compute_patrol_danger(
        routes,
        [c for c in colliders if c["state"] == "both"],
        always_colliders_need,
    )

    interactables = _interactable_entries(room.interactables) + pb_interactables

    inspection_points = []
    for it in interactables:
        if it["type"] == "keypad":
            inspection_points.append({"x": it["pos"][0], "y": it["pos"][1],
                                       "z": it["pos"][2], "label": it["id"],
                                       "kind": "keypad"})
    for text, pos, rot_y, size, sid, light, ink in room.scrawls:
        inspection_points.append({"x": pos[0], "y": pos[1], "z": pos[2],
                                   "label": sid or text.split("\n")[0],
                                   "kind": "scrawl"})
    for ip in inspection_points:
        ip["level"] = _level_for_y(ip["y"], levels)
        d = _nearest_leg_dist(ip["x"], ip["z"], ip["level"], routes)
        ip["nearestLegDist"] = d
        ip["danger"] = d is not None and d < inspection_dist

    return {
        "id": rid,
        "name": room.name,
        "floor": {"minX": room.floor[0], "maxX": room.floor[1],
                   "minZ": room.floor[2], "maxZ": room.floor[3]},
        "spawn": {"x": room.spawn[0], "z": room.spawn[1], "yaw": room.spawn[2]},
        "exits": [{"to": to, "minX": a, "maxX": b, "minZ": c, "maxZ": d}
                   for to, a, b, c, d in room.exits],
        "ceilingY": room.ceiling_y,
        "startDark": room.start_dark,
        "colliders": colliders,
        "blocks": blocks,
        "interactables": interactables,
        # scrawl() carries no `level` param (see Room.scrawl in gen_rooms.py) —
        # unlike colliders/blocks/interactables, no shipped room needs a
        # scrawl that only belongs to one stacked level, so this key is
        # always null. Kept in the dict anyway so map.js's one shared
        # levelGhost() helper works uniformly across every layer.
        "scrawls": [
            {"text": text, "pos": list(pos), "rotY": rot_y, "size": size,
             "sid": sid, "light": light, "ink": ink, "level": None}
            for text, pos, rot_y, size, sid, light, ink in room.scrawls
        ],
        "lights": [{"pos": [x, y, z], "circuit": circuit or "house"}
                    for x, y, z, circuit in room.lights],
        "triggers": [{"id": tid, "minX": a, "maxX": b, "minZ": c, "maxZ": d,
                       "state": _state_name(state)}
                      for tid, a, b, c, d, state in room.triggers],
        "iconPanels": _icon_panel_entries(room.icon_panels),
        "heightZones": [{"minX": a, "maxX": b, "minZ": c, "maxZ": d, "y": y}
                          for a, b, c, d, y in room.height_zones],
        "ramps": [{"minX": a, "maxX": b, "minZ": c, "maxZ": d, "axis": ax,
                    "yLow": yl, "yHigh": yh}
                   for a, b, c, d, ax, yl, yh in room.ramps],
        "levels": levels,
        "stairwells": [
            {"id": s["id"], "minX": s["min_x"], "maxX": s["max_x"],
             "minZ": s["min_z"], "maxZ": s["max_z"], "axis": s["axis"],
             "yLow": s["y_low"], "levelAtLow": s["level_at_low"],
             "yHigh": s["y_high"], "levelAtHigh": s["level_at_high"]}
            for s in room.stairwells
        ],
        "patrols": routes,
        "waypointAliases": aliases,
        "waypointUnresolved": unresolved,
        "inspectionPoints": inspection_points,
    }


# --- room discovery ----------------------------------------------------------
# The `rooms/` directory (not a hardcoded id list) is the source of truth for
# WHICH rooms exist — matches the room's own "read structured data, don't
# hand-maintain a mirror of it" principle, and means a new room the other
# agent adds to gen_rooms.py mid-session is picked up without editing this
# file. Every shipped roomN() function name matches its directory name
# exactly, INCLUDING room19_doors/room19_lights (two real top-level functions,
# not one factory the way the Three.js build's room19 works — see
# gen_rooms.py's room19_doors()/room19_lights()), so `getattr(gen_rooms, rid)`
# just works for all of them.
_ROOM_ID_RE = re.compile(r"^room\d+(_[a-z]+)?$")


def discover_room_ids():
    if not os.path.isdir(ROOMS_DIR):
        return []
    ids = [d for d in os.listdir(ROOMS_DIR)
           if _ROOM_ID_RE.match(d) and os.path.isdir(os.path.join(ROOMS_DIR, d))]
    ids.sort(key=lambda s: (len(s), s))  # room2 before room10, textually
    return ids


# --- build cache --------------------------------------------------------------
# See the module header's "LIVE REFRESH" section for what this cache buys:
# every room ALWAYS has the last geometry that successfully built, even
# while gen_rooms.py (or one specific roomN()) is mid-edit and broken.
_cache = {}  # room id -> last-good-or-broken dict, see build_all()


def build_all():
    """Rebuilds every room's JSON, merging failures into the cache rather
    than discarding it. Returns the module-level import error (traceback
    string) if gen_rooms.py itself failed to reload, else None."""
    room_ids = discover_room_ids()
    tuning = load_tuning()
    need = tuning["ORDERLY_RADIUS"] + PATROL_MARGIN
    inspection_dist = ((REACTION_TIME_SEC - tuning["ORDERLY_GRACE_SEC"])
                         * tuning["ORDERLY_CHASE_SPEED"])

    try:
        importlib.reload(gen_rooms)
        module_error = None
    except Exception:
        module_error = traceback.format_exc()

    if module_error is not None:
        # A reload() that raises leaves gen_rooms's namespace in an
        # UNDEFINED partial state (whatever executed before the exception
        # stays; whatever came after does not update) — Python gives no
        # guarantee it's even internally consistent. Do not call anything on
        # it. Every room falls back to its last cached build, stale=true.
        for rid in room_ids:
            prev = _cache.get(rid)
            if prev is not None:
                _cache[rid] = {**prev, "ok": False, "stale": True,
                                "error": module_error}
            else:
                _cache[rid] = {"id": rid, "ok": False, "stale": False,
                                 "error": module_error, "name": rid}
        return module_error

    for rid in room_ids:
        try:
            fn = getattr(gen_rooms, rid)
            room = fn()
            d = room_to_dict(room, rid, need, inspection_dist, room.script)
            d["ok"] = True
            d["stale"] = False
            d["error"] = None
            _cache[rid] = d
        except Exception:
            err = traceback.format_exc()
            prev = _cache.get(rid)
            if prev is not None and prev.get("ok"):
                _cache[rid] = {**prev, "ok": False, "stale": True, "error": err}
            else:
                _cache[rid] = {"id": rid, "ok": False, "stale": False,
                                 "error": err, "name": rid}

    # Anything that disappeared from the directory listing (a room renamed
    # or removed mid-session) drops out of the cache too, rather than
    # lingering forever as a phantom selector entry.
    for rid in list(_cache.keys()):
        if rid not in room_ids:
            del _cache[rid]

    return None


def compute_version():
    """Max mtime across everything a redraw depends on: the generator, every
    room behaviour script (for WAYPOINTS*), and tuning.gd (for the sight-cone
    and clearance numbers baked into the design-law overlay). Cheap — stat
    calls only, no room code runs — so the client can poll this every ~500ms
    and only pay for a full /rooms.json rebuild when it actually changes."""
    paths = [os.path.join(TOOLS_DIR, "gen_rooms.py"),
              os.path.join(CORE_DIR, "tuning.gd")]
    paths.extend(glob.glob(os.path.join(ROOMS_DIR, "*", "*.gd")))
    best = 0.0
    for p in paths:
        try:
            best = max(best, os.path.getmtime(p))
        except OSError:
            pass
    return best


# --- HTTP server ---------------------------------------------------------------

STATIC_DIR = TOOLS_DIR  # map.html / map.js live next to this file


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "WardBMapServer/1"

    def log_message(self, fmt, *args):  # quieter default logging
        sys.stderr.write("[map_server] %s\n" % (fmt % args))

    def _send_json(self, obj, code=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type):
        try:
            with open(path, "rb") as f:
                body = f.read()
        except OSError:
            self.send_error(404, "not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/map.html", "/index.html"):
            self._send_file(os.path.join(STATIC_DIR, "map.html"), "text/html; charset=utf-8")
        elif path == "/map.js":
            self._send_file(os.path.join(STATIC_DIR, "map.js"),
                              "application/javascript; charset=utf-8")
        elif path == "/version":
            self._send_json({"version": compute_version()})
        elif path == "/rooms.json":
            module_error = build_all()
            tuning = load_tuning()
            self._send_json({
                "moduleError": module_error,
                "roomIds": sorted(_cache.keys(), key=lambda s: (len(s), s)),
                "tuning": tuning,
                "reactionTimeSec": REACTION_TIME_SEC,
                "patrolMargin": PATROL_MARGIN,
                # Pre-derived, so map.js's legend/tooltips print the same
                # numbers the server used to compute the overlays rather
                # than re-deriving (and risking drifting from) them client-side.
                "clearanceNeedM": tuning["ORDERLY_RADIUS"] + PATROL_MARGIN,
                "inspectionDistanceM": ((REACTION_TIME_SEC - tuning["ORDERLY_GRACE_SEC"])
                                          * tuning["ORDERLY_CHASE_SPEED"]),
                "rooms": _cache,
            })
        else:
            self.send_error(404, "not found")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    ap.add_argument("--host", default="127.0.0.1",
                     help="bind address (use 0.0.0.0 to view over Tailscale)")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = ap.parse_args()

    # Prime the cache before the first request so /rooms.json's first
    # response isn't the module-error path just because nothing has built
    # yet.
    build_all()

    httpd = http.server.ThreadingHTTPServer((args.host, args.port), Handler)
    url_host = args.host if args.host != "0.0.0.0" else socket.gethostname()
    print("Ward B room map — dev only, never shipped (see this file's header).")
    print("Serving on http://%s:%d/  (Ctrl+C to stop)" % (args.host, args.port))
    if args.host == "0.0.0.0":
        print("Bound to 0.0.0.0 — reachable from other tailnet devices at "
              "http://%s:%d/" % (url_host, args.port))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
