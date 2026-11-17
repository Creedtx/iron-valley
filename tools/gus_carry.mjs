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
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear(); }  });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:180000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
await p.waitForFunction('!window.__iv.cardOpen || document.querySelector("#storyBody [data-next]")', { timeout:60000 });
// past the letter and Gus's first scene
for (let i = 0; i < 6; i++) { if (!(await ev(() => window.__iv.cardOpen))) break; await ev(() => window.__iv.nextCard()); await wait(300); }
const g = () => ev(() => { const v = window.__iv, c = v.folkMap.get('gus'); return c ? { job:c.job, gs:c.gs, at:[+c.o.position.x.toFixed(1), +c.o.position.z.toFixed(1)], carry:c.stack.length, pal:v.S.pallet, bed:v.S.bed, party:v.S.gus.party, say:c.say && T < c.say.until ? c.say.text : '' } : 'gone'; }).catch(e => e.message);
await ev(() => { window.T = 0; });
// carrying: operator posted, no loader, crates on the pallet, truck at the dock
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 5000; v.hire('operator'); S.staff.forEach(s => s.posted = true); S.call = { qty:20, pq:0, tq:0, pay:240, client:'Test', deadline:600, nodl:true }; v.acceptCall(); v.closeOffice(); v.briefOrder(null); v.speed = 8; v.owner.o.position.set(-9, 0, 8); });
await p.waitForFunction('window.__iv.truck.state === "docked"', { timeout:200000 });
await p.waitForFunction('window.__iv.S.pallet >= 3', { timeout:240000 }).catch(() => console.log('pallet never filled', 'saw'));
for (let i = 0; i < 10; i++) { await wait(3000); console.log('CARRY', JSON.stringify(await ev(() => { const v = window.__iv, c = v.folkMap.get('gus'); return { job:c.job, gs:c.gs, carry:c.stack.length, pal:v.S.pallet, bed:v.S.bed }; }))); }
await p.screenshot({ path:path.join(out, 'gus_carry.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
