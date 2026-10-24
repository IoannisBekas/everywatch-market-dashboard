# THE BLANK — mathe_ai showreel

A 15 s, 120 BPM loop. The underscore in **mathe_ai** is the blank you're asked to fill in.
It stretches into a number line, and everything else grows out of that line: π, Euler's
identity, a run of shape morphs, a 3D surface, a data chart, and an AI answer. At the end
it snaps back into the name. The last frame is the first frame, so the clip loops.

- Typeface: Geist (variable font for kinetic weight, Bold outlines for morphs + title)
- Palette: ink `#0B0B0C`, paper `#F2EFE8`, vermilion `#FF4B1F`, cobalt `#2E4BFF`
- Camera: rides the line to the right, whips on downbeats, cranes once in bar 4

| Bar | Time | Technique |
|---|---|---|
| 1 | 0–2 s | Hook: title → line, a ring rolls out π |
| 2 | 2–4 s | Kinetic type: e^iπ + 1 = 0 rises out of the line |
| 3 | 4–6 s | Shape morph: 0 → disc → triangle → star → square |
| 4 | 6–8 s | 2D → 3D: the line multiplies into a surface |
| 5 | 8–10 s | Data: surface → samples → bars → sort → fit |
| 6 | 10–12 s | UI: the line folds into an input card, ∫₀^π sin x dx = 2 |
| 7 | 12–14 s | Strongest: each letter of the name morphs out of an earlier motif |
| ½ | 14–15 s | End title, settles back onto frame 0 |

## Files

- `src.html`: the source. `window.seek(t)` draws any time t, with nothing carried between
  frames. `window.renderAudio()` renders the soundtrack with `OfflineAudioContext`.
- `build.js`: inlines the Geist font and flattened glyph outlines → `mathe_ai.html` (one file).
- `render.js`: Playwright driver. It renders stills, the WAV, and the 60 fps video: 3 slices per frame
  (180° shutter) blended with ffmpeg `tmix`, 6 temporal samples per slice in the page,
  then the audio is muxed in.

```sh
npm install && npx playwright install chromium
npm run build
npm run stills -- 0.3 0.8 1.3      # any times, one PNG each
npm run audio && npm run video     # needs ffmpeg on PATH
```
