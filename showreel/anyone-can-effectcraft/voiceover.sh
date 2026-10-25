#!/bin/sh
# Voice-over lines with Piper TTS (voice en_GB-cori-high, trained on public-domain LibriVox audio).
#   python3 -m venv .venv && .venv/bin/pip install piper-tts scipy
set -e
cd "$(dirname "$0")"
V=voices/en_GB-cori-high
mkdir -p voices vo
for ext in onnx onnx.json; do
  [ -f "$V.$ext" ] || curl -sSL -o "$V.$ext" "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/high/en_GB-cori-high.$ext"
done
say() { echo "$2" | .venv/bin/piper -m "$V.onnx" --length-scale 0.92 -f "vo/$1.wav"; }
say v1  "Anyone can make"
say v2  "this."
say v3  "Without After Effects."
say v4a "Just"
say v4b "describe it."
say v5  "Claude writes the script."
say v6a "Effect Craft builds every layer,"
say v6b "every keyframe,"
say v7  "and renders every frame."
say v8  "Anyone can."
.venv/bin/python soundtrack.py vo anyone-can-mix.wav
