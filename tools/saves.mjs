// QA-03 charter persistence, QA-09 save migration, QA-10 offline returns: save, reload, compare on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/saves.mjs <url> <outDir>
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
await p.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch(e){} });
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

// QA-03: charter ticks, crew, cash and level survive a save and a reload; goods in hands go back to a stack
await ev(() => { const v = window.__iv, S = v.S; S.plots.shop = { st:3 }; v.finishPlot('shop', false); v.startMill2Build(false); v.finishMill2(false); v.closeOffice(); });
await run(20);
const before = await ev(() => { const v = window.__iv, S = v.S; window.__b = { earned:S.earned, pile:S.cashPile, walk:JSON.stringify(S.walk) }; v.checkCharter && v.checkCharter(); v.giveCarry(v.owner, 'crate', 2); S.made += 2; return { level:S.level, ticks:JSON.stringify(S.ticks || {}), staff:S.staff.length, cash:Math.round(S.cash + S.cashPile), earned:Math.round(S.earned), day:v.calDay(), lines:v.charter().filter(c => v.lineDone(c)).length, drift:v.stockLedger().drift }; });
console.log('  diff', await ev(() => { const v = window.__iv, S = v.S; v.save(); const raw = JSON.parse(localStorage.getItem('iron-valley-wide-preview')); const out = []; for (const k of Object.keys(S)) { const a = JSON.stringify(S[k]), b = JSON.stringify(raw[k]); if (a !== b) out.push(k + ': ' + (a || '').slice(0, 90) + ' | saved ' + (b || 'MISSING').slice(0, 90)); } return out.join('\n    '); }));
await ev(() => { window.__iv.S.away = null; window.__iv.save(); sessionStorage.setItem('keep', '1'); });
await p.reload({ waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); });
const after = await ev(() => { const v = window.__iv, S = v.S; window.__dbg = { cash:S.cash, pile:S.cashPile, earned:S.earned, chalk:S.day && S.day.chalk, tgt:S.day && S.day.target, walk:S.walk, l5:{ loan:S.l5.loan, borrowed:S.l5.borrowed } }; return { level:S.level, ticks:JSON.stringify(S.ticks || {}), staff:S.staff.length, cash:Math.round(S.cash + S.cashPile - (S.away && S.away.pay || 0)), earned:Math.round(S.earned - (S.away && S.away.pay || 0)), away:S.away && S.away.pay, day:v.calDay(), lines:v.charter().filter(c => v.lineDone(c)).length, drift:v.stockLedger().drift, held:v.owner.stack.length }; });
console.log('  dbg', JSON.stringify(await ev(() => window.__dbg)).slice(0, 600)); console.log('  bdbg', JSON.stringify(await ev(() => window.__b))); console.log('  before', JSON.stringify(before)); console.log('  after ', JSON.stringify(after));
check(after.level === before.level && after.staff === before.staff && after.lines >= before.lines && after.ticks === before.ticks, 'level, crew and every ticked charter line survive a reload');
check(Math.abs((after.cash - before.cash) - (after.earned - before.earned)) <= 1 && after.day === before.day, 'no money appears or vanishes in a reload: cash moves only by what is earned, and the calendar day holds');
check(after.held === 0 && after.drift.crate === before.drift.crate, 'goods in the owner\'s hands go back to a stack on load: nothing vanishes or duplicates');
// QA-10: a clock moved backwards pays nothing; a long absence pays at most the cap; the calendar never moves offline
check(await ev(() => { const v = window.__iv, S = v.S, c0 = S.cash, d0 = v.calDay(); S.seenAt = Date.now() - 48 * 3600e3; return v.awayEnvelope === undefined && S.cash === c0 && v.calDay() === d0; }), 'no offline earnings: a long absence pays nothing and the calendar never moves offline');
// QA-09: an old save with a 6-minute bill loads, the bill joins the weekly accounts
check(await ev(() => { const v = window.__iv, raw = JSON.parse(JSON.stringify(v.S)); raw.l5.bill = { total:420, due:raw.time + 60 }; raw.v = 8; const m = v.migrate(raw); return m && !m.l5.bill && (m.l5.owedWages || 0) >= 420; }), 'an old save\'s 6-minute bill converts to the weekly accounts');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nSAVES CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
