## Thin, safe wrapper over the browser APIs the telemetry stack needs.
##
## Every function here has a defined OFF-WEB answer, so callers never branch on
## OS.has_feature("web") themselves. That matters because the same telemetry
## code runs in three places that are not browsers at all: the desktop editor,
## the `--headless` suites in tools/test_*.gd, and CI.
##
## JavaScriptBridge is reached through Engine.get_singleton() rather than being
## named directly. The singleton exists ONLY in a web export; naming it in
## source that also has to load on desktop is how you get a build that runs
## everywhere except the one platform you shipped it for. The existing
## telemetry code already used this pattern — it is kept, not invented here.
##
## String interpolation into `eval` goes through js_literal(), never through
## manual quote-escaping. The previous hand-rolled escape
## (`.replace("\\","\\\\").replace("'","\\'")`) silently produced a syntax
## error the moment a payload contained a newline — which any error `stack`
## field does — and a syntax error inside eval is swallowed, so the beacon
## just quietly stopped sending. JSON.stringify is the correct escape for this
## and handles quotes, newlines and control characters in one go.
class_name WebEnv
extends RefCounted


static func is_web() -> bool:
	return OS.has_feature("web")


## The JavaScriptBridge singleton, or null off-web / if it is unavailable.
static func bridge() -> Object:
	if not is_web():
		return null
	if not Engine.has_singleton("JavaScriptBridge"):
		return null
	return Engine.get_singleton("JavaScriptBridge")


## Evaluates `code` in the page's global context. Returns null off-web, and
## also null when the expression throws — eval swallows JS exceptions, so a
## null return means "no answer", never "the page said null".
static func eval_js(code: String) -> Variant:
	var js := bridge()
	if js == null:
		return null
	return js.eval(code, true)


## A JS string literal for `s`, safe to paste into evaluated source. JSON
## string syntax is a subset of JS string syntax, so JSON.stringify's output
## is already a valid literal.
static func js_literal(s: String) -> String:
	return JSON.stringify(s)


static func hostname() -> String:
	var h: Variant = eval_js("location.hostname")
	return "" if h == null else str(h)


static func href_search() -> String:
	var s: Variant = eval_js("location.search")
	return "" if s == null else str(s)


## Reads one query parameter. Returns "" when absent, off-web, or malformed —
## the caller treats all three the same way (no override given).
static func query_param(name: String) -> String:
	var expr := "new URLSearchParams(location.search).get(%s) || ''" % js_literal(name)
	var v: Variant = eval_js(expr)
	return "" if v == null else str(v)


# --- localStorage ---------------------------------------------------------
#
# Wrapped in try/catch on the JS side because localStorage THROWS in private
# browsing and when the quota is exceeded — the same hazard src/game/
# telemetry.ts documents around its safeGet/safeSet helpers. A throw here
# would propagate as a null from eval and be indistinguishable from a missing
# key, which is the correct degradation anyway: behave as if unset.

static func ls_get(key: String) -> String:
	var expr := "(()=>{try{return localStorage.getItem(%s)||''}catch(e){return ''}})()" % js_literal(key)
	var v: Variant = eval_js(expr)
	return "" if v == null else str(v)


static func ls_set(key: String, value: String) -> void:
	var expr := "(()=>{try{localStorage.setItem(%s,%s)}catch(e){}})()" % [
		js_literal(key), js_literal(value)
	]
	eval_js(expr)


static func ls_remove(key: String) -> void:
	var expr := "(()=>{try{localStorage.removeItem(%s)}catch(e){}})()" % js_literal(key)
	eval_js(expr)
