// Builds mathe_ai.html: inlines the Geist variable font (for fillText) and
// flattened Geist Bold outlines (for morphs + title) into src.html.
const ot = require('opentype.js'), fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'node_modules/geist/dist/fonts/geist-sans/');
const load = p => { const b = fs.readFileSync(p); return ot.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const B = load(D + 'Geist-Bold.ttf');

function flatten(cmds) {
  const out = []; let cur = null, x = 0, y = 0;
  const push = (px, py) => cur.push(+px.toFixed(2), +py.toFixed(2));
  for (const c of cmds) {
    if (c.type === 'M') { cur = []; out.push(cur); x = c.x; y = c.y; push(x, y); }
    else if (c.type === 'L') { x = c.x; y = c.y; push(x, y); }
    else if (c.type === 'Q') {
      const n = 10; for (let i = 1; i <= n; i++) { const u = i / n, v = 1 - u;
        push(v*v*x + 2*v*u*c.x1 + u*u*c.x, v*v*y + 2*v*u*c.y1 + u*u*c.y); }
      x = c.x; y = c.y;
    } else if (c.type === 'C') {
      const n = 14; for (let i = 1; i <= n; i++) { const u = i / n, v = 1 - u;
        push(v*v*v*x + 3*v*v*u*c.x1 + 3*v*u*u*c.x2 + u*u*u*c.x, v*v*v*y + 3*v*v*u*c.y1 + 3*v*u*u*c.y2 + u*u*u*c.y); }
      x = c.x; y = c.y;
    } else if (c.type === 'Z') {
      if (cur && cur.length > 4 && Math.abs(cur[0] - cur[cur.length-2]) < 0.01 && Math.abs(cur[1] - cur[cur.length-1]) < 0.01) cur.splice(-2, 2);
    }
  }
  return out;
}
const glyphs = {};
for (const ch of new Set('mathe_ai0eπ+1=2')) {
  const g = B.charToGlyph(ch); const p = g.getPath(0, 0, 1000); const bb = p.getBoundingBox();
  glyphs[ch] = { adv: g.advanceWidth, c: flatten(p.commands), bb: [bb.x1, bb.y1, bb.x2, bb.y2] };
}
const xs = []; B.forEachGlyph('mathe_ai', 0, 0, 1000, { kerning: true }, (g, x) => xs.push(+x.toFixed(2)));
const data = { glyphs, title: { chars: 'mathe_ai'.split(''), xs } };
const font = fs.readFileSync(D + 'Geist-Variable.woff2').toString('base64');
let html = fs.readFileSync(path.join(__dirname, 'src.html'), 'utf8');
html = html.replace('__FONT_B64__', font).replace('/*__GLYPHS__*/null', JSON.stringify(data));
fs.writeFileSync(path.join(__dirname, 'mathe_ai.html'), html);
console.log('built', (html.length / 1024).toFixed(0) + 'KB', 'title xs', xs.join(','), 'underscore bb', glyphs['_'].bb, 'h bb', glyphs.h.bb);
