# Design-law helpers: pure functions that turn Tuning's raw numbers into the
# authoring rules six-plus rooms currently restate as a comment above a
# hand-picked constant.
#
# NO SIDE EFFECTS, NO STATE. Every function here takes what Tuning already
# has and returns a number; nothing is read from or written to a room, an
# orderly, or the world. That is deliberate — these are law, not behaviour,
# and belong next to Tuning conceptually even though they live in kit/ so a
# room-authoring pass can find them alongside the rest of the kit.
class_name KitDesign
extends RefCounted


## THE ~8.2 m INSPECTION-DISTANCE RULE.
##
## A player who first notices an orderly (sight range 6 m, but this holds for
## any first-notice distance) needs a real chance to react before he can
## close the gap — otherwise "he saw you" and "he caught you" are the same
## instant and the warn/chase split (Tuning.ORDERLY_WARN_AT, the `warned`
## signal) is decorative. `reaction_sec` is how long that reaction should be;
## ORDERLY_GRACE_SEC of it is already spent by the ramp climbing to 1.0
## before the chase even starts, so what is left is straight closing time at
## chase speed:
##
##   (reaction_sec - ORDERLY_GRACE_SEC) * ORDERLY_CHASE_SPEED
##     = (2.5 - 0.6) * 4.3 = 8.17 m
##
## Six-plus rooms hard-code this as "~8.2m" or "8.17m" in a comment above a
## nook/scrawl/dispenser placement instead of deriving it, which is exactly
## the kind of duplicated-and-driftable number this kit exists to remove: a
## future Tuning retune (chase speed, grace period) silently invalidates every
## one of those hand-typed comments and this call site does not.
static func min_inspection_distance(reaction_sec := 2.5) -> float:
	return (reaction_sec - Tuning.ORDERLY_GRACE_SEC) * Tuning.ORDERLY_CHASE_SPEED


## PATROL-LEG CLEARANCE. An orderly's collision radius plus a flat 0.1 m
## margin — the minimum distance a patrol leg (or anything else he walks
## past) must clear to guarantee he never wedges against it. Matches the
## 0.5 m clearance figure `check_rooms._check_patrol` validates every
## WAYPOINTS_* constant against; see orderly.gd's header on why a wedged
## patrol used to be a permanent, unrecoverable freeze before NavAgent.
static func patrol_clearance() -> float:
	return Tuning.ORDERLY_RADIUS + 0.1
