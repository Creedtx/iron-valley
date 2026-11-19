// level 3 with a full crew: record everyone's footsteps from 16:55 to the gates shutting, and from 07:00 until all are at their posts;
// then draw the trails over a top-down view of the yard (and the collision boxes in thin red)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2);   // node tools/trails.mjs <url> <outPrefix>  ->  <outPrefix>.png and .json
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1200000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1000, height:1000, deviceScaleFactor:1 }); await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
p.on('pageerror', e => console.log('ERR', e.message));
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
await p.evaluate(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 30000; S.rep = 64; S.orderSeq = 6; S.delivered = 6; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.evNext = 1e9; v.applyRestore('yard', false); S.levelUp = true;
  await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice(); for (const st of v.S.staff) st.posted = true;
  v.S.plots.north = { st:3 }; v.buyField(false); v.S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false);
  for (const r of ['operator', 'mechanic', 'loader', 'helper', 'cleaner', 'supervisor']) v.hire(r); v.closeOffice(); for (const st of v.S.staff) st.posted = true; while (v.cardOpen) v.nextCard(); });
const res = await p.evaluate(() => { const v = window.__iv, S = v.S; v.hold = true; const tr = new Map(); let t = 0;
  const people = () => { const a = [...v.staffObj.values()].map(c => [c.st.name + ' ' + c.st.role, c]); const g = v.folk.get('gus'); if (g) a.push(['Gus', g]); return a; };
  const rec = ph => { for (const [n, c] of people()) { if (!c.o.visible) continue; const k = ph + ':' + n; if (!tr.has(k)) tr.set(k, []); const a = tr.get(k), q = c.o.position; const l = a[a.length - 1]; if (!l || Math.hypot(l[0] - q.x, l[1] - q.z) > .15) a.push([+q.x.toFixed(2), +q.z.toFixed(2)]); } };
  const run = (secs, ph, stop) => { for (let i = 0; i < secs * 20; i++) { if (v.cardOpen) { if (/Day book/i.test(document.getElementById('storyBody').innerText) && ph === 'pm') return; v.nextCard(); } if (S.call) { v.acceptCall(); v.closeOffice(); } if (S.order && !S.order.briefed) v.briefOrder(null); v.step(.05); t += .05; if (i % 2 === 0) rec(ph); if (stop && stop()) return; } };
  run(60, 'x'); tr.clear(); S.time = v.dayNo() * 480 + 474; run(200, 'pm');
  v.nextCard(); run(90, 'am', () => [...v.staffObj.values()].every(c => c.state !== 'arrive' && !c.holdUntil) && false);
  v.hold = false; return { trails:[...tr.entries()], col:[...v.COL.entries()].map(([k, b]) => [String(k), b]) }; });
fs.writeFileSync(out + '.json', JSON.stringify(res));
// top-down picture: camera straight down over the whole site
await p.evaluate(() => { const v = window.__iv; v.camLock = [5, -4]; v.camZoom = 3.2; });
await new Promise(r => setTimeout(r, 4000));
const proj = await p.evaluate(({ trails, col }) => { const v = window.__iv, cam = v.cam, W = innerWidth, H = innerHeight; const V3 = cam.position.constructor;
  const pr = (x, z) => { const q = new V3(x, 0, z).project(cam); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; };
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; Object.assign(cv.style, { position:'fixed', left:0, top:0, zIndex:99999, pointerEvents:'none' }); document.body.appendChild(cv); const g = cv.getContext('2d');
  g.strokeStyle = 'rgba(255,0,0,.8)'; g.lineWidth = 1; for (const [, b] of col) { const a = pr(b[0], b[1]), c = pr(b[2], b[1]), d = pr(b[2], b[3]), e = pr(b[0], b[3]); g.beginPath(); g.moveTo(...a); g.lineTo(...c); g.lineTo(...d); g.lineTo(...e); g.closePath(); g.stroke(); }
  for (const [k, pts] of trails) { g.strokeStyle = k.startsWith('pm') ? 'rgba(255,220,0,.95)' : 'rgba(0,230,255,.95)'; g.lineWidth = 2.5; g.beginPath(); pts.forEach((q, i) => { const s = pr(q[0], q[1]); i ? g.lineTo(...s) : g.moveTo(...s); }); g.stroke(); }
  return true; }, res);
for (const id of ['hud', 'chips', 'nav', 'ticket', 'obj']) await p.evaluate(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }, id);
await p.screenshot({ path:out + '.png' });
console.log('trails', res.trails.length, 'points', res.trails.reduce((n, [, a]) => n + a.length, 0)); await b.close();
