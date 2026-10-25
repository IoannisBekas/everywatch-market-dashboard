# mathe_ai, Lesson 01: "AI για κάθε μέρα"

A 30 s, 16:9, 60 fps lesson promo for Greek students (13–18) with Greek voice-over and music. In 30
seconds it teaches how to ask AI properly, three rules for using it, what to use it for every day, and
two cautions. The wordplay at its heart: "μάθε" is Greek for "learn", so mathe_ai reads "μάθε AI".

It is built from the prompt in [`../PROMPT-everyday-ai.md`](../PROMPT-everyday-ai.md) and rendered in
[EffectCraft](https://github.com/storytold/effectcraft). `build.jsx` is an After Effects-style script, and
EffectCraft runs it headless to create every comp, layer, keyframe, expression and effect.

128 BPM, 16 bars. Every cut and every hit lands on the beat grid.

| Bars | Section | What happens |
|---|---|---|
| 1-2 | 01 ΚΑΘΕ ΜΕΡΑ | ΚΑΘΕ / ΜΕΡΑ / ΜΕ slam in on the beats, then a nine-tile mosaic of school life (maths, vocabulary, the Πανελλήνιες countdown, an essay, a timetable, «;», Python, a quiz) assembles under a giant AI |
| 3 | 02 ΧΩΡΙΣ ΠΑΠΑΓΑΛΙΑ | `χωρίς▌` types, ΠΑΠΑΓΑΛΙΑ slams in with a cobalt fringe, and a paper bar strikes it out |
| 4-5 | 03 ΡΩΤΑ | ΡΩΤΑ / ΣΩΣΤΑ. beside a chat card that types a good prompt. The pointer clicks send, and the wordmark's underscore stretches into a line that splits the frame open to ink |
| 6-7 | 04 ΒΗΜΑ-ΒΗΜΑ | 2x + 5 = 17 solved as kinetic maths: +5 arcs over the equals sign and lands as −5, 17 − 5 collapses into 12, the 2 crosses over as : 2, and x = 6 gets a box and a check. Then the verification (επαλήθευση) and a follow-up question |
| 8-10 | 05 3 ΚΑΝΟΝΕΣ | One full-frame card per bar (ΔΩΣΕ ΠΛΑΙΣΙΟ., ΖΗΤΑ ΕΞΗΓΗΣΗ., ΕΛΕΓΞΕ ΤΗΝ ΑΠΑΝΤΗΣΗ.), each typing an example prompt |
| 11-12 | 06 ΠΑΝΤΟΥ | ΣΤΟ ΣΧΟΛΕΙΟ. / ΚΑΙ ΠΑΝΤΟΥ. over a strip of eight use-case cards with example prompts |
| 13-14 | 07 ΠΡΟΣΟΧΗ | A wrong answer (the Parthenon "built in 1821") is underlined, stamped ✗ and corrected. Then personal data is redacted and a padlock snaps shut |
| 15-16 | 08 ΜΑΘΕ AI | μάθε AI. transliterates letter by letter into mathe_ai, then the wordmark locks in with the tagline |

The HUD runs on expressions: the timecode, the BPM beat squares, the bar counter (ΜΕΤΡΟ 03/16) and the
section tags.

## Build and render

```sh
./fonts.sh                                   # Commissioner, JetBrains Mono, Geist (OFL) → fonts/
./voiceover.sh                               # optional: regenerate vo/ and lesson01-mix.wav
export EFFECTCRAFT_FONT_DIRS=$PWD/fonts
effectcraft-cli script build.jsx --save-as mathe-ai-lesson-01.ecproj
effectcraft-cli render mathe-ai-lesson-01.ecproj --comp Main --out mathe-ai-lesson-01.mp4 \
  --format h264 --bitrate 24000 --audio on --progress
```

`mathe-ai-lesson-01.ecproj` is the generated project, ready to open in the EffectCraft app. It references
`lesson01-mix.wav` next to it.

## Open it in EffectCraft

1. Install EffectCraft 0.16 or newer from [getartcraft.com](https://getartcraft.com/apps/effectcraft)
   or the [GitHub releases](https://github.com/storytold/effectcraft/releases).
2. Run `./fonts.sh` and install the TTFs it puts in `fonts/`. On Linux you can instead launch with
   `EFFECTCRAFT_FONT_DIRS=$PWD/fonts effectcraft mathe-ai-lesson-01.ecproj`.
3. Open `mathe-ai-lesson-01.ecproj` with `lesson01-mix.wav` beside it. It opens on the `Main` comp, and
   each section is a nested comp (`01 Κάθε μέρα` … `08 Μάθε AI`).

## Before it goes out

- The voice is a temp text-to-speech track. Record a native speaker (warm, late 20s, clear Athenian
  diction, "AI" said as "έι-άι"). Save one take per line as `vo/v01.wav` … `vo/v14.wav` (the lines are in
  `voiceover.sh`), then run `.venv/bin/python soundtrack.py vo lesson01-mix.wav`. Each take's leading
  silence is trimmed and the take is placed at its time in the `VO` list in `soundtrack.py`.
- Two voice lines differ from the prompt. «Ρώτα σωστά.» became «Ρώτα σωστά, και θα μάθεις.» because the
  TTS stretched the short line, and «Το AI κάνει λάθη. Έλεγξέ το.» is read as one sentence with a comma.
- Have a native speaker proofread every on-screen string. They are all in `build.jsx`.
- The form in 07 uses made-up data (ΑΜΚΑ 12039901234, 6912345678, Παπαδιαμάντη 7).

## Notes from building it

- Nulls are 100×100 boxes anchored at 50,50, as in After Effects, so their children land 50 px up and to
  the left of where you place them. `nul()` anchors them at 0,0 instead.
- A 2 px rectangle scaled up by tens of thousands of percent drew only part of its width. The ink wipe in
  03 animates the rectangle's Size instead.
- Text wraps at spaces, so the prompt uses no-break spaces to keep "2x + 5 = 17." and "Β΄ λυκείου" on one
  line.
- None of the fonts has ✓ or ✗, and Commissioner has no →, so the checks and crosses are drawn strokes and
  the arrow is set in JetBrains Mono.
- All-caps Greek drops the accents (ΚΑΘΕ ΜΕΡΑ), while lowercase keeps them. The question mark is «;», and
  the class is written Β΄ λυκείου with the keraia.

## Credits

- Voice (temp): Piper TTS, voice `el_GR-rapunzelina-medium` (trained from scratch on a CC0 Greek
  single-speaker dataset).
- Music, foley and sound design: synthesized in `soundtrack.py` (numpy/scipy).
- Type: Commissioner, JetBrains Mono and Geist (SIL OFL).
