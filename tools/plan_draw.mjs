// Act II plan maps for approval (Bible v2.0 0.2, CANON): the real site at Level 4 from above, with every proposed building,
// pad, route and plot drawn on it as a numbered, coloured area and a legend.  node tools/plan_draw.mjs <url> <outDir>
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import path from 'node:path';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive:true });
const C = { build:'#e2a72c', mach:'#7fbf4a', plot:'#5aa8ff', route:'#ff7a3a', pad:'#f2e6c0', power:'#ff4a4a', joy:'#c88cff' };
// [n, label, kind, rect [x0,z0,x1,z1] or line [[x,z],...]]
const PLANS = {
  5:{ title:'Level 5 plan: Regional Manufacturer (Jan 1974, snow) for approval', view:[3.9, 6, 7], items:[
    [1, 'Office block (built in the skip): Priya Nair, Eldon\'s letter, the Finance tab, owner\'s new desk', 'build', [-4, 18.8, 5, 25.4]],
    [2, 'Zebra crossing from the main gate to the office (vehicles stop for walkers)', 'route', [4.2, 14.3, 5.8, 17.7]],
    [3, 'Ada Finch\'s corner plot (bought Tuesday through Vera Lind)', 'plot', [13.5, 18.6, 28, 24.5]],
    [4, 'Second pipe mill on its pad (Big Tom installs it)', 'mach', [15.2, 20.0, 19.8, 23.0]],
    [5, 'Coil rack 2: the steel flatbed unloads here', 'mach', [13.9, 19.8, 14.9, 23.2]],
    [6, 'Pipe rack 2 and the loading lane to dock 2', 'mach', [20.3, 20.2, 21.6, 23.0]],
    [7, 'Dock 2: side dock with its ramp; the second (white) lorry backs in from Mill Road', 'build', [22.2, 19.2, 24.4, 23.8]],
    [8, 'Lorry bay 2 and its road gate', 'route', [24.6, 18.7, 27.6, 24.3]],
    [9, 'Grit bin and shovels ($2,400)', 'pad', [-7.6, .5, -6.4, 1.7]],
    [10, 'Snow chains and plough blade ($2,400)', 'pad', [20.6, 10.3, 21.8, 11.5]],
    [11, 'Gus\'s farewell party ring (in front of the workshop, as built)', 'joy', [-6.5, -1.6, -2.5, 1.6]] ] },
  6:{ title:'Level 6 plan: Industrial Company (Apr 1974, showers and hail) for approval', view:[3.9, 6, 4], items:[
    [1, 'June Finch\'s clerk\'s window (office block ground floor); she walks to both docks to collect the cash', 'build', [-1.6, 18.9, .6, 19.7]],
    [2, 'Mobile crane stands here for the lift (comes in through the main gate)', 'route', [1.0, 5.6, 5.2, 9.4]],
    [3, 'The crate machine is swapped for its tier 2 refit on the same pad', 'mach', [-2.6, 1.6, 1.8, 4.4]],
    [4, 'Grandad\'s old crate machine under its tarpaulin, kept in the corner', 'joy', [15.8, -11.4, 17.6, -9.8]],
    [5, 'Works canteen ($5,000): crew +3% for the afternoon', 'pad', [-12, 19.2, -6, 24.4]],
    [6, 'Lightning conductor on the workshop chimney ($5,000)', 'power', [-10.6, -15.0, -8.8, -13.2]],
    [7, 'Automatic changeover fitted to the generator', 'power', [4.4, -7.2, 6.2, -5.4]],
    [8, 'Trophy cabinet and the service book (in the office block)', 'build', [2.2, 21, 4.6, 23]],
    [9, 'Service tags hang on each machine; the inspector walks the lanes', 'route', [-1, 4.6, 10, 6.6]] ] },
  7:{ title:'Level 7 plan: Major Manufacturer (Oct 1974, leaves, fog, a gale) for approval', view:[4.6, 0, -2], items:[
    [1, 'The order board: three pinned cards on the office block\'s front wall (four with the upgrade)', 'build', [.4, 18.6, 3.8, 19.4]],
    [2, 'Works clock tower on the office block ($12,000): +0.1 phone interest, a landmark', 'pad', [-1.2, 20.6, 1.6, 23.4]],
    [3, 'Second supervisor zone: the owner places the ring (here, round the pipe mill and press, or anywhere)', 'mach', [6, -2, 13, 5]],
    [4, 'Siding survey with Cyrus Bell in the gale: pegs along the railway strip behind the back fence', 'route', [-30, -22.2, 6.5, -20.6]],
    [5, 'Hollis Reed and the sales representative work from the town map (no yard change)', 'joy', [9, 10.4, 12.6, 12.2]],
    [6, 'Loading lamps on both docks (upgrade)', 'power', [14.4, 4.8, 16.5, 9.9]] ] },
  8:{ title:'Level 8 plan: Steel Works (Apr 1975, rain) for approval', view:[5.6, -6, -6], items:[
    [1, 'The railway strip lease (Cyrus Bell): the siding leaves the main line in the west and ends at a buffer stop', 'plot', [-34, -24.2, 7.5, -18.6]],
    [2, 'The siding: shunter No. 7 "Valley Belle" pushes the wagons in; the owner signs at the timetable board', 'route', [-34, -21.9, 6, -20.8]],
    [3, 'Raw-store bays (scrap, ore, spare): wagons tip in; limits painted on the walls', 'mach', [-11, -18.4, 4, -14.6]],
    [4, 'Furnace house (12 s a beam, 2 power, 2 operators); beams leave by its south door for the forklift', 'build', [-25, -17.5, -15.5, -8.5]],
    [5, 'Heavy-duty supply: second transformer on a fenced 11 kV plinth, its own line from the road', 'power', [-29.5, -15, -26.3, -11]],
    [6, 'Beam store spot A (behind the workshop, by the raw store): a build zone, the owner chooses A, B or C', 'pad', [-12.6, -12.4, -7.4, -10.4]],
    [7, 'Beam store spot B (forklift yard, nearest the furnace door)', 'pad', [-25.2, -1.6, -20.6, 2.6]],
    [8, 'Beam store spot C (North field, beside the press)', 'pad', [8.6, -20.6, 12.6, -17.2]],
    [9, 'Gates: back fence behind the workshop and the forklift yard\'s north fence open', 'route', [-14, -13.2, -11, -11.8]],
    [10, 'The old dairy next door (Vera Lind; Victor Krane bids against you, countdown on the sign)', 'plot', [24.6, -5.5, 38, 12]],
    [11, 'Bus shelter at the gate ($30,000): the crew arrive on time in bad weather', 'pad', [.2, 12.7, 2.8, 13.9]],
    [12, 'Joe Brennan\'s foreman post and Gus\'s whistle hand-over (in front of the workshop)', 'joy', [-3, -1.6, 0, 1]] ] },
};
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:900000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:1700, height:1300, deviceScaleFactor:1 }); await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/'; if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) }); if (u.includes('fonts.g')) return r.abort(); r.continue(); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
await p.evaluate(async () => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 1e6; v.evNext = 1e9;
  v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.startWhBuild(false); v.finishWh(false); for (const id of ['lanes', 'counter', 'urn', 'hatch']) v.applyRestore(id, false);
  S.plots.north = { st:3 }; v.buyField(false); S.levelUp = true; await v.startLevel(3); v.startPressBuild(false); v.finishPress(false);
  S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); v.startSaw2Build(false); v.finishSaw2(false); S.plots.road = { st:3 }; v.finishPlot('road', false);
  while (v.cardOpen) v.nextCard(); v.owner.o.visible = false; for (const c of v.staffObj.values()) c.o.visible = false; });
await p.evaluate(() => { for (const id of ['hud', 'ticket', 'ticket2', 'callc', 'callEdge', 'card', 'prompt', 'officeBtn', 'toasts', 'joy', 'vignette', 'labels', 'dock', 'fps', 'guideEdge']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
for (const [lv, P] of Object.entries(PLANS)) {
  await p.evaluate(([z, x, zz]) => { const v = window.__iv; v.camZoom = z; v.camLock = [x, zz]; }, P.view);
  await new Promise(r => setTimeout(r, 2500));
  await p.evaluate(([P, C]) => { document.getElementById('plancv')?.remove(); const v = window.__iv, c = document.createElement('canvas'); c.id = 'plancv'; c.width = innerWidth; c.height = innerHeight; c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99'; document.body.appendChild(c);
    const x = c.getContext('2d'), V = new v.Box3().min.constructor, pr = (a, bz) => { const q = new V(a, 0, bz).project(v.cam); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight]; };
    for (const [n, , kind, r] of P.items) { const col = C[kind], q = [pr(r[0], r[1]), pr(r[2], r[1]), pr(r[2], r[3]), pr(r[0], r[3])];
      x.beginPath(); x.moveTo(...q[0]); for (const t of q.slice(1)) x.lineTo(...t); x.closePath(); x.fillStyle = col + '55'; x.fill(); x.lineWidth = 3; x.strokeStyle = col; x.setLineDash(kind === 'plot' || kind === 'route' ? [10, 6] : []); x.stroke(); x.setLineDash([]);
      const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2; x.beginPath(); x.arc(cx, cy, 15, 0, 7); x.fillStyle = '#1f2512'; x.fill(); x.lineWidth = 3; x.strokeStyle = col; x.stroke();
      x.fillStyle = '#ece2c6'; x.font = 'bold 15px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), cx, cy + 1); }
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = 'rgba(31,37,18,.92)'; x.fillRect(16, 16, 900, 46); x.strokeStyle = '#e2b54a'; x.strokeRect(16, 16, 900, 46); x.fillStyle = '#ece2c6'; x.font = 'bold 22px Georgia'; x.fillText(P.title, 30, 47); }, [P, C]);
  await new Promise(r => setTimeout(r, 300)); await p.screenshot({ path:path.join(out, `level${lv}_plan.png`) }); fs.writeFileSync(path.join(out, `level${lv}_plan.json`), JSON.stringify(P.items.map(([n, l, k]) => [n, l, C[k]]))); console.log('plan', lv);
}
await b.close();
