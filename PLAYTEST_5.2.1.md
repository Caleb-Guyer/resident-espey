# Resident Espey 5.2.1 — crowded combat rendering

Verified October 15, 2026. All browser tests used an isolated localhost server, with master and dialogue volume zero before game initialization and setters constrained to zero. The user's existing localhost server was untouched. QA controls and instrumentation remain outside the published repository.

## Changes

The forward lighting shader retains its fixed light counts and warmed programs, but skips the physical BRDF when a light's final RGB contribution is exactly zero, after attenuation and shadowing. This avoids work for out-of-range, inactive and completely shadowed lights without removing lamps, changing their radius, reducing resolution or freezing shadows. Ambient, environment, emissive and area-light calculations retain their original paths. The shader transformation is idempotent and is installed before the renderer compiles any materials.

Boss skin meshes now use independent conservative local bounding spheres, retained through rig cloning. Fully off-screen bodies can be culled in both the color and shadow passes. Rigid faces, claws, wings and detached wings keep their own bounds. Loading still warms all meshes with culling temporarily disabled. Automated coverage checks the transformed support boxes of every skin influence across more than 450 fight, introduction, transition, injury and collapse poses. A weighted surface lies within the convex combination of these checked support bounds.

Blood stains keep the full 48-stain pool and original 75-second lifetime. Their instance matrices upload only after insertion, replacement or expiration changes the rendered pool; moving droplets still update every frame. An alpha cutoff of 0.000001 skips effectively transparent texture borders before lighting. Droplet, fragment and enemy budgets are unchanged.

## Same-session measurements

At 1280×720, high quality, shadows enabled, an animated Zeb and ten infected were measured in alternating original/optimized shader passes, 120 accepted frames per pass. A real nonblocking GPU submission budget and asynchronous GPU timer queries were used, with a 16 ms task gap between submissions. Shader variants were prepared before measurement. These are submission/render workload timings, not a foreground FPS measurement; background animation frames are throttled.

| Lighting pass | GPU median / p95 / maximum (ms) | CPU median / p95 / maximum (ms) |
| --- | --- | --- |
| Original, first | 9.05 / 10.86 / 12.84 | 4.7 / 5.3 / 6.0 |
| Optimized, first | 8.19 / 9.89 / 11.64 | 4.6 / 5.5 / 6.7 |
| Original, repeat | 8.88 / 10.90 / 11.93 | 4.5 / 5.4 / 6.3 |
| Optimized, repeat | 8.05 / 9.83 / 11.05 | 4.5 / 5.1 / 5.3 |

GPU median improved about 9.4–9.5%; p95 improved about 9–10%. All passes had zero program growth during measurement. A frozen-frame comparison across 3,686,400 channels found only two one-step byte differences; repeating the original draw was identical. The initial visibility-only prototype was byte-identical. Comparing frozen direct renders avoids animation state changes between timed passes.

A separate near-first opaque sorting experiment produced inconsistent improvements and higher CPU submission time, so the existing sort order was retained.

The same eleven-actor setup with all 48 blood stains populated compared the original lighting/transparent borders/repeated stain uploads against the complete optimization, again in alternating 120-frame passes:

| Full-gore pass | GPU median / p95 / maximum (ms) | Stationary blood uploads |
| --- | --- | ---: |
| Original, first | 9.23 / 9.42 / 10.27 | 120 |
| Optimized, first | 7.96 / 8.27 / 9.62 | 0 |
| Original, repeat | 9.41 / 10.13 / 12.48 | 120 |
| Optimized, repeat | 8.28 / 9.07 / 10.16 | 0 |

This case reduced GPU median about 12–14% and p95 about 10–12%. Zero program growth occurred within the measured passes. CPU medians varied from 3.4 to 4.9 ms; no general CPU speedup is claimed from those runs.

Native culling checks passed for all four bosses. Looking toward a boss retained its two or three body-material draws; turning fully away reduced those body draws to zero. Their main body meshes contain 38,704–97,720 triangles each. This excludes the separate rigid details and does not claim that all world rendering disappears when turning away.

## Verification

**253 automated tests passed.** Syntax checks passed for **58 application/vendor modules**. Added coverage checks light-guard scope and idempotence, conservative boss bounds, independent cloned bounds, stationary blood upload stability, pool compaction after expiration, overwriting, and continued movement of airborne blood. Existing checks cover phase progression, wing removal, the press chase, shooting while aiming, reload conservation, wound masks and graphics recovery.

The full-gore frozen-frame comparison also found only two one-step byte differences across 3,686,400 channels, with no larger differences. The repeated original frame was identical.

Combat traces run the actual enemy director, hazards, hit detection, recoil, gunfire and blood effects over 600 accepted frames per boss, with 120 frames at each of five stages. Each begins with ten infected. The harness switches among the sidearm, shotgun and carbine, and protects the boss from test damage so every stage remains active throughout its sample. Phase cinematics are bypassed in the timed loop; rendering bounds are separately checked through the actual cinematic poses.

| Boss trace | CPU median / p95 / maximum (ms) | GPU median / p95 / maximum (ms) |
| --- | --- | --- |
| Chris | 4.7 / 6.4 / 7.6 | 7.9 / 11.3 / 12.1 |
| Zeb | 4.9 / 6.2 / 8.3 | 8.1 / 10.7 / 12.4 |
| Lil Birdy | 4.5 / 6.3 / 8.3 | 7.6 / 10.6 / 11.7 |
| Jakob and Bobby | 5.0 / 6.4 / 8.0 | 9.3 / 11.6 / 13.5 |

These traces had no sampled GPU workload above 16.7 ms and no new programs, geometry, textures or native buffers during combat. Hardware, driver scheduling and foreground contention vary; this release adds GPU headroom and removes avoidable work rather than claiming zero stalls on every system.

Native forced-context-loss checks passed during gameplay, a flashback and a boss sequence. Each held simulation, preserved player resources, position and scene time, rebuilt the graphics resources and returned ready while paused (about 1.8–1.9 seconds in these samples).
