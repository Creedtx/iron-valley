// Marks candidate spots on the level 2 wide yard with numbered discs and takes a pulled-back picture, so a new
// placement can be checked against the paths before it goes in.
//   node tools/spot_shot.mjs <url> <out.png> '<json [[x,z,"label"],...]>' [zoom] [cx] [cz]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, pts = '[]', zoom = '2.2', cx = '4', cz = '7'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1400, height:1000, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
await p.evaluate(async ([z, x, zz, pts]) => { const v = window.__iv; while (v.cardOpen) v.nextCard(); await v.previewL2Layout(); v.camZoom = z; v.camLock = [x, zz]; v.paused = true;
  const lab = document.createElement('div'); lab.id = 'spots'; lab.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99'; document.body.appendChild(lab);
  window.__spots = pts; }, [+zoom, +cx, +cz, JSON.parse(pts)]);
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => { for (const id of ['hud', 'ticket', 'callc', 'callEdge', 'card', 'prompt', 'toasts', 'joy', 'vignette', 'labels', 'dock', 'fps']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const v = window.__iv, THREE_V = v.cam.position.constructor; const L = document.getElementById('spots');
  window.__spots.forEach(([x, z, t], i) => { const q = new THREE_V(x, 0, z).project(v.cam), sx = (q.x + 1) / 2 * innerWidth, sy = (1 - q.y) / 2 * innerHeight;
    L.insertAdjacentHTML('beforeend', `<div style="position:absolute;left:${sx - 9}px;top:${sy - 9}px;width:18px;height:18px;border-radius:50%;background:#ff2a6a;border:2px solid #fff"></div><div style="position:absolute;left:${sx + 12}px;top:${sy - 10}px;font:700 13px Arial;color:#fff;background:rgba(0,0,0,.75);padding:2px 5px;border-radius:4px">${t}</div>`); }); });
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path:out }); await b.close(); console.log('ok');
