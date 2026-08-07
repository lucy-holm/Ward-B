shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Generic worn institutional surface: props, bed frames, door slabs, pitted
// dark metal (chain), steel fixtures (dispenser, pad, keypad). Mirrors the
// original's makeWornTexture — a base fill plus scattered soft light/dark
// blotches, no tile grid.
//
// TRIPLANAR, WORLD SPACE — see triplanar_plaster.gdshader for why. It
// matters most here: this one shader is shared by a 2m bed frame and a 0.1m
// door bar, and world projection is what stops the small one looking like a
// blown-up crop of the big one.
//
// Two independent world-space frequencies (albedo blotch vs surface bump)
// plus an optional vertical anisotropy for the door's painted-over grain.

uniform vec4 base_color : source_color = vec4(0.5, 0.5, 0.5, 1.0);

uniform sampler2D mottle_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, repeat_enable, filter_linear_mipmap;
uniform float mottle_scale = 0.7;
uniform float normal_scale = 3.0;
// Vertical frequency multiplier for the two planar projections that include
// world Y. <1 lowers the vertical sampling rate relative to horizontal,
// elongating blotches into vertical streaks — a cheap stand-in for painted-
// over wood grain with no extra fetch. Isotropic (1.0) everywhere else.
uniform float stretch_y = 1.0;
uniform float mottle_strength : hint_range(0.0, 1.0) = 0.3;
uniform float normal_strength : hint_range(0.0, 2.0) = 0.5;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.75;
// KEEP THIS NEAR ZERO, even for the steel fixtures. main.tscn's Environment
// is background_mode = BG_COLOR with ambient_light_source = COLOR: there is
// no sky and there are no reflection probes, so a metallic surface gets no
// environment specular at all — metallic kills the diffuse term and gives
// nothing back, and the fixture renders dead black. Verified: chain.tres at
// metallic 0.8 was a black slab. Steel is sold here by low roughness plus
// the pitted normal, not by METALLIC.
uniform float metallic_base : hint_range(0.0, 1.0) = 0.0;
// Grime that collects toward the bottom of a fixture — the "everything in
// here has been mopped around for twenty years" cue. Height is measured in
// world metres, so a floor-standing prop grimes at its base and a
// wall-mounted keypad at 1.4m does not.
uniform float floor_grime : hint_range(0.0, 1.0) = 0.0;
uniform float floor_grime_height = 0.4;
// Faint fixture glow (keypad / dispenser indicator bleed). Its own colour
// rather than a reuse of base_color: the original's pad/dispenser emissive
// was a cool clinical teal over a grey-green body, not a brighter copy of
// the body colour.
uniform vec4 emission_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float emission_strength : hint_range(0.0, 2.0) = 0.0;

varying vec3 world_pos;
varying vec3 world_normal;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_normal = normalize(MODEL_NORMAL_MATRIX * NORMAL);
}

vec3 triplanar_weights(vec3 wnorm) {
	vec3 w = pow(abs(wnorm), vec3(4.0));
	return w / max(w.x + w.y + w.z, 0.00001);
}

vec3 triplanar_sample(sampler2D tex, vec3 wpos, vec3 weights, float scale, float y_freq) {
	vec3 cx = texture(tex, wpos.zy * vec2(scale, scale * y_freq)).rgb;
	vec3 cy = texture(tex, wpos.xz * scale).rgb;
	vec3 cz = texture(tex, wpos.xy * vec2(scale, scale * y_freq)).rgb;
	return cx * weights.x + cy * weights.y + cz * weights.z;
}

void fragment() {
	vec3 weights = triplanar_weights(world_normal);
	float mottle = triplanar_sample(mottle_tex, world_pos, weights, mottle_scale, stretch_y).r;
	vec3 nrm = triplanar_sample(normal_tex, world_pos, weights, normal_scale, stretch_y);

	// Centred on 1.0 so mottling modulates around base_color rather than
	// halving the authored albedo (noise averages ~0.5).
	vec3 col = base_color.rgb * (1.0 + (mottle - 0.5) * 2.0 * mottle_strength);

	float grime = (1.0 - smoothstep(0.0, floor_grime_height, world_pos.y)) * floor_grime;
	col *= 1.0 - grime * (0.5 + mottle * 0.5);

	ALBEDO = col;
	NORMAL_MAP = nrm;
	NORMAL_MAP_DEPTH = normal_strength;
	// Wear polishes high spots and dulls the grimy low ones.
	ROUGHNESS = clamp(roughness_base + (0.5 - mottle) * 0.2 + grime * 0.15, 0.0, 1.0);
	METALLIC = metallic_base;
	EMISSION = emission_color.rgb * emission_strength;
}
