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
// close-ups of the owner and a loader carrying crates and pipes (build 0.18b: in the arms or on a trolley, never on the head)
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.S.tutDone = true; v.S.tut = 99; v.S.letter = true; v.S.met.gus = true; v.camZoom = .38; });
setInterval(() => ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); }).catch(() => {}), 400);
const shot = async (name, type, n, x, z, face) => {
  await ev(([type, n, x, z, face]) => { const v = window.__iv, c = v.owner; c.o.position.set(x, 0, z); c.faceNow(face); v.giveCarry(c, type, n); v.camLock = [x, z]; }, [type, n, x, z, face]);
  await wait(1800); await ev(() => { for (const id of ['hud', 'dock', 'fps', 'toasts', 'ticket', 'callc']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; } });
  await p.screenshot({ path:path.join(out, name + '.png') }); };
// walking right (east), so the side view shows where the load sits
await ev(() => { const v = window.__iv; v.owner.play('carry'); });
for (const [nm, t, n] of [['c1', 'crate', 1], ['c2', 'crate', 2], ['c3', 'crate', 3], ['c5', 'crate', 5], ['p1', 'pipe', 1], ['p3', 'pipe', 3]]) await shot(nm, t, n, 9, 8, Math.PI / 2);
await shot('c5_down', 'crate', 5, 9, 8, 0); await shot('p3_down', 'pipe', 3, 9, 8, 0);
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'no errors');
await b.close(); process.exit(0);
