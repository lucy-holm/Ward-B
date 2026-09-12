# One local milestone save, not a serialised scene tree. Coordinates and room
# identity belong to this audited manifest; files cannot invent spawn points.
# A resumed run restarts the milestone's room with its prior campaign facts.
class_name WardCheckpoints
extends RefCounted

const PATH := "user://wardb-checkpoint-v1.json"
const SCHEMA := 1
const CAMPAIGN := "survival-2026-09"
const MAX_BYTES := 16384
const ANCHORS := {
	"checkpoint9": {"room": "room9", "label": "the doctor's office", "position": Vector3(-3.8, 0, 2), "level": "__flat", "yaw": 0.0},
	"checkpoint14": {"room": "room14", "label": "the hold", "position": Vector3(-2, 0, 7.5), "level": "__flat", "yaw": 0.0},
	"checkpoint19": {"room": "room19", "label": "the undercroft", "position": Vector3(4, 0.9, -6.7), "level": "__flat", "yaw": PI},
}

var path: String

func _init(storage_path := PATH) -> void:
	path = storage_path

func anchor(id: String) -> Dictionary:
	return ANCHORS.get(id, {}).duplicate(true)

func make_snapshot(id: String, pills: int, scarce: bool, flags: Dictionary, completed: Array) -> Dictionary:
	var saved_flags := {}
	if id == "checkpoint19" and flags.has("room18.power"):
		saved_flags["room18.power"] = flags["room18.power"]
	return {"schema": SCHEMA, "campaign": CAMPAIGN, "checkpoint": id,
		"pills": pills, "scarce": scarce, "flags": saved_flags,
		"completed": completed.duplicate()}

func _validated(value: Variant) -> Dictionary:
	if not value is Dictionary:
		return {}
	var data: Dictionary = value
	if data.get("schema") != SCHEMA or data.get("campaign") != CAMPAIGN:
		return {}
	var id: Variant = data.get("checkpoint")
	if not id is String or not ANCHORS.has(id):
		return {}
	var pills: Variant = data.get("pills")
	if not (pills is int or pills is float) or not is_finite(float(pills)):
		return {}
	if float(pills) != float(int(pills)) or int(pills) < 0 or int(pills) > Tuning.PILLS_MAX:
		return {}
	if not data.get("scarce") is bool or not data.get("flags") is Dictionary or not data.get("completed") is Array:
		return {}
	var flags: Dictionary = data["flags"]
	if id == "checkpoint19":
		if flags.size() != 1 or flags.get("room18.power") != "lights":
			return {}
	elif not flags.is_empty():
		return {}
	var completed: Array = data["completed"]
	var milestone := int(str(ANCHORS[id]["room"]).trim_prefix("room"))
	var unique: Array[String] = []
	if completed.size() >= milestone:
		return {}
	for room: Variant in completed:
		if not room is String:
			return {}
		var index := int(str(room).trim_prefix("room"))
		if room != "room%d" % index or index < 1 or index >= milestone or room in unique:
			return {}
		unique.append(room)
	return make_snapshot(id, int(pills), data["scarce"], flags, unique)

func load_saved() -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() > MAX_BYTES:
		return {}
	var json := JSON.new()
	if json.parse(file.get_as_text()) != OK:
		return {}
	return _validated(json.data)

func save(snapshot: Dictionary) -> Error:
	# Browser privacy/storage policies can provide a writable but volatile
	# user://. Never promise Continue when Godot reports no persistence.
	if OS.has_feature("web") and not OS.is_userfs_persistent():
		return ERR_UNAVAILABLE
	var data := _validated(snapshot)
	if data.is_empty():
		return ERR_INVALID_DATA
	var temp := path + ".tmp"
	var file := FileAccess.open(temp, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(data))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		return error
	return DirAccess.rename_absolute(ProjectSettings.globalize_path(temp), ProjectSettings.globalize_path(path))

func clear() -> void:
	for file: String in [path, path + ".tmp"]:
		if FileAccess.file_exists(file):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(file))
