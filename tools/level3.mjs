// Build 0.18: the working day and the walk-in trade. Starts a game with the crew posted, then
//  1. a walk-in customer at the gate: the owner fetches crates from the pallet and hands them over for cash;
//  2. the lunch whistle: the crew sits on the bench, the saw stops, everyone is back at 12:30;
//  3. a customer nobody serves walks off (reputation -1);
//  4. the knocking-off whistle at 17:00: the day book card, then the next morning.
//   node tools/workday.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (cond, secs, arg) => { const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(cond, arg)) return true; await wait(300); } return false; };
const walkTo = async (x, z, secs = 30) => { for (let i = 0; i < secs * 4; i++) { const d = await ev(([x, z]) => { const o = window.__iv.owner.o.position, dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), s = Math.min(d, .5); if (d > .05) o.set(o.x + dx / d * s, 0, o.z + dz / d * s); return d; }, [x, z]); if (d < .1) return; await wait(250); } };
const st = () => ev(() => { const v = window.__iv, S = v.S, w = v.walker; return JSON.stringify({ clock:document.getElementById('clock').textContent, obj:document.getElementById('objT').textContent, lunch:v.lunchTime(), walker:w && `${w.def.name}:${w.state}:${w.got}/${w.n}:${Math.round(w.t)}s`, walk:S.walk, cash:Math.round(S.cash), rep:Math.round(S.rep), pallet:S.pallet, carry:`${v.owner.carryType}x${v.owner.stack.length}`, staff:[...v.staffObj.values()].map(c => `${c.st.name}:${c.state}${c.lunch ? '/' + c.lunch : ''}`), gus:(v.folk.get('gus') || {}).job, card:v.cardOpen }); });
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
// a game past day one: the crew hired and posted, the tutorial done, an order on
// Build 0.20: level 3 on the wide yard. From a level 2 works with the pipe machine and the North field bought:
// level 3 opens, goods-in replaces the rust heap by bay 2, a timber and a steel delivery come by flatbed to bay 2 and
// are carried to the stores, the tool press is paid for and built in the field, and it stamps tools for an order.
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 20000; S.rep = 64; S.orderSeq = 6; S.delivered = 6; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.speed = 3; v.evNext = 1e9; S.levelUp = true; });
setInterval(() => ev(() => { const v = window.__iv; while (v.cardOpen && !/Day book/i.test(document.getElementById('storyBody').innerText)) v.nextCard(); }).catch(() => {}), 400);
await ev(async () => { const v = window.__iv; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of v.S.staff) st.posted = true;
  v.S.plots.north = { st:3 }; v.buyField(false); v.S.levelUp = true; await v.startLevel(3); v.closeOffice(); });
check(await until(() => window.__iv.S.level === 3, 60), 'level 3 opens');
const P = await ev(() => window.__iv.P);
// 1. bay 2: goods-in instead of the rust heap
check(await ev(() => !!window.__iv.M.goodsIn && !window.__iv.M.bayHeap.h.visible && !window.__iv.COL.has(window.__iv.M.bayHeap.k)), 'goods-in stands by bay 2 where the rust heap was');
// 2. a timber delivery: flatbed to bay 2, the driver unloads onto goods-in, the loaders carry it to the stock room
const store0 = await ev(() => { const v = window.__iv; v.S.store = 4; v.syncStore && v.syncStore(); return v.S.store; });
await ev(() => window.__iv.orderTimber(12));
check(await until(() => window.__iv.sup.state === 'parked', 180), 'the timber flatbed backs into bay 2');
check(await ev(() => { const f = window.__iv.M.flat.position, P = window.__iv.P; return Math.hypot(f.x - P.supPark[0], f.z - P.supPark[1]) < .3; }), 'it parks in bay 2');
check(await until(() => window.__iv.goodsIn() > 0, 60), 'the driver unloads onto goods-in');
await ev(() => { window.__iv.camLock = [21, 7]; }); await wait(1500); await p.screenshot({ path:path.join(out, 'l3_goodsin.png') }); await ev(() => { window.__iv.camLock = null; });
check(await until(() => window.__iv.sup.state === 'leave' || window.__iv.sup.state === 'away', 120), 'the empty flatbed leaves');
check(await until(() => !window.__iv.S.delivery, 400), 'the loaders carry the planks to the stock room');
check(await ev(s => window.__iv.S.store >= s + 12 - 2, store0), 'the stock room has the new timber');
// 3. a steel delivery the same way, to the coil bay
const coils0 = await ev(() => { const v = window.__iv; v.S.coils = 0; v.syncCoilBay && v.syncCoilBay(); return 0; });
await ev(() => window.__iv.orderSteel(2));
check(await until(() => !window.__iv.S.delivery && window.__iv.S.coils + (window.__iv.S.coilFeed || 0) >= 1, 500), 'the steel goes from goods-in to the coil bay');
// 4. the tool press: pay at its pad in the field, Big Tom's crew builds it
check(await ev(() => window.__iv.visiblePads().some(p => p.id === 'press')), 'the press pad is offered in the field');
await walkTo(P.frontIn[0], 0); await walkTo(13.8, -10.5); await walkTo(14.0, -13.5);
check(await until(() => window.__iv.S.lv3.press >= 1, 60), 'the press is paid for');
await ev(() => { window.__iv.camLock = [14, -15]; }); await wait(1500); await p.screenshot({ path:path.join(out, 'l3_building.png') });
check(await until(() => window.__iv.S.lv3.press === 2, 400), 'the press is built in the North field');
await ev(() => { window.__iv.camLock = [14, -14.5]; }); await wait(2000); await p.screenshot({ path:path.join(out, 'l3_press.png') }); await ev(() => { window.__iv.camLock = null; });
check(await ev(() => { const v = window.__iv, P = v.P; return P.top && P.top[1] < -12.5 && P.top[1] > -20.5; }), 'the operator spot is in the field');
// 5. tools for the Valley Garage
await ev(() => { const v = window.__iv; v.hire('operator'); v.hire('mechanic'); v.closeOffice(); for (const st of v.S.staff) st.posted = true; v.S.coils = 4; v.syncCoilBay && v.syncCoilBay(); v.S.order = null; v.S.call = v.placeSpec('garage'); v.acceptCall(); v.closeOffice(); v.briefOrder(null); });
check(await ev(() => (window.__iv.S.order || {}).tq > 0), 'the Valley Garage orders tools');
check(await until(() => window.__iv.toolOn, 500), 'the tool press stamps tools');
await ev(() => { window.__iv.camLock = [14, -14.5]; }); await wait(1500); await p.screenshot({ path:path.join(out, 'l3_stamping.png') }); await ev(() => { window.__iv.camLock = null; });
check(await ev(() => window.__iv.INSPECT.map(c => c.id).join() === 'fire,guards,crew,parts'), 'the licence checks only what the game has (Bible 4.1, 8.2): wiring, machines, a mechanic, spare parts');
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS'); process.exit(fail.length || errs.length ? 1 : 0);
