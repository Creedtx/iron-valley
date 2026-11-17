// Build 0.11 checks: the order #34 deadlock and the level 2 warehouse.
//  1. Order #34 replay: the ticket says all 8 crates are cut, but only 4 are on the truck and the pallet is
//     empty (crates lost from a loader's hands by a reload in build 0.10). Walt must cut the missing 4.
//  2. Warehouse: contractor builds it, the saw and the mill make stock between orders, loaders shelve it,
//     a new order ships from stock, and a save taken while crates are in someone's hands loses none.
//   node tools/warehouse_check.mjs <url>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:4, xp:0, energy:100, focus:100, look }, extra);
async function open(save){
  const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
  await p.setRequestInterception(true);
  p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
    if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
    if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  // story cards (Big Tom, Vera Lind) pause the game until tapped; this check is about the warehouse, so tap them away
  await p.evaluateOnNewDocument(() => setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200));
  await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
  await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.S', { timeout:90000 });
  await p.waitForFunction('window.__iv.S.level >= 2 && window.__iv.M.mill', { timeout:90000 });
  return p;
}
const base = { v:6, level:2, cash:6000, earned:9000, rep:80, delivered:30, ontime:28, shipped:200, pshipped:14, orderSeq:33, timber:12, store:24, feed:6, tut:99, tutDone:true, mechIntro:true, officeSeen:true,
  restored:{ lights:true, paint:true, windows:true, coffee:true, yard:true, mill:true }, up:{ gen2:2, stack:1 }, coils:4, coilFeed:2, coilLeft:4, owner:[8.4, 6.0], nextId:9,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'loader'), staff(3, 'Kim', 'loader'), staff(4, 'Gus', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }), staff(6, 'Dale', 'supervisor')] };
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };

// 1. order #34 as the player saw it
{ const p = await open(Object.assign({}, base, { lv2:{ e0:3000, mill:2, buildT:18, seq:3 }, pallet:0, bed:4, pbed:5, pipes:0,
    order:{ id:34, qty:8, pq:5, cut:8, pcut:5, briefed:true, met:true, ready:false, time:150, deadline:200, pay:1500, client:'Harlow Builders', t1:20, tc:120 } }));
  await p.evaluate(() => { window.__iv.speed = 6; window.__iv.truck.state = 'docked'; });
  const r0 = await p.evaluate(() => ({ left:window.__iv.orderLeft(), cut:window.__iv.S.order.cut, why:window.__iv.sawReason().op[1] }));
  check(r0.left === 4 && r0.cut === 4, `after load the order needs 4 more crates (left ${r0.left}, ticket cut ${r0.cut}, saw: ${r0.why})`);
  let cutRan = false, done = false;
  for (let i = 0; i < 120 && !done; i++) { await sleep(500); const s = await p.evaluate(() => ({ on:window.__iv.sawOn, ready:!window.__iv.S.order || window.__iv.S.order.ready }));
    cutRan ||= s.on; done = s.ready; }
  const r1 = await p.evaluate(() => ({ bed:window.__iv.S.bed, o:window.__iv.S.order && window.__iv.S.order.ready, ticket:document.getElementById('ticket').innerText.replace(/\s+/g, ' ') }));
  check(cutRan && done, `Walt cut the missing crates and the truck loaded (bed ${r1.bed}, ticket: ${r1.ticket.slice(0, 80)})`);
  check(!p.errs.length, `no page errors ${p.errs.slice(0, 2).join(' | ')}`); await p.close(); }

// 2. warehouse
{ const p = await open(Object.assign({}, base, { lv2:{ e0:3000, mill:2, buildT:18, seq:3 }, pallet:0, bed:0, pipes:0, order:null }));
  const r0 = await p.evaluate(() => ({ unl:window.__iv.whUnlocked(window.__iv.S), pad:!!document.querySelector('.lab, body') }));
  check(r0.unl, 'warehouse pad unlocked (level 2, mill built, yard cleared, 14 pipes shipped)');
  await p.evaluate(() => { window.__iv.S.cash -= 1500; window.__iv.startWhBuild(true); window.__iv.speed = 6; });
  await p.waitForFunction('window.__iv.S.lv2.wh === 2', { timeout:120000 }).catch(() => {});
  const built = await p.evaluate(() => ({ wh:window.__iv.S.lv2.wh, m:!!window.__iv.M.wh, b:!!window.__iv.M.whBuilder }));
  check(built.wh === 2 && built.m, `contractor built the warehouse (state ${built.wh})`);
  await p.screenshot({ path:'/tmp/claude-0/-home-claude/f033d288-9398-5232-a6ec-3b445b16baec/scratchpad/wh_built.png' });
  // no order: make to stock until there is a working stock, check the save while crates are in hands
  let saveOk = null, ran = false;
  for (let i = 0; i < 240; i++) { await sleep(500);
    const s = await p.evaluate(() => { const iv = window.__iv, S = iv.S;
      let held = 0, heldP = 0; for (const c of iv.staffObj.values()) { if (c.carryType === 'crate') held += c.stack.length; if (c.carryType === 'pipe') heldP += c.stack.length; }
      let cons = null; if (held && heldP === 0) { iv.save(); const j = JSON.parse(localStorage.getItem('iron-valley-save')); cons = j.pallet + j.wh.c === S.pallet + held + S.wh.c; }
      return { c:S.wh.c, p:S.wh.p, run:iv.sawOn || iv.pipeOn, cons, why:iv.sawReason().op[1] }; });
    ran ||= s.run; if (s.cons !== null && saveOk === null) saveOk = s.cons;
    if (s.c >= 8 && s.p >= 3 && saveOk !== null) break; }
  const st = await p.evaluate(() => ({ c:window.__iv.S.wh.c, p:window.__iv.S.wh.p, pal:window.__iv.S.pallet, why:window.__iv.sawReason().op[1] }));
  check(ran && st.c >= 8 && st.p >= 3, `made to stock with no order: ${st.c} crates, ${st.p} pipes in the warehouse (pallet ${st.pal}, saw: ${st.why})`);
  check(saveOk === true, `a save with crates in hands keeps every crate (${saveOk})`);
  await p.evaluate(() => { window.__iv.owner.o.position.set(-6.7, 0, 5.9); }); await sleep(3000);
  await p.screenshot({ path:'/tmp/claude-0/-home-claude/f033d288-9398-5232-a6ec-3b445b16baec/scratchpad/wh_yard.png' });
  // a new order: shipped from stock, no new cutting needed for the covered part
  // stop making stock and let the loaders shelve what is on the line, so the next order must come from the warehouse
  await p.evaluate(() => { window.__iv.S.wh.make = false; });
  await p.waitForFunction(() => { const S = window.__iv.S; let h = 0; for (const c of window.__iv.staffObj.values()) if (c.carryType === 'crate' || c.carryType === 'pipe') h++; return S.pallet === 0 && S.pipes === 0 && !h; }, { timeout:120000 }).catch(() => {});
  const cuts0 = await p.evaluate(() => window.__iv.S.made);
  await p.evaluate(() => { const S = window.__iv.S; S.call = { qty:6, pq:3, client:'Harlow Builders', deadline:220, pay:1200 }; window.__iv.acceptCall(); });
  let loaded = false, fromWh = 0;
  for (let i = 0; i < 240 && !loaded; i++) { await sleep(500);
    const s = await p.evaluate(() => { const S = window.__iv.S; let w = 0; for (const c of window.__iv.staffObj.values()) if (['toWhTake', 'takeWh'].includes(c.state)) w++; return { ready:!S.order || S.order.ready, w, t:S.order && S.order.time }; });
    loaded = s.ready; fromWh = Math.max(fromWh, s.w); }
  const r2 = await p.evaluate(c0 => ({ t:window.__iv.S.order ? window.__iv.S.order.time : -1, wc:window.__iv.S.wh.c, made:window.__iv.S.made - c0, del:window.__iv.S.delivered }), cuts0);
  check(loaded && fromWh > 0, `order loaded from the warehouse (order clock ${Math.round(r2.t)} s, warehouse now ${r2.wc} crates, loaders fetched from stock: ${fromWh > 0}, crates made meanwhile ${r2.made})`);
  const off = await p.evaluate(() => { window.__iv.openOffice('stock'); return document.getElementById('office').textContent.includes('Make to stock'); });
  check(off, 'office Stock tab shows the warehouse and the make-to-stock switch');
  await p.screenshot({ path:'/tmp/claude-0/-home-claude/f033d288-9398-5232-a6ec-3b445b16baec/scratchpad/wh_office.png' });
  check(!p.errs.length, `no page errors ${p.errs.slice(0, 2).join(' | ')}`); await p.close(); }
await b.close();
console.log(fails ? `FAIL: ${fails} check(s)` : 'PASS: order #34 recovers, the warehouse works'); process.exit(fails ? 1 : 0);
