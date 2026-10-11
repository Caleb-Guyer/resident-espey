# Art direction

The cover and four material assets were created with the built-in image generation tool. All environments, rig geometry, furniture, weapon geometry, animations, and additional textures are original game code. Ethan's model and cover have golden blonde curls; his model has blue irises. The player camera is now first person.

## Cover prompt

An original cinematic survival horror cover: a young male survivor Ethan, seen from behind in a weathered dark olive jacket with backpack, holding a flashlight, on the right third of an abandoned Texas high school hallway that transitions into the stained yellow wallpaper of the Backrooms. Door 204 glows dimly red; a tall faceless Gentleman waits in shadow. Wet tiles, volumetric mist, dangling fluorescent lights, papers, atmospheric desaturated teal shadows and amber highlights. Keep the left half dark for the HTML title. No added text, logos, watermark or gore.

## Character correction

Change only Ethan's hair to clearly blonde curly hair, with detailed pale golden curls catching the hallway light. Ethan has blue eyes; preserve his rear-facing pose. Keep the exact composition, clothes, backpack, setting, Gentleman silhouette, lighting and textures.

## Version 2 material assets

The following assets were generated from text with no reference images, then resized to 1024 × 1024 and exported as WebP. No photographic assets or Resident Evil assets were copied. The face retains its generated transparency.

- `dist/assets/floor.webp`: a seamless square albedo of abandoned school tiles, four by four desaturated grey-green ceramic tiles, fine grout, scratched glazing, dust, water streaks, chipped corners; flat orthographic surface scan in uniform diffuse light, no objects, text or perspective.
- `dist/assets/plaster.webp`: a seamless square albedo of aged institutional plaster, warm grey-beige paint, fine grain, peeling flakes, damp stains, hairline cracks and grime; straight-on neutral diffuse surface scan, no cast shadows, objects or text.
- `dist/assets/infected-skin.webp`: a seamless monster skin albedo, ashen grey-ochre corpse skin, bruised veins, green mottling, parchment cracks, raw red abrasions, fungal scars, pits; fictional creature material in flat neutral diffuse lighting, no face or body.
- `dist/assets/infected-face.webp`: an isolated front-view fictional infected humanoid head with realistic gaunt anatomy, ashen eye sockets, a clouded eye, decomposing grey-olive skin, uneven teeth, torn cheek, snarling grimace, dried blood and stringy hair; neutral diffuse lighting, complete scalp and jaw, transparent background, no text or watermark.

Tile and plaster materials use bump detail. Infected faces are mapped to curved patches on articulated three-dimensional heads; the skull, limbs, clothing, wounds, ribs and boss growths are geometry. Zsiga's elongated grey silhouette, Jakob's stretched limbs and fused second head, Birdy's red skeletal presence, and Zebene's swollen body and mist keep their source-inspired identities.

The first-person sidearm uses original beveled geometry, serrations, a trigger guard, sights, separate slide, hands, and sleeves. A separate weapon render avoids clipping against nearby walls. Rooms use ceilings, exposed conduits, lockers, computer desks, notes, stained surfaces, windows, and navigation-aware furniture placement. Static scenery and rigid body details are batched to reduce draw calls.
