# Resident Espey 5.5.0 — deeper optimization

Verified October 16, 2026. QA used a separate localhost server, with master and dialogue volume zero before initialization and volume setters held at zero. The user's existing server was untouched. Profiling controls and original comparison assets remain outside the published game.

## Changes

- Zombie cuts now reject entire hidden triangles in the vertex shader. Every triangle has one region and split boundary vertices, so moving all three vertices outside the clip volume retains the original cut while removing its per-pixel region lookup/discard. Skin, depth and distance-shadow materials share the live mask.
- Fixed wall instances are divided into 9.6-unit spatial groups. The renderer can cull and order these groups independently. All instance matrices, colors, surfaces, shadows and wall geometry remain intact; no per-frame instance sorting or buffer rewriting is required.
- Prepared hand and boss meshes have lossless vertex-cache/fetch reordering. No triangles are removed or simplified, and normals, UVs, morph targets, material groups and skin weights are preserved. The pinned MIT-licensed [meshoptimizer encoder](https://github.com/zeux/meshoptimizer/blob/master/js/README.md) runs offline, with no new browser dependency.
- Prepared hands use an asynchronous gzip download, with a prepared compatibility fallback. Hosts that transparently decompress the asset are supported. Creature meshes use a new asset URL to avoid reusing the previous cached buffers; previous asset URLs remain available for cached clients.
- Sculpt-buffer validation yields between attributes on a 4 ms work budget, retaining full finite-value/index validation and atomic cache replacement. Individual validation steps remain synchronous.
- Empty hazard pools no longer resend unused GPU instance buffers. Active projectiles, stains and waves continue to update.

Resolution, antialiasing, texture sizes, enemy counts, animation rates, shadows and model detail are retained.

## Controlled GPU comparisons

High quality at 1920 × 1080, pixel ratio 1.5, shadows enabled. A fixed posed Zeb and ten infected are drawn in alternating original/optimized passes of 120 accepted submissions each. The harness uses asynchronous disjoint-checked GPU timer queries, a 16 ms task gap and the production nonblocking GPU queue bound. Programs and resources are warmed before measurement. These are rendering-work timings, not foreground FPS figures.

| Zombie cut path | GPU median / p95 / maximum (ms) |
| --- | --- |
| Fragment cuts, first | 13.63 / 17.10 / 19.24 |
| Primitive cuts, first | 13.05 / 16.32 / 18.49 |
| Fragment cuts, repeat | 14.03 / 18.01 / 21.28 |
| Primitive cuts, repeat | 12.49 / 14.71 / 15.57 |

Median GPU work improved about 4–11% in this isolated comparison. Both captured frames were byte-identical across 8,294,400 channels. Eight additional wound-mask comparisons, including every individual severed region and combined cuts, were also byte-identical. Actual shooting separately verified all five severable regions, detached parts and rare headless movement without new programs or GPU allocations.

| Wall batching | GPU median / p95 / maximum (ms) | CPU median / p95 (ms) |
| --- | --- | --- |
| Single batch, first | 12.50 / 13.60 / 14.45 | 4.5 / 5.3 |
| Spatial, first | 12.25 / 13.88 / 14.27 | 4.2 / 5.3 |
| Single batch, repeat | 12.09 / 13.01 / 13.92 | 3.8 / 4.5 |
| Spatial, repeat | 10.96 / 12.56 / 13.75 | 3.6 / 4.1 |

The breach used 43 spatial groups. Median GPU work improved about 2–9% in these passes; results are scene-dependent and are not additive with the cut-shader comparison. The crowded capture differed in 12 color channels, with maximum byte difference 12 at rasterization/depth ties. All twelve additional chapter-start/direction comparisons were byte-identical. Every timed pass had zero program growth.

The separate mesh-buffer A/B was also byte-identical. Its GPU medians were essentially unchanged (12.65/12.26 ms original versus 12.41/12.45 ms reordered) in this fragment-limited scene. The following cache results are a 32-entry LRU simulation, not an FPS claim:

| Mesh | Vertex cache misses before → after |
| --- | --- |
| Right hand | 47,856 → 38,361 |
| Left hand | 39,677 → 32,052 |
| Chris | 43,703 → 31,789 |
| Jakob | 87,565 → 62,440 |
| Zeb | 66,273 → 47,305 |
| Lil Birdy | 35,800 → 24,768 |

The hand asset changes from 3,754,540 to 2,377,879 stored bytes, about 37% smaller. The creature asset changes from 7,125,324 to 7,150,807 bytes (about 0.36% larger). Together the normal-path prepared-mesh payload is about 1.35 MB smaller; actual HTTP transfer behavior depends on host compression and caching. The old hand asset is retained only for compatibility fallback. Final hand and creature buffers use 16-bit indices where they fit; this halves hand index-buffer storage relative to the previous 32-bit format. The hand decoder accepts both format versions and rejects unsupported index widths.

## Verification

All **277 automated tests** and syntax checks for **64 application/vendor modules** passed. Tests verify every original vertex component and oriented triangle within its material group, morph preservation, cache reuse, spatial bounds/matrices/colors, uniform-driven cuts, empty-pool upload suppression, gzip/decoded-host/fallback loading, yielding validation and rejection without partial cache replacement. Existing coverage includes campaign progression, boss phases, gun stability, reload conservation, culling, dismemberment and recovery.

An isolated browser validation profile measured a 31.6 ms synchronous call. The yielding path used five CPU work slices of 4.2, 4.3, 5.2, 4.1 and 3.8 ms (25.5 ms total elapsed including yields). This is a measurement of that validation task, not total download/game-start time. Resource entries confirmed the final compressed hand asset loaded directly without requesting the compatibility fallback.

The final compact-index build completed 600 accepted combat frames per boss with ten infected, real enemy updates, weapon switching, shots and hazards. Every boss remained alive through the protected five-phase sample. Phase movies are bypassed in this timed harness; their actual staging and poses are covered separately.

| Boss | CPU median / p95 / maximum (ms) | GPU median / p95 / maximum (ms) |
| --- | --- | --- |
| Chris | 6.8 / 9.8 / 12.6 | 14.4 / 18.7 / 26.9 |
| Jakob | 6.2 / 8.7 / 10.8 | 13.6 / 26.6 / 50.1 |
| Zeb | 5.2 / 6.7 / 9.8 | 12.4 / 14.6 / 15.8 |
| Lil Birdy | 5.1 / 8.2 / 11.5 | 11.4 / 14.7 / 18.1 |

All 2,400 frames had zero program, geometry, texture and native-buffer growth. No browser errors were reported. The Jakob trace still contains a large GPU spike; cross-session timings are not a controlled speedup comparison and should not be read as a promise that every spike is eliminated.

All 13 story stages remained cached, with first-six-frame CPU totals peaking at 8/8/10 ms by chapter. The 165 human-performance samples passed without program or GPU-resource growth; per-scene CPU maxima ranged from 1.6 to 3.3 ms. Native severing tests passed for all five regions, retained the rare headless behavior and checkpoint state, and added no programs or GPU allocations. Graphics restoration passed during gameplay, a flashback and a boss sequence, preserving state and returning paused in 1.29–1.58 seconds.

This release reduces avoidable work and adds headroom. Browser/driver contention and the heaviest frames can still cause spikes; it does not promise identical frame rates on every system.
