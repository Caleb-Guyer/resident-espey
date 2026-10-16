# Resident Espey 5.5.4: native High rendering optimization

Fixed scenery now uses a conservative wall-occlusion test before rendering. An object is skipped only when its entire padded bounding box is behind one immutable, full-height wall run. Bounds overlapping the wall are retained for correct back-face shadow casting. Animated objects, objects with animated ancestors or children, displaced geometry, and objects outside wall height are excluded. Culling requires an aligned camera and flashlight origin and restores original visibility even if rendering fails. Cached classification and preallocated integer lists avoid temporary visibility arrays during gameplay.

Opaque fixed planes join the architecture depth pass. Moving, transparent, cutout, clipped, offset, stencil-writing and alpha-to-coverage surfaces retain their original coverage. The pass shares geometry, owns its instance buffers, respects layers, and is warmed before play.

Walls calculate a conservative point-light mask per instance in the vertex shader. A flat integer mask rejects only lights whose positive cutoff volume cannot touch the transformed unit box. The original attenuation, physical lighting, maps, normals, shadows and unlimited-distance lights retain their behavior. Larger light counts fall back to the original loop.

Native 2560 x 1440 output, High graphics, hardware antialiasing, PCF soft shadows, 1024 x 1024 live shadow maps, texture detail, character geometry and enemy counts retain their settings. The two-frame nonblocking GPU queue and its latency limits are unchanged. Production does not run the QA GPU timers or pixel readbacks.

## Controlled measurements

All tests were muted. The test browser used ANGLE on Intel Graphics through Direct3D 11. The user also confirmed that Edge reports Intel Graphics. The RTX 5080 was not the active renderer; Windows and Edge GPU preferences were left unchanged.

The final comparison alternated the 5.5.3 rendering path and the new path in the same browser at native 1440p. Each sample ran actual gameplay for ten seconds, counting submitted game frames. The moving comparison continuously changed the camera position, forcing occlusion classification to update. Every timed sample explicitly reported High, antialiasing enabled, live PCF soft shadows and a 1024 x 1024 shadow map.

| Scenario | Rendering path | Actual FPS | CPU median / p95 | GPU median / p95 | Frame interval p95 |
| --- | --- | ---: | --- | --- | --- |
| Stationary | 5.5.3 | 69.8 | 5.40 / 6.50 ms | 10.75 / 11.45 ms | 20.7 ms |
| Stationary | 5.5.4 | 80.0 | 4.00 / 4.80 ms | 8.92 / 9.77 ms | 16.7 ms |
| Stationary | 5.5.3 | 70.4 | 5.00 / 5.70 ms | 10.65 / 11.43 ms | 18.6 ms |
| Stationary | 5.5.4 | 79.5 | 4.10 / 5.70 ms | 9.05 / 9.96 ms | 16.8 ms |
| Moving | 5.5.3 | 68.2 | 5.70 / 7.20 ms | 10.78 / 11.67 ms | 20.7 ms |
| Moving | 5.5.4 | 78.6 | 4.10 / 5.00 ms | 8.93 / 9.97 ms | 16.8 ms |
| Moving | 5.5.3 | 68.7 | 5.30 / 6.30 ms | 10.72 / 11.74 ms | 20.8 ms |
| Moving | 5.5.4 | 78.8 | 4.10 / 4.70 ms | 8.92 / 9.92 ms | 16.8 ms |

These paired runs show approximately 13–15% higher FPS, 15–17% lower median GPU time and 18–28% lower median CPU time. Absolute FPS varied between test sessions; the controlled comparison is the evidence for improvement. These numbers do not promise 80 FPS in every room or crowded fight, or establish RTX performance.

## Visual and functional verification

- All 290 automated tests and all 68 syntax checks pass. New coverage includes occlusion proof, visibility restoration, moving/deformed exclusions, instance bounds, shader loop expansion, conservative light bounds and depth-plane eligibility.
- Sixty native 1440p before/after image pairs cover all three chapters, start areas, boss arenas, route corners, crouching and flashlight changes. Fifty-three pairs are byte-identical. Across the remaining seven pairs, eight color channels differ by one 8-bit brightness step; no channel differs by more than one.
- Actual zombie limb/head severing, rare headless movement and wound checkpoints pass without shader or resource growth.
- All thirteen cached story scenes start without new shaders or GPU resources. The first six frames total 8–12 ms CPU, depending on chapter.
- Gameplay, flashback and boss graphics recovery preserve state and return paused, completing in 1.27–1.56 seconds in this run.
- Four prepared new-game cycles settle at 7,402 tracked native buffer objects, 775 geometries and 249 textures, without upward resource growth. Four temporary buffer objects from the first cycle are released.
- The clean release test tab reports no browser errors.

Four stress traces each include 600 accepted frames, five boss phases, ten additional infected, actual AI, shooting, weapon changes and hazards. Cinematic transitions are checked separately from the timed combat loop. All four traces show zero shader, geometry, texture and native buffer growth.

| Boss | CPU median / p95 / max | GPU median / p95 / max |
| --- | --- | --- |
| Chris | 5.2 / 6.7 / 7.5 ms | 12.3 / 15.9 / 17.0 ms |
| Jakob | 6.0 / 8.9 / 10.7 ms | 14.6 / 18.9 / 28.8 ms |
| Zeb | 6.0 / 7.1 / 10.5 ms | 12.9 / 16.5 / 24.1 ms |
| Lil Birdy | 5.3 / 6.8 / 7.8 ms | 11.2 / 14.8 / 15.9 ms |

These stress traces are not controlled before/after comparisons. Occasional GPU spikes remain, including a 28.8 ms maximum in the Jakob trace. They should not be interpreted as a guarantee of stutter-free play.
