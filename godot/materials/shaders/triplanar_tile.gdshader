shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Worn lino/tile floor and stained acoustic-tile ceiling (floor.tres,
// ceil.tres).
//
// REWRITE (concept-art pass): the previous version was albedo-only relief —
// a flat-shaded grid with a fake diagonal-gradient "bevel" baked into
// colour, no real light response. This version leans on what Three.js could
// not do: a real per-pixel roughness (the wet-sheen "biggest win"), a
// genuine normal-space groove/bevel derived from an analytic height field
// (not a painted gradient), a single-step parallax offset so the grout
// reads as a recess rather than a drawn line, and decay-driven staining
// that respects the floor-vs-ceiling grid-bound rule below. Grout AO is
// baked into albedo (Compatibility has no SSAO) and every hand-rolled
// analytic effect fades out with distance so it settles to a flat average
// instead of shimmering — the two *sampled* textures already carry
// mipmaps and don't need this.
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
//
// TEXTURE BUDGET: 3 distinct noise textures (mottle_tex, stain_tex,
// normal_tex), each reused a second time at a different scale/offset
// instead of adding a 4th resource — mottle_tex doubles as the hard-edged
// scuff mask, stain_tex doubles as the ceiling water-damage bloom mask.
// 8 texture fetches/fragment (3 triplanar mottle + 1 planar scuff reread +
// 3 triplanar normal + 1 branched stain), under the ~10 fetch ceiling.

uniform float decay : hint_range(0.0, 1.0) = 0.35;

// --- colour --------------------------------------------------------------
uniform vec4 base_color : source_color = vec4(0.29, 0.302, 0.294, 1.0);
// Colour base_color drifts toward as decay -> 1 (the "rotten green-black"
// leg of the shared decay contract).
uniform vec4 decay_color : source_color = vec4(0.1, 0.11, 0.08, 1.0);
uniform vec4 grout_color : source_color = vec4(0.16, 0.17, 0.165, 1.0);
// Pooled water / ceiling water-damage tint.
uniform vec4 stain_color : source_color = vec4(0.3, 0.19, 0.14, 1.0);

// --- tile grid (world space) ----------------------------------------------
uniform float tile_size = 0.5;
uniform float grout_width = 0.035;
uniform float tile_jitter : hint_range(0.0, 1.0) = 0.1;
// true for ceil.tres: gates the per-tile sag term and switches the stain
// sampling from continuous (spills ignore grout) to per-tile-quantised
// (a ceiling tile stains as a unit).
uniform bool is_ceiling = false;

// --- relief: groove + bevel + (ceiling) sag -------------------------------
// World-metre depth of the grout trench. Also the single height field that
// drives both the analytic normal bevel below and the parallax offset.
uniform float groove_depth = 0.01;
// Fraction of tile_size the bevel rounds off across, working in from the
// grout line.
uniform float groove_reach : hint_range(0.05, 0.6) = 0.3;
uniform float groove_normal_strength = 6.0;
// 0 for floor.tres. Ceiling tiles bow toward the room by up to this many
// world metres, randomised per tile so it reads as sag, not a stamped grid.
uniform float ceil_sag_strength = 0.0;
uniform float parallax_strength : hint_range(0.0, 1.0) = 0.5;

// --- texture-driven detail -------------------------------------------------
uniform sampler2D mottle_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D stain_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, repeat_enable, filter_linear_mipmap;
uniform float mottle_scale = 0.35;
// Frequency multiplier applied on top of mottle_scale for the decorrelated
// scuff reread of the same texture.
uniform float wear_freq_mult = 3.4;
uniform float stain_scale = 0.12;
uniform float normal_scale = 2.5;

uniform float mottle_strength : hint_range(0.0, 1.0) = 0.3;
// Hard-edged scuffs/chips — base material wear, NOT decay-gated (scuffed
// lino is scuffed in both realities).
uniform float wear_strength : hint_range(0.0, 1.0) = 0.3;
uniform float wear_threshold : hint_range(0.0, 1.0) = 0.55;
// Pooling / ceiling bloom — heavily decay-gated (density and strength).
uniform float stain_strength : hint_range(0.0, 1.0) = 0.6;
uniform float stain_threshold : hint_range(0.0, 1.0) = 0.5;
// Baked contact darkening in the grout, independent of decay — Compatibility
// has no SSAO.
uniform float ao_strength : hint_range(0.0, 1.0) = 0.35;

uniform float normal_strength : hint_range(0.0, 2.0) = 0.5;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.85;
// Roughness inside a pooled/stained area. Set close to roughness_base on
// ceil.tres — water damage should read as dark, not shiny.
uniform float roughness_wet : hint_range(0.0, 1.0) = 0.85;

// --- distance handling -----------------------------------------------------
// Every effect below that has no mipmap of its own (groove bevel, parallax,
// scuff edge) fades out between these two camera distances (world metres).
uniform float detail_fade_start = 6.0;
uniform float detail_fade_end = 20.0;

varying vec3 world_pos;
varying vec3 world_normal;

const float GROOVE_EPS = 0.01;

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

// Analytic relief field in world metres: a rounded groove at the grout line,
// plus (ceiling only) a randomised per-tile sag bulge. Shared by the
// parallax offset and the normal-bevel gradient below so both read the same
// "geometry".
float tile_height(vec2 xz) {
	vec2 cell = xz / tile_size;
	vec2 f = fract(cell);
	vec2 dist2 = min(f, 1.0 - f) * tile_size;
	float dd = min(dist2.x, dist2.y);
	float shoulder = max(tile_size * groove_reach, 0.001);
	float t = clamp(dd / shoulder, 0.0, 1.0);
	float rounded = t * t * (3.0 - 2.0 * t);
	float h = -groove_depth * (1.0 - rounded);
	if (is_ceiling && ceil_sag_strength > 0.0) {
		vec2 c = f - 0.5;
		float center = 1.0 - clamp(length(c) * 1.4142136, 0.0, 1.0);
		float sag_jit = hash21(floor(cell) + vec2(19.19, 7.71));
		h += ceil_sag_strength * center * center * sag_jit;
	}
	return h;
}

void fragment() {
	vec3 weights = triplanar_weights(world_normal);

	float cam_dist = length(CAMERA_POSITION_WORLD - world_pos);
	float far_fade = smoothstep(detail_fade_start, detail_fade_end, cam_dist);
	float near = 1.0 - far_fade;

	// --- single-step parallax --------------------------------------------
	// Offset the sample position along the view ray by the (un-offset)
	// height at this point, so the grout trough visibly displaces under a
	// grazing view instead of being a flat drawn line. Single step, not
	// iterative: h0 is evaluated once at the true position and used to
	// displace the *texture/grid* lookup only.
	vec3 view_dir = normalize(CAMERA_POSITION_WORLD - world_pos);
	float h0 = tile_height(world_pos.xz);
	vec2 parallax_off = (view_dir.xz / max(abs(view_dir.y), 0.2)) * h0
		* parallax_strength * weights.y * near;
	vec2 sample_xz = world_pos.xz + parallax_off;
	vec3 sample_pos = vec3(sample_xz.x, world_pos.y, sample_xz.y);

	float mottle = triplanar_sample(mottle_tex, sample_pos, weights, mottle_scale).r;
	vec3 nrm = triplanar_sample(normal_tex, sample_pos, weights, normal_scale);
	// Decorrelated reread of the same texture at a different frequency and
	// offset — a hard-edged scuff mask for free, no second resource.
	float wear_n = texture(mottle_tex,
		sample_xz * mottle_scale * wear_freq_mult + vec2(37.2, -11.7)).r;

	// Centred on 1.0 so mottling modulates around base_color rather than
	// halving the authored albedo (noise averages ~0.5). base_color itself
	// drifts toward decay_color first — the shared "green-black" leg.
	vec3 base = mix(base_color.rgb, decay_color.rgb, decay);
	vec3 tinted = base * (1.0 + (mottle - 0.5) * 2.0 * mottle_strength);

	// --- tile grid (world space, parallax-shifted) ------------------------
	vec2 cell = sample_xz / tile_size;
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
	vec3 tile_col = tinted * (1.0 + jitter);

	// AO: baked contact darkening right at the grout, always on.
	float near_grout = 1.0 - smoothstep(grout_width, tile_size * 0.42, d);
	tile_col *= 1.0 - near_grout * ao_strength;

	// Hard-edged scuffs: crisp smoothstep boundary, widened with distance so
	// it doesn't shimmer far away. Not decay-gated — base wear character.
	float scuff_edge = mix(0.03, 0.16, far_fade) + fwidth(wear_n);
	float scuff = smoothstep(wear_threshold - scuff_edge, wear_threshold + scuff_edge, wear_n);
	tile_col *= 1.0 - scuff * wear_strength;

	// Stains / pooling / ceiling water-damage bloom. decay drives density
	// (the effective threshold slides across the noise field, not just
	// opacity) as well as strength. Floor sampling is continuous world-xz —
	// spills ignore grout. Ceiling sampling is quantised to the tile centre —
	// a tile stains as a unit.
	float stain_raw;
	if (is_ceiling) {
		vec2 tile_id = floor(world_pos.xz / tile_size);
		vec2 tile_center = (tile_id + 0.5) * tile_size;
		stain_raw = texture(stain_tex, tile_center * stain_scale).r;
	} else {
		stain_raw = texture(stain_tex, world_pos.xz * stain_scale).r;
	}
	float eff_stain_threshold = mix(stain_threshold + 0.3, stain_threshold - 0.3, decay);
	float stain_edge = mix(0.05, 0.2, far_fade);
	float stain_amount = smoothstep(eff_stain_threshold - stain_edge,
		eff_stain_threshold + stain_edge, stain_raw) * decay;
	tile_col = mix(tile_col, stain_color.rgb, stain_amount * stain_strength);

	vec3 gridded = mix(grout_color.rgb, tile_col, grid);
	vec3 col = mix(tinted, gridded, weights.y);

	// --- normal: sampled bump plus an analytic groove/bevel(/sag) offset,
	// from a 1cm finite-difference gradient of the same height field that
	// drove the parallax above. Finite-difference rather than dFdx/dFdy on
	// the height directly: dFdx/dFdy are screen-space, not world-space, and
	// would give a view-angle-dependent (wrong) bevel direction on an
	// arbitrary camera. Sampling the analytic function at two nearby
	// world-space points is cheap (pure ALU, no fetch) and correct for any
	// view.
	float hx = tile_height(world_pos.xz + vec2(GROOVE_EPS, 0.0));
	float hz = tile_height(world_pos.xz + vec2(0.0, GROOVE_EPS));
	vec2 grad = vec2(hx - h0, hz - h0) / GROOVE_EPS;
	vec3 n_tex = nrm * 2.0 - 1.0;
	vec3 n_groove = n_tex + vec3(grad * groove_normal_strength * near, 0.0);
	vec3 n_final = normalize(mix(n_tex, normalize(n_groove), weights.y));

	ALBEDO = col;
	NORMAL_MAP = n_final * 0.5 + 0.5;
	NORMAL_MAP_DEPTH = normal_strength;

	// Wet sheen: the single biggest available win under Compatibility (no
	// per-pixel roughness existed in the Three.js original at all). Pool
	// depth drops roughness sharply toward roughness_wet; the grout groove
	// collects dust and stays a touch rougher than the tile face.
	float rough = mix(roughness_base, roughness_wet, stain_amount);
	rough = mix(rough, min(rough + 0.08, 1.0), (1.0 - grid) * weights.y);
	ROUGHNESS = clamp(rough, 0.03, 1.0);
	METALLIC = 0.0;
}
