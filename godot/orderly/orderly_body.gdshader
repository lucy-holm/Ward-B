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

// 2026-08 grime/plastic pass (see brief: concept sheet is a gaunt figure in a
// DIRTY MATTE bone-white/tan uniform, not a shiny mannequin). base_color and
// grime_color both moved darker and greyer — less warm cream, more soiled
// institutional taupe — to match the reference sheet's desaturated fabric.
//
// 2026-08 LIGHT-ABSORPTION pass (direction change — read this before raising
// these values back): dropped again 0.66 -> 0.46. The brief is now that he
// ABSORBS light and looms as a dark mass, rather than catching every photon
// in the room. A ~0.46 albedo still resolves as pale, dirty cloth when he
// crosses a fluorescent pool (which is the intended reveal), but in the
// ambient-0.006 dark between pools he returns almost nothing — which is the
// whole point. Do NOT re-compensate EMISSION for this drop; that coupling is
// exactly what made him a lamp. See edge_glow.
uniform vec4 base_color : source_color = vec4(0.46, 0.44, 0.39, 1.0);
uniform vec4 grime_color : source_color = vec4(0.20, 0.15, 0.10, 1.0);
uniform float grime_amount : hint_range(0.0, 1.0) = 0.2;
uniform float grime_scale = 5.0;
uniform float roughness_base : hint_range(0.0, 1.0) = 0.85;
// Cuts the "shiny plastic mannequin" specular highlight without touching
// METALLIC (must stay 0 — see header). Godot's SPECULAR uniform maps to
// dielectric F0 = 0.08 * specular, so 0.5 (the engine default when this
// output is left unset) reads as a fairly glossy dielectric under a point
// light; 0.3 is a duller, worn-cloth/dead-skin F0 without going metallic or
// fully unlit-flat. Fragment() dims it further over grimy patches — dirt
// doesn't shine.
//
// 2026-08 light-absorption pass: 0.3 -> 0.18. Even a dull dielectric F0 puts
// a highlight on the shoulders/skull when he passes under a fitting, and that
// highlight was still reading as "waxy mannequin". 0.18 is about as low as a
// real surface goes without looking like an unlit cutout.
uniform float specular_base : hint_range(0.0, 1.0) = 0.18;
uniform float rim_strength : hint_range(0.0, 2.0) = 0.5;
// Edge-only emission so the silhouette survives near-zero ambient.
//
// HISTORY, because this value ratcheted itself into a bug: it was repeatedly
// raised (2.2 -> 3.1 for an exposure drop, 3.1 -> 3.7 to compensate a darker
// albedo) under a rule of "never let the far silhouette dim". Each step was
// locally reasonable and the cumulative result was not: at 3.7 with the broad
// exponent below, EMISSION at the rim reached ~0.46*3.7 = 1.7, which after
// ACES at UNMED exposure 0.42 CLIPS TO WHITE across most of his body. He
// stopped being a pale shape in the gloom and became a glowing white
// mannequin — brightly self-lit in a pitch-dark ward, the opposite of
// imposing, and impossible to reconcile with the concept art.
//
// 2026-08 light-absorption pass: 3.7 -> 0.9, and the compensation rule above
// is DELETED. Emission is now a faint edge that separates his outline from
// black, nothing more — he is lit by the ward's fluorescents like any other
// object, so he is a dark mass that the light REVEALS as he crosses a pool,
// and merely a suggestion of an edge between them.
//
// Do not reintroduce an "auto-compensate for albedo/exposure" rule here. If
// he ever needs to be more findable, add a gameplay cue (audio, a longer
// telegraph, light placement) rather than making the character self-luminous.
uniform float edge_glow : hint_range(0.0, 6.0) = 0.9;
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
	float dirt = blotch * grime_amount; // reused below to dull SPECULAR too
	col = mix(col, grime_color.rgb, dirt);
	rough -= dirt * 0.12;

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
	// The exponent controls how much of him this covers. 1.4 spread it across
	// essentially the WHOLE silhouette — combined with the old edge_glow that
	// is what made him a self-lit mannequin rather than a shape (see
	// edge_glow's history note). 2.8 pulls it back to a genuine rim: the
	// grazing edge picks up a faint outline, every surface facing the camera
	// falls to its lit value, which in an unlit corridor is near-black.
	//
	// The read this is aiming for: a tall absence, darker than the fogged wall
	// behind him, edged in the faintest cold line — you notice the shape
	// before you can name it. When he steps under a working fluorescent the
	// pool does the work and you see him properly, which is the scare.
	float fres = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 2.8);
	EMISSION = col * fres * edge_glow;

	ALBEDO = col;
	ROUGHNESS = clamp(rough, 0.05, 1.0);
	METALLIC = 0.0;
	// Dirt doesn't shine: grimy patches lose more of their already-low
	// specular response than clean cloth/skin, on top of the flat
	// specular_base cut above. METALLIC stays 0 throughout — this is a
	// dielectric F0 tweak, not a metal/non-metal switch.
	SPECULAR = mix(specular_base, specular_base * 0.4, clamp(dirt, 0.0, 1.0));
}
