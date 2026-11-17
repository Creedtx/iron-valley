// Plays the whole of level 1 the way a player would: day one by hand, then an operator and a loader,
// taking every call, briefing, ordering timber, signing and collecting. Logs the saw's reason every 10 s.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, mins = '12'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear(); } setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:180000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
const P = await ev(() => window.__iv.P);
const until = async (cond, secs) => { const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(cond).catch(() => false)) return true; await wait(1500); } console.log('timeout waiting'); return false; };
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 3000; v.hire('operator'); v.hire('loader'); v.hire('helper'); S.staff.forEach(s => s.posted = true); S.call = { qty:20, pq:0, tq:0, pay:240, client:'Test', deadline:900 }; v.acceptCall(); v.briefOrder(null); v.closeOffice(); v.speed = 12; });
// the dock: the truck at it, the loader on it
await until(() => window.__iv.truck.state === 'docked', 600);
await ev(() => window.__iv.owner.o.position.set(window.__iv.P.dock[0] - 4, 0, window.__iv.P.dock[1] + 1));
for (let i = 0; i < 14; i++) { await wait(3000); const r = await ev(() => { const v = window.__iv, l = [...v.staffObj.values()].find(c => c.st.role === 'loader'); return { ls:l.state, carry:l.stack.length, y:+l.o.position.y.toFixed(2), x:+l.o.position.x.toFixed(1), z:+l.o.position.z.toFixed(1), bed:v.S.bed, pal:v.S.pallet, unstuck:v.S.unstuck || 0 }; }); console.log('DOCK', JSON.stringify(r)); if (i === 3) await p.screenshot({ path:path.join(out, 'r1_loader_ramp.png') }); }
// the owner walks to the ramp foot, up the ramp and onto the signing circle
await until(() => window.__iv.S.order && window.__iv.S.order.ready, 400);
const walkTo = async (x, z) => { for (let i = 0; i < 200; i++) { const d = await ev(([x, z]) => { const o = window.__iv.owner.o.position, dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), s = Math.min(d, .25); if (d > .05) o.set(o.x + dx / d * s, o.y, o.z + dz / d * s); return d; }, [x, z]); if (d < .1) return; await wait(150); } };
await walkTo(P.dock[0] - 6.0, P.dock[1] - 1.2); await walkTo(P.dock[0] - 3.2, P.dock[1] - 1.2);
console.log('owner mid-ramp y', await ev(() => window.__iv.owner.o.position.y.toFixed(2)));
await p.screenshot({ path:path.join(out, 'r2_owner_ramp.png') });
await walkTo(P.drop[0], P.drop[1]); await wait(2500);
console.log('owner at drop y', await ev(() => window.__iv.owner.o.position.y.toFixed(2)), 'ring y', await ev(() => window.__iv.M.rings.drop.g.position.y));
await p.screenshot({ path:path.join(out, 'r3_sign.png') });
await until(() => window.__iv.S.delivered > 0, 120); console.log('signed', await ev(() => window.__iv.S.delivered));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
