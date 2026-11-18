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
// Build 0.19: the daily target, order terms (regular / rush / bulk, the rush lorry leaving), things to buy (tea urn,
// trade counter, car service) and small events (blunt blade, rain, a rival undercutting an account).
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 3000; S.rep = 62; S.orderSeq = 4; S.delivered = 4; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.S.time = Math.floor(v.S.time / 480) * 480 + 40; v.speed = 3; v.evNext = 1e9; });
await wait(3000);
const P = await ev(() => window.__iv.P);
// 1. the daily target
check(await until(() => !!window.__iv.targetProg(), 10), 'a target is set for the day');
check(await until(() => !document.getElementById('tgtC').hidden, 5), 'the target shows on the top bar: ' + await ev(() => document.getElementById('tgtC').textContent));
const t0 = await ev(() => { const v = window.__iv, t = v.S.day.target; return { kind:t.kind, need:t.need, cash:v.S.cash, rep:v.S.rep }; });
await ev(([k, n]) => { const v = window.__iv, S = v.S; if (k === 'ship') S.shipped += n; else if (k === 'takings') S.earned += n; else if (k === 'gate') S.walk.served += n; else S.sales.won += n; }, [t0.kind, t0.need]);
check(await until(() => window.__iv.S.day.target.done, 10), `meeting the target (${t0.kind} ${t0.need}) pays the bonus`);
check(await ev(c => window.__iv.S.cash > c, t0.cash), 'the bonus is in the cash');
// 2. order terms
await ev(() => { const v = window.__iv; v.S.order = null; v.S.call = v.placeSpec('grocer'); v.S.call.place0 = false; v.openOffice('orders'); });
await wait(800);
check(await ev(() => document.querySelectorAll('#offBody [data-accept]').length === 3), 'the call offers regular, rush and bulk');
await p.screenshot({ path:path.join(out, 'x1_terms.png') });
await ev(() => document.querySelector('#offBody [data-accept="rush"]').click()); await ev(() => window.__iv.closeOffice());
check(await ev(() => window.__iv.S.order && window.__iv.S.order.terms === 'rush'), 'a rush order is taken');
await ev(() => { const o = window.__iv.S.order; o.time = o.deadline + 1; });
check(await until(() => !window.__iv.S.order, 10), 'late and not loaded, the rush lorry leaves without the goods');
await ev(() => { const v = window.__iv; v.S.call = v.placeSpec('grocer'); v.acceptCall('bulk'); v.closeOffice(); });
check(await ev(() => window.__iv.S.order && window.__iv.S.order.terms === 'bulk' && window.__iv.S.order.qty >= 40), 'a bulk order is twice the goods');
await ev(() => { window.__iv.S.order = null; });
// 3. things to buy
await ev(() => { const S = window.__iv.S; S.walk.served = Math.max(1, S.walk.served); S.sales.trips = 1; S.delivered = 4; S.restored.lights = true; S.restored.paint = true; S.restored.yard = true; S.restored.windows = true; });
for (const [id, at] of [['urn', [-8.3, -.75]], ['counter', [1.0, 8.6]], ['car', [13.6, 9.3]]]) {
  await walkTo(at[0], at[1] - 1); await walkTo(...at);
  check(await until(i => window.__iv.S.restored[i], 40, id), `paid in for the ${id}`); }
check(await ev(() => !!(window.__iv.M.urn && window.__iv.M.counter && window.__iv.M.carSigns)), 'the tea urn, the trade counter and the signwriting are in the yard');
await ev(() => { window.__iv.camLock = [1.5, 9.5]; }); await wait(1200); await p.screenshot({ path:path.join(out, 'x2_counter.png') }); await ev(() => { window.__iv.camLock = [-8.5, -1.5]; }); await wait(1200); await p.screenshot({ path:path.join(out, 'x3_urn.png') }); await ev(() => { window.__iv.camLock = null; });
// 4. the blunt blade (kept as a mechanism; Bible 4.5 keeps it out of the level 1-2 events)
await ev(() => { window.__iv.S.blade = { at:0 }; });
check(await ev(() => window.__iv.bladeK() < 1), 'a blunt blade slows the saw');
await walkTo(13.6, 6.5); await walkTo(P.sawFix[0], P.sawFix[1] + 1); await walkTo(...P.sawFix);   // round the car door, not past it
check(await until(() => !window.__iv.S.blade, 20), 'standing at the side of the machine, the owner fits a new blade');
// 5. rain
await ev(() => window.__iv.startRain());
check(await ev(() => !!window.__iv.rain && !document.getElementById('rain').hidden), 'a shower starts');
await wait(2500); await p.screenshot({ path:path.join(out, 'x4_rain.png') });
await ev(() => { window.__iv.rain.t = window.__iv.rain.dur; });
check(await until(() => !window.__iv.rain, 5), 'the shower passes');
// 6. a rival
await ev(() => { const v = window.__iv; v.sales().acc.grocer = { since:0 }; v.story({ kind:'rival', key:'grocer' }); });
check(await until(() => window.__iv.cardOpen && /Hendry/.test(document.getElementById('storyBody').innerText), 5), 'a rival offers your account a cheaper price');
await ev(() => document.querySelector('#storyBody [data-rival="match"]').click());
check(await ev(() => window.__iv.sales().acc.grocer.cut >= window.__iv.dayNo()), 'matching keeps the account at 10% less for three days');
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS'); process.exit(fail.length || errs.length ? 1 : 0);
