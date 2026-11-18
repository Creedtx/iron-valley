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
// Build 0.18: the crew walking out of the main gate at 17:00 and in at 07:00. A recorder in the page samples every
// character each frame and reports anyone who crosses the fence away from the gateway, stands inside a collision
// box, or is moved by the walk watchdog (stuck).   node tools/gate_traffic.mjs <url> <outDir>
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 5000;
  v.hire('operator'); v.hire('loader'); v.hire('loader'); v.hire('helper'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.speed = 3; });
setInterval(() => ev(() => { const v = window.__iv; while (v.cardOpen && !/Day book/i.test(document.getElementById('storyBody').innerText)) v.nextCard(); }).catch(() => {}), 400);
await wait(20000);
await ev(() => { const v = window.__iv; window.__rec = { bad:[], last:new Map(), unstuck0:v.S.unstuck || 0 };
  const G0 = 3.0, G1 = 7.0, Z1 = 12.5;
  const tick = () => { const R = window.__rec, who = [...v.staffObj.values(), ...(v.folk.get('gus') ? [v.folk.get('gus')] : [])];
    for (const c of who) { if (!c.o.visible) { R.last.delete(c); continue; } const x = c.o.position.x, z = c.o.position.z, p = R.last.get(c);
      if (p && (p[1] - Z1) * (z - Z1) < 0) { const xc = p[0] + (x - p[0]) * (Z1 - p[1]) / (z - p[1]); if (xc < G0 + .1 || xc > G1 - .1) R.bad.push(`${c.st.name} crossed the front fence at x=${xc.toFixed(2)} (${c.state}${c.gs ? '/' + c.gs : ''})`); }
      for (const [k, b] of v.COL) if (x > b[0] + .05 && x < b[2] - .05 && z > b[1] + .05 && z < b[3] - .05) { const key = c.st.name + k; if (!R[key]) { R[key] = 1; R.bad.push(`${c.st.name} inside collision box ${k} [${b.map(n => n.toFixed(1))}] at ${x.toFixed(2)},${z.toFixed(2)} (${c.state})`); } }
      if (v.gateSwinging() && x > 3.0 && x < 7.0 && z > 12.0 && z < 14.4 && !R['sw' + c.st.name]) { R['sw' + c.st.name] = 1; R.bad.push(`${c.st.name} in the gateway while the gate leaves swing (${x.toFixed(2)},${z.toFixed(2)})`); }
      R.last.set(c, [x, z]); } requestAnimationFrame(tick); };
  requestAnimationFrame(tick); });
const shots = async (name, n, gap) => { for (let i = 0; i < n; i++) { await ev(() => { window.__iv.camLock = [5, 11.5]; }); await wait(gap); await p.screenshot({ path:path.join(out, `${name}${i}.png`) }); } };
await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 480 + 478; });
await shots('out', 6, 1500);
await until(() => window.__iv.cardOpen && /Day book/i.test(document.getElementById('storyBody').innerText), 150);
const closing = await ev(() => window.__rec.bad.length + (window.__iv.S.unstuck || 0) - window.__rec.unstuck0);
console.log('closing', JSON.stringify(await ev(() => ({ bad:window.__rec.bad, unstuck:(window.__iv.S.unstuck || 0) - window.__rec.unstuck0, log:window.__iv.S.unstuckLog }))));
await ev(() => { window.__rec.bad = []; window.__rec.unstuck0 = window.__iv.S.unstuck || 0; document.querySelector('#storyBody .btn.primary').click(); });
await shots('in', 6, 1500);
await wait(15000);
console.log('morning', JSON.stringify(await ev(() => ({ bad:window.__rec.bad, unstuck:(window.__iv.S.unstuck || 0) - window.__rec.unstuck0, log:window.__iv.S.unstuckLog, staff:[...window.__iv.staffObj.values()].map(c => `${c.st.name}:${c.state}:${c.o.position.x.toFixed(1)},${c.o.position.z.toFixed(1)}`) }))));
const morning = await ev(() => window.__rec.bad.length + (window.__iv.S.unstuck || 0) - window.__rec.unstuck0);
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 5)) : 'no errors'); console.log(closing || morning ? 'GATE TRAFFIC PROBLEMS' : 'GATE TRAFFIC CLEAN'); await b.close(); process.exit(closing || morning || errs.length ? 1 : 0);
