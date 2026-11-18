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
// Sweeps the car's outline (3.6 m x 1.5 m) along its routes out, back and into its space, and lists every collision
// box it touches, with a lorry docked in bay 1. Fails on any touch.   node tools/car_sweep.mjs <url> <outDir>
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.speed = 0; });
const res = await ev(() => { const v = window.__iv, P = v.P, COL = new Map(v.COL); COL.delete('car');
  COL.set('lorry in bay 1', [P.truck[0] - 1.15, P.truck[1] - 2.45, P.truck[0] + 1.15, P.truck[1] + 2.75]);
  const near = [...COL].filter(([, b]) => b[2] > 7 && b[0] < 25 && b[3] > 5 && b[1] < 13.5).map(([k, b]) => `${k}:[${b.map(n => n.toFixed(2))}]`);
  const L = 3.6, W = 1.5, hits = new Set(), out = {};
  for (const [name, path] of [['out', v.CAR_OUT], ['back', v.CAR_BACK], ['rev', v.CAR_REV]]) { const H = [];
    for (let d = 0; d <= path.len; d += .1) { const q = v.pathAt(path, d), fx = Math.cos(q.yaw), fz = -Math.sin(q.yaw);
      for (const [a, b] of [[-L / 2, -W / 2], [-L / 2, W / 2], [L / 2, -W / 2], [L / 2, W / 2], [0, -W / 2], [0, W / 2], [L / 2, 0], [-L / 2, 0], [L / 4, W / 2], [L / 4, -W / 2], [-L / 4, W / 2], [-L / 4, -W / 2]]) {
        const x = q.x + fx * a - fz * b, z = q.z + fz * a + fx * b;
        if (z > 13.2) continue;   // the road and verge outside the gateway
        for (const [k, bx] of COL) if (x > bx[0] && x < bx[2] && z > bx[1] && z < bx[3]) { const key = name + ':' + k; if (!hits.has(key)) { hits.add(key); H.push(`${k} at d=${d.toFixed(1)} (${q.x.toFixed(1)},${q.z.toFixed(1)})`); } } } }
    out[name] = H; }
  return { near, out }; });
console.log('boxes near the route:', res.near.join('  '));
for (const k of ['out', 'back', 'rev']) console.log(k, res.out[k].length ? res.out[k].join(' | ') : 'clear');
await b.close(); process.exit(res.out.out.length + res.out.back.length + res.out.rev.length ? 1 : 0);
