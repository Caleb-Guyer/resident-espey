# Resident Espey 5.1.3 — startup and combat workload

Verified locally on October 14, 2026. Browser QA used an isolated localhost fixture with master and dialogue gain set to zero before initialization and setters constrained to zero. Profiling fixtures are outside the shipped repository.

## Geometry and skinning

Tiny pistol grip dots previously used the same high-resolution sphere as visible fingernail details. Millimeter-scale trim also used full bevel tessellation. Those small features now use appropriate geometry, while receiver silhouettes, sights, normal maps and the detailed hand surfaces retain their shapes. Rigid batching preserves indexed vertices, triangle order, normals and UV seams instead of expanding each triangle corner. Morphable and skinned meshes remain separate.

| Prepared first-person model, including hands | Previous vertices | Current vertices | Previous triangles | Current triangles |
| --- | ---: | ---: | ---: | ---: |
| Sidearm | 1,251,272 | 128,637 | 519,160 | 155,720 |
| Shotgun | 234,628 | 98,411 | 182,782 | 150,270 |
| Carbine | 496,269 | 227,279 | 268,342 | 184,566 |

The imported infected's body, clothing and eyes have matching joints and inverse bind transforms. They now share one live skeleton per actor. Each of the five detachable regions keeps a separate frozen skeleton, shared only among that region's skin sections. This reduces each ordinary actor from eighteen skeleton objects to six without changing poses or linking injuries between parts or actors.

Four repeated prepared chapter loads held at 2,496 tracked native buffers, 636 geometries and 207 texture objects each. The previous release held 327 textures in the same chapter. Indexed batches add index-buffer handles while substantially reducing vertex data; handle counts alone do not measure memory bytes. Native buffer tracking measures explicit create/delete calls, not garbage collection or driver allocation.

## Loading

Weapon construction yields between materials, each weapon and final assembly instead of doing the entire build in one task. A sampled 336.5 ms synchronous build was replaced by five stages of approximately 8–64 ms of CPU work, with painting opportunities between stages. These are local samples; individual stages can still exceed a frame on slower hardware.

Warmup compiles the actual output variants once, rather than preparing an additional offscreen shader set. Hidden parts, muzzle flashes, blood, projectiles, all weapons and later rooms are drawn in a 16×16 viewport on the actual framebuffer, then the caller's viewport, scissor, target, shadow and visibility state are restored. The gameplay canvas remains full size afterward.

Material maps and bone textures upload before the warm draw, yielding after a 4 ms CPU budget or sixteen new texture initializations, whichever comes first, and polling GPU completion without blocking. Already-current textures skip scheduling. A restored renderer property store forces uploads again. Loading retains its cover until preparation finishes.

In the final sampled preparation, the first protected combat warm draw took 72.1 ms of CPU time, compared with 397 ms in the earlier baseline. Total asynchronous preparation took 1,052.8 ms, compared with 682 ms: the extra yields trade some loading time for smaller main-thread bursts. A subsequent ten-actor warm draw took 19.9 ms. The deliberately unprepared diagnostic new-game path still took about one second; normal menu entry uses asynchronous preparation under its loading cover.

## Combat and first use

A paced 180-frame high-preset workload animated ten infected, fired the pistol repeatedly and used melee. It followed the shipped GPU submission budget and yielded between frames. CPU work was 6.0 ms median, 6.7 ms p95 and 8.8 ms maximum. GPU timer samples were 1.3 ms median, 1.8 ms p95 and 3.1 ms maximum. No GPU sample exceeded 15 ms. Geometry, texture and shader growth were all zero.

The comparable pre-change paced sample measured 5.7/6.6/8.7 ms CPU and 1.4/2.2/5.0 ms GPU. These small timing differences are machine- and scheduling-dependent; the geometry, skeleton and upload reductions are the reproducible structural changes. Neither sample establishes zero stutter across devices. Background browser timing does not establish foreground presentation FPS.

Real aimed shots severed both arms, both legs and the head, with stable GPU resources and zero new shaders in every case. The largest sampled trigger-plus-render CPU time was 5.1 ms. Rare headless survival retained movement and zero head hit targets.

All thirteen prepared story scenes were built, rendered, released and replayed across the three chapter caches without new GPU resources or shader programs. Their first six directed updates took at most 10 ms in the sample. Native graphics-loss recovery preserved gameplay, flashback and boss-introduction state and returned paused, taking approximately 1.6–1.8 seconds. All three weapons retained ammunition totals through switching, reloads and saves, with zero shader or geometry growth; the largest sampled update/render was 5.9 ms.

Held aimed fire, releasing aim while retaining fire, and releasing both buttons passed with and without mouse lock after normal preparation. The fixture waits for an accepted game frame because GPU backpressure can deliberately defer an animation callback. Browser warning/error capture was empty.

## Automated checks

237 tests pass. All 53 checked application/vendor modules parse successfully. New checks cover exact indexed triangle/normal/UV preservation, exclusions for animated parts, weapon geometry budgets, staged construction, output-state restoration, upload batching/cancellation/cache reuse, matching imported skeletons and independent detached-region snapshots. Existing combat, reload, sight alignment, recoil, boss phases, collision, cinematic and recovery tests remain passing.
