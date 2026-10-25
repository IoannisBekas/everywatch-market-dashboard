#!/bin/sh
# Fetch the typefaces (all SIL Open Font License) as TTFs into ./fonts. Every one of them covers Greek
# except Geist, which is only used for the Latin "mathe_ai" wordmark.
# EffectCraft finds them through EFFECTCRAFT_FONT_DIRS=fonts.
set -e
cd "$(dirname "$0")"
mkdir -p fonts .fontpkgs
cd .fontpkgs
for p in @expo-google-fonts/commissioner @expo-google-fonts/jetbrains-mono geist; do
  npm pack "$p" --silent >/dev/null
done
for t in *.tgz; do tar xzf "$t"; mv package "${t%.tgz}"; done
for w in 500Medium 600SemiBold 700Bold 800ExtraBold 900Black; do cp */$w/Commissioner_$w.ttf ../fonts/; done
cp */500Medium/JetBrainsMono_500Medium.ttf */700Bold/JetBrainsMono_700Bold.ttf geist-*/dist/fonts/geist-sans/Geist-Bold.ttf ../fonts/
cd .. && rm -rf .fontpkgs
ls fonts
