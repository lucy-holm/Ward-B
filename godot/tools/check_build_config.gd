# Asserts what the ENGINE actually resolved for BuildConfig, as opposed to what
# a shell script wrote into a file a moment ago.
#
#   godot --headless --path godot tools/check_build_config.tscn          # expect empty
#   WARDB_EXPECT_ENDPOINT=1 godot --headless --path godot tools/check_build_config.tscn
#
# WHY THIS AND NOT A grep OF THE .pck: the Web preset exports GDScript as
# compressed binary tokens (script_export_mode=2), so string constants are not
# present as plain text in index.pck and a grep for the collector host finds
# nothing even in a build that reports perfectly. That check was written, it
# failed against a known-good build, and it is recorded here so nobody adds it
# back. Parsing the constant through the engine is the real equivalent.
extends Node


func _ready() -> void:
	var endpoint := BuildConfig.TELEMETRY_ENDPOINT
	var expect_set := OS.get_environment("WARDB_EXPECT_ENDPOINT") == "1"
	var fail := 0

	if expect_set:
		if endpoint.is_empty():
			printerr("FAIL: expected a baked telemetry endpoint, got an empty one")
			fail += 1
		elif not endpoint.begins_with("https://"):
			printerr("FAIL: endpoint is not https")
			fail += 1
		if BuildConfig.BUILD_SHA.is_empty():
			printerr("FAIL: expected a build SHA to be stamped")
			fail += 1
	else:
		if not endpoint.is_empty():
			printerr("FAIL: this build must NOT carry a telemetry endpoint, but it does")
			fail += 1

	if fail == 0:
		# The host, never the full URL — CI logs are public on a public repo.
		var host := "(none)"
		if not endpoint.is_empty():
			host = endpoint.trim_prefix("https://").split("/")[0]
		print("OK - build config (endpoint host: %s, sha: %s)" % [
			host, BuildConfig.BUILD_SHA if not BuildConfig.BUILD_SHA.is_empty() else "(none)"
		])
	get_tree().quit(1 if fail > 0 else 0)
