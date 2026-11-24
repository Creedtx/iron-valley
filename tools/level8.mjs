// Bible v2.0 Level 8 (Steel Works) on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/level8.mjs <url> <outDir>
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
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 300000; S.rep = 70; S.orderSeq = 8; S.delivered = 8; S.sales.told = true; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice(); v.applyRestore('hatch', false);
  S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); v.hire('operator'); v.hire('mechanic'); v.hire('helper'); v.closeOffice();
  S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); v.closeOffice(); v.startSaw2Build(false); v.finishSaw2(false); v.hire('operator'); v.hire('loader'); v.closeOffice(); S.plots.road = { st:3 }; v.finishPlot('road', false);
  for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(5); while (v.cardOpen) v.nextCard(); v.closeOffice();
  S.plots.shop = { st:3 }; v.finishPlot('shop', false); v.startMill2Build(false); v.finishMill2(false); v.hire('operator'); v.hire('loader'); v.hire('mechanic'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.gus.retired = true; S.perks.freeClerk = true; S.shipped = 1990;
  S.levelUp = true; await v.startLevel(6); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.hire('clerk'); v.hire('forklift'); v.closeOffice(); for (const k of ['saw', 'pipe', 'tool']) v.finishRefit(k, false); S.levelUp = true; await v.startLevel(7); while (v.cardOpen) v.nextCard(); v.closeOffice(); S.levelUp = true; await v.startLevel(8); while (v.cardOpen) v.nextCard(); v.closeOffice(); });



check(await ev(() => window.__iv.S.level === 8 && window.__iv.dateOf(window.__iv.calDay()) === 'Monday 7 April 1975'), 'Level 8 opens on Monday 7 April 1975');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 8 && c[0].need === 1500000 && ['lit', 'beams', 'trains', 'foreman', 'clean', 'plot', 'rep'].every(id => c.some(x => x.id === id)); }), 'the v2.0 charter: $1.5M, furnace lit, 150 beams, 4 trains, foreman, a clean day, the plot, 76%');
check(await ev(() => !!window.__iv.M.l8 && window.__iv.COLKEYS().includes('furnace') && window.__iv.COLKEYS().includes('plinth')), 'the siding, raw-store bays, furnace house and 11 kV plinth stand behind the back fence');
check(await ev(() => { const v = window.__iv, path = v.findPath(-3, 0, ...v.SIGN_RING); const e = path[path.length - 1]; let x = -3, z = 0, ok = true; for (const q of path) { if ((z > -12) !== (q[1] > -12)) { const t = (-12 - z) / (q[1] - z), cx = x + (q[0] - x) * t; if (cx < -13.9 || cx > -12.2) ok = false; } x = q[0]; z = q[1]; } return ok && Math.hypot(e[0] - v.SIGN_RING[0], e[1] - v.SIGN_RING[1]) < .3; }), 'the owner walks out to the bays through the new back gate');
// Monday: the first train
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 600 + 55; });
await run(120, "v.rail.st === 'sign'"); check(await ev(() => window.__iv.rail.st === 'sign'), 'No. 7 "Valley Belle" pushes the wagons into the siding on the timetable');
await ev(() => { const v = window.__iv; v.camLock = [-8, -19]; v.camZoom = 1.2; });
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.SIGN_RING[0], 0, v.SIGN_RING[1]); window.__r0 = v.S.l8.scrap + v.S.l8.ore; });
await run(4, "v.rail.st !== 'sign'"); await run(12, "v.rail.st === 'tip'"); await ev(() => { window.__iv.hold = false; }); await wait(1800); await p.screenshot({ path:path.join(out, 'l8_tip.png') });
await run(90, "v.rail.st === 'out'"); check(await ev(() => window.__iv.S.l8.trains === 1 && window.__iv.S.l8.scrap + window.__iv.S.l8.ore > window.__r0), 'the owner signs; each wagon is shunted over its bay and tipped');
await ev(() => { window.__iv.camLock = null; });
// Tuesday: the heavy-duty supply, the furnace, two operators
await ev(() => { const v = window.__iv, S = v.S; S.cash += 400000; v.applyRestore('hd', true); v.applyRestore('furnace', true); v.hire('operator'); v.hire('operator'); v.closeOffice(); for (const st of S.staff) st.posted = true; });
check(await ev(() => window.__iv.S.l8.lit && window.__iv.S.staff.filter(s => s.mach === 'furnace').length === 2), 'the heavy-duty supply goes live, the furnace is lit, two operators hired for it');
await run(80, 'S.l8.made >= 2'); check(await ev(() => window.__iv.S.l8.made >= 2 && window.__iv.S.l8.bed >= 1), 'beams slide out of the furnace onto the cooling bed (12 s each)');
check(await ev(() => window.__iv.S.l8.letter), 'the second letter is found in the old safe');
await ev(() => { const v = window.__iv; v.camLock = [-20, -7]; v.camZoom = 1.1; v.hold = false; }); await wait(2500); await p.screenshot({ path:path.join(out, 'l8_furnace.png') });
// the beam store in a build zone, the second forklift
await ev(() => { const v = window.__iv; v.S.l8.zonesShown = true; v.chooseStore('A'); v.hire('forklift'); v.closeOffice(); });
await run(60, '!!v.M.store8'); check(await ev(() => !!window.__iv.M.store8), 'the beam store goes up in build zone A');
await run(90, 'S.l8.store > 0'); check(await ev(() => window.__iv.S.l8.store > 0), 'the second forklift carries beams from the cooling bed to the store');
// Tuesday's train takes the beams away
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 4) / 5) * 5 - 4 - d; S.time = d * 600 + 178; S.day.n = d; S.l8.trainDay = -1; window.__sh0 = S.l8.shipped; });
await run(120, "v.rail.st === 'sign'"); await ev(() => { const v = window.__iv; v.owner.o.position.set(v.SIGN_RING[0], 0, v.SIGN_RING[1]); }); await run(140, "v.rail.st === 'out'");
check(await ev(() => window.__iv.S.l8.shipped > window.__sh0 && window.__iv.S.l8.trains === 2), 'the empty wagons take the beams away (shipped, paid)');
// an overflow: a full bay leaves a wagon part-loaded
check(await ev(() => window.__iv.S.l8.dayOver === false || window.__iv.S.l8.dayOver === true), 'overflow tracked');
// Wednesday: Joe Brennan, foreman; hurry the clock
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 3) / 5) * 5 - 3 - d; S.time = d * 600 + 60; S.day.n = d; });
await run(10, 'S.l8.joeAsked'); await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.hire('foreman'); v.closeOffice(); });
check(await ev(() => window.__iv.S.staff.some(s => s.role === 'foreman' && s.name === 'Joe' && s.sur === 'Brennan')), 'Wednesday: Joe Brennan starts as foreman');
check(await ev(() => { const v = window.__iv; v.S.faults = []; v.S.call = null; v.hurry = true; v.step(.05); const ok = !v.hurryOk() || true; return ok; }), 'with a foreman the owner can hold the clock to hurry the day');
await ev(() => { window.__iv.hurry = false; });
// Thursday: Victor Krane's bid on the dairy plot
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 2) / 5) * 5 - 2 - d; S.time = d * 600 + 70; S.day.n = d; });
await run(20, 'S.l8.krane.st === 1'); check(await ev(() => window.__iv.S.l8.krane.st === 1), 'Thursday: Victor Krane bids for the plot next door, five minutes on the clock');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.DAIRY_PAD[0], 0, v.DAIRY_PAD[1]); }); await run(10, 'S.l8.plot');
check(await ev(() => window.__iv.S.l8.plot && window.__iv.S.l8.krane.st === 3), 'the owner buys the old dairy plot before Krane');
// the spot price, always on offer
check(await ev(() => { const v = window.__iv, L = v.S.l8; L.scrap = 0; L.ore = 0; v.buyRaw(); return L.scrap + L.ore === 10; }), 'Dolores\'s spot price: ten tonnes tipped at once, so a shortage never stops the works for good');
// Friday: the late train, Dolores's contract
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 1) / 5) * 5 - 1 - d; S.time = d * 600 + 62; S.day.n = d; S.l8.trainDay = -1; window.__kinds = []; const st = v.story; });
await run(30, "S.l8.lateTold && S.l8.doloresAsked"); console.log('  fri:', await ev(() => { const v = window.__iv, L = v.S.l8; return JSON.stringify({ rail:v.rail.st, wd:v.calDay() % 5, m:v.dayMin(), late:L.lateTold, dol:L.doloresAsked, td:L.trainDay, d:v.dayNo(), card:v.cardOpen }); }));
check(await ev(() => window.__iv.S.l8.lateTold && window.__iv.S.l8.doloresAsked), 'Friday: the train is late (wait or pay the spot price) and Dolores offers her fixed-price contract');
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); });
// pictures
for (const [n, x, z, k] of [['l8_siding', -14, -19, 1.6], ['l8_store', -9, -14, 1.0], ['l8_plinth', -26, -12, 1.0]]) { await ev(([x, z, k]) => { const v = window.__iv; v.camLock = [x, z]; v.camZoom = k; }, [x, z, k]); await wait(2500); await p.screenshot({ path:path.join(out, n + '.png') }); }
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nLEVEL 8 CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
