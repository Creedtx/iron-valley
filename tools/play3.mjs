// Level 3 playthrough (build 0.13): level-up from a finished level 2 that bought the North field, install the tool
// press, the guided first tool order (the press jams halfway; the owner fixes it by hand), hire a mechanic and an
// electrician, issues about every 3 minutes, buy the scrapyard through Vera Lind, the trading licence, the charter.
//   node tools/play3.mjs <url> <outDir> [game-minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/l3', mins = '26'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
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
let fail = false;
async function until(name, fn, secs = 120, tick){ const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); }); if (tick) await ev(tick); if (await ev(fn)) return true; await sleep(700); }
  console.log('STUCK at', name, JSON.stringify(await st())); await shot('stuck_' + name); fail = true; return false; }
const st = () => ev(() => { const v = window.__iv, S = v.S, o = S.order;
  return { lv:S.level, field:S.lv3.field, press:S.lv3.press, cash:Math.round(S.cash), coils:S.coils, tfeed:S.tfeed, tcoil:S.tcoil, tools:S.tools, parts:S.parts, lic:S.lv3.licence,
    ord:o ? `${o.id}:${o.cut}/${o.qty}c ${o.pcut}/${o.pq}p ${o.tcut}/${o.tq}t bed${S.bed}/${S.pbed}/${S.tbed} ${Math.round(o.time)}/${o.deadline}` : null, del:S.delivered, tship:S.tshipped, kw:+v.load().toFixed(1), gen:v.genKW(),
    press:v.toolReason().label.join(' / '), staff:[...v.staffObj.values()].map(c => `${c.st.name}:${c.state}`).join(' ') }; });
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:5, xp:0, energy:100, focus:100, look }, extra);
// a finished level 2: mill installed, Generator Mk II, the North field owned, the level 2 crew, charter complete
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true }, plots:{ north:{ st:3 }, scrap:{ st:0 } }, level:2, levelUp:true, cash:5200, earned:9000, rep:72, delivered:22, ontime:21, shipped:120, pshipped:40, orderSeq:22, fixed:14, timber:12, store:24, feed:6,
  tut:99, tutDone:true, mechIntro:true, officeSeen:true, coils:4, coilFeed:2, coilLeft:2,
  lv2:{ e0:2600, mill:2, buildT:18, seq:12, wh:0 }, lv3:{ e0:0, f0:0, field:true, press:0, pressT:0, licence:0, licT:0, seq:0 }, restored:{ lights:true, paint:true, windows:true, coffee:true, yard:true, mill:true }, up:{ gen2:2, stack:2, saw:2, hands:2, tools:2, back:1 },
  ticks:{ '2:Money':true, '2:Standing':true, '2:Output':true, '2:Growth':true, '2:Papers':true }, owner:[12.0, 6.0], nextId:10,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'loader'), staff(3, 'Kim', 'loader'), staff(4, 'Hank', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }), staff(9, 'Pat', 'cleaner')] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.mill', { timeout:90000 });
await ev(() => { window.__iv.speed = 6; window.__iv.showLevelUp(); }); await sleep(800); await shot('l3_levelup');
await p.click('#luOk'); await until('level3', () => window.__iv.S.level === 3 && window.__iv.M.l3Built, 30);
await sleep(1200); await shot('l3_courier'); await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); });
await ev(() => window.__iv.owner.o.position.set(16.5, 0, -2.0)); await sleep(2500); await shot('l3_field_owned');
await ev(() => { window.__iv.S.cash = Math.max(window.__iv.S.cash, 2400); }); await sleep(1500);
await until('pressPaid', () => window.__iv.S.lv3.press >= 1, 60, () => window.__iv.owner.o.position.set(17.0, 0, -2.55));
await ev(() => window.__iv.owner.o.position.set(17.6, 0, -1.6)); await sleep(3000); await shot('l3_building');
await until('pressBuilt', () => window.__iv.S.lv3.press === 2, 150);
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.S.cash = Math.max(v.S.cash, 2500); v.hire('operator'); v.orderSteel(4); v.orderParts(); });
const opMach = await ev(() => { const o = window.__iv.pressOp(); return o ? o.st.name + ':' + o.st.mach : null; }); console.log('press operator', opMach); if (!opMach) fail = true;
await sleep(2500); await shot('l3_press');
// the owner answers calls, keeps steel, timber and spare parts coming and collects the cash; the crew does the rest
const owner = () => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); if (S.call) v.acceptCall(); if (S.order && !S.order.briefed) v.briefOrder(v.owner);
  if (S.lv3.jam && !S.faults.some(f => f.guided)) { if (!S.staff.some(s => s.role === 'mechanic')) v.hire('mechanic'); if (!S.staff.some(s => s.role === 'electrician')) v.hire('electrician'); }
  if (S.plots.scrap.st === 0 && S.cash > v.offerPrice('scrap', 'pay') + 300) v.makeOffer('scrap', 'pay');
  if (!S.delivery) { const steel = S.coils + S.coilFeed + S.tfeed + (S.coilLeft ? 1 : 0) + (S.tcoil ? 1 : 0); if (steel < 4 && S.coils <= 2) v.orderSteel(4); else if (S.store + S.timber + S.feed < 14) v.orderTimber(S.store <= 4 ? 24 : 12); }
  if (S.parts < 2) v.orderParts(); if (!S.up.ppe && S.cash > 400) v.buyUpgrade('ppe');
  // the licence: apply once the council's checklist is all ticked (a failed inspection is booked again the same way)
  if ((!S.lv3.licence || S.lv3.licence === 4) && v.licReady()) v.applyLicence();
  const g = S.faults.find(f => f.guided); const pos = g ? v.WHERE[g.where].spot() : S.order && S.order.ready && v.truck.state === 'docked' ? v.P.drop : S.cashPile > 0 ? v.P.cash : [17.6, -1.6];
  v.owner.o.position.set(pos[0], 0, pos[1]); };
await until('toolOrder', () => { const o = window.__iv.S.order; return o && o.tq > 0; }, 300, owner);
console.log('first tool order', JSON.stringify(await st()));
await until('stamping', () => window.__iv.S.tmade >= 2, 200, owner); await shot('l3_stamping');
await until('guidedJam', () => window.__iv.S.faults.some(f => f.guided), 200, owner); await sleep(600); await shot('l3_jam');
await until('jamFixedByHand', () => window.__iv.S.lv3.jam && !window.__iv.S.faults.some(f => f.guided), 120, owner);
console.log('guided jam fixed by hand', JSON.stringify(await st()));
await until('toolsShipped', () => window.__iv.S.tshipped >= 4, 300, owner); await ev(() => window.__iv.owner.o.position.set(17.0, 0, 3.2)); await sleep(1500); await shot('l3_truck');
const t0 = await ev(() => window.__iv.S.time); let both3 = false, maxKw = 0, shotInsp = false;
while (true) { await sleep(2500); await ev(owner);
  const s = await ev(() => ({ t:Math.round(window.__iv.S.time), done:window.__iv.S.levelUp, three:window.__iv.sawOn && window.__iv.pipeOn && window.__iv.toolOn, kw:window.__iv.load(),
    ch:window.__iv.charter().map(c => `${c.k}:${window.__iv.lineDone(c) ? 'OK' : Math.round(c.get(window.__iv.S))}`).join(' ') }));
  both3 ||= s.three; maxKw = Math.max(maxKw, s.kw);
  if ((s.t - t0) % 90 < 6) console.log(JSON.stringify(s), JSON.stringify(await st()));
  if (!shotInsp && await ev(() => window.__iv.S.lv3.licence === 3 && !!window.__iv.inspector)) { shotInsp = true; await ev(() => { const i = window.__iv.inspector; window.__iv.owner.o.position.set(i.o.position.x + 1.2, 0, i.o.position.z + 1.0); }); await sleep(1200); await shot('l3_inspector'); }
  if (s.done) { console.log('LEVEL 3 CHARTER COMPLETE at game time', s.t, '(level 3 started at about', Math.round(t0), ')'); break; }
  if (s.t - t0 > mins * 60) { console.log('charter not finished in', mins, 'game minutes'); fail = true; break; } }
await sleep(2500); await shot('l3_end');
// the warehouse with its tool rack, the opened scrapyard, the licence certificate
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(-5.4, 0, 6.2); }); await sleep(2500); await shot('l3_warehouse_tools');
await ev(() => window.__iv.owner.o.position.set(-9.6, 0, 9.6)); await sleep(1500); await ev(() => window.__iv.owner.o.position.set(-12.5, 0, 9.0)); await sleep(2500); await shot('l3_scrapyard');
const walkIn = await ev(() => window.__iv.owner.o.position.x); console.log('owner inside the scrapyard at x', walkIn.toFixed(1)); if (walkIn > -10) fail = true;
await ev(() => window.__iv.story({ kind:'licence', pass:true })); await sleep(900); await shot('l3_certificate'); await ev(() => window.__iv.nextCard());
const res = await ev(() => { const S = window.__iv.S; return { history:S.history.slice(0, 8).map(h => `#${h.id} ${h.qty}c ${h.pq}p ${h.tq}t ${h.late ? 'LATE' : 'ok'} ${h.t}/${h.dl}`),
  licence:S.lv3.licence + ' ' + JSON.stringify(S.lv3.check), whT:S.wh.t, rescues:[S.sawRescues || 0, S.pipeRescues || 0, S.toolRescues || 0], toolLog:S.toolLog, scrap:S.plots.scrap, faultsNow:S.faults.map(f => f.kind), staff:S.staff.map(s => s.role).join(','), fixedL3:S.fixed - S.lv3.f0, partsLeft:S.parts, tmade:S.tmade, tship:S.tshipped }; });
console.log('three machines at once', both3, 'max load kW', maxKw.toFixed(1));
console.log('diagnostics', JSON.stringify(res));
console.log(errs.length ? 'PAGE ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'no page errors');
await b.close(); process.exit(errs.length || fail ? 1 : 0);
