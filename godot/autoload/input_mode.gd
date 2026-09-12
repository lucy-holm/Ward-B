## Runtime input mode for devices that expose both touch and a real pointer.
##
## DisplayServer.is_touchscreen_available() answers a capability question. It
## does not answer which control surface the player is using right now: an iPad
## with a Magic Keyboard and trackpad reports both. This node owns that second
## question and emits transitions so the player and touch UI do not each make
## a different decision about the same event.
class_name WardInputMode
extends Node

signal mode_changed(mode: Mode)

enum Mode { POINTER, TOUCH }

var mode: Mode = Mode.TOUCH if DisplayServer.is_touchscreen_available() else Mode.POINTER
var touch_available := DisplayServer.is_touchscreen_available()
var pointer_seen := not touch_available
var _active_touch_indices: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func _input(event: InputEvent) -> void:
	# Filter explicitly marked emulation even though the project disables it.
	# The Web backend can also emit ordinary-device mouse motion during touch,
	# handled by the active-finger guard below. Device identity alone does not
	# prove that a mouse was physically used.
	if (event is InputEventMouseButton or event is InputEventMouseMotion) \
			and event.device == InputEvent.DEVICE_ID_EMULATION:
		return
	if event is InputEventScreenTouch:
		var touch := event as InputEventScreenTouch
		if touch.pressed:
			_active_touch_indices[touch.index] = true
		else:
			_active_touch_indices.erase(touch.index)
		touch_available = true
		set_touch_mode()
	elif event is InputEventScreenDrag:
		# Some web backends place a normal-device MouseMotion immediately before
		# each ScreenDrag even with touch-to-mouse emulation disabled. The drag is
		# the authoritative event and keeps the active touch in touch mode.
		set_touch_mode()
	elif event is InputEventMouseButton or event is InputEventMouseMotion:
		if event is InputEventMouseMotion and not _active_touch_indices.is_empty():
			return
		pointer_seen = true
		set_pointer_mode()
	elif event is InputEventKey and (event as InputEventKey).pressed \
			and not (event as InputEventKey).echo:
		pointer_seen = true
		set_pointer_mode()


func set_pointer_mode() -> void:
	_set_mode(Mode.POINTER)


func set_touch_mode() -> void:
	_set_mode(Mode.TOUCH)


func is_pointer_mode() -> bool:
	return mode == Mode.POINTER


func is_touch_mode() -> bool:
	return mode == Mode.TOUCH


func _set_mode(next: Mode) -> void:
	if mode == next:
		return
	mode = next
	mode_changed.emit(mode)
