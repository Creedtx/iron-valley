// Headless play test: walks the owner through the level 1 loop and screenshots it.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, outDir] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g')) return r.abort(); r.continue(); });
const logs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning' && !m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForFunction('window.__iv', { timeout: 60000 });
const wait = ms => new Promise(r => setTimeout(r, ms));
const tp = (x, z) => p.evaluate((x, z) => window.__iv.owner.o.position.set(x, 0, z), x, z);
const st = () => p.evaluate(() => { const S = window.__iv.S; return { cash: S.cash, earned: S.earned, pallet: S.pallet, carry: window.__iv.owner.stack.length, bed: S.bedCount, delivered: S.delivered, pile: S.cashPile, bought: S.bought.join(','), truck: window.__iv.truck.state }; });
await wait(1500); await p.screenshot({ path: `${outDir}/g0.png` });
// walk with the keyboard for a second to prove input works
await p.keyboard.down('a'); await wait(700); await p.keyboard.up('a');
console.log('after walk', await p.evaluate(() => window.__iv.owner.o.position.toArray().map(v => v.toFixed(2))));
await wait(9000);
for (let loop = 0; loop < 3; loop++) {
  await tp(6.0, 4.75); await wait(1000); console.log('at pallet', await st());
  if (loop === 0) await p.screenshot({ path: `${outDir}/g1.png` });
  await tp(12.45, 6.3); await wait(1200); console.log('at truck', await st());
  if (loop === 0) await p.screenshot({ path: `${outDir}/g2.png` });
  await wait(6000);
}
// let the order complete faster: give crates directly
await p.evaluate(() => { window.__iv.S.pallet = 12; });
for (let i = 0; i < 3; i++) { await tp(6.0, 4.75); await wait(900); await tp(12.45, 6.3); await wait(1500); }
console.log('after rush', await st());
await wait(4000);
await tp(10.6, 8.7); await wait(2500); console.log('after cash', await st());
await tp(3.0, 5.3); await wait(2500); console.log('after pad', await st());
await p.screenshot({ path: `${outDir}/g3.png` });
await p.setViewport({ width: 1280, height: 720 }); await wait(1200); await p.screenshot({ path: `${outDir}/g4.png` });
console.log(logs.join('\n'));
await b.close();
