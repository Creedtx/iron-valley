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
// build 0.33 (the user's phone play): the camera follows onto bought land, the bell pad clear of the trolley bay and empty
// trolley spaces walkable, roofs keep snow off the floors under them, the office cards in their slots, and Bolt never stuck
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1e6; v.evNext = 1e9; window.__noLL = true; });
await ev(async () => { const v = window.__iv, S = v.S; S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.closeOffice(); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); S.bolt = { joined:true }; S.met.vera = true; });
await run(2);
// the bell pad and the trolley bay
check(await ev(() => { const v = window.__iv, bell = v.PADS.find(p => p.id === 'bell').at; return !(bell[0] > -2.9 && bell[0] < .65 && bell[1] > 5.6 && bell[1] < 7.6); }), 'the counter-bell pad stands at the counter, not on the trolley bay');
check(await ev(() => { const v = window.__iv, o = v.owner, k = v.carts.find(k => k.slot === 1); v.takeCart(o, k); const open = !v.COLKEYS().includes('cartBay1') && v.COLKEYS().includes('cartBay0'); v.owner.cartArm = true; return open; }), 'a trolley taken out: its space is open ground; the others still block');
check(await ev(() => { const v = window.__iv, b = v.BAY[1]; return !v.segBlocked(b[0], 5.6, b[0], 7.8, .2); }), 'anyone can walk straight through the empty trolley space');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.cartSpot(1)[0], 0, v.cartSpot(1)[1]); }); await run(.5);
check(await ev(() => window.__iv.COLKEYS().includes('cartBay1') && !window.__iv.owner.cart), 'parked again, the space blocks again');
// snow stays off the warehouse floor
await ev(() => { const v = window.__iv, S = v.S; v.setWx('heavysnow'); (S.wx ||= {}).lying = .9; v.roofKey = ''; }); await run(4);
check(await ev(() => { const v = window.__iv, wh = v.P.wh; let ok = false; for (let i = 0; i < v.ROOF_N.value; i++) { const r = v.ROOF_R.value[i]; if (wh[0] > r.x && wh[0] < r.z && wh[1] > r.y && wh[1] < r.w) ok = true; } return ok && (v.M.roofList || []).every(r => !/static_batch/.test(r[5] || '')); }), 'snow: the warehouse roof (a cutaway model) keeps its floor clear; merged fittings and cables are not roofs');
await ev(() => { const v = window.__iv; v.setWx('clear'); v.S.wx.lying = 0; }); await run(.5);
// Bolt never stays stuck: in the pocket between the parked car and the fence, and by the lorry gate pillar
for (const [name, at] of [['the pocket between the parked car and the front fence', [11.0, 12.15]], ['the gap by the lorry gate pillar', [14.6, 11.95]], ['behind the trolley bay', [-1.1, 7.45]]]) {
  await ev(at => { const v = window.__iv; v.owner.o.position.set(4.0, 0, 4.0); v.bolt.o.position.set(at[0], 0, at[1]); v.bolt.mode = 'follow'; v.bolt.path = null; v.bolt.trail = []; v.bolt.lastMove = 1e9; }, at);
  const t = await run(14, 'Math.hypot(v.bolt.o.position.x - v.owner.o.position.x, v.bolt.o.position.z - v.owner.o.position.z) < 2.2');
  check(t < 14, `Bolt gets out of ${name} and back to the owner (${t.toFixed(1)} s)`);
}
// beside a still owner he sits, sniffs round close by and comes back, then lies down at the owner's feet
await ev(() => { const v = window.__iv; v.owner.o.position.set(0, 0, 3.0); v.bolt.o.position.set(1.2, 0, 3.2); v.bolt.mode = 'follow'; v.bolt.path = null; v.bolt.lastMove = undefined; });
const modes = new Set(); let maxD = 0;
for (let i = 0; i < 80; i++) { const r = await ev(() => { const v = window.__iv; v.bolt.lastMove = (v.bolt.lastMove ?? 0); return { m:v.bolt.mode, d:Math.hypot(v.bolt.o.position.x - v.owner.o.position.x, v.bolt.o.position.z - v.owner.o.position.z) }; }); modes.add(r.m); maxD = Math.max(maxD, r.d); await run(.5); }
console.log('  idle modes', [...modes].join(' '), 'furthest', maxD.toFixed(1), 'm');
check(modes.has('sit') && (modes.has('sniff') || modes.has('sniffing')) && modes.has('down') && maxD < 4.5, 'an idle owner: Bolt sits, sniffs round close by, then lies down at the owner\'s feet');
// the office: a staff card's Train button never covers the name, and nine tabs sit in two rows
await ev(() => { const v = window.__iv; v.setWx('clear'); for (const r of ['operator', 'operator', 'loader']) v.hire(r); v.closeOffice(); v.openOffice('staff'); }); await wait(400);
check(await p.evaluate(() => { const cards = [...document.querySelectorAll('#offBody .staff')]; if (!cards.length) return false; return cards.every(c => { const n = c.querySelector('.nm'), b = c.querySelector('[data-train]'); if (!n || !b) return true; const a = n.getBoundingClientRect(), q = b.getBoundingClientRect(); return a.right <= q.left + 1 || a.bottom <= q.top + 1 || q.bottom <= a.top + 1; }); }), 'office: on every staff card the Train button sits beside the name, never over it');
await ev(() => window.__iv.closeOffice());
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nFIXES 0.33 CLEAN'); await b.close(); process.exit(fail.length ? 1 : 0);
