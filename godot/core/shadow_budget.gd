## A small positional shadow budget for touch browsers. Illumination, circuit
## state, mesh visibility and sight collision are deliberately independent.
class_name WardShadowBudget
extends RefCounted

var _lights: Array[OmniLight3D] = []
var _authored: Array[bool] = []

func collect(lights: Array[OmniLight3D]) -> void:
	_lights = lights.duplicate()
	_authored.clear()
	for light in _lights:
		_authored.append(light.shadow_enabled)

func update(viewpoint: Vector3, limit: int) -> void:
	var candidates: Array[Dictionary] = []
	for i in _lights.size():
		var light := _lights[i]
		if not is_instance_valid(light):
			continue
		if limit < 0:
			light.shadow_enabled = _authored[i]
		elif _authored[i]:
			# Keep a nearby existing caster until a replacement is meaningfully
			# closer; this avoids flickering between slots at a corridor midpoint.
			var distance := light.global_position.distance_squared_to(viewpoint)
			candidates.append({"light": light, "score": distance * (0.8 if light.shadow_enabled else 1.0)})
	if limit < 0:
		return
	candidates.sort_custom(func(a: Dictionary, b: Dictionary): return a.score < b.score)
	for i in candidates.size():
		(candidates[i].light as OmniLight3D).shadow_enabled = i < limit

func selected_count() -> int:
	var count := 0
	for light in _lights:
		if is_instance_valid(light) and light.shadow_enabled:
			count += 1
	return count
