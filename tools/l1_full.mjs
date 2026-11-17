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
await ev(() => { window.__iv.speed = 4; });
const st = () => ev(() => { const v = window.__iv, S = v.S, r = v.sawReason(); return JSON.stringify({ lv:S.level, seq:S.orderSeq, saw:r.label.slice(1).join(':'), staff:[...v.staffObj.values()].map(c => `${c.st.name[0]}:${c.st.role[0]}:${c.state}`).join(' '), ord:S.order && `${S.order.cut}/${S.order.qty} bed${S.bed}${S.order.briefed ? '' : ' UNBRIEFED'}${S.order.ready ? ' READY' : ''}`, call:!!S.call, tim:`${S.store}/${S.timber}/${S.feed}`, deliv:S.delivery && S.delivery.left, sup:v.sup.state, pal:S.pallet, truck:v.truck.state, del:S.delivered, cash:Math.round(S.cash), pile:S.cashPile, ch:v.charter().filter(v.lineDone).length }); });
const walkTo = async (x, z, secs = 25) => { for (let i = 0; i < secs * 4; i++) { const d = await ev(([x, z]) => { const o = window.__iv.owner.o.position, dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), s = Math.min(d, .5); if (d > .05) o.set(o.x + dx / d * s, 0, o.z + dz / d * s); return d; }, [x, z]); if (d < .1) return; await wait(120); } };
const until = async (cond, secs) => { const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(cond)) return true; await wait(400); } return false; };
const P = await ev(() => window.__iv.P);
const toDesk = async () => { await walkTo(P.wsDoor[0], P.wsDoor[1] + .6); await walkTo(P.deskRing[0] + 1.2, P.deskRing[1] + 1.6); await walkTo(...P.deskRing); await wait(600); };
const outDesk = async () => { await ev(() => window.__iv.closeOffice()); await walkTo(P.deskRing[0] + 1.2, P.deskRing[1] + 1.6); await walkTo(P.wsDoor[0], P.wsDoor[1] + .6); };
// day one by hand
await until(() => !!window.__iv.S.call, 120); await toDesk(); await ev(() => window.__iv.acceptCall()); await outDesk();
await walkTo(...P.op); await until(() => window.__iv.S.pallet >= 10, 200);
await ev(() => window.__iv.hire('operator')); await ev(() => window.__iv.closeOffice()); await wait(3000);
let c = await ev(() => { const c = [...window.__iv.staffObj.values()].find(c => c.st.role === 'operator'); return [c.o.position.x, c.o.position.z]; });
await walkTo(c[0], c[1] - .9); await wait(1200); await walkTo(P.frontIn[0], P.frontIn[1] - 3); await walkTo(...P.op, 40); await wait(2500);
await ev(() => window.__iv.hire('loader')); await ev(() => window.__iv.closeOffice()); await wait(3000);
c = await ev(() => { const c = [...window.__iv.staffObj.values()].find(c => c.st.role === 'loader'); return [c.o.position.x, c.o.position.z]; });
await walkTo(c[0], c[1] - .9); await wait(1200); await walkTo(P.frontIn[0], P.frontIn[1] - 3); await walkTo(...P.pallet, 40); await wait(2500);
console.log('crew posted', await st());
const t0 = Date.now(); let lastLog = 0, hired2 = false;
while (Date.now() - t0 < +mins * 60000) {
  const s = await ev(() => { const v = window.__iv, S = v.S, o = S.order; const op = [...v.staffObj.values()].find(c => c.st.role === 'operator');
    return { call:!!S.call, unb:o && !o.briefed, ready:o && o.ready, pile:S.cashPile, need:o ? Math.max(0, o.qty - o.cut) : 0, have:S.store + S.timber + S.feed, room:v.capOf ? 0 : 0, deliv:!!S.delivery, op:op && [op.o.position.x, op.o.position.z], cash:S.cash, lv:S.level, staff:S.staff.length }; });
  if (s.lv > 1) { console.log('LEVEL UP', await st()); break; }
  if (s.call) { await toDesk(); await ev(() => window.__iv.acceptCall()); await outDesk(); }
  else if (s.unb && s.op) { await walkTo(s.op[0], s.op[1] + 1.0); await wait(800); }
  else if (s.ready) { await walkTo(P.drop[0] - 1.6, P.drop[1] - 1.0); await walkTo(...P.drop); await wait(1500); }
  else if (s.pile > 0) { await walkTo(...P.cash); await wait(1500); }
  else if (!s.deliv && s.have < s.need + 6) { const r = await ev(() => { const v = window.__iv, S = v.S; const room = 24 - S.store; return room; });
    const q = r >= 24 ? 24 : r >= 12 ? 12 : 0; if (q) { await ev(q => window.__iv.orderTimber(q), q); console.log('ordered timber', q); } }
  if (!hired2 && s.cash > 900) { hired2 = true; await ev(() => window.__iv.hire('loader')); await ev(() => window.__iv.closeOffice()); await wait(3000);
    c = await ev(() => { const c = [...window.__iv.staffObj.values()].filter(c => c.st.role === 'loader').pop(); return [c.o.position.x, c.o.position.z, c.st.posted]; });
    if (c[2] === false) { await walkTo(c[0], c[1] - .9); await wait(1200); await walkTo(P.frontIn[0], P.frontIn[1] - 3); await walkTo(...P.pallet, 40); await wait(2500); } }
  if (Date.now() - lastLog > 10000) { lastLog = Date.now(); console.log(Math.round((Date.now() - t0) / 1000) + 's', await st()); }
  await wait(1000);
}
await p.screenshot({ path:path.join(out, 'end.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
