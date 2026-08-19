# Minimal stand-in for the player, for headless behavioural tests.
#
# Orderly only reads three things off the player: global_position, `level`
# (via the `"level" in _player` duck-type check in _player_level), and `yaw`
# for bearing_from. A bare Node3D with these two properties is enough to tick
# his whole physics path without instantiating main.tscn.
extends Node3D

var level := "__flat"
var yaw := 0.0
