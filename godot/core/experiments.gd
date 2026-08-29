## A/B experiment assignment — a 1:1 port of src/game/experiments.ts.
##
## STATUS: mechanism only, exactly as in the original. The one registered
## experiment ships `active = false`, nothing in the game reads an arm, and
## get_assignment() therefore returns {} for every real player today. It
## exists so the bucketing is ready to switch on (telemetry design doc §6.4,
## "build it now, it's cheap and awkward to retrofit"), and so the batch
## envelope carries the same `experiment`/`variant` fields the Cloudflare
## worker and dashboard already understand.
##
## The two properties worth preserving in the port:
##
## - Bucketing is a PURE HASH of (player_id, experiment_id), not a random roll
##   persisted somewhere (§6.1). The same player always lands in the same arm
##   without this file remembering anything, and registering a new experiment
##   can never re-roll an existing one.
## - Exactly one active experiment at a time (§6.3). More than one is
##   tolerated rather than fatal — telemetry must never throw into the frame
##   path — but it warns and picks first-registered so the stamp stays
##   deterministic.
##
## FNV-1a is reproduced bit-for-bit against the TS version so a player's arm
## does not change across the engine migration. TS hashes UTF-16 code units
## via charCodeAt; this hashes UTF-8 bytes. Those agree for every input this
## is ever called with (hex player ids and ASCII experiment ids), and the
## check_experiments suite pins the shared vectors.
class_name Experiments
extends RefCounted

const FNV_OFFSET_BASIS := 0x811c9dc5
const FNV_PRIME := 0x01000193
const U32 := 0x100000000

## The declarative registry (§6.2's priority list). Only candidate #1 is
## defined; the rest of that list needs a concrete implementation before it is
## worth registering here.
const REGISTRY := [
	{
		# Does a more direct teach of Q raise room1->room3 survival? Highest
		# traffic, highest leverage, and per §6.4 the only candidate likely to
		# reach significance at prototype traffic. Arms are named for what
		# they will mean; nothing in room1 reads this yet.
		"id": "room1-tutorial-explicitness",
		"active": false,
		"arms": [
			{"id": "control", "weight": 1},
			{"id": "explicit", "weight": 1},
		],
	},
]


## Deterministic 32-bit FNV-1a. Not cryptographic and does not need to be —
## this is bucketing, not security. Chosen over randi() precisely because it
## is a pure function of its input, so there is no "which arm did I already
## give this player" state to persist or lose.
static func hash_string(s: String) -> int:
	var h := FNV_OFFSET_BASIS
	for b in s.to_utf8_buffer():
		h ^= b
		# Masked back to 32 bits every round to match Math.imul, which is the
		# whole reason the TS side uses imul rather than plain `*`.
		h = (h * FNV_PRIME) & 0xFFFFFFFF
	return h


## Maps a [0,1) fraction onto one arm, weighted. Weights are relative and are
## normalised here, so they need not sum to anything in particular.
static func pick_arm(arms: Array, frac: float) -> String:
	var total := 0.0
	for arm: Dictionary in arms:
		total += float(arm["weight"])
	if total <= 0.0:
		return "" if arms.is_empty() else str(arms[0]["id"])
	var remaining := frac * total
	for arm: Dictionary in arms:
		remaining -= float(arm["weight"])
		if remaining < 0.0:
			return str(arm["id"])
	return str(arms[arms.size() - 1]["id"])


## `?experiment=<id>` forces which experiment is live for this session,
## overriding the registry's `active` flag entirely — the only way to test a
## candidate that shipped inactive without flipping it on for real traffic.
static func _resolve_active(forced_id: String) -> Dictionary:
	if not forced_id.is_empty():
		for e: Dictionary in REGISTRY:
			if str(e["id"]) == forced_id:
				return e
		# Unknown id in the override — fall through to the registry's own
		# active flag rather than silently assigning nobody to anything.

	var active: Array[Dictionary] = []
	for e: Dictionary in REGISTRY:
		if bool(e["active"]):
			active.append(e)
	if active.size() > 1:
		# §6.3 invariant violated. Do not throw; make it loud and fall back to
		# a deterministic choice so telemetry still stamps something
		# consistent rather than nothing.
		push_warning(
			"[experiments] %d experiments marked active (want exactly one, §6.3) — using \"%s\"."
			% [active.size(), active[0]["id"]]
		)
	return {} if active.is_empty() else active[0]


## The one function callers need. Returns {} when no experiment is live for
## this session — the default state, and the common case while
## room1-tutorial-explicitness sits inactive.
##
## `?notrack=1` suppresses assignment too, but that is enforced by the caller
## (Telemetry only resolves an assignment when not opted out), not duplicated
## here: this module has no opinion on tracking consent.
static func get_assignment(player_id: String) -> Dictionary:
	var experiment := _resolve_active(WebEnv.query_param("experiment"))
	if experiment.is_empty():
		return {}

	var arms: Array = experiment["arms"]

	# `?variant=<arm>` forces the arm within whatever experiment resolved
	# above, for testing one arm without depending on the hash. Ignored if it
	# does not name a real arm of that experiment.
	var forced_variant := WebEnv.query_param("variant")
	if not forced_variant.is_empty():
		for arm: Dictionary in arms:
			if str(arm["id"]) == forced_variant:
				return {"experiment": experiment["id"], "variant": forced_variant}

	var frac := float(hash_string("%s:%s" % [player_id, experiment["id"]])) / float(U32)
	return {"experiment": experiment["id"], "variant": pick_arm(arms, frac)}
