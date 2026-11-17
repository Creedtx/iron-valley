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
await ev(() => { const v = window.__iv; v.S.cash = 1800; v.hire('operator'); v.hire('loader'); v.hire('loader'); v.S.staff.forEach(s => s.posted = true); v.S.call = { qty:60, pq:0, tq:0, pay:720, client:'Test', deadline:300 }; });
await wait(1500);
for (const t of ['orders', 'staff', 'stock', 'plant', 'upgrades', 'town', 'charter']) {
  await ev(t => { window.__iv.openOffice(t); }, t); await wait(700);
  await ev(t => { const b = document.querySelector(`#office [data-tab="${t}"]`); b && b.click(); }, t); await wait(700);
  const txt = await ev(() => document.querySelector('#office .body').innerText.replace(/\n+/g, ' | '));
  const dis = await ev(() => [...document.querySelectorAll('#office .body button[disabled]')].map(b => b.innerText.replace(/\n/g, ' ')).join(' ; '));
  console.log(`== ${t}\n${txt.slice(0, 2500)}\n  DISABLED: ${dis}`);
  await p.screenshot({ path:path.join(out, `tab_${t}.png`) });
}
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
