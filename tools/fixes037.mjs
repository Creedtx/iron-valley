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
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 40000; S.rep = 70; S.orderSeq = 8; S.delivered = 8; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.evNext = 1e9; v.applyRestore('yard', false); S.levelUp = true;
  await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice();
  S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); v.hire('operator'); v.hire('mechanic'); v.closeOffice();
  S.plots.scrap = { st:3 }; v.openScrapyard(false); for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(4); v.closeOffice(); while (v.cardOpen) v.nextCard();
  v.owner.o.position.set(v.P.deskRing[0], 0, v.P.deskRing[1]); S.time = v.dayNo() * v.DAY_S + 20; });
// build 0.37: the crew never leave the yard to find the owner. Ivan the supervisor used to walk out to the road to take a
// new order from the owner while he was away in the car; the owner away, the order comes from Gus, who took the call
await ev(() => { const v = window.__iv, S = v.S, l = S.staff.find(s => s.role === 'operator' && (s.mach || 'saw') === 'saw'); l.lv = 5; S.cash += 1000; v.promote(l.id); v.hire('operator'); v.closeOffice(); while (v.cardOpen) v.nextCard();
  v.hold = true; const sv = v.supervisor(); v.owner.o.position.set(2, 0, 2); for (let i = 0; i < 400 && !S.lv4.post; i++) { v.step(.05); if (v.cardOpen) v.nextCard(); } window.__sv = sv && sv.st.name; });
console.log('supervisor', await ev(() => window.__sv + ' post ' + JSON.stringify(window.__iv.S.lv4.post)));
// a trip; an order is taken by Gus while the owner is on the road; watch the supervisor's every step
const r = await ev(() => { const v = window.__iv, S = v.S, sv = v.supervisor(), [bx0, bx1, bz0, bz1] = v.siteBounds();
  if (S.order) { S.order = null; } v.owner.o.position.set(...v.P.carDoor); v.startTrip('visit', 'grocer');
  let out = 0, through = 0, last = [sv.o.position.x, sv.o.position.z], met = null, t = 0, gotOrder = false, states = new Set(), maxZ = -99;
  const crosses = (a, b) => { for (const [k, [x0, z0, x1, z1]] of v.COL) { if (k === 'truck' || k === 'supply' || k === 'car') continue; const n = 12; for (let i = 1; i < n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; if (x > x0 + .02 && x < x1 - .02 && z > z0 + .02 && z < z1 - .02) return k; } } return null; };
  while (t < 160) { if (v.cardOpen) { if (v.trip && v.trip.phase === 'there') v.leaveScene(); v.nextCard(); }
    if (!gotOrder && v.trip && v.trip.phase !== 'wait' && !S.order) { if (!S.call) v.newCall(); if (S.call) { v.acceptCall(); v.closeOffice(); } }
    if (S.order && !gotOrder) gotOrder = true;
    v.step(.05); t += .05; const p = [sv.o.position.x, sv.o.position.z]; states.add(sv.state); maxZ = Math.max(maxZ, p[1]);
    if (p[0] < bx0 - .3 || p[0] > bx1 + .3 || p[1] < bz0 - .3 || p[1] > bz1 + .3) out++; const k = crosses(last, p); if (k) { through++; (window.__thr ||= []).push(k + '@' + p.map(n => n.toFixed(1)).join(',') + ':' + sv.state); } last = p;
    if (S.order && S.order.met && met === null) met = { trip:!!v.trip, phase:v.trip && v.trip.phase, at:p.map(n => +n.toFixed(1)), with:sv.meetWith };
    if (!v.trip && S.order && S.order.met) break; }
  return { thr:window.__thr, out, through, met, gotOrder, states:[...states], maxZ, trip:!!v.trip }; });
console.log(JSON.stringify(r));
check(r.gotOrder, 'an order is taken while the owner is out on the road');
check(r.met && (!r.met.trip || r.met.with === 'gus'), `the order is passed on in the yard: from Gus at the phone while the owner is away (${JSON.stringify(r.met)})`);
check(r.out === 0, `the supervisor never leaves the yard (${r.out} steps outside, furthest z ${r.maxZ.toFixed(1)})`);
check(r.through === 0, `he never walks through a fence or wall (${r.through} steps through a collider)`);
// Bolt (build 0.37): gaits by speed, planted paws, a welcome home, room for the crew, tracks in the snow
await ev(() => { const v = window.__iv, S = v.S; S.bolt = { joined:true }; for (let i = 0; i < 20; i++) { while (v.cardOpen) v.nextCard(); v.step(.05); } });
const gaits = await ev(() => { const v = window.__iv, b = v.bolt, out = {}; b.mode = 'follow'; for (const sp of [.7, 2.2, 4.2]) { b.sp = sp; for (let i = 0; i < 30; i++) v.boltAnim(.016); out[sp] = b.gait; } return out; });
check(gaits['0.7'] === 'walk' && gaits['2.2'] === 'trot' && gaits['4.2'] === 'gallop', `his gait follows his speed: ${JSON.stringify(gaits)}`);
const slide = await ev(() => { const v = window.__iv, b = v.bolt, d = b.o, T3 = v.THREE, f = new T3.Vector3(); d.position.set(0, 0, 4); d.rotation.y = 0; b.mode = 'follow'; const sp = 2.2, dt = .008; let best = 1;
  b.sp = sp; for (let i = 0; i < 60; i++) { d.position.x += sp * dt; v.boltAnim(dt); }
  let xs = [], travel = 0; for (let i = 0; i < 400; i++) { d.position.x += sp * dt; v.boltAnim(dt); const q = (b.ph + b.gb.off[1]) % 1; if (q > .08 && q < b.gb.duty - .08) { d.updateMatrixWorld(true); xs.push(b.legs[1].localToWorld(f.set(0, -.284, 0)).x); travel += sp * dt; } else if (xs.length > 5) { best = Math.min(best, (Math.max(...xs) - Math.min(...xs)) / travel); xs = []; travel = 0; } }
  return best; });
check(slide < .45, `at the trot a planted paw stays put while the body goes over it (it slides ${(slide * 100).toFixed(0)}% of the way)`);
const greet = await ev(() => { const v = window.__iv, S = v.S, b = v.bolt; if (S.order) S.order.briefed = true; v.owner.o.position.set(...v.P.carDoor); b.o.position.set(-4, 0, 2); b.mode = 'follow'; v.startTrip('visit', 'grocer');
  for (let i = 0; i < 2000 && v.trip; i++) { if (v.cardOpen) { if (v.trip && v.trip.phase === 'there') v.leaveScene(); v.nextCard(); } if (v.trip && v.trip.phase === 'away') { v.trip.phase = 'home'; v.trip.t = 999; } v.step(.05); }
  let modes = new Set(), close = 9, up = false; for (let i = 0; i < 200; i++) { v.step(.05); modes.add(b.mode); const o = v.owner.o.position; close = Math.min(close, Math.hypot(o.x - b.o.position.x, o.z - b.o.position.z)); if (b.hop > 0) up = true; }
  return { trip:!!v.trip, modes:[...modes], close, up }; });
check(!greet.trip && greet.modes.includes('greet') && greet.close < 1.3 && greet.up, `the owner home from his drive: Bolt runs to him and jumps up to say hello (${JSON.stringify(greet)})`);
const space = await ev(() => { const v = window.__iv, b = v.bolt, c = [...v.staffObj.values()].find(c => c.o.visible); if (!c) return null; b.o.position.set(c.o.position.x + .1, 0, c.o.position.z); b.mode = 'sit'; v.boltAnim(.016); return Math.hypot(b.o.position.x - c.o.position.x, b.o.position.z - c.o.position.z); });
check(space === null || space > .45, `he keeps out from under the crew's feet (${space && space.toFixed(2)} m)`);
const tracks = await ev(() => { const v = window.__iv, S = v.S, o = v.owner.o.position; (S.wx ||= {}).lying = .8; S.wx.cleared = 0; o.set(-6, 0, 4); v.keys.clear(); v.keys.add('d'); for (let i = 0; i < 60; i++) v.step(.05); v.keys.clear(); const u = v.TRACKS.userData; let n = 0; for (let i = 0; i < u.t.length; i++) if (v.T - u.t[i] < 10) n++; S.wx.lying = 0; return n; });
check(tracks >= 4, `boots (and paws) print in the lying snow (${tracks} prints)`);
check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS'); await b.close(); process.exit(fail.length ? 1 : 0);
