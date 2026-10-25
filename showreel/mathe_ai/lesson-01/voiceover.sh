#!/bin/sh
# Temp Greek voice-over with Piper TTS, then the full mix (music + foley + voice) into lesson01-mix.wav.
# Voice: el_GR-rapunzelina-medium, trained from scratch on a CC0 Greek single-speaker dataset.
# For the final cut, record a native speaker instead: one take per line, saved as vo/v01.wav … vo/v14.wav,
# then run only the last line. soundtrack.py trims each take's leading silence and places it on the beat grid.
#   python3 -m venv .venv && .venv/bin/pip install piper-tts scipy
set -e
cd "$(dirname "$0")"
V=voices/el_GR-rapunzelina-medium
mkdir -p voices vo
for ext in onnx onnx.json; do
  [ -f "$V.$ext" ] || curl -sSL -o "$V.$ext" "https://huggingface.co/rhasspy/piper-voices/resolve/main/el/el_GR/rapunzelina/medium/el_GR-rapunzelina-medium.$ext"
done
# say <id> <length-scale> <text>: "AI" is written "έι άι" so the voice says it the Greek way
say() { echo "$3" | .venv/bin/piper -m "$V.onnx" --length-scale "$2" --noise-scale 0.5 --noise-w-scale 0.4 --sentence-silence 0 -f "vo/$1.wav"; }
say v01 0.95 "Κάθε μέρα,"
say v02 0.95 "με έι άι."
say v03 0.95 "Χωρίς παπαγαλία."
say v04 0.92 "Ρώτα σωστά, και θα μάθεις."
say v05 0.95 "Ζήτα να σου το εξηγήσει, βήμα βήμα."
say v06 0.95 "Δώσε πλαίσιο."
say v07 0.95 "Ζήτα εξήγηση."
say v08 0.95 "Έλεγξε την απάντηση."
say v09 0.84 "Για σημειώσεις, κουίζ, εκθέσεις,"
say v10 0.95 "ακόμα και για μαγείρεμα."
say v11 0.90 "Το έι άι κάνει λάθη, έλεγξέ το."
say v12 0.86 "Τα προσωπικά σου, μόνο για σένα."
say v13 0.95 "Μάθε έι άι."
say v14 0.95 "Για κάθε μέρα."
.venv/bin/python soundtrack.py vo lesson01-mix.wav
