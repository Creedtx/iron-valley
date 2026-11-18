// Build 0.20 fixes from play on the phone:
//  1. a gate customer wants crates (or pipes) and the pallet (or pipe rack) is empty, but the warehouse has stock:
//     the objective line sends the owner to the warehouse, he takes them from there and serves the customer;
//  2. the car and the end of the day: a trip that cannot be back by 17:00 is not offered; a car still out at the
//     knocking-off whistle drives home and parks before the gates shut and the day book opens.
//   node tools/fixes020.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1200000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
// game time runs here, step by step, with the owner walked by the test (no rendering: fast and exact)
const run = (secs, walkTo) => ev(([secs, walkTo]) => { const v = window.__iv; v.hold = true; let t = 0;
  while (t < secs) { if (walkTo) { const o = v.owner.o.position, dx = walkTo[0] - o.x, dz = walkTo[1] - o.z, d = Math.hypot(dx, dz), s = Math.min(d, .1); if (d > .02) o.set(o.x + dx / d * s, 0, o.z + dz / d * s); }
    v.step(.05); t += .05; if (window.__stop && window.__stop()) break; }
  v.hold = false; return t; }, [secs, walkTo]);
const walkTo = async (x, z) => { await run(60, [x, z]); };
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 20000; S.rep = 60; S.orderSeq = 6; S.delivered = 6; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.evNext = 1e9; });
await ev(async () => { const v = window.__iv; v.applyRestore('yard', false); v.S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.closeOffice(); while (v.cardOpen) v.nextCard();
  v.S.time = Math.floor(v.S.time / 480) * 480 + 60; });
const P = await ev(() => window.__iv.P);
// ---- 1. the gate customer, the empty pallet, the warehouse stock
await ev(() => { const v = window.__iv, S = v.S; S.order = null; S.pallet = 0; v.syncPallet(); S.wh.c = 6; v.syncWh && v.syncWh(); for (const c of v.staffObj.values()) c.o.position.set(-12, 0, -9);
  let w; for (let i = 0; i < 20 && (!w || w.def.want !== 'crate'); i++) { if (v.walker) { v.walker.c.o.removeFromParent(); } w = v.spawnWalker(true); } window.__w = w && w.def.want; });
check(await ev(() => window.__w === 'crate'), 'a customer comes to the gate for crates');
await run(40); await ev(() => { window.__stop = null; });
check(await ev(() => window.__iv.walker && window.__iv.walker.state === 'wait'), 'they wait at the gate');
const obj = await ev(() => document.getElementById('objT').textContent); console.log('objective:', obj);
check(/warehouse/i.test(obj), 'with the pallet empty, the objective sends the owner to the warehouse stock');
await walkTo(P.whSpotC[0], P.whSpotC[1] + 1.2); await walkTo(...P.whSpotC); await run(3);
check(await ev(() => window.__iv.owner.carryType === 'crate' && window.__iv.owner.stack.length >= 1), 'standing at the warehouse, the owner takes crates from the stock');
check(await ev(() => window.__iv.S.wh.c < 6), 'the warehouse count goes down');
const want = await ev(() => window.__iv.walker.n);
for (let k = 0; k < 4 && await ev(() => !!window.__iv.walker && window.__iv.walker.got < window.__iv.walker.n); k++) {
  if (await ev(() => !window.__iv.owner.stack.length)) { await walkTo(P.whSpotC[0], P.whSpotC[1] + 1.2); await walkTo(...P.whSpotC); await run(3); }
  await walkTo(P.whSpotC[0], P.whSpotC[1] + 1.5); await walkTo(P.frontIn[0], P.frontIn[1]); await walkTo(P.trade[0], P.trade[1] - .7); await run(3); }
check(await ev(() => !window.__iv.walker || window.__iv.walker.got >= window.__iv.walker.n), `the customer gets all ${want} crates from the warehouse stock`);
// ---- 2. the car and 17:00
await run(30);
await ev(() => { const v = window.__iv; if (v.walker) v.walker.t = 1e4; v.S.time = Math.floor(v.S.time / 480) * 480 + 480 - 20; });   // 16:35
check(await ev(() => window.__iv.tooLate(window.__iv.PLACES.grocer)), 'at 16:35 a 15-minute trip each way is too late');
await ev(() => { const v = window.__iv; v.owner.o.position.set(...v.P.carDoor); v.startTrip('visit', 'grocer'); });
check(await ev(() => !window.__iv.trip), 'so the car does not go');
await ev(() => { const v = window.__iv; v.S.time = Math.floor(v.S.time / 480) * 480 + 480 - 60; v.startTrip('visit', 'farm'); });   // 16:45, the farm is 10 min
check(await ev(() => !!window.__iv.trip), 'earlier, a short trip starts');
await ev(() => { window.__stop = () => { const v = window.__iv; return v.trip && ['away', 'there'].includes(v.trip.phase); }; }); await run(120);
await ev(() => { const v = window.__iv; window.__stop = null; if (v.trip.phase === 'there') {} v.S.time = Math.floor(v.S.time / 480) * 480 + 480 + .5; });   // 17:00 while the owner is out
// the knocking-off whistle with the owner in town: watch the order of things
await ev(() => { const v = window.__iv; window.__log = []; window.__stop = () => { const S = v.S, c = S.day && S.day.closing; const e = `${v.trip ? v.trip.phase : 'parked'}|${c ? (c.shut ? 'shut' : 'open') : '-'}|${v.cardOpen ? (document.getElementById('storyBody').innerText.match(/Day book|Valley|Farm|order/i) || ['card'])[0] : ''}`; if (window.__log[window.__log.length - 1] !== e) window.__log.push(e);
  if (v.cardOpen && /Day book/i.test(document.getElementById('storyBody').innerText)) return true; if (v.cardOpen) { const B = document.getElementById('storyBody'); (B.querySelector('[data-pick="none"]') || B.querySelector('[data-next]') || B.querySelector('button')).click(); } return false; }; });
await run(400);
const log = await ev(() => window.__log); console.log('sequence:', log.join(' > '));
check(await ev(() => window.__iv.cardOpen && /Day book/i.test(document.getElementById('storyBody').innerText)), 'the day book opens');
check(await ev(() => !window.__iv.trip && Math.hypot(window.__iv.M.car.position.x - window.__iv.P.carSpot[0], window.__iv.M.car.position.z - window.__iv.P.carSpot[1]) < .3), 'by then the car is parked in its space and the owner is out');
check(!log.some(e => /^(?!parked)[a-z]+\|shut/.test(e)), 'the gates never shut while the car is out');
await ev(() => { const v = window.__iv; v.nextCard(); }); await run(3);
check(await ev(() => !window.__iv.trip && !window.__iv.S.day.closing), 'next morning: nothing left of the trip, the car stays parked');
console.log(errs.length ? 'page errors:\n' + [...new Set(errs)].slice(0, 10).join('\n') : 'no errors');
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS');
await b.close();
