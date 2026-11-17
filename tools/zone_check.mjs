// Level 4 supervisor zone and walker check (build 0.14.1): Rita the pipe operator works her machine without
// circling, is promoted and led to a post; the blue ring appears at the post, fades out after a few seconds,
// never follows her round the site, and the zone stays at the post while she walks off to sign a truck.
//   node tools/zone_check.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/zone'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text()); });
const shot = n => p.screenshot({ path:path.join(out, n + '.png') });
const ev = (f, ...a) => p.evaluate(f, ...a); const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = false;
const look = { parts:['hat_hard', 'hair_short'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' };
const staff = (id, name, role, extra = {}) => Object.assign({ id, name, role, lv:5, xp:0, energy:100, focus:100, look }, extra);
const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true, council:true }, plots:{ north:{ st:3 }, scrap:{ st:3, offer:'sweet' }, road:{ st:0 } }, perks:{ freeCrateMachine:true },
  level:4, cash:6000, earned:40000, rep:78, delivered:40, ontime:39, shipped:260, pshipped:80, tshipped:80, orderSeq:40, fixed:20, timber:12, store:24, feed:6, tut:99, tutDone:true, mechIntro:true, officeSeen:true,
  coils:4, coilFeed:2, coilLeft:2, tfeed:2, tcoil:6, parts:4, water:4, cooler:20, wcClean:95,
  lv2:{ e0:2600, mill:2, buildT:18, seq:12, wh:2 }, wh:{ c:0, p:0, t:0, make:true }, lv3:{ e0:9000, f0:6, field:true, press:2, licence:2, seq:9, jam:true }, lv4:{ e0:30000, saw2:0, seq:0 },
  restored:{ lights:true, paint:true, windows:true, coffee:true, yard:true, mill:true }, up:{ gen2:3, stack:2, saw:2, hands:2, tools:2, back:1, ppe:1, whcap:1 },
  ticks:{}, owner:[9.0, 6.2], nextId:11,
  staff:[staff(1, 'Walt', 'operator'), staff(2, 'Tom', 'loader'), staff(3, 'Kim', 'loader'), staff(4, 'Hank', 'loader'), staff(5, 'Rita', 'operator', { mach:'pipe' }), staff(6, 'Dale', 'operator', { mach:'tool' }),
         staff(7, 'June', 'electrician'), staff(8, 'Ray', 'mechanic'), staff(9, 'Pat', 'cleaner')] };
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.l4Built', { timeout:90000 });
const tick = () => ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; if (S.call) v.acceptCall(); if (!S.delivery && S.store + S.timber + S.feed < 12) v.orderTimber(24);
  if (S.cashPile > 0 && !v.supervisor()) {} });
const rita = () => ev(() => { const v = window.__iv, c = [...v.staffObj.values()].find(o => o.st.name === 'Rita'); return c ? { x:c.o.position.x, z:c.o.position.z, st:c.state, role:c.st.role } : null; });
// phase A: Rita at the pipe machine. Her walking distance and how far she ever is from the machine.
await ev(() => window.__iv.speed = 4);
let travelled = 0, prev = await rita(), far = 0, samples = 0, workSamples = 0; const pop = await ev(() => window.__iv.P.pop);
const t0 = Date.now(); while (Date.now() - t0 < 40000) { await tick(); await sleep(250); const r = await rita(); travelled += Math.hypot(r.x - prev.x, r.z - prev.z); prev = r; samples++; if (r.st === 'work') workSamples++; far = Math.max(far, Math.hypot(r.x - pop[0], r.z - pop[1])); }
const A = await ev(() => ({ t:Math.round(window.__iv.S.time), unstuck:window.__iv.S.unstuck || 0, log:window.__iv.S.unstuckLog || [] }));
console.log('Rita at the pipe machine', JSON.stringify({ travelled:+travelled.toFixed(1), farthest:+far.toFixed(1), workShare:+(workSamples / samples).toFixed(2), ...A }));
// phase B: promoted, led to a post by the pipe machine
await ev(() => { const v = window.__iv; v.S.cash = Math.max(v.S.cash, 500); v.promote(5); });
const promoted = await ev(() => { const s = window.__iv.supervisor(); return s && s.st.name; }); console.log('supervisor', promoted); if (promoted !== 'Rita') fail = true;
const ringWhileFollow = [];
for (let i = 0; i < 20 && !(await ev(() => !!window.__iv.S.lv4.post)); i++) { await ev(() => { const v = window.__iv, h = [v.P.pop[0] + 1.2, v.P.pop[1] + 1.4]; v.owner.o.position.set(h[0], 0, h[1]); while (v.cardOpen) v.nextCard(); }); await sleep(600); ringWhileFollow.push(await ev(() => !window.__iv.S.lv4.post && window.__iv.zoneRing ? window.__iv.zoneRing.visible : false)); }
const post = await ev(() => window.__iv.S.lv4.post); console.log('post', JSON.stringify(post)); if (!post) fail = true;
if (ringWhileFollow.some(Boolean)) { console.log('FAIL: ring shown while Rita follows the owner'); fail = true; }
await ev(() => window.__iv.speed = 1); await sleep(1200); await shot('z1_post_ring');
const justSet = await ev(() => { const v = window.__iv, g = v.zoneRing; return { vis:g.visible, at:[+g.position.x.toFixed(2), +g.position.z.toFixed(2)] }; }); console.log('ring just after the post is set', JSON.stringify(justSet));
if (!justSet.vis || Math.hypot(justSet.at[0] - post[0], justSet.at[1] - post[1]) > .01) { console.log('FAIL: ring not shown at the post'); fail = true; }
await ev(() => { const v = window.__iv; v.speed = 4; v.owner.o.position.set(9.0, 0, 6.2); });
await p.waitForFunction('window.__iv.zoneRing && !window.__iv.zoneRing.visible', { timeout:30000 }).catch(() => { console.log('FAIL: ring never faded'); fail = true; });
// phase C: ring gone; Rita sent across the site (a truck to sign) — no ring follows her, the zone stays at the post
const ringLog = []; let maxAway = 0; const t1 = Date.now();
while (Date.now() - t1 < 45000) { await tick(); await sleep(400);
  const s = await ev(() => { const v = window.__iv, c = v.supervisor(), g = v.zoneRing, zc = v.zoneCentre(); return { vis:g.visible, gx:g.position.x, gz:g.position.z, x:c.o.position.x, z:c.o.position.z, st:c.state, zc }; });
  ringLog.push(s.vis); maxAway = Math.max(maxAway, Math.hypot(s.x - post[0], s.z - post[1]));
  if (s.zc && (s.zc[0] !== post[0] || s.zc[1] !== post[1])) { console.log('FAIL: zone centre left the post', JSON.stringify(s)); fail = true; break; } }
const shown = ringLog.filter(Boolean).length; console.log('ring samples visible after fade', shown, 'of', ringLog.length, '| Rita farthest from post', maxAway.toFixed(1));
if (shown) { console.log('FAIL: ring still drawn after the fade'); fail = true; }
const inZone = await ev(() => [...window.__iv.staffObj.values()].filter(c => c.zone).map(c => c.st.name)); console.log('in zone', JSON.stringify(inZone)); if (!inZone.length) fail = true;
// the Wider zone upgrade shows it again for a moment
await ev(() => { const v = window.__iv; v.S.cash += 5000; v.buyUpgrade('radio'); }); await sleep(300);
const wider = await ev(() => window.__iv.zoneRing.visible); console.log('ring after Wider zone', wider); if (!wider) fail = true;
await ev(pp => { const v = window.__iv; v.speed = 1; v.owner.o.position.set(pp[0] + 1.5, 0, pp[1] + 1.5); }, post); await sleep(800); await shot('z2_wider');
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 4)) : 'no page errors');
await b.close(); process.exit(fail || errs.length ? 1 : 0);
