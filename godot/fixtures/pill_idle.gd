extends Node3D
## Idle "come get me" motion shared by pill_pickup.tscn and pill_cup.tscn —
## ported from world.ts World.update(): a spin, a slow vertical bob, and an
## emissive pulse synced to the same phase as the bob ("the light feels like
## it's coming from the motion").
##
## Self-contained by design (the scene contract forbids assuming any parent
## API): it reads only its own subtree at _ready, then drives itself every
## frame. Attach to the fixture root. A child node can hold a static tilt
## (see Capsule in both scenes) that this script never touches — mirrors the
## original's split between the animated outer group and the tilted inner
## "wrap" mesh (buildCapsuleMesh).
##
## Tune per-instance via the exported fields: pill_pickup.tscn uses the full
## original amplitudes (spin_speed 1.0, bob 0.03 @ sin(t*2)); pill_cup.tscn
## dials spin/bob down ("keep a subtle version" — a paper cup visibly
## spinning on a table reads wrong) while leaving the glow pulse at full
## strength, since the pill is the gameplay-critical affordance either way.

@export var spin_speed := 1.0       # rad/s around local Y
@export var bob_amount := 0.03      # metres, peak offset from rest position
@export var bob_speed := 2.0        # rad/s — matches the original's sin(t*2)
@export var pulse_amount := 0.15    # emission_energy_multiplier swing, +/-

var _time := 0.0
var _base_y := 0.0
var _pulse_mats: Array[StandardMaterial3D] = []
var _pulse_base: Array[float] = []

func _ready() -> void:
	_base_y = position.y
	_collect_pulse_materials(self)

func _collect_pulse_materials(node: Node) -> void:
	if node is MeshInstance3D:
		var mesh: Mesh = node.mesh
		if mesh != null:
			for i in mesh.get_surface_count():
				var mat := mesh.surface_get_material(i)
				if mat is StandardMaterial3D and mat.emission_enabled and not _pulse_mats.has(mat):
					_pulse_mats.append(mat)
					_pulse_base.append(mat.emission_energy_multiplier)
	for child in node.get_children():
		_collect_pulse_materials(child)

func _process(delta: float) -> void:
	_time += delta
	if spin_speed != 0.0:
		rotation.y = _time * spin_speed
	if bob_amount != 0.0:
		position.y = _base_y + sin(_time * bob_speed) * bob_amount
	if pulse_amount != 0.0:
		var pulse := pulse_amount * sin(_time * bob_speed)
		for i in _pulse_mats.size():
			_pulse_mats[i].emission_energy_multiplier = _pulse_base[i] + pulse
