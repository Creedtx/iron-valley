// Overview shots of a level 4 site from above (camera pulled back), for layout work.
//   node tools/overview.mjs <url> <outDir> [x,z ...]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/ov', ...spots] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:900, height:900, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:5, xp:0, energy:100, focus:100, look }, extra);
const lvl = +(process.env.LEVEL || 4);
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true, council:true, priya:true, eldon:true, ada:true }, plots:{ north:{ st:3 }, scrap:{ st:3, offer:'sweet' }, road:{ st:3 } }, perks:{ freeCrateMachine:true },
  level:lvl, cash:16000, earned:60000, rep:78, delivered:40, ontime:39, shipped:260, pshipped:80, tshipped:80, orderSeq:40, fixed:20, timber:12, store:24, feed:6, tut:99, tutDone:true, mechIntro:true, officeSeen:true,
  coils:4, coilFeed:2, coilLeft:2, tfeed:2, tcoil:6, parts:4, water:4, cooler:20, wcClean:95,
  lv2:{ e0:2600, mill:2, buildT:18, seq:12, wh:2 }, wh:{ c:10, p:6, t:6, make:true }, lv3:{ e0:9000, f0:6, field:true, press:2, licence:2, seq:9, jam:true }, lv4:{ e0:30000, saw2:2, seq:3, promoted:true, post:[10, 4] },
  restored:{ lights:true, paint:true, windows:true, coffee:true, yard:true, mill:true }, up:{ gen2:3, stack:2, saw:2, hands:2, tools:2, back:1, ppe:1, whcap:1 },
  ticks:{}, owner:[9.0, 6.2], nextId:11,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'supervisor'), staff(3, 'Kim', 'loader'), staff(4, 'Hank', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }), staff(6, 'Dale', 'operator', { mach:'tool' }),
         staff(7, 'June', 'electrician'), staff(8, 'Ray', 'mechanic'), staff(9, 'Pat', 'cleaner'), staff(10, 'Earl', 'operator', { mach:'saw2' }), staff(11, 'Bev', 'forklift')] };
if (process.env.SAVE) Object.assign(save, JSON.parse(process.env.SAVE));
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); }
  setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction(`window.__iv && window.__iv.M.l${Math.min(lvl, 4)}Built`, { timeout:90000 });
await new Promise(r => setTimeout(r, 2000));
const zoom = +(process.env.ZOOM || 3.2);
const list = spots.length ? spots.map(s => s.split(',').map(Number)) : [[4, 4], [16, 12]];
for (const [x, z] of list) { await p.evaluate(([x, z, zoom]) => { const v = window.__iv; v.camZoom = zoom; v.camLock = [x, z]; document.getElementById('hud').style.display = 'none'; }, [x, z, zoom]);
  await new Promise(r => setTimeout(r, 1500)); await p.screenshot({ path:path.join(out, `ov_${x}_${z}.png`) }); }
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'ok'); await b.close();
