// Level 2 playthrough: level-up from a finished level 1, install the pipe mill, staff it, buy steel,
// run guided and mixed orders, hit the power limit, install Generator Mk II, and finish the charter.
//   node tools/play2.mjs <url> <outDir> [game-minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/l2', mins = '16'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text()); });
const shot = n => p.screenshot({ path:path.join(out, n + '.png') });
const ev = (f, ...a) => p.evaluate(f, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(name, fn, secs = 120, tick){ const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); }); if (tick) await ev(tick); if (await ev(fn)) return true; await sleep(700); }
  console.log('STUCK at', name, JSON.stringify(await st())); await shot('stuck_' + name); fail = true; return false; }
const st = () => ev(() => { const v = window.__iv, S = v.S; return { lv:S.level, mill:S.lv2.mill, cash:Math.round(S.cash), coils:S.coils, feed:S.coilFeed, left:S.coilLeft, pipes:S.pipes, ord:S.order ? `${S.order.id}:${S.order.cut}/${S.order.qty}c ${S.order.pcut || 0}/${S.order.pq || 0}p bed${S.bed}/${S.pbed} ${Math.round(S.order.time)}/${S.order.deadline}` : '-', del:S.delivered, pship:S.pshipped, ship:S.shipped, kw:+v.load().toFixed(1), gen:v.genKW(), pipe:v.pipeReason().label.join(' / '), staff:[...v.staffObj.values()].map(c => `${c.st.name}:${c.state}`).join(' ') }; });
let fail = false;
await p.goto(url, { waitUntil:'domcontentloaded' }); await ev(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
// a finished level 1 (build 0.13): the letter read, the opening done, an operator and two loaders on staff
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); Object.assign(v.S, { tut:99, tutDone:true, mechIntro:true, cash:6000, earned:2600, delivered:3, ontime:3, shipped:24, rep:62, checked:{ operator:true, loader:true } });
  v.S.restored.yard = true; for (const r of ['operator', 'loader', 'loader']) v.hire(r); v.S.cash = 3000; v.speed = 6; });
const caps = await ev(() => ['electrician', 'mechanic', 'supervisor'].map(r => r + ':' + window.__iv.capOf(r)).join(' ')); console.log('level 1 caps', caps); if (caps !== 'electrician:0 mechanic:0 supervisor:0') fail = true;

await ev(() => { const v = window.__iv; if (!v.S.levelUp) { v.S.levelUp = true; v.showLevelUp(); } });
await sleep(800); await shot('l2_levelup');
await p.click('#luOk'); await until('level2', () => window.__iv.S.level === 2, 20);
await sleep(1500); await shot('l2_courier'); await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); }); await sleep(800); await shot('l2_start');
// pay in at the mill pad
await until('paid', () => window.__iv.S.lv2.mill >= 1, 40, () => window.__iv.owner.o.position.set(12.4, 0, 4.35));
await ev(() => window.__iv.owner.o.position.set(11.0, 0, 5.6)); await sleep(2500); await shot('l2_building');
await until('built', () => window.__iv.S.lv2.mill === 2, 120);
await ev(() => { const v = window.__iv; v.hire('operator'); v.orderSteel(4); }); await sleep(1500); await shot('l2_mill');
// the owner answers calls and keeps timber and steel coming; everything else is the crew's job
const owner = () => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); if (S.plots.north.st === 0 && S.cash > 1200 && S.lv2.mill === 2) v.makeOffer('north', 'pay'); if (S.call) v.acceptCall(); if (!S.delivery) { const steel = S.coils + S.coilFeed + (S.coilLeft ? 1 : 0); if (steel < 3) v.orderSteel(4); else if (S.store + S.timber + S.feed < 14) v.orderTimber(S.store <= 4 ? 24 : 12); } if (S.order && !S.order.briefed) v.briefOrder(v.owner); const pos = S.order && S.order.ready && v.truck.state === 'docked' ? v.P.drop : S.cashPile > 0 ? v.P.cash : [9.6, 6.6]; v.owner.o.position.set(pos[0], 0, pos[1]); };
await until('firstOrderPipes', () => { const o = window.__iv.S.order; return o && o.pq > 0 && !o.qty; }, 300, owner);
console.log('guided order', JSON.stringify(await st()));
await until('pipesFormed', () => window.__iv.S.pmade >= 2, 160, owner); await ev(() => window.__iv.owner.o.position.set(12.0, 0, 5.4)); await sleep(1800); await shot('l2_forming');
await until('pipesShipped', () => window.__iv.S.pshipped >= 4, 220, owner); await shot('l2_pipes_truck');
// a mixed order runs both machines: the Mk I generator is overloaded
let minPf = 1, sawBoth = false;
await until('overload', () => { const v = window.__iv; const both = v.sawOn && v.pipeOn; return both; }, 700, owner);
const pfNow = await ev(() => ({ pf:window.__iv.pf(), kw:window.__iv.load(), gen:window.__iv.genKW() })); console.log('both machines', JSON.stringify(pfNow));
await shot('l2_overload');
await ev(() => window.__iv.owner.o.position.set(16.5, 0, 3.2)); await sleep(1800); await shot('l2_apron');
await ev(() => { const v = window.__iv; v.S.cash = Math.max(v.S.cash, 700); v.buyUpgrade('gen2'); v.owner.o.position.set(3.2, 0, 3.6); }); await sleep(2200); await shot('l2_gen2');
console.log('after Mk II', JSON.stringify(await ev(() => ({ gen:window.__iv.genKW(), pf:window.__iv.pf(), kw:window.__iv.load(), mk2:!!window.__iv.M.gen2 }))));
// let the level run; report the charter
const t0 = await ev(() => window.__iv.S.time);
while (true) { await sleep(2500); await ev(owner);
  const s = await ev(() => ({ t:Math.round(window.__iv.S.time), done:window.__iv.S.levelUp, ch:window.__iv.charter().map(c => `${c.k}:${window.__iv.lineDone(c) ? 'OK' : Math.round(c.get(window.__iv.S))}`).join(' ') }));
  if ((s.t - t0) % 60 < 6) console.log(JSON.stringify(s), JSON.stringify(await st()));
  if (s.done) { console.log('LEVEL 2 CHARTER COMPLETE at game time', s.t); break; }
  if (s.t - t0 > mins * 60) { console.log('charter not finished in', mins, 'game minutes'); break; } }
await sleep(2500); await shot('l2_end');
const plot = await ev(() => JSON.stringify(window.__iv.S.plots.north) + ' field ' + window.__iv.S.lv3.field); console.log('north field', plot);
const hist = await ev(() => window.__iv.S.history); console.log('history', JSON.stringify(hist));
const res = await ev(() => ({ rescues:window.__iv.S.sawRescues || 0, prescues:window.__iv.S.pipeRescues || 0, unstuck:window.__iv.S.unstuck || 0, ulog:window.__iv.S.unstuckLog, pipeLog:window.__iv.S.pipeLog, sawLog:window.__iv.S.sawLog }));
console.log('diagnostics', JSON.stringify(res));
console.log(errs.length ? 'PAGE ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'no page errors');
await b.close(); process.exit(errs.length || fail ? 1 : 0);
