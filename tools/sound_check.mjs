// Plays the whole of level 1 the way a player would: day one by hand, then an operator and a loader,
// taking every call, briefing, ordering timber, signing and collecting. Logs the saw's reason every 10 s.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, mins = '12'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
const P = await ev(() => window.__iv.P);
await p.keyboard.press('Shift'); await wait(800);
console.log('audio', await ev(() => window.__ivAudio && window.__ivAudio()));
const tp = async (x, z) => { await ev(([x, z]) => window.__iv.owner.o.position.set(x, 0, z), [x, z]); await wait(1500); };
// make the saw run: an order, briefed, owner at the operator spot
await ev(() => { const v = window.__iv; v.S.call = { qty:20, pq:0, tq:0, pay:240, client:'Test', deadline:300, nodl:true }; v.acceptCall(); v.closeOffice(); });
for (const [name, x, z] of [['at saw', ...P.op], ['by generator', P.gen[0] - 1.5, P.gen[1] + 1.4], ['in office', ...P.deskRing], ['far corner', -13, 11]]) {
  await tp(x, z); console.log(name, JSON.stringify(await ev(() => window.__ivSound())), 'sawOn', await ev(() => window.__iv.sawOn)); }
await ev(() => { window.__iv.speed = 3; }); await tp(P.truck[0] - 3, P.truck[1] + 2);
let seen = {};
for (let i = 0; i < 400; i++) { const r = await ev(() => ({ st:window.__iv.truck.state, x:+window.__iv.M.truck.position.x.toFixed(1), snd:window.__ivSound() })); if (!seen[r.st] || i % 8 === 0) { seen[r.st] = 1; console.log('truck', JSON.stringify(r)); } if (r.st === 'docked' && seen.arrive) { await wait(1500); console.log('docked', JSON.stringify(await ev(() => window.__ivSound()))); break; } await wait(300); }
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
