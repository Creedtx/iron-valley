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
// a mid-level-1 state: crew posted, no order, the phone about to ring
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 2000; v.hire('operator'); v.hire('loader'); S.staff.forEach(s => s.posted = true); v.closeOffice(); });
await ev(() => { window.__fr = []; let last = performance.now(); const f = () => { const n = performance.now(); window.__fr.push(n - last); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f); });
const cdp = await p.createCDPSession(); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval:200 });
await wait(4000); const base = await ev(() => { const a = window.__fr.splice(0); return [a.length, Math.max(...a).toFixed(0), (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)]; }); console.log('before call: frames, worst ms, mean ms', base);
await cdp.send('Profiler.start');
await ev(() => { window.__iv.S.call = null; }); await p.waitForFunction('!!window.__iv.S.call', { timeout:120000 }); const t0 = Date.now();
await wait(8000);
const { profile } = await cdp.send('Profiler.stop');
const after = await ev(() => { const a = window.__fr.splice(0); return [a.length, Math.max(...a).toFixed(0), (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1), a.filter(x => x > 200).length]; }); console.log('during call: frames, worst ms, mean ms, frames>200ms', after);
// self time by function
const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = profile.timeDeltas; 
profile.samples.forEach((id, i) => { const n = byId.get(id), k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 1000).toFixed(0)}ms ${k}`).join('\n'));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
