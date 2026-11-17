// Plays the whole of level 1 the way a player would: day one by hand, then an operator and a loader,
// taking every call, briefing, ordering timber, signing and collecting. Logs the saw's reason every 10 s.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, mins = '12'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear(); } setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:180000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 3000; S.delivered = 2; v.closeOffice(); v.speed = 4; });
const shot = async (n, x, z) => { await ev(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), [x, z]); await wait(4000); await p.screenshot({ path:path.join(out, n + '.png') }); };
const P = await ev(() => window.__iv.P);
await shot('w0_before', P.workshop[0] + 2, P.workshop[1] + 7);
for (const id of ['lights', 'paint', 'windows', 'yard']) {
  const at = await ev(id => window.__iv.PADS ? window.__iv.PADS.find(p => p.id === id).at : null, id);
  if (!at) { console.log('no PADS hook'); break; }
  await ev(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), at);
  const ok = await p.waitForFunction(id => window.__iv.S.restored[id], { timeout:120000 }, id).then(() => true).catch(() => false);
  console.log(id, 'bought', ok, 'cash', await ev(() => Math.round(window.__iv.S.cash)));
  await ev(() => window.__iv.owner.o.position.set(window.__iv.P.workshop[0] + 2, 0, window.__iv.P.workshop[1] + 7)); await wait(1500);
}
await shot('w1_after', P.workshop[0] + 2, P.workshop[1] + 7);
await shot('w2_inside', P.workshop[0] + 1, P.workshop[1]);
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
