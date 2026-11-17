// The level 2 map on the wide yard: applies the level 2 layout, then a clean overview with numbered pins.
//   node tools/map_l2.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1600, height:1200, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
const wait = ms => new Promise(r => setTimeout(r, ms));
await p.evaluate(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.S.tutDone = true; v.S.tut = 99; await v.previewL2Layout(); v.owner.o.position.set(5, 0, 10.6); });
await wait(2500);
await p.evaluate(() => { const v = window.__iv; v.camZoom = 4.3; v.camLock = [5.5, 1.5]; v.paused = true; for (const id of ['hud', 'ticket', 'ticket2', 'callc', 'callEdge', 'card', 'prompt', 'officeBtn', 'toasts', 'joy', 'vignette', 'labels', 'fps', 'dock']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
await wait(4000);
await p.screenshot({ path:path.join(out, 'l2_clean.png') });
const P = await p.evaluate(() => window.__iv.P);
const ITEMS = [
  [1, 'Main gate / owner route', 5, 12.6, 1.4], [2, 'Existing crate machine', -0.4, 2.9, 1.6], [3, 'Crate output pallet', P.pallet[0], P.pallet[1], .7],
  [4, 'Old generator', P.gen[0], P.gen[1], 1.9], [5, 'New pipe machine pad', P.pmill[0], P.pmill[1], 1.7], [6, 'Pipe output rack', P.prack[0], P.prack[1], 1.5],
  [7, 'Expanded loading bay (2 lorries)', (P.truck[0] + P.bay2[0]) / 2, P.truck[1] + 2.2, .3], [8, 'Timber and crate storage', -10.6, 6.0, 1.6],
  [9, 'Big Tom Okafor (contractor)', P.tomL2[0], P.tomL2[1], 2.1], [10, 'Vera Lind (estate agent)', P.veraL2[0], P.veraL2[1], 2.1], [11, 'Abel Thorne (landowner)', P.abelL2[0], P.abelL2[1], 2.1],
  [12, 'Cleared back-yard extension', 12.8, -8.6, .3],
  [13, 'Steel coil bay (metal stock)', P.coilBay[0], P.coilBay[1], 1.3], [14, 'Loading lane to the dock', 4.2, P.dock[1] - 1.2, .2], [15, 'Loading dock with concrete ramp', P.dock[0], P.dock[1] - 1.2, 1.5],
  [16, 'Mains transformer (board\'s pole)', P.xfmr[0], P.xfmr[1], 4.5], [17, 'Workshop with the office', -5, -6.5, 4.6], [18, 'Gus Mallory (old foreman)', P.gus2[0], P.gus2[1], 2.1],
  [19, 'Warehouse plot (built later in level 2)', 18.7, -9.4, .3]];
const pins = await p.evaluate(list => { const v = window.__iv, V = v.cam.position.constructor, W = innerWidth, H = innerHeight;
  return list.map(([n, name, x, z, y]) => { const q = new V(x, y, z).project(v.cam); return { n, name, px:(q.x + 1) / 2 * W, py:(1 - q.y) / 2 * H }; }); }, ITEMS);
fs.writeFileSync(path.join(out, 'pins.json'), JSON.stringify(pins, null, 1));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'ok'); await b.close();
