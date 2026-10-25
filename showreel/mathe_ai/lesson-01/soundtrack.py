"""Soundtrack for mathe_ai, Lesson 01: "AI για κάθε μέρα". 30 s, 128 BPM, 16 bars, D major, 48 kHz stereo.

Music, school foley and sound design are synthesized here. The Greek voice-over lines are Piper TTS
renders (el_GR-rapunzelina-medium, trained on a CC0 dataset) placed on the beat grid as a temp VO.
Usage:
    python soundtrack.py <vo_dir> <out.wav>
"""
import sys, wave
import numpy as np
import scipy.signal as ss

SR = 48000
DUR = 30.0
N = int(SR * DUR)
BPM = 128
B = 60 / BPM               # beat 0.46875 s
BAR = 4 * B                # bar 1.875 s
bar = lambda n: (n - 1) * BAR
beat = lambda n, k: bar(n) + (k - 1) * B

rng = np.random.default_rng(128)
music = np.zeros((2, N))
fx = np.zeros((2, N))
vo = np.zeros((2, N))


def place(bus, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    j0, j1 = max(0, i), min(N, i + sig.shape[1])
    if j1 > j0:
        bus[:, j0:j1] += gain * sig[:, j0 - i:j1 - i]


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def bp(x, lo, hi, order=2):
    return ss.sosfilt(ss.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return ss.sosfilt(ss.butter(order, f, 'high', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return ss.sosfilt(ss.butter(order, f, 'low', fs=SR, output='sos'), x)


def sweep_filter(x, f0, f1, kind='low', q=0.9, block=256):
    out = np.zeros_like(x)
    zi = np.zeros(2)
    nb = int(np.ceil(len(x) / block))
    for b in range(nb):
        u = b / max(1, nb - 1)
        f = f0 * (f1 / f0) ** u
        w = 2 * np.pi * min(f, SR * 0.45) / SR
        al = np.sin(w) / (2 * q)
        c = np.cos(w)
        if kind == 'low':
            bb = [(1 - c) / 2, 1 - c, (1 - c) / 2]
        elif kind == 'high':
            bb = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
        else:
            bb = [al, 0, -al]
        aa = [1 + al, -2 * c, 1 - al]
        bb = np.array(bb) / aa[0]
        aa = np.array(aa) / aa[0]
        seg = x[b * block:(b + 1) * block]
        y, zi = ss.lfilter(bb, aa, seg, zi=zi)
        out[b * block:(b + 1) * block] = y
    return out


def saw(f, dur, detune=0.0):
    t = tt(dur)
    ph = (f * (1 + detune) * t + rng.random()) % 1.0
    return 2 * ph - 1


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ instruments
def kick(g=1.0):
    t = tt(0.5)
    f = 46 + 118 * np.exp(-t / 0.028)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    s += 0.32 * hp(noise(0.5), 1500) * np.exp(-t / 0.003)
    return np.tanh(1.6 * s) * g


def clap(g=1.0):
    t = tt(0.4)
    n = bp(noise(0.4), 900, 3400)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.023):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) / 0.008)
    env += (t >= 0.03) * 0.5 * np.exp(-np.clip(t - 0.03, 0, None) / 0.11)
    return n * env * 0.5 * g


def hat(open_=False, g=1.0):
    d = 0.22 if open_ else 0.05
    t = tt(d)
    return hp(noise(d), 7500, 4) * np.exp(-t / (0.07 if open_ else 0.014)) * 0.33 * g


def bass(m, dur, g=1.0):
    t = tt(dur)
    s = 0.6 * (saw(hz(m), dur) + saw(hz(m), dur, 0.004))
    s = sweep_filter(s, 1000, 170, 'low', 1.2)
    s += 0.8 * np.sin(2 * np.pi * hz(m) * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t / (dur * 0.8))
    return s * env * 0.3 * g


def stab(ms, dur=0.5, g=1.0, f0=5200, f1=600):
    t = tt(dur)
    s = sum(saw(hz(m), dur, d) for m in ms for d in (-0.003, 0.003))
    s = sweep_filter(s / len(ms), f0, f1, 'low', 1.3)
    return s * np.minimum(1, t / 0.003) * np.exp(-t / (dur * 0.45)) * 0.3 * g


def pluck(m, g=1.0, dec=0.16):
    t = tt(dec * 4)
    s = np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(4 * np.pi * hz(m) * t) + 0.12 * saw(hz(m), dec * 4)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / dec) * 0.22 * g


def impact(g=1.0, tail=1.0):
    t = tt(tail)
    boom = np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-t / 0.07)) / SR) * np.exp(-t / (tail * 0.4))
    crash = lp(noise(tail), 6500) * np.exp(-t / (tail * 0.28)) * 0.42
    return np.tanh(1.3 * (boom + crash)) * 0.85 * g


def riser(dur, g=1.0):
    n = sweep_filter(noise(dur), 250, 9500, 'band', 2.0)
    s = sum(sweep_filter(saw(hz(50 + k * 7), dur), 300, 6000, 'low', 1.0) for k in range(2)) * 0.25
    t = tt(dur)
    pitch = 2 ** (np.cumsum(np.full(len(t), 24 / len(t))) / 12)
    tone = np.sin(2 * np.pi * np.cumsum(hz(62) * pitch) / SR) * 0.25
    return (n * 1.4 + s + tone) * (t / dur) ** 2.2 * 0.5 * g


def whoosh(dur=0.35, g=1.0, f0=400, f1=5000):
    t = tt(dur)
    n = sweep_filter(noise(dur), f0, f1, 'band', 1.4)
    return n * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * 0.6 * g


def blip(m, g=1.0):
    t = tt(0.25)
    return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.002) * np.exp(-t / 0.06) * 0.3 * g


# school foley
def bell(g=1.0):
    t = tt(1.6)
    f0 = hz(91)                                    # a bright G6 "ding"
    parts = [(1.0, 1.0, 0.9), (2.0, 0.5, 0.55), (2.76, 0.35, 0.4), (5.4, 0.2, 0.25), (8.93, 0.1, 0.15)]
    s = sum(a * np.sin(2 * np.pi * f0 * r * t + rng.random()) * np.exp(-t / d) for r, a, d in parts)
    s *= 1 + 0.15 * np.sin(2 * np.pi * 6 * t)      # a little shimmer
    return s * np.minimum(1, t / 0.001) * 0.22 * g


def pencil(g=1.0):
    d = 0.03 + 0.02 * rng.random()
    t = tt(d)
    n = bp(noise(d), 2200, 7000)
    rough = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * (70 + 60 * rng.random()) * t))
    return n * rough * np.sin(np.pi * t / d) * 0.32 * g


def chalk(g=1.0):
    t = tt(0.08)
    tap = bp(noise(0.08), 1400, 4200) * np.exp(-t / 0.008)
    thump = np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.02) * 0.6
    return (tap * 0.6 + thump) * 0.45 * g


def page_flip(g=1.0):
    t = tt(0.32)
    n = sweep_filter(noise(0.32), 700, 5200, 'band', 1.1)
    flutter = 0.55 + 0.45 * np.sin(2 * np.pi * 26 * t) ** 2
    return n * flutter * np.sin(np.pi * t / 0.32) ** 1.5 * 0.55 * g


def stamp(g=1.0):
    t = tt(0.22)
    body = np.sin(2 * np.pi * np.cumsum(55 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06)
    slap = bp(noise(0.22), 300, 1800) * np.exp(-t / 0.018) * 0.7
    return np.tanh(1.8 * (body + slap)) * 0.6 * g


def lock_click(g=1.0):
    t = tt(0.16)
    c1 = bp(noise(0.16), 3000, 9000) * np.exp(-t / 0.004)
    c2 = np.roll(c1, int(0.045 * SR)) * 0.8
    ping = np.sin(2 * np.pi * 2650 * t) * np.exp(-t / 0.03) * 0.25
    return (c1 + c2 + ping) * 0.5 * g


def swipe(g=1.0):
    return whoosh(0.13, 0.7 * g, 1200, 6500)


# ------------------------------------------------------------------ arrangement (D major, I–V–vi–IV)
D, A, Bm, G = [62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]
CHORD = {1: D, 2: A, 3: Bm, 4: G, 5: A, 6: D, 7: A, 8: Bm, 9: G, 10: A, 11: D, 12: A, 13: Bm, 14: G, 15: D, 16: [50, 62, 66, 69, 76]}
ROOT = {1: 38, 2: 33, 3: 35, 4: 31, 5: 33, 6: 38, 7: 33, 8: 35, 9: 31, 10: 33, 11: 38, 12: 33, 13: 35, 14: 31, 15: 38, 16: 38}
GROOVE = range(6, 16)

for b in range(1, 17):
    for k in range(1, 5):
        if b == 3 and k in (1, 3):
            continue
        if b in (4, 5) and k in (2, 4):
            continue
        if b == 16 and k > 1:
            continue
        place(music, kick(1.05 if k == 1 else 0.95), beat(b, k))
    if b == 2 or b in GROOVE:
        for k in (2, 4):
            place(music, clap(), beat(b, k), 0.8, 0.1)
    if b == 2:
        for s in range(8):
            place(music, hat(False, 0.8 if s % 2 else 0.5), bar(b) + s * BAR / 8, 1.0, 0.3 if s % 2 else -0.3)
    if b in GROOVE:
        for s in range(16):
            place(music, hat(s % 4 == 2, 0.85 if s % 2 else 0.55), bar(b) + s * BAR / 16, 1.0, 0.35 if s % 2 else -0.35)
    if b in (4, 5):
        for s in range(16):
            place(music, hat(False, 0.32 if s % 2 else 0.2), bar(b) + s * BAR / 16, 1.0, 0.4 if s % 2 else -0.4)
for s in range(8):                                            # snare roll into the end title
    place(music, clap(0.3 + 0.09 * s), beat(14, 3) + s * B / 4, 0.7)

for b in range(2, 16):                                        # bass
    if b == 3:
        place(music, bass(ROOT[b] + 12, BAR * 0.9, 0.9), bar(b) + B)
        continue
    if b in (4, 5):
        for k in (1, 3):
            place(music, bass(ROOT[b] + 12, B * 1.6, 0.7), beat(b, k))
        continue
    for s in range(8):
        if s % 2 == 1 or b in GROOVE:
            m = ROOT[b] + 12 + (12 if s in (3, 7) else 0)
            place(music, bass(m, B / 2 * 0.9, 0.95 if s % 2 else 0.7), bar(b) + s * B / 2)
place(music, bass(ROOT[16] + 12, 1.7, 1.0), bar(16))

for b in (2, 6, 8, 11, 13, 15):                              # stabs on section downbeats
    place(music, stab(CHORD[b], 0.55, 1.0), bar(b), 1.0, -0.1)
for b in GROOVE:
    for k in (2, 4):
        place(music, stab(CHORD[b], 0.2, 0.42, 3600, 700), beat(b, k) + B / 2, 1.0, 0.2)
place(music, stab(CHORD[16], 1.8, 1.25, 6200, 380), bar(16))

arp = [74, 78, 81, 86, 88, 86, 81, 78]                       # under the typing (bars 4-5)
for b in (4, 5):
    for s in range(16):
        if b == 5 and s >= 10:
            break
        m = arp[s % 8] - (2 if b == 5 else 0)
        place(music, pluck(m, 0.75 if s % 4 == 0 else 0.5), bar(b) + s * BAR / 16, 1.0, -0.3 + 0.6 * (s % 2))

# ------------------------------------------------------------------ sound design and foley (not ducked)
place(fx, bell(1.0), 0.0)
for k in range(9):                                            # mosaic tiles pop on 16ths
    place(fx, blip(86 + [0, 2, 4, 7, 9, 12, 14, 16, 19][k], 0.4), beat(1, 4) + k * 0.045, 1.0, -0.6 + 0.15 * k)
for b in (2, 6, 8, 11, 15):
    place(fx, impact(1.2 if b in (2, 15) else 0.85, 1.2 if b == 15 else 0.9), bar(b))
place(fx, impact(0.6, 0.6), bar(16))                          # the wordmark locks
place(fx, whoosh(0.25, 0.6), beat(1, 2) - 0.12)
for i in range(6):                                            # "χωρίς" types
    place(fx, pencil(1.0), bar(3) + 0.02 + i * 0.038, 1.0, 0.2)
place(fx, impact(0.75, 0.7), beat(3, 2))                      # ΠΑΠΑΓΑΛΙΑ slams
place(fx, whoosh(0.28, 1.0), beat(3, 3) - 0.18)               # strike-through
for k in range(7):
    place(fx, blip(86 + [0, 4, 7, 11, 12, 16, 19][k], 0.45), beat(3, 3) + 0.03 + k * 0.035, 1.0, -0.6 + 0.2 * k)
place(fx, whoosh(0.4, 0.8), bar(4) - 0.25)
for i in range(130):                                          # the prompt types in the chat card
    t = bar(4) + 0.32 + i / 60
    if t > beat(5, 2):
        break
    if i % 3 == 0:
        place(fx, pencil(0.55 + 0.3 * rng.random()), t, 1.0, 0.45)
place(fx, whoosh(0.2, 0.35, 900, 3500), beat(5, 2))           # pointer glides in
place(fx, lock_click(0.6), beat(5, 3))                        # send click
place(fx, blip(81, 0.9), beat(5, 3) + 0.01)
place(fx, riser(B * 1.0, 0.9), beat(5, 4))                    # the underscore wipes to ink
place(fx, whoosh(0.35, 0.9, 500, 7000), bar(6) - 0.2)
for k in range(5):                                            # maths: tokens appear on 16ths
    place(fx, chalk(0.9), bar(6) + k * B / 4)
place(fx, blip(78, 0.5), beat(6, 2))                          # label pops
place(fx, whoosh(0.3, 0.5, 600, 3000), beat(6, 2) + 0.05)     # +5 arcs over
place(fx, chalk(1.0), beat(6, 2) + 0.36)
place(fx, pluck(86, 0.9), beat(6, 3)); place(fx, chalk(0.8), beat(6, 3))     # 17 − 5 → 12
place(fx, blip(78, 0.5), beat(7, 1)); place(fx, chalk(1.0), beat(7, 1) + 0.2)  # ÷2 drops
place(fx, pluck(93, 1.0), beat(7, 1) + B / 2)                 # x = 6
for i in range(16):
    place(fx, pencil(0.5), beat(7, 2) + i * 0.025, 1.0, -0.3)
place(fx, blip(83, 0.5), beat(7, 3)); place(fx, blip(88, 0.5), beat(7, 3) + B / 2)
for b in (8, 9, 10):                                          # the rule cards
    place(fx, page_flip(1.0), bar(b) - 0.12)
    for i in range(36):
        place(fx, pencil(0.45), beat(b, 2) + i * 0.035, 1.0, 0.35)
place(fx, stamp(1.0), beat(10, 4))
place(fx, whoosh(0.45, 1.0, 400, 6000), bar(11) - 0.2)        # the use-case strip
for k in range(8):
    place(fx, blip(84 + [0, 2, 4, 7, 9, 7, 4, 2][k], 0.4), bar(11) + k * B, 1.0, 0.5 - 0.14 * k)
place(fx, whoosh(0.3, 0.6), bar(13) - 0.15)
for i in range(30):                                           # the wrong answer types
    place(fx, pencil(0.5), bar(13) + 0.05 + i * 0.028, 1.0, 0.2)
for i in range(10):                                           # wavy underline scribble
    place(fx, pencil(0.9), beat(13, 3) + i * 0.022)
place(fx, stamp(1.1), beat(13, 3) + 0.2)                      # ✗
place(fx, blip(86, 0.6), beat(13, 4)); place(fx, pluck(90, 0.7), beat(13, 4) + 0.1)  # ✓
for k in range(4):                                            # redaction bars
    place(fx, swipe(1.0), beat(14, 2) + k * B / 2, 1.0, -0.3 + 0.2 * k)
place(fx, lock_click(1.0), beat(14, 4))
place(fx, riser(BAR * 0.95, 1.0), bar(14) + BAR * 0.05)       # riser into the end title
for k, off in enumerate((0, 0.5, 1, 1.5, 1.75)):              # transliteration flips: μ ά θ ε, then AI
    place(fx, blip(86 + 3 * k, 0.45), beat(15, 3) + off * B, 1.0, -0.4 + 0.2 * k)
for i in range(22):
    place(fx, pencil(0.45), beat(16, 2) + i * 0.02, 1.0, 0.2)
place(fx, blip(93, 0.4), beat(16, 3))

# ------------------------------------------------------------------ voice-over (temp: Piper el_GR-rapunzelina-medium)
VO = [("v01", 0.10), ("v02", 1.88), ("v03", 3.78), ("v04", 5.65), ("v05", 9.40), ("v06", 13.15), ("v07", 15.03),
      ("v08", 16.90), ("v09", 18.78), ("v10", 20.65), ("v11", 22.53), ("v12", 24.45), ("v13", 26.28), ("v14", 28.15)]


def load_vo(path):
    w = wave.open(path)
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    x = ss.resample_poly(x, SR, sr)
    fr = int(SR * 0.005)
    e = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2)) for i in range(0, len(x) - fr, fr)])
    on = int(np.argmax(e > 0.02 * e.max()) * fr)
    x = x[max(0, on - int(0.01 * SR)):]
    x = hp(x, 90)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
    return np.tanh(1.5 * x) / np.tanh(1.5)


room = rng.standard_normal(int(0.35 * SR)) * np.exp(-np.arange(int(0.35 * SR)) / (0.07 * SR))
room = lp(room, 5000) * 0.035
for k, t in VO:
    x = load_vo(f"{sys.argv[1]}/{k}.wav")
    wet = ss.fftconvolve(x, room)[:len(x) + len(room) - 1]
    place(vo, np.concatenate([x, np.zeros(len(room) - 1)]) + wet, t, 0.95)

# ------------------------------------------------------------------ mix
pump = np.ones(N)
for b in range(1, 17):
    for k in range(1, 5):
        i = int(beat(b, k) * SR)
        n = int(0.22 * SR)
        seg = 1 - 0.32 * np.exp(-np.arange(n) / (0.06 * SR))
        j = min(N, i + n)
        pump[i:j] = np.minimum(pump[i:j], seg[:j - i])
venv = np.abs(vo).max(axis=0)
venv = ss.sosfiltfilt(ss.butter(1, 6, 'low', fs=SR, output='sos'), (venv > 0.02).astype(float))
duck = 1 - 0.5 * np.clip(venv, 0, 1)
mix = music * pump * duck * 0.9 + fx * 0.8 + vo
mix = np.tanh(1.2 * mix) / np.tanh(1.2)
fade = np.ones(N)
fade[-int(0.012 * SR):] = np.linspace(1, 0, int(0.012 * SR))
mix *= fade
mix *= 0.89 / np.max(np.abs(mix))
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16).T.copy()
w = wave.open(sys.argv[2], 'wb')
w.setnchannels(2)
w.setsampwidth(2)
w.setframerate(SR)
w.writeframes(out.tobytes())
w.close()
print("wrote", sys.argv[2], f"{N / SR:.3f}s")
