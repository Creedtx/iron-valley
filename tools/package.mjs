// Build the YouTube Playables bundle from game/ (the artifact build stays as it is).
//
//   node tools/package.mjs            -> dist/playables/ and dist/iron-valley-playables.zip
//
// What changes against the artifact build:
//  - the Playables SDK is the first script on the page (integration requirement 1.1)
//  - three.js and its add-ons are bundled and minified into one game.js: no CDN, no import map
//  - fonts are local woff2 files (no Google Fonts)
//  - models ship as .glb files and load by level (level 2's only when the player gets there),
//    instead of the base64 models.js the artifact needs
// Then tools/check_bundle.mjs checks the size and file rules.
import { build } from 'esbuild';
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..'), GAME = path.join(ROOT, 'game'), OUT = path.join(ROOT, 'dist', 'playables');
// 0. lint first: an undefined name inside the game loop freezes the game (build 0.9's generator card)
execFileSync(path.join(import.meta.dirname, 'node_modules', '.bin', 'eslint'), ['--config', 'eslint.config.mjs', 'game/game.js'], { cwd:path.resolve(import.meta.dirname, '..'), stdio:'inherit' });
const NM = path.join(ROOT, 'tools', 'node_modules');
fs.rmSync(OUT, { recursive:true, force:true }); fs.mkdirSync(path.join(OUT, 'models'), { recursive:true }); fs.mkdirSync(path.join(OUT, 'fonts'), { recursive:true });

// 1. code: resolve the import map's names to the local three.js package
const three = path.join(NM, 'three');
const version = JSON.parse(fs.readFileSync(path.join(three, 'package.json'))).version;
if (version !== '0.170.0') throw new Error(`three ${version} installed, the game is written against 0.170.0`);
// three.js goes in its own file (cached separately, and it keeps game.js small). Only the parts the game and
// its add-ons use are kept: collect every THREE.x the game touches and every name the add-ons import.
const addonPath = a => path.join(three, 'examples', 'jsm', a.slice('three/addons/'.length));
const meta = await build({ entryPoints:[path.join(GAME, 'game.js')], bundle:true, write:false, metafile:true, format:'esm', outfile:'probe.js', logLevel:'silent',
  plugins:[{ name:'probe', setup(b){ b.onResolve({ filter:/^three$/ }, () => ({ path:'three', external:true })); b.onResolve({ filter:/^three\/addons\// }, a => ({ path:addonPath(a.path) })); } }] });
const names = new Set();
for (const f of Object.keys(meta.metafile.inputs)) { const src = fs.readFileSync(path.resolve(f), 'utf8');
  for (const m of src.matchAll(/THREE\.([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]three['"]/g)) for (const n of m[1].split(',')) { const k = n.trim().split(/\s+as\s+/)[0]; if (k) names.add(k); } }
const all = await import(path.join(three, 'build', 'three.module.js')); const used = [...names].filter(n => n in all).sort();
fs.mkdirSync(path.join(ROOT, 'build'), { recursive:true }); fs.writeFileSync(path.join(ROOT, 'build', 'three-entry.js'), `export { ${used.join(', ')} } from 'three';\n`);
await build({ entryPoints:[path.join(ROOT, 'build', 'three-entry.js')], bundle:true, minify:true, format:'esm', target:['es2020'], outfile:path.join(OUT, 'three.js'), legalComments:'none', logLevel:'warning',
  plugins:[{ name:'three', setup(b){ b.onResolve({ filter:/^three$/ }, () => ({ path:path.join(three, 'build', 'three.module.js') })); } }] });
await build({
  entryPoints:[path.join(GAME, 'game.js')], bundle:true, minify:true, format:'esm', target:['es2020'], outfile:path.join(OUT, 'game.js'),
  legalComments:'none', logLevel:'warning', define:{ __PLAYABLES__:'true' },
  plugins:[{ name:'three-map', setup(b){
    b.onResolve({ filter:/^three$/ }, () => ({ path:'./three.js', external:true }));
    b.onResolve({ filter:/^three\/addons\// }, a => ({ path:addonPath(a.path) }));
  } }],
});

// 2. models: every .glb the game loads, as binary files
for (const f of fs.readdirSync(path.join(ROOT, 'models'))) if (f.endsWith('.glb')) fs.copyFileSync(path.join(ROOT, 'models', f), path.join(OUT, 'models', f));

// 3. fonts: the faces and weights the page uses, Latin subset
const FONTS = [['oswald', 'Oswald', [500, 600, 700]], ['barlow', 'Barlow', [500, 600, 700]], ['special-elite', 'Special Elite', [400]], ['alfa-slab-one', 'Alfa Slab One', [400]], ['roboto-slab', 'Roboto Slab', [500, 600, 700]], ['roboto-mono', 'Roboto Mono', [500, 700]]];   // v2.0 20.2 (D-30)
let faces = '';
for (const [pkg, family, weights] of FONTS) for (const w of weights) {
  const file = `${pkg}-latin-${w}-normal.woff2`; fs.copyFileSync(path.join(NM, '@fontsource', pkg, 'files', file), path.join(OUT, 'fonts', file));
  faces += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${file}) format("woff2")}\n`;
}

// 4. page: SDK first, no external fonts, no import map, no models.js
let html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
const strip = (re, what) => { if (!re.test(html)) throw new Error(`index.html: could not find ${what}`); html = html.replace(re, ''); };
strip(/<link rel="preconnect"[^>]*>\s*/g, 'font preconnects');
strip(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/, 'Google Fonts link');
strip(/<script src="models\.js"><\/script>\s*/, 'models.js');
strip(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, 'artifact meta tag');
strip(/<script type="importmap">[\s\S]*?<\/script>\s*/, 'import map');
html = html.replace('<style>', `<style>\n${faces}`);
// the artifact page has no <head> of its own (the artifact host wraps it); the Playables page is a full document
const cut = html.indexOf('</style>') + '</style>'.length;
html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<script src="https://www.youtube.com/game_api/v1"></script>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${html.slice(0, cut)}\n</head>\n<body>\n${html.slice(cut)}\n</body>\n</html>\n`;
html = html.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<link rel="icon" href="data:,">\n');   // no favicon request
fs.writeFileSync(path.join(OUT, 'index.html'), html);

// 5. zip with index.html at the root
const zip = path.join(ROOT, 'dist', 'iron-valley-playables.zip'); fs.rmSync(zip, { force:true });
execFileSync('zip', ['-qr', zip, '.'], { cwd:OUT });
console.log(`[package] three ${version} bundled -> ${path.relative(ROOT, OUT)}, ${path.relative(ROOT, zip)} ${(fs.statSync(zip).size / 1024).toFixed(0)} KiB`);

// 6. the phone copy (Termux / any local web server): the same bundle without the YouTube Playables SDK line, so it
//    opens instantly and runs fully offline. Serve dist/phone/ and open http://localhost:8080 on the phone.
const PHONE = path.join(ROOT, 'dist', 'phone'); fs.rmSync(PHONE, { recursive:true, force:true }); fs.cpSync(OUT, PHONE, { recursive:true });
// the game script is asked for under a name that changes with every build (game.js?v=<hash>), so Chrome on the phone
// never keeps running an older cached copy after a git pull
const ver = (await import('node:crypto')).createHash('sha1').update(fs.readFileSync(path.join(PHONE, 'game.js'))).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(PHONE, 'index.html'), html.replace('<script src="https://www.youtube.com/game_api/v1"></script>\n', '').replace('<script type="module" src="game.js"></script>', `<script type="module" src="game.js?v=${ver}"></script>`));
console.log(`[package] phone copy -> ${path.relative(ROOT, PHONE)} (no Playables SDK, runs offline)`);
