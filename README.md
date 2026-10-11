# Resident Espey: The Last Bell

**[Play on the web](https://caleb-guyer.github.io/resident-espey/)**

Some places remember you. Some refuse to let you go.

A complete, original **first-person** browser survival-horror campaign starring **Ethan Espey**, with blonde curly hair and blue eyes. Inspired by the supplied *Chapa Trilogy II*, especially the Backrooms serial and Ethan's outbreak notebook, and the exploration and resource tension of Resident Evil.

![Resident Espey cover](dist/assets/cover.webp)

## The campaign

1. **The school that remembers.** Keep Joel alive in the infected halls of Smithson Valley, restore power, and survive Chris's charge.
2. **The people the maze remembers.** Follow Landon's chalk through the Backrooms, face Caleb Zsiga and Lil Birdy, confront Jakob, and align the Geographer's Seal.
3. **Remember everyone.** Return to Room 204, learn the truth about Coach Hall's serum, face Stage IV Zebene Martine, and choose what the last page says.

Three difficulties. Three endings. Six discoverable memories. Three allies introduced through staged scenes. Enclosed classrooms, worn tiles and plaster, stained Backrooms wallpaper, furnished rooms, detailed faces, articulated creature rigs, flashlight shadows, fog, particles, directional growls, and a visible sidearm with recoil, iron sights and reload animation. No runtime CDN, accounts, purchases, or API keys are needed to play.

Version 3.1 adds 77 packaged, AI-generated dialogue recordings across all 13 story scenes, survivor conversations and gameplay dialogue. Ethan, Joel, Hall, Landon and the rest of the cast have individual voices; radio transmissions and the Backrooms mimics have dedicated treatments. Dialogue lowers the effects mix while someone speaks. Master volume and dialogue volume are separate, and subtitles are optional in both gameplay and cutscenes. Pausing resumes speech from the same position; skipping or leaving a scene stops its recordings. [Audio production and voice credits](AUDIO_PRODUCTION.md).

The story unfolds through real-time scenes and object-triggered flashbacks, with an optional notebook. Moving and dodging follow your view direction; bullets use a three-dimensional ray with headshots and furniture occlusion. Existing browser checkpoints remain compatible. If a saved position conflicts with a new wall or prop, Ethan returns to the chapter's starting sanctuary with his discoveries intact.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD |
| Look / fire | Mouse / hold left click |
| Aim down sights | Hold right click |
| Interact / talk / collect | E |
| Reload | R |
| Knife | F |
| Dodge | Space |
| Sprint | Shift |
| Crouch | Ctrl / C |
| Quick turn | X |
| Flashlight | G |
| Keyboard look | Arrow keys |
| First aid | Q |
| Map / notebook | M / J |
| Pause | Escape / P |

Click the scene to capture your mouse. Escape releases it and pauses the game. If the browser does not support capture, hold right click and drag to look, or use the arrow keys. Touch devices use a left movement stick, a right drag area for looking, and action buttons; AIM toggles the sights. Keyboard and mouse provide the best experience. A current WebGL 2 browser with hardware acceleration is required. Choose Performance in Settings on slower devices. Sensitivity, field of view, audio, subtitles and reduced camera movement are adjustable.

Blue checkpoint terminals restore vitals and save the game. Major discoveries and chapter changes also save. Saves and preferences stay in the current browser. Browser storage restrictions may limit saves to the current session. The infinite knife prevents an ammunition softlock.

For the strongest ending, meet all three allies in the chapter scenes, recover at least four memories, and call everyone home over the PA. The seal sequence is shown in a flashback and repeated in Landon's dialogue. Reading notebook entries is optional.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm run dev
```

Open `http://127.0.0.1:4387`. ES modules require an HTTP server rather than opening the HTML file directly.

```sh
npm test
npm run check
```

GitHub Actions tests the campaign and publishes the `dist/` directory to GitHub Pages on every push to `main`.

## Project structure

- `dist/data.js`: campaign, source-inspired notebook text, maps, navigation and save validation.
- `dist/game.js`: combat, AI, progression, checkpoints and game loop.
- `dist/world.js`: Three.js environment, character rigs, materials, lighting and effects.
- `dist/fps.js`: view-relative movement, first-person ballistics and prop collision.
- `dist/main.js`: interface, journal, map, puzzle and ending scenes.
- `dist/audio.js`: local Web Audio sound design.
- `tests/campaign.test.mjs`: reachability, collision, combat, resource, save and ending checks.

The source PDF is not distributed in this repository. This is a fictional, original adaptation; its dialogue and endings were written for the game. Not affiliated with Capcom. Three.js is MIT licensed; see `dist/vendor/THREE-LICENSE.txt`. See [art direction](ART_DIRECTION.md) for generated asset provenance and prompts.

## Cinematic edition (3.0)

The three-chapter story now unfolds through thirteen real-time 3D sequences: the outbreak opening, two chapter arrivals, six object-triggered memories, a final choice scene, and three distinct endings. Scenes use staged characters, camera cuts and dolly moves, lighting, concise dialogue captions, and local sound design. They are pausable and skippable. There is no recorded voice cast.

Open the survivor closet, inspect Joel’s chair, touch the running shoes, examine the seal, find Hall’s whistle, and open the unwritten notebook to see the flashbacks. Each discovery keeps a name and a practical clue. The optional notebook supports scene replay and expanded prose. Four memories and all three allies unlock the full rescue ending. Allies are now introduced through the chapter scenes; separate conversations add context. Existing browser saves remain compatible.

The title menu and HUD have been rebuilt around a restrained survival-horror presentation. Objectives fade after a few seconds, ammunition and health stay legible, and encounters remain first person. Ethan retains blonde curly hair and blue eyes, with new facial textures and articulated survivor arms.

Verification: Node campaign, combat, cinematic timing, pause/skip lifecycle, camera isolation, and story content tests; browser previews of all 13 scenes, object-triggered discovery, route reachability with furniture, and responsive UI.
