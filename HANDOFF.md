# Handover: where Iron Valley stands (17 Nov 2026)

Read this first when continuing in a new session.

## First job in the new session
1. Clone this bundle: `git clone iron-valley.bundle iron-valley` (the user attaches `iron-valley.bundle`).
2. Push it to GitHub: the user's account is **Creedtx**. Create the private repo `Creedtx/iron-valley` if it does
   not exist (`gh repo create Creedtx/iron-valley --private`), then `git remote set-url origin
   https://github.com/Creedtx/iron-valley.git && git push -u origin main`. Confirm the files are on GitHub.
3. `cd tools && npm install` (three 0.170.0, puppeteer-core, esbuild, eslint, @fontsource fonts).

## What the game is
Iron Valley: Factory Rising, a 1973 idle factory game in three.js for YouTube Playables. The user owns a master
Gameplay Bible (PDF, v1.1) and concept images for levels 1-4; the game must follow them, period-correct for 1973.
A Claude Doc "Iron Valley — Bible Addendum: Gus, Supplies and the Farewell" records every rule added since:
https://claude.ai/artifact/HRZiBVHUvRCSEDexVex18G

## Where things are
| Path | What |
|---|---|
| `game/` | The game as published to the preview artifact (index.html has no <head>: the artifact host wraps it) |
| `game/game.js` | All game code (~4,700 lines); `game/progression.js` levels, upgrades, roles |
| `blender/` | Blender Python that generates every model (`python3 build.py --only <module>`), `assets/*.py` |
| `models/*.glb` | Built models; `python3 tools/pack_viewer.py && cp viewer/models.js game/models.js` packs them for the artifact |
| `tools/package.mjs` | Lints, then builds `dist/playables/` (YouTube Playables) and `dist/phone/` (offline phone copy) |
| `dist/phone/` | Offline copy the user runs on the phone from Termux (`python -m http.server 8080`) |
| `tools/ws.sh <test.mjs> <url> ...` | Runs a headless-Chrome test with its own server on :8765 serving `game/` |
| `tools/layout_lint.mjs` | Checks every placed object against keep-clear zones (ramp, dock, bays, gates, lane, work spots) |

Preview artifact (the user plays this): https://claude.ai/artifact/Bgy9pgXzhBNAiqxpS8oXGe
Publish = copy game/{game.js,index.html,progression.js,models.js} to preview/ and publish preview/index.html with
those three files. The preview runs levels 1-2 on the "wide yard" (PREVIEW = true, MAX_LEVEL 2).

## Done in this build (0.17)
- Wide yard level 1 and level 2 laid out from the concept images; level 2: olive pipe machine on its pad, coil bay,
  loading lane, bay 2 with a widened truck gate, warehouse plot in the cleared back yard, Vera/Abel/Big Tom placed.
- Side-loading concrete dock with a concrete ramp (not stairs); the signing circle sits on the deck.
- Mains transformer on the board's pole outside the east fence; opens at level 3; generator becomes backup.
- Gus Mallory works on the crew from day two; retires at level 5 (party, gifts, $150/month pension).
- Timber and steel free on levels 1-2 only; machine helper role feeds the crate machine.
- Positional sound (machines, generator, lorries by distance from the owner); FPS meter in the preview.
- Ratings 10% (as found) to 100% (top of the game).

## User preferences learned the hard way
- Real-world logic and practice for everything (a ramp, not stairs; nothing placed where people walk).
- Run `tools/layout_lint.mjs` after any placement change.
- The user rejected the performance changes (tiled batching, lighter shadows); keep the look, find other gains.
- Show the map before building a new level; the user approves layouts first.

## Next, in the user's order of interest
1. Make levels 1-2 less boring. Proposed and awaiting the user's pick: a working day with a shift whistle and
   end-of-day card; order choices with time pressure (rush/bulk/regular, the driver leaves if late); something to
   buy every 1-2 minutes that appears on the map (roller conveyor to the lane, second pallet, lights, tea urn);
   keep the owner's hands busy (walk-in customers, helping speeds things); level 2 power choices you can see.
2. Level 3 on the wide yard (show the map first). Then levels 4-5, then replace the live game (game_live_0.15 is not
   in git; the live build is the older layout).
3. HUD style: the user never picked A/B/C on the HUD Styles page; the office panel still does not satisfy them.
