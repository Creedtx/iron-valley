// A close, labelled picture of one spot of the yard at a given level, for placing new things (v2.0 re-fit).
//   node tools/spot_shot.mjs <url> <out.png> <level 1-4> [zoom] [cx] [cz] [grid]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, lvA = '4', zoom = '9', cx = '-6', cz = '-3', grid = '1'] = process.argv.slice(2); fs.mkdirSync(path.dirname(out), { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:900000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1400, height:1000, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
await p.evaluate(async lv => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 40000; S.rep = 70; S.orderSeq = 8; S.delivered = 8; S.sales.told = true; v.evNext = 1e9;
  if (lv >= 2) { v.hire('operator'); v.hire('loader'); v.closeOffice(); v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.closeOffice(); }
  if (lv >= 3) { S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); }
  if (lv >= 4) { S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); v.closeOffice(); }
  while (v.cardOpen) v.nextCard(); }, +lvA);
await p.evaluate(([z, x, zz]) => { const v = window.__iv; v.camZoom = z; v.camLock = [x, zz]; }, [+zoom, +cx, +cz]);
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(([g, cx0, cz0]) => { for (const id of ['hud', 'ticket', 'callc', 'callEdge', 'card', 'prompt', 'officeBtn', 'toasts', 'joy', 'vignette', 'labels']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  if (!g) return; const v = window.__iv, T = v.TX || null; const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight; c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99'; document.body.appendChild(c);
  const x = c.getContext('2d'), cam = v.cam, V = new v.Box3().min.constructor; x.font = '11px monospace';
  const pr = (a, bz) => { const q = new V(a, 0, bz).project(cam); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight]; };
  for (let a = Math.round(cx0) - 12; a <= Math.round(cx0) + 12; a++) for (let bz = Math.round(cz0) - 9; bz <= Math.round(cz0) + 9; bz++) { const [sx, sy] = pr(a, bz); if (sx < 0 || sy < 0 || sx > innerWidth || sy > innerHeight) continue; x.fillStyle = a % 5 === 0 && bz % 5 === 0 ? '#ff0' : 'rgba(255,255,0,.45)'; x.fillRect(sx - 1.5, sy - 1.5, 3, 3); if (a % 2 === 0 && bz % 2 === 0) { x.fillStyle = '#fff'; x.fillText(`${a},${bz}`, sx + 3, sy - 3); } }
  x.strokeStyle = 'rgba(255,60,60,.8)'; for (const [k, bx] of v.COL) { const q = [pr(bx[0], bx[1]), pr(bx[2], bx[1]), pr(bx[2], bx[3]), pr(bx[0], bx[3])]; x.beginPath(); x.moveTo(...q[0]); for (const t of q.slice(1)) x.lineTo(...t); x.closePath(); x.stroke(); } }, [+grid, +cx, +cz]);
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path:out });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'ok');
await b.close();
