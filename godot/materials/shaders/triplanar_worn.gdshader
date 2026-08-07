shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Generic worn institutional surface: props, bed/chain metal, painted door
// timber, steel fixtures (dispenser, pad, keypad). One shader, seven very
// different substances — see each .tres for how the same knobs are turned
// to very different ends (bare rusted iron vs glossy chipped enamel vs
// matte torn fabric).
//
// TRIPLANAR, WORLD SPACE — see triplanar_plaster.gdshader for why. It
// matters most here: this one shader is shared by a 2m bed frame and a
// 0.1m door bar, and world projection is what stops the small one looking
// like a blown-up crop of the big one.
//
// STEP CHANGE OVER THE THREE.JS ORIGINAL (albedo-only 2D canvas blotches):
//   1. Hard-edged chip/tear mask (chip_tex) thresholded with smoothstep,
//      not a soft blotch — enamel and paint break with a crisp boundary,
//      dirt does not.
//   2. NORMAL_MAP relief driven by that SAME mask (the "lip" where intact
//      coating stands proud of the exposed substrate), via a screen-space
//      derivative bump — triplanar has no reliable mesh tangent basis to
//      hang a UV-space bump on, so this is the standard substitute
//      (Golus/Blinn-style derivative bump), zero extra texture fetches.
//   3. Per-pixel ROUGHNESS: intact coating vs exposed substrate/rust get
//      different roughness, so one shader reads as multiple materials.
//   4. Directional rust bleed: a single extra dominant-plane sample checks
//      for a chip a short distance ABOVE this fragment and, if found,
//      drips rust downward onto it — reads as gravity-fed corrosion, not
//      uniform noise. Attenuated to ~0 on floor/tabletop-facing geometry,
//      where "above" isn't meaningful.
//   5. Distance fade widens the analytic edge band and calms the lip bump
//      with camera distance so hard edges don't shimmer at range (on top
//      of the textures' own mipmaps).
//   6. AO baked directly into ALBEDO at the chip boundary and in the
//      recessed substrate — Compatibility has no SSAO, so contact
//      darkening has to be authored, not sampled.
//
// FETCH BUDGET: mottle_tex (3 triplanar taps) + normal_tex (3) + chip_tex
// main sample (3) + chip_tex single-plane directional-bleed sample (1)
// = 10 texture() calls per fragment. This is the ~10-fetch ceiling; do not
// add a fourth sampler without dropping one of these first.

uniform float decay : hint_range(0.0, 1.0) = 0.35;

uniform vec4 base_color : source_color = vec4(0.5, 0.5, 0.5, 1.0);
// Dark layer revealed where the coating has broken away — enamel's
// substrate, paint's bare wood/metal, fabric's torn backing.
uniform vec4 substrate_color : source_color = vec4(0.29, 0.267, 0.22, 1.0);
// Tint bled into the halo around a chip — orange-brown rust for metal,
// a duller water/mould stain for fabric, low-strength for plastic.
uniform vec4 rust_bleed_color : source_color = vec4(0.659, 0.353, 0.29, 1.0);

uniform sampler2D mottle_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, repeat_enable, filter_linear_mipmap;
// Packs the chip/tear field. Sampled twice at two thresholds (not two
// channels) to get an independent-feeling chip mask and a wider rust halo
// from a single fetch's worth of noise — see fragment().
uniform sampler2D chip_tex : hint_default_white, repeat_enable, filter_linear_mipmap;

uniform float mottle_scale = 0.7;
uniform float normal_scale = 3.0;
uniform float chip_scale = 2.0;
// Vertical frequency multiplier for all three triplanar samplers. <1 lowers
// the vertical sampling rate relative to horizontal, elongating blotches
// (and chips, and rust) into vertical streaks — the door's painted-grain
// trick, but it now also stretches the chip field, which is correct: paint
// peels along the grain.
uniform float stretch_y = 1.0;

uniform float mottle_strength : hint_range(0.0, 1.0) = 0.3;
uniform float normal_strength : hint_range(0.0, 2.0) = 0.5;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.75;
// Roughness at fully exposed substrate/rust — should sit well above
// roughness_base for anything metal (rough, pitted) and close to it for
// fabric (matte throughout, no glossy/rough contrast to sell).
uniform float roughness_substrate : hint_range(0.0, 1.0) = 0.92;
// KEEP THIS NEAR ZERO, even for the steel fixtures. main.tscn's Environment
// is background_mode = BG_COLOR with ambient_light_source = COLOR: there is
// no sky and there are no reflection probes, so a metallic surface gets no
// environment specular at all — metallic kills the diffuse term and gives
// nothing back, and the fixture renders dead black. Verified: chain.tres at
// metallic 0.8 was a black slab. Steel is sold here by low roughness plus
// the pitted normal, not by METALLIC.
uniform float metallic_base : hint_range(0.0, 1.0) = 0.0;

// Baseline fraction of the surface that reads as intact coating at
// decay = 0. decay lowers this further (more exposed substrate). Set LOW
// (~0.15) for something that should read as mostly-bare rusted metal with
// a few paint flecks (bed, chain); HIGH (~0.7-0.85) for something mostly
// intact with occasional chips (dispenser, pad, prop, keypad, door).
uniform float chip_coverage : hint_range(0.0, 1.0) = 0.5;
uniform float chip_edge_width : hint_range(0.002, 0.2) = 0.03;
// How far the intact-coating normal tilts at the chip boundary. 0 = no lip.
uniform float chip_lip_strength : hint_range(0.0, 3.0) = 1.0;
uniform float chip_ao_strength : hint_range(0.0, 1.0) = 0.35;

uniform float rust_bleed_strength : hint_range(0.0, 1.0) = 0.5;
// Extra raw-noise headroom the rust halo reaches past the chip boundary
// (isotropic component).
uniform float rust_bleed_reach : hint_range(0.0, 0.6) = 0.18;
// World-space metres the directional drip sample reaches upward looking
// for a chip to bleed down from.
uniform float rust_bleed_distance = 0.15;

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

// Camera distance (world metres) over which analytic chip/lip detail is
// softened so it doesn't alias/shimmer at range.
uniform float detail_fade_near = 6.0;
uniform float detail_fade_far = 16.0;

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
	vec3 base_nrm = triplanar_sample(normal_tex, world_pos, weights, normal_scale, stretch_y);
	float chip_raw = triplanar_sample(chip_tex, world_pos, weights, chip_scale, stretch_y).r;

	float cam_dist = length(world_pos - CAMERA_POSITION_WORLD);
	float fade = clamp(smoothstep(detail_fade_near, detail_fade_far, cam_dist), 0.0, 1.0);

	// --- Hard-edged chip/tear mask ------------------------------------
	// chip_coverage is authored against the uniform's own default (0.35).
	// Moving decay away from that default pushes the threshold up (more
	// exposed substrate, decay -> 1/rotten) or down (more intact coating,
	// decay -> 0/clean) from whatever the material was tuned to look like
	// at the default. Distance fade widens the transition band so the
	// edge doesn't alias to a shimmering hairline at range.
	float threshold = clamp(1.0 - chip_coverage + (decay - 0.35) * 0.45, 0.05, 0.95);
	float ew = chip_edge_width * (1.0 + fade * 3.0);
	float intact = smoothstep(threshold - ew, threshold + ew, chip_raw);

	// --- Rust bleed: isotropic halo ------------------------------------
	// A narrow BAND straddling the chip boundary — NOT a fill of the whole
	// broken region. (An earlier version thresholded one-sided, so on a
	// mostly-broken surface like bed/chain rust_zone saturated to ~1
	// everywhere, drowning substrate_color in rust_bleed_color and washing
	// out the "near-black, rust only where it's actively lifting" read.)
	// Deep substrate — far from any boundary — settles to substrate_color
	// undiluted; only the band right at a break shows fresh bled rust.
	// decay widens the band and pushes its centre further into "broken"
	// territory (older, more spread corrosion).
	float rust_center = clamp(threshold - rust_bleed_reach * mix(0.3, 1.0, decay), 0.02, 0.98);
	float rust_width = max(rust_bleed_reach * 0.5 + ew * 2.0, ew * 4.0);
	float rust_zone = clamp(1.0 - abs(chip_raw - rust_center) / rust_width, 0.0, 1.0);

	// --- Rust bleed: directional component ------------------------------
	// One extra sample (not a full triplanar tap — stays inside the fetch
	// budget) on whichever of the two non-dominant planes is stronger,
	// offset upward in world space: "is there a chip boundary above me?"
	// If so, treat this pixel as being dripped on (same band test, applied
	// to the offset sample). Attenuated to ~0 as the surface normal points
	// straight up/down (weights.y -> 1), where "above" in world space
	// isn't a meaningful surface direction.
	float bleed_m = rust_bleed_distance * mix(0.5, 1.0, decay);
	vec3 above_pos = world_pos + vec3(0.0, bleed_m, 0.0);
	float raw_above;
	if (weights.x >= weights.z) {
		raw_above = texture(chip_tex, above_pos.zy * vec2(chip_scale, chip_scale * stretch_y)).r;
	} else {
		raw_above = texture(chip_tex, above_pos.xy * vec2(chip_scale, chip_scale * stretch_y)).r;
	}
	float vertical_face = 1.0 - weights.y;
	float drip = clamp(1.0 - abs(raw_above - rust_center) / rust_width, 0.0, 1.0) * vertical_face;
	rust_zone = max(rust_zone, drip * 0.8);

	// --- Albedo ----------------------------------------------------------
	vec3 col = base_color.rgb * (1.0 + (mottle - 0.5) * 2.0 * mottle_strength);
	col = mix(col, substrate_color.rgb, 1.0 - intact);
	col = mix(col, rust_bleed_color.rgb, rust_zone * rust_bleed_strength * (1.0 - fade * 0.5));

	// Baked contact AO: no SSAO in Compatibility, so contact darkening at
	// the chip boundary and across the recessed substrate is authored
	// directly from the same masks rather than sampled.
	float edge_ring = clamp(1.0 - abs(chip_raw - threshold) / max(ew * 4.0, 0.001), 0.0, 1.0);
	float ao = chip_ao_strength * ((1.0 - intact) * 0.6 + edge_ring * 0.5);
	col *= 1.0 - clamp(ao, 0.0, 0.85);

	float grime = (1.0 - smoothstep(0.0, floor_grime_height, world_pos.y)) * floor_grime;
	col *= 1.0 - grime * (0.5 + mottle * 0.5);

	ALBEDO = col;

	// --- Normal: base pitted bump + chip-driven lip ----------------------
	// The lip is a screen-space derivative bump of the (continuous, only
	// non-zero near the threshold) intact mask — triplanar has no reliable
	// mesh tangent basis for a UV-space bump, so this is the standard cheap
	// substitute (Golus/Blinn-style), and it costs no extra texture fetch.
	vec3 n = base_nrm * 2.0 - 1.0;
	vec2 lip = vec2(dFdx(intact), dFdy(intact)) * chip_lip_strength * (1.0 - fade * 0.6);
	n.xy += lip;
	n = normalize(n);
	NORMAL_MAP = n * 0.5 + 0.5;
	// Rust reads as rougher, more broken-up geometry, not just a colour
	// swap: amplify the base pitted normal in rust zones.
	NORMAL_MAP_DEPTH = normal_strength * mix(1.0, 1.4, rust_zone);

	// --- Roughness / metallic --------------------------------------------
	float rough = mix(roughness_base, roughness_substrate, max(1.0 - intact, rust_zone * 0.85));
	ROUGHNESS = clamp(rough + (0.5 - mottle) * 0.15 + grime * 0.15, 0.0, 1.0);
	METALLIC = metallic_base;

	EMISSION = emission_color.rgb * emission_strength;
}
