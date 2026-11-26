import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:2400000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:900, height:1100, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
const run = (secs, cond) => ev(([secs, cond]) => { const v = window.__iv, S = v.S, f = cond ? new Function('v', 'S', 'return ' + cond) : null; v.hold = true; let t = 0;
  while (t < secs) { if (v.cardOpen && S.gus.party === 3 && !S.gus.gift) v.giveGift('clock'); if (v.cardOpen && !window.__keep) v.nextCard(); if (S.call) { if (S.call.dock === 2) v.acceptCall2(S.call), S.call = null; else v.acceptCall(); v.closeOffice(); } if (S.order && !S.order.briefed) v.briefOrder(null);
    if (!window.__nosign) { if (S.order && S.order.ready && v.truck.state === 'docked' && !v.trip) v.signOrder(v.owner); if (S.order2 && S.order2.ready && v.truckB.state === 'docked') v.signOrder2(v.owner); }
    if (S.store < 12 && !S.delivery) v.orderTimber(24); if (S.coils < 3 && !S.delivery) v.orderSteel(4); window.__each && window.__each(v); v.step(.05); t += .05; if (f && f(v, S)) break; }
  v.hold = false; return t; }, [secs, cond]);
// Every place the game asks the owner to stand, at every level: inside the walkable bounds (so the camera follows) and
// reachable on foot from the middle of the yard. Plot signs and people count as reached within talking distance.
//   node tools/reach.mjs <url> <outDir>
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1e7; v.evNext = 1e9; window.__noLL = true; });
const audit = (tag) => ev(tag => { const v = window.__iv, S = v.S, M = v.M, b = v.siteBounds(), pts = [];
  const add = (kind, id, p, r = .6) => { if (p && isFinite(p[0]) && isFinite(p[1])) pts.push({ kind, id, x:p[0], z:p[1], r }); };
  for (const [id, R] of Object.entries(M.rings || {})) if (R.g && R.g.visible && R.g.parent) add('ring', id, [R.g.position.x, R.g.position.z]);
  for (const p of v.visiblePads()) add('pad', p.id, typeof p.at === 'function' ? p.at() : p.at);
  for (const [id, pl] of Object.entries(v.PLOTS)) if (pl.lv <= S.level && v.plotSt(id) === 0 && pl.ring) add('plot', id, pl.ring, .9);
  for (const [id, c] of v.folk) if (c.o.visible && !S.met[id]) add('folk', id, [c.o.position.x, c.o.position.z], 1.25);
  if (S.level >= 7) { add('named', 'survey', v.SURVEY_RING); add('named', 'board', v.BOARD_RING); }
  if (S.level >= 8) { if (S.l8 && S.l8.pad) add('named', 'beam store ' + S.l8.pad, v.PADS8[S.l8.pad], 1.6); add('named', 'dairy', v.DAIRY_PAD); add('named', 'sign', v.SIGN_RING); }
  add('named', 'pay', v.PAY_AT); add('named', 'photo', v.PHOTO_AT); add('named', 'shovel', v.SHOVEL_AT); if (S.level >= 2) add('named', 'stray', v.STRAY_RING);
  const from = [0, 5], bad = [];
  for (const p of pts) { const inB = p.x >= b[0] - .05 && p.x <= b[1] + .05 && p.z >= b[2] - .05 && p.z <= b[3] + .05, path = v.findPath(from[0], from[1], p.x, p.z), end = path.length ? path[path.length - 1] : from, d = Math.hypot(end[0] - p.x, end[1] - p.z);
    if (!(inB || p.kind === 'folk' || p.kind === 'plot') || d > p.r) bad.push(`${p.kind} ${p.id} [${p.x.toFixed(1)},${p.z.toFixed(1)}]${inB ? '' : ' outside the bounds'}${d > p.r ? ` path ends ${d.toFixed(1)} m short` : ''}`); }
  return { tag, n:pts.length, bad, b:b.map(n => +n.toFixed(1)) }; }, tag);
const report = async tag => { const r = await audit(tag); console.log(`  ${r.tag}: ${r.n} places, bounds ${JSON.stringify(r.b)}${r.bad.length ? '\n    ' + r.bad.join('\n    ') : ''}`); check(!r.bad.length, `${tag}: every place the owner is asked to stand can be reached`); };
await report('L1');
for (let lv = 2; lv <= 8; lv++) {
  await ev(async lv => { const v = window.__iv, S = v.S; S.levelUp = true; await v.startLevel(lv); while (v.cardOpen) v.nextCard(); v.closeOffice();
    if (lv === 2) { v.startMillBuild(false); v.finishMill(false); } if (lv === 3) { S.plots.north = { st:3 }; v.buyField(false); v.startPressBuild(false); v.finishPress(false); } if (lv === 4) { S.plots.scrap = { st:3 }; v.openScrapyard(false); v.startSaw2Build(false); v.finishSaw2(false); } }, lv);
  await run(2); await report(`L${lv}`);
  if (lv === 8) for (const k of ['A', 'B', 'C']) { await ev(k => { const v = window.__iv, S = v.S; S.l8.pad = k; }, k); await run(.5); await report(`L8 beam store at ${k}`); }
  if (lv === 4) { await ev(() => { const v = window.__iv; v.S.plots.road = { st:3 }; v.finishPlot('road', false); }); await run(1); await report('L4 road bought'); }
  if (lv === 5) { await ev(() => { const v = window.__iv; v.S.plots.shop = { st:3 }; v.finishPlot('shop', false); }); await run(1); await report('L5 Ada\'s plot bought');
    await ev(() => { const v = window.__iv; v.owner.o.position.set(...[v.P.mill2[0] + 1.5, 0, v.P.mill2[1] + 1.5]); }); await run(1);
    check(await ev(() => { const v = window.__iv, o = v.owner.o.position; return Math.hypot(o.x - v.P.mill2[0] - 1.5, o.z - v.P.mill2[1] - 1.5) < .3; }), 'the owner can stand on Ada\'s corner plot (not pushed back to the yard)');
    await ev(() => { const v = window.__iv; v.startMill2Build(false); v.finishMill2(false); }); await run(1); await report('L5 second mill in'); }
}
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nREACH CLEAN'); await b.close(); process.exit(fail.length ? 1 : 0);
