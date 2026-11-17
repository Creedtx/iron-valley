// Screenshot the viewer in headless Chrome: node tools/shot.mjs <url> <out.png> [view] [w] [h]
import puppeteer from 'puppeteer-core';
const [url, out, view = 'level1', w = 1280, h = 800] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
import fs from 'node:fs';
import path from 'node:path';
// The sandbox cannot reach the CDN, so serve three.js from node_modules (same version as the page pins).
await p.setRequestInterception(true);
p.on('request', r => {
  const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) { const f = path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length));
    return r.respond({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) }); }
  if (u.includes('fonts.g')) return r.abort();
  r.continue();
});
const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForFunction('window.__bench', { timeout: 60000 }).catch(() => {});
if (view !== 'level1') await p.evaluate(v => window.__bench && window.__bench.show(v), view);
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: out });
console.log(logs.join('\n'));
await b.close();
