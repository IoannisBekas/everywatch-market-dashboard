# ANYONE CAN, the EffectCraft edition

A 20 s, 16:9, 60 fps motion piece with voice-over and music, modelled on MotionLoved's
"Anyone can". The whole thing is built and rendered in [EffectCraft](https://github.com/storytold/effectcraft),
the open-source After Effects alternative. `build.jsx` is an After Effects-style script, and EffectCraft
runs it headless to create every comp, layer, keyframe, expression and effect.

132 BPM, 11 bars. Every cut and every hit lands on the beat grid.

| Bars | Section | What happens |
|---|---|---|
| 1-2 | 01 HOOK | ANYONE / CAN / MAKE slam in on the beats, then a nine-tile style mosaic assembles under a giant THIS |
| 3 | 02 WITHOUT | `without▌` types, AFTER EFFECTS slams in with a blue fringe, then a white bar strikes it out and dots pop |
| 4-5 | 03 DESCRIBE | JUST / DESCRIBE / IT. next to a chat card that types the prompt. The pointer clicks send and a burst floods the frame |
| 6 | 04 SCRIPT | ✱ CLAUDE WRITES THE SCRIPT. Then an app window opens from the corner |
| 7-8 | 05 BUILD | An EffectCraft-style UI: the script types itself, the viewer plays the hook, layers land on the beats and keyframes pop |
| 9-10 | 06 RENDER | A film strip of the earlier sections (live precomps, time-remapped), plus a render counter running to 1200 / 1200 |
| 11 | 07 ANYONE CAN | End title |

The HUD runs on expressions: timecode, the BPM beat squares, the bar counter and the section tags.

## Build and render

```sh
./fonts.sh                                   # Archivo Black, Instrument Serif, JetBrains Mono (OFL) → fonts/
./voiceover.sh                               # optional: regenerate vo/ and anyone-can-mix.wav
export EFFECTCRAFT_FONT_DIRS=$PWD/fonts
effectcraft-cli script build.jsx --save-as anyone-can.ecproj
effectcraft-cli render anyone-can.ecproj --comp Main --out anyone-can-effectcraft.mp4 \
  --format h264 --bitrate 24000 --audio on --progress
```

`anyone-can.ecproj` is the generated project, ready to open in the EffectCraft app. It references
`anyone-can-mix.wav` next to it.

## Open it in EffectCraft

1. Install EffectCraft 0.16 or newer from [getartcraft.com](https://getartcraft.com/apps/effectcraft)
   or the [GitHub releases](https://github.com/storytold/effectcraft/releases).
2. Run `./fonts.sh` and install the TTFs it puts in `fonts/`. On Linux you can instead launch with
   `EFFECTCRAFT_FONT_DIRS=$PWD/fonts effectcraft anyone-can.ecproj`.
3. Open `anyone-can.ecproj` with `anyone-can-mix.wav` beside it. It opens on the `Main` comp, and each
   section is a nested comp (`01 Hook` … `07 End`).

The web build of EffectCraft only has its bundled fonts (no system fonts), so use the desktop app.

## Notes from building it

- `layer.property("Position")` on a shape layer resolves to the first content group's Position.
  Use `layer.transform.position`.
- The expression and scripting engine (boa) has no `String.prototype.substr`, so the script uses `slice`.
- Nested comps render without their background colour, as in After Effects, so each section has
  its own background solid.
- A time-remapped precomp layer still ends at its source's duration until you extend its out point.

## Credits

- Voice: Piper TTS, voice `en_GB-cori-high` (trained on public-domain LibriVox recordings).
- Music and sound design: synthesized in `soundtrack.py` (numpy/scipy).
- Type: Archivo Black, Instrument Serif and JetBrains Mono (SIL OFL), plus Inter (bundled with EffectCraft).
