"""Soundtrack for "Anyone can" (EffectCraft edition): 20 s, 132 BPM, 11 bars, 48 kHz stereo.

Music and sound design are synthesized here; the voice-over lines are Piper TTS renders
(en_GB-cori-high, public domain) placed on the beat grid. Usage:
    python soundtrack.py <vo_dir> <out.wav>
"""
import sys, wave
import numpy as np
import scipy.signal as ss

SR = 48000
DUR = 20.0
N = int(SR * DUR)
BPM = 132
B = 60 / BPM              # beat
BAR = 4 * B
bar = lambda n: (n - 1) * BAR          # bar n (1-based) start time
beat = lambda n, k: bar(n) + (k - 1) * B   # bar n, beat k (1-based)

rng = np.random.default_rng(132)
music = np.zeros((2, N))
fx = np.zeros((2, N))
vo = np.zeros((2, N))


def place(bus, sig, t, gain=1.0, pan=0.0):
    """Add a mono or stereo signal into a bus at time t (s) with equal-power pan."""
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
    """Time-varying biquad (log sweep f0 -> f1 across the signal), block-wise with state."""
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
        else:  # band
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
    f = 44 + 120 * np.exp(-t / 0.028)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17)
    s += 0.35 * hp(noise(0.5), 1500) * np.exp(-t / 0.003)
    return np.tanh(1.6 * s) * g


def clap(g=1.0):
    t = tt(0.4)
    n = bp(noise(0.4), 900, 3200)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.023):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) / 0.008)
    env += (t >= 0.03) * 0.5 * np.exp(-np.clip(t - 0.03, 0, None) / 0.11)
    return n * env * 0.5 * g


def hat(open_=False, g=1.0):
    d = 0.22 if open_ else 0.05
    t = tt(d)
    return hp(noise(d), 7500, 4) * np.exp(-t / (0.07 if open_ else 0.014)) * 0.35 * g


def bass(m, dur, g=1.0):
    t = tt(dur)
    s = 0.6 * (saw(hz(m), dur) + saw(hz(m), dur, 0.004))
    s = sweep_filter(s, 900, 160, 'low', 1.2)
    s += 0.8 * np.sin(2 * np.pi * hz(m) * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t / (dur * 0.8))
    return s * env * 0.32 * g


def stab(ms, dur=0.5, g=1.0, f0=5000, f1=500):
    t = tt(dur)
    s = sum(saw(hz(m), dur, d) for m in ms for d in (-0.003, 0.003))
    s = sweep_filter(s / len(ms), f0, f1, 'low', 1.4)
    return s * np.minimum(1, t / 0.003) * np.exp(-t / (dur * 0.45)) * 0.32 * g


def pluck(m, g=1.0, dec=0.16):
    t = tt(dec * 4)
    s = np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.sin(4 * np.pi * hz(m) * t) + 0.15 * saw(hz(m), dec * 4)
    return s * np.minimum(1, t / 0.002) * np.exp(-t / dec) * 0.22 * g


def impact(g=1.0, tail=1.1):
    t = tt(tail)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 50 * np.exp(-t / 0.07)) / SR) * np.exp(-t / (tail * 0.4))
    crash = lp(noise(tail), 6000) * np.exp(-t / (tail * 0.28)) * 0.45
    return np.tanh(1.3 * (boom + crash)) * 0.9 * g


def riser(dur, g=1.0):
    n = sweep_filter(noise(dur), 250, 9000, 'band', 2.0)
    s = sum(sweep_filter(saw(hz(45 + k * 7), dur), 300, 6000, 'low', 1.0) for k in range(2)) * 0.25
    t = tt(dur)
    pitch = 2 ** (np.cumsum(np.full(len(t), 24 / len(t))) / 12)
    tone = np.sin(2 * np.pi * np.cumsum(hz(57) * pitch) / SR) * 0.25
    env = (t / dur) ** 2.2
    return (n * 1.4 + s + tone) * env * 0.5 * g


def whoosh(dur=0.35, g=1.0):
    t = tt(dur)
    n = sweep_filter(noise(dur), 400, 5000, 'band', 1.4)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return n * env * 0.6 * g


def click(g=1.0):
    t = tt(0.03)
    return bp(noise(0.03), 2500, 6000) * np.exp(-t / 0.004) * 0.5 * g


def blip(m, g=1.0):
    t = tt(0.25)
    return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.002) * np.exp(-t / 0.06) * 0.3 * g


# ------------------------------------------------------------------ arrangement (A minor)
CHORD = {1: [57, 60, 64], 2: [53, 57, 60, 65], 3: [50, 53, 57, 62], 4: [57, 60, 64], 5: [53, 57, 60, 65],
         6: [48, 55, 60, 64], 7: [57, 60, 64, 67], 8: [53, 57, 60, 64], 9: [50, 57, 62, 65], 10: [52, 56, 59, 64],
         11: [45, 57, 60, 64, 71]}
ROOT = {1: 33, 2: 29, 3: 26, 4: 33, 5: 29, 6: 36, 7: 33, 8: 29, 9: 26, 10: 28, 11: 33}

# drums
for b in range(1, 12):
    for k in range(1, 5):
        t = beat(b, k)
        if b == 3 and k in (1, 3):            # "without": the floor drops out
            continue
        if b in (4, 5) and k in (2, 4):       # describe: half-time feel
            continue
        if b == 11 and k > 1:
            continue
        place(music, kick(1.05 if k == 1 else 0.95), t)
    if b in (2, 6, 7, 8, 9, 10):
        for k in (2, 4):
            place(music, clap(), beat(b, k), 0.8, 0.1)
    if b in (2, 6, 7, 8, 9, 10):
        for s in range(16 if b >= 7 else 8):
            step = BAR / (16 if b >= 7 else 8)
            op = (b >= 7 and s % 4 == 2)
            place(music, hat(op, 0.9 if s % 2 else 0.6), bar(b) + s * step, 1.0, 0.35 if s % 2 else -0.35)
    if b in (4, 5):
        for s in range(16):
            place(music, hat(False, 0.35 if s % 2 else 0.22), bar(b) + s * BAR / 16, 1.0, 0.4 if s % 2 else -0.4)
# snare roll into the end title
for s in range(8):
    place(music, clap(0.35 + 0.08 * s), beat(10, 3) + s * B / 4, 0.7)

# bass
for b in range(2, 11):
    if b == 3:
        place(music, bass(ROOT[b], BAR * 0.9, 0.9), bar(b) + B)
        continue
    if b in (4, 5):
        for k in (1, 3):
            place(music, bass(ROOT[b] + 12, B * 1.6, 0.7), beat(b, k))
        continue
    for s in range(8):
        if s % 2 == 1 or b >= 7:
            m = ROOT[b] + (12 if s in (3, 7) else 0)
            place(music, bass(m, B / 2 * 0.9, 0.95 if s % 2 else 0.7), bar(b) + s * B / 2)
place(music, bass(ROOT[11], 1.6, 1.0), bar(11))

# chord stabs on hits and offbeats
for b in (2, 6, 7, 8, 9, 10):
    place(music, stab(CHORD[b], 0.55, 1.0), bar(b), 1.0, -0.1)
    for k in (2, 4):
        place(music, stab(CHORD[b], 0.22, 0.45, 3500, 700), beat(b, k) + B / 2, 1.0, 0.2)
place(music, stab(CHORD[11], 1.8, 1.3, 6000, 350), bar(11))

# describe: a plucked arpeggio (16ths) under the typing
arp = [69, 72, 76, 79, 81, 79, 76, 72]
for b in (4, 5):
    for s in range(16):
        if b == 5 and s >= 10:
            break
        m = arp[s % 8] - (4 if b == 5 else 0)
        place(music, pluck(m, 0.75 if s % 4 == 0 else 0.5), bar(b) + s * BAR / 16, 1.0, -0.3 + 0.6 * (s % 2))
# build: keyframe pops (8ths) as a sequenced pluck
seq = [81, 76, 84, 79, 81, 76, 88, 84]
for b in (7, 8):
    for s in range(8):
        place(music, pluck(seq[s] - (5 if b == 8 else 0), 0.45, 0.09), bar(b) + s * B / 2 + 0.002, 1.0, 0.5 - (s % 2))

# ------------------------------------------------------------------ sound design (not ducked)
for b in (2, 6, 7, 9, 11):
    place(fx, impact(1.25 if b in (6, 11) else 0.9, 1.3 if b == 11 else 1.0), bar(b))
place(fx, impact(0.8, 0.8), beat(3, 2))                 # AFTER EFFECTS slams in
place(fx, whoosh(0.28, 1.0), beat(3, 3) - 0.18)         # the strike-through slash
for k in range(7):                                       # coloured dots pop
    place(fx, blip(84 + [0, 3, 7, 10, 12, 15, 19][k], 0.5), beat(3, 3) + 0.03 + k * 0.035, 1.0, -0.6 + 0.2 * k)
place(fx, whoosh(0.4, 0.8), bar(4) - 0.25)              # into describe
for i in range(150):                                     # typing in the chat card (bars 4-5)
    t = bar(4) + 0.25 + i * 0.019
    if t > beat(5, 3) - 0.08:
        break
    if i % 3 == 0:
        place(fx, click(0.35 + 0.15 * rng.random()), t, 1.0, 0.45)
place(fx, click(1.6), beat(5, 3))                        # send
place(fx, blip(76, 0.9), beat(5, 3) + 0.01)
place(fx, riser(BAR * 0.5, 1.2), beat(5, 3))            # burst grows into the reveal
place(fx, whoosh(0.35, 0.9), bar(7) - 0.2)              # into the build scene
for k in range(4):                                       # layers appear on the beats
    place(fx, blip(88 + 2 * k, 0.35), beat(7, k + 1) + 0.01, 1.0, 0.3)
place(fx, whoosh(0.35, 0.8), bar(9) - 0.2)               # film strip
for s in range(16):                                      # render ticks
    place(fx, click(0.25 + 0.03 * s), bar(9) + s * BAR / 8, 1.0, -0.2 + 0.4 * (s % 2))
place(fx, riser(BAR * 0.95, 1.0), bar(10) + BAR * 0.05)  # riser into the end title
place(fx, blip(93, 0.5), bar(11) + 3 * B)                # final caret tick

# ------------------------------------------------------------------ voice-over
VO = [("v1", 0.10), ("v2", bar(2) + 0.005), ("v3", bar(3) + 0.03), ("v4a", bar(4) + 0.0),
      ("v4b", beat(4, 3) + 0.0), ("v5", bar(6) + 0.01), ("v6a", bar(7) + 0.02), ("v6b", bar(8) + 0.03),
      ("v7", bar(9) + 0.02), ("v8", bar(11) + 0.02)]


def load_vo(path):
    w = wave.open(path)
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    x = ss.resample_poly(x, SR, sr)
    fr = int(SR * 0.005)
    e = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2)) for i in range(0, len(x) - fr, fr)])
    on = int(np.argmax(e > 0.02 * e.max()) * fr)
    x = x[max(0, on - int(0.01 * SR)):]                     # start at the speech onset
    x = hp(x, 90)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.8
    return np.tanh(1.5 * x) / np.tanh(1.5)                  # gentle saturation, evens out peaks


room = rng.standard_normal(int(0.35 * SR)) * np.exp(-np.arange(int(0.35 * SR)) / (0.07 * SR))
room = lp(room, 5000) * 0.035
vo_dir = sys.argv[1]
for k, t in VO:
    x = load_vo(f"{vo_dir}/{k}.wav")
    wet = ss.fftconvolve(x, room)[:len(x) + len(room) - 1]
    place(vo, np.concatenate([x, np.zeros(len(room) - 1)]) + wet, t, 0.95)

# ------------------------------------------------------------------ mix
# sidechain: kicks pump the music a little; the voice ducks it 6 dB
pump = np.ones(N)
for b in range(1, 12):
    for k in range(1, 5):
        i = int(beat(b, k) * SR)
        n = int(0.22 * SR)
        seg = 1 - 0.35 * np.exp(-np.arange(n) / (0.06 * SR))
        j = min(N, i + n)
        pump[i:j] = np.minimum(pump[i:j], seg[:j - i])
venv = np.abs(vo).max(axis=0)
venv = ss.sosfiltfilt(ss.butter(1, 6, 'low', fs=SR, output='sos'), (venv > 0.02).astype(float))
duck = 1 - 0.5 * np.clip(venv, 0, 1)
mix = music * pump * duck * 0.9 + fx * 0.8 + vo
mix = np.tanh(1.2 * mix) / np.tanh(1.2)
fade = np.ones(N)
fade[-int(0.012 * SR):] = np.linspace(1, 0, int(0.012 * SR))   # click-free end
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
