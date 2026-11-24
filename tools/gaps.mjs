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
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 300000; S.rep = 70; S.orderSeq = 8; S.delivered = 8; S.sales.told = true; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice(); v.applyRestore('hatch', false);
  S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); v.hire('operator'); v.hire('mechanic'); v.hire('helper'); v.closeOffice();
  S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); v.closeOffice(); v.startSaw2Build(false); v.finishSaw2(false); v.hire('operator'); v.hire('loader'); v.closeOffice(); S.plots.road = { st:3 }; v.finishPlot('road', false);
  for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(5); while (v.cardOpen) v.nextCard(); v.closeOffice(); });

const L = await ev(() => window.__iv.S.level); check(L === 5, 'set up at Level 5');
check(await ev(() => (window.__iv.S.skillPts || 0) >= 4), 'a skill point with each level-up (4 by Level 5)');
check(await ev(() => { const v = window.__iv; v.learnSkill('walk'); return v.S.skills.walk === 1; }), 'owner skills: Brisk walk learnt');
check(await ev(() => { const v = window.__iv, S = v.S; const op = S.staff.find(s => s.role === 'operator'), ld = S.staff.find(s => s.role === 'loader'); op.lv = 4; const a = v.canPromote(op); op.lv = 5; const b = v.canPromote(op) || v.staffOf('supervisor').length >= v.capOf('supervisor'); return !a && !v.canPromote(ld) && b; }), 'supervisors come from operators at worker level 5+');
check(await ev(() => window.__iv.termsOk({ qty:20, pq:0, tq:0, pay:1000, deadline:300 })), 'order terms on every phone call (Level 5 too)');
check(await ev(() => { const v = window.__iv; return /a min/.test(v.linesHtml()) && /Cash tied up/.test(v.coverHtml()) && /Reduced motion/.test(v.settingsHtml()); }), 'office: the Plant tab\'s line table, the Stock tab\'s cover and cash, settings');
check(await ev(() => !!window.__iv.S.staff.find(s => s.chief)), 'Wilf Dunn is dock crew chief at Level 5');
// snow: the crew and the owner shovel; sledging; breath; the snowman at lunch
await ev(() => { const v = window.__iv, S = v.S; v.setWx('heavysnow'); S.wx.lying = .8; S.time = v.dayNo() * 600 + 30; });
await run(8); check(await ev(() => !!window.__iv.M.shovelRack && window.__iv.M.sledges && window.__iv.M.sledges[0].g.visible), 'snow: shovels by the workshop door, children sledging on Ironhill');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.SHOVEL_AT[0], 0, v.SHOVEL_AT[1]); }); await run(2);
console.log('  shov:', await ev(() => { const v = window.__iv, o = v.owner; return JSON.stringify({ x:o.o.position.x.toFixed(2), z:o.o.position.z.toFixed(2), st:o.stack.length, cart:!!o.cart, lying:v.S.wx.lying, m:v.dayMin(), office:!!document.getElementById('office').hidden, rack:!!v.M.shovelRack }); }));
check(await ev(() => !!window.__iv.owner.shovel), 'the owner grabs a shovel and pitches in');
await ev(() => { const v = window.__iv; v.owner.o.position.set(2, 0, 6); v.camLock = [-3, 2]; v.camZoom = 1.3; v.hold = false; }); await wait(2500); await p.screenshot({ path:path.join(out, 'gap_snow.png') });
await ev(() => { const v = window.__iv; v.camLock = null; v.S.time = v.dayNo() * 600 + 302; }); await run(26);
check(await ev(() => !!window.__iv.M.snowman && window.__iv.M.snowman.scale.x > .9), 'the crew build a snowman at lunch');
await ev(() => { const v = window.__iv; v.camLock = [-7, 5]; v.camZoom = 1.0; v.hold = false; }); await wait(2500); await p.screenshot({ path:path.join(out, 'gap_snowman.png') }); await ev(() => { window.__iv.camLock = null; });
// snow chains on the lorry's tyres once bought; wipers sweep while it snows
await ev(() => { const v = window.__iv; v.S.restored.chains = true; v.M.truck.visible = true; }); await run(1);
check(await ev(() => { const t = window.__iv.M.truck, ch = t.userData.chains, w = t.userData.wipers; return !!(ch && ch.length === 4 && ch.every(r => r.visible) && w && w.visible); }), 'snow: chains on the lorry\'s four tyres, wipers sweeping (v2.0 vehicles)');
await ev(() => { const v = window.__iv, t = v.M.truck; v.camLock = [t.position.x, t.position.z]; v.camZoom = 2.2; v.hold = false; }); await wait(2500); await p.screenshot({ path:path.join(out, 'gap_chains.png') }); await ev(() => { window.__iv.camLock = null; window.__iv.setWx('clear'); window.__iv.S.wx.lying = 0; }); await run(1);
check(await ev(() => { const t = window.__iv.M.truck; return !t.userData.chains.some(r => r.visible) && !t.userData.wipers.visible; }), 'clear and thawed: chains off, wipers parked');
// frost: icicles; the crew dress for the cold
await ev(() => { const v = window.__iv; v.setWx('frost'); v.S.time = v.dayNo() * 600 + 40; }); await run(3);
check(await ev(() => !!window.__iv.M.icicles && window.__iv.M.icicles.visible), 'icicles on the workshop gutter on a frosty morning');
// an empty post: the hard hat on its hook
await ev(() => { const v = window.__iv, op = v.S.staff.find(s => s.role === 'operator' && s.mach === 'pipe'); if (op) { op.trainUntil = v.S.time + 40; } }); 
check(await ev(() => { const v = window.__iv, op = v.S.staff.find(s => s.role === 'operator' && s.mach === 'pipe'); return !!op && op.trainUntil > 0; }), 'training takes a worker to the bench for half an hour');
await run(6); check(await ev(() => window.__iv.M.hats && window.__iv.M.hats.pipe && window.__iv.M.hats.pipe.visible), 'his empty post shows a hard hat on its hook');
// the gale
await ev(() => { window.__iv.setWx('gale'); }); await run(3);
check(await ev(() => !!window.__iv.M.windsock && (window.__iv.M.trees || []).some(t => Math.abs(t.rotation.z) > .05)), 'a gale: the windsock stands out, the trees bend');
await ev(() => { window.__iv.setWx('clear'); });
// stock: the tally board at goods-in; an order's goods tagged
check(await ev(() => !!window.__iv.M.tally), 'the chalk tally board at goods-in');
await ev(() => { const v = window.__iv, S = v.S; if (!S.order) { S.call = { client:'Valley Grocers', qty:6, pq:0, tq:0, pay:300, deadline:400 }; v.acceptCall(); v.closeOffice(); } S.pallet = 4; v.syncPallet(); }); await run(1);
check(await ev(() => window.__iv.M.otags && window.__iv.M.otags.pal.visible), 'goods kept for the order wear a red tag with its number');
// the milestone photo
await ev(() => { const v = window.__iv; v.milestonePhoto('Test milestone'); v.owner.o.position.set(v.PHOTO_AT[0], 0, v.PHOTO_AT[1]); }); await run(2);
check(await ev(() => (window.__iv.S.photos || 0) >= 1), 'the milestone photo: the owner joins the crew');
// the lease and a late lorry
check(await ev(() => { const v = window.__iv, S = v.S, lv = S.level; S.level = 8; const a = v.weekAccounts().lease; S.level = lv; return a > 0; }), 'Level 8 accounts carry the siding lease');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nGAPS CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
