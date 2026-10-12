# 5.0 artist-asset rebuild verification

## Automated checks

All **197 tests** pass. The new checks parse the actual packaged artist model, verify eleven usable motion clips, clone independent skeletons and mixers, exercise animation blending and a floor-level death pose, check that locomotion cannot add horizontal travel to gameplay movement, and validate separate finite boss speech morphs. They also test proportional prop fitting and the PBR wall shader's color/normal/roughness sampling.

An integration check builds and clones all four boss rigs with the actual imported head anatomy. It verifies that batching cannot revive the retired portrait, eye, ear or mouth meshes, and that the artist teeth/eye geometry follows the speech morph. All **40 game modules** pass syntax checking.

## Asset provenance and loading

Nine Poly Haven CC0 assets and Rikindle3D's published CC0 character are included. The 42 licensed source files total approximately **27.1 MB** before transfer compression. Model materials use 1K data; environmental color maps use 2K and their normal/roughness data uses 1K. Downloads were checked against the publisher's manifest hashes. The original bitmap files were not edited. Matching Three.js r180 loaders are bundled locally, so runtime art loading uses the game's own host.

Artist geometry, clips and source textures remain cached across instances and chapters. Instances have their own skeletons, animation state and damage materials. Chapter preparation uploads rendering variants before returning player control. The expanded asset set still requires download and shader preparation during loading; this release does not guarantee instant cold starts or eliminate every slow frame.

## Muted browser checks

Master and dialogue gains are explicitly zero before play; the QA page enforces zero in its setters. No test audio is played to the user.

All **353 wall fixtures** passed support, overlap and doorway checks: **115 school**, **109 Backrooms**, **129 breach**. All **28 room entrances** remained clear. A controlled campaign walk passed all **nine objective stages**, including Birdy's fragment gate and primary boss triggers. Enemies are frozen and Ethan is invulnerable during this route check, so it verifies traversal and progression rather than balance.

All **24 sampled boss-introduction camera positions** remained clear after the imported furniture changes.

The high-quality rendering profile sampled **300 frames per boss** across all five stages, including crushed Bobby and both torn Birdy wings. It reported no geometry or shader growth after preparation:

| Boss | CPU median / p95 | GPU median / p95 / maximum |
| --- | ---: | ---: |
| Chris | 2.1 / 2.8 ms | 3.5 / 7.5 / 9.6 ms |
| Jakob | 2.4 / 3.1 ms | 3.6 / 6.5 / 9.0 ms |
| Zeb | 2.4 / 3.1 ms | 3.7 / 5.7 / 9.6 ms |
| Lil Birdy | 1.9 / 2.4 ms | 3.5 / 5.2 / 7.8 ms |

These are fixed-camera, warmed local rendering measurements from this machine. They do not include cold network loading or the full campaign AI workload and do not guarantee a locked frame rate on every device.

The imported character was inspected in the actual room lighting with its PBR textures and animation state. Boss closeups were inspected after adapting the artist head. The first head integration exposed mismatched legacy eyes and ears; the source's own eye and dental geometry now renders in place, and retired geometry stays hidden. The artist head proportions differ across the five identities. The title backdrop is an unedited screenshot rendered by the game with UI and weapons hidden.

The actual production UI was also tested with zero-volume settings and a seeded chapter-I checkpoint. Continue completed chapter preparation, returned to gameplay and reported no startup errors. The test recorded 157 loading-screen paints and the first 240 gameplay frame intervals had a maximum of 8 ms, p95 of 4 ms and no interval above 50 ms. This is a controlled local checkpoint test with warm asset delivery, not a cold public-site download benchmark or a complete campaign performance guarantee.

## Scope and remaining work

This is the start of a larger asset and animation replacement, not a finished commercial AAA game. The production gap includes bespoke boss body/hand/weapon rigs, additional authored animations, full survivor facial performance, human-recorded acting, broader lighting and environmental storytelling, and long-form gameplay and device testing. Some custom procedural rigs and earlier generated art remain. [Asset authors, sources, changes and licenses](LICENSED_ART.md).
