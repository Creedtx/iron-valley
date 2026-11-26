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
// The end of the day (build 0.33, the user's design): at the whistle a docked lorry switches off and waits for the morning,
// nobody starts new work, the owner finishes what is in hand, parks the trolley, then drives home (or sleeps in the office
// on a bad night); the gates shut, Bolt keeps watch; at 07:00 the owner drives in (or comes out of the office) and the crew
// follows.   node tools/night.mjs <url> <outDir>
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1e5; v.evNext = 1e9; window.__noLL = true; });
await ev(async () => { const v = window.__iv, S = v.S; S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.closeOffice(); v.startMillBuild(false); v.finishMill(false); S.bolt = { joined:true }; S.met.vera = true; for (const r of ['operator', 'loader', 'helper']) v.hire(r); v.closeOffice(); });
const evening = async (tag, weather) => {
  await ev(w => { const v = window.__iv, S = v.S; v.setWx(w); if (w === 'heavysnow') (S.wx ||= {}).lying = .9; else if (S.wx) S.wx.lying = 0; S.time = v.dayNo() * v.DAY_S + 560; S.order = null; S.call = { qty:40, pq:0, tq:0, client:'Late Ltd', pay:500, deadline:900 }; v.acceptCall(); v.closeOffice(); while (v.cardOpen) v.nextCard(); }, weather);
  await run(90, "v.truck.state === 'docked'"); await ev(() => { const v = window.__iv; v.S.pallet = 6; v.syncPallet(); v.owner.o.position.set(v.P.pallet[0] + .3, 0, v.P.pallet[1] + .8); });
  await run(60, 'S.day && S.day.closing');
  check(await ev(() => { const v = window.__iv; return !!v.S.day.closing && v.truck.state === 'docked' && v.S.order && !v.S.order.ready; }), `${tag}: the whistle goes with the lorry still loading: it stays docked for the morning`);
  const st0 = await ev(() => window.__iv.owner.stack.length); await run(2);
  check(await ev(() => window.__iv.owner.stack.length) === st0, `${tag}: after the whistle the owner picks up nothing new at the pallet`);
  await run(100, "v.nightState && ['gone', 'asleep'].includes(v.nightState.st)");
  const ns = await ev(() => JSON.stringify(window.__iv.nightState)); console.log(`  ${tag} night`, ns);
  const kind = weather === 'heavysnow' ? 'office' : 'home';
  check(await ev(k => { const v = window.__iv, N = v.nightState; return N && N.kind === k && (k === 'home' ? N.st === 'gone' : N.st === 'asleep') && !v.owner.o.visible; }, kind), `${tag}: the owner ${kind === 'home' ? 'gets in the car and drives home' : 'beds down in the office (the roads are bad)'}`);
  await run(60, 'S.day.closing.shut');
  check(await ev(() => window.__iv.S.day.closing.shut), `${tag}: the gates shut once the yard is empty and the owner is off`);
  await run(1.5); check(await ev(() => ['patrol', 'patrolSniff'].includes(window.__iv.bolt.mode) && window.__iv.bolt.o.visible), `${tag}: Bolt keeps watch, on his round of the yard`);
  await run(8, '!S.day.closing'); await run(25, "!v.trip && v.owner.o.visible");
  check(await ev(k => { const v = window.__iv, o = v.owner.o.position; return !v.S.day.closing && v.owner.o.visible && !v.trip && (k === 'home' ? Math.hypot(o.x - v.P.carDoor[0], o.z - v.P.carDoor[1]) < 2 && Math.hypot(v.M.car.position.x - v.P.carSpot[0], v.M.car.position.z - v.P.carSpot[1]) < .3 : Math.hypot(o.x - v.P.deskRing[0], o.z - v.P.deskRing[1]) < 2); }, kind), `${tag}: 07:00, the owner ${kind === 'home' ? 'drives in through the gates and parks' : 'comes out of the office'}`);
  check(await ev(() => { const v = window.__iv; return v.truck.state === 'docked' && !!v.S.order; }), `${tag}: the lorry is still at the dock; loading carries on`);
  await ev(() => { const v = window.__iv; v.S.order = null; v.truck.state = 'away'; window.__iv.COLKEYS().includes('truck'); });
};
await evening('clear night', 'clear');
await evening('snowy night', 'heavysnow');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nNIGHT CLEAN'); await b.close(); process.exit(fail.length ? 1 : 0);
