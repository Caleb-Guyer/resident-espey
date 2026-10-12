# Resident Espey 4.8 verification

## Automated checks

- All **190 tests** pass. Seven new checks cover the baked hand topology, smooth unit normals and clone independence; invalid binary input; outward loft normals; planted-foot gait; the new fixture envelopes and wall support in every chapter; dynamic weapon lighting; and zero dialogue gain before connecting the output.
- All **39 game modules** pass syntax checking. The offline hand baker also passes syntax checking.
- Existing tests retain centered sights, recoil settling at different frame rates, reload interruption and ammunition conservation, shotgun pellet rules, save compatibility, animated boss hit volumes, five-phase progression, cinematic timing, wing removal and route clearance.

## Muted browser verification

QA master and dialogue volume are hard-set to zero before play, and the test page's volume setters enforce zero. The rebuilt-art inspection also reported zero voice gain. Tests do not alter the shipped game's volume preferences.

The browser loaded the prepared hand surfaces with **30,072 right-hand vertices** and **25,142 left-hand vertices**, and the new material atlas. Both Birdy eyes reported physical eye geometry and mesh eyelids. Actual dressed rooms added cabinets/plumbing counts of **2/1**, **0/2** and **3/2** in the school, Backrooms and breach chapters.

All **339 wall fixtures** passed wall support, mutual overlap and doorway checks across the three chapters. All **28 authored room entrances** remained clear. A controlled route walk passed all **nine objective stages**, including the Birdy-gated fragment and primary boss triggers. This walk makes Ethan invulnerable and freezes ordinary enemies; it verifies access and progression rather than game difficulty.

All **24 sampled boss-introduction camera positions** remained clear of the actual walls, shutters and furniture after the environmental changes.

For **48 shots per firearm**, followed by reload interruption and saved-inventory checks:

| Weapon | Median CPU action/render submission | Maximum | Geometry growth | Shader growth | Ammunition/save |
| --- | ---: | ---: | ---: | ---: | --- |
| Sidearm | 3.9 ms | 6.1 ms | 0 | 0 | Pass |
| Shotgun | 2.2 ms | 3.7 ms | 0 | 0 | Pass |
| Carbine | 1.6 ms | 2.1 ms | 0 | 0 | Pass |

These measurements are from this machine's warmed local high-quality browser preview. They measure the action plus CPU rendering submission, not complete frame time or cold startup/network latency. No browser errors or warnings appeared in these checks.

The fixed-camera rendering profile sampled all five stages of each boss (300 frames each), including crushed Bobby and both missing Birdy wings. Every boss reported **zero geometry and shader growth** after preparation, and no browser errors or warnings:

| Boss | CPU median / p95 | GPU median / p95 |
| --- | ---: | ---: |
| Chris | 1.8 / 2.7 ms | 3.3 / 31.7 ms |
| Jakob | 2.0 / 2.6 ms | 13.9 / 32.2 ms |
| Zeb | 2.1 / 3.3 ms | 3.3 / 31.2 ms |
| Lil Birdy | 1.7 / 2.4 ms | 2.7 / 32.1 ms |

GPU timing showed intermittent slower frames, with maxima of 33.8–36.7 ms in this background browser. The profile covers warmed rendering and damage variants at a fixed camera; it does not simulate the full enemy AI or guarantee a locked frame rate. Performance mode remains available. The improvement removes hand sculpting from normal startup and preserves resource reuse; it is not evidence that every source of stutter is eliminated.

## Visual review and limits

Reviewed the new shotgun silhouette, hand shading, worn steel, wall finish and floor scale; inspected Birdy's eyes and face in his introduction. An initial eye treatment was oversized, so the eye radius, exposed opening, corneal opacity and lid opening were reduced. Wall texture sampling was changed to avoid hard repeat seams. Boss teeth now vary in size, tilt, staining and damage, and pale body skin uses softer pore detail.

The original browser game still uses authored procedural anatomy, cached meshes and real-time WebGL. This release is a substantial visual improvement, not a claim of parity with a commercial AAA production. Performance differs with graphics settings, GPU, browser and device. The prebuilt hand asset moves sculpting work out of normal game startup, while chapter asset download, shader preparation and uploads still happen during loading.
