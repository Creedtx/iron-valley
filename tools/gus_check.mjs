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
const g = () => ev(() => { const v = window.__iv, c = v.folkMap.get('gus'); return c ? { job:c.job, gs:c.gs, at:[+c.o.position.x.toFixed(1), +c.o.position.z.toFixed(1)], carry:c.stack.length, doing:v.gusDoing()[0], saw:v.sawReason().label[1], by:v.sawOn, pal:v.S.pallet, bed:v.S.bed, say:c.say && c.say.text } : null; });
// skip day one: tutorial done, an order on, no crew yet
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 2000; S.call = { qty:20, pq:0, tq:0, pay:240, client:'Test', deadline:600, nodl:true }; v.acceptCall(); v.closeOffice(); });
await ev(() => { window.__iv.speed = 3; window.__iv.owner.o.position.set(-9, 0, 8); });
for (let i = 0; i < 14; i++) { await new Promise(r => setTimeout(r, 4000)); console.log('A', JSON.stringify(await g())); }
await p.screenshot({ path:path.join(out, 'gus_saw.png') });
// post an operator: Gus should leave the machine and carry crates (no loader)
await ev(() => { const v = window.__iv; v.hire('operator'); v.S.staff.forEach(s => s.posted = true); v.closeOffice(); });
for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 4000)); console.log('B', JSON.stringify(await g())); }
await p.screenshot({ path:path.join(out, 'gus_carry.png') });
await ev(() => { const v = window.__iv; v.hire('loader'); v.S.staff.forEach(s => s.posted = true); v.closeOffice(); });
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 4000)); console.log('C', JSON.stringify(await g())); }
await ev(() => { window.__iv.openOffice('staff'); }); await new Promise(r => setTimeout(r, 1200));
console.log('STAFF', await ev(() => document.querySelector('#office .body').innerText.replace(/\n+/g, ' | ').slice(0, 500)));
await p.screenshot({ path:path.join(out, 'gus_staff.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
