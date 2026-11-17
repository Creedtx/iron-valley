// Shots of the new wide level 1 yard (build 0.16 preview).
//   node tools/yard_shot.mjs <url> <outDir>   env: SAVE (json merged into a fresh level 1 save), SHOTS ("x,z,zoom;..."), PHONE=1, W/H
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/yard'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
const phone = !!process.env.PHONE;
await p.setViewport(phone ? { width:390, height:844, deviceScaleFactor:+(process.env.DPR || 2) } : { width:+(process.env.W || 1400), height:+(process.env.H || 900), deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const save = process.env.SAVE ? JSON.parse(process.env.SAVE) : null;
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); if (s) localStorage.setItem('iron-valley-wide-preview', s); }
  setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); }, save ? JSON.stringify(save) : '');
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.frames > 30', { timeout:120000 });
await new Promise(r => setTimeout(r, 2500));
const shots = (process.env.SHOTS || '').split(';').filter(Boolean).map(s => s.split(',').map(Number));
if (!shots.length) { await p.screenshot({ path:path.join(out, 'play.png') }); }
for (const [x, z, zoom = 1, hud = 0] of shots) {
  await p.evaluate(([x, z, zoom, hud]) => { const v = window.__iv; v.camZoom = zoom; v.camLock = isNaN(x) ? null : [x, z]; if (!hud) document.getElementById('hud').style.display = 'none'; }, [x, z, zoom, hud]);
  await new Promise(r => setTimeout(r, 1800)); await p.screenshot({ path:path.join(out, `y_${x}_${z}_${zoom}.png`) }); }
if (process.env.OFFICE) { await p.evaluate(t => { document.getElementById('hud').style.display = ''; window.__iv.openOffice(t); }, process.env.OFFICE); await new Promise(r => setTimeout(r, 1500)); await p.screenshot({ path:path.join(out, 'office.png') }); }
const info = await p.evaluate(() => { const v = window.__iv; return { nav:v.NAV ? v.NAV.length : null }; }).catch(() => ({}));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 8)) : 'ok', JSON.stringify(info)); await b.close();
