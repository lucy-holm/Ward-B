shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Painted institutional plaster/block wall (wall.tres, wall2.tres).
//
// TRIPLANAR, WORLD SPACE. Room geometry is BoxMesh of wildly varying size —
// a 6m corridor wall run and a 0.4m fixture share this material, and BoxMesh
// UVs are 0..1 per face, so any fixed uv1_scale stretches by whatever the
// mesh happens to measure. Projecting from world position instead pins texel
// density to metres, so the same physical texture pitch applies to every
// mesh regardless of size. Nothing here reads UV at all.
//
// Three layers, mirroring the original canvas texture's intent:
//   1. mottle    — low-frequency fractal blotching, the "painted a long time
//                  ago, patched twice" base variation. Own world scale.
//   2. streak    — vertical water runs, heaviest near the ceiling and fading
//                  down. ONE texture fetch, not a fourth triplanar set: the
//                  horizontal coordinate is (x + z), which varies correctly
//                  along either an x-facing or a z-facing wall (every wall in
//                  the ward is axis-aligned), and the vertical coordinate is
//                  world Y heavily compressed so features elongate downward.
//   3. band      — the darker wainscot/scuff zone baked in from the floor up
//                  to band_height, with a hairline chair rail at the seam.
// Plus a fine normal map on its own world scale so the surface catches the
// orderly's light instead of reading as a flat painted card.

uniform vec4 base_color : source_color = vec4(0.42, 0.435, 0.425, 1.0);
uniform vec4 band_color : source_color = vec4(0.29, 0.31, 0.30, 1.0);
uniform float band_height = 0.95;
uniform float band_softness = 0.25;
uniform float rail_width = 0.025;

uniform sampler2D mottle_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, repeat_enable, filter_linear_mipmap;

// World-space frequencies, in cycles per metre. Deliberately independent:
// albedo blotching wants metre-scale features, the bump wants centimetre.
uniform float mottle_scale = 0.22;
uniform float normal_scale = 1.6;
uniform float streak_scale = 0.6;
uniform float streak_squash = 0.08;

uniform float mottle_strength : hint_range(0.0, 1.0) = 0.4;
uniform float streak_strength : hint_range(0.0, 1.0) = 0.35;
uniform float normal_strength : hint_range(0.0, 2.0) = 0.6;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.9;

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

vec3 triplanar_sample(sampler2D tex, vec3 wpos, vec3 weights, float scale) {
	vec3 cx = texture(tex, wpos.zy * scale).rgb;
	vec3 cy = texture(tex, wpos.xz * scale).rgb;
	vec3 cz = texture(tex, wpos.xy * scale).rgb;
	return cx * weights.x + cy * weights.y + cz * weights.z;
}

void fragment() {
	vec3 weights = triplanar_weights(world_normal);
	float mottle = triplanar_sample(mottle_tex, world_pos, weights, mottle_scale).r;
	vec3 nrm = triplanar_sample(normal_tex, world_pos, weights, normal_scale);

	// --- band -------------------------------------------------------------
	float band_t = 1.0 - smoothstep(band_height - band_softness, band_height, world_pos.y);
	vec3 col = mix(base_color.rgb, band_color.rgb, band_t);
	float rail = 1.0 - smoothstep(0.0, rail_width, abs(world_pos.y - band_height));
	col *= mix(1.0, 0.65, rail);

	// --- mottle -----------------------------------------------------------
	// Centred on 1.0 so mottling modulates around base_color rather than
	// dragging every wall darker: noise averages ~0.5, so a naive
	// mix(1.0, mottle, s) would quietly halve the authored albedo.
	col *= 1.0 + (mottle - 0.5) * 2.0 * mottle_strength;

	// --- water streaks ----------------------------------------------------
	// Darken only; a stain never brightens a wall. Weighted toward the top of
	// the 3m wall, and suppressed on horizontal faces (weights.y) where a
	// vertical run makes no sense.
	float streak_n = texture(mottle_tex,
		vec2(world_pos.x + world_pos.z, world_pos.y * streak_squash) * streak_scale).r;
	float streak = smoothstep(0.55, 1.0, streak_n);
	float from_top = smoothstep(0.4, 2.6, world_pos.y);
	col *= 1.0 - streak * streak_strength * from_top * (1.0 - weights.y);

	ALBEDO = col;
	NORMAL_MAP = nrm;
	NORMAL_MAP_DEPTH = normal_strength;
	// Water-damaged patches sit slightly glossier than the surrounding
	// chalky paint — a small cue that reads even before the stain does.
	ROUGHNESS = roughness_base - streak * 0.2;
	METALLIC = 0.0;
}
