// Plays the whole of level 1 the way a player would: day one by hand, then an operator and a loader,
// taking every call, briefing, ordering timber, signing and collecting. Logs the saw's reason every 10 s.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, mins = '12'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ protocolTimeout:600000, executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
const until = async (cond, secs, label) => { const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(cond).catch(() => false)) return true; await wait(1500); } console.log('TIMEOUT', label || ''); return false; };
const tp = (x, z) => ev(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), [x, z]);
const st = () => ev(() => { const v = window.__iv, S = v.S; return JSON.stringify({ lv:S.level, mill:S.lv2.mill, pipeOn:v.pipeOn, why:v.pipeReason ? v.pipeReason().label[1] + ':' + v.pipeReason().label[2] : '', pipes:S.pipes, feed:S.coilFeed, left:S.coilLeft, coils:S.coils, ord:S.order && `${S.order.qty}c/${S.order.pq}p bed${S.bed}/${S.pbed}${S.order.ready ? ' READY' : ''}${S.order.briefed ? '' : ' UNBRIEFED'}`, call:S.call && `${S.call.qty}c/${S.call.pq}p`, truck:v.truck.state, del:S.delivered, ps:S.pshipped, cash:Math.round(S.cash), staff:[...v.staffObj.values()].map(c => `${c.st.role[0]}${c.st.mach ? '-' + c.st.mach : ''}:${c.state}`).join(' '), folk:[...v.folkMap.keys()].join(','), unstuck:S.unstuck || 0 }); });
const P = await ev(() => window.__iv.P);
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 5000; S.delivered = 2; S.earned = 2400; v.hire('operator'); v.hire('loader'); v.hire('loader'); v.hire('helper'); S.staff.forEach(s => s.posted = true); v.closeOffice(); v.speed = 10; });
// clear the yard on its pad, then level up
const yard = await ev(() => window.__iv.PADS.find(p => p.id === 'yard').at); await tp(...yard); await until(() => window.__iv.S.restored.yard, 300, 'yard');
await ev(() => { window.__iv.S.levelUp = true; window.__iv.showLevelUp(); }); await wait(1500); await ev(() => document.getElementById('luOk').click()); await until(() => window.__iv.S.level === 2, 120, 'level 2');
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); }); console.log('L2 start', await st());
await ev(() => window.__iv.owner.o.position.set(window.__iv.P.pmill[0], 0, window.__iv.P.pmill[1] + 5)); await wait(3000); await p.screenshot({ path:path.join(out, 'a_l2start.png') });
// pay for the pipe machine, watch it get built
const millPad = await ev(() => window.__iv.PADS.find(p => p.id === 'mill').at); await tp(...millPad); await until(() => window.__iv.S.lv2.mill >= 1, 300, 'mill paid');
await tp(millPad[0] - 1, millPad[1] + 3); await wait(6000); await p.screenshot({ path:path.join(out, 'b_building.png') });
await until(() => window.__iv.S.lv2.mill === 2, 600, 'mill built'); console.log('mill built', await st());
// an operator for the mill
await ev(() => { const v = window.__iv; v.hire('operator'); v.S.staff.forEach(s => s.posted = true); v.closeOffice(); });
// the next call: take it, brief both operators
await ev(() => { const v = window.__iv; v.S.order = null; v.S.call = null; });
await until(() => !!window.__iv.S.call, 300, 'call'); console.log('call', await st());
await ev(() => { const v = window.__iv; v.acceptCall(); v.closeOffice(); v.briefOrder(null); });
for (let i = 0; i < 8; i++) { await wait(5000); if (i === 5) { await tp(P.pmill[0], P.pmill[1] + 5); await wait(2500); await p.screenshot({ path:path.join(out, 'c_mill_running.png') }); } }
await until(() => window.__iv.truck.state === 'docked', 300, 'docked'); await tp(9, 9); await wait(9000); await p.screenshot({ path:path.join(out, 'd_lane.png') });
// the warehouse on its plot
await ev(() => { const v = window.__iv; v.S.pshipped = 12; v.S.cash += 2000; }); const whPad = await ev(() => window.__iv.PADS.find(p => p.id === 'wh').at); await tp(...whPad);
await until(() => window.__iv.S.lv2.wh >= 1, 300, 'wh paid'); await until(() => window.__iv.S.lv2.wh === 2, 600, 'wh built'); await tp(whPad[0], whPad[1] + 6); await wait(3000); await p.screenshot({ path:path.join(out, 'e_warehouse.png') }); console.log('wh', await st());
await ev(() => window.__iv.openOffice('stock')); await wait(1200); console.log('STOCK', await ev(() => document.querySelector('#office .body').innerText.replace(/\n+/g, ' | ').slice(0, 500)));
await ev(() => window.__iv.openOffice('plant')); await wait(1200); console.log('PLANT', await ev(() => document.querySelector('#office .body').innerText.replace(/\n+/g, ' | ').slice(0, 700))); await ev(() => window.__iv.closeOffice());
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
