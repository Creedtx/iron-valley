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
console.log('pallet', P.pallet, 'drop', P.drop, 'truck', P.truck);
await ev(() => { const v = window.__iv, S = v.S; S.cash = 2000; v.hire('operator'); v.hire('loader'); S.staff.forEach(s => s.posted = true); S.call = { qty:40, pq:0, tq:0, pay:480, client:'Test', deadline:900 }; v.acceptCall(); v.closeOffice(); v.briefOrder(null); });
await ev(() => { window.__iv.speed = 4; });
await p.waitForFunction('window.__iv.truck.state === "docked"', { timeout:200000 });
const t0 = await ev(() => window.__iv.S.time); let last = '';
for (let i = 0; i < 400; i++) {
  const r = await ev(() => { const v = window.__iv, S = v.S, l = [...v.staffObj.values()].find(c => c.st.role === 'loader'), o = [...v.staffObj.values()].find(c => c.st.role === 'operator');
    return { t:S.time, bed:S.bed, pal:S.pallet, ls:l.state, os:o.state, fps:0, saw:v.sawReason().label[1], carry:l.stack.length, lp:[+l.o.position.x.toFixed(1), +l.o.position.z.toFixed(1)] }; });
  const k = `${r.ls}|${r.saw}`; if (k !== last) { console.log((r.t - t0).toFixed(1), JSON.stringify(r)); last = k; }
  if (r.bed >= 40 || r.t - t0 > 300) break; await wait(250); }
console.log('game secs', (await ev(() => window.__iv.S.time)) - t0, 'bed', await ev(() => window.__iv.S.bed));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
