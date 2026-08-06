# Keypad code generation + the randomize-codes setting.
#
# HARD RULE (CLAUDE.md): every keypad room MUST wire this, or the start-screen
# toggle silently skips that room. A room wires it by calling
# `regenerate_code()` in on_enter AND again in its catch handler — being
# caught rerolls the code so a player cannot memorise it across a reset.
class_name WardCodes
extends RefCounted

const SETTING_KEY := "wardb/randomize_codes"


static func is_randomize_codes_enabled() -> bool:
	if ProjectSettings.has_setting(SETTING_KEY):
		return bool(ProjectSettings.get_setting(SETTING_KEY))
	return false


static func set_randomize_codes(enabled: bool) -> void:
	ProjectSettings.set_setting(SETTING_KEY, enabled)


static func random_code_4() -> String:
	var out := ""
	for i in 4:
		out += str(randi() % 10)
	return out


## Renders a code as a wall clue: "4 1 1 8". `mask` blanks everything outside
## the half-open range [start, end) with an en dash, which is how room 5
## splits one code across two scrawls on opposite sides of a patrol loop.
static func code_clue_text(code: String, mask: Array = []) -> String:
	var parts: Array[String] = []
	for i in code.length():
		if mask.size() == 2 and (i < int(mask[0]) or i >= int(mask[1])):
			parts.append("-")
		else:
			parts.append(code[i])
	return " ".join(parts)
