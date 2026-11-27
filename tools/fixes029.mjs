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
// build 0.29 (the user's phone play at Level 2): office hours for the phone, Vera's walk-in visit, any empty trolley space,
// the stray at the gate and Bolt's kennel, Bolt on the owner's footsteps through the gate, Idle (not Broken) with no operator
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 5000; S.orderSeq = 4; S.delivered = 4; S.sales.told = true; v.evNext = 1e9;
  S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.closeOffice(); v.startMillBuild(false); v.finishMill(false); window.__noLL = true; });
check(await ev(() => window.__iv.stateWord('saw', ['warn', 'Stopped', 'No operator: run it yourself']) === 'Idle' && window.__iv.stateWord('saw', ['bad', 'Stopped', 'Blade jammed']) === 'Broken'), 'a machine with no operator says Idle; a jam says Broken');
// Vera walks in to the owner
await ev(() => { const v = window.__iv, S = v.S; S.met.vera = false; S.time = v.dayNo() * v.DAY_S + 100; v.owner.o.position.set(-1.5, 0, 3.5); });
await run(3, 'v.veraWalk'); check(await ev(() => { const v = window.__iv, c = v.folk.get('vera'); return !!v.veraWalk && !!c && c.o.position.x < -10; }), 'Level 2: Vera Lind walks up the verge (not standing at the roadside)');
await ev(() => { window.__each = v => { const c = v.folk.get('vera'); if (c && v.veraWalk && v.veraWalk.st === 'seek') window.__vmin = Math.min(window.__vmin ?? 99, c.o.position.z); }; });
await run(90, 'S.met.vera'); await ev(() => { window.__each = null; });
check(await ev(() => window.__iv.S.met.vera && (window.__vmin ?? 99) < window.__iv.SITE.z1 - .5), 'she pins her board, comes in through the gate and finds the owner in the yard');
await run(60, '!v.veraWalk'); check(await ev(() => !window.__iv.veraWalk && !window.__iv.folk.get('vera') && window.__iv.M.veraBoard.visible), 'introduced, she walks back out; her land board stays by the road');
// Abel Thorne, the farmer: met over the back fence (he used to stand where the owner could never reach him)
await ev(() => { const v = window.__iv; v.S.met.abel = false; v.owner.o.position.set(v.P.abelL2[0], 0, -11.0); window.__each = v => { v.owner.o.position.z -= .05 * 1.5; }; }); await run(2); await ev(() => { window.__each = null; });
await run(1, 'S.met.abel'); check(await ev(() => window.__iv.S.met.abel), 'the owner walks up to the back fence and meets Abel Thorne over it');
// any empty trolley space
check(await ev(() => { const v = window.__iv, o = v.owner, k3 = v.carts.find(k => k.slot === 3), k0 = v.carts.find(k => k.slot === 0); v.takeCart(o, k3); o.cartArm = true;
  const fake = { cart:k0.o }; k0.by = fake; k0.o.position.set(-40, 0, -40); return !o.stack.length && v.slotFree(0, k3); }), 'with trolley 3 in hand and space 1 empty');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.cartSpot(0)[0], 0, v.cartSpot(0)[1]); }); await run(.5);
check(await ev(() => { const v = window.__iv, k3 = v.carts.find(k => k.o.position.x > -3 && k.o.position.x < -2 && !k.by); return !v.owner.cart && !!k3 && k3.slot === 0; }), 'the owner parks it in space 1: any empty space in the bay, not only its own');
await ev(() => { const v = window.__iv, k0 = v.carts.find(k => k.by && !k.by.st); k0.by = null; k0.slot = 3; k0.o.position.set(v.BAY[3][0], 0, v.BAY[3][1] - .65); });
check(await ev(() => { const v = window.__iv; return new Set(v.carts.map(k => k.slot)).size === 4; }), 'the four trolleys stand in the four spaces');
// office hours
await ev(() => { const v = window.__iv, S = v.S; S.order = null; S.call = null; S.time = v.dayNo() * v.DAY_S + 585; });
await run(25); check(await ev(() => !window.__iv.S.call && !window.__iv.officeHours()), 'no call rings after 16:40 (no lorry could come today)');
await ev(() => { const v = window.__iv, S = v.S; S.time = v.dayNo() * v.DAY_S + 560; S.call = { qty:10, pq:0, tq:0, client:'Test Ltd', pay:100, deadline:300 }; });
await run(1); check(await ev(() => !!(window.__iv.S.call || window.__iv.S.order)), 'a call in office hours stays on the line (or is taken)');
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * v.DAY_S + 581; }); await run(.5);
check(await ev(() => !window.__iv.S.call), 'at 16:40 the caller hangs up and will ring back in the morning');
await ev(() => { const v = window.__iv, S = v.S; S.order = null; S.call = null; S.time = v.dayNo() * v.DAY_S + 200; }); await run(300, 'S.call || S.order');
check(await ev(() => { const v = window.__iv; return !!(v.S.call || v.S.order) && v.officeHours(); }), 'in the morning the phone rings again');
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); if (v.S.call) v.acceptCall(); v.closeOffice(); v.S.order = null; });
// the stray at the gate, and Bolt's place
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.bolt = { joined:false }; v.bolt.on = false; S.cal.off = v.LV_START[2] + 3 - d - v.calDay(d) + v.calDay(d); S.time = d * 600 + 302; S.day.lunch = d; v.owner.o.position.set(0, 0, 5); });
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); for (let i = 0; i < 7 && v.weekday() < 3; i++) S.cal.off++; });
await run(25, "v.bolt.mode === 'stray'"); check(await ev(() => window.__iv.bolt.mode === 'stray' && window.__iv.bolt.o.position.z > window.__iv.SITE.z1), 'Thursday lunch: the stray sits in the open gateway, outside the fence line');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.STRAY_RING[0], 0, v.STRAY_RING[1]); }); await run(10, 'S.bolt.joined');
check(await ev(() => window.__iv.S.bolt.joined && !!window.__iv.M.kennel), 'the owner shares a sandwich at the gate; Bolt joins and gets his kennel');
// on the owner's footsteps: round the crate machine and along the workshop front, a dog's length behind, on the same line
await ev(() => { const v = window.__iv; v.owner.o.position.set(5, 0, 8.5); v.bolt.o.position.set(5, 0, 9.4); v.bolt.mode = 'follow'; v.bolt.trail = []; window.__wk = 0; window.__off = 0;
  const fp = v.findPath(5, 8.5, -6.5, -.9), route = window.__route = [[5, 8.5], ...fp]; const seg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t); };
  window.__each = v => { window.__wk += .05 * 1.25; let d = window.__wk, p = route[route.length - 1]; for (let i = 1; i < route.length; i++) { const a = route[i - 1], b = route[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= L) { p = [a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L]; break; } d -= L; }
    v.owner.o.position.set(p[0], 0, p[1]); const b = v.bolt.o.position, q = [b.x, b.z]; if (window.__wk > 2.5 && window.__wk < window.__len) window.__off = Math.max(window.__off, Math.min(...route.slice(1).map((r, i) => seg(q, route[i], r)))); }; window.__len = route.slice(1).reduce((a, r, i) => a + Math.hypot(r[0] - route[i][0], r[1] - route[i][1]), 0); });   // measured while the owner walks (standing, Bolt may sniff about)
await run(24); await ev(() => { window.__each = null; });
console.log('  off the owner\'s line by at most', await ev(() => window.__off.toFixed(2)), 'm', await ev(() => JSON.stringify({ wk:window.__wk, b:window.__iv.bolt.o.position.toArray().map(n => +n.toFixed(2)), o:window.__iv.owner.o.position.toArray().map(n => +n.toFixed(2)), mode:window.__iv.bolt.mode, tr:(window.__iv.bolt.trail || []).length, path:window.__iv.bolt.path })));
check(await ev(() => { const v = window.__iv, b = v.bolt.o.position, o = v.owner.o.position; return window.__off < .8 && Math.hypot(b.x - o.x, b.z - o.z) < 2.6; }), 'Bolt follows on the owner\'s own footsteps round the corners, a dog\'s length behind');
await ev(() => { const v = window.__iv; v.owner.o.position.set(-10, 0, 6); }); await run(.3); await ev(() => { const v = window.__iv; v.bolt.o.position.set(0, 0, 5); v.bolt.lastMove = -1e9; }); await run(40);
check(await ev(() => { const v = window.__iv, b = v.bolt.o.position; return v.bolt.mode === 'nap' && Math.hypot(b.x - v.BOLT_NAP[0], b.z - v.BOLT_NAP[1]) < .4; }), 'left alone he goes home and naps on his blanket at the kennel door');
await ev(() => { const v = window.__iv; v.camLock = [v.KENNEL[0], v.KENNEL[1] + .4]; v.camZoom = .45; v.hold = false; }); await wait(2500); await p.screenshot({ path:path.join(out, 'kennel.png') });
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nFIXES 0.29 CLEAN'); await b.close(); process.exit(fail.length ? 1 : 0);
