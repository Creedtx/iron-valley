// Checks the offline phone copy (dist/phone) as Termux serves it: phone viewport, every outside request blocked.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:600000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:2, isMobile:true, hasTouch:true });
await p.setRequestInterception(true); const outside = [];
p.on('request', r => { if (!r.url().startsWith('http://localhost')) { outside.push(r.url()); return r.abort(); } r.continue(); });
p.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' });
const ok = await p.waitForFunction('document.querySelector("canvas") && window.__iv && window.__iv.frames > 10', { timeout:300000 }).then(() => true).catch(() => false);
await new Promise(r => setTimeout(r, 4000)); await p.screenshot({ path:path.join(out, 'phone_boot.png') });
const fonts = await p.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(', '));
console.log(JSON.stringify({ booted:ok, outsideRequests:outside, fontsLoaded:fonts, errors:errs.slice(0, 5) }, null, 1)); await b.close();
