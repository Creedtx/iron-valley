// Layout checker: boots the game with level 2 laid out, records every object the game places and every collision
// box, and reports anything standing where people or lorries must pass (ramp, dock, bays, gates, lane, work spots).
//   node tools/layout_lint.mjs <url> [l3]   (l3: also lays out level 3: goods-in by bay 2, the North field, the press)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, mode] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} window.__ivLint = []; });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
await p.evaluate(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); await v.previewL2Layout(); }); if (mode === 'l3' || mode === 'l4') await p.evaluate(async () => { const v = window.__iv; await v.loadModels(['tool_press', 'level3']); v.S.plots.north.st = 3; v.S.level = 3; v.buyField(false); v.buildLevel3(); v.finishPress(false); });
if (mode === 'l4') await p.evaluate(async () => { const v = window.__iv; v.S.plots.scrap = { st:3 }; v.openScrapyard(false); v.S.levelUp = true; await v.startLevel(4); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.startSaw2Build(false); v.finishSaw2(false); });
const D = await p.evaluate(() => { const v = window.__iv; return { put:window.__ivLint, col:[...v.COL.entries()].map(([k, b]) => ({ k:String(k), b })), P:v.P, ramp:v.LDOCK.ramp, deck:v.LDOCK.deck, lane:v.S.level === 4 ? v.LANE4 : null, fork:v.LDOCK.fork }; });
await b.close();
const P = D.P, sq = (pt, r = .45) => [pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r];
const ZONES = [
  ['dock ramp', D.ramp, /loading_dock/], ['dock deck', D.deck, /loading_dock/],
  ['truck bay 1', [P.truck[0] - 1.25, 4.95, P.truck[0] + 1.25, 10.2], /truck|loading_dock|canopy/], ['truck bay 2', [P.bay2[0] - 1.25, 4.95, P.bay2[0] + 1.25, 10.2], /truck|canopy/],
  ['lorry path through the gate', [P.truck[0] - 2.4, 10.2, P.bay2[0] + 1.6, 14.3], /truck/], ['main gate', [3.1, 10.8, 6.9, 14.3], /gate/],
  ['goods-in stack (loaders reach it from the yard side)', P.goodsIn ? [P.goodsIn[0] - .9, P.goodsIn[1] - .7, P.goodsIn[0] - .5, P.goodsIn[1] + .7] : [0, 0, 0, 0], /^$/],
  ['North field gateway', [12.25, -12.7, 15.35, -11.3], /gate|fence/],
  ['loading lane', [2.6, 5.0, 9.95, 6.6], /^$/],
  ['trolley bay', [-2.65, 6.35, .4, 7.15], /^$/], ...[[-2.25, 5.9], [-1.5, 5.9], [-.75, 5.9], [0, 5.9]].map((s, i) => [`trolley handle ${i + 1}`, sq(s, .3), /^$/]),
  ...['op', 'pallet', 'drop', 'cash', 'pop', 'pfeedRing', 'prackSpot', 'coilSpot', 'whSpotC', 'whSpotP', 'whSpotT', 'whBuild', 'deskRing', 'feedRing', 'timberRing', 'gus2', 'dockWait', 'trolleyPark', 'tfeedRing', 'tfix', 'trackSpot', 'unload', 'top', 'loaderHome', 'loaderWait', 'sawFix', 'genFix', 'wsDoor', 'frontIn', 'trade']
    .filter(k => P[k]).map(k => [`work spot ${k}`, sq(P[k]), /^$/]),
];
// level 4: the forklift lane (1.1 m wide truck, 0.2 m to spare each side) and the forklift ramp keep clear of everything
if (D.lane) { for (const [i, j] of D.lane.links) { const a = D.lane.pts[i], b = D.lane.pts[j]; if (D.fork && a[0] > 14.9 && a[1] > 1.7) continue; ZONES.push([`forklift lane ${i}-${j}`, [Math.min(a[0], b[0]) - .55, Math.min(a[1], b[1]) - .55, Math.max(a[0], b[0]) + .55, Math.max(a[1], b[1]) + .55], /^$/]); }
  ZONES.push(['forklift ramp', D.fork, /^$/]); for (const k of ['op2', 'feed2Ring', 'forkFeed2', 'saw2Fix', 'stallRing', 'forkStore', 'fork2', 'forkWh']) if (P[k]) ZONES.push([`work spot ${k}`, sq(P[k]), /^$/]); }
const ov = (a, b) => { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), d = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > .06 && d > .06 ? +(w * d).toFixed(2) : 0; };
const out = [];
for (const [zn, z, own] of ZONES) {
  for (const o of D.put) { const w = o.box[2] - o.box[0], d = o.box[3] - o.box[1]; if (o.h < .12 || w > 30 || d > 30 || own.test(o.name)) continue; const a = ov(o.box, z); if (a) out.push(`${zn.padEnd(30)} ← ${o.name} at [${o.at}] (overlap ${a} m², ${o.h} m tall)`); }
  for (const c of D.col) { const a = ov(c.b, z); if (a && !/dock|ramp|truck|kerb|cartBay/.test(c.k)) out.push(`${zn.padEnd(30)} ← collision box '${c.k}' [${c.b.map(v => v.toFixed(1))}]`); }
}
console.log(out.length ? out.join('\n') : 'layout clean'); console.log(`checked ${D.put.length} placed objects, ${D.col.length} collision boxes, ${ZONES.length} keep-clear zones`);
