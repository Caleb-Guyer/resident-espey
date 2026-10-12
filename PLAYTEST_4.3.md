# Resident Espey 4.3.0 verification

Verified October 11, 2026. Browser checks used the desktop in-app browser at 1280 × 720, High graphics, with master and dialogue volume set to zero before audio initialization.

- `npm run check`: all 24 game modules parse.
- `npm test`: 88 passing tests. Coverage includes staged spawn reachability, committed attack tells, boss sequences and phases, headshot interrupts, projectile cover, fixed hazard storage, articulated model cloning, character appearance, dual head hit detection, wing folding, loading yields, reinforcement reuse, and warmup of offscreen and default-framebuffer shader variants.
- Full campaign browser walk: all nine ordered objectives completed, all three primary bosses defeated, shutters opened and the final choice reached.
- Navigation: every chapter and all four progression stages passed. Every room threshold remained clear; wall attachment checks inspected 329 mounted fixtures and 28 entrances across the three chapters.
- Boss simulation: Chris, Jakob/Bobby, Zeb and Birdy each released both distinct attack patterns and entered phase two. Chris and Bobby stopped on walls. Zeb's reinforcements entered correctly. All projectiles, pools and shockwaves expired. No runtime errors. Across the sampled battle frames, maximum combined update/render time was 28 ms and the 95th percentile was 2 ms.
- Combat stress: 24 attacks per chapter, 72 total, including shooting and melee. Maximum update/render samples were 5 / 1 / 5 ms. GPU geometry and texture counts stayed constant during each chapter's attacks. Effects expired and enemy coordinates stayed finite.
- Aimed firing: both mouse button orders and independent releases passed in pointer-lock and drag-look modes.
- Reloads: repeated empty and tactical reloads completed at exactly zero, transferred ammunition correctly and returned the magazine to its rest pose.
- Fresh menu flow: chapter preparation produced 41 painted loading frames, then the voiced opening and gameplay began. The first 240 cutscene frame intervals had a 5 ms maximum; the first 240 gameplay intervals had an 8 ms maximum. Neither sample contained an interval over 50 ms. No browser errors were recorded.
- Visual inspection: Birdy's thin brown hair and 6.8-meter articulated wings, Jakob/Bobby's separate brown-haired heads and fused bodies, and Zeb's dark skin and armored growths were rendered in the actual level environments. Earl's face and body skin identity is checked through the same cinematic actor construction path.

Timing values describe this isolated desktop verification run. Initial preparation happens on the loading screen; slower hardware and cold network downloads can take longer there.
