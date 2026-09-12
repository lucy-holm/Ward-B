# A deliberate ending, rather than leaving input disabled in an active ward.
extends CanvasLayer

var panel: PanelContainer
var title: Label
func _ready() -> void:
	layer = 12
	var dim := ColorRect.new()
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.025, 0.032, 0.028, 0.96)
	add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	panel = PanelContainer.new()
	panel.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	center.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 20)
	panel.add_child(column)
	title = Label.new()
	title.text = "THE DOOR OPENS"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 28)
	title.add_theme_color_override("font_color", Color(0.77, 0.82, 0.72))
	column.add_child(title)
	var text := Label.new()
	text.text = "END OF PLAYTEST\n\nYou made it out of Ward B.\nThank you for playing.\n\nIf you leave feedback, tell us where you felt lost,\nand whether being caught felt recoverable.\n\nYou can close this tab.\nRefresh to begin a new admission."
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	text.add_theme_font_size_override("font_size", 15)
	text.add_theme_color_override("font_color", Color(0.78, 0.78, 0.71))
	column.add_child(text)
	get_viewport().size_changed.connect(_resize)
	_resize()

func _resize() -> void:
	panel.custom_minimum_size.x = minf(540, get_viewport().get_visible_rect().size.x * 0.86)
