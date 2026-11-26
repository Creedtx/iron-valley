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
// grandad's car close up: a perspective camera round it (front, back, both sides, above), lamps lit, door open, in the game view
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; v.evNext = 1e9; v.hold = true; v.owner.o.position.set(6, 0, 6); });
await wait(500);
// a clear floor for the close-ups: everything else in the yard hidden for the moment
await ev(() => { const v = window.__iv, T = v.THREE, c = v.M.car, w = c.parent; window.__hid = w.children.filter(o => o !== c && o.visible); for (const o of window.__hid) o.visible = false;
  const g = new T.Mesh(new T.CircleGeometry(9, 40), new T.MeshStandardMaterial({ color:'#8d877c', roughness:.9 })); g.rotation.x = -Math.PI / 2; g.position.set(c.position.x, .001, c.position.z); g.receiveShadow = true; w.add(g); window.__floor = g; });
const shot = async (name, eye, look, setup) => { const url = await ev(([eye, look, setup]) => { const v = window.__iv, T = v.THREE, c = v.M.car;
    if (setup) new Function('v', 'c', setup)(v, c);
    const cam = new T.PerspectiveCamera(32, 900 / 1100, .1, 200), p = c.position; cam.position.set(p.x + eye[0], eye[1], p.z + eye[2]); cam.lookAt(p.x + look[0], look[1], p.z + look[2]);
    v.renderer.render(v.scene, cam); return v.renderer.domElement.toDataURL('image/png'); }, [eye, look, setup]);
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name); };
await shot('car_front34', [4.6, 1.7, -3.4], [0, .5, 0]);
await shot('car_rear34', [-4.4, 1.8, 3.6], [0, .5, 0]);
await shot('car_side', [0, 1.0, -5.6], [0, .55, 0]);
await shot('car_front', [5.2, 1.0, 0], [0, .55, 0]);
await shot('car_top', [2.4, 6.5, -3.2], [0, .3, 0]);
await shot('car_wheel', [1.6, .55, -2.4], [1.1, .3, -.6]);
await shot('car_lit', [4.6, 1.7, -3.4], [0, .5, 0], "c.userData.hl.visible = true; v.CARFX.doorT = 0; window.__iv.updateCarFx(.016); c.userData.mat.tail.emissiveIntensity = 2.5; c.userData.mat.indL.emissiveIntensity = 2.5;");
await shot('car_door', [2.6, 1.6, -4.2], [0, .6, 0], "c.userData.hl.visible = false; c.userData.door.rotation.y = -1.0; c.userData.hole.visible = true; c.userData.driver.o.visible = true;");
await ev(() => { for (const o of window.__hid) o.visible = true; window.__floor.removeFromParent(); });
await ev(() => { const v = window.__iv, c = v.M.car; c.userData.door.rotation.y = 0; c.userData.hole.visible = false; v.camLock = [c.position.x, c.position.z]; v.camZoom = .75; v.hold = false; });
await wait(2500); await p.screenshot({ path:path.join(out, 'car_game.png') });
check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
await b.close(); process.exit(0);
