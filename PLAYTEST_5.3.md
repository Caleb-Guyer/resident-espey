# Resident Espey 5.3 — cinematic direction

Verified October 15, 2026. All browser QA used a separate localhost server, with master and dialogue gain zero before initialization and setters constrained to zero. The user's existing localhost server was untouched. Review controls and instrumentation are outside the published repository.

## Editing and framing

All thirteen story scenes now use 75 authored shots. A conversation retains a chosen subject through gaps in speech, rather than sliding between an automatic speaker close-up and a distant master shot. Reverse angles retain their side of the action axis, with room for the actor's eyeline and foreground shoulder coverage. Establishing shots precede tighter coverage; injections, the collapse, the seal and the final departure receive specific visual beats. Several cuts lead dialogue slightly so a reaction can register before the next line.

The existing recorded dialogue is retained. Shot times, actor paths and prop cues are retimed with each performed line. Flashback and premonition labels, entry cards and explicit returns to the present remain. No new voice performance is claimed.

Camera targets use the actual posed head and prop transforms. Stage boxes clip a camera's sight segment before walls, doors or lockers can hide the composition. A paused shot retains its camera, actor pose and door state. Kneeling and sitting blend over half a second instead of dropping the actor and camera instantly.

## Performance and lighting

Human performers turn their heads toward a partner, with restrained speaking gestures and listening motion. A two-link arm solve brings Hall's syringe tip toward Joel's shoulder and Earl's hands to the closed door without stretching bones or moving their roots. Serum acquisition precedes the insert; contact and the heartbeat remain after Hall's instruction. The syringe has a narrow barrel, needle, plunger and dose marks. A paper prop stays on the table rather than following the hand.

Stage ambient and camera-facing fill are reduced; the side key and rim establish more shape and separation. Existing licensed photographed plaster materials dress the stage walls. The pass adds no fullscreen render target, depth-of-field, bloom or other postprocessing pass.

All four boss introductions have revised reveal movement and lens choices. Their arena key light is fitted inside the room below the ceiling, then stays fixed off camera instead of orbiting with every shot. The borrowed flashlight uniforms restore on exit. Camera fitting checks the sight line to the subject as well as the camera's own floor cell, with a bounded search and lens compensation when the arena forces a closer position. Wing-tearing coverage follows the actual wing joint.

## Verification

**261 automated tests passed.** Coverage includes performed-time shot mapping, held reactions across dialogue gaps, the action axis, immediate cuts, paused dollies, camera obstruction, wrist contact and preserved limb lengths, blended kneeling, and compatibility with a licensed infected sharing a story stage. Existing tests cover voice timing, pause, skip, completion, campaign progression, boss phases and graphics recovery.

Syntax checks passed for **61 application/vendor modules**. Native voice compatibility checks decoded all **55 story clips across thirteen scenes**, exercised pause/resume/skip and returned the voice system to idle. All output gains remained zero.

Native browser checks sampled the beginning and midpoint of every authored shot: **150 samples across all thirteen scenes**, each with a repeated paused draw. Subjects remained inside the visible frame; camera transforms and scene time held while paused. Warmed samples produced no new programs, geometry or textures. Sampled CPU submission/update maxima ranged from 1.2 to 2.8 ms by scene. These are paced workload samples, not a foreground FPS measurement or a guarantee across hardware.

The four boss introductions and five phase sequences passed **60 additional shot samples**, including the press, rupture and both wing tears. Paused poses and cameras held, the key stayed fixed across shots, and all borrowed flashlight uniforms restored exactly on cancellation. Warmed samples produced no new programs, geometry or textures; final sampled CPU submission/update maxima ranged from 2.8 to 3.7 ms by sequence.

Normal preparation across all three chapters also passed: all thirteen cached story scenes started without new GPU resources or programs. The largest sampled play-plus-six-update CPU total was 12 ms. Forced graphics loss during gameplay, a flashback and a boss sequence preserved resources, position and scene time and returned ready while paused.
