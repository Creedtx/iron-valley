// Phone-size pictures of the HUD and the office panel (Works Board, v2.0 20).
//   node tools/hud_shot.mjs <url> <outDir> [level]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, lvA = '2'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:900000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
const NM = path.join(import.meta.dirname, 'node_modules');
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(NM, 'three', u.slice(pre.length))) });
  if (u.includes('fonts.googleapis') && !u.includes('family=')) return r.abort(); if (u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
await p.evaluate(async lv => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 2480; S.orderSeq = 4; S.delivered = 4; S.sales.told = true; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true;
  if (lv >= 2) { v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.startMillBuild(false); v.finishMill(false); }
  while (v.cardOpen) v.nextCard(); S.call = null; S.order = { id:5, client:'Valley Grocers', qty:50, pq:10, tq:0, cut:18, pcut:2, pay:780, deadline:200, time:40, briefed:true, met:true, ready:false }; v.S.bed = 12; }, +lvA);
await new Promise(r => setTimeout(r, 3500));
await p.screenshot({ path:path.join(out, 'hud.png') });
await p.evaluate(() => { const v = window.__iv; v.S.call = { client:'Hartley Hardware', qty:30, pq:0, tq:0, pay:420, deadline:220 }; }); await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path:path.join(out, 'hud_call.png') });
await p.evaluate(() => { const v = window.__iv; v.S.call = null; v.openOffice('charter'); }); await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path:path.join(out, 'office.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'ok');
await b.close();
