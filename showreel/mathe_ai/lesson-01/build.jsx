// mathe_ai, Lesson 01: "AI για κάθε μέρα" (AI for every day).
// A 30 s, 128 BPM, 16-bar lesson promo for Greek students, built entirely with EffectCraft's
// After Effects-style scripting model: comps, shape and text layers, keyframes with
// velocity/influence eases, expressions, precomps, motion blur and an audio layer.
//
//   EFFECTCRAFT_FONT_DIRS=fonts effectcraft-cli script build.jsx --save-as mathe-ai-lesson-01.ecproj
//   effectcraft-cli render mathe-ai-lesson-01.ecproj --comp Main --out mathe-ai-lesson-01.mp4 \
//     --format h264 --bitrate 24000 --audio on

// ------------------------------------------------------------------ timing
var W = 1920, H = 1080, FPS = 60, DUR = 30;
var BT = 60 / 128, BAR = 4 * BT;
function gt(bar, beat) { return ((bar - 1) * 4 + (beat - 1)) * BT; }   // global time, 1-based bar/beat
function lt(barOff, beat) { return (barOff * 4 + (beat - 1)) * BT; }   // section-local time

// ------------------------------------------------------------------ palette & type (mathe_ai brand)
function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
var INK = hex("#0B0B0C"), PAPER = hex("#F2EFE8"), CARD = hex("#FBFAF7"), VER = hex("#FF4B1F"), COB = hex("#2E4BFF"),
    YEL = hex("#F8DD3F"), PANEL = hex("#1B1B20"), LINE = hex("#2E2E35"), GRAY = hex("#8E8E98"), WHITE = [1, 1, 1];
var RED = VER;                                   // the typing caret colour
var DISPLAY = "Commissioner", DISPLAY_STYLE = "Black", MONO = "JetBrains Mono", WORD = "Geist";

// ------------------------------------------------------------------ helpers: comps, layers, shapes
function mkComp(name, w, h, dur, bg) {
  var c = app.project.items.addComp(name, w, h, 1, dur, FPS);
  c.bgColor = bg || INK;
  c.motionBlur = true;
  c.shutterAngle = 180;
  return c;
}
function bg(c, color, name, tin, tout) {
  var L = c.layers.addSolid(color, name || "BG", c.width, c.height, 1);
  L.moveToEnd();
  if (tin !== undefined) L.inPoint = tin;
  if (tout !== undefined) L.outPoint = tout;
  return L;
}
function span(L, tin, tout) { if (tin !== undefined) L.inPoint = tin; if (tout !== undefined) L.outPoint = tout; return L; }

function txt(c, s, o) {
  var d = new TextDocument(s);
  d.font = o.font || DISPLAY;
  d.fontStyle = o.style || DISPLAY_STYLE;
  d.fontSize = o.size || 100;
  d.fillColor = o.color || PAPER;
  d.justification = o.just === "c" ? ParagraphJustification.CENTER_JUSTIFY
                  : o.just === "r" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
  if (o.tracking !== undefined) d.tracking = o.tracking;
  if (o.leading !== undefined) d.leading = o.leading;
  if (o.outline) { d.applyStroke = true; d.strokeColor = o.outline[0]; d.strokeWidth = o.outline[1]; d.strokeOverFill = false; }
  var L = o.box ? c.layers.addBoxText(o.box, d) : c.layers.addText(d);
  L.name = o.name || s.slice(0, 24);
  if (o.center) {
    var r = L.sourceRectAtTime(0, false);
    L.transform.anchorPoint.setValue([r.left + r.width / 2, r.top + r.height / 2]);
  }
  L.transform.position.setValue(o.pos || [c.width / 2, c.height / 2]);
  if (o.opacity !== undefined) L.transform.opacity.setValue(o.opacity);
  return L;
}
function centerKeep(L) {           // anchor on the text's box centre without moving it
  var r = L.sourceRectAtTime(0, false), p = L.transform.position.value;
  L.transform.anchorPoint.setValue([r.left + r.width / 2, r.top + r.height / 2]);
  L.transform.position.setValue([p[0] + r.left + r.width / 2, p[1] + r.top + r.height / 2]);
  return L;
}
function boxTxt(c, s, o, topLeft) {   // paragraph text anchored on its box's top-left corner
  var L = txt(c, s, o);
  var r = L.sourceRectAtTime(0, false);
  L.transform.anchorPoint.setValue([r.left, r.top]);
  L.transform.position.setValue(topLeft);
  return L;
}
// measure text with a throwaway layer: the ink box relative to the text origin (left end of the baseline)
function measure(c, s, o) {
  var d = new TextDocument(s);
  d.font = o.font || DISPLAY; d.fontStyle = o.style || DISPLAY_STYLE; d.fontSize = o.size || 100;
  d.justification = ParagraphJustification.LEFT_JUSTIFY;
  var L = c.layers.addText(d);
  var r = L.sourceRectAtTime(0, false), out = { left: r.left, top: r.top, width: r.width, height: r.height };
  L.remove();
  return out;
}
function adv(c, s, o) { return measure(c, "H" + s + "H", o).width - measure(c, "HH", o).width; }   // advance width
// nulls default to a 100x100 box anchored at 50,50 (as in After Effects); anchor them at 0,0 so a
// child's position is measured from the null's position
function nul(c, name, pos) {
  var N = c.layers.addNull(); N.name = name;
  N.transform.anchorPoint.setValue([0, 0]);
  N.transform.position.setValue(pos || [0, 0]);
  return N;
}
function attach(L, parent) { L.setParentWithJump(parent); return L; }   // keep local values as written
function obj(c, name, pos) { var L = c.layers.addShape(); L.name = name; L.transform.position.setValue(pos || [0, 0]); return L; }
function grp(L, name) { var g = L.property("Contents").addProperty("ADBE Vector Group"); if (name) g.name = name; return g; }
function gc(g) { return g.property("Contents"); }
function rect(g, size, round, pos) {
  var r = gc(g).addProperty("ADBE Vector Shape - Rect");
  r.property("Size").setValue(size);
  if (round) r.property("Roundness").setValue(round);
  if (pos) r.property("Position").setValue(pos);
  return r;
}
function ell(g, size, pos) {
  var e = gc(g).addProperty("ADBE Vector Shape - Ellipse");
  e.property("Size").setValue(size);
  if (pos) e.property("Position").setValue(pos);
  return e;
}
function path(g, verts, closed) {
  var p = gc(g).addProperty("ADBE Vector Shape - Group");
  var sh = new Shape();
  sh.vertices = verts;
  sh.inTangents = verts.map(function () { return [0, 0]; });
  sh.outTangents = verts.map(function () { return [0, 0]; });
  sh.closed = !!closed;
  p.property("Path").setValue(sh);
  return p;
}
function stroke(g, color, width, opacity) {
  var s = gc(g).addProperty("ADBE Vector Graphic - Stroke");
  s.property("Color").setValue(color);
  s.property("Stroke Width").setValue(width);
  if (opacity !== undefined) s.property("Opacity").setValue(opacity);
  return s;
}
function roundStroke(g, color, width) {
  var s = stroke(g, color, width);
  s.property("Line Cap").setValue(2); s.property("Line Join").setValue(2);
  return s;
}
function fill(g, color, opacity) {
  var f = gc(g).addProperty("ADBE Vector Graphic - Fill");
  f.property("Color").setValue(color);
  if (opacity !== undefined) f.property("Opacity").setValue(opacity);
  return f;
}
function trim(g) { return gc(g).addProperty("ADBE Vector Filter - Trim"); }
function repeater(L, copies, offset) {
  var r = L.property("Contents").addProperty("ADBE Vector Filter - Repeater");
  r.property("Copies").setValue(copies);
  r.property("Transform").property("Position").setValue(offset);
  return r;
}
function gt2(g) { return g.property("Transform"); }   // a shape group's own transform

// ------------------------------------------------------------------ helpers: keyframes
// K(prop, [[t, value, ease], ...]): ease names the segment that leaves that key:
//   'o' snap (fast start, long settle), 'i' accelerate out, 'io' smooth, 'l' linear, 'h' hold.
var SNAP = 4, SNAP_INF = 25, SETTLE = 85, SMOOTH = 72;
function isSpatial(prop) {
  var t = prop.propertyValueType;
  return t === PropertyValueType.TwoD_SPATIAL || t === PropertyValueType.ThreeD_SPATIAL;
}
function dimsOf(prop) { var v = prop.value; return v instanceof Array ? v.length : 1; }
function comp_(v, i) { return v instanceof Array ? (v[i] === undefined ? 0 : v[i]) : v; }
function segEase(kind, side, v0, v1, dur, prop) {
  var spatial = isSpatial(prop), n = spatial ? 1 : dimsOf(prop), out = [];
  for (var i = 0; i < n; i++) {
    var dv;
    if (spatial) { var s = 0; for (var j = 0; j < 3; j++) { var dd = comp_(v1, j) - comp_(v0, j); s += dd * dd; } dv = Math.sqrt(s); }
    else dv = comp_(v1, i) - comp_(v0, i);
    var avg = dv / Math.max(dur, 1e-3), sp = 0, inf = SMOOTH;
    if (kind === "o") { if (side === "out") { sp = SNAP * avg; inf = SNAP_INF; } else { inf = SETTLE; } }
    else if (kind === "i") { if (side === "out") { inf = SETTLE; } else { sp = SNAP * avg; inf = SNAP_INF; } }
    else if (kind === "l") { sp = avg; inf = 33.3; }
    out.push(new KeyframeEase(sp, inf));
  }
  return out;
}
function K(prop, keys) {
  var i, spatial = isSpatial(prop);
  for (i = 0; i < keys.length; i++) prop.setValueAtTime(keys[i][0], keys[i][1]);
  for (i = 0; i < keys.length; i++) {
    var ki = prop.nearestKeyIndex(keys[i][0]);
    // straight motion paths: auto-bezier ones overshoot when a long move meets a short one
    if (spatial) prop.setSpatialTangentsAtKey(ki, [0, 0, 0], [0, 0, 0]);
    var kOut = i < keys.length - 1 ? (keys[i][2] || "io") : "io";
    var kIn = i > 0 ? (keys[i - 1][2] || "io") : "io";
    var B = KeyframeInterpolationType.BEZIER;
    var inT = kIn === "l" ? KeyframeInterpolationType.LINEAR : B;
    var outT = kOut === "l" ? KeyframeInterpolationType.LINEAR : kOut === "h" ? KeyframeInterpolationType.HOLD : B;
    if (kIn === "h") inT = KeyframeInterpolationType.HOLD;
    prop.setInterpolationTypeAtKey(ki, inT, outT);
    if (inT === B || outT === B) {
      var inE = i > 0 ? segEase(kIn, "in", keys[i - 1][1], keys[i][1], keys[i][0] - keys[i - 1][0], prop) : segEase("io", "in", 0, 0, 1, prop);
      var outE = i < keys.length - 1 ? segEase(kOut, "out", keys[i][1], keys[i + 1][1], keys[i + 1][0] - keys[i][0], prop) : segEase("io", "out", 0, 0, 1, prop);
      prop.setTemporalEaseAtKey(ki, inE, outE);
    }
  }
  return prop;
}
function blur(L) { L.motionBlur = true; return L; }
// a slam: scale from s0 (%) to 100 starting at t, settling in d seconds
function slam(L, t, s0, d) { K(L.transform.scale, [[t, [s0, s0, 100], "o"], [t + (d || 0.3), [100, 100, 100]]]); return blur(L); }
function popIn(L, t, d) { K(L.transform.scale, [[t, [0, 0, 100], "o"], [t + (d || 0.25), [100, 100, 100]]]); L.inPoint = Math.max(0, t - 0.001); return blur(L); }
function fadeUp(L, t, dy, d) {      // rise dy px into place while fading in
  var p = L.transform.position.value;
  K(L.transform.position, [[t, [p[0], p[1] + dy], "o"], [t + (d || 0.25), [p[0], p[1]]]]);
  K(L.transform.opacity, [[t, 0, "o"], [t + (d || 0.25) * 0.6, 100]]);
  L.inPoint = Math.max(0, t - 0.001);
  return blur(L);
}
function rise(L, t, dy) {           // a word rises with a vertical squash
  var p = L.transform.position.value;
  L.inPoint = Math.max(0, t - 0.001);
  K(L.transform.position, [[t, [p[0], p[1] + dy], "o"], [t + 0.28, [p[0], p[1]]]]);
  K(L.transform.scale, [[t, [100, 55, 100], "o"], [t + 0.28, [100, 100, 100]]]);
  return blur(L);
}
function drawOn(g, t, d) { var tr = trim(g); K(tr.property("End"), [[t, 0, "o"], [t + (d || 0.2), 100]]); return tr; }
// styled typing: types s from t0 at cps chars/s, with a coloured caret block that blinks once typed
function typeExpr(s, t0, cps, caret, blink, colorRuns) {
  var e = 'var s=' + JSON.stringify(s) + ';var n=Math.max(0,Math.min(s.length,Math.floor((time-' + t0 + ')*' + cps + ')));' +
          'var o=s.slice(0,n);var c=' + (caret ? '"\\u258c"' : '""') + ';';
  if (blink) e += 'if(n>=s.length&&Math.floor((time-' + t0 + ')/' + (BT / 2) + ')%2==1)c=" ";';
  e += 'if(time<' + t0 + ')c="";var st=text.sourceText.style.setText(o+c);';
  if (colorRuns) {
    e += 'var R=' + JSON.stringify(colorRuns) + ';for(var i=0;i<R.length;i++){if(R[i][0]<o.length)st=st.setFillColor(R[i][2],R[i][0],Math.min(R[i][1],o.length-R[i][0]));}';
  }
  if (caret) e += 'if(c.length&&c!=" ")st=st.setFillColor(' + JSON.stringify(RED) + ',o.length,1);';
  e += 'st';
  return e;
}
// a position path made of eased moves: segs = [[t0, t1, [x, y], arcHeight, ease], ...] starting from p0
function movesExpr(p0, segs) {
  return 'var S=' + JSON.stringify(segs) + ';var p=' + JSON.stringify(p0) + ';' +
    'for(var i=0;i<S.length;i++){var s=S[i];if(time<s[0])break;' +
    'var u=Math.min(1,(time-s[0])/(s[1]-s[0]));' +
    'var k=s[4]=="o"?1-Math.pow(1-u,4):(u<0.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2);' +
    'var q=[p[0]+(s[2][0]-p[0])*k,p[1]+(s[2][1]-p[1])*k-(s[3]||0)*Math.sin(Math.PI*k)];' +
    'if(u<1){p=q;break;}p=[s[2][0],s[2][1]];}p';
}

// ------------------------------------------------------------------ helpers: school materials
// a Greek school notebook (τετράδιο): faint cobalt rules every 48 px and a vermilion margin
function notebook(c, margin, y0) {
  var w = c.width, h = c.height, step = 48;
  y0 = y0 || 60;
  var L = obj(c, "Notebook", [0, 0]);
  var gr = grp(L, "rules"); path(gr, [[0, y0], [w, y0]], false); stroke(gr, COB, 2, 20);
  var r = gc(gr).addProperty("ADBE Vector Filter - Repeater");
  r.property("Copies").setValue(Math.ceil((h - y0) / step) + 1); r.property("Transform").property("Position").setValue([0, step]);
  if (margin) { var gm = grp(L, "margin"); path(gm, [[margin, 0], [margin, h]], false); stroke(gm, VER, 3, 60); }
  L.moveToEnd();
  return L;
}
// graph paper / chalkboard grid for the dark grounds
function gridLines(c, color, opacity, step) {
  var L = obj(c, "Grid", [0, 0]);
  var gh = grp(L, "h"); path(gh, [[0, 0], [W, 0]], false); stroke(gh, color, 1, opacity);
  var rh = gc(gh).addProperty("ADBE Vector Filter - Repeater"); rh.property("Copies").setValue(Math.ceil(H / step) + 1); rh.property("Transform").property("Position").setValue([0, step]);
  var gv = grp(L, "v"); path(gv, [[0, 0], [0, H]], false); stroke(gv, color, 1, opacity);
  var rv = gc(gv).addProperty("ADBE Vector Filter - Repeater"); rv.property("Copies").setValue(Math.ceil(W / step) + 1); rv.property("Transform").property("Position").setValue([step, 0]);
  L.moveToEnd();
  return L;
}
// the font has no ✓ or ✗, so checks and crosses are drawn strokes
function check(c, name, pos, size, color, width, drawAt) {
  var L = obj(c, name, pos), g = grp(L);
  path(g, [[-0.5 * size, 0.02 * size], [-0.14 * size, 0.36 * size], [0.52 * size, -0.38 * size]], false);
  roundStroke(g, color, width);
  if (drawAt !== undefined) { drawOn(g, drawAt, 0.18); L.inPoint = Math.max(0, drawAt - 0.001); }
  return L;
}
function cross(c, name, pos, size, color, width) {
  var L = obj(c, name, pos), g = grp(L), h = size / 2;
  path(g, [[-h, -h], [h, h]], false); path(g, [[h, -h], [-h, h]], false);
  roundStroke(g, color, width);
  return L;
}
function pill(c, name, pos, size, color, outline) {
  var L = obj(c, name, pos), g = grp(L);
  rect(g, size, size[1] / 2);
  if (outline) stroke(g, outline[0], outline[1]);
  if (color) fill(g, color);
  return L;
}
// a brutalist card: solid offset shadow plus a body with a 4 px ink outline
function card(c, name, pos, size, color, shadowOff, shadowColor, round) {
  var sh = obj(c, name + " shadow", [pos[0] + shadowOff, pos[1] + shadowOff]);
  var sg = grp(sh); rect(sg, size, round === undefined ? 16 : round); fill(sg, shadowColor || INK);
  var body = obj(c, name, pos);
  var bgp = grp(body); rect(bgp, size, round === undefined ? 16 : round); stroke(bgp, INK, 4); fill(bgp, color);
  return [sh, body];
}
// the mathe_ai wordmark: Geist Bold with the vermilion underscore; blink = [t0, t1, colour while off]
function wordmark(c, size, pos, color, just, blink) {
  var L = txt(c, "mathe_ai", { font: WORD, style: "Bold", size: size, color: color, just: just || "l", pos: pos, name: "mathe_ai" });
  var e = 'var st=text.sourceText.style.setText("mathe_ai");';
  if (blink) e += 'var u=(time>=' + blink[0] + '&&time<' + blink[1] + ')?' + JSON.stringify(blink[2]) + ':' + JSON.stringify(VER) + ';st.setFillColor(u,5,1)';
  else e += 'st.setFillColor(' + JSON.stringify(VER) + ',5,1)';
  L.property("Source Text").expression = e;
  return L;
}

// ------------------------------------------------------------------ 01 ΚΑΘΕ ΜΕΡΑ tiles (each a small comp)
var TW = 633, TH = 353, GAP = 10;
var BTs = String(BT);
function tile(name, color, nbMargin) {
  var c = mkComp(name, TW, TH, 2 * BAR, color);
  if (nbMargin) notebook(c, nbMargin);
  bg(c, color);
  return c;
}
function buildTiles() {
  var T = [], c, k;
  // 1. maths, with symbols floating
  c = tile("Tile 1 Μαθηματικά", VER);
  var m1 = txt(c, "ΜΑΘΗΜΑΤΙΚΑ", { size: 70, color: INK, just: "c", center: true, pos: [TW / 2, TH / 2 + 6] });
  K(m1.transform.position, [[1.4, [TW / 2 + 90, TH / 2 + 6], "o"], [1.8, [TW / 2, TH / 2 + 6], "io"], [2 * BAR, [TW / 2 - 24, TH / 2 + 6]]]); blur(m1);
  var sym = [["x²", 100, 116], ["π", 552, 82], ["√x", 104, 290], ["Σ", 548, 288]];
  for (k = 0; k < sym.length; k++) {
    var sy = txt(c, sym[k][0], { font: MONO, style: "Bold", size: 46, color: PAPER, just: "c", center: true, pos: [sym[k][1], sym[k][2]] });
    sy.transform.position.expression = "value+[Math.sin(time*2.2+" + k + ")*8,Math.cos(time*1.7+" + (k * 2) + ")*10]";
    sy.transform.rotation.expression = "Math.sin(time*1.5+" + k + ")*10";
  }
  T.push(c);
  // 2. a vocabulary card flipping apple ↔ μήλο on the beat
  c = tile("Tile 2 Λεξιλόγιο", PAPER, 56);
  txt(c, "ΑΓΓΛΙΚΑ", { font: MONO, style: "Bold", size: 20, color: COB, pos: [76, 50] });
  var vc = nul(c, "Card flip", [TW / 2 + 22, TH / 2 + 16]);
  vc.transform.scale.expression = "var f=(time%" + BTs + ")/" + BTs + ";var s=f<0.16?Math.abs(Math.cos(f/0.16*Math.PI))*100:100;[100,s,100]";
  var flip = "var n=Math.floor((time-0.08*" + BTs + ")/" + BTs + ");var el=((n%2)+2)%2==1;";
  var vparts = card(c, "Vocab card", [0, 0], [380, 170], CARD, 8);
  attach(vparts[0], vc); attach(vparts[1], vc);
  var vw = txt(c, "apple", { size: 68, color: INK, just: "c", pos: [0, 30], name: "Word" }); attach(vw, vc);
  vw.property("Source Text").expression = flip + 'var w=el?"μήλο":"apple";var st=text.sourceText.style.setText(w);el?st.setFillColor(' + JSON.stringify(COB) + ',0,4):st';
  var vl = txt(c, "EN", { font: MONO, style: "Bold", size: 18, color: GRAY, pos: [-170, -52], name: "Lang" }); attach(vl, vc);
  vl.property("Source Text").expression = flip + 'el?"ΕΛ":"EN"';
  T.push(c);
  // 3. Panhellenic exams, with a day counter ticking down
  c = tile("Tile 3 Πανελλήνιες", INK);
  txt(c, "ΠΑΝΕΛΛΗΝΙΕΣ", { size: 60, color: PAPER, just: "c", center: true, pos: [TW / 2, 128] });
  var cd = txt(c, "182 ΜΕΡΕΣ", { font: MONO, style: "Bold", size: 56, color: VER, just: "c", pos: [TW / 2, 262], name: "Countdown" });
  cd.property("Source Text").expression = '(182-Math.floor(time/' + (BT / 2) + '))+" ΜΕΡΕΣ"';
  T.push(c);
  // 4. an essay page with highlighter sweeps (highlights first, so they sit under the writing)
  c = tile("Tile 4 Έκθεση", PAPER, 56);
  var LL = [470, 500, 430, 300], HL = [[0, 1.45, 300], [1, 2.0, 440], [3, 2.6, 260]];
  for (k = 0; k < HL.length; k++) {
    var hy = 144 + HL[k][0] * 48;
    var hl = obj(c, "Highlight" + k, [76, hy]); var hg = grp(hl); rect(hg, [HL[k][2], 30], 4, [HL[k][2] / 2, 0]); fill(hg, YEL, 90);
    hl.inPoint = HL[k][1]; K(hl.transform.scale, [[HL[k][1], [0, 100, 100], "io"], [HL[k][1] + 0.32, [100, 100, 100]]]);
  }
  txt(c, "ΕΚΘΕΣΗ", { size: 48, color: INK, pos: [76, 98] });
  for (k = 0; k < 4; k++) { var ln = obj(c, "Line" + k, [76, 144 + k * 48]); var lg = grp(ln); rect(lg, [LL[k], 8], 4, [LL[k] / 2, 0]); fill(lg, GRAY, 85); }
  T.push(c);
  // 5. centre tile (sits behind AI): a dot grid
  c = tile("Tile 5 Grid", INK);
  var gd = obj(c, "Dots", [24, 24]); var gg = grp(gd); ell(gg, [5, 5]); fill(gg, PAPER, 35);
  repeater(gd, 20, [31, 0]); repeater(gd, 11, [0, 31]);
  T.push(c);
  // 6. a weekly study timetable, blocks dropping in on the 8ths
  c = tile("Tile 6 Πρόγραμμα", COB);
  var days = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ"], cx0 = 96, cstep = 110;
  for (k = 0; k < 5; k++) txt(c, days[k], { font: MONO, style: "Bold", size: 22, color: PAPER, just: "c", pos: [cx0 + k * cstep, 62] });
  var rl = obj(c, "Rows", [0, 0]); var rlg = grp(rl); path(rlg, [[40, 88], [TW - 40, 88]], false); stroke(rlg, PAPER, 2, 30);
  var blocks = [[0, 0, "ΜΑΘ", YEL], [2, 0, "ΑΓΓ", VER], [1, 1, "ΦΥΣ", PAPER], [4, 1, "ΧΗΜ", YEL], [3, 2, "ΙΣΤ", PAPER],
                [0, 2, "ΕΚΘ", VER], [2, 2, "ΜΑΘ", YEL], [4, 0, "ΠΛΗ", PAPER]];
  for (k = 0; k < blocks.length; k++) {
    var b = blocks[k], bx = cx0 + b[0] * cstep, by = 136 + b[1] * 74, t0 = 1.42 + k * BT / 2;
    var bl = obj(c, "Block" + k, [bx, by]); var blg = grp(bl); rect(blg, [98, 60], 8); fill(blg, b[3]);
    bl.inPoint = t0; K(bl.transform.position, [[t0, [bx, by - 70], "o"], [t0 + 0.22, [bx, by]]]); blur(bl);
    var bt = txt(c, b[2], { font: MONO, style: "Bold", size: 20, color: b[3] === PAPER ? COB : INK, just: "c", center: true, pos: [0, 0] });
    bt.inPoint = t0; attach(bt, bl); bt.transform.position.setValue([0, 0]);
  }
  T.push(c);
  // 7. a chat bubble whose typing dots resolve into «;»
  c = tile("Tile 7 Ερώτηση", VER);
  var bub = obj(c, "Bubble", [TW / 2, TH / 2 - 8]);
  var bbg = grp(bub, "body"); rect(bbg, [300, 150], 44); stroke(bbg, INK, 4); fill(bbg, PAPER);
  var btl = grp(bub, "tail"); path(btl, [[-96, 50], [-150, 112], [-40, 66]], true); stroke(btl, INK, 4); fill(btl, PAPER);
  var tQ = 6 * BT;
  for (k = 0; k < 3; k++) {
    var dt = obj(c, "Typing dot" + k, [TW / 2 - 52 + k * 52, TH / 2 - 8]); var dtg = grp(dt); ell(dtg, [24, 24]); fill(dtg, INK);
    dt.transform.position.expression = "value+[0,-14*Math.max(0,Math.sin((time*2.4-" + (k * 0.16) + ")*Math.PI*2))]";
    dt.outPoint = tQ;
  }
  var q = txt(c, "«;»", { size: 104, color: INK, just: "c", center: true, pos: [TW / 2, TH / 2 - 8] });
  popIn(q, tQ, 0.24);
  T.push(c);
  // 8. Python typing print("γεια σου!")
  c = tile("Tile 8 Python", INK);
  txt(c, "PYTHON", { font: MONO, style: "Bold", size: 20, color: VER, pos: [44, 56] });
  var code = txt(c, "x", { font: MONO, style: "Medium", size: 32, color: PAPER, pos: [44, 172], name: "Code" });
  code.property("Source Text").expression = typeExpr('>>> print("γεια σου!")', 1.45, 18, true, true, [[0, 4, GRAY], [10, 11, YEL]]);
  var outp = txt(c, "γεια σου!", { font: MONO, style: "Medium", size: 32, color: PAPER, pos: [44, 228], name: "Output" });
  outp.inPoint = 6 * BT;
  T.push(c);
  // 9. a quiz card where γ gets a cobalt check
  c = tile("Tile 9 Κουίζ", PAPER, 56);
  txt(c, "ΚΟΥΙΖ", { font: MONO, style: "Bold", size: 20, color: COB, pos: [76, 50] });
  txt(c, "x + 3 = 5,  x = ;", { font: MONO, style: "Bold", size: 40, color: INK, pos: [76, 134] });
  var opts = ["α) 1", "β) 3", "γ) 2", "δ) 5"], oy = 236;
  for (k = 0; k < 4; k++) {
    var ox = 138 + k * 132;
    pill(c, "Option" + k, [ox, oy], [116, 58], CARD, [INK, 3]);
    txt(c, opts[k], { font: MONO, style: "Bold", size: 26, color: INK, just: "c", center: true, pos: [ox, oy] });
  }
  var tR = 6 * BT, gx = 138 + 2 * 132;
  var ok = pill(c, "Right answer", [gx, oy], [116, 58], COB, [INK, 3]); popIn(ok, tR, 0.2);
  var okT = txt(c, "γ) 2", { font: MONO, style: "Bold", size: 26, color: PAPER, just: "c", center: true, pos: [gx, oy] }); popIn(okT, tR, 0.2);
  check(c, "Check", [gx + 62, oy - 58], 54, COB, 10, tR + 0.08);
  T.push(c);
  return T;
}

// ------------------------------------------------------------------ 01 ΚΑΘΕ ΜΕΡΑ  (bars 1-2)
function buildEveryDay() {
  var c = mkComp("01 Κάθε μέρα", W, H, 2 * BAR, INK);
  span(notebook(c, 150), 0, lt(0, 2));
  bg(c, VER, "BG vermilion", lt(0, 2), lt(0, 3));
  bg(c, PAPER, "BG paper", 0, lt(0, 2));
  bg(c, INK, "BG ink");
  // bar 1: the words slam on the beats
  var w1 = txt(c, "ΚΑΘΕ", { size: 360, color: INK, just: "c", center: true, pos: [W / 2, H / 2] });
  span(w1, 0, lt(0, 2)); slam(w1, 0, 122, 0.32);
  K(w1.transform.rotation, [[0, -4, "o"], [0.32, 0]]);
  var w2 = txt(c, "ΜΕΡΑ", { size: 420, color: PAPER, just: "c", center: true, pos: [W / 2, H / 2] });
  span(w2, lt(0, 2), lt(0, 3)); K(w2.transform.position, [[lt(0, 2), [W / 2, H / 2 + 140], "o"], [lt(0, 2) + 0.28, [W / 2, H / 2]]]); slam(w2, lt(0, 2), 112, 0.28);
  var w3 = txt(c, "ΜΕ", { size: 420, color: YEL, just: "c", center: true, pos: [W / 2, H / 2] });
  span(w3, lt(0, 3), lt(0, 4) + 0.2);
  K(w3.transform.scale, [[lt(0, 3), [140, 140, 100], "o"], [lt(0, 3) + 0.3, [100, 100, 100], "i"], [lt(0, 4) + 0.2, [0, 0, 100]]]); blur(w3);
  K(w3.transform.rotation, [[lt(0, 3), 7, "o"], [lt(0, 3) + 0.3, 0, "i"], [lt(0, 4) + 0.2, -25]]);
  // the mosaic assembles on 16ths during beat 4, then plays under AI
  var tiles = buildTiles(), order = [4, 0, 8, 2, 6, 1, 7, 3, 5];
  for (var i = 0; i < 9; i++) {
    var col = i % 3, row = Math.floor(i / 3);
    var L = c.layers.add(tiles[i]);
    L.transform.position.setValue([col * (TW + GAP) + TW / 2, row * (TH + GAP) + TH / 2]);
    var t0 = lt(0, 4) + order.indexOf(i) * 0.045;
    L.startTime = 0; L.inPoint = t0;
    K(L.transform.scale, [[t0, [0, 0, 100], "o"], [t0 + 0.28, [100, 100, 100]]]);
    K(L.transform.rotation, [[t0, (i % 2 ? 9 : -9), "o"], [t0 + 0.3, 0]]);
    blur(L);
  }
  w3.moveToBeginning();                       // ΜΕ stays above the tiles while it leaves
  // bar 2: AI, with a vermilion extrusion, pulsing on every beat
  var t2 = lt(1, 1);
  var sh = txt(c, "AI", { size: 680, color: VER, just: "c", center: true, pos: [W / 2 + 22, H / 2 + 22], name: "AI extrusion", outline: [INK, 16] });
  var th = txt(c, "AI", { size: 680, color: PAPER, just: "c", center: true, pos: [W / 2, H / 2], name: "AI", outline: [INK, 16] });
  [sh, th].forEach(function (L) {
    L.inPoint = t2;
    K(L.transform.scale, [[t2, [175, 175, 100], "o"], [t2 + 0.34, [100, 100, 100]]]);
    K(L.transform.rotation, [[t2, -9, "o"], [t2 + 0.34, -3, "io"], [2 * BAR, -1]]);
    blur(L);
  });
  var pulse = "var f=(time-" + t2 + ")%" + BTs + ";var k=time>" + (t2 + BT - 0.01) + "?5*Math.exp(-f/0.07):0;value+[k,k,0]";
  sh.transform.scale.expression = pulse; th.transform.scale.expression = pulse;
  return c;
}

// ------------------------------------------------------------------ 02 ΧΩΡΙΣ ΠΑΠΑΓΑΛΙΑ  (bar 3)
function buildNoRote() {
  var c = mkComp("02 Χωρίς παπαγαλία", W, H, BAR, INK);
  var glow = obj(c, "Glow", [W / 2, 620]); var gg = grp(glow); ell(gg, [1500, 600]); fill(gg, VER, 30);
  var gb = glow.property("Effects").addProperty("ADBE Gaussian Blur 2"); gb.property(1).setValue(220);
  K(glow.transform.opacity, [[0, 0, "h"], [lt(0, 2), 100]]);
  gridLines(c, PAPER, 7, 60);
  bg(c, INK);
  // "χωρίς" types in, with a blinking vermilion block caret
  var wo = txt(c, "χωρίς", { font: MONO, style: "Bold", size: 66, color: PAPER, pos: [W / 2 - 6 * 0.6 * 66 / 2, 330] });
  wo.property("Source Text").expression = typeExpr("χωρίς", 0.02, 26, true, true);
  // ΠΑΠΑΓΑΛΙΑ (rote learning) slams in on beat 2, with a cobalt chromatic fringe snapping into register
  var t = lt(0, 2), gN = nul(c, "Group", [W / 2, 620]);
  var fr = txt(c, "ΠΑΠΑΓΑΛΙΑ", { size: 230, color: COB, just: "c", center: true, pos: [W / 2, 620], name: "ΠΑΠΑΓΑΛΙΑ fringe" });
  var tx = txt(c, "ΠΑΠΑΓΑΛΙΑ", { size: 230, color: VER, just: "c", center: true, pos: [W / 2, 620] });
  fr.moveAfter(tx);
  [fr, tx].forEach(function (L) { L.inPoint = t; L.parent = gN; slam(L, t, 130, 0.26); });
  var p0 = fr.transform.position.value;
  K(fr.transform.position, [[t, [p0[0] - 26, p0[1] - 14], "o"], [t + 0.2, [p0[0] - 6, p0[1] - 3]]]);
  // beat 3: a paper bar strikes it out and dots pop
  var t3 = lt(0, 3);
  var bar = obj(c, "Strike", [0, 0]); attach(bar, gN);
  bar.transform.position.setValue([-860, 105]);   // tilted -7°, so it crosses the middle of the word
  var bgp = grp(bar); rect(bgp, [1720, 46], 4, [860, 0]); fill(bgp, PAPER);
  bar.transform.rotation.setValue(-7);
  bar.inPoint = t3;
  K(bar.transform.scale, [[t3, [0, 100, 100], "o"], [t3 + 0.13, [100, 100, 100]]]); blur(bar);
  var dots = [[-640, -230, 64, COB], [-420, 150, 46, PAPER], [-170, -190, 38, YEL], [60, 200, 58, COB], [300, -200, 44, VER],
              [520, 150, 70, PAPER], [720, -120, 40, YEL], [-780, 60, 30, VER], [180, -280, 28, PAPER], [-300, 260, 34, COB],
              [840, 220, 52, COB], [-40, 300, 26, YEL], [440, 300, 30, PAPER], [-560, -320, 22, YEL]];
  for (var d = 0; d < dots.length; d++) {
    var D = dots[d], L = obj(c, "dot" + d, [D[0], D[1]]); attach(L, gN);
    var dg = grp(L); ell(dg, [D[2], D[2]]); fill(dg, D[3]);
    var td = t3 + 0.03 + d * 0.025; popIn(L, td, 0.22);
    K(L.transform.position, [[td, [D[0] * 0.8, D[1] * 0.8], "o"], [BAR, [D[0] * 1.12, D[1] * 1.12 + 40]]]);
  }
  // beat 4: the whole thing tilts and drops
  K(gN.transform.rotation, [[lt(0, 4), 0, "i"], [BAR, -6]]);
  K(gN.transform.position, [[lt(0, 4), [W / 2, 620], "i"], [BAR, [W / 2, 690]]]);
  return c;
}

// ------------------------------------------------------------------ 03 ΡΩΤΑ  (bars 4-5)
var PROMPT = "εξήγησέ μου βήμα-βήμα πώς λύνω την εξίσωση 2x\u00a0+\u00a05\u00a0=\u00a017. είμαι στη Β΄\u00a0λυκείου. μη μου πεις μόνο την απάντηση.";
function buildAsk() {
  var c = mkComp("03 Ρώτα", W, H, 2 * BAR, PAPER);
  notebook(c, 150);
  bg(c, PAPER);
  // ΡΩΤΑ / ΣΩΣΤΑ. / → και θα μάθεις.
  rise(centerKeep(txt(c, "ΡΩΤΑ", { size: 150, color: INK, pos: [200, 470] })), lt(0, 1), 70);
  rise(centerKeep(txt(c, "ΣΩΣΤΑ.", { size: 150, color: VER, pos: [200, 630] })), lt(0, 2), 70);
  fadeUp(txt(c, "→ και θα μάθεις.", { font: MONO, style: "Bold", size: 40, color: INK, pos: [206, 724] }), lt(0, 3), 30, 0.25);
  // the chat card
  var cx = 1424, cy = 478, cw = 800, chh = 440;
  var cardN = nul(c, "Card", [cx, cy]);
  K(cardN.transform.position, [[0, [cx + 820, cy + 60], "o"], [0.42, [cx, cy]]]);
  K(cardN.transform.rotation, [[0, 6, "o"], [0.42, 0]]);
  function onCard(L) { attach(L, cardN); return blur(L); }
  var parts = card(c, "Card body", [0, 0], [cw, chh], CARD, 14);
  onCard(parts[0]); onCard(parts[1]);
  var wmX = -cw / 2 + 40, wmY = -chh / 2 + 56, wmO = { font: WORD, style: "Bold", size: 32 };
  onCard(wordmark(c, 32, [wmX, wmY], INK));
  var pillX = cw / 2 - 112;
  onCard(pill(c, "New chat pill", [pillX, -chh / 2 + 46], [176, 34], null, [INK, 2.5]));
  onCard(txt(c, "ΝΕΑ ΣΥΖΗΤΗΣΗ", { font: MONO, style: "Bold", size: 15, color: INK, just: "c", pos: [pillX, -chh / 2 + 51] }));
  var div = obj(c, "Divider", [0, -chh / 2 + 86]); var dvg = grp(div); rect(dvg, [cw - 48, 2.5]); fill(dvg, INK, 20); onCard(div);
  var prompt = boxTxt(c, "x", { font: MONO, style: "Medium", size: 26, color: INK, box: [cw - 88, 240], leading: 38, name: "Prompt" }, [-cw / 2 + 44, -chh / 2 + 112]);
  prompt.property("Source Text").expression = typeExpr(PROMPT, 0.32, 60, true, true);
  onCard(prompt);
  var plus = obj(c, "Plus", [-cw / 2 + 52, chh / 2 - 48]); var plg = grp(plus); ell(plg, [44, 44]); stroke(plg, INK, 2.5);
  var plh = grp(plus); rect(plh, [18, 2.5]); fill(plh, INK); var plv = grp(plus); rect(plv, [2.5, 18]); fill(plv, INK); onCard(plus);
  var send = obj(c, "Send", [cw / 2 - 54, chh / 2 - 48]);
  var arrow = grp(send, "arrow"); path(arrow, [[0, 11], [0, -11]], false); path(arrow, [[-9, -2], [0, -11], [9, -2]], false);
  roundStroke(arrow, PAPER, 4);
  var sgp = grp(send, "button"); ell(sgp, [58, 58]); stroke(sgp, INK, 3); fill(sgp, VER);
  onCard(send);
  // bar 5: the pointer glides in and clicks send on beat 3
  var tc = lt(1, 3);
  var ptr = obj(c, "Pointer", [0, 0]); var ptg = grp(ptr);
  path(ptg, [[0, 0], [0, 40], [10, 30], [18, 48], [25, 45], [17, 27], [30, 27]], true); stroke(ptg, INK, 3); fill(ptg, WHITE);
  var bx = cx + cw / 2 - 54, by = cy + chh / 2 - 48;
  ptr.inPoint = lt(1, 2) - 0.1;
  K(ptr.transform.position, [[lt(1, 2) - 0.1, [1900, 1060], "o"], [tc - 0.03, [bx - 4, by - 2], "h"], [tc + 0.05, [bx - 4, by - 2], "i"], [tc + 0.5, [bx + 60, by + 220]]]);
  blur(ptr);
  K(send.transform.scale, [[tc, [100, 100, 100], "o"], [tc + 0.07, [84, 84, 100], "o"], [tc + 0.22, [100, 100, 100]]]);
  var rip = obj(c, "Ripple", [bx, by]); var rpg = grp(rip); ell(rpg, [60, 60]); stroke(rpg, VER, 5);
  rip.inPoint = tc; rip.outPoint = tc + 0.45;
  K(rip.transform.scale, [[tc, [100, 100, 100], "o"], [tc + 0.42, [330, 330, 100]]]);
  K(rip.transform.opacity, [[tc, 100, "i"], [tc + 0.42, 0]]);
  // the wordmark's underscore shoots out into a vermilion line, which splits open into ink
  var uAdv = adv(c, "mathe", wmO), uR = measure(c, "_", wmO);
  var ux = cx + wmX + uAdv + uR.left + uR.width / 2, uy = cy + wmY + uR.top + uR.height / 2, uw = Math.max(uR.width, 1), uh = Math.max(uR.height, 1);
  var t5 = tc + 0.04, tw = lt(1, 4), TH8 = 8;
  var line = obj(c, "Underscore line", [ux, uy]); var lng = grp(line); rect(lng, [uw, uh]); fill(lng, VER);
  span(line, t5, tw + 0.02);
  K(line.transform.position, [[t5, [ux, uy], "o"], [t5 + 0.3, [W / 2, uy]]]);
  K(line.transform.scale, [[t5, [100, 100, 100], "o"], [t5 + 0.3, [(W + 80) / uw * 100, TH8 / uh * 100, 100]]]);
  blur(line);
  var hMax = 2 * Math.max(uy, H - uy) + 40;
  var field = obj(c, "Ink field", [W / 2, uy]); var fg = grp(field), fr = rect(fg, [W + 80, 2]); fill(fg, INK);
  field.inPoint = tw;
  K(fr.property("Size"), [[tw, [W + 80, 2], "i"], [2 * BAR, [W + 80, hMax]]]);
  for (var e = -1; e <= 1; e += 2) {
    var edge = obj(c, "Edge" + (e < 0 ? " top" : " bottom"), [W / 2, uy]); var eg = grp(edge); rect(eg, [W + 80, TH8]); fill(eg, VER);
    edge.inPoint = tw;
    K(edge.transform.position, [[tw, [W / 2, uy], "i"], [2 * BAR, [W / 2, uy + e * (hMax / 2 + TH8)]]]);
    blur(edge);
  }
  return c;
}

// ------------------------------------------------------------------ 04 ΒΗΜΑ-ΒΗΜΑ  (bars 6-7): the worked answer as kinetic maths
function buildSteps() {
  var c = mkComp("04 Βήμα-βήμα", W, H, 2 * BAR, INK);
  gridLines(c, COB, 12, 60);
  bg(c, INK);
  var CW = 90, Y = 505;                                  // mono 150 px: 90 px per character
  function X(x0, col, n) { return x0 + (col + (n || 1) / 2) * CW; }
  function tok(s, color) {
    var L = txt(c, s, { font: MONO, style: "Bold", size: 150, color: color || PAPER, just: "c", pos: [0, 0], name: "tok " + s });
    L.transform.anchorPoint.setValue([0, -55]);
    return blur(L);
  }
  function vanish(L, t0, t1) { K(L.transform.scale, [[t0, [100, 100, 100], "i"], [t1, [0, 0, 100]]]); L.outPoint = t1; }
  function arrive(L, t, d) { K(L.transform.scale, [[t, [0, 0, 100], "o"], [t + (d || 0.24), [100, 100, 100]]]); L.inPoint = Math.max(0, t - 0.001); }
  var tB = lt(0, 2), tC = lt(0, 3), tD = lt(1, 1), tE = tD + BT / 2, tF = lt(1, 2), tG = lt(1, 3);
  var A0 = 465, A2 = 645, A3 = 510, A4 = 735;           // left edges of 2x+5=17 / 2x=12 / x=12:2 / x=6
  var mB0 = tB + 0.05, mB1 = tB + 0.36;                 // +5 arcs over the equals sign
  // the tokens and their moves
  var two = tok("2"), x = tok("x"), plus = tok("+"), minus = tok("−", VER), five = tok("5"), eq = tok("="), n17 = tok("17");
  var n12 = tok("12"), div = tok(":", VER), six = tok("6");
  two.transform.position.expression = movesExpr([X(A0, 0), Y], [[tC, tC + 0.22, [X(A2, 0), Y], 0, "o"],
    [tD + 0.05, tD + 0.34, [X(A3, 9), Y], 190], [tE, tE + 0.16, [X(A4, 4), Y], 0]]);
  x.transform.position.expression = movesExpr([X(A0, 1), Y], [[tC, tC + 0.22, [X(A2, 1), Y], 0, "o"],
    [tD + 0.05, tD + 0.3, [X(A3, 0), Y], 0, "o"], [tE, tE + 0.22, [X(A4, 0), Y], 0, "o"]]);
  var plusMove = movesExpr([X(A0, 3), Y], [[mB0, mB1, [X(A0, 8), Y], 210], [tC, tC + 0.16, [X(A2, 5, 2), Y], 0]]);
  plus.transform.position.expression = plusMove; minus.transform.position.expression = plusMove;
  five.transform.position.expression = movesExpr([X(A0, 5), Y], [[mB0, mB1, [X(A0, 10), Y], 250], [tC, tC + 0.16, [X(A2, 5, 2), Y], 0]]);
  eq.transform.position.expression = movesExpr([X(A0, 7), Y], [[mB0, mB1, [X(A0, 3), Y], 0, "o"], [tC, tC + 0.22, [X(A2, 3), Y], 0, "o"],
    [tD + 0.05, tD + 0.3, [X(A3, 2), Y], 0, "o"], [tE, tE + 0.22, [X(A4, 2), Y], 0, "o"]]);
  n17.transform.position.expression = movesExpr([X(A0, 9, 2), Y], [[mB0, mB1, [X(A0, 5, 2), Y], 0, "o"], [tC, tC + 0.16, [X(A2, 5, 2), Y], 0]]);
  n12.transform.position.expression = movesExpr([X(A2, 5, 2), Y], [[tD + 0.05, tD + 0.3, [X(A3, 4, 2), Y], 0, "o"], [tE, tE + 0.16, [X(A4, 4), Y], 0]]);
  div.transform.position.setValue([X(A3, 7), Y]);
  div.transform.position.expression = movesExpr([X(A3, 7), Y], [[tE, tE + 0.16, [X(A4, 4), Y], 0]]);
  six.transform.position.setValue([X(A4, 4), Y]);
  // stage A: 2x + 5 = 17 lands on 16ths
  var pops = [[two, 0], [x, 0], [plus, 1], [five, 2], [eq, 3], [n17, 4]];
  for (var i = 0; i < pops.length; i++) arrive(pops[i][0], pops[i][1] * BT / 4, 0.2);
  // stage B: + flips to − at the top of its arc
  var mid = (mB0 + mB1) / 2;
  plus.outPoint = mid;
  minus.inPoint = mid;
  // stage C: 17 − 5 collapses into 12
  vanish(n17, tC, tC + 0.16); vanish(minus, tC, tC + 0.16); vanish(five, tC, tC + 0.16);
  arrive(n12, tC + 0.1, 0.24);
  // stage D: the 2 drops to the right side as : 2
  arrive(div, tD + 0.2, 0.2);
  // stage E: 12 : 2 collapses to 6, and x = 6 gets a box and a check
  vanish(n12, tE, tE + 0.16); vanish(div, tE, tE + 0.16); vanish(two, tE, tE + 0.16);
  arrive(six, tE + 0.1, 0.26);
  var box = obj(c, "Answer box", [W / 2, Y]); var bxg = grp(box); rect(bxg, [560, 210], 18); stroke(bxg, VER, 6);
  drawOn(bxg, tE + 0.12, 0.3); box.inPoint = tE + 0.11;
  check(c, "Answer check", [1312, Y], 84, VER, 13, tE + 0.3);
  // the labels: what each step does
  var labs = [["αφαιρώ 5 και από τα δύο μέλη", tB, tD], ["διαιρώ και τα δύο μέλη με 2", tD, tF]];
  for (var j = 0; j < labs.length; j++) {
    var lb = txt(c, labs[j][0], { style: "SemiBold", size: 44, color: VER, just: "c", pos: [W / 2, 800], name: "Label" + (j + 1) });
    fadeUp(lb, labs[j][1], 24, 0.22); lb.outPoint = labs[j][2];
  }
  // stage F: verification types underneath, then a yellow check
  var ver = "επαλήθευση: 2·6 + 5 = 17", vx = W / 2 - ver.length * 22.8 / 2;
  var vt = txt(c, "x", { font: MONO, style: "Medium", size: 38, color: PAPER, pos: [vx, 812], name: "Verification" });
  vt.property("Source Text").expression = typeExpr(ver, tF, 60, false, false, [[12, 12, YEL]]);
  vt.inPoint = tF;
  check(c, "Verification check", [vx + ver.length * 22.8 + 46, 798], 44, YEL, 8, tF + ver.length / 60 + 0.02);
  // stage G: a follow-up question and the reply
  var chips = [["γιατί αφαιρώ το 5;", tG, 190, false], ["για να μείνει μόνο του το 2x.", tG + BT / 2, 282, true]];
  for (var k = 0; k < chips.length; k++) {
    var ch = chips[k], wch = ch[0].length * 16.8 + 64, cxx = 1776 - wch / 2;
    var cN = nul(c, "Chip" + k, [cxx, ch[2]]);
    var pl = pill(c, "Chip body" + k, [0, 0], [wch, 64], ch[3] ? VER : INK, ch[3] ? null : [PAPER, 3]);
    var ct = txt(c, ch[0], { font: MONO, style: "Medium", size: 28, color: PAPER, just: "c", pos: [0, 10] });
    attach(pl, cN); attach(ct, cN); pl.inPoint = ct.inPoint = ch[1];
    K(cN.transform.position, [[ch[1], [cxx + 700, ch[2]], "o"], [ch[1] + 0.3, [cxx, ch[2]]]]); blur(cN); blur(pl); blur(ct);
  }
  return c;
}

// ------------------------------------------------------------------ 05 3 ΚΑΝΟΝΕΣ  (bars 8-10): one rule per bar
var RULES = [
  [VER, INK, ["ΔΩΣΕ", "ΠΛΑΙΣΙΟ."], "είμαι στη Β΄ λυκείου και γράφω διαγώνισμα την Παρασκευή", false],
  [COB, PAPER, ["ΖΗΤΑ", "ΕΞΗΓΗΣΗ."], "εξήγησέ το μου σαν να είμαι 12 χρονών", false],
  [PAPER, INK, ["ΕΛΕΓΞΕ ΤΗΝ", "ΑΠΑΝΤΗΣΗ."], "από πού το ξέρεις; δώσε μου την πηγή.", true],
];
function ruleCard(n, R) {
  var color = R[0], tcol = R[1], D = 0.1;               // card time D is the downbeat (cards start early to slide in)
  var c = mkComp("Κανόνας " + n, W, H, BAR + 0.6, color);
  if (R[4]) notebook(c, 150);
  bg(c, color);
  var num = txt(c, String(n), { size: 980, color: color, just: "c", pos: [1520, 1010], name: "Number", outline: [tcol, 8] });
  num.transform.opacity.setValue(45);
  K(num.transform.position, [[0, [1560, 1010], "l"], [BAR + 0.6, [1470, 1010]]]); blur(num);
  txt(c, "ΚΑΝΟΝΑΣ " + n, { font: MONO, style: "Bold", size: 26, color: tcol, pos: [204, 250], opacity: 75 });
  for (var i = 0; i < R[2].length; i++) rise(centerKeep(txt(c, R[2][i], { size: 150, color: tcol, pos: [200, 420 + i * 160] })), D + 0.04 + i * 0.07, 60);
  // the example prompt types on beats 2-4
  var tc = D + BT, cw = R[3].length * 18 + 84;
  var chip = nul(c, "Chip", [200, 720]);
  var parts = card(c, "Chip body", [cw / 2, 0], [cw, 76], CARD, 8, INK, 14);
  var pr = txt(c, "x", { font: MONO, style: "Medium", size: 30, color: INK, pos: [40, 11], name: "Chip text" });
  pr.property("Source Text").expression = typeExpr(R[3], tc, 45, true, true);
  [parts[0], parts[1], pr].forEach(function (L) { attach(L, chip); L.inPoint = tc - 0.08; });
  K(chip.transform.position, [[tc - 0.08, [200, 770], "o"], [tc + 0.16, [200, 720]]]); blur(chip);
  if (R[4]) {                                            // rule 3 gets a cobalt check stamp on beat 4
    var ts = D + 3 * BT;
    var st = obj(c, "Stamp", [1420, 500]); var sg = grp(st); ell(sg, [230, 230]); stroke(sg, COB, 12);
    var sc = grp(st, "check"); path(sc, [[-58, 2], [-18, 44], [62, -46]], false); roundStroke(sc, COB, 20);
    st.inPoint = ts;
    K(st.transform.scale, [[ts, [180, 180, 100], "o"], [ts + 0.16, [100, 100, 100]]]);
    K(st.transform.rotation, [[ts, -24, "o"], [ts + 0.16, -12]]);
    K(st.transform.opacity, [[ts, 0, "o"], [ts + 0.06, 100]]); blur(st);
  }
  return c;
}
function buildRules() {
  var c = mkComp("05 Κανόνες", W, H, 3 * BAR, INK);
  bg(c, INK);
  for (var i = 0; i < RULES.length; i++) {
    var L = c.layers.add(ruleCard(i + 1, RULES[i]));
    var t0 = i * BAR - 0.1, ts = Math.max(0, t0);
    L.startTime = t0; L.inPoint = ts; L.outPoint = i < RULES.length - 1 ? (i + 1) * BAR + 0.25 : 3 * BAR;
    K(L.transform.position, [[ts, [W / 2, H / 2 + H + 40], "o"], [ts + 0.28, [W / 2, H / 2]]]);
    K(L.transform.rotation, [[ts, 3, "o"], [ts + 0.28, 0]]);
    blur(L);
  }
  return c;
}

// ------------------------------------------------------------------ 06 ΠΑΝΤΟΥ  (bars 11-12): what to use it for
var USES = [
  ["≡", "Περίληψη σημειώσεων", "«κάνε μου περίληψη σε 5 κουκκίδες»", VER],
  ["?", "Κουίζ για το διαγώνισμα", "«φτιάξε μου 10 ερωτήσεις πολλαπλής επιλογής»", COB],
  ["¶", "Ιδέες για την έκθεση", "«δώσε μου 3 επιχειρήματα υπέρ και κατά»", YEL],
  ["py", "Βοήθεια με Python", "«γιατί βγάζει error ο κώδικάς μου;»", INK],
  ["EN", "Εξάσκηση στα Αγγλικά", "«μίλα μου μόνο στα αγγλικά για 5 λεπτά»", COB],
  ["@", "Email στον καθηγητή", "«γράψε ένα ευγενικό email για παράταση»", VER],
  ["Δ–Π", "Πρόγραμμα διαβάσματος", "«μοίρασε 4 μαθήματα σε 5 μέρες»", INK],
  ["°C", "Μαγείρεμα", "«τι φτιάχνω με αυγά, ντομάτα και φέτα;»", YEL],
];
function buildEverywhere() {
  var c = mkComp("06 Παντού", W, H, 2 * BAR, INK);
  gridLines(c, PAPER, 6, 60);
  bg(c, INK);
  var heads = [["ΣΤΟ ΣΧΟΛΕΙΟ.", 0, BAR], ["ΚΑΙ ΠΑΝΤΟΥ.", BAR, 2 * BAR]];
  for (var h = 0; h < heads.length; h++) {
    var hs = txt(c, heads[h][0], { size: 140, color: VER, just: "c", center: true, pos: [W / 2 + 10, 262], name: heads[h][0] + " offset" });
    var ht = txt(c, heads[h][0], { size: 140, color: PAPER, just: "c", center: true, pos: [W / 2, 252] });
    [hs, ht].forEach(function (L) { span(L, heads[h][1], heads[h][2]); slam(L, heads[h][1], 125, 0.3); });
  }
  for (var row = 0; row < 2; row++) {
    var R = nul(c, row ? "Row life" : "Row school");
    var t0 = row * BAR, tout = row ? 2 * BAR : BAR + 0.12;
    // one strip: the school row whips out left as the life row whips in from the right
    if (row === 0) K(R.transform.position, [[0, [W, 0], "o"], [0.3, [0, 0], "l"], [BAR - 0.14, [-36, 0], "i"], [BAR + 0.1, [-W - 200, 0]]]);
    else K(R.transform.position, [[BAR - 0.02, [W + 200, 0], "o"], [BAR + 0.28, [0, 0], "l"], [2 * BAR, [-40, 0]]]);
    blur(R);
    for (var k = 0; k < 4; k++) {
      var u = USES[row * 4 + k], tk = t0 + k * BT, px = 285 + k * 450, py = 668;
      var N = nul(c, "Use " + u[1], [px, py]); attach(N, R);
      K(N.transform.scale, [[tk, [0, 0, 100], "o"], [tk + 0.26, [100, 100, 100]]]);
      K(N.transform.rotation, [[tk, k % 2 ? 8 : -8, "o"], [tk + 0.3, 0]]);
      var parts = card(c, "Use card", [0, 0], [400, 330], CARD, 12, u[3] === INK ? VER : u[3], 18);
      var badge = obj(c, "Badge", [-130, -98]); var bg_ = grp(badge); ell(bg_, [84, 84]); stroke(bg_, INK, 3); fill(bg_, u[3]);
      var bt = txt(c, u[0], { font: MONO, style: "Bold", size: u[0].length > 2 ? 24 : 32, color: u[3] === YEL ? INK : PAPER, just: "c", center: true, pos: [0, 0] });
      var lab = boxTxt(c, u[1], { style: "Bold", size: 34, color: INK, box: [352, 96], leading: 40 }, [-176, -38]);
      var ex = boxTxt(c, u[2], { font: MONO, style: "Medium", size: 21, color: INK, box: [352, 80], leading: 29, opacity: 72 }, [-176, 64]);
      [parts[0], parts[1], badge, lab, ex].forEach(function (L) { attach(L, N); span(L, tk, tout); blur(L); });
      attach(bt, badge); bt.transform.position.setValue([0, 0]); span(bt, tk, tout);
      span(N, tk, tout);
    }
  }
  return c;
}

// ------------------------------------------------------------------ 07 ΠΡΟΣΟΧΗ  (bars 13-14): two cautions
function buildCaution() {
  var c = mkComp("07 Προσοχή", W, H, 2 * BAR, PAPER);
  notebook(c, 150);
  bg(c, PAPER);
  // bar 13: AI makes mistakes
  var h1 = centerKeep(txt(c, "ΤΟ AI ΚΑΝΕΙ ΛΑΘΗ.", { size: 130, color: INK, pos: [200, 300] }));
  span(h1, 0, BAR); slam(h1, 0, 118, 0.3);
  var bub = card(c, "Answer", [830, 480], [1260, 150], CARD, 12, INK, 22);
  span(bub[0], 0, BAR); span(bub[1], 0, BAR);
  var al = txt(c, "ΑΠΑΝΤΗΣΗ", { font: MONO, style: "Bold", size: 20, color: GRAY, pos: [204, 388] }); span(al, 0, BAR);
  var aO = { style: "SemiBold", size: 54 }, aX = 250, aY = 499;
  var partA = "Ο Παρθενώνας χτίστηκε", partB = "το 1821.";
  var xB = aX + adv(c, partA + " ", aO), rB = measure(c, partB, aO);
  var ta = 0.05, tb = ta + (partA.length + 1) / 36;
  var la = txt(c, "x", { style: "SemiBold", size: 54, color: INK, pos: [aX, aY], name: "Answer A" });
  la.property("Source Text").expression = typeExpr(partA, ta, 36, false, false); span(la, 0, BAR);
  var lb = txt(c, "x", { style: "SemiBold", size: 54, color: INK, pos: [xB, aY], name: "Answer B" });
  lb.property("Source Text").expression = typeExpr(partB, tb, 36, false, false); span(lb, 0, BAR);
  var t3 = lt(0, 3), t4 = lt(0, 4);
  var lbr = txt(c, partB, { style: "SemiBold", size: 54, color: VER, pos: [xB, aY], name: "Answer B wrong" }); span(lbr, t3 + 0.2, BAR);
  // the wavy vermilion underline draws in on beat 3
  var wx0 = xB + rB.left - 6, wx1 = xB + rB.left + rB.width + 6, pts = [];
  for (var q = 0; q <= 40; q++) { var wx = wx0 + (wx1 - wx0) * q / 40; pts.push([wx, aY + 20 + 6 * Math.sin((wx - wx0) / 13)]); }
  var wave = obj(c, "Wavy underline", [0, 0]); var wg = grp(wave); path(wg, pts, false); roundStroke(wg, VER, 6);
  drawOn(wg, t3, 0.22); span(wave, t3, BAR);
  // the ✗ stamp
  var st = obj(c, "X stamp", [1590, 480]); var sg = grp(st); ell(sg, [190, 190]); stroke(sg, VER, 11);
  var sx = grp(st, "x"); path(sx, [[-44, -44], [44, 44]], false); path(sx, [[44, -44], [-44, 44]], false); roundStroke(sx, VER, 18);
  span(st, t3 + 0.2, BAR);
  K(st.transform.scale, [[t3 + 0.2, [175, 175, 100], "o"], [t3 + 0.36, [100, 100, 100]]]);
  K(st.transform.rotation, [[t3 + 0.2, -26, "o"], [t3 + 0.36, -12]]); blur(st);
  // beat 4: the correction slides in with a cobalt check
  var corr = "447–438 π.Χ.", cwid = measure(c, corr, { style: "Bold", size: 46 }).width + 72;
  var cN = nul(c, "Correction", [xB + cwid / 2 - 10, 650]);
  var cp = pill(c, "Correction pill", [0, 0], [cwid, 84], COB, [INK, 4]);
  var ctx = txt(c, corr, { style: "Bold", size: 46, color: PAPER, just: "c", pos: [0, 16] });
  attach(cp, cN); attach(ctx, cN); span(cp, t4, BAR); span(ctx, t4, BAR);
  K(cN.transform.position, [[t4, [xB + cwid / 2 - 130, 650], "o"], [t4 + 0.26, [xB + cwid / 2 - 10, 650]]]);
  K(cp.transform.opacity, [[t4, 0, "o"], [t4 + 0.12, 100]]); K(ctx.transform.opacity, [[t4, 0, "o"], [t4 + 0.12, 100]]);
  blur(cN);
  var ck = check(c, "Correction check", [xB + cwid + 54, 650], 70, COB, 12, t4 + 0.14); ck.outPoint = BAR;
  // bar 14: personal data stays yours
  var hA = centerKeep(txt(c, "ΤΑ ΠΡΟΣΩΠΙΚΑ ΣΟΥ", { size: 104, color: INK, pos: [200, 290] }));
  var hB = centerKeep(txt(c, "ΜΕΝΟΥΝ ΔΙΚΑ ΣΟΥ.", { size: 104, color: VER, pos: [200, 410] }));
  span(hA, BAR); slam(hA, BAR, 118, 0.3);
  span(hB, BAR + 0.06); slam(hB, BAR + 0.06, 118, 0.3);
  var form = card(c, "Form", [610, 745], [820, 400], CARD, 12, INK, 18);
  var fN = nul(c, "Form", [0, 0]);
  K(fN.transform.position, [[BAR, [0, 120], "o"], [BAR + 0.3, [0, 0]]]);
  var fields = [["ΑΜΚΑ", "12039901234"], ["Τηλέφωνο", "6912345678"], ["Διεύθυνση", "Παπαδιαμάντη 7"], ["Κωδικοί", "••••••••"]];
  var fLayers = [form[0], form[1]];
  for (var f = 0; f < fields.length; f++) {
    var fy = 610 + f * 90;
    fLayers.push(txt(c, fields[f][0], { style: "SemiBold", size: 28, color: GRAY, pos: [236, fy + 10] }));
    fLayers.push(txt(c, fields[f][1], { font: MONO, style: "Medium", size: 34, color: INK, pos: [476, fy + 12] }));
    if (f < fields.length - 1) { var dv = obj(c, "Field rule" + f, [610, fy + 45]); var dvg = grp(dv); rect(dvg, [740, 2]); fill(dvg, INK, 14); fLayers.push(dv); }
    var tr = BAR + BT + f * BT / 2;
    var red = obj(c, "Redaction" + f, [462, fy]); var rg = grp(red); rect(rg, [500, 50], 4, [250, 0]); fill(rg, INK);
    red.inPoint = tr; K(red.transform.scale, [[tr, [0, 100, 100], "o"], [tr + 0.13, [100, 100, 100]]]); blur(red);
    fLayers.push(red);
  }
  fLayers.forEach(function (L) { attach(L, fN); if (L.inPoint < BAR) L.inPoint = BAR; blur(L); });
  // the padlock snaps shut on beat 4
  var tl = BAR + 3 * BT;
  var lock = nul(c, "Padlock", [1470, 690]);
  popIn(lock, BAR + 0.08, 0.3);
  var sha = obj(c, "Shackle", [0, -64]); var shg = grp(sha), arc = [];
  for (var a = 0; a <= 16; a++) { var an = Math.PI * a / 16; arc.push([-74 * Math.cos(an), -96 - 74 * Math.sin(an)]); }
  path(shg, [[-74, 40]].concat(arc, [[74, 40]]), false); stroke(shg, INK, 30);
  K(sha.transform.position, [[tl, [0, -64], "o"], [tl + 0.08, [0, 0]]]);
  var body = obj(c, "Lock body", [0, 100]); var bdg = grp(body, "hole"); ell(bdg, [40, 40], [0, -14]); rect(bdg, [16, 50], 4, [0, 18]); fill(bdg, PAPER);
  var bdb = grp(body, "body"); rect(bdb, [260, 210], 28); fill(bdb, INK);
  K(body.transform.scale, [[tl, [100, 100, 100], "o"], [tl + 0.06, [104, 94, 100], "o"], [tl + 0.24, [100, 100, 100]]]);
  [sha, body].forEach(function (L) { attach(L, lock); L.inPoint = BAR; blur(L); });
  var lr = obj(c, "Lock ripple", [1470, 790]); var lrg = grp(lr); ell(lrg, [300, 300]); stroke(lrg, COB, 8);
  span(lr, tl, tl + 0.45);
  K(lr.transform.scale, [[tl, [80, 80, 100], "o"], [tl + 0.42, [165, 165, 100]]]);
  K(lr.transform.opacity, [[tl, 100, "i"], [tl + 0.42, 0]]);
  return c;
}

// ------------------------------------------------------------------ 08 ΜΑΘΕ AI  (bars 15-16): μάθε AI → mathe_ai
function buildLearn() {
  var c = mkComp("08 Μάθε AI", W, H, DUR - 14 * BAR, INK);
  gridLines(c, COB, 12, 60);
  bg(c, INK);
  var o = { size: 300 }, AY = -95, F = [lt(0, 3), lt(0, 3) + BT / 2, lt(0, 4), lt(0, 4) + BT / 2, lt(0, 4) + 0.75 * BT];
  // tokens: Greek μάθε AI. and the Latin letters that replace them on the 8ths
  var CH = ["μ", "ά", "θ", "ε", " ", "A", "I", ".", "m", "a", "t", "h", "e", "_", "a", "i"];
  var STATES = [[0, 1, 2, 3, 4, 5, 6, 7], [8, 1, 2, 3, 4, 5, 6, 7], [8, 9, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11, 3, 4, 5, 6, 7],
                [8, 9, 10, 11, 12, 13, 5, 6, 7], [8, 9, 10, 11, 12, 13, 14, 15]];
  var A = {};
  CH.forEach(function (ch) { if (A[ch] === undefined) A[ch] = adv(c, ch, o); });
  var XS = STATES.map(function (st) {      // each token's x in each state, the line centred on 0
    var tot = 0; st.forEach(function (i) { tot += A[CH[i]]; });
    var x = -tot / 2, m = {};
    st.forEach(function (i) { m[i] = x; x += A[CH[i]]; });
    return m;
  });
  var word = nul(c, "Word", [W / 2, 620]);
  K(word.transform.scale, [[0, [130, 130, 100], "o"], [0.32, [100, 100, 100]]]);
  K(word.transform.rotation, [[0, -5, "o"], [0.32, 0]]);
  word.outPoint = BAR;
  for (var i = 0; i < CH.length; i++) {
    if (CH[i] === " ") continue;
    var under = CH[i] === "_", hw = under ? A["_"] / 2 : 0;
    var L = txt(c, CH[i], { size: 300, color: under ? VER : PAPER, pos: [0, 0], name: "glyph " + CH[i] + i });
    L.transform.anchorPoint.setValue([hw, AY]);
    attach(L, word);
    var first = -1, last = -1, keys = [], prev;
    for (var s = 0; s < STATES.length; s++) {
      if (XS[s][i] === undefined) continue;
      var xv = XS[s][i] + hw;
      if (first < 0) { first = s; keys.push([s ? F[s - 1] : 0, [xv, AY]]); }
      else if (Math.abs(xv - prev) > 0.01) { keys.push([F[s - 1], [prev, AY], "o"]); keys.push([F[s - 1] + 0.12, [xv, AY]]); }
      prev = xv; last = s;
    }
    if (keys.length > 1) K(L.transform.position, keys); else L.transform.position.setValue(keys[0][1]);
    if (first > 0) {                                     // appears: unfolds where it lands
      var ta = F[first - 1] + 0.04;
      L.inPoint = F[first - 1];
      K(L.transform.scale, under ? [[ta, [0, 100, 100], "o"], [ta + 0.1, [100, 100, 100]]] : [[ta, [100, 0, 100], "o"], [ta + 0.1, [100, 100, 100]]]);
    }
    if (last < STATES.length - 1) {                      // disappears: folds away
      var td = F[last];
      K(L.transform.scale, [[td, [100, 100, 100], "i"], [td + 0.06, [100, 0, 100]]]);
      L.outPoint = td + 0.06;
    } else L.outPoint = BAR;
    if (under) L.transform.opacity.expression = "Math.floor((time-" + (F[3] + 0.04) + ")/" + (BT / 4) + ")%2==1?0:100";
    blur(L);
  }
  // bar 16: the wordmark locks in, the tagline types, the underscore blinks once
  var wm = wordmark(c, 230, [W / 2, 620], PAPER, "c", [BAR + 2 * BT, BAR + 2.5 * BT, INK]);
  span(wm, BAR); slam(wm, BAR, 108, 0.3);
  var tag = txt(c, "x", { style: "Medium", size: 56, color: PAPER, pos: [0, 0], opacity: 78, name: "Tagline" });
  var tagS = "Μάθε AI. Για κάθε μέρα.", tagW = measure(c, tagS, { style: "Medium", size: 56 }).width;
  tag.transform.position.setValue([W / 2 - tagW / 2, 820]);
  tag.property("Source Text").expression = typeExpr(tagS, BAR + BT, 50, false, false);
  tag.inPoint = BAR + BT;
  return c;
}

// ------------------------------------------------------------------ HUD (two layers: plain marks recoloured per ground, black tags)
var SECTIONS = [["01 — ΚΑΘΕ ΜΕΡΑ", 1], ["02 — ΧΩΡΙΣ ΠΑΠΑΓΑΛΙΑ", 3], ["03 — ΡΩΤΑ", 4], ["04 — ΒΗΜΑ-ΒΗΜΑ", 6],
                ["05 — 3 ΚΑΝΟΝΕΣ", 8], ["06 — ΠΑΝΤΟΥ", 11], ["07 — ΠΡΟΣΟΧΗ", 13], ["08 — ΜΑΘΕ AI", 15]];
function tag(c, s, x, y, right, expr) {
  var t = txt(c, s, { font: MONO, style: "Bold", size: 15, color: PAPER, just: right ? "r" : "l", pos: [x, y], name: "tag " + s });
  var r = t.sourceRectAtTime(0, false);
  var box = obj(c, "box " + s, [x + r.left + r.width / 2, y + r.top + r.height / 2]);
  var g = grp(box); rect(g, [r.width + 22, r.height + 14], 3); fill(g, INK);
  box.moveAfter(t);
  if (expr) t.property("Source Text").expression = expr;
  return [t, box];
}
function buildHUD() {
  var marks = mkComp("HUD marks", W, H, DUR, INK);
  var m = 40, a = 30;
  var br = obj(marks, "Brackets", [0, 0]);
  var corners = [[[m, m + a], [m, m], [m + a, m]], [[W - m - a, m], [W - m, m], [W - m, m + a]],
                 [[m, H - m - a], [m, H - m], [m + a, H - m]], [[W - m - a, H - m], [W - m, H - m], [W - m, H - m - a]]];
  for (var i = 0; i < 4; i++) { var g = grp(br, "c" + i); path(g, corners[i], false); stroke(g, PAPER, 3); }
  var tc = txt(marks, "x", { font: MONO, style: "Medium", size: 17, color: PAPER, pos: [72, H - 52], name: "Timecode" });
  tc.property("Source Text").expression = 'var f=Math.round(time*60);var s=Math.floor(f/60),r=f%60;"00:00:"+("0"+s).slice(-2)+":"+("0"+r).slice(-2)+"  \\u00b7  60 FPS"';
  var bp = txt(marks, "x", { font: MONO, style: "Medium", size: 17, color: PAPER, just: "r", pos: [W - 72, H - 52], name: "Beat counter" });
  bp.property("Source Text").expression = 'var b=Math.floor(time*128/60+1e-6);var bar=Math.min(16,Math.floor(b/4)+1),k=b%4,q="";' +
    'for(var i=0;i<4;i++)q+=(i<=k?"\\u25a0":"\\u25a1");"128 BPM  "+q+"  ΜΕΤΡΟ "+("0"+bar).slice(-2)+"/16"';
  // recolour per ground: ink on light grounds, paper on dark ones
  var fx = marks.layers.addSolid(WHITE, "Recolour", W, H, 1); fx.adjustmentLayer = true;
  var f = fx.property("Effects").addProperty("ADBE Fill");
  var cols = [[0, INK], [gt(1, 3), PAPER], [gt(2, 1), INK], [gt(3, 1), PAPER], [gt(4, 1), INK], [gt(6, 1) - 0.02, PAPER],
              [gt(8, 1), INK], [gt(9, 1), PAPER], [gt(10, 1), INK], [gt(11, 1), PAPER], [gt(13, 1), INK], [gt(15, 1), PAPER]];
  K(f.property("Color"), cols.map(function (k) { return [k[0], k[1], "h"]; }));
  var tags = mkComp("HUD tags", W, H, DUR, INK);
  tag(tags, "mathe_ai · ΜΑΘΗΜΑ 01", 72, 62, false,
      'text.sourceText.style.setText("mathe_ai · ΜΑΘΗΜΑ 01").setFillColor(' + JSON.stringify(VER) + ',5,1)');
  for (var s = 0; s < SECTIONS.length; s++) {
    var pair = tag(tags, SECTIONS[s][0], W - 72, 62, true);
    var tin = gt(SECTIONS[s][1], 1), tout = s + 1 < SECTIONS.length ? gt(SECTIONS[s + 1][1], 1) : DUR;
    span(pair[0], tin, tout); span(pair[1], tin, tout);
  }
  var prog = obj(tags, "Progress", [72, H - 30]); var pg = grp(prog); rect(pg, [W - 144, 3], 0, [(W - 144) / 2, 0]); fill(pg, VER);
  K(prog.transform.scale, [[0, [0, 100, 100], "l"], [DUR, [100, 100, 100]]]);
  return [marks, tags];
}

// ------------------------------------------------------------------ assemble
writeLn("building sections…");
var S1 = buildEveryDay();
var S2 = buildNoRote();
var S3 = buildAsk();
var S4 = buildSteps();
var S5 = buildRules();
var S6 = buildEverywhere();
var S7 = buildCaution();
var S8 = buildLearn();
var hud = buildHUD();

var main = mkComp("Main", W, H, DUR, INK);
bg(main, INK);
var order = [[S1, 1], [S2, 3], [S3, 4], [S4, 6], [S5, 8], [S6, 11], [S7, 13], [S8, 15]];
for (var i = 0; i < order.length; i++) {
  var L = main.layers.add(order[i][0]);
  L.startTime = gt(order[i][1], 1);
  L.outPoint = i + 1 < order.length ? gt(order[i + 1][1], 1) : DUR;
  L.motionBlur = true;
}
var hm = main.layers.add(hud[0]); hm.moveToBeginning();
var ht = main.layers.add(hud[1]); ht.moveToBeginning();
var audio = app.project.importFile(new ImportOptions(new File("lesson01-mix.wav")));
main.layers.add(audio);
main.openInViewer && main.openInViewer();
writeLn("comps: " + app.project.numItems + ", main layers: " + main.numLayers);
