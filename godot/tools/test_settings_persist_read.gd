# Second half of the cross-process persistence proof — see
# test_settings_persist_write.gd. This is a fresh OS process with an
# untouched WardSettings static cache, so the ONLY way these values can come
# back non-default is if they were genuinely read off disk from
# user://settings.cfg, written by the previous process.
extends Node

const EXPECT_BRIGHTNESS := 1.65

var failures: Array[String] = []


func _ready() -> void:
	var randomize_on := WardSettings.is_randomize_codes_enabled()
	var brightness := WardSettings.get_brightness()

	print("test_settings_persist_read: read randomize_codes=%s brightness=%.2f from %s"
		% [randomize_on, brightness, ProjectSettings.globalize_path(WardSettings.PATH)])

	if not randomize_on:
		failures.append("expected randomize_codes == true (written by test_settings_persist_write in a prior process)")
	if not is_equal_approx(brightness, EXPECT_BRIGHTNESS):
		failures.append("expected brightness == %.2f, got %.2f" % [EXPECT_BRIGHTNESS, brightness])

	# Restore first-boot defaults so this can't leak into any later run.
	WardSettings.set_randomize_codes(WardSettings.DEFAULT_RANDOMIZE_CODES)
	WardSettings.set_brightness(WardSettings.DEFAULT_BRIGHTNESS)

	if failures.is_empty():
		print("  OK - values written by a previous, separate process survived the restart")
		get_tree().quit(0)
	else:
		for f in failures:
			print("  FAIL  %s" % f)
		get_tree().quit(1)
