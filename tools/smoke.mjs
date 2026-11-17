// Smoke test for build 0.5: load, check errors, take a few screenshots.
//   node tools/smoke.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g')) return r.abort(); r.continue(); });
const logs = []; p.on('console', m => { if (['error', 'warning'].includes(m.type()) && !/GPU stall|ReadPixels/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.evaluate(() => { try { localStorage.clear(); } catch(e){} });
await p.reload({ waitUntil:'domcontentloaded' });
try { await p.waitForFunction('window.__iv', { timeout:90000 }); } catch(e) { console.log('no boot', logs.join('\n')); await b.close(); process.exit(1); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const tp = (xz) => p.evaluate(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), xz);
await wait(2500); await p.screenshot({ path:`${out}/s1_start.png` });
await tp([5.0, 3.6]); await wait(2500); await p.screenshot({ path:`${out}/s2_board.png` });
await tp([10.5, 2.6]); await wait(2500); await p.screenshot({ path:`${out}/s3_maint.png` });
await tp([1.0, 4.4]); await wait(2500); await p.screenshot({ path:`${out}/s4_gen.png` });
await p.setViewport({ width:1280, height:720 }); await tp([7, 4.5]); await wait(2500); await p.screenshot({ path:`${out}/s5_wide.png` });
console.log(JSON.stringify(await p.evaluate(() => { const v = window.__iv; return { fps:v.frames, tut:v.S.tut, fuel:v.S.power.fuel, staff:[...v.staffObj.values()].map(c => c.st.name + ':' + c.state) }; })));
console.log(logs.slice(0, 20).join('\n'));
await b.close();
