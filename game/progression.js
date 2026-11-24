// Iron Valley progression: everything that grows with the company level, as data.
// The strategy doc's ladder (16 levels in four acts) lives here so every system reads one table:
// who you may hire, how far workers can train, how many steps each upgrade and piece of equipment has,
// how big and well paid the orders are, and what the washrooms must cope with.
// Levels 1 to 5 are playable; the rows for 6 to 16 are the plan the next builds fill in.

// ---------------------------------------------------------------- the ladder (strategy doc, "Levels")
export const LEVEL_TABLE = [
  null,
  // Bible v2.0 6.1 and 6.2: dates, target minutes and cash goals (VERIFY in the simulator, within 20%)
  { n:1,  act:'I',   title:'Inherited Workshop',      system:'Assign a worker; the first order',        product:'Wooden crates',            goal:4000,      minutes:30, days:3 },
  { n:2,  act:'I',   title:'Reopened Factory',        system:'Loaders, the lorry, the power limit',     product:'Steel pipes',              goal:10000,     minutes:30, days:3 },
  { n:3,  act:'I',   title:'Local Manufacturer',      system:'Issues and repairs; supplies; mains',     product:'Basic tools',              goal:24000,     minutes:40, days:4 },
  { n:4,  act:'I',   title:'Growing Enterprise',      system:'Supervisor zone; forklift',               product:'Second crate line',        goal:55000,     minutes:40, days:4 },
  { n:5,  act:'II',  title:'Regional Manufacturer',   system:'Pay day, weekly accounts, loans',         product:'Second pipe mill, dock 2', goal:120000,    minutes:50, days:5 },
  { n:6,  act:'II',  title:'Industrial Company',      system:'The clerk; tier 2; machine service',      product:'Tier 2 refits',            goal:250000,    minutes:40, days:4 },
  { n:7,  act:'II',  title:'Major Manufacturer',      system:'The order board',                         product:'Second supervisor zone',   goal:600000,    minutes:50, days:5 },
  { n:8,  act:'II',  title:'Steel Works',             system:'Rail supplies; storage limits; build zones', product:'Steel beams',           goal:1.5e6,     minutes:50, days:5 },
  { n:9,  act:'III', title:'Assembly Plant',          system:'Two-step recipes; conveyors',             product:'Valves',                   goal:3.5e6,     minutes:50, days:5 },
  { n:10, act:'III', title:'Night Shift',             system:'Shifts and the night shift',              product:'Tier 3 refits',            goal:8e6,       minutes:55, days:5 },
  { n:11, act:'III', title:'Quality Lab',             system:'Quality grades; premium orders',          product:'Precision parts',          goal:18e6,      minutes:50, days:5 },
  { n:12, act:'III', title:'Export Depot',            system:'Export by train; dispatch',               product:'Export containers',        goal:45e6,      minutes:50, days:5 },
  { n:13, act:'IV',  title:'Second Plant: Heavy Works', system:'A second site under a manager; defence clearance', product:'Engines, Abel bulldozer, Dunmore lorry', goal:110e6, minutes:60, days:6 },
  { n:14, act:'IV',  title:'Automated Line',          system:'Robots replace operators on one line',    product:'Armour plate, Tarn carrier', goal:260e6,   minutes:60, days:6 },
  { n:15, act:'IV',  title:'Industrial Group',        system:'Research office and paths',               product:'Big Tom crane, Ironhill tank', goal:600e6, minutes:60, days:6 },
  { n:16, act:'IV',  title:'Iron Valley Corporation', system:'Aircraft works; endless contracts',       product:'Wend, Mallory, Ashcombe, Founder', goal:null, minutes:null, days:null },
];
export const LAST_LEVEL = 16;
export const levelRow = n => LEVEL_TABLE[Math.max(1, Math.min(LAST_LEVEL, n))];

// ---------------------------------------------------------------- crew: hiring caps per level (index = level)
// one operator per machine; more loaders as the site grows; trades double up as plant gets bigger.
// Level Bible: the owner starts alone; mechanics (and electricians, for power cuts) join at level 3 with
// issues and repairs, supervisors at level 4 with the supervisor zone.
// Bible v2.0 12.2, the staffing matrix: the most posts of each role at each level (index = level). The total is the
// worker cap. Gus, robot cells and the contracted pilot never count. Electricians and cleaners are not in the game (12.1).
export const ROLE_CAPS = {
  operator:    [0, 1, 2, 3, 4, 5, 5, 6, 8, 9, 14, 16, 17, 25, 26, 30, 36],
  loader:      [0, 1, 2, 2, 3, 4, 4, 5, 5, 6, 8, 8, 9, 12, 12, 14, 16],
  helper:      [0, 0, 1, 2, 3, 4, 4, 5, 5, 6, 8, 8, 8, 10, 10, 10, 10],
  mechanic:    [0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 8, 10],
  supervisor:  [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6],
  forklift:    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 8, 10],
  clerk:       [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3],
  foreman:     [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 3],
  dispatcher:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 3],
  manager:     [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3],
  guard:       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 4],
  driver:      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3],
  technician:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 8],
  engineer:    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6],
  electrician: Array(17).fill(0),
  cleaner:     Array(17).fill(0),
};
export const workerCap = level => Object.values(ROLE_CAPS).reduce((a, r) => a + (r[Math.max(1, Math.min(16, level))] || 0), 0);
export const roleCap = (role, level) => (ROLE_CAPS[role] || [])[Math.max(1, Math.min(LAST_LEVEL, level))] ?? 1;
// first hire is free for the starting crew; after that each hire costs more, and wages rise with the level
export const hirePrice = (role, have, level) => {
  const base = { operator:220, loader:150, helper:120, mechanic:180, supervisor:240, forklift:160, clerk:260, foreman:400, dispatcher:350, manager:900, guard:200, driver:300, engineer:700, electrician:160, cleaner:110 }[role] ?? 200;   // v2.0 12.1
  if (have === 0 && (role === 'operator' || role === 'loader')) return 0;
  return Math.round(base * Math.pow(1.35, Math.max(0, have - 1)) * Math.pow(1.25, level - 1) / 10) * 10;
};

// ---------------------------------------------------------------- crew: worker levels
// how far a worker can train is set by the company: level 1 caps at 5, every level adds 2, up to 25
export const workerLvCap = level => Math.min(25, 3 + 2 * level);
const XP0 = [0, 60, 150, 300, 520], TC0 = [0, 60, 140, 300, 600];
export const xpNext = lv => lv < XP0.length ? XP0[lv] : Math.round(XP0[4] * Math.pow(1.45, lv - 4));
export const trainCost = lv => lv < TC0.length ? TC0[lv] : Math.round(TC0[4] * Math.pow(1.6, lv - 4) / 10) * 10;
// speed from training: +15% a level up to level 5, then +7% a level (so late workers do not run away)
export const lvBonus = lv => .15 * Math.min(lv - 1, 4) + .07 * Math.max(0, lv - 5);

// ---------------------------------------------------------------- upgrades and equipment
// Every upgrade is one data row. 'tiers' says how many steps it has at each level: [level, steps added].
// Prices: the hand-set first steps, then each further step costs 'growth' times the one before.
// Effect kinds (strategy doc): speed, batch, capacity, breakdown, repair, carry, zone, power, fuel, focus, facility.
export const UPGRADES = [
  // machines
  { id:'saw',   lv:1, group:'Machines',  kind:'speed',     name:'Crate machine speed', per:'makes crates 20% faster',                     cost:[100, 250, 500], growth:1.9, icon:'saw',    tiers:[[1, 3], [3, 2], [6, 2], [10, 2], [13, 2], [16, 99]] },
  { id:'pipe',  lv:2, group:'Machines',  kind:'speed',     name:'Pipe mill speed',   per:'forms pipes 20% faster',              cost:[250, 550, 1000], growth:1.9, icon:'gear',  tiers:[[2, 3], [5, 2], [6, 2], [9, 2], [13, 2]] },
  { id:'batch', lv:2, group:'Machines',  kind:'batch',     name:'Crate batch',       per:'one plank in four gives a second crate', cost:[300, 600, 1100], growth:1.8, icon:'boxes', tiers:[[2, 3], [6, 1], [12, 1]] },
  { id:'press', lv:3, group:'Machines',  kind:'speed',     name:'Tool press speed',  per:'stamps tools 20% faster',             cost:[400, 850, 1500], growth:1.9, icon:'gear',  tiers:[[3, 3], [6, 2], [9, 2], [13, 2]] },
  { id:'autofeed',lv:4, group:'Machines', kind:'speed',    name:'Auto-feed',         per:'one helper keeps two neighbouring machines fed (crate machine and pipe mill), and the machines run 5% faster', cost:[400, 800, 1600], growth:1.9, icon:'gear', tiers:[[4, 3], [8, 2], [12, 2]] },
  { id:'sturdy',lv:3, group:'Machines',  kind:'breakdown', name:'Sturdier parts',    per:'jams and worn parts 15%, 30%, then 50% rarer', cost:[350, 750, 1400], growth:1.9, icon:'wrench', tiers:[[3, 3], [7, 2], [11, 2]] },
  // power
  { id:'gen',   lv:1, group:'Power',     kind:'breakdown', name:'Generator tune-up', per:'the old generator stalls less: every 60 s, 90 s, then never',        cost:[80, 200, 400], growth:1.8, icon:'gear',    tiers:[[1, 3], [3, 2], [8, 2]] },
  { id:'surge', lv:1, group:'Power',     kind:'breakdown', name:'Surge protection',  per:'power cuts 20%, 35%, then 50% rarer',        cost:[90, 220, 450], growth:1.8, icon:'bolt',    tiers:[[1, 3], [3, 1], [6, 2], [11, 1]] },
  { id:'fuel',  lv:1, group:'Power',     kind:'fuel',      name:'Fuel saver',        per:'25% less diesel',                     cost:[70, 180, 360], growth:1.8, icon:'drop',    tiers:[[1, 3], [5, 2], [10, 2], [16, 99]] },
  { id:'gen3',  lv:4, group:'Power',     kind:'power',     name:'Generator Mk III',  per:'6 kW more: four machines at full speed', cost:[400, 800, 1600], growth:1.8, icon:'bolt', tiers:[[4, 3], [7, 2]], need:'gen2' },
  { id:'gen2',  lv:2, group:'Power',     kind:'power',     name:'Generator Mk II',   per:'step I: 16 kW instead of 10; later steps +2 kW', cost:[650, 900, 1300], growth:1.7, icon:'bolt', tiers:[[2, 3], [4, 2], [7, 2]] },
  // crew abilities (belong to the role, so hiring never loses them)
  { id:'hands', lv:1, group:'Crew',      kind:'speed',     name:'Quick hands',       per:'all staff 10% faster',                cost:[120, 300, 600], growth:1.9, icon:'hand',   tiers:[[1, 3], [4, 2], [7, 2], [10, 2], [13, 2], [16, 99]] },
  { id:'tools', lv:1, group:'Crew',      kind:'repair',    name:'Better toolkits',   per:'repairs and servicing 30% faster',    cost:[80, 200, 420], growth:1.9, icon:'wrench',  tiers:[[1, 3], [3, 2], [7, 2], [12, 2]] },
  { id:'back',  lv:2, group:'Crew',      kind:'carry',     name:'Strong back',       per:'loaders carry one more',              cost:[220, 480, 900], growth:1.8, icon:'hand',   tiers:[[2, 3], [5, 2], [8, 2]] },
  // equipment: kit each trade works with
  { id:'ppe',   lv:1, group:'Equipment', kind:'focus',     name:'Operator safety gear', per:'operators lose focus 15% slower',   cost:[90, 220], growth:1.9, icon:'saw',          tiers:[[1, 2], [3, 1], [6, 1], [9, 1], [12, 1]] },
  { id:'meter', lv:1, group:'Equipment', kind:'repair',    name:'Electrician test meters', per:'electrical faults found and fixed 25% faster', cost:[110, 260], growth:1.9, icon:'bolt', tiers:[[1, 2], [4, 1], [8, 1], [11, 1]] },
  { id:'mop',   lv:1, group:'Equipment', kind:'facility',  name:'Cleaning kit',      per:'cleaning 30% faster',                 cost:[60, 160], growth:1.9, icon:'broom',        tiers:[[1, 2], [5, 1], [9, 1]] },
  { id:'truck2',lv:2, group:'Equipment', kind:'speed',     name:'Loader hand trucks', per:'loaders walk 10% faster loaded',     cost:[180, 420], growth:1.9, icon:'truck',       tiers:[[2, 2], [5, 1], [10, 1]] },
  { id:'radio', lv:4, group:'Crew',      kind:'zone',      name:'Wider zone',        per:'the supervisor\'s ring 7 m, 8 m, then 10 m across (from 6 m)', cost:[400, 800, 1600], growth:1.9, icon:'people', tiers:[[4, 3], [7, 1], [13, 1]] },
  // site and facilities
  { id:'stack', lv:1, group:'Site',      kind:'capacity',  name:'Bigger pallet',     per:'pallet holds 6 more crates',          cost:[60, 150, 350], growth:1.8, icon:'boxes',  tiers:[[1, 3], [4, 2], [8, 2], [16, 99]] },
  { id:'supply',lv:1, group:'Site',      kind:'capacity',  name:'Bigger trolley',    per:'trolley carries 4 more planks',       cost:[70, 180, 380], growth:1.8, icon:'truck',  tiers:[[1, 3], [5, 2], [9, 2]] },
  { id:'prack', lv:2, group:'Site',      kind:'capacity',  name:'Bigger pipe rack',  per:'pipe rack holds 4 more pipes',        cost:[150, 350, 700], growth:1.8, icon:'truck', tiers:[[2, 3], [4, 2], [9, 2]] },
  { id:'whcap', lv:2, group:'Site',      kind:'capacity',  name:'Warehouse racking', per:'warehouse holds 12 more crates, 6 more pipes and (from level 3) 4 more tools', cost:[250, 550, 1000], growth:1.8, icon:'boxes', tiers:[[2, 3], [5, 2], [9, 2]], need:'warehouse' },
  { id:'fork',  lv:4, group:'Site',      kind:'speed',     name:'Faster forklift',   per:'the forklift 15%, 30%, then 50% faster', cost:[400, 800, 1600], growth:1.9, icon:'truck', tiers:[[4, 3], [9, 2]] },
  // level 5 (Level Bible): steps $1,000, $2,000, $4,000
  { id:'tbatch', lv:5, group:'Machines', kind:'batch',     name:'Tool batch',        per:'a bonus tool every 5th, then 4th, then 3rd stamping', cost:[1000, 2000, 4000], growth:1.9, icon:'boxes', tiers:[[5, 3], [10, 1]] },
  { id:'tariff', lv:5, group:'Power',    kind:'bill',      name:'Bulk diesel contract', per:'the power part of each bill 5% lower', cost:[1000, 2000, 4000], growth:1.9, icon:'bolt', tiers:[[5, 3], [10, 2]] },
  { id:'multi',  lv:5, group:'Crew',     kind:'speed',     name:'Multi-skilled crew', per:'loaders and the forklift pick up and set down 25% faster', cost:[1000, 2000, 4000], growth:1.9, icon:'people', tiers:[[5, 3], [9, 1]] },
  { id:'dock',   lv:5, group:'Site',     kind:'speed',     name:'Dock crew',         per:'trucks turn round 15%, 30%, then 50% faster', cost:[1000, 2000, 4000], growth:1.9, icon:'truck', tiers:[[5, 3], [12, 1]] },
  // level 6 (Bible v2.0 18.3): the service schedule and the clerk's ledger alerts (tier 2 refits are in the Machines tab,
  // the automatic changeover is a purchase at the generator)
  { id:'schedule', lv:6, group:'Crew',  kind:'repair',    name:'Service schedule',  per:'the mechanic books each due service himself', cost:[3000], growth:1.9, icon:'wrench', tiers:[[6, 1]] },
  { id:'ledger',   lv:6, group:'Site',  kind:'bill',      name:'Clerk\'s ledger alerts', per:'June warns on Thursday if Friday\'s packets and accounts will be more than the cash', cost:[2000], growth:1.9, icon:'clip', tiers:[[6, 1]] },
  // level 7 (Bible v2.0 18.3): the order board's fourth card, the sales representative, loading lamps, zone reach
  { id:'board4',  lv:7, group:'Site',  kind:'capacity',  name:'Bigger order board', per:'a fourth card on the order board', cost:[6000], growth:1.9, icon:'clip', tiers:[[7, 1]] },
  { id:'salesrep',lv:7, group:'Crew',  kind:'sales',     name:'Sales representative', per:'makes visits while you work: a fresh contact on the board every eight minutes', cost:[8000], growth:1.9, icon:'people', tiers:[[7, 1]] },
  { id:'docklamps',lv:7, group:'Site', kind:'speed',     name:'Loading lamps', per:'lamps on both docks: the lorries back in on time through the fog', cost:[4000], growth:1.9, icon:'bulb', tiers:[[7, 1]] },
  { id:'reach',   lv:7, group:'Crew',  kind:'zone',      name:'Zone reach', per:'each supervisor\'s ring 1.5 m wider', cost:[5000], growth:1.9, icon:'people', tiers:[[7, 1]] },
  // level 8 (Bible v2.0 18.3): furnace heat, a bigger raw store, the siding extension (the fixed-price supply is Dolores's contract)
  { id:'heat',    lv:8, group:'Machines', kind:'speed', name:'Furnace heat', per:'beams 20% faster', cost:[20000, 40000], growth:1.9, icon:'gear', tiers:[[8, 2]] },
  { id:'rawstore',lv:8, group:'Site', kind:'capacity', name:'Bigger raw store', per:'each bay holds 20 t more', cost:[15000, 30000], growth:1.9, icon:'boxes', tiers:[[8, 2]] },
  { id:'sidingx', lv:8, group:'Site', kind:'capacity', name:'Siding extension', per:'a fifth wagon on every train', cost:[25000], growth:1.9, icon:'truck', tiers:[[8, 1]] },
  { id:'parts', lv:3, group:'Site',      kind:'capacity',  name:'Spare-parts shelf', per:'the parts shelf holds 3 more',        cost:[200, 450, 900], growth:1.8, icon:'boxes', tiers:[[3, 3], [6, 2], [10, 2]], need:'field' },
  { id:'wc',    lv:1, group:'Facilities',kind:'facility',  name:'Washroom stalls',   per:'one more toilet stall',               cost:[180, 420], growth:1.8, icon:'people',      tiers:[[1, 2], [3, 2], [6, 2], [9, 2], [13, 2]] },
  { id:'cooler',lv:1, group:'Facilities',kind:'facility',  name:'Bigger water bottles', per:'10 more cups a bottle',            cost:[50, 130], growth:1.8, icon:'drop',         tiers:[[1, 2], [4, 1], [8, 1], [11, 1]] },
  { id:'boots', lv:1, group:'Owner',     kind:'speed',     name:'Good boots',        per:'you walk 12% faster',                 cost:[50, 150, 300], growth:1.8, icon:'boot',   tiers:[[1, 3], [4, 1], [8, 1], [14, 1]] },
  // planned: rows from the strategy doc's "Upgrades by level" table for levels 3 to 16. Each opens with the
  // machine or building it belongs to; the builds for those levels give them their effect code.
  ...[
    [9, 'Machines', 'speed', 'Assembly bench speed', 'valves 20% faster', 'gear'], [9, 'Power', 'power', 'Load balancer', 'no slowdown at peak', 'bolt'], [9, 'Crew', 'speed', 'Assembler skill', 'recipes 20% faster', 'hand'], [9, 'Site', 'speed', 'Conveyor', 'parts move between machines', 'boxes'],
    [10, 'Power', 'bill', 'Off-peak tariff', 'cheaper power at night', 'bolt'], [10, 'Crew', 'focus', 'Night crew stamina', 'night shift tires 20% slower', 'zzz'], [10, 'Site', 'offline', 'Offline earnings cap', '+2 hours of offline earnings', 'coins'],
    [11, 'Machines', 'quality', 'Calibration', 'higher quality grade', 'gear'], [11, 'Power', 'quality', 'Clean power', 'steady quality', 'bolt'], [11, 'Crew', 'quality', 'Inspector\'s eye', 'fewer rejects', 'eye'], [11, 'Site', 'quality', 'Lab equipment', 'faster quality tests', 'star'],
    [12, 'Machines', 'batch', 'Bulk packers', 'bigger export batches', 'boxes'], [12, 'Power', 'power', 'Second substation', 'more machines at full speed', 'bolt'], [12, 'Crew', 'speed', 'Dispatcher', 'trains load themselves', 'people'], [12, 'Site', 'capacity', 'Longer trains', 'more per export run', 'truck'],
    [13, 'Machines', 'speed', 'Engine line speed', 'engines 20% faster', 'gear'], [13, 'Power', 'power', 'Second-plant generator', 'the second plant runs on its own power', 'bolt'], [13, 'Crew', 'speed', 'Plant manager skill', 'the second plant runs 10% faster', 'clip'], [13, 'Site', 'speed', 'Shuttle truck', 'parts move between plants', 'truck'],
    [14, 'Machines', 'speed', 'Robot arm speed', 'robots 15% faster, more uptime', 'gear'], [14, 'Power', 'power', 'Battery bank', 'rides through power cuts', 'bolt'], [14, 'Crew', 'repair', 'Technicians', 'robots repair themselves', 'wrench'], [14, 'Site', 'speed', 'Conveyor network', 'the whole plant on belts', 'boxes'],
    [15, 'Machines', 'speed', 'Heavy press', 'heavy machinery 20% faster', 'gear'], [15, 'Power', 'power', 'Own power station', 'no power limit', 'bolt'], [15, 'Crew', 'speed', 'Engineers', 'research 20% faster', 'people'], [15, 'Site', 'capacity', 'Research slots', 'one more research at a time', 'star'],
    [16, 'Machines', 'speed', 'Corporate standards', 'every machine 5% faster (endless)', 'gear'], [16, 'Power', 'bill', 'Efficiency', 'power bills 5% lower (endless)', 'bolt'], [16, 'Crew', 'speed', 'Executive training', 'every worker 5% faster (endless)', 'people'], [16, 'Site', 'capacity', 'Headquarters floors', 'one more floor (endless)', 'star'],
  ].map(([lv, group, kind, name, per, icon]) => { const base = Math.round(LEVEL_TABLE[lv].goal ? LEVEL_TABLE[lv].goal / 25 : 2e7);
    return { id:'p' + lv + '_' + name.toLowerCase().replace(/[^a-z]+/g, '_'), lv, group, kind, name, per, cost:[base, base * 2.2, base * 4.5], growth:lv === 16 ? 1.15 : 1.9, icon, tiers:[[lv, lv === 16 ? 99 : 3]], planned:true }; }),
];
export const upgradeById = id => UPGRADES.find(u => u.id === id);
// steps open at a company level
export const maxSteps = (u, level) => u.tiers.reduce((a, [lv, n]) => a + (lv <= level ? n : 0), 0);
// the level at which the next step after 'step' opens (null if never)
export const nextTierLevel = (u, step) => { let n = 0; for (const [lv, k] of u.tiers) { n += k; if (n > step) return lv; } return null; };
export const stepCost = (u, step) => step < u.cost.length ? u.cost[step] : Math.round(u.cost.at(-1) * Math.pow(u.growth, step - u.cost.length + 1) / 10) * 10;
// a reduction that stays sensible past three steps: -k per step to step 3, then 15% of what is left per step
export const cut = (k, n) => n <= 3 ? Math.max(.05, 1 - k * n) : Math.max(.05, (1 - 3 * k) * Math.pow(.85, n - 3));
export const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || String(n);

// ---------------------------------------------------------------- orders: size and price grow with the level
// about 2.5x the money goal per level (doc); orders grow ~20% and pay ~10% more per level from level 3
export const econ = level => ({ qty:level <= 2 ? 1 : 1 + .2 * (level - 2), price:level <= 2 ? 1 : Math.pow(1.1, level - 2) });

// ---------------------------------------------------------------- facilities: what the crew needs
// one stall per four people, one cooler per eight; the washroom card warns when the crew outgrows them
export const stallsNeeded = headcount => Math.max(1, Math.ceil(headcount / 4));
export const NEEDS = { thirstSecs:170, bladderSecs:280, urgent:30, drinkSecs:3.2, wcSecs:6, washSecs:2.2 };
