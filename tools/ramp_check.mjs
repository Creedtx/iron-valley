// The dock ramp: everybody climbs it on its slope (feet on the concrete, never sunk into it), a pushed trolley tilts with
// it, and the guide trail follows the walking route. Game time, then pictures.
//   node tools/ramp_check.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1800000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:720, height:1100, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
await ev(() => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 3000; S.orderSeq = 4; S.delivered = 4; S.sales.told = true; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.pallet = 14; v.syncPallet();
  S.call = { client:'Valley Grocers', qty:14, pq:0, tq:0, pay:200, deadline:400 }; v.acceptCall(); v.closeOffice(); });
// play until the loader is on the ramp with his trolley; record heights against the slope the whole way
const r = await ev(() => { const v = window.__iv, S = v.S; v.hold = true; let t = 0, worst = 0, seen = 0, tilt = 0, onRamp = null;
  while (t < 160) { if (v.cardOpen) v.nextCard(); if (S.order && !S.order.briefed) v.briefOrder(null); if (S.order && S.order.ready && v.truck.state === 'docked') v.signOrder(v.owner);
    v.step(.05); t += .05;
    for (const c of [v.owner, ...v.staffObj.values()]) { const q = c.o.position, g = v.groundY(q.x, q.z); if (g > .05) { seen++; worst = Math.max(worst, Math.abs(q.y - g)); if (c.cart && g < v.LDOCK.H - .05) { tilt = Math.max(tilt, Math.abs(c.cart.rotation.x)); if (!onRamp) onRamp = [q.x, q.z]; } } } }
  v.hold = false; return { worst, seen, tilt, onRamp, shipped:S.shipped }; });
console.log(JSON.stringify(r));
check(r.seen > 50, 'people walked up the ramp and on the deck');
check(r.worst < .02, `feet stay on the slope and the deck (worst ${r.worst.toFixed(3)} m)`);
check(r.tilt > .15, `a pushed trolley tilts with the ramp (${(r.tilt * 57.3).toFixed(1)}°)`);
// a picture with somebody half way up, and the guide trail
await ev(() => { const v = window.__iv; v.owner.o.position.set(12.2, 0, 6.15); v.camLock = [12.5, 6.5]; v.camZoom = .7; });
await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'ramp.png') });
await ev(() => { const v = window.__iv; v.owner.o.position.set(-6, 0, 6); v.camLock = null; v.camZoom = 1; });
await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'trail.png') });
check(await ev(() => document.getElementById('guideEdge') !== null), 'the edge arrow is in the page');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nRAMP CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
