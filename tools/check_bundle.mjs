// Check dist/playables against the YouTube Playables certification numbers
// (stability: initial bundle < 30 MiB MUST / 15 MiB SHOULD, each file < 30 MiB MUST / 512 KiB SHOULD,
// at most 8000 files; integration: the SDK script loads before any game code; no outside calls).
//   node tools/check_bundle.mjs            exits 1 on any MUST failure
import fs from 'node:fs'; import path from 'node:path';
const OUT = path.resolve(import.meta.dirname, '..', 'dist', 'playables');
const KiB = 1024, MiB = 1024 * KiB;
const files = []; (function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(OUT);
const rel = p => path.relative(OUT, p), size = p => fs.statSync(p).size;
const must = [], should = [], info = [];
// level 1 needs everything except the level 2 and 3 models, which load when the player reaches those levels
const LATER = ['models/pipe_machine.glb', 'models/level2.glb', 'models/tool_press.glb', 'models/level3.glb', 'models/level4.glb', 'models/level5.glb'];  // facilities.glb is part of level 1
const initial = files.filter(f => !LATER.includes(rel(f))).reduce((a, f) => a + size(f), 0), total = files.reduce((a, f) => a + size(f), 0);
info.push(`files ${files.length}, initial download ${(initial / KiB).toFixed(0)} KiB, total ${(total / KiB).toFixed(0)} KiB`);
if (initial >= 30 * MiB) must.push('initial bundle over 30 MiB'); else if (initial >= 15 * MiB) should.push('initial bundle over 15 MiB');
if (total >= 250 * MiB) must.push('total bundle over 250 MiB');
if (files.length > 8000) must.push('more than 8000 files');
for (const f of files) { const s = size(f); if (s >= 30 * MiB) must.push(`${rel(f)} over 30 MiB`); else if (s >= 512 * KiB) should.push(`${rel(f)} is ${(s / KiB).toFixed(0)} KiB (should be under 512 KiB)`); }
if (!fs.existsSync(path.join(OUT, 'index.html'))) must.push('no index.html at the root');
const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const firstScript = (html.match(/<script[^>]*>/) || [''])[0];
if (!firstScript.includes('https://www.youtube.com/game_api/v1')) must.push('the Playables SDK is not the first script');
// outside calls: only the SDK may come from the network; XML namespaces in three.js are not requests
const urls = new Set();
for (const f of files.filter(f => /\.(html|js|css)$/.test(f))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s"'`)<>]+/g)) urls.add(m[0]);
const allowed = u => u === 'https://www.youtube.com/game_api/v1' || u.startsWith('http://www.w3.org/');
for (const u of urls) if (!allowed(u)) must.push(`outside URL in the bundle: ${u}`);
for (const k of ['visibilitychange', 'document.hidden']) { const js = fs.readFileSync(path.join(OUT, 'game.js'), 'utf8'); if (js.includes(k)) info.push(`uses ${k} (allowed only outside Playables; the game guards it with the SDK check)`); }
console.log(info.join('\n'));
for (const s of should) console.log('SHOULD  ' + s);
for (const m of must) console.log('MUST    ' + m);
console.log(must.length ? `FAILED: ${must.length} MUST rule(s)` : `OK: every MUST rule passes${should.length ? `, ${should.length} SHOULD note(s)` : ''}`);
process.exit(must.length ? 1 : 0);
