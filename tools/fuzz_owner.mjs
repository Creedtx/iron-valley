// Walks the owner over a grid of the whole site in a running level 2 factory, lingering at each spot so he
// inspects and questions whoever is there, and fails on the first page error (an error inside the game loop
// freezes the game). Also checks the game keeps advancing.   node tools/fuzz_owner.mjs <url> [minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, mins = '8'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
await p.evaluate(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); Object.assign(v.S, { tut:99, tutDone:true, mechIntro:true, cash:9000, delivered:6, shipped:40, rep:90 });
  for (const r of ['operator', 'loader', 'loader']) v.hire(r); v.S.levelUp = true; v.S.lv2.mill = 2; await v.startLevel(2); v.hire('operator'); v.hire('loader');
  v.S.coils = 4; v.buyUpgrade('gen2'); v.speed = 3; });
const spots = []; for (let x = -3; x <= 20; x += 1.5) for (let z = .8; z <= 11; z += 1.5) spots.push([x, z]);
const t0 = Date.now(); let i = 0, lastT = -1, frozen = 0;
while (Date.now() - t0 < mins * 60000 && !errs.length) {
  const [x, z] = spots[(i++ * 7) % spots.length];
  const s = await p.evaluate((x, z) => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); if (S.call) v.acceptCall(); if (S.order && !S.order.briefed && Math.random() < .3) v.briefOrder(v.owner); if (!S.delivery) { if (S.coils < 2) v.orderSteel(4); else if (S.store < 8) v.orderTimber(12); }
    v.owner.o.position.set(x, 0, z); return { t:S.time, talks:S.talks || 0 }; }, x, z);
  await new Promise(r => setTimeout(r, 1300));
  if (s.t === lastT) frozen++; else frozen = 0; lastT = s.t;
  if (frozen >= 3) { errs.push('game time stopped advancing'); break; }
}
const end = await p.evaluate(() => ({ t:Math.round(window.__iv.S.time), talks:window.__iv.S.talks, del:window.__iv.S.delivered }));
console.log(JSON.stringify(end), errs.length ? 'ERRORS\n' + errs.slice(0, 3).join('\n---\n') : 'no errors');
await b.close(); process.exit(errs.length ? 1 : 0);
