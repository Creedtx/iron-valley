// Screenshot an incoming call while the owner is far from the office, then tap the card.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:2 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
await p.evaluate(() => { const v = window.__iv; Object.assign(v.S, { tut:10, tutDone:true, mechIntro:true, cash:500, delivered:1 }); v.owner.o.position.set(14, 0, 4); });
await p.waitForFunction('window.__iv.S.call', { timeout:60000 });
await new Promise(r => setTimeout(r, 2500)); await p.screenshot({ path:path.join(out, 'call_far.png') });
await p.click('#callc'); await new Promise(r => setTimeout(r, 1200)); await p.screenshot({ path:path.join(out, 'call_answered.png') });
console.log('errors', errs);
await b.close();
