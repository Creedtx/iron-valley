// A clean, pulled-back map of a brand-new game (level 1), HUD and labels hidden, plus a labelled copy.
//   node tools/map_shot.mjs <url> <outDir> [zoom] [cx] [cz]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/map', zoom = '4.2', cx = '6', cz = '6'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1600, height:1200, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('fresh')) { sessionStorage.setItem('fresh', '1'); try { localStorage.clear(); } catch(e){} } });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner', { timeout:90000 });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(([z, x, zz]) => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.camZoom = z; v.camLock = [x, zz]; }, [+zoom, +cx, +cz]);
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { for (const id of ['hud', 'ticket', 'callc', 'callEdge', 'card', 'prompt', 'officeBtn', 'toasts', 'joy', 'vignette']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
await p.screenshot({ path:path.join(out, 'level1_map_labels.png') });
await p.evaluate(() => { document.getElementById('labels').style.display = 'none'; });
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path:path.join(out, 'level1_map.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'ok', JSON.stringify(await p.evaluate(() => ({ level:window.__iv.S.level, staff:window.__iv.S.staff.length }))));
await b.close();
