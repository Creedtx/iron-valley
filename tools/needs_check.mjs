// Staff needs and facilities: drinks at the cooler, toilet visits with doors and queueing, bottle swaps,
// washroom cleaning (cleaner, then loaders without one), and the progression table's caps and steps.
//   node tools/needs_check.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/needs'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text()); });
const ev = (f, ...a) => p.evaluate(f, ...a), sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (ok, what) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); };
async function until(fn, secs, tick){ const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (tick) await ev(tick); if (await ev(fn)) return true; await sleep(600); } return false; }
await p.goto(url, { waitUntil:'domcontentloaded' }); await ev(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); Object.assign(v.S, { tut:99, tutDone:true, mechIntro:true, cash:5000, delivered:3 }); for (const r of ['operator', 'loader', 'loader']) v.hire(r); v.speed = 4; });
// progression: caps, worker level cap, upgrade steps by level
const prog = await ev(() => { const v = window.__iv; return { opCap:v.capOf('operator'), loaderCap:v.capOf('loader'), cleanerCap:v.capOf('cleaner'), maxLv:v.maxLv(), sawSteps:v.upSteps(v.UPGRADES.find(u => u.id === 'saw')) }; });
check(prog.opCap === 1 && prog.loaderCap === 2 && prog.cleanerCap === 1 && prog.maxLv === 5 && prog.sawSteps === 3, `level 1 caps from the table ${JSON.stringify(prog)}`);
// drinks: everyone thirsty
await ev(() => { for (const c of window.__iv.staffObj.values()) c.st.thirst = 12; });
check(await until(() => window.__iv.S.drinks >= 3, 120), 'thirsty workers walk to the cooler and drink');
await ev(() => window.__iv.owner.o.position.set(7.2, 0, 8.8)); await sleep(1500); await p.screenshot({ path:path.join(out, 'cooler.png') });
// toilets: everyone at once, so some must queue
await ev(() => { for (const c of window.__iv.staffObj.values()) c.st.bladder = 6; window.__iv.owner.o.position.set(-1.5, 0, 12.2); });
const queued = await until(() => [...window.__iv.staffObj.values()].some(c => c.need && c.need.stage === 'queue'), 60);
check(queued, 'with more people than stalls, workers queue');
const hidden = await until(() => [...window.__iv.staffObj.values()].some(c => !c.o.visible && c.need && c.need.stage === 'inside'), 60);
await sleep(300); await p.screenshot({ path:path.join(out, 'washroom.png') });
check(hidden, 'a worker goes into a stall (hidden, door shut, lamp red)');
check(await until(() => window.__iv.S.wcUses >= 3, 200), 'everyone gets through the washroom');
// cooler runs dry: a loader swaps the bottle (no cleaner yet)
await ev(() => { window.__iv.S.cooler = 0; window.__iv.S.wcClean = 20; });
check(await until(() => window.__iv.S.cooler > 5, 150), 'with no cleaner, a loader swaps the empty water bottle');
check(await until(() => window.__iv.S.wcClean >= 99, 200), 'with no cleaner, a loader cleans the filthy washroom');
// hire a cleaner; he keeps it up
await ev(() => { const v = window.__iv; v.hire('cleaner'); v.S.wcClean = 50; });
check(await until(() => window.__iv.S.wcClean >= 99 && [...window.__iv.staffObj.values()].some(c => c.st.role === 'cleaner'), 200), 'the cleaner cleans the washroom');
// buy washroom stalls: a second block appears
await ev(() => { const v = window.__iv; v.buyUpgrade('wc'); v.buyUpgrade('wc'); });
const stalls = await ev(() => ({ n:window.__iv.stallCount(), blocks:window.__iv.M.wc.length }));
check(stalls.n === 4 && stalls.blocks === 2, `two stall upgrades add a second block (${JSON.stringify(stalls)})`);
await ev(() => window.__iv.owner.o.position.set(-3.6, 0, 12.4)); await sleep(1800); await p.screenshot({ path:path.join(out, 'washroom2.png') });
// office: upgrades tab shows steps by level, charter tab shows the road ahead
await ev(() => window.__iv.openOffice('upgrades')); await sleep(600); await p.screenshot({ path:path.join(out, 'office_upgrades.png') });
const upText = await ev(() => document.getElementById('office').textContent);
check(/Step \d of \d/.test(upText) && /Operator safety gear/.test(upText) && /Washroom stalls/.test(upText), 'upgrades show steps per level and the new equipment');
await ev(() => window.__iv.openOffice('charter')); await sleep(600); await p.screenshot({ path:path.join(out, 'office_road.png') });
const chText = await ev(() => document.getElementById('office').textContent);
check(/The road ahead/.test(chText) && /Iron Valley Corporation/.test(chText) && /workers train to level 7/.test(chText), 'charter shows all 16 levels and what each opens');
await ev(() => window.__iv.closeOffice());
check(errs.length === 0, `no page errors ${errs.slice(0, 3).join(' | ')}`);
await b.close(); const bad = results.filter(x => !x).length; console.log(bad ? `${bad} failed` : 'all needs checks passed'); process.exit(bad ? 1 : 0);
