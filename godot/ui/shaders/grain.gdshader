shader_type canvas_item;
render_mode blend_mix, unshaded;

// Film grain. The Three.js build did this with a scrolling 96x96 noise PNG as
// a DOM overlay (renderer.ts:214-221); here it is a cheap hash in a
// canvas_item shader, which needs no texture at all. Compatibility-renderer
// safe: no derivatives, no texture fetches, one hash per pixel.
//
// `strength` is driven by main.gd — 0.025 lucid, 0.04 unmedicated. The ward
// is grainier when you are not medicated.

uniform float strength : hint_range(0.0, 0.2) = 0.03;
uniform float grain_px = 1.6;   // grain cell size in device pixels
uniform float time_scale = 24.0;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	// Quantise to a pixel grid so grain keeps a consistent physical size
	// instead of turning into invisible fizz on a high-DPI phone.
	vec2 cell = floor(FRAGCOORD.xy / grain_px);
	// Step the pattern in whole frames on two axes at different rates, so it
	// never settles into a readable texture.
	vec2 drift = vec2(floor(TIME * time_scale), floor(TIME * time_scale * 0.71));

	float n = hash(cell + drift);

	// Straight mix of monochrome noise at low alpha. At these strengths the
	// pull toward mid-grey is imperceptible and it reads as film grain.
	COLOR = vec4(vec3(n), strength);
}
