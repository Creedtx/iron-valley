// Regression for the stuck-Walt bug: a save whose open order was taken in an old build (no 'cut', no
// 'briefed'), exactly like the player's order #14. The saw must start cutting and the order must finish.
//   node tools/legacy_order.mjs <url>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const save = { v:6, level:2, lv2:{ e0:2600, mill:0, buildT:0, seq:0 }, cash:0, earned:2600, rep:82, delivered:13, ontime:12, shipped:90, orderSeq:14, timber:10, store:10, feed:4, pallet:0, bed:8, tut:10, tutDone:true, mechIntro:true,
  order:{ qty:14, pay:819, client:'Kerr & Sons', deadline:186, id:14, time:400, ready:false },   // no cut, no briefed: taken in build 0.5
  staff:[{ id:1, name:'Walt', role:'operator', lv:4, xp:54, energy:51, focus:94, look:{ parts:['hat_hard', 'earmuffs', 'hair_short', 'stache'], skin:'#e0ac85', hair:'#b8b2a6', shirt:'#c9b28a' } },
         { id:2, name:'Tom', role:'loader', lv:2, xp:0, energy:100, focus:100, look:{ parts:['vest', 'hat_cap', 'hair_short'], skin:'#9b6a43', hair:'#1a1a1a', shirt:'#d8d2c2' } }], nextId:3, owner:[8.4, 6.0] };
// write the save before any game code runs, so the game cannot overwrite it first
await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } }, JSON.stringify(save));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv', { timeout:90000 });
console.log('S', await p.evaluate(() => JSON.stringify({ lv:window.__iv.S.level, cash:window.__iv.S.cash, o:window.__iv.S.order, ls:(localStorage.getItem('iron-valley-save') || '').slice(0, 200) })));
const s0 = await p.evaluate(() => { const o = window.__iv.S.order; return { cut:o.cut, briefed:o.briefed, pq:o.pq, sawOn:window.__iv.sawOn }; });
console.log('after load', JSON.stringify(s0));
await p.evaluate(() => { window.__iv.speed = 6; });
let ok = false; for (let i = 0; i < 90 && !ok; i++) { await new Promise(r => setTimeout(r, 1000)); ok = await p.evaluate(() => (window.__iv.S.order ? window.__iv.S.order.cut : 99) >= 10); }
const s1 = await p.evaluate(() => { const S = window.__iv.S, o = S.order; return { cut:o && o.cut, bed:S.bed, delivered:S.delivered, ticket:document.getElementById('ticket').innerText.replace(/\s+/g, ' ') }; });
console.log('later', JSON.stringify(s1));
const pass = s0.cut === 8 && s0.briefed === true && ok && !/undefined|NaN/.test(s1.ticket) && !errs.length;
console.log(pass ? 'PASS: the legacy order is repaired and Walt cuts it' : 'FAIL', errs.slice(0, 3)); await b.close(); process.exit(pass ? 0 : 1);
