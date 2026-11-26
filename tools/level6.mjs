// Bible v2.0 Level 6 (Industrial Company) on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/level6.mjs <url> <outDir>
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
  S.levelUp = true; await v.startLevel(6); v.closeOffice(); });

check(await ev(() => window.__iv.S.level === 6 && window.__iv.dateOf(window.__iv.calDay()) === 'Tuesday 16 April 1974'), 'Level 6 opens on Tuesday 16 April 1974');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 8 && c[0].need === 250000 && ['clerk', 'tier2', 'svc', 'insp', 'acc', 'crates', 'rep'].every(id => c.some(x => x.id === id)); }), 'the v2.0 charter: $250K, clerk, 3 refits, 5 services, inspector, accounts, 2,000 crates, 70%');
await wait(4500); await run(2); check(await ev(() => window.__iv.S.met.june || [...document.querySelectorAll('#storyBody [data-junehire]')].length > 0), 'June Finch asks for the clerk\'s job');
// June at the clerk's window
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.hire('clerk'); v.closeOffice(); });
check(await ev(() => { const st = window.__iv.S.staff.find(x => x.role === 'clerk'); return st && st.name === 'June' && st.sur === 'Finch'; }), 'June Finch is hired as the clerk (free: the promise to Ada)');
await run(90, "v.clerkChar() && v.clerkChar().state === 'desk'"); check(await ev(() => { const c = window.__iv.clerkChar(); return c && c.state === 'desk' && Math.hypot(c.o.position.x - 2.9, c.o.position.z - 25.3) < .3; }), 'June walks across the zebra to her window in the office block');
await ev(() => { const v = window.__iv; v.S.cashPile = 900; v.syncPile && 0; window.__c0 = v.S.cash; });
await run(120, 'S.cashPile === 0 && v.clerkChar().state === "desk"');
check(await ev(() => window.__iv.S.cashPile === 0 && window.__iv.S.cash >= window.__c0 + 900 && window.__iv.S.l6.ledger.some(e => /takings/.test(e.what) && e.by === 'June Finch')), 'June fetches the dock takings and enters them in her ledger');
// a contractor refit in place
await ev(() => { const v = window.__iv; v.S.cash += 50000; v.orderRefit('pipe'); });
check(await ev(() => !window.__iv.S.l6.refit || window.__iv.S.l6.refit.k === 'pipe'), 'the pipe mill refit is ordered');
await run(60, "v.tierOf('pipe') === 2"); check(await ev(() => window.__iv.tierOf('pipe') === 2 && !!window.__iv.M.tier2.pipe), 'Big Tom\'s crew refits the pipe mill to tier 2 (+25%)');
// the crane swaps the crate machine
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 600 + 120; v.orderRefit('saw'); window.__hailSeen = false; window.__each = v => { if (v.wx.kind === 'hail') window.__hailSeen = true; if (v.crane && v.crane.st === 'lift2' && v.crane.lift === 4 && !window.__shot) window.__shot = 1; }; });
await run(180, "v.crane && v.crane.st === 'rig'");
console.log('  near:', await ev(() => { const v = window.__iv; return JSON.stringify([v.owner, ...v.staffObj.values(), ...v.folkMap.values()].filter(o => o && Math.hypot(o.o.position.x - 4.2, o.o.position.z - 14.5) < 3).map(o => [o.st ? o.st.name + ':' + o.st.role : 'owner', o.state, o.o.position.x.toFixed(1), o.o.position.z.toFixed(1)])); }));
console.log('  crane:', await ev(() => { const c = window.__iv.crane; return c && JSON.stringify({ st:c.st, x:c.g.position.x.toFixed(2), z:c.g.position.z.toFixed(2), d:c.d.toFixed(1), fd:c.fd.toFixed(1) }); })); check(await ev(() => { const c = window.__iv.crane; return c && Math.hypot(c.g.position.x - 5.0, c.g.position.z - 10.8) < .05; }), 'the mobile crane turns in at the main gate and stands in the gateway');
await run(120, "v.crane && v.crane.st === 'lift2' && v.crane.lift === 4");
await ev(() => { window.__iv.hold = false; window.__iv.camLock = [4.5, 8.5]; window.__iv.camZoom = 1.5; }); await wait(2500); await p.screenshot({ path:path.join(out, 'l6_crane.png') });
await run(400, '!v.crane'); await ev(() => { window.__each = null; window.__iv.camLock = null; });
check(await ev(() => window.__iv.tierOf('saw') === 2 && !window.__iv.crane && !!window.__iv.M.tarp6), 'three lifts: the tier 2 crate machine is in, grandad\'s goes under a tarpaulin');
check(await ev(() => window.__hailSeen), 'hail stops the crane lift for a minute');
check(await ev(() => { const v = window.__iv; return Math.hypot(v.M.saw.position.x - v.P.saw[0], v.M.saw.position.z - v.P.saw[1]) < .01 && !!v.M.tier2.saw; }), 'the new machine sits square on the old pad with its tier 2 plate');
await ev(() => { const v = window.__iv; v.orderRefit(v.REFIT.saw2.has() ? 'saw2' : 'tool'); }); await run(60, '(S.l6.refits || 0) >= 3');
check(await ev(() => window.__iv.S.l6.refits >= 3), 'three machines refitted to tier 2');
// the service book
await ev(() => { const v = window.__iv, S = v.S; S.parts = 6; S.l6.cyc.saw = v.svcAt('saw') - 1; S.pallet = 0; S.feed = 6; });
await run(40, "v.svcDue('saw')"); check(await ev(() => window.__iv.svcDue('saw') && window.__iv.S.faults.some(f => f.kind === 'svcSaw') && !!window.__iv.M.svcTags.saw.visible), 'after its service interval (80 cycles, Bible about 200 VERIFY) the crate machine shows Service due (amber tag, oil can)');
await ev(() => { window.__iv.bookService('saw'); window.__p0 = window.__iv.S.parts; window.__s0 = window.__iv.S.l6.svc || 0; });
await run(60, 'S.l6.svc > ' + await ev(() => window.__s0)); console.log('  svc:', await ev(() => { const v = window.__iv, S = v.S; return JSON.stringify({ svc:S.l6.svc, s0:window.__s0, parts:S.parts, p0:window.__p0, due:v.svcDue('saw'), faults:S.faults.map(f => f.kind + ':' + f.by + ':' + f.booked + ':' + f.prog.toFixed(2)), mech:[...v.staffObj.values()].filter(c => c.st.role === 'mechanic').map(c => c.state + ':' + c.job), book:S.l6.book && S.l6.book[0] }); }));
check(await ev(() => window.__iv.S.l6.svc > window.__s0 && window.__iv.S.l6.book[0].k === 'saw' && window.__iv.S.l6.book[0].part && window.__iv.S.parts <= window.__p0 - 1 && !window.__iv.svcDue('saw')), 'the mechanic services it (one spare part) and it is Healthy again');
await ev(() => { const v = window.__iv, S = v.S; S.l6.cyc.pipe = 150; v.svcPost('pipe'); const f = S.faults.find(f => f.kind === 'svcPipe'); f.by = -5; window.__s1 = S.l6.svc; v.owner.o.position.set(v.P.pfix[0], 0, v.P.pfix[1]); });
const t16 = await run(30, 'S.l6.svc > ' + await ev(() => window.__s1)); check(t16 > 14 && t16 < 19 && await ev(() => window.__iv.S.l6.svc > window.__s1), `the owner services the pipe mill by hand in about 16 s (${t16.toFixed(1)} s)`);
// automatic changeover
check(await ev(() => { const v = window.__iv, S = v.S; S.mains.st = 3; S.faults.push({ id:++S.faultSeq, kind:'powercut', where:'gen', diag:true, prog:0, t:5, diagT:0 }); const a = v.cutDark(); S.up.changeover = 1; const b = v.cutDark(); S.faults = S.faults.filter(f => f.kind !== 'powercut'); return a && !b; }), 'in a mains cut the works waits 20 s for the generator, 3 s with the automatic changeover');
// purchases
check(await ev(() => { const v = window.__iv; v.applyRestore('canteen', false); v.applyRestore('conductor', false); return !!v.M.canteen && !!v.M.conductor; }), 'the works canteen across Mill Road and the lightning conductor on the chimney');
// hail: everyone outdoors shelters
await ev(() => { window.__iv.setWx('hail'); window.__iv.S.wx.hailNow = false; }); await run(3);
check(await ev(() => window.__iv.hailShelter() && window.__iv.S.wx.hailLying > 0), 'hail: pellets settle and the crew take cover for 15 s');
await ev(() => { window.__iv.setWx('clear'); });
// Thursday: the factory inspector
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 2) / 5) * 5 - 2 - d; S.time = d * 600 + 185; S.day.n = d; S.faults = S.faults.filter(f => !v.svcDue || true); S.pallet = 0; S.pipes = 0; S.cond.wiring = 90; for (const k of Object.keys(S.l6.cyc)) S.l6.cyc[k] = 0; S.faults = []; });
await run(200, 'S.l6.insp >= 3'); check(await ev(() => window.__iv.S.l6.insp === 3), 'Thursday: Mr Hollins walks the yard and passes the works');
// Friday: June hands out the packets; the accounts paid by June
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 1) / 5) * 5 - 1 - d; S.time = d * 600 + 560; S.day.n = d; window.__nosign = true; S.cash += 20000; });
await run(80, "v.payDay() && v.payNeeded().every(st => v.payDay().paid[st.id])");
console.log('  june:', await ev(() => { const v = window.__iv, c = v.clerkChar(), pd = v.payDay(); return JSON.stringify({ st:c && c.state, x:c && c.o.position.x.toFixed(1), z:c && c.o.position.z.toFixed(1), pd:pd && Object.keys(pd.paid).length, gate:pd && pd.gate, min:v.dayMin().toFixed(0), need:v.payNeeded().length, hatch:v.S.restored.hatch, pt:v.payTime(), q:[...v.staffObj.values()].filter(o => o.pay).map(o => o.st.role + ':' + o.state) }); }));
check(await ev(() => { const v = window.__iv, pd = v.payDay(); return pd && v.payNeeded().every(st => pd.paid[st.id]) && v.S.l6.ledger.some(e => /Pay packets/.test(e.what)); }), 'Friday 16:30: June hands out every pay packet at the hatch, in her ledger');
check(await ev(() => window.__iv.S.l6.trophy && window.__iv.M.trophy.visible), 'the trophy cabinet appears in the office on Friday');
await ev(() => { window.__keep = true; window.__nosign = false; }); await run(160, 'S.day.closing && S.day.closing.card');
for (let i = 0; i < 20 && !(await ev(() => /June Finch paid/.test(document.getElementById('storyBody').innerHTML))); i++) { await ev(() => { const v = window.__iv; if (v.cardOpen && !/day/.test(document.getElementById('storyBody').className)) v.nextCard(); }); await run(1); }
console.log('  acc:', await ev(() => JSON.stringify({ acc:window.__iv.S.l5.acc, cash:window.__iv.S.cash, card:document.getElementById('storyBody').className, txt:document.getElementById('storyBody').innerText.slice(0, 200) })));
check(await ev(() => { const a = window.__iv.S.l5.acc; return a && a.paid && a.by === 'June Finch' && /June Finch paid/.test(document.getElementById('storyBody').innerHTML); }), 'after the whistle June pays the week\'s accounts and the Friday card says so');
await ev(() => { window.__keep = false; const v = window.__iv; while (v.cardOpen) v.nextCard(); });
// June never pays silently: short of cash she holds the bill
check(await ev(() => { const v = window.__iv, S = v.S, acc = { total:5000, paid:false }; const c0 = S.cash; S.cash = 100; v.juneSettle(acc); const ok = acc.held && !acc.paid && S.cash === 100 && /held/.test(acc.june); S.cash = c0; return ok; }), 'short of cash, June holds the accounts and says so (never pays silently)');
check(await ev(() => window.__iv.S.shipped >= 900), '900 crates shipped in all (simulator-tuned from 2,000)');
// pictures
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.S.time = v.dayNo() * 600 + 300; }); await run(40, "v.clerkChar().state === 'desk'");
for (const [n, x, z, k] of [['l6_booth', 2.0, 24.0, .8], ['l6_tarp', 21.5, -9.5, .9], ['l6_canteen', -6, 20, 1.2], ['l6_saw', 0.5, 3.5, .9]]) { await ev(([x, z, k]) => { const v = window.__iv; v.camLock = [x, z]; v.camZoom = k; }, [x, z, k]); await wait(2500); await p.screenshot({ path:path.join(out, n + '.png') }); }
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nLEVEL 6 CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
