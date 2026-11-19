// Whole-game audit (build 0.20): plays working days fast (the game's own step(), no rendering) at levels 1, 2 and 3
// and records everything that should be impossible in a real yard:
//   physics  - a person standing inside a wall, machine or stack (a collision box); a person jumping further in one
//              step than they can walk; a person inside a lorry, the flatbed or the car while it moves; somebody
//              outside the fence who should be inside it
//   maths    - stock counts below zero, not whole numbers or over their cap; cash or reputation not a number;
//              crates or pipes appearing or vanishing (everything made is on a stack, in somebody's arms, on a lorry,
//              shipped or sold at the gate); the clock running backwards within a day
//   logic    - a worker stuck in one place on a moving job; a machine running with nobody at it; a stack's meshes not
//              matching its count; a carried load with no carry type; the day book opening with the car still out
//   node tools/audit.mjs <url> [days per level, default 2]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const [url, daysArg] = process.argv.slice(2); const DAYS = +(daysArg || 2);
const b = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', protocolTimeout:1800000, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({ width:390, height:844, deviceScaleFactor:1, isMobile:true, hasTouch:true });
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(), pre = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  if (u.startsWith(pre)) return r.respond({ status:200, contentType:'text/javascript', headers:{ 'access-control-allow-origin':'*' }, body:fs.readFileSync(path.join(import.meta.dirname, 'node_modules/three', u.slice(pre.length))) });
  if (u.includes('fonts.g') || u.endsWith('favicon.ico')) return r.abort(); r.continue(); });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch(e){} });
await p.goto(url, { waitUntil:'domcontentloaded' });
await p.waitForFunction('window.__iv && window.__iv.owner && window.__iv.frames > 20', { timeout:300000 });
const ev = (f, a) => p.evaluate(f, a);

// the watcher, in the page: called after every step
await ev(() => {
  const v = window.__iv, A = window.__aud = { found:new Map(), prev:new Map(), still:new Map(), sold:{ crate:0, pipe:0 }, lastWalk:null, q0:null, lvl:0 };
  const note = (kind, who, msg, extra) => { const k = kind + '|' + who; const f = A.found.get(k); if (f) { f.n++; return; } A.found.set(k, { kind, who, msg, n:1, at:'day ' + (v.dayNo() + 1) + ' t' + Math.round(v.S.time % 480), lv:v.S.level, extra }); };
  A.note = note;
  const folkList = () => { const a = []; for (const c of v.staffObj.values()) a.push([c.st.name + ' (' + c.st.role + ')', c]); a.push(['owner', v.owner]); for (const [id, c] of v.folk) a.push([id, c]); if (v.walker) a.push(['gate customer ' + v.walker.def.name, v.walker.c]); return a; };
  const inBox = (x, z, b, m = .1) => x > b[0] + m && x < b[2] - m && z > b[1] + m && z < b[3] - m;
  const vehicles = () => [['forklift', v.fork.o, () => /^to/.test(v.fork.state)], ['lorry', v.M.truck, () => !['away', 'docked'].includes(v.truck.state)], ['flatbed', v.M.flat, () => !['away', 'parked'].includes(v.sup.state)], ['car', v.M.car, () => !!v.trip && !['away', 'there', 'home'].includes(v.trip.phase)]];
  A.check = (dt, i) => {
    const S = v.S; if (A.settle > 0) A.settle--;
    // ---- maths: counts
    const counts = { pallet:S.pallet, pipes:S.pipes, tools:S.tools, bed:S.bed, pbed:S.pbed, tbed:S.tbed, feed:S.feed, store:S.store, coils:S.coils, whc:S.wh.c, whp:S.wh.p, wht:S.wh.t, tcoil:S.tcoil, tfeed:S.tfeed };
    for (const [k, n] of Object.entries(counts)) if (n !== undefined && (!Number.isFinite(n) || n < 0 || Math.abs(n - Math.round(n)) > 1e-6)) note('maths', k, `${k} = ${n}`);
    if (S.pallet > v.palletCap() + 2) note('maths', 'pallet cap', `pallet ${S.pallet} over its cap ${v.palletCap()}`);
    if (!Number.isFinite(S.cash)) note('maths', 'cash', 'cash is not a number'); if (!(S.rep >= 0 && S.rep <= 100)) note('maths', 'rep', `reputation ${S.rep}`);
    if (S.order && !(S.order.time >= 0)) note('maths', 'order time', `order time ${S.order.time}`);
    // ---- maths: goods conservation. Everything made is on a stack, carried, on the lorry bed, shipped, or sold at the gate
    let carC = 0, carP = 0; for (const [, c] of folkList()) { if (c.carryType === 'crate') carC += c.stack.length; if (c.carryType === 'pipe') carP += c.stack.length; if (c.cart && c.cart.crates) carC += 0; } if (v.fork.carryType === 'crate') carC += v.fork.stack.length;
    const w = v.walker; if (w) A.lastWalk = { type:w.def.want, got:w.c.stack.length + (w.c.cart && w.c.cart.load ? w.c.cart.load : 0), st:w.state }; else if (A.lastWalk) { A.sold[A.lastWalk.type] += A.lastWalk.got; A.lastWalk = null; }
    const qc = S.made - (S.pallet + S.wh.c + (S.lv4.pallet2 || 0) + carC + S.shipped + A.sold.crate);
    const qp = (S.pmade || 0) - (S.pipes + S.wh.p + carP + (S.pshipped || 0) + A.sold.pipe);
    if (A.q0 === null) A.q0 = [qc, qp];
    else { if (qc !== A.q0[0]) { note('maths', 'crates', `crates ${qc > A.q0[0] ? 'vanished' : 'appeared'}: ${Math.abs(qc - A.q0[0])}`, JSON.stringify({ made:S.made, pallet:S.pallet, wh:S.wh.c, carried:carC, shipped:S.shipped, sold:A.sold.crate, bed:S.bed, walker:A.lastWalk, order:S.order && [S.order.qty, S.order.ready] })); A.q0[0] = qc; }
           if (qp !== A.q0[1]) { note('maths', 'pipes', `pipes ${qp > A.q0[1] ? 'vanished' : 'appeared'}: ${Math.abs(qp - A.q0[1])}`, JSON.stringify({ made:S.pmade, rack:S.pipes, wh:S.wh.p, carried:carP, shipped:S.pshipped, sold:A.sold.pipe, bed:S.pbed })); A.q0[1] = qp; } }
    // ---- physics: people
    for (const [name, c] of folkList()) {
      if (!c || !c.o) continue; const o = c.o.position, vis = c.o.visible, pr = A.prev.get(c);
      if (vis && pr && pr.vis && !(A.settle > 0)) { const d = Math.hypot(o.x - pr.x, o.z - pr.z); if (d > .6) note('physics', name + ' jump ' + (c.state || c.job || ''), `${name} jumped ${d.toFixed(2)} m in one step (state ${c.state || c.job || '-'}, from ${pr.x.toFixed(1)},${pr.z.toFixed(1)} to ${o.x.toFixed(1)},${o.z.toFixed(1)})`); }
      // walking through a thin wall (a fence, a post): the step's line crosses a collision box although neither end is inside it
      if (vis && pr && pr.vis && !(A.settle > 0) && c.lunch !== 'eat' && !(c.job === 'lunch' && c.gs === 'eat')) for (const [k, bx] of v.COL) { if (String(k) === 'car' && name === 'owner') continue;
        const ins = (x, z) => x > bx[0] && x < bx[2] && z > bx[1] && z < bx[3]; if (ins(pr.x, pr.z) || ins(o.x, o.z)) continue;
        let t0 = 0, t1 = 1; const dx = o.x - pr.x, dz = o.z - pr.z; let hit = true;
        for (const [p0, d, lo, hi] of [[pr.x, dx, bx[0] + .02, bx[2] - .02], [pr.z, dz, bx[1] + .02, bx[3] - .02]]) { if (Math.abs(d) < 1e-9) { if (p0 <= lo || p0 >= hi) { hit = false; break; } continue; } let a = (lo - p0) / d, b2 = (hi - p0) / d; if (a > b2) [a, b2] = [b2, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b2); if (t0 > t1) { hit = false; break; } }
        if (hit) { note('physics', name + ' through ' + k, `${name} walked through '${k}' [${bx.map(n => n.toFixed(1))}] from ${pr.x.toFixed(2)},${pr.z.toFixed(2)} to ${o.x.toFixed(2)},${o.z.toFixed(2)} (state ${c.state || c.job || '-'}, ${window.__iv.dayNo()}:${Math.round(S.time % 480)})`); break; } }
      A.prev.set(c, { x:o.x, z:o.z, vis });
      if (!vis) continue;
      if (c.stack && c.stack.length && !c.carryType) note('logic', name + ' carry', `${name} carries ${c.stack.length} things with no carry type`);
      for (const [k, bx] of v.COL) { if ((String(k) === 'car' && name === 'owner') || c.lunch === 'eat' || (c.job === 'lunch' && c.gs === 'eat') || c.seated) continue; const thin = Math.min(bx[2] - bx[0], bx[3] - bx[1]) < .5; if (inBox(o.x, o.z, bx, thin ? .02 : .1)) { note('physics', name + ' in ' + k, `${name} inside collision box '${k}' [${bx.map(n => n.toFixed(1))}] at ${o.x.toFixed(2)},${o.z.toFixed(2)} (state ${c.state || c.job || '-'}${c.lunch ? ', lunch ' + c.lunch : ''})`); break; } }
      // stuck: on a moving job but not moving for 20 s of game time
      const moving = c.path && c.path.length; const s = A.still.get(c) || { x:o.x, z:o.z, t:0 };
      if (moving && Math.hypot(o.x - s.x, o.z - s.z) < .05) { s.t += dt; if (s.t > 20) note('logic', name + ' stuck ' + c.state, `${name} has a path but has not moved for 20 s (state ${c.state}) at ${o.x.toFixed(2)},${o.z.toFixed(2)}`, JSON.stringify({ path:c.path.slice(0, 4).map(q => q.map(n => +n.toFixed(2))), cut:!!c.path.cut, rnd:c.rnd, hold:c.holdUntil, lunch:c.lunch, fork:v.fork.state, truck:v.truck.state, sup:v.sup.state, trip:v.trip && v.trip.phase, veh:JSON.stringify(v.vehInWay ? v.vehInWay(c, o.x + .1, o.z) : null) })); }
      else { s.x = o.x; s.z = o.z; s.t = 0; } A.still.set(c, s);
    }
    // ---- physics: vehicles moving through people (every 4 steps; footprint from the model's box)
    if (i % 4 === 0) for (const [vn, m, moving] of vehicles()) { if (!m || !m.visible || !moving()) continue;
      const dims = { forklift:[1.2, 1.4, .55], lorry:[2.75, 2.75, 1.15], flatbed:[2.75, 2.75, 1.15], car:[2.0, 2.0, .85] }[vn];   // the real footprint, turned with the vehicle
      for (const [name, c] of folkList()) { if (!c.o.visible || (vn === 'car' && name === 'owner') || (vn === 'forklift' && c.seated)) continue; const o = c.o.position; if (v.inFoot(m, o.x, o.z, dims[0], dims[1], dims[2])) { const mo = m.position, ya = m.rotation.y, rel = vn === 'forklift' ? ` (along ${((o.x - mo.x) * Math.cos(ya) - (o.z - mo.z) * Math.sin(ya)).toFixed(2)}, side ${((o.x - mo.x) * Math.sin(ya) + (o.z - mo.z) * Math.cos(ya)).toFixed(2)}, ${c.state || c.job}, ${c.path && c.path.length ? 'walking' : 'standing'})` : ''; note('physics', vn + ' through ' + name, `the ${vn} drove through ${name}${rel} at ${o.x.toFixed(1)},${o.z.toFixed(1)} (${vn === 'lorry' ? v.truck.state : vn === 'flatbed' ? v.sup.state : vn === 'forklift' ? v.fork.state : v.trip ? v.trip.phase : '-'})`); } } }
    // ---- physics: two vehicles in each other (a lorry through the car): any corner of one inside the other's footprint
    if (i % 4 === 0) { const vs = [['car', v.M.car, !!v.trip && v.M.car.visible, 1.88, .85], ['lorry', v.M.truck, v.M.truck.visible && v.truck.state !== 'away', 2.75, 1.15], ['flatbed', v.M.flat, v.M.flat.visible && v.sup.state !== 'away', 2.75, 1.15], ['forklift', v.fork.o, !!v.fork.o, 1.3, .55]].filter(q => q[1] && q[2]);
      for (const [an, am, , al, aw] of vs) for (const [bn, bm, , bl, bw] of vs) { if (an >= bn) continue; const o = am.position, y = am.rotation.y, fx = Math.cos(y), fz = -Math.sin(y);
        for (const [u, w] of [[al, aw], [al, -aw], [-al, aw], [-al, -aw], [0, 0]]) { const x = o.x + fx * u - fz * w, z = o.z + fz * u + fx * w; if (v.inFoot(bm, x, z, bl, bl, bw)) { note('physics', an + ' in ' + bn, `the ${an} and the ${bn} ran into each other at ${x.toFixed(1)},${z.toFixed(1)} (${v.trip ? v.trip.phase : '-'} / ${v.truck.state} / ${v.sup.state})`); break; } } } }
    // ---- logic: the forklift held up for long by somebody standing in its way (a work spot on the lane)
    if (v.fork.o && v.fork.blockBy) { A.fb = (A.fb || 0) + dt; if (A.fb > 10) note('logic', 'forklift blocked by ' + (v.fork.blockBy.st ? v.fork.blockBy.st.name : 'owner'), `the forklift waited over 10 s for ${v.fork.blockBy.st ? v.fork.blockBy.st.name + ' (' + v.fork.blockBy.state + ')' : 'the owner'} at ${v.fork.o.position.x.toFixed(1)},${v.fork.o.position.z.toFixed(1)}`); } else A.fb = 0;
    // ---- logic: the day book with the car still out
    if (v.cardOpen && /Day book/i.test(document.getElementById('storyBody').innerText) && v.trip) note('logic', 'daybook car', `day book opened while the car trip is at '${v.trip.phase}'`);
    if (S.day && S.day.closing && S.day.closing.t > 60 && !S.day.closing.shut) note('logic', 'closing held', 'the gates have not shut 60 s after the whistle', JSON.stringify({ empty:v.yardEmpty(), trip:v.trip && v.trip.phase, truck:v.truck.state, sup:v.sup.state, walker:!!v.walker, staff:[...v.staffObj.values()].filter(c => !c.gone && c.st.role !== 'forklift' && c.st.posted !== false).map(c => `${c.st.name}:${c.state}@${c.o.position.x.toFixed(1)},${c.o.position.z.toFixed(1)}${c.stack.length ? '#' + c.stack.length : ''}`), gus:v.folk.get('gus') && [v.folk.get('gus').job, v.folk.get('gus').gone], gate:v.gateHolder, supQ:v.sup.queueFor === v.CAR ? 'car' : v.sup.queueFor, carQ:v.CAR.queueFor === v.sup ? 'flatbed' : v.CAR.queueFor === v.truck ? 'lorry' : v.CAR.queueFor, car:[+v.M.car.position.x.toFixed(1), +v.M.car.position.z.toFixed(1)], flat:[+v.M.flat.position.x.toFixed(1), +v.M.flat.position.z.toFixed(1)], supYield:v.sup.yieldT ? +(v.S.time).toFixed(0) : null }));
    if (S.day && S.day.closing && S.day.closing.shut && v.trip) note('logic', 'gates car', `gates shut while the car trip is at '${v.trip.phase}'`);
    // ---- logic: machines running with nobody there
    if (v.sawOn && v.sawBy && v.sawBy.o && Math.hypot(v.sawBy.o.position.x - v.P.op[0], v.sawBy.o.position.z - v.P.op[1]) > 1.2) note('logic', 'saw unmanned', `the saw runs while its operator is ${Math.hypot(v.sawBy.o.position.x - v.P.op[0], v.sawBy.o.position.z - v.P.op[1]).toFixed(1)} m away`);
    if (v.lunchTime() && v.sawOn && v.sawBy && v.sawBy !== v.owner && v.dayMin() > 301) note('logic', 'saw at lunch', 'the saw runs at lunch with a worker on it');
    // ---- logic: stacks match their counts (after a short settle)
    if (i % 20 === 0) { const pal = v.poolOf('crate').pallet.length; if (pal !== null && pal !== S.pallet) note('logic', 'pallet meshes', `pallet shows ${pal} crates but holds ${S.pallet}`); }
    // ---- clock
    if (A.t0 !== undefined && S.time < A.t0 - .02 && !(S.day && !S.day.closing && A.wasClosing)) note('maths', 'clock', `clock went back from ${A.t0.toFixed(2)} to ${S.time.toFixed(2)}`);
    A.t0 = S.time; A.wasClosing = !!(S.day && S.day.closing);
  };
});
// play in chunks: the game's own step() 20 times a game second, cards answered like a player would, calls taken
const play = async (gsecs, opts = {}) => ev(async ([gsecs, opts]) => {
  const v = window.__iv, A = window.__aud; v.hold = true; let t = 0, i = 0; v.owner.o.position.set(v.P.deskRing[0], 0, v.P.deskRing[1]);   // the owner at his desk, out of everybody's way
  const answer = () => { const B = document.getElementById('storyBody'); const btn = B.querySelector('[data-pick="now"]') || B.querySelector('[data-next]') || B.querySelector('[data-pick]') || B.querySelector('button'); if (btn) btn.click(); else v.nextCard(); };
  while (t < gsecs) {
    if (v.cardOpen) { A.check(0, i++); answer(); if (v.cardOpen) v.nextCard(); continue; }
    const S = v.S;
    if (S.call) { v.acceptCall(); v.closeOffice(); }
    if (S.order && !S.order.briefed) v.briefOrder(null);
    if (opts.timber && S.store < 8 && !S.delivery && v.orderTimber) v.orderTimber(24);
    if (opts.timber && S.coils < 2 && !S.delivery && v.orderSteel) v.orderSteel(2);
    if (S.order && S.order.ready && v.truck.state === 'docked' && !v.trip) { A.signT = (A.signT || 0) + .05; if (A.signT > 3) { A.signT = 0; v.signOrder(v.owner); } }   // the owner signs the lorry off
    // now and then the owner drives out on a sales trip (any time: late in the day too, to test the closing)
    if (opts.trips && !v.trip && !S.order && Math.random() < .002) { const ks = Object.keys(v.PLACES).filter(k => !v.PLACES[k].lv || S.level >= v.PLACES[k].lv); v.startTrip('visit', ks[Math.floor(Math.random() * ks.length)]); }
    v.step(.05); t += .05; A.check(.05, i++);
  }
  v.hold = false; return t;
}, [gsecs, opts]);
const report = async label => { const r = await ev(() => { const A = window.__aud, out = [...A.found.values()]; A.found = new Map(); return out; });
  console.log(await ev(() => { const S = window.__iv.S; return `played: day ${window.__iv.dayNo() + 1}, made ${S.made} crates / ${S.pmade || 0} pipes / ${S.tmade || 0} tools, shipped ${S.shipped}/${S.pshipped || 0}/${S.tshipped || 0}, lorries ${S.delivered}, gate served ${S.walk.served} lost ${S.walk.lost}, trips ${(S.sales || {}).trips || 0}, cash ${Math.round(S.cash)}, rep ${Math.round(S.rep)}`; }));
  console.log(`\n=== ${label}: ${r.length} kinds of problem`); for (const f of r) console.log(`[${f.kind}] x${f.n} lv${f.lv} ${f.at} :: ${f.msg}${f.extra ? '  ' + f.extra : ''}`); return r; };

await ev(() => { const v = window.__iv; while (v.cardOpen) v.nextCard(); const S = v.S; S.letter = true; S.tutDone = true; S.tut = 99; S.met.gus = true; S.cash = 20000; S.rep = 60; S.orderSeq = 4; S.delivered = 4; S.sales.told = true;
  v.hire('operator'); v.hire('loader'); v.closeOffice(); for (const st of S.staff) st.posted = true; v.evNext = 1e9; });
await ev(() => { window.__aud.q0 = null; });
await play(480 * DAYS, { trips:true }); await report('level 1');
await ev(async () => { const v = window.__iv; window.__aud.settle = 60; if (!v.S.restored.yard) v.applyRestore('yard', false); v.S.levelUp = true; await v.startLevel(2); v.startMillBuild(false); v.finishMill(false); v.hire('operator'); v.hire('loader'); v.hire('helper'); v.closeOffice(); for (const st of v.S.staff) st.posted = true; v.evNext = 1e9; window.__aud.q0 = null; });
await play(480 * DAYS, { trips:true }); await report('level 2');
await ev(async () => { const v = window.__iv; window.__aud.settle = 60; v.S.plots.north = { st:3 }; v.buyField(false); v.S.levelUp = true; await v.startLevel(3); v.closeOffice(); v.startPressBuild(false); v.finishPress(false); for (const r of ['operator', 'mechanic', 'loader', 'loader', 'helper', 'cleaner', 'supervisor']) v.hire(r); v.closeOffice(); for (const st of v.S.staff) st.posted = true; v.evNext = 1e9; window.__aud.q0 = null; });
await play(480 * DAYS, { trips:true }); await report('level 3');
await ev(async () => { const v = window.__iv, S = v.S; window.__aud.settle = 60; S.plots.scrap = { st:3 }; v.openScrapyard(false); S.levelUp = true; await v.startLevel(4); v.closeOffice(); while (v.cardOpen) v.nextCard();
  v.startSaw2Build(false); v.finishSaw2(false); for (const r of ['operator', 'forklift', 'loader']) v.hire(r); v.closeOffice(); for (const st of S.staff) st.posted = true;
  const l = S.staff.find(s => s.role === 'loader'); if (l) { v.promote(l.id); v.closeOffice(); const sup = v.supervisor(); S.lv4.post = v.zoneHint(); if (sup) { sup.state = 'toPatrol'; sup.path = null; } }
  S.cash += 5000; window.__aud.q0 = null; });
await play(480 * DAYS, { trips:true, timber:true }); await report('level 4');
console.log(errs.length ? 'page errors:\n' + [...new Set(errs)].slice(0, 20).join('\n') : 'no page errors');
await b.close();
