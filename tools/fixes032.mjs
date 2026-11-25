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
// build 0.32 (the user's phone): the guide arrow and its pulsing ring hide while the owner stands on the spot doing the job,
// and come back when the owner steps off; in another app the phone copy pauses the game and every machine sound
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; v.evNext = 1e9; });
await run(25, 'S.call || S.order'); await ev(() => { const v = window.__iv; if (v.S.call) v.acceptCall(); v.closeOffice(); while (v.cardOpen) v.nextCard(); });
// the guide is driven here with a yard objective (the crate machine's in-feed ring), the frame loop held so it is the only caller
const G = o => ev(o => { const v = window.__iv; v.hold = true; v.updateGuide(o); return { here:v.guideHere, shown:v.guideShown, ring:v.guideRingShown }; }, o);
const OBJ = await ev(() => ({ t:'Making crates: 1 / 20. Stay at the machine', at:window.__iv.P.feedRing }));
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.P.feedRing[0] + 3, 0, v.P.feedRing[1] + 1.5); });
let g = await G(OBJ); check(g.shown && g.ring && !g.here, 'away from the spot: the arrow and the pulsing ring show the way');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.P.feedRing[0], 0, v.P.feedRing[1]); });
g = await G(OBJ); check(g.here && !g.shown && !g.ring, 'on the spot and working: no arrow, no flashing ring');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.P.feedRing[0] + .75, 0, v.P.feedRing[1]); });
g = await G(OBJ); check(g.here && !g.shown, 'a small shuffle on the ring\'s edge does not bring them back (no flicker)');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.P.feedRing[0] + 1.6, 0, v.P.feedRing[1] + .6); });
g = await G(OBJ); check(!g.here && g.shown && g.ring, 'stepped off the spot: the arrow and ring come back');
// another app in front (Page Visibility): the game stands still and the audio is silent; back again, it carries on
await ev(() => { const v = window.__iv; v.hold = false; });
const hid = await p.evaluate(async () => { const v = window.__iv; Object.defineProperty(document, 'hidden', { configurable:true, get:() => true }); document.dispatchEvent(new Event('visibilitychange'));
  const t0 = v.S.time; await new Promise(r => setTimeout(r, 1500)); return { hidden:v.pageHidden, allowed:v.audioAllowed(), still:Math.abs(v.S.time - t0) < .01 }; });
check(hid.hidden && !hid.allowed && hid.still, 'in another app: the game stands still and no sound can play');
const back = await p.evaluate(async () => { const v = window.__iv; Object.defineProperty(document, 'hidden', { configurable:true, get:() => false }); document.dispatchEvent(new Event('visibilitychange'));
  const t0 = v.S.time; await new Promise(r => setTimeout(r, 4000)); return { hidden:v.pageHidden, allowed:v.audioAllowed(), moved:v.S.time - t0 > .02 && v.S.time - t0 < 8 }; });
check(!back.hidden && back.allowed && back.moved, 'back in the game: it carries on from where it stood (no time counted while away)');
// the phone copy is built with the pause in it; the Playables bundle without the Page Visibility API
check(fs.readFileSync(path.join(import.meta.dirname, '../dist/phone/game.js'), 'utf8').includes('visibilitychange') && !fs.readFileSync(path.join(import.meta.dirname, '../dist/playables/game.js'), 'utf8').includes('visibilitychange'), 'the phone copy keeps the background pause; the Playables bundle has none');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nFIXES 0.32 CLEAN'); await b.close(); process.exit(fail.length ? 1 : 0);
