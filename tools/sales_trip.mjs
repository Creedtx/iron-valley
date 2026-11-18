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
// Build 0.19: a sales trip. The owner opens the town map at the car, drives to Valley Grocers through the lorry
// gateway, Gus answers the phone and serves the gate meanwhile, the visit wins an order, the car comes back and
// reverses into its space, and the agreed order starts. Adverts and the painted sign raise the phone's interest.
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1500; S.rep = 60; S.orderSeq = 4; S.delivered = 4; S.sales.told = false;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.S.time = Math.floor(v.S.time / 480) * 480 + 40; v.speed = 3; });
await wait(4000);
const P = await ev(() => window.__iv.P);
// the phone: interest before any selling
const gap0 = await ev(() => window.__iv.callGap()); console.log('call gap before', Math.round(gap0));
check(gap0 > 100, 'with nobody knowing the works, the phone rings rarely');
// 0. the first time there is no work, Gus explains the car
check(await until(() => window.__iv.cardOpen && /Nobody in the valley knows/.test(document.getElementById('storyBody').innerText), 60), 'Gus explains the car when there is no work');
await ev(() => document.querySelector('#storyBody .btn.primary').click()); await wait(300);
// 1. the town map at the car door
await walkTo(P.carDoor[0] + 1, P.carDoor[1] - 1.5); await walkTo(...P.carDoor);
check(await until(() => window.__iv.cardOpen && /Where to, boss/.test(document.getElementById('storyBody').innerText), 10), 'standing at the car door opens the town map');
await wait(600); await p.screenshot({ path:path.join(out, 's1_town.png') });
await ev(() => document.querySelector('#storyBody [data-go="visit:grocer"]').click());
check(await ev(() => !!window.__iv.trip && !window.__iv.owner.o.visible), 'the trip starts: the owner is in the car');
// record the car's track: it may only cross the front fence line inside the lorry gateway
await ev(() => { window.__car = { bad:[], last:null }; const t = () => { const c = window.__iv.M.car, R = window.__car; if (c.visible) { const x = c.position.x, z = c.position.z;
  if (R.last && (R.last[1] - 12.5) * (z - 12.5) < 0 && (x < 15.3 || x > 22.3)) R.bad.push(`crossed the fence at x=${x.toFixed(1)}`); R.last = [x, z]; } requestAnimationFrame(t); }; requestAnimationFrame(t); });
await until(() => window.__iv.M.car.position.x > 15 && window.__iv.M.car.position.z > 11, 60); await ev(() => { window.__iv.camLock = [15, 11]; }); await wait(500); await p.screenshot({ path:path.join(out, 's2_gateway.png') }); await ev(() => { window.__iv.camLock = null; });
check(await until(() => window.__iv.trip && window.__iv.trip.phase === 'away', 90), 'the car drives out and away to town');
// 2. while away: a phone call and a gate customer; Gus deals with both
await ev(() => { const v = window.__iv; v.S.pallet = 4; v.syncPallet(); if (!v.S.call && !v.S.order) v.S.call = v.placeSpec('farm'); v.spawnWalker(true); });
check(await until(() => (window.__iv.S.answeredGus || 0) >= 1 || !!window.__iv.S.order, 60), 'Gus answers the office phone');
check(await ev(() => !!window.__iv.S.order && window.__iv.S.order.briefed), 'Gus starts the order and briefs the operator');
// 3. the visit
check(await until(() => window.__iv.cardOpen && /Take an order now/.test(document.getElementById('storyBody').innerText), 120), 'arriving at Valley Grocers opens the visit');
await wait(500); await p.screenshot({ path:path.join(out, 's3_visit.png') });
await ev(() => document.querySelector('#storyBody [data-pick="now"]').click());
check(await ev(() => window.__iv.S.book.length === 1 && window.__iv.S.book[0].place === 'grocer'), 'an order is agreed with the grocer');
check(await until(() => window.__iv.S.walk.served >= 1 || !window.__iv.walker, 120), 'Gus serves the gate customer');
console.log('served by Gus', await ev(() => window.__iv.S.walk.served));
// 4. home: the car comes back by the lorry gateway and reverses into its space
check(await until(() => window.__iv.trip && window.__iv.trip.phase === 'park', 150), 'the car comes back in at the lorry gateway');
await ev(() => { window.__iv.camLock = [16, 11.5]; }); await wait(300); await p.screenshot({ path:path.join(out, 's4_reverse.png') }); await ev(() => { window.__iv.camLock = null; });
check(await until(() => !window.__iv.trip, 30), 'the car is parked and the trip is over');
check(await ev(() => { const v = window.__iv, c = v.M.car.position; return v.owner.o.visible && Math.hypot(c.x - v.P.carSpot[0], c.z - v.P.carSpot[1]) < .05 && Math.abs(v.M.car.rotation.y) < .05; }), 'the car is back in its space, facing the gateway, and the owner is out');
check(await ev(() => window.__car.bad.length === 0), 'the car only crossed the fence line in the lorry gateway ' + JSON.stringify(await ev(() => window.__car.bad.slice(0, 3))));
// 5. the agreed order starts once the yard is free
await ev(() => { const v = window.__iv; v.S.order = null; v.S.call = null; v.truck.state = 'away'; });
check(await until(() => window.__iv.S.order && window.__iv.S.order.place === 'grocer', 30), 'the order agreed on the visit starts by itself');
// 6. adverts and the sign
await ev(() => { const v = window.__iv; v.S.cash = 1000; v.buyAd('courier'); v.buyAd('sign'); });
const gap1 = await ev(() => window.__iv.callGap()); console.log('call gap after', Math.round(gap1));
check(gap1 < gap0 * .6, 'an advert and the sign make the phone ring more often');
check(await ev(() => !!window.__iv.M.millSign), 'the painted sign stands by the road');
await ev(() => { window.__iv.camLock = [8, 12.5]; }); await wait(1200); await p.screenshot({ path:path.join(out, 's5_sign.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS'); process.exit(fail.length || errs.length ? 1 : 0);
