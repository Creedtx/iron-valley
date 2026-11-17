// Close-ups of character poses in game (deviceScaleFactor 3, clipped).
//   node tools/closeup.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:3 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const logs = []; p.on('pageerror', e => logs.push(e.message));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const scr = async (name, wx, wz) => { const xy = await p.evaluate(([x, z]) => { const v = window.__iv; return v.project(x, .6, z); }, [wx, wz]);
  await p.screenshot({ path:`${out}/${name}.png`, clip:{ x:Math.max(0, xy[0] - 90), y:Math.max(0, xy[1] - 110), width:180, height:180 } }); };
await p.evaluate(() => { const v = window.__iv; v.S.tut = 8; v.S.tutDone = true; v.speed = 5; v.owner.o.position.set(7.2, 0, 4.6); });
await wait(3000);
// owner idle with the clipboard
await scr('c1_owner_idle', 7.2, 4.6);
// Walt slacking on the phone
await p.evaluate(() => { const c = [...window.__iv.staffObj.values()].find(c => c.st.role === 'operator'); c.st.focus = 0; window.__iv.owner.o.position.set(10, 0, 8); });
await wait(4000); console.log(await p.evaluate(() => [...window.__iv.staffObj.values()].map(c => c.st.name + ':' + c.state + ':' + Math.round(c.st.focus) + ':' + c.zone).join(' '))); await p.waitForFunction(() => [...window.__iv.staffObj.values()].some(c => c.state === 'slack'), { timeout:60000 });
await p.evaluate(() => window.__iv.speed = 1); await wait(1500); const w = await p.evaluate(() => { const c = [...window.__iv.staffObj.values()].find(c => c.st.role === 'operator'); return [c.o.position.x, c.o.position.z]; });
await p.evaluate(([x, z]) => window.__iv.owner.o.position.set(x + 2.5, 0, z + 1.2), w); await wait(1500); await scr('c2_phone', ...w);
// Tom with a jerrycan
await p.evaluate(() => { window.__iv.speed = 5; window.__iv.S.power.fuel = 30; window.__iv.owner.o.position.set(1.4, 0, 4.4); });
await p.waitForFunction(() => [...window.__iv.staffObj.values()].some(c => c.state === 'toFiller'), { timeout:90000 });
await p.evaluate(() => window.__iv.speed = 1); await wait(400); await p.evaluate(() => { const c = [...window.__iv.staffObj.values()].find(c => c.state === 'toFiller'); window.__iv.owner.o.position.set(c.o.position.x + 1.2, 0, c.o.position.z + 1.5); }); await wait(1200); const t = await p.evaluate(() => { const c = [...window.__iv.staffObj.values()].find(c => c.state === 'toFiller'); return [c.o.position.x, c.o.position.z]; });
await scr('c3_jerrycan', ...t);
console.log(logs.join('\n') || 'ok');
await b.close();
