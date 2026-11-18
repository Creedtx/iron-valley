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
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 2000;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; });
await wait(1500); await ev(() => { const v = window.__iv; for (const c of v.staffObj.values()) { c.o.position.set(...(c.st.role === 'operator' ? v.P.op : v.P.pallet)); c.state = 'idle'; c.path = null; } });
await ev(() => { window.__iv.speed = 3; });
// any card other than the day book (a person met on the way) is closed as it comes up
const closeOthers = () => ev(() => { const v = window.__iv; while (v.cardOpen && !/Day book/i.test(document.getElementById('storyBody').innerText)) v.nextCard(); });
setInterval(() => closeOthers().catch(() => {}), 400);
const P = await ev(() => window.__iv.P);
// 1. the walk-in sale
await ev(() => { const v = window.__iv; v.S.pallet = 6; v.syncPallet(); v.S.time = Math.floor(v.S.time / 480) * 480 + 60; v.spawnWalker(true); });
check(await until(() => window.__iv.walker && window.__iv.walker.state === 'wait', 120), 'walk-in customer reaches the gate');
console.log('at gate', await st());
check(await ev(() => { const o = window.__iv.walker.c.o; return o.visible && Math.abs(o.position.y) < .01; }), 'customer stands on the ground at the gate');
await ev(() => { const v = window.__iv; v.camLock = [v.P.trade[0], v.P.trade[1] - 1.5]; }); await wait(1200); await p.screenshot({ path:path.join(out, 'w1_gate.png') }); await ev(() => { window.__iv.camLock = null; });
const want = await ev(() => window.__iv.walker.n), cash0 = await ev(() => window.__iv.S.cash), type = await ev(() => window.__iv.walker.def.want);
check(await ev(() => !!window.__iv.walker.c.cart), 'a crate customer brings their own barrow');
const spot = await ev(() => window.__iv.cartSpot(window.__iv.freeCart().slot));
await walkTo(spot[0], spot[1] - .8); await walkTo(...spot); check(await until(() => !!window.__iv.owner.cart, 10), 'the owner takes a trolley from the bay');
await walkTo(...(type === 'pipe' ? P.prackSpot : P.pallet)); await until(n => window.__iv.owner.stack.length >= n, 10, want);
console.log('picked', await st());
check(await ev(n => window.__iv.owner.stack.length >= n, want), `owner picked up ${want} ${type}s with a loader on the payroll`);
check(await ev(() => window.__iv.owner.stack.every(m => m.position.y < 1.3 && m.position.z > .45)), 'the crates ride on the trolley deck');
await walkTo(P.trade[0], P.trade[1] - .9); await ev(() => { const v = window.__iv; v.camLock = [v.P.trade[0], v.P.trade[1] - 1.2]; }); await wait(1200); await p.screenshot({ path:path.join(out, 'w2_handover.png') }); await ev(() => { window.__iv.camLock = null; });
check(await until(() => window.__iv.S.walk.served === 1, 15), 'customer served and paid');
const cash1 = await ev(() => window.__iv.S.cash); check(cash1 > cash0, `cash went up by ${Math.round(cash1 - cash0)}`);
await wait(800); await p.screenshot({ path:path.join(out, 'w3_paid.png') }); console.log('paid', await st());
await wait(1500); await ev(() => { const v = window.__iv; v.camLock = [v.P.trade[0] + 1.5, v.P.trade[1] + 1.5]; }); await wait(1500); await p.screenshot({ path:path.join(out, 'w3_barrow_out.png') }); await ev(() => { window.__iv.camLock = null; });
check(await until(() => !window.__iv.walker, 120), 'customer walked out of the gate');
check(await ev(() => window.__iv.carts.filter(k => !k.by).length === 3), 'the customer left with their own barrow, not ours');
await walkTo(spot[0], spot[1] - .8); await walkTo(...spot); check(await until(() => !window.__iv.owner.cart, 10), 'the owner parks the empty trolley back in the bay');
check(await ev(() => window.__iv.carts.every(k => !k.by)), 'all four trolleys are in the bay');
// 1b. the pallet is empty and no order wants crates: the saw cuts what the customer at the gate needs
await ev(() => { const v = window.__iv; v.S.pallet = 0; v.syncPallet(); v.spawnWalker(true); });
await until(() => window.__iv.walker && window.__iv.walker.state === 'wait', 120);
const want2 = await ev(() => window.__iv.walker.n);
check(await ev(() => !window.__iv.S.order || !window.__iv.S.order.qty), 'no crates on order (the case from the phone)');
check(await until(() => window.__iv.sawOn, 60), 'the saw starts for the customer at the gate');
check(await until(n => window.__iv.S.pallet >= n, 90, want2), `the saw cuts the ${want2} crates the customer wants`);
await wait(4000); check(await ev(n => window.__iv.S.pallet <= n + 1, want2), 'and stops there (no extra stock)');
if (want2 > 2) { await walkTo(P.pallet[0], P.pallet[1] + 1); const s2 = await ev(() => window.__iv.cartSpot(window.__iv.freeCart().slot)); await walkTo(s2[0], s2[1] - .8); await walkTo(...s2); check(await until(() => !!window.__iv.owner.cart, 10), 'the owner takes a trolley again'); }
await walkTo(...P.pallet); await until(n => window.__iv.owner.stack.length >= n, 20, want2); await walkTo(P.trade[0], P.trade[1] - .9);
check(await until(() => window.__iv.S.walk.served === 2, 30), 'second customer served');
await until(() => !window.__iv.walker, 120);
if (await ev(() => !!window.__iv.owner.cart)) { const s3 = await ev(() => window.__iv.cartSpot(window.__iv.owner.cartRec.slot)); await walkTo(s3[0], s3[1] - .8); await walkTo(...s3); await until(() => !window.__iv.owner.cart, 10); }
// 1c. carrying (build 0.18b): nothing rides above the shoulders; three or more crates go on the platform trolley
check(await ev(() => { const v = window.__iv; for (let i = 0; i < 2; i++) if (v.carriedPos('crate', i, 2, false).y > 1.0) return false; for (let i = 0; i < 16; i++) { const c = v.carriedPos('crate', i, 16, true); if (c.y > 1.3 || c.z < .45) return false; } for (let i = 0; i < 8; i++) if (v.carriedPos('pipe', i).y > .9) return false; return true; }), 'loads stay in the arms or on the trolley, never on the head');
// 1d. a lorry order: the loader fetches a trolley from the bay for the crates, and parks it again afterwards
await ev(() => { const v = window.__iv; if (v.S.call) v.acceptCall(); v.closeOffice(); const op = [...v.staffObj.values()].find(c => c.st.role === 'operator'); if (v.S.order && !v.S.order.briefed) v.briefOrder(op); });
check(await until(() => [...window.__iv.staffObj.values()].some(c => c.st.role === 'loader' && c.cart), 300), 'the loader takes a trolley for the crate run');
check(await until(() => [...window.__iv.staffObj.values()].some(c => c.st.role === 'loader' && c.cart && c.stack.length >= 3), 150), 'the loader wheels three or more crates on it');
await ev(() => { const v = window.__iv, l = [...v.staffObj.values()].find(c => c.st.role === 'loader'); v.camLock = [l.o.position.x, l.o.position.z]; }); await wait(1500); await p.screenshot({ path:path.join(out, 'w3b_loader_trolley.png') }); await ev(() => { window.__iv.camLock = null; });
// 2. lunch: 11:58 to 12:31
await walkTo(P.saw[0] + 3, P.saw[1] + 3);
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 480 + 239; });
check(await until(() => window.__iv.lunchTime(), 10), 'lunch whistle at 12:00');
check(await until(() => [...window.__iv.staffObj.values()].every(c => c.lunch === 'eat'), 120), 'the crew is on the bench');
check(await ev(() => window.__iv.carts.every(k => !k.by)), 'the trolleys were parked in the bay before lunch');
await until(() => (window.__iv.folk.get('gus') || {}).gs === 'eat', 60);
console.log('lunch', await st());
await ev(() => { const v = window.__iv; v.camLock = [-8.5, -1]; }); await wait(1200); await p.screenshot({ path:path.join(out, 'w4_lunch.png') }); await ev(() => { window.__iv.camLock = null; });
check(await ev(() => !window.__iv.sawOn), 'the saw stops while the operator eats');
check(await until(() => !window.__iv.lunchTime(), 120), 'lunch over at 12:30');
check(await until(() => [...window.__iv.staffObj.values()].every(c => !c.lunch), 5), 'the crew goes back to work');
await until(() => { const op = [...window.__iv.staffObj.values()].find(c => c.st.role === 'operator'); return op.state === 'work'; }, 60); console.log('after lunch', await st());
check(await ev(() => { const op = [...window.__iv.staffObj.values()].find(c => c.st.role === 'operator'); return op.state === 'work' || op.state === 'toWork'; }), 'the operator is back at the saw');
// 3. a customer nobody serves
const rep0 = await ev(() => window.__iv.S.rep);
await ev(() => { const v = window.__iv; v.spawnWalker(true); });
await until(() => window.__iv.walker && window.__iv.walker.state === 'wait', 120);
await ev(() => { window.__iv.walker.t = 88; });
check(await until(() => window.__iv.S.walk.lost === 1, 30), 'an unserved customer walks off');
check(await ev(r => window.__iv.S.rep < r, rep0), 'reputation dropped');
// 3b. another app in front: the works fall silent, and come back with the page
await p.keyboard.press('Shift'); await wait(300);
const hide = h => ev(h => { Object.defineProperty(document, 'hidden', { value:h, configurable:true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
await hide(true); check(await until(() => window.__iv.audio === 'suspended', 5), 'sound stops when another app is in front');
await hide(false); check(await until(() => window.__iv.audio === 'running', 5), 'sound comes back with the game');
// 4. knocking off: the whistle, the crew walks out of the gate, the day book, then they clock in next morning
await p.keyboard.press('Shift'); await wait(300);
check(await ev(() => { try { window.__iv.whistle(.3); return true; } catch(e) { return false; } }), `the whistle plays (audio ${await ev(() => window.__iv.audio)})`);
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 480 + 478; });
check(await until(() => /CLOSING/.test(document.getElementById('clock').textContent), 20), 'clock reads 17:00 CLOSING');
check(await until(() => [...window.__iv.staffObj.values()].some(c => c.leaving), 20), 'the crew sets off for the gate');
await ev(() => { const v = window.__iv; v.camLock = [v.P.frontIn[0], v.P.frontIn[1] - 2]; }); await wait(2500); await p.screenshot({ path:path.join(out, 'w5_going_home.png') });
check(await until(() => window.__iv.cardOpen && /Day book/i.test(document.getElementById('storyBody').innerText), 150), 'the day book opens once the yard is empty');
check(await ev(() => [...window.__iv.staffObj.values()].every(c => c.gone && !c.o.visible)), 'everyone has gone home');
check(await ev(() => { const g = window.__iv.folk.get('gus'); return !g || g.gone; }), 'Gus has gone home');
check(await ev(() => window.__iv.gateShut()), 'the main gate is shut for the night');
check(await ev(() => window.__iv.M.gateLeaves.every(L => L.g.parent && L.g.children.length > 0 && L.g.children.every(m => m.parent === L.g))), 'the gate leaves are drawn from their own group (not baked into the scenery)');
check(await ev(() => { const r = window.__iv.gateRot; return Math.abs(r[0]) < .05 && Math.abs(r[1] - Math.PI) < .05; }), 'both gate leaves closed across the gateway');
await ev(() => { const v = window.__iv; v.paused = true; document.getElementById('story').hidden = true; v.camLock = [5, 10.5]; }); await wait(1500); await p.screenshot({ path:path.join(out, 'w6_gates_shut.png') });
await ev(() => { const v = window.__iv; document.getElementById('story').hidden = false; v.paused = false; });
await wait(800); await p.screenshot({ path:path.join(out, 'w6_daybook.png') }); await ev(() => { window.__iv.camLock = null; });
const card = await ev(() => document.getElementById('storyBody').innerText); console.log(card);
check(/Gate trade\s+2 served, 1 walked off/.test(card), 'day book counts the gate trade');
check(/to beat/.test(card), 'first day sets the mark to beat');
await ev(() => document.querySelector('#storyBody .btn.primary').click()); await wait(800);
check(await until(() => !window.__iv.cardOpen && !window.__iv.S.day.closing, 10), 'the next morning starts');
{ await until(() => /Tue · 07:/.test(document.getElementById('clock').textContent), 10); const ck = await ev(() => document.getElementById('clock').textContent); check(/Tue · 07:[0-5]/.test(ck), `clock reads Tuesday morning (${ck})`); }
check(await ev(() => [...window.__iv.staffObj.values()].every(c => !c.gone && c.o.visible)), 'the crew clocks in through the gate');
check(await until(() => { const r = window.__iv.gateRot; return !window.__iv.gateShut() && Math.abs(r[0] + 1.2) < .05 && Math.abs(r[1] - Math.PI - 1.2) < .05; }, 20), 'the gates swing open in the morning');
await ev(() => { const v = window.__iv; v.camLock = [v.P.frontIn[0], v.P.frontIn[1] - 1]; }); await wait(2500); await p.screenshot({ path:path.join(out, 'w7_clock_in.png') }); await ev(() => { window.__iv.camLock = null; });
check(await until(() => { const op = [...window.__iv.staffObj.values()].find(c => c.st.role === 'operator'); return op.state === 'work'; }, 150), 'the operator is back at the saw in the morning');
console.log('morning', await st());
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'no errors'); await b.close();
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS'); process.exit(fail.length || errs.length ? 1 : 0);
