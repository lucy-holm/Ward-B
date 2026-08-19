# All gameplay numbers live here so playtest tuning never touches logic.
#
# PORT NOTE: this is a 1:1 mirror of src/tuning.ts. The values are not
# guesses — several were derived from worst-case geometry audits (see the
# room13 cone derivation in the TS original). Do not "tune by feel" here
# without re-running the corresponding audit; the TS file carries the
# reasoning in comments and remains the reference.
#
# Autoload singleton so any node can read `Tuning.PLAYER_SPEED` without a
# resource lookup or a preload.
extends Node

# --- player ---
const PLAYER_SPEED := 3.4              # m/s
const PLAYER_RADIUS := 0.35            # m
const PLAYER_EYE_HEIGHT := 1.62        # m
const LOOK_SENSITIVITY := 0.0024       # rad per px of mouse motion
const TOUCH_LOOK_SCALE := 1.9

# --- pill economy ---
const PILLS_MAX := 1

# --- medication meter ---
# Seconds a fresh pill's lucidity lasts before it wears off and forces an
# (unavoidable, free) revert to unmed. Long enough for any single intended
# lucid action; short enough that camping lucid across a big room isn't viable.
const MEDICATION_DURATION_SEC := 45.0
const MEDICATION_WARN_SEC := 12.0      # HUD/audio warning threshold

# --- camera ---
const CAMERA_FOV := 72.0
const CAMERA_SHIFT_FOV_KICK := 82.0    # fov snaps here on shift, eases back

# --- interaction ---
const INTERACT_MAX_DISTANCE := 2.7     # m

# --- orderly ---
const ORDERLY_SPEED := 1.5             # m/s, patrol + walk-back
# m/s while chasing. Player walk speed is 3.4 — deliberately faster so
# outrunning him on foot isn't viable; shifting lucid is the intended escape.
const ORDERLY_CHASE_SPEED := 4.3
const ORDERLY_RADIUS := 0.4            # m, collision radius vs room colliders
const ORDERLY_CATCH_RADIUS := 0.55     # m, contact distance that triggers catch
const ORDERLY_ESCAPE_PAUSE_SEC := 0.6  # stands still after a chase ends
const ORDERLY_SIGHT_RANGE := 6.0       # m
const ORDERLY_CONE_DEG := 55.0         # total cone angle, degrees
const ORDERLY_GRACE_SEC := 0.6         # continuous sight before ramp -> chase
const ORDERLY_WARN_AT := 0.5           # ramp fraction that fires the toast
const ORDERLY_PAUSE_AT_WAYPOINT := 0.8 # s, brief pause at each waypoint

# --- telemetry ---
const TELEMETRY_POSITION_SAMPLE_MS := 2000
const TELEMETRY_FLUSH_MS := 15000      # bounds data loss from a crashed tab
const TELEMETRY_IDLE_THRESHOLD_MS := 20000
const TELEMETRY_PERF_INTERVAL_MS := 30000

# Build stamp, mirrors BUILD_VERSION in src/tuning.ts. Overridden at export
# time by a generated file when CI stamps a real SHA.
const BUILD_VERSION := "wardb-godot-0.1.0"
