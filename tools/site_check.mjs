// Build 0.13.2 checks: the bought scrapyard is walkable through the gate in the back yard (and the rest of the fence
// still holds); the licence inspector fails a site that is not ready, lists what to fix, and passes it once fixed.
//   node tools/site_check.mjs <url> <outDir>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/site'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const ev = (f, ...a) => p.evaluate(f, ...a), sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails++; };
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:3, xp:0, energy:100, focus:100, look }, extra);
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true }, plots:{ north:{ st:3 }, scrap:{ st:3 } }, level:3, cash:3000, earned:9000, rep:80, delivered:30, orderSeq:30, tut:99, tutDone:true,
  lv2:{ e0:0, mill:2, wh:2 }, wh:{ c:0, p:0, t:0, make:true }, coils:4, tfeed:2, tcoil:6, lv3:{ e0:9000, f0:0, field:true, press:2, licence:0, seq:3, jam:true }, restored:{ yard:true }, up:{ gen2:2 }, parts:0, water:0, cooler:2, wcClean:90, owner:[-6.5, 9.6], nextId:6,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Kim', 'loader'), staff(3, 'Hank', 'loader'), staff(4, 'Rita', 'operator', { mach:'pipe' }), staff(5, 'Dot', 'operator', { mach:'tool' })] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); }
  setInterval(() => { if (window.__iv && window.__iv.cardOpen && !document.querySelector('#storyBody.licence')) window.__iv.nextCard(); }, 200); }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.l3Built', { timeout:90000 }); await sleep(1500);
// 1. the gate: walking west from the back yard at the gate reaches the yard; walking west elsewhere hits the fence
// the headless renderer is slow, so the walk runs at triple game speed to cover the distance
const walkWest = async (z, ms) => { await ev(z => { window.__iv.speed = 3; window.__iv.owner.o.position.set(-7.3, 0, z); }, z); await sleep(300); await p.keyboard.down('a'); await sleep(ms); await p.keyboard.up('a'); await sleep(300); return ev(() => { window.__iv.speed = 1; return window.__iv.owner.o.position.x; }); };
const xGate = await walkWest(9.6, 5000); check(xGate < -10, `through the gate into the scrapyard (x ${xGate.toFixed(1)})`); await shot('site_scrapyard');
const xFence = await walkWest(5.0, 3000); check(xFence > -8.5, `the rest of the fence still holds (x ${xFence.toFixed(1)})`);
const sign = await ev(() => !!window.__iv.M.scrapOpen); check(sign, 'the scrapyard is opened on load (gate out, junk cleared, level 4 board up)');
// 2. the licence: the Town tab shows the checklist; an unready site fails and the report says what to fix
await ev(() => { const v = window.__iv; v.owner.o.position.set(2.1, 0, 8.8); }); await sleep(1500);
await ev(() => { window.__iv.openOffice('town'); }); await sleep(700); await ev(() => document.querySelector('[data-licence]').scrollIntoView()); await shot('site_town_checklist');
const before = await ev(() => window.__iv.INSPECT.map(c => c.id + ':' + c.ok()).join(' ')); console.log('checklist before', before);
await ev(() => document.querySelector('[data-licence]').click()); await ev(() => window.__iv.closeOffice()); await ev(() => { window.__iv.speed = 6; });
const until = async (fn, secs) => { const t0 = Date.now(); while (Date.now() - t0 < secs * 1000) { if (await ev(fn)) return true; await sleep(500); } return false; };
check(await until(() => window.__iv.S.lv3.licence === 3 && !!window.__iv.inspector, 120), 'the inspector arrives and walks the site');
await ev(() => { const i = window.__iv.inspector; window.__iv.owner.o.position.set(i.o.position.x + 1, 0, i.o.position.z + 1); }); await sleep(900); await shot('site_inspector');
check(await until(() => window.__iv.S.lv3.licence === 4, 200), 'an unready site fails the inspection');
await sleep(600); await shot('site_report'); const failed = await ev(() => Object.entries(window.__iv.S.lv3.check).filter(([, v]) => !v).map(([k]) => k).join(','));
check(failed.includes('ppe') && failed.includes('crew') && failed.includes('parts'), `the report lists what to fix (${failed})`);
await ev(() => window.__iv.nextCard());
// 3. put it right and book again
await ev(() => { const v = window.__iv; v.S.cash = 5000; v.buyUpgrade('ppe'); v.hire('electrician'); v.hire('mechanic'); v.orderParts(); v.orderWater(); v.S.wcClean = 95; });
check(await ev(() => window.__iv.licReady()), 'every checklist line is ticked after the fixes');
await ev(() => window.__iv.applyLicence());
check(await until(() => window.__iv.S.lv3.licence === 2, 260), 'the re-inspection passes and the licence is granted');
await sleep(600); await shot('site_certificate'); await ev(() => window.__iv.nextCard());
check(await ev(() => window.__iv.charter().find(c => c.k === 'Papers').get(window.__iv.S) >= 1), 'the charter papers line counts the licence');
// 4. the warehouse grew a tool rack at level 3: the press makes tools to stock and loaders shelve them
check(await ev(() => !!window.__iv.M.whTools && window.__iv.whCapT() >= 12), 'the warehouse has a tool rack at level 3');
await ev(() => { const v = window.__iv; v.S.cash = Math.max(v.S.cash, 2000); if (v.S.coils < 2) v.orderSteel(4); if (v.S.call) v.declineCall(); });
check(await until(() => { const v = window.__iv; if (v.S.call) v.acceptCall(); if (v.S.order && !v.S.order.briefed) v.briefOrder(v.owner); if (v.S.order && v.S.order.ready) v.signOrder(v.owner); return v.S.wh.t >= 3; }, 300), 'spare tools are stocked in the warehouse');
await ev(() => { window.__iv.speed = 1; window.__iv.owner.o.position.set(-5.4, 0, 6.2); }); await sleep(2500); await shot('site_warehouse_tools');
const office = await ev(() => { window.__iv.openOffice('stock'); return document.getElementById('office').textContent; }); await ev(() => window.__iv.closeOffice());
check(/Tools.*\d+ \/ \d+/.test(office), 'the Stock tab shows the tools in the warehouse');
check(!errs.length, `no page errors ${errs.slice(0, 2).join(' | ')}`);
await b.close(); console.log(fails ? `${fails} failed` : 'all site checks passed'); process.exit(fails ? 1 : 0);
async function shot(n){ await p.screenshot({ path:path.join(out, n + '.png') }); }
