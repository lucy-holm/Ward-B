#!/usr/bin/env python3
"""Generate the two throwaway .tscn fixtures tools/test_verticality.tscn loads.

Deliberately goes through gen_rooms.py's real Room/Emitter rather than
hand-writing the scenes, so the test proves the whole chain — authoring API,
emitted metadata, and core/levels.gd + core/collision.gd reading it back —
not just the engine half of it.

These are NOT rooms. They are never registered in main.gd's ROOM_SCENES, live
under tools/ rather than rooms/, and exist only to be asserted against.

    python3 tools/gen_vert_fixtures.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import gen_rooms as G

OUT = os.path.dirname(os.path.abspath(__file__))


def _emit(room):
    """Emit a room's .tscn text with its room-script reference stripped —
    a fixture has no behaviour, and pointing it at a script that does not
    exist would fail to load."""
    text = G.Emitter(room).emit()
    script_ext = '[ext_resource type="Script" path="res://rooms/%s/%s" id="s_room"]\n' % (
        room.rid, room.script)
    assert script_ext in text, "emit() no longer writes the room script the way this expects"
    text = text.replace(script_ext, "")
    assert 'script = ExtResource("s_room")\n' in text
    text = text.replace('script = ExtResource("s_room")\n', "")
    return text


def flat_fixture():
    """TIER 1 — a single-valued floor height and no levels at all, which is
    what rooms 11 and 19 need. Proves the fold into the synthetic '__flat'
    level, and that a ramp beats a height zone where they overlap."""
    r = G.Room("vert_flat", "Verticality fixture (flat)",
               (-10.0, 10.0, -10.0, 10.0), (0.0, 8.0, 0.0), [])
    # A raised platform, and a ramp climbing onto it along +z. The ramp's far
    # end deliberately OVERLAPS the zone (z 2..4) so the ramp-beats-zone rule
    # is actually exercised rather than assumed.
    r.height_zone(-4.0, 4.0, 2.0, 6.0, 1.0)
    r.ramp(-4.0, 4.0, -2.0, 4.0, "z", 0.0, 1.0)
    # Railings, which are what actually keep the player up there. Ordinary
    # untagged colliders — the raised zone itself is never a collider.
    r.solid(-4.2, -3.8, 2.0, 6.0, name="RailW")
    r.solid(3.8, 4.2, 2.0, 6.0, name="RailE")
    return r


def stacked_fixture():
    """TIER 2 — two walkable surfaces over one XZ rectangle, which is what
    room 17 needs."""
    r = G.Room("vert_stacked", "Verticality fixture (stacked)",
               (-10.0, 10.0, -10.0, 20.0), (0.0, 16.0, 0.0), [])
    r.ceiling_y = 6.0

    # 'ground' carries its own ramp and zone, overlapping each other AND
    # overlapping the stairwell footprint, so floor_height_at's precedence
    # (stairwell, then ramp, then zone, then base_y) is fully exercised.
    r.level("ground", 0.0, (-10.0, 10.0, -10.0, 20.0),
            zones=[(4.0, 8.0, 6.0, 16.0, 0.5)],
            ramps=[(4.0, 8.0, 12.0, 16.0, "z", 0.0, 0.75)])
    r.level("balcony", 3.4, (-10.0, 10.0, -10.0, 6.0))

    # The stair: descends as z increases, so y_low (3.4, the balcony) is at
    # the axis's MIN end and y_high (0.0, the ground) at its MAX end.
    r.stairwell("STAIR", 4.0, 8.0, 6.0, 12.0, "z", 3.4, "balcony", 0.0, "ground")

    # The balcony's own decking — an opaque BOX whose underside is the
    # ceiling for whoever is standing below it. Never a plane: a plane is
    # single-sided and would be invisible from underneath, which is exactly
    # the view this geometry has to serve. The stair mouth (x 4..8) is left
    # open, so the deck is two slabs either side of it.
    r.block((14.0, 0.3, 16.0), (-3.0, 3.25, -2.0), "prop")   # x -10..4
    r.block((2.0, 0.3, 16.0), (9.0, 3.25, -2.0), "prop")     # x   8..10

    # A railing on the balcony only. This MUST NOT block the ground floor
    # underneath it — that is the whole point of a level-tagged collider.
    # Exactly ONE tagged collider in this fixture; test_verticality counts
    # them, so all the decoration below is deliberately mesh-only.
    r.solid(-2.0, 2.0, -0.2, 0.2, name="Railing", level="balcony")
    # And a real structural wall, untagged, which blocks on every level.
    r.solid(-9.0, -8.0, -0.2, 0.2, name="RealWall")

    # --- decoration, so a screenshot actually reads as two storeys ---------
    # All mesh-only (no collider argument), so none of it disturbs the
    # collision assertions above.
    # The railing the tagged collider stands for.
    r.block((4.0, 0.1, 0.12), (0.0, 4.3, 0.0), "chain")
    r.block((4.0, 0.1, 0.12), (0.0, 3.9, 0.0), "chain")
    r.block((0.12, 1.0, 0.12), (-2.0, 3.9, 0.0), "chain")
    r.block((0.12, 1.0, 0.12), (2.0, 3.9, 0.0), "chain")
    # The structural wall the untagged collider stands for, full height so it
    # visibly passes through BOTH levels.
    r.block((1.0, 6.0, 0.4), (-8.5, 3.0, 0.0), "wall")
    # The stair: twelve steps descending from the balcony (z=6, y=3.4) to the
    # ground (z=12, y=0), filling the stairwell footprint exactly.
    for i in range(12):
        z0 = 6.0 + i * 0.5
        y = 3.4 - (3.4 / 12.0) * i
        r.block((4.0, 0.18, 0.5), (6.0, y, z0 + 0.25), "prop")
    # Stair side wall, so the run reads as a shaft rather than floating steps.
    r.block((0.24, 3.6, 6.0), (4.0, 1.8, 9.0), "wall2")

    # Shell: perimeter walls, plus upper wall bands closing the two-storey
    # volume above the standard 3m wall height. Bands carry no collider.
    for (x0, x1, z) in [(-10.0, 10.0, -10.0), (-10.0, 10.0, 20.0)]:
        r.wall_x(x0, x1, z)
        r.band_x(x0, x1, z)
    for (z0, z1, x) in [(-10.0, 20.0, -10.0), (-10.0, 20.0, 10.0)]:
        r.wall_z(z0, z1, x)
        r.band_z(z0, z1, x)

    # Lights on BOTH levels — under the deck for the ground floor, above it
    # for the balcony. Without the lower set the entire point of the shot (an
    # occupied floor beneath an occupied floor) renders as black.
    r.light(-4.0, 0.0, 2.9)
    r.light(-4.0, -6.0, 2.9)
    r.light(2.0, 3.0, 2.9)
    r.light(0.0, 10.0, 5.4)
    r.light(0.0, 16.0, 5.4)
    r.light(-3.0, -4.0, 5.4)
    r.light(6.0, 8.0, 5.4)
    return r


if __name__ == "__main__":
    for room in (flat_fixture(), stacked_fixture()):
        path = os.path.join(OUT, "%s.tscn" % room.rid)
        with open(path, "w") as f:
            f.write(_emit(room))
        print("wrote tools/%s.tscn" % room.rid)
