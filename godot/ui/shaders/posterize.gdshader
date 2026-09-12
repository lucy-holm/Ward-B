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
// `enabled = 0.0` bypasses colour quantisation and the shadow lift. The styled
// pixel sampling grid still applies; use pixel_size=1 when inspecting detail.
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

// Quantisation steps. Eight retains worn surfaces and silhouettes while
// keeping the retro bands. WardSettings supplies the player's saved choice.
uniform int levels : hint_range(2, 16) = 8;

// Device pixels per styled pixel. This changes sample spacing and gives the
// dither a chunky grid; it does NOT reduce fragment invocations. The viewport
// scaling_3d_scale setting is what actually reduces 3D rendering work.
uniform float pixel_size : hint_range(1.0, 8.0) = 2.0;

// 0.0 = flat banding (posterise only), 1.0 = full ordered dither.
uniform float dither_amount : hint_range(0.0, 1.0) = 0.75;

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

// Lifts the perceptual shadow signal BEFORE quantisation while preserving
// absolute black. Applying this after quantisation only brightens the sparse
// dither dots which survived bucket zero; it cannot recover a silhouette.
// Compatibility/WebGL2 has no practical real-time bounce lighting, so this toe
// curve makes the small ambient signal readable without lights, probes, depth
// samples or branches. main.gd keeps it at zero in LUCID and scales it with
// the player's brightness calibration in UNMED.
uniform float shadow_lift : hint_range(0.0, 0.95) = 0.0;

// BLACK AND WHITE. 0.0 = colour, 1.0 = fully desaturated. Player-facing.
//
// NOT the same thing as tint_amount above, and deliberately so. The duotone
// collapses the frame onto a two-colour ramp BY LUMINANCE, and luminance is
// exactly what the ward's red wall graffiti does not have: pure red weighs
// 0.2126 in LUMA, so rooms 3, 4 and 6 lose their text to near-grey at tint
// 1.0 (.artifacts/style/graffiti_test.png is that A/B, and it is why
// KEY_STYLE_TINT ships at 0). That text is narrative, and room 5's own hint —
// "the code is written where he walks" — means hue is carrying puzzle-relevant
// information. A monochrome mode that erased it would make rooms unsolvable.
//
// So this desaturates by luminance ONLY where the pixel is already neutral,
// and lets a saturated pixel keep its own peak channel instead. A grey wall is
// unaffected (sat ~ 0, so it converts at true LUMA); the red ink converts at
// its red channel and keeps its contrast against the wall. The result is a
// black-and-white ward in which the writing is still the brightest thing on it.
uniform float mono_amount : hint_range(0.0, 1.0) = 0.0;

// How fast a pixel counts as "ink" rather than "wall". At 4.0 a pixel needs
// roughly a quarter of full saturation to keep its peak channel, which clears
// the wall shader's warm plaster mottle while catching the graffiti outright.
uniform float mono_ink_gain : hint_range(1.0, 12.0) = 4.0;

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
	float perceptual_lum = pow(clamp(lum, 0.0, 1.0), 1.0 / g);
	// Pull the toe halfway toward a second perceptual root at maximum lift.
	// This increases the number of shadow pixels which clear the first dither
	// threshold while retaining the authored output levels and absolute black.
	perceptual_lum = mix(perceptual_lum, sqrt(perceptual_lum), shadow_lift * 0.5);
	float lum_q = pow(quantise(perceptual_lum, thr, steps), g);

	// Scale the original colour by the brightness change, rather than
	// quantising R, G and B separately. Separate channels cross their bucket
	// boundaries at different luminances, so a smooth grey wall breaks into
	// yellow/green/magenta speckle — visible as colour fringing across the
	// whole dayroom. Scaling preserves hue exactly and only posterises value.
	vec3 posterised = lit * (lum_q / max(lum, 1e-4));

	vec3 duotone = mix(tint_lo.rgb, tint_hi.rgb, lum_q);

	vec3 styled = mix(posterised, duotone, tint_amount);

	vec3 outc = mix(src, styled, enabled);

	// APPLIED AFTER THE `enabled` BLEND, not inside `styled`. Black and white
	// is a player setting and the posterise pass is a dev one; folding mono
	// into `styled` would silently switch the colour back on for anyone who
	// turned the style off in ui/dev_panel.gd.
	float mx = max(max(outc.r, outc.g), outc.b);
	float mn = min(min(outc.r, outc.g), outc.b);
	// Saturation as plain chroma range. Cheap, and enough to separate the ward's
	// two populations: near-neutral plaster, and saturated ink.
	float ink = clamp((mx - mn) * mono_ink_gain, 0.0, 1.0);
	float grey = mix(dot(outc, LUMA), mx, ink);

	COLOR = vec4(mix(outc, vec3(grey), mono_amount), 1.0);
}
