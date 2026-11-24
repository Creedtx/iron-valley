# Handover: where Iron Valley stands (24 Nov 2026, build 0.23, Bible v2.0, Level 5 done)

Read this first when continuing in a new session.

## First job in the new session
1. The code is on GitHub: `Creedtx/iron-valley` (public), branch `claude/iron-valley-github-setup-yn6f5j`
   (the default branch). Work and push there.
2. Every push of game changes must also rebuild `dist/phone` (`node tools/package.mjs`): the user plays the phone
   copy through Termux (`cd ~/iron-valley && git pull; cd dist/phone && python -m http.server 8080`).
3. `cd tools && npm install` (three 0.170.0, puppeteer-core, esbuild, eslint, @fontsource fonts).

## What the game is
Iron Valley: Factory Rising, a 1973 idle factory game in three.js for YouTube Playables. The user owns a master
Gameplay Bible, now a Claude Doc at v1.4 (https://claude.ai/artifact/N96Ctn22YPsAps1dRZiAPd) and concept images for levels 1-4; the game must follow them, period-correct for 1973.
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
those three files. The preview runs levels 1-4 on the "wide yard" (PREVIEW = true, MAX_LEVEL 4).

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

## Bible v1.5 and v1.6 (23 Nov 2026): read before building
- v1.5 (the user's PDF, 71 pages): 10-minute day, calendar 1973-1981, Friday pay and weekly accounts, 16 levels in
  four Acts, Defence Works from Level 13, weather (17 kinds), Playables compliance layer, decision log.
- v1.6 (Claude Doc, https://claude.ai/artifact/D95UzZSKrLDS8CVwttkM19) adds: gap study of v1.5 vs build 0.21b,
  real physics numbers (2 pipes by hand, forklift ramp 7.6 m at 1 in 8 and 2.2 m/s, 1 power unit = 5 kW),
  every interaction, 24 logic rules (L-01..L-24) for the audit, valley lore, and Phase 0 in 12 steps.
- Section 8 of v1.6 holds 8 decisions (V-01..V-08) awaiting the user's Approved before Phase 0 starts.
  Phase 0 step 1: one GameClock (600 s day, real dates, Fridays, level start dates).

## Bible v2.0 (24 Nov 2026): the only Bible now
The user's PDF `uploads/bible_v2.0.pdf` (106 pages, "Master Gameplay Bible v2.0") replaces v1.4, v1.5 and v1.6. Follow it
alone; keep what is built; add what v2.0 asks of Levels 1-4 (Act I). Levels 5+ wait for the user's go-ahead (show a map first).

## Act II build plan (Levels 5-8), maps APPROVED by the user 24 Nov 2026 (plans/level5..8_plan.png)
Build one level at a time to Bible v2.0 section 8, each tested (calendar, v2_act1, audit, a new levelN test) before the next.
Coordinates (x east, z south; Mill Road z 14.4-17.6, north lane 15.3 = eastbound, south lane 17.1 = westbound):
- L5: office block across Mill Road opposite the main gate, x -4..5, z 18.8..25.4, door facing the camera (south), a path
  round its east end from the zebra crossing (x 4.2..5.8 over the road, Belisha beacons; NAVOUT keeps walkers to it).
  Ada's corner plot x 13.5..28, fence moved south to z ~26 for the lorry. Dock 2 = the dock-1 model (raised side dock with
  ramp) at Dk2 [24.0, 22.0]: deck x 23..25 z 19.5..24.5, ramp x 18.5..23 z 20..21.6 (groundY must take a list of docks);
  lorry 2 parks at ~[26.25, 22.05] cab north, arriving westbound on the south lane and reversing south through the plot's
  road gate (x 24.6..27.6). Mill 2 pad ~[16.0, 21.0]; pipe rack 2 ~[17.6, 23.2] by the ramp foot; coil rack 2 ~[14.2, 23];
  dock-2 orders are pipe orders loaded by hand/trolley from rack 2 (Wilf Dunn, dock crew chief); coils for mill 2 come
  across the zebra from the coil bay. No bank building (Eldon is on the town map/Finance tab).
  v2.0 money at L5: Friday 16:30 packets paid from cash at the hatch; the weekly accounts card after the whistle (power
  30% lower on mains, diesel burnt, Gus's pension $35, loan instalment); one week's grace then -2 rep a week; never closes
  the works. Loans up to 30% of the goal, 110% over the next 5 Fridays, one at a time (Eldon, Thursday). Replace the old
  6-minute BILL_EVERY bills. Weather: heavy snow Monday (crew shovel; owner can grab a shovel), frost mornings, snow at
  Gus's goodbye. Gus asks ~40 s in Monday; party Friday 17:00. Charter: $120K, mill 2 running, dock 2 + lorry 2 used,
  two orders delivered the same day x5, first weekly accounts paid, farewell held, rep 68%.
- L6: June's clerk's window (office block), mobile crane through the main gate (stands x 1..5, z 5.6..9.4) swaps the
  crate machine for tier 2; grandad's machine under a tarpaulin at x 15.8..17.6, z -11.4..-9.8; canteen x -12..-6,
  z 19.2..24.4; lightning conductor on the workshop chimney; auto changeover; trophy cabinet; service tags; inspector.
- L7: order board on the office block; clock tower on it; second supervisor ring; siding survey pegs along z -21.
- L8: siding along z -21.3 from the west (x -34) to a buffer at x 6; raw-store bays x -11..4, z -18.4..-14.6; furnace
  house x -25..-15.5, z -17.5..-8.5 (south door into the forklift yard); 11 kV plinth x -29.5..-26.3, z -15..-11; beam
  store build zone spots A [-10,-11.4] B [-22.9,0.5] C [10.6,-18.9]; gates in the back fence (x -14..-11) and the forklift
  yard's north fence; the old dairy plot x 24.6..38, z -5.5..12 (Krane bids, countdown); bus shelter x .2..2.8, z 12.7..13.9.

## Done in build 0.23 (Level 5: Regional Manufacturer, Bible v2.0, plans/level5_plan.png)
- Opens Monday 14 January 1974 (5 days). Charter (`CHARTER5`): $120K earned, mill 2 running, dock 2 used, two orders out
  the same day x5, the first weekly accounts paid, Gus's farewell held, reputation 68%.
- `buildLevel5()`: Ada's corner plot `CORNER` re-fenced with a wicket and a lorry gate; dock 2 (`DK2`, `LDOCK.more`, colliders
  `dock2*`), the white lorry (`truckB`, `ARRIVE2`/`LEAVE2`) loaded by hand from rack 2 (loader task `pipes2`); the office
  block across Mill Road (`buildOfficeBlock`) and the zebra (`buildZebra`, NAVOUT keeps walkers on it; the north beacon
  stands west of the works gate). The pine on the corner (`M.cornerTree`) is felled. `fenceRun` cuts short stubs to size.
- Money: Friday 16:30 pay packets now come out of cash; the weekly accounts card after the whistle (`weekAccounts`,
  `closeWeek`, `payAccounts`, `accountsHtml`): wages, power (30% less on the mains), diesel (`meterDiesel`), Gus's $35
  pension, the loan instalment; one week's grace, then -2 rep a week (never closes the works). Loans (`takeLoan`): up to
  30% of the goal, 110% back over five Fridays, one at a time.
- Gus: asked on Monday, party on Friday at 17:00 (`S.gus.partyDue`); the clock waits at 16:59 while the party runs; the
  farewell card always resolves (put away without a gift, it comes back; the brass clock is free).
- Snow (WX `snow`, `heavysnow`, `frost`): flakes, lying snow on upward faces (`snowPatch`, `SNOW_U`), slower walking and
  vehicles, icy mornings. Heavy snow on Monday morning.
- Tests: `tools/level5.mjs` (19 checks), `tools/layout_lint.mjs <url> l5` (dock 2, lorry bay and gate, zebra, mill 2 spots).

## Done in build 0.22 (Bible v2.0, Act I re-fit)
- One clock (v2.0 3): a working day is 600 s (one game minute a second), lunch 12:00-12:30 (30 s). The calendar counts
  working days from Monday 2 April 1973 (`CAL0`, `wdOf`, `calDay`, `dateOf`, `weekday`, `isFriday`); `S.cal.off` maps play
  days to calendar days. Levels open on their dates (`LV_START`: L2 Wed 18 Apr, L3 Tue 5 Jun, L4 Tue 7 Aug 1973, L5 Mon 14
  Jan 1974). Deadlines read as weekday and clock ("due Wed 12:00", `dueAt`, `hrsOf`). Saves from the 8-minute day migrate
  (v8: same day number, the hour stretched by 1.25, time stamps moved with it).
- Level change: with the charter done, "Open level N" blows the whistle early (`S.nextLevel`, `knockOff`), the day book
  offers "turn the calendar", then the skip card tears the office calendar's pages to the new date (`skipHtml`,
  `SKIP_BUILT`) and the Courier prints the finished level's v2.0 headline (`HEADLINES`). Gates open at 07:00 on day one.
- Friday pay day (3.3): 16:30, the wages hatch on the workshop front (`PAY_AT`, `buildHatch`), the crew queue three at a
  time (`PAY_Q`, `payStep`), the owner in the ring hands each packet (envelope flies, cap tipped); grandad's estate pays on
  Levels 1-4 (`estatePays`); anyone unpaid gets it at the gate (`payAtGate`). Friday's day book closes the week (`weekHtml`).
- Charters (7): L1 7 lines, L2 8, L3 9, L4 8, each with its own `id` (ticks keyed `level:id`). Goals 4K/10K/24K/55K;
  upgrades of Levels 3-4 cost 2/4/8% of the goal; plots 10-20% of the goal; land only from Level 3 (North field lv 3).
- Staffing matrix (12.2) in `progression.js` `ROLE_CAPS` (+ `workerCap`). One helper per machine (`helperOf`: crate
  machine, pipe mill, tool press); loaders leave coil runs to a coil helper (`coilHelper`); auto-feed lets the crate helper
  also feed the mill. Named crew (2.3, `CREW_CAST`): Alf Pryce, Wilf Dunn, Bert Coombes, Danny Moss, Stan Kowalczyk,
  Reggie Platt; others from the v2.0 pools (`crewName`, `st.sur`). Old saves keep their names.
- Weather (17, `WX`, `wxPlan`, `updateWeather`, `applyWeather`): clear, overcast, drizzle, shower, fog, heat wave,
  thunderstorm; set pieces per level (L1 Tue shower, L2 Thu shower + rainbow, L3 Wed fog, L4 Thu heat wave + ice-cream van,
  Fri storm), seasonal weather after. Effects: shower crew -10% and no walk-ins; drizzle stops walk-ins unless the gate
  awning; fog lorries +15 min; heat Old Faithful -10%; storm power cuts x3, lightning and thunder by distance. Forecast at
  07:00 (wireless toast), the office barometer (tap = tomorrow), "Weather tomorrow" in the day book. `startRain()` and
  `__iv.setWx(k)` force weather in tests.
- Bolt (2.1): arrives at Level 2 Thursday lunch, follows the owner, sits, naps in the pocket by Old Faithful (`BOLT_NAP`),
  shade in a heat wave, barks at lorries, shakes after rain; vehicles stop for him and he sidesteps any moving vehicle
  (`boltDodge`, clear side first).
- Yard purchases (18.4): gate awning (L2 $200), yard lamps (L3 $480), counter bell (L3 $250, patience 160 s), shop window
  (L4 $500, walk-ins every 45-90 s), loading-lane canopy (L4 $1,100, loaders not slowed by rain). Ice-cream van in the
  heat wave ($10, crew +5% for the day).
- Chalkboard (18.6, D-04) from Level 3 replaces the daily target: three jobs a day on the workshop wall (`CHALK`), a bonus
  each, +2 rep for all three. Wrong timber (L3 Thursday + rare): send back a day or run at 80%. Blunt blade on L3 Thursday.
- Returns: "While you were away" envelope from L2 (50% of normal takings x staffed share, 2 h cap, `S.seenAt`); login
  calendar from L3 (7 real days). Each level names its strategic choice (`CHOICE`). Letter: v2.0 words, Walter Ashford.
  Signs: "Iron Valley Workshop · Est. 1921" (`signName`).
- Works Board HUD (20, D-01): olive painted plates with cream pinstripe and brass rivets, Roboto Slab / Alfa Slab One /
  Roboto Mono / Special Elite (bundled in package.mjs), rolling drum cash counter (`drums`), reputation dial (`repDial`),
  date on the clock, cream objective strip with a red-oxide arrow, the order sign on two chains, the clipboard office with
  typewriter text and DONE stamps. Playables: no page-visibility listeners and no FPS meter in that build.
- Tests: `tools/calendar.mjs` (calendar, pay day, level dates, migration) and `tools/v2_act1.mjs` (42 Act I checks);
  `tools/v2_shots.mjs` and `tools/hud_shot.mjs` take pictures; `tools/spot_shot.mjs` and `tools/col_dump.mjs` help place
  things; layout_lint checks the new purchases, the pay queue, the ice-cream ring and Bolt's spots.

## Done in build 0.21b (from phone play: a stand-off at the gate, level 2 marked out in stages)
- The car home from a trip and a loaded lorry leaving no longer stand nose to nose: `roadYield` follows another
  vehicle with a small pad only when that vehicle is itself waiting for the gate held by this one (`still`), so the
  holder of the gate always gets through and the other follows.
- Level 2 floor markings come with what they mark (`syncL2Marks`): the pipe machine's outline when it is paid for;
  the loading lane and both bays are a purchase, the new pad "Mark out the loading lane and bays" ($120, by the
  dock, once the pipe machine is built, `applyRestore('lanes')`); the warehouse plot and Big Tom appear only when
  the warehouse can be built, and go once it is paid for (Tom no longer stands in the yard from the start).
- Forklift: it never parks across the loaders' way on the deck. With nothing to load into it waits at the foot of
  the ramp (`P.forkHold`, states toHold/hold); a route does not start by nosing forward to a node it is already at;
  a person who has held it up for 3 s steps 1.8 m out of its line (`forkGiveWay`); people already inside a moving
  vehicle's margin may only step out of it (`vehInWay`); standing, it is walked round by its own outline.
- `AUDIT_ONLY4=1 node tools/audit.mjs <url> <days>` passes quickly through levels 1-3 and plays level 4.

## Done in build 0.21 (level 4: Growing Enterprise, plans/level4_plan.png)
- The old scrapyard (x -26..-14, z -4..13, bought from Rusty in the level 3 charter) is the forklift yard: gravel, Rusty's
  parts stall by the road ($30 a part), the forklift's bay and gas cage, the second crate machine (pad at P.saw2 area).
  At level 4 the west fence beside the stock room (westGap, scrapGate, westFenceA) and the crate bin at the workshop
  corner (M.northBin) go.
- Forklift (`fork`): timber from the stock room's west face (P.forkStore) to the second machine's in-feed from its north
  side (P.forkFeed2, clear of the operator); crates from pallet 2 along the marked lane `LANE4` (painted edge lines:
  along the workshop front at z -0.45, north of the coil bay at z -4.45, down x 13.4) up the forklift ramp
  (`FORK_RAMP`, LDOCK.fork, groundY) onto the deck's north end (P.forkDock) and into the lorry; it backs down; a branch
  serves the warehouse (P.forkWh). `laneRoute` follows the lane between the yards. Nobody walks up the ramp ('forkRamp').
- Right of way, everywhere: vehicles stop for people ahead (`forkYield`, `roadYield` incl. the yard and reversing); people
  wait for a moving vehicle and walk round / step aside from a stopped one (`vehInWay`, `stepAside`); the forklift does
  not turn on the spot with anybody within 1.75 m (`forkSwingClear`). `NAVOUT`: no walking routes across the lorries'
  turning ground south of bays 1-2; goods-in is reached through the canopy. Paths avoid parked and arriving lorries
  (`lorryBlocked`, `repathAround`). No route: the walker waits (`path.cut`), never crosses a wall; the watchdog squeezes
  past people 30 cm at a time.
- Crew and walk-ins leave at the gate mouth (P.frontOut z 13.9), not on the road. Supervisor never sends anyone to work at
  lunch or knocking-off. Road-frontage notice inside the fence (PLOTS.road ring 23.35, 11.0).
- Tests: `tools/level4.mjs` (21 checks, game time), audit.mjs plays levels 1-4 (3 days each: clean), layout_lint `l4`.

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
