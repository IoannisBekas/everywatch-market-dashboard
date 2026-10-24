// node render.js stills <outdir> <K> t1 t2 ...   |  node render.js audio <out.wav>  |  node render.js video <out.mp4> <wav> [workers]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const HTML = 'file://' + path.resolve(__dirname, 'mathe_ai.html');
const FPS = 60, SUB = 3, DUR = 15, NF = FPS * DUR;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(HTML); await page.evaluate(() => window.ready); return page;
}
const shot = page => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });

async function stills(out, K, times) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(); const page = await openPage(browser);
  await page.evaluate(k => window.setSamples(k), K);
  for (const [i, t] of times.entries()) {
    const t0 = Date.now(); await page.evaluate(t => window.seek(t), t);
    fs.writeFileSync(path.join(out, `f${String(i).padStart(3, '0')}_${t.toFixed(3)}.png`), await shot(page));
    if (i < 2) console.log('frame', t, Date.now() - t0, 'ms');
  }
  await browser.close();
}
async function audio(out) {
  const browser = await chromium.launch(); const page = await openPage(browser);
  const r = await page.evaluate(() => window.renderAudio());
  fs.writeFileSync(out, Buffer.from(r.b64, 'base64')); console.log('wav written, raw peak', r.peak.toFixed(3));
  await browser.close();
}
async function worker(id, f0, f1, segPath) {
  const browser = await chromium.launch(); const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
    '-vf', `tmix=frames=${SUB}:weights='1 1 1',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)`,
    '-r', String(FPS), '-c:v', 'ffv1', '-pix_fmt', 'bgr0', segPath], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    for (let k = 0; k < SUB; k++) {
      const t = f / FPS + (k - (SUB - 1) / 2) / (FPS * SUB * 2);     // 3 slices covering a 180° shutter
      await page.evaluate(t => window.seek(t), t);
      const buf = await shot(page);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    if ((f - f0) % 60 === 0) console.log(`w${id} frame ${f} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end(); await done; await browser.close();
}
async function video(out, wav, workers) {
  const dir = path.join(path.dirname(out), 'segs'); fs.mkdirSync(dir, { recursive: true });
  const per = Math.ceil(NF / workers), jobs = [], segs = [];
  for (let w = 0; w < workers; w++) {
    const f0 = w * per, f1 = Math.min(NF, f0 + per), p = path.join(dir, `seg${w}_${f0}_${f1}.mkv`); segs.push(p);
    if (fs.existsSync(p)) { console.log(`w${w} done already`); continue; }     // resumable: finished segments are kept
    const tmp = p.replace('.mkv', '.part.mkv');
    jobs.push(worker(w, f0, f1, tmp).then(() => fs.renameSync(tmp, p)));
  }
  await Promise.all(jobs);
  fs.writeFileSync(path.join(dir, 'list.txt'), segs.map(s => `file '${s}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-i', wav,
    '-map', '0:v', '-map', '1:a', '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-r', String(FPS), '-c:a', 'aac', '-b:a', '320k', '-t', String(DUR), '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('video written', out);
}
const [mode, a, b, ...rest] = process.argv.slice(2);
(async () => {
  if (mode === 'stills') await stills(a, +b, rest.map(Number));
  else if (mode === 'audio') await audio(a);
  else if (mode === 'video') await video(path.resolve(a), path.resolve(b), +(rest[0] || 4));
})().catch(e => { console.error(e); process.exit(1); });
