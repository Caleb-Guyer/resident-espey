# Resident Espey 5.5.3: native 1440p rendering

High graphics now primes the depth buffer using only fixed opaque walls, floor and ceiling before shading the world. Hidden surfaces fail the depth test before their expensive photographed-material lighting runs. Character geometry, shadows, textures, MSAA, pixel ratio and enemy counts retain their existing settings. Moving doors, characters, cutouts and transparent props do not enter the architecture pass.

The depth geometry shares the original architecture geometry and owns independent instance buffers. Loading and graphics recovery compile and warm both depth variants before play. Level disposal releases the extra instance buffers and material, preserving the shared geometry. The world background and renderer clear state are restored even if rendering throws.

Settings now reports the browser's active graphics adapter and actual render resolution. This is read only when Settings opens; it adds no GPU queries to the gameplay loop. Windows graphics preferences were left unchanged at the user's request.

## Reproduction and controlled measurements

The reported approximately 44 FPS was reproduced at native 2560 x 1440, High graphics, on the Intel graphics adapter selected by the test browser. A six-second trace counted 269 actual rendered game frames: 44.8 FPS, consistent with the HUD's 44. Median CPU work was 5.3 ms; GPU work was 16.37 ms. The counter was not the cause of the low rate.

The machine also reports an NVIDIA GeForce RTX 5080 Laptop GPU. This test measures the integrated GPU path; it does not establish which adapter the user's separate Edge tab selects. The new Settings readout makes that distinction visible inside Edge.

Alternating tests of the integrated release in the same 1440p scene measured:

| Pass | Actual gameplay FPS | CPU median | GPU median | GPU p95 |
| --- | ---: | ---: | ---: | ---: |
| Original | 44.7 | 5.0 ms | 16.30 ms | 17.93 ms |
| Depth priming | 52.2 | 5.5 ms | 13.27 ms | 14.81 ms |
| Original repeat | 45.3 | 5.0 ms | 16.37 ms | 17.99 ms |
| Depth priming repeat | 54.3 | 5.3 ms | 13.09 ms | 14.71 ms |

This is approximately 17–20% higher actual gameplay FPS and 19–20% lower median GPU time in that scene. The extra architecture draw adds 0.3–0.5 ms median CPU work, while reducing GPU work by approximately 3 ms. It is not a guaranteed frame rate for every camera angle, fight or computer. All tests were muted. GPU timers are asynchronous, and the existing nonblocking render queue remains in place.

Back-facing BRDF shortcuts and an opaque-canvas experiment did not yield a consistent improvement and are not included in the release.

## Verification

- All 281 automated tests pass, including depth-buffer ownership, restoration after a failed draw, warmup interruption, and the existing campaign and combat checks.
- All 66 application/vendor syntax checks pass.
- All 24 native 1440p image pairs are byte-identical: three chapter starts and three boss arenas at four headings each, depth priming enabled versus disabled.
- All 13 cached story scenes start with no new shaders or GPU resources. Their first six frames take 6–9 ms CPU in total, depending on chapter.
- Zombie limb/head severing, rare headless movement and wound checkpoints pass without shader or resource growth.
- Graphics recovery preserves gameplay, flashback and boss state, returns paused, and completes in 1.29–2.65 seconds in these tests.
- Four prepared new-game cycles settle at 7,402 native buffers, 775 geometries and 249 textures, with no upward resource growth. The first cycle retains four temporary buffers that are subsequently released.
- The native browser reports no errors.

Four native 1440p stress traces each cover 600 accepted frames, all five boss phases, ten additional infected, actual AI, shooting, weapon changes and hazards. Cinematic transitions are bypassed in the timed loop and checked separately. All four traces have zero shader, geometry, texture and native GPU-buffer growth.

| Boss | GPU median / p95 / max |
| --- | --- |
| Chris | 18.2 / 22.2 / 43.4 ms |
| Jakob | 19.6 / 25.8 / 33.1 ms |
| Zeb | 19.2 / 24.7 / 34.6 ms |
| Lil Birdy | 15.0 / 18.8 / 20.8 ms |

These moving-fight traces are not controlled before/after comparisons and should not be compared directly with older 1080p traces.

Occasional GPU spikes remain. The game requests a high-performance graphics context, but this update does not change Windows GPU assignments or restart Edge.
