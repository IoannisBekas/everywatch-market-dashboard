// ANYONE CAN, the EffectCraft edition.
// A 20 s, 132 BPM, 11-bar motion piece built entirely with EffectCraft's After Effects-style
// scripting model: comps, shape and text layers, keyframes with velocity/influence eases,
// expressions, precomps, time remapping, motion blur and an audio layer.
//
//   EFFECTCRAFT_FONT_DIRS=fonts effectcraft-cli script build.jsx --save-as anyone-can.ecproj
//   effectcraft-cli render anyone-can.ecproj --comp Main --out anyone-can.mp4 --bitrate 24000

// ------------------------------------------------------------------ timing
var W = 1920, H = 1080, FPS = 60, DUR = 20;
var BT = 60 / 132, BAR = 4 * BT;
function gt(bar, beat) { return ((bar - 1) * 4 + (beat - 1)) * BT; }   // global time, 1-based bar/beat
function lt(barOff, beat) { return (barOff * 4 + (beat - 1)) * BT; }   // section-local time

// ------------------------------------------------------------------ palette & type
function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
var PAPER = hex("#EFEBE3"), CARD = hex("#FBFAF7"), INK = hex("#121214"), PANEL = hex("#1B1B20"),
    LINE = hex("#2E2E35"), GRAY = hex("#8E8E98"), RED = hex("#EF4D3A"), ORANGE = hex("#FA6B21"),
    BLUE = hex("#2741F5"), YEL = hex("#F8DD3F"), GREEN = hex("#3DD68C"), PURPLE = hex("#9C6BFF"), WHITE = [1, 1, 1];
var DISPLAY = "Archivo Black", MONO = "JetBrains Mono", SERIF = "Instrument Serif", UI = "Inter";

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
  d.fontStyle = o.style || "Regular";
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
  return L;
}
function centerKeep(L) {           // anchor on the text's box centre without moving it
  var r = L.sourceRectAtTime(0, false), p = L.transform.position.value;
  L.transform.anchorPoint.setValue([r.left + r.width / 2, r.top + r.height / 2]);
  L.transform.position.setValue([p[0] + r.left + r.width / 2, p[1] + r.top + r.height / 2]);
  return L;
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
function star(g, pts, outer, inner, oRound, iRound, polygon) {
  var s = gc(g).addProperty("ADBE Vector Shape - Star");
  s.property("Type").setValue(polygon ? 2 : 1);
  s.property("Points").setValue(pts);
  s.property("Outer Radius").setValue(outer);
  if (!polygon) s.property("Inner Radius").setValue(inner);
  if (oRound) s.property("Outer Roundness").setValue(oRound);
  if (iRound && !polygon) s.property("Inner Roundness").setValue(iRound);
  return s;
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
  var i;
  for (i = 0; i < keys.length; i++) prop.setValueAtTime(keys[i][0], keys[i][1]);
  for (i = 0; i < keys.length; i++) {
    var ki = prop.nearestKeyIndex(keys[i][0]);
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

// ------------------------------------------------------------------ 01 HOOK tiles (each a small comp)
var TW = 633, TH = 353, GAP = 10;
function tile(name, color) { var c = mkComp(name, TW, TH, 2 * BAR, color); bg(c, color); return c; }
var BTs = String(BT);
function buildTiles() {
  var T = [];
  // 1. kinetic type
  var c = tile("Tile 1 Type", ORANGE);
  var a = txt(c, "MOTION", { size: 118, color: INK, just: "c", center: true, pos: [TW / 2, 150] });
  K(a.transform.position, [[1.38, [TW / 2 + 120, 150], "o"], [1.75, [TW / 2, 150], "io"], [3.6, [TW / 2 - 30, 150]]]); blur(a);
  var b = txt(c, "designer", { font: SERIF, style: "Italic", size: 84, color: PAPER, just: "c", center: true, pos: [TW / 2, 250] });
  K(b.transform.position, [[1.45, [TW / 2 - 120, 250], "o"], [1.82, [TW / 2, 250], "io"], [3.6, [TW / 2 + 30, 250]]]); blur(b);
  T.push(c);
  // 2. letterforms + shapes
  c = tile("Tile 2 Letter", PAPER);
  var aa = txt(c, "Aa", { font: SERIF, style: "Italic", size: 270, color: ORANGE, just: "c", center: true, pos: [270, 185] });
  aa.transform.rotation.expression = "Math.sin(time*2)*4";
  var tri = obj(c, "Triangle", [520, 95]); var tg = grp(tri); star(tg, 3, 62, 0, 0, 0, true); fill(tg, ORANGE);
  tri.transform.rotation.expression = "time*140"; blur(tri);
  var ring = obj(c, "Ring", [110, 285]); var rg = grp(ring); ell(rg, [80, 80]); stroke(rg, INK, 6);
  ring.transform.scale.expression = "var f=(time%" + BTs + ");var s=100+28*Math.exp(-f/0.07);[s,s,100]";
  T.push(c);
  // 3. wireframe sphere
  c = tile("Tile 3 Sphere", INK);
  var sp = obj(c, "Sphere", [TW / 2, TH / 2]);
  for (var i = 0; i < 9; i++) {
    var g = grp(sp, "lon" + i); var e = ell(g, [240, 240]); stroke(g, PAPER, 2, 85);
    e.property("Size").expression = "[240*Math.abs(Math.cos(time*1.5+" + (i * Math.PI / 9) + ")),240]";
  }
  var lats = [[170, 44, -85], [240, 64, 0], [170, 44, 85]];
  for (var j = 0; j < 3; j++) { var g2 = grp(sp, "lat" + j); ell(g2, [lats[j][0], lats[j][1]]); gt2(g2).property("Position").setValue([0, lats[j][2]]); stroke(g2, RED, 2); }
  sp.transform.rotation.setValue(-18);
  T.push(c);
  // 4. easing chart
  c = tile("Tile 4 Easing", PAPER);
  txt(c, "ways to get from A to B.", { font: SERIF, style: "Italic", size: 40, color: INK, pos: [28, 58] });
  var ch = obj(c, "Curves", [60, 315]);
  var curves = [
    [[0, 0], [70, -55], [140, -110], [210, -165]],
    [[0, 0], [100, -10], [170, -50], [210, -165]],
    [[0, 0], [30, -110], [90, -155], [210, -165]],
    [[0, 0], [60, -10], [150, -150], [210, -165]],
  ];
  var cc = [INK, RED, BLUE, ORANGE];
  for (var k = 0; k < 4; k++) {
    var cg = grp(ch, "curve" + k);
    var pv = curves[k], pts = [];
    for (var q = 0; q <= 24; q++) {        // sample a cubic through the 4 control points
      var u = q / 24, v = 1 - u;
      pts.push([v * v * v * pv[0][0] + 3 * v * v * u * pv[1][0] + 3 * v * u * u * pv[2][0] + u * u * u * pv[3][0],
                v * v * v * pv[0][1] + 3 * v * v * u * pv[1][1] + 3 * v * u * u * pv[2][1] + u * u * u * pv[3][1]]);
    }
    path(cg, pts, false); stroke(cg, cc[k], 4);
    var tr = trim(cg); K(tr.property("End"), [[1.42 + k * 0.08, 0, "o"], [1.95 + k * 0.08, 100]]);
    gt2(cg).property("Position").setValue([k * 52, 0]);
  }
  var dot = obj(c, "Dot", [420, 300]); var dg = grp(dot); ell(dg, [26, 26]); fill(dg, RED);
  dot.transform.position.expression = "var p=(time%" + (2 * BT) + ")/" + (2 * BT) + ";var e=1-Math.pow(1-p,4);[400+180*e,300]"; blur(dot);
  T.push(c);
  // 5. centre tile (sits behind THIS)
  c = tile("Tile 5 Grid", INK);
  var gd = obj(c, "Dots", [24, 24]); var gg = grp(gd); ell(gg, [5, 5]); fill(gg, PAPER, 35);
  var r1 = repeater(gd, 20, [31, 0]); var r2 = repeater(gd, 11, [0, 31]);
  T.push(c);
  // 6. confetti
  c = tile("Tile 6 Confetti", BLUE);
  var big = obj(c, "Disc", [TW / 2, TH / 2]); var bgp = grp(big); ell(bgp, [150, 150]); fill(bgp, PAPER);
  big.transform.scale.expression = "var f=(time%" + BTs + ");var s=100+16*Math.exp(-f/0.08);[s,s,100]";
  for (var n = 0; n < 16; n++) {
    var x0 = (n * 151) % TW, y0 = (n * 97) % TH, sz = 9 + (n % 3) * 5;
    var cf = obj(c, "c" + n, [x0, y0]); var cfg = grp(cf);
    if (n % 3 === 0) star(cfg, 3, sz, 0, 0, 0, true); else ell(cfg, [sz * 1.6, sz * 1.6]);
    fill(cfg, n % 4 === 0 ? YEL : PAPER);
    cf.transform.position.expression = "[" + x0 + "+Math.sin(time*2+" + n + ")*12,(" + y0 + "+time*" + (40 + n * 4) + ")%" + TH + "]";
    cf.transform.rotation.expression = "time*" + (60 + n * 10);
  }
  T.push(c);
  // 7. frame counter
  c = tile("Tile 7 Counter", RED);
  var cnt = txt(c, "00", { size: 210, color: PAPER, just: "c", pos: [TW / 2 - 40, 250] });
  cnt.property("Source Text").expression = '("00"+(Math.floor(time*60)%100)).slice(-2)';
  txt(c, "FRAMES", { font: MONO, style: "Bold", size: 30, color: INK, pos: [TW / 2 + 130, 248] });
  T.push(c);
  // 8. op-art rings
  c = tile("Tile 8 Rings", INK);
  var rs = obj(c, "Rings", [TW / 2, TH / 2]);
  for (var m = 10; m >= 1; m--) {
    var rgp = grp(rs, "r" + m); ell(rgp, [m * 36, m * 36]); stroke(rgp, m % 2 ? RED : PAPER, 7);
    gt2(rgp).property("Scale").expression = "var s=100+10*Math.sin(time*6-" + (m * 0.55) + ");[s,s]";
  }
  T.push(c);
  // 9. beat-driven bar chart
  c = tile("Tile 9 Bars", PAPER);
  var cols = [BLUE, RED, INK, YEL, ORANGE];
  for (var p = 0; p < 5; p++) {
    var bl = obj(c, "bar" + p, [150 + p * 85, 305]); var bgg = grp(bl); rect(bgg, [60, 230], 0, [0, -115]); fill(bgg, cols[p]);
    bl.transform.scale.expression = "var b=Math.floor(time/" + BTs + "),f=(time%" + BTs + ")/" + BTs + ";" +
      "var a=Math.abs(Math.sin(b*1.7+" + p + ")),z=Math.abs(Math.sin((b-1)*1.7+" + p + "));var e=1-Math.pow(1-Math.min(f*3,1),3);[100,(0.15+0.85*(z+(a-z)*e))*100,100]";
  }
  T.push(c);
  return T;
}

// ------------------------------------------------------------------ 01 HOOK  (bars 1-2)
function buildHook() {
  var c = mkComp("01 Hook", W, H, 2 * BAR, INK);
  bg(c, RED, "BG red", lt(0, 2), lt(0, 3));
  bg(c, PAPER, "BG paper", 0, lt(0, 2));
  bg(c, INK, "BG ink");
  // bar 1: the words slam on the beats
  var w1 = txt(c, "ANYONE", { size: 300, color: INK, just: "c", center: true, pos: [W / 2, H / 2] });
  span(w1, 0, lt(0, 2)); slam(w1, 0, 122, 0.32);
  K(w1.transform.rotation, [[0, -4, "o"], [0.32, 0]]);
  var w2 = txt(c, "CAN", { size: 470, color: PAPER, just: "c", center: true, pos: [W / 2, H / 2] });
  span(w2, lt(0, 2), lt(0, 3)); K(w2.transform.position, [[lt(0, 2), [W / 2, H / 2 + 140], "o"], [lt(0, 2) + 0.28, [W / 2, H / 2]]]); slam(w2, lt(0, 2), 112, 0.28);
  var w3 = txt(c, "MAKE", { size: 390, color: YEL, just: "c", center: true, pos: [W / 2, H / 2] });
  span(w3, lt(0, 3), lt(0, 4) + 0.2);
  K(w3.transform.scale, [[lt(0, 3), [140, 140, 100], "o"], [lt(0, 3) + 0.3, [100, 100, 100], "i"], [lt(0, 4) + 0.2, [0, 0, 100]]]); blur(w3);
  K(w3.transform.rotation, [[lt(0, 3), 7, "o"], [lt(0, 3) + 0.3, 0, "i"], [lt(0, 4) + 0.2, -25]]);
  // the mosaic assembles on 16ths during beat 4, then plays under THIS
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
  w3.moveToBeginning();                       // MAKE stays above the tiles while it leaves
  // bar 2: THIS, with a red extrusion, pulsing on every beat
  var t2 = lt(1, 1);
  var sh = txt(c, "THIS", { size: 540, color: RED, just: "c", center: true, pos: [W / 2 + 20, H / 2 + 20], name: "THIS shadow", outline: [INK, 14] });
  var th = txt(c, "THIS", { size: 540, color: PAPER, just: "c", center: true, pos: [W / 2, H / 2], name: "THIS", outline: [INK, 14] });
  [sh, th].forEach(function (L) {
    L.inPoint = t2;
    K(L.transform.scale, [[t2, [175, 175, 100], "o"], [t2 + 0.34, [100, 100, 100]]]);
    K(L.transform.rotation, [[t2, -9, "o"], [t2 + 0.34, -3, "io"], [2 * BAR, -1]]);
    blur(L);
  });
  // a beat pulse on top of the settle (expression adds to the keyframed value)
  var pulse = "var f=(time-" + t2 + ")%" + BTs + ";var k=time>" + (t2 + BT - 0.01) + "?5*Math.exp(-f/0.07):0;value+[k,k,0]";
  sh.transform.scale.expression = pulse; th.transform.scale.expression = pulse;
  return c;
}

// ------------------------------------------------------------------ 02 WITHOUT  (bar 3)
function gridLines(c, color, opacity, step) {
  var L = obj(c, "Grid", [0, 0]);
  var gh = grp(L, "h"); path(gh, [[0, 0], [W, 0]], false); stroke(gh, color, 1, opacity);
  var rh = gc(gh).addProperty("ADBE Vector Filter - Repeater"); rh.property("Copies").setValue(Math.ceil(H / step) + 1); rh.property("Transform").property("Position").setValue([0, step]);
  var gv = grp(L, "v"); path(gv, [[0, 0], [0, H]], false); stroke(gv, color, 1, opacity);
  var rv = gc(gv).addProperty("ADBE Vector Filter - Repeater"); rv.property("Copies").setValue(Math.ceil(W / step) + 1); rv.property("Transform").property("Position").setValue([step, 0]);
  L.moveToEnd();
  return L;
}
function buildWithout() {
  var c = mkComp("02 Without", W, H, BAR, INK);
  var glow = obj(c, "Glow", [W / 2, 620]); var gg = grp(glow); ell(gg, [1300, 700]); fill(gg, RED, 30);
  var gb = glow.property("Effects").addProperty("ADBE Gaussian Blur 2"); gb.property(1).setValue(220);
  K(glow.transform.opacity, [[0, 0, "h"], [lt(0, 2), 100]]);
  gridLines(c, PAPER, 7, 60);
  bg(c, INK);
  // "without" types in, with a blinking red block caret
  var wo = txt(c, "without", { font: MONO, style: "Bold", size: 66, color: PAPER, pos: [W / 2 - 8 * 0.6 * 66 / 2, 300] });
  wo.property("Source Text").expression = typeExpr("without", 0.02, 26, true, true);
  // AFTER EFFECTS slams in on beat 2, with a blue chromatic fringe that snaps into register
  var t = lt(0, 2), grpNull = c.layers.addNull(); grpNull.name = "Group"; grpNull.transform.position.setValue([W / 2, 640]);
  var lines = [["AFTER", 520], ["EFFECTS", 760]];
  for (var i = 0; i < 2; i++) {
    var fr = txt(c, lines[i][0], { size: 250, color: BLUE, just: "c", center: true, pos: [W / 2, lines[i][1]], name: lines[i][0] + " fringe" });
    var tx = txt(c, lines[i][0], { size: 250, color: RED, just: "c", center: true, pos: [W / 2, lines[i][1]] });
    fr.moveAfter(tx);
    [fr, tx].forEach(function (L) { L.inPoint = t; L.parent = grpNull; slam(L, t, 130, 0.26); });
    var p0 = fr.transform.position.value;
    K(fr.transform.position, [[t, [p0[0] - 26, p0[1] - 14], "o"], [t + 0.2, [p0[0] - 6, p0[1] - 3]]]);
  }
  // beat 3: a white bar strikes it out, coloured dots pop
  var t3 = lt(0, 3);
  var bar = obj(c, "Strike", [0, 0]); attach(bar, grpNull);
  bar.transform.position.setValue([-860, 95]);
  var bgp = grp(bar); rect(bgp, [1720, 46], 4, [860, 0]); fill(bgp, PAPER);
  bar.transform.rotation.setValue(-7);
  bar.inPoint = t3;
  K(bar.transform.scale, [[t3, [0, 100, 100], "o"], [t3 + 0.13, [100, 100, 100]]]); blur(bar);
  var dots = [[-640, -230, 64, BLUE], [-420, 120, 46, PAPER], [-170, -60, 38, YEL], [60, 180, 58, BLUE], [300, -150, 44, RED],
              [520, 110, 70, PAPER], [700, -40, 40, YEL], [-760, 40, 30, RED], [180, -260, 28, PAPER], [-300, 260, 34, BLUE],
              [820, 220, 52, BLUE], [-40, 300, 26, YEL], [440, 300, 30, PAPER], [-560, -320, 22, YEL]];
  for (var d = 0; d < dots.length; d++) {
    var D = dots[d], L = obj(c, "dot" + d, [D[0], D[1]]); attach(L, grpNull);
    var dg = grp(L); ell(dg, [D[2], D[2]]); fill(dg, D[3]);
    var td = t3 + 0.03 + d * 0.025; popIn(L, td, 0.22);
    K(L.transform.position, [[td, [D[0] * 0.8, D[1] * 0.8], "o"], [BAR, [D[0] * 1.12, D[1] * 1.12 + 40]]]);
  }
  // beat 4: the whole thing tilts and drops
  K(grpNull.transform.rotation, [[lt(0, 4), 0, "i"], [BAR, -6]]);
  K(grpNull.transform.position, [[lt(0, 4), [W / 2, 640], "i"], [BAR, [W / 2, 700]]]);
  return c;
}

// ------------------------------------------------------------------ 03 DESCRIBE  (bars 4-5)
var PROMPT = "make a 20-second motion graphics video in EffectCraft that shows what an incredible motion designer you are, like it's your showreel. go all out.";
function burstShape(g, r, color) { star(g, 12, r, r * 0.42, 0, 0); fill(g, color); }
function buildDescribe() {
  var c = mkComp("03 Describe", W, H, 2 * BAR, PAPER);
  var dots = obj(c, "Dot grid", [20, 20]); var dg = grp(dots); ell(dg, [4, 4]); fill(dg, INK, 18);
  repeater(dots, 48, [40, 0]); repeater(dots, 27, [0, 40]); dots.moveToEnd();
  bg(c, PAPER);
  // JUST / DESCRIBE / IT.
  var words = [["JUST", INK, 430, lt(0, 1)], ["DESCRIBE", RED, 562, lt(0, 3)], ["IT.", INK, 694, lt(0, 4)]];
  for (var i = 0; i < 3; i++) {
    var w = words[i], L = centerKeep(txt(c, w[0], { size: 130, color: w[1], pos: [104, w[2]] }));
    var p = L.transform.position.value;
    L.inPoint = w[3];
    K(L.transform.position, [[w[3], [p[0], p[1] + 70], "o"], [w[3] + 0.28, [p[0], p[1]]]]);
    K(L.transform.scale, [[w[3], [100, 55, 100], "o"], [w[3] + 0.28, [100, 100, 100]]]);
    blur(L);
  }
  // the chat card
  var cx = 1424, cy = 478, cw = 800, chh = 440, left = cx - cw / 2, top = cy - chh / 2;
  var card = c.layers.addNull(); card.name = "Card"; card.transform.position.setValue([cx, cy]);
  K(card.transform.position, [[0, [cx + 820, cy + 60], "o"], [0.42, [cx, cy]]]);
  K(card.transform.rotation, [[0, 6, "o"], [0.42, 0]]);
  function onCard(L) { attach(L, card); return blur(L); }
  var shadow = obj(c, "Card shadow", [14, 14]); var sg = grp(shadow); rect(sg, [cw, chh], 16); fill(sg, INK); onCard(shadow);
  var body = obj(c, "Card body", [0, 0]); var bgp = grp(body); rect(bgp, [cw, chh], 16); stroke(bgp, INK, 4); fill(bgp, CARD); onCard(body);
  var logo = obj(c, "Logo", [-cw / 2 + 46, -chh / 2 + 44]); burstShape(grp(logo), 17, RED); onCard(logo);
  logo.transform.rotation.expression = "time*40";
  onCard(txt(c, "Claude", { font: UI, style: "Bold", size: 28, color: INK, pos: [-cw / 2 + 76, -chh / 2 + 54] }));
  var pill = obj(c, "New chat pill", [cw / 2 - 92, -chh / 2 + 44]); var pg = grp(pill); rect(pg, [128, 34], 17); stroke(pg, INK, 2.5); onCard(pill);
  onCard(txt(c, "NEW CHAT", { font: MONO, style: "Bold", size: 15, color: INK, just: "c", pos: [cw / 2 - 92, -chh / 2 + 50] }));
  var div = obj(c, "Divider", [0, -chh / 2 + 84]); var dvg = grp(div); rect(dvg, [cw - 48, 2.5]); fill(dvg, INK, 20); onCard(div);
  var prompt = txt(c, "x", { font: MONO, style: "Medium", size: 27, color: INK, box: [cw - 88, 240], leading: 40, pos: [0, 0], name: "Prompt" });
  var pr = prompt.sourceRectAtTime(0, false);
  prompt.transform.anchorPoint.setValue([pr.left, pr.top]);
  prompt.transform.position.setValue([-cw / 2 + 44, -chh / 2 + 112]);
  prompt.property("Source Text").expression = typeExpr(PROMPT, 0.3, 66, true, true);
  onCard(prompt);
  var plus = obj(c, "Plus", [-cw / 2 + 52, chh / 2 - 48]); var plg = grp(plus); ell(plg, [44, 44]); stroke(plg, INK, 2.5);
  var plh = grp(plus); rect(plh, [18, 2.5]); fill(plh, INK); var plv = grp(plus); rect(plv, [2.5, 18]); fill(plv, INK); onCard(plus);
  var send = obj(c, "Send", [cw / 2 - 54, chh / 2 - 48]);
  var arrow = grp(send, "arrow"); path(arrow, [[0, 11], [0, -11]], false); path(arrow, [[-9, -2], [0, -11], [9, -2]], false);
  var as = stroke(arrow, PAPER, 4); as.property("Line Cap").setValue(2); as.property("Line Join").setValue(2);
  var sgp = grp(send, "button"); ell(sgp, [58, 58]); stroke(sgp, INK, 3); fill(sgp, RED);
  onCard(send);
  // the pointer glides in and clicks send on bar 5, beat 3
  var tc = lt(1, 3);
  var ptr = obj(c, "Pointer", [0, 0]); var ptg = grp(ptr);
  path(ptg, [[0, 0], [0, 40], [10, 30], [18, 48], [25, 45], [17, 27], [30, 27]], true); stroke(ptg, INK, 3); fill(ptg, WHITE);
  var bx = cx + cw / 2 - 54, by = cy + chh / 2 - 48;
  ptr.inPoint = lt(1, 2) - 0.1;
  K(ptr.transform.position, [[lt(1, 2) - 0.1, [1900, 1060], "o"], [tc - 0.03, [bx - 4, by - 2], "h"], [tc + 0.05, [bx - 4, by - 2], "i"], [tc + 0.5, [bx + 60, by + 220]]]);
  blur(ptr);
  K(send.transform.scale, [[tc, [100, 100, 100], "o"], [tc + 0.07, [84, 84, 100], "o"], [tc + 0.22, [100, 100, 100]]]);
  var rip = obj(c, "Ripple", [bx, by]); var rpg = grp(rip); ell(rpg, [60, 60]); stroke(rpg, RED, 5);
  rip.inPoint = tc; rip.outPoint = tc + 0.45;
  K(rip.transform.scale, [[tc, [100, 100, 100], "o"], [tc + 0.42, [330, 330, 100]]]);
  K(rip.transform.opacity, [[tc, 100, "i"], [tc + 0.42, 0]]);
  // the burst grows out of the button and floods the frame red
  var burst = obj(c, "Burst", [bx, by]); burstShape(grp(burst), 40, RED);
  burst.inPoint = tc + 0.02;
  K(burst.transform.scale, [[tc + 0.02, [0, 0, 100], "o"], [lt(1, 4), [220, 220, 100], "i"], [2 * BAR, [7000, 7000, 100]]]);
  K(burst.transform.rotation, [[tc + 0.02, 0, "l"], [2 * BAR, 220]]);
  K(burst.transform.position, [[lt(1, 4), [bx, by], "i"], [2 * BAR, [W / 2, H / 2]]]);
  blur(burst);
  return c;
}

// ------------------------------------------------------------------ 04 SCRIPT  (bar 6)
function buildScript() {
  var c = mkComp("04 Script", W, H, BAR, RED);
  var x0 = 250;
  var b = obj(c, "Burst", [x0 + 80, 300]); burstShape(grp(b), 92, INK);
  b.transform.rotation.expression = "time*70";
  popIn(b, 0, 0.3);
  var l1 = centerKeep(txt(c, "CLAUDE", { size: 236, color: INK, pos: [x0 + 200, 384] })), p1 = l1.transform.position.value;
  K(l1.transform.position, [[0, [p1[0] + 130, p1[1]], "o"], [0.3, [p1[0], p1[1]]]]); blur(l1);
  var l2 = centerKeep(txt(c, "WRITES THE", { size: 150, color: INK, pos: [x0, 600] })), p2 = l2.transform.position.value;
  l2.inPoint = lt(0, 2);
  K(l2.transform.position, [[lt(0, 2), [p2[0], p2[1] + 90], "o"], [lt(0, 2) + 0.26, [p2[0], p2[1]]]]); blur(l2);
  var l3s = centerKeep(txt(c, "SCRIPT.", { size: 236, color: INK, pos: [x0 + 14, 878], name: "SCRIPT shadow" }));
  var l3 = centerKeep(txt(c, "SCRIPT.", { size: 236, color: PAPER, pos: [x0, 864] }));
  [l3s, l3].forEach(function (L) { L.inPoint = lt(0, 3); slam(L, lt(0, 3), 150, 0.3); });
  bg(c, RED);
  // beat 4: the EffectCraft window opens over everything
  var win = obj(c, "Window", [W / 2, H / 2]); var wg = grp(win); rect(wg, [W, H], 34); stroke(wg, LINE, 4); fill(wg, INK);
  var t4 = lt(0, 4) + 0.06;
  win.inPoint = t4;
  K(win.transform.scale, [[t4, [6, 6, 100], "i"], [BAR, [100, 100, 100]]]);
  K(win.transform.position, [[t4, [1760, 990], "i"], [BAR, [W / 2, H / 2]]]);
  K(win.transform.rotation, [[t4, -6, "i"], [BAR, 0]]); blur(win);
  return c;
}

// ------------------------------------------------------------------ 05 BUILD  (bars 7-8): the EffectCraft UI
var CODE = [
  ["// anyone-can.jsx: written by Claude", GRAY],
  ["var comp = app.project.items.addComp(", PAPER],
  ["  \"Main\", 1920, 1080, 1, 20, 60);", YEL],
  ["var title = comp.layers.addText(\"THIS\");", PAPER],
  ["title.motionBlur = true;", PAPER],
  ["K(title.transform.scale, [", PAPER],
  ["  [t, [175, 175], \"snap\"],", ORANGE],
  ["  [t + 0.34, [100, 100]]]);", ORANGE],
  ["var tiles = buildTiles();  // 9 comps", PAPER],
  ["tiles.forEach(function (t, i) {", PAPER],
  ["  comp.layers.add(t).startTime = i * 0.045;", PAPER],
  ["});", PAPER],
  ["var burst = shape.addStar(12);", PAPER],
  ["burst.rotation.expression = \"time*70\";", GREEN],
  ["comp.layers.add(soundtrack);  // 132 BPM", PAPER],
  ["app.project.save(\"anyone-can.ecproj\");", PAPER],
];
var LAYERS = [["THIS", RED], ["Tiles (9 comps)", BLUE], ["without / AFTER EFFECTS", YEL], ["Chat card", GREEN],
              ["Burst", RED], ["CLAUDE WRITES THE SCRIPT", PURPLE], ["HUD", ORANGE], ["Soundtrack", GRAY]];
function panel(c, name, x, y, w, h, title, right) {
  var p = obj(c, name, [x + w / 2, y + h / 2]); var g = grp(p); rect(g, [w, h], 10); stroke(g, LINE, 2); fill(g, PANEL);
  if (title) txt(c, title, { font: MONO, style: "Medium", size: 16, color: GRAY, just: right ? "r" : "l", pos: [right ? x + w - 18 : x + 18, y + 30] });
  return p;
}
function buildUI(hook) {
  var c = mkComp("05 Build", W, H, 2 * BAR, INK);
  bg(c, INK);
  // window chrome
  var dotsX = [34, 58, 82], dotC = [RED, YEL, GRAY];
  for (var i = 0; i < 3; i++) { var d = obj(c, "chrome" + i, [dotsX[i], 24]); var dg = grp(d); ell(dg, [13, 13]); fill(dg, dotC[i]); }
  txt(c, "anyone-can.ecproj  —  EffectCraft", { font: UI, style: "Medium", size: 17, color: GRAY, just: "c", pos: [W / 2, 30] });
  // panels
  panel(c, "Code panel", 24, 52, 700, 590, "build.jsx", true);   // label right: the HUD tag owns the top-left
  panel(c, "Viewer panel", 740, 52, 1156, 590, "Composition: Main");
  panel(c, "Timeline panel", 24, 658, 1872, 398, "Timeline");
  // code types in, one line per 8th note, coloured per line
  for (var j = 0; j < CODE.length; j++) {
    var t0 = j * BT / 2;
    var L = txt(c, "x", { font: MONO, style: "Medium", size: 19.5, color: CODE[j][1], pos: [48, 112 + j * 32], name: "code" + j });
    L.property("Source Text").expression = typeExpr(CODE[j][0], t0, 160, false, false);
  }
  // the viewer plays the hook's mosaic, looping its second bar
  var v = c.layers.add(hook);
  v.transform.position.setValue([1318, 364]);
  v.transform.scale.setValue([50, 50, 100]);
  v.timeRemapEnabled = true;
  v.property("ADBE Time Remapping").expression = "(time%" + BAR + ")+" + BAR;
  var vb = obj(c, "Viewer frame", [1318, 364]); var vg = grp(vb); rect(vg, [960, 540]); stroke(vg, LINE, 2);
  // timeline: ruler, layer rows appearing on the beats, keyframes popping on 16ths, playhead
  var tx0 = 470, tx1 = 1872, rowY = 744;
  var ruler = obj(c, "Ruler", [0, 0]); var rg = grp(ruler); path(rg, [[tx0, 700], [tx0, 712]], false); stroke(rg, GRAY, 2);
  repeater(ruler, 23, [(tx1 - tx0) / 22, 0]);
  for (var r = 0; r < LAYERS.length; r++) {
    var tr = r * BT, y = rowY + r * 38;
    var nm = txt(c, (r + 1) + "   " + LAYERS[r][0], { font: UI, style: "Medium", size: 17, color: PAPER, pos: [52, y + 6], name: "row" + r });
    nm.inPoint = tr; K(nm.transform.opacity, [[tr, 0, "o"], [tr + 0.15, 100]]);
    var x0 = tx0 + 10 + (r * 97) % 260, len = Math.min(700 + (r * 211) % 600, tx1 - 16 - x0);
    var bar = obj(c, "bar" + r, [x0, y]); var bgp = grp(bar); rect(bgp, [len, 22], 5, [len / 2, 0]); fill(bgp, LAYERS[r][1], 85);
    bar.inPoint = tr; K(bar.transform.scale, [[tr, [0, 100, 100], "o"], [tr + 0.3, [100, 100, 100]]]); blur(bar);
    for (var k = 0; k < 4; k++) {
      var tk = BAR + (r * 4 + k) * (BAR / 32);
      var kx = x0 + 40 + k * (len - 80) / 3;
      var kf = obj(c, "key" + r + "_" + k, [kx, y]); var kg = grp(kf); rect(kg, [13, 13]); fill(kg, PAPER); stroke(kg, INK, 2);
      kf.transform.rotation.setValue(45);
      popIn(kf, tk, 0.16);
    }
  }
  var ph = obj(c, "Playhead", [tx0, 0]); var phg = grp(ph); rect(phg, [2.5, 360], 0, [0, 870]); fill(phg, RED);
  var tab = grp(ph); path(tab, [[-9, 688], [9, 688], [9, 700], [0, 710], [-9, 700]], true); fill(tab, RED);
  K(ph.transform.position, [[0, [tx0, 0], "l"], [2 * BAR, [tx1, 0]]]);
  // the chyron: EVERY LAYER. / EVERY KEYFRAME.
  var words = [["EVERY LAYER.", RED, 0], ["EVERY KEYFRAME.", YEL, BAR]];
  for (var q = 0; q < 2; q++) {
    var w = words[q], t = w[2] + 0.02, tout = w[2] + 2 * BT;
    var band = obj(c, "Band" + q, [W / 2, 520]); var bgg = grp(band); rect(bgg, [W + 200, 200]); fill(bgg, w[1]);
    band.inPoint = t; band.outPoint = tout + 0.2;
    K(band.transform.position, [[t, [-W, 520], "o"], [t + 0.24, [W / 2, 520], "i"], [tout, [W / 2, 520], "i"], [tout + 0.2, [W * 2, 520]]]); blur(band);
    var wt = txt(c, w[0], { size: 150, color: INK, just: "c", center: true, pos: [W / 2, 520], name: w[0] });
    wt.inPoint = t; wt.outPoint = tout + 0.2; attach(wt, band); wt.transform.position.setValue([0, 0]);
  }
  // exit: the UI slides away left as the film strip arrives
  return c;
}

// ------------------------------------------------------------------ 06 RENDER  (bars 9-10)
function buildRender(srcs) {
  var c = mkComp("06 Render", W, H, 2 * BAR, INK);
  gridLines(c, PAPER, 5, 60);
  bg(c, INK);
  // the strip: frames of the earlier sections, frozen at good moments
  var FWd = 420, FHt = 236, step = 460, sy = 560;
  var strip = c.layers.addNull(); strip.name = "Strip"; strip.transform.position.setValue([0, 0]);
  var tape = obj(c, "Tape", [0, sy]); var tg = grp(tape); rect(tg, [step * 10 + 400, FHt + 96], 0, [step * 4.5, 0]); fill(tg, PANEL);
  attach(tape, strip);
  var holes = obj(c, "Holes", [-170, sy - FHt / 2 - 26]); var hg = grp(holes); rect(hg, [22, 14], 3); fill(hg, PAPER, 40);
  repeater(holes, 130, [40, 0]); attach(holes, strip);
  var holes2 = obj(c, "Holes 2", [-170, sy + FHt / 2 + 26]); var hg2 = grp(holes2); rect(hg2, [22, 14], 3); fill(hg2, PAPER, 40);
  repeater(holes2, 130, [40, 0]); attach(holes2, strip);
  for (var i = 0; i < srcs.length; i++) {
    var L = c.layers.add(srcs[i][0]);
    L.timeRemapEnabled = true;
    L.property("ADBE Time Remapping").expression = String(srcs[i][1]);
    L.outPoint = c.duration;
    L.transform.scale.setValue([FWd / W * 100, FWd / W * 100, 100]);
    L.transform.position.setValue([i * step, sy]);
    attach(L, strip);
    var fr = obj(c, "Frame" + i, [i * step, sy]); var fg = grp(fr); rect(fg, [FWd, FHt]); stroke(fg, PAPER, 2, 60); attach(fr, strip);
  }
  K(strip.transform.position, [[0, [W + 260, 0], "o"], [0.6, [700, 0], "l"], [lt(1, 3), [-900, 0], "i"], [2 * BAR, [-3400, 0]]]);
  blur(strip);
  // headline + render progress
  var h1 = txt(c, "EVERY FRAME.", { size: 150, color: PAPER, just: "c", center: true, pos: [W / 2, 230] });
  h1.outPoint = BAR; slam(h1, 0, 125, 0.3);
  var h2s = txt(c, "RENDERED.", { size: 170, color: RED, just: "c", center: true, pos: [W / 2 + 12, 242], name: "RENDERED shadow" });
  var h2 = txt(c, "RENDERED.", { size: 170, color: PAPER, just: "c", center: true, pos: [W / 2, 230] });
  [h2s, h2].forEach(function (L) { L.inPoint = BAR; slam(L, BAR, 135, 0.3); });
  var px0 = 360, pw = 1200, py = 880;
  var track = obj(c, "Track", [px0, py]); var trg = grp(track); rect(trg, [pw, 10], 5, [pw / 2, 0]); fill(trg, LINE);
  var bar = obj(c, "Progress", [px0, py]); var bgp = grp(bar); rect(bgp, [pw, 10], 5, [pw / 2, 0]); fill(bgp, RED);
  K(bar.transform.scale, [[0.1, [0, 100, 100], "l"], [lt(1, 3), [100, 100, 100]]]);
  var ct = txt(c, "x", { font: MONO, style: "Medium", size: 24, color: PAPER, pos: [px0, py + 56], name: "Counter" });
  ct.property("Source Text").expression = 'var f=Math.max(0,Math.min(1200,Math.floor((time-0.1)/' + (lt(1, 3) - 0.1) + '*1200)));' +
    'f<1200?"RENDERING  frame "+("0000"+f).slice(-4)+" / 1200":"DONE  1200 / 1200  \\u2713  effectcraft-cli render"';
  return c;
}

// ------------------------------------------------------------------ 07 END  (bar 11)
function buildEnd() {
  var c = mkComp("07 End", W, H, DUR - 10 * BAR, PAPER);
  var dots = obj(c, "Dot grid", [20, 20]); var dg = grp(dots); ell(dg, [4, 4]); fill(dg, INK, 18);
  repeater(dots, 48, [40, 0]); repeater(dots, 27, [0, 40]); dots.moveToEnd();
  bg(c, PAPER);
  var a = txt(c, "ANYONE", { size: 300, color: INK, just: "c", center: true, pos: [W / 2, 395] });
  slam(a, 0, 128, 0.32);
  var bs = txt(c, "CAN.", { size: 300, color: INK, just: "c", center: true, pos: [W / 2 + 16, 716], name: "CAN shadow" });
  var b = txt(c, "CAN.", { size: 300, color: RED, just: "c", center: true, pos: [W / 2, 700] });
  [bs, b].forEach(function (L) { L.inPoint = 0.06; slam(L, 0.06, 140, 0.3); });
  var st = obj(c, "Burst", [1446, 548]); burstShape(grp(st), 62, RED);
  st.transform.rotation.expression = "time*80"; popIn(st, lt(0, 2), 0.3);
  var line = txt(c, "x", { font: MONO, style: "Medium", size: 27, color: INK, just: "c", pos: [W / 2, 920], name: "Credit" });
  line.property("Source Text").expression = typeExpr("written by Claude · built & rendered in EffectCraft", lt(0, 3), 70, true, true);
  return c;
}

// ------------------------------------------------------------------ HUD (two layers: plain marks recoloured per section, black tags)
var SECTIONS = [["01 — HOOK", 0], ["02 — WITHOUT", gt(3, 1)], ["03 — DESCRIBE", gt(4, 1)], ["04 — SCRIPT", gt(6, 1)],
                ["05 — BUILD", gt(7, 1)], ["06 — RENDER", gt(9, 1)], ["07 — ANYONE CAN", gt(11, 1)]];
function tag(c, s, x, y, right) {
  var t = txt(c, s, { font: MONO, style: "Bold", size: 15, color: PAPER, just: right ? "r" : "l", pos: [x, y], name: "tag " + s });
  var r = t.sourceRectAtTime(0, false);
  var box = obj(c, "box " + s, [x + r.left + r.width / 2, y + r.top + r.height / 2]);
  var g = grp(box); rect(g, [r.width + 22, r.height + 14], 3); fill(g, INK);
  box.moveAfter(t);
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
  bp.property("Source Text").expression = 'var b=Math.floor(time*132/60+1e-6);var bar=Math.min(11,Math.floor(b/4)+1),k=b%4,q="";' +
    'for(var i=0;i<4;i++)q+=(i<=k?"\\u25a0":"\\u25a1");"132 BPM  "+q+"  BAR "+("0"+bar).slice(-2)+"/11"';
  // recolour per section: ink on light grounds, paper on dark ones
  var fx = marks.layers.addSolid(WHITE, "Recolour", W, H, 1); fx.adjustmentLayer = true;
  var f = fx.property("Effects").addProperty("ADBE Fill");
  var cols = [[0, INK], [gt(1, 3), PAPER], [gt(2, 1), INK], [gt(3, 1), PAPER], [gt(4, 1), INK],
              [gt(6, 4) + 0.3, PAPER], [gt(11, 1), INK]];
  var keys = cols.map(function (k) { return [k[0], k[1], "h"]; });
  K(f.property("Color"), keys);
  var tags = mkComp("HUD tags", W, H, DUR, INK);
  tag(tags, "ANYONE CAN · EFFECTCRAFT", 72, 62, false);
  for (var s = 0; s < SECTIONS.length; s++) {
    var pair = tag(tags, SECTIONS[s][0], W - 72, 62, true);
    var tin = SECTIONS[s][1], tout = s + 1 < SECTIONS.length ? SECTIONS[s + 1][1] : DUR;
    span(pair[0], tin, tout); span(pair[1], tin, tout);
  }
  var prog = obj(tags, "Progress", [72, H - 30]); var pg = grp(prog); rect(pg, [W - 144, 3], 0, [(W - 144) / 2, 0]); fill(pg, RED);
  K(prog.transform.scale, [[0, [0, 100, 100], "l"], [DUR, [100, 100, 100]]]);
  return [marks, tags];
}

// ------------------------------------------------------------------ assemble
writeLn("building sections…");
var S1 = buildHook();
var S2 = buildWithout();
var S3 = buildDescribe();
var S4 = buildScript();
var S5 = buildUI(S1);
var S6 = buildRender([[S1, 0.25], [S1, 2.6], [S2, 1.2], [S3, 2.1], [S3, 3.45], [S4, 1.2], [S5, 2.5], [S1, 0.62], [S2, 0.7], [S4, 0.5]]);
var S7 = buildEnd();
var hud = buildHUD();

var main = mkComp("Main", W, H, DUR, INK);
bg(main, INK);
var order = [[S1, 1], [S2, 3], [S3, 4], [S4, 6], [S5, 7], [S6, 9], [S7, 11]];
for (var i = 0; i < order.length; i++) {
  var L = main.layers.add(order[i][0]);
  L.startTime = gt(order[i][1], 1);
  L.outPoint = i + 1 < order.length ? gt(order[i + 1][1], 1) : DUR;
  L.motionBlur = true;
}
var hm = main.layers.add(hud[0]); hm.moveToBeginning();
var ht = main.layers.add(hud[1]); ht.moveToBeginning();
// the UI slides off as the strip arrives (a small overlap on the cut)
var audio = app.project.importFile(new ImportOptions(new File("anyone-can-mix.wav")));
main.layers.add(audio);
main.openInViewer && main.openInViewer();
writeLn("comps: " + app.project.numItems + ", main layers: " + main.numLayers);
