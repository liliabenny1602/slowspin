/* Slowspin: a turntable that behaves like a real one. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/* ---------- geometry (deck SVG units) ---------- */
const SP = { x: 155, y: 150 };            // spindle
const PV = { x: 340, y: 70 };             // tonearm pivot
const ARM = 204;                          // pivot to stylus
const D = Math.hypot(PV.x - SP.x, PV.y - SP.y);
const BASE = Math.atan2(SP.y - PV.y, SP.x - PV.x) * 180 / Math.PI;
const REST = 90, DIR_MAX = 150;
const rOfDir = dir => Math.sqrt(D * D + ARM * ARM - 2 * D * ARM * Math.cos((BASE - dir) * Math.PI / 180));
const dirOfR = r => BASE - Math.acos(clamp((D * D + ARM * ARM - r * r) / (2 * D * ARM), -1, 1)) * 180 / Math.PI;

const G12 = { R: 120, rOut: 110, rIn: 52, rRun: 46, rLabel: 40 };
const G7 = { R: 70, rOut: 63, rIn: 42, rRun: 38.5, rLabel: 33 };
const rpmVal = s => s === 33 ? 100 / 3 : 45;
const rpmTxt = s => s === 33 ? '33⅓' : '45';

/* ---------- records ---------- */
const MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], AEO = [0, 2, 3, 5, 7, 8, 10];
const T = (name, len, bpm, root, scale, prog, drums, dens) => ({ name, len, bpm, root, scale, prog, drums, dens });
const RECORDS = [
  { id: 'night', title: 'Night Swim', artist: 'The Paper Lanterns', fmt: '12-inch LP', size: 12, rpm: 33, label: '#E9573E', seed: 11,
    art: 'radial-gradient(circle at 70% 28%,#FBE9A9 0 13%,transparent 14%),linear-gradient(180deg,#1F2A44 0 58%,#2F6F8F 58%)',
    dust: .3, grime: 0, inner: 'paper', outer: false, note: 'A new pressing, still in its plain paper inner sleeve.',
    sides: [[T('Shallow End', 24, 84, 50, MAJ, [0, 5, 3, 4], 1, .55), T('Pool Lights', 22, 72, 53, DOR, [0, 3, 6, 4], 0, .45), T('Chlorine Moon', 24, 96, 48, AEO, [0, 5, 2, 6], 1, .6)],
            [T('Deep End', 24, 78, 55, DOR, [0, 6, 3, 4], 1, .5), T('Towel Song', 22, 66, 50, MAJ, [0, 3, 0, 4], 0, .4), T('Last Lap', 24, 104, 52, MAJ, [0, 4, 5, 3], 1, .65)]] },
  { id: 'marigold', title: 'Marigold', artist: 'Odile Ferro', fmt: '7-inch single', size: 7, rpm: 45, label: '#F2B21B', seed: 23,
    art: 'radial-gradient(circle at 50% 55%,#7A3B12 0 12%,#F2B21B 13% 36%,transparent 37%),#F7E3B5',
    dust: .22, grime: 0, inner: 'paper', outer: false, note: 'A 7-inch single. These play at 45.',
    sides: [[T('Marigold', 40, 112, 52, MAJ, [0, 3, 4, 3], 1, .7)], [T('Marigold (Porch Demo)', 36, 80, 52, MAJ, [0, 3, 4, 3], 0, .5)]] },
  { id: 'lowtide', title: 'Low Tide', artist: 'Kessel Club', fmt: '12-inch single', size: 12, rpm: 45, label: '#0E6E73', seed: 37,
    art: 'repeating-linear-gradient(180deg,#0E6E73 0 10%,#BFE3DC 10% 14%)',
    dust: .2, grime: 0, inner: 'anti', outer: true, note: 'A 12-inch that is not an LP. Check the label for the speed.',
    sides: [[T('Low Tide (Extended)', 50, 118, 45, AEO, [0, 0, 5, 6], 1, .5)], [T('Low Tide (Dub)', 46, 118, 45, AEO, [0, 5, 0, 6], 1, .3)]] },
  { id: 'attic', title: 'Attic Sessions', artist: 'Walt Brummel Trio', fmt: '12-inch LP', size: 12, rpm: 33, label: '#6B7A3A', seed: 51,
    art: 'radial-gradient(circle,transparent 0 50%,rgba(255,255,255,.3) 51% 55%,transparent 56%),linear-gradient(135deg,#B8A07A,#8C7350)',
    dust: .5, grime: .8, inner: 'paper', outer: false, note: 'Second-hand, from a market crate. Ring wear on the jacket, years of grime in the grooves.',
    sides: [[T('Rafters', 24, 92, 46, DOR, [0, 3, 4, 0], 1, .7), T('Mothball Waltz', 22, 70, 51, AEO, [0, 5, 3, 4], 0, .5), T('Skylight', 24, 100, 48, MAJ, [0, 5, 3, 4], 1, .6)],
            [T('Trunk Latch', 24, 88, 53, DOR, [0, 6, 0, 3], 1, .6), T('Insulation', 22, 64, 46, AEO, [0, 2, 5, 4], 0, .4), T('Down the Ladder', 24, 108, 50, MAJ, [0, 3, 4, 4], 1, .7)]] },
];
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function initRec(r) {
  Object.assign(r, r.size === 12 ? G12 : G7);
  r.prints = []; r.wear = 0; r.wet = 0; r.labelWet = false; r.lay = [];
  const R = rng(r.seed);
  r.specks = Array.from({ length: 110 }, () => { const a = R() * 6.283, d = r.rLabel + 3 + R() * (r.R - r.rLabel - 6); return [Math.cos(a) * d, Math.sin(a) * d, .5 + R() * .9]; });
}
RECORDS.forEach(initRec);

/* ---------- synthesized music (rendered to a buffer so speed changes pitch, like vinyl) ---------- */
const SR = 32000;
function layout(rec, si) {
  if (rec.lay[si]) return rec.lay[si];
  let t = .6;
  const tracks = rec.sides[si].map(k => { const o = { ...k, t0: t, t1: t + k.len }; t += k.len + 2.4; return o; });
  return rec.lay[si] = { tracks, dur: t - 2.4 + .8, data: null, ab: null };
}
const hz = m => 440 * 2 ** ((m - 69) / 12);
const sn = (sc, i) => sc[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);
function pad(b, t, dur, f, amp) { const i0 = t * SR | 0, n = dur * SR | 0, w = 6.2832 * f / SR; for (let i = 0; i < n && i0 + i < b.length; i++) { const x = i / SR, e = Math.min(1, x / .25) * Math.max(0, Math.min(1, (dur - x) / .4)); b[i0 + i] += (Math.sin(w * i) + .3 * Math.sin(2 * w * i + 1) + .15 * Math.sin(3 * w * i)) * e * amp; } }
function bass(b, t, dur, f, amp) { const i0 = t * SR | 0, n = dur * SR | 0, w = 6.2832 * f / SR; for (let i = 0; i < n && i0 + i < b.length; i++) { const x = i / SR, e = Math.min(1, x / .01) * Math.exp(-x * 2.2); b[i0 + i] += (Math.sin(w * i) + .35 * Math.sin(2 * w * i)) * e * amp; } }
function keys(b, t, dur, f, amp) { const i0 = t * SR | 0, n = dur * SR | 0, w = 6.2832 * f / SR; for (let i = 0; i < n && i0 + i < b.length; i++) { const x = i / SR, e = Math.min(1, x / .004) * Math.exp(-x * 3.2); b[i0 + i] += Math.sin(w * i + 1.6 * Math.exp(-x * 5) * Math.sin(w * i)) * e * amp; } }
function kick(b, t) { const i0 = t * SR | 0, n = .25 * SR | 0; let ph = 0; for (let i = 0; i < n && i0 + i < b.length; i++) { const x = i / SR; ph += 6.2832 * (45 + 80 * Math.exp(-x * 30)) / SR; b[i0 + i] += Math.sin(ph) * Math.exp(-x * 13) * .5; } }
function noise(b, t, dec, amp, R, hp) { const i0 = t * SR | 0, n = (5 / dec) * SR | 0; let p = 0; for (let i = 0; i < n && i0 + i < b.length; i++) { const v = R() * 2 - 1, s = hp ? v - p : v; p = v; b[i0 + i] += s * Math.exp(-i / SR * dec) * amp; } }
function synthSide(rec, si) {
  const lay = layout(rec, si); if (lay.data) return lay;
  const b = new Float32Array(Math.ceil(lay.dur * SR)), R = rng(rec.seed * 7 + si * 13 + 1);
  for (const k of lay.tracks) {
    const beat = 60 / k.bpm, bars = Math.floor(k.len / (beat * 4));
    let mel = 9;
    for (let br = 0; br < bars; br++) {
      const deg = k.prog[br % k.prog.length], bt = k.t0 + br * 4 * beat;
      for (const q of [0, 2, 4]) pad(b, bt, 4 * beat, hz(k.root + sn(k.scale, deg + q)), .06);
      bass(b, bt, beat * 1.6, hz(k.root - 12 + sn(k.scale, deg)), .24);
      bass(b, bt + 2 * beat, beat * 1.6, hz(k.root - 12 + sn(k.scale, deg + (R() < .4 ? 4 : 0))), .2);
      if (k.drums) { kick(b, bt); kick(b, bt + 2 * beat); noise(b, bt + beat, 22, .13, R, 0); noise(b, bt + 3 * beat, 22, .13, R, 0); for (let h = 0; h < 8; h++) noise(b, bt + h * beat / 2, 70, .05, R, 1); }
      for (let e = 0; e < 8; e++) {
        if (R() > k.dens) continue;
        mel = clamp(mel + Math.round((R() - .5) * 4), 5, 15);
        if (e % 2 === 0) { let best = mel, bd = 99; for (const c of [deg + 7, deg + 9, deg + 11, deg + 14]) if (Math.abs(c - mel) < bd) { bd = Math.abs(c - mel); best = c; } mel = best; }
        keys(b, bt + e * beat / 2, beat * (R() < .3 ? 1.8 : 1), hz(k.root + 12 + sn(k.scale, mel)), .13);
      }
    }
    const f0 = (k.t1 - 1.4) * SR | 0, f1 = k.t1 * SR | 0, z = Math.min(b.length, (k.t1 + 2.2) * SR | 0);
    for (let i = f0; i < f1; i++) b[i] *= (f1 - i) / (f1 - f0);
    for (let i = f1; i < z; i++) b[i] = 0;
  }
  for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * 1.25);
  lay.data = b; return lay;
}

/* ---------- audio engine ---------- */
let ac, master, shaper, lp, peak, pan, musicGain, crackleGain, crackleSrc, src = null, thumpBuf, scratchBuf, curveK = -1;
let vol = .8;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
  shaper = ac.createWaveShaper(); lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 15000;
  peak = ac.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 6500; peak.Q.value = 1.2; peak.gain.value = 0;
  pan = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
  musicGain = ac.createGain(); musicGain.gain.value = 0;
  shaper.connect(lp); lp.connect(peak); peak.connect(pan); pan.connect(musicGain); musicGain.connect(master);
  // surface noise: faint hiss plus pops
  const cb = ac.createBuffer(1, SR * 4, SR), cd = cb.getChannelData(0);
  for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() - .5) * .012;
  for (let i = 0; i < cd.length - 70; i++) if (Math.random() < 18 / SR) { const a = Math.random() ** 2 * (Math.random() < .5 ? -1 : 1) * .8; for (let j = 0; j < 60; j++) cd[i + j] += a * Math.exp(-j / 9) * Math.cos(j * .9); }
  crackleSrc = ac.createBufferSource(); crackleSrc.buffer = cb; crackleSrc.loop = true;
  crackleGain = ac.createGain(); crackleGain.gain.value = 0; crackleSrc.connect(crackleGain); crackleGain.connect(master); crackleSrc.start();
  thumpBuf = ac.createBuffer(1, SR * .16, SR); { const d = thumpBuf.getChannelData(0); let ph = 0; for (let i = 0; i < d.length; i++) { const x = i / SR; ph += 6.2832 * (50 + 60 * Math.exp(-x * 40)) / SR; d[i] = Math.sin(ph) * Math.exp(-x * 30) + (Math.random() - .5) * .5 * Math.exp(-x * 120); } }
  scratchBuf = ac.createBuffer(1, SR * .3, SR); { const d = scratchBuf.getChannelData(0); let p = 0; for (let i = 0; i < d.length; i++) { const x = i / SR; p = p * .6 + (Math.random() - .5); d[i] = p * Math.exp(-x * 9) * (0.6 + .4 * Math.sin(x * 400)); } }
}
function oneShot(buf, g) { if (!ac) return; const s = ac.createBufferSource(), gn = ac.createGain(); s.buffer = buf; gn.gain.value = g; s.connect(gn); gn.connect(master); s.start(); }
const thump = g => oneShot(thumpBuf, g), scratch = g => oneShot(scratchBuf, g);
function stopSource() { if (src) { try { src.stop(); } catch (e) {} src.disconnect(); src = null; } if (ac) musicGain.gain.setTargetAtTime(0, ac.currentTime, .01); }
function startSource(t) {
  if (!ac || !dk.rec) return;
  const lay = synthSide(dk.rec, dk.side);
  if (!lay.ab) { lay.ab = ac.createBuffer(1, lay.data.length, SR); lay.ab.getChannelData(0).set(lay.data); }
  if (src) { try { src.stop(); } catch (e) {} src.disconnect(); }
  src = ac.createBufferSource(); src.buffer = lay.ab; src.playbackRate.value = .001; src.connect(shaper);
  src.start(0, clamp(t, 0, lay.dur - .02));
}
function setCurve(k) {
  k = Math.round(k); if (k === curveK || !shaper) return; curveK = k;
  if (k <= 0) { shaper.curve = null; return; }
  const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)) * (1 - k * .008); }
  shaper.curve = null; shaper.curve = c;
}

/* ---------- state ---------- */
const st = { on: false, speed: 33, rpm: 0, ang: 0, cueUp: false, guard: true, cover: false, tool: null,
  force: 1.8, anti: 1.8, tilt: 0, oldBelt: false, dirt: .08, hours: 212, cant: 0, mat: .1 };
const dk = { rec: null, side: 0 };
const arm = { dir: REST, r: rOfDir(REST), h: 1, held: false, down: false, zone: null, dropKind: 'cue', grab: 0, t: 0, rev: 0 };
const newS = () => ({ prints: 0, brushed: false, firstDust: null, tPlay: 0, tRight: 0, hand: false, mid: false, bad: false, early: false, runout: 0, grabSpin: false, wet: false, skips: 0, bumps: 0, warnedRun: false });
let S = newS(), br = null, lastHint = '';

/* ---------- DOM ---------- */
const deck = $('#deck'), recG = $('#rec'), recWrap = $('#recWrap'), platter = $('#platter'), armG = $('#arm'), armHit = $('#armHit');
const toastEl = $('#toast'), sheet = $('#sheet'), sheetBody = $('#sheetBody');
let toastT, sheetTick = null;
function toast(msg, bad) { toastEl.textContent = msg; toastEl.className = 'toast on' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => toastEl.className = 'toast', 4200); }
toastEl.onclick = () => toastEl.className = 'toast';
function openSheet(html) { sheetBody.innerHTML = html; sheet.hidden = false; sheet.scrollTop = 0; }
function closeSheet() { sheet.hidden = true; sheetBody.innerHTML = ''; sheetTick = null; }
$('#sheetX').onclick = closeSheet;
const svgPt = (svg, e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());

$('#strobe').innerHTML = Array.from({ length: 36 }, (_, i) => { const a = i * 10 * Math.PI / 180; return `<circle cx="${(127 * Math.cos(a)).toFixed(1)}" cy="${(127 * Math.sin(a)).toFixed(1)}" r="1.5" fill="#2A1B14"/>`; }).join('');

/* ---------- record drawing ---------- */
const rOfT = (rec, lay, t) => rec.rOut - (rec.rOut - rec.rIn) * t / lay.dur;
const tOfR = (rec, lay, r) => (rec.rOut - r) / (rec.rOut - rec.rIn) * lay.dur;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function recordInner(rec, side) {
  const lay = layout(rec, side), n = Math.round(clamp(rec.dust) * 70 + rec.grime * 40);
  let s = `<circle r="${rec.R}" fill="url(#grooves)" stroke="#0d0b0a" stroke-width="1.5"/>`;
  s += `<circle r="${(rec.R + rec.rOut) / 2 - .5}" fill="none" stroke="#141110" stroke-width="${rec.R - rec.rOut - 1}"/>`;
  for (let i = 0; i < lay.tracks.length - 1; i++) s += `<circle r="${rOfT(rec, lay, (lay.tracks[i].t1 + lay.tracks[i + 1].t0) / 2).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.5"/>`;
  s += `<circle r="${rec.rIn}" fill="#171312"/><circle r="${rec.rRun}" fill="none" stroke="#fff" stroke-opacity=".1"/>`;
  if (rec.grime > .02) s += `<circle r="${rec.R - 1}" fill="#9C8A66" fill-opacity="${(rec.grime * .28).toFixed(2)}"/>`;
  if (rec.wet > .02) s += `<circle r="${rec.R - 1}" fill="#8CCBFF" fill-opacity="${(rec.wet * .3).toFixed(2)}"/>`;
  s += `<circle r="${rec.rLabel}" fill="${rec.label}" stroke="#2A1B14" stroke-width="1.2"/>`;
  if (rec.labelWet) s += `<ellipse cx="9" cy="-12" rx="15" ry="10" fill="#2A1B14" fill-opacity=".22"/>`;
  const fs = rec.size === 12 ? 6.4 : 5.2;
  s += `<g font-family="Bricolage Grotesque,sans-serif" text-anchor="middle" fill="#fff" font-weight="800" pointer-events="none">
    <text y="${-rec.rLabel * .42}" font-size="${fs}">${esc(rec.title.toUpperCase())}</text>
    <text y="${rec.rLabel * .44}" font-size="${fs}">SIDE ${side ? 'B' : 'A'}</text>
    <text y="${rec.rLabel * .7}" font-size="${fs - 1}">${rpmTxt(rec.rpm)} RPM</text></g>`;
  s += `<circle r="3.6" fill="#3B3533"/>`;
  for (const p of rec.prints) s += `<g transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) rotate(${p[2]})" fill="none" stroke="#fff" stroke-opacity=".3"><ellipse rx="7" ry="9.5" fill="#fff" fill-opacity=".1"/><ellipse rx="4.5" ry="6.5"/><ellipse rx="2" ry="3.5"/></g>`;
  for (let i = 0; i < n && i < rec.specks.length; i++) { const p = rec.specks[i]; s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${p[2].toFixed(1)}" fill="#F3EDE2" fill-opacity=".85"/>`; }
  return s;
}
let recKey = '';
function refreshRec() {
  const r = dk.rec;
  const key = r ? [r.id, dk.side, Math.round(clamp(r.dust) * 70 + r.grime * 40), r.prints.length, Math.round(r.wet * 5), r.labelWet].join('|') : '';
  if (key === recKey) return; recKey = key;
  recG.innerHTML = r ? recordInner(r, dk.side) : '';
  const w = (a, R) => { const p = d => `${(R * Math.cos(d * Math.PI / 180)).toFixed(1)},${(R * Math.sin(d * Math.PI / 180)).toFixed(1)}`; return `<path d="M0,0 L${p(a - 11)} A${R},${R} 0 0 1 ${p(a + 11)} Z" fill="#fff" fill-opacity=".1"/>`; };
  $('#sheen').innerHTML = r ? w(-48, r.R - 1) + w(132, r.R - 1) + `<circle r="${r.rLabel}" fill="none"/>` : '';
}
function staticRec(rec, side, extra = '') { return `<svg class="big" viewBox="-130 -130 260 260">${extra}<g>${recordInner(rec, side)}</g></svg>`; }

/* ---------- shelf ---------- */
const cl = { rec: null, across: 0, msg: '' };
function renderShelf() {
  $('#shelf').innerHTML = RECORDS.map(r => `<button class="sleeve${r.size === 7 ? ' s7' : ''}${dk.rec === r || cl.rec === r ? ' out' : ''}${r.outer ? ' outer' : ''} in-${r.inner}" data-id="${r.id}" style="background:${r.art}" aria-label="${esc(r.title)} by ${r.artist}"></button>`).join('') + '<button class="sleeve add" aria-label="Press a record from your own audio files">+<small>Your songs</small></button>';
}
function condText(r) {
  if (r.wet > .05) return 'Still wet. Let it dry completely before you sleeve or play it.';
  if (r.grime > .3) return 'Grime deep in the grooves. A carbon fibre brush only lifts loose dust, so this one needs a deep clean.';
  if (r.prints.length) return 'Fingerprints on the playing surface. Skin oil holds dust in the groove: a deep clean will lift it.';
  if (r.dust > .15) return 'Some loose dust and static. A dust pass with the brush will sort it.';
  return 'Clean and ready.';
}
const info = r => `${r.title} · ${r.artist} · ${r.fmt}. ${r.note} ${condText(r)} Inner sleeve: ${r.inner === 'paper' ? 'plain paper' : 'anti-static'}.`;
function addPrint(r, x, y, count) { r.prints.push([x, y, Math.random() * 180 | 0]); if (count) S.prints++; }
function canPlace(r) {
  if (dk.rec) return toast(`${dk.rec.title} is still on the platter. Put it back in its sleeve first.`), false;
  if (st.cover) return toast('Open the dust cover first.'), false;
  if (st.rpm > .5) return toast('Stop the platter before you put a record on it.'), false;
  if (arm.dir > REST + .5) return toast('Return the tonearm to its rest first.'), false;
  return true;
}
function placeRecord(r, side) {
  S = newS(); dk.rec = r; dk.side = side;
  r.dust = clamp(r.dust + (r.inner === 'paper' ? .1 : .02) + st.mat * .4);
  layout(r, side); refreshRec(); renderShelf();
  recWrap.classList.remove('drop'); void recWrap.getBBox(); recWrap.classList.add('drop');
  setTimeout(() => synthSide(r, side), 80);
  toast(`${r.title} is on the platter, Side ${side ? 'B' : 'A'} up. Check the label for the speed.`);
}
function sleeveIt(r) {
  const played = S.tPlay > 3; dk.rec = null; refreshRec(); renderShelf();
  if (played) scoreSheet(r); else toast(`${r.title} is back in its sleeve.`);
}
$('#flip').onclick = () => {
  const r = dk.rec; if (!r) return toast('Nothing to flip yet.');
  if (st.cover) return toast('Open the dust cover first.');
  if (arm.down || arm.dir > REST + .5) return toast('Lift the needle and return the tonearm to its rest first.');
  if (st.rpm > .5) { S.grabSpin = true; return toast('Wait until the platter has fully stopped before you touch the record.', 1); }
  dk.side = 1 - dk.side; layout(r, dk.side); refreshRec(); setTimeout(() => synthSide(r, dk.side), 80); toast(`Flipped by the edges. Side ${dk.side ? 'B' : 'A'} is up.`);
};

/* ---------- drag and drop ---------- */
let drag = null;
const matSvg = $('#mat'), wallEl = $('.wall');
const recSvg = (r, side, ang = 0) => `<svg viewBox="-130 -130 260 260" style="width:100%;height:100%;display:block"><g transform="rotate(${ang.toFixed(1)})">${recordInner(r, side)}</g></svg>`;
function ghostOf(html, w, h) { const g = document.createElement('div'); g.className = 'ghost'; g.style.width = w + 'px'; g.style.height = h + 'px'; g.innerHTML = html; document.body.appendChild(g); return g; }
function moveGhost(e) { drag.ghost.style.transform = `translate(${e.clientX - drag.ox}px,${e.clientY - drag.oy}px)${drag.tilt ? ' rotate(-40deg)' : ''}`; }
function beginDrag(e, d) { e.preventDefault(); initAudio(); drag = Object.assign(d, { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: false }); moveGhost(e); }
const overPlatter = e => { const p = svgPt(deck, e); return Math.hypot(p.x - SP.x, p.y - SP.y) < 136; };
const overMat = e => { const p = svgPt(matSvg, e); return Math.hypot(p.x, p.y) < 134; };
const overWall = e => { const b = wallEl.getBoundingClientRect(); return e.clientY < b.bottom && e.clientY > b.top - 80; };
const PRINT = 'Fingerprint on the grooves. Skin oil attracts dust: hold the outer rim and the label only.';

function brushMove(e) {
  const r = dk.rec, p = svgPt(deck, e), x = p.x - SP.x, y = p.y - SP.y, rr = Math.hypot(x, y);
  if (br) { br.x = x; br.y = y; if (rr > r.R + 4) { endBrush(true); drag.spent = true; drag.ghost.style.opacity = 1; } return; }
  if (!r || drag.spent || rr > r.R || st.cover) return;
  if (arm.down) { if (!drag.warn) { drag.warn = true; toast('Lift the needle before you brush.'); } return; }
  br = { x, y, turns: 0, warned: false }; drag.ghost.style.opacity = 0;
}
function wipe(p, dx, dy) {
  const r = cl.rec, rr = Math.hypot(p.x, p.y); if (rr > r.R || rr < 1) return;
  if (r.wet < .05) { cl.msg = 'Dry wiping just grinds the dirt in. Drag the vinyl fluid over the record first.'; return; }
  if (rr < r.rLabel) { if (!r.labelWet) { r.labelWet = true; toast('You soaked the label. Keep the cloth on the grooves: wet labels stain and lift.', 1); } return; }
  const tang = Math.abs((p.x * dy - p.y * dx) / rr), rad = Math.abs((p.x * dx + p.y * dy) / rr);
  r.wet = 1;
  if (tang >= rad) {
    r.grime = Math.max(0, r.grime - tang * .0007); r.dust = Math.max(.02, r.dust - tang * .0006);
    if (r.grime < .02 && r.prints.length && Math.random() < tang * .01) r.prints.pop();
    cl.msg = r.grime < .02 && !r.prints.length ? 'Spotless. Now leave it until it is completely dry.' : 'That is it. Round and round, with the grooves.';
  } else { cl.across += rad; if (cl.across > 70) { cl.across = 0; r.wear = Math.min(1, r.wear + .02); cl.msg = 'Along the grooves, never across them.'; toast('Wiping across the grooves drags grit over the groove walls. Go in a circle.', 1); } }
}
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
  moveGhost(e);
  if (drag.kind === 'cloth' && cl.rec) { const p = svgPt(matSvg, e), q = svgPt(matSvg, { clientX: drag.lx, clientY: drag.ly }); wipe(p, p.x - q.x, p.y - q.y); }
  if (drag.kind === 'brush') brushMove(e);
  drag.lx = e.clientX; drag.ly = e.clientY;
});
function endDrag(e, cancel) {
  if (!drag) return; const d = drag, r = d.rec; drag = null; d.ghost.remove();
  if (d.src) d.src.style.visibility = '';
  switch (d.kind) {
    case 'sleeve':
      if (!d.moved) toast(info(r));
      else if (!cancel && overPlatter(e)) { if (canPlace(r)) placeRecord(r, 0); }
      else if (!cancel && overMat(e)) { if (cl.rec) toast('The cleaning mat is taken.'); else { cl.rec = r; cl.msg = ''; } }
      renderShelf(); break;
    case 'rec':
      recWrap.style.visibility = ''; $('#sheen').style.visibility = '';
      if (cancel) break;
      if (overWall(e)) sleeveIt(r);
      else if (overMat(e)) { if (cl.rec) toast('The cleaning mat is taken.'); else { dk.rec = null; cl.rec = r; cl.msg = ''; refreshRec(); renderShelf(); } }
      break;
    case 'crec':
      $('#matRec').style.visibility = '';
      if (cancel || !(overWall(e) || overPlatter(e))) break;
      if (r.wet > .05) { toast('Still wet. Let it dry completely before you sleeve or play it.', 1); break; }
      if (overWall(e)) { cl.rec = null; renderShelf(); toast(`${r.title} is dry and back in its sleeve.`); }
      else if (canPlace(r)) { cl.rec = null; placeRecord(r, 0); }
      break;
    case 'inner': case 'outer': case 'cover': {
      const el = !cancel && document.elementFromPoint(e.clientX, e.clientY), sl = el && el.closest('.sleeve'); if (!sl || sl.classList.contains('add')) break;
      const t = RECORDS.find(x => x.id === sl.dataset.id);
      if (d.kind === 'cover') { coverFor = t; coverIn.click(); break; }
      if (d.kind === 'inner') { if (t.inner === 'anti') toast(`${t.title} already has an anti-static inner sleeve.`); else { t.inner = 'anti'; toast(`${t.title} now lives in a poly-lined anti-static sleeve: less static, no paper scuffs or fibres.`); } }
      else if (t.outer) toast(`${t.title} already has an outer sleeve.`); else { t.outer = true; toast(`Outer sleeve on ${t.title}. The jacket is safe from dust, ring wear and scuffs.`); }
      renderShelf(); break; }
    case 'bottle':
      if (cancel || !overMat(e)) break;
      if (!cl.rec) { toast('Put a record on the cleaning mat first.'); break; }
      if (d.f === 'vinyl') { cl.rec.wet = 1; cl.msg = 'Fluid on, label kept dry. Now drag the cloth round the grooves.'; }
      else toast(d.f === 'glass' ? 'Not that. Household cleaners can damage vinyl. Use a fluid made for records.' : 'Not that. Alcohol-heavy mixes can damage vinyl. Use a fluid made for records.', 1);
      break;
    case 'brush': if (br) endBrush(false); break;
  }
}
document.addEventListener('pointerup', e => endDrag(e));
document.addEventListener('pointercancel', e => endDrag(e, true));

$('#shelf').addEventListener('pointerdown', e => {
  const b = e.target.closest('.sleeve'); if (!b || b.classList.contains('add')) return; const r = RECORDS.find(x => x.id === b.dataset.id);
  if (dk.rec === r) return toast(`${r.title} is on the platter. Its empty sleeve waits here.`);
  if (cl.rec === r) return toast(`${r.title} is on the cleaning mat.`);
  const q = b.getBoundingClientRect();
  beginDrag(e, { kind: 'sleeve', rec: r, src: b, ghost: ghostOf(`<div class="${b.className}" style="background:${r.art};width:100%;height:100%"></div>`, q.width, q.height), ox: e.clientX - q.left, oy: e.clientY - q.top });
  b.style.visibility = 'hidden';
});
document.querySelectorAll('.tool').forEach(el => el.addEventListener('pointerdown', e => {
  const i = el.querySelector('i'), q = i.getBoundingClientRect(), k = el.dataset.kind, stack = k === 'inner' || k === 'outer' || k === 'cover';
  beginDrag(e, { kind: k, f: el.dataset.f, src: stack ? null : i, ghost: ghostOf(`<div class="${el.className}">${i.outerHTML}</div>`, q.width, q.height), ox: e.clientX - q.left, oy: e.clientY - q.top, tilt: k === 'bottle' });
  if (!stack) i.style.visibility = 'hidden';
}));
matSvg.addEventListener('pointerdown', e => {
  const r = cl.rec; if (!r) return; const p = svgPt(matSvg, e), rr = Math.hypot(p.x, p.y); if (rr > r.R) return;
  if (rr > r.rLabel && rr < r.R * .88) { addPrint(r, p.x, p.y); toast(PRINT, 1); }
  const sc = matSvg.getBoundingClientRect().width / 270, w = 260 * sc;
  $('#matRec').style.visibility = 'hidden';
  beginDrag(e, { kind: 'crec', rec: r, ghost: ghostOf(recSvg(r, 0), w, w), ox: w / 2 + p.x * sc, oy: w / 2 + p.y * sc });
});
let stKey = null;
function stationDraw() {
  const r = cl.rec, k = r ? [r.id, Math.round(r.grime * 20), r.prints.length, Math.round(r.wet * 5), r.labelWet, Math.round(r.dust * 20)].join() : '';
  if (k !== stKey) { stKey = k; $('#matRec').innerHTML = r ? recordInner(r, 0) : ''; $('#matTxt').style.display = r ? 'none' : ''; }
  if (r && r.wet < .05 && cl.msg) cl.msg = '';
  $('#cg').style.width = (r ? Math.round(clamp(r.grime + r.prints.length * .08) * 100) : 0) + '%'; $('#cw').style.width = (r ? Math.round(r.wet * 100) : 0) + '%';
  $('#cmsg').textContent = r ? (cl.msg || condText(r) + (r.wet < .05 && r.grime < .02 ? ' Drag it back to the shelf or the platter.' : ' Drag the vinyl fluid over it, then wipe with the cloth.')) : 'Drag a dirty record here to deep clean it.';
}

/* ---------- press your own record from audio files (decoded locally, never uploaded) ---------- */
// embedded cover art: MP3 (ID3v2 APIC/PIC), FLAC (PICTURE block), M4A/MP4 (covr atom)
function coverOf(ab) {
  try {
    const u = new Uint8Array(ab), dv = new DataView(ab), tag = (o, n) => String.fromCharCode(...u.subarray(o, o + n));
    const img = (a, b) => { for (let i = a; i < b - 4 && i < a + 800; i++) { if (u[i] === 0xFF && u[i + 1] === 0xD8 && u[i + 2] === 0xFF) return new Blob([u.slice(i, b)], { type: 'image/jpeg' }); if (u[i] === 0x89 && u[i + 1] === 0x50 && u[i + 2] === 0x4E && u[i + 3] === 0x47) return new Blob([u.slice(i, b)], { type: 'image/png' }); } return null; };
    const ss = o => (u[o] & 127) << 21 | (u[o + 1] & 127) << 14 | (u[o + 2] & 127) << 7 | (u[o + 3] & 127);
    if (tag(0, 3) === 'ID3') {
      const v = u[3], end = Math.min(u.length, 10 + ss(6)); let o = 10;
      if (u[5] & 0x40) o += v === 4 ? ss(10) : dv.getUint32(10) + 4;
      while (o + 10 < end) {
        if (v === 2) { const sz = u[o + 3] << 16 | u[o + 4] << 8 | u[o + 5]; if (!sz || !u[o]) break; if (tag(o, 3) === 'PIC') { const p = img(o + 6, o + 6 + sz); if (p) return p; } o += 6 + sz; }
        else { const sz = v === 4 ? ss(o + 4) : dv.getUint32(o + 4); if (!sz || !u[o]) break; if (tag(o, 4) === 'APIC') { const p = img(o + 10, Math.min(end, o + 10 + sz)); if (p) return p; } o += 10 + sz; }
      }
      return null;
    }
    if (tag(0, 4) === 'fLaC') { let o = 4; while (o + 4 < u.length) { const h = u[o], sz = u[o + 1] << 16 | u[o + 2] << 8 | u[o + 3]; if ((h & 127) === 6) return img(o + 4, o + 4 + sz); if (h & 128) break; o += 4 + sz; } return null; }
    if (tag(4, 4) === 'ftyp') {
      const walk = (a, b, path) => { let o = a; while (o + 8 <= b) { let sz = dv.getUint32(o), hd = 8; const t = tag(o + 4, 4); if (sz === 1) { sz = Number(dv.getBigUint64(o + 8)); hd = 16; } else if (sz === 0) sz = b - o; if (sz < hd) break; if (t === path[0]) return path.length === 1 ? img(o + hd, Math.min(b, o + sz)) : walk(o + hd + (t === 'meta' ? 4 : 0), Math.min(b, o + sz), path.slice(1)); o += sz; } return null; };
      return walk(0, u.length, ['moov', 'udta', 'meta', 'ilst', 'covr']);
    }
  } catch (e) { /* unreadable tag: no cover */ }
  return null;
}
const fileIn = $('#files'), coverIn = $('#coverIn'); let pressN = 0, coverFor = null;
const artOf = f => `url('${URL.createObjectURL(f)}') center/cover no-repeat`;
function setCover(r, f) {
  if (!f || !f.type.startsWith('image/')) return toast('That is not an image. Try a JPG, PNG or WebP.', 1);
  r.art = artOf(f); renderShelf(); toast(`New cover on ${r.title}.`);
}
coverIn.onchange = () => { const f = coverIn.files[0]; coverIn.value = ''; if (f && coverFor) setCover(coverFor, f); };
$('#shelf').addEventListener('dragover', e => e.preventDefault());
$('#shelf').addEventListener('drop', e => {
  e.preventDefault(); const b = e.target.closest('.sleeve'), f = e.dataTransfer.files[0];
  if (!b || b.classList.contains('add')) return toast('Drop the image right onto a record sleeve.');
  setCover(RECORDS.find(x => x.id === b.dataset.id), f);
});
$('#shelf').addEventListener('click', e => { if (e.target.closest('.add')) { initAudio(); fileIn.click(); } });
fileIn.onchange = async () => {
  const files = [...fileIn.files].slice(0, 14); fileIn.value = ''; if (!files.length) return;
  initAudio(); if (!ac) return toast('This browser cannot play audio.', 1);
  toast('Pressing your record…');
  const dec = [];
  const pics = files.filter(f => f.type.startsWith('image/'));
  for (const f of files) { if (f.type.startsWith('image/')) continue; try { const raw = await f.arrayBuffer(), cov = coverOf(raw); dec.push({ name: f.name.replace(/\.[^.]+$/, ''), cov, buf: await ac.decodeAudioData(raw) }); } catch (err) { /* not audio */ } }
  if (!dec.length) return toast(pics.length ? 'That is a picture with no songs. To change a cover, drag the Cover art tile (or an image file) onto a record.' : 'None of those files could be read as audio. Try MP3, WAV, M4A or FLAC.', 1);
  const total = dec.reduce((a, d) => a + d.buf.duration, 0), one = dec.length === 1, single = one && total < 330;
  if (total > 46 * 60) return toast('That is over 46 minutes. An LP holds roughly 22 minutes a side, so press it as two records.', 1);
  let split = 1;
  if (!one) { let a = 0; for (split = 0; split < dec.length - 1 && a + dec[split].buf.duration <= total / 2 + 1; split++) a += dec[split].buf.duration; split = Math.max(1, split); }
  const groups = one ? [dec, dec] : [dec.slice(0, split), dec.slice(split)];
  const hue = (++pressN * 67 + 200) % 360, sr = ac.sampleRate;
  const r = { id: 'own' + pressN, title: one ? dec[0].name.slice(0, 22) : 'My Pressing ' + pressN, artist: 'Pressed by you', fmt: single ? '7-inch single' : '12-inch LP', size: single ? 7 : 12, rpm: single ? 45 : 33,
    label: `hsl(${hue} 55% 40%)`, seed: 90 + pressN, own: true,
    art: `radial-gradient(circle,#17110F 0 9%,hsl(${hue} 60% 52%) 10% 30%,transparent 31%),repeating-conic-gradient(hsl(${hue} 70% 84%) 0 20deg,#FBF1DC 20deg 40deg)`,
    dust: .15, grime: 0, inner: 'paper', outer: false, note: 'Your own pressing, playing at its real length.', sides: [[], []] };
  initRec(r); const emb = dec.find(d => d.cov); if (pics[0]) r.art = artOf(pics[0]); else if (emb) r.art = artOf(emb.cov);
  groups.forEach((g, si) => {
    let t = .6; const tracks = g.map(d => { const o = { name: d.name, len: d.buf.duration, t0: t, t1: t + d.buf.duration }; t += d.buf.duration + 2.4; return o; });
    const dur = t - 2.4 + .8; let ab;
    if (si && one) ab = r.lay[0].ab;
    else { ab = ac.createBuffer(2, Math.ceil(dur * sr) + 8, sr); g.forEach((d, i) => { for (let c = 0; c < 2; c++) ab.getChannelData(c).set(d.buf.getChannelData(Math.min(c, d.buf.numberOfChannels - 1)), Math.floor(tracks[i].t0 * sr)); }); }
    r.lay[si] = { tracks, dur, data: true, ab };
  });
  RECORDS.push(r); renderShelf();
  toast(`Pressed "${r.title}" as a ${r.fmt} at ${rpmTxt(r.rpm)} rpm, ${dec.length} track${one ? ' (same song both sides)' : 's across two sides'}${pics[0] ? '' : emb ? ', with the cover from the file' : ''}. It is on the shelf.`);
};

/* ---------- the judging ---------- */
const STAR = 'M12 2l3 6.5 7 .9-5.2 4.9 1.4 7L12 17.8 5.8 21.3l1.4-7L2 9.4l7-.9z';
function scoreSheet(r) {
  const sc = {
    Handling: clamp(1 - .34 * S.prints - (S.grabSpin ? .3 : 0)),
    'Dust pass': clamp(1 - (Math.max(0, (S.firstDust ?? 0) - .1)) / .5) * (S.wet ? .3 : 1),
    Speed: S.tPlay ? S.tRight / S.tPlay : 1,
    Cueing: clamp(1 - (S.hand ? .15 : 0) - (S.mid ? .3 : 0) - (S.bad ? .6 : 0) - (S.early ? .15 : 0)),
    'Put-away': clamp(1 - (S.runout > 5 ? .4 : 0) - (S.grabSpin ? .3 : 0) - Math.min(.3, S.bumps * .15)),
  };
  const avg = Object.values(sc).reduce((a, b) => a + b) / 5, stars = Math.max(1, Math.round(avg * 5));
  const title = avg > .96 ? 'Perfect!' : avg > .8 ? 'Smooth.' : avg > .6 ? 'A bit scratchy.' : 'Ouch.';
  const n = [];
  if (S.prints) n.push('Fingers on the grooves. Hold records by the edges and label only.');
  if ((S.firstDust ?? 0) > .35 && r.grime > .3) n.push('That grime is past what a brush can do. Deep clean it before the next play.');
  else if ((S.firstDust ?? 0) > .15) n.push('Dusty when the needle went down. Brush before every play.');
  if (S.wet) n.push('Played wet. Let a cleaned record dry completely first.');
  if (sc.Speed < .9) n.push(`Wrong speed for part of the side. This one plays at ${rpmTxt(r.rpm)}: check the label.`);
  if (S.bad) n.push('The stylus came down somewhere it should never touch. Lower it on the smooth outer edge.');
  if (S.mid) n.push('Dropped straight into a song. Start on the outer edge, or in the gap between tracks.');
  if (S.hand) n.push('Hand-cued. Fine if you are gentle, but the cue lever lowers the arm slowly for you.');
  if (S.early) n.push('Needle down before the platter reached full speed.');
  if (S.runout > 5) n.push('The stylus sat in the run-out groove. That wears it for nothing.');
  if (S.grabSpin) n.push('You reached for the record while the platter was still turning.');
  if (S.bumps) n.push('The table got bumped and the stylus skipped.');
  if (!n.length) n.push('Clean hands, clean grooves, right speed, gentle cue. Nothing to add.');
  n.push('Now close the dust cover until next time.');
  openSheet(`<div class="card"><h3>${title}</h3>
    <div class="stars">${[1, 2, 3, 4, 5].map(i => `<svg viewBox="0 0 24 24"><path d="${STAR}" fill="${i <= stars ? '#F2B21B' : '#fff'}"/></svg>`).join('')}</div>
    <p class="sub">${r.title}, back in its sleeve.</p><hr class="rule">
    <div class="bars">${Object.entries(sc).map(([k, v]) => `<div>${k}<i class="${v < .6 ? 'r' : ''}" style="width:${Math.round(v * 100)}%"></i></div>`).join('')}</div>
    <ul class="notes">${n.map(x => `<li>${x}</li>`).join('')}</ul>
    <div class="acts"><button class="btn pri" data-a="x">NEXT</button></div></div>`);
  sheetBody.onclick = e => { if (e.target.dataset.a) closeSheet(); };
}

/* ---------- service bench ---------- */
function benchSheet() {
  const wearF = clamp((st.hours - 500) / 400);
  openSheet(`<div class="card"><h3>Service bench</h3><p class="sub">Belt-drive deck, moving-magnet cartridge.</p><hr class="rule">
  <div class="srow"><div class="pad" id="pad"><svg viewBox="0 0 130 130"><text x="65" y="15" text-anchor="middle" font-size="9" font-weight="800">BACK</text><text x="65" y="126" text-anchor="middle" font-size="9" font-weight="800">FRONT</text><rect x="45" y="24" width="40" height="62" rx="6" fill="#2A1B14"/><rect x="52" y="52" width="26" height="30" rx="4" fill="#F2B21B"/><line x1="65" y1="82" x2="65" y2="98" stroke="#2A1B14" stroke-width="2"/><circle cx="65" cy="100" r="${(3 + st.dirt * 7).toFixed(1)}" fill="${st.dirt > .15 ? '#9C8A66' : '#BBDAE7'}" stroke="#2A1B14"/></svg></div>
    <header>Stylus tip <em>${st.dirt < .15 ? 'clean' : st.dirt < .5 ? 'some fluff' : 'caked'}</em></header>
    <p>Swipe the stylus brush across the pad. A dirty stylus sounds fuzzy and wears records faster.</p><p id="padMsg" style="font-weight:700;opacity:1"></p><div style="clear:both"></div></div>
  <div class="srow"><header>Stylus life <em>${st.hours.toFixed(1)} h of roughly 800</em></header>
    <p>Typical life is 500 to 1,000 hours depending on the stylus type. Worn signs: distortion, harsh "s" sounds, more crackle, skipping.${st.cant > .05 ? ' <b>The cantilever is bent from rough brushing.</b>' : ''}</p>
    <button class="btn" data-a="age">${wearF > .5 ? 'It is worn out' : 'Hear a worn one (900 h)'}</button><button class="btn" data-a="newstylus">Fit a new stylus</button></div>
  <div class="srow"><header>Tracking force <em id="vF"></em></header><p>Cartridge maker's number: 1.8 g (1.6 to 2.0). Too light skips and rattles; too heavy wears record and stylus.</p><input type="range" id="fF" min="0.5" max="4" step="0.1" value="${st.force}"></div>
  <div class="srow"><header>Anti-skate <em id="vA"></em></header><p>Set it to match the tracking force.</p><input type="range" id="fA" min="0" max="4" step="0.1" value="${st.anti}"></div>
  <div class="srow"><header>Level <em id="vL"></em></header><div class="level"><b id="bub"></b></div><input type="range" id="fL" min="-2" max="2" step="0.1" value="${st.tilt}" aria-label="Adjust the feet"><p>Bubble level on the platter. Turn the feet until the bubble sits between the lines.</p></div>
  <div class="srow"><header>Drive belt <em>${st.oldBelt ? 'stretched, 6 years old' : 'fresh'}</em></header><p>Replace every few years, or sooner if the speed drifts or the pitch sounds wobbly.</p>
    <button class="btn" data-a="belt">${st.oldBelt ? 'Fit a new belt' : 'Hear a stretched belt'}</button></div>
  <div class="srow"><header>Platter mat <em>${st.mat < .2 ? 'clean' : st.mat < .5 ? 'dusty' : 'very dusty'}</em></header><p>Dust on the mat ends up on your records.</p><button class="btn" data-a="mat">Wipe the mat</button></div>
  <div class="srow"><header>Moving the turntable?</header><p>Stylus guard on, tonearm clipped in its rest, dust cover closed.</p></div></div>`);
  const upd = () => {
    $('#vF').textContent = st.force.toFixed(1) + ' g' + (st.force < 1.5 ? ' · too light' : st.force > 2.1 ? ' · too heavy' : ' · good');
    $('#vA').textContent = st.anti.toFixed(1) + (Math.abs(st.anti - st.force) < .35 ? ' · matched' : ' · mismatched');
    $('#vL').textContent = Math.abs(st.tilt) < .3 ? 'level' : Math.abs(st.tilt).toFixed(1) + '° off';
    $('#bub').style.left = (50 - st.tilt * 22) + '%';
  }; upd();
  $('#fF').oninput = e => { st.force = +e.target.value; upd(); };
  $('#fA').oninput = e => { st.anti = +e.target.value; upd(); };
  $('#fL').oninput = e => { st.tilt = +e.target.value; upd(); };
  sheetBody.onclick = e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'age') st.hours = Math.max(st.hours, 900);
    if (a === 'newstylus') { st.hours = 0; st.cant = 0; st.dirt = 0; toast('New stylus fitted. Hours back to zero.'); }
    if (a === 'belt') st.oldBelt = !st.oldBelt;
    if (a === 'mat') { if (dk.rec) return toast('Take the record off before you wipe the mat.'); st.mat = 0; }
    benchSheet();
  };
  const pad = $('#pad'); let p0 = null;
  pad.onpointerdown = e => { p0 = [e.clientX, e.clientY]; pad.setPointerCapture(e.pointerId); };
  pad.onpointerup = e => {
    if (!p0) return; const dx = e.clientX - p0[0], dy = e.clientY - p0[1]; p0 = null;
    if (Math.hypot(dx, dy) < 24) return;
    let m;
    if (arm.down) m = 'Lift the needle off the record first.';
    else if (st.guard) m = 'Take the stylus guard off to reach the tip.';
    else if (dy > Math.abs(dx) * 1.3) { st.dirt = Math.max(0, st.dirt - .4); m = 'Back to front, the way the record moves. Good.'; }
    else if (-dy > Math.abs(dx) * 1.3) { st.cant = Math.min(1, st.cant + .25); m = 'Wrong way. Front to back pushes against the cantilever.'; }
    else { st.cant = Math.min(1, st.cant + .35); m = 'Never side to side. That bends the cantilever.'; }
    benchSheet(); $('#padMsg').textContent = m;
  };
}

/* ---------- needle events ---------- */
function land() {
  arm.down = true; arm.rev = 0;
  const r = dk.rec, rr = arm.r, hand = arm.dropKind === 'hand';
  if (st.guard) { arm.zone = 'guard'; return toast('The stylus guard is still on. Lift the arm and take the guard off.'); }
  if (!r || rr > r.R) { arm.zone = 'mat'; scratch(.5); S.bad = true; st.cant = Math.min(1, st.cant + .1); return toast(r ? 'The stylus came down off the record. Lift it now, and aim for the smooth outer edge.' : 'There is no record there. The stylus just hit the mat. Lift it.', 1); }
  if (rr < r.rLabel) { arm.zone = 'label'; scratch(.4); S.bad = true; return toast('That is the label. Paper is no place for a diamond. Lift it.', 1); }
  if (r.wet > .05) S.wet = true;
  if (S.firstDust == null) S.firstDust = r.dust + r.grime + r.prints.length * .08;
  if (st.on && st.rpm < rpmVal(st.speed) * .93 || !st.on) S.early = true;
  if (hand) { S.hand = true; thump(.55); } else thump(.2);
  const lay = synthSide(r, dk.side);
  if (rr > r.rOut) { arm.zone = 'leadin'; return; }
  if (rr <= r.rIn) { arm.zone = 'runout'; return; }
  arm.t = tOfR(r, lay, rr);
  if (lay.tracks.some(k => arm.t > k.t0 + 1.5 && arm.t < k.t1 - 1)) { S.mid = true; toast('Straight into the middle of a song. The outer edge or the gap between tracks is kinder.'); }
  arm.zone = 'groove'; startSource(arm.t);
}
function lift() { arm.down = false; arm.zone = null; stopSource(); }
function skip(dir) {
  if (arm.zone !== 'groove') return; const lay = layout(dk.rec, dk.side);
  arm.t = clamp(arm.t + dir * 60 / rpmVal(dk.rec.rpm), 0, lay.dur - .1); S.skips++; thump(.25); startSource(arm.t);
}

/* ---------- controls ---------- */
const ctl = (id, fn) => { const el = $(id); el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('click', () => { initAudio(); fn(); }); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); initAudio(); fn(); } }); };
ctl('#btnStart', () => { st.on = !st.on; });
ctl('#btn33', () => { st.speed = 33; });
ctl('#btn45', () => { st.speed = 45; });
ctl('#btnCue', () => { st.cueUp = !st.cueUp; if (!st.cueUp) arm.dropKind = 'cue'; });
$('#tGuard').onclick = () => { if (arm.down && !st.guard) return toast('Lift the needle before you put the guard on.'); st.guard = !st.guard; if (arm.zone === 'guard') lift(); toast(st.guard ? 'Stylus guard on. Do this before moving or cleaning the turntable.' : 'Stylus guard off.'); };
$('#tCover').onclick = () => { if (arm.held) return; st.cover = !st.cover; st.tool = null; toast(st.cover ? 'Dust cover closed. Keep it shut whenever the turntable is not in use.' : 'Dust cover open.'); };
$('#tBench').onclick = benchSheet;
$('#tHint').onclick = () => toast(hint());
$('#vol').oninput = e => { vol = +e.target.value; if (master) master.gain.value = vol; };
document.addEventListener('pointerdown', initAudio, { once: true });

armHit.addEventListener('pointerdown', e => {
  e.stopPropagation(); initAudio();
    armHit.setPointerCapture(e.pointerId); arm.held = true;
  if (arm.down) lift(); arm.h = 1;
  const p = svgPt(deck, e); arm.grab = Math.atan2(p.y - PV.y, p.x - PV.x) * 180 / Math.PI - arm.dir;
});
armHit.addEventListener('pointermove', e => {
  if (!arm.held) return; const p = svgPt(deck, e);
  arm.dir = clamp(Math.atan2(p.y - PV.y, p.x - PV.x) * 180 / Math.PI - arm.grab, REST, DIR_MAX); arm.r = rOfDir(arm.dir);
});
const armUp = () => { if (!arm.held) return; arm.held = false; if (arm.dir < REST + 5) { arm.dir = REST; arm.r = rOfDir(REST); } else if (!st.cueUp) arm.dropKind = 'hand'; };
armHit.addEventListener('pointerup', armUp); armHit.addEventListener('pointercancel', armUp);

deck.addEventListener('pointerdown', e => {
  initAudio(); const p = svgPt(deck, e), x = p.x - SP.x, y = p.y - SP.y, rr = Math.hypot(x, y), r = dk.rec;
  if (st.cover) return toast('The dust cover is closed. Open it to use the deck.');
  if (r && rr < r.R) {
    if (arm.down || arm.dir > REST + .5) return toast('Lift the needle and return the tonearm to its rest first.');
    if (st.rpm > .5) { S.grabSpin = true; return toast('Wait until the platter has fully stopped before you take the record off.', 1); }
    if (rr > r.rLabel && rr < r.R * .88) { const a = -st.ang * Math.PI / 180; addPrint(r, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), true); toast(PRINT, 1); }
    const sc = deck.getBoundingClientRect().width / 400, w = 260 * sc;
    recWrap.style.visibility = 'hidden'; $('#sheen').style.visibility = 'hidden';
    return beginDrag(e, { kind: 'rec', rec: r, ghost: ghostOf(recSvg(r, dk.side, st.ang), w, w), ox: w / 2 + x * sc, oy: w / 2 + y * sc });
  }
  if (rr > 134 && arm.zone === 'groove') { S.bumps++; skip(Math.random() < .5 ? -1 : 2); toast('You bumped the table and the stylus skipped. Hands off while it plays.', 1); }
});
function endBrush(swept) {
  const r = dk.rec, t = br.turns; br = null;
  if (t < .3) return toast(st.rpm < 1 ? 'Nothing happens on a still record. Start the platter, then hold the brush on it.' : 'Hold it lightly in place for a couple of full turns.');
  const q = clamp(t / 2);
  if (swept) { r.dust = Math.max(.02, r.dust * (1 - .95 * q)); if (q >= 1) { S.brushed = true; st.tool = null; toast(r.grime > .3 ? 'Loose dust gone. The deep grime is still there, though: that needs a proper clean.' : 'Two turns and a slow sweep off the edge. Dust gone.'); } else toast('A little longer next time: a couple of full turns before you sweep off.'); }
  else { r.dust = Math.max(.02, r.dust * (1 - .45 * q)); toast('You lifted straight up and left a line of dust. Draw the brush slowly off toward the edge instead.'); }
}

/* ---------- guidance ---------- */
function hint() {
  const r = dk.rec;
  if (st.cover) return 'Open the dust cover.';
  if (!r) return S.tPlay > 3 ? 'All put away. Close the dust cover, or pick another record.' : 'Drag a record from the shelf onto the platter.';
  if (arm.zone === 'guard' || arm.zone === 'mat' || arm.zone === 'label') return 'Raise the cue lever to lift the stylus.';
  if (arm.zone === 'runout') return 'The side is over. Raise the cue lever and move the arm back to its rest.';
  if (arm.zone === 'groove' || arm.zone === 'leadin') return st.speed !== r.rpm ? `Sounds wrong? The label says ${rpmTxt(r.rpm)} rpm.` : 'Listen. Do not bump the table.';
  if (S.tPlay > 3 && arm.dir <= REST + .5) return st.on || st.rpm > .5 ? 'Stop the platter and wait until it has fully stopped.' : 'Flip it, or drag the record by its edge or label back to the shelf.';
  if (r.grime > .3 && !S.tPlay) return 'This one is grimy. A brush will not fix it: drag it to the cleaning mat first, or hear what grime sounds like.';
  if (st.speed !== r.rpm) return `Check the label: this record plays at ${rpmTxt(r.rpm)} rpm.`;
  if (!st.on) return 'Press START and let the platter reach full speed.';
  if (r.dust > .12 && !S.brushed) return 'Do a dust pass: drag the carbon fibre brush onto the spinning record, hold for two turns, then sweep it off the edge.';
  if (st.guard) return 'Take the stylus guard off.';
  if (arm.dir <= REST + .5) return st.cueUp ? 'Drag the tonearm over the smooth outer edge of the record.' : 'Raise the cue lever, then drag the tonearm over the outer edge of the record.';
  if (st.cueUp) return 'Press the cue lever down. The arm lowers itself slowly.';
  return 'Listen.';
}
const meterEl = $('#meters');
function panels() {
  const r = dk.rec, tgt = rpmVal(st.speed);
  const c = [Math.abs(st.tilt) < .5, r && S.prints === 0, !!r, r && st.speed === r.rpm, r && (S.brushed || r.dust < .12), st.on && st.rpm > tgt * .93,
    arm.down && (arm.zone === 'groove' || arm.zone === 'leadin'), S.tPlay > 10, S.tPlay > 3 && !arm.down && arm.dir <= REST + .5, S.tPlay > 3 && !st.on && st.rpm < .5 && arm.dir <= REST + .5];
  c.forEach((v, i) => $('#c' + (i + 1)).classList.toggle('done', !!v));
  const surf = r ? clamp(1 - r.dust * .7 - r.grime - r.prints.length * .1 - r.wear) : 0, life = clamp(1 - st.hours / 800);
  const setup = clamp(1 - Math.max(Math.abs(st.force - 1.8) / 1.5, Math.abs(st.anti - st.force) / 2, Math.abs(st.tilt) / 2, st.oldBelt ? .6 : 0, st.cant));
  const m = (n, v, t) => `<div class="m">${n}<div class="t"><b class="${v < .5 ? 'warn' : ''}" style="width:${Math.round(v * 100)}%"></b></div><small>${t}</small></div>`;
  meterEl.innerHTML = m('Record surface', surf, r ? (r.wet > .05 ? 'Wet' : r.grime > .3 ? 'Grimy: needs a deep clean' : r.prints.length ? 'Fingerprints' : r.dust > .12 ? 'Dusty: brush it' : 'Clean') : 'Nothing on the platter')
    + m('Stylus tip', 1 - st.dirt, st.dirt < .15 ? 'Clean' : 'Fluff building up: brush it at the service bench')
    + m('Stylus life', life, `${st.hours.toFixed(1)} h played of roughly 800`)
    + m('Setup', setup, setup > .8 ? 'Level, 1.8 g, anti-skate matched' : 'Something is off: check the service bench');
  // now playing
  let a = 'No record on the platter', b = 'Drag one from the shelf';
  if (r) {
    const lay = layout(r, dk.side); a = `${r.title} · Side ${dk.side ? 'B' : 'A'}`;
    if (arm.zone === 'groove') { const k = lay.tracks.find(k => arm.t < k.t1 + 1.2) || lay.tracks[lay.tracks.length - 1]; const i = lay.tracks.indexOf(k) + 1; b = `${i}. ${k.name} · ${st.speed === r.rpm ? rpmTxt(r.rpm) + ' rpm' : 'wrong speed!'}`; }
    else if (arm.zone === 'leadin') b = 'Lead-in groove…';
    else if (arm.zone === 'runout') b = 'Run-out groove. Lift the needle.';
    else if (arm.zone) b = 'Stylus is not on the record';
    else b = st.rpm > .5 ? `Platter turning at ${st.rpm.toFixed(1)} rpm` : 'Platter stopped';
  }
  $('#npA').textContent = a; $('#npB').textContent = b;
  $('#tGuard').setAttribute('aria-pressed', st.guard); $('#tCover').setAttribute('aria-pressed', st.cover);
}

/* ---------- main loop ---------- */
let prev = performance.now(), acc = 0, matKey = -1;
function tick(now) {
  const dt = Math.min(.05, (now - prev) / 1000); prev = now;
  const r = dk.rec, lay = r && layout(r, dk.side), wearF = clamp((st.hours - 500) / 400);

  // platter: belt drive spins up and coasts down
  let tgt = st.on ? rpmVal(st.speed) : 0;
  if (st.oldBelt && st.on) tgt *= .972 + .012 * Math.sin(now / 1000 * 3.4) + .004 * Math.sin(now / 1000 * 19);
  st.rpm += (tgt - st.rpm) * (1 - Math.exp(-dt / (st.on ? .45 : 1)));
  if (!st.on && st.rpm < .08) st.rpm = 0;
  st.ang = (st.ang + st.rpm * 6 * dt) % 360;
  const rate = r ? st.rpm / rpmVal(r.rpm) : 0;

  // tonearm height: held up by hand, by the cue lift, or by its rest
  if (arm.held || st.cueUp || arm.dir <= REST + .5) { if (arm.down) lift(); arm.h = Math.min(1, arm.h + dt / .45); }
  else if (!arm.down) { arm.h -= dt / (arm.dropKind === 'hand' ? .14 : 1.1); if (arm.h <= 0) { arm.h = 0; land(); } }

  // stylus in the groove
  const riding = arm.down && r && (arm.zone === 'leadin' || arm.zone === 'groove' || arm.zone === 'runout');
  if (riding) {
    const revs = st.rpm / 60 * dt;
    if (arm.zone === 'leadin') { arm.r -= revs * (r.R - r.rOut) / 1.5 + revs * 2; if (arm.r <= r.rOut) { arm.zone = 'groove'; arm.t = 0; startSource(0); } }
    else if (arm.zone === 'groove') {
      arm.t += dt * rate; arm.r = rOfT(r, lay, arm.t);
      if (st.rpm > 1) { S.tPlay += dt; if (Math.abs(rate - 1) < .06) S.tRight += dt; st.hours += dt * (r.own ? 1 : 15) / 3600; }
      st.dirt = Math.min(1, st.dirt + dt * rate * (.0006 + .006 * (r.dust + r.grime)));
      r.wear = Math.min(1, r.wear + dt * rate * (Math.max(0, st.force - 2.5) * .004 + wearF * .003 + st.dirt * .0008));
      let p = Math.max(0, 1.3 - st.force) * 1.4 + Math.max(0, Math.abs(st.tilt) - .7) * .3 + wearF * .12 + Math.max(0, Math.abs(st.anti - st.force) - 1.2) * .25 + r.grime * .04;
      if (Math.random() < p * dt * Math.min(1, rate)) skip(st.anti < st.force - 1 || st.tilt > .7 ? 2 : Math.random() < .5 ? -1 : 2);
      if (arm.t >= lay.dur) { arm.zone = 'runout'; stopSource(); }
    } else {
      arm.r = Math.max(r.rRun, arm.r - revs * 5); arm.rev += revs;
      if (arm.rev >= 1) { arm.rev -= 1; thump(.16); }
      if (st.rpm > 1) { S.runout += dt; st.hours += dt * (r.own ? 1 : 15) / 3600; if (S.runout > 5 && !S.warnedRun) { S.warnedRun = true; toast('Still going round the run-out groove. Lift the needle: this wears the stylus for nothing.', 1); } }
    }
    arm.dir = dirOfR(arm.r);
  }

  // brush
  if (br && r) { br.turns += st.rpm / 60 * dt; if (st.rpm < 1 && !br.warned) { br.warned = true; toast('Start the platter first. The brush works while the record spins.'); } }

  // dust settles, wet records dry
  if (!st.cover) { if (r) r.dust = Math.min(1, r.dust + dt * .0012); else st.mat = Math.min(1, st.mat + dt * .0015); }
  for (const x of RECORDS) if (x.wet > 0) x.wet = Math.max(0, x.wet - dt / 9);

  // sound
  if (ac) {
    const tnow = ac.currentTime, moving = riding && st.rpm > 1;
    if (src && arm.zone === 'groove') {
      src.playbackRate.value = Math.max(.001, rate);
      musicGain.gain.setTargetAtTime(rate > .04 ? 1 : 0, tnow, .03);
      setCurve(st.dirt * 18 + wearF * 14 + st.cant * 14 + Math.max(0, 1.3 - st.force) * 12);
      lp.frequency.setTargetAtTime(15000 * (1 - .78 * st.dirt) * (st.force > 2.6 ? .7 : 1) * (r.wet > .05 ? .5 : 1), tnow, .1);
      peak.gain.setTargetAtTime(wearF * 10, tnow, .1);
      if (pan.pan) pan.pan.setTargetAtTime(clamp((st.anti - st.force) * .3 + st.cant * .3, -.8, .8), tnow, .1);
    }
    const lvl = moving ? .05 + 1.5 * clamp(r.dust * .5 + r.grime * .9 + r.prints.length * .08 + r.wear * .8 + wearF * .5 + (r.wet > .05 ? .3 : 0), 0, 1.6) : 0;
    crackleGain.gain.setTargetAtTime(lvl, tnow, .05);
    crackleSrc.playbackRate.value = Math.max(.2, rate || 1);
  }

  // draw
  platter.setAttribute('transform', `rotate(${st.ang.toFixed(2)})`);
  recG.setAttribute('transform', `rotate(${st.ang.toFixed(2)})`);
  armG.setAttribute('transform', `rotate(${(arm.dir - REST).toFixed(2)} ${PV.x} ${PV.y})`);
  armG.style.filter = `drop-shadow(${(2 + arm.h * 7).toFixed(1)}px ${(3 + arm.h * 9).toFixed(1)}px ${(1 + arm.h * 3).toFixed(1)}px rgba(42,27,20,.28))`;
  const brush = $('#brush');
  if (br) { brush.style.display = ''; brush.setAttribute('transform', `translate(${br.x.toFixed(1)},${br.y.toFixed(1)}) rotate(${(Math.atan2(br.y, br.x) * 180 / Math.PI - 90).toFixed(1)})`); } else brush.style.display = 'none';

  acc += dt;
  if (acc > .2) {
    acc = 0; refreshRec(); panels();
    $('#startTxt').textContent = st.on ? 'STOP' : 'START'; $('#startFace').setAttribute('fill', st.on ? '#F2B21B' : '#F6ECD9');
    $('#led33').setAttribute('fill', st.speed === 33 ? '#F2B21B' : '#CFC5B3'); $('#led45').setAttribute('fill', st.speed === 45 ? '#F2B21B' : '#CFC5B3');
    $('#cueKnob').setAttribute('cy', st.cueUp ? 243 : 275);
    $('#guard').style.display = st.guard ? '' : 'none'; $('#cover').style.display = st.cover ? '' : 'none';
    deck.classList.toggle('brushing', st.tool === 'brush');
    const mk = Math.round(st.mat * 30);
    if (mk !== matKey) { matKey = mk; const R = rng(5); let s = ''; for (let i = 0; i < mk; i++) { const a = R() * 6.283, d = 12 + R() * 105; s += `<circle cx="${(Math.cos(a) * d).toFixed(1)}" cy="${(Math.sin(a) * d).toFixed(1)}" r=".9" fill="#F3EDE2" fill-opacity=".7"/>`; } $('#matDust').innerHTML = s; }
    if (sheetTick) sheetTick(); stationDraw();
  }
  requestAnimationFrame(tick);
}

renderShelf(); refreshRec(); panels();
requestAnimationFrame(tick);
})();
