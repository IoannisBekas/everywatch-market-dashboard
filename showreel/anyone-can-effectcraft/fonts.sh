#!/bin/sh
# Fetch the three typefaces (all SIL Open Font License) as TTFs into ./fonts.
# EffectCraft finds them through EFFECTCRAFT_FONT_DIRS=fonts.
set -e
cd "$(dirname "$0")"
mkdir -p fonts .fontpkgs
cd .fontpkgs
for p in @expo-google-fonts/archivo-black @expo-google-fonts/instrument-serif @expo-google-fonts/jetbrains-mono; do
  npm pack "$p" --silent >/dev/null
done
for t in *.tgz; do tar xzf "$t"; mv package "${t%.tgz}"; done
cp */400Regular/ArchivoBlack_400Regular.ttf */400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf \
   */500Medium/JetBrainsMono_500Medium.ttf */700Bold/JetBrainsMono_700Bold.ttf ../fonts/
cd .. && rm -rf .fontpkgs
ls fonts
