// Production soak: full crew, random faults, the owner loitering around the saw (the build 0.7 stall:
// Walt could not reach the operator spot while the owner stood beside it). Every order must be cut and
// signed on time, the operator watchdog must never have to rescue him.
//   node tools/prod_soak.mjs <url> [game-minutes]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, mins = '12'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:360, height:640 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200));
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
// build 0.13: level 1 has no supervisor, so the owner takes the call, briefs, signs and collects himself
await p.evaluate(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); Object.assign(v.S, { tut:99, tutDone:true, mechIntro:true, cash:2000, delivered:1, checked:{ operator:true, loader:true } });
  for (const r of ['operator', 'loader', 'loader']) v.hire(r); v.speed = 8;
  const P = v.P, spots = [[P.op[0] + .3, P.op[1] + .1], [P.op[0] - .25, P.op[1] + .2], P.sawFix, [P.op[0], P.op[1] + .45], [P.feed[0] + .4, P.feed[1] + .6]];
  window.__park = () => { const S = v.S, k = Math.floor(S.time / 15) % spots.length, pos = S.order && S.order.ready && v.truck.state === 'docked' ? P.drop : S.cashPile > 0 ? P.cash : spots[k]; v.owner.o.position.set(pos[0], 0, pos[1]); }; });
let lastLog = 0;
while (true) { await new Promise(r => setTimeout(r, 1500));
  const s = await p.evaluate(() => { const v = window.__iv, S = v.S; window.__park();
    if (S.call) v.acceptCall(); if (S.order && !S.order.briefed) v.briefOrder(v.owner); if (!S.delivery && S.store + S.timber + S.feed < 16) v.orderTimber(S.store <= 4 ? 24 : 12);
    const w = [...v.staffObj.values()].find(c => c.st.role === 'operator');
    return { t:Math.round(S.time), del:S.delivered, ontime:S.ontime, ord:S.order ? `${S.order.id}:${S.order.cut}/${S.order.qty} bed${S.bed} ${Math.round(S.order.time)}/${S.order.deadline}` : '-', walt:w.state, feed:S.feed, line:S.timber, store:S.store,
      rescues:S.sawRescues || 0, log:Object.fromEntries(Object.entries(S.sawLog || {}).map(([k, v]) => [k, Math.round(v)])), unstuck:S.unstuck || 0, faults:S.faults.length, hist:S.history }; });
  if (s.t - lastLog >= 30) { lastLog = s.t; const { hist, log, ...rest } = s; console.log(JSON.stringify(rest)); }
  if (s.t >= mins * 60) { console.log('orders', JSON.stringify(s.hist, null, 0)); console.log('saw time while orders open', JSON.stringify(s.log));
    const late = s.hist.filter(h => h.late).length;
    console.log(`delivered ${s.del - 1}, late ${late}, operator rescues ${s.rescues}, walker re-paths ${s.unstuck}, page errors ${errs.length}`, errs.slice(0, 3));
    await b.close(); process.exit(errs.length || late || s.rescues ? 1 : 0); }
}
