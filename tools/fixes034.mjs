// Bible v2.0 gap audit (plans/gap_audit_v2.md): the cross-cutting items for Levels 1-8 on the approved map: the office block and the zebra across Mill Road, Ada's corner
// plot with the second pipe mill and dock 2, the white lorry, loaders carrying pipes up dock 2's ramp, two orders the same
// day, Friday's pay packets from cash and the weekly accounts, Gus's farewell, snow, a loan. Game time, then pictures.
//   node tools/gaps.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:2400000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
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
// build 0.34: sound and smoothness. Shaders compiled while loading; the snow patch from the start; voices switched off when
// silent and rebuilt when heard; footsteps on the walk's foot-plants; the saw's bite on the blade; no lights switched in mid-play.
await ev(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1e5; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; });
check(await ev(() => window.__iv.warmN >= 1), 'the shader programs are compiled during loading (warm-up ran)');
check(await ev(() => window.__iv.spritePool.length >= 20), 'the spark and dust pool is filled (and compiled) up front');
await run(5);   // the crew just hired take the patch within a few seconds
check(await ev(() => { const v = window.__iv; let n = 0, un = 0; v.scene.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial) && !(m.transparent && m.opacity < .9) && !o.userData.noSnow) { n++; if (!m.userData.snow) un++; } }); return n > 50 && un === 0; }), 'every solid material carries the snow patch from the start (no recompile when it first snows)');
// play: sparks, confetti, snow, the photo flash: no new shader program may appear
await ev(() => { window.__iv.hold = false; }); await wait(2500);
const progs0 = await ev(() => window.__iv.renderer.info.programs.length);
await ev(() => { const v = window.__iv; v.confetti(); v.S.wx = v.S.wx || {}; v.S.wx.lying = .6; v.screenFlash(); });
await wait(5000);
const progs1 = await ev(() => window.__iv.renderer.info.programs.length);
check(progs1 === progs0, `no shader compiled in play: confetti, lying snow and the photo flash (${progs0} -> ${progs1} programs)`);
check(await ev(() => !document.querySelector('body > div[style*="background:#fff"]')), 'the photo flash is a short screen wash, gone after half a second');
await ev(() => { const v = window.__iv; v.S.wx.lying = 0; });
// footsteps: on the foot-plants of the walk cycle, two to a cycle
await ev(() => { const v = window.__iv; v.hold = true; const o = v.owner.o.position; o.set(0, 0, 4); v.owner.steps = 0; v.owner.stepTo = [0, 4]; window.__ph = []; });
const fst = await ev(() => { const v = window.__iv; let t = 0; const ph = []; while (t < 4) { if (!v.owner.stepTo) v.owner.stepTo = [v.owner.o.position.x > 0 ? -2 : 2, 4]; const n = v.owner.steps; v.step(.02); t += .02; if (v.owner.steps > n) ph.push(v.owner.stepPh); }
  const dur = v.owner.action.getClip().duration / (v.owner.action.getEffectiveTimeScale() || 1); return { n:v.owner.steps, ph, dur }; });
const near = ph => Math.min(...[.42, .91].map(f => Math.min(Math.abs(ph - f), 1 - Math.abs(ph - f))));
check(fst.n >= Math.floor(4 / fst.dur * 2) - 2 && fst.n <= Math.ceil(4 / fst.dur * 2) + 2, `two footsteps a walk cycle (${fst.n} in 4 s, cycle ${fst.dur.toFixed(2)} s)`);
check(fst.ph.length && fst.ph.every(p => near(p) < .08), 'each footstep lands as a foot takes the weight (' + fst.ph.slice(0, 6).map(p => p.toFixed(2)).join(' ') + ')');
check(await ev(() => { const v = window.__iv; v.owner.stepTo = [v.owner.o.position.x + 3, 4]; v.step(.05); v.step(.05); return v.owner.clip === 'walk'; }), 'walking a route on his own (out of the car, the night round), the owner\'s legs walk');
await ev(() => { const v = window.__iv; v.owner.stepTo = null; v.owner.steps = 0; v.step(.05); v.step(.05); v.step(.05); });
check(await ev(() => (window.__iv.owner.steps || 0) === 0), 'standing still: no footsteps');
// the saw: its bite comes as the blade meets the plank, the cutting note only while it is in it
const sb = await ev(() => { const v = window.__iv, src = v.SOUNDS.find(s => s.id === 'saw'); let cut = []; const fake = { set(spin, c){ cut.push(c); }, f(){} };
  return v.CUT_AT && src ? (() => { const r = []; for (const p of [.1, .3, .45, .6, .95]) { cut = []; v.setSawT(p * 2); src.tick(fake, {}); r.push(cut[0]); } return r; })() : null; });
check(sb && sb.join() === (await ev(() => window.__iv.sawOnNow() ? '0,1,1,0,0' : '0,0,0,0,0')), 'the saw\'s cutting note follows the blade in the plank (' + (sb && sb.join()) + ')');
// every running sound ticks cleanly (a source with nothing there is silent, not an error)
const ticks = await ev(() => { const v = window.__iv, fake = { set(){}, f(){}, stop(){} }, out = []; for (const s of v.SOUNDS) { let at = null, lvl = 0, err = ''; try { at = s.at(); if (at) lvl = s.tick(fake, { dt:.05 }); } catch(e) { err = e.message; } out.push({ id:s.id, at:!!at, lvl, err }); } return out; });
check(ticks.every(t => !t.err && t.lvl >= 0), 'every running sound source ticks cleanly: ' + ticks.map(t => t.id + (t.err ? '!' + t.err : '')).join(' '));
check(['saw2', 'mill2', 'truckB', 'fork', 'fork8', 'furnace', 'train'].every(id => ticks.some(t => t.id === id)), 'the second saw, second mill, dock 2 lorry, both forklifts, the furnace and the train have running sounds');
// the audio: a tap wakes it; voices stop while a card is open and come back after
await ev(() => { window.__iv.hold = false; }); await p.mouse.click(450, 600); await wait(400);
await ev(() => { window.__iv.audioOn(); }); await wait(300);
const acState = await ev(() => window.__iv.AC ? window.__iv.AC.state : 'none');
check(acState === 'running', 'a tap wakes the sound (' + acState + ')');
if (acState === 'running') {
  await ev(() => { const v = window.__iv; v.owner.o.position.set(v.P.saw[0] + 1, 0, v.P.saw[1] + 2); v.hold = false; }); await wait(3000);
  const on0 = await ev(() => [...window.__iv.sndState.entries()].filter(([, s]) => s.v).map(([k]) => k));
  check(on0.length > 0, 'machines heard near the line have voices (' + on0.join(' ') + ')');
  await ev(() => { window.__iv.story({ kind:'courier', level:2 }); }); await wait(6500);
  const on1 = await ev(() => [...window.__iv.sndState.entries()].filter(([, s]) => s.v).map(([k]) => k));
  check(on1.length === 0, 'a story card open (the game paused) a few seconds: every voice switched off (' + on1.join(' ') + ')');
  await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); }); await wait(2500);
  const on2 = await ev(() => [...window.__iv.sndState.entries()].filter(([, s]) => s.v).map(([k]) => k));
  check(on2.length > 0, 'closed again: the voices come back (' + on2.join(' ') + ')');
  check(await ev(() => !!window.__iv.limiter), 'the master bus runs through a limiter');
}
check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS'); await b.close(); process.exit(fail.length ? 1 : 0);
