// Unattended soak: full crew, random faults on, owner parked in the office
// doorway. Reports every 20 s; fails if deliveries stall or a fault sits
// unfixed for more than 120 game seconds.   node tools/soak.mjs <url> [minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, mins = '4'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:360, height:640 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
await p.evaluate(() => { const v = window.__iv; Object.assign(v.S, { tut:10, tutDone:true, mechIntro:true, cash:2000, delivered:1, checked:{ operator:true, loader:true } });
  for (const r of ['electrician', 'mechanic', 'loader', 'supervisor']) v.hire(r); v.owner.o.position.set(3.3, 0, 9.4); v.speed = 8; });
const t0 = Date.now(); let bad = 0, maxAge = 0, lastDel = 0, stall = 0;
while (Date.now() - t0 < mins * 60000) {
  for (let k = 0; k < 10; k++) { await new Promise(r => setTimeout(r, 2000));
    // the owner's job: answer the phone and keep timber in stock (the supervisor does the rest)
    await p.evaluate(() => { const v = window.__iv, S = v.S; if (S.call) v.acceptCall(); if (!S.delivery && S.store + S.timber + S.feed < 14) v.orderTimber(S.store <= 0 ? 24 : 12); }); }
  const s = await p.evaluate(() => { const v = window.__iv, S = v.S; return { t:Math.round(S.time), del:S.delivered, store:S.store, line:S.timber, sup:v.sup.state, cash:Math.round(S.cash), fuel:Math.round(S.power.fuel), bills:S.bills, fixed:S.fixed,
    faults:S.faults.map(f => `${f.kind}${f.diag ? '+' : '?'}${Math.round(f.t)}s`).join(','), maxAge:Math.max(0, ...S.faults.map(f => f.t)),
    staff:[...v.staffObj.values()].map(c => `${c.st.name[0]}:${c.state}:${Math.round(c.st.energy)}`).join(' '), nan:[...v.staffObj.values()].some(c => !isFinite(c.o.position.x)) }; });
  console.log(JSON.stringify(s));
  maxAge = Math.max(maxAge, s.maxAge); if (s.nan) bad++;
  if (s.del === lastDel) stall++; else stall = 0; lastDel = s.del;
}
console.log(`max fault age ${Math.round(maxAge)} s, page errors ${errs.length}`, errs.slice(0, 3));
await b.close();
process.exit(errs.length || bad || maxAge > 120 || stall >= 4 ? 1 : 0);
