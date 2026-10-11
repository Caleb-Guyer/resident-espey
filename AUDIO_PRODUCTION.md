# Resident Espey dialogue production

Release 4.0 contains **98 unique spoken lines**, approximately **5 minutes 21 seconds** of packaged speech. All 13 story scenes, nine survivor conversation lines, and gameplay dialogue are voiced. These are **AI-generated fictional character voices**, not recordings of human performers or voice clones of the people named in the source stories.

Speech was synthesized locally with [hexgrad’s Kokoro-82M v1.0](https://huggingface.co/hexgrad/Kokoro-82M) through [kokoro-onnx 0.4.9](https://github.com/thewh1teagle/kokoro-onnx). The speech model is Apache-2.0; kokoro-onnx is MIT. Generation dependencies and model weights are not bundled with the game. The shipped files are finished MP3 dialogue recordings; playback makes no requests to an AI provider and needs no API key.

## Cast direction

Each character uses a separate blend of voice styles, with individual pacing and mastering. All voices use English phonemes. Blend weights refer to the first style listed.

| Character | Voice styles | Blend | Pace | Treatment |
| --- | --- | --- | --- | --- |
| Ethan | am_puck / am_fenrir | 65% | 1.03 | Clear, direct protagonist |
| Joel | am_michael / am_liam | 65% | 0.95 | Softer and hesitant |
| Coach Hall | am_fenrir / am_onyx | 65% | 0.98 | Lower, restrained authority |
| Landon | am_echo / am_michael | 55% | 1.00 | Practical, measured delivery |
| Luke | am_puck / am_eric | 55% | 1.07 | Brighter and quicker |
| Luke’s borrowed voice | Same blend as Luke | 55% | 0.91 | Slower, doubled echo |
| Earl Britt | am_eric / am_fenrir | 50% | 1.04 | Rougher and urgent |
| Paul Cauley | am_michael / am_puck | 40% | 1.00 | Focused discovery |
| Mr. Johnson | bm_george / am_fenrir | 75% | 0.96 | Measured teacher |
| The Gentleman | bm_fable / am_onyx | 70% | 0.88 | Lower pitch, restrained echo |
| Nathan Nunley | am_onyx / am_echo | 75% | 0.98 | Filtered radio guide |
| Lil Birdy | af_nicole / af_bella | 75% | 0.90 | Airy voice, doubled echo |
| Jakob | am_adam / am_fenrir | 60% | 0.92 | Rough, clipped calls |

Recordings are mono MP3 at 24 kHz / 96 kbps. Leading silence is trimmed, a short tail is retained, and dialogue is normalized to -18 LUFS with a -2 dB true-peak target. Character names and “Room 204” have pronunciation substitutions in synthesis input; displayed dialogue keeps its original spelling. Creature echo is baked into their clips. Radio filtering is applied during playback.

## Runtime behavior

`dist/dialogue.js` is the shared dialogue catalogue. `dist/voice-assets.js` records each clip’s text, speaker, file and measured duration. Stable clip keys are based on character identity and the complete dialogue text. `dist/voice.js` schedules recordings against the Web Audio clock, queues gameplay conversations, caches decoded clips, pauses at the current offset, and cancels stale loads when a scene is skipped. `dist/voice-timeline.js` expands dialogue beats when necessary, shifting cameras, actors and prop cues together.

A failed scene download stops its timeline and offers retry or an explicit caption fallback. Subtitles stay independent of audio volume. Dialogue automatically lowers the existing effects mix; muting speech restores that mix. Preferences and old game checkpoints remain compatible.

## Model provenance

The model and voice bank were downloaded from the upstream kokoro-onnx release `model-files-v1.0`.

- Model SHA-256: `7d5df8ecf7d4b1878015a32686053fd0eebe2bc398234608764cc0ef3636a6c5`
- Voice bank SHA-256: `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`

The tests check every shipped recording, complete script coverage, scene timing, pause offsets, queued speech, subtitle-independent playback, cancellation during downloads, loading errors, and the audio mix.

## Reproduce the recordings

The optional production scripts require Python 3.12 and the dependencies in `scripts/voice-requirements.txt`. Download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from the upstream release into a separate local model directory. Run `node scripts/export-dialogue.mjs`, then `python scripts/generate-voices.py --model-directory <absolute-model-directory>`. Raw recordings and production metadata stay in the ignored `.openai/local/` directory. The script reuses existing recordings; remove a specific raw WAV and its corresponding MP3 before producing a new take. Normal game development and tests do not require Python or these dependencies.
