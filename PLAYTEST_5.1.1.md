# Resident Espey 5.1.1 — performance and recovery

Verified locally on October 14, 2026. Browser checks ran in an isolated localhost fixture with master and dialogue gain set to zero before initialization; fixture volume setters were constrained to zero. QA files are outside the published repository.

## Reproduced and fixed

- Repeating the same prepared chapter retained 26 additional native GPU buffers per load in 5.1.0: 2,378, 2,404, 2,430 and 2,456 live tracked handles. Explicit disposal of instanced meshes and effect pools holds all four loads at 2,352 handles in 5.1.1. Tracking wraps native createBuffer/deleteBuffer and measures explicit release, not garbage-collector behavior.
- Prepared geometry stays at 636 objects across these loads. Cached procedural canvas sources reduce prepared texture objects from 349 to 327 and avoid repeating their drawing work. Texture clones retain independent tiling.
- Ten visible infected add 30 main-pass draw calls; the same ten behind the camera add zero. Conservative skin bounds avoid Three.js's first-render per-vertex bounds computation. Automated tests check all vertices at sampled times in all eleven imported clips, crawl poses, and frozen detached-limb poses against those bounds.
- Static scenery stops rebuilding transform matrices. Portals, dust, mist, characters, gates and later-added interactive objects retain dynamic transforms. Owned hit-reaction materials are cached; shared wound surfaces are excluded. Hit capsules read already-updated bone matrices rather than recomputing ancestor transforms for each endpoint.
- A real GPU submission exercise accepted 79 of 600 closely spaced attempts over 776 ms, with at most two pending fences. 291 attempts yielded to pending GPU work and 232 to the 120 Hz rendering ceiling. Checks use zero timeout and never call finish(). Simulation advances by elapsed time on the next accepted frame, subject to the existing 45 ms safety cap.

## Graphics interruptions

Native WEBGL_lose_context checks passed during gameplay, a closet flashback and Birdy's introduction. The recovery cover appeared, uploads and shader variants were prepared again, and health, ammunition, position, game time and scene time stayed intact. Each returned paused. Measured restoration preparation was approximately 1.2–1.4 seconds on this machine.

An interrupted chapter preparation returned GRAPHICS_LOST, cleared its loading flag and recovered successfully. Pending shader preparation races against context loss instead of waiting indefinitely. Both chapter and cinematic preparation wait for GPU completion while yielding. A failed restoration offers Reload; a recovery taking longer than 15 seconds also exposes that option.

## Regression checks

- 226 automated tests pass, including queue bounds, display-rate limiting, context-loss cancellation, obsolete restoration promises, resource disposal, texture sharing, animated bounds and frame-clock behavior. All 45 shipped modules pass syntax checks.
- Real aimed pistol shots severed both arms, both legs and the head. Each case had zero shader growth and stable geometry/texture counts. Maximum measured trigger work plus immediate render was 6.6 ms in this sample. An eligible headless infected remained alive, moved 0.54 units and exposed zero head targets.
- Aim plus held fire passed with and without mouse lock. Reloads completed with conserved ammunition and settled magazines.
- All nine objective routes passed navigation and gate progression. This fixture freezes enemies and uses invulnerability; it is not a human combat playthrough.
- Captured browser warnings and errors were empty after the native recovery and route checks.

## Measurement limits

A warmed 180-frame high-preset workload with ten animated infected measured 4.6 ms CPU median, 6.2 ms p95 and 6.8 ms maximum. Available GPU timer samples measured 4.7 ms median, 5.7 ms p95 and 55.1 ms maximum. Geometry, texture and shader growth were all zero. This intentionally batched workload bypasses the normal frame budget and measures render work, not presentation FPS. Background browser tabs throttle animation callbacks.

The changes address reproduced buffer retention, unnecessary off-screen work, startup scans and unbounded GPU submissions. The occasional GPU spike remains observable; these measurements do not establish zero stutter across devices, browser scheduling, cold asset downloads or graphics drivers.
