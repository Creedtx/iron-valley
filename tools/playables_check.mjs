// Runs the packaged Playables bundle (dist/playables) against a stand-in for the YouTube Playables SDK and
// checks the integration rules the game can break: SDK first, firstFrameReady before gameReady, gameReady
// only after the loading screen is gone, loadData awaited before any saveData, saves under the size limit,
// onPause stops the loop and rendering until onResume, YouTube mute is respected, an old save loads, no
// outside network calls, and level 2's models download only when level 2 starts.
//   (serve dist/playables first, e.g. python3 -m http.server 8766)   node tools/playables_check.mjs http://localhost:8766/
import puppeteer from 'puppeteer-core';
const [url] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844 });
const outside = [], fetched = [];
// an old (build 0.7, save version 5) level 1 save, as the cloud would return it
const OLD = JSON.stringify({ v:5, cash:777, earned:1500, rep:58, delivered:2, ontime:2, shipped:11, history:[], timber:8, store:10, feed:2, pallet:2, bed:3, cashPile:0, order:{ qty:8, pay:440, client:'Valley Grocers', deadline:132, id:3, time:50, ready:false }, call:null, orderSeq:3,
  staff:[{ id:1, name:'Walt', role:'operator', lv:2, xp:10, energy:80, focus:90, look:{ parts:['hat_hard', 'earmuffs', 'hair_short'], skin:'#e0ac85', hair:'#b8b2a6', shirt:'#c9b28a' } },
         { id:2, name:'Tom', role:'loader', lv:1, xp:0, energy:100, focus:100, look:{ parts:['vest', 'hat_cap', 'hair_short'], skin:'#9b6a43', hair:'#1a1a1a', shirt:'#d8d2c2' } }],
  nextId:3, up:{ saw:1, gen:0, surge:0, fuel:0, hands:0, tools:0, stack:0, supply:0, boots:0 }, restored:{ lights:true, paint:false, windows:false, coffee:false, yard:false }, padPaid:{},
  power:{ fuel:90, breakers:{ saw:true, lights:true, office:true } }, cond:{ saw:90, engine:95, wiring:92 }, faults:[], faultSeq:1, fixed:1, lastFault:0, mechIntro:false, tutFault:true,
  tut:10, tutDone:true, levelUp:false, officeSeen:true, checked:{ operator:true, loader:true }, owner:[8.4, 6.0], time:400 });
const MOCK = `(() => { const L = window.__yt = { log:[], saves:[], loadDone:false, pause:null, resume:null, audio:null, audioOn:false };
  const t = n => L.log.push([n, performance.now(), !!document.getElementById('loading')]);
  window.ytgame = { IN_PLAYABLES_ENV:true, SDK_VERSION:'mock',
    game:{ firstFrameReady(){ t('firstFrameReady'); }, gameReady(){ t('gameReady'); },
      loadData(){ t('loadData'); return new Promise(r => setTimeout(() => { L.loadDone = true; t('loadDone'); r(${JSON.stringify(OLD)}); }, 300)); },
      saveData(s){ L.saves.push({ len:s.length, beforeLoad:!L.loadDone }); return Promise.resolve(); } },
    system:{ isAudioEnabled(){ return L.audioOn; }, onAudioEnabledChange(cb){ L.audio = cb; }, onPause(cb){ L.pause = cb; }, onResume(cb){ L.resume = cb; }, getLanguage(){ return Promise.resolve('en'); } },
    engagement:{ sendScore(){ return Promise.resolve(); } }, health:{ logError(){}, logWarning(){} } }; })();`;
await p.setRequestInterception(true);
const host = new URL(url).host;
p.on('request', r => { const u = r.url();
  if (u === 'https://www.youtube.com/game_api/v1') return r.respond({ status:200, contentType:'text/javascript', body:MOCK });
  if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).host !== host) { outside.push(u); return r.abort(); }
  fetched.push(new URL(u).pathname); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const results = []; const check = (ok, what) => { results.push([ok, what]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); };
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && !document.getElementById("loading") && window.__yt.log.some(x => x[0] === "gameReady")', { timeout:90000 });
const L = await p.evaluate(() => window.__yt.log);
const idx = n => L.findIndex(x => x[0] === n);
check(idx('firstFrameReady') === 0, 'firstFrameReady is the first SDK call, while the loading screen shows');
check(idx('gameReady') > idx('firstFrameReady') && L[idx('gameReady')][2] === false, 'gameReady comes after firstFrameReady, once the loading screen is gone');
check(idx('loadDone') >= 0 && idx('loadDone') < idx('gameReady'), 'cloud save loaded before the game is ready');
const s0 = await p.evaluate(() => { const S = window.__iv.S; return { letter:S.letter, card:window.__iv.cardOpen, staffN:S.staff.length, v:S.v, level:S.level, cash:S.cash, saw:S.up.saw, gen2:S.up.gen2, walt:S.staff[0].lv, pipe:S.cond.pipe, brk:S.power.breakers.pipe, cut:S.order && S.order.cut, briefed:S.order && S.order.briefed }; });
check(s0.letter === true && s0.card === false && s0.staffN >= 1 && s0.v === 7 && s0.level === 1 && s0.cash === 777 && s0.saw === 1 && s0.walt === 2 && s0.gen2 === 0 && s0.pipe === 100 && s0.brk === true && s0.cut === 5 && s0.briefed === true, `a version 5 save, with an open order from an older build, loads and is repaired (${JSON.stringify(s0)})`);
// make some progress so the game saves
await p.evaluate(() => { const v = window.__iv; v.S.cash += 1; v.save(); });
await new Promise(r => setTimeout(r, 500));
const saves = await p.evaluate(() => window.__yt.saves);
check(saves.length > 0 && saves.every(s => !s.beforeLoad), `saveData only after loadData (${saves.length} saves)`);
check(saves.every(s => s.len < 64 * 1024), `every save under 64 KiB (largest ${Math.max(...saves.map(s => s.len))} bytes)`);
// pause: nothing runs or renders until resume
await p.evaluate(() => window.__yt.pause());
const f0 = await p.evaluate(() => [window.__iv.frames, window.__iv.S.time]); await new Promise(r => setTimeout(r, 1500));
const f1 = await p.evaluate(() => [window.__iv.frames, window.__iv.S.time]);
check(f0[0] === f1[0] && f0[1] === f1[1], `onPause stops the loop and rendering (frames ${f0[0]} -> ${f1[0]})`);
const pausedSave = await p.evaluate(() => window.__yt.saves.length);
check(pausedSave > saves.length, 'progress is saved on pause');
await p.evaluate(() => window.__yt.resume()); await new Promise(r => setTimeout(r, 1500));
const f2 = await p.evaluate(() => [window.__iv.frames, window.__iv.S.time]);
check(f2[0] > f1[0] && f2[1] > f1[1], `onResume starts it again (frames ${f1[0]} -> ${f2[0]})`);
// audio: YouTube mute is on, so a tap must not start sound; switching it on allows sound
await p.mouse.click(200, 600); await new Promise(r => setTimeout(r, 300));
const a0 = await p.evaluate(() => window.__ivAudio ? window.__ivAudio() : null);
check(a0 === null || a0 !== 'running', `no sound while YouTube is muted (audio ${a0})`);
await p.evaluate(() => window.__yt.audio(true)); await p.mouse.click(200, 600); await new Promise(r => setTimeout(r, 300));
const a1 = await p.evaluate(() => window.__ivAudio ? window.__ivAudio() : null);
check(a1 === 'running' || a1 === 'suspended', `sound allowed after YouTube unmutes (audio ${a1})`);
await p.evaluate(() => window.__yt.audio(false)); await new Promise(r => setTimeout(r, 300));
const a2 = await p.evaluate(() => window.__ivAudio ? window.__ivAudio() : null);
check(a2 !== 'running', `sound stops when YouTube mutes again (audio ${a2})`);
// level 2's models are not part of the first download
check(!fetched.some(f => f.includes('pipe_machine') || f.includes('level2')), 'level 2 models are not downloaded at level 1');
await p.evaluate(async () => { const v = window.__iv; v.S.levelUp = true; await v.startLevel(2); });
await p.waitForFunction('window.__iv.S.level === 2', { timeout:30000 });
check(fetched.some(f => f.endsWith('/models/level2.glb')) && fetched.some(f => f.endsWith('/models/pipe_machine.glb')), 'level 2 models download when level 2 starts');
check(!fetched.some(f => f.includes('tool_press') || f.includes('level3')), 'level 3 models are not downloaded before level 3');
await p.evaluate(async () => { const v = window.__iv; v.S.levelUp = true; await v.startLevel(3); });
await p.waitForFunction('window.__iv.S.level === 3 && window.__iv.M.l3Built', { timeout:30000 });
check(fetched.some(f => f.endsWith('/models/level3.glb')) && fetched.some(f => f.endsWith('/models/tool_press.glb')), 'level 3 models download when level 3 starts');
check(!fetched.some(f => f.includes('level4')), 'level 4 models are not downloaded before level 4');
await p.evaluate(async () => { const v = window.__iv; v.S.levelUp = true; await v.startLevel(4); });
await p.waitForFunction('window.__iv.S.level === 4 && window.__iv.M.l4Built', { timeout:30000 });
check(fetched.some(f => f.endsWith('/models/level4.glb')), 'level 4 models download when level 4 starts');
check(!fetched.some(f => f.includes('level5')), 'level 5 models are not downloaded before level 5');
await p.evaluate(async () => { const v = window.__iv; v.S.levelUp = true; await v.startLevel(5); });
await p.waitForFunction('window.__iv.S.level === 5 && window.__iv.M.l5Built', { timeout:30000 });
check(fetched.some(f => f.endsWith('/models/level5.glb')), 'level 5 models download when level 5 starts');
check(outside.length === 0, `no outside network calls${outside.length ? ': ' + outside.slice(0, 3).join(', ') : ''}`);
check(errs.length === 0, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
await b.close();
const bad = results.filter(r => !r[0]).length; console.log(bad ? `${bad} check(s) failed` : 'all Playables checks passed'); process.exit(bad ? 1 : 0);
