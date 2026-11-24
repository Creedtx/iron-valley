// v2.0 23 / QA-04 pacing: an average bot plays each level from its first morning to its charter; time against the target (minutes) on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/sim.mjs <url> <outDir> [fromLevel] [toLevel]
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

const [, , , , L0 = '1', L1 = '8'] = process.argv; const from = +L0, to = +L1;
const TARGET = { 1:30, 2:30, 3:40, 4:40, 5:50, 6:40, 7:50, 8:50 };
await ev(() => { window.__noLL = true; });
// the bot: one game second at a time, a player's habits; level actions when they can be afforded
const play = (secs, lv) => ev(([secs, lv]) => { const v = window.__iv, S = v.S; v.hold = true; let t = 0; const A = window.__bot ||= { signT:0, done:{} };
  const once = (k, f) => { if (!A.done[lv + k]) { if (f() !== false) A.done[lv + k] = true; } };
  const at = (x, z) => v.owner.o.position.set(x, 0, z);
  while (t < secs && !S.levelUp) {
    if (v.cardOpen) { const B = document.getElementById('storyBody'), btn = B.querySelector('[data-party]') || B.querySelector('[data-gift="clock"]') || B.querySelector('[data-bye]') || B.querySelector('[data-junehire]') || B.querySelector('[data-tommy]') || B.querySelector('[data-contract]') || B.querySelector('[data-pick="now"]') || B.querySelector('[data-payacc]:not([disabled])') || B.querySelector('[data-next]') || B.querySelector('.btn.primary:not([disabled])'); if (btn) btn.click(); if (v.cardOpen) v.nextCard(); }
    if (S.call) { const c0 = S.call, fits = c0 && c0.qty * 2 <= S.store + S.timber + S.feed + S.pallet + (S.wh ? S.wh.c : 0) + 24 && ((c0.pq || 0) * 2 / 4 + (c0.tq || 0) * 2 / 6) <= S.coils + (S.level >= 5 ? 8 : 4), bulk = v.termsOk(c0) && fits && (A.calls = (A.calls || 0) + 1) % 2 === 0; v.acceptCall(bulk ? 'bulk' : undefined); v.closeOffice(); }   // an average player takes the bulk deal on every other call
    if (S.level >= 7 && S.l7 && S.l7.board.length) { const c = S.l7.board.filter(c => (c.dock === 1 ? !S.order && v.truck.state === 'away' : !S.order2 && v.truckB.state === 'away' && S.l5.mill2 >= 2)).sort((a, b) => (b.hollis ? 1 : 0) - (a.hollis ? 1 : 0) || a.hrs - b.hrs)[0]; if (c && !S.call) v.takeCard(c.cid); }
    { const w = v.walker, o = v.owner; if (o.stack.length && o.carryType && ['crate', 'pipe', 'toolbox'].includes(o.carryType)) { if (w && w.state === 'wait' && (w.def.want === o.carryType || (w.def.want === 'tool' && o.carryType === 'toolbox'))) at(w.c.o.position.x + .7, w.c.o.position.z);
      else if (!A.carryT || (A.carryT += .05) > 3) { if (!A.carryT) A.carryT = .05; else { const k = o.carryType, n = o.stack.length; if (k === 'crate') { S.pallet += n; v.syncPallet(); } else if (k === 'pipe') { S.pipes += n; v.syncPipes(); } else S.tools = (S.tools || 0) + n; v.giveCarry(o, k, 0); A.carryT = 0; } } } else A.carryT = 0; }   // goods carried for a customer who has gone go back on the stack
    { const w = v.walker; if (w && w.state === 'wait' && w.got < w.n && !v.owner.stack.length) { const k = w.def.want, have = k === 'pipe' ? S.pipes : k === 'crate' ? S.pallet : S.tools || 0, n = Math.min(have, w.n - w.got, 4); if (n > 0) { if (k === 'pipe') { S.pipes -= n; v.syncPipes(); } else if (k === 'crate') { S.pallet -= n; v.syncPallet(); } else S.tools -= n; v.giveCarry(v.owner, k === 'tool' ? 'toolbox' : k, n); at(w.c.o.position.x + .7, w.c.o.position.z); } } }   // the owner serves the gate customer
    if (S.order && !S.order.briefed) v.briefOrder(null);
    if (S.order && S.order.ready && v.truck.state === 'docked' && !v.trip) { A.signT += .05; if (A.signT > 4) { A.signT = 0; v.signOrder(v.owner); } }
    if (S.order2 && S.order2.ready && v.truckB.state === 'docked') v.signOrder2(v.owner);
    if (S.level >= 2 && !S.delivery) {   // supplies as a player reads the tally board: steel first when the bay runs low, then the biggest timber lot that fits
      const tCap = S.level >= 4 ? 48 : 24, cCap = S.level >= 5 ? 10 : 6, room = tCap - S.store, lot = [48, 24, 12].find(q => q <= room && (q < 48 || S.level >= 4));
      const sLot = [8, 4, 2].find(n => S.coils + n <= cCap && (n < 8 || S.level >= 5));
      if (S.coils <= 2 && sLot) v.orderSteel(sLot); else if (lot && S.store + S.timber < tCap * .6) v.orderTimber(lot); else if (sLot && S.coils < cCap - 3) v.orderSteel(sLot); }
    for (const f of S.faults) if (v.FAULTS && v.FAULTS[f.kind] && v.FAULTS[f.kind].svc && !f.booked) v.bookService(v.FAULTS[f.kind].svc);   // service-book reminders: book them
    if (S.cashPile > 0 && !(v.clerkOn && v.clerkOn())) { S.cash += S.cashPile; S.earned += S.cashPile; S.cashPile = 0; }
    for (const st of S.staff) if (v.S.cash > 3000 && st.xp >= 0 && v.train && st.lv < 6) { const before = st.lv; v.train(st.id); if (st.lv !== before) break; }
    for (const r of ['operator', 'loader', 'helper', 'mechanic', 'forklift']) if (S.staff.filter(s => s.role === r).length < v.capOf(r) && S.cash > (S.level <= 3 ? 500 + 300 * S.level : 4000 + 20 * S.level ** 3)) v.hire(r);   // a player fills the posts a level opens (Bert and Danny on the Wednesday)
    v.closeOffice(); for (const st of S.staff) st.posted = true;
    if (S.l5 && S.l5.acc && !S.l5.acc.paid && S.cash > S.l5.acc.total) v.payAccounts();
    // a player's habits: spare parts on the shelf from Level 3; when nothing else wants the owner, go where the hint arrow points
    if (S.level >= 3 && S.parts < 1 && S.cash > 400) v.orderParts();
    // at Levels 1-2, while an order is on the machine and nothing else needs the owner, lend a hand feeding planks (+25%)
    if (S.level <= 2 && S.order && !S.order.ready && v.sawOn && !v.trip && !v.owner.stack.length && !(v.walker && v.walker.state === 'wait')) at(v.P.feedRing[0], v.P.feedRing[1]);
    // upgrades as a player buys them: power first when the generator is short, otherwise the cheapest step on offer, keeping a cushion for pay day
    A.upT = (A.upT || 0) + .05; if (A.upT > 20) { A.upT = 0; const can = v.UPGRADES.filter(u => v.upgVisible(u) && (S.up[u.id] || 0) < v.upSteps(u)).map(u => ({ u, c:v.upCost(u) })).filter(x => S.cash > x.c * 2 + 1500 * S.level);
      const pw = can.filter(x => x.u.kind === 'power'), key = can.filter(x => S.level === 8 && ['rawstore', 'heat'].includes(x.u.id)), pick = (v.pf() < .95 && pw.length ? pw : key.length ? key : can).sort((a, b) => a.c - b.c)[0];   /* at the steel works a player buys the raw store first: a train never overflows */ if (pick) v.buyUpgrade(pick.u.id); }
    // level actions
    if (lv === 1) { once('trip', () => { if (v.trip || S.order) return false; v.startTrip('visit', 'farm'); }); }
    if (lv === 2) { once('lanes', () => v.applyRestore('lanes', false)); once('gen2', () => { if (S.cash < 700) return false; v.buyUpgrade('gen2'); }); once('wh', () => { if (S.cash < 1600) return false; v.startWhBuild(false); v.finishWh(false); }); }
    if (lv === 3) { once('mains', () => { if (S.cash < 600) return false; v.applyMains && v.applyMains(); }); once('lic', () => { if (S.cash < 600 || !v.licReady()) return false; v.applyLicence(); }); once('scrap', () => { if (S.cash < 3000) return false; S.plots.scrap = { st:3 }; S.cash -= 2500; }); }
    if (lv === 4) { once('promote', () => { const op = S.staff.find(s => s.role === 'operator' && s.lv >= 5); if (!op) return false; v.promote(op.id); v.closeOffice(); const sup = v.supervisor(); if (!sup) return false; S.lv4.post = v.zoneHint(); sup.st.post = S.lv4.post; sup.state = 'toPatrol'; v.hire('operator'); v.closeOffice(); }); once('road', () => { if (S.cash < 7000) return false; S.plots.road = { st:3 }; S.cash -= 6300; v.finishPlot('road', false); }); }
    if (lv === 5) { once('shop', () => { if (S.cash < 20000) return false; S.plots.shop = { st:3 }; S.cash -= 15000; v.finishPlot('shop', false); v.startMill2Build(false); v.finishMill2(false); }); }
    if (lv === 6) { once('clerk', () => { v.hire('clerk'); v.closeOffice(); }); for (const k of ['pipe', 'tool', 'saw2']) once('refit' + k, () => { if (S.l6.refit || S.cash < v.REFIT[k].price + 5000) return false; v.orderRefit(k); }); for (const k of Object.keys(v.REFIT)) if (v.svcDue(k)) v.bookService(k); }
    if (lv === 7) {   // two supervisor zones: promote trained operators and lead each to a post (the office's Lead-to-post), Tommy takes the empty machine
      const sp = v.staffOf('supervisor'); if (sp.length < 2) { const op = S.staff.find(s => s.role === 'operator' && s.lv >= 5); if (op) { v.promote(op.id); v.closeOffice(); const all = v.staffOf('supervisor'); all.forEach((c, i) => { if (!c.st.post) { c.st.post = i ? [10, 4] : [0, 5]; if (!i) S.lv4.post = [0, 5]; c.o.position.set(...(i ? [10, 0, 4] : [0, 0, 5])); c.state = 'idle'; } }); } }
      if (v.cyrus && S.l7.siding === 1) at(...v.SURVEY_RING); }
    if (lv === 8) { once('hd', () => { if (S.cash < 26000) return false; v.applyRestore('hd', true); }); once('furn', () => { if (!S.l8.hd) return false; v.applyRestore('furnace', true); }); once('foreman', () => { if (!S.l8.joeAsked) return false; v.hire('foreman'); v.closeOffice(); }); once('store', () => { if (!S.l8.zonesShown || S.cash < 16000) return false; v.chooseStore('A'); });
      if (v.rail && v.rail.st === 'sign') at(...v.SIGN_RING); else if (S.l8.krane.st === 1 && S.cash >= S.l8.krane.price) at(...v.DAIRY_PAD); else if (S.l8.scrap + S.l8.ore < 4 && S.cash > 5000) v.buyRaw(); }
    v.step(.05); t += .05; }
  v.hold = false; const D = window.__lineT ||= {}; for (const c of v.charter()) { const k = lv + c.id; if (!(k in D) && v.lineDone(c)) D[k] = Math.round((S.time - (window.__lvT0 || 0)) / 60); }
  return { t, up:S.levelUp, at:v.charter().map(c => c.id + '@' + (D[lv + c.id] ?? '-') + (c.id === 'money' ? '' : '')), lines:v.charter().filter(c => !v.lineDone(c)).map(c => c.text + ' ' + v.lineText(c) + (c.id === 'insp' && S.l6 ? ' ' + JSON.stringify(S.l6.inspRes) + ` pal ${S.pallet}/${v.palletCap()} pipes ${S.pipes}` : '')) }; }, [secs, lv]);
const res = [];
// the start of each level, the way the tests reach it (earlier levels' buildings done)
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 600; S.orderSeq = 4; S.delivered = 4; S.sales.told = true; v.evNext = 60; v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; });
for (let lv = 1; lv <= to; lv++) {
  if (lv > 1) await ev(async lv => { const v = window.__iv, S = v.S; S.levelUp = true; await v.startLevel(lv); while (v.cardOpen) v.nextCard(); v.closeOffice();
    if (lv === 2) { v.startMillBuild(false); v.finishMill(false); } if (lv === 3) { S.plots.north = { st:3 }; v.buyField(false); v.startPressBuild(false); v.finishPress(false); } if (lv === 4) { S.plots.scrap = { st:3 }; v.openScrapyard(false); v.startSaw2Build(false); v.finishSaw2(false); } }, lv);
  if (lv < from) { await ev(lv => { const v = window.__iv, S = v.S; S.cash += [0, 5000, 12000, 30000, 70000, 150000, 300000, 700000][lv]; S.earned += 1e9; S.rep = Math.max(S.rep, 66 + lv);
    if (lv === 2) { S.restored.lanes = true; S.up.gen2 = Math.max(1, S.up.gen2 || 0); } if (lv === 3) { S.mains = { st:3, t:0 }; S.lv3.licence = 2; } }, lv); continue; }   // what an earlier level's charter left behind: lanes, Mk II, mains, licence
  if (lv === from && from > 1) await ev(lv => { const v = window.__iv, S = v.S; S.store = lv >= 4 ? 48 : 24; S.coils = lv >= 5 ? 8 : 6; v.syncStore && v.syncStore(); v.syncCoilBay && v.syncCoilBay(); }, lv);   // a works arrives at a level with its stock room full
  const t0 = await ev(() => window.__iv.S.time); let r = null, total = 0; const cap = TARGET[lv] * 60 * 2.2;
  await ev(() => { window.__lvT0 = window.__iv.S.time; });
  let lastT = -1, frozen = 0;
  while (total < cap) { r = await play(60, lv); total += r.t; if (r.up) break;
    const st = await ev(() => { const v = window.__iv, S = v.S, D = S.day || {}; return { t:S.time, why:JSON.stringify({ dm:Math.round(v.dayMin()), n:v.dayNo(), Dn:D.n, closing:D.closing && { t:Math.round(D.closing.t), shut:!!D.closing.shut, card:!!D.closing.card, at:D.closing.at }, yard:v.yardEmpty(), card:v.cardOpen, story:(document.getElementById('storyBody') || {}).innerText?.slice(0, 120), party:S.gus.party, gift:S.gus.gift, retired:S.gus.retired, up:S.levelUp, trip:!!v.trip, lorry:[v.truck.state, v.truckB && v.truckB.state] }) }; });
    if (st.t === lastT) { if (++frozen === 2) { console.log(`  FROZEN at L${lv} ${Math.round(total / 60)}m: ${st.why}`); fail.push('clock frozen at L' + lv); } } else frozen = 0; lastT = st.t;
    if (process.env.SIMDBG) console.log('  ' + Math.round(total / 60) + 'm', await ev(() => { const v = window.__iv, S = v.S, o = S.order; return JSON.stringify({ o:o && { q:o.qty, pq:o.pq, tq:o.tq, br:o.briefed, rd:o.ready }, call:!!S.call, tr:v.truck.state, pipes:S.pipes, coils:S.coils, cl:S.coilLeft, cf:S.coilFeed, pOn:v.pipeOn, pr:v.pipeReason && v.pipeReason().label, sOn:v.sawOn, sr:v.sawReason && v.sawReason().label, pal:S.pallet, store:S.store, timber:S.timber, feed:S.feed, deliv:S.delivery && (S.delivery.kind || S.delivery.what || 1), sup:v.sup && v.sup.state, tb:v.trolleyBy, dm:Math.round(v.dayMin()), cl:S.day && S.day.closing ? [Math.round(S.day.closing.t), S.day.closing.shut ? 'S' : '', S.day.closing.card ? 'C' : '', v.yardEmpty() ? 'E' : ''].join('') : '', party:S.gus && S.gus.party, l8:S.l8 && S.l8.lit ? [S.l8.scrap, S.l8.ore, S.l8.dayStock ? 'S' : '', S.l8.dayOver ? 'O' : '', S.l8.trainDay, v.dayNo()].join('/') : undefined, cash:Math.round(S.cash), rep:Math.round(S.rep), card:v.cardOpen, ow:[+v.owner.o.position.x.toFixed(1), +v.owner.o.position.z.toFixed(1)], st:v.owner.stack.length, w:v.walker && v.walker.state, trip:!!v.trip, staff:S.staff.map(s => s.role[0] + (s.posted ? '' : '!')).join('') }); })); }
  const mins = Math.round(total / 60); const ok = r.up && Math.abs(mins - TARGET[lv]) <= TARGET[lv] * .2;
  console.log(`L${lv}: ${r.up ? 'charter done' : 'NOT done'} in ${mins} game min (target ${TARGET[lv]} ±20%)${r.up ? '' : ' · open: ' + r.lines.join(' · ')} · lines done at min: ${r.at.join(' ')}`); res.push({ lv, mins, up:r.up, ok });
  if (!r.up) await ev(() => { window.__iv.S.levelUp = true; });
}
for (const x of res) check(x.ok, `QA-04 L${x.lv} within ±20% of ${TARGET[x.lv]} min (${x.mins} min${x.up ? '' : ', not finished'})`);
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nSIM CLEAN'); await b.close(); process.exit(fail.length ? 1 : 0);
