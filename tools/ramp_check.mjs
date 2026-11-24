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
const r = await ev(() => { const v = window.__iv, S = v.S, V = new v.Box3().min.constructor; v.hold = true; let t = 0, worst = 0, seen = 0, tilt = 0, onRamp = null, wheel = 0, wheelN = 0, loose = 0, loadOn = 0;
  while (t < 160) { if (v.cardOpen) v.nextCard(); if (S.order && !S.order.briefed) v.briefOrder(null); if (S.order && S.order.ready && v.truck.state === 'docked') v.signOrder(v.owner);
    v.step(.05); t += .05;
    for (const c of [v.owner, ...v.staffObj.values()]) { const q = c.o.position, g = v.groundY(q.x, q.z); if (g > .05) { seen++; worst = Math.max(worst, Math.abs(q.y - g)); if (c.cart && g < v.LDOCK.H - .05) { tilt = Math.max(tilt, Math.abs(c.cart.rotation.x)); if (!onRamp) onRamp = [q.x, q.z]; } }
      if (c.cart) { c.o.updateMatrixWorld(true); const wr = c.cart.localToWorld(new V(0, 0, .38)), gr = v.groundY(wr.x, wr.z); for (const zz of [.38, .92]) { const w = c.cart.localToWorld(new V(0, 0, zz)), g0 = v.groundY(w.x, w.z), gw = Math.abs(g0 - gr) > .2 ? gr : g0; if (gw > .02 || q.y > .02) { wheelN++; const e = Math.abs(w.y - gw); if (e > wheel) { wheel = e; window.__ww = { who:c.st ? c.st.name : 'owner', state:c.state, at:[q.x, q.y, q.z], zz, w:[w.x, w.y, w.z], gw, rx:c.cart.rotation.x, py:c.cart.position.y, par:c.cart.parent === c.o }; } } }
        for (const m of c.stack) { if (m.userData.flying) continue; if (m.parent === c.cart) loadOn++; else loose++; } } } }
  v.hold = false; return { worst, seen, tilt, onRamp, wheel, wheelN, loose, loadOn, shipped:S.shipped }; });
console.log(JSON.stringify(r)); console.log(JSON.stringify(await ev(() => window.__ww)));
check(r.seen > 50, 'people walked up the ramp and on the deck');
check(r.worst < .02, `feet stay on the slope and the deck (worst ${r.worst.toFixed(3)} m)`);
check(r.tilt > .15, `a pushed trolley tilts with the ramp (${(r.tilt * 57.3).toFixed(1)}°)`);
check(r.wheelN > 20 && r.wheel < .025, `the trolley's front and rear wheels sit on the concrete under them, on the slope and at its foot, level at the deck's edge (worst ${r.wheel.toFixed(3)} m over ${r.wheelN} samples)`);
check(r.loadOn > 20 && r.loose === 0, `the crates ride on the trolley's bed and tilt with it (${r.loadOn} on the bed, ${r.loose} loose)`);
// a picture with somebody half way up, and the guide trail
await ev(() => { const v = window.__iv; v.owner.o.position.set(12.2, 0, 6.15); v.camLock = [12.5, 6.5]; v.camZoom = .7; });
await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'ramp.png') });
await ev(() => { const v = window.__iv; v.owner.o.position.set(-6, 0, 6); v.camLock = null; v.camZoom = 1; });
await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'trail.png') });
check(await ev(() => document.getElementById('guideEdge') !== null), 'the edge arrow is in the page');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nRAMP CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
