# Resident Espey 5.2 — combat animation and startup polish

Verified October 14–15, 2026. All browser QA used a separate localhost server with master and dialogue volume zero before initialization, and volume setters constrained to zero. QA controls and profiling code are outside the published repository.

## Animation and feedback

Boss poses now separate anticipation, contact, follow-through and recovery. The release frame retains the end of the anticipation pose. Chris braces before rushing and twists through claw swings; Jakob and Bobby lead with separate heads, spines and arms; Zeb recoils through bile and ground attacks; Birdy's wings have delayed wrist motion, smooth folding and a compressed landing. Grounded movement eases in and out without restarting the stride. Each boss has a different weighted collapse, with knees giving way before the torso settles.

Introductions add head tracking, staggered awakening, forearm movement and landing compression. Automatic dialogue coverage eases between speakers inside an authored shot; authored edits remain immediate cuts. Pause retains the exact camera state.

Damage adds six critically damped reaction channels for the torso, head, arms and knees. Reactions follow shot direction and the hit region, remain bounded under automatic fire, and settle consistently across frame rates. Regular body hits retain the imported locomotion clip. Strong head hits can still trigger the full hit animation. Severed regions retain their existing injury behavior. Shotgun feedback preserves any head hit across the whole pellet spread. Gunfire and melee gain flesh-impact feedback; melee plays one impact cue per swing. Blood uses the existing fixed pools, and the old orange hit glow is reduced.

## Startup and rendering

The five custom body meshes now load from prepared buffers. Their positions, normals, UVs, material groups, triangle indices and bind weights are byte-for-byte equal to the editable sculpt output. Rebuild with `npm run bake:creatures`. The compressed asset is 7,125,324 bytes and expands to 9,780,848 bytes. This trades an additional cached download for less synchronous geometry construction. Unsupported decompression or a failed asset load falls back to the source sculpt.

A representative cold Start run previously recorded a 713 ms loading task. After preparing body meshes, the longest sampled loading task was 154 ms. Remaining level construction and GPU preparation still run behind the loading cover. This does not claim that every loading task fits one frame or that download latency is lower.

Procedural scream PCM is generated without opening an audio device, in 2,048-sample chunks with task yields. Audio buffers install after generation or device creation, whichever finishes last. The first Start click no longer synthesizes the three waveforms synchronously.

Stationary attack warnings cache corridor collision scans and refresh every 150 ms or immediately after movement/attack changes. Warning intensity follows the attack's actual progress. World warmup performs a second tiny draw after lights are established to prepare the final shadow variants; all render state is restored afterward.

## Verification

Automated coverage checks all attack envelopes, actual director release age, localized reactions, bounded repeated impulses, frame-rate equivalence, unique finite boss collapses, paused camera continuity, warning refresh, chunked audio synthesis, exact prepared geometry and corruption fallback. The existing suite covers ammunition/reload conservation, shooting while aiming, phase order, wing removal, the press chase, persistent injuries, collision clearance, pause, save and graphics recovery.

Crowded boss fixtures simulate 600 accepted frames per boss, five phases, four additional infected, attacks, hit reactions and hazards. Each uses the real nonblocking GPU queue and asynchronous GPU timer queries, with a 16 ms task gap between submissions. These are workload timings, not measured foreground FPS; the browser throttles background animation frames. CPU, GPU and OS scheduling vary between runs.

All four boss runs retained geometry, texture and native buffer counts during combat. Chris and the twins had no new programs in their sampled runs. Zeb's late depth variant is prepared by the second world warm draw. Birdy's feathers now use a dedicated depth material, cloned independently for each rig, so detaching wings cannot inherit shared skin/cloth shadow state. Final traced runs for both had zero shader growth.

| Crowded fight | Accepted samples | CPU median / p95 / max (ms) |
| --- | ---: | --- |
| Chris | 600 | 4.3 / 6.2 / 7.0 |
| Jakob and Bobby | 600 | 5.0 / 5.9 / 6.5 |
| Zeb | 600 | 6.0 / 7.1 / 8.1 |
| Lil Birdy | 600 | 4.7 / 6.4 / 7.5 |

The final Zeb GPU sample had a 13.9 ms p95 and 18.0 ms maximum, with two samples above 16.7 ms. Birdy's final sample had a 14.3 ms p95 and 16.7 ms maximum (one marginally over the unrounded threshold). Other sampled runs were lower. These remaining scheduling/rendering variations are recorded rather than described as zero stutter. The persistent late shadow compilation was removed.

These changes improve the existing browser production. Custom character art, performance capture and broader hardware testing remain additional production work; this release does not establish AAA parity or guarantee zero stalls on every system.

Final automated verification: **249 tests passed**; syntax checking passed for **57 application/vendor modules**.

The ten-infected shooting/melee sample completed 180 frames with zero shader, geometry or texture growth. CPU median/p95/max was 6.9/7.8/10.0 ms; GPU was 13.0/16.5/21.7 ms. This heavier case still showed occasional GPU variation, despite eliminating first-use shader work. Thirteen prepared story scenes passed first-use checks across all chapters; the maximum sampled CPU time in their first six updates was 11 ms. Held aim/fire, releasing either button, and releasing both passed with and without pointer lock.

All four directed boss introductions passed control/pause/return and resource-stability checks. Native checks for seated-magazine interruption, moving shutter navigation, graphics switching and paused cutscene resizing also passed. The resize fixture waits for an actual background-tab redraw rather than assuming a frame arrives within 60 ms. Final browser console checks reported no warnings or errors.
