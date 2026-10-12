# Art rebuild — 4.8.0

This release uses original code-authored meshes and a new bitmap material atlas generated with the built-in imagegen tool. It does not use ripped Resident Evil assets.

## Saved assets

- `dist/assets/material-surfaces-v3.png`: four-region albedo atlas, copied unchanged from the built-in generator output. Skin, worn steel, infected dark skin and aged institutional plaster occupy separate regions. Shader sampling stays within each region. Wall sampling uses world coordinates and mirrored repeats with a subtle warp to remove hard wrap seams.
- `dist/assets/hands-v3.bin`: original continuous hand meshes baked offline, 3,754,540 bytes. Right hand: 30,072 vertices and 60,144 triangles. Left hand: 25,142 vertices and 50,280 triangles. Both include smooth gradient normals, UVs and a finger morph target. Mesh decoding precedes view-model construction; procedural fallback remains available.
- `dist/profile-geometry.js`: original rounded profile loft for tapered weapon components, with smooth outward-facing normals and closed ends.

Run `node tools/bake-hands.mjs` to rebuild the hand binary offline after changing its authored surface. The output location is resolved relative to the script.

Hand skin includes fine pore variation and restrained micro normals. Steel combines blued color variation with machining grain and roughness variation. All bosses have physical eyes and lids; Zeb retains his Black skin design with the infected dark skin region. Pale boss bodies use muted natural pore detail. Photographic boss facial albedo and established identities are retained.

No textures or geometry are generated during a shot, weapon switch, reload or wing tear. Room fixtures are merged and mounted using the existing wall support and doorway reservation system. Weapon lamp lighting changes uniforms rather than material variants.

## Final image-generation prompt

Use case: photorealistic-natural. Asset type: one original 2-by-2 game material albedo atlas, square 2048 x 2048, intended to be applied to real 3D meshes in an original survival horror browser game. Exactly four equal square texture regions, no borders, no gaps, no labels or lettering. Flat orthographic macro surface scans under completely even neutral diffuse lighting, no perspective, no highlights or baked cast shadows. Top-left quadrant: realistic natural pale adult hand/forearm skin surface, muted ivory peach, fine pores, subtle freckles and delicate capillary variation, restrained color, no hands or fingers depicted, no wounds. Top-right quadrant: worn dark blued steel, very fine brushed machining grain, subtle silvery edge-like scuff patterns distributed through the flat texture, tiny scratches and oil variation, no objects or components. Bottom-left quadrant: realistic fictional infected dark brown skin tissue surface, nuanced brown and plum mottling, small scar textures and fine irregular veins, no body parts, no gore. Bottom-right quadrant: abandoned institutional painted plaster wall, desaturated warm ivory with hints of old olive underpaint, flaking layers, microcracks, humidity stains and gritty mineral texture. Each region fills its complete quadrant edge to edge and is seamless within its own region. A material atlas, never a collage of scenes. No logos, text, objects, lighting gradients, cinematic lighting or watermarks.

The generator returned a square PNG. It was inspected visually and copied without resizing or cropping. The requested dimensions above describe the prompt, not a guarantee of output dimensions.
