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
// build 0.36: Bolt follows in real time. The owner walks off and turns back: Bolt turns with him (he never walks on to
// where the owner turned); walking along, Bolt keeps at heel at the owner's pace, no stop-start
await ev(async () => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; v.evNext = 1e9;
  S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.closeOffice(); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); S.bolt = { joined:true }; S.met.vera = true; v.hold = true; for (let i = 0; i < 40; i++) { while (v.cardOpen) v.nextCard(); v.step(.05); } });
// an open run in the yard for the walk: find a start where 7 m to screen-right is clear
const walk = await ev(() => { const v = window.__iv, o = v.owner.o.position, b = v.bolt.o.position;
  const tryAt = (x, z) => { o.set(x, 0, z); v.keys.clear(); v.keys.add('d'); for (let i = 0; i < 3; i++) v.step(.05); const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz); v.keys.clear(); return d > .01 ? [dx / d, dz / d] : null; };
  const tried = []; for (const [x, z] of [[-6, 4], [-4, 5], [-8, 3], [-2, 6], [-10, 2], [0, 3], [2, 2], [-6, 0], [-12, 6]]) { const u = tryAt(x, z); tried.push([x, z, u]); if (u && !v.segBlocked(x - u[0] * 2, z - u[1] * 2, x + u[0] * 8, z + u[1] * 8, .3)) return { x, z, u }; } return { tried }; });
console.log(JSON.stringify(walk));
check(!!walk && walk.u, 'an open run in the yard for the walk ' + JSON.stringify(walk));
// out 7 m and straight back: how far past the dog's best does he go?
const r = await ev(w => { const v = window.__iv, o = v.owner.o.position, b = v.bolt.o.position, along = p => (p.x - w.x) * w.u[0] + (p.z - w.z) * w.u[1];
  o.set(w.x, 0, w.z); b.set(w.x - w.u[0] * 1.2, 0, w.z - w.u[1] * 1.2); Object.assign(v.bolt, { mode:'follow', path:null, trail:[], v:0, sp:0, lastMove:v.T }); v.step(.05);
  let turnAt = 0, dogMax = -9, t = 0, back = null, stops = 0, n = 0, gaps = [];
  v.keys.add('d'); while (along(o) < 7 && t < 10) { v.step(.05); t += .05; if (t > 1.2) { n++; if (v.bolt.sp < .3) stops++; gaps.push(Math.hypot(o.x - b.x, o.z - b.z)); } } turnAt = along(o); v.keys.clear();
  v.keys.add('a'); t = 0; while (along(o) > 0 && t < 10) { v.step(.05); t += .05; dogMax = Math.max(dogMax, along(b)); } v.keys.clear();
  for (let i = 0; i < 30; i++) v.step(.05); back = Math.hypot(o.x - b.x, o.z - b.z);
  return { turnAt, dogMax, back, stops, n, gMin:Math.min(...gaps), gMax:Math.max(...gaps) }; }, walk);
console.log(JSON.stringify(r));
check(r.dogMax < r.turnAt - .5, `the owner turns back at ${r.turnAt.toFixed(1)} m: Bolt turns with him (furthest ${r.dogMax.toFixed(1)} m), he does not walk on to the turning point`);
check(r.back < 2.2, `back at the start Bolt is at his side (${r.back.toFixed(2)} m)`);
check(r.stops <= 2 && r.gMin > .5 && r.gMax < 2.6, `walking along he keeps at heel at the owner's pace (${r.gMin.toFixed(2)}-${r.gMax.toFixed(2)} m behind, ${r.stops} stalls in ${r.n} steps)`);
// a longer walk, a pause at the end, then back: he must turn as soon as the owner does, wherever he is on the way
const r2 = await ev(w => { const v = window.__iv, o = v.owner.o.position, b = v.bolt.o.position, along = p => (p.x - w.x) * w.u[0] + (p.z - w.z) * w.u[1];
  o.set(w.x, 0, w.z); b.set(w.x - w.u[0] * 3.5, 0, w.z - w.u[1] * 3.5); Object.assign(v.bolt, { mode:'follow', path:null, trail:[], v:0, sp:0, lastMove:v.T });
  v.keys.add('d'); let t = 0; while (along(o) < 4 && t < 10) { v.step(.05); t += .05; } v.keys.clear(); const dogAtTurn = along(b), turnAt = along(o);
  v.keys.add('a'); let dogMax = -9; t = 0; while (along(o) > -1 && t < 10) { v.step(.05); t += .05; dogMax = Math.max(dogMax, along(b)); } v.keys.clear();
  return { dogAtTurn, turnAt, dogMax }; }, walk);
check(r2.dogMax < r2.turnAt - 1.5, `still catching up when the owner turns (Bolt at ${r2.dogAtTurn.toFixed(1)} m, owner at ${r2.turnAt.toFixed(1)} m): he meets him coming back and turns with him (furthest ${r2.dogMax.toFixed(1)} m), never on to the turning point`);
check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS'); await b.close(); process.exit(fail.length ? 1 : 0);
