// A level 3 save, then Charter tab -> "Start over from level 1" (two taps): the page reloads into the letter at level 1, and stays there.
//   node tools/newgame_check.mjs <url> <outDir>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const save = { v:6, level:3, cash:5000, earned:9000, rep:80, delivered:30, tut:99, tutDone:true, lv2:{ e0:0, mill:2 }, lv3:{ field:true, press:2 }, owner:[8.4, 6.0], nextId:2,
  staff:[{ id:1, name:'Walt', role:'operator', lv:3, xp:0, energy:100, focus:100, look:{ parts:['hat_hard'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' } }] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner', { timeout:90000 });
const before = await p.evaluate(() => ({ level:window.__iv.S.level, staff:window.__iv.S.staff.length }));
await p.evaluate(() => window.__iv.openOffice('charter')); await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => document.querySelector('[data-armed="newgame"]').scrollIntoView()); await p.screenshot({ path:out + '/r1_button.png' });
await p.evaluate(() => document.querySelector('[data-armed="newgame"]').click()); await new Promise(r => setTimeout(r, 1200)); await p.evaluate(() => document.querySelector('[data-armed="newgame"]').scrollIntoView()); await p.screenshot({ path:out + '/r2_confirm.png' });
await Promise.all([p.waitForNavigation({ waitUntil:'domcontentloaded' }), p.evaluate(() => document.querySelector('[data-armed="newgame"]').click())]);
await p.waitForFunction('window.__iv && window.__iv.owner', { timeout:90000 }); await new Promise(r => setTimeout(r, 1500));
const after = await p.evaluate(() => ({ level:window.__iv.S.level, staff:window.__iv.S.staff.length, cash:window.__iv.S.cash, letter:window.__iv.cardOpen, kind:document.querySelector('#storyBody').className }));
await p.screenshot({ path:out + '/r3_after.png' });
// reload once more: the new game must persist (no old save coming back)
await p.reload({ waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner', { timeout:90000 });
const again = await p.evaluate(() => ({ level:window.__iv.S.level, staff:window.__iv.S.staff.length }));
console.log(JSON.stringify({ before, after, again, errs }));
const ok = before.level === 3 && after.level === 1 && after.staff === 0 && after.cash === 400 && after.letter && again.level === 1 && !errs.length;
console.log(ok ? 'RESET OK' : 'RESET FAILED'); await b.close(); process.exit(ok ? 0 : 1);
