# Resident Espey 4.5.1 audit

Date: 2026-10-12

## Fixed behavior

- Point-blank rounds hit when their ray starts inside a boss head or body capsule.
- Phase movement speed applies consistently to both axes. Zeb and brutes use the same footprint while walking, charging and receiving knockback.
- Glancing impacts stop charges and expose the boss, instead of letting it slide along a wall. Charge warning lanes include all late attacks, use their actual travel distance and stop at obstacles. Wave rings use their actual radius.
- Vision checks use the height of the creature and Ethan. Tables block footsteps but do not act as full-height walls. Navigation can select a reachable approach when Ethan stands on the clear edge of a cell containing furniture.
- Interrupted attacks keep their stagger window. Settled corpses stop updating their skeletons.
- Lil Birdy must fall before the last fragment and a new Jakob encounter. His death grants 30 rounds and a checkpoint without marking Jakob dead. Older saves retain their discoveries and an already active Jakob encounter; Birdy must still fall before opening the seal. The HUD chooses the nearer active boss when an older save contains both.
- Boss checkpoints retain position and alertness as well as phase, damage, broken parts and cooldowns. Invalid positions fall back to a safe spawn.
- Malformed optional checkpoint arrays and statistics cannot crash Continue. Resource counts must be integers. Invalid settings retain finite field of view, sensitivity and audio values.
- Retries persist their increased death count. Pending checkpoint writes also flush when the page is hidden or leaves the browser.
- Gameplay time freezes in menus, loading and cutscenes. Starting control hints survive the opening, and changing boss instructions brings the quiet HUD back. Pausing immediately synchronizes health, ammunition and objective text.
- Death stops the remaining enemy and route updates in that frame, so it cannot be replaced by a boss introduction.
- Focus and visibility events pause story and boss scenes idempotently; an already paused scene cannot resume accidentally.
- Escape works with focused sliders, cancels an audio preview, and returns Settings/Controls to Pause on repeated visits. Lost pointer capture releases touch controls; separate fire fingers cannot cancel each other.
- Concurrent chapter loads do not rebuild the world twice, and loading ignores combat/movement input so it cannot interrupt preparation or queue a knife swing. Audio device failure does not block loading; caption fallback remains available. Failed radio captions advance and finish without an audio clock, and resuming requests a suspended audio context to continue.
- Module cache versions are consistent across the shipped build.

## Automated verification

`npm test`: **139 passing**, zero failures. There are **24 new regression checks**, plus the existing boss stages, reload conservation, aim/fire chords, weapon stability, route ordering, ending, voice timing, flashback and doorway checks. Syntax checks cover 31 modules. No new dependencies or external services are required.

## Browser verification

Local Chromium/WebGL 2, high graphics. All QA uses zero master volume.

- Actual boss checkpoint reload retained position, health, phase and alertness. Birdy's reward and fragment gate passed without completing the primary boss.
- Repeated focus-loss events kept a boss scene paused; gameplay time stayed fixed during pause.
- All twenty boss stages executed. The mandatory press, collapsed wings and arena reopening checks passed. The final stage run had a 4 ms maximum and 2 ms p95 of sampled update/render CPU work, with no samples above 35 ms.
- Full route fixture completed all nine objectives and three chapter gates, including rejecting the last Backrooms fragment before Birdy's defeat. This fixture accelerates combat and verifies progression rather than difficulty balance.
- Combat stress fixture completed 72 shooting/melee actions across the chapters. Combined action, enemy update and render CPU work had a maximum of 5 ms, with chapter medians of 2–3 ms. GPU geometry and texture counts did not grow, all effects expired, and transforms stayed finite. No browser errors were recorded in that run.
- Real Pause → Settings flow: changing the dialogue slider with master volume at zero, then pressing Escape on that focused slider, returned to Pause. Reopening Settings restored the discarded value. Repeated Settings/Controls visits and Back returned to Pause.
- With both AudioContext constructors disabled in the local seed, chapter loading still completed, the opening offered caption fallback, and skipping returned to gameplay with the movement and look hints visible. No uncaught browser errors were recorded.

Controlled local timing checks do not establish performance on every browser, GPU or device. The game retains its procedural models and packaged generated character dialogue.
