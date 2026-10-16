# Resident Espey 5.4.2 — rendering and loading performance

Verified October 16, 2026 using an isolated localhost server. Master and dialogue gains were zero before initialization, with volume setters constrained to zero throughout QA. The user's existing localhost server was untouched. Test controls and profiling instrumentation are outside the published game.

## Changes

Flat, axis-aligned wall faces now sample each photographic PBR map once, replacing nine triplanar texture reads with three. UV projection moves to the vertex shader. Color, roughness, signed normal orientation and texture scale are retained. General surfaces keep the blended projection path.

Point lights are rejected before normalization, attenuation, shadow lookup and BRDF work when their color is zero or the fragment lies outside their existing positive cutoff radius. Nonpositive radii retain unlimited reach. This does not shorten light ranges or change light counts, shader variants, shadow quality, resolution, texture sizes, enemy counts or animation rates. The temporary vector is declared outside the loop because Three.js removes loop scope when unrolling shaders.

Chapter preparation no longer constructs disposable copies of licensed human rigs. Those avatars already load once, and the actual cinematic actors still receive full scene preparation. Reusable enemy and boss templates retain their priming pass. The previous path discarded four, six and five extra human instances in chapters one, two and three respectively; those instances now drop to zero.

## Image checks

Frozen direct renders isolate shader changes from animation and simulation. The point-light comparison in the crowded boss arena was byte-identical across all 8,294,400 channels; repeating the original was also identical. Frozen wall comparisons in all three chapters differed only by one byte step in 1,392, 170 and 154 channels respectively, with no larger differences. Original repeats were identical.

## Profiling method

High quality at 1920 × 1080, pixel ratio 1.5, shadows enabled. The crowd contains Zeb and ten infected archetypes. Alternating original/optimized passes use 120 accepted submissions each, a real nonblocking GPU queue bound, asynchronous disjoint-checked GPU timer queries and a 16 ms task gap. Shader programs are prepared before measurement. These timings describe submitted rendering work; background browser frame throttling means they are not a foreground FPS benchmark.

An isolated point-light range comparison, with the wall optimization active in both variants, measured:

| Point-light path | GPU median / p95 / maximum (ms) | CPU median / p95 / maximum (ms) |
| --- | --- | --- |
| Previous, first | 13.44 / 14.34 / 14.88 | 4.3 / 6.2 / 6.8 |
| Range rejection, first | 13.03 / 13.48 / 14.09 | 3.8 / 4.9 / 6.2 |
| Previous, repeat | 13.67 / 15.94 / 18.00 | 4.2 / 5.3 / 5.9 |
| Range rejection, repeat | 13.18 / 15.35 / 16.97 | 3.9 / 5.0 / 6.6 |

Median GPU work fell about 3–4% in this isolated comparison, with zero new programs during every timed pass. Wall-only and initial combined traces had substantial scheduling/animation variance; they do not justify a universal combined speedup claim. A back-facing BRDF experiment showed inconsistent benefit and was discarded.

A combined repeat reset the infected mixers between variants. Previous-path GPU median/p95 was 15.07/18.69 ms and 15.26/17.05 ms; the optimized path measured 14.27/16.61 ms and 13.16/20.99 ms. Medians improved, but the final optimized pass included a 31.97 ms maximum. This is evidence of remaining variability, not a claim that GPU spikes have disappeared. No programs compiled during any timed pass. Image equivalence is assessed using the separate frozen checks above, not the moving benchmark captures.

## Verification

All **271 automated tests** passed. Syntax checks passed for **63 application/vendor modules**. Added coverage checks point-light guard scope, unrolled-variable declaration, cutoff/unlimited behavior, shader-transform idempotence, the three-sample wall path and continued preparation of every story stage without discarded human copies. Existing coverage includes combat, reloads, gun stability, dismemberment, boss phases, culling, checkpoints, graphics recovery and cinematic performance.

Native checks confirmed all 13 story stages remained cached after preparation. The first-six-frame CPU totals peaked at 9, 8 and 8 ms by chapter. All 165 human-performance samples passed with no program, geometry or texture growth and no accumulated paused-pose offsets; per-scene CPU maxima ranged from 1.6 to 3.4 ms. Graphics-context recovery passed during gameplay, a flashback and a boss sequence, preserving player and scene state and returning paused in 1.49–1.63 seconds.

Loading traces confirmed ten template primes per chapter and zero discarded human rigs, with all 3/3/7 chapter stages retained. Whole loading durations varied by cache and driver scheduling, so the removed preparation work is not presented as a guaranteed reduction in total download/loading time.

A 600-frame Jakob combat trace completed all five phases with ten infected, actual enemy updates, hit detection and weapon switching. CPU median/p95/maximum was 5.7/7.3/10.1 ms; GPU was 15.3/28.5/42.7 ms at this 1080p output. The boss remained alive throughout the protected test and released Jakob, Bobby and wrath attacks. There were zero new programs, geometry, textures or native buffers, and no browser errors. High-load GPU spikes remain visible in this trace; bounded submission still protects against an unlimited queue.

This release removes avoidable GPU and loading work. It does not claim that every hardware or browser scheduling stall is eliminated.
