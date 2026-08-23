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
// This is a rebuild against reference (cracked-paint/damp-plaster material
// sheet + dayroom lucid/unmedicated pair + corridor + dormitory), not a
// noisier version of the old flat-shaded canvas look. The design is one
// height field driving three coupled things instead of independent layers:
//
//   1. The peel mask (from island_tex, hard-thresholded) doubles as the
//      height field for relief: NORMAL is perturbed analytically from that
//      SAME mask via screen-space derivatives (the "surface gradient" bump
//      technique — no extra texture, no extra fetch), so the lip is
//      guaranteed to sit exactly on the mask boundary rather than being a
//      second, independently-tuned layer that merely happens to agree.
//   2. The island lookup is offset along the view vector by a depth proxy
//      (taken from the already-sampled mottle field, so it costs nothing)
//      before sampling — one offset, no iteration — so exposed plaster
//      reads as recessed rather than decaled on top.
//   3. Distance widens the threshold's smoothstep edge (floored by fwidth(),
//      the same AA trick the tile shader uses on its grout line) so crisp
//      islands blur into soft mass at range instead of shimmering, while the
//      coarse island shape itself — a single low-octave field — survives at
//      distance by construction (the dormitory reference: shapes must stay
//      legible near-black under one light).
//
// Two more roles for mottle_tex: the low-frequency "painted a long time ago,
// patched twice" tonal variance, and — resampled at different coordinates,
// no extra texture — the vertical water-streak field. band_color/band_height
// give the dado/wainscot every reference has.
//
// Fetch count: mottle_tex triplanar (3) + streak resample of mottle_tex (1)
// + island_tex triplanar (3) = 7 — same budget as the shader this replaces.

uniform float decay : hint_range(0.0, 1.0) = 0.35;

// --- shared palette (fixed across the three material shaders; see task ----
// brief — do not invent new tones here).
uniform vec4 paint_clean_color : source_color = vec4(0.812, 0.788, 0.706, 1.0); // bone/cream, lucid
uniform vec4 paint_soiled_color : source_color = vec4(0.659, 0.600, 0.541, 1.0);
uniform vec4 plaster_color : source_color = vec4(0.604, 0.561, 0.486, 1.0);
uniform vec4 lath_color : source_color = vec4(0.290, 0.267, 0.220, 1.0); // dark lath / blown-out
uniform vec4 green_cast_color : source_color = vec4(0.431, 0.451, 0.333, 1.0); // sick green, unmed
uniform vec4 shadow_color : source_color = vec4(0.353, 0.369, 0.298, 1.0); // dark olive shadow
uniform vec4 rust_color : source_color = vec4(0.659, 0.353, 0.290, 1.0);
uniform vec4 grime_color : source_color = vec4(0.431, 0.290, 0.220, 1.0); // deep brown grime
uniform vec4 band_color : source_color = vec4(0.29, 0.31, 0.30, 1.0);

uniform float band_height = 1.1;
uniform float band_softness = 0.22;
uniform float rail_width = 0.025;

// --- damp rise ------------------------------------------------------------
// Distinct from the dado band above: band_color is a flat AUTHORED stripe
// with a hard top edge (a long-ago paint job), whereas this is moisture
// wicking up through the wall from ground contact, so it has to (a) darken
// BOTH the intact paint and the exposed substrate, not just paint, and
// (b) break up into a ragged, noise-driven edge rather than a straight
// line — every dormitory/corridor reference plate stains unevenly along
// its base. Reuses the already-sampled mottle field for that raggedness,
// so it costs zero extra texture fetches. Gated by decay, same as the rot
// tint below: a lucid/clean wall (decay -> 0) keeps a dry skirting.
uniform vec4 damp_color : source_color = vec4(0.161, 0.169, 0.137, 1.0); // dark olive-wet
uniform float damp_height = 0.85;
uniform float damp_noise_reach = 0.35;
uniform float damp_strength : hint_range(0.0, 1.0) = 0.55;

uniform sampler2D mottle_tex : hint_default_white, repeat_enable, filter_linear_mipmap;
uniform sampler2D island_tex : hint_default_white, repeat_enable, filter_linear_mipmap;

// World-space frequencies, in cycles per metre.
uniform float mottle_scale = 0.22;
uniform float island_scale = 0.55;
uniform float streak_scale = 0.6;
uniform float streak_squash = 0.08;

uniform float mottle_strength : hint_range(0.0, 1.0) = 0.35;
uniform float streak_strength : hint_range(0.0, 1.0) = 0.35;
uniform float normal_strength : hint_range(0.0, 2.0) = 1.1;
uniform float roughness_paint : hint_range(0.0, 1.0) = 0.55;
uniform float roughness_plaster : hint_range(0.0, 1.0) = 0.95;
uniform float ao_strength : hint_range(0.0, 1.0) = 0.55;
// Single-step depth offset, not iterative POM — see header.
uniform float parallax_strength : hint_range(0.0, 0.5) = 0.12;

// decay=0 -> almost nothing of the field falls below threshold (clean lucid
// wall). decay=1 -> most of it does (large peeled islands, blown plaster).
uniform float peel_threshold_min : hint_range(0.0, 1.0) = 0.08;
uniform float peel_threshold_max : hint_range(0.0, 1.0) = 0.66;

// --- peel PATCHINESS -------------------------------------------------------
// The island field is uniform across a wall, so thresholding it alone peels the
// WHOLE wall evenly — which renders as an all-over crackle-glaze, like dried
// mud, and is the single most obvious tell against the concept art. The
// reference plates peel in PATCHES: areas of intact cream paint, and areas
// where it has come away, with the boundary between them much larger than any
// individual crack.
//
// So: gate the peel mask by the low-frequency mottle field ALREADY SAMPLED for
// the plaster's own colour variation — no extra fetch, no extra noise texture.
// mottle runs at frequency 0.011 (see wall.tres), i.e. metres-scale blotches,
// which is exactly the scale the patch boundary wants.
//
// strength 0 reproduces the old uniform behaviour exactly, so this is inert
// until a material opts in.
uniform float peel_patch_strength : hint_range(0.0, 1.0) = 0.0;
uniform float peel_patch_lo : hint_range(0.0, 1.0) = 0.34;
uniform float peel_patch_hi : hint_range(0.0, 1.0) = 0.70;
uniform float edge_width_near : hint_range(0.001, 0.3) = 0.02;
uniform float edge_width_far : hint_range(0.001, 0.5) = 0.12;
uniform float dist_fade_near = 5.0;
uniform float dist_fade_far = 18.0;

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

	float cam_dist = length(CAMERA_POSITION_WORLD - world_pos);
	float dist_t = clamp((cam_dist - dist_fade_near) / max(dist_fade_far - dist_fade_near, 0.001), 0.0, 1.0);

	// --- cheap single-step parallax -----------------------------------------
	// Offset the island lookup along the view vector by a depth proxy taken
	// from the already-sampled low-frequency mottle (free — no extra fetch).
	// Recessed-reading areas (low mottle) shift more, giving the exposed
	// plaster a sense of being cut into the wall rather than decaled on.
	vec3 view_dir = normalize(CAMERA_POSITION_WORLD - world_pos);
	float depth_proxy = (1.0 - mottle) * parallax_strength;
	vec3 wpos_peel = world_pos - view_dir * depth_proxy;
	// Cheap domain warp, same free mottle sample: without it the island
	// noise's own blob shape shows through as slightly-too-round Rorschach
	// outlines. Nudging the lookup sideways by a world-up-tangent times the
	// mottle field breaks that up into something less regular, at zero extra
	// fetch cost.
	vec3 warp_dir = normalize(cross(world_normal, vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
	wpos_peel += warp_dir * (mottle - 0.5) * 0.6;

	float isl = triplanar_sample(island_tex, wpos_peel, weights, island_scale).r;

	// --- peel mask: hard-edged, decay-driven coverage -----------------------
	float threshold = mix(peel_threshold_min, peel_threshold_max, decay);
	// Clamped: island_tex is Cellular DISTANCE2_SUB (see wall.tres), a
	// crackle field whose value swings from ~0 (on a cell border) to ~1
	// (mid-cell) over a genuinely short distance — its OWN derivative is
	// naturally large near every crack, not just at the aliasing limit the
	// unclamped fwidth() * 1.5 term was written to catch (that was tuned
	// against the old smooth Simplex island field, which has no comparably
	// steep native gradient). Left unclamped, aa ballooned edge_w across
	// most of a cell rather than just its border, which is what turned
	// "thin cracks between small islands" into "wall mostly dark" the first
	// time this landed. 0.06 keeps genuine screen-space aliasing control at
	// grazing angles/distance while stopping the field's own steepness from
	// widening the band.
	float aa = min(fwidth(isl) * 1.5, 0.06);
	float edge_w = max(mix(edge_width_near, edge_width_far, dist_t), aa);
	float exposed = 1.0 - smoothstep(threshold, threshold + edge_w, isl);
	// Patch gate — see peel_patch_strength. Applied to `exposed` only, NOT to
	// `isl`, deliberately: isl still drives depth_t, the lip band and the
	// analytic normal below, so a patch edge fades the paint loss without also
	// flattening the relief inside the patch it is fading.
	float patch = smoothstep(peel_patch_lo, peel_patch_hi, mottle);
	exposed *= mix(1.0, patch, peel_patch_strength);
	// 0 right at the edge (freshly exposed plaster) .. 1 deep in the island
	// (blown out to dark lath).
	float depth_t = 1.0 - smoothstep(0.0, threshold, isl);

	float edge_dist = isl - threshold;
	float lip_band = 1.0 - smoothstep(0.0, edge_w * 3.0, abs(edge_dist));
	float paint_side = step(0.0, edge_dist);
	float ao = lip_band * (1.0 - paint_side);
	float lip_highlight = lip_band * paint_side * (1.0 - dist_t);

	// --- dado / wainscot band ------------------------------------------------
	float band_t = 1.0 - smoothstep(band_height - band_softness, band_height, world_pos.y);
	float rail = 1.0 - smoothstep(0.0, rail_width, abs(world_pos.y - band_height));

	// --- base paint: clean -> soiled with decay, plus low-freq variance -----
	vec3 paint = mix(paint_clean_color.rgb, paint_soiled_color.rgb, decay);
	paint *= 1.0 + (mottle - 0.5) * 2.0 * mottle_strength;
	// Dado tone itself drifts with decay: a pale khaki band at decay=0 (the
	// lucid dayroom reference), sinking to the authored dark scuffed
	// wainscot as the ward rots. A fixed dark band_color read the same at
	// both ends and blew out the contrast on a now much brighter clean wall.
	vec3 band_tone = mix(paint_soiled_color.rgb * 0.82, band_color.rgb, decay);
	paint = mix(paint, band_tone, band_t);
	paint *= mix(1.0, 0.65, rail);

	// --- exposed substrate: plaster -> dark lath by how deep into the island -
	vec3 substrate = mix(plaster_color.rgb, lath_color.rgb, depth_t);

	vec3 col = mix(paint, substrate, exposed);

	// --- water streaks (reuse mottle_tex at different coordinates) ----------
	float streak_n = texture(mottle_tex,
		vec2(world_pos.x + world_pos.z, world_pos.y * streak_squash) * streak_scale).r;
	float streak = smoothstep(0.55, 1.0, streak_n);
	float from_top = smoothstep(0.4, 2.6, world_pos.y);
	float streak_amt = streak * streak_strength * from_top * (1.0 - weights.y);
	col *= 1.0 - streak_amt * 0.5;
	col = mix(col, grime_color.rgb, streak_amt * 0.4 * decay);

	// --- AO in the crevice, highlight on the raised paint lip ---------------
	col *= 1.0 - ao * ao_strength;
	col = mix(col, min(col * 1.25, vec3(1.0)), lip_highlight * 0.5);

	// --- rot: green-black cast drift with decay ------------------------------
	col = mix(col, mix(col, green_cast_color.rgb, 0.35), decay * exposed * 0.6);
	col = mix(col, shadow_color.rgb, ao * decay * 0.5);
	col = mix(col, rust_color.rgb, streak_amt * lip_band * 0.5);

	// --- damp rise: ground moisture wicking up, independent of the dado -----
	// world-Y gradient (cheap: one smoothstep, no fetch) modulated by the
	// mottle field already in hand so the top edge is ragged rather than a
	// ruler line. Applied to col AFTER paint/substrate/streak/rot so it reads
	// as a wash sitting over whatever is already there — plaster damp-stains
	// through both intact paint and bare substrate alike, which a mask
	// applied earlier (before the paint/substrate mix) could not do.
	float damp_edge = damp_height + (mottle - 0.5) * damp_noise_reach;
	float damp_t = 1.0 - smoothstep(0.0, max(damp_edge, 0.05), world_pos.y);
	float damp_amt = damp_t * damp_strength * decay;
	col = mix(col, damp_color.rgb, damp_amt);

	ALBEDO = col;

	// --- normal: analytic relief from the SAME mask field, zero extra fetch -
	// "Surface gradient" bump (Mikkelsen): perturb the geometric normal using
	// screen-space derivatives of a scalar height, converted through the
	// derivatives of world position so it stays correct across the triplanar
	// blend without needing a tangent basis. height is 1 on intact paint, 0
	// in the exposed crevice — i.e. the peel mask itself plus a whisper of
	// mottle so the intact paint isn't perfectly flat either. Eased off with
	// distance so it doesn't turn into noise soup at the far end of a
	// corridor; the coarse island shape underneath is unaffected since
	// edge_w has already widened by then.
	float height = (1.0 - exposed) + (mottle - 0.5) * 0.25;
	vec3 dpdx = dFdx(world_pos);
	vec3 dpdy = dFdy(world_pos);
	vec3 r1 = cross(dpdy, world_normal);
	vec3 r2 = cross(world_normal, dpdx);
	float det = dot(dpdx, r1);
	float sign_det = det < 0.0 ? -1.0 : 1.0;
	vec3 surf_grad = (r1 * dFdx(height) + r2 * dFdy(height)) * sign_det;
	float bump_amt = normal_strength * mix(1.0, 0.35, dist_t) * 0.05;
	vec3 bumped_world_normal = normalize(world_normal - surf_grad * bump_amt);
	NORMAL = normalize((VIEW_MATRIX * vec4(bumped_world_normal, 0.0)).xyz);

	// --- roughness: chalky paint vs damp/rough exposed plaster, glossy streak
	float roughness = mix(roughness_paint, roughness_plaster, exposed);
	roughness -= streak_amt * 0.22;
	// Wet plaster reads glossier at the damp line, same cue as the floor
	// shader's pool sheen — small (0.12 max) so it stays a hint, not a
	// puddle-on-a-vertical-surface artefact.
	roughness -= damp_amt * 0.12;
	ROUGHNESS = clamp(roughness, 0.05, 1.0);
	METALLIC = 0.0;
}
