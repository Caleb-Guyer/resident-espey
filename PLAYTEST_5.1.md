# Resident Espey 5.1 — zombie combat verification

Verified locally on October 12, 2026. Browser checks used an isolated localhost fixture with both master and dialogue volume set to zero before audio initialization and volume setters constrained to zero. QA fixtures are outside the shipped repository.

## Automated checks

- 209 tests pass; 43 shipped modules pass syntax checks.
- Imported geometry retains UVs, normals and skin weights. Only cut boundaries duplicate vertices: the complete infected stays below 19,623 vertices, compared with 17,839 source vertices and 72,138 fully expanded triangle corners.
- Severed pieces retain the exact world-space pose at detachment; subsequent actor animation does not change their frozen skin matrices.
- Skin, depth and shadow shaders use the same region mask. Removed heads and limbs have no hit targets.
- Regional damage cancels an active rush, alters movement and attacks, and severs each region once. Natural crawlers keep wrists and ankles above the floor throughout a sampled walk cycle.
- Stable identity-based headless eligibility occurs in approximately 5% of a 10,000-identity sample. Ordinary decapitation is fatal; eligible survivors remain vulnerable to body damage.
- Save validation rejects invalid health, malformed injuries, forged ordinary headless states and blocked positions. Fatal reactions cannot award multiple kills or ammunition rewards.
- Blood effects are bounded at 192 droplets, 48 floor stains and ten active detached parts. Hundreds of bursts retain the original geometry and texture objects.
- Existing reload, aim/fire, shotgun pellet aggregation, boss phase, cinematic, input and campaign checks remain passing.

## Browser combat

The final real-weapon fixture aimed pistol shots at posed limb capsules and the animated head. Both arms severed after three shots. The left leg severed after two shots and the right after three because the tested identities had different resilience. Ordinary decapitation took three headshots. An eligible headless infected survived three headshots, moved during the following simulated pursuit and exposed zero remaining head targets.

The measured CPU work for a trigger pull plus immediate render stayed at or below 5.4 ms in this sample. All five regional damage cases retained the same GPU geometry and texture counts and compiled no additional shader programs. These are warmed, local measurements, not a guarantee for every device or network.

The actual Save/Retry flow restored a wounded authored walker at 114 HP with the same identity seed, severed left leg and zero visibility mask for that leg. Blood spray uses smaller dark droplets, and exposed wounds continue to drip while the infected is active or its death animation is playing.

All nine authored objective routes were traversed without a collision or progression failure. This route test freezes enemies and uses invulnerability; it validates navigation and gates, rather than representing a full human combat playthrough.

## Rendering workload

A 180-frame workload with ten animated infected on the high preset exercised standing, one-leg injury and crawling states. CPU work measured 3.9 ms median, 5.3 ms p95 and 6.2 ms maximum. Available GPU timer samples measured 3.8 ms median, 7.1 ms p95 and 55.4 ms maximum. Geometry, texture and shader counts grew by zero during the workload; console error capture was empty.

The isolated GPU spike remains a practical limitation of this measurement. It does not support a claim that every stutter is eliminated. Hidden-tab scheduling also makes the production-startup frame-interval sample unsuitable for an FPS claim. Cold downloads, mobile devices, extended sessions and human difficulty balancing still need broader testing.

## Art and gameplay scope

All ten ordinary infected roles use the licensed Rikindle3D textured skeletal model with different proportions, clothing tints, poses and three resilience variations. Screamers alert nearby enemies; armored infected reduce body damage; ferals accelerate when wounded. Matching textured fragments, exposed flesh and bone, blood spray and floor splatter supplement anatomical damage. The asset provenance and remaining production work are documented in [LICENSED_ART.md](LICENSED_ART.md).

Regular baseline health ranges from 168 for crawlers to 520 for brutes, before identity and difficulty adjustments. Appended supply caches preserve existing pickup IDs. Boss mechanics and the existing first encounter IDs remain compatible.
