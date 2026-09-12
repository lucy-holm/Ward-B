# Orderly pursuit and authored noise

The Godot orderly now uses `OrderlyPlanner` (`godot/orderly/orderly_planner.gd`)
for movement. It first takes a direct clear line, then builds a bounded sparse
visibility graph around active room AABBs, capped at 128 nodes and searched
with A*. Active boxes are captured once per plan. `WardCollision.sync_live()` updates
that graph's inputs when a gate is toggled, a shape is disabled, or a collider
moves. The planner filters by the orderly's fixed level and `WardLevels` floor
footprint, so a chase cannot cross a stacked floor or walk through a closed
door. Actors share one live-cache scan per physics frame. Continuous collider
movement uses the route throttle; rejected movement triggers rerouting while
the collision resolver prevents clipping. An unreachable target is remembered
instead of rebuilding its graph every frame. A wall-adjacent player target is adjusted to a legal approach point
within catch radius. A latched return waypoint prevents nearest-waypoint
oscillation.

Room scripts can call
`orderly.hear_noise(position: Vector3, source_level: String, source: String)`.
An idle patrol or returning orderly accepts a same-level event within 8 metres,
walks to a feasible target, searches briefly, and resumes its route. Chases and
active investigations reject new events; a 2.5 second cooldown absorbs event
spam. Investigation sight checks remain live, so an unmedicated player seen on
the way can still start a chase. Lucidity aborts both chase and investigation;
new noise while lucid can still start a nonthreatening investigation.

The actor emits `investigation_started`, `investigation_ended`,
`pursuit_stalled`, and `pursuit_recovered`. Telemetry for these transitions is
bounded to `source`, `reason`, and `orderly_id` fields. Focused coverage lives
in `godot/tools/test_orderly_pursuit.gd` and exercises corner/U routes, actual
room12/15/17 detours, a moving actor with no clipping, unreachable targets,
live gates, level footprints, noise cooldown, search timeout, and lucid/chase
behavior. The focused suite passes 49 assertions, including repeated moving
collider revisions and unreachable targets. The worst measured actual-room
plan in the agent's final native run was 18.92 ms (the regression bound is
24 ms). This is a native planning measurement, not browser frame time or a
physical-phone performance guarantee; dense-room pursuit still needs hardware
playtesting.
