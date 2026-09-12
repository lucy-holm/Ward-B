shader_type spatial;
render_mode depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Concept-art surfacing for the UV-less prop kit. Three mipmapped samples of
// one shared 128px noise texture give painted furniture a coating, exposed
// substrate and dirt instead of one averaged flat colour. No normal/depth
// fetches, transparency, extra geometry or per-frame script work.
// World metres keep rust chips the same size on bed rails and sink basins.
uniform sampler2D wear_tex : repeat_enable, filter_linear_mipmap;
uniform vec4 paint_color : source_color = vec4(0.7, 0.655, 0.565, 1.0);
uniform vec4 substrate_color : source_color = vec4(0.22, 0.17, 0.13, 1.0);
uniform float wear_scale = 1.4;
uniform float chip_threshold : hint_range(0.0, 1.0) = 0.3;
uniform float dirt_strength : hint_range(0.0, 1.0) = 0.22;
uniform float paint_roughness : hint_range(0.0, 1.0) = 0.5;
uniform float substrate_roughness : hint_range(0.0, 1.0) = 0.92;
uniform float metalness : hint_range(0.0, 0.1) = 0.02;

varying vec3 wear_position;
varying vec3 wear_weights;
varying float view_distance;

void vertex() {
	vec4 world = MODEL_MATRIX * vec4(VERTEX, 1.0);
	wear_position = world.xyz * wear_scale;
	vec3 n = abs(MODEL_NORMAL_MATRIX * NORMAL);
	n *= n;
	n *= n;
	wear_weights = n / max(n.x + n.y + n.z, 0.0001);
	view_distance = length((VIEW_MATRIX * world).xyz);
}

void fragment() {
	vec3 fields = vec3(texture(wear_tex, wear_position.yz).r,
		texture(wear_tex, wear_position.xz).r,
		texture(wear_tex, wear_position.xy).r);
	float field = dot(fields, wear_weights);
	// Soften small chips at range rather than making the PS1 dither shimmer.
	float edge = mix(0.025, 0.10, smoothstep(3.0, 12.0, view_distance));
	float chip = 1.0 - smoothstep(chip_threshold - edge, chip_threshold + edge, field);
	vec3 paint = paint_color.rgb * (1.0 - dirt_strength * (1.0 - field));
	ALBEDO = mix(paint, substrate_color.rgb, chip);
	ROUGHNESS = mix(paint_roughness, substrate_roughness,
		clamp(chip + (1.0 - field) * 0.22, 0.0, 1.0));
	METALLIC = metalness;
}
