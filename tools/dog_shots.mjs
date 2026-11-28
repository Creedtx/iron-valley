// Bible v2.0 gap audit (plans/gap_audit_v2.md): the cross-cutting items for Levels 1-8 on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/gaps.mjs <url> <outDir>
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
// Levels 1-4 quickly, then Level 5
// Bolt close up: four frames each of the walk, the trot and the gallop, the greeting, tracks in the snow
await ev(async () => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; v.evNext = 1e9;
  S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard(); v.closeOffice(); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); S.bolt = { joined:true }; S.met.vera = true; v.hold = true;
  for (let i = 0; i < 40; i++) { while (v.cardOpen) v.nextCard(); v.step(.05); } });
await ev(() => { const v = window.__iv, T = v.THREE, d = v.bolt.o, w = d.parent; d.position.set(0, 0, 4); d.rotation.y = 0; window.__hid = w.children.filter(o => o !== d && o.visible); for (const o of window.__hid) o.visible = false;
  const g = new T.Mesh(new T.CircleGeometry(6, 40), new T.MeshStandardMaterial({ color:'#8d877c', roughness:.9 })); g.rotation.x = -Math.PI / 2; g.position.set(0, .001, 4); g.receiveShadow = true; w.add(g); });
const shot = async (name, setup) => { const url = await ev(setup => { const v = window.__iv, T = v.THREE, d = v.bolt.o; new Function('v', 'b', setup)(v, v.bolt);
    const cam = new T.PerspectiveCamera(28, 900 / 1100, .05, 50), p = d.position; cam.position.set(p.x + .5, .6, p.z - 2.7); cam.lookAt(p.x, .26, p.z); v.renderer.render(v.scene, cam); return v.renderer.domElement.toDataURL('image/png'); }, setup);
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64')); };
for (const [g, sp] of [['walk', .8], ['trot', 2.2], ['gallop', 4.2]]) for (let f = 0; f < 4; f++)
  await shot(`dog_${g}_${f}`, `b.mode = 'follow'; b.sp = ${sp}; b.gait = '${g}'; b.gb = null; for (let i = 0; i < 40; i++) v.boltAnim(.016); const G = { walk:.42, trot:.75, gallop:1.25 }['${g}']; b.ph = ${f} / 4; b.sp = ${sp}; for (let i = 0; i < 3; i++) v.boltAnim(.001);`);
await shot('dog_greet', `b.mode = 'greet'; b.hop = 1; b.sp = 0; for (let i = 0; i < 30; i++) v.boltAnim(.016);`);
await shot('dog_down', `b.mode = 'down'; b.hop = 0; b.sp = 0; for (let i = 0; i < 60; i++) v.boltAnim(.016);`);
await shot('dog_sit', `b.mode = 'sit'; b.hop = 0; b.sp = 0; for (let i = 0; i < 40; i++) v.boltAnim(.016);`);
console.log('ok', errs.length ? errs.slice(0, 2).join(' | ') : 'no errors'); await b.close(); process.exit(0);
