# Modal 4-digit keypad.
#
# Control nodes on a CanvasLayer rather than a DOM overlay. Releases mouse
# capture while open and restores it on close, and pauses the tree so the
# medication meter does not drain behind the modal (StateManager is
# PROCESS_MODE_PAUSABLE for exactly this reason).
extends CanvasLayer

signal success
signal denied(attempt: String)
signal closed

@onready var _display: Label = $Panel/VBox/Display
@onready var _grid: GridContainer = $Panel/VBox/Grid

var _code := ""
var _entered := ""
var _attempts := 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_WHEN_PAUSED
	hide()
	for child in _grid.get_children():
		if child is Button:
			(child as Button).pressed.connect(_on_key.bind((child as Button).text))


func open(code: String) -> void:
	_code = code
	_entered = ""
	_attempts = 0
	_refresh()
	show()
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func close() -> void:
	hide()
	get_tree().paused = false
	if not DisplayServer.is_touchscreen_available():
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	closed.emit()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and (event as InputEventKey).pressed:
		var k := event as InputEventKey
		if k.keycode == KEY_ESCAPE:
			close()
			get_viewport().set_input_as_handled()
		elif k.keycode >= KEY_0 and k.keycode <= KEY_9:
			_on_key(str(k.keycode - KEY_0))
			get_viewport().set_input_as_handled()
		elif k.keycode == KEY_BACKSPACE:
			_entered = _entered.substr(0, maxi(0, _entered.length() - 1))
			_refresh()
			get_viewport().set_input_as_handled()


func _on_key(digit: String) -> void:
	if digit == "CLR":
		_entered = ""
		_refresh()
		return
	if digit == "ESC":
		close()
		return
	if _entered.length() >= 4:
		return
	_entered += digit
	_refresh()

	if _entered.length() == 4:
		if _entered == _code:
			success.emit()
			close()
		else:
			_attempts += 1
			denied.emit(_entered)
			_display.text = "DENIED"
			await get_tree().create_timer(0.6).timeout
			_entered = ""
			_refresh()


func _refresh() -> void:
	var shown := _entered
	while shown.length() < 4:
		shown += "-"
	_display.text = shown
