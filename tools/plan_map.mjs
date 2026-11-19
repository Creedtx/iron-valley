// A planning map: the real level 2 yard (PLAN_LEVEL=3: the level 3 works) pulled back, with labelled spots and drawn routes on top, for showing a
// layout to the user before it is built.
//   node tools/plan_map.mjs <url> <out.png> '<json {pts:[[x,z,label,colour]], lines:[{pts:[[x,z]...], col, dash, label}]}>' [zoom] [cx] [cz] [w] [h]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out, spec = '{}', zoom = '2.4', cx = '10', cz = '9', W = '1400', H = '1000'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:+W, height:+H, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 5', { timeout:300000 });
await p.evaluate(async ([z, x, zz, lv]) => { const v = window.__iv; while (v.cardOpen) v.nextCard();
  if (lv >= 3) { const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 30000; S.sales.told = true; v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false);
    S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); while (v.cardOpen) v.nextCard(); }
  else await v.previewL2Layout();
  v.owner.o.position.set(-30, 0, -30); v.camZoom = z; v.camLock = [x, zz]; }, [+zoom, +cx, +cz, +(process.env.PLAN_LEVEL || 2)]);
await new Promise(r => setTimeout(r, 3500)); await p.evaluate(() => { window.__iv.paused = true; });
await p.evaluate(spec => { for (const id of ['hud', 'ticket', 'callc', 'callEdge', 'card', 'prompt', 'toasts', 'joy', 'vignette', 'labels', 'dock', 'fps']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const v = window.__iv, V = v.cam.position.constructor, pr = (x, z) => { const q = new V(x, 0, z).project(v.cam); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight]; };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" style="position:fixed;inset:0;z-index:99;pointer-events:none" width="${innerWidth}" height="${innerHeight}"><defs>`;
  const cols = new Set((spec.lines || []).map(l => l.col)); for (const c of cols) svg += `<marker id="a${c.slice(1)}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`;
  svg += '</defs>';
  for (const l of spec.lines || []) { const q = l.pts.map(([x, z]) => pr(x, z)); svg += `<polyline points="${q.map(a => a.join(',')).join(' ')}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="10" stroke-linejoin="round"/><polyline points="${q.map(a => a.join(',')).join(' ')}" fill="none" stroke="${l.col}" stroke-width="6" stroke-linejoin="round" ${l.dash ? 'stroke-dasharray="14 9"' : ''} ${l.noArrow ? '' : `marker-end="url(#a${l.col.slice(1)})"`}/>`;
    if (l.label) { const m = q[l.at ?? Math.floor(q.length / 2)]; svg += `<text x="${m[0] + 12}" y="${m[1] - 10}" font: style="font:700 17px Arial" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">${l.label}</text>`; } }
  for (const [x, z, r, c, t, dash] of spec.rings || []) { const q = []; for (let i = 0; i <= 48; i++) q.push(pr(x + r * Math.cos(i / 48 * 6.2832), z + r * Math.sin(i / 48 * 6.2832)));
    svg += `<polygon points="${q.map(a => a.join(',')).join(' ')}" fill="${c}" fill-opacity="${dash ? 0 : .18}" stroke="${c}" stroke-width="4" ${dash ? 'stroke-dasharray="10 8"' : ''}/>`;
    if (t) { const m = pr(x, z + r); svg += `<text x="${m[0] + 8}" y="${m[1] + 22}" style="font:700 16px Arial" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">${t}</text>`; } }
  for (const [x, z, t, c = '#ff2a6a', dx = 14, dy = 6, key] of spec.pts || []) { const [sx, sy] = pr(x, z); svg += `<circle cx="${sx}" cy="${sy}" r="${key ? 14 : 10}" fill="${c}" stroke="#fff" stroke-width="3"/>`; if (key) svg += `<text x="${sx}" y="${sy + 5}" text-anchor="middle" style="font:700 15px Arial" fill="#1b1408">${key}</text>`;
    if (t) svg += `<text x="${sx + dx}" y="${sy + dy}" style="font:700 17px Arial" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">${t}</text>`; }
  if (spec.title) svg += `<rect x="16" y="14" width="${spec.title.length * 11 + 30}" height="40" rx="6" fill="#2a1d14" stroke="#e2a72c" stroke-width="2"/><text x="31" y="41" style="font:700 20px Arial" fill="#efe1bd">${spec.title}</text>`;
  if (spec.legend) { const lh = 27, h = spec.legend.length * lh + 22, w = spec.legendW || 560, y0 = innerHeight - h - 16; svg += `<rect x="16" y="${y0}" width="${w}" height="${h}" rx="8" fill="#2a1d14" fill-opacity=".93" stroke="#e2a72c" stroke-width="2"/>`;
    spec.legend.forEach(([k, t, c], i) => { const y = y0 + 26 + i * lh; svg += `<circle cx="36" cy="${y - 6}" r="10" fill="${c}" stroke="#fff" stroke-width="2"/><text x="36" y="${y - 1}" text-anchor="middle" style="font:700 13px Arial" fill="#1b1408">${k}</text><text x="56" y="${y}" style="font:600 16px Arial" fill="#efe1bd">${t}</text>`; }); }
  svg += '</svg>'; document.body.insertAdjacentHTML('beforeend', svg); }, JSON.parse(spec));
await new Promise(r => setTimeout(r, 600)); await p.screenshot({ path:out }); await b.close(); console.log('ok');
