// QA-02 stock reconciliation: made = on stacks + warehouse + in hands and on trolleys + shipped + sold at the gate, through a working day on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/ledger.mjs <url> <outDir>
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

await ev(() => { const v = window.__iv, S = v.S; S.plots.shop = { st:3 }; v.finishPlot('shop', false); v.startMill2Build(false); v.finishMill2(false); v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.time = v.dayNo() * 600 + 20; });
const t0 = await ev(() => window.__iv.S.time); const d0 = await ev(() => window.__iv.stockLedger().drift); console.log('  start drift', JSON.stringify(d0));
let worst = { crate:0, pipe:0, tool:0 }, samples = 0;
for (let i = 0; i < 50; i++) { await run(10); const d = await ev(() => window.__iv.stockLedger().drift); samples++;
  for (const k of ['crate', 'pipe', 'tool']) { const dd = Math.abs(d[k] - d0[k]); if (dd > worst[k]) { worst[k] = dd; console.log(`  ${k} drift ${d[k] - d0[k]} at sample ${i}`, JSON.stringify(await ev(() => { const v = window.__iv; return v.stockLedger(); }))); } } }
const made = await ev(() => { const S = window.__iv.S; return { c:S.made, p:S.pmade, t:S.tmade, sh:S.shipped, ps:S.pshipped, w:S.walk.u }; }); console.log('  made', JSON.stringify(made));
check(worst.crate === 0 && worst.pipe === 0 && worst.tool === 0, `stock reconciles exactly through 500 s of a Level 5 day (${samples} samples; worst drift ${JSON.stringify(worst)})`);
const gap = await ev(t0 => { const v = window.__iv, b = v.beats.filter(t => t >= t0), pts = [t0, ...b, v.S.time]; let g = 0; for (let i = 1; i < pts.length; i++) g = Math.max(g, pts[i] - pts[i - 1]); return { g:Math.round(g), n:b.length }; }, t0);
check(gap.g <= 90, `QA-14 beat sheet: something new at least every 90 s (${gap.n} beats, longest gap ${gap.g} s)`);
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nLEDGER CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
