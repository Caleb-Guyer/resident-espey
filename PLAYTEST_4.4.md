# Resident Espey 4.4.0 playtest

Date: 2026-10-11

## Delivered changes

- Four bespoke sculpted boss bodies with continuous skin, facial anatomy, an original portrait atlas, articulated jaws and claws. Chris has an asymmetric heavy arm; Zeb has a hunched back and breathing bile sacs; Lil Birdy has layered feathers on articulated wings; Jakob and Bobby share a fused body with two heads and four arms and legs.
- Distinct locomotion, attack anticipation, follow-through, recovery, reactions and death poses. Turns ease toward a target rather than snapping. Anatomical hit capsules follow animated limbs.
- Four directed introductions use the actual creature and arena, existing packaged dialogue, camera cuts and timed creature actions. Combat stops while the scene plays. Completed or skipped introductions are saved; control returns with a short protection window.
- Short boss names, objectives, radio labels, interaction prompts, gate labels and menu text. Flashback period labels and voice credits remain available.
- Chapter loading prepares boss geometry, dialogue and shader variants before play.

## Automated verification

`npm test`: **99 passed**, zero failures. `npm run check`: syntax checks passed for all 28 checked modules.

Checks include closed surfaces, normalized skeletal weights, finite poses, skin-edge deformation under raised-arm and lunge poses, independent character materials and portrait shader cache keys, four unique camera sequences, packaged audio availability, protected return from cinematics, saved introduction flags, idempotent skip/cancel, shader warmup restoration, limb hits and smooth turns.

Existing campaign progression, ordered routes, endings, save compatibility, reload conservation, aim/fire mouse-button chords, deterministic recoil, weapon mechanics, clear doorways, voice pause/resume, flashback timing and bounded effects tests also pass.

## Browser verification

Local Chromium/WebGL 2, high graphics, 1280 x 720. Master volume was zero throughout all QA.

- Four boss introductions: pause held the clock; natural completion (Chris and Zeb) and skipping (Jakob/Bobby and Lil Birdy) restored control, preserved Ethan's position, saved completion and prevented automatic replay. GPU geometry and texture counts were unchanged during each introduction.
- Four boss fights: both attacks and second phases executed; charge collisions and recovery occurred; summoned creatures and effects expired correctly. Sampled update/render CPU time: maximum 7 ms, p95 2 ms; no samples exceeded 35 ms. This is a controlled local run, not a guarantee on other hardware.
- Four voiced boss introductions: packaged clips decoded, pausing held the audio clock, and skipping stopped every source. All audio stayed muted.
- All 13 existing voiced story scenes: 55 clips decoded, pause/resume/skip passed, and no speech source remained after release. All audio stayed muted.
- Full campaign fixture: all nine ordered objectives, gates, three primary boss encounters and the final choice remained reachable. This route fixture suppresses combat difficulty; it verifies progression, not difficulty balance.
- Visually inspected boss closeups and their introduction poses, including correcting chest deformation under Zeb's raised arms and the twins' intersecting inner arms.

The game remains a browser survival-horror project with procedural models and generated portrait textures. These checks do not establish commercial AAA fidelity or full cross-device performance coverage.
