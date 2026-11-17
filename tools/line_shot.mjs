// Close-up of the crate line running (build 0.16): takes the first call, stands the owner at the saw.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:+(process.env.DPR || 1), isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear(); } setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.S.call', { timeout:180000 });
await p.evaluate(() => { const v = window.__iv; v.acceptCall(); v.owner.o.position.set(v.P.op[0], 0, v.P.op[1]); });
const shots = (process.env.SHOTS || '0.55').split(';');
for (let i = 0; i < shots.length; i++) { const [zoom, wait = 2500, x, z] = shots[i].split(',').map(Number);
  await p.evaluate(([zoom, x, z]) => { const v = window.__iv; v.camZoom = zoom; v.camLock = x == null || isNaN(x) ? null : [x, z]; }, [zoom, x, z]);
  await new Promise(r => setTimeout(r, wait)); await p.screenshot({ path:path.join(out, `line_${i}.png`) }); }
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'ok', await p.evaluate(() => JSON.stringify({ on:window.__iv.sawOn, ord:window.__iv.S.order && window.__iv.S.order.cut })));
await b.close();
