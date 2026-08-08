shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Shared shell shader for every part of the Orderly (waxy skin, matte
// uniform cloth, worn shoes). One shader kept cheap for gl_compatibility —
// per-instance uniforms switch behaviour on/off per mesh part instead of
// branching into separate shader files.
//
//   grime_*       — always on. Blotchy noise-placed staining, not a flat
//                   tint (see the brief: "grime is placed, not uniform").
//   seam_strength — cranial suture / back-of-tunic seam: a thin stripe down
//                   the local +Z (rear) side of a part, fading out on the
//                   true front face. Used on head, neck and torso-back trim.
//   face_strength — suggested (not sculpted) facial features: sunken eye
//                   sockets, gaunt temples, a faint nose ridge, a closed
//                   mouth line. Shading only, no extra geometry — "almost
//                   right", uncanny rather than a blank mannequin. Used on
//                   the head only.
//   rim_strength  — fresnel rim via the built-in RIM output, so the pale
//                   uniform still reads as a silhouette in near-dark
//                   (ambient 0.13, fog from ~2.6m) without any emissive
//                   "light source" cheat.
//
// All placement math reads OBJECT-SPACE VERTEX (captured pre-MODEL_MATRIX
// in vertex()), never world position, so patterns are pinned to the mesh
// and stay put regardless of the puppet's animated pose.

uniform vec4 base_color : source_color = vec4(0.78, 0.74, 0.65, 1.0);
uniform vec4 grime_color : source_color = vec4(0.30, 0.21, 0.12, 1.0);
uniform float grime_amount : hint_range(0.0, 1.0) = 0.2;
uniform float grime_scale = 5.0;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.85;
uniform float rim_strength : hint_range(0.0, 2.0) = 0.5;
// Edge-only emission so the silhouette survives near-zero ambient. Keep low:
// past ~0.5 he starts reading as lit rather than pale.
// Range goes past 1.0 deliberately. The scene tonemaps with ACES; exposure
// crushes emission hard, so this has to track main.gd's UNMED tonemap_exposure
// or he goes invisible at range every time the room darkens.
//
// 2026-08 lighting pass: UNMED tonemap_exposure settled at 0.42 (down from
// 0.60). Emission is exposure-scaled like everything else, so edge_glow is
// raised 2.2 -> 3.1 (2.2 * 0.60/0.42) to hold his far-dark (~6m) silhouette
// at roughly its old on-screen brightness. If you change UNMED exposure,
// change this by the same ratio or he goes invisible at range.
uniform float edge_glow : hint_range(0.0, 6.0) = 3.1;
uniform float seam_strength : hint_range(0.0, 1.0) = 0.0;
uniform float face_strength : hint_range(0.0, 1.0) = 0.0;
// Rough local scale of this part (sphere/cylinder radius in local units).
// Placement math below normalises by this so it doesn't need per-part
// shader variants.
uniform float part_radius = 0.15;

varying vec3 local_pos;

void vertex() {
	local_pos = VERTEX;
}

float hash13(vec3 p) {
	p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
	p *= 17.0;
	return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float value_noise3(vec3 p) {
	vec3 i = floor(p);
	vec3 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
	float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
	float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
	float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
	float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
	float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
	float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
	float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
	float nx00 = mix(n000, n100, f.x);
	float nx10 = mix(n010, n110, f.x);
	float nx01 = mix(n001, n101, f.x);
	float nx11 = mix(n011, n111, f.x);
	float nxy0 = mix(nx00, nx10, f.y);
	float nxy1 = mix(nx01, nx11, f.y);
	return mix(nxy0, nxy1, f.z);
}

float fbm3(vec3 p) {
	float v = 0.0;
	float amp = 0.55;
	for (int i = 0; i < 3; i++) {
		v += amp * value_noise3(p);
		p *= 2.03;
		amp *= 0.5;
	}
	return v;
}

void fragment() {
	vec3 col = base_color.rgb;
	float rough = roughness_base;

	// --- grime: blotchy, concentrated by whichever part_radius/grime_amount
	// this instance was given (hem/cuffs/knees high, shoulders/head low) ---
	float n = fbm3(local_pos * grime_scale + vec3(11.0, 3.0, 7.0));
	float blotch = smoothstep(0.42, 0.72, n);
	col = mix(col, grime_color.rgb, blotch * grime_amount);
	rough -= blotch * grime_amount * 0.12;

	float pr = max(part_radius, 0.001);
	vec3 p = local_pos / pr;

	// --- seam: thin stripe down local +Z (rear), fading out on the front -
	if (seam_strength > 0.001) {
		float stripe = 1.0 - smoothstep(0.05, 0.12, abs(p.x));
		float back_gate = smoothstep(-0.08, 0.08, p.z);
		float seam = stripe * back_gate * seam_strength;
		col = mix(col, col * 0.6, seam);
	}

	// --- suggested facial features: shading only, no geometry -------------
	if (face_strength > 0.001) {
		float front = 1.0 - smoothstep(-0.9, -0.15, p.z); // 1 on the front face, 0 elsewhere

		vec2 eye_off = vec2(0.34, 0.10);
		float eye_l = length((p.xy - vec2(eye_off.x, eye_off.y)) * vec2(1.0, 1.35));
		float eye_r = length((p.xy - vec2(-eye_off.x, eye_off.y)) * vec2(1.0, 1.35));
		float socket = smoothstep(0.30, 0.05, min(eye_l, eye_r)) * front;
		col = mix(col, col * 0.55, socket * face_strength);

		float temple_l = length((p.xy - vec2(0.62, 0.20)) * vec2(1.0, 1.5));
		float temple_r = length((p.xy - vec2(-0.62, 0.20)) * vec2(1.0, 1.5));
		float temple = smoothstep(0.55, 0.15, min(temple_l, temple_r)) * front;
		col = mix(col, col * 0.8, temple * face_strength * 0.7);

		float nose = smoothstep(0.16, 0.0, abs(p.x)) * smoothstep(-0.55, -0.05, p.y) * front;
		col = mix(col, col * 1.12, nose * face_strength * 0.5);
		rough -= nose * face_strength * 0.05;

		float mouth = smoothstep(0.07, 0.0, abs(p.y + 0.36)) * smoothstep(0.32, 0.0, abs(p.x)) * front;
		col = mix(col, col * 0.55, mouth * face_strength);
	}

	// --- fresnel rim: pale-shape-in-the-gloom read, never a light source --
	// Godot's RIM is a LIGHTING term: it modulates the response to incoming
	// light, so at the unmedicated ambient (0.022) it contributes essentially
	// nothing and he vanishes at distance. That is a gameplay failure, not
	// just a look one — the whole mechanic is that you can SEE him coming
	// while unmedicated and cannot while lucid.
	RIM = rim_strength;
	RIM_TINT = 0.15;

	// So the silhouette read is carried by a faint fresnel-shaped EMISSION,
	// which survives with no light at all. Deliberately edge-only and very
	// low: it makes his outline separate from black, it does NOT make him a
	// light source and it casts nothing. Facing surfaces stay unlit, so he is
	// still a shape in the dark rather than a lamp.
	// Exponent 3.0 confined this to a rim a few pixels wide, which vanishes at
	// the distance that matters. 1.4 spreads it across the whole silhouette so
	// he reads as a pale SHAPE against black — the dormitory concept's read —
	// while facing surfaces still fall off, so he is not a flat cut-out.
	float fres = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 1.4);
	EMISSION = col * fres * edge_glow;

	ALBEDO = col;
	ROUGHNESS = clamp(rough, 0.05, 1.0);
	METALLIC = 0.0;
}
