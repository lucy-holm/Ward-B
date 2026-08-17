shader_type canvas_item;
render_mode blend_mix, unshaded;

// Ordered-dither posterisation pass. Reads the already-tonemapped screen and
// quantises it to `levels` steps through an 8x8 Bayer matrix, optionally
// collapsing hue to a two-colour ramp.
//
// WHY THIS EXISTS. The ward targets gl_compatibility (WebGL2), which has no
// SDFGI, no SSAO/SSIL and no volumetric fog — and photoreal surfacing without
// bounce light reads as plastic no matter how good the material is. See the
// orderly's shoulders in .artifacts/orderlyA_06_head_close.png: that specular
// gradient is the tell. Quantising removes the gradient, so the plastic look
// goes with it and the BoxMesh/capsule geometry reads as deliberate rather
// than unfinished.
//
// It sits ON TOP of the existing materials and changes nothing about them.
// `enabled = 0.0` is a byte-exact passthrough, so this is fully reversible.
//
// COMPATIBILITY NOTES — both of these are load-bearing:
//  * No array indexing. The Bayer value comes from the standard recursive
//    fract() construction instead of a const float[64], because dynamic
//    indexing into a const array is the kind of thing that compiles on
//    desktop GL and then fails on a mobile WebGL2 driver.
//  * No derivatives (dFdx/fwidth). Nothing here needs them, and the film
//    grain shader next door already documents the same constraint.
//
// Reading the screen from a canvas_item REQUIRES a BackBufferCopy ahead of
// this node in the draw order — see ui/posterize.tscn, which pairs them so
// the two can't get separated.

uniform sampler2D screen_tex : hint_screen_texture, repeat_disable, filter_nearest;

// Wet/dry blend for the whole effect. 0.0 = untouched frame.
uniform float enabled : hint_range(0.0, 1.0) = 1.0;

// Quantisation steps. 2 = pure 1-bit. 4 is the shipping default: it kills the
// plastic gradients while leaving keypad digits and code plates legible,
// which pure 1-bit does not reliably do.
uniform int levels : hint_range(2, 16) = 4;

// Device pixels per styled pixel. >1 also cuts the effective shading rate of
// this pass and gives the dither a chunky, deliberate grid.
uniform float pixel_size : hint_range(1.0, 8.0) = 2.0;

// 0.0 = flat banding (posterise only), 1.0 = full ordered dither.
uniform float dither_amount : hint_range(0.0, 1.0) = 1.0;

// 0.0 = keep the original hue, quantised per channel.
// 1.0 = collapse to the tint_lo -> tint_hi ramp by luminance.
uniform float tint_amount : hint_range(0.0, 1.0) = 1.0;

uniform vec4 tint_lo : source_color = vec4(0.051, 0.059, 0.071, 1.0);
uniform vec4 tint_hi : source_color = vec4(0.910, 0.894, 0.839, 1.0);

// Pre-quantisation exposure. The unmedicated state currently renders close to
// black (see .artifacts/final_room1_unmed.png), and quantising near-black
// yields a flat empty field — there is nothing in the signal to dither. This
// lifts the input so the state still reads once posterised.
uniform float exposure : hint_range(0.1, 6.0) = 1.0;

// Quantisation happens in PERCEPTUAL space, not linear, and this is the curve.
//
// Linear quantisation is the wrong transform for this ward. At 4 levels the
// bucket boundaries sit at 0.17/0.5/0.83, while the unmedicated state renders
// at a mean luminance well under 0.05 — so every pixel lands in bucket 0 and
// the output is a flat void with no dither at all. Verified, not assumed:
// .artifacts/style_room1_unmed.png is that exact failure.
//
// The obvious fix — lift exposure until the buckets are reached — is the
// wrong one. It costs the state its murk, and murk is the contrast the whole
// game runs on (core/settings.gd says the same thing about why the brightness
// setting's MAX is where it is). Raising the levels count instead just moves
// the problem: it adds resolution evenly, and near-black needs it unevenly.
//
// Spacing the levels by pow(v, 1/gamma) concentrates them where the signal
// actually is, so shadow detail survives quantisation at the ORIGINAL
// exposure. 2.2 is sRGB's curve; higher pushes yet more levels into the dark.
uniform float shadow_gamma : hint_range(1.0, 4.0) = 2.2;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// Recursive Bayer. bayer2 tiles a 2x2 ordered matrix; each level adds a
// quarter-weight finer octave, giving 4x4 then 8x8. Returns [0,1).
float bayer2(vec2 a) {
	a = floor(a);
	return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
	return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

float bayer8(vec2 a) {
	return bayer4(0.5 * a) * 0.25 + bayer2(a);
}

// Quantise one [0,1] channel to `steps` levels, using `thr` as the sub-step
// tie-break so the error is dispersed spatially instead of banding.
float quantise(float v, float thr, float steps) {
	float scaled = clamp(v, 0.0, 1.0) * steps;
	float base = floor(scaled);
	// step(thr, frac) == 1 when the remainder clears this pixel's threshold.
	return clamp(base + step(thr, scaled - base), 0.0, steps) / steps;
}

// Quantise on the perceptual curve. Returns the value in PERCEPTUAL space —
// callers that need a brightness back out again must undo the curve, callers
// using it as a 0..1 ramp position (the duotone) want it exactly like this.
float quantise_perceptual(float v, float thr, float steps, float g) {
	return quantise(pow(clamp(v, 0.0, 1.0), 1.0 / g), thr, steps);
}

void fragment() {
	float px = max(pixel_size, 1.0);

	// Sample at the CENTRE of the styled pixel, not its corner: sampling the
	// corner shifts the whole image up-left by half a cell, which is visible
	// as a seam against the HUD once px is large.
	vec2 cell = floor(FRAGCOORD.xy / px);
	vec2 uv = (cell * px + px * 0.5) * SCREEN_PIXEL_SIZE;

	vec3 src = texture(screen_tex, uv).rgb;
	vec3 lit = src * exposure;

	// One threshold per styled cell (not per device pixel), so the dither
	// grid scales with pixel_size instead of staying 1px and vanishing on a
	// high-DPI phone — the same failure the grain shader's grain_px avoids.
	float thr = mix(0.5, bayer8(cell), dither_amount);

	float steps = float(levels - 1);
	float lum = dot(lit, LUMA);

	float g = max(shadow_gamma, 1.0);

	// QUANTISE LUMINANCE ONCE, then undo the curve. Both output modes derive
	// from this single value, which is what keeps them consistent — and it is
	// one quantise() instead of the three a per-channel version needs.
	//
	// The pow() back is not optional. The curve exists to SPACE the levels
	// unevenly, not to brighten: leaving the perceptual value in place maps
	// every midtone far up the ramp and the ward comes out washed pale, which
	// is the opposite of the intended look. Undoing it keeps each pixel's
	// original apparent brightness while the levels stay bunched in the
	// shadows where this game needs them.
	float lum_q = pow(quantise_perceptual(lum, thr, steps, g), g);

	// Scale the original colour by the brightness change, rather than
	// quantising R, G and B separately. Separate channels cross their bucket
	// boundaries at different luminances, so a smooth grey wall breaks into
	// yellow/green/magenta speckle — visible as colour fringing across the
	// whole dayroom. Scaling preserves hue exactly and only posterises value.
	vec3 posterised = lit * (lum_q / max(lum, 1e-4));

	vec3 duotone = mix(tint_lo.rgb, tint_hi.rgb, lum_q);

	vec3 styled = mix(posterised, duotone, tint_amount);

	COLOR = vec4(mix(src, styled, enabled), 1.0);
}
