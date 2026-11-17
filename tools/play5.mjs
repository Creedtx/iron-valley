// Level 5 playthrough (build 0.15): level-up from a finished level 4. The frontage becomes dock 2 with a white
// truck; Priya Nair and the first wage bill paid at the desk; the Valley Bank account; dock 2 orders from stock
// loaded by the forklift (and a rush order); the second pipe mill; a late truck and the rush haulier; a loan;
// Ada Finch's corner shop; the charter.
//   node tools/play5.mjs <url> <outDir> [game-minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/l5', mins = '30'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
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
const st = () => ev(() => { const v = window.__iv, S = v.S, o = S.order, o2 = S.order2, L = S.l5;
  return { lv:S.level, t:Math.round(S.time), cash:Math.round(S.cash), rep:Math.round(S.rep), del:S.delivered, ot:S.ontime - L.ot0, earned:Math.round(S.earned - L.e0), wh:`${S.wh.c}/${S.wh.p}/${S.wh.t}`, rack2:L.rack2, mill2:L.mill2,
    bill:L.bill ? `#${L.bill.id} ${L.bill.total} due ${Math.round(L.bill.due - S.time)}${L.bill.late ? ' LATE' : ''}` : null, paid:`${L.onTime}/${L.paid}`, acct:L.account, loan:L.loan ? L.loan.left : 0,
    o1:o ? `${o.id}:${o.cut}/${o.qty}c ${o.pcut}/${o.pq}p ${o.tcut}/${o.tq}t ${Math.round(o.time)}/${o.deadline}${o.lateBy ? ' late+' + o.lateBy : ''}` : null, t1:v.truck.state,
    o2:o2 ? `${o2.id}${o2.rush ? 'R' : ''}:${o2.l.c}/${o2.qty}c ${o2.l.p}/${o2.pq}p ${o2.l.t}/${o2.tq}t ${Math.round(o2.time)}/${o2.deadline}${o2.lateBy ? ' late+' + o2.lateBy : ''}` : null, t2:v.truckB.state, fork:`${v.fork.state}:${v.fork.task}`,
    shop:S.plots.shop.st, staff:S.staff.length }; });
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:6, xp:0, energy:100, focus:100, look }, extra);
// a finished level 4: the yard with its second saw and forklift, a promoted supervisor at her post, the road frontage owned
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true, council:true }, plots:{ north:{ st:3 }, scrap:{ st:3, offer:'sweet' }, road:{ st:3 } }, perks:{ freeCrateMachine:true },
  level:4, levelUp:true, cash:9000, earned:60000, rep:76, delivered:48, ontime:46, shipped:400, pshipped:150, tshipped:140, orderSeq:48, fixed:30, timber:12, store:40, feed:6, tut:99, tutDone:true, mechIntro:true, officeSeen:true,
  coils:5, coilFeed:2, coilLeft:2, tfeed:2, tcoil:6, parts:4, water:5, cooler:20, wcClean:95,
  lv2:{ e0:2600, mill:2, buildT:18, seq:12, wh:2 }, wh:{ c:20, p:10, t:8, make:true }, lv3:{ e0:9000, f0:6, field:true, press:2, licence:2, seq:9, jam:true },
  lv4:{ e0:30000, saw2:2, feed2:8, pallet2:0, promoted:true, post:[10.05, 4.15], mixed3:3, seq:9 },
  restored:{ lights:true, paint:true, windows:true, coffee:true, yard:true, mill:true }, up:{ gen2:3, gen3:2, stack:2, saw:2, pipe:1, press:1, hands:2, tools:2, back:1, ppe:1, whcap:1, autofeed:1 },
  ticks:{ '4:Money':true, '4:Standing':true, '4:Output':true, '4:Growth':true, '4:People':true }, owner:[12.0, 7.4], nextId:14,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'supervisor'), staff(3, 'Kim', 'loader'), staff(4, 'Hank', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }), staff(6, 'Dale', 'operator', { mach:'tool' }),
         staff(7, 'June', 'electrician'), staff(8, 'Ray', 'mechanic'), staff(9, 'Pat', 'cleaner'), staff(10, 'Earl', 'operator', { mach:'saw2' }), staff(11, 'Bev', 'forklift'), staff(12, 'Dot', 'loader')] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.l4Built', { timeout:90000 });
await ev(() => { window.__iv.speed = 6; window.__iv.showLevelUp(); }); await sleep(800); await shot('l5_levelup');
await p.click('#luOk'); await until('level5', () => window.__iv.S.level === 5 && window.__iv.M.l5Built, 60);
await sleep(1000); await shot('l5_courier');
const world = await ev(() => { const v = window.__iv; return { dock2:!!v.M.dock2, truck2:!!v.M.truck2, bank:!!v.M.bank, shop:!!v.M.shop, fenceOpen:!v.COL.has('frontFenceE'), car:!v.COL.has('car') }; });
console.log('level 5 world', JSON.stringify(world)); if (Object.values(world).some(x => !x)) fail = true;
// 1. the first bill: Priya's card, then the owner walks to the desk and pays it on the Finance page
await until('firstBill', () => !!window.__iv.S.l5.bill, 40);
const bill = await ev(() => ({ ...window.__iv.S.l5.bill, met:!!window.__iv.S.met.priya, card:window.__iv.cardOpen }));
console.log('first bill', JSON.stringify(bill)); if (!bill.met) { console.log('FAIL: Priya never introduced the bill'); fail = true; }
await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); window.__iv.speed = 1; window.__iv.owner.o.position.set(window.__iv.P.deskRing[0], 0, window.__iv.P.deskRing[1] + 1.2); });
await sleep(400); await ev(() => window.__iv.owner.o.position.set(window.__iv.P.deskRing[0], 0, window.__iv.P.deskRing[1])); await sleep(1500);
const fin = await ev(() => ({ open:!document.getElementById('office').hidden, finance:!!document.querySelector('[data-paybill]') }));
console.log('desk opens Finance', JSON.stringify(fin)); if (!fin.finance) fail = true;
await shot('l5_finance');
await ev(() => { const t = document.querySelector('[data-tab="finance"]'); if (t) t.click(); }); await sleep(300); await ev(() => document.querySelector('[data-paybill]').click()); await sleep(400);
const paid = await ev(() => ({ bill:window.__iv.S.l5.bill, onTime:window.__iv.S.l5.onTime })); console.log('paid', JSON.stringify(paid)); if (paid.bill || paid.onTime !== 1) fail = true;
await ev(() => window.__iv.closeOffice());
// 2. the bank: cross the road, stand at the door
await ev(() => { const v = window.__iv; v.speed = 2; v.owner.o.position.set(20.0, 0, 13.0); }); await sleep(600);
for (const [x, z] of [[22.5, 13.8], [25.5, 14.6], [28.0, 14.9], [29.2, 14.75]]) { await ev(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), [x, z]); await sleep(500); }
await sleep(1200); await shot('l5_bank');
await until('account', () => window.__iv.S.l5.account, 20, () => window.__iv.owner.o.position.set(29.2, 0, 14.75));
console.log('bank', JSON.stringify(await ev(() => ({ acct:window.__iv.S.l5.account, eldon:!!window.__iv.S.met.eldon, ownerAt:[window.__iv.owner.o.position.x, window.__iv.owner.o.position.z].map(n => +n.toFixed(2)) }))));
await ev(() => { while (window.__iv.cardOpen) window.__iv.nextCard(); window.__iv.closeOffice(); });
// the owner runs the business from here; the crew, the forklift and the supervisor do the rest
const owner = () => { const v = window.__iv, S = v.S, L = S.l5; while (v.cardOpen) v.nextCard();
  if (S.call) v.acceptCall();
  if (L.bill && S.cash >= L.bill.total) v.payBill();
  if (L.bill && S.cash < L.bill.total && L.account && (L.loan ? L.loan.left : 0) < 10000) v.takeLoan(5000);
  if (S.order && !S.order.briefed && !v.supervisor()) v.briefOrder(v.owner);
  // one flatbed brings both: timber first when the saws are short, steel when the mills are
  if (!S.delivery) { const steel = S.coils + S.coilFeed + S.tfeed + L.coil2, wood = S.store + S.timber + S.feed + S.lv4.feed2;
    if (wood < 24 && S.store <= 24) v.orderTimber(S.store <= 8 ? 48 : 24); else if (steel < 8 && S.coils <= 2) v.orderSteel(8); else if (wood < 40 && S.store <= 24) v.orderTimber(24); }
  if (S.parts < 2) v.orderParts();
  if (v.load() > v.genKW() && (S.up.gen3 || 0) < 3 && S.cash > 1500) v.buyUpgrade('gen3');
  if (v.mill2Ready() && !S.staff.some(x => x.mach === 'pipe2')) v.hire('operator');
  if (S.order2 && !S.staff.some(x => x.role === 'forklift')) v.hire('forklift');
  if ((S.order && S.order.lateBy && v.truck.state === 'away') || (S.order2 && S.order2.lateBy && v.truckB.state === 'away')) { S.l5.hauled = (S.l5.hauled || 0) + 1; v.rushHaulier(S.order && S.order.lateBy ? 1 : 2); }
  if (S.plots.shop.st === 0 && S.cash > v.offerPrice('shop', 'sweet') + 3000) v.makeOffer('shop', 'sweet');
  const pad = !L.mill2 && S.cash > 7500 + 1500;
  const pos = pad ? [13.9, 17.25] : S.cashPile > 0 ? v.P.cash : [12.0, 7.4];
  v.owner.o.position.set(pos[0], 0, pos[1]); };
await ev(() => { window.__iv.speed = 6; });
await until('dock2Order', () => !!window.__iv.S.order2, 200, owner);
console.log('dock 2 order', JSON.stringify(await st()));
await until('truck2Docked', () => window.__iv.truckB.state === 'docked', 200, owner);
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(14.2, 0, 15.2); }); await sleep(2500); await shot('l5_dock2');
await ev(() => { window.__iv.speed = 6; });
await until('dock2Delivered', () => (window.__iv.S.history || []).some(h => h.dock === 2), 400, owner);
console.log('dock 2 delivered', JSON.stringify(await st()));
await until('mill2', () => window.__iv.mill2Ready(), 400, owner);
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(14.6, 0, 16.4); }); await sleep(2500); await shot('l5_mill2');
await ev(() => { window.__iv.speed = 6; });
// the rest of the charter
const t0 = await ev(() => window.__iv.S.time); let last = 0;
while (true) { await sleep(2500); await ev(owner);
  const s = await ev(() => ({ t:Math.round(window.__iv.S.time), done:window.__iv.S.levelUp, ch:window.__iv.charter().map(c => `${c.k}:${window.__iv.lineDone(c) ? 'OK' : Math.round(c.get(window.__iv.S))}`).join(' ') }));
  if (s.t - last > 90) { last = s.t; console.log(JSON.stringify(s), JSON.stringify(await st())); }
  if (s.done) { console.log('LEVEL 5 CHARTER COMPLETE at game time', s.t, '(', Math.round((s.t - t0) / 60 * 10) / 10, 'min after the bank )'); break; }
  if (s.t - t0 > mins * 60) { console.log('charter not finished in', mins, 'game minutes'); fail = true; break; } }
await ev(() => { if (!document.getElementById('levelup').hidden) document.getElementById('luOk').click(); }); await sleep(600);
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(17.0, 0, 18.6); }); await sleep(2500); await shot('l5_frontage');
await ev(() => { const v = window.__iv; v.camZoom = 2.6; v.camLock = [19, 15]; }); await sleep(1500); await shot('l5_overview'); await ev(() => { window.__iv.camZoom = 1; window.__iv.camLock = null; });
const res = await ev(() => { const S = window.__iv.S, L = S.l5; return { history:S.history.slice(0, 8).map(h => `#${h.id}${h.dock === 2 ? 'D2' : ''}${h.rush ? 'R' : ''} ${h.qty}c ${h.pq}p ${h.tq}t ${h.late ? 'LATE' : 'ok'} ${h.t}/${h.dl}`), bills:`${L.onTime} on time of ${L.paid}`, spent:L.spent, loan:L.loan, borrowed:L.borrowed || 0, rush:L.rushDone || 0, late:L.lateTrucks || 0, hauled:L.hauled || 0, trips2:L.trips2 || 0, unstuck:S.unstuck || 0, unstuckLog:(S.unstuckLog || []).slice(-10), rescues:[S.sawRescues || 0, S.pipeRescues || 0, S.toolRescues || 0] }; });
console.log('diagnostics', JSON.stringify(res));
if (!(res.trips2 > 0)) { console.log('FAIL: the forklift never loaded dock 2'); fail = true; }
console.log(errs.length ? 'PAGE ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'no page errors');
await b.close(); process.exit(errs.length || fail ? 1 : 0);
