// Headless play-through of level 1 (build 0.13): the owner starts alone. Grandfather's letter, Gus, the first
// call taken at the desk, crates cut by hand at the saw, carried to the truck, signed and collected; then the
// first two hires take over and the owner only manages until the charter is done.
//   node tools/play.mjs <url> <outDir> [game-minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/l1', mins = '30'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const logs = []; p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GPU stall|ReadPixels|ERR_FAILED|Failed to load resource/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
// a brand-new player: storage cleared before the game script runs (a reload's unload save cannot bring it back)
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('fresh')) { sessionStorage.setItem('fresh', '1'); try { localStorage.clear(); } catch(e){} } });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner', { timeout:90000 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = (f, ...a) => p.evaluate(f, ...a);
const tp = xz => ev(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), xz);
const st = () => ev(() => { const v = window.__iv, S = v.S, o = S.order; return { tut:S.tut, done:S.tutDone, cash:Math.round(S.cash), earned:S.earned, rep:Math.round(S.rep), del:S.delivered,
  ord:o ? `${o.id}:${o.cut}/${o.qty} bed${S.bed} ${o.ready ? 'ready' : ''} ${Math.round(o.time)}/${o.nodl ? '-' : o.deadline}` : null, truck:v.truck.state, pile:S.cashPile, fuel:Math.round(S.power.fuel), feed:S.feed, timber:S.timber, store:S.store, pallet:S.pallet,
  carry:`${v.owner.carryType}:${v.owner.stack.length}`, card:v.cardOpen, staff:[...v.staffObj.values()].map(c => `${c.st.name}:${c.state}`).join(' '), obj:document.getElementById('objT').textContent }; });
const P = await ev(() => window.__iv.P);
const shot = n => p.screenshot({ path:`${out}/${n}.png` });
let ok = true; const cards = [];
async function until(name, cond, act, secs = 150){ const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(() => window.__iv.cardOpen)) { cards.push(await ev(() => document.querySelector('#storyBody').className)); await ev(() => window.__iv.nextCard()); } if (await ev(cond)) return true; if (act) await act(); await wait(600); }
  console.log('STUCK at', name, JSON.stringify(await st())); await shot('stuck_' + name); ok = false; return false; }
// the opening: the letter, then Gus
await wait(1500); await shot('a0_letter');
const first = await ev(() => ({ card:window.__iv.cardOpen, staff:window.__iv.S.staff.length, cash:window.__iv.S.cash, rep:window.__iv.S.rep }));
console.log('opening', JSON.stringify(first)); if (!first.card || first.staff !== 0 || first.cash !== 400) ok = false;
await p.click('#storyBody [data-next].primary'); await wait(1200); await shot('a1_gus');
while (await ev(() => window.__iv.cardOpen)) { await ev(() => document.querySelector('#storyBody .btn.primary').click()); await wait(400); }
await ev(() => window.__iv.speed = 6);
await shot('a2_alone');
// 1. the phone: walk to the desk and take the order
ok &&= await until('phone', () => !!window.__iv.S.call, () => tp([4, 7.5]));
await tp(P.deskRing); await wait(1200); await shot('b1_call');
await ev(() => document.querySelector('[data-accept]').click()); await wait(400); await ev(() => window.__iv.closeOffice());
ok &&= await until('accepted', () => !!window.__iv.S.order && window.__iv.S.order.nodl);
// 2. stand at the saw: the owner cuts the crates
await tp(P.op); await wait(2500); await shot('b2_owner_saw');
ok &&= await until('cutByHand', () => { const o = window.__iv.S.order; return o && o.cut >= o.qty; }, () => tp(P.op));
console.log('cut by hand', JSON.stringify(await st()));
// 3. carry the crates to the truck, a few at a time
ok &&= await until('truckDocked', () => window.__iv.truck.state === 'docked', null, 120);
let trips = 0;
ok &&= await until('loaded', () => window.__iv.S.order && window.__iv.S.order.ready, async () => {
  const s = await ev(() => ({ c:window.__iv.owner.stack.length, pal:window.__iv.S.pallet }));
  if (s.c) await tp([P.drop[0] - .2, P.drop[1]]); else if (s.pal) { trips++; await tp([P.pallet[0], P.pallet[1] + .7]); } }, 120);
await shot('b3_carry');
console.log('loaded by hand in', trips, 'trips', JSON.stringify(await st()));
// 4. sign, 5. collect
await tp(P.drop); ok &&= await until('signed', () => window.__iv.S.delivered >= 1, () => tp(P.drop));
ok &&= await until('collected', () => window.__iv.S.cashPile === 0 && window.__iv.S.cash > 400, () => tp(P.cash));
console.log('first order done', JSON.stringify(await st()));
// 6./7. hire an operator and a loader
await tp(P.deskRing); await wait(800);
ok &&= await until('hireOp', () => window.__iv.S.staff.some(s => s.role === 'operator'), () => ev(() => { const v = window.__iv; v.openOffice('staff'); const btn = document.querySelector('[data-hire="operator"]'); if (btn && !btn.disabled) btn.click(); }), 30);
ok &&= await until('hireLoader', () => window.__iv.S.staff.some(s => s.role === 'loader'), () => ev(() => { const v = window.__iv; v.openOffice('staff'); const btn = document.querySelector('[data-hire="loader"]'); if (btn && !btn.disabled) btn.click(); }), 30);
await shot('b4_hired'); await ev(() => window.__iv.closeOffice());
ok &&= await until('tutDone', () => window.__iv.S.tutDone, null, 20);
// the crew works; the owner only manages: calls, timber, signing, cash, the back yard pad
const manage = () => ev(() => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard();
  if (S.call) v.acceptCall();
  if (!S.delivery && S.store + S.timber + S.feed < 12) v.orderTimber(S.store <= 4 ? 24 : 12);
  // the objective line suggests a second loader once the cash is there; a player follows it
  if (S.staff.filter(x => x.role === 'loader').length < 2 && S.cash >= 200 && S.delivered >= 2) v.hire('loader');
  // instructing is the owner's job: walk up to the operator to brief the order
  const op = [...v.staffObj.values()].find(c => c.st.role === 'operator');
  const pos = S.order && !S.order.briefed && op ? [op.o.position.x + .7, op.o.position.z + .5] : S.order && S.order.ready && v.truck.state === 'docked' ? v.P.drop : S.cashPile > 0 ? v.P.cash : S.delivered >= 2 && !S.restored.yard && S.cash > 60 ? [-2.0, 4.7] : [9.5, 6.5];
  v.owner.o.position.set(pos[0], 0, pos[1]); });
const t0 = await ev(() => window.__iv.S.time); let stalls = 0, handSaw = 0, last = 0;
while (true) { await wait(1500); await manage();
  const s = await ev(() => ({ t:Math.round(window.__iv.S.time), lu:window.__iv.S.levelUp, st:window.__iv.stalled, by:window.__iv.sawOn && window.__iv.S.staff.length && [...window.__iv.staffObj.values()].every(c => c.state !== 'work') ? 1 : 0,
    ch:window.__iv.charter().map(c => `${c.k}:${window.__iv.lineDone(c) ? 'OK' : Math.round(c.get(window.__iv.S))}`).join(' ') }));
  if (s.st) stalls++; handSaw += s.by;
  if (s.t - last > 120) { last = s.t; console.log(JSON.stringify(s), JSON.stringify(await st())); }
  if (s.lu) { console.log('LEVEL 1 CHARTER COMPLETE at game time', s.t, '(hand-work part ended at', Math.round(t0), ')'); break; }
  if (s.t - t0 > mins * 60) { console.log('charter not finished in', mins, 'game minutes', JSON.stringify(await st())); ok = false; break; } }
await shot('c1_end');
const res = await ev(() => { const S = window.__iv.S; return { history:S.history.map(h => `#${h.id} ${h.qty}c ${h.late ? 'LATE' : 'ok'} ${h.t}/${h.dl}`), rep:S.rep, faults:S.faults.length, fixed:S.fixed, stalls:S.stallSeen, sawRescues:S.sawRescues || 0, errors:S.errors || 0 }; });
console.log('cards seen', JSON.stringify(cards)); console.log('result', JSON.stringify(res), 'stall samples', stalls);
if (res.faults || res.fixed) { console.log('FAIL: level 1 must have no breakdowns'); ok = false; }
console.log(logs.length ? 'LOGS ' + JSON.stringify(logs.slice(0, 6)) : 'no page errors');
await b.close(); process.exit(ok && !logs.some(l => l.startsWith('pageerror') || l.startsWith('error')) ? 0 : 1);
