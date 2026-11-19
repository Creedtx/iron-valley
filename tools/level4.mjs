// Build 0.21: level 4 (Growing Enterprise) on the wide yard, played in game time (the game's own step(), no rendering):
//  the wall between the yards comes down and the crate bin by the workshop goes; the forklift yard is clear, with Rusty's
//  stall and the forklift's park; the second crate machine is installed at its pad; the forklift takes timber from the
//  stock room to its in-feed, carries its crates along the marked lane, up the ramp onto the dock and into the lorry, and
//  backs down; a supervisor is promoted and posted, and operators in the ring work 15% faster; Rusty sells a spare part;
//  the council's road-frontage notice is inside the fence and opens the deal; a mixed order counts for the charter.
//   node tools/level4.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1800000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1000, height:900, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
// run game time; the yard is kept supplied like a player would; stop early when a condition holds
const run = (secs, cond) => ev(([secs, cond]) => { const v = window.__iv, S = v.S, f = cond ? new Function('v', 'S', 'return ' + cond) : null; v.hold = true; let t = 0;
  while (t < secs) { if (v.cardOpen) v.nextCard(); if (S.call) { v.acceptCall(); v.closeOffice(); } if (S.order && !S.order.briefed) v.briefOrder(null);
    if (S.order && S.order.ready && v.truck.state === 'docked' && !v.trip) v.signOrder(v.owner); if (S.store < 10 && !S.delivery) v.orderTimber(24); if (S.coils < 2 && !S.delivery) v.orderSteel(2);
    window.__each && window.__each(v); v.step(.05); t += .05; if (f && f(v, S)) break; }
  v.hold = false; return t; }, [secs, cond]);
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 40000; S.rep = 70; S.orderSeq = 8; S.delivered = 8; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.evNext = 1e9; v.applyRestore('yard', false); S.levelUp = true;
  await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice();
  S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); v.hire('operator'); v.hire('mechanic'); v.closeOffice();
  S.plots.scrap = { st:3 }; v.openScrapyard(false); for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(4); v.closeOffice(); while (v.cardOpen) v.nextCard();
  v.owner.o.position.set(v.P.deskRing[0], 0, v.P.deskRing[1]); S.time = v.dayNo() * 480 + 20; });
const P = await ev(() => window.__iv.P);
// 1. the yards join
check(await ev(() => window.__iv.S.level === 4), 'level 4 opens');
check(await ev(() => { const v = window.__iv; return !v.COL.has('westGap') && !v.COL.has('westFenceA') && !v.COL.has('scrapGate'); }), 'the fence between the yards is down');
check(await ev(() => !window.__iv.COL.has(window.__iv.M.northBin.k) && !window.__iv.M.northBin.m[0].visible), 'the crate bin by the workshop corner is moved out for the lane');
check(await ev(() => { const v = window.__iv; return !!v.M.stall && !!v.fork.o && v.COL.has('gasCage') && !v.COL.has('wreck') && !v.COL.has('junk2'); }), 'the forklift yard is cleared: Rusty\'s stall, the forklift and its gas cage');
check(await ev(() => { const v = window.__iv, f = v.LDOCK.fork; return !!f && v.groundY((f[0] + f[2]) / 2, f[3] - .05) > .9 && v.groundY((f[0] + f[2]) / 2, f[1] + .3) < .2; }), 'the forklift ramp rises from the yard to deck height');
// 2. the second crate machine: pay at its pad in the forklift yard
check(await ev(() => window.__iv.visiblePads().some(p => p.id === 'saw2')), 'the second crate machine\'s pad is offered');
await ev(() => { const v = window.__iv, pd = v.PADS.find(p => p.id === 'saw2'); v.closeOffice(); v.owner.o.position.set(pd.at[0], 0, pd.at[1]); });   // the level-up opens the office (charter): close it first, as a player does
check(await run(120, 'S.lv4.saw2 >= 1') < 120, 'standing on the pad pays for it; Big Tom\'s crew starts');
check(await run(200, 'S.lv4.saw2 >= 2') < 200, 'the second crate machine is built in the forklift yard');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.P.deskRing[0], 0, v.P.deskRing[1]); v.hire('operator'); v.hire('forklift'); v.hire('loader'); v.closeOffice(); for (const st of v.S.staff) st.posted = true; v.S.store = 30; v.syncStore && v.syncStore(); });
// 3. the forklift: timber to the second machine, crates along the lane and up onto the dock
check(await run(200, 'S.lv4.feed2 > 0') < 200, 'the forklift brings timber from the stock room to the second machine');
check(await run(200, 'v.saw2Reason().label[1] === "Cutting" || S.lv4.pallet2 > 0') < 200, 'the second machine cuts crates');
await ev(() => { window.__trace = []; window.__each = v => { const f = v.fork; if (f.o && f.state === 'toDrop' && window.__trace.length < 4000) window.__trace.push([+f.o.position.x.toFixed(2), +f.o.position.y.toFixed(2), +f.o.position.z.toFixed(2), +f.o.rotation.y.toFixed(2)]); }; });
check(await run(600, '(S.lv4.trips || 0) >= 1 && v.fork.dest === "truck" || S.bed > 0 && v.fork.carryType === null && (S.lv4.trips || 0) >= 1') < 600 || await ev(() => (window.__iv.S.lv4.trips || 0) >= 1), 'the forklift makes a delivery run');
await run(900, 'window.__trace.some(q => q[1] > .9)');
const trace = await ev(() => window.__trace); const lane = await ev(() => window.__iv.LANE4.pts);
const offLane = trace.filter(([x, , z]) => x > -14 && !lane.some((a, i) => lane.some((b2, j) => j > i && (Math.abs(a[0] - b2[0]) < .01 || Math.abs(a[1] - b2[1]) < .01) && Math.min(a[0], b2[0]) - .3 <= x && x <= Math.max(a[0], b2[0]) + .3 && Math.min(a[1], b2[1]) - .3 <= z && z <= Math.max(a[1], b2[1]) + .3)));
console.log('forklift samples', trace.length, 'off the lane in the main yard', offLane.length, offLane.slice(0, 3));
check(trace.some(q => q[1] > .9), 'the forklift drives up the ramp onto the dock');
check(trace.length > 20 && offLane.length < trace.length * .05, 'in the main yard it keeps to the marked lane');
await ev(() => { const v = window.__iv; v.camLock = [12, 1]; v.camZoom = 2.0; }); await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'l4_lane.png') });
await ev(() => { const v = window.__iv; v.camLock = [-18, 5]; v.camZoom = 1.6; }); await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'l4_forkyard.png') }); await ev(() => { window.__iv.camLock = null; window.__each = null; });
// 4. the supervisor: promoted from the crew, led to a post; operators inside the ring work 15% faster
const sp = await ev(() => { const v = window.__iv, S = v.S, l = S.staff.find(s => s.role === 'loader'); S.cash += 1000; v.promote(l.id); v.closeOffice(); while (v.cardOpen) v.nextCard(); const sup = v.supervisor();
  v.owner.o.position.set(...v.zoneHint().map((n, i) => n)); v.owner.o.position.y = 0; v.owner.o.position.z = v.zoneHint()[1]; v.owner.o.position.x = v.zoneHint()[0]; sup.o.position.set(v.zoneHint()[0] + .8, 0, v.zoneHint()[1] + .4); return !!sup; });
check(sp, 'a loader is promoted to supervisor');
check(await run(20, '!!S.lv4.post') < 20, 'standing still, the owner sets the supervisor\'s post');
check(await run(60, '[...v.staffObj.values()].some(c => c.zone)') < 60, 'an operator inside the ring works with the zone bonus');
// 5. Rusty's stall: a spare part for $30
const parts0 = await ev(() => { const v = window.__iv; v.S.parts = 0; v.syncParts && v.syncParts(); v.owner.o.position.set(v.P.stallRing[0], 0, v.P.stallRing[1]); return v.S.parts; });
check(await run(10, 'S.parts > 0') < 10, 'standing at Rusty\'s stall buys a spare part');
// 6. the road frontage: the council's notice is inside the fence; standing at it opens the deal
await ev(() => { const v = window.__iv; v.owner.o.position.set(...[v.PLOTS.road.ring[0], 0, v.PLOTS.road.ring[1]]); });
check(await ev(() => { const r = window.__iv.PLOTS.road.ring; return r[1] < 12.2 && r[0] < 23.7; }), 'the road-frontage notice is inside the fence (the owner can reach it)');
check(await run(8, 'v.cardOpen') < 8 || await ev(() => window.__iv.cardOpen), 'standing at it opens the council\'s deal');
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.owner.o.position.set(v.P.deskRing[0], 0, v.P.deskRing[1]); });
// 7. the mixed order counts for the charter
check(await run(2400, 'S.lv4.mixed3 >= 1') < 2400 || await ev(() => window.__iv.S.lv4.mixed3 >= 1), 'a mixed order of crates, pipes and tools is delivered (charter)');
console.log(errs.length ? 'page errors:\n' + [...new Set(errs)].slice(0, 10).join('\n') : 'no errors');
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS');
await b.close();
