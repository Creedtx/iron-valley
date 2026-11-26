// Bible v2.0 Level 5 (Regional Manufacturer) on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/level5.mjs <url> <outDir>
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
  for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(5); while (v.cardOpen) v.nextCard(); v.closeOffice(); });
check(await ev(() => window.__iv.S.level === 5 && window.__iv.dateOf(window.__iv.calDay()) === 'Monday 14 January 1974'), 'Level 5 opens on Monday 14 January 1974');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 7 && c[0].need === 120000 && ['mill2', 'dock2', 'pairs', 'accounts', 'farewell', 'rep'].every(id => c.some(x => x.id === id)); }), 'the v2.0 charter: $120K, mill 2, dock 2, two the same day x5, accounts, farewell, 68%');
check(await ev(() => !!window.__iv.M.officeBlock && !!window.__iv.M.zebra && !!window.__iv.M.dock2), 'the office block, the zebra crossing and dock 2 stand on the approved spots');
// walkers keep to the zebra
check(await ev(() => { const v = window.__iv, path = v.findPath(2, 10, ...v.P.officeDoor); let x = 2, z = 10, ok = true; for (const q of path) { const n = Math.ceil(Math.hypot(q[0] - x, q[1] - z) / .2); for (let i = 1; i <= n; i++) { const px = x + (q[0] - x) * i / n, pz = z + (q[1] - z) * i / n; if (pz > 14.3 && pz < 18.1 && (px < 4.1 || px > 5.9)) ok = false; } x = q[0]; z = q[1]; } return ok && path.length > 1; }), 'the way to the office block crosses Mill Road on the zebra');
await run(150); check(await ev(() => window.__iv.S.wx.lying > .3), 'heavy snow on Monday lies on the ground');
// Tuesday: Ada's plot, the second pipe mill
await ev(() => { const v = window.__iv, S = v.S; S.plots.shop = { st:3 }; v.finishPlot('shop', false); v.startMill2Build(false); v.finishMill2(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.coils = 8; v.syncCoilBay(); S.l5.coil2 = 2; S.l5.rack2 = 10; });
check(await ev(() => window.__iv.mill2Ready()), 'the second pipe mill is installed on Ada\'s corner plot');
await run(80, '(S.l5.made2 || 0) > 0'); check(await ev(() => (window.__iv.S.l5.made2 || 0) > 0), 'the second mill makes pipes');
// dock 2: a pipe order, the white lorry, loaders up the ramp, signed
await ev(() => { const v = window.__iv; v.S.call = v.dock2Spec(); v.acceptCall2(v.S.call); v.S.call = null; });
await run(90, "v.truckB.state === 'docked'"); check(await ev(() => window.__iv.truckB.state === 'docked'), 'the white lorry backs into dock 2\'s bay');
let worstY = 0; await ev(() => { window.__wy = 0; window.__each = v => { for (const c of v.staffObj.values()) { const q = c.o.position, g = v.groundY(q.x, q.z); if (g > .05 && q.x > 18) window.__wy = Math.max(window.__wy, Math.abs(q.y - g) + (g > .05 ? 1e-9 : 0)); } }; });
await run(260, 'S.order2 && S.order2.ready'); worstY = await ev(() => window.__wy); await ev(() => { window.__each = null; });
check(await ev(() => window.__iv.S.order2 && window.__iv.S.order2.ready), 'loaders carry the pipes up dock 2\'s ramp onto the white lorry');
check(worstY < .01, `feet stay on dock 2's ramp and deck (worst ${worstY.toFixed(3)} m)`);
await ev(() => window.__iv.signOrder2(window.__iv.owner)); check(await ev(() => (window.__iv.S.l5.d2done || 0) >= 1), 'dock 2\'s first lorry is signed off');
// two orders the same day
const pairs0 = await ev(() => window.__iv.S.l5.pairs || 0);
await ev(() => { const v = window.__iv, S = v.S; if (v.dayMin() > 380) S.time = v.dayNo() * v.DAY_S + 380; if (!S.order) { S.call = { client:'Valley Grocers', qty:6, pq:0, tq:0, pay:300, deadline:400 }; v.acceptCall(); v.closeOffice(); } S.pallet = 20; v.syncPallet(); });   // early enough that both lorries leave before the whistle (after it they wait at the dock overnight)
await run(200, '(S.l5.pairs || 0) > ' + pairs0);
check(await ev(p0 => (window.__iv.S.l5.pairs || 0) > p0, pairs0), 'a lorry from each dock on the same day counts as two orders out together');
// Friday: pay packets from cash, the accounts, Gus's farewell
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 1) / 5) * 5 - 1 - d; S.gus.told = true; S.gus.partyDue = true; S.time = d * 600 + 565; S.day.n = d; v.owner.o.position.set(v.PAY_AT[0], 0, v.PAY_AT[1]); window.__c0 = S.cash; window.__nosign = true; });
await run(30, 'v.payDay() && v.payNeeded().every(st => v.payDay().paid[st.id])');
console.log('  pay:', await ev(() => JSON.stringify({ c0:window.__c0, c:window.__iv.S.cash, pd:window.__iv.payDay() && Object.keys(window.__iv.payDay().paid).length, need:window.__iv.payNeeded().length }))); await ev(() => { window.__nosign = false; });
check(await ev(() => window.__iv.S.cash < window.__c0), 'Friday\'s pay packets come out of the owner\'s cash at Level 5');
await run(80, 'S.gus.retired'); check(await ev(() => window.__iv.S.gus.retired), 'Gus\'s farewell party is held on Friday afternoon and he retires');
await ev(() => { window.__keep = true; }); await run(80, 'S.day.closing && S.day.closing.card');
check(await ev(() => /The week's accounts/.test(document.getElementById('storyBody').innerHTML) && !!window.__iv.S.l5.acc), 'Friday\'s day book makes up the week\'s accounts');
check(await ev(() => { const a = window.__iv.S.l5.acc; return a.pension === 35 && a.power > 0; }), 'the accounts carry power and Gus\'s $35 pension');
await ev(() => { const v = window.__iv; v.S.cash += 50000; document.querySelector('[data-payacc]').click(); window.__keep = false; });
check(await ev(() => window.__iv.S.l5.acc.paid && window.__iv.S.l5.paid >= 1), 'the owner pays the accounts from the Friday card');
// a loan: 30% of the goal at most, 110% over five Fridays
check(await ev(() => { const v = window.__iv, S = v.S; S.l5.loan = null; const c0 = S.cash; v.takeLoan(36000); const L = S.l5.loan; return S.cash === c0 + 36000 && L.left === 39600 && L.n === 5; }), 'Eldon lends up to 30% of the goal, repaid at 110% over five Fridays');
// pictures
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.S.time = v.dayNo() * 600 + 300; v.owner.o.position.set(5, 0, 19.5); });
for (const [n, x, z, k] of [['l5_office', 2, 21, .9], ['l5_corner', 20, 22, 1.1], ['l5_wide', 10, 14, 1.8]]) { await ev(([x, z, k]) => { const v = window.__iv; v.camLock = [x, z]; v.camZoom = k; }, [x, z, k]); await wait(2500); await p.screenshot({ path:path.join(out, n + '.png') }); }
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nLEVEL 5 CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
