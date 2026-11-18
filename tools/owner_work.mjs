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
// Build 0.19: a small crew at level 1 and the owner's own work counting: one loader only, no helper; the owner
// feeding planks makes the crate machine a quarter faster; the owner picks up crates for the lorry beside the loader.
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 3000; S.orderSeq = 4; S.delivered = 4; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.hire('loader'); v.hire('helper'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.S.time = Math.floor(v.S.time / 480) * 480 + 40; v.speed = 2; });
check(await ev(() => window.__iv.S.staff.filter(s => s.role === 'loader').length === 1), 'level 1 hires one loader only');
check(await ev(() => !window.__iv.S.staff.some(s => s.role === 'helper')), 'no machine helper at level 1');
await ev(() => { const v = window.__iv; v.S.call = v.placeSpec('docks', 'big'); v.acceptCall(); v.closeOffice(); v.briefOrder(null); });
const P = await ev(() => window.__iv.P);
check(await until(() => window.__iv.sawOn, 300), 'the saw runs on the order (the operator reaches for planks himself)');
// crates per game second, over a fixed stretch of game time (headless runs slowly, so real seconds mean little)
const rate = async gsecs => { const a = await ev(() => [window.__iv.S.made, window.__iv.S.time]); await until(t => window.__iv.S.time >= t, 900, a[1] + gsecs); const b = await ev(() => [window.__iv.S.made, window.__iv.S.time]); return (b[0] - a[0]) / Math.max(1, b[1] - a[1]); };
await ev(() => { const v = window.__iv; v.S.pallet = 0; v.syncPallet(); });
const r0 = await rate(40);
await walkTo(P.feedRing[0], P.feedRing[1] + 1); await walkTo(...P.feedRing);
check(await until(() => window.__iv.ownerFeeds(), 10), 'standing at the in-feed, the owner feeds the planks');
await ev(() => { const v = window.__iv; v.S.pallet = 0; v.syncPallet(); });
const r1 = await rate(40); console.log('crates per game second', r0.toFixed(3), '->', r1.toFixed(3));
check(r1 > r0 * 1.12, 'the machine cuts faster while the owner feeds it');
await p.screenshot({ path:path.join(out, 'o1_feeding.png') });
// lending a hand loading
await ev(() => { const v = window.__iv; v.S.pallet = 6; v.syncPallet(); });
await walkTo(...P.pallet);
check(await until(() => window.__iv.owner.stack.length >= 2, 15), 'with a loader on the payroll, the owner still picks up crates for the lorry');
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
console.log(fail.length ? `${fail.length} FAILED` : 'ALL PASS'); process.exit(fail.length || errs.length ? 1 : 0);
