// Level 4 playthrough (build 0.14): level-up from a finished level 3, the wall to the yard comes down, the second
// crate machine (Rusty's, free), a forklift driver, the guided 40/20/10 order with a promoted supervisor led to his
// post, Generator Mk III, the road frontage permit, and the charter.
//   node tools/play4.mjs <url> <outDir> [game-minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/l4', mins = '30'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
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
const st = () => ev(() => { const v = window.__iv, S = v.S, o = S.order, L = S.lv4;
  return { lv:S.level, cash:Math.round(S.cash), saw2:L.saw2, feed2:L.feed2, pal2:L.pallet2, trips:L.trips || 0, fork:v.fork.state, wh:`${S.wh.c}/${S.wh.p}/${S.wh.t}`, store:S.store, coils:S.coils, post:L.post, sup:v.supervisor() ? v.supervisor().state : null,
    ord:o ? `${o.id}:${o.cut}/${o.qty}c ${o.pcut}/${o.pq}p ${o.tcut}/${o.tq}t bed${S.bed}/${S.pbed}/${S.tbed} ${Math.round(o.time)}/${o.nodl ? '-' : o.deadline}` : null, del:S.delivered, kw:+v.load().toFixed(1), gen:v.genKW(),
    staff:[...v.staffObj.values()].map(c => `${c.st.name}:${c.st.role[0]}:${c.state}`).join(' ') }; });
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:5, xp:0, energy:100, focus:100, look }, extra);
// a finished level 3: field, press, warehouse, licence, scrapyard bought with Rusty's sweetener, the level 3 crew
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true }, plots:{ north:{ st:3 }, scrap:{ st:3, offer:'sweet' }, road:{ st:0 } }, perks:{ freeCrateMachine:true },
  level:3, levelUp:true, cash:6000, earned:30000, rep:78, delivered:34, ontime:33, shipped:220, pshipped:70, tshipped:70, orderSeq:34, fixed:20, timber:12, store:24, feed:6, tut:99, tutDone:true, mechIntro:true, officeSeen:true,
  coils:4, coilFeed:2, coilLeft:2, tfeed:2, tcoil:6, parts:4, water:4, cooler:20, wcClean:95,
  lv2:{ e0:2600, mill:2, buildT:18, seq:12, wh:2 }, wh:{ c:0, p:0, t:0, make:true }, lv3:{ e0:9000, f0:6, field:true, press:2, licence:2, seq:9, jam:true },
  restored:{ lights:true, paint:true, windows:true, coffee:true, yard:true, mill:true }, up:{ gen2:3, stack:2, saw:2, hands:2, tools:2, back:1, ppe:1, whcap:1 },
  ticks:{ '3:Money':true, '3:Standing':true, '3:Output':true, '3:Growth':true, '3:Papers':true }, owner:[-9.5, 9.6], nextId:11,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'loader'), staff(3, 'Kim', 'loader'), staff(4, 'Hank', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }), staff(6, 'Dale', 'operator', { mach:'tool' }),
         staff(7, 'June', 'electrician'), staff(8, 'Ray', 'mechanic'), staff(9, 'Pat', 'cleaner')] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.l3Built', { timeout:90000 });
await ev(() => { window.__iv.speed = 6; window.__iv.showLevelUp(); }); await sleep(800); await shot('l4_levelup');
await p.click('#luOk'); await until('level4', () => window.__iv.S.level === 4 && window.__iv.M.l4Built, 40);
await sleep(1000); await shot('l4_courier'); await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); });
const world = await ev(() => { const v = window.__iv; return { fenceDown:v.M.westFence.every(f => !f.visible) && !v.COL.has('westFenceA'), stall:!!v.M.stall, porch:!!v.M.porch, forklift:!!v.fork.o, pad:!!v.S.perks.freeCrateMachine }; });
console.log('level 4 world', JSON.stringify(world)); if (!world.fenceDown || !world.stall || !world.forklift || !world.porch) fail = true;
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(-11.5, 0, 8.4); }); await sleep(2500); await shot('l4_yard');
// the second crate machine on its pad (free: Rusty's)
await until('saw2Paid', () => window.__iv.S.lv4.saw2 >= 1, 40, () => { window.__iv.speed = 6; window.__iv.owner.o.position.set(-12.8, 0, 5.5); });
await until('saw2Built', () => window.__iv.S.lv4.saw2 === 2, 120, () => window.__iv.owner.o.position.set(-10.5, 0, 7.5));
await ev(() => { const v = window.__iv; v.S.cash = Math.max(v.S.cash, 2000); v.hire('operator'); v.hire('forklift'); });
const op2 = await ev(() => { const o = [...window.__iv.staffObj.values()].find(c => c.st.mach === 'saw2'); return o ? o.st.name : null; }); console.log('saw 2 operator', op2); if (!op2) fail = true;
await until('driverSeated', () => { const d = [...window.__iv.staffObj.values()].find(c => c.st.role === 'forklift'); return d && d.seated; }, 90);
// the owner runs the business; the crew, the forklift and (once promoted) the supervisor do the rest
const owner = () => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard();
  if (S.call) v.acceptCall();
  const sup = v.supervisor();
  if (S.order && S.order.guided4 && !sup) { const w = S.staff.find(x => x.role === 'loader'); v.promote(w.id); }
  if (sup && sup.state === "follow") { const h = v.zoneHint(); v.owner.o.position.set(h[0], 0, h[1]); return; }
  if (S.lv4.promoted && S.staff.filter(x => x.role === 'loader').length < 3) v.hire('loader');
  if (S.order && !S.order.briefed && !sup) v.briefOrder(v.owner);
  if (!S.delivery) { const steel = S.coils + S.coilFeed + S.tfeed; if (steel < 4 && S.coils <= 2) v.orderSteel(4); else if (S.store + S.timber + S.feed + S.lv4.feed2 < 30 && S.store <= 24) v.orderTimber(S.store <= 0 ? 48 : 24); }
  if (S.parts < 2) v.orderParts();
  if (v.overloaded && false) {}
  if (v.load() > v.genKW() && (S.up.gen3 || 0) < 3 && S.cash > 900) v.buyUpgrade('gen3');
  if (S.plots.road.st === 0 && S.cash > v.offerPrice('road', 'pay') + 1500) v.makeOffer('road', 'pay');
  const pos = S.order && S.order.ready && v.truck.state === 'docked' && !sup ? v.P.drop : S.cashPile > 0 ? v.P.cash : [12.0, 7.4];
  v.owner.o.position.set(pos[0], 0, pos[1]); };
await until('guidedOrder', () => { const o = window.__iv.S.order; return o && o.guided4; }, 300, owner);
console.log('guided order', JSON.stringify(await st()));
await until('promoted', () => window.__iv.S.lv4.promoted, 60, owner);
await until('postPlaced', () => !!window.__iv.S.lv4.post, 120, owner);
await ev(() => { window.__iv.speed = 1; window.__iv.owner.o.position.set(9.0, 0, 6.2); }); await sleep(2500); await shot('l4_zone');
const zone = await ev(() => { const v = window.__iv; return { post:v.S.lv4.post, r:v.zoneR(), inZone:[...v.staffObj.values()].filter(c => c.zone).map(c => c.st.name) }; }); console.log('supervisor post', JSON.stringify(zone));
await ev(() => { window.__iv.speed = 6; });
await until('forkTrip', () => (window.__iv.S.lv4.trips || 0) >= 1, 200, owner);
await ev(() => { const v = window.__iv; v.speed = 1; const f = v.fork.o.position; v.owner.o.position.set(f.x + 1.5, 0, f.z + 1.5); }); await sleep(2000); await shot('l4_forklift'); await ev(() => { window.__iv.speed = 6; });
await until('guidedDelivered', () => window.__iv.S.lv4.mixed3 >= 1, 600, owner);
console.log('guided order delivered', JSON.stringify(await st()));
const t0 = await ev(() => window.__iv.S.time); let maxKw = 0;
while (true) { await sleep(2500); await ev(owner);
  const s = await ev(() => ({ t:Math.round(window.__iv.S.time), done:window.__iv.S.levelUp, kw:window.__iv.load(), ch:window.__iv.charter().map(c => `${c.k}:${window.__iv.lineDone(c) ? 'OK' : Math.round(c.get(window.__iv.S))}`).join(' ') }));
  maxKw = Math.max(maxKw, s.kw);
  if ((s.t - t0) % 90 < 8) console.log(JSON.stringify(s), JSON.stringify(await st()));
  if (s.done) { console.log('LEVEL 4 CHARTER COMPLETE at game time', s.t); break; }
  if (s.t - t0 > mins * 60) { console.log('charter not finished in', mins, 'game minutes'); fail = true; break; } }
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(14.5, 0, 13.0); }); await sleep(2500); await shot('l4_frontage');
await ev(() => { const v = window.__iv; v.owner.o.position.set(9.2, 0, 12.4); }); await sleep(2000); await shot('l4_porch');
await ev(() => { const v = window.__iv; v.owner.o.position.set(2.6, 0, 3.2); }); await sleep(2000); await shot('l4_gen3');
const res = await ev(() => { const S = window.__iv.S; return { history:S.history.slice(0, 8).map(h => `#${h.id} ${h.qty}c ${h.pq}p ${h.tq}t ${h.late ? 'LATE' : 'ok'} ${h.t}/${h.dl}`), trips:S.lv4.trips, mixed3:S.lv4.mixed3, road:S.plots.road, gen3:S.up.gen3, staff:S.staff.map(s => s.role).join(','), unstuck:S.unstuck || 0, rescues:[S.sawRescues || 0, S.pipeRescues || 0, S.toolRescues || 0] }; });
console.log('max load kW', maxKw.toFixed(1)); console.log('diagnostics', JSON.stringify(res));
console.log(errs.length ? 'PAGE ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'no page errors');
await b.close(); process.exit(errs.length || fail ? 1 : 0);
