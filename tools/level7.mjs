// Bible v2.0 Level 7 (Major Manufacturer) on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/level7.mjs <url> <outDir>
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
  S.levelUp = true; await v.startLevel(6); v.closeOffice(); while (v.cardOpen) v.nextCard(); v.hire('clerk'); v.hire('forklift'); v.closeOffice(); for (const k of ['saw', 'pipe', 'tool']) v.finishRefit(k, false); S.levelUp = true; await v.startLevel(7); while (v.cardOpen) v.nextCard(); v.closeOffice(); });


check(await ev(() => window.__iv.S.level === 7 && window.__iv.dateOf(window.__iv.calDay()) === 'Monday 7 October 1974'), 'Level 7 opens on Monday 7 October 1974');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 7 && c[0].need === 600000 && ['board', 'hollis', 'zones', 'ontime', 'siding', 'rep'].every(id => c.some(x => x.id === id)); }), 'the v2.0 charter: $600K, 12 off the board, Hollis regular, 2 zones, 15 on time, siding, 74%');
await ev(() => { window.__noauto = true; }); await run(12);
check(await ev(() => window.__iv.S.l7.board.length === 3 && window.__iv.S.l7.board.every(c => c.est !== undefined && c.hrs > 0 && c.pay > 0)), 'three cards pinned on the order board, each with pay, estimated profit and machine hours');
check(await ev(() => window.__iv.M.boardCards.filter(m => m.visible).length === 3), 'the cards are pinned on the office wall');
check(await ev(() => { const h = window.__iv.boardHtml(); return /estimate/.test(h) && /(Fits this week|Tight|Will not fit)/.test(h); }), 'each card says its profit is an estimate and whether it fits this week');
check(await ev(() => !window.__iv.S.call), 'no phone call: the board replaces it');
// take a dock 1 card
await ev(() => { const v = window.__iv, S = v.S; if (S.order) { S.order = null; } v.truck.state = 'away'; const c = S.l7.board.filter(c => c.dock === 1).sort((a, b) => a.hrs - b.hrs)[0]; window.__cid = c.cid; v.takeCard(c.cid); });
check(await ev(() => { const S = window.__iv.S; return S.order && S.order.board && !S.l7.board.some(c => c.cid === window.__cid); }), 'taking a card starts the order; the card comes off the board');
await run(10); check(await ev(() => window.__iv.S.l7.board.length === 3), 'a fresh card is pinned a few seconds later');
await run(120, "v.truck.state === 'docked'"); await ev(() => { const v = window.__iv, S = v.S, o = S.order; S.bed = Math.max(0, o.qty - 2); S.pbed = o.pq || 0; S.tbed = o.tq || 0; S.pallet = 10; v.syncPallet(); });
await run(300, 'S.l7.bDone >= 1'); console.log('  ord:', await ev(() => { const v = window.__iv, S = v.S, o = S.order; return JSON.stringify({ o:o && { q:o.qty, pq:o.pq, tq:o.tq, bed:S.bed, pbed:S.pbed, tbed:S.tbed, ready:o.ready, br:o.briefed, t:Math.round(o.time) }, truck:v.truck.state, done:S.l7.bDone, del:S.delivered, pipes:S.pipes, tools:S.tools, wh:S.wh, pmade:S.pmade, tmade:S.tmade, ld:[...v.staffObj.values()].filter(c => ['loader', 'forklift', 'operator'].includes(c.st.role)).map(c => c.st.role[0] + ':' + (c.task || '') + ':' + c.state + ':' + (c.st.mach || '')), pipeOn:v.pipeOn, toolOn:v.toolOn, faults:S.faults.map(f => f.kind) }); })); check(await ev(() => window.__iv.S.l7.bDone >= 1), 'an order off the board is delivered and counted');
// Tommy Pryce
check(await ev(() => window.__iv.S.l7.tommy), 'Tommy Pryce asks for a start on Monday');
await ev(() => { window.__iv.hireTommy(); window.__iv.closeOffice(); });
// Hollis Reed
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 4) / 5) * 5 - 4 - d; S.time = d * 600 + 100; S.day.n = d; });
await run(30, 'S.l7.hollis.met'); check(await ev(() => window.__iv.S.l7.hollis.met && window.__iv.S.met.hollis), 'Tuesday: Hollis Reed visits with bulk wholesale work');
await run(20, 'S.l7.board.some(c => c.hollis)'); check(await ev(() => window.__iv.S.l7.board.some(c => c.hollis)), 'his wholesale work goes up on the board');
check(await ev(() => { const v = window.__iv, L = v.S.l7; for (let i = 0; i < 3; i++) v.l7Delivered({ board:true, hollis:true }, false); return L.hollis.regular && L.hollis.streak >= 3; }), 'three Hollis orders on time in a row: a regular client (+20%)');
// two supervisor zones
await ev(() => { const v = window.__iv, S = v.S; S.cash += 10000; const cand = [S.staff.find(s => s.role === 'operator'), S.staff.find(s => s.role === 'loader')]; for (const st of cand) v.promote(st.id); const sp = [...v.staffObj.values()].filter(c => c.st.role === 'supervisor'); sp.forEach((c, i) => { c.st.post = i ? [10, 4] : [0, 5]; if (!i) S.lv4.post = [0, 5]; c.o.position.set(...(i ? [10, 0, 4] : [0, 0, 5])); c.state = 'idle'; }); v.closeOffice(); });
await run(6); check(await ev(() => window.__iv.S.staff.some(s => s.name === 'Tommy' && s.sur === 'Pryce' && s.role === 'operator')), 'Tommy Pryce starts as an operator when a post opens (an operator promoted to supervisor)');
check(await ev(() => window.__iv.zonesLive() === 2 && window.__iv.zoneCentres().length === 2), 'two supervisors, two zones on the floor');
// Thursday: the gale and the siding survey with Cyrus Bell
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 2) / 5) * 5 - 2 - d; S.time = d * 600 + 140; S.day.n = d; });
await run(30, 'v.cyrus'); check(await ev(() => !!window.__iv.cyrus && window.__iv.S.l7.siding === 1), 'Thursday: Cyrus Bell is at the back fence');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.SURVEY_RING[0], 0, v.SURVEY_RING[1]); });
await run(160, 'S.l7.siding >= 2'); check(await ev(() => window.__iv.S.l7.siding === 2 && window.__iv.M.pegs.length === 6), 'he pegs out the siding along the railway strip (six pegs) and the application goes in');
check(await ev(() => window.__iv.wx.kind === 'gale' || window.__iv.wxPlan().some(q => q[1] === 'gale')), 'a gale blows on Thursday');
await ev(() => { window.__keep = true; }); await p.screenshot({ path:path.join(out, 'l7_cyrus_card.png') }); await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); window.__keep = false; v.owner.o.position.set(-6, 0, -1); v.camLock = [-12, -21]; v.camZoom = 1.3; v.hold = false; }); await wait(2500); await p.screenshot({ path:path.join(out, 'l7_pegs.png') }); await ev(() => { window.__iv.camLock = null; });
await ev(() => { const v = window.__iv, S = v.S; S.time = S.l7.sidingAt + 1; S.day.n = v.dayNo(); }); await run(5, 'S.l7.siding === 3');
check(await ev(() => window.__iv.S.l7.siding === 3), 'the Railway Board approves the siding the next day');
// purchases and upgrades
check(await ev(() => { const v = window.__iv, i0 = v.interest(); v.applyRestore('clock', false); return !!v.M.clockTower && Math.abs(v.interest() - i0 - .1) < 1e-6; }), 'the works clock tower on the office block (+0.1 phone interest)');
await ev(() => { const v = window.__iv; v.S.cash += 50000; v.buyUpgrade('board4'); v.buyUpgrade('docklamps'); v.buyUpgrade('reach'); v.buyUpgrade('salesrep'); }); await run(10);
check(await ev(() => window.__iv.S.l7.board.length === 4 && window.__iv.M.dockLamps.length >= 1), 'the bigger order board holds four cards; loading lamps on the docks');
check(await ev(() => { const v = window.__iv; v.setWx('fog'); const r = v.wxLorryLate(); v.setWx('clear'); return r === 0; }), 'with the loading lamps the lorries back in on time through the fog');
check(await ev(() => !!window.__iv.M.leafPiles), 'autumn leaves gather in piles on the yard');
// pictures
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.S.time = v.dayNo() * 600 + 240; });
for (const [n, x, z, k] of [['l7_board', -1.2, 24.5, .75], ['l7_office', 0.5, 20.5, 1.3], ['l7_yard', 6, 4, 1.4]]) { await ev(([x, z, k]) => { const v = window.__iv; v.camLock = [x, z]; v.camZoom = k; }, [x, z, k]); await wait(2500); await p.screenshot({ path:path.join(out, n + '.png') }); }
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nLEVEL 7 CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
