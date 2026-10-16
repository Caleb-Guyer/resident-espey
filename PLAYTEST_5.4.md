# Resident Espey 5.4 — human character performances

Verified October 16, 2026. All browser tests used an isolated localhost preview with master and dialogue output constrained to zero before initialization. Review controls are outside the published repository.

## Character art

Production survivors use six MIT-licensed Microsoft Rocketbox actors: distinct heads, correctly wrapped skin/clothing maps, modeled mouths, eyes and ears, skinning and alpha hair. Ethan uses the artist's curly hairstyle with blonde hair and blue iris material adjustments. Earl uses the source Black actor. Some supporting roles reuse these six actors with clothing tints. The former generated portrait faces and procedural human bodies remain only in the legacy fallback path; no generated survivor portrait is used by the production human renderer.

The imported geometry, textures and clips are shared. Each performer owns its skeleton, materials, expressions, animation actions and pose state. Head color maps retain 2K resolution, with 1K body and surface maps. Original MIT attribution and the source revision are recorded in LICENSED_ART.md and the shipped asset license.

## Facial and body acting

Twenty-two retained facial shapes provide jaw and articulated lips, blinks, brow tension, smiles/frowns, lid tension and eye direction. Scene-specific fear, pain, regret, resolve and relief affect both speakers and listeners. Eye direction and small head turns follow a visible scene partner. Blink schedules differ between performers.

The existing recorded dialogue is retained. A 40 Hz envelope is computed from each decoded clip during preparation; mouth motion closes during silence and at the actual recording's end. Text-based mouth shapes approximate articulation. This is audio-timed animation, not captured facial performance or forced phoneme alignment.

Nine authored body clips provide breathing, listening, neutral/nervous conversation, seated/crouched poses, slow walking and injured walking. Blending eases movement and dialogue changes. Imported bone axes are respected by procedural offsets. An unmodified pose is restored before each sample so repeated paused updates cannot accumulate gaze or IK rotation. After the road collapse, the recalled Landon continues to animate while hidden actors are skipped.

Injured arms use an outward elbow bend and hand support rather than folding into the torso. Hall's syringe follows a hand-mounted needle anchor and a finger grip; Earl's bracing palms follow the actual skeleton. IK retains segment lengths and story-controlled actor roots.

## Warmup and verification

Story preparation renders two complete small-viewport shadow passes, including the final scene light state. Unmapped rigid stage props use a stable depth material, preventing the moving syringe from exposing a new shadow variant after a mapped wall. The previous bounded rendering queue and combat optimizations remain in place; no fullscreen postprocessing or new render target is added.

**268 automated tests passed**, including actual packaged model parsing, six distinct UV heads, normalized skin weights, independent actor state, seated/crouched eye heights, drift-free locomotion, wrist contact, paused pose/finger stability, multiple lip shapes, silent audio envelopes and complete shadow warmup state restoration. Syntax checks passed for **63 modules**.

Native browser checks sampled **165 dialogue moments across all thirteen scenes**, decoded all **55 story clips**, and repeated paused skeletal samples. Expressions were finite, each actor retained its own state, and paused bones/cameras held. After scene warmup, sampled playback created **zero additional programs, geometry buffers or textures**. Maximum sampled CPU submission/update time ranged from **1.2 to 3.3 ms by scene**.

A separate camera sweep sampled the beginning and midpoint of all **75 shots** (**150 samples**) using the final character assets. Subjects stayed framed and paused cameras held. No late programs or GPU resources appeared. These are paced workload samples on the test system, not a foreground FPS benchmark or a guarantee for other hardware.

Normal preparation passed all three chapters (3, 3 and 7 cached scenes). Starting a prepared scene produced no late shader/resource growth; the largest sampled first-six-update CPU total was **7 ms**. Master and dialogue gains stayed zero throughout QA.
