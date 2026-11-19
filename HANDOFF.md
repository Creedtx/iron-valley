# Handover: where Iron Valley stands (18 Nov 2026, build 0.20)

Read this first when continuing in a new session.

## First job in the new session
1. The code is on GitHub: `Creedtx/iron-valley` (public), branch `claude/iron-valley-github-setup-yn6f5j`
   (the default branch). Work and push there.
2. Every push of game changes must also rebuild `dist/phone` (`node tools/package.mjs`): the user plays the phone
   copy through Termux (`cd ~/iron-valley && git pull; cd dist/phone && python -m http.server 8080`).
3. `cd tools && npm install` (three 0.170.0, puppeteer-core, esbuild, eslint, @fontsource fonts).

## What the game is
Iron Valley: Factory Rising, a 1973 idle factory game in three.js for YouTube Playables. The user owns a master
Gameplay Bible, now a Claude Doc at v1.3 (https://claude.ai/artifact/N96Ctn22YPsAps1dRZiAPd) and concept images for levels 1-4; the game must follow them, period-correct for 1973.
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
those three files. The preview runs levels 1-3 on the "wide yard" (PREVIEW = true, MAX_LEVEL 3).

## Done in build 0.20b (fixes from phone play, whole-game audit)
- Gate customers: when the pallet or pipe rack is empty, the owner (and Gus) serve from the warehouse stock
  (`gateSrc`); the objective line points there. A customer still waiting at 17:00 pays for what was handed over.
- The end of the day waits for the car: gates shut and the day book opens only once the car is parked and no lorry is
  in a gateway; no lorry comes in after the knocking-off whistle; trips that cannot be back by 17:00 are greyed out
  (`tooLate`, one game second = 1.25 clock minutes, so a trip's away time in minutes is its `min`).
- `tools/audit.mjs <url> [days]`: plays days fast with the game's own `step()` (no rendering) at levels 1-3 and
  records people inside collision boxes, jumps, vehicles through people, stock that appears or vanishes, bad counts,
  stuck workers, machines running unmanned or at lunch, the day book with the car out. Run it after logic changes.
  Its fixes: the production watchdog no longer teleports operators (it pulled Walt off the lunch bench onto the saw);
  a lorry leaving without its load returns tools too and un-counts the shipped goods (`unloadBed`); Gus puts pipes
  back on the pipe rack; the crew queue in two files inside the gateway (not through the open gate leaves); the car
  stops for people ahead and waits short of the main gate's mouth; hires and gate customers do not step out while the
  car passes the gate; the timber trolley parks clear of the scrap bins (it sat inside one). Lorries give way on the road the same
  way (`roadYield`, shared with the car). The coil bay re-lays itself if its count and its coils ever disagree.
- Tests that set stock counts directly must call the matching sync (`syncCoilBay`, `syncWh`, `syncPallet`) or the
  workers reach for meshes that are not there. Headless tests run slowly: when one fails, check it in game time
  (`__iv.hold = true` then `__iv.step(.05)` in a loop, as audit.mjs and fixes020.mjs do) before calling it a bug.
- `tools/fixes020.mjs`: the warehouse gate sale and the car at 17:00.

## Done in build 0.20e (from phone play at level 3)
- No electrician can be hired (Bible 4.1), so the mechanic does the electrical work: he services the wiring and
  switchboard (the most worn item first, wiring included) and takes breaker, junction-box, alternator and power-cut
  jobs (`fixerOf`, `myTrade`). Before this nobody serviced the wiring and the trading licence could never pass.
- Knocking-off: the crew leave through the middle of the gateway two abreast (`gateQueue`); with more than six on the
  payroll the last ones used to walk through the front fence beside the posts.
- audit.mjs now catches walking through thin walls (fences, posts) and runs level 3 with a full crew;
  `tools/trails.mjs <url> <out>` draws everyone's routes at closing and in the morning.

## Done in build 0.20 (level 3, Bible v1.3)
- Level 3 in the North field (bought from Abel via Vera on level 2): tool press pad at `P.tpress`, coil in-feed,
  fitter spot, tool rack. Valley Garage (new buyer), Hartley Hardware and Kerr & Sons order tools.
- Deliveries come by flatbed into bay 2 and unload onto a goods-in stack (`P.goodsIn`, where the rust heap was);
  loaders carry timber to the old west stock room and steel to the coil bay. Free timber/steel ends at level 3.
- Bible fixes: no blunt-blade event on levels 1-2 (Bible 4.5: no machine issues there); licence no longer asks for
  operator safety gear (that upgrade was removed); the INSPECT checks are fire, guards, mechanic and parts.
- Tests: `tools/level3.mjs`, `tools/car_sweep.mjs` (car path vs every collision box), plan map `plans/level3_plan.png`.

## Done in build 0.19
- Small crew: level 1 has one loader and no machine helper; the owner hands planks to the saw (feed x1.25) and
  carries crates (2 by hand, 3+ needs a trolley from the trolley bay). Helper from level 2 when the mill is ready.
- Sales: the owner's car in the lane by the front fence; the car door opens a town map (8 buyers with drive times,
  book orders, accounts from 55% rep) and adverts (courier, poster, Friday show, sign). Gus runs the works while the
  owner is away (signs lorries, serves the gate, answers the phone). Car reverses into its spot like the lorries.
- Daily target chip, order terms (regular / rush x1.3 pay / bulk x2), tea urn, trade counter, signwriting on the car,
  rain and the rival yard as small events on levels 1-2. Gates shut at night; the crew waits for the gate to stop.
- Fixes: carried goods in the arms (not on the head); trolleys from the bay; audio stops in the background;
  crowd push no longer clamps workers through walls. Tests: owner_work, extras, sales_trip, gate_traffic.

## Done in build 0.18
- The working day: HUD clock (Mon-Fri from Monday 2 April 1973), 07:00-17:00 = 480 s of play. Shift whistle at 07:00;
  lunch whistle at 12:00 (operators, loaders, helpers and Gus sit on the bench by the workshop till 12:30; fitters
  stay on call; the owner can run the machines); knocking-off whistle at 17:00 opens the day book card (made,
  shipped, gate trade, reputation, takings, best day so far, a Gus line). No whistles or card during the tutorial.
- Walk-in customers at the main gate (`P.trade`, beside the west gate post): crates on level 1, pipes too from
  level 2. The owner fetches and hands over (even with loaders hired); 25% over the order rate, tip within 35 s,
  rep +1; unserved for 90 s they walk off (rep -1), part-served they pay for what they got.
- Tests: `tools/workday.mjs` (18 checks, all pass). `tools/ws.sh` now runs from any checkout. `day1.mjs` and
  `soak.mjs` were already stale before 0.18 (headless timing; the soak never closes the letter card).
- The user has the GitHub repo now: branch `claude/iron-valley-github-setup-yn6f5j` (no `main` yet).

## Done in build 0.17
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
1. Make levels 1-2 less boring. Done in 0.18: the working day and walk-in customers (the user's pick). Still on the
   list: order choices with time pressure (rush/bulk/regular, the driver leaves if late); something to buy every
   1-2 minutes that appears on the map (roller conveyor to the lane, second pallet, lights, tea urn); helping
   speeds things; level 2 power choices you can see.
2. Level 3 on the wide yard (show the map first). Then levels 4-5, then replace the live game (game_live_0.15 is not
   in git; the live build is the older layout).
3. HUD style: the user never picked A/B/C on the HUD Styles page; the office panel still does not satisfy them.
