# Resident Espey 4.7 verification (final build 4.7.1)

October 12, 2026. Browser testing used an isolated local origin with master volume zero. Existing public and local game tabs and preferences were preserved.

183 automated tests pass; syntax checks cover 36 game modules. Added checks cover overlapping enemy separation, preserved isolated pursuit speed, swept grazing charge hits, directional damage, interpolated crouch camera/bullet/muzzle/ejection height, weapon obstruction and sight recovery, camera-safe raised poses, anchored sleeve continuity, shared environment ballistics, prop-aware encounter cameras, shutter/projectile clearance, paused hazards, decorative zero-damage effects, and boss-defeat cleanup.

The browser exercised the actual gun model beside a wall, firing while tucked, stepping back into a settled aim, smooth crouching, directional injury CSS, and two overlapping enemies moving apart. Those enemies separated to 0.94 m. That run generated no new shaders or geometry. All 24 sampled camera positions across the four boss introductions remained clear of walls and props.

The scripted campaign walk reached all nine objectives through actual movement and navigation. Enemies were frozen and bosses resolved through test controls, so this verifies route accessibility rather than difficulty balance.

The versioned production UI loaded the checkpoint, reached the survivors' shelter, opened Pause and Settings, and changed to Performance graphics. Preparation returned to Pause with ammunition and vitals retained and both audio sliders at zero. No console errors or warnings were captured.

Each weapon fired 48 times using its prepared effects. Reload ammunition totals and saved active inventory were retained.

| Weapon | CPU median update / submission | Maximum | Shader / geometry growth |
| --- | --- | --- | --- |
| Sidearm | 3.6 ms | 4.9 ms | 0 / 0 |
| Shotgun | 1.6 ms | 3.2 ms | 0 / 0 |
| Carbine | 1.5 ms | 2.3 ms | 0 / 0 |

These are controlled CPU measurements on this computer, not GPU elapsed time or a frame-rate guarantee on other devices. No console warnings or errors were captured during these checks.
