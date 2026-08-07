shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Worn lino/tile floor and stained acoustic-tile ceiling (floor.tres,
// ceil.tres).
//
// TRIPLANAR, WORLD SPACE — see triplanar_plaster.gdshader for why. The grout
// grid in particular MUST be world-space: floor and ceiling planes are
// per-room BoxMeshes of different footprints, and a UV-space grid would give
// a different tile count (and a different apparent tile size) in every room.
// mod(world_pos.xz, tile_size) gives a 0.5m floor tile and a 0.6m ceiling
// tile that measure the same everywhere, matching the original's
// FLOOR_TILE_M / CEIL_TILE_M.
//
// The grid is weighted by the up-facing triplanar weight, so the thin
// vertical edges of a floor/ceiling slab get the plain mottled material
// rather than a grid smeared sideways down the lip.
//
// Per-tile brightness jitter (the original jittered every tile's fill by
// +/-22/255) is a 4-op integer hash on the tile index, not a texture fetch —
// cheaper than sampling and it never repeats on a tiling boundary.

uniform vec4 base_color : source_color = vec4(0.29, 0.302, 0.294, 1.0);
uniform vec4 grout_color : source_color = vec4(0.16, 0.17, 0.165, 1.0);
uniform float tile_size = 0.5;
uniform float grout_width = 0.035;
uniform float tile_jitter : hint_range(0.0, 1.0) = 0.1;
// Baked fake bevel: brightens one edge of each tile and darkens the
// opposite, the same cheap diagonal-gradient trick the canvas version used
// instead of real per-tile AO.
uniform float bevel_strength : hint_range(0.0, 1.0) = 0.12;

uniform sampler2D mottle_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, repeat_enable, filter_linear_mipmap;
uniform float mottle_scale = 0.35;
uniform float normal_scale = 2.5;
uniform float mottle_strength : hint_range(0.0, 1.0) = 0.3;
// Grime that pools along the grout lines and in traffic lanes. Darkens only.
uniform float grime_strength : hint_range(0.0, 1.0) = 0.35;
uniform float normal_strength : hint_range(0.0, 2.0) = 0.5;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.85;

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

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void fragment() {
	vec3 weights = triplanar_weights(world_normal);
	float mottle = triplanar_sample(mottle_tex, world_pos, weights, mottle_scale).r;
	vec3 nrm = triplanar_sample(normal_tex, world_pos, weights, normal_scale);

	// Centred on 1.0 so mottling modulates around base_color rather than
	// halving the authored albedo (noise averages ~0.5).
	vec3 tinted = base_color.rgb * (1.0 + (mottle - 0.5) * 2.0 * mottle_strength);

	// --- tile grid (world space) -------------------------------------------
	vec2 cell = world_pos.xz / tile_size;
	vec2 f = fract(cell);
	vec2 dist2 = min(f, 1.0 - f) * tile_size;
	float d = min(dist2.x, dist2.y);
	// Derivative-based AA. The grout line is analytic, so unlike the sampled
	// textures it gets no mipmap and would moire into a shimmering interference
	// pattern across a receding floor — very visible on a phone at 1081x2202.
	// Widening the edge to at least one pixel of world-space footprint makes
	// distant floor fade to a flat average instead.
	float aa = fwidth(d) * 1.5;
	float grid = smoothstep(0.0, max(grout_width, aa), d);

	float jitter = (hash21(floor(cell)) - 0.5) * 2.0 * tile_jitter;
	// Diagonal bevel across each tile: +bevel at one corner, -bevel at the
	// opposite one.
	float bevel = ((f.x + f.y) * 0.5 - 0.5) * 2.0 * bevel_strength;
	vec3 tile_col = tinted * (1.0 + jitter - bevel);

	// Grime is heaviest right up against the grout, thinning across the tile.
	float near_grout = 1.0 - smoothstep(grout_width, tile_size * 0.42, d);
	tile_col *= 1.0 - near_grout * grime_strength * mottle;

	vec3 gridded = mix(grout_color.rgb, tile_col, grid);
	vec3 col = mix(tinted, gridded, weights.y);

	ALBEDO = col;
	NORMAL_MAP = nrm;
	NORMAL_MAP_DEPTH = normal_strength;
	// Grout is matte; the tile face keeps a faint polish where it is worn.
	ROUGHNESS = mix(roughness_base, min(roughness_base + 0.12, 1.0),
		(1.0 - grid) * weights.y);
	METALLIC = 0.0;
}
