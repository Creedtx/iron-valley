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
await p.evaluate(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); await v.previewL2Layout(); }); if (mode === 'l3' || mode === 'l4' || mode === 'l5' || mode === 'l6' || mode === 'l7') await p.evaluate(async () => { const v = window.__iv; await v.loadModels(['tool_press', 'level3']); v.S.plots.north.st = 3; v.S.level = 3; v.buyField(false); v.buildLevel3(); v.finishPress(false); });
if (mode === 'l4' || mode === 'l5' || mode === 'l6' || mode === 'l7') await p.evaluate(async () => { const v = window.__iv; v.S.plots.scrap = { st:3 }; v.openScrapyard(false); v.S.levelUp = true; await v.startLevel(4); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.startSaw2Build(false); v.finishSaw2(false); });
if (mode === 'l5' || mode === 'l6' || mode === 'l7') await p.evaluate(async () => { const v = window.__iv; v.S.plots.road = { st:3 }; v.finishPlot('road', false); v.S.levelUp = true; await v.startLevel(5); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.S.plots.shop = { st:3 }; v.finishPlot('shop', false); v.startMill2Build(false); v.finishMill2(false); });
if (mode === 'l6' || mode === 'l7') await p.evaluate(async () => { const v = window.__iv; v.S.levelUp = true; await v.startLevel(6); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.S.l6.tarp = 1; v.finishRefit('saw', false); v.buildLevel6(); for (const id of ['canteen', 'conductor', 'changeover']) v.applyRestore(id, false); v.M.tarp || 0; });
if (mode === 'l6') await p.evaluate(() => { const v = window.__iv; if (!v.M.tarp) { v.S.l6.tarp = 1; } });
if (mode === 'l7') await p.evaluate(async () => { const v = window.__iv; v.S.levelUp = true; await v.startLevel(7); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.applyRestore('clock', false); v.buildDockLamps(); });
// v2.0: every new purchase placed, so the checker sees its posts and cases
await p.evaluate(() => { const v = window.__iv; for (const id of ['counter', 'urn', 'awning', 'bell', 'window', 'lamps', ...(v.S.level >= 4 ? ['canopy'] : [])]) v.applyRestore(id, false); });
const V2 = await p.evaluate(() => { const v = window.__iv; return { pay:v.PAY_AT, q:v.PAY_Q, ice:v.ICE_AT, nap:v.BOLT_NAP, shade:v.BOLT_SHADE }; });
const D = await p.evaluate(() => { const v = window.__iv; const seen = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; }; return { put:window.__ivLint.filter((x, i) => !window.__ivLintObj || seen(window.__ivLintObj[i])), col:[...v.COL.entries()].map(([k, b]) => ({ k:String(k), b })), P:v.P, ramp:v.LDOCK.ramp, deck:v.LDOCK.deck, lane:v.S.level >= 4 ? v.LANE4 : null, fork:v.LDOCK.fork, more:v.LDOCK.more || [], l5:v.S.level >= 5, l6:v.S.level >= 6, l7:v.S.level >= 7, pads7:v.PADS.filter(q => q.lv === 7).map(q => [q.id, q.at]), ring7:v.BOARD_RING, pads6:v.PADS.filter(q => q.lv === 6).map(q => [q.id, q.at]) }; });
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
  ['pay hatch', sq(V2.pay, .4), /^$/], ...V2.q.map((q, i) => [`pay queue ${i + 1}`, sq(q, .3), /^$/]), ['ice-cream ring', sq(V2.ice, .4), /^$/], ['Bolt nap spot', sq(V2.nap, .3), /^$/], ['Bolt shade spot', sq(V2.shade, .3), /^$/],
  ...['op', 'pallet', 'drop', 'cash', 'pop', 'pfeedRing', 'prackSpot', 'coilSpot', 'whSpotC', 'whSpotP', 'whSpotT', 'whBuild', 'deskRing', 'feedRing', 'timberRing', 'gus2', 'dockWait', 'trolleyPark', 'tfeedRing', 'tfix', 'trackSpot', 'unload', 'top', 'loaderHome', 'loaderWait', 'sawFix', 'genFix', 'wsDoor', 'frontIn', 'trade']
    .filter(k => P[k]).map(k => [`work spot ${k}`, sq(P[k]), /^$/]),
];
// level 4: the forklift lane (1.1 m wide truck, 0.2 m to spare each side) and the forklift ramp keep clear of everything
if (D.lane) { for (const [i, j] of D.lane.links) { const a = D.lane.pts[i], b = D.lane.pts[j]; if (D.fork && a[0] > 14.9 && a[1] > 1.7) continue; ZONES.push([`forklift lane ${i}-${j}`, [Math.min(a[0], b[0]) - .55, Math.min(a[1], b[1]) - .55, Math.max(a[0], b[0]) + .55, Math.max(a[1], b[1]) + .55], /^$/]); }
  ZONES.push(['forklift ramp', D.fork, /^$/]); for (const k of ['op2', 'feed2Ring', 'forkFeed2', 'saw2Fix', 'stallRing', 'forkStore', 'fork2', 'forkWh']) if (P[k]) ZONES.push([`work spot ${k}`, sq(P[k]), /^$/]); }
// level 5: dock 2 on Ada's corner, the white lorry's bay, its gate and the wicket, the zebra, the office door, mill 2's spots
if (D.l5) { for (const m of D.more) { ZONES.push(['dock 2 ramp', m.ramp, /loading_dock/], ['dock 2 deck', m.deck, /loading_dock/]); }
  ZONES.push(['white lorry bay', [P.truck2[0] - 1.25, P.truck2[1] - 2.6, P.truck2[0] + 1.25, P.truck2[1] + 2.6], /truck|loading_dock/], ['lorry gate 2', [25.0, 18.6, 27.6, 19.8], /gate|truck/], ['zebra crossing', [4.2, 14.4, 5.8, 18.1], /zebra|road|crossing/]);
  for (const k of ['coil2', 'coil2Ring', 'rack2Spot', 'officeDoor', 'priya', 'crossN', 'crossS']) if (P[k]) ZONES.push([`work spot ${k}`, sq(P[k]), /^$/]); }
// level 6: the crane's stand in the gateway (kept clear of fixed things), the new pads, June's kiosk door
if (D.l6) { ZONES.push(['grandad tarp', [22.0, -11.45, 23.8, -10.05], /tarp6/], ['crane stand', [3.85, 7.5, 6.15, 14.0], /gate|road|zebra|fence|crane/], ['kiosk door', [4.0, 25.1, 4.8, 25.8], /^$/], ['crane set-down', [6.85, 7.75, 9.05, 12.3], /^$/]); for (const [id, at] of D.pads6) ZONES.push([`pad ${id}`, sq(at, .5), /^$/]); }
if (D.l7) { ZONES.push(['order board ring', sq(D.ring7, .5), /^$/]); for (const [id, at] of D.pads7) ZONES.push([`pad ${id}`, sq(at, .5), /^$/]); }
const ov = (a, b) => { const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), d = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > .06 && d > .06 ? +(w * d).toFixed(2) : 0; };
const out = [];
for (const [zn, z, own] of ZONES) {
  for (const o of D.put) { const w = o.box[2] - o.box[0], d = o.box[3] - o.box[1]; if (o.h < .12 || w > 30 || d > 30 || own.test(o.name)) continue; const a = ov(o.box, z); if (a) out.push(`${zn.padEnd(30)} ← ${o.name} at [${o.at}] (overlap ${a} m², ${o.h} m tall)`); }
  for (const c of D.col) { const a = ov(c.b, z); if (a && !/dock|ramp|truck|kerb|cartBay/.test(c.k)) out.push(`${zn.padEnd(30)} ← collision box '${c.k}' [${c.b.map(v => v.toFixed(1))}]`); }
}
console.log(out.length ? out.join('\n') : 'layout clean'); console.log(`checked ${D.put.length} placed objects, ${D.col.length} collision boxes, ${ZONES.length} keep-clear zones`);
