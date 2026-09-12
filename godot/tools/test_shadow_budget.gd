# Shadow allocation must never change puzzle illumination or add new casters.
extends Node
var failures: Array[String] = []
var checks := 0
func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures.append(message)
func _ready() -> void:
	if not ResourceLoader.exists("res://core/shadow_budget.gd"):
		print("FAIL - shadow budget is not implemented")
		get_tree().quit(1)
		return
	var budget = load("res://core/shadow_budget.gd").new()
	var lights: Array[OmniLight3D] = []
	for i in 8:
		var light := OmniLight3D.new()
		add_child(light)
		light.position = Vector3(i * 8, 2, 0)
		light.shadow_enabled = i != 0 # closest bounce fitting must NEVER gain shadows.
		light.light_energy = 0.12 if i == 2 else 1.0
		lights.append(light)
	budget.collect(lights)
	budget.update(Vector3.ZERO, 2)
	check(lights.filter(func(l): return l.shadow_enabled).size() == 2, "touch caps eight fittings to two authored shadows")
	check(not lights[0].shadow_enabled and lights[1].shadow_enabled and lights[2].shadow_enabled, "nearest authored casters only")
	check(is_equal_approx(lights[2].light_energy, 0.12), "dark circuit energy survives allocation")
	budget.update(Vector3(55, 0, 0), 2)
	check(lights[6].shadow_enabled and lights[7].shadow_enabled, "budget follows camera to distant end")
	check(not lights[1].shadow_enabled, "old distant caster releases its slot")
	budget.update(Vector3.ZERO, -1)
	check(lights.filter(func(l): return l.shadow_enabled).size() == 7, "desktop restores every authored shadow")
	check(not lights[0].shadow_enabled, "desktop never promotes a bounce fitting")
	var empty: Array[OmniLight3D] = []
	budget.collect(empty)
	budget.update(Vector3.ZERO, 2)
	check(budget.selected_count() == 0, "room transition clears previous fittings")
	for light in lights:
		light.free()
	for failure in failures:
		print("  FAIL - ", failure)
	print("test_shadow_budget: %d assertions" % checks)
	print("  OK - mobile shadow budget preserves illumination" if failures.is_empty() else "  FAILED - shadow budget")
	get_tree().quit(0 if failures.is_empty() else 1)
