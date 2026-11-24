// The whole site from above at a level, with a 5 m grid, labels every 5 m and the collision boxes, for drawing plans.
//   node tools/overview_grid.mjs <url> <out.png> [level] [zoom] [cx] [cz] [frontage]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, out, lvA = '4', zoom = '3.2', cx = '5', cz = '0', front = '1'] = process.argv.slice(2); fs.mkdirSync(path.dirname(out), { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:900000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1800, height:1500, deviceScaleFactor:1 }); await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'; if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) }); if (u.includes('fonts.g')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
await p.evaluate(async ([lv, fr]) => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1e6; v.evNext = 1e9;
  if (lv >= 2) { v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); }
  if (lv >= 3) { S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.startPressBuild(false); v.finishPress(false); }
  if (lv >= 4) { S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); v.startSaw2Build && v.startSaw2Build(false); v.finishSaw2 && v.finishSaw2(false); if (fr) { S.plots.road = { st:3 }; v.finishPlot && v.finishPlot('road', false); } }
  while (v.cardOpen) v.nextCard(); }, [+lvA, +front]);
await p.evaluate(([z, x, zz]) => { const v = window.__iv; v.camZoom = z; v.camLock = [x, zz]; v.owner.o.visible = false; }, [+zoom, +cx, +cz]);
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => { for (const id of ['hud', 'ticket', 'callc', 'callEdge', 'card', 'prompt', 'officeBtn', 'toasts', 'joy', 'vignette', 'labels', 'dock', 'fps', 'guideEdge']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const v = window.__iv; const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight; c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99'; document.body.appendChild(c);
  const x = c.getContext('2d'), V = new v.Box3().min.constructor, pr = (a, bz) => { const q = new V(a, 0, bz).project(v.cam); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight]; };
  x.lineWidth = 1; for (let a = -40; a <= 50; a += 5) { x.strokeStyle = a % 10 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,0,.45)'; x.beginPath(); x.moveTo(...pr(a, -40)); x.lineTo(...pr(a, 40)); x.stroke(); }
  for (let bz = -40; bz <= 40; bz += 5) { x.strokeStyle = bz % 10 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,0,.45)'; x.beginPath(); x.moveTo(...pr(-40, bz)); x.lineTo(...pr(50, bz)); x.stroke(); }
  x.font = 'bold 13px monospace'; for (let a = -40; a <= 50; a += 10) for (let bz = -40; bz <= 40; bz += 10) { const [sx, sy] = pr(a, bz); x.fillStyle = '#000'; x.fillText(`${a},${bz}`, sx + 4, sy - 3); x.fillStyle = '#ff0'; x.fillText(`${a},${bz}`, sx + 3, sy - 4); }
  x.strokeStyle = 'rgba(255,70,70,.75)'; for (const [, bx] of v.COL) { const q = [pr(bx[0], bx[1]), pr(bx[2], bx[1]), pr(bx[2], bx[3]), pr(bx[0], bx[3])]; x.beginPath(); x.moveTo(...q[0]); for (const t of q.slice(1)) x.lineTo(...t); x.closePath(); x.stroke(); } });
await new Promise(r => setTimeout(r, 400)); await p.screenshot({ path:out }); console.log('ok'); await b.close();
