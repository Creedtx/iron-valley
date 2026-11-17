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
const st = () => ev(() => { const v = window.__iv, S = v.S, h = [...v.staffObj.values()].find(c => c.st.role === 'helper'), l = [...v.staffObj.values()].find(c => c.st.role === 'loader');
  return JSON.stringify({ t:Math.round(S.time), feed:S.feed, rack:S.timber, saw:v.sawReason().label[1], made:S.made, help:h ? `${h.state}/${h.stack.length}` : '-', load:l ? `${l.state}/${l.task}` : '-', fk:v.feedK ? v.feedK() : '?' }); });
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 3000; v.hire('operator'); v.hire('loader'); S.staff.forEach(s => s.posted = true); S.call = { qty:60, pq:0, tq:0, pay:720, client:'Test', deadline:900 }; v.acceptCall(); v.briefOrder(null); v.closeOffice(); v.speed = 8; });
for (let i = 0; i < 8; i++) { await wait(4000); console.log('no helper', await st()); }
await ev(() => { const v = window.__iv; v.hire('helper'); v.closeOffice(); });
for (let i = 0; i < 14; i++) { await wait(4000); console.log('helper', await st()); }
await ev(() => { window.__iv.openOffice('staff'); }); await wait(1000); await p.screenshot({ path:path.join(out, 'staff_helper.png') });
console.log(await ev(() => document.querySelector('#office .body').innerText.replace(/\n+/g, ' | ').slice(0, 900)));
await ev(() => { window.__iv.closeOffice(); const P = window.__iv.P; window.__iv.owner.o.position.set(P.feed[0] + 1, 0, P.feed[1] + 2); }); await wait(3000); await p.screenshot({ path:path.join(out, 'helper_feed.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
