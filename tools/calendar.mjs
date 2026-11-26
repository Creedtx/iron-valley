// Bible v2.0 3: the 10-minute day, the calendar from Monday 2 April 1973, Friday pay day at the wages hatch, a level
// opening on its own date after the early whistle and the torn calendar, deadlines as day and clock, old saves.
//   node tools/calendar.mjs <url>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1800000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:900, height:800, deviceScaleFactor:1 });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('k')) { sessionStorage.setItem('k', '1'); try { localStorage.clear(); } catch(e){} } });
await p.goto(url, { waitUntil:'domcontentloaded' }); await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);
const fail = []; const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fail.push(what); };
const run = (secs, cond) => ev(([secs, cond]) => { const v = window.__iv, S = v.S, f = cond ? new Function('v', 'S', 'return ' + cond) : null; v.hold = true; let t = 0;
  while (t < secs) { if (v.cardOpen && !window.__keepCards) v.nextCard(); if (S.call) { v.acceptCall(); v.closeOffice(); } if (S.order && !S.order.briefed) v.briefOrder(null);
    window.__each && window.__each(v); v.step(.05); t += .05; if (f && f(v, S)) break; }
  v.hold = false; return t; }, [secs, cond]);
// 1. the calendar
check(await ev(() => window.__iv.DAY_S === 600), 'a working day is 600 s of play (one game minute a second)');
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()) === 'Monday 2 April 1973'), 'the game opens on Monday 2 April 1973');
check(await ev(() => { const v = window.__iv; return v.dateOf(v.LV_START[2]) === 'Wednesday 18 April 1973' && v.dateOf(v.LV_START[3]) === 'Tuesday 5 June 1973' && v.dateOf(v.LV_START[4]) === 'Tuesday 7 August 1973' && v.dateOf(v.LV_START[5]) === 'Monday 14 January 1974'; }), 'level start dates match v2.0 6.1');
check(await ev(() => { const v = window.__iv; return v.dateOf(4) === 'Friday 6 April 1973' && v.dateOf(5) === 'Monday 9 April 1973'; }), 'the calendar skips the weekend');
check(await ev(() => { const v = window.__iv; v.S.time = v.dayNo() * 600 + 240; return v.dueAt(120) === 'Mon 13:00' && v.dueAt(420) === 'Tue 08:00'; }), 'a deadline reads as weekday and clock time, over the night');
// 2. pay day: a Friday afternoon with a crew of four
await ev(async () => { const v = window.__iv, S = v.S; while (v.cardOpen) v.nextCard(); S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 9000; S.orderSeq = 4; S.delivered = 4; S.sales.told = true; v.evNext = 1e9;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); v.applyRestore('yard', false); S.levelUp = true; await v.startLevel(2); while (v.cardOpen) v.nextCard();
  v.startMillBuild(false); v.finishMill(false); v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.applyRestore('hatch', false);
  while (v.cardOpen) v.nextCard(); v.hold = true; v.step(.05); v.hold = false; const d = v.dayNo(); S.cal.off = Math.ceil((v.calDay(d) + 1) / 5) * 5 - 1 - d; S.time = d * 600 + 560; S.day.n = d; });
check(await ev(() => window.__iv.isFriday()), 'the test day is a Friday');
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()).startsWith('Friday')), 'level 2 runs on into Friday');
await run(15, 'v.payDay()');
check(await ev(() => !!window.__iv.payDay() && window.__iv.payTime()), '16:30 on Friday: pay day opens');
await run(1); check(await ev(() => window.__iv.M_hatch && window.__iv.M_hatch.open > .3), 'the wages hatch shutter opens');
check(await ev(() => window.__iv.payDay().est === true), 'on level 2 grandad\'s estate pays the wages');
await ev(() => { const v = window.__iv; v.owner.o.position.set(v.PAY_AT[0], 0, v.PAY_AT[1]); });
await run(26, 'v.payNeeded().every(st => v.payDay().paid[st.id])');
check(await ev(() => { const v = window.__iv; return v.payNeeded().length >= 3 && v.payNeeded().every(st => v.payDay().paid[st.id]); }), 'every worker queues at the hatch and gets his packet from the owner');
check(await ev(() => { const v = window.__iv; return [...v.staffObj.values()].every(c => !c.pay); }), 'nobody is left standing in the pay queue');
await run(160, 'S.day.closing && S.day.closing.card');   // the evening: the crew off, the owner drives home, the gates shut
check(await ev(() => { const b = window.__iv.S.day.book[0]; return b && b.fri && b.week && b.pay && b.pay.n >= 3 && /^Friday/.test(b.date); }), 'Friday\'s day book closes the week with the pay packets');
check(await ev(() => /Saturday/.test(document.getElementById('storyBody').innerHTML) && /Monday/.test(document.getElementById('storyBody').innerHTML)), 'the Saturday summary shows, and the gates open on Monday');
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); });
await run(3);
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()).startsWith('Monday')), 'Monday morning after the weekend');
// 3. a level opens on its own date: the charter is done, the whistle goes early, then the calendar turns
await ev(() => { const v = window.__iv, S = v.S; S.time = v.dayNo() * 600 + 200; S.levelUp = true; S.lv3.field = true; document.getElementById('luOk').click(); });
check(await ev(() => window.__iv.S.nextLevel === 3 && !!window.__iv.S.day.closing), 'opening level 3 blows the whistle early and waits for the night');
await run(60, 'S.day.closing && S.day.closing.card');
check(await ev(() => /turn the calendar/.test(document.getElementById('storyBody').innerHTML)), 'the day book offers to turn the calendar');
await ev(() => { const v = window.__iv; v.nextCard(); });
await p.waitForFunction('window.__iv.S.level === 3', { timeout:60000 });
check(await ev(() => window.__iv.dateOf(window.__iv.calDay()) === 'Tuesday 5 June 1973'), 'level 3 opens on Tuesday 5 June 1973');
check(await ev(() => /calwall/.test(document.getElementById('storyBody').innerHTML) && /June/.test(document.getElementById('storyBody').innerHTML)), 'the office calendar loses its pages to the new date');
await ev(() => window.__iv.nextCard());
check(await ev(() => /Pipes roll out of Mill Road/.test(document.getElementById('storyBody').innerHTML)), 'the Courier prints level 2\'s headline');
// 4. an 8-minute-day save loads on the 10-minute clock
await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); });
const old = await ev(() => { const S = JSON.parse(JSON.stringify(window.__iv.S)); S.v = 7; S.level = 2; S.time = 480 * 3 + 240; S.cal = undefined; S.l5.nextBill = 480 * 3 + 300; return S; });
check(await ev(o => { const v = window.__iv; const m = v.migrate ? v.migrate(o) : null; return !!m && m.time === 600 * 3 + 300 && m.l5.nextBill === 600 * 3 + 300 + 60 && v.dateOf(Math.floor(m.time / 600) + m.cal.off) === 'Wednesday 18 April 1973'; }, old), 'an old save keeps its day, stretches the hour, and lands on level 2\'s date');
check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
console.log(fail.length ? `\n${fail.length} FAILED` : '\nCALENDAR CLEAN');
await b.close(); process.exit(fail.length ? 1 : 0);
