// Level 1 map with numbered pins on every element of a brand-new game; writes the picture and the pin positions.
//   node tools/map_annotate.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, out = 'shots/map'] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
// [group, name, x, z, y] in world metres; y is the pin's height above the ground
const ITEMS = [
  ['Workshop hall', 'Generator (diesel, the only power source)', 1.75, 1.9, 1.2],
  ['Workshop hall', 'Exhaust stack through the roof', 1.37, 1.48, 4.0],
  ['Workshop hall', 'Switchboard with the circuit breakers', 3.1, .2, 1.4],
  ['Workshop hall', 'Cable tray and wall lamps along the back wall', 9.5, .45, 2.8],
  ['Workshop hall', '"IRON VALLEY WORKS" sign on the back wall', 7.5, .02, 3.3],
  ['Workshop hall', 'Boarded-up windows (four)', 13.3, .1, 2.0],
  ['Workshop hall', 'Timber rack (planks for the saw)', 4.4, 1.3, .9],
  ['Workshop hall', 'Feed table beside the saw', 5.75, 2.55, .7],
  ['Workshop hall', 'Crate machine (saw bench)', 7.8, 2.3, 1.1],
  ['Workshop hall', 'Crate pallet (finished crates)', 9.6, 3.0, .5],
  ['Workshop hall', 'Isolator switch and junction box', 8.95, 1.0, 1.0],
  ['Workshop hall', 'Mechanic\'s workbench', 11.2, .7, 1.0],
  ['Workshop hall', 'Electrician\'s bench', 13.9, .45, 1.0],
  ['Workshop hall', 'Cable drum', 12.66, .5, .6],
  ['Workshop hall', 'Ladder', 14.7, 1.3, 1.2],
  ['Workshop hall', 'Machine under a tarp (the future pipe mill spot)', 12.4, 2.75, 1.2],
  ['Workshop hall', 'Loading dock door and floodlight', 15.15, 4.4, 1.6],
  ['Workshop hall', 'Delivery ring: sign the delivery note here', 15.75, 5.3, .1],
  ['Workshop hall', 'Cash ring: collect payments here', 13.3, 8.6, .1],
  ['Workshop hall', 'Front door (main entrance)', 9.15, 9.9, .8],
  ['Workshop hall', 'Side door to the back yard', 0, 5.15, .9],
  ['Office and break room', 'Owner\'s desk and phone', 2.1, 7.45, 1.0],
  ['Office and break room', 'Desk ring: open the office here', 2.1, 8.8, .1],
  ['Office and break room', 'Filing cabinets', .42, 7.3, 1.1],
  ['Office and break room', 'Bookshelf', .25, 9.1, 1.2],
  ['Office and break room', 'Potted plants (two)', 3.95, 6.75, .9],
  ['Office and break room', 'Glass partition and OFFICE door sign', 4.4, 7.7, 1.9],
  ['Office and break room', 'Break bench', 5.6, 9.45, .6],
  ['Office and break room', 'Break table', 7.1, 9.15, .8],
  ['Office and break room', 'Vending machine', 6.75, 7.75, 1.5],
  ['Office and break room', 'Coffee machine spot (appears when restored)', 5.3, 7.55, 1.0],
  ['Office and break room', 'Water cooler', 7.75, 7.6, 1.2],
  ['Office and break room', 'Spare water bottle rack', 5.95, 7.62, .9],
  ['Office and break room', 'Mop cart (cleaner\'s corner)', 8.4, 9.55, .6],
  ['Stock room', 'Stock room (timber store)', 17.4, 7.95, 1.2],
  ['Stock room', 'Hand trolley', 19.4, 9.1, .6],
  ['Stock room', 'Stock room doorway (supplier unloads here)', 17.8, 10.15, .6],
  ['Loading apron and dock', 'Concrete loading apron (truck docks here)', 18.6, 3.0, .1],
  ['Loading apron and dock', 'Lamp post on the apron', 20.3, 1.2, 2.6],
  ['Back yard', 'Diesel bulk tank and pump', -1.7, 1.8, 1.2],
  ['Back yard', 'Oil drums (red, blue, olive)', -2.8, .8, .9],
  ['Back yard', 'Dumpster', -6.8, .4, 1.1],
  ['Back yard', 'Junk pile 1 (to clear)', -4.6, 2.2, .8],
  ['Back yard', 'Junk pile 2 (to clear)', -2.7, 6.9, .8],
  ['Back yard', 'Junk pile 3 (to clear)', -6.4, 6.3, .8],
  ['Back yard', 'Washroom (toilet block, two stalls)', -2.3, 9.8, 1.8],
  ['Back yard', 'Dirt yard (becomes gravel when restored)', -6.2, 11.6, .1],
  ['Front and car park', 'Car park with parking lines', 4.5, 12.4, .1],
  ['Front and car park', 'Owner\'s car', 12.7, 12.3, 1.0],
  ['Front and car park', 'Main gate with the IRON VALLEY WORKS arch', 9.45, 14.6, 3.0],
  ['Front and car park', 'Lamp posts (two)', 2.6, 13.9, 2.6],
  ['Front and car park', 'Supplier\'s parking bay (flatbed with timber)', 18.2, 12.0, .1],
  ['Fences', 'Front fence (gate in the middle)', 3.5, 14.6, .7],
  ['Fences', 'West fence (a panel opens to the scrapyard later)', -8.4, 9.6, .7],
  ['Fences', 'Back fence behind the yard', -4.4, -1.0, .7],
  ['Plots for sale', 'North field (level 2): fenced meadow', 16.1, -5.4, .1],
  ['Plots for sale', 'Hay bales in the North field', 18.4, -6.9, 1.1],
  ['Plots for sale', 'North field gate panels', 18.0, -1.4, .7],
  ['Plots for sale', 'North field "For sale" sign (Abel Thorne)', 15.85, -1.05, 1.4],
  ['Plots for sale', 'Scrapyard (level 3): heaps, drums and crates', -12.2, 3.2, .8],
  ['Plots for sale', 'Wrecked car in the scrapyard', -13.6, 8.6, 1.0],
  ['Plots for sale', 'Scrapyard "For sale" sign (Rusty Pike)', -7.7, 9.6, 1.4],
  ['Plots for sale', 'Road frontage (level 4): empty fenced plot', 16.1, 17.6, .1],
  ['Plots for sale', 'Road frontage "For sale" sign (Valley Council)', 13.2, 15.3, 1.4],
  ['Outside the site', 'Mill Road (trucks arrive along it)', 22.7, 8, .1],
  ['Outside the site', 'Pavement, power poles and overhead wires', 25.3, 10, 6.5],
  ['Outside the site', 'Trees and bushes around the site', 5.5, -3.6, 2.5],
];
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1600, height:1200, deviceScaleFactor:1.5 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('fresh')) { sessionStorage.setItem('fresh', '1'); try { localStorage.clear(); } catch(e){} } });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner', { timeout:90000 });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); v.camZoom = 4.2; v.camLock = [6, 6]; v.paused = true; });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { for (const id of ['hud', 'ticket', 'ticket2', 'callc', 'callEdge', 'card', 'prompt', 'officeBtn', 'toasts', 'joy', 'vignette', 'labels']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
await new Promise(r => setTimeout(r, 600));
await p.screenshot({ path:path.join(out, 'level1_map_clean.png') });
// the people on the map at the start
const people = await p.evaluate(() => { const v = window.__iv, out = [['Characters', 'The owner (you)', v.owner.o.position.x, v.owner.o.position.z, 1.9]];
  for (const [id, f] of v.folk) out.push(['Characters', id === 'gus' ? 'Gus, the old foreman' : id, f.o.position.x, f.o.position.z, 1.9]); return out; });
const all = [...ITEMS, ...people];
const pins = await p.evaluate(list => { const v = window.__iv, V = v.cam.position.constructor, W = innerWidth, H = innerHeight;
  return list.map(([g, n, x, z, y], i) => { const q = new V(x, y || 0, z).project(v.cam); return { n:i + 1, g, name:n, x:x, z:z, px:(q.x + 1) / 2 * W, py:(1 - q.y) / 2 * H }; }); }, all);
await p.evaluate(pins => { const L = document.createElement('div'); L.id = 'pins'; L.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none';
  for (const q of pins) { const d = document.createElement('div'); d.textContent = q.n;
    d.style.cssText = `position:absolute;left:${q.px}px;top:${q.py}px;transform:translate(-50%,-50%);min-width:22px;height:22px;padding:0 4px;box-sizing:border-box;border-radius:11px;background:${q.g === 'Characters' ? '#2f6fb0' : q.g === 'Plots for sale' ? '#3e7d2a' : '#e8ab2c'};color:${q.g === 'Characters' || q.g === 'Plots for sale' ? '#fff' : '#1b1408'};font:700 12px/22px Arial,sans-serif;text-align:center;border:2px solid #1b1408;box-shadow:0 2px 6px rgba(0,0,0,.55)`;
    L.appendChild(d); } document.body.appendChild(L); }, pins);
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path:path.join(out, 'level1_map_numbered.png') });
fs.writeFileSync(path.join(out, 'pins.json'), JSON.stringify({ w:1600, h:1200, pins }, null, 1));
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs) : 'ok', pins.length, 'pins');
await b.close();
