# Licensed art assets

5.0 begins replacing the prototype's generated art and primitive stand-ins with assets made by artists and photographers. This is an asset and animation rebuild; it does not represent a finished AAA production.

## Poly Haven — CC0

All assets below are redistributed with the game under [Poly Haven's CC0 asset license](https://polyhaven.com/license). Poly Haven describes its library as human-made and avoids generative AI in its assets. The original model and texture authors retain credit here and in the game credits. No account or payment was required.

| Asset | Original author(s) | Use |
| --- | --- | --- |
| [Beige Wall 001](https://polyhaven.com/a/beige_wall_001) | Dimitrios Savva, Rico Cilliers | Photographed plaster color, normal and roughness maps |
| [Damaged Plaster](https://polyhaven.com/a/damaged_plaster) | Amal Kumar | Chipped institutional plaster with exposed brick |
| [Floor Tiles 06](https://polyhaven.com/a/floor_tiles_06) | Rob Tuytel | Worn tile PBR floor |
| [Old Linoleum Flooring 01](https://polyhaven.com/a/old_linoleum_flooring_01) | Charlotte Baglioni | Backrooms floor |
| [Painted Plaster Wall](https://polyhaven.com/a/painted_plaster_wall) | Amal Kumar | Breach plaster finish |
| [Utility Box 01](https://polyhaven.com/a/utility_box_01) | James Ray Cock | Electrical room fixture |
| [Metal Office Desk](https://polyhaven.com/a/metal_office_desk) | Ulan Cabanilla | Classroom and computer station furniture |
| [Fire Alarm](https://polyhaven.com/a/fire_alarm) | Slinc | Mounted institutional detail |
| [Security Camera 01](https://polyhaven.com/a/security_camera_01) | Alexander Otterbeck, Yann Kervran | Mounted CCTV fixture |

Source files are in `dist/assets/licensed/`. Model downloads use the publisher's 1K PBR set. Materials use the publisher's 2K JPEG color maps and 1K OpenGL normal and roughness maps. Downloaded files were checked against the MD5 values supplied by the public asset manifest; original bitmap files were not altered.

The game fits model instances proportionally inside existing placement envelopes. Mounts must have wall support and clear room entrances. Classroom monitors and keyboards sit at the imported desk's actual height. World-coordinate wall sampling reads the three PBR maps separately. Material color uses sRGB; normal and roughness maps use linear data.

## Rikindle3D — CC0

[Male City Zombie](https://opengameart.org/content/male-city-zombie-ready-for-use-in-game-engines), published by Rikindle3D on April 17, 2020, is offered under CC0 on the publisher's page. The author states that the textures were made in Mudbox. Model, texture and motion source: the downloadable `Male City Zombie.7z` on that page.

The character is converted to glTF with the official Godot FBX2glTF converter. Its provided idle, alternate idle, two walks, run, three attacks, reaction, death and scream clips are combined into a single cached model. Horizontal root translation is removed so animation does not duplicate gameplay movement. Each enemy owns its skeleton, materials, mixer and animation actions; geometry, source textures and clips are shared. Attack poses follow the existing attack tell/release timing. Death progresses to the final pose and rests there.

Version 5.1 extends this same artist model to all ordinary infected roles. The base skeleton and textures are shared; each role receives different proportions, movement and posing, and some have code-authored armor or infection tissue. Anatomical triangle attributes and cached region meshes retain original UVs, normals and skin weights. Severed regions are masked consistently in colour and shadow shaders. Detached pieces snapshot the already uploaded skin matrices; matching wound caps and blood effects are code-authored. No new third-party asset or altered bitmap is introduced by this pass.

The artist's head geometry and UVs are also adapted for the bosses, with different proportions for Chris, Zeb, Jakob, Bobby and Birdy. The former generated portrait and teeth meshes are suppressed when an artist head is present. Speech retains a local jaw-region morph. The existing distinct boss bodies, wing systems, combat phases and identities remain custom; these are not newly purchased AAA boss rigs.

## Software

Three.js r180 and the matching official GLTFLoader, BufferGeometryUtils and SkeletonUtils are MIT-licensed. The existing `dist/vendor/THREE-LICENSE.txt` applies to these files. Import paths are localized so the game has no CDN runtime dependency. The offline FBX converter is not shipped with the web game.

## Remaining production work

The game still contains code-authored weapons, hands, custom boss bodies and survivor rigs, and some older generated textures. Existing dialogue is synthesized, as disclosed in the game credits. Reaching the requested commercial AAA standard would require bespoke production models, full weapon and creature animation sets, motion/facial performance, human voice acting, a broader lighting and environment pass, and extensive performance and gameplay testing. This release establishes a usable licensed-asset pipeline and replaces specific visible assets; it does not claim that every asset has been replaced or that AAA parity is achieved.
