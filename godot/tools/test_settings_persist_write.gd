# Half of the cross-process persistence proof for the settings file. Run this
# in one `godot --headless` process, then run test_settings_persist_read.tscn
# in a SEPARATE process afterwards — a single process round-tripping
# WardSettings' static cache would prove nothing about disk persistence,
# since the cache alone would survive without ever touching
# user://settings.cfg. (That is exactly how the original ProjectSettings
# implementation looked correct while being unable to persist at all.)
#
#   godot --headless --path godot tools/test_settings_persist_write.tscn
#   godot --headless --path godot tools/test_settings_persist_read.tscn
#
# Deliberately writes NON-DEFAULT values for both settings, so the reader
# cannot pass by accidentally reporting the defaults.
extends Node

const EXPECT_BRIGHTNESS := 1.65


func _ready() -> void:
	WardSettings.set_randomize_codes(true)
	WardSettings.set_brightness(EXPECT_BRIGHTNESS)
	print("test_settings_persist_write: wrote randomize_codes=true brightness=%.2f to %s"
		% [EXPECT_BRIGHTNESS, ProjectSettings.globalize_path(WardSettings.PATH)])
	get_tree().quit(0)
