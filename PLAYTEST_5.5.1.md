# Resident Espey 5.5.1 performance verification

Dense fixed scenery and trim now use 14.4 m spatial batches when a source batch contains at least 64 instances. Smaller batches remain whole to limit draw overhead. Geometry, textures, transforms, shadows and collision remain unchanged. Every new batch has a conservative bounding sphere; existing instance-buffer disposal covers the replacement batches.

Prepared sculpt validation now uses indexed typed-array reads, skips redundant finite checks on unsigned integer storage, validates index integers/ranges, and yields at 8,192-value boundaries inside each large stream. Validation still commits the entire sculpt set atomically. A regression test injects corruption immediately after the first block yields and verifies that the cache remains intact.

## Controlled browser comparisons

Muted native WebGL tests at 1920 x 1080, with Jakob and ten infected held in the same poses. Each timing row contains 120 accepted frames, with nonblocking GPU timer queries and the existing render queue limit. Baseline and candidate alternate in the same session.

| Pass | CPU median | GPU median | GPU p95 | Submitted triangles | Draw calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original scenery | 4.8 ms | 13.98 ms | 17.34 ms | 1,039,648 | 238 |
| Spatial scenery | 4.8 ms | 13.03 ms | 15.11 ms | 813,672 | 260 |
| Original repeat | 4.6 ms | 13.82 ms | 16.13 ms | 1,039,648 | 238 |
| Spatial repeat | 4.6 ms | 12.85 ms | 15.77 ms | 813,672 | 260 |

This view submits 21.7% fewer triangles and has approximately 7% lower median GPU time. CPU time is unchanged. The captured crowded comparison is byte-identical. These are measurements of one controlled scene, not a promise of the same improvement in every room or on every device.

All three chapter starts and boss arenas were compared at four headings, for 24 additional image pairs. Twenty-one pairs are byte-identical; the other three differ in 3, 3 and 44 color channels out of 8,294,400, with maximum differences of 6, 4 and 2 respectively. These tiny raster ordering differences do not remove scenery or shadows.

Alternating browser runs of the same sculpt-buffer validation measured 25.2/21.2 ms CPU work before and 10.4/3.1 ms after. Longest work slices were 4.9/4.8 ms before and 4.1/3.1 ms after. This isolates validation; download, image decoding, model construction and GPU preparation are separate startup costs.

An exposed-wall-face merging experiment was rejected: it did not show a consistent GPU improvement and introduced larger raster differences. Only the measured spatial scenery change ships.

## Release checks

- 278 automated tests pass, including within-attribute yielding, atomic validation failures, spatial bounds and complete campaign progression.
- All 64 application/vendor syntax checks pass; the QA fixture and server also pass syntax checks.
- All 13 cached story scenes start without new GPU resources or shaders; their first six frames take 6–14 ms CPU in total, depending on chapter.
- All 165 sampled human performances pass, with no shader growth. Actual zombie severing, rare headless movement and wound checkpoints pass.
- Graphics context recovery preserves gameplay, flashback and boss state, returns paused, and completes in 1.43–1.90 seconds in these tests.
- Four prepared new-game/retry cycles retain exactly 7,814 native buffers, 897 geometries and 266 textures each time; obsolete instance buffers are released. The native browser reports no errors.

Four native stress traces each cover 600 accepted frames, all five boss phases, ten additional infected, actual AI, shots, weapon changes and hazards. Cinematic transitions are bypassed inside the timed stress loop and checked separately. All four traces have zero shader, geometry, texture or native GPU-buffer growth.

| Boss | CPU median / p95 / max | GPU median / p95 / max |
| --- | --- | --- |
| Chris | 6.9 / 10.6 / 13.5 ms | 14.1 / 20.9 / 26.2 ms |
| Jakob | 6.7 / 10.3 / 13.8 ms | 13.4 / 16.3 / 32.7 ms |
| Zeb | 5.9 / 8.4 / 11.4 ms | 12.6 / 15.8 / 18.7 ms |
| Lil Birdy | 5.8 / 8.3 / 10.8 ms | 11.9 / 15.3 / 31.0 ms |

These moving-combat traces are functional and performance checks, not controlled before/after comparisons. Spike records now include frame, phase, attack, shot-light state, draw calls and active hazards for further investigation. Spikes occur with and without firing; they cannot all be attributed to muzzle flashes or projectiles.

Occasional GPU spikes remain possible. Timing depends on the device, browser and driver; this release does not claim to eliminate every spike.
