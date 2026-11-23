// Prints every collision box (and nav-out box) touching a region of the yard at a given level.
//   node tools/col_dump.mjs <url> <level> x0 z0 x1 z1
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, lvA = '4', ...r] = process.argv.slice(2); const [x0, z0, x1, z1] = r.map(Number);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:900000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setRequestInterception(true);
p.on('request', q => { const u = q.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'; if (u.startsWith(pre)) return q.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) }); if (u.includes('fonts.g')) return q.abort(); q.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
console.log(JSON.stringify(await p.evaluate(async ([lv, x0, z0, x1, z1]) => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.cash = 1e5; v.evNext = 1e9;
  if (lv >= 2) { v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); }
  if (lv >= 3) { S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.startPressBuild(false); v.finishPress(false); }
  if (lv >= 4) { S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); }
  while (v.cardOpen) v.nextCard(); const out = [];
  for (const [k, bx] of v.COL) if (bx[2] >= x0 && bx[0] <= x1 && bx[3] >= z0 && bx[1] <= z1) out.push([k, bx.map(n => +n.toFixed(2))]);
  return out; }, [+lvA, x0, z0, x1, z1]), null, 0).replace(/\],\[/g, '],\n['));
await b.close();
