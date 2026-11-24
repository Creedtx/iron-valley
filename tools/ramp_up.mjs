import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1800000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:720, height:900, deviceScaleFactor:1 }); await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'; if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) }); if (u.includes('fonts.g')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 3000; S.orderSeq = 4; S.delivered = 4; S.sales.told = true; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; S.pallet = 24; v.syncPallet(); S.call = { client:'Valley Grocers', qty:24, pq:0, tq:0, pay:200, deadline:400 }; v.acceptCall(); v.closeOffice();
  v.owner.o.position.set(9, 0, 9.5); v.camLock = [12.2, 6.3]; v.camZoom = .42; });
const runTo = cond => ev(cond => { const v = window.__iv, S = v.S, f = new Function('v', 'S', 'return ' + cond); v.hold = true; let t = 0; while (t < 120) { if (v.cardOpen) v.nextCard(); if (S.order && !S.order.briefed) v.briefOrder(null); v.step(.05); t += .05; if (f(v, S)) break; } v.hold = false;
  return [...v.staffObj.values()].map(c => `${c.st.name} ${c.state} ${c.o.position.x.toFixed(2)},${c.o.position.y.toFixed(2)},${c.o.position.z.toFixed(2)} cart:${!!c.cart} rotx:${c.cart ? c.cart.rotation.x.toFixed(2) : '-'}`).join(' | '); }, cond);
let i = 0;
for (const x of [10.6, 11.6, 12.6, 13.6]) { console.log(await runTo(`[...v.staffObj.values()].some(c => c.st.role === 'loader' && c.cart && c.stack.length && c.o.position.x > ${x} && c.o.position.x < 14.4 && c.o.position.z > 5.3 && c.o.position.z < 7 && (c.path && c.path.length && c.path[c.path.length-1][0] > c.o.position.x))`));
  await new Promise(r => setTimeout(r, 700)); await p.screenshot({ path:path.join(out, `up${i++}.png`) }); }
for (const x of [13.0, 11.5]) { console.log(await runTo(`[...v.staffObj.values()].some(c => c.st.role === 'loader' && c.o.position.x < ${x} && c.o.position.x > 10 && c.o.position.z > 5.3 && c.o.position.z < 7 && (c.path && c.path.length && c.path[c.path.length-1][0] < c.o.position.x))`));
  await new Promise(r => setTimeout(r, 700)); await p.screenshot({ path:path.join(out, `down${i++}.png`) }); }
await b.close();
