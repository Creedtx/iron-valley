// Bible v2.0 gap audit (plans/gap_audit_v2.md): the cross-cutting items for Levels 1-8 on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/gaps.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:2400000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:900, height:1100, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
const run = (secs, cond) => ev(([secs, cond]) => { const v = window.__iv, S = v.S, f = cond ? new Function('v', 'S', 'return ' + cond) : null; v.hold = true; let t = 0;
  while (t < secs) { if (v.cardOpen && S.gus.party === 3 && !S.gus.gift) v.giveGift('clock'); if (v.cardOpen && !window.__keep) v.nextCard(); if (S.call) { if (S.call.dock === 2) v.acceptCall2(S.call), S.call = null; else v.acceptCall(); v.closeOffice(); } if (S.order && !S.order.briefed) v.briefOrder(null);
    if (!window.__nosign) { if (S.order && S.order.ready && v.truck.state === 'docked' && !v.trip) v.signOrder(v.owner); if (S.order2 && S.order2.ready && v.truckB.state === 'docked') v.signOrder2(v.owner); }
    if (S.store < 12 && !S.delivery) v.orderTimber(24); if (S.coils < 3 && !S.delivery) v.orderSteel(4); window.__each && window.__each(v); v.step(.05); t += .05; if (f && f(v, S)) break; }
  v.hold = false; return t; }, [secs, cond]);
// Levels 1-4 quickly, then Level 5
// build 0.35: grandad's car, a 1970s saloon built in three.js, and no more half-rate shadows (the walkers' shudder)
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; v.evNext = 1e9; v.hold = true; });
check(await ev(() => { const r = window.__iv.render ? null : null; return typeof window.__iv.shadowHalf === 'undefined'; }), 'shadows are drawn every frame (the every-other-frame step that made walkers shudder is gone)');
const c0 = await ev(() => { const v = window.__iv, c = v.M.car, u = c.userData, r = v.COL.get('car'); let meshes = 0; c.traverse(o => { if (o.isMesh) meshes++; });
  return { len:r[2] - r[0], wid:r[3] - r[1], body:!!u.body, door:!!u.door, wheels:u.spins.length, steer:u.steer.length, wipers:u.wipers.length, driver:!!u.driver, meshes, plate:!!u.mat.plate.map, chrome:u.mat.chrome.metalness === 1 && !!u.mat.chrome.envMap }; });
check(c0.body && c0.door && c0.wheels === 3 && c0.steer === 2 && c0.wipers === 2 && c0.driver, `the car: body, driver's door, rolling wheels (rear axle and two steering fronts), two wipers, a driver (${JSON.stringify(c0)})`);
check(c0.len > 3.4 && c0.len < 4.3 && c0.wid > 1.4 && c0.wid < 1.9, `its footprint is a car's (${c0.len.toFixed(2)} x ${c0.wid.toFixed(2)} m): the lamp beams are not in it`);
check(c0.chrome && c0.plate && c0.meshes < 60, `chrome with reflections, a number plate, merged to ${c0.meshes} meshes`);
// a trip: the door opens and shuts before it moves, the driver shows, the wheels turn, the front wheels steer at the gate
await ev(() => { const v = window.__iv; v.owner.o.position.set(...v.P.carDoor); v.startTrip('visit', 'grocer'); });
const d1 = await ev(() => { const v = window.__iv; let open = 0, movedOpen = false; const p0 = v.M.car.position.x; for (let i = 0; i < 40; i++) { v.step(.05); open = Math.min(open, v.M.car.userData.door.rotation.y); if (v.M.car.userData.door.rotation.y < -.05 && Math.abs(v.M.car.position.x - p0) > .01) movedOpen = true; } return { open, movedOpen, phase:v.trip && v.trip.phase }; });
check(d1.open < -.8 && !d1.movedOpen, `the driver's door swings open (${d1.open.toFixed(2)} rad) and shuts before the car moves (${d1.phase})`);
const d2 = await ev(() => { const v = window.__iv, u = v.M.car.userData; let spin0 = v.CARFX.spin, maxSteer = 0, drv = false, rev = 0, brake = 0, ind = 0; for (let i = 0; i < 400 && v.trip && v.trip.phase === 'out'; i++) { v.step(.05); maxSteer = Math.max(maxSteer, Math.abs(u.steer[0].rotation.y)); drv = drv || u.driver.o.visible; brake = Math.max(brake, u.mat.tail.emissiveIntensity); ind = Math.max(ind, u.mat.indL.emissiveIntensity, u.mat.indR.emissiveIntensity); } return { spun:Math.abs(v.CARFX.spin - spin0), maxSteer, drv, brake, ind, phase:v.trip && v.trip.phase }; });
check(d2.spun > 6, `the wheels roll as it drives out (${d2.spun.toFixed(1)} rad)`);
check(d2.maxSteer > .1, `the front wheels steer into the turn at the gate (${d2.maxSteer.toFixed(2)} rad)`);
check(d2.drv, 'the owner is seen at the wheel while it is out');
check(d2.ind > 1, 'the indicator blinks for the turn');
check(d2.brake > 1, 'the brake lamps light as it slows');
// back home: reversing lamps backing into the spot, the door again, the driver gone
await ev(() => { const v = window.__iv; v.trip.phase = 'home'; v.trip.t = 999; });
const d3 = await ev(() => { const v = window.__iv, u = v.M.car.userData; let rev = 0, open = 0; for (let i = 0; i < 1400 && v.trip; i++) { v.step(.05); if (v.trip && v.trip.phase === 'there') v.leaveScene(); if (v.cardOpen) v.nextCard(); rev = Math.max(rev, u.mat.rev.emissiveIntensity); }
  for (let i = 0; i < 40; i++) { v.step(.05); open = Math.min(open, u.door.rotation.y); } return { rev, open, trip:!!v.trip, drv:u.driver.o.visible, door:u.door.rotation.y }; });
check(d3.rev > 1, 'the reversing lamps light backing into the spot');
check(!d3.trip && d3.open < -.8 && d3.door === 0 && !d3.drv, `parked: the door opens for the owner to get out and shuts again (${d3.open.toFixed(2)})`);
// rain: the wipers sweep while it is driven
const w = await ev(() => { const v = window.__iv; v.owner.o.position.set(...v.P.carDoor); v.startTrip('visit', 'grocer'); v.setWx('shower'); let mn = 0; for (let i = 0; i < 120; i++) { v.step(.05); mn = Math.min(mn, v.M.car.userData.wipers[0].rotation.y); } return mn; });
check(w < -.8, `the wipers sweep the screen in the rain (${w.toFixed(2)})`);
check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS'); await b.close(); process.exit(fail.length ? 1 : 0);
