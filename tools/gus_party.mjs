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
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear(); }  });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:180000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => new Promise(r => setTimeout(r, ms));
await p.waitForFunction('!window.__iv.cardOpen || document.querySelector("#storyBody [data-next]")', { timeout:60000 });
// past the letter and Gus's first scene
for (let i = 0; i < 6; i++) { if (!(await ev(() => window.__iv.cardOpen))) break; await ev(() => window.__iv.nextCard()); await wait(300); }
const g = () => ev(() => { const v = window.__iv, c = v.folkMap.get('gus'); return c ? { job:c.job, gs:c.gs, at:[+c.o.position.x.toFixed(1), +c.o.position.z.toFixed(1)], carry:c.stack.length, pal:v.S.pallet, bed:v.S.bed, party:v.S.gus.party, say:c.say && T < c.say.until ? c.say.text : '' } : 'gone'; }).catch(e => e.message);
await ev(() => { window.T = 0; });
// carrying: operator posted, no loader, crates on the pallet, truck at the dock
await ev(() => { const v = window.__iv, S = v.S; S.tutDone = true; S.tut = 99; S.cash = 5000; v.hire('operator'); S.staff.forEach(s => s.posted = true); S.call = { qty:20, pq:0, tq:0, pay:240, client:'Test', deadline:600, nodl:true }; v.acceptCall(); v.closeOffice(); v.briefOrder(null); v.speed = 8; v.owner.o.position.set(-9, 0, 8); });
// level 5: the news, the party, the gifts, the pension
await ev(() => { const v = window.__iv, S = v.S; v.hire('loader'); S.staff.forEach(s => s.posted = true); S.level = 5; S.l5.t0 = S.time - 60; v.speed = 10; v.closeOffice(); });
await p.waitForFunction('window.__iv.cardOpen && document.querySelector("#storyBody [data-party]")', { timeout:120000 });
await p.screenshot({ path:path.join(out, 'p1_news.png') }); console.log('news card', await ev(() => document.querySelector('#storyBody').innerText.replace(/\n+/g, ' | ')));
await ev(() => document.querySelector('#storyBody [data-party]').click());
for (let i = 0; i < 40; i++) { await wait(2500); const r = await ev(() => ({ party:window.__iv.S.gus.party, t:window.__iv.partyT.toFixed(1), card:window.__iv.cardOpen, crew:[...window.__iv.staffObj.values()].map(c => c.party ? c.party.gs : c.state).join(',') })); console.log('PARTY', JSON.stringify(r)); if (i === 10) await p.screenshot({ path:path.join(out, 'p2_party.png') }); if (r.card) break; }
await p.waitForFunction('window.__iv.cardOpen && document.querySelector("#storyBody [data-gift]")', { timeout:300000 });
await p.screenshot({ path:path.join(out, 'p3_gifts.png') }); console.log('gift card', await ev(() => document.querySelector('#storyBody').innerText.replace(/\n+/g, ' | ')));
const cash0 = await ev(() => window.__iv.S.cash); await ev(() => document.querySelector('#storyBody [data-gift="rod"]').click()); await wait(800);
await p.screenshot({ path:path.join(out, 'p4_toolbox.png') }); console.log('after gift', await ev(() => document.querySelector('#storyBody').innerText.replace(/\n+/g, ' | ')), 'paid', cash0 - await ev(() => window.__iv.S.cash));
await ev(() => document.querySelector('#storyBody [data-bye]').click()); await wait(3000);
console.log('retired', JSON.stringify(await ev(() => ({ gus:window.__iv.S.gus, bill:window.__iv.billParts(), crew:[...window.__iv.staffObj.values()].map(c => c.state).join(',') }))));
await wait(30000); console.log('gus after', JSON.stringify(await g()));
await ev(() => { window.__iv.openOffice('staff'); }); await wait(1000); await p.screenshot({ path:path.join(out, 'p5_staff.png') });
console.log(errs.length ? 'ERRORS ' + JSON.stringify(errs.slice(0, 6)) : 'no errors'); await b.close();
