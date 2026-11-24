import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'; if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) }); if (u.includes('fonts.g')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
console.log(await p.evaluate(() => { const v = window.__iv, out = [], B = v.Box3; v.M.dock.updateMatrixWorld(true);
  v.M.dock.traverse(m => { if (!m.isMesh) return; const bb = new B().setFromObject(m); out.push(`${m.name.padEnd(22)} x ${bb.min.x.toFixed(2)}..${bb.max.x.toFixed(2)}  y ${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)}  z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)}`); });
  // the surface: highest vertex of the ramp mesh in thin x slices
  let ramp = null; v.M.dock.traverse(m => { if (m.isMesh && /mesh_1$/.test(m.name)) ramp = m; });
  if (ramp) { const g = ramp.geometry, pa = g.attributes.position, w = new (new B().min.constructor)(), sl = {};
    for (let i = 0; i < pa.count; i++) { w.fromBufferAttribute(pa, i).applyMatrix4(ramp.matrixWorld); if (w.z < 5.45 || w.z > 6.85 || w.x > 14.6) continue; const k = (Math.round(w.x * 2) / 2).toFixed(1); sl[k] = Math.max(sl[k] ?? -9, w.y); }
    for (let z = 4.9; z <= 7.4; z += .25) { let mx = -9; for (let i = 0; i < pa.count; i++) { w.fromBufferAttribute(pa, i).applyMatrix4(ramp.matrixWorld); if (Math.abs(w.z - z) < .13 && w.x > 11.5 && w.x < 12.5) mx = Math.max(mx, w.y); } out.push(`z ${z.toFixed(2)} top at x 12: ${mx.toFixed(2)}  groundY ${v.groundY(12, z).toFixed(2)}`); }
    out.push('ramp top by x: ' + Object.entries(sl).sort((a, b) => a[0] - b[0]).map(([x, y]) => x + ':' + y.toFixed(2)).join(' ')); }
  out.push('LDOCK ramp ' + JSON.stringify(v.LDOCK.ramp) + ' deck ' + JSON.stringify(v.LDOCK.deck) + ' H ' + v.LDOCK.H);
  return out.join('\n'); }));
await b.close();
