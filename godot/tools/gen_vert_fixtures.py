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

    # The balcony's own decking — an opaque box whose underside is the
    # ceiling for whoever is standing below it. Never a plane: a plane is
    # single-sided and would be invisible from underneath.
    r.block((20.0, 0.3, 16.0), (0.0, 3.25, -2.0), "prop")

    # A railing on the balcony only. This MUST NOT block the ground floor
    # underneath it — that is the whole point of a level-tagged collider.
    r.solid(-2.0, 2.0, -0.2, 0.2, name="Railing", level="balcony")
    # And a real structural wall, untagged, which blocks on every level.
    r.solid(-9.0, -8.0, -0.2, 0.2, name="RealWall")

    # Upper wall bands close the two-storey volume above the standard 3m
    # walls. Cosmetic, no colliders.
    r.wall_x(-10.0, 10.0, -10.0)
    r.band_x(-10.0, 10.0, -10.0)
    return r


if __name__ == "__main__":
    for room in (flat_fixture(), stacked_fixture()):
        path = os.path.join(OUT, "%s.tscn" % room.rid)
        with open(path, "w") as f:
            f.write(_emit(room))
        print("wrote tools/%s.tscn" % room.rid)
