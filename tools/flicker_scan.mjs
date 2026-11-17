// Flicker scan: freezes the game, pans the camera by exactly one screen pixel and compares the two renders
// after undoing the shift. A clean scene matches except along shadow edges; z-fighting, culling pops or a
// shadow frustum edge show up as blobs of changed pixels. Writes a red-on-grey diff image per spot.
//   node tools/flicker_scan.mjs <url> <outDir> [yard]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/flicker'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:360, height:640 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
// 'yard' scans the level 4 site (forklift yard, road frontage, North field) from a seeded save
const yard = process.argv[4] === 'yard';
if (yard) { const look = { parts:['hat_hard'], skin:'#e0ac85', hair:'#3a2a1a', shirt:'#c9b28a' }, st = (id, name, role, x = {}) => Object.assign({ id, name, role, lv:3, xp:0, energy:100, focus:100, look }, x);
  const save = { v:7, letter:true, met:{ gus:true, vera:true, abel:true, tom:true, rusty:true }, plots:{ north:{ st:3 }, scrap:{ st:3 }, road:{ st:3 } }, level:4, cash:9000, tut:99, tutDone:true, lv2:{ mill:2, wh:2 }, lv3:{ field:true, press:2, licence:2, jam:true },
    lv4:{ saw2:2, promoted:true, post:[10.0, 4.4] }, up:{ gen2:3 }, owner:[-12, 8], nextId:5, staff:[st(1, 'Walt', 'operator'), st(2, 'Tom', 'supervisor'), st(3, 'Rita', 'operator', { mach:'pipe' }), st(4, 'Bev', 'forklift')] };
  await p.evaluateOnNewDocument(s => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('iron-valley-save', s); } setInterval(() => { if (window.__iv && window.__iv.cardOpen) window.__iv.nextCard(); }, 200); }, JSON.stringify(save));
  await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.M.l4Built', { timeout:90000 });
} else {
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout:90000 });
await p.evaluate(() => { const v = window.__iv; Object.assign(v.S, { tut:10, tutDone:true });  });
}
await new Promise(r => setTimeout(r, 3000));
const spots = yard ? { forkyard:[-13.5, 4.0], lanes:[-14.0, 9.4], gate:[-9.6, 9.6], frontage:[16.0, 16.5], field:[16.5, -5.0], post:[10.0, 4.4] } : { workshopFront:[-5.0, -1.0], office:[-9.0, -7.0], pad:[-0.4, 3.0], generator:[5.2, -5.5], bay:[17.0, 5.0], clearYard:[16.0, -6.5], bins:[-11.0, 7.0], gate:[5.0, 11.0] };
const report = {};
for (const [name, [x, z]] of Object.entries(spots)) {
  const r = await p.evaluate(async (x, z) => {
    const v = window.__iv; v.paused = true; const R = v.renderer, gl = R.getContext();
    const raf = () => new Promise(res => requestAnimationFrame(res));
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, m = (v.cam.right - v.cam.left) / W;
    const grab = async (cx, cz) => { v.camLock = [cx, cz]; await raf(); await raf(); R.render(v.scene, v.cam); const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
    // two scans: pan one pixel sideways (depth unchanged) and one pixel "up the screen" (moves in z, so every
    // depth value shifts: this is the one that exposes z-fighting between coplanar layers)
    const el = 46 * Math.PI / 180, dz = m / Math.sin(el);
    const A = await grab(x, z), B = await grab(x + m, z), C = await grab(x, z + dz), D = await grab(x, z + 2 * dz);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), img = g.createImageData(W, H);
    const diff = (P, i, Q, j) => Math.abs(P[i] - Q[j]) + Math.abs(P[i + 1] - Q[j + 1]) + Math.abs(P[i + 2] - Q[j + 2]);
    // which way does the vertical pan move the picture? pick the alignment that matches best
    let best = 0, bestN = Infinity; for (const s of [1, -1]) { let n = 0; for (let k = 0; k < 4000; k++) { const xx = 5 + (k * 37) % (W - 10), yy = 5 + (k * 53) % (H - 10); n += diff(A, (yy * W + xx) * 4, C, ((yy + s) * W + xx) * 4) > 30; } if (n < bestN) { bestN = n; best = s; } }
    let bad = 0, edge = 0;
    for (let yy = 3; yy < H - 3; yy++) for (let xx = 2; xx < W; xx++) {
      const a = (yy * W + xx) * 4, o = ((H - 1 - yy) * W + xx) * 4, l = (A[a] + A[a + 1] + A[a + 2]) / 6;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = l; img.data[o + 3] = 255;
      const h = diff(A, a, B, (yy * W + xx - 1) * 4), v1 = diff(A, a, C, ((yy + best) * W + xx) * 4), v2 = diff(A, a, D, ((yy + 2 * best) * W + xx) * 4);
      if (h > 60 || v1 > 60) { edge++; if (h > 60 || v2 < 30) { bad++; img.data[o] = 255; img.data[o + 1] = 0; img.data[o + 2] = 0; } else img.data[o + 2] = 255; }
    }
    g.putImageData(img, 0, 0); v.camLock = null; v.paused = false;
    return { bad, edge, px:W * H, png:cv.toDataURL('image/png') };
  }, x, z);
  fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  report[name] = { flicker:r.bad, changed:r.edge, pct:+(100 * r.bad / r.px).toFixed(3) };
  console.log(name, JSON.stringify(report[name]));
}
await b.close();
