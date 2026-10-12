# Resident Espey 4.6.1 verification

October 12, 2026. All browser testing used an isolated local origin with master and dialogue volume at zero. Existing public/local game tabs and their preferences were preserved.

167 automated tests pass. Syntax checks cover 35 game modules. Added regression checks cover seated-magazine interruption, empty bolt timing, tactical shotgun loading, shutter collision/ballistics/navigation (including high shots into a passable raised panel), hidden boss-part uploads and failure cleanup, graphics warmup rollback, unchanged framebuffer preservation, repeated nearest-light selection, mixed-pellet armor, capsule intersections, paused resize, paused audio state, gameplay suspension during graphics preparation, and full wing clearance on both sides of Lil Birdy.

The browser exercised magazine seating and melee interruption, shutter movement and navigation refresh, both graphics presets, and a resize during a paused wing-removal scene. Those checks passed with no console errors. In the actual menu, switching Performance then High returned to Pause, retained ammunition and vitals, and kept audio muted.

The scripted campaign walk completed all nine objectives across the three chapters using actual movement and navigation. Enemies were frozen and bosses resolved through fixture controls; this checks route accessibility and gate progression, not combat balance.

## Controlled rendering measurements

Five damage states of each boss were rendered at a fixed camera with frame pacing. The WebGL GPU timer extension measured elapsed GPU time separately from CPU update/submission time. All four runs retained their shader and geometry counts.

| Boss | CPU median / p95 | GPU median / p95 | Maximum GPU time | Shader / geometry growth |
| --- | --- | --- | --- | --- |
| Chris | 1.7 / 2.3 ms | 1.6 / 5.2 ms | 8.0 ms | 0 / 0 |
| Jakob & Bobby | 1.8 / 2.4 ms | 1.7 / 5.8 ms | 9.4 ms | 0 / 0 |
| Zeb | 1.6 / 2.1 ms | 1.9 / 4.1 ms | 20.2 ms | 0 / 0 |
| Lil Birdy | 1.4 / 2.0 ms | 1.3 / 4.2 ms | 8.8 ms | 0 / 0 |

These measurements verify the tested damage-state render path. They are not a guarantee of frame rate on other devices or a claim that all possible driver stalls are gone. The scripted checks do not replace a human difficulty/balance playthrough.
