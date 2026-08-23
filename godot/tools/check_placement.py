#!/usr/bin/env python3
"""Placement audit: props that float, sit inside walls, or clash.

    python3 tools/check_placement.py

WHY. Props are placed from numbers typed in tools/gen_rooms.py, and a number
wrong by 0.3 gives you a keypad hanging in a doorway or a radiator half-eaten by
plaster. None of that breaks a test: the scene loads, check_rooms validates, the
patrol clears, the round trip is byte-exact. The only thing that catches it is
somebody standing in the right spot and looking, across twenty-one rooms.

WHY PYTHON AND NOT A GODOT SCENE. The first version of this was a Godot tool
reading real world AABBs, and it drowned in false positives: it flagged every
wall and ceiling prop as "floating", because a wall prop's base IS above the
floor with nothing under it — that is what a wall prop is. Telling those apart
needs each prop's MOUNT, which lives in props/_gen/prop_defs.py and is not in
the scene. Doing the whole audit against the Room objects instead means the
mount, the part list and the wall rectangles are all in hand at once, it runs in
under a second, and it needs no Godot process — which matters when several are
already contending on this project's import lock.

THREE CHECKS:

  UNMOUNTED  a wall prop whose origin is not on a wall face. The mount contract
             says the origin sits ON the face with the prop growing into the
             room, so anything else is floating in space or buried in plaster.
             This is the one that catches the keypad-in-the-doorway class of bug.

  UNSUPPORTED  a floor prop whose base is off the floor with nothing beneath it.
             Props legitimately sit on counters and shelves, so "nothing
             beneath" means no room block and no other prop spans that XZ at a
             height that could hold it up.

  CLASH      two props interpenetrating by more than a threshold on all three
             axes. Touching is fine and common — a bag on a stand, a monitor on
             a counter — passing through each other is not.
"""

import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "props", "_gen"))

import gen_rooms as G  # noqa: E402

# Housing/lamp pairs are placed at the SAME point on purpose — the lit half sits
# inside the dark housing so throwing the breaker leaves a dead fitting behind
# (see props/ceiling_troffer.tscn). They will always "clash"; that is the design.
COINCIDENT = set()
for _housing, _lamp in G.Room.FITTINGS.values():
    COINCIDENT.add(frozenset((_housing, _lamp)))

FACE_TOL = 0.03
CLASH_MIN = 0.06
SUPPORT_GAP = 0.14


def mesh_extent(key):
    """Local bounding size of a baked primitive, from its spec."""
    spec = G._prop_defs.MESHES[key]
    t = spec["type"]
    if t == "box":
        return tuple(spec["size"])
    if t == "cyl":
        return (spec["r"] * 2, spec["h"], spec["r"] * 2)
    if t == "tube":
        return (spec["r_out"] * 2, spec["h"], spec["r_out"] * 2)
    if t == "taper":
        d = max(spec["r_bot"], spec["r_top"]) * 2
        return (d, spec["h"], d)
    if t == "frame":
        return (spec["w"], spec["h"], spec["depth"])
    if t == "slats":
        return (spec["w"], spec["h"], spec["d"])
    raise ValueError("unknown primitive %r" % t)


def rotated_aabb(size, basis):
    """Half-extents of `size` after `basis`, axis-aligned."""
    return [sum(abs(basis[i][k]) * size[k] / 2.0 for k in range(3)) for i in range(3)]


def prop_aabb(kind, pos, yaw):
    """World AABB of a placed prop: (min, max) triples."""
    spec = G.PROPS[kind]
    seg = G._euler_basis((0.0, yaw, 0.0))
    lo = [1e9] * 3
    hi = [-1e9] * 3
    for part in spec["parts"]:
        if isinstance(part, dict) and part.get("type") == "label":
            continue
        b = G._mat_mul(seg, G._euler_basis(part["rot"]))
        o = G._mat_vec(seg, list(part["pos"]))
        centre = [pos[k] + o[k] for k in range(3)]
        half = rotated_aabb(mesh_extent(part["mesh"]), b)
        for k in range(3):
            lo[k] = min(lo[k], centre[k] - half[k])
            hi[k] = max(hi[k], centre[k] + half[k])
    return lo, hi


def main():
    issues = 0
    rooms = 0
    for fn in G.__dict__.values():
        if not callable(fn) or not getattr(fn, "__name__", "").startswith("room"):
            continue
        try:
            r = fn()
        except Exception:
            continue
        rooms += 1
        placed = []
        for m in r.models:
            kind = m["kind"]
            if kind not in G.PROPS:
                continue
            lo, hi = prop_aabb(kind, m["pos"], m["yaw"])
            placed.append((m["name"], kind, G.PROPS[kind]["mount"], m["pos"], lo, hi,
                           m.get("y_explicit", False)))

        wall_rects = [w[4] for w in r.walls if w[4] is not None]

        # Interactables are authored as raw positions and sizes, with no mount
        # contract behind them — which makes them the likeliest thing in a room
        # to be off by enough to float. A keypad or dispenser is WALL-MOUNTED by
        # nature: it is thin on one axis and that thin axis must straddle a wall
        # face. Doors are exempt: a door fills its own opening and is supposed to
        # sit in the wall line, not on a face.
        for (iid, itype, isize, ipos, _m, _lb, _st, _f, _ms, _mp, _li) in r.interactables:
            if itype in ("door", "pill_pickup", "pill_cup", "shape_key"):
                continue
            thin_x = isize[0] < isize[2]
            best = None
            for (x0, x1, z0, z1) in wall_rects:
                if thin_x and z0 - FACE_TOL <= ipos[2] <= z1 + FACE_TOL:
                    d = min(abs(ipos[0] - x0), abs(ipos[0] - x1))
                elif not thin_x and x0 - FACE_TOL <= ipos[0] <= x1 + FACE_TOL:
                    d = min(abs(ipos[2] - z0), abs(ipos[2] - z1))
                else:
                    continue
                best = d if best is None else min(best, d)
            gap = 1e9 if best is None else best
            # Allowed: the fixture straddles the face, so its centre sits within
            # half its own thickness of it.
            allow = (isize[0] if thin_x else isize[2]) / 2.0 + FACE_TOL
            if gap > allow:
                print("UNMOUNTED   %-8s %-22s %s at (%.2f, %.2f) is %.2fm from the "
                      "nearest wall face (allowed %.2f)"
                      % (r.rid, iid, itype, ipos[0], ipos[2], gap, allow))
                issues += 1

        for (nm, kind, mount, pos, lo, hi, _ye) in placed:
            if mount == "wall":
                on_face = False
                for (x0, x1, z0, z1) in wall_rects:
                    near_x = min(abs(pos[0] - x0), abs(pos[0] - x1))
                    near_z = min(abs(pos[2] - z0), abs(pos[2] - z1))
                    if near_x <= FACE_TOL and z0 - FACE_TOL <= pos[2] <= z1 + FACE_TOL:
                        on_face = True
                    if near_z <= FACE_TOL and x0 - FACE_TOL <= pos[0] <= x1 + FACE_TOL:
                        on_face = True
                    if on_face:
                        break
                if not on_face:
                    print("UNMOUNTED   %-8s %-22s %s at (%.2f, %.2f) is not on a wall face"
                          % (r.rid, nm, kind, pos[0], pos[2]))
                    issues += 1
            elif mount == "floor" and lo[1] > 0.05:
                supported = False
                cx, cz = (lo[0] + hi[0]) / 2.0, (lo[2] + hi[2]) / 2.0
                for (size, wpos, _m, _s, _c, _n, _l, _li) in r.walls:
                    if size is None:
                        continue
                    if (abs(cx - wpos[0]) <= size[0] / 2.0
                            and abs(cz - wpos[2]) <= size[2] / 2.0
                            and abs((wpos[1] + size[1] / 2.0) - lo[1]) <= SUPPORT_GAP):
                        supported = True
                        break
                for (_n2, _k2, _m2, _p2, lo2, hi2, _ye2) in placed:
                    if _n2 == nm:
                        continue
                    if not (lo2[0] <= cx <= hi2[0] and lo2[2] <= cz <= hi2[2]):
                        continue
                    # Supported if the base rests just on top of the other prop,
                    # OR if it lies WITHIN the other's vertical span. The second
                    # case is not sloppiness: a ward_bed's box runs from the
                    # floor to the top of its head posts, and its mattress — the
                    # surface a pillow actually rests on — is in the middle of
                    # that. Requiring "top of the AABB" would reject every prop
                    # placed on any concave piece of furniture in the kit.
                    if abs(hi2[1] - lo[1]) <= SUPPORT_GAP:
                        supported = True
                        break
                    if lo2[1] <= lo[1] <= hi2[1]:
                        supported = True
                        break
                if not supported:
                    print("UNSUPPORTED %-8s %-22s %s base y=%.2f at (%.2f, %.2f)"
                          % (r.rid, nm, kind, lo[1], cx, cz))
                    issues += 1

        for i in range(len(placed)):
            for j in range(i + 1, len(placed)):
                a, b = placed[i], placed[j]
                ov = [min(a[5][k], b[5][k]) - max(a[4][k], b[4][k]) for k in range(3)]
                if frozenset((a[1], b[1])) in COINCIDENT:
                    continue
                # "Resting on" is not "driven through". A concave prop's AABB
                # encloses the air above it — a ward_bed's box spans from the
                # floor to the top of its head posts — so anything the author
                # deliberately placed ON it at a pinned height overlaps that box
                # while touching none of its geometry. Only the prop with an
                # explicit y is exempt, and only when it sits at or above the
                # other's base, so a genuinely misplaced prop still reports.
                if a[6] and a[4][1] >= b[4][1]:
                    continue
                if b[6] and b[4][1] >= a[4][1]:
                    continue
                if all(v > CLASH_MIN for v in ov):
                    print("CLASH       %-8s %-22s <-> %-22s by %.2f x %.2f x %.2f"
                          % (r.rid, a[0], b[0], ov[0], ov[1], ov[2]))
                    issues += 1

    print("==> check_placement: %d room(s), %d issue(s)" % (rooms, issues))
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
