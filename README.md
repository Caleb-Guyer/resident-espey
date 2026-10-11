# Resident Espey: The Last Bell

**[Play on the web](https://caleb-guyer.github.io/resident-espey/)**

Some places remember you. Some refuse to let you go.

A complete, original 3D browser survival-horror campaign starring **Ethan Espey**, with blonde curly hair and blue eyes. Inspired by the supplied *Chapa Trilogy II*, especially the Backrooms serial and Ethan's outbreak notebook, and the exploration and resource tension of Resident Evil.

![Resident Espey cover](dist/assets/cover.webp)

## The campaign

1. **The school that remembers.** Keep Joel alive in the infected halls of Smithson Valley, restore power, and survive Chris's charge.
2. **The people the maze remembers.** Follow Landon's chalk through the Backrooms, face Caleb Zsiga and Lil Birdy, confront Jakob, and align the Geographer's Seal.
3. **Remember everyone.** Return to Room 204, learn the truth about Coach Hall's serum, face Stage IV Zebene Martine, and choose what the last page says.

Three difficulties. Three endings. Six notebook pages. Three allies whose names can be anchored. Original procedural 3D environments, animated character rigs, lighting, soft shadows, directional flashlight, particles, generated audio, and a cinematic cover. No runtime CDN, accounts, purchases, or API keys are needed to play.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD / arrow keys |
| Aim / fire | Mouse / hold left click |
| Interact / talk / collect | E |
| Reload | R |
| Knife | F / right click |
| Dodge | Space |
| Sprint | Shift |
| First aid | Q |
| Map / notebook | M / J |
| Pause | Escape / P |

Touch devices get a movement stick and action buttons; the sidearm targets the nearest visible enemy. Keyboard and mouse provide the best experience. A current WebGL 2 browser with hardware acceleration is required. Choose Performance in Settings on slower devices.

Blue checkpoint terminals restore vitals and save the game. Major discoveries and chapter changes also save. Saves and preferences stay in the current browser. Browser storage restrictions may limit saves to the current session. The infinite knife prevents an ammunition softlock.

For the strongest ending, talk to each ally, recover at least four notebook pages, and choose to read the names over the PA. The seal sequence is hinted in Landon's dialogue and Aldo's margin.

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
- `dist/main.js`: interface, journal, map, puzzle and ending scenes.
- `dist/audio.js`: local Web Audio sound design.
- `tests/campaign.test.mjs`: reachability, collision, combat, resource, save and ending checks.

The source PDF is not distributed in this repository. This is a fictional, original adaptation; its dialogue and endings were written for the game. Not affiliated with Capcom. Three.js is MIT licensed; see `dist/vendor/THREE-LICENSE.txt`. See [art direction](ART_DIRECTION.md) for the generated cover's prompt and character correction.
