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
p.on('console', m => { if (m.text().includes('static meshes')) console.log(m.text()); });
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 3000; v.hire('operator'); v.hire('loader'); v.hire('loader'); v.hire('helper'); S.staff.forEach(s => s.posted = true); v.closeOffice(); });
await ev(() => window.__iv.owner.o.position.set(window.__iv.P.saw[0] + .5, 0, window.__iv.P.saw[1] + 3.5)); await wait(5000);
const r = await ev(() => { const v = window.__iv, R = v.renderer, sc = v.scene; R.info.autoReset = true;
  let meshes = 0, vis = 0, casters = 0, dyn = 0, tris = 0, skinned = 0, transp = 0, mats = new Set();
  sc.traverse(o => { if (!o.isMesh && !o.isSprite && !o.isPoints) return; meshes++; let v2 = true, q = o; while (q) { if (!q.visible) { v2 = false; break; } q = q.parent; } if (!v2) return; vis++; if (o.castShadow) casters++; if (o.isSkinnedMesh) skinned++; if (o.material && o.material.transparent) transp++; mats.add(o.material); if (o.geometry && o.geometry.index) tris += o.geometry.index.count / 3; });
  R.render(sc, v.cam); const i = R.info.render;
  return { calls:i.calls, triangles:i.triangles, meshes, visible:vis, casters, skinned, transparent:transp, materials:mats.size, shadowMap:R.shadowMap.enabled, dpr:R.getPixelRatio(), lights:(() => { let n = 0; sc.traverse(o => { if (o.isLight) n++; }); return n; })() }; });
console.log(JSON.stringify(r));
// shadow pass share: draw calls with shadows off
const r2 = await ev(() => { const v = window.__iv, R = v.renderer; R.shadowMap.enabled = false; R.render(v.scene, v.cam); const i = { calls:R.info.render.calls, triangles:R.info.render.triangles }; R.shadowMap.enabled = true; return i; });
console.log('no shadows', JSON.stringify(r2));
const tri = await ev(() => { const v = window.__iv, c = {}; const T = new (v.cam.constructor === Object ? Object : Object)();
  v.scene.traverse(o => { if (!o.isMesh) return; let q = o, vis = true; while (q) { if (!q.visible) { vis = false; break; } q = q.parent; } if (!vis) return;
    let n = o, name = ''; while (n && !name) { name = /^(prop|env|site|l2|l3|l4|l5|fac|worker|owner|saw|gen|truck|static)/.test(n.name) ? n.name : ''; n = n.parent; } name = (name || o.name || '(anon)') + (o.castShadow ? ' [shadow]' : '');
    const t = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; c[name] = (c[name] || 0) + t; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, t]) => [k, Math.round(t)]); });
console.log(tri.map(([k, t]) => `${t} ${k}`).join('\n'));
const sh = await ev(() => { const v = window.__iv, R = v.renderer; R.info.autoReset = false; R.info.reset(); R.shadowMap.needsUpdate = true; R.render(v.scene, v.cam); const i = { calls:R.info.render.calls, triangles:R.info.render.triangles }; R.info.autoReset = true; return i; });
console.log('frame incl. shadow pass', JSON.stringify(sh));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
