// Level 4 look: the forklift at work, the second crate machine, Rusty's stall, the supervisor's ring, the porch.
//   node tools/l4_shots.mjs <url> <outDir>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/l4look'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const ev = (f, ...a) => p.evaluate(f, ...a), sleep = ms => new Promise(r => setTimeout(r, ms)), shot = n => p.screenshot({ path:path.join(out, n + '.png') });
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:4, xp:0, energy:100, focus:100, look }, extra);
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true }, plots:{ north:{ st:3 }, scrap:{ st:3 }, road:{ st:3 } }, level:4, cash:9000, earned:60000, rep:80, delivered:40, orderSeq:40, tut:99, tutDone:true,
  timber:12, store:40, feed:6, coils:4, tfeed:2, tcoil:6, parts:4, lv2:{ mill:2, wh:2 }, wh:{ c:6, p:4, t:4, make:true }, lv3:{ field:true, press:2, licence:2, jam:true }, lv4:{ e0:50000, saw2:2, feed2:2, pallet2:14, promoted:true, post:[10.0, 4.4], seq:3 },
  restored:{ yard:true }, up:{ gen2:3, gen3:1, radio:1 }, owner:[-10.5, 8.0], nextId:13,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'supervisor', { look:{ parts:['hat_hard', 'vest', 'clipboard'], skin:'#9b6a43', hair:'#1a1a1a', shirt:'#d8d2c2' } }), staff(3, 'Kim', 'loader'), staff(4, 'Hank', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }),
         staff(6, 'Dale', 'operator', { mach:'tool' }), staff(7, 'Earl', 'operator', { mach:'saw2' }), staff(8, 'Bev', 'forklift'), staff(9, 'Pat', 'cleaner')] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); }
  setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.l4Built', { timeout:90000 });
await sleep(2500); await shot('a_yard');
// follow the forklift for a while
await ev(() => { window.__iv.speed = 3; });
for (let i = 0; i < 6; i++) { await sleep(2500); const f = await ev(() => { const v = window.__iv, f = v.fork.o.position; v.owner.o.position.set(f.x + .8, 0, f.z + 1.6); return v.fork.state; }); if (i === 2 || i === 5) { await ev(() => { window.__iv.speed = 1; }); await sleep(900); await shot('b_forklift_' + i + '_' + f); await ev(() => { window.__iv.speed = 3; }); } }
await ev(() => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(-12.0, 0, 5.8); }); await sleep(2200); await shot('c_saw2');
await ev(() => { const v = window.__iv; v.owner.o.position.set(9.6, 0, 6.4); }); await sleep(2200); await shot('d_zone');
await ev(() => { const v = window.__iv; v.owner.o.position.set(9.2, 0, 12.6); }); await sleep(2000); await shot('e_porch');
await ev(() => { const v = window.__iv; v.camZoom = 2.6; v.camLock = [-6, 6]; }); await sleep(1500); await p.setViewport({ width:900, height:844 }); await sleep(1500); await shot('f_overview');
console.log(errs.length ? 'PAGE ERRORS ' + JSON.stringify(errs.slice(0, 4)) : 'no page errors'); await b.close();
