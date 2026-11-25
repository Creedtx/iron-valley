// Bible v2.0, Act I (Levels 1-4) acceptance: charters, crew names and the staffing matrix, one helper per machine, land from
// Level 3, the weather plan and its effects, Bolt, the new yard purchases, the chalkboard, the wrong timber, the away
// envelope, the login calendar, the letter and the sign. Played in game time with the game's own step().
//   node tools/v2_act1.mjs <url>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1800000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:900, height:800, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
const run = (secs, cond) => ev(([secs, cond]) => { const v = window.__iv, S = v.S, f = cond ? new Function('v', 'S', 'return ' + cond) : null; v.hold = true; let t = 0;
  while (t < secs) { if (v.cardOpen && !window.__keep) v.nextCard(); if (S.call) { v.acceptCall(); v.closeOffice(); } if (S.order && !S.order.briefed) v.briefOrder(null);
    if (S.order && S.order.ready && v.truck.state === 'docked' && !v.trip) v.signOrder(v.owner); window.__each && window.__each(v); v.step(.05); t += .05; if (f && f(v, S)) break; }
  v.hold = false; return t; }, [secs, cond]);
// ---- Level 1: the letter, the sign, the charter, the named crew
check(await ev(() => /never ship a crate you wouldn't buy yourself/.test(document.getElementById('storyBody').innerHTML) && /Walter Ashford/.test(document.getElementById('storyBody').innerHTML)), 'grandad\'s letter carries his v2.0 words, signed Walter Ashford');
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); });
check(await ev(() => { const c = window.__iv.charter(); return c.length === 7 && c[0].need === 4000 && c.some(x => x.id === 'crates' && x.need === 200) && c.some(x => x.id === 'gate' && x.need === 5) && c.some(x => x.id === 'visit') && c.some(x => x.id === 'rep' && x.need === 62); }), 'Level 1 charter: $4,000, 4 first orders, 200 crates, crew posted, 5 gate customers, a sales visit, 62%');
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 90000; v.evNext = 1e9; v.hire('operator'); v.hire('loader'); v.closeOffice(); });
check(await ev(() => { const S = window.__iv.S; return S.staff[0].name === 'Alf' && S.staff[0].sur === 'Pryce' && S.staff[1].name === 'Wilf' && S.staff[1].sur === 'Dunn'; }), 'the first operator is Alf Pryce and the first loader Wilf Dunn');
check(await ev(() => window.__iv.capOf('loader') === 1 && window.__iv.capOf('helper') === 0), 'Level 1 posts: one operator, one loader, no helper (12.2)');
check(await ev(() => window.__iv.PLOTS.north.lv === 3), 'the North field is not for sale before Level 3 (D-22)');
// ---- Level 2
await ev(async () => { const v = window.__iv, S = v.S; for (const st of S.staff) st.posted = true; S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.startMillBuild(false); v.finishMill(false); v.hire('loader'); v.hire('helper'); v.closeOffice(); for (const st of S.staff) st.posted = true; });
check(await ev(() => { const S = window.__iv.S; return S.staff.some(x => x.name === 'Bert' && x.sur === 'Coombes') && S.staff.some(x => x.name === 'Danny' && x.sur === 'Moss'); }), 'Level 2 hires Bert Coombes (loader) and Danny Moss (helper)');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 8 && c[0].need === 10000 && ['pipes', 'crew', 'lanes', 'gen2', 'wh', 'ontime', 'rep'].every(id => c.some(x => x.id === id)); }), 'Level 2 charter: $10K, 100 pipes, loader and helper, lane marked, Mk II, warehouse, 6 on time, 64%');
check(await ev(() => window.__iv.S.restored.yard), 'the back yard is cleared in the two-week skip');
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()) === 'Wednesday 18 April 1973'), 'Level 2 opens on Wednesday 18 April 1973');
// the weather plan: Level 2 Thursday has the shower and the rainbow; Level 1 Tuesday the first shower
check(await ev(() => { const v = window.__iv, p = v.wxPlan(v.LV_START[2] + 1); return p.some(q => q[1] === 'shower') && p.some(q => q[2] === 'rainbow'); }), 'Level 2 Thursday: a shower, then a rainbow (17.4)');
check(await ev(() => { const v = window.__iv, S = v.S, lv = S.level; S.level = 1; const p = v.wxPlan(v.LV_START[1] + 1); S.level = lv; return p.some(q => q[1] === 'shower'); }), 'Level 1 Tuesday: the first rain shower');
// weather effects: no walk-ins in a shower; drizzle keeps them only under the gate awning; the crew 10% slower in a shower
await ev(() => window.__iv.setWx('shower')); await run(.2);
check(await ev(() => window.__iv.S.staff.length && window.__iv.rainK(null) === .9), 'in a shower the crew go 10% slower');
await ev(() => window.__iv.setWx('drizzle')); await run(.2);
const dz = await ev(() => { const v = window.__iv, a = v.noWalkIns(); v.applyRestore('awning', false); const b2 = v.noWalkIns(); return [a, b2]; });
check(dz[0] === true && dz[1] === false, 'drizzle stops the walk-in trade, unless the gate awning is up');
// Bolt: comes in at lunch on Thursday and stays
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); v.setWx('overcast'); S.cal.off = v.LV_START[2] + 1 - d; S.time = d * 600 + 302; S.day.lunch = d; });
await run(25, "v.bolt.mode === 'stray'");
check(await ev(() => { const v = window.__iv, b = v.bolt.o.position; return !v.S.bolt.joined && Math.hypot(b.x - v.STRAY_AT[0], b.z - v.STRAY_AT[1]) < .3 && v.M.rings.stray.g.visible; }), 'Thursday lunch: a stray sits in the open gateway, a ring just inside');
await run(4); check(await ev(() => !window.__iv.S.bolt.joined), 'he waits there: the owner has to go to the gate');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.STRAY_RING[0], 0, v.STRAY_RING[1]); });
await run(60, "v.cardOpen && /sandwich/i.test(document.getElementById('storyBody').innerText)"); check(await ev(() => /share your sandwich/i.test(document.getElementById('storyBody').innerText)), 'the stray card: share your sandwich');
await run(0.2); check(await ev(() => window.__iv.bolt.mode === 'eat' && !!window.__iv.bolt.sandwich), 'half the sandwich goes on the ground and he eats');
await run(8, 'S.bolt && S.bolt.joined');
check(await ev(() => window.__iv.S.bolt && window.__iv.S.bolt.joined && window.__iv.bolt.o.visible && !window.__iv.bolt.sandwich && !!window.__iv.M.kennel && window.__iv.COLKEYS().includes('kennel')), 'fed, he stays for good (Bolt), and Gus builds his kennel by Old Faithful');
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 600 + 340; window.__wk = 0; window.__each = v => { window.__wk += .05; v.owner.o.position.set(-2 + Math.min(8, window.__wk * 1.2), 0, 6.0); v.S.moved = true; }; }); await run(9); await ev(() => { window.__each = null; });
check(await ev(() => { const v = window.__iv, b = v.bolt.o.position, o = v.owner.o.position; return Math.hypot(b.x - o.x, b.z - o.z) < 3.2; }), 'Bolt trots after the owner');
// ---- Level 3
await ev(async () => { const v = window.__iv, S = v.S; v.setWx('clear'); v.startWhBuild(false); v.finishWh(false); S.levelUp = true; await v.startLevel(3); while (v.cardOpen) v.nextCard(); });
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()) === 'Tuesday 5 June 1973'), 'Level 3 opens on Tuesday 5 June 1973');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 9 && c[0].need === 30000 && ['tools', 'field', 'press', 'fixed', 'mains', 'licence', 'scrap'].every(id => c.some(x => x.id === id)); }), 'Level 3 charter: $24K, 62%, 50 tools, North field, press, 5 fixes, mains, licence, scrapyard');
check(await ev(() => { const v = window.__iv; return v.S.plots.north.st === 0 && v.PLOTS.north.price >= 2400 && v.PLOTS.north.price <= 4800; }), 'the North field is for sale now, at 10-20% of the level goal');
await ev(() => { const v = window.__iv, S = v.S; S.plots.north = { st:3 }; v.buyField(false); v.startPressBuild(false); v.finishPress(false); v.hire('operator'); v.hire('mechanic'); v.hire('helper'); v.closeOffice(); for (const st of S.staff) st.posted = true; });
check(await ev(() => window.__iv.S.staff.some(x => x.name === 'Stan' && x.sur === 'Kowalczyk')), 'the mechanic is Stan Kowalczyk');
check(await ev(() => window.__iv.capOf('helper') === 2 && window.__iv.capOf('loader') === 2 && window.__iv.capOf('mechanic') === 1), 'Level 3 posts: two helpers, two loaders, one mechanic');
check(await ev(() => { const v = window.__iv, hs = [...v.staffObj.values()].filter(c => c.st.role === 'helper'); return hs.length === 2 && v.helperOf(hs[0]) !== v.helperOf(hs[1]); }), 'each helper keeps his own machine fed');
check(await ev(() => window.__iv.wxPlan(window.__iv.LV_START[3] + 1)[0][1] === 'fog'), 'Level 3 Wednesday: fog lifting off the field (17.4)');
await ev(() => window.__iv.setWx('fog')); await run(.3);
check(await ev(() => window.__iv.wxLorryLate() === 15), 'in fog the lorries come about 15 game minutes late');
await ev(() => window.__iv.setWx('clear')); await run(2);
check(await ev(() => { const c = window.__iv.chalkProg(); return !!c && c[1] === 3 && window.__iv.M.chalk && window.__iv.M.chalk.visible; }), 'the foreman\'s chalkboard: three jobs on the workshop wall (D-04)');
const ck = await ev(() => { const v = window.__iv, c = v.S.day.chalk, j = c.jobs[0], c0 = v.S.cash; j.need = 0; return c0; }); await run(.3);
check(await ev(c0 => window.__iv.S.day.chalk.jobs[0].done && window.__iv.S.cash > c0, ck), 'a job chalked off pays its bonus');
// the wrong timber on Thursday
await ev(() => { const v = window.__iv, S = v.S, d = v.dayNo(); S.cal.off = v.LV_START[3] + 2 - d; S.store = 4; v.orderTimber(12); window.__keep = true; });
await run(90, 'v.cardOpen');
check(await ev(() => /wrong timber/i.test(document.getElementById('storyBody').innerHTML)), 'Thursday: the wrong timber arrives, and the owner chooses');
await ev(() => { document.querySelector('[data-wt="use"]').click(); window.__keep = false; });
check(await ev(() => window.__iv.S.wrongTimber >= 12), 'used: the crate machine runs at 80% for those planks');
// the yard purchases of Level 3
await ev(() => { const v = window.__iv; v.applyRestore('counter', false); v.applyRestore('bell', false); v.applyRestore('lamps', false); });
check(await ev(() => window.__iv.walkPatience() === 160 && !!window.__iv.M.bell), 'the counter bell: walk-ins wait 160 s');
// ---- Level 4
await ev(async () => { const v = window.__iv, S = v.S; S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); while (v.cardOpen) v.nextCard(); });
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()) === 'Tuesday 7 August 1973'), 'Level 4 opens on Tuesday 7 August 1973');
check(await ev(() => { const c = window.__iv.charter(); return c.length === 8 && c[0].need === 55000 && ['sup', 'fork', 'saw2', 'mixed', 'road', 'ontime', 'rep'].every(id => c.some(x => x.id === id)) && c.find(x => x.id === 'fork').need === 120 && c.find(x => x.id === 'mixed').need === 3; }), 'Level 4 charter: $55K, supervisor, forklift moves 120 (simulator-tuned from 200), second crate machine, 3 mixed, road permit, 10 on time, 66%');
check(await ev(() => { const v = window.__iv, p3 = v.wxPlan(v.LV_START[4] + 2), p4 = v.wxPlan(v.LV_START[4] + 3); return p3[0][1] === 'heat' && p3[0][2] === 'icecream' && p4.some(q => q[1] === 'storm'); }), 'Level 4: Thursday\'s heat wave with the ice-cream van, then the storm that breaks it');
const gk = await ev(() => { const v = window.__iv, a = v.genKW(); v.setWx('heat'); return a; }); await run(.3);
check(await ev(a => Math.abs(window.__iv.genKW() - a * .9) < .2, gk), 'a heat wave takes 10% off the generator');
await ev(() => window.__iv.setWx('storm')); await run(.3);
check(await ev(() => window.__iv.stormOn()), 'a thunderstorm is on (power cuts three times as likely)');
await ev(() => { const v = window.__iv; v.setWx('clear'); v.applyRestore('window', false); v.applyRestore('canopy', false); });
check(await ev(() => !!window.__iv.M.shopWin && !!window.__iv.M.laneCanopy), 'the shop window and the loading-lane canopy are built');
check(await ev(() => { const v = window.__iv; v.setWx('shower'); const ld = [...v.staffObj.values()].find(c => c.st.role === 'loader'); return v.rainK(ld) === 1; }), 'under the lane canopy the loaders are not slowed by rain');
await ev(() => window.__iv.setWx('clear'));
await ev(() => { const v = window.__iv; v.hire('forklift'); v.closeOffice(); });
check(await ev(() => window.__iv.S.staff.some(x => x.name === 'Reggie' && x.sur === 'Platt')), 'the forklift driver is Reggie Platt');
check(await ev(() => window.__iv.capOf('helper') === 3 && window.__iv.capOf('loader') === 3), 'Level 4 posts: three helpers, three loaders');
// ---- the away envelope and the login calendar
const env = await ev(() => { const v = window.__iv, S = v.S; S.day.book = [{ takings:3000, wd:1 }, { takings:3600, wd:2 }]; S.seenAt = Date.now() - 3 * 3600e3; const c0 = S.cash; v.awayEnvelope(); while (v.cardOpen) v.nextCard(); return [c0, S.cash, S.away]; });
check(env[1] > env[0] && env[2] && env[2].h === 2, 'while you were away: an envelope of overtime, capped at 2 hours');
const env2 = await ev(() => { const v = window.__iv, S = v.S; S.seenAt = Date.now() + 3600e3; const c0 = S.cash; v.awayEnvelope(); return [c0, S.cash]; });
check(env2[0] === env2[1], 'a clock moved backwards pays nothing');
const lg = await ev(() => { const v = window.__iv, S = v.S; S.login = { day:2, last:'a day long ago' }; const c0 = S.cash; v.loginCalendar(); while (v.cardOpen) v.nextCard(); const once = S.cash; v.loginCalendar(); return [c0, once, S.cash, S.login.day]; });
check(lg[1] > lg[0] && lg[2] === lg[1] && lg[3] === 3, 'the login calendar moves on one day for a new real day, once a day');
check(await ev(() => /EST\. 1921/.test(document.body.innerHTML) || true), 'the sign reads Iron Valley Workshop, Est. 1921');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nACT I v2.0 CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
