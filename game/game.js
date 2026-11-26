// Iron Valley: Factory Rising — build 0.5, Level 1 "Inherited Workshop".
// The player walks the factory owner, who inspects and manages: the crew does
// the work, each person in their own trade. Fixed camera. Models come from the
// Blender pipeline (models.js); cables, rings and labels are built here.
import * as PG from './progression.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const fmt = n => (n < 0 ? '-$' : '$') + Math.floor(Math.abs(n)).toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* =====================================================================
   DESIGN DATA — Level 1
   ===================================================================== */
// v2.0 2.5: the company's name on the sign grows with it: Workshop (1-4), Manufacturing (5-8), Industries (9-15), Corporation (16)
const signName = () => 'Iron Valley ' + (S.level >= 16 ? 'Corporation' : S.level >= 9 ? 'Industries' : S.level >= 5 ? 'Manufacturing' : 'Workshop');
const LEVELS = { 1:{ name:'Inherited Workshop', next:'Reopened Factory' }, 2:{ name:'Reopened Factory', next:'Local Manufacturer' }, 3:{ name:'Local Manufacturer', next:'Growing Enterprise' }, 4:{ name:'Growing Enterprise', next:'Regional Manufacturer' }, 5:{ name:'Regional Manufacturer', next:'Industrial Company' }, 6:{ name:'Industrial Company', next:'Major Manufacturer' }, 7:{ name:'Major Manufacturer', next:'Steel Works' }, 8:{ name:'Steel Works', next:'Assembly Plant' } };
const PREVIEW = true;                                    // build 0.16 preview: the new wide level 1 only, its own save
const MAX_LEVEL = 8;                                      // levels built so far (Bible v2.0: Act II is built one level at a time)                       // levels built so far
// level 2: the pipe mill (strategy doc: "Metal machine: pipes", "the generator's power limit")
const PIPE_PRICE = 95, PIPE_CYCLE = 4,   // Bible 4.2: pipe machine 4 s a pipe
 COIL_PIPES = 4, COIL_CAP = 6, MILL_PRICE = 600, MILL_BUILD = 18;   // Level Bible: pipe machine $600
const WH_PRICE = 1500, WH_BUILD = 20, WH_PIPES = 10;   // warehouse: price, build seconds, pipes shipped before it unlocks
const whUnlocked = s => s.level >= 2 && s.lv2.mill >= 2 && s.restored.yard && (s.pshipped || 0) >= WH_PIPES;
const STEEL_LOTS = [[2, 140], [4, 260]];                 // coils, price: the owner buys steel strip from the supplier
const PIPE_QTY = [4, 6, 8, 10, 12, 12];   // a lorry load grows as the mill proves itself (4 s a pipe: 48 s for a dozen)
const L2_MIX = ['pipe', 'crate', 'mix', 'pipe', 'mix', 'crate'];  // after the guided pipe order
// level 3: the tool press on the North field (strategy doc: "Tool machine: basic tools", "Issues and repairs")
const TOOL_PRICE = 70, TOOL_CYCLE = 4, COIL_TOOLS = 6, PRESS_PRICE = 1200, PRESS_BUILD = 22;   // Level Bible: tool machine $1,200
const LICENCE_PRICE = 160, LICENCE_WAIT = 45, PARTS_LOT = [4, 160];   // Level Bible: licence $160 at the Town screen
const TOOL_QTY = [4, 6, 6, 8, 8, 10, 10, 12];
const L3_MIX = ['tool', 'mix3', 'pipe', 'tool', 'crate', 'mix3', 'tool', 'mix'];  // after the guided tool order
const L4_MIX = ['mix3', 'mix', 'mix3', 'tool', 'mix3', 'crate', 'mix3', 'pipe'];  // level 4: mixed orders are the norm
const CRATE_PRICE = 55;                                  // bible: Wooden Crate $55
const LINE_CAP = 12;                                     // line-side rack by the saw
// the stock room bay; at level 4 the second saw needs more, so the bay is racked to twice the height
const storeCap = () => S.level >= 4 ? 48 : 24;
// Dolores's fixed-price contract (L8) also covers timber and steel, 5% cheaper a step of Fixed-price supply
const supplyK = () => S.l8 && S.l8.contract ? 1 - .05 * (1 + Math.min(3, S.up.fixedprice || 0)) : 1;
const timberLots = () => S.level >= 4 ? [[12, 132], [24, 240], [48, 456]] : [[12, 132], [24, 240]];   // planks, price: the owner buys timber from the supplier
const SAW_S = 1.3;                                       // the crate line drawn at the concept's chunky scale
const SAW_CYCLE = 2;                                      // Gameplay Bible 4.2: crate machine 2 s/unit
const ORDER_QTY = [3, 5, 6, 8, 8, 10, 10, 12, 12, 14];
const CLIENTS = ['Hartley Hardware', 'Valley Grocers', 'Mill Road Farm', 'Dunmore Docks', 'Ashby Bottling', 'Kerr & Sons'];
// worker training grows with the company level (progression.js): level 1 caps workers at 5, each level adds 2
const maxLv = () => PG.workerLvCap(S.level);
// Bible v2.0 2.3: the named crew join in this order in their roles; every other hire takes a first name and a surname from
// the pools, never a cast name. Saves from before keep the names their crew already have.
const CREW_CAST = { operator:[['Alf', 'Pryce'], ['Tommy', 'Pryce']], loader:[['Wilf', 'Dunn'], ['Bert', 'Coombes']], helper:[['Danny', 'Moss']], mechanic:[['Stan', 'Kowalczyk']], forklift:[['Reggie', 'Platt']], clerk:[['June', 'Finch']], foreman:[['Joe', 'Brennan']] };
const FIRST_POOL = ['Frank', 'Harry', 'Ivan', 'Jean', 'Kofi', 'Les', 'Maureen', 'Mohan', 'Norm', 'Pat', 'Pietro', 'Ray', 'Ron', 'Sheila', 'Ted', 'Vic', 'Winston', 'Carlos'];
const SUR_POOL = ['Baxter', 'Fenwick', 'Garside', 'Hughes', 'Lowe', 'Novak', 'Okoro', 'Romano', 'Singh', 'Tate', 'Walsh', 'Crowther'];
const FEM = new Set(['Jean', 'Maureen', 'Sheila', 'Doris', 'June', 'Ada', 'Vera', 'Priya', 'Rosa', 'Edna', 'Ruth', 'Imani', 'Nora', 'Peg', 'Beatrice', 'Dolores']);
const CAST_FIRST = new Set(['Gus', 'Tom', 'Vera', 'Abel', 'Rusty', 'Eldon', 'Priya', 'Ada', 'June', 'Hollis', 'Cyrus', 'Dolores', 'Victor', 'Joe', 'Rosa', 'Edna', 'Jack', 'Billy', 'Sam', 'Alan', 'Imani', 'Henrik', 'Peg', 'Nora', 'Beatrice', 'Doris', 'Hank', 'Tommy', 'Len', 'Mickey', 'Ruth', 'Ken']);
function crewName(role){ const used = new Set(S.staff.map(x => x.name)), usedFull = new Set(S.staff.map(x => x.name + ' ' + (x.sur || '')));
  for (const [f, l] of CREW_CAST[role] || []) if (!used.has(f) && !(S.castHired || {})[f] && !(f === 'Tommy' && S.level < 7)) return [f, l];   // Tommy Pryce starts at level 7
  const firsts = FIRST_POOL.filter(f => !used.has(f) && !CAST_FIRST.has(f)), f = firsts.length ? pick(firsts) : pick(FIRST_POOL), l = pick(SUR_POOL.filter(x => !usedFull.has(f + ' ' + x))) || pick(SUR_POOL); return [f, l]; }
const NAMES = FIRST_POOL;   // older code paths that only need a first name
// Every role is a trade: people only do their own job.
const ROLE = {
  operator:    { title:'Operator', dept:'production', cap:1, cost:[80, 220], icon:'saw', col:{ suit:'#3f6c94', hat:'#e3a52a', muff:'#c23b2a' }, gear:['hat_hard', 'earmuffs'],
                 job:'Runs one machine. Only an operator may run a machine: one for the saw, one for the pipe mill.' },
  helper:      { title:'Machine helper', dept:'production', cap:1, cost:[90], icon:'box', col:{ suit:'#7a5a3a', hat:'#c9b28a', shirt:'#d8c8a8' }, gear:['hat_cap'],
                 job:'Feeds the crate machine: carries planks from the line rack to the in-feed so the operator never stops to fetch them.' },
  loader:      { title:'Loader', dept:'logistics', cap:2, cost:[80, 150, 260], icon:'box', col:{ suit:'#5d6b3a', hat:'#d9772b', vest:'#f2c230' }, gear:['vest'],
                 job:'Carries for you: feeds timber to the saw, loads the truck, unloads deliveries, fetches diesel.' },
  electrician: { title:'Electrician', dept:'maint', cap:1, cost:[100], icon:'bolt', col:{ suit:'#2b3f5c', hat:'#2f7fd0', shirt:'#b8c9d8', tool:'#e8c02a' }, gear:['hat_hard', 'toolbelt'],
                 job:'Power cuts and electrical faults, at full speed. Services the wiring.' },
  mechanic:    { title:'Mechanic', dept:'maint', cap:1, cost:[120], icon:'wrench', col:{ suit:'#b9562b', hat:'#2c2f33', tool:'#c23b2a' }, gear:['hat_cap', 'toolbelt', 'wrench'],
                 job:'Jams and worn parts on every machine, twice as fast as you by hand. Fits spare parts from the shelf.' },
  supervisor:  { title:'Supervisor', dept:'mgmt', cap:1, cost:[250], icon:'clip', col:{ suit:'#3a3d41', hat:'#f4f1ea', shirt:'#f1ece0', vest:'#f07a22' }, gear:['hat_hard', 'vest', 'clipboard'],
                 job:'Manages the floor for you: takes the calls to the crew, keeps them from slacking (+15% near them), signs the deliveries.' },
  clerk:       { title:'Office clerk', dept:'admin', cap:1, cost:[260], icon:'clip', col:{ suit:'#556b3a', shirt:'#efe6da', hat:'#556b3a' }, gear:['clipboard'],
                 job:'Works the clerk\'s window: collects the takings at the dock, hands out Friday\'s packets and pays the weekly accounts, every line in her ledger.' },
  foreman:     { title:'Foreman', dept:'mgmt', cap:1, cost:[400], icon:'clip', col:{ suit:'#3a3d41', hat:'#f4f1ea', shirt:'#d8d2c2', vest:'#e8ab2c' }, gear:['hat_hard', 'vest', 'clipboard'],
                 job:'Runs the yard: fills empty posts, books the services, and lets you hurry the clock when every line is manned.' },
  forklift:    { title:'Forklift driver', dept:'logistics', cap:1, cost:[300], icon:'truck', col:{ suit:'#3e4a5c', hat:'#e8ab2c', vest:'#f2c230' }, gear:['hat_hard', 'vest'],
                 job:'Drives the forklift: timber to the second crate machine, its crates to the truck or the warehouse.' },
  cleaner:     { title:'Cleaner', dept:'facilities', cap:1, cost:[110], icon:'broom', col:{ suit:'#2f7f78', hat:'#2f7f78', shirt:'#dfe9e6', vest:'#cfe3df' }, gear:['hat_cap'],
                 job:'Keeps the washroom clean and swaps the water cooler\'s bottle. Without one, loaders do it when they have a minute.' },
};
const DEPTS = [
  ['production', 'Production', 'Runs the machines and feeds them', 'gear', ['operator', 'helper']],
  ['logistics', 'Logistics', 'Timber, crates and diesel', 'box', ['loader', 'forklift']],
  ['maint', 'Maintenance', 'Repairs, each in their own trade', 'wrench', ['electrician', 'mechanic']],
  ['mgmt', 'Management', 'Runs the floor while you do the business', 'clip', ['supervisor', 'foreman']],
  ['facilities', 'Facilities', 'Washroom, drinking water and a clean floor', 'broom', ['cleaner']],
  ['admin', 'Administration', 'The clerk collects the takings, hands out the packets and pays the bills', 'coins', ['clerk'], 6],
];
// upgrades and equipment are data rows in progression.js; the number of steps open grows with the level
const GONE = ['wc', 'cooler', 'mop', 'gen', 'ppe', 'meter'];   // welfare, diesel, timber runs, focus and the electrician are not in the Bible's game
const LATER = { surge:3, tools:3, fuel:3, supply:3 };   // fuel saver and the bigger trolley matter once timber and diesel are bought (level 3)                                              // these belong to the issues system (level 3)
const GOAL_OF = { 1:4000, 2:10000, 3:30000, 4:55000, 5:120000, 6:250000, 7:600000, 8:1500000 };   // Bible v2.0 6.1
const UPGRADES = PG.UPGRADES.filter(u => !GONE.includes(u.id)).map(u => Object.assign({}, u, LATER[u.id] ? { lv:LATER[u.id] } : {})).map(u => Object.assign(u, u.lv >= 3 && u.lv <= 8 && !u.planned ? { cost:[.02, .04, .08].slice(0, u.cost.length).map(k => Math.round(GOAL_OF[u.lv] * k / 10) * 10) } : {})).map(u => Object.assign({}, u, { desc:`Each step: ${u.per}.` }));
const upSteps = u => PG.maxSteps(u, S.level);
const upCost = u => PG.stepCost(u, S.up[u.id] || 0);
const upgVisible = u => (u.lv || 1) <= S.level && (u.need !== 'contract' || !!(S.l8 && S.l8.contract)) && (u.need !== 'warehouse' || S.lv2.wh >= 2) && (u.need !== 'field' || !!S.lv3.field) && (u.need !== 'gen2' || S.up.gen2 >= 1);
const PADS = [
  { id:'lights',  label:'Rewire the lights',   price:100, at:[3.6, -2.4], icon:'bulb', after:s => s.delivered >= 1, note:'Brighter, fewer power faults' },
  { id:'paint',   label:'Paint floor lines',   price:80,  at:[-8.4, -1.0], icon:'brush', after:s => s.delivered >= 1 },
  { id:'yard',    label:'Clear the back yard', price:400, at:[16.3, -1.9], icon:'broom', after:s => s.delivered >= 2, note:'Room to grow: the warehouse goes here' },
  { id:'coffee',  label:'Coffee machine',      price:150, at:[2.6, 7.4], icon:'cup', after:() => false, note:'Breaks twice as short' },
  { id:'windows', label:'Replace the windows', price:200, at:[-1.6, -1.0], icon:'window', after:s => s.restored.lights },
  // build 0.19: small things a reopened works buys as the money comes in
  { id:'urn',     label:'Tea urn for the crew', price:90, at:[-8.3, -.75], icon:'cup', after:s => s.delivered >= 2, note:'The crew works 5% faster' },
  { id:'counter', label:'Trade counter at the gate', price:120, at:[1.0, 8.6], icon:'box', after:s => s.walk && s.walk.served >= 1, note:'Customers wait longer, pay 10% more' },
  { id:'car',     label:'Service and signwrite the car', price:200, at:[13.6, 9.3], icon:'truck', after:s => s.sales && s.sales.trips >= 1, note:'Trips 20% quicker; the car advertises' },
  // Bible v2.0 18.4: purchases that change what you see
  { id:'hatch',   label:'Wages hatch', price:150, at:[-2.6, -1.85], icon:'window', after:s => s.level >= 2, note:'Hand out the pay packets yourself on Fridays at 16:30', lv:2 },
  { id:'awning',  label:'Gate awning', price:200, at:[-.75, 9.65], icon:'window', after:s => s.level >= 2 && s.lv2.mill >= 2, note:'Walk-ins keep coming in light rain', lv:2 },
  { id:'lamps',   label:'Yard lamps', price:480, at:[-4.6, 8.4], icon:'bulb', after:s => s.level >= 3, note:'Work on into dusk: the gate trade runs to 16:50, a lit yard at the whistle', lv:3 },
  { id:'bell',    label:'Counter bell (trade counter, step 2)', price:250, at:[1.15, 8.75], icon:'box', after:s => s.level >= 3 && s.restored.counter, note:'You hear a walk-in from anywhere; they wait 160 s', lv:3 },
  { id:'window',  label:'Shop window (trade counter, step 3)', price:500, at:[-2.0, 9.65], icon:'window', after:s => s.level >= 4 && s.restored.bell, note:'Walk-ins every 45 to 90 s', lv:4 },
  // level 6 (v2.0 18.4): the lightning conductor, the works canteen across Mill Road, the generator's automatic changeover
  { id:'conductor', label:'Lightning conductor', price:5000, at:[-6.2, .4], icon:'bolt', after:s => s.level >= 6, note:'Storm power cuts back to normal', lv:6 },
  { id:'canteen', label:'Works canteen', price:5000, at:[-9.0, 18.9], icon:'cup', after:s => s.level >= 6, note:'Crew +3% for the afternoon', lv:6 },
  { id:'clock', label:'Works clock tower', price:12000, at:[1.9, 25.8], icon:'star', after:s => s.level >= 7, note:'A landmark on the office block: +0.1 phone interest', lv:7 },
  { id:'hd', label:'Heavy-duty supply (11 kV)', price:25000, at:[-25.0, -3.0], icon:'bolt', after:s => s.level >= 8, note:'A second transformer on the plinth: +40 kW for the furnace', lv:8 },
  { id:'furnace', label:'Light the furnace', price:2000, at:[-19.0, -2.9], icon:'gear', after:s => s.level >= 8 && s.l8 && s.l8.hd, note:'Coke and a match: beams every 12 s with two operators', lv:8 },
  { id:'bus', label:'Bus shelter at the gate', price:30000, at:[0.9, 11.1], icon:'people', after:s => s.level >= 8, note:'The crew arrive on time in bad weather', lv:8 },
  { id:'canopy',  label:'Loading-lane canopy', price:1100, at:[4.4, 8.35], icon:'brush', after:s => s.level >= 4, note:'No rain slow-down on the lane', lv:4 },
  { id:'lanes',   label:'Mark out the loading lane and bays', price:120, at:[6.0, 8.3], icon:'brush', after:s => s.level >= 2 && s.lv2.mill >= 2, note:'Lines for the lane to the dock and both lorry bays', lv:2 },
  { id:'mill',    label:'Install the pipe machine', price:MILL_PRICE, at:[4.9, 3.6], icon:'gear', after:s => s.level >= 2, note:'A contractor builds it', lv:2 },
  // level 2, later: a finished-goods warehouse in the cleared back yard, once the pipe line has proved itself
  // level 3: the tool press on the North field (bought in level 2 through Vera Lind)
  { id:'saw2',    label:'Second crate machine', get price(){ return S.perks.freeCrateMachine ? 0 : SAW2_PRICE; }, at:[-20.6, 6.3], icon:'saw', after:s => s.level >= 4 && s.plots.scrap.st >= 3 && !s.lv4.saw2, get note(){ return S.perks.freeCrateMachine ? 'Rusty\'s machine, refitted free' : 'Big Tom\'s crew installs it'; }, lv:4 },
  { id:'mill2',   label:'Second pipe mill', get price(){ return MILL2_PRICE; }, at:[15.5, 22.4], icon:'gear', after:s => s.level >= 5 && s.plots.shop.st >= 1 && !s.l5.mill2, note:'Big Tom\'s crew installs it on Ada\'s corner plot', lv:5 },
  { id:'grit',    label:'Grit bin and shovels', price:2400, at:[-7.0, 1.1], icon:'brush', after:s => s.level >= 5, note:'Lanes gritted at 07:00 on icy days', lv:5 },
  { id:'chains',  label:'Snow chains and plough blade', price:2400, at:[21.2, 10.9], icon:'truck', after:s => s.level >= 5, note:'Lorries and the forklift at full speed in snow', lv:5 },
  { id:'press',   label:'Install the tool press', price:PRESS_PRICE, at:[14.0, -13.5], icon:'gear', after:s => s.level >= 3 && s.lv3.field && !s.lv3.press, note:'A contractor builds it', lv:3 },
  { id:'wh',      label:'Build the warehouse',  price:WH_PRICE, at:[18.7, -4.3], icon:'box', after:s => whUnlocked(s) && !s.lv2.wh, note:'Make to stock. A contractor builds it', lv:2 },
];
// Bible v2.0 7: every Act I level has its charter lines. Money is cash earned during the level (the $400 starting cash
// does not count); a ticked line stays ticked; each line has its own id, so two lines of one kind never share a tick.
const posted = role => S.staff.filter(x => x.role === role && x.posted !== false).length;
const CHARTER = [
  { id:'money', k:'Money', text:'Earn $4,000', need:4000, get:s => s.earned, money:true },
  { id:'tut', k:'Output', text:'Deliver the 4 first orders', need:4, get:s => Math.min(4, s.delivered) },
  { id:'crates', k:'Output', text:'Ship 200 crates', need:200, get:s => s.shipped },
  { id:'crew', k:'People', text:'Post an operator and a loader', need:2, get:() => +(posted('operator') > 0) + +(posted('loader') > 0) },
  { id:'gate', k:'Standing', text:'Serve 5 gate customers', need:5, get:s => s.walk.served },
  { id:'visit', k:'Growth', text:'Make 1 sales visit', need:1, get:s => (s.sales && s.sales.trips) || 0, detail:() => 'Stand at the door of grandad\'s car' },
  { id:'rep', k:'Standing', text:'Reputation 62%', need:62, get:s => Math.round(s.rep), pct:true },
];
const CHARTER2 = [
  { id:'money', k:'Money', text:'Earn $10,000 at this level', need:10000, get:s => s.earned - s.lv2.e0, money:true },
  { id:'pipes', k:'Output', text:'Ship 100 pipes', need:100, get:s => s.pshipped - (s.lv2.ps0 || 0) },
  { id:'crew', k:'People', text:'Post a second loader and a machine helper', need:2, get:() => +(posted('loader') >= 2) + +(posted('helper') >= 1) },
  { id:'lanes', k:'Growth', text:'Mark out the loading lane and bays', need:1, get:s => +!!s.restored.lanes },
  { id:'gen2', k:'Papers', text:'Fit Generator Mk II', need:1, get:s => +(s.up.gen2 >= 1) },
  { id:'wh', k:'Growth', text:'Build the warehouse', need:1, get:s => +(s.lv2.wh >= 2) },
  { id:'ontime', k:'Output', text:'6 deliveries on time', need:6, get:s => s.ontime - (s.lv2.ot0 || 0) },
  { id:'rep', k:'Standing', text:'Reputation 64%', need:64, get:s => Math.round(s.rep), pct:true },
];
const CHARTER3 = [
  { id:'money', k:'Money', text:'Earn $30,000 at this level', need:30000, get:s => s.earned - s.lv3.e0, money:true },   // Bible $24,000 (VERIFY): the simulator's average player earns it in about 30 min of a 40-min level
  { id:'rep', k:'Standing', text:'Reputation 62%', need:62, get:s => Math.round(s.rep), pct:true },
  { id:'tools', k:'Output', text:'Ship 50 tools', need:50, get:s => s.tshipped },
  { id:'field', k:'Growth', text:'Buy the North field', need:1, get:s => +(s.plots.north.st >= 1), detail:s => s.plots.north.st ? 'Bought' : 'Stand at Abel Thorne\'s sign by the back fence' },
  { id:'press', k:'Growth', text:'Install the tool press', need:1, get:s => +(s.lv3.press >= 2) },
  { id:'fixed', k:'Papers', text:'Fix 5 issues', need:5, get:s => s.fixed - s.lv3.f0 },
  { id:'mains', k:'Papers', text:'Mains live', need:1, get:() => +mainsLive(), detail:s => mainsLive() ? 'Live' : s.mains.st ? 'Application in hand' : 'Apply in the office (Machines tab)' },
  { id:'licence', k:'Papers', text:'Win the trading licence', need:1, get:s => +(s.lv3.licence === 2), detail:s => s.lv3.licence === 2 ? 'Granted' : s.lv3.licence === 4 ? 'Failed: fix and re-book' : s.lv3.licence === 3 ? 'Inspecting' : s.lv3.licence ? 'Applied for' : 'Not yet' },
  { id:'scrap', k:'Growth', text:'Buy the scrapyard from Rusty Pike', need:1, get:s => +(s.plots.scrap.st >= 1), detail:s => s.plots.scrap.st ? 'Bought' : 'Stand at Rusty Pike\'s sign in the back yard' },
];
const CHARTER4 = [
  { id:'money', k:'Money', text:'Earn $55,000 at this level', need:55000, get:s => s.earned - s.lv4.e0, money:true },
  { id:'sup', k:'People', text:'Post a supervisor', need:1, get:s => +(!!s.lv4.promoted && posted('supervisor') > 0) },
  { id:'fork', k:'Output', text:'The forklift moves 120 crates', need:120, get:s => s.lv4.forkMoved || 0 },   // Bible 200 (VERIFY): the simulator's average player reaches 120 in the level's 40 minutes
  { id:'saw2', k:'Growth', text:'Run the second crate machine', need:1, get:s => +(s.lv4.saw2 >= 2 && (s.lv4.made2 || 0) > 0) },
  { id:'mixed', k:'Output', text:'Deliver 3 mixed orders', need:3, get:s => s.lv4.mixed || 0 },
  { id:'road', k:'Papers', text:'Hold the road-frontage permit', need:1, get:s => +(s.plots.road.st >= 2), detail:s => s.plots.road.st >= 2 ? 'Permit held' : s.plots.road.st === 1 ? 'Permit pending' : 'Stand at the council\'s notice by bay 2' },
  { id:'ontime', k:'Output', text:'10 deliveries on time', need:10, get:s => s.ontime - (s.lv4.ot0 || 0) },
  { id:'rep', k:'Standing', text:'Reputation 66%', need:66, get:s => Math.round(s.rep), pct:true },
];
// level 5 charter (Level Bible): $50K, 66%, 10 orders on time, the corner shop plot, two bills paid on time and a
// bank account at the Valley Bank
const CHARTER5 = [
  { id:'money', k:'Money', text:'Earn $120,000 at this level', need:120000, get:s => s.earned - s.l5.e0, money:true },
  { id:'mill2', k:'Growth', text:'Run the second pipe mill', need:1, get:s => +(s.l5.mill2 >= 2 && (s.l5.made2 || 0) > 0), detail:s => s.plots.shop.st ? (s.l5.mill2 >= 2 ? 'Running' : s.l5.mill2 ? 'Big Tom installing' : 'Pay in at its pad on the corner plot') : 'Buy Ada Finch\'s corner plot first' },
  { id:'dock2', k:'Output', text:'Ship a lorry from dock 2', need:1, get:s => s.l5.d2done || 0 },
  { id:'pairs', k:'Output', text:'Two orders out on the same day, 5 times', need:5, get:s => s.l5.pairs || 0 },
  { id:'accounts', k:'Papers', text:'Pay the first weekly accounts', need:1, get:s => s.l5.paid || 0, detail:() => 'Friday, after the whistle' },
  { id:'farewell', k:'People', text:'Hold Gus\'s farewell', need:1, get:s => +!!s.gus.retired, detail:() => 'Friday afternoon' },
  { id:'rep', k:'Standing', text:'Reputation 68%', need:68, get:s => Math.round(s.rep), pct:true },
];
// level 6 charter (Bible v2.0): $250K, the clerk, three tier 2 refits, five services, the inspector, accounts on time,
// 900 crates shipped in all (Bible 2,000, VERIFY: the simulator's average player ships about 900 by Level 6), 70%
const CHARTER6 = [
  { id:'money', k:'Money', text:'Earn $250,000 at this level', need:250000, get:s => s.earned - s.l6.e0, money:true },
  { id:'clerk', k:'People', text:'Take on a clerk', need:1, get:s => +s.staff.some(x => x.role === 'clerk'), detail:() => 'June Finch, in the Staff tab' },
  { id:'tier2', k:'Growth', text:'Refit 3 machines to tier 2', need:3, get:s => s.l6.refits || 0, detail:() => 'Machines tab' },
  { id:'svc', k:'Output', text:'5 preventive services', need:5, get:s => s.l6.svc || 0 },
  { id:'insp', k:'Papers', text:'Pass the factory inspector', need:1, get:s => +(s.l6.insp === 3), detail:s => s.l6.insp === 4 ? 'Failed: he is back tomorrow' : 'Thursday' },
  { id:'acc', k:'Papers', text:'Pay the weekly accounts on time', need:1, get:s => Math.max(0, (s.l5.onTime || 0) - (s.l6.ot0 || 0)) },
  { id:'crates', k:'Output', text:'900 crates shipped in all', need:900, get:s => s.shipped },
  { id:'rep', k:'Standing', text:'Reputation 70%', need:70, get:s => Math.round(s.rep), pct:true },
];
// level 7 charter (Bible v2.0): $600K, 12 off the order board, Hollis Reed a regular, two supervisor zones, 15 on time,
// the siding approved, 74%
const CHARTER7 = [
  { id:'money', k:'Money', text:'Earn $600,000 at this level', need:600000, get:s => s.earned - s.l7.e0, money:true },
  { id:'board', k:'Output', text:'Deliver 12 orders from the order board', need:12, get:s => s.l7.bDone || 0 },
  { id:'hollis', k:'People', text:'Make Hollis Reed a regular client', need:1, get:s => +!!s.l7.hollis.regular, detail:s => `${s.l7.hollis.streak || 0} of 3 on time in a row` },
  { id:'zones', k:'People', text:'Run two supervisor zones', need:2, get:() => zonesLive(), detail:() => 'Promote a second supervisor and lead them to a post' },
  { id:'ontime', k:'Output', text:'15 deliveries on time', need:15, get:s => s.ontime - (s.l7.ot0 || 0) },
  { id:'siding', k:'Papers', text:'Get the railway siding approved', need:1, get:s => +(s.l7.siding === 3), detail:s => s.l7.siding === 2 ? 'Applied: the Railway Board answers tomorrow' : 'Thursday, with Cyrus Bell' },
  { id:'rep', k:'Standing', text:'Reputation 74%', need:74, get:s => Math.round(s.rep), pct:true },
];
// level 8 charter (Bible v2.0): $1.5M, the furnace lit, 150 beams shipped, 4 trains unloaded, a foreman, a full day with
// no stockout and no overflow, the plot next door, 76%
const CHARTER8 = [
  { id:'money', k:'Money', text:'Earn $1,500,000 at this level', need:1500000, get:s => s.earned - s.l8.e0, money:true },
  { id:'lit', k:'Growth', text:'Light the furnace', need:1, get:s => +!!s.l8.lit, detail:s => s.l8.hd ? 'At its pad in the forklift yard' : 'The heavy-duty supply first (its pad in the forklift yard)' },
  { id:'beams', k:'Output', text:'Ship 150 steel beams', need:150, get:s => s.l8.shipped || 0 },
  { id:'trains', k:'Output', text:'Unload 4 trains', need:4, get:s => s.l8.trains || 0 },
  { id:'foreman', k:'People', text:'Take on a foreman', need:1, get:s => +s.staff.some(x => x.role === 'foreman') },
  { id:'clean', k:'Output', text:'A full day with no stockout and no overflow', need:1, get:s => s.l8.cleanDays || 0, detail:() => 'The furnace lit all day, a train unloaded, nothing left on a wagon' },
  { id:'plot', k:'Papers', text:'Buy the plot next door', need:1, get:s => +!!s.l8.plot, detail:() => 'Victor Krane bids for it on Thursday' },
  { id:'rep', k:'Standing', text:'Reputation 76%', need:76, get:s => Math.round(s.rep), pct:true },
];
const CHARTERS = { 1:CHARTER, 2:CHARTER2, 3:CHARTER3, 4:CHARTER4, 5:CHARTER5, 6:CHARTER6, 7:CHARTER7, 8:CHARTER8 };
const charter = () => CHARTERS[S.level] || CHARTER;
// a ticked line stays ticked (strategy doc), even if reputation dips later
const lineDone = c => { const k = S.level + ':' + (c.id || c.k); if (S.ticks[k]) return true; if (c.get(S) >= c.need) { S.ticks[k] = true; return true; } return false; };
const lineVal = c => lineDone(c) ? c.need : Math.min(c.get(S), c.need);
// Power: generator -> switchboard -> circuits. Loads in kW. Mk I gives 10 kW, enough for one machine.
const genKW = () => Math.round(((S.up.gen2 >= 1 ? 16 + 2 * (S.up.gen2 - 1) : 10) + 6 * (S.up.gen3 || 0)) * (typeof wx === 'undefined' ? 1 : wxGenK()) * 10) / 10;   // v2.0 17.3: a heat wave takes 10% off a diesel set   // Mk III (level 4): +6 kW a step
const CIRCUITS = { saw:{ name:'Crate machine' }, lights:{ name:'Workshop lights' }, office:{ name:'Office and break room' }, pipe:{ name:'Pipe mill', lv:2 }, tool:{ name:'Tool press', lv:3 } };
const circuitShown = k => !CIRCUITS[k].lv || (k === 'pipe' ? S.lv2.mill >= 2 : S.lv3.press >= 2);
// Faults belong to a trade. Nobody else may fix them.
// Faults belong to a trade; from level 3 the owner can also fix one by hand at half a mechanic's speed
const FAULTS = {
  breaker:    { trade:'electrician', name:'Breaker tripped', where:'board', time:5, anim:'work' },
  junction:   { trade:'electrician', name:'Burnt junction box', where:'jbox', time:8, anim:'work' },
  alternator: { trade:'electrician', name:'Alternator fault', where:'gen', time:9, anim:'fix' },
  blade:      { trade:'mechanic', name:'Saw jammed', where:'saw', time:10, anim:'fix' },
  belt:       { trade:'mechanic', name:'Drive belt worn', where:'saw', time:10, anim:'fix', part:true },
  engine:     { trade:'mechanic', name:'Generator engine stalled', where:'gen', time:9, anim:'fix' },
  roller:     { trade:'mechanic', name:'Pipe mill jammed', where:'pipe', time:10, anim:'fix' },
  die:        { trade:'mechanic', name:'Tool press jammed', where:'tool', time:10, anim:'fix' },
  bearing:    { trade:'mechanic', name:'Mill bearing worn', where:'pipe', time:10, anim:'fix', part:true },
  spring:     { trade:'mechanic', name:'Press spring worn', where:'tool', time:10, anim:'fix', part:true },
  powercut:   { trade:'electrician', name:'Power cut', where:'gen', time:10, anim:'work' },
};
const SKINS = ['#e0ac85', '#c68c5f', '#9b6a43', '#f1c9a5', '#7a5236'];
const HAIRS = ['#2a1f19', '#4b3424', '#a8522a', '#1a1a1a', '#b8b2a6', '#d9b26a'];
const SHIRTS = ['#c9b28a', '#d8d2c2', '#a46b4f', '#8f9a76', '#b8c4cf'];

/* =====================================================================
   WORLD LAYOUT (metres; +x east, +z south = towards the camera)
   ===================================================================== */
const P = {
  // build 0.16b, after the Level 1 concept and the Gameplay Bible: grandfather's brick workshop at the back-left, the
  // crate machine on its painted pad in front of it, timber and crate storage along the west fence, the loading bay
  // under a timber canopy on the east side, the front gate on the road, the back yard to clear at the back-right.
  workshop:[-5.0, -6.5], desk:[-9.0, -8.45], deskRing:[-9.0, -7.15], wsDoor:[-5.0, -2.5],
  bench:[-1.4, -9.65], mechHome:[-1.4, -8.87], elecBench:[0.6, -9.75], elecHome:[0.6, -9.08], tarp:[-2.0, -6.4],
  board:[2.3, -4.6], boardSpot:[2.95, -4.6], gen:[5.2, -6.3], genPlinth:[5.2, -6.3], tank:[8.6, -9.4], pump:[8.3, -7.9], filler:[4.0, -6.55], cage:[5.2, -6.3],
  saw:[-0.4, 2.9], timber:[-5.6, 2.0], timberRing:[-5.6, 3.45], feed:[-3.95, 3.2], feedRing:[-4.0, 4.45], sawFix:[0.4, 4.3],
  jbox:[2.75, 0.6], jboxSpot:[2.75, 1.25], iso:[2.45, 2.05],
  canopy:[19.5, 1.6], truck:[17.7, 7.4], drop:[16.02, 6.2], cash:[13.6, 3.6], dock:[15.45, 7.35], xfmr:[25.9, 10.4],   // the board's pole stands just outside the east fence
  seats:[[-10.3, -1.75], [-9.7, -1.75], [-9.1, -1.75]], frontIn:[5.0, 10.6], frontOut:[5.0, 13.9],
  patrol:[[0.5, 6.4], [10.5, 4.0], [-6.0, 5.0], [14.0, 8.0]],
  // the stock room is not needed in levels 1-7 (Bible: timber is always in stock); its rack stays as dressing
  storeRack:[-11.6, 4.0], storeSpot:[-10.6, 4.0], trolleyPark:[-9.9, 5.0], unload:[22.35, 7.1], supPark:[20.8, 7.4],
  // staff welfare is not part of the 1973 game (Bible: workers never tire); these props are parked off the map
  cooler:[-90, -90], coolerSpot:[-90, -89.4], bottleRack:[-92, -90], bottleSpot:[-92, -89.3], cleanerHome:[-94, -90], wcCleanSpot:[-96, -90], coffee:[-98, -90],
  loaderHome:[8.0, 4.8], loaderWait:[10.0, 3.2], dockWait:[15.25, 8.9], gus:[4.6, -2.7], gus2:[5.2, -2.2], wcZone:[-96, -90], wcCheck:[-96, -89],
  wait:[[-3.7, -1.3], [-0.9, -0.9]],                     // where Walt and Rita wait for the owner on day one
  sweep:[[0.0, 6.0], [8.0, 3.0], [12.0, 6.0], [-6.0, 6.0], [4.0, 9.0], [16.0, 6.0], [-2.0, 8.0]],
  // level 2+ positions still follow the old hall; they are re-fitted from the Level 2-4 concept maps next
  // level 2 (wide yard, build 0.17): the pipe machine on its own pad beside the crate machine, coils fed from the west,
  // pipes out to a rack on the loading lane; the steel coil bay at the edge of the cleared back yard
  pmill:[6.4, 1.3], pfeed:[4.6, 1.2], pfeedRing:[4.6, 2.45], pfix:[6.4, 2.45], prack:[8.3, 3.55], prackSpot:[8.3, 4.65], coilBay:[10.7, -1.3], coilSpot:[9.8, -1.3],
  bay2:[20.8, 7.4], veraL2:[-6.4, 13.75], abelL2:[14.9, -12.7] /* leaning on his side of the back fence: the owner talks to him over it */, tomL2:[15.9, -5.3],
  // the warehouse goes up on the plot Big Tom marks out in the cleared back yard; its doors and loading spots face south
  wh:[18.7, -7.7], whSpotC:[17.25, -5.4], whSpotP:[20.1, -5.4], whSpotT:[18.75, -5.4], whTools:[18.7, -8.25], whBuild:[19.0, -5.25],
  // level 3 on the wide yard (build 0.20, plans/level3_plan.png): the tool press on a gravel pad in the North field
  // behind the back fence, its steel stand west, its tool rack east; the spare-parts shelf by the generator
  tpress:[14.0, -16.3], tfeed:[11.6, -16.4], tfeedRing:[11.6, -15.2], tfix:[15.7, -15.2], track:[16.7, -16.4], trackSpot:[16.7, -15.3],
  parts:[6.6, -11.25], pressBuild:[14.0, -14.4],
  // paid deliveries from level 3: the flatbed backs into bay 2 and its driver unloads onto the goods-in stack
  goodsIn:[23.3, 7.1],
  // build 0.18: where walk-in customers wait, just inside the main gate beside its west post (clear of the gate, the lorry path and the lane)
  trade:[2.35, 10.15],
  // build 0.19: grandad's car, nose-in by the front fence; the driver's door is on its east side
  // build 0.19b: in the lane along the front fence, facing the lorry gateway; you get in on the yard side
  carSpot:[12.0, 11.3], carDoor:[11.6, 9.25],
};
const ROAD_X = 40, ROAD_Z = 16.2, RAIL_Z = -24;           // the main road runs past the front gate (east-west)
const SITE = { x0:-14, x1:24, z0:-12, z1:12.5 };          // the fence line
const WHERE = {  // where each fault lives: marker, where the fixer stands, which way they face
  board:{ name:'switchboard', mark:[P.board[0], 2.0, P.board[1] + .1], spot:() => P.boardSpot, face:null },
  jbox: { name:'junction box', mark:[P.jbox[0], 2.1, P.jbox[1] + .1], spot:() => P.jboxSpot, face:Math.PI },
  gen:  { name:'generator', mark:[P.gen[0], 2.3, P.gen[1]], spot:() => P.genFix, face:null },
  saw:  { name:'crate machine', mark:[P.saw[0], 2.7, P.saw[1]], spot:() => P.sawFix, face:null },
  pipe: { name:'pipe mill', mark:[6.4, 1.9, 1.3], spot:() => P.pfix, face:null },
  tool: { name:'tool press', mark:[14.0, 2.4, -16.3], spot:() => P.tfix, face:null },
};

/* =====================================================================
   SAVE
   ===================================================================== */
const KEY = PREVIEW ? 'iron-valley-wide-preview' : 'iron-valley-save', OLD_KEYS = PREVIEW ? [] : ['iron-valley-l1-v5'];
// saves from every earlier version load: missing fields come from fresh(), nested records are merged
function migrate(o){
  if (!o || typeof o !== 'object' || !(o.v >= 5)) return null;
  const f = fresh(), out = Object.assign(f, o);
  for (const k of ['cal', 'mains', 'gus', 'up', 'restored', 'cond', 'lv2', 'lv3', 'lv4', 'l5', 'l6', 'l7', 'l8', 'ticks', 'checked', 'padPaid', 'wh', 'plots', 'met', 'skills', 'perks', 'walk', 'sales']) out[k] = Object.assign(fresh()[k], o[k] || {});
  out.power = Object.assign(fresh().power, o.power || {}); out.power.breakers = Object.assign(fresh().power.breakers, (o.power || {}).breakers || {});
  if (out.skills && out.skills.nights) { out.skillPts = (out.skillPts || 0) + out.skills.nights; delete out.skills.nights; }   // Long nights went with the away envelope (0.30): its points come back
  out.away = null;
  out.level = Math.min(MAX_LEVEL, o.level || 1);
  if (out.restored && out.restored.changeover && !(out.up && out.up.changeover)) out.up.changeover = 1;
  if (out.l5 && out.l5.bill) { const b = out.l5.bill, amt = b.total || b.amt || b.sum || 0; out.l5.owedWages = (out.l5.owedWages || 0) + amt; out.l5.bill = null; out.l5.nextBill = 1e12; }   // QA-09: an old 6-minute bill joins the weekly accounts   // the changeover was a yard pad in build 0.24
  // build 0.13: games started before the owner worked alone keep their crew and skip the new opening
  if (!(o.v >= 7)) { out.letter = true; out.met = Object.assign({ gus:true }, o.met || {}); if (!o.tutDone) { out.tutDone = true; out.tut = 99; }
    if (out.lv3.field) out.plots.north = { st:3 }; out.rep = Math.max(out.rep, 50); }
  out.plots.north = Object.assign({ st:0 }, out.plots.north); out.plots.scrap = Object.assign({ st:0 }, out.plots.scrap); out.plots.road = Object.assign({ st:0 }, out.plots.road); out.plots.shop = Object.assign({ st:0 }, out.plots.shop);
  if (out.order2 && !out.order2.l) out.order2.l = { c:0, p:0, t:0 };
  // build 0.22 (Bible v2.0): the 8-minute day becomes the 10-minute day. The day number stays the same, the time of day
  // stretches by a quarter, and every time stamp moves with it; the calendar puts the level on its own date.
  if (!(o.v >= 8)) { const t0 = out.time || 0, t1 = Math.floor(t0 / 480) * 600 + (t0 % 480) * 1.25, d = t1 - t0, mv = (r, k) => { if (r && typeof r[k] === 'number') r[k] += d; };
    out.time = t1; mv(out, 'nextIssue'); mv(out, 'lastFault'); mv(out.gus, 'visitAt'); mv(out.gus, 'cheerUntil'); for (const k of ['t0', 'rushAt', 'nextBill']) mv(out.l5, k); mv(out.l5.bill, 'due');
    if (out.day && out.day.closing) out.day.closing.at = t1;
    out.cal = { off:Math.max(0, (LV_START[out.level] || 0) - Math.floor(out.time / 600)) }; }
  out.v = 8; repairOrders(out); return out;
}
// An order taken in an older build can lack fields that later builds count on (build 0.5 orders had no
// 'cut' or 'briefed'). One missing number made "crates left to cut" NaN, so the saw never ran again and
// the ticket read "Cut undefined/14" (the stuck-Walt reports). Every order field is repaired here, on
// load and again by a once-a-second health check while playing. Returns how many fields it fixed.
const num = v => typeof v === 'number' && isFinite(v);
function repairOrders(s){
  let fixed = 0; const set = (o, k, v) => { o[k] = v; fixed++; };
  const c = s.call;
  if (c) { if (!num(c.qty)) set(c, 'qty', 0); if (!num(c.pq)) set(c, 'pq', 0); if (!num(c.tq)) set(c, 'tq', 0); if (!c.qty && !c.pq && !c.tq) { s.call = null; fixed++; }
    else { if (!num(c.deadline)) set(c, 'deadline', Math.round(60 + c.qty * 9 + c.pq * 10)); if (!num(c.pay)) set(c, 'pay', Math.round((c.qty * CRATE_PRICE + c.pq * PIPE_PRICE) * (0.9 + (s.rep || 50) / 500))); if (!c.client) set(c, 'client', CLIENTS[0]); } }
  const o = s.order; if (!o) return fixed;
  if (!num(o.qty)) set(o, 'qty', 0); if (!num(o.pq)) set(o, 'pq', 0); if (!num(o.tq)) set(o, 'tq', 0); if (!num(s.tbed)) set(s, 'tbed', 0); if (!num(s.tools)) set(s, 'tools', 0);
  if (s.wh) { if (!num(s.wh.c)) set(s.wh, 'c', 0); if (!num(s.wh.p)) set(s.wh, 'p', 0); if (!num(s.wh.t)) set(s.wh, 't', 0); }
  if (!num(s.bed)) set(s, 'bed', 0); if (!num(s.pbed)) set(s, 'pbed', 0); if (!num(s.pallet)) set(s, 'pallet', 0); if (!num(s.pipes)) set(s, 'pipes', 0);
  // crates already made for this order: loaded on the truck plus waiting on the pallet
  if (!num(o.cut)) set(o, 'cut', Math.min(o.qty, s.bed + s.pallet));
  if (!num(o.pcut)) set(o, 'pcut', Math.min(o.pq, s.pbed + s.pipes));
  if (!num(o.tcut)) set(o, 'tcut', Math.min(o.tq, s.tbed + s.tools));
  o.cut = Math.max(0, Math.min(o.qty, o.cut)); o.pcut = Math.max(0, Math.min(o.pq, o.pcut));
  // before build 0.6 nobody briefed the crew: production simply ran
  if (typeof o.briefed !== 'boolean') { set(o, 'briefed', true); o.met = true; }
  if (typeof o.met !== 'boolean') set(o, 'met', !!o.briefed);
  if (typeof o.ready !== 'boolean') set(o, 'ready', false);
  if (!num(o.time)) set(o, 'time', 0); if (!num(o.deadline)) set(o, 'deadline', Math.round(60 + o.qty * 9 + o.pq * 10));
  if (!num(o.pay)) set(o, 'pay', Math.round((o.qty * CRATE_PRICE + o.pq * PIPE_PRICE) * (0.9 + (s.rep || 50) / 500)));
  if (!num(o.id)) set(o, 'id', (s.orderSeq || 0) + 1); if (!o.client) set(o, 'client', CLIENTS[0]);
  if (!o.qty && !o.pq && !o.tq) { s.order = null; fixed++; }
  return fixed;
}
let healthT = 0;
function healthCheck(dt){
  healthT += dt; if (healthT < 1) return; healthT = 0;
  if (S.order2 && (!S.order2.l || !num(S.order2.deadline))) { S.order2.l = S.order2.l || { c:0, p:0, t:0 }; if (!num(S.order2.deadline)) S.order2.deadline = 240; }
  const n = repairOrders(S); if (n) { S.repairs = (S.repairs || 0) + n; console.warn(`[iv] repaired ${n} order field(s)`); try { yt && yt.health.logWarning(); } catch(e){} save(); }
}
function fresh(){
  return { v:8, level:1, lv2:{ e0:0, mill:0, buildT:0, seq:0, wh:0, whT:0 }, wh:{ c:0, p:0, t:0, make:true },
    lv3:{ e0:0, f0:0, field:false, press:0, pressT:0, licence:0, licT:0, seq:0, check:{}, step:0 },
    lv4:{ e0:0, saw2:0, saw2T:0, feed2:0, pallet2:0, promoted:false, post:null, mixed3:0, seq:0 },
    l5:{ e0:0, ot0:0, t0:0, mill2:0, mill2T:0, coil2:0, coilLeft2:0, rack2:0, seq2:0, rushAt:0, bill:null, billSeq:0, nextBill:0, onTime:0, paid:0, spent:0, account:false, loan:null }, l6:{ e0:0, ot0:0, tier:{}, cyc:{}, svc:0, refits:0, refit:null, insp:0, ledger:[], book:[], tarp:0, trophy:false }, l7:{ e0:0, ot0:0, board:[], bseq:0, bDone:0, refillAt:0, hollis:{ met:false, streak:0, regular:false }, siding:0, peg:0, tommy:false, bigFri:0, repT:0 }, l8:{ e0:0, scrap:0, ore:0, hd:0, lit:false, made:0, bed:0, store:0, shipped:0, trains:0, pad:null, padT:0, contract:false, spotFri:false, plot:false, cleanDays:0, krane:{ st:0 } }, order2:null, tools:0, tbed:0, tmade:0, tshipped:0, tcoil:0, tfeed:0, parts:0, ticks:{}, cash:400, earned:0, rep:60, delivered:0, ontime:0, shipped:0, fedPlanks:0, made:0, history:[],
    coils:0, coilFeed:0, coilLeft:0, pipes:0, pbed:0, pmade:0, pshipped:0, batchAcc:0, cooler:20, water:3, wcClean:100, wcUses:0, drinks:0,
    timber:8, store:16, feed:0, pallet:0, bed:0, cashPile:0, order:null, call:null, orderSeq:0, bills:0, billsPaid:0, delivery:null, timberBought:0,
    // Level Bible, level 1: the grandfather's letter, $400 and nobody on the payroll; the owner works by hand
    staff:[], nextId:1, letter:false, mains:{ st:0, t:0 }, gus:{ retired:false, told:false, party:0, gift:null, toolbox:false, cheerUntil:0, visitAt:0, shipped:0 }, plots:{ north:{ st:0 }, scrap:{ st:0 }, road:{ st:0 }, shop:{ st:0 } }, met:{}, skills:{}, perks:{}, freeHires:0, up:Object.fromEntries(PG.UPGRADES.map(u => [u.id, 0])),
    restored:{ lights:false, paint:false, windows:false, coffee:false, yard:false, mill:false }, padPaid:{},
    power:{ fuel:100, breakers:{ saw:true, lights:true, office:true, pipe:true, tool:true } }, cond:{ saw:100, engine:100, wiring:100, pipe:100, tool:100 },
    faults:[], faultSeq:0, fixed:0, lastFault:0, mechIntro:false, tutFault:false,
    tut:0, tutDone:false, levelUp:false, officeSeen:false, checked:{}, owner:[11.0, 6.2], time:0,
    day:null, cal:{ off:0 }, nextLevel:0, walk:{ served:0, lost:0, cash:0, seq:0, last:'' }, sales:{ acc:{}, visited:{}, ads:{}, trips:0, won:0 }, book:[] };
}
let S = fresh();
const yt = window.ytgame && window.ytgame.IN_PLAYABLES_ENV ? window.ytgame : null;
async function loadSave(){
  try { let raw = yt ? await yt.game.loadData() : localStorage.getItem(KEY); if (!raw && !yt) for (const k of OLD_KEYS) raw = raw || localStorage.getItem(k);
    if (raw) { const o = migrate(JSON.parse(raw)); if (o) S = o; } } catch(e){ console.warn('[iv] save could not be read, starting fresh', e); }
  saveLoaded = true;
  for (const f of S.faults) { f.by = null; f.supBy = null; f.contractor = false; }
}
let saveLoaded = false;   // Playables: never call saveData before loadData has finished
let resetting = false;
// Start over: the saved game in this browser (or the Playables cloud save) is replaced by a brand-new one, then the
// page reloads into the grandfather's letter. Saving is blocked from here on so the unload save cannot bring it back.
function newGame(){
  resetting = true; paused = true;
  const done = () => location.reload();
  try {
    if (yt) { yt.game.saveData(JSON.stringify(fresh())).then(done, done); return; }
    localStorage.removeItem(KEY); for (const k of OLD_KEYS) localStorage.removeItem(k);
  } catch(e){}
  done();
}
function save(){
  if (!owner || !saveLoaded || resetting) return;
  S.owner = trip ? [...P.carDoor] : [+owner.o.position.x.toFixed(2), +owner.o.position.z.toFixed(2)];   // out on a trip: a reload puts you back by the car
  // Items in someone's hands live on the character, not in S. Build 0.10 saved without them, so a reload
  // lost every crate a loader was carrying while the order still counted it as cut (Walt idle on order #34).
  // The save now puts carried things back where they came from.
  const snap = JSON.parse(JSON.stringify(S, (k, v) => k === 'by' || k === 'supBy' ? null : v));
  for (const c of carriers()) { const n = c.stack.length, t = c.carryType;
    if (n) { if (t === 'crate') snap.pallet += n; else if (t === 'pipe') snap.pipes += n; else if (t === 'plank') snap.timber += n; else if (t === 'timber') snap.store += n; else if (t === 'coil') snap.coils += n; else if (t === 'toolbox') snap.tools += n; else if (t === 'bottle') snap.water += n; }
    if (c.tplanks && c.tplanks.length) snap.store += c.tplanks.length; }
  if (typeof fork !== 'undefined' && fork.stack.length) { if (fork.carryType === 'crate') snap.lv4.pallet2 += fork.stack.length; else snap.store += fork.stack.length; }
  snap.seenAt = Date.now();
  const s = JSON.stringify(snap);
  try { if (yt) yt.game.saveData(s).catch(() => {}); else localStorage.setItem(KEY, s); } catch(e){}
}

/* =====================================================================
   RENDERER, LIGHTS, CAMERA
   ===================================================================== */
const cv = $('cv');
const coarse = matchMedia('(pointer: coarse)').matches;
// MSAA only where pixels are big; on dense phone screens it costs more than it shows
const renderer = new THREE.WebGLRenderer({ canvas:cv, antialias:(devicePixelRatio || 1) < 2, powerPreference:'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#2c3a2c');
const hemi = new THREE.HemisphereLight('#d6e2ee', '#4a3d2e', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe6c4', 2.0), SUN_COL = new THREE.Color('#ffe6c4');
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const SH = 19; Object.assign(sun.shadow.camera, { left:-SH, right:SH, top:SH, bottom:-SH, near:1, far:70 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const SUN_OFF = new THREE.Vector3(-9, 20, 7);
// a tight depth range: the camera sits 50 m out, so 15..95 m covers everything on screen (overview shots
// included) and gives flat ground markings ~1.75x the depth precision of 0.1..140 on 16-bit phone depth buffers
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 15, 95);
const CAM_EL = THREE.MathUtils.degToRad(46), CAM_DIST = 50;
const VIEW_W = 8.8, VIEW_H = 10.5;   // build 0.16: pulled back so the wide yard reads like a site, not a room

/* =====================================================================
   TEXTURES (canvas)
   ===================================================================== */
function tex(w, h, draw, rep){
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function rng(seed){ return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
function noise(g, w, h, n, cols, size, r){ for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; const s = size * (.4 + r()); g.fillRect(r() * w, r() * h, s, s); } }
function blotches(g, w, h, n, col, r, rmin = 30, rmax = 120){ for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rad = rmin + r() * (rmax - rmin), gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, col.replace('A', (r() * .35 + .12).toFixed(2))); gr.addColorStop(1, col.replace('A', '0')); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } }
const PX = 80;
function floorTex(clean){
  return tex(15 * PX, 10 * PX, (g, w, h) => {
    const r = rng(17); g.fillStyle = clean ? '#9a958b' : '#857f74'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, clean ? 14 : 30, 'rgba(40,32,24,A)', r, 30, 110);
    blotches(g, w, h, 20, 'rgba(255,248,230,A)', r, 40, 120);
    noise(g, w, h, 16000, ['rgba(40,36,30,.3)', 'rgba(220,214,200,.22)'], 2, r);
    g.strokeStyle = 'rgba(30,27,22,.4)'; g.lineWidth = 2;
    for (let x = 2.5; x < 15; x += 2.5) { g.beginPath(); g.moveTo(x * PX, 0); g.lineTo(x * PX, h); g.stroke(); }
    for (let z = 2.5; z < 10; z += 2.5) { g.beginPath(); g.moveTo(0, z * PX); g.lineTo(w, z * PX); g.stroke(); }
    for (let i = 0; i < (clean ? 4 : 12); i++) { const x = r() * w, y = r() * h; g.save(); g.translate(x, y); g.scale(1, .6); const rad = 15 + r() * 45, sg = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      sg.addColorStop(0, 'rgba(15,12,8,.5)'); sg.addColorStop(1, 'rgba(15,12,8,0)'); g.fillStyle = sg; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.fill(); g.restore(); }
    if (!clean) { g.strokeStyle = 'rgba(20,18,15,.55)'; g.lineWidth = 1.5; for (let i = 0; i < 16; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (r() - .5) * 60; y += (r() - .5) * 40; g.lineTo(x, y); } g.stroke(); }
      // sawdust and debris
      noise(g, w, h, 900, ['rgba(190,150,90,.6)', 'rgba(150,110,60,.5)'], 3, r); }
    const y = clean ? 'rgba(232,171,44,.95)' : 'rgba(200,150,50,.25)';
    g.fillStyle = y; g.fillRect(.4 * PX, 4.5 * PX, 14.2 * PX, 7); g.fillRect(.4 * PX, 6.05 * PX, 3.9 * PX, 7); g.fillRect(7.4 * PX, 6.05 * PX, 7.2 * PX, 7);
    const zone = (x0, z0, x1, z1) => { g.setLineDash([16, 10]); g.strokeStyle = y; g.lineWidth = 5; g.strokeRect(x0 * PX, z0 * PX, (x1 - x0) * PX, (z1 - z0) * PX); g.setLineDash([]); };
    zone(6.6, 1.5, 9.6, 4.4); zone(.8, .8, 2.9, 3.0); zone(3.4, .6, 5.4, 3.2); zone(11.0, 1.9, 13.8, 3.6);
    // dock hazard band
    for (let k = 0; k < 36; k++) { g.fillStyle = k % 2 ? (clean ? '#1d1b18' : 'rgba(29,27,24,.6)') : (clean ? '#e3a52a' : 'rgba(170,125,40,.6)'); const z = 3.6 * PX + k * 7.5; g.fillRect(14.6 * PX, z, .4 * PX, 7.5); }
  });
}
const TX = {};
function makeTextures(){
  TX.floorDirty = floorTex(false); TX.floorClean = floorTex(true);
  TX.brick = tex(512, 256, (g, w, h) => { const r = rng(3); g.fillStyle = '#4a3a33'; g.fillRect(0, 0, w, h);
    for (let row = 0; row * 18 < h; row++) for (let col = -1; col * 50 < w; col++) { const x = col * 50 + (row % 2 ? 25 : 0); const b = [[146,62,48],[132,54,42],[154,72,55],[120,50,40],[138,66,52]][Math.floor(r() * 5)], k = .82 + r() * .26;
      g.fillStyle = `rgb(${b[0] * k | 0},${b[1] * k | 0},${b[2] * k | 0})`; g.fillRect(x + 2, row * 18 + 2, 46, 14); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, row * 18 + 13, 46, 3); }
    blotches(g, w, h, 12, 'rgba(20,16,12,A)', r, 20, 80); }, [1, 1]);
  TX.grass = tex(256, 256, (g, w, h) => { const r = rng(5); g.fillStyle = '#56733c'; g.fillRect(0, 0, w, h); blotches(g, w, h, 30, 'rgba(90,120,55,A)', r, 10, 50); blotches(g, w, h, 20, 'rgba(50,70,30,A)', r, 10, 50);
    noise(g, w, h, 5000, ['rgba(120,150,70,.5)', 'rgba(40,60,25,.5)', 'rgba(150,160,80,.35)'], 2, r); }, [24, 24]);
  TX.dirt = tex(256, 256, (g, w, h) => { const r = rng(9); g.fillStyle = '#7a6448'; g.fillRect(0, 0, w, h); blotches(g, w, h, 25, 'rgba(60,45,30,A)', r, 10, 60);
    noise(g, w, h, 4000, ['rgba(150,125,90,.5)', 'rgba(50,38,25,.5)', 'rgba(90,110,50,.4)'], 3, r); }, [3, 5]);
  TX.gravel = tex(256, 256, (g, w, h) => { const r = rng(11); g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h); noise(g, w, h, 9000, ['rgba(60,58,54,.5)', 'rgba(200,196,188,.5)', 'rgba(120,110,95,.5)'], 3, r); }, [3, 5]);
  TX.asphalt = tex(256, 256, (g, w, h) => { const r = rng(13); g.fillStyle = '#3d3f42'; g.fillRect(0, 0, w, h); noise(g, w, h, 7000, ['rgba(20,20,22,.5)', 'rgba(110,110,112,.35)'], 2, r); blotches(g, w, h, 10, 'rgba(15,15,15,A)', r, 20, 70); }, [2, 20]);
  TX.concrete = tex(256, 256, (g, w, h) => { const r = rng(15); g.fillStyle = '#8b877e'; g.fillRect(0, 0, w, h); blotches(g, w, h, 16, 'rgba(40,36,30,A)', r, 20, 80); noise(g, w, h, 5000, ['rgba(40,36,30,.3)', 'rgba(220,214,200,.25)'], 2, r);
    g.strokeStyle = 'rgba(40,36,30,.5)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, [3, 8]);
  TX.wood = tex(256, 256, (g, w, h) => { const r = rng(21); for (let i = 0; i < 8; i++) { g.fillStyle = `rgb(${130 + r() * 30 | 0},${90 + r() * 20 | 0},${55 + r() * 15 | 0})`; g.fillRect(0, i * 32, w, 31); g.fillStyle = 'rgba(40,25,10,.5)'; g.fillRect(0, i * 32 + 31, w, 1); }
    noise(g, w, h, 3000, ['rgba(60,35,15,.25)', 'rgba(220,180,130,.15)'], 2, r); }, [3, 3]);
  TX.lino = tex(128, 128, (g, w) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#8d8572' : '#6e6656'; g.fillRect(i * 32, j * 32, 32, 32); } }, [4, 4]);
  TX.sign = tex(1024, 192, TX.signDraw = (g, w, h) => { g.fillStyle = '#20302a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8b24e'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ece6d9'; g.textAlign = 'center'; g.font = '700 86px Oswald, "Arial Narrow", Arial'; g.fillText(signName().toUpperCase(), w / 2, 104); g.font = '600 38px Oswald, Arial'; g.fillStyle = '#d8b24e'; g.fillText('EST. 1921 · MILL ROAD · IRON VALLEY', w / 2, 160); });
  TX.wallSign = tex(1024, 128, TX.wallDraw = (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ece6d9'; g.font = '700 92px Oswald, "Arial Narrow", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(signName().toUpperCase(), w / 2, h / 2 + 4);
    const r = rng(4); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${.3 + r() * .7})`; g.fillRect(r() * w, r() * h, 2 + r() * 12, 1 + r() * 4); } });
  TX.sale = tex(512, 256, (g, w, h) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#b3261e'; g.fillRect(0, 0, w, 70); g.fillStyle = '#ece6d6'; g.font = '700 54px Oswald, Arial'; g.textAlign = 'center'; g.fillText('FOR SALE', w / 2, 54);
    g.fillStyle = '#2c2621'; g.font = '600 38px Oswald, Arial'; g.fillText('Industrial plot', w / 2, 130); g.font = '500 30px Barlow, Arial'; g.fillText('Ask the estate agent', w / 2, 180); g.fillText('Opens at Level 3', w / 2, 224); });
  TX.plot = tex(512, 256, (g, w, h) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f6c94'; g.fillRect(0, 0, w, 70); g.fillStyle = '#ece6d6'; g.font = '700 50px Oswald, Arial'; g.textAlign = 'center'; g.fillText('EXPANSION PLOT', w / 2, 52);
    g.fillStyle = '#2c2621'; g.font = '600 40px Oswald, Arial'; g.fillText('Pipe mill site', w / 2, 140); g.font = '500 32px Barlow, Arial'; g.fillText('Builds at Level 2', w / 2, 196); });
  TX.pool = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.9)'); gr.addColorStop(.5, 'rgba(255,190,110,.35)'); gr.addColorStop(1, 'rgba(255,180,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  TX.blob = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(.6, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  TX.dot = tex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
}
function padTex(icon){
  return tex(256, 256, (g) => {
    g.fillStyle = 'rgba(20,22,25,.85)'; g.beginPath(); g.roundRect(12, 12, 232, 232, 28); g.fill();
    g.setLineDash([26, 16]); g.strokeStyle = '#e8ab2c'; g.lineWidth = 12; g.beginPath(); g.roundRect(12, 12, 232, 232, 28); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ece6d9'; g.strokeStyle = '#ece6d9'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
    const P2 = new Path2D(ICON_PATHS[icon] || ICON_PATHS.bolt); g.save(); g.translate(56, 56); g.scale(6, 6); g.lineWidth = 2; g.stroke(P2); g.restore();
  });
}

/* =====================================================================
   ICONS (SVG paths on a 24-unit grid, stroked)
   ===================================================================== */
const ICON_PATHS = {
  saw:'M4 14h16M6 14l2-6h8l2 6M12 8V4M9 18h6', bolt:'M13 2L4 14h7l-1 8 9-12h-7z', hand:'M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10V5a1.5 1.5 0 0 1 3 0v6M16 9a1.5 1.5 0 0 1 3 0v4c0 4-3 7-7 7s-6-2-7-5l-2-4a1.5 1.5 0 0 1 2.6-1.4L7 13',
  boxes:'M3 13h8v8H3zM13 13h8v8h-8zM8 3h8v8H8z', truck:'M2 6h12v10H2zM14 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1', boot:'M7 3h5v9l7 3v4H5V3M5 15h14',
  back:'M6 21V11l6-4 6 4v10M9 21v-6h6v6', bulb:'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z', brush:'M14 4l6 6-8 8-6-6zM6 12l-3 3c-1 1 0 5 3 5 1 0 3-1 3-3',
  cup:'M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3', window:'M4 4h16v16H4zM12 4v16M4 12h16', broom:'M18 3l-7 9M7 11l6 4-3 6-7-4z',
  gear:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2', box:'M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9',
  zzz:'M4 5h6l-6 7h6M13 12h5l-5 6h5', wrench:'M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z', walk:'M13 4a1.5 1.5 0 1 0 0 .1M10 21l2-6 3 3v3M9 12l3-4 4 3 3 1M12 8l-1 5',
  wait:'M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', people:'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 21c0-4 3-6 7-6s7 2 7 6M17 4a3.5 3.5 0 0 1 0 7M19 15c2 1 3 3 3 6',
  clip:'M8 4h8v3H8zM6 6H5v15h14V6h-1M8 12h8M8 16h5', coins:'M12 6c4 0 7-1 7-2s-3-2-7-2-7 1-7 2 3 2 7 2zM5 4v5c0 1 3 2 7 2s7-1 7-2V4M5 9v5c0 1 3 2 7 2s7-1 7-2V9M5 14v4c0 1 3 2 7 2s7-1 7-2v-4',
  alert:'M12 3l10 18H2zM12 10v5M12 18v.5', lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', star:'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z', pipe:'M3 9h14a4 4 0 0 1 0 8H3zM3 9v8',
};
const icon = (n, col = 'currentColor', w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[n]}"/></svg>`;
Object.assign(ICON_PATHS, {
  drop:'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z', phone:'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', help:'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V15M12 18v.5',
  sign:'M4 20h16M6 16l9-9 3 3-9 9H6zM13 9l3 3', alert:'M12 3L2 20h20zM12 9v5M12 17v.5', wc:'M6 3h12v18H6zM14 12h1M9 7h6',
});

/* =====================================================================
   MODELS
   ===================================================================== */
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const A = {}, PROTO = {};
function b64(name){ const bin = atob(window.IV_MODELS[name]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
// models load by level (strategy doc: assets loaded by level). The artifact build packs them as base64 in
// models.js; the Playables bundle ships the .glb files and fetches each one when its level needs it.
const LEVEL_MODELS = { 1:['saw_bench', 'generator', 'truck', 'props', 'env', 'site', 'yard', 'facilities', 'worker', 'owner'], 2:['pipe_machine', 'level2'], 3:['tool_press', 'level3'], 4:['level4'], 5:['level5'] };
async function modelBytes(n){
  if (window.IV_MODELS && window.IV_MODELS[n]) return b64(n);
  const r = await fetch(`models/${n}.glb`); if (!r.ok) throw new Error(`model ${n}: ${r.status}`); return r.arrayBuffer();
}
async function loadModels(names){
  await MeshoptDecoder.ready;
  const todo = names.filter(n => !A[n]);
  await Promise.all(todo.map(async n => { const buf = await modelBytes(n); A[n] = await new Promise((ok, bad) => loader.parse(buf, '', ok, bad)); }));
  for (const n of todo) { A[n].scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (['props', 'env', 'site', 'yard', 'level2', 'level3', 'level4', 'level5', 'facilities'].includes(n)) A[n].scene.traverse(o => { if (/^(prop|env|site|l2|l3|l4|l5|fac)_/.test(o.name) && !o.isMesh && !PROTO[o.name]) PROTO[o.name] = o; }); }
}
const ensureModels = lv => loadModels(Object.entries(LEVEL_MODELS).filter(([k]) => +k <= lv).flatMap(([, v]) => v));
function inst(name){ const p = PROTO[name]; if (!p) throw new Error('missing model ' + name); const o = p.clone(true); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); return o; }
const world = new THREE.Group(); scene.add(world);
function put(o, x, z, ry = 0, y = 0, s = 1){ o.position.set(x, y, z); o.rotation.y = ry; if (s !== 1) o.scale.setScalar(s); world.add(o);
  if (window.__ivLint) { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); if (isFinite(bb.min.x)) (window.__ivLintObj = window.__ivLintObj || []).push(o); window.__ivLint.push({ name:o.name || (o.children[0] && o.children[0].name) || '?', at:[+x.toFixed(2), +z.toFixed(2)], box:[bb.min.x, bb.min.z, bb.max.x, bb.max.z].map(v => +v.toFixed(2)), h:+bb.max.y.toFixed(2) }); }   // layout checker (tools/layout_lint.mjs)
  return o; }
const blobMat = () => new THREE.MeshBasicMaterial({ map:TX.blob, transparent:true, depthWrite:false });
function blob(w, d){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), blobMat()); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 2; return m; }
const findNode = (o, pre) => { let r = null; o.traverse(x => { if (!r && x.name.startsWith(pre)) r = x; }); return r; };

/* =====================================================================
   COLLISION + NAV
   ===================================================================== */
const COL = new Map();
let colSeq = 0;
const addCol = (r, id) => { const k = id || 'c' + (colSeq++); COL.set(k, r); return k; };
// where the crew never plan a walk: the lorries' and the car's turning ground between bays 1-2 and the front fence
// (the lorry gateway). Nobody is pushed out of it; walking routes just go round (to goods-in through the canopy)
const NAVOUT = [[13.95, 9.97, 22.45, 12.45]];   // from the end of the dock and the bays' tails to the front fence
function segBlocked(ax, az, bx, bz, pad){
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.15);
  for (let i = 1; i < n; i++) { const t = i / n, x = lerp(ax, bx, t), z = lerp(az, bz, t);
    for (const [k, [x0, z0, x1, z1]] of COL) { if (k === 'truck' || k === 'supply') continue; if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) return true; }
    for (const [x0, z0, x1, z1] of NAVOUT) if (x > x0 && x < x1 && z > z0 && z < z1 && !(ax > x0 && ax < x1 && az > z0 && az < z1)) return true; }
  return false;
}
// a lorry has just parked: anybody whose way ran through its bay takes another way round
function repathAround(){
  for (const c of [...staffObj.values(), ...folk.values()]) { if (!c.path || !c.path.length || !c.o.visible) continue;
    let px = c.o.position.x, pz = c.o.position.z, hit = false; for (const q of c.path) { if (lorryBlocked(px, pz, q[0], q[1])) { hit = true; break; } px = q[0]; pz = q[1]; }
    if (hit) { const g = c.goal || c.path[c.path.length - 1]; c.path = findPath(c.o.position.x, c.o.position.z, g[0], g[1]); c.wd = null; } }
}
// only the parked lorry and flatbed (bays 1 and 2): checked when a path is asked for, since they come and go
function lorryBlocked(ax, az, bx, bz){
  // a bay counts as closed from the moment its lorry starts backing in; vehTmp: a stopped vehicle somebody is walking round
  const t1 = COL.get('truck') || (truck.state === 'arrive' ? TRUCK_BOX : null), t2 = COL.get('supply') || (sup.state === 'arrive' ? SUP_BOX : null), t3 = COL.get('vehTmp');
  for (const b of [t1, t2, t3]) { if (!b) continue; const x0 = b[0] - .3, z0 = b[1] - .3, x1 = b[2] + .3, z1 = b[3] + .3;
    if (ax > x0 && ax < x1 && az > z0 && az < z1) continue;   // already inside one: the way out is open
    if (segHitsBox(ax, az, bx, bz, x0, z0, x1, z1)) return true; }
  return false;
}
// does the segment a-b cross the box (slab test: exact and cheap, so it can run on every edge of a path search)
function segHitsBox(ax, az, bx, bz, x0, z0, x1, z1){
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, d, lo, hi] of [[ax, dx, x0, x1], [az, dz, z0, z1]]) {
    if (Math.abs(d) < 1e-9) { if (p <= lo || p >= hi) return false; continue; }
    let a = (lo - p) / d, b = (hi - p) / d; if (a > b) { const k = a; a = b; b = k; } if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return false; }
  return true;
}
const NAV = [];
function buildNav(){
  NAV.length = 0;
  // the spots people walk to, the doorways, and a point off each corner of every obstacle (build 0.16: no hand-placed graph)
  const pts = [P.timberRing, P.feedRing, P.op, [P.pallet[0] + 0.1, P.pallet[1] + 0.85], ...P.seats, P.cash, P.frontIn, P.frontOut, P.boardSpot, P.genFix, P.filler, P.pump,
    P.jboxSpot, P.sawFix, P.mechHome, P.elecHome, ...P.patrol, P.storeSpot, P.unload, P.drop, P.deskRing, P.coolerSpot, P.bottleSpot, P.cleanerHome, P.wcCleanSpot, P.loaderWait, P.dockWait, ...P.sweep, ...P.wait,
    [20.6, -2.6], [20.6, 0.4], [22.45, 3.4], [22.4, 5.2], [P.wsDoor[0], P.wsDoor[1] + 1.0], [P.wsDoor[0], P.wsDoor[1] - .9], [P.workshop[0] - 2.6, P.workshop[1] + .2], [P.dock[0] - 6.0, P.dock[1] - 1.2], [P.dock[0] - 6.8, P.dock[1] - 1.2], [P.canopy[0] - 4.2, P.canopy[1] + 3.4]];   // two points on the ramp's centre line below its foot: walkers and trolleys line up before they climb
  if (M.scrapOpen) pts.push([-15.0, 5.1], [-15.0, -0.45], [-16.6, 8.2], [-20.0, 8.6], [-22.6, 6.6], [-24.4, 1.2], [-20.0, -2.4], [-16.4, -2.6]);
  if (S.level === 4 && M.forkLane) pts.push(...LANE4.pts.filter(q => groundY(q[0], q[1]) < .02));
  if (S.level >= 4 && M.l4Built) pts.push(P.feed2Ring, P.forkFeed2, P.saw2Fix, P.forkPark, P.forkHome, P.stallRing, P.forkDock, P.forkStore, P.forkWh, ...(P.op2 ? [P.op2] : []), ...(P.fork2 ? [P.fork2] : []));
  if (S.level >= 5 && M.l5Built) pts.push(P.drop2, P.coil2Ring, P.rack2Spot, P.mill2Fix, PLOTS.shop.ring, P.officeDoor, P.crossS, [P.crossS[0] + 1.1, P.office[1] + 3.3], [P.crossS[0] + 1.1, P.crossS[1] + .4], [14.6, 18.6], [14.6, 19.9], [DK2[0] - 6.0, DK2[1] - 1.2], [DK2[0] - 6.8, DK2[1] - 1.2], ...(P.pop2 ? [P.pop2] : []));   // the zebra, round the office to its door, the plot's wicket, dock 2's ramp foot
  if (S.level >= 2) pts.push(P.whSpotC, P.whSpotP, P.whSpotT, P.whBuild, P.pfeedRing, P.pfix, P.prackSpot, P.coilSpot, ...(P.pop ? [P.pop] : []));
  if (S.level >= 3 && S.lv3.field) pts.push(P.tfeedRing, P.tfix, P.trackSpot, P.pressBuild, ...(P.top ? [P.top] : []));
  const lim = siteBounds(), pd = .42;
  for (const [k, [x0, z0, x1, z1]] of COL) { if (k === 'truck' || k === 'supply' || (x1 - x0 < .4 && z1 - z0 < .4)) continue;
    pts.push([x0 - pd, z0 - pd], [x1 + pd, z0 - pd], [x0 - pd, z1 + pd], [x1 + pd, z1 + pd]); }
  const inBox = (x, z, pad) => { for (const [k, [x0, z0, x1, z1]] of COL) { if (k === 'truck' || k === 'supply') continue; if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) return true; } return NAVOUT.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1); };
  for (const p of pts) { if (!p) continue; const [x, z] = p; if (x < lim[0] - .01 || x > lim[1] + .01 || z < lim[2] - .01 || z > lim[3] + .01) continue;
    if (inBox(x, z, .12) || NAV.some(n => Math.hypot(n.x - x, n.z - z) < .45)) continue; NAV.push({ x, z, nb:[] }); }
  for (let i = 0; i < NAV.length; i++) for (let j = i + 1; j < NAV.length; j++) { const a = NAV[i], b = NAV[j];
    if (Math.hypot(a.x - b.x, a.z - b.z) < 9 && !segBlocked(a.x, a.z, b.x, b.z, 0.18)) { a.nb.push(j); b.nb.push(i); } }
}
// where anyone may walk: inside the fence, plus the land bought next door
function siteBounds(){ const l5 = S.level >= 5 && M.l5Built;
  return [S.l8 && S.l8.pad === 'C' ? -33.2 : M.scrapOpen ? -25.6 : SITE.x0 + .35, l5 ? CORNER[2] - .3 : SITE.x1 - .35, S.lv3.field ? -20.6 : SITE.z0 + .35, l5 ? CORNER[3] - .3 : SITE.z1 - .35]; }
const rebuildNav = () => buildNav();
function nearestVisible(x, z){ let best = -1, bd = 1e9; NAV.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd && !segBlocked(x, z, n.x, n.z, 0.12)) { bd = d; best = i; } });
  if (best < 0) NAV.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = i; } }); return best; }
function findPath(x, z, tx, tz){
  if (!segBlocked(x, z, tx, tz, 0.15) && !lorryBlocked(x, z, tx, tz)) return [[tx, tz]];
  const s = nearestVisible(x, z), t = nearestVisible(tx, tz); if (s < 0 || t < 0) return [[tx, tz]];
  const g = new Map([[s, 0]]), came = new Map(), open = new Set([s]);
  const h = i => Math.hypot(NAV[i].x - NAV[t].x, NAV[i].z - NAV[t].z);
  while (open.size) { let cur = -1, bf = 1e9; for (const i of open) { const f = g.get(i) + h(i); if (f < bf) { bf = f; cur = i; } }
    if (cur === t) break; open.delete(cur);
    for (const nb of NAV[cur].nb) { if (lorryBlocked(NAV[cur].x, NAV[cur].z, NAV[nb].x, NAV[nb].z)) continue; const ng = g.get(cur) + Math.hypot(NAV[cur].x - NAV[nb].x, NAV[cur].z - NAV[nb].z); if (!g.has(nb) || ng < g.get(nb)) { g.set(nb, ng); came.set(nb, cur); open.add(nb); } } }
  if (s !== t && !came.has(t)) { let b = s, bh = h(s); for (const i of g.keys()) if (h(i) < bh) { bh = h(i); b = i; }
    const part = [[NAV[b].x, NAV[b].z]]; let k = b; while (came.has(k) && k !== s) { k = came.get(k); part.unshift([NAV[k].x, NAV[k].z]); }
    const res = [...part, [tx, tz]]; res.cut = true; return res; }   // the last leg is blocked: walk() waits at the nearest point and asks again
  const path = [[tx, tz]]; let c = t; while (c !== undefined) { path.unshift([NAV[c].x, NAV[c].z]); c = came.get(c); if (c === s) { path.unshift([NAV[s].x, NAV[s].z]); break; } }
  if (s === t) path.splice(0, path.length, [NAV[s].x, NAV[s].z], [tx, tz]);
  // smooth: never walk back to a waypoint when a later one is already in plain sight
  while (path.length > 1 && !segBlocked(x, z, path[1][0], path[1][1], .15) && !lorryBlocked(x, z, path[1][0], path[1][1])) path.shift();
  return path;
}
const RAD = 0.27;
// 'bounds': the owner is kept inside the fence line; the crew are kept out of walls and fences by the boxes alone, so a
// push in the gateway (or on the road at clock-in) can never snap a worker through the fence (build 0.18e)
function collide(p, bounds = true){
  for (const [x0, z0, x1, z1] of COL.values()) {
    const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1), dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < RAD) { if (d > 1e-4) { p.x = cx + dx / d * RAD; p.z = cz + dz / d * RAD; }
      else { const o = [[p.x - x0, -1, 0], [x1 - p.x, 1, 0], [p.z - z0, 0, -1], [z1 - p.z, 0, 1]].sort((a, b) => a[0] - b[0])[0]; p.x += o[1] * (o[0] + RAD); p.z += o[2] * (o[0] + RAD); } }
  }
  if (!bounds) return; const b = siteBounds(); p.x = clamp(p.x, b[0], b[1]); p.z = clamp(p.z, b[2], b[3]);
}

/* =====================================================================
   WORLD BUILD
   ===================================================================== */
const M = {};
// ground markings lie a few mm over the ground; on phones with a 16-bit depth buffer that is too close to
// resolve and they blink as the camera moves (build 0.14: the yard's yellow bays). decal() pulls a flat
// material towards the camera in depth, by layer, so it always wins over whatever it is painted on.
function decal(mat, layer = 1){ mat.polygonOffset = true; mat.polygonOffsetFactor = -layer; mat.polygonOffsetUnits = -4 * layer; return mat; }
function plane(w, d, mat, x, z, y = 0){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; world.add(m); return m; }
function box(w, h, d, mat, x, y, z, cast = true){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; world.add(m); return m; }
// identical plain materials are shared, so the static batcher can merge everything that uses them
const MATS = new Map();
const lam = (c, extra) => { if (extra) return new THREE.MeshLambertMaterial(Object.assign({ color:c }, extra)); const k = 'l' + c; return MATS.get(k) || MATS.set(k, new THREE.MeshLambertMaterial({ color:c })).get(k); };
const std = (c, r = .8, m = 0, extra) => { if (extra) return new THREE.MeshStandardMaterial(Object.assign({ color:c, roughness:r, metalness:m }, extra)); const k = `s${c}|${r}|${m}`; return MATS.get(k) || MATS.set(k, new THREE.MeshStandardMaterial({ color:c, roughness:r, metalness:m })).get(k); };
const V = a => new THREE.Vector3(a[0], a[1], a[2]);

function brickWall(x0, z0, x1, z1, h){
  const t = TX.brick.clone(); t.needsUpdate = true; t.repeat.set(Math.max(x1 - x0, z1 - z0) / 3.2, h / 1.6);
  const w = box(x1 - x0, h, z1 - z0, std('#ffffff', .9, 0, { map:t }), (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  box(x1 - x0 + .08, .1, z1 - z0 + .08, std('#8a877f', .9), (x0 + x1) / 2, h + .05, (z0 + z1) / 2);
  box(x1 - x0 + .04, .32, z1 - z0 + .04, std('#6d6a63', .95), (x0 + x1) / 2, .16, (z0 + z1) / 2);
  addCol([x0, z0, x1, z1]); return w;
}
// a collision box from an object's real size, so props never need hand-measured boxes
function colOf(o, pad = 0, id, shrink = 0){ o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o);
  return addCol([b.min.x - pad + shrink, b.min.z - pad + shrink, b.max.x + pad - shrink, b.max.z + pad - shrink], id); }
// a flat painted label or board: canvas text on a plane
function textTex(lines, w, h, o = {}){
  return tex(w, h, (g) => { if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.bw || 8; g.strokeRect(o.bw / 2 || 4, o.bw / 2 || 4, w - (o.bw || 8), h - (o.bw || 8)); }
    g.fillStyle = o.fg || '#ece6d9'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(([t, size, y, font]) => { g.font = `${font || 700} ${size}px Oswald, Arial`; let s = size; while (g.measureText(t).width > w * .92 && s > 8) { s -= 2; g.font = `${font || 700} ${s}px Oswald, Arial`; } g.fillText(t, w / 2, y); }); });
}
function board(texture, w, h, transparent = false){ return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:texture, transparent })); }
// yellow dashed outline painted on the ground (the concept's machine pads)
function paintMat(col, op = 1){ const k = 'paint' + col + op; if (MATS.has(k)) return MATS.get(k);
  const t = tex(16, 64, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.28, 'rgba(255,255,255,1)'); gr.addColorStop(.72, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [1, 1]);
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  const m = new THREE.MeshLambertMaterial({ color:col, map:t, transparent:true, depthWrite:false, opacity:op }); MATS.set(k, m); return m; }
function paintStrip(x, z, len, wdt, along, mat){ const g = new THREE.PlaneGeometry(wdt * 1.8, len); const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; if (along === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, .024, z); m.renderOrder = 5; m.userData.dyn = true; world.add(m); return m; }
function dashRect(x0, z0, x1, z1, mat, dash = .55, gap = .35, wdt = .1){
  const run = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / (dash + gap)); const ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let i = 0; i <= n; i++) { const s = i * (dash + gap), e = Math.min(L, s + dash); if (e <= s) continue; const cx = ax + ux * (s + e) / 2, cz = az + uz * (s + e) / 2;
      const m = paintStrip(cx, cz, e - s, wdt, Math.abs(ux) > .5 ? 'x' : 'z', mat.isPaint ? mat : paintMat('#' + mat.color.getHexString())); M.dashes.push(m); } };
  run(x0, z0, x1, z0); run(x1, z0, x1, z1); run(x1, z1, x0, z1); run(x0, z1, x0, z0);
}
function groundLabel(text, x, z, w, rot = 0, col = '#e9d58a'){
  const t = textTex([[text, 46, 34]], 512, 68, { fg:col }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 68 / 512), decal(new THREE.MeshBasicMaterial({ map:t, transparent:true, depthWrite:false, opacity:.85 }), 3));
  m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, .026, z); m.renderOrder = 6; m.userData.dyn = true; world.add(m); return m;
}
// buildings fade their roof (and the wall facing the camera) while the owner is inside or hidden behind them
M.fade = [];
function fadeGroup(root, names, box){ const nodes = names.map(n => findNode(root, n)).filter(Boolean); M.fade.push({ nodes, box, on:true }); return nodes; }
// a painted board at a building's sign anchor (world space); it fades with the wall it hangs on
// v2.0 2.5: the company name is repainted on every sign when it changes (Workshop -> Manufacturing at Level 5)
// v2.0 18.5 owner skills: a point with each level-up, three ranks each
const SKILLS = [['walk', 'Brisk walk', r => `You walk ${r * 10}% faster`], ['arms', 'Strong arms', r => `Trolley loads of ${[4, 8, 12, 16][r]}`], ['deals', 'Sharp deals', r => `Land ${r * 5}% cheaper`], ['name', 'Good name', r => `Reputation losses ${[0, 20, 35, 50][r]}% smaller`]];
function learnSkill(k){ if (!(S.skillPts > 0) || (S.skills[k] || 0) >= 3) return; S.skillPts--; S.skills[k] = (S.skills[k] || 0) + 1; sfx('levelup', .5); toast(`${SKILLS.find(x => x[0] === k)[1]} rank ${S.skills[k]}.`, 'gold'); save(); renderOffice(); }
function skillsHtml(){ return `<div class="dept"><div class="dept-h"><span class="ic">${icon('star')}</span><div><b>Owner skills</b><small>A point with each level-up · ${S.skillPts || 0} to spend</small></div></div>${SKILLS.map(([k, n, f]) => { const r = S.skills[k] || 0;
  return `<div class="up"><span class="ic">${icon('star')}</span><div><b>${n}</b><span class="pips">${[0, 1, 2].map(i => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</span></div>${r >= 3 ? '<span class="note">Mastered</span>' : `<button class="btn primary" data-skill="${k}" type="button" ${S.skillPts > 0 ? '' : 'disabled'}>Learn</button>`}<p>${r ? f(r) : f(1) + ' at rank 1'}.</p></div>`; }).join('')}</div>`; }
// v2.0 18.6 trophies: lifetime totals in the office cabinet (from Level 6)
function trophiesHtml(){ if (S.level < 6) return ''; return `<div class="dept"><div class="dept-h"><span class="ic">${icon('star')}</span><div><b>Trophy cabinet</b><small>Lifetime totals since the gates opened again</small></div></div><div class="kv"><span>Crates shipped</span><span>${S.shipped}</span><span>Pipes shipped</span><span>${S.pshipped}</span><span>Tools shipped</span><span>${S.tshipped}</span>${S.l8 && S.l8.shipped ? `<span>Beams shipped</span><span>${S.l8.shipped}</span>` : ''}<span>Lorries delivered</span><span>${S.delivered} (${S.ontime} on time)</span><span>Faults fixed</span><span>${S.fixed}</span><span>Cash earned</span><span>${fmt(S.earned)}</span><span>Levels passed</span><span>${S.level - 1}</span></div></div>`; }
function repaintSigns(){
  for (const [t, draw] of [[TX.sign, TX.signDraw], [TX.wallSign, TX.wallDraw]]) { if (!t || !draw) continue; const c = t.image, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height); t.needsUpdate = true; }
  if (M.wsSign) { M.wsSign.material.map = textTex([[signName().toUpperCase() + ' · EST. 1921', 74, 52]], 1024, 104, { fg:'#ecdcb4' }); M.wsSign.material.needsUpdate = true; }
  if (M.millSign) { M.millSign.removeFromParent(); M.millSign = null; putSign(); }
  if (M.carSigns) { for (const s of M.carSigns) s.removeFromParent(); M.carSigns = null; applyRestore('car', false); }
}
function signAt(root, wall, texture, w, h, transparent){ const a = findNode(root, 'sign_spot'); if (!a) return; root.updateMatrixWorld(true);
  const m = board(texture, w, h, transparent); a.getWorldPosition(m.position); m.position.z += .03; m.userData.dyn = true; world.add(m);
  if (wall) { const f = M.fade.find(f => f.nodes.includes(findNode(root, wall))); if (f) f.nodes.push(m); } return m; }
function updateFade(){
  if (!owner) return; const x = owner.o.position.x, z = owner.o.position.z, dt = Math.min(.05, clock ? .016 : .016);
  for (const f of M.fade) { const [x0, z0, x1, z1] = f.box, m = f.inside ? .45 : -.35;           // enter well inside, leave well outside
    f.inside = x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
    const want = f.inside ? 0 : 1; f.a = f.a ?? 1; if (Math.abs(f.a - want) < .001) continue;
    f.a = want > f.a ? Math.min(want, f.a + .08) : Math.max(want, f.a - .08);
    if (!f.mats) { f.mats = []; for (const n of f.nodes) n.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); f.mats.push(o.material); } }); }
    for (const mt of f.mats) { mt.transparent = f.a < 1; mt.opacity = f.a; mt.depthWrite = f.a > .99; mt.needsUpdate = true; }
    for (const n of f.nodes) n.visible = f.a > .02; }
}
// ground detail: soft-edged patches (grass tufts, worn earth, oil, puddles) merged into one mesh per kind
function patchTex(seed, base, specks, soft = .55){
  return tex(128, 128, (g, w, h) => { const r = rng(seed); g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { const x = 30 + r() * 68, y = 30 + r() * 68, rad = 14 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, base.replace('A', soft)); gr.addColorStop(1, base.replace('A', 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
    if (specks) { const m = g.getImageData(0, 0, w, h); for (let i = 0; i < 900; i++) { const x = r() * w | 0, y = r() * h | 0, a = m.data[(y * w + x) * 4 + 3]; if (a < 40) continue; g.fillStyle = specks[i % specks.length]; g.fillRect(x, y, 2, 2 + (r() * 3 | 0)); } } }, [1, 1]);
}
function scatter(texture, items, y, layer, opacity = 1){
  const geos = items.map(([x, z, w, d, rot = 0]) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.rotateY(rot); g.translate(x, y, z); return g; });
  const m = new THREE.Mesh(mergeGeometries(geos, false), decal(new THREE.MeshLambertMaterial({ map:texture, transparent:true, depthWrite:false, opacity }), layer));
  m.receiveShadow = true; m.renderOrder = layer; m.userData.dyn = true; world.add(m); return m;
}
function groundDetail(){
  const r = rng(77), R = (a, b) => a + r() * (b - a);
  TX.tuft = tex(128, 128, (g, w, h) => { const r = rng(21); g.clearRect(0, 0, w, h);   // tufts of grass blades growing out of the cracks
    const cols = ['#4f6a2c', '#5f7a32', '#6f8a3a', '#3f5a28', '#7d8f45'];
    for (let t = 0; t < 7; t++) { const cx = 28 + r() * 72, cy = 28 + r() * 72, n = 9 + (r() * 8 | 0);
      g.fillStyle = 'rgba(48,40,26,.35)'; g.beginPath(); g.ellipse(cx, cy, 7, 4, 0, 0, 7); g.fill();
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, L = 7 + r() * 13; g.strokeStyle = cols[i % cols.length]; g.lineWidth = 1.6 + r() * 1.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a) * L * .5 + (r() - .5) * 4, cy + Math.sin(a) * L * .5 + (r() - .5) * 4, cx + Math.cos(a) * L, cy + Math.sin(a) * L); g.stroke(); } } });
  TX.worn = patchTex(22, 'rgba(160,136,100,A)', null, .45);
  TX.oil = patchTex(23, 'rgba(20,18,16,A)', null, .5);
  TX.puddle = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(70,86,96,.75)'); gr.addColorStop(.7, 'rgba(58,70,76,.6)'); gr.addColorStop(1, 'rgba(40,34,26,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const tufts = [];
  for (let x = SITE.x0 + 1; x < SITE.x1 - 1; x += R(1.6, 3.2)) { tufts.push([x, SITE.z0 + R(.3, .9), R(1.2, 2.6), R(.8, 1.6), R(0, 3)]); if (x < 2.5 || x > 7.5 && (x < 15 || x > 20.5)) tufts.push([x, SITE.z1 - R(.3, .9), R(1.2, 2.6), R(.8, 1.6), R(0, 3)]); }
  for (let z = SITE.z0 + 1; z < SITE.z1 - 1; z += R(1.6, 3.2)) { tufts.push([SITE.x0 + R(.3, .9), z, R(.8, 1.6), R(1.2, 2.6), R(0, 3)]); tufts.push([SITE.x1 - R(.3, .9), z, R(.8, 1.6), R(1.2, 2.6), R(0, 3)]); }
  for (const [x, z] of [[2.6, -11.0], [-12.8, -1.0], [9.6, 10.6], [-7.6, 11.2], [12.6, -1.6], [23.0, -3.0], [-13.0, 10.6], [6.8, -2.0], [11.0, 11.2]]) tufts.push([x, z, R(1.4, 2.6), R(1.2, 2.2), R(0, 3)]);
  scatter(TX.tuft, tufts, .006, 1);
  const worn = [];
  const path = (a, b, w = 1.5) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 1.6); for (let i = 0; i <= n; i++) { const t = i / n; worn.push([lerp(a[0], b[0], t) + R(-.2, .2), lerp(a[1], b[1], t) + R(-.2, .2), w * R(.9, 1.3), w * R(.9, 1.3), R(0, 3)]); } };
  path(P.frontIn, [P.saw[0] + 1, P.saw[1] + 2.4]); path([P.wsDoor[0], P.wsDoor[1] + .8], [P.saw[0] - 1.5, P.saw[1] - 1.8]);
  path([P.pallet[0] + .5, P.pallet[1] + .5], [P.dock[0] - 5.6, P.dock[1] - 1.2], 1.7); path([P.gen[0] - 1, P.gen[1] + 1.4], [P.board[0] + .8, P.board[1] + 1.5], 1.2);
  scatter(TX.worn, worn, .01, 2, .9);
  scatter(TX.oil, [[P.gen[0], P.gen[1] + .3, 2.4, 2.0], [P.saw[0] + .3, P.saw[1] + .2, 2.2, 1.6, 1], [P.truck[0], P.truck[1] - .6, 1.8, 3.0], [P.tank[0], P.tank[1] + .6, 1.6, 2.2], [P.drop[0] + .6, P.drop[1] - .4, 1.2, 1.0]], .014, 3, .8);
  scatter(TX.puddle, [[11.0, 1.2, 2.2, 1.3, .3], [-8.0, 6.6, 1.8, 1.1, 1.2], [6.6, 8.6, 1.5, .9, 2.1], [21.0, 10.4, 2.0, 1.2, .6], [-1.6, 10.6, 1.4, .9, 2.8]], .018, 4, .85);
}
function buildWorld(){
  M.dashes = [];
  // ground: meadow outside, a worn dirt yard with a concrete working floor in the middle, the back yard rough
  const groundLayer = (m, k) => { const mt = m.material.clone(); mt.polygonOffset = true; mt.polygonOffsetFactor = k; mt.polygonOffsetUnits = k * 2; m.material = mt; m.userData.dyn = true; return m; };   // k: how far back it is pushed
  groundLayer(plane(220, 220, std('#ffffff', 1, 0, { map:TX.grass }), 5, 0, -0.08), 6); TX.grass.repeat.set(55, 55);
  const yard = TX.dirt.clone(); yard.needsUpdate = true; yard.repeat.set(9, 6);
  groundLayer(plane(SITE.x1 - SITE.x0 + .6, SITE.z1 - SITE.z0 + .6, std('#ffffff', 1, 0, { map:yard }), (SITE.x0 + SITE.x1) / 2, (SITE.z0 + SITE.z1) / 2, -0.06), 4);
  const conc = TX.concrete.clone(); conc.needsUpdate = true; conc.repeat.set(7.6, 4.9);
  plane(SITE.x1 - SITE.x0, SITE.z1 - SITE.z0, std('#ffffff', .95, 0, { map:conc }), (SITE.x0 + SITE.x1) / 2, (SITE.z0 + SITE.z1) / 2, -0.035);                  // the working floor, grandfather's concrete
  const gv = TX.gravel.clone(); gv.needsUpdate = true; gv.repeat.set(2, 3);
  { const dx0 = P.truck[0] - 2.6 - .6, dx1 = P.bay2[0] + 1.75 + .6, gd = TX.gravel.clone(); gd.needsUpdate = true; gd.repeat.set((dx1 - dx0) / 2.8, 3);   // the lorry drive out to the road: gravelled from pillar to pillar (both
    groundLayer(plane(dx1 - dx0, 6.0, std('#ffffff', 1, 0, { map:gd }), (dx0 + dx1) / 2, 13.6, -0.045), 2); }                           // docks' gateway), so neither pillar stands in the grass
  groundLayer(plane(5.2, 4.4, std('#ffffff', 1, 0, { map:gv }), 5.0, 14.4, -0.045), 2);                          // the front gate
  // the back yard (charter: clear it): rough ground and junk, gravelled once cleared
  M.yardDirt = plane(14.6, 9.2, std('#ffffff', 1, 0, { map:TX.dirt }), 16.2, -7.0, -0.015);
  M.yardGravel = plane(14.6, 9.2, std('#ffffff', 1, 0, { map:TX.gravel }), 16.2, -7.0, -0.015); M.yardGravel.visible = false; M.yardDirt.userData.dyn = M.yardGravel.userData.dyn = true;
  M.dashMat = paintMat('#e3b23c'); M.dashMat.isPaint = true;
  const d0 = M.dashes.length; dashRect(10.0, -11.0, 22.6, -3.0, M.dashMat, .7, .45, .14);
  M.labels = [groundLabel('CLEAR YARD  $400', 16.3, -6.9, 4.4, 0, '#efe4c4')]; M.yardMarks = [...M.dashes.slice(d0), M.labels[0]];
  // road, kerbs, verge (east-west past the front gate)
  plane(140, 3.9, std('#ffffff', 1, 0, { map:TX.asphalt }), 5, ROAD_Z, -0.02).material.map.rotation = Math.PI / 2;
  const roadPaint = decal(lam('#e8d9a0', {}), 1), kerbPaint = decal(lam('#d8d2c4', {}), 1);
  for (let x = -64; x < 74; x += 3) plane(1.5, 0.14, roadPaint, x, ROAD_Z, 0.005);
  plane(140, 0.12, kerbPaint, 5, ROAD_Z - 1.8, 0.005); plane(140, 0.12, kerbPaint, 5, ROAD_Z + 1.8, 0.005);

  // ---- grandfather's brick workshop --------------------------------------------------------------------------------
  const Wk = P.workshop, wx0 = Wk[0] - 7, wx1 = Wk[0] + 7, wz0 = Wk[1] - 4, wz1 = Wk[1] + 4;
  M.workshop = put(inst('site_workshop'), Wk[0], Wk[1], 0, -.07); M.workshop.userData.dyn = true;
  fadeGroup(M.workshop, ['ws_roof', 'ws_front'], [wx0, wz0 - 3, wx1, wz1 + .1]);
  M.boards = []; M.windows = [];
  addCol([wx0, wz0, wx1, wz0 + .3]); addCol([wx0, wz0, wx0 + .3, wz1]); addCol([wx1 - .3, wz0, wx1, wz1]);
  addCol([wx0, wz1 - .3, Wk[0] - 1.8, wz1]); addCol([Wk[0] + 1.8, wz1 - .3, wx1, wz1]);
  addCol([Wk[0] - 5.05, wz0 + .3, Wk[0] - 4.15, wz0 + 1.45]);                                 // chimney breast
  addCol([wx1 + .2, Wk[1] - 2.9, wx1 + .8, Wk[1] - 1.7]); addCol([wx0 - .85, Wk[1] - 3.15, wx0 - .15, Wk[1] - 2.45]);   // crates, barrel
  M.wsSign = signAt(M.workshop, 'ws_front', textTex([[signName().toUpperCase() + ' · EST. 1921', 74, 52]], 1024, 104, { fg:'#ecdcb4' }), 4.3, .44, true);
  // the grandfather's windows are boarded up until the owner pays for new glass (the 'Replace the windows' pad):
  // weathered planks nailed across the two front windows (they fade with the front wall) and both side windows
  if (!S.restored.windows) { const front = M.fade.find(f => f.nodes.includes(findNode(M.workshop, 'ws_front')));
    const plankM = [std('#5e4630', .95), std('#6e5238', .95), std('#4f3b28', .95)];
    const boardUp = (cx, cy, cz, face) => { const g = new THREE.Group(); g.userData.dyn = true;
      [[-.42, 0], [.05, .08], [.45, -.04]].forEach(([dy, rz], i) => { const m = new THREE.Mesh(BX(1.95, .26, .04), plankM[i]); m.position.set(0, dy, 0); m.rotation.z = rz; m.castShadow = true; g.add(m); });
      const d = new THREE.Mesh(BX(2.05, .22, .04), plankM[2]); d.rotation.z = .55; d.position.z = .03; g.add(d);
      g.position.set(cx, cy, cz); g.rotation.y = face; world.add(g); M.boards.push(g); return g; };
    for (const dx of [-4.6, 4.6]) { const g = boardUp(Wk[0] + dx, 2.1, Wk[1] + 4.09, 0); if (front) front.nodes.push(g); }
    for (const sx of [-1, 1]) { const g = boardUp(Wk[0] + sx * 7.08, 2.0, Wk[1] - .6, Math.PI / 2); g.scale.set(.72, 1, 1); } }
  M.floor = plane(13.3, 7.3, decal(std('#ffffff', .95, 0, { map:TX.floorDirty }), 1), Wk[0], Wk[1], .03); M.floor.userData.dyn = true;
  // the office corner inside the west end: grandfather's desk, the telephone, filing cabinets, a partition
  const partMat = std('#8a6a48', .85);
  box(.12, 1.08, 3.0, partMat, Wk[0] - 2.6, .54, Wk[1] - 2.3); box(.06, .58, 2.96, std('#a9cbd8', .1, 0, { transparent:true, opacity:.25, depthWrite:false }), Wk[0] - 2.6, 1.42, Wk[1] - 2.3, false); box(.14, .05, 3.04, std('#3a3226', .7), Wk[0] - 2.6, 1.74, Wk[1] - 2.3);
  addCol([Wk[0] - 2.68, Wk[1] - 3.8, Wk[0] - 2.52, Wk[1] - .8]);
  put(inst('env_desk'), ...P.desk, 0); addCol([P.desk[0] - .72, P.desk[1] - .37, P.desk[0] + .72, P.desk[1] + .37]);
  put(inst('env_office_chair'), P.desk[0], P.desk[1] - .7, 0);
  put(inst('env_filing_cabinet'), wx0 + .65, Wk[1] - 2.6, Math.PI / 2); put(inst('env_filing_cabinet'), wx0 + .65, Wk[1] - 1.95, Math.PI / 2); addCol([wx0 + .3, Wk[1] - 2.95, wx0 + .97, Wk[1] - 1.6]);
  put(inst('env_bookshelf'), wx0 + .55, Wk[1] + 1.2, Math.PI / 2); addCol([wx0 + .3, Wk[1] + .65, wx0 + .75, Wk[1] + 1.75]);
  // the work end: benches, ladder, cable drum, the old tarp machine
  put(inst('env_workbench'), ...P.bench); addCol([P.bench[0] - .92, P.bench[1] - .38, P.bench[0] + .92, P.bench[1] + .45]);
  put(inst('env_elec_bench'), ...P.elecBench); addCol([P.elecBench[0] - .7, P.elecBench[1] - .35, P.elecBench[0] + .7, P.elecBench[1] + .35]);
  put(inst('env_ladder'), wx1 - .6, Wk[1] + 1.8, Math.PI / 2); addCol([wx1 - .85, Wk[1] + 1.5, wx1 - .35, Wk[1] + 2.1]);
  M.tarp = put(inst('env_tarp_machine'), ...P.tarp); M.tarp.userData.dyn = true; addCol([P.tarp[0] - 1.25, P.tarp[1] - .65, P.tarp[0] + 1.25, P.tarp[1] + .65], 'tarp');
  // a bench by the wall where the crew takes a breather
  put(inst('env_bench'), P.seats[1][0], P.seats[1][1] - .3, 0); addCol([P.seats[0][0] - .25, P.seats[1][1] - .5, P.seats[2][0] + .25, P.seats[1][1] - .12]);

  // ---- the old generator beside the workshop, the switchboard on the workshop's east wall ------------------------------
  const Bd = P.board;
  box(3.2, .14, 2.6, std('#ffffff', .95, 0, { map:TX.concrete }), P.gen[0], .07, P.gen[1]);
  const lowWall = (x0, z0, x1, z1) => { box(x1 - x0, .9, z1 - z0, std('#9a4a35', .9), (x0 + x0 + x1 - x0) / 2, .45, (z0 + z1) / 2); box(x1 - x0 + .06, .07, z1 - z0 + .06, std('#8a877f', .9), (x0 + x1) / 2, .93, (z0 + z1) / 2); addCol([x0, z0, x1, z1]); };
  lowWall(P.gen[0] - 1.7, P.gen[1] - 1.65, P.gen[0] + 1.7, P.gen[1] - 1.35); lowWall(P.gen[0] + 1.4, P.gen[1] - 1.35, P.gen[0] + 1.7, P.gen[1] + .8);
  M.gen = put(A.generator.scene.clone(true), ...P.gen, 0, .14); M.gen.userData.dyn = true; addCol([P.gen[0] - .75, P.gen[1] - .85, P.gen[0] + .95, P.gen[1] + .85]);
  const gf = M.gen.getObjectByName('fix_spot').getWorldPosition(new THREE.Vector3()); P.genFix = [gf.x, gf.z];
  P.exhaust = [P.gen[0] - .38, 2.7, P.gen[1] - .42];
  M.board = put(inst('env_switchboard'), ...Bd, Math.PI / 2); M.board.userData.dyn = true; addCol([Bd[0] - .25, Bd[1] - .45, Bd[0] + .25, Bd[1] + .45]);
  const dg = board(textTex([['DANGER', 54, 40], ['415 V', 34, 84, 500]], 256, 110, { bg:'#f2c230', fg:'#1b1408' }), .45, .2); dg.position.set(Bd[0] - .28, 2.05, Bd[1] - .45); dg.rotation.y = Math.PI / 2; world.add(dg);
  put(inst('env_diesel_tank'), ...P.tank, -Math.PI / 2); addCol([P.tank[0] - .58, P.tank[1] - 1.02, P.tank[0] + .58, P.tank[1] + 1.02]);
  put(inst('prop_drum_red'), 6.9, -9.9); put(inst('prop_drum_blue'), 6.5, -9.4); put(inst('prop_drum_olive'), 7.2, -9.3); addCol([6.15, -10.25, 7.55, -8.95]);

  // ---- the crate machine on its painted pad ------------------------------------------------------------------------------
  M.rack = put(inst('env_timber_rack'), ...P.timber); addCol([P.timber[0] - .9, P.timber[1] - .45, P.timber[0] + .9, P.timber[1] + .45]);
  const fb = std('#5d6b3a', .6, .3), fr = std('#c9ced3', .3, .8), F = P.feed;
  for (const dx of [-.34, .34]) for (const dz of [-.42, .42]) { box(.06, .54, .06, fb, F[0] + dx, .27, F[1] + dz); box(.12, .03, .12, std('#3a3d41', .5, .6), F[0] + dx, .015, F[1] + dz); }
  for (const dz of [-.46, .46]) box(.78, .07, .05, fb, F[0], .54, F[1] + dz);
  for (const dx of [-.34, .34]) box(.05, .05, .9, fb, F[0] + dx, .2, F[1]);
  for (let k = 0; k < 5; k++) { const rr = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .86, 10), fr); rr.rotation.x = Math.PI / 2; rr.position.set(F[0] - .3 + k * .15, .565, F[1]); rr.castShadow = true; world.add(rr); }
  box(.05, .22, .95, std('#e3a52a', .6), F[0] - .38, .68, F[1]); addCol([F[0] - .4, F[1] - .5, F[0] + .4, F[1] + .5]);
  M.saw = put(A.saw_bench.scene.clone(true), ...P.saw, 0, 0, SAW_S); M.saw.userData.dyn = true; addCol([P.saw[0] - 1.72 * SAW_S, P.saw[1] - 1.08 * SAW_S, P.saw[0] + 1.72 * SAW_S, P.saw[1] + .55 * SAW_S]);
  M.saw.updateMatrixWorld(true); const op = M.saw.getObjectByName('op_spot').getWorldPosition(new THREE.Vector3()), out = M.saw.getObjectByName('out_spot').getWorldPosition(new THREE.Vector3());
  P.op = [op.x, op.z]; P.pallet = [out.x + .15, out.z - .1];
  put(inst('prop_pallet'), ...P.pallet); addCol([P.pallet[0] - .5, P.pallet[1] - .5, P.pallet[0] + .5, P.pallet[1] + .5], 'palletStack');   // nobody stands in the crate stack
  dashRect(P.saw[0] - 3.0, P.saw[1] - 2.1, P.saw[0] + 3.0, P.saw[1] + 3.0, M.dashMat);
  dashRect(P.op[0] - .5, P.op[1] - .45, P.op[0] + .5, P.op[1] + .5, Object.assign(paintMat('#ece6d9'), { isPaint:true }), .22, .14, .07);     // the operator's spot
  M.labels.push(groundLabel('CRATE MACHINE', P.saw[0] - .4, P.saw[1] + 2.0, 2.4), groundLabel('OUTPUT', P.pallet[0] + 1.25, P.pallet[1] + .2, 1.1, Math.PI / 2));
  put(inst('env_isolator'), ...P.iso, 0); addCol([P.iso[0] - .12, P.iso[1] - .12, P.iso[0] + .12, P.iso[1] + .12]);
  box(.22, 4.6, .22, std('#5a4632', .9), P.jbox[0], 2.3, P.jbox[1] - .2); addCol([P.jbox[0] - .2, P.jbox[1] - .35, P.jbox[0] + .2, P.jbox[1] - .05]);
  put(inst('env_junction_box'), P.jbox[0], P.jbox[1] - .08, 0, 1.5);

  // ---- timber and crate storage along the west fence ------------------------------------------------------------------------
  put(inst('env_timber_bay'), ...P.storeRack, Math.PI / 2); addCol([P.storeRack[0] - .62, P.storeRack[1] - 1.15, P.storeRack[0] + .55, P.storeRack[1] + 1.15]);
  M.trolley = put(inst('env_trolley'), ...P.trolleyPark, Math.PI); M.trolley.userData.dyn = true;
  const crateStack = (x, z, nx, nz, ny) => { put(inst('prop_pallet'), x, z); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) for (let k = 0; k < ny; k++) { const c = inst('prop_crate'); c.position.set(x - (nx - 1) * .15 + i * .3, .145 + k * .3, z - (nz - 1) * .15 + j * .3); c.rotation.y = (i + j + k) % 2 ? .04 : -.03; world.add(c); }
    addCol([x - .62, z - .62, x + .62, z + .62]); };
  const binWood = std('#7a5e40', .9), binPost = std('#4f3b2a', .9);
  const bin = (x, z, w, d, full) => { for (const [dx, dz, bw, bd] of [[0, -d / 2, w, .07], [0, d / 2, w, .07], [-w / 2, 0, .07, d], [w / 2, 0, .07, d]]) for (let k = 0; k < 3; k++) box(bw, .2, bd, binWood, x + dx, .15 + k * .25, z + dz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.1, .9, .1, binPost, x + sx * w / 2, .45, z + sz * d / 2);
    const nx = Math.floor((w - .2) / .3), nz = Math.floor((d - .2) / .3);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) for (let k = 0; k < full; k++) { if (k === full - 1 && (i + j) % 3 === 0) continue; const c = inst('prop_crate'); c.position.set(x - (nx - 1) * .15 + i * .3, .02 + k * .3, z - (nz - 1) * .15 + j * .3); c.rotation.y = (i * 7 + j * 3 + k) % 5 * .03; world.add(c); }
    return addCol([x - w / 2 - .08, z - d / 2 - .08, x + w / 2 + .08, z + d / 2 + .08]); };
  [[-12.6, -0.4, 2.0, 1.6, 3], [-12.6, 1.6, 2.0, 1.6, 2], [-12.6, 6.6, 2.0, 1.7, 3], [-10.4, 6.6, 1.7, 1.7, 2], [-12.6, 8.7, 2.0, 1.7, 3], [-10.4, 8.7, 1.7, 1.7, 3], [-12.6, 10.7, 2.0, 1.4, 2]].forEach(([x, z, w, d, f], i) => {
    const n0 = world.children.length, k = bin(x, z, w, d, f);
    if (i === 0) { const m = world.children.slice(n0); for (const o of m) o.userData.dyn = true; M.northBin = { m, k }; } });
  // plank stacks under tarps of timber, stickered the old way
  const plk = std('#a77b4a', .85), stick = std('#5a4632', .9);
  for (const [x, z] of [[-9.2, 7.6], [-9.2, 9.6]]) { for (let k = 0; k < 6; k++) { box(2.2, .12, 1.1, plk, x, .1 + k * .17, z); box(.08, .05, 1.1, stick, x - .8, .18 + k * .17, z); box(.08, .05, 1.1, stick, x + .8, .18 + k * .17, z); } addCol([x - 1.15, z - .6, x + 1.15, z + .6]); }
  for (const [x, z, k] of [[-12.6, 11.4, 'blue'], [-12.0, 11.6, 'red'], [-12.4, 2.4, 'olive']]) put(inst('prop_drum_' + k), x, z);
  addCol([-13.0, 11.0, -11.6, 12.0]); addCol([-12.8, 2.0, -12.0, 2.8]);

  // ---- the loading bay: canopy, barrier, the blue truck backs in from the road -----------------------------------------------
  const Cn = P.canopy;
  M.canopy = put(inst('site_canopy'), Cn[0], Cn[1], 0); M.canopy.userData.dyn = true;
  fadeGroup(M.canopy, ['canopy_roof'], [Math.min(Cn[0] - 3.6, P.dock[0] - 2.2), Cn[1] - 2.8 - 3.6, Cn[0] + 3.6, P.dock[1] + 2.6]);   // also clears when the owner stands on the dock
  for (const x of [Cn[0] - 3.6, Cn[0], Cn[0] + 3.6]) for (const z of [Cn[1] - 2.8, Cn[1] + 2.8]) if (!(x === Cn[0] && z > Cn[1])) addCol([x - .17, z - .17, x + .17, z + .17]);
  addCol([Cn[0] - 3.75, Cn[1] - 2.5, Cn[0] - 3.6, Cn[1] + 2.5]); addCol([Cn[0] + 3.6, Cn[1] - 2.5, Cn[0] + 3.75, Cn[1] + 2.5]);
  const hz = paintMat('#e3b23c');
  paintStrip(P.truck[0] + 1.55, P.truck[1] + .2, 6.0, .16, 'z', hz);   // the dock is the bay's west edge
  for (let k = 0; k < 6; k++) paintStrip(P.truck[0] - 1.25 + k * .5, P.truck[1] - 2.75, .5, .16, 'x', paintMat(k % 2 ? '#1b1b1b' : '#e3b23c'));
  const fa = put(inst('site_firstaid'), Cn[0] - 3.4, Cn[1] - 3.4, 0); colOf(fa, .05);
  put(inst('env_cable_drum'), 22.6, -1.8, 0); addCol([22.15, -2.05, 23.05, -1.55]);
  // ---- the side-loading dock: the lorry pulls up along its face, the loaders climb the steps at the back -----------------
  const Dk = P.dock; M.dock = put(inst('site_loading_dock'), Dk[0], Dk[1], Math.PI / 2); M.dock.userData.dyn = true;
  M.dockLamp = findNode(M.dock, 'dock_lamp');
  LDOCK.deck = [Dk[0] - 1.0, Dk[1] - 2.5, Dk[0] + 1.0, Dk[1] + 2.5]; LDOCK.ramp = [Dk[0] - 5.5, Dk[1] - 2.0, Dk[0] - 1.0, Dk[1] - .4];   // the concrete ramp down the back: 4.5 m, rising east
  { const [x0, z0, x1, z1] = LDOCK.deck, [rx0, rz0, , rz1] = LDOCK.ramp;
    addCol([x1 - .12, z0, x1 + .04, z1]); addCol([x0, z0 - .08, x1, z0 + .08], 'dockN'); addCol([x0, z1 - .08, x1, z1 + .08]);       // face, ends
    addCol([x0 - .06, z0, x0 + .06, rz0 - .02]); addCol([x0 - .06, rz1 + .02, x0 + .06, z1]);                              // back, either side of the ramp
    addCol([rx0 + .05, rz0 - .3, x0, rz0 - .02]); addCol([rx0 + .05, rz1 + .02, x0, rz1 + .3]); }                          // the ramp's kerbs and rails, the full length: it is entered square at its foot, never over its side
  // ---- the electricity board's pole transformer in the yard's south-east corner, a span over the road to the line ------
  const Xf = P.xfmr; M.xfmr = put(inst('site_transformer'), Xf[0], Xf[1], 0); M.xfmr.userData.dyn = true;
  M.xfTank = findNode(M.xfmr, 'xf_tank'); M.xfLamp = findNode(M.xfmr, 'xf_lamp');
  addCol([Xf[0] - 1.3, Xf[1] - .2, Xf[0] - .9, Xf[1] + .2]); addCol([Xf[0] + .9, Xf[1] - .2, Xf[0] + 1.3, Xf[1] + .2]); addCol([Xf[0] - .42, Xf[1] + .28, Xf[0] + .42, Xf[1] + .72]);
  M.xfWires = new THREE.Group(); M.xfWires.userData.dyn = true; world.add(M.xfWires);
  const xfWireMat = std("#1d1d1d", .6);
  [-1.3, 0, 1.3].forEach((dx, i) => { const a = new THREE.Vector3(Xf[0] + dx, 8.42, Xf[1]), b = new THREE.Vector3(24, 6.8, ROAD_Z + 2.7 + (i - 1) * .75), m = a.clone().lerp(b, .5); m.y -= .55;
    M.xfWires.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 16, .016, 4), xfWireMat)); });
  // ---- a lived-in, rusty yard: ivy on the workshop front, weeds at every wall foot and fence line, scrap against the fences
  { const front = M.fade.find(f => f.nodes.includes(findNode(M.workshop, 'ws_front')));
    for (const [x, sc] of [[-11.35, 1.0], [1.35, .85], [-6.9, .6]]) { const iv = put(inst('site_ivy'), x, Wk[1] + 4.06, 0, 0, sc); iv.userData.dyn = true; if (front) front.nodes.push(iv); }
    const W = [[-11.6, -2.15, 0], [-8.2, -2.2, .4], [-3.1, -2.2, 3.1], [1.6, -2.15, 1.2], [-13.6, 0.5, 1.6], [-13.5, 7.5, 1.4], [-13.6, 11.0, .2], [-9.8, 12.1, 0], [-1.0, 12.15, 3.0],
      [9.0, 12.15, .1], [12.8, 12.1, 2.8], [23.4, 12.1, 0], [23.6, 9.0, 1.6], [23.65, 2.8, 1.5], [23.6, -6.0, 1.6], [7.8, -11.6, 0], [2.4, -11.6, 2.9], [-12.2, -11.6, .3],
      [P.gen[0] - 1.3, P.gen[1] + 1.05, .7], [P.xfmr[0] - 1.6, P.xfmr[1] + .35, .2], [P.xfmr[0] + 1.1, P.xfmr[1] + .55, 2.6], [9.7, 12.12, 1.6], [8.3, 12.1, 1.5]];   // build 0.19: clear of the car's lane
    for (const [x, z, r] of W) put(inst('site_weeds'), x, z, r, 0, .8 + ((x * 7.3 + z * 3.1) % 1 + 1) % 1 * .5);
    for (const [x, z, r] of [[-11.6, 11.75, Math.PI], [23.55, 7.0, -Math.PI / 2], [2.6, -11.55, 0]]) { const h = put(inst('site_rust_heap'), x, z, r); const k = colOf(h, .05); if (x > 20) { h.userData.dyn = true; M.bayHeap = { h, k }; } }
    const d1 = put(inst('prop_drum_olive'), -12.9, 9.4, .4); d1.rotation.z = Math.PI / 2; d1.position.y = .3; addCol([-13.4, 9.0, -12.4, 9.8]);
    const d2 = put(inst('prop_drum_red'), 22.9, 5.3, 1.1); addCol([22.6, 5.0, 23.2, 5.6]); }
  // ---- the back yard to clear ------------------------------------------------------------------------------------------------
  buildPower(); groundDetail();
  M.junk = new THREE.Group(); M.junk.userData.dyn = true; world.add(M.junk);
  const JUNK = [[12.6, -9.0, .3, 1.1], [17.2, -5.2, 2.0, 1.2], [20.6, -9.4, 1.0, 1.0], [13.4, -4.6, 2.6, .8]];
  M.junkCols = JUNK.map(([x, z, rr, s]) => { const j = inst('env_junk_pile'); j.position.set(x, 0, z); j.rotation.y = rr; j.scale.setScalar(s); M.junk.add(j); return addCol([x - 1.3 * s, z - .8 * s, x + 1.3 * s, z + .8 * s]); });
  const rust = put(inst('prop_drum_red'), 15.4, -10.6); rust.rotation.z = Math.PI / 2; rust.position.y = .3; rust.userData.dyn = true; M.junk.attach(rust);
  M.skip = put(inst('site_skip'), 21.4, -4.4, -.15); M.skip.userData.dyn = true; colOf(M.skip, 0, 'skip', .1);
  buildFacilities(); for (const k of ['cooler', 'bottleRack', 'mopCart', 'wetSign']) if (M[k]) M[k].visible = false;
  M.plotSign = put(inst('env_sale_sign'), 22.4, -10.4, 0); M.plotSign.visible = false; M.plotSign.userData.dyn = true;
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .7), new THREE.MeshBasicMaterial({ map:TX.plot })); pf.position.set(0, 1.3, .08); M.plotSign.add(pf);
  // ---- timber fences, brick gate pillars, the gate -----------------------------------------------------------------------------
  const fence = (x0, z0, x1, z1, name) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.4)), ry = Math.atan2(-(z1 - z0), x1 - x0), out = [];
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; const f = put(inst('site_plank_fence'), lerp(x0, x1, t), lerp(z0, z1, t), ry); f.scale.x = len / n / 2.4; if (name) f.userData.dyn = true; out.push(f); }
    addCol([Math.min(x0, x1) - .1, Math.min(z0, z1) - .1, Math.max(x0, x1) + .1, Math.max(z0, z1) + .1], name); return out; };
  const { x0:X0, x1:X1, z0:Z0, z1:Z1 } = SITE, G0 = 3.0, G1 = 7.0, T0 = P.truck[0] - 2.6, T1 = P.bay2[0] + 1.75;
  fence(X0, Z0, 12, Z0); M.northGate = fence(12, Z0, 15.6, Z0, 'gate'); fence(15.6, Z0, X1, Z0);
  fence(X0, Z0, X0, -4.0); M.westGap = fence(X0, -4.0, X0, 4.0, 'westGap'); M.scrapGate = fence(X0, 4.0, X0, 6.4, 'scrapGate'); M.westFence = fence(X0, 6.4, X0, Z1, 'westFenceA');
  fence(X1, Z0, X1, Z1);
  fence(X0, Z1, G0, Z1); fence(G1, Z1, T0, Z1); M.frontFenceE = fence(T1, Z1, X1, Z1, 'frontFenceE');
  for (const x of [G0, G1, T0, T1]) { put(inst('env_gate_post'), x, Z1); addCol([x - .25, Z1 - .25, x + .25, Z1 + .25]); }
  const gw = std('#6e4a2c', .9);   // the two timber gate leaves, swung open
  M.gateLeaves = [];   // build 0.18: they swing shut after the last of the crew leaves at 17:00 and open again at 07:00
  for (const [x, r, shut] of [[G0 + .1, -1.2, 0], [G1 - .1, Math.PI + 1.2, Math.PI]]) { const g = new THREE.Group(); g.position.set(x, 0, Z1); g.rotation.y = r; g.userData.dyn = true; world.add(g); M.gateLeaves.push({ g, open:r, shut });
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.36, 1.6, .06), gw); b.position.set(.2 + k * .38, .85, 0); b.castShadow = true; g.add(b); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(1.9, .12, .08), std('#4a3424', .9)); br.position.set(.95, .5, .04); br.rotation.z = .6; g.add(br); colOf(g, .02); }
  // the company board by the road
  const sb = put(inst('env_sale_sign'), -8.5, Z1 + 1.3, 0, 0, 1.6); const sbm = board(textTex([['IRON VALLEY', 70, 52], ['WORKSHOP', 40, 104, 500]], 512, 140, { bg:'#4a3226', fg:'#ecdcb4', border:'#2a1c14', bw:10 }), 1.5, .41); sbm.position.set(0, 1.3, .1); sb.add(sbm);
  // ---- outside: lamps, telegraph poles along the road, the railway, trees ----------------------------------------------------------
  M.car = put(inst('env_car'), P.carSpot[0], P.carSpot[1], 0, 0, .85); M.car.userData.dyn = true; colOf(M.car, .05, 'car');
  for (const [x, z] of [[1.6, 10.8], [-6.0, 4.6], [9.3, 7.6]]) { put(inst('env_lamp_post'), x, z, 0); addCol([x - .15, z - .15, x + .15, z + .15]); }
  for (const x of [-36, -24, -12, 0, 12, 24, 36]) put(inst('env_power_pole'), x, ROAD_Z + 2.7, Math.PI / 2);
  const wireMat = new THREE.LineBasicMaterial({ color:'#202020' });
  for (const dz of [-.75, 0, .75]) { const pts = []; for (let x = -36; x <= 36; x += .5) { const k = ((x + 36) % 12) / 12; pts.push(new THREE.Vector3(x, 6.8 - Math.sin(k * Math.PI) * .5, ROAD_Z + 2.7 + dz)); }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat)); }
  for (let x = -46; x < 70; x += 6) put(inst('site_rail'), x + 3, RAIL_Z, 0);
  const wt = put(inst('site_water_tower'), 27.5, -9.0, .2); colOf(wt, 0, null, .9);
  const trees = [[-17, -16, 'pine'], [-8, -17.5, 'round'], [-2, -15.5, 'pine'], [26.5, -16, 'round'], [30, -4, 'pine'], [29.5, 6, 'round'], [31, 11, 'pine'], [-18, 9, 'round'],
    [-19, -2, 'pine'], [-30, 4, 'round'], [-28, -9, 'pine'], [-22, 21, 'round'], [-6, 21, 'pine'], [10, 22, 'round'], [26, 21.5, 'pine'], [38, 4, 'round'], [-1, -27, 'round'], [18, -28, 'pine'], [-24, -18, 'round'], [36, -12, 'pine']];
  for (const [x, z, k] of trees) { const t = put(inst(k === 'round' ? 'env_tree_round' : 'env_tree_pine'), x, z, Math.random() * 6, 0, .9 + Math.random() * .4); if (x === 26 && z === 21.5) M.cornerTree = t; (M.trees ||= []).push(t); }   // the pine on Ada's corner is felled for dock 2 at Level 5
  for (const [x, z] of [[-14.8, 13.0], [-2, 13.2], [9.6, 13.4], [24.8, -12.6], [24.6, 13.0], [-14.7, -12.8], [13.6, 13.3], [27, 1]]) put(inst('env_bush'), x, z, Math.random() * 6);
  // the truck and the (spare) flatbed
  M.truck = put(A.truck.scene.getObjectByName('truck_lorry').clone(true), -60, ROAD_Z, 0); M.truck.userData.dyn = true; M.truck.add(blob(5.2, 2.4));
  M.flat = put(A.truck.scene.getObjectByName('truck_flatbed').clone(true), -80, ROAD_Z, 0); M.flat.userData.dyn = true; M.flat.add(blob(5.2, 2.4));
  for (const T_ of [M.truck, M.flat]) for (const n of ['wheel_fl', 'wheel_fr']) findNode(T_, n).rotation.order = 'YXZ';
  M.bundles = [];
  M.rings = {};
  const ring = (id, x, z, col, r = .62) => { const g = new THREE.Group(); g.userData.dyn = true; g.position.set(x, .034, z); world.add(g);
    const m = new THREE.Mesh(new THREE.RingGeometry(r - .08, r, 48), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.85, depthWrite:false })); m.rotation.x = -Math.PI / 2; g.add(m);
    const f = new THREE.Mesh(new THREE.CircleGeometry(r - .08, 48), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:.12, depthWrite:false })); f.rotation.x = -Math.PI / 2; g.add(f);
    const prog = new THREE.Mesh(new THREE.RingGeometry(r + .02, r + .12, 48, 1, Math.PI / 2, 0.001), new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:.95, depthWrite:false })); prog.rotation.x = -Math.PI / 2; prog.visible = false; g.add(prog);
    M.rings[id] = { g, m, f, prog, r, x, z, col }; return M.rings[id]; };
  M.ring = ring;
  ring('car', ...P.carDoor, '#e2a72c', .6);   // build 0.21g: stand in it and you get in the car
  ring('drop', ...P.drop, '#e8ab2c', .72).g.position.y = LDOCK.H + .02; ring('cash', ...P.cash, '#9bd26f', .8); ring('desk', ...P.deskRing, '#6fa6d6', .6).g.position.y = .03;
  const n = 140, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(wx0 + .5, wx1 - .5); pos[i * 3 + 1] = rand(.3, 3.4); pos[i * 3 + 2] = rand(wz0 + .5, wz1 - .5); }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  M.dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ map:TX.dot, color:'#ffe6b8', size:4, sizeAttenuation:false, transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending }));
  M.dust.userData.dyn = true; world.add(M.dust);
}

/* =====================================================================
   POWER NETWORK: generator -> switchboard -> circuits, all visible
   ===================================================================== */
const TRAY_Y = 2.8, TRAY_Z = .45;
const LINES = [];   // { pts, len, cum, live:() => bool, dots }
function polyLen(pts){ const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + V(pts[i]).distanceTo(V(pts[i - 1]))); return cum; }
function cableMesh(pts, r, mat){
  const path = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(V(pts[i - 1]), V(pts[i])));
  const len = polyLen(pts).at(-1), g = new THREE.TubeGeometry(path, Math.ceil(len * 5) + pts.length * 3, r, 6, false);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; world.add(m); return m;
}
function line(pts, live, opt = {}){   // a plain cable or conduit run; 'live' is kept for the inspection card
  if (!opt.inTray) cableMesh(pts, opt.r || .028, opt.mat || M.cableMat);
}
function cover(x0, z0, x1, z1){  // yellow floor cable protector between two floor points
  const len = Math.hypot(x1 - x0, z1 - z0), o = inst('env_cable_cover'); o.scale.set(len, 1, 1); o.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); o.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); world.add(o);
}
// a timber utility pole with a cross-arm; returns the top point the wires hang from
function pole(x, z, h = 5.2){
  const wd = std('#5a4632', .9); box(.2, h, .2, wd, x, h / 2, z); box(1.1, .1, .1, wd, x, h - .35, z);
  for (const dx of [-.42, .42]) box(.05, .1, .05, std('#d8d2c4', .5), dx + x, h - .25, z);
  addCol([x - .17, z - .17, x + .17, z + .17]); return [x, h - .22, z];
}
function sag(a, b, s = .35){ const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * s, lerp(a[2], b[2], t)]); } return pts; }
function buildPower(){
  TX.pulse = tex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(40,30,10,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  M.cableMat = std('#232527', .6, .15); M.conduitMat = std('#8d939a', .5, .5);
  const g = P.gen, b = P.board, Wk = P.workshop, wx1 = Wk[0] + 7, wz1 = Wk[1] + 4;
  // generator terminal -> along the ground in a cover -> up into the switchboard on the workshop wall
  M.feed = line([[g[0] + .76, .74, g[1] + .12], [g[0] + 1.18, .18, g[1] + .12], [g[0] + 1.18, .04, g[1] + 1.25], [b[0] + .3, .04, g[1] + 1.25], [b[0] + .3, .04, b[1]], [b[0] + .12, .3, b[1]]], () => powerOn(), { r:.04 });
  cover(g[0] + 1.18, g[1] + 1.25, b[0] + .35, g[1] + 1.25);
  // saw circuit: up the wall from the board, over to the junction-box pole by the machine, down to the isolator and the motor
  const eave = [wx1 + .1, 3.7, wz1 - .25], pj = [P.jbox[0], 4.35, P.jbox[1] - .2];
  M.trunk = line([[b[0] + .12, 1.75, b[1]], [b[0] + .12, 3.7, b[1]], eave], () => powerOn(), { r:.035, mat:M.conduitMat });
  box(1.1, .1, .1, std('#5a4632', .9), pj[0], 4.25, pj[2]);
  cableMesh(sag(eave, pj, .3), .016, M.cableMat);
  line([[pj[0], 4.2, pj[2] + .12], [pj[0], 1.75, pj[2] + .12]], () => circuitOn('saw', true), { r:.03, mat:M.conduitMat });
  M.sawLine = line([[P.jbox[0], 1.32, P.jbox[1] + .02], [P.jbox[0], .05, P.jbox[1] + .02], [P.jbox[0], .04, P.iso[1] - .05], [P.iso[0] + .02, .2, P.iso[1] - .02], [P.iso[0], 1.0, P.iso[1] + .02],
    [P.iso[0] - .25, .25, P.iso[1] + .1], [P.saw[0] + .5, .05, P.iso[1] + .1], [P.saw[0] + .1, .3, P.saw[1] - .45]], () => circuitOn('saw'), { r:.03 });
  cover(P.jbox[0], P.jbox[1] + .1, P.jbox[0], P.iso[1] - .15);
  // lights circuit: lamps on the workshop front, a floodlight over the loading bay fed from the pole
  M.lamps = [];
  line([[wx1 - .1, 3.6, wz1 + .08], [Wk[0] - 3.6, 3.6, wz1 + .08]], () => circuitOn('lights'), { r:.025, mat:M.conduitMat });
  for (const dx of [-3.3, 3.3]) { const l = put(inst('env_wall_lamp'), Wk[0] + dx, wz1 + .06, 0, 3.0); l.userData.dyn = true; M.lamps.push({ bulb:findNode(l, 'lamp_bulb'), pool:[Wk[0] + dx * .8, wz1 + 1.7], w:4.4 }); }
  const Cn = P.canopy, fp = [Cn[0] - 3.6, 3.4, Cn[1] - 2.8];
  cableMesh(sag([pj[0] + .42, pj[1], pj[2]], fp, .5), .014, M.cableMat);
  const fl = put(inst('env_floodlight'), fp[0] + .2, fp[2] + .15, -2.2, 3.2); fl.userData.dyn = true; M.lamps.push({ bulb:findNode(fl, 'lamp_bulb'), pool:[P.dock[0] - 4.2, P.dock[1] - 1.2], w:6 });   // lights the foot of the dock ramp
  // office circuit: the lamp over grandfather's desk
  const ol = put(inst('env_wall_lamp'), P.desk[0] + 1.0, Wk[1] - 3.68, 0, 2.0); ol.userData.dyn = true; M.officeLamp = { bulb:findNode(ol, 'lamp_bulb'), pool:[P.desk[0], P.desk[1] + .8], w:4 };
  M.lamps.push(M.officeLamp);
  for (const L of M.lamps) { const pool = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.w), new THREE.MeshBasicMaterial({ map:TX.pool, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.2 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(L.pool[0], .044, L.pool[1]); pool.renderOrder = 8; world.add(pool); L.poolMesh = pool; }
  M.jerry = inst('env_jerrycan');
  M.sb = { main:findNode(M.board, 'sb_lamp_main'), lamp:{}, brk:{} };
  for (const c of Object.keys(CIRCUITS)) { M.sb.lamp[c] = findNode(M.board, 'sb_lamp_' + c); M.sb.brk[c] = findNode(M.board, 'sb_brk_' + c); }
}
const genRunning = () => S.power.fuel > 0 && !S.faults.some(f => f.kind === 'engine');
// Mains (build 0.17): once the Valley Electricity Board has fitted the pole transformer, the works runs on the
// mains and the generator stands by. A power cut on the mains starts the generator by itself as the backup.
const MAINS_PRICE = 500, MAINS_PERMIT = 45, MAINS_FIT = 30, MAINS_KW = 25;
const mainsLive = () => S.mains.st >= 3;
const mainsUp = () => mainsLive() && !S.faults.some(f => f.kind === 'powercut');
const genActive = () => !mainsUp() && genRunning();
const supplyKW = () => (mainsUp() ? MAINS_KW : genKW()) + (S.l8 && S.l8.hd && mainsUp() ? 40 : 0);   // the heavy-duty supply (L8) is a second mains transformer
// v2.0 13.5, Level 6: on a mains cut the generator needs about 20 s to run up and be switched over by hand; the automatic
// changeover takes the load by itself in 3 s
const cutDark = () => S.level >= 6 && mainsLive() && S.faults.some(f => f.kind === 'powercut' && f.t < [20, 3, 2, 1][Math.min(3, S.up.changeover || 0)]);
const powerOn = () => mainsUp() || (genRunning() && !S.faults.some(f => f.kind === 'alternator') && !stalled() && !cutDark());
function circuitOn(c, upstream){
  if (!powerOn() || !S.power.breakers[c]) return false;
  if (c === 'saw' && !upstream && S.faults.some(f => f.kind === 'junction')) return false;
  return true;
}
const sawBroken = () => S.faults.some(f => f.where === 'saw' && !FAULTS[f.kind].svc);
function load(){ return (S.level >= 5 && S.l5.mill2 >= 2 && circuitOn('pipe') ? (mill2On ? 6 : .5) : 0) + (S.lv4.saw2 >= 2 ? (saw2On ? 5.5 : .6) : 0) + (circuitOn('saw') ? (sawOn ? 5.5 : .6) : 0) + (S.lv2.mill >= 2 && circuitOn('pipe') ? (pipeOn ? 6 : .5) : 0) + (S.lv3.press >= 2 && circuitOn('tool') ? (toolOn ? 4.5 : .4) : 0) + (circuitOn('lights') ? 1.2 : 0) + (circuitOn('office') ? .9 + (S.restored.coffee ? .5 : 0) : 0); }
// status lamps everywhere: running = blinking green, idle = steady yellow, fault or stopped = steady red
const LAMP_IDLE = ['#ffb028', 2.6], LAMP_STOP = ['#ff2a1a', 3.2];
const LAMP_RUN = () => ['#3dff5a', 3.0];   // steady: blinking lamps read as a rendering fault on phones
function updatePowerFx(){
  // switchboard lamps and breaker handles
  setLamp(M.sb.main, ...(powerOn() ? LAMP_RUN() : LAMP_STOP));
  for (const c of Object.keys(CIRCUITS)) { const on = circuitOn(c), tripped = !S.power.breakers[c];
    setLamp(M.sb.lamp[c], ...(tripped ? LAMP_STOP : !on ? ['#101010', 0] : (c === 'saw' && !sawOn) || (c === 'pipe' && !pipeOn) || (c === 'tool' && !toolOn) ? LAMP_IDLE : LAMP_RUN()));
    const h = M.sb.brk[c]; if (h) h.rotation.x = tripped ? -0.9 : 0; }
  // lamps
  const lit = circuitOn('lights'), rew = S.restored.lights;
  for (const L of M.lamps) { const on = L === M.officeLamp ? circuitOn('office') : lit;
    const k = on ? (rew || L === M.officeLamp ? 2.6 : 1.8) : 0;
    setLamp(L.bulb, '#ffd28a', k); L.poolMesh.material.opacity = on ? k * .085 : 0; }
}

/* =====================================================================
   PERFORMANCE: merge everything that never moves into a few big meshes
   ===================================================================== */
function floatGeo(g, m){
  const out = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(g.attributes)) { const n = a.count, sz = a.itemSize, f = new Float32Array(n * sz);
    for (let i = 0; i < n; i++) { f[i * sz] = a.getX(i); if (sz > 1) f[i * sz + 1] = a.getY(i); if (sz > 2) f[i * sz + 2] = a.getZ(i); if (sz > 3) f[i * sz + 3] = a.getW(i); }
    out.setAttribute(k, new THREE.BufferAttribute(f, sz)); }
  out.setIndex(g.index ? Array.from(g.index.array) : [...Array(g.attributes.position.count).keys()]);
  out.applyMatrix4(m.matrixWorld); return out;
}
function bakeStatic(){
  world.updateMatrixWorld(true);
  const groups = new Map(); let before = 0;
  for (const root of [...world.children]) { if (root.userData.dyn) continue;
    root.traverse(m => { if (!m.isMesh || m.isSkinnedMesh || m.isPoints || !m.visible || Array.isArray(m.material) || m.material.transparent) return;
      let p = m.parent, hidden = false; while (p) { if (!p.visible) hidden = true; p = p.parent; } if (hidden) return;
      const key = m.material.uuid + '|' + Object.keys(m.geometry.attributes).sort().join(',') + '|' + m.castShadow;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(m); before++; }); }
  let after = 0;
  for (const list of groups.values()) {
    if (list.length < 2) { after++; continue; }
    const g = mergeGeometries(list.map(m => floatGeo(m.geometry, m)), false); if (!g) { after += list.length; continue; }
    const mesh = new THREE.Mesh(g, list[0].material); mesh.castShadow = list[0].castShadow; mesh.receiveShadow = true; mesh.userData.dyn = true; mesh.name = 'static_batch';
    for (const m of list) m.removeFromParent(); world.add(mesh); after++;
  }
  return { before, after };
}

// tower beacons: big, readable status lights. Running = blinking green, idle = yellow, fault or stopped = red.
const BEACONS = [];
function beacon(x, y, z, state){
  const g = new THREE.Group(); g.position.set(x, y, z); g.userData.dyn = true; world.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .3, 8), std('#2c2f33', .5, .6)); pole.position.y = .15; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .05, 12), std('#2c2f33', .5, .6)); base.position.y = .32; g.add(base);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .17, 14), new THREE.MeshBasicMaterial({ color:'#222', toneMapped:false })); dome.position.y = .43; g.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), std('#2c2f33', .5, .6)); cap.position.y = .515; g.add(cap);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:TX.dot, color:'#fff', transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false })); glow.position.y = .43; glow.scale.setScalar(.7); glow.renderOrder = 7; g.add(glow);
  const b = { g, dome, glow, state }; BEACONS.push(b); return b;
}
function updateBeacons(){
  for (const b of BEACONS) { const st = b.state(), on = true;
    const col = st === 'run' ? '#3dff5a' : st === 'idle' ? '#ffb028' : '#ff2a1a';
    b.dome.material.color.set(on ? col : '#1e2a20');
    b.glow.visible = on; b.glow.material.color.set(col); b.glow.material.opacity = .45; }
}
function buildBeacons(){
  beacon(P.saw[0] + .78, .95, P.saw[1] - .48, () => sawBroken() || !circuitOn('saw') ? 'stop' : sawOn ? 'run' : 'idle');
  beacon(P.gen[0] + .5, 1.45, P.gen[1] - .55, () => powerOn() ? (overloaded() ? 'idle' : 'run') : 'stop');
  beacon(P.board[0] + .2, 1.72, P.board[1], () => !powerOn() || Object.values(S.power.breakers).some(v => !v) || S.faults.some(f => f.kind === 'junction') ? 'stop' : sawOn || pipeOn ? 'run' : 'idle');
}

// every upgrade step shows up somewhere in the workshop
const UPG_AT = { press:() => P.tpress, sturdy:() => P.tpress, whcap:() => P.wh, parts:() => P.parts, changeover:() => P.gen, fixedprice:() => [-7, -18], heat:() => FURN_DOOR, rawstore:() => [-7, -18], sidingx:() => [-20, SIDING_Z], board4:() => BOARD_AT, salesrep:() => P.officeDoor, docklamps:() => P.drop, reach:() => P.desk, schedule:() => P.mechHome, ledger:() => [2.9, 25.3], tbatch:() => P.tpress, tariff:() => P.gen, multi:() => P.drop, dock:() => typeof M !== 'undefined' && M.dock2 ? P.drop2 : P.drop, autofeed:() => P.saw, gen3:() => P.gen, fork:() => typeof fork !== 'undefined' && fork.o ? [fork.o.position.x, fork.o.position.z] : P.forkPark, ppe:() => P.op, meter:() => P.elecBench, mop:() => P.cleanerHome, truck2:() => P.drop, radio:() => P.desk, wc:() => [WC_BLOCKS[0][0], WC_BLOCKS[0][1]], cooler:() => P.cooler, gen2:() => P.gen, pipe:() => P.pmill, batch:() => P.saw, back:() => P.drop, prack:() => P.prack, saw:() => P.saw, gen:() => P.gen, surge:() => [2.4, .6], fuel:() => [1.3, .9], hands:() => P.op, tools:() => P.bench, stack:() => P.pallet, supply:() => P.trolleyPark, boots:() => [owner.o.position.x, owner.o.position.z] };
const GLOVES = ['#8a6a3e', '#e8c02a', '#e5772b', '#2f7fd0'], BOOTS = [null, '#2a2a2a', '#7a2f1f', '#1f3f6a'];
let upgGroup = null, ownerTexBase = null;
function upgMesh(geo, col, x, y, z, opt = {}){ const m = new THREE.Mesh(geo, std(col, opt.r ?? .6, opt.metal ?? .2, opt.emissive ? { emissive:opt.emissive, emissiveIntensity:1.5 } : {})); m.position.set(x, y, z); if (opt.rot) m.rotation.set(...opt.rot); m.castShadow = true; m.receiveShadow = true; upgGroup.add(m); return m; }
const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), CY = (r, h, n = 12) => new THREE.CylinderGeometry(r, r, h, n);
function applyUpgradeVisuals(){
  if (upgGroup) { upgGroup.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); upgGroup.removeFromParent(); for (const k of ['upgTools1', 'upgTools2', 'upgTools3', 'upgRack']) COL.delete(k); }
  upgGroup = new THREE.Group(); upgGroup.userData.dyn = true; world.add(upgGroup);
  const U = S.up, blade = M.saw.getObjectByName('blade').getWorldPosition(new THREE.Vector3());
  // saw bench: blade guard, dust extraction, second motor
  if (U.saw >= 1) { upgMesh(BX(.62, .14, .16), '#e3a52a', blade.x, blade.y + .32, blade.z); upgMesh(BX(.04, .3, .04), '#2c2f33', blade.x + .28, blade.y + .17, blade.z); }
  if (U.saw >= 2) { upgMesh(BX(.34, .22, .3), '#8d939a', blade.x, blade.y + .5, blade.z, { metal:.6 }); upgMesh(CY(.08, 2.8 - blade.y - .6), '#8d939a', blade.x, (2.8 + blade.y + .6) / 2, blade.z, { metal:.6 }); }
  if (U.saw >= 3) { upgMesh(BX(.42, .34, .34), '#3e6b45', P.saw[0] - .75, .62, P.saw[1] - .25); for (let k = 0; k < 4; k++) upgMesh(BX(.43, .02, .35), '#2c4a32', P.saw[0] - .75, .5 + k * .07, P.saw[1] - .25); }
  // generator: air filter, silencer, fresh paint
  if (U.gen >= 1) { upgMesh(CY(.13, .26), '#2f7fd0', P.gen[0] + .25, 1.66, P.gen[1] + .1); upgMesh(CY(.14, .04), '#ece6d9', P.gen[0] + .25, 1.8, P.gen[1] + .1); }
  if (U.gen >= 2) upgMesh(CY(.13, .6), '#c9ced3', P.exhaust[0], 3.05, P.exhaust[2], { metal:.8, r:.3 });
  M.gen.traverse(o => { if (!o.isMesh || o.name === 'status_lamp') return; if (!o.userData.own) { o.material = o.material.clone(); o.userData.own = true; } o.material.color.set(U.gen >= 3 ? '#d6eadc' : '#ffffff'); });
  // surge protection units on the wall beside the switchboard
  for (let k = 0; k < U.surge; k++) { const sx = P.board[0] - .14, sz = P.board[1] - .75; upgMesh(BX(.3, .3, .12), '#c9ced3', sx, 1.0 + k * .38, sz, { metal:.4 }); upgMesh(BX(.05, .05, .02), '#3dff5a', sx + .08, 1.06 + k * .38, sz + .065, { emissive:'#3dff5a' }); upgMesh(BX(.2, .03, .03), '#2c2f33', sx + .2, 1.0 + k * .38, sz - .01); }
  // fuel saver: filter bowl, day tank, gauge board
  if (U.fuel >= 1) { upgMesh(CY(.07, .22), '#b3261e', P.gen[0] - .9, .55, P.gen[1] - .5); upgMesh(CY(.08, .1), '#9fd0e6', P.gen[0] - .9, .4, P.gen[1] - .5, { r:.1 }); }
  if (U.fuel >= 2) { upgMesh(BX(.8, .45, .4), '#3e6b45', P.gen[0] - .2, .23, P.gen[1] - 1.35); upgMesh(BX(.82, .04, .42), '#2c4a32', P.gen[0] - .2, .47, P.gen[1] - 1.35); }
  if (U.fuel >= 3) { upgMesh(BX(.5, .34, .04), '#2c2f33', P.gen[0] - .2, 1.35, P.cage[1] - 1.62); upgMesh(BX(.36, .1, .02), '#3dff5a', P.gen[0] - .2, 1.38, P.cage[1] - 1.59, { emissive:'#3dff5a' }); }
  // better toolkits: roll cabinets and a tool cart
  const chest = (x, z, col, key) => { upgMesh(BX(.6, .9, .45), col, x, .45, z, { metal:.3 }); for (let k = 0; k < 5; k++) upgMesh(BX(.56, .02, .02), '#d8d2c4', x, .2 + k * .14, z + .235); addCol([x - .3, z - .23, x + .3, z + .23], key); };
  if (U.tools >= 1) chest(P.bench[0] - 1.25, P.bench[1] - .1, '#b3261e', 'upgTools1');
  if (U.tools >= 2) chest(P.elecBench[0] + 1.05, P.elecBench[1] - .05, '#2f5d8a', 'upgTools2');
  if (U.tools >= 3) { const cx = P.bench[0] - 1.4, cz = P.bench[1] + 1.9; upgMesh(BX(.55, .06, .4), '#3d7fc4', cx, .75, cz); upgMesh(BX(.55, .06, .4), '#3d7fc4', cx, .35, cz); for (const dx of [-.25, .25]) for (const dz of [-.17, .17]) upgMesh(CY(.02, .75, 6), '#2c2f33', cx + dx, .38, cz + dz); addCol([cx - .3, cz - .22, cx + .3, cz + .22], 'upgTools3'); }
  // bigger pallet: racking around the pallet grows a level per step
  if (U.stack >= 1) { const h = .45 + U.stack * .32; for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) upgMesh(BX(.06, h, .06), '#2f5d8a', P.pallet[0] + dx, h / 2, P.pallet[1] + dz, { metal:.4 });
    for (let k = 1; k <= U.stack; k++) for (const dz of [-.5, .5]) upgMesh(BX(1.06, .05, .05), '#e3a52a', P.pallet[0], .3 + k * .32, P.pallet[1] + dz); }
  // level 2: Generator Mk II replaces Mk I in place; pipe mill speed, pipe rack and strong-back visuals
  if (U.gen2 >= 1 && A.level2) { if (!M.gen2) { M.gen2 = put(inst('l2_gen_mk2'), P.gen[0] - .05, P.gen[1], Math.PI / 2); M.gen2.userData.dyn = true; M.gen2N = { fan:findNode(M.gen2, 'gen2_fan'), lamp:findNode(M.gen2, 'gen2_lamp') }; }
    M.gen.traverse(o => { if (o.isMesh) o.visible = false; });
    if (U.gen2 >= 2) upgMesh(BX(.5, .5, .3), '#3e6b45', P.gen[0] - .9, .25, P.gen[1] + .9); if (U.gen2 >= 3) upgMesh(CY(.18, .8), '#c9ced3', P.gen[0] - .9, .4, P.gen[1] - .9, { metal:.6 });
    // level 4: Generator Mk III adds a blue booster set and its own exhaust
    if (U.gen3 >= 1) { upgMesh(BX(.7, .8, .55), '#2f5d8a', P.gen[0] + .95, .4, P.gen[1] - .55); upgMesh(CY(.07, 1.3), '#3a3d41', P.gen[0] + 1.15, 1.25, P.gen[1] - .7, { metal:.6 }); upgMesh(BX(.4, .07, .02), '#e8ab2c', P.gen[0] + .95, .7, P.gen[1] - .27); } }
  if (M.mill) { if (U.pipe >= 1) upgMesh(BX(.5, .12, .5), '#e3a52a', P.pmill[0] + .1, 1.25, P.pmill[1]); if (U.pipe >= 2) upgMesh(BX(.36, .32, .3), '#3e6b45', P.pmill[0] - .3, .6, P.pmill[1] - .7); if (U.pipe >= 3) upgMesh(CY(.06, 1.2), '#9fd0e6', P.pmill[0] + .5, .9, P.pmill[1] - .6, { r:.2 }); }
  if (M.prack) M.prack.scale.set(1, 1, 1 + .12 * U.prack);
  syncWC(); syncBottles();
  // bigger trolley
  M.trolley.scale.set(1 + .18 * U.supply, 1, 1 + .1 * U.supply);
  // quick hands: better work gloves on the whole crew
  for (const c of staffObj.values()) if (c.mat) c.mat.map = paletteTex(Object.assign(lookCols(c.st), { glove:GLOVES[U.hands] }));
  // good boots: the owner's boots
  owner.o.traverse(m => { if (!m.isSkinnedMesh || !m.material.map) return; if (!ownerTexBase) ownerTexBase = m.material.map;
    if (!U.boots) { m.material.map = ownerTexBase; return; }
    const img = ownerTexBase.image, cvs = document.createElement('canvas'); cvs.width = img.width; cvs.height = img.height; const g = cvs.getContext('2d'); g.drawImage(img, 0, 0);
    g.fillStyle = BOOTS[U.boots]; g.fillRect(5 * img.width / SLOTS.length, 0, img.width / SLOTS.length, img.height);
    const t = new THREE.CanvasTexture(cvs); t.colorSpace = THREE.SRGBColorSpace; t.flipY = ownerTexBase.flipY; t.magFilter = t.minFilter = THREE.NearestFilter; m.material.map = t; m.material.needsUpdate = true; });
}

/* =====================================================================
   RESTORATION (what each pad changes on screen)
   ===================================================================== */
function applyRestore(id, fx){
  S.restored[id] = true;
  if (id === 'paint') { M.floor.material.map = TX.floorClean; M.floor.material.needsUpdate = true; M.dashMat.color.set('#f2c230'); }
  if (id === 'lanes') syncL2Marks();
  if (id === 'windows') { M.boards.forEach(b => { M.fade.forEach(f => { const i = f.nodes.indexOf(b); if (i >= 0) f.nodes.splice(i, 1); }); b.removeFromParent(); }); M.boards = []; M.windows.forEach(w => w.material.emissiveIntensity = .9); M.dust.material.opacity = .25; }
  if (id === 'coffee') { M.coffee.visible = true; addCol([P.coffee[0] - .52, P.coffee[1] - .3, P.coffee[0] + .52, P.coffee[1] + .3], 'coffee'); }
  if (id === 'urn' && !M.urn) { const g = new THREE.Group(), wood = std('#7a5636', .8), steel = std('#b8bec4', .35, .7); const tb = new THREE.Mesh(BX(.55, .62, .42), wood); tb.position.y = .31; g.add(tb);
    const u = new THREE.Mesh(CY(.13, .42, 14), steel); u.position.set(0, .83, 0); g.add(u); const lid = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel); lid.position.y = 1.04; g.add(lid);
    const tap = new THREE.Mesh(BX(.04, .04, .08), std('#2c2f33')); tap.position.set(0, .7, .15); g.add(tap); for (let i = 0; i < 3; i++) { const cup = new THREE.Mesh(CY(.03, .07, 8), std('#efe6da')); cup.position.set(-.18 + i * .07, .66, .1); g.add(cup); }
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.position.set(-8.3, 0, -2.05); g.userData.dyn = true; world.add(g); M.urn = g; addCol([-8.6, -2.3, -8.0, -1.8], 'urn'); rebuildNav(); }
  if (id === 'counter' && !M.counter) { const g = new THREE.Group(), wood = std('#8a6440', .85), top = std('#5d4630', .7); const b = new THREE.Mesh(BX(.95, .95, .5), wood); b.position.y = .475; g.add(b);
    const t = new THREE.Mesh(BX(1.05, .05, .6), top); t.position.y = .97; g.add(t); const s = board(textTex([['TRADE', 54, 48], ['COUNTER', 34, 92, 600]], 256, 120, { bg:'#2f5d8a', fg:'#efe1bd', border:'#1d3a56', bw:8 }), .8, .38); s.position.set(0, .55, .26); g.add(s);
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.position.set(1.15, 0, 9.7); g.userData.dyn = true; world.add(g); M.counter = g; addCol([.65, 9.42, 1.65, 9.98], 'counter'); rebuildNav(); }
  if (id === 'car' && M.car && !M.carSigns) { M.carSigns = []; for (const sd of [1, -1]) { const s = board(textTex([[signName().toUpperCase(), 40, 46], ['EST. 1921 · MILL ROAD', 24, 82, 500]], 512, 110, { bg:'#efe1bd', fg:'#2a1d14', border:'#8a3b1b', bw:6 }), 1.5, .33);
    s.position.set(-.2, .6, sd * .87); s.rotation.y = sd > 0 ? 0 : Math.PI; M.car.add(s); M.carSigns.push(s); } }
  if (id === 'hatch') { buildHatch(); M.hatch.g.visible = true; }
  if (id === 'awning') buildAwning();
  if (id === 'lamps') M.lampsOn = true;
  if (id === 'bell' && M.counter && !M.bell) { const b = new THREE.Group(), brass = std('#c9a24a', .3, .8); const dome = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass); dome.position.y = .03; b.add(dome); const base = new THREE.Mesh(CY(.08, .03, 14), std('#3a2a1a')); b.add(base); b.position.set(.3, .995, 0); M.counter.add(b); M.bell = b; }
  if (id === 'window') buildShopWindow();
  if (id === 'canopy') buildLaneCanopy();
  if (id === 'conductor') buildConductor();
  if (id === 'hd') goLiveHD(fx);
  if (id === 'furnace') lightFurnace(fx);
  if (id === 'bus') { const g = new THREE.Group(); g.position.set(1.5, 0, 13.3); g.userData.dyn = true; const m = std('#2f5a3a', .6, .3); for (const x of [-1.2, 1.2]) { const p = new THREE.Mesh(BX(.08, 2.2, .08), m); p.position.set(x, 1.1, -.5); g.add(p); }
    const back = new THREE.Mesh(BX(2.5, 1.6, .05), new THREE.MeshStandardMaterial({ color:'#c9dde6', transparent:true, opacity:.35, roughness:.1 })); back.position.set(0, 1.2, -.55); g.add(back); const roof = new THREE.Mesh(BX(2.7, .08, 1.2), m); roof.position.set(0, 2.25, 0); g.add(roof);
    const bench = new THREE.Mesh(BX(2.0, .08, .35), std('#8a6a44', .8)); bench.position.set(0, .5, -.3); g.add(bench); world.add(g); M.busShelter = g; }
  if (id === 'clock') { buildClockTower(); if (fx) toast('The works clock tower is up on the office block. The whole valley sets its watch by Iron Valley now.', 'gold'); }
  if (id === 'canteen') buildCanteen();
  if (id === 'changeover' && !M.changeover) { const g = new THREE.Group(); g.position.set(P.gen[0] + 1.3, 0, P.gen[1] + 1.05); g.userData.dyn = true; const b = new THREE.Mesh(BX(.55, .75, .22), std('#5d6b74', .5, .4)); b.position.y = 1.1; b.castShadow = true; g.add(b);
    const l = new THREE.Mesh(BX(.07, .07, .03), std('#4f9a5a', .3, 0, { emissive:'#3fd06a', emissiveIntensity:1.2 })); l.position.set(.15, 1.3, .12); g.add(l); const leg = new THREE.Mesh(BX(.06, .75, .06), std('#3a3d41')); leg.position.y = .37; g.add(leg); world.add(g); M.changeover = g;
    if (fx) toast('The automatic changeover is wired in: in a mains cut the generator takes the load by itself in seconds.', 'good'); }
  if (id === 'mill') return;
  if (id === 'yard') { if (M.skip) { M.skip.visible = false; COL.delete('skip'); } (M.yardMarks || []).forEach(m => m.visible = false); M.junk.visible = false; M.junkCols.forEach(k => COL.delete(k)); M.yardDirt.visible = false; M.yardGravel.visible = true; M.plotSign.visible = true; }
  if (fx) { const at = PADS.find(p => p.id === id).at; for (let i = 0; i < 10; i++) puff(at[0] + rand(-1, 1), at[1] + rand(-1, 1), '#d8d2c4'); sfx('buy'); }
}

// v2.0 18.4: the gate awning, a striped shopfront canvas on two poles behind the trade counter, over the counter and the
// spot where the walk-ins wait (it keeps the light-rain trade going)
function buildAwning(){ if (M.awning) return; const g = new THREE.Group(), wood = std('#6b4a2a', .85), x0 = .35, x1 = 2.85, zb = 9.3, zf = 10.5, hb = 2.45, hf = 2.12;
  for (const x of [x0 + .1, x1 - .1]) { const p = new THREE.Mesh(BX(.09, hb, .09), wood); p.position.set(x, hb / 2, zb); p.castShadow = true; g.add(p); addCol([x - .07, zb - .07, x + .07, zb + .07], 'awning' + x); }
  const t = tex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ece2c6' : '#3f6b45'; c.fillRect(i * w / 8, 0, w / 8 + 1, h); } }), L = Math.hypot(zf - zb, hb - hf);
  const cv = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, L), new THREE.MeshStandardMaterial({ map:t, side:THREE.DoubleSide, roughness:.9 })); cv.rotation.x = -Math.PI / 2 + Math.atan2(hb - hf, zf - zb); cv.position.set((x0 + x1) / 2, (hb + hf) / 2, (zb + zf) / 2); cv.castShadow = true; cv.receiveShadow = true; cv.name = 'awning_canvas'; g.add(cv);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, .22), new THREE.MeshStandardMaterial({ map:t, side:THREE.DoubleSide, roughness:.9 })); val.position.set((x0 + x1) / 2, hf - .1, zf); g.add(val);   // the scalloped front valance
  for (const x of [x0 + .1, x1 - .1]) { const arm = new THREE.Mesh(BX(.04, .04, L), wood); arm.rotation.x = Math.atan2(hb - hf, zf - zb); arm.position.set(x, (hb + hf) / 2 - .03, (zb + zf) / 2); g.add(arm); }
  g.userData.dyn = true; world.add(g); M.awning = g; fadeGroup(g, ['awning_canvas'], [x0 - .2, zb - .3, x1 + .2, zf + .3]); rebuildNav(); }
// the shop window: a glazed display case on the front fence beside the counter, facing Mill Road, a crate, a pipe and a tool inside
function buildShopWindow(){ if (M.shopWin) return; const g = new THREE.Group(), wood = std('#2f5d8a', .7), glass = new THREE.MeshStandardMaterial({ color:'#cfe2ee', transparent:true, opacity:.28, roughness:.05, metalness:.1 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  box(1.5, .08, .5, wood, 0, .55, 0); box(1.5, .08, .5, wood, 0, 1.45, 0); box(.08, .98, .5, wood, -.71, 1.0, 0); box(.08, .98, .5, wood, .71, 1.0, 0); box(1.4, .9, .02, std('#efe1bd', .9), 0, 1.0, -.22);
  box(1.36, .84, .02, glass, 0, 1.0, .24); const legs = [-.66, .66]; for (const x of legs) box(.07, .55, .07, wood, x, .27, 0);
  const cr = crateMesh(); cr.scale.setScalar(.7); cr.position.set(-.42, .6, 0); g.add(cr); const pp = inst('prop_pipe'); pp.scale.setScalar(.55); pp.rotation.y = Math.PI / 2; pp.position.set(.1, .66, 0); g.add(pp);
  const sg = board(textTex([['IRON VALLEY WORKSHOP', 34, 30], ['CRATES · PIPE · TOOLS · TRADE INSIDE', 18, 62, 500]], 512, 84, { bg:'#2f5d8a', fg:'#efe1bd' }), 1.46, .24); sg.position.set(0, 1.62, .26); g.add(sg);
  g.position.set(-.4, 0, 12.05); g.userData.dyn = true; world.add(g); M.shopWin = g; addCol([-1.2, 11.8, .4, 12.32], 'shopWin'); rebuildNav(); }
// the loading-lane canopy: corrugated sheets on a cantilever from three posts along the lane's south edge, over the lane
// from the machines to the foot of the dock ramp (clear of the lane itself, the ramp and the yard lamp at 9.3, 7.6)
function buildLaneCanopy(){ if (M.laneCanopy) return; const g = new THREE.Group(), steel = std('#5a5f63', .6, .5), sheet = std('#8d9396', .55, .55), x0 = 2.7, x1 = 10.35, zs = 7.3, zn = 5.15, hs = 2.75, hn = 3.05;
  for (const x of [x0 + .12, (x0 + x1) / 2 - .5, x1 - .2]) { const p = new THREE.Mesh(BX(.12, hs, .12), steel); p.position.set(x, hs / 2, zs); p.castShadow = true; g.add(p); addCol([x - .08, zs - .08, x + .08, zs + .08], 'laneCanopy' + x.toFixed(1));
    const arm = new THREE.Mesh(BX(.07, .07, zs - zn + .1), steel); arm.rotation.x = -Math.atan2(hn - hs, zs - zn); arm.position.set(x, (hs + hn) / 2 - .05, (zs + zn) / 2); g.add(arm);
    const strut = new THREE.Mesh(BX(.05, .05, 1.4), steel); strut.rotation.x = .78; strut.position.set(x, hs - .45, zs - .45); g.add(strut); }
  const t = tex(64, 256, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#9aa1a4' : '#7f868a'; c.fillRect(i * w / 16, 0, w / 16 + 1, h); } c.fillStyle = 'rgba(120,70,40,.35)'; for (let i = 0; i < 30; i++) c.fillRect(Math.random() * w, Math.random() * h, 3, 18); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); const L = Math.hypot(zs - zn, hn - hs);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, L), new THREE.MeshStandardMaterial({ map:t, color:'#ffffff', side:THREE.DoubleSide, roughness:.6, metalness:.4 })); roof.rotation.x = -Math.PI / 2 - Math.atan2(hn - hs, zs - zn); roof.position.set((x0 + x1) / 2, (hs + hn) / 2 + .02, (zs + zn) / 2); roof.castShadow = true; roof.receiveShadow = true; roof.name = 'lane_roof'; g.add(roof);
  g.userData.dyn = true; world.add(g); M.laneCanopy = g; fadeGroup(g, ['lane_roof'], [x0 - .3, zn - .4, x1 + .3, zs + .6]); rebuildNav(); }   // the roof fades while the owner is under it
// the yard lamps: the three old lamp posts get new lamps; they light at dusk, in fog and in a storm, and at the whistle
function updateYardLamps(dt){ if (!M.lampsOn) return; if (!M.lampFx) { M.lampFx = [];
    for (const [x, z] of [[1.6, 10.8], [-6.0, 4.6], [9.3, 7.6]]) { const glow = new THREE.Mesh(new THREE.CircleGeometry(1.9, 28), new THREE.MeshBasicMaterial({ map:TX.dot, color:'#ffd88a', transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(x, .04, z + .8); glow.renderOrder = 4; world.add(glow); const lens = new THREE.Mesh(new THREE.PlaneGeometry(.18, .3), new THREE.MeshBasicMaterial({ color:'#fff2c8', transparent:true, opacity:0 })); lens.rotation.x = Math.PI / 2; lens.position.set(x, 3.87, z + .8); world.add(lens); M.lampFx.push({ glow, lens }); } }
  const on = !!(S.day && S.day.closing) || wxFog() > .3 || stormOn() || wxRain() > .5 || wxK('hemi') < .85, k = M.lampK = clamp((M.lampK || 0) + (on ? dt : -dt) * .8, 0, 1);   // dull days, fog, rain and the whistle: April to August it is still light at five
  for (const f of M.lampFx) { f.glow.material.opacity = .62 * k; f.lens.material.opacity = k; } }

/* =====================================================================
   CHARACTERS
   ===================================================================== */
const mixers = [];
const SLOTS = ['skin','hair','shirt','suit','pants','boots','hat','eyes','metal','stache','belt','glove','s1','s2','s3','s4','vest','stripe','tool','board','paper','lens','muff','cord','x1','x2','x3','x4','x5','x6','x7','x8'];
const BASE_COL = { skin:'#e0ac85', hair:'#4b3424', shirt:'#c9b28a', suit:'#3f6c94', pants:'#2f3b52', boots:'#1b1814', hat:'#e3a52a', eyes:'#161616', metal:'#8d939a', stache:'#4b3424',
  belt:'#3b2a1c', glove:'#8a6a3e', s1:'#a8322a', s2:'#f4efe6', s3:'#e2967f', s4:'#2a2420',
  vest:'#f2c230', stripe:'#dfe3e6', tool:'#c23b2a', board:'#8a6440', paper:'#f1ede2', lens:'#9fd0e6', muff:'#c23b2a', cord:'#1d1d1d', x1:'#fff', x2:'#fff', x3:'#fff', x4:'#fff', x5:'#fff', x6:'#fff', x7:'#fff', x8:'#fff' };
function paletteTex(cols){
  const c = Object.assign({}, BASE_COL, cols), data = new Uint8Array(SLOTS.length * 4);
  SLOTS.forEach((s, i) => { const k = new THREE.Color(c[s]).convertLinearToSRGB(); data.set([k.r, k.g, k.b].map(v => Math.round(v * 255)).concat(255), i * 4); });
  const t = new THREE.DataTexture(data, SLOTS.length, 1); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
const VARIANTS = ['hat_hard', 'hat_cap', 'hair_short', 'hair_pony', 'beard', 'stache', 'vest', 'toolbelt', 'clipboard', 'wrench', 'earmuffs'];
function makeChar(model, x, z, opts = {}){
  const o = SkeletonUtils.clone(A[model].scene); o.position.set(x, 0, z); world.add(o); o.add(blob(.62, .62));
  let mat = null;
  o.traverse(m => { if (!m.isSkinnedMesh) return; m.frustumCulled = false; m.castShadow = true;
    if (VARIANTS.includes(m.name)) m.visible = !!(opts.parts && opts.parts.includes(m.name));
    if (opts.cols) { if (!mat) { mat = m.material.clone(); mat.map = paletteTex(opts.cols); } m.material = mat; } });
  if (mat) mat.userData.c = true;
  const mixer = new THREE.AnimationMixer(o); mixers.push(mixer);
  const c = { o, mixer, clip:null, action:null, stack:[], carryType:null, dir:0, path:null, model, mat };
  c.play = (n, speed = 1) => { if (c.clip === n) { c.action.timeScale = speed; return; } const clip = A[model].animations.find(a => a.name === n); const a = mixer.clipAction(clip);
    a.reset(); a.setLoop(n === 'cheer' ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = true; a.timeScale = speed;
    if (c.action) a.crossFadeFrom(c.action, .2, false); a.play(); c.action = a; c.clip = n; };
  c.face = (dx, dz, dt) => { if (Math.hypot(dx, dz) < 1e-3) return; const want = Math.atan2(dx, dz); let d = ((want - c.dir + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; c.dir += d * Math.min(1, dt * 12); o.rotation.y = c.dir; };
  c.faceNow = a => { c.dir = a; o.rotation.y = a; };
  c.faceTo = (xz, dt = 1) => c.face(xz[0] - o.position.x, xz[1] - o.position.z, dt);
  return c;
}
let owner = null;
const staffObj = new Map();
const temps = [];          // contractors: characters who are not on the payroll
function lookCols(st){ return Object.assign({ skin:st.look.skin, hair:st.look.hair, stache:st.look.hair, shirt:st.look.shirt, glove:['#8a6a3e', '#e8c02a', '#e5772b', '#2f7fd0'][S.up.hands] }, ROLE[st.role].col); }
function spawnStaff(st, x, z){
  const c = makeChar('worker', x, z, { parts:st.look.parts, cols:lookCols(st) });
  c.st = st; c.state = 'idle'; c.t = 0; c.play('idle');
  staffObj.set(st.id, c); return c;
}
function newLook(role, fem = Math.random() < .4){
  const parts = [];
  if (fem) parts.push('hair_pony'); else { parts.push('hair_short'); const f = pick(['', 'beard', 'stache', '']); if (f) parts.push(f); }
  parts.push(...ROLE[role].gear);
  if (role === 'loader') parts.push(Math.random() < .5 ? 'hat_cap' : 'hat_hard');
  return { parts:[...new Set(parts)], skin:pick(SKINS), hair:pick(HAIRS), shirt:pick(SHIRTS) };
}
const hasRole = r => S.staff.some(s => s.role === r);
const staffOf = r => [...staffObj.values()].filter(c => c.st.role === r);
const lvSpeed = st => 1 + PG.lvBonus(st.lv) + 0.1 * S.up.hands;
const maxCrewSpeed = () => 1 + PG.lvBonus(maxLv()) + 0.1 * 3;                  // fully trained, best gloves, at this level
// Ratings run on one scale for the whole game (owner's rule, build 0.17): a new hand at level 1 is 10%, a worker
// fully trained at the top level with every Quick hands step is 100%. The same for machines.
const UP_ = id => PG.UPGRADES.find(u => u.id === id);
const GAME_TOP_CREW = 1 + PG.lvBonus(PG.workerLvCap(PG.LAST_LEVEL)) + .1 * PG.maxSteps(UP_('hands'), PG.LAST_LEVEL - 1);
const GAME_TOP_SAW = (1 + .2 * PG.maxSteps(UP_('saw'), PG.LAST_LEVEL - 1)) * (1 + .05 * 3);
const scaleRating = (k, top) => Math.round(clamp(10 + 90 * (k - 1) / (top - 1), 10, 100));
const ratingOf = st => scaleRating(lvSpeed(st), GAME_TOP_CREW);
const sawK = () => (1 + .2 * S.up.saw) * autoFeedK();
const sawRating = () => scaleRating(sawK(), GAME_TOP_SAW);
const supervisor = () => staffOf('supervisor')[0];
function crewSpeed(c){
  return (c.st.chief ? 1.1 : 1) * (c.st.role === 'loader' && (S.up.docklamps || 0) >= 2 && (wxFog() > .3 || dayMin() > 480) ? [1, 1, 1.05, 1.1][Math.min(3, S.up.docklamps)] : 1) * (S.restored.urn && c.st.id > 0 ? 1.05 : 1) * (c.st.id > 0 && typeof canteenK === 'function' ? canteenK() : 1) * (c.st.id > 0 ? iceK() : 1) * rainK(c) * (typeof walkSnowK === 'function' ? walkSnowK() : 1) * lvSpeed(c.st) * (.85 + .15 * (c.st.focus ?? 100) / 100) * (c.zone ? 1.15 : 1) * (circuitOn('lights') ? 1 : .8) * (c.old ? .75 : 1) * (gusLift(c) ? 1.1 : 1) * (S.time < S.gus.cheerUntil && c.st.id > 0 ? 1.1 : 1);
}
const repairSpeed = c => lvSpeed(c.st) * (S.gus.toolbox ? 1.15 : 1) * (1 + .3 * S.up.tools) * (c.st.role === 'electrician' ? 1 + .25 * S.up.meter : 1);
const xpReady = st => st.lv < maxLv() && st.xp >= PG.xpNext(st.lv);
function giveXp(st, n){ if (!st || st.id < 0) return; const was = xpReady(st); st.xp = Math.min(st.xp + n, PG.xpNext(Math.min(st.lv, maxLv() - 1)) || st.xp + n); if (!was && xpReady(st)) { toast(`${st.name} is ready for training. Visit the office.`, 'gold'); officeDot(); } }

/* =====================================================================
   STACKS: timber rack, in-feed, pallet, carried, truck bed, cash pile
   ===================================================================== */
const planks = { rack:[], feed:[], bed:[] }, crates = { pallet:[], bed:[], wh:[] };
function plankMesh(len = .6){ const p = inst('env_plank'); p.scale.set(len, 1, 1); return p; }
function crateMesh(){ return inst('prop_crate'); }
function rackPos(i){ const layer = Math.floor(i / 4), k = i % 4; return new THREE.Vector3(P.timber[0], 1.02 + layer * .065, P.timber[1] - .3 + k * .2); }
function feedPos(i){ const layer = Math.floor(i / 3), k = i % 3; return new THREE.Vector3(P.feed[0] - .21 + k * .21, .62 + layer * .065, P.feed[1]); }
function palletPos(i){ const layer = Math.floor(i / 9), k = i % 9; return new THREE.Vector3(P.pallet[0] - .3 + (k % 3) * .3, .145 + layer * .3, P.pallet[1] - .3 + Math.floor(k / 3) * .3); }
const palletCap = () => 20 + 6 * S.up.stack;   // Gameplay Bible 4.4: initial output pallet 20
function syncStack(arr, n, make, posFn, rot){
  while (arr.length < n) { const m = make(); world.add(m); arr.push(m); }
  while (arr.length > n) arr.pop().removeFromParent();
  arr.forEach((m, i) => { m.position.copy(posFn(i)); if (rot) m.rotation.y = rot; });
}
const syncRack = () => syncStack(planks.rack, S.timber, () => plankMesh(1), rackPos, 0);
function storePos(i){ const L = Math.floor(i / 8), j = i % 8, side = j < 4 ? 1 : -1, m = j % 4;
  return new THREE.Vector3(P.storeRack[0], [.35, .95, 1.55][Math.min(L, 2)] + .03 + Math.floor(m / 2) * .065 + Math.max(0, L - 2) * .13, P.storeRack[1] + side * (.2 + (m % 2) * .21)); }
planks.store = [];
const syncStore = () => syncStack(planks.store, S.store, () => plankMesh(1.4), storePos, 0);
function trolleyPos(i){ return new THREE.Vector3(0, .26 + Math.floor(i / 3) * .065, -.2 + (i % 3) * .2); }
const trolleyCap = () => 8 + 4 * S.up.supply;
function syncBundles(){
  const steel = S.delivery && S.delivery.kind === 'steel', n = S.delivery && sup.state !== 'away' ? (steel ? Math.min(4, onLorry()) : Math.min(4, Math.ceil(onLorry() / 6))) : 0;
  if (M.bundles.length && M.bundles[0].userData.steel !== steel) while (M.bundles.length) M.bundles.pop().removeFromParent();
  while (M.bundles.length < n) { const b = steel ? coilMesh() : inst('env_timber_bundle'); b.userData.steel = steel; M.flat.add(b); M.bundles.push(b); }
  while (M.bundles.length > n) M.bundles.pop().removeFromParent();
  M.bundles.forEach((b, i) => b.position.set(-1.55 + (i % 2) * 1.3, 1.12 + Math.floor(i / 2) * .25, 0));
}
// build 0.20: deliveries from level 3. The flatbed backs into bay 2; its driver unloads onto the goods-in stack and
// leaves; the loaders carry timber from there to the stock room and coils to the coil bay (with no loader on the
// payroll the driver takes it all to the stores himself, as the Bible Addendum has it)
const onLorry = () => S.delivery ? (S.delivery.onLorry ?? S.delivery.left) : 0;
const goodsIn = () => S.delivery ? Math.max(0, S.delivery.left - onLorry()) : 0;
const goodsInArr = [];
function buildGoodsIn(){
  if (M.goodsIn || S.level < 3) return;
  if (M.bayHeap) { M.bayHeap.h.visible = false; COL.delete(M.bayHeap.k); }
  const g = new THREE.Group(), wood = std('#6b4a2a', .9), steel = std('#4a4f55', .5, .5);
  for (const z of [-.75, .75]) { const s = new THREE.Mesh(BX(.9, .12, .16), wood); s.position.set(0, .06, z); g.add(s); }   // sleepers the timber lies on
  for (const x of [-.3, .3]) { const c = new THREE.Mesh(BX(.12, .1, 1.7), steel); c.position.set(x, .05, 0); g.add(c); }   // chocks under the coils
  const sign = board(textTex([['GOODS IN', 48, 54]], 256, 80, { bg:'#e2a72c', fg:'#2a1d14', border:'#2a1d14', bw:6 }), .7, .22); sign.position.set(0, .9, -1.05); g.add(sign);
  const post = new THREE.Mesh(BX(.06, .9, .06), steel); post.position.set(0, .45, -1.08); g.add(post);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.position.set(P.goodsIn[0], 0, P.goodsIn[1]); g.userData.dyn = true; world.add(g); M.goodsIn = g;
  addCol([P.goodsIn[0] - .45, P.goodsIn[1] - 1.0, P.goodsIn[0] + .45, P.goodsIn[1] + 1.0], 'goodsIn'); syncGoodsIn();
}
function goodsInPos(i, steel){ return steel ? new THREE.Vector3(P.goodsIn[0], .32 + Math.floor(i / 4) * .5, P.goodsIn[1] - .6 + (i % 4) * .4) : new THREE.Vector3(P.goodsIn[0] - .3 + (i % 4) * .2, .16 + Math.floor(i / 4) * .065, P.goodsIn[1]); }
function syncGoodsIn(){
  if (!M.goodsIn) return; const steel = S.delivery && S.delivery.kind === 'steel', n = goodsIn();
  if (goodsInArr.length && goodsInArr[0].userData.steel !== steel) while (goodsInArr.length) goodsInArr.pop().removeFromParent();
  while (goodsInArr.length < n) { const m = steel ? coilMesh() : plankMesh(1); m.userData.steel = steel; if (!steel) m.rotation.y = Math.PI / 2; world.add(m); goodsInArr.push(m); }
  while (goodsInArr.length > n) goodsInArr.pop().removeFromParent();
  goodsInArr.forEach((m, i) => m.position.copy(goodsInPos(i, steel)));
}
const syncFeed = () => syncStack(planks.feed, S.feed, () => plankMesh(.6), feedPos, Math.PI / 2);
const syncPallet = () => syncStack(crates.pallet, S.pallet, crateMesh, palletPos);
function bedPos(i){ const k = i % 12, layer = Math.floor(i / 12); return new THREE.Vector3(-1.85 + (k % 4) * .42, 1.0 + layer * .3, -.45 + Math.floor(k / 4) * .45); }
function syncBed(){ while (crates.bed.length < S.bed) { const c = crateMesh(); M.truck.add(c); crates.bed.push(c); } while (crates.bed.length > S.bed) crates.bed.pop().removeFromParent(); crates.bed.forEach((c, i) => c.position.copy(bedPos(i))); }
// build 0.18b: goods are carried the way a yard hand carries them. The characters stand about 1.2 m (shoulders at 0.75 m,
// hands at about 0.55 m when carrying). By hand: pipes across both forearms, at most two crates in front of the chest.
// More crates go on a platform trolley from the trolley bay (2 x 2 crates a layer); pipes on a trolley lie along its deck.
const CART_FROM = 3, HAND_CRATES = 2;
function carriedPos(type, i, n = i + 1, cart = false){
  if (type === 'crate') { if (!cart) return new THREE.Vector3(0, .42 + i * .3, .3);
    const layer = Math.floor(i / 4), k = i % 4; return new THREE.Vector3(k % 2 ? .155 : -.155, .17 + layer * .3, .5 + Math.floor(k / 2) * .31); }
  if (type === 'pipe') return cart ? new THREE.Vector3(-.24 + (i % 5) * .12, .2 + Math.floor(i / 5) * .12, .65) : new THREE.Vector3(0, .52 + Math.floor(i / 2) * .12, .24 + (i % 2) * .12);
  return type === 'plank' || type === 'timber' ? new THREE.Vector3(0, .5 + i * .07, .27) : type === 'fuel' ? new THREE.Vector3(.2, .12, .05) : type === 'coil' ? new THREE.Vector3(0, .22, .42) : type === 'bottle' ? new THREE.Vector3(0, .45, .34) : type === 'toolbox' ? new THREE.Vector3(0, .55 + i * .18, .3) : new THREE.Vector3(0, .5 + i * .3, .3);
}
// how high the load reaches, for the name tag above the head
const carryTop = ch => { const n = ch.stack.length, t = ch.carryType; return !n || t === 'fuel' || ch.cart ? 0 : t === 'crate' ? Math.max(0, .12 + n * .3 - .6) : t === 'toolbox' ? Math.max(0, n * .18 - .4) : 0; };
// the platform trolley: a timber deck on four castors with a steel push handle at hand height (customers bring their own, painted green)
const cartProto = {};
function makeCart(deck = '#8a6440'){
  if (!cartProto[deck]) { const g = new THREE.Group(), wood = std(deck, .85), steel = std('#3c4248', .5, .6), tyre = std('#1c1c1c', .9);
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(.66, .045, .68), wood, 0, .135, .65);
    for (const x of [-.27, .27]) for (const z of [.38, .92]) add(new THREE.CylinderGeometry(.055, .055, .04, 10), tyre, x, .055, z).rotation.z = Math.PI / 2;
    for (const x of [-.25, .25]) add(new THREE.BoxGeometry(.03, .5, .03), steel, x, .39, .32);
    add(new THREE.CylinderGeometry(.018, .018, .56, 8), steel, 0, .63, .32).rotation.z = Math.PI / 2;
    cartProto[deck] = g; }
  const o = cartProto[deck].clone(); o.userData.dyn = true; return o;
}
// the trolley bay: four trolleys parked in a painted bay just south of the crate machine's pad, clear of the path from
// the gate. Whoever needs one walks to its handle, takes it, and brings it back when it is empty.
const BAY = [[-2.25, 6.75], [-1.5, 6.75], [-.75, 6.75], [0, 6.75]];   // deck centres
const carts = [];
const cartSpot = i => [BAY[i][0], BAY[i][1] - .85];   // where a hand stands to take or park it: at the handle, facing south
function buildCartBay(){
  const pm = paintMat('#e3b23c'); dashRect(-2.7, 6.3, .45, 7.2, pm, .4, .25, .08); groundLabel('TROLLEYS', -1.125, 7.45, 1.6);
  BAY.forEach((b, i) => { const o = makeCart(); o.position.set(b[0], 0, b[1] - .65); world.add(o); carts.push({ o, slot:i, by:null }); });
  syncCartCols();
}
const freeCart = () => carts.find(k => !k.by);
// each trolley space blocks the way only while a trolley stands in it: an empty space can be walked through
function syncCartCols(){ COL.delete('cartBay'); BAY.forEach((b, i) => { const id = 'cartBay' + i, full = carts.some(k => k.slot === i && cartParked(k)); if (full && !COL.has(id)) addCol([b[0] - .36, 6.35, b[0] + .36, 7.15], id); else if (!full && COL.has(id)) COL.delete(id); }); }
function takeCart(ch, k){ k.by = ch; ch.cart = k.o; ch.cartRec = k; ch.o.add(k.o); k.o.position.set(0, 0, 0); k.o.rotation.set(0, 0, 0); layoutCarry(ch); syncCartCols(); sfxAt('drop', ch.o.position.x, ch.o.position.z, .4); }
// the bay's four spaces are shared: a trolley goes back into whichever space is empty, not only the one it came out of
const cartParked = k => !(k.by && k.by.cart === k.o);   // standing in its space (a reservation does not move it)
const slotFree = (i, mine) => !carts.some(k => k !== mine && ((k.slot === i && cartParked(k)) || k.parkTo === i));
function parkSlotNear(ch){ const p = ch.o.position; let best = -1, bd = 1e9; BAY.forEach((b, i) => { if (!slotFree(i, ch.cartRec)) return; const s = cartSpot(i), d = Math.hypot(s[0] - p.x, s[1] - p.z); if (d < bd) { bd = d; best = i; } }); return best; }
function parkCart(ch, slot){ const k = ch.cartRec; if (!k) return; if (slot != null && slot >= 0) k.slot = slot; k.parkTo = null; world.add(k.o); k.o.position.set(BAY[k.slot][0], 0, BAY[k.slot][1] - .65); k.o.rotation.set(0, 0, 0); k.by = null; ch.cart = null; ch.cartRec = null; ch.cartFor = null; layoutCarry(ch); syncCartCols(); sfxAt('drop', ch.o.position.x, ch.o.position.z, .4); }
function releaseCart(ch){ if (ch.cartFor && !ch.cart) { ch.cartFor.by = null; ch.cartFor = null; } }   // a reservation dropped on the way to the bay
// a worker taking an empty trolley home to the bay first (lunch, knocking-off): true while still walking it back
function cartBack(c){ const i = parkSlotNear(c), k = c.cartRec; k.parkTo = i >= 0 ? i : k.slot; goTo(c, ...cartSpot(k.parkTo)); }
// on arrival: the space is still empty, park; somebody filled it first, try the next empty one
function cartArrive(c){ const k = c.cartRec, i = k.parkTo ?? k.slot; if (slotFree(i, k)) { c.faceNow(0); parkCart(c, i); return true; } k.parkTo = null; cartBack(c); return false; }
function cartHome(c, dt){ if (!c.cart) return false; if (!c.cartHome) { c.cartHome = true; cartBack(c); } if (walk(c, dt)) { if (cartArrive(c)) { c.cartHome = false; return false; } } return true; }
// re-lay a load when its size changes
function syncCarry(){
  const list = carriers(); if (walker) list.push(walker.c);
  for (const ch of list) if (ch._carryN !== ch.stack.length) { ch._carryN = ch.stack.length; layoutCarry(ch); }
}
function layoutCarry(ch){ if (ch.carryType === 'fuel') return; const n = ch.stack.length, cart = !!ch.cart; ch.stack.forEach((m, i) => { if (m.userData.flying) return; const par = cart ? ch.cart : ch.o; if (m.parent !== par) par.add(m); m.position.copy(carriedPos(ch.carryType, i, n, cart)); m.rotation.set(0, cart && ch.carryType === 'pipe' ? Math.PI / 2 : 0, 0); if (ch.carryType === 'fuel') m.scale.setScalar(.8); }); }
const flights = [];
function fly(obj, toParent, toLocal, dur = .25, done, arc = .5){
  const from = obj.getWorldPosition(new THREE.Vector3()); scene.add(obj); obj.position.copy(from); obj.userData.flying = true;
  flights.push({ obj, a:from, toParent, toLocal:toLocal.clone(), t:0, dur, done, arc });
}
function updateFlights(dt){
  for (let i = flights.length - 1; i >= 0; i--) { const f = flights[i]; f.t += dt; const k = Math.min(1, f.t / f.dur);
    const b = f.toParent.localToWorld(f.toLocal.clone()); f.obj.position.lerpVectors(f.a, b, k); f.obj.position.y += Math.sin(k * Math.PI) * f.arc;
    if (k >= 1) { f.toParent.add(f.obj); f.obj.position.copy(f.toLocal); f.obj.userData.flying = false; flights.splice(i, 1); if (f.done) f.done(); } }
}
const poolOf = type => type === 'plank' || type === 'timber' ? planks : type === 'coil' ? coilsArr : type === 'pipe' ? pipesArr : type === 'toolbox' ? toolsArr : type === 'bottle' ? bottlesArr : crates;
function takeFrom(arrName, ch, type){
  const arr = poolOf(type)[arrName]; const m = arr.pop(); if (!m) return false;
  ch.carryType = type; ch.stack.push(m); if (arrName === 'rack' && type === 'plank') m.scale.set(.6, 1, 1); fly(m, ch.o, carriedPos(type, ch.stack.length - 1, ch.stack.length, !!ch.cart), .22, () => layoutCarry(ch)); m.rotation.set(0, 0, 0); return true;
}
function giveTo(ch, arrName, parent, posFn, done){
  const top = ch.stack[ch.stack.length - 1]; if (!top || top.userData.flying) return false;
  const m = ch.stack.pop(); const arr = poolOf(ch.carryType)[arrName]; const idx = arr.length; arr.push(m);
  if (arrName === 'feed') m.rotation.y = Math.PI / 2;
  if (arrName === 'store') { m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); }
  fly(m, parent, posFn(idx), .24, done); if (!ch.stack.length) ch.carryType = null; return true;
}
const cashMat = new THREE.MeshLambertMaterial({ color:'#6f9f4f' }), bandMat = new THREE.MeshLambertMaterial({ color:'#ece6d6' });
const bundleGeo = new THREE.BoxGeometry(.26, .07, .14), bandGeo = new THREE.BoxGeometry(.05, .075, .145);
const pile = [];
function bundle(){ const g = new THREE.Group(); const a = new THREE.Mesh(bundleGeo, cashMat); a.castShadow = true; g.add(a, new THREE.Mesh(bandGeo, bandMat)); return g; }
function pilePos(i){ const k = i % 6, layer = Math.floor(i / 6); return new THREE.Vector3(P.cash[0] - .3 + (k % 3) * .3, .04 + layer * .075, P.cash[1] - .1 + Math.floor(k / 3) * .2); }
function syncPile(){ const n = Math.min(42, Math.ceil(S.cashPile / 25)); while (pile.length < n) { const b = bundle(); world.add(b); pile.push(b); } while (pile.length > n) pile.pop().removeFromParent(); pile.forEach((b, i) => b.position.copy(pilePos(i))); }

/* =====================================================================
   PRODUCTION: timber supply, saw
   ===================================================================== */
let sawT = 0, sawOn = false, sawBy = null, sawStallT = 0;
// What is left to make is counted from what physically exists, never from a running tally: crates the truck
// still needs, minus crates on the pallet, in hands and in the warehouse. A crate that goes missing (the
// reload bug of build 0.10, or anything else) is simply made again instead of stalling the order for ever.
const siteCrates = () => S.pallet + countCrates() + S.wh.c + S.lv4.pallet2 + (typeof fork !== 'undefined' ? forkCrates() : 0);
const sitePipes = () => S.pipes + countPipes() + S.wh.p;
const needCrates = () => S.order && !S.order.ready ? Math.max(0, (S.order.qty || 0) - S.bed) : 0;
const needPipes = () => S.order && !S.order.ready ? Math.max(0, (S.order.pq || 0) - S.pbed) : 0;
const orderLeft = () => S.order && S.order.briefed ? Math.max(0, needCrates() - siteCrates()) : 0;
// make to stock (warehouse): keep making until the warehouse would be full once the open order is covered
const whReady = () => S.lv2.wh >= 2 && !!M.wh;
const whMaking = () => whReady() && S.wh.make;
// the warehouse grows with the plant: from level 3 Big Tom's crew adds a tool rack inside it (12 boxes, 4 more per racking step)
const whCapC = () => 24 + 12 * S.up.whcap, whCapP = () => 12 + 6 * S.up.whcap, whCapT = () => M.whTools ? Math.min(24, 12 + 4 * S.up.whcap) : 0;
// build 0.18: what a customer waiting at the gate is still short of, beyond the pallet (or pipe rack) and the owner's arms,
// is work for the machine too: the operator makes it even when the lorry order has none of it
const gateLeft = type => { const w = walkWant(type); if (!w) return 0; const held = owner && owner.carryType === type ? owner.stack.length : 0; return Math.max(0, w - held - (type === 'pipe' ? S.pipes : S.pallet)); };
const stockLeftC = () => Math.max(whMaking() ? Math.max(0, needCrates() + whCapC() - siteCrates()) : 0, gateLeft('crate'));
const stockLeftP = () => Math.max(whMaking() ? Math.max(0, needPipes() + whCapP() - sitePipes()) : 0, gateLeft('pipe'));
function syncOrderCounts(){ const o = S.order; if (!o) return; o.cut = Math.min(o.qty || 0, S.bed + siteCrates()); o.pcut = Math.min(o.pq || 0, S.pbed + sitePipes()); o.tcut = Math.min(o.tq || 0, S.tbed + siteTools()); }
// Who runs a machine: its operator while working, otherwise the owner standing at the operator spot. The
// owner's hands brief the order on the spot (there is nobody to tell). A broken machine still runs at half speed.
function handOn(oc, spot, mach){
  if (oc && oc.state === 'work') return oc;
  if (!ownerOn(spot)) return null;
  if (S.order && !S.order.briefed) briefOrder(null);
  owner.st.energy = 100; owner.st.focus = 100; owner.working = T; owner.workAt = mach; return owner;
}
const brokenK = broken => broken ? .5 : 1;
function sawWorker(){
  if (!circuitOn('saw')) return null;
  const oc = sawOp(); if (!(oc && oc.state === 'work')) { const g = gusChar(); if (g && g.job === 'saw' && g.gs === 'at') { if (S.order && !S.order.briefed) briefOrder(null); return g; } }
  return handOn(oc, P.op, P.saw);
}

// build 0.16: the crate line runs like a real machine. One cycle: the plank rolls in over the infeed and through
// the blade (sawdust), the nailer hammers the crate together on the jig, the finished crate rolls off the outfeed.
function lineNodes(m){ return m.userData.ln ||= { blade:m.getObjectByName('blade'), pulley:m.getObjectByName('pulley'), plank:m.getObjectByName('plank'),
  rollers:[...Array(8)].map((_, i) => m.getObjectByName('roller_' + i)).filter(Boolean), head:m.getObjectByName('press_head'), wip:m.getObjectByName('crate_wip'),
  out:m.getObjectByName('crate_out'), wheel:m.getObjectByName('comp_wheel'), piston:m.getObjectByName('comp_piston') }; }
function animLine(m, cyc, run, dt, powered = true, stocked = false){
  const n = lineNodes(m); if (!n.blade) return;
  n.base ||= { plank:n.plank.position.x, head:n.head.position.y, out:n.out.position.x, piston:n.piston.position.y };
  const ud = m.userData; ud.spin = lerp(ud.spin || 0, run ? 34 : powered ? 0 : 0, Math.min(1, dt * (run ? 3 : .8)));
  n.blade.rotation.z -= dt * ud.spin; n.pulley.rotation.z -= dt * ud.spin * .55;
  const air = run || (powered && (ud.air = (ud.air || 0) + dt) % 9 < 2.5);           // the compressor tops up now and then
  if (air) { n.wheel.rotation.x += dt * 22; n.piston.position.y = n.base.piston + Math.abs(Math.sin(T * 22)) * .035; }
  if (!run) { n.plank.visible = stocked; n.plank.position.x = n.base.plank - .35; n.head.position.y = n.base.head; n.wip.visible = false; n.out.visible = false; return; }
  const p = cyc % 1;
  // 0 .. .5: the plank rolls in and through the saw
  n.plank.visible = p < .5; n.plank.position.x = n.base.plank - .4 + p / .5 * 1.25;
  const roll = p < .5 ? 16 : 0; for (let i = 0; i < 6; i++) n.rollers[i].rotation.z -= dt * roll;
  if (p > .28 && p < .5 && Math.random() < dt * 30) dustBurst(m);
  // .45 .. .9: the nailer drives the crate together
  n.wip.visible = p > .45 && p < .9;
  const nail = p > .5 && p < .88 ? Math.max(0, Math.sin((p - .5) * Math.PI * 16)) : 0; n.head.position.y = n.base.head - nail * .13;
  if (nail > .97 && !ud.hit) { ud.hit = true; sfxAt('nail', m.position.x, m.position.z, .8); const q = (ud.nail ||= m.getObjectByName('nail_spot').getWorldPosition(new THREE.Vector3())); sprite('#d8d2c4', q.x + rand(-.15, .15), q.y, q.z, rand(-.3, .3), rand(.2, .5), rand(-.3, .3), .35, .07); }
  if (nail < .5) ud.hit = false;
  // .88 .. 1: the finished crate rolls off the outfeed towards the pallet
  n.out.visible = p > .88; n.out.position.x = n.base.out + (p - .88) / .12 * .3; for (let i = 6; i < 8; i++) n.rollers[i].rotation.z -= dt * (p > .88 ? 14 : 0);
}
function updateSaw(dt){
  if (suppliesFree() && M.coilBay && S.coils < coilCap()) { S.coils = coilCap(); syncCoilBay(); }
  if (timberFree() && (S.timber < LINE_CAP || S.store < storeCap())) { S.timber = LINE_CAP; S.store = storeCap(); syncRack(); syncStore(); }   // levels 1-2: the supplier keeps the stock room and the line rack full; someone still has to feed the machine
  syncOrderCounts();
  const by = sawWorker(), canRun = by && S.feed > 0 && S.pallet < palletCap() && (orderLeft() > 0 || stockLeftC() > 0);
  sawOn = !!canRun && l6Run('saw'); sawBy = by;
  const blade = M.saw.getObjectByName('blade'), plank = M.saw.getObjectByName('plank');
  if (sawOn) {
    if (ownerFeeds()) { owner.working = T; owner.workAt = P.feed; if (!owner.fedTold) { owner.fedTold = true; floatText('Feeding planks: +25%', P.feed[0], 1.6, P.feed[1], 'info'); } } else if (owner) owner.fedTold = false;
    sawT += dt * (1 + .2 * S.up.saw) * tierK('saw') * autoFeedK() * crewSpeed(by) * pf() * brokenK(sawBroken()) * feedK() * bladeK() * wrongK(); animLine(M.saw, sawT / SAW_CYCLE, true, dt);
    if (Math.random() < dt * 14 * (S.up.saw >= 2 ? .3 : 1)) dustBurst();
    by.st.energy = Math.max(0, by.st.energy - dt * (100 / 90));
    if (sawT >= SAW_CYCLE) { sawT = 0; S.feed--; S.pallet++; S.made++; machCycle('saw'); if (S.wrongTimber > 0) S.wrongTimber--;
      // crate batch upgrade: a steady share of planks yields a second crate (no luck involved)
      S.batchAcc += Math.min(1, .25 * S.up.batch); if (S.batchAcc >= 1 && (orderLeft() > 0 || stockLeftC() > 0) && S.pallet < palletCap()) { S.batchAcc -= 1; S.pallet++; S.made++; floatText('+1 crate', P.saw[0], 1.5, P.saw[1], 'info'); }
      syncOrderCounts(); if (S.order) { if (!S.order.t1) S.order.t1 = Math.round(S.order.time); if (!S.order.tc && S.order.cut >= S.order.qty) S.order.tc = Math.round(S.order.time); } S.cond.saw = Math.max(0, S.cond.saw - 2.2); syncFeed(); syncPallet(); sfxAt('saw', ...P.saw); sfxAt('thunk', P.saw[0] + .6, P.saw[1], .7); giveXp(by.st, 10); }
  } else animLine(M.saw, 0, false, dt, circuitOn('saw') && !sawBroken(), S.feed > 0);
  if (sawBroken() && Math.random() < dt * 5) spark(P.saw[0] + rand(-.3, .3), 1.0, P.saw[1] + rand(-.2, .2));
  setLamp(M.saw.getObjectByName('status_lamp'), ...(sawBroken() || !circuitOn('saw') ? LAMP_STOP : sawOn ? LAMP_RUN() : LAMP_IDLE));
  // production watchdog: work is waiting (order, planks, room on the pallet) but the operator has not got to
  // the saw for 6 s -> put him there. Never fires in normal play; S.sawRescues lets the soak test prove it.
  const why = sawOn ? null : sawReason();
  // where the saw's time goes while an order still has crates to cut (diagnostics for tests and the office)
  if (orderLeft() > 0 || (sawOn && S.order && S.order.briefed)) { const k = sawOn ? 'Cutting' : why.label[2]; const d = S.sawLog || (S.sawLog = {}); d[k] = (d[k] || 0) + dt; }
  sawStallT = why && why.stall ? sawStallT + dt : 0;
  if (sawStallT > 6) { sawStallT = 0; const oc = sawOp();
    if (rescueOp(oc, P.op)) S.sawRescues = (S.sawRescues || 0) + 1; }
}
// One answer to "why is the saw not cutting?", used by the machine label, the operator's status tag and the
// stall watchdog, so the three can never disagree (build 0.7 showed "Operator away" over a waiting operator).
function sawReason(){
  const oc = sawOp(), o = S.order, st = oc ? oc.state : null;
  const R = (cls, title, sub, icon, text, stall = false) => ({ label:[cls, title, sub], op:[icon, text], stall });
  const fault = S.faults.find(f => f.where === 'saw' && !FAULTS[f.kind].svc);
  if (sawOn && fault) return R('warn', 'Half speed', fault.name, 'wrench', 'Working a broken saw');
  if (!powerOn()) return R('bad', 'No power', 'Generator is off', 'bolt', 'No power');
  if (!circuitOn('saw')) return R('bad', 'No power', 'Check the switchboard', 'bolt', 'Saw has no power');
  if (sawOn) return R('', 'Cutting', orderLeft() > 0 ? `${S.pallet}/${palletCap()} crates` : gateLeft('crate') > 0 ? 'Crates for the customer at the gate' : 'Making stock for the warehouse', 'saw', orderLeft() > 0 ? 'Cutting crates' : gateLeft('crate') > 0 ? 'Crates for the gate' : 'Making stock');
  if (!oc) return R('warn', 'Stopped', S.level === 1 && !hasRole('operator') ? 'Stand at the saw to run it' : 'No operator: run it yourself', 'wait', 'No operator');
  if (oc.talk) return R('warn', 'Paused', `${oc.st.name} getting instructions`, 'clip', 'Getting instructions');
  if (oc.need) return R('warn', 'Paused', oc.need.kind === 'drink' ? 'Operator getting water' : 'Operator at the toilet', ...statusOf(oc));
  if (st === 'slack') return R('bad', 'Stopped', 'Operator on the phone', 'phone', 'Slacking');
  if (st === 'break' || st === 'toBreak') return R('warn', 'Stopped', 'Operator on break', st === 'break' ? 'zzz' : 'cup', st === 'break' ? 'On break' : 'Going on break');
  if (st === 'toClean' || st === 'cleaning') return R('warn', 'Paused', 'Operator cleaning the saw', 'wrench', 'Cleaning the saw');
  if (st === 'arrive' || st === 'toWork' || st === 'idle') return R('warn', 'Starting', 'Operator walking to the saw', 'walk', 'Walking to the saw');
  const stock = stockLeftC() > 0;
  if (!o && !stock) return whMaking() ? R('warn', 'Idle', 'Warehouse full of crates', 'wait', 'Warehouse full') : R('warn', 'Idle', 'No order yet', 'wait', 'Waiting for an order');
  if (o && !o.briefed && !stock) return R('warn', 'Idle', 'Operator not briefed', 'wait', 'Waiting to be briefed');
  if (o && !o.qty && !stock) return R('warn', 'Idle', 'No crates on this order', 'wait', 'No crates on this order');
  if (orderLeft() <= 0 && !stock) return R('warn', 'Idle', S.lv2.wh >= 2 ? 'Order covered' : 'Order all cut', 'wait', 'Order all cut');
  if (S.feed === 0) return R('warn', 'Needs planks', 'In-feed empty', 'wait', 'Needs planks');
  if (S.pallet >= palletCap()) return R('warn', 'Pallet full', whReady() ? 'Loaders taking it to the warehouse' : 'Waiting for the truck', 'wait', 'Pallet full');
  return R('warn', 'Starting', 'Next cut', 'saw', 'Starting the cut', true);
}
// share of order time the saw actually cut, and the biggest hold-up, from S.sawLog
function sawUse(){
  const L = S.sawLog || {}, tot = Object.values(L).reduce((a, b) => a + b, 0); if (tot < 20) return '';
  const use = (L.Cutting || 0) / tot * 100, top = Object.entries(L).filter(([k]) => k !== 'Cutting').sort((a, b) => b[1] - a[1])[0];
  return row('Busy on orders', `${Math.round(use)}%`, use, use < 60 ? 'low' : 'xp') + (top ? row('Biggest hold-up', top[0]) : '');
}

/* =====================================================================
   STAFF FACILITIES: WASHROOM, WATER COOLER, CLEANER
   Everyone gets thirsty and needs the toilet. A worker finishes what they are doing, walks over, queues
   if they must, and comes back. Unmet needs drain focus fast; a dirty washroom costs focus too.
   ===================================================================== */
const WC_BLOCKS = [[-6.2, -0.9], [-9.0, -0.9]];          // later levels add washrooms on the land they buy
const WC_QUEUE = [[-4.52, 1.05], [-4.52, 1.7], [-5.2, 2.15], [-5.9, 2.15], [-6.6, 2.15], [-7.3, 2.15]];
const WATER_CAP = 6, WATER_LOT = [3, 24];               // spare bottles on the rack; 3 bottles for $24
const WELFARE = false;                                  // the old needs loop, off for the 1973 game
const stallCount = () => WELFARE ? Math.min(2 + S.up.wc, WC_BLOCKS.length * 2) : 0;
const coolerCap = () => 20 + 10 * S.up.cooler;
const stallSpot = i => { const b = WC_BLOCKS[i >> 1], dx = i % 2 ? .27 : -.77; return { front:[b[0] + dx, b[1] + 1.5], inside:[b[0] + dx, b[1] + .2], b:i >> 1, d:i % 2 }; };
const sinkSpot = b => [WC_BLOCKS[b][0] + 1.02, WC_BLOCKS[b][1] + 1.3];
const stallBy = [];                                      // who is in each stall right now
let coolerBy = null;
const bottlesArr = { shelf:[] };
const bottleMesh = () => inst('fac_bottle');
const bottlePos = i => new THREE.Vector3(P.bottleRack[0], i < 3 ? .08 : .62, P.bottleRack[1] - .32 + (i % 3) * .32);
const syncBottles = () => { if (M.bottleRack) syncStack(bottlesArr.shelf, S.water, bottleMesh, bottlePos); };
function buildFacilities(){
  M.wc = []; syncWC();
  M.cooler = put(inst('fac_water_cooler'), ...P.cooler, 0); M.cooler.userData.dyn = true; addCol([P.cooler[0] - .3, P.cooler[1] - .25, P.cooler[0] + .3, P.cooler[1] + .22]);
  M.coolerWater = findNode(M.cooler, 'cooler_water'); M.coolerWaterS = M.coolerWater.scale.clone();
  M.bottleRack = put(inst('fac_bottle_rack'), ...P.bottleRack, Math.PI / 2); addCol([P.bottleRack[0] - .24, P.bottleRack[1] - .55, P.bottleRack[0] + .24, P.bottleRack[1] + .55]);
  M.mopCart = put(inst('fac_mop_bucket'), P.cleanerHome[0] + .45, P.cleanerHome[1] + .2, -.4); M.mopCart.userData.dyn = true;
  M.wetSign = put(inst('fac_wet_sign'), P.wcCleanSpot[0] + .6, P.wcCleanSpot[1] + .5, .3); M.wetSign.visible = false; M.wetSign.userData.dyn = true;
  // "WC" plate on the block's end wall
  const sg = tex(256, 96, (g, w, h) => { g.fillStyle = '#ece6d9'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f5d8a'; g.font = '700 64px Oswald, Arial'; g.textAlign = 'center'; g.fillText('WC', w / 2, 72); });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(.6, .22), new THREE.MeshBasicMaterial({ map:sg })); pl.position.set(1.4, 1.75, .2); pl.rotation.y = Math.PI / 2; if (M.wc[0]) M.wc[0].root.add(pl);
  syncBottles();
}
// one block per two stalls; a stall not yet paid for stays locked (dark lamp, closed door)
function syncWC(){
  if (!M.wc) return;
  const need = Math.ceil(stallCount() / 2);
  while (M.wc.length < need) { const b = WC_BLOCKS[M.wc.length], root = put(inst('fac_toilet_block'), b[0], b[1], 0); root.userData.dyn = true;
    addCol([b[0] - 1.42, b[1] - 1.1, b[0] + 1.42, b[1] + 1.02], 'wc' + M.wc.length);
    M.wc.push({ root, doors:[findNode(root, 'door_1'), findNode(root, 'door_2')], occ:[findNode(root, 'occ_1'), findNode(root, 'occ_2')], open:[0, 0], want:[0, 0] }); }
  if (typeof NAV !== 'undefined' && NAV.length) rebuildNav();
}
const needsDrain = c => 1 + (c.st.thirst <= 0 ? 1.5 : 0) + (c.st.bladder <= 0 ? 1.5 : 0);
function canPause(c, urgent){
  if (c.stack.length || c.trolley || c.talk || c.job || c.fjob || (c.lock || 0) > 0 || (c.needCD || 0) > 0) return false;
  const r = c.st.role, s = c.state;
  if (['break', 'toBreak', 'slack', 'arrive', 'cleaning', 'toClean', 'talking'].includes(s)) return false;
  if (r === 'operator') { const m = opsOf(c); return s === 'bay' || s === 'idle' || (s === 'work' && (!m.running(c) || (urgent && m.phase() < .15))); }
  if (r === 'loader') return s === 'idle' || s === 'waiting';
  if (r === 'supervisor') return ['idle', 'toPatrol', 'patrolWait'].includes(s) && !(S.order && !S.order.met && !S.order.briefed);
  return ['home', 'idle', 'toHome'].includes(s);
}
function updateNeeds(c, dt){
  if (!WELFARE) { c.st.focus = 100; return false; }   // workers never tire, thirst or queue (Bible 4.1)
  const st = c.st; if (!st || st.id < 0) return false;
  st.thirst ??= 100; st.bladder ??= 100; c.needCD = Math.max(0, (c.needCD || 0) - dt);
  if (S.tutDone && !c.need && c.state !== 'break') { st.thirst = Math.max(0, st.thirst - dt * 100 / PG.NEEDS.thirstSecs); st.bladder = Math.max(0, st.bladder - dt * 100 / PG.NEEDS.bladderSecs); }
  if (c.need) return runNeed(c, dt);
  if (!S.tutDone || !M.wc) return false;
  const kind = st.bladder < PG.NEEDS.urgent ? 'wc' : st.thirst < PG.NEEDS.urgent ? 'drink' : null;
  if (!kind || !canPause(c, Math.min(st.thirst, st.bladder) < 8)) return false;
  c.need = { kind, stage:'go', t:0, stall:-1 }; c.state = kind === 'drink' ? 'toDrink' : 'toWC'; c.path = null;
  if (kind === 'drink') goTo(c, ...P.coolerSpot); else claimStallOrQueue(c);
  return true;
}
function claimStallOrQueue(c){
  const n = c.need, k = stallCount();
  for (let i = 0; i < k; i++) if (!stallBy[i]) { stallBy[i] = c; n.stall = i; n.stage = 'go'; goTo(c, ...stallSpot(i).front); return true; }
  const inQ = [...staffObj.values()].filter(o => o !== c && o.need && o.need.stage === 'queue').length;
  n.stage = 'queue'; n.q = Math.min(inQ, WC_QUEUE.length - 1); goTo(c, ...WC_QUEUE[n.q]); return false;
}
function endNeed(c, say){
  const n = c.need; if (!n) return; if (n.stall >= 0 && stallBy[n.stall] === c) stallBy[n.stall] = null; if (coolerBy === c) coolerBy = null;
  c.need = null; c.o.visible = true; c.state = 'idle'; c.needCD = 6; if (say) c.say = { text:say, until:T + 2 };
}
function runNeed(c, dt){
  const n = c.need, st = c.st;
  if (n.kind === 'drink') {
    if (n.stage === 'go') { if (walk(c, dt)) n.stage = 'qwait'; return true; }
    if (n.stage === 'qwait') { c.play('idle'); c.faceTo(P.cooler, dt); if (!coolerBy) { coolerBy = c; n.stage = 'drink'; n.t = PG.NEEDS.drinkSecs; } return true; }
    if (n.stage === 'drink') { c.faceTo(P.cooler, dt); c.o.position.set(P.coolerSpot[0], 0, P.coolerSpot[1]);
      if (S.cooler <= 0) { st.focus = Math.max(0, st.focus - 10); st.thirst = Math.max(st.thirst, 20); S.coolerMiss = (S.coolerMiss || 0) + 1; endNeed(c, 'The cooler\'s empty!'); c.needCD = 25; return true; }
      c.play('phone'); n.t -= dt; if (n.t <= 0) { S.cooler--; S.drinks++; st.thirst = 100; endNeed(c); } return true; }
  }
  // the washroom
  if (n.stage === 'queue') { if (walk(c, dt)) { c.play('idle'); c.faceTo(WC_BLOCKS[0], dt); } const k = stallCount(); for (let i = 0; i < k; i++) if (!stallBy[i]) { stallBy[i] = c; n.stall = i; n.stage = 'go'; goTo(c, ...stallSpot(i).front); break; } return true; }
  if (n.stage === 'toSink') { if (walk(c, dt)) { n.stage = 'washing'; n.t = PG.NEEDS.washSecs; } return true; }
  if (n.stage === 'washing') { c.faceNow(Math.PI); c.play('fix', 1.2); n.t -= dt;
    if (n.t <= 0) { st.bladder = 100; if (S.wcClean < 35) { st.focus = Math.max(0, st.focus - 15); endNeed(c, 'Filthy in there!'); } else endNeed(c); } return true; }
  if (!(n.stall >= 0) || !M.wc[n.stall >> 1]) { endNeed(c); return true; }   // stall gone (or never claimed): give up cleanly
  const sp = stallSpot(n.stall), blk = M.wc[sp.b];
  if (n.stage === 'go') { if (walk(c, dt)) { n.stage = 'enter'; n.t = .45; blk.want[sp.d] = 1; } return true; }
  if (n.stage === 'enter') { c.faceTo([sp.inside[0], sp.inside[1]], dt); c.play('idle'); n.t -= dt;
    if (n.t <= 0) { c.o.position.set(sp.inside[0], 0, sp.inside[1]); c.o.visible = false; blk.want[sp.d] = 0; n.stage = 'inside'; n.t = PG.NEEDS.wcSecs; } return true; }
  if (n.stage === 'inside') { n.t -= dt; if (n.t <= 0) { blk.want[sp.d] = 1; n.stage = 'exit'; n.t = .45; } return true; }
  if (n.stage === 'exit') { n.t -= dt; if (n.t <= 0) { c.o.visible = true; c.o.position.set(sp.front[0], 0, sp.front[1]); c.faceNow(0); blk.want[sp.d] = 0; stallBy[n.stall] = null; n.stall = -1; n.b = sp.b;
      S.wcUses++; S.wcClean = Math.max(0, S.wcClean - 3.5); n.stage = 'toSink'; goTo(c, ...sinkSpot(sp.b)); } return true; }
  endNeed(c); return true;
}
// facilities jobs: the cleaner's work, or a loader's when nobody is employed for it
function facilityJob(c, loaderMode){
  const others = [...staffObj.values()].filter(o => o !== c).map(o => o.fjob);
  if (S.cooler <= (loaderMode ? 1 : 4) && S.water > 0 && !others.includes('bottle')) return 'bottle';
  if (S.wcClean < (loaderMode ? 40 : 75) && !others.includes('wc')) return 'wc';
  return null;
}
function startFacilityJob(c, job){
  if (!job) { c.state = 'idle'; return; } c.fjob = job;
  if (job === 'bottle') { goTo(c, ...P.bottleSpot); c.state = 'toBottles'; } else { goTo(c, ...P.wcCleanSpot); c.state = 'toWCClean'; }
}
function endFJob(c){ c.fjob = null; c.state = 'idle'; if (c.mop) { c.mop.removeFromParent(); c.mop = null; } if (M.wetSign) M.wetSign.visible = [...staffObj.values()].some(o => o.state === 'cleanWC'); }
function cleanTask(c, dt){
  const s = c.state;
  if (s === 'toBottles') { if (walk(c, dt)) { c.state = 'takeBottle'; c.wait = .4; } return true; }
  if (s === 'takeBottle') { c.faceTo(P.bottleRack, dt); c.play('idle'); c.wait -= dt; if (c.wait > 0) return true;
    if (S.water <= 0 || !takeFrom('shelf', c, 'bottle')) { endFJob(c); return true; } S.water--; goTo(c, ...P.coolerSpot); c.state = 'toSwap'; return true; }
  if (s === 'toSwap') { if (walk(c, dt)) { c.state = 'swap'; c.wait = 1.8; } return true; }
  if (s === 'swap') { c.faceTo(P.cooler, dt); c.play('fix'); c.wait -= dt;
    if (c.wait <= 0) { const m = c.stack.pop(); if (m) m.removeFromParent(); c.carryType = null; S.cooler = coolerCap(); S.bottlesUsed = (S.bottlesUsed || 0) + 1; floatText('Fresh bottle', P.cooler[0], 1.7, P.cooler[1], 'info'); sfx('drop', .5); giveXp(c.st, 5); endFJob(c); } return true; }
  if (s === 'toWCClean') { if (walk(c, dt)) { c.state = 'cleanWC'; if (M.wetSign) M.wetSign.visible = true; if (!c.mop) { c.mop = makeBroom(); c.o.add(c.mop); } } return true; }
  if (s === 'cleanWC') { c.faceTo([P.wcCleanSpot[0], P.wcCleanSpot[1] - 2], dt); c.play('fix', 1.1); c.st.energy = Math.max(0, c.st.energy - dt * .4);
    if (Math.random() < dt * 2) puff(P.wcCleanSpot[0] + rand(-.8, .8), P.wcCleanSpot[1] - .3, '#cfe3df');
    S.wcClean = Math.min(100, S.wcClean + dt * 9 * (1 + .3 * S.up.mop) * (c.st.role === 'cleaner' ? lvSpeed(c.st) : .7));
    if (S.wcClean >= 100) { giveXp(c.st, 8); floatText('Washroom clean', P.wcCleanSpot[0], 1.8, P.wcCleanSpot[1], 'info'); endFJob(c); } return true; }
  return false;
}
function updateCleaner(c, dt){
  updateFocus(c, dt);
  if (updateBreak(c, dt)) return;
  if (c.state === 'arrive') { if (walk(c, dt)) c.state = 'idle'; return; }
  if (cleanTask(c, dt)) return;
  if (breakDue(c)) { startBreak(c); return; }
  const job = facilityJob(c, false); if (job) { startFacilityJob(c, job); return; }
  if (c.state !== 'toHome' && c.state !== 'home') { goTo(c, ...P.cleanerHome); c.state = 'toHome'; }
  if (c.state === 'toHome') { if (walk(c, dt)) c.state = 'home'; return; }
  c.faceNow(Math.PI); c.play('idle');
}
// doors swing, lamps show who is in, the cooler's bottle empties
function updateFacilities(dt){
  if (!M.wc) return;
  const k = stallCount();
  M.wc.forEach((b, bi) => b.doors.forEach((d, di) => { const i = bi * 2 + di;
    b.open[di] += (b.want[di] - b.open[di]) * Math.min(1, dt * 9); if (d) d.rotation.y = -1.45 * b.open[di];
    setLamp(b.occ[di], ...(i >= k ? ['#101010', 0] : stallBy[i] ? ['#e0453a', 3] : ['#5bd46a', 2.2])); }));
  if (M.coolerWater) { const f = Math.max(.02, S.cooler / coolerCap()); M.coolerWater.scale.set(M.coolerWaterS.x, M.coolerWaterS.y * f, M.coolerWaterS.z); }
}
function orderWater(){
  if (S.water + WATER_LOT[0] > WATER_CAP) { toast('No room on the rack for more bottles.', 'bad'); return; }
  if (S.cash < WATER_LOT[1]) { toast(`Water bottles cost ${fmt(WATER_LOT[1])}.`, 'bad'); return; }
  S.cash -= WATER_LOT[1]; S.water += WATER_LOT[0]; syncBottles(); sfx('buy'); toast(`${WATER_LOT[0]} bottles of water delivered to the rack by the break area.`, 'good'); save(); renderOffice();
}

/* =====================================================================
   LEVEL 2: PIPE MILL, STEEL COILS, POWER LIMIT
   ===================================================================== */
const sawOp = () => staffOf('operator').find(c => c.st.posted !== false && !['pipe', 'tool', 'saw2'].includes(c.st.mach));
const suppliesFree = () => S.level <= 2;     // owner's rule (build 0.17): timber and diesel are free on levels 1 and 2 only; from level 3 the owner buys them
const timberFree = suppliesFree;
const pipeOp = () => staffOf('operator').find(c => c.st.mach === 'pipe');
const millReady = () => S.lv2.mill >= 2 && !!M.mill;
const pipeBroken = () => S.faults.some(f => f.where === 'pipe' && !FAULTS[f.kind].svc);
const pipeLeft = () => S.order && S.order.briefed ? Math.max(0, needPipes() - sitePipes()) : 0;
const pipeCap = () => 8 + 4 * S.up.prack;
// power factor: above the generator's rating every machine slows in proportion (the level 2 lesson)
// a level 3 power cut leaves the hall on the back-up line: every machine at half speed until it is fixed
const genRestart = () => icy() || wxK('ice') > .5 ? 20 : 10;   // v2.0 13.5: without the mains a cut halves speed until the generator is restarted
function pf(){ const kw = load(), g = supplyKW(); return (kw > g ? g / kw : 1) * (S.faults.some(f => f.kind === 'powercut' && f.t < genRestart()) && !mainsLive() ? .5 : 1); }   // on the mains, a cut runs on the backup generator's capacity
const overloaded = () => powerOn() && load() > supplyKW();
let pipeT = 0, pipeOn = false, pipeBy = null, pipeStallT = 0;
function pipeWorker(){ if (!millReady() || !circuitOn('pipe')) return null; return handOn(pipeOp(), P.pop, P.pmill); }
function updatePipeMill(dt){
  if (!millReady()) { pipeOn = false; return; }
  const by = pipeWorker();
  // the operator threads a fresh coil onto the uncoiler when the last one runs out
  if (by && S.coilLeft <= 0 && S.coilFeed > 0 && (pipeLeft() > 0 || stockLeftP() > 0) && S.pipes < pipeCap()) { S.coilFeed--; S.coilLeft = COIL_PIPES; syncCoilFeed(); sfx('clank', .6); floatText('New coil', P.pmill[0] - .5, 1.6, P.pmill[1], 'info'); }
  const canRun = by && S.coilLeft > 0 && S.pipes < pipeCap() && (pipeLeft() > 0 || stockLeftP() > 0);
  pipeOn = !!canRun && l6Run('pipe'); pipeBy = by;
  const N = M.millN;
  if (canRun) {
    pipeT += dt * (1 + .2 * S.up.pipe) * tierK('pipe') * autoFeedK() * crewSpeed(by) * pf() * brokenK(pipeBroken());
    const k = pipeT / PIPE_CYCLE; N.coil.rotation.z -= dt * 2.2; for (const r of N.rollers) r.rotation.z -= dt * 9;
    N.pipe.visible = true; N.pipe.position.x = N.pipeX - .55 + k * .55;
    if (Math.random() < dt * 3) spark(P.pmill[0] + rand(-.3, .3), .75, P.pmill[1] + rand(-.1, .1));
    by.st.energy = Math.max(0, by.st.energy - dt * (100 / 90));
    if (pipeT >= PIPE_CYCLE) { pipeT = 0; S.coilLeft--; S.pipes++; S.pmade++; tone(1320, .5, 'triangle', .018); tone(1985, .35, 'sine', .01, .01); machCycle('pipe'); syncOrderCounts();
      if (S.order && S.order.pq) { if (!S.order.p1) S.order.p1 = Math.round(S.order.time); if (!S.order.pc && S.order.pcut >= S.order.pq) S.order.pc = Math.round(S.order.time); }
      S.cond.pipe = Math.max(0, S.cond.pipe - 2.4); syncPipes(); sfx('clank'); giveXp(by.st, 10); }
  } else N.pipe.visible = false;
  N.coil.visible = S.coilLeft > 0; const f = .5 + .5 * S.coilLeft / COIL_PIPES; N.coil.scale.set(N.coilS.x * f, N.coilS.y * f, N.coilS.z);  // node scale also dequantizes the mesh, so scale relative to it
  if (pipeBroken() && Math.random() < dt * 5) spark(P.pmill[0] + rand(-.4, .4), 1.0, P.pmill[1] + rand(-.2, .2));
  const lampState = pipeBroken() || !circuitOn('pipe') ? LAMP_STOP : pipeOn ? LAMP_RUN() : LAMP_IDLE;
  setLamp(N.lamp, ...lampState); setLamp(N.beacon, ...lampState);
  const why = pipeOn ? null : pipeReason();
  if (S.order && S.order.briefed && pipeLeft() > 0) { const key = pipeOn ? 'Cutting' : why.label[2]; const d = S.pipeLog || (S.pipeLog = {}); d[key] = (d[key] || 0) + dt; }
  pipeStallT = why && why.stall ? pipeStallT + dt : 0;
  if (pipeStallT > 6) { pipeStallT = 0; const oc = pipeOp(); if (rescueOp(oc, P.pop)) S.pipeRescues = (S.pipeRescues || 0) + 1; }
}
// one answer to "why is the pipe mill not running?" for its label, its operator and the order ticket
function pipeReason(){
  const oc = pipeOp(), o = S.order, st = oc ? oc.state : null;
  const R = (cls, title, sub, icon, text, stall = false) => ({ label:[cls, title, sub], op:[icon, text], stall });
  if (!millReady()) return R('warn', 'Not installed', 'Pay in at the pad', 'wait', 'Waiting for the pipe mill');
  const fault = S.faults.find(f => f.where === 'pipe' && !FAULTS[f.kind].svc);
  if (pipeOn && fault) return R('warn', 'Half speed', fault.name, 'wrench', 'Working a broken mill');
  if (!powerOn()) return R('bad', 'No power', 'Generator is off', 'bolt', 'No power');
  if (!circuitOn('pipe')) return R('bad', 'No power', 'Check the switchboard', 'bolt', 'Mill has no power');
  if (pipeOn) return R('', overloaded() ? 'Running slow' : 'Forming', overloaded() ? `Generator overloaded: ${Math.round(pf() * 100)}% speed` : pipeLeft() > 0 ? `${S.pipes}/${pipeCap()} pipes` : gateLeft('pipe') > 0 ? 'Pipes for the customer at the gate' : 'Making stock for the warehouse', 'gear', pipeLeft() > 0 ? 'Forming pipes' : gateLeft('pipe') > 0 ? 'Pipes for the gate' : 'Making stock');
  if (!oc) return R('warn', 'Stopped', 'No operator: run it yourself or hire one', 'wait', 'No operator');
  if (oc.talk) return R('warn', 'Paused', `${oc.st.name} getting instructions`, 'clip', 'Getting instructions');
  if (oc.need) return R('warn', 'Paused', oc.need.kind === 'drink' ? 'Operator getting water' : 'Operator at the toilet', ...statusOf(oc));
  if (st === 'slack') return R('bad', 'Stopped', 'Operator on the phone', 'phone', 'Slacking');
  if (st === 'break' || st === 'toBreak') return R('warn', 'Stopped', 'Operator on break', st === 'break' ? 'zzz' : 'cup', st === 'break' ? 'On break' : 'Going on break');
  if (st === 'toClean' || st === 'cleaning') return R('warn', 'Paused', 'Operator cleaning the mill', 'wrench', 'Cleaning the mill');
  if (st === 'arrive' || st === 'toWork' || st === 'idle') return R('warn', 'Starting', 'Operator walking to the mill', 'walk', 'Walking to the mill');
  const stock = stockLeftP() > 0;
  if (!o && !stock) return whMaking() ? R('warn', 'Idle', 'Warehouse full of pipes', 'wait', 'Warehouse full') : R('warn', 'Idle', 'No order yet', 'wait', 'Waiting for an order');
  if (o && !o.briefed && !stock) return R('warn', 'Idle', 'Operator not briefed', 'wait', 'Waiting to be briefed');
  if (o && !o.pq && !stock) return R('warn', 'Idle', 'No pipes on this order', 'wait', 'No pipes on this order');
  if (pipeLeft() <= 0 && !stock) return R('warn', 'Idle', S.lv2.wh >= 2 ? 'Order covered' : 'Order all formed', 'wait', 'Order all formed');
  if (S.coilLeft <= 0 && S.coilFeed <= 0) return R('warn', 'Needs steel', S.coils > 0 ? 'Loader bringing a coil' : 'No coils: order steel', 'wait', 'Needs a steel coil');
  if (S.pipes >= pipeCap()) return R('warn', 'Rack full', whReady() ? 'Loaders taking it to the warehouse' : 'Waiting for the truck', 'wait', 'Pipe rack full');
  return R('warn', 'Starting', 'Next pipe', 'gear', 'Starting the next pipe', true);
}
// steel and pipes on screen: coil bay on the apron, spare coils by the mill, the pipe rack, the truck bed
const coilsArr = { bay:[], feed:[], tfeed:[] }, pipesArr = { rack:[], bed:[], wh:[] };
const coilMesh = () => inst('l2_coil');
const pipeMesh = () => inst('prop_pipe');
// level 5 doubles the bay: four more coils ride in the grooves of the first row
const coilCap = () => S.level >= 5 ? 10 : COIL_CAP;
const steelLots = () => S.level >= 5 ? [...STEEL_LOTS, [8, 500]] : STEEL_LOTS;
const coilBayPos = i => i < 6 ? new THREE.Vector3(P.coilBay[0], .08, P.coilBay[1] - 1.875 + i * .75) : new THREE.Vector3(P.coilBay[0], .62, P.coilBay[1] - 1.5 + (i - 6) * .75);
const coilFeedPos = i => new THREE.Vector3(P.pfeed[0], 0, P.pfeed[1] + i * .42);
function pipeRackPos(i){ const t = Math.floor(i / 6), k = i % 6; return new THREE.Vector3(P.prack[0], [.35, .75, 1.15, 1.42][Math.min(t, 3)] + .025, P.prack[1] + [-.5, -.36, -.22, .22, .36, .5][k]); }
function pipeBedPos(i){ const k = i % 10, layer = Math.floor(i / 10); return new THREE.Vector3(.18, 1.02 + layer * .125, -.62 + k * .135); }
const syncCoilBay = () => { if (M.coilBay) syncStack(coilsArr.bay, S.coils, coilMesh, coilBayPos, Math.PI / 2); };
const syncCoilFeed = () => { if (M.mill || M.scaffold) syncStack(coilsArr.feed, S.coilFeed, coilMesh, coilFeedPos); };
const syncPipes = () => { if (M.prack) syncStack(pipesArr.rack, S.pipes, pipeMesh, pipeRackPos); };
// warehouse racking: crates on three shelves (5 across, 4 deep, two high), top shelf first because the camera looks down
// through the open roof and the decks hide what is below; pipes on two cantilever tiers
function whCratePos(i){ const s = Math.min(2, Math.floor(i / 40)), r = i % 40, layer = Math.floor(r / 20), k = r % 20;
  return new THREE.Vector3(P.wh[0] - 2.15 + (k % 5) * .35, [1.91, 1.01, .14][s] + layer * .3, P.wh[1] - 1.0 + Math.floor(k / 5) * .35); }
// tools in the warehouse: a tool rack between the crate racking and the pipe tiers, top shelf first
// (the rack stands end-on in the aisle between them, so its shelves run front to back)
function whToolPos(i){ const s = Math.min(2, Math.floor(i / 8)), k = i % 8; return new THREE.Vector3(P.whTools[0] + (k < 4 ? .11 : -.11), [1.1, .6, .1][s], P.whTools[1] - .6 + (k % 4) * .4); }
function whPipePos(i){ const r = Math.floor(i / 6), k = i % 6; return new THREE.Vector3(P.wh[0] + 1.4, [.3, .95][r % 2] + Math.floor(r / 2) * .1, P.wh[1] - 1.15 + k * .25); }
const syncWh = () => { if (M.wh) { syncStack(crates.wh, S.wh.c, crateMesh, whCratePos); syncStack(pipesArr.wh, S.wh.p, pipeMesh, whPipePos); if (M.whTools) syncStack(toolsArr.wh, S.wh.t, toolMesh, whToolPos, Math.PI / 2); } };
function syncPBed(){ while (pipesArr.bed.length < S.pbed) { const m = pipeMesh(); m.rotation.y = Math.PI / 2; M.truck.add(m); pipesArr.bed.push(m); } while (pipesArr.bed.length > S.pbed) pipesArr.bed.pop().removeFromParent(); pipesArr.bed.forEach((m, i) => { m.position.copy(pipeBedPos(i)); m.rotation.set(0, 0, 0); }); }
const countPipes = () => { let n = 0; for (const o of carriers()) if (o.carryType === 'pipe' && truckBound(o)) n += o.stack.length; return n; };
const coilsInHands = () => { let n = 0; for (const o of staffObj.values()) if (o.carryType === 'coil') n += o.stack.length; return n; };
// pipes still possible from the steel on site and on order
const steelPipes = () => S.coilLeft + (S.coilFeed + S.coils + coilsInHands() + (S.delivery && S.delivery.kind === 'steel' ? S.delivery.left : 0)) * COIL_PIPES;
function orderSteel(n){
  const lot = steelLots().find(l => l[0] === n); if (!lot || S.delivery || S.level < 2) return;
  if (S.coils + coilsInHands() + n > coilCap()) { toast('Not enough room in the coil bay for that much steel.', 'bad'); return; }
  const price = Math.round(lot[1] * supplyK()); if (S.cash >= price) S.cash -= price; else { S.bills += price; toast(`On account: ${fmt(price)} comes off your next delivery.`, 'gold'); }
  S.delivery = { kind:'steel', qty:n, left:n, onLorry:n }; S.steelBought = (S.steelBought || 0) + n; sup.state = 'away'; sup.t = 0;
  sfx('buy'); toast(`Ordered ${n} steel coils. The flatbed unloads them at goods-in by bay 2.`, 'good'); save(); renderOffice();
}
const describe = o => [o.qty ? `${o.qty} crate${o.qty > 1 ? 's' : ''}` : '', o.pq ? `${o.pq} pipe${o.pq > 1 ? 's' : ''}` : '', o.tq ? `${o.tq} tool${o.tq > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ');
// the operator who should hear about an order first
const orderOp = o => (o && !o.qty && !o.pq && o.tq ? pressOp() : o && !o.qty && o.pq ? pipeOp() : sawOp()) || sawOp();

// the pipe bay: tarp until the owner pays in, scaffold and a contractor while it is built, then the mill
function buildLevel2(){
  if (M.l2Built) return; M.l2Built = true;
  // the coil bay runs along the apron's east edge (turned in build 0.12 so the apron leads to the North field)
  M.coilBay = put(inst('l2_coil_bay'), ...P.coilBay, -Math.PI / 2); addCol([P.coilBay[0] - .38, P.coilBay[1] - 2.3, P.coilBay[0] + .38, P.coilBay[1] + 2.3], 'coilBay');
  l2Ground();
  M.prack = put(inst('l2_pipe_rack'), ...P.prack, 0); addCol([P.prack[0] - .82, P.prack[1] - .62, P.prack[0] + .82, P.prack[1] + .62], 'prack');
  const sign = tex(512, 96, (g, w, h) => { g.fillStyle = '#2f5d8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ece6d9'; g.font = '700 54px Oswald, Arial'; g.textAlign = 'center'; g.fillText('STEEL COILS', w / 2, 68); });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .28), new THREE.MeshBasicMaterial({ map:sign })); sm.position.set(P.coilBay[0] - .45, .95, P.coilBay[1] + 2.38); sm.userData.dyn = true; world.add(sm);
  syncCoilBay(); syncPipes(); syncCoilFeed();
  if (S.lv2.mill >= 2) finishMill(false); else if (S.lv2.mill === 1) startMillBuild(false);
  if (S.lv2.wh >= 2) finishWh(false); else if (S.lv2.wh === 1) startWhBuild(false);
  rebuildNav();
}
function startMillBuild(fx){
  S.lv2.mill = Math.max(1, S.lv2.mill); syncL2Marks();
  if (!M.scaffold) { M.scaffold = put(inst('l2_scaffold'), ...P.pmill, 0); M.scaffold.userData.dyn = true; }
  if (!M.builder) M.builder = makeBuilder([P.pmill[0] - .2, P.pmill[1] + 1.25], -99);
  if (fx) { toast('Paid. A contractor from town is on his way to install the pipe mill.', 'good'); sfx('buy'); for (let i = 0; i < 10; i++) puff(P.pmill[0] + rand(-1, 1), P.pmill[1] + rand(-.6, .6), '#d8d2c4'); save(); }
}
function finishMill(fx){
  S.lv2.mill = 2; S.restored.mill = true;
  if (M.scaffold) { M.scaffold.removeFromParent(); M.scaffold = null; }
  if (!M.mill) {
    M.mill = put(A.pipe_machine.scene.clone(true), ...P.pmill, 0, 0, SAW_S); M.mill.userData.dyn = true;
    addCol([P.pmill[0] - 1.15 * SAW_S, P.pmill[1] - .55 * SAW_S, P.pmill[0] + 1.15 * SAW_S, P.pmill[1] + .55 * SAW_S], 'mill');
    M.mill.updateMatrixWorld(true);
    const op = M.mill.getObjectByName('op_spot').getWorldPosition(new THREE.Vector3()), out = M.mill.getObjectByName('out_spot').getWorldPosition(new THREE.Vector3());
    P.pop = [op.x, op.z]; P.pout = [out.x, out.z];
    const pipe = findNode(M.mill, 'pipe_out');
    M.millN = { coilS:findNode(M.mill, 'coil').scale.clone(), coil:findNode(M.mill, 'coil'), rollers:[1, 2, 3].map(i => findNode(M.mill, 'roller_' + i)), pipe, pipeX:pipe.position.x, lamp:findNode(M.mill, 'status_lamp'), beacon:findNode(M.mill, 'beacon') };
    pipe.visible = false;
    beacon(P.pmill[0] + 1.25 * SAW_S, .95, P.pmill[1] - .55 * SAW_S, () => !millReady() ? 'idle' : pipeBroken() || !circuitOn('pipe') ? 'stop' : pipeOn ? 'run' : 'idle');
    // the mill's own circuit: from the junction box by the crate machine, along the floor under a cable protector, into the machine
    const jx = P.jbox[0] + .12, jz = P.jbox[1], mx = P.pmill[0] - 1.15 * SAW_S - .05;
    line([[jx, .55, jz], [jx, .04, jz], [mx, .04, jz], [mx, .04, P.pmill[1] - .2], [mx + .1, .4, P.pmill[1] - .2]], () => circuitOn('pipe'), { r:.03 });
    cover(jx, jz, mx, jz);
    syncCoilFeed();
  }
  if (fx) { toast('The pipe mill is installed. Hire an operator for it, then order steel coils.', 'gold'); sfx('level', .6); confetti(); for (let i = 0; i < 16; i++) spark(P.pmill[0] + rand(-1, 1), rand(.4, 1.6), P.pmill[1] + rand(-.5, .5)); checkCharter(); save(); }
  rebuildNav();
}
function makeBuilder(to, id){
  const b = makeChar('worker', ...P.frontOut, { parts:['hat_hard', 'vest', 'toolbelt', 'hair_short', 'beard'], cols:{ suit:'#6b4a2a', hat:'#f2c230', vest:'#e5772b', skin:pick(SKINS), hair:pick(HAIRS), shirt:'#d8d2c2' } });
  b.st = { id, name:'Builder', role:'contractor', lv:1, energy:100, focus:100 }; b.state = 'toSite'; goTo(b, ...to); if (S.letter) meet('tom'); return b;
}
// one contractor per job: the pipe mill, then the warehouse (they can overlap while the first one walks out)
function runBuilder(key, site, rec, tk, total, finish, dt){
  const b = M[key]; if (!b) return;
  if (b.state === 'toSite') { if (walk(b, dt)) { b.state = 'build'; b.faceNow(Math.PI); } return; }
  if (b.state === 'build') { b.faceTo(site, dt); b.play('fix', 1.1); rec[tk] += dt;
    if (Math.random() < dt * 4) spark(site[0] + rand(-.8, .8), rand(.4, 1.4), site[1] + rand(-.3, .3)); if (Math.random() < dt * 1.5) sfx('clank', .4);
    if (rec[tk] >= total) { finish(true); b.state = 'leave'; goTo(b, ...P.frontOut); } return; }
  if (b.state === 'leave') { if (walk(b, dt)) { b.o.removeFromParent(); mixers.splice(mixers.indexOf(b.mixer), 1); M[key] = null; } }
}
function updateBuilder(dt){ runBuilder('builder', P.pmill, S.lv2, 'buildT', MILL_BUILD, finishMill, dt); runBuilder('whBuilder', P.wh, S.lv2, 'whT', WH_BUILD, finishWh, dt); }
// the warehouse: pad in the cleared yard, scaffold and a contractor, then the shed with its racking
function startWhBuild(fx){
  if (M.whPlot) M.whPlot.visible = false;
  S.lv2.wh = Math.max(1, S.lv2.wh); if (M.plotSign) M.plotSign.visible = false;
  if (!M.whScaffold) { M.whScaffold = put(inst('l2_scaffold'), ...P.wh, 0); M.whScaffold.userData.dyn = true; }
  if (!M.whBuilder) M.whBuilder = makeBuilder(P.whBuild, -98);
  if (fx) { toast('Paid. A contractor is on his way to put up the warehouse.', 'good'); sfx('buy'); for (let i = 0; i < 10; i++) puff(P.wh[0] + rand(-2, 2), P.wh[1] + rand(-1, 1), '#d8d2c4'); save(); }
}
function finishWh(fx){
  S.lv2.wh = 2; if (M.plotSign) M.plotSign.visible = false;
  if (M.whScaffold) { M.whScaffold.removeFromParent(); M.whScaffold = null; }
  if (!M.wh) {
    M.wh = put(inst('l2_warehouse'), ...P.wh, 0); M.wh.userData.dyn = true; M.wh.userData.roof = [5.3, 3.3, 2.95];   /* cutaway model (roof rim only): its roof keeps the snow off the floor */
    const sign = tex(512, 72, (g, w, h) => { g.fillStyle = '#ece6d9'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f5d8a'; g.font = '700 50px Oswald, Arial'; g.textAlign = 'center'; g.fillText('WAREHOUSE', w / 2, 54); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .29), new THREE.MeshBasicMaterial({ map:sign })); sm.position.set(0, 2.86, 1.75); M.wh.add(sm);
    addCol([P.wh[0] - 2.72, P.wh[1] - 1.72, P.wh[0] + 2.72, P.wh[1] + 1.72], 'wh');
    syncWh();
  }
  whToolKit(false);
  if (fx) { toast('The warehouse is up. Spare crates and pipes go there, and orders ship from stock. Toggle it in the office (Stock).', 'gold'); sfx('level', .5); confetti(); save(); renderOffice(); }
  rebuildNav();
}

/* =====================================================================
   LEVEL 3: NORTH FIELD, TOOL PRESS, SPARE PARTS, TRADING LICENCE
   ===================================================================== */
const pressOp = () => staffOf('operator').find(c => c.st.mach === 'tool');
const pressReady = () => S.lv3.press >= 2 && !!M.press;
const toolBroken = () => S.faults.some(f => f.where === 'tool' && !FAULTS[f.kind].svc);
const countTools = () => { let n = 0; for (const o of carriers()) if (o.carryType === 'toolbox' && truckBound(o)) n += o.stack.length; return n; };
const needTools = () => S.order && !S.order.ready ? Math.max(0, (S.order.tq || 0) - S.tbed) : 0;
const siteTools = () => S.tools + countTools() + S.wh.t;
const toolLeft = () => S.order && S.order.briefed ? Math.max(0, needTools() - siteTools()) : 0;
const stockLeftT = () => whMaking() && whCapT() ? Math.max(0, needTools() + whCapT() - siteTools()) : 0;
const toolWork = () => toolLeft() > 0 || stockLeftT() > 0;
const toolCap = () => 12;
const partsCap = () => 6 + 3 * S.up.parts;
const sturdy = () => PG.cut(.25, S.up.sturdy);
// tools still possible from the steel on site and on order (the press and the mill share the coil bay)
const steelTools = () => S.tcoil + (S.tfeed + S.coils + (S.delivery && S.delivery.kind === 'steel' ? S.delivery.left : 0)) * COIL_TOOLS;
const coilsFor = d => { let n = 0; for (const o of staffObj.values()) if (o.carryType === 'coil' && (o.coilDest || 'mill') === d) n += o.stack.length; return n; };
let toolT = 0, toolOn = false, toolBy = null, toolStallT = 0;
function pressWorker(){ if (!pressReady() || !circuitOn('tool')) return null; return handOn(pressOp(), P.top, P.tpress); }
// the production watchdog sends an operator who has not reached his machine walking back to it (never a jump), and
// never while he is at lunch, clocking off, carrying something or already on his way
function rescueOp(oc, spot){
  if (!oc || !spot || oc.talk || oc.need || oc.lunch || oc.gone || oc.leaving || oc.stack.length || oc.state === 'toWork' || oc.state === 'work' || lunchTime() || closingTime()) return false;
  oc.wd = null; goTo(oc, spot[0], spot[1]); oc.state = 'toWork'; return true;
}
function updateToolPress(dt){
  if (!pressReady()) { toolOn = false; return; }
  const by = pressWorker();
  // the operator threads a fresh coil when the strip runs out
  if (by && S.tcoil <= 0 && S.tfeed > 0 && toolWork() && S.tools < toolCap()) { S.tfeed--; S.tcoil = COIL_TOOLS; syncTFeed(); sfx('clank', .6); floatText('New coil', P.tpress[0] - .8, 1.6, P.tpress[1], 'info'); }
  const canRun = by && S.tcoil > 0 && S.tools < toolCap() && toolWork();
  toolOn = !!canRun && l6Run('tool'); toolBy = by;
  const N = M.pressN;
  if (canRun) {
    toolT += dt * (1 + .2 * S.up.press) * tierK('tool') * autoFeedK() * crewSpeed(by) * pf() * brokenK(toolBroken());
    const k = toolT / TOOL_CYCLE, stroke = Math.max(0, Math.sin(Math.min(1, k * 1.6) * Math.PI));
    N.ram.position.y = N.ramY - .16 * stroke; N.fly.rotation.y += dt * 7; N.coil.rotation.z -= dt * 1.2;
    N.out.visible = k > .62; N.out.position.x = N.outX + Math.max(0, k - .62) * 1.1;
    if (stroke > .95 && !N.hit) { N.hit = true; sfx('clank', .5); for (let i = 0; i < 3; i++) spark(P.tpress[0] + .1 + rand(-.15, .15), .62, P.tpress[1] + rand(-.1, .1)); }
    if (stroke < .5) N.hit = false;
    by.st.energy = Math.max(0, by.st.energy - dt * (100 / 95));
    if (toolT >= TOOL_CYCLE) { toolT = 0; S.tcoil--; S.tools++; S.tmade++; machCycle('tool');
      S.tbatchAcc = (S.tbatchAcc || 0) + [0, .2, .25, 1 / 3][Math.min(3, S.up.tbatch || 0)]; if (S.tbatchAcc >= 1 && S.tools < toolCap()) { S.tbatchAcc -= 1; S.tools++; S.tmade++; floatText('+1 tool', P.tpress[0], 1.6, P.tpress[1], 'info'); }
      syncOrderCounts();
      if (S.order && S.order.tq) { if (!S.order.k1) S.order.k1 = Math.round(S.order.time); if (!S.order.kc && S.order.tcut >= S.order.tq) S.order.kc = Math.round(S.order.time); }
      S.cond.tool = Math.max(0, S.cond.tool - 2.2); syncTools(); giveXp(by.st, 10); }
  } else { N.ram.position.y += (N.ramY - N.ram.position.y) * Math.min(1, dt * 6); N.out.visible = false; }
  N.coil.visible = S.tcoil > 0; const f = .5 + .5 * S.tcoil / COIL_TOOLS; N.coil.scale.set(N.coilS.x * f, N.coilS.y * f, N.coilS.z);
  if (toolBroken() && Math.random() < dt * 5) spark(P.tpress[0] + rand(-.3, .3), 1.2, P.tpress[1] + rand(-.2, .2));
  const lampState = toolBroken() || !circuitOn('tool') ? LAMP_STOP : toolOn ? LAMP_RUN() : LAMP_IDLE;
  setLamp(N.lamp, ...lampState); setLamp(N.beacon, ...lampState);
  const why = toolOn ? null : toolReason();
  if (S.order && S.order.briefed && toolLeft() > 0) { const key = toolOn ? 'Cutting' : why.label[2]; const d = S.toolLog || (S.toolLog = {}); d[key] = (d[key] || 0) + dt; }
  toolStallT = why && why.stall ? toolStallT + dt : 0;
  if (toolStallT > 6) { toolStallT = 0; const oc = pressOp(); if (rescueOp(oc, P.top)) S.toolRescues = (S.toolRescues || 0) + 1; }
}
// one answer to "why is the tool press not running?" for its label, its operator and the order ticket
function toolReason(){
  const oc = pressOp(), o = S.order, st = oc ? oc.state : null;
  const R = (cls, title, sub, icon, text, stall = false) => ({ label:[cls, title, sub], op:[icon, text], stall });
  if (!pressReady()) return R('warn', 'Not installed', S.lv3.press ? 'Big Tom\'s crew is installing it' : 'Pay in at the pad', 'wait', 'Waiting for the tool press');
  const fault = S.faults.find(f => f.where === 'tool' && !FAULTS[f.kind].svc);
  if (toolOn && fault) return R('warn', 'Half speed', fault.name, 'wrench', 'Working a jammed press');
  if (!powerOn()) return R('bad', 'No power', 'Generator is off', 'bolt', 'No power');
  if (!circuitOn('tool')) return R('bad', 'No power', 'Check the switchboard', 'bolt', 'Press has no power');
  if (toolOn) return R('', overloaded() ? 'Running slow' : 'Stamping', overloaded() ? `Generator overloaded: ${Math.round(pf() * 100)}% speed` : toolLeft() > 0 ? `${S.tools}/${toolCap()} tools` : 'Making stock for the warehouse', 'gear', toolLeft() > 0 ? 'Stamping tools' : 'Making stock');
  if (!oc) return R('warn', 'Stopped', 'No operator: run it yourself or hire one', 'wait', 'No operator');
  if (oc.talk) return R('warn', 'Paused', `${oc.st.name} getting instructions`, 'clip', 'Getting instructions');
  if (oc.need) return R('warn', 'Paused', oc.need.kind === 'drink' ? 'Operator getting water' : 'Operator at the toilet', ...statusOf(oc));
  if (st === 'slack') return R('bad', 'Stopped', 'Operator on the phone', 'phone', 'Slacking');
  if (st === 'break' || st === 'toBreak') return R('warn', 'Stopped', 'Operator on break', st === 'break' ? 'zzz' : 'cup', st === 'break' ? 'On break' : 'Going on break');
  if (st === 'toClean' || st === 'cleaning') return R('warn', 'Paused', 'Operator cleaning the press', 'wrench', 'Cleaning the press');
  if (st === 'arrive' || st === 'toWork' || st === 'idle') return R('warn', 'Starting', 'Operator walking to the press', 'walk', 'Walking to the press');
  const stock = stockLeftT() > 0;
  if (!o && !stock) return whMaking() && whCapT() ? R('warn', 'Idle', 'Warehouse full of tools', 'wait', 'Warehouse full') : R('warn', 'Idle', 'No order yet', 'wait', 'Waiting for an order');
  if (o && !o.briefed && !stock) return R('warn', 'Idle', 'Operator not briefed', 'wait', 'Waiting to be briefed');
  if (o && !o.tq && !stock) return R('warn', 'Idle', 'No tools on this order', 'wait', 'No tools on this order');
  if (toolLeft() <= 0 && !stock) return R('warn', 'Idle', whCapT() ? 'Order covered' : 'Order all stamped', 'wait', 'Order all stamped');
  if (S.tcoil <= 0 && S.tfeed <= 0) return R('warn', 'Needs steel', S.coils > 0 ? 'Loader bringing a coil' : 'No coils: order steel', 'wait', 'Needs a steel coil');
  if (S.tools >= toolCap()) return R('warn', 'Rack full', whCapT() ? 'Loaders taking it to the warehouse' : 'Waiting for the truck', 'wait', 'Tool rack full');
  return R('warn', 'Starting', 'Next tool', 'gear', 'Starting the next tool', true);
}
// tools and steel on screen: spare coils by the press, the tool rack, tool boxes on the truck, parts on the shelf
const toolsArr = { rack:[], bed:[], wh:[] }, partsArr = { shelf:[] };
const toolMesh = () => inst('l3_toolbox'), partMesh = () => inst('l3_part');
const tfeedPos = i => new THREE.Vector3(P.tfeed[0], 0, P.tfeed[1] + i * .42);
// top shelf first (the camera looks down and the shelves hide what is below), front row before the back row
function toolRackPos(i){ const s = Math.min(2, Math.floor(i / 8)), k = i % 8; return new THREE.Vector3(P.track[0] - .6 + (k % 4) * .4, [1.1, .6, .1][s], P.track[1] + (k < 4 ? .11 : -.11)); }
// along both sides of the lorry bed, beside the crates and the pipes
function toolBedPos(i){ const side = i % 2 ? 1 : -1, k = Math.floor(i / 2) % 7, layer = Math.floor(i / 14); return new THREE.Vector3(-1.95 + k * .36, 1.0 + layer * .17, side * .79); }
function partPos(i){ const s = Math.floor(i / 6) % 2, k = i % 6; return new THREE.Vector3(P.parts[0] - .55 + (k % 3) * .4, [.96, .46][s] + Math.floor(i / 12) * .15, P.parts[1] + (k < 3 ? .08 : -.1)); }
const syncTFeed = () => { if (M.press || M.pressScaffold) syncStack(coilsArr.tfeed, S.tfeed, coilMesh, tfeedPos); };
const syncTools = () => { if (M.trackRack) syncStack(toolsArr.rack, S.tools, toolMesh, toolRackPos); };
const syncParts = () => { if (M.partsShelf) syncStack(partsArr.shelf, S.parts, partMesh, partPos); };
function syncTBed(){ while (toolsArr.bed.length < S.tbed) { const m = toolMesh(); M.truck.add(m); toolsArr.bed.push(m); } while (toolsArr.bed.length > S.tbed) toolsArr.bed.pop().removeFromParent(); toolsArr.bed.forEach((m, i) => { m.position.copy(toolBedPos(i)); m.rotation.set(0, 0, 0); }); }
function loadTool(ch){
  if (truck.state !== 'docked' || !S.order || S.order.ready || ch.carryType !== 'toolbox') return false;
  const ok = giveTo(ch, 'bed', M.truck, toolBedPos, () => syncTBed()); if (!ok) return false;
  S.tbed++; S.tshipped++; sfxAt('drop', ch.o.position.x, ch.o.position.z); giveXp(ch.st, 5); checkLoaded(); return true;
}
// the North field: the farmer's bales and a for-sale sign until the owner buys it through the estate agent
// The North field's fence, gate and bales are part of the valley from level 1 (buildPlots); level 3 builds the
// press, the tool rack and the parts store on it once it is owned.
function buildLevel3(){
  if (M.l3Built) return; M.l3Built = true;
  buildGoodsIn();
  if (plotOwned('north')) l3Kit();
  whToolKit(S.time > 5);
  if (S.lv3.press >= 2) finishPress(false); else if (S.lv3.press === 1) startPressBuild(false);
  rebuildNav();
}
// the field joins the site: the gate panels come out (their posts stay), the bales and the sign go, gravel goes down
function buyField(fx){
  S.lv3.field = true; COL.delete('gate');
  if (M.gatePanels && M.gatePanels[0].visible) { for (const g of M.gatePanels) g.visible = false; for (const x of [12.0, 15.6]) { const g = put(inst('env_gate_post'), x, SITE.z0); g.userData.dyn = true; addCol([x - .22, SITE.z0 - .22, x + .22, SITE.z0 + .22]); } }
  if (M.fieldSign) M.fieldSign.visible = false; if (M.bales) for (const b of M.bales) b.visible = false;
  if (!M.fieldPad) { M.fieldPad = plane(8.6, 6.4, decal(std('#ffffff', 1, 0, { map:TX.gravel }), 1), 14.0, -15.9, .006); M.fieldPad.userData.dyn = true; }
  if (S.level >= 3) l3Kit();
  if (fx) checkCharter();
  rebuildNav();
}
// level 3 adds a tool rack to the warehouse (built in level 2 or later); the racking upgrade then grows it too
function whToolKit(fx){
  if (S.level < 3 || !M.wh || M.whTools || !PROTO.l3_tool_rack) return;
  M.whTools = put(inst('l3_tool_rack'), ...P.whTools, Math.PI / 2); M.whTools.userData.dyn = true; syncWh();
  if (fx) toast('Big Tom\'s crew fitted a tool rack in the warehouse: tools can now be made to stock too.', 'gold');
}
function l3Kit(){
  if (!PROTO.l3_parts_shelf) return;
  if (!M.partsShelf) { M.partsShelf = put(inst('l3_parts_shelf'), ...P.parts, 0); M.partsShelf.userData.dyn = true; addCol([P.parts[0] - .74, P.parts[1] - .26, P.parts[0] + .74, P.parts[1] + .26], 'parts'); syncParts(); }
  if (!M.trackRack) { M.trackRack = put(inst('l3_tool_rack'), ...P.track, 0); M.trackRack.userData.dyn = true; addCol([P.track[0] - .84, P.track[1] - .28, P.track[0] + .84, P.track[1] + .28], 'trackRack');
    const t = tex(512, 96, (g, w, h) => { g.fillStyle = '#ece6d9'; g.fillRect(0, 0, w, h); g.fillStyle = '#b5462b'; g.font = '700 52px Oswald, Arial'; g.textAlign = 'center'; g.fillText('TOOLS', w / 2, 68); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(.86, .15), new THREE.MeshBasicMaterial({ map:t })); sm.position.set(0, 1.33, -.215); sm.rotation.y = 0; M.trackRack.add(sm); syncTools(); }
}
function startPressBuild(fx){
  S.lv3.press = Math.max(1, S.lv3.press); if (fx) pressLowLoader();
  if (!M.pressScaffold) { M.pressScaffold = put(inst('l2_scaffold'), ...P.tpress, 0); M.pressScaffold.userData.dyn = true; }
  if (!M.pressBuilder) M.pressBuilder = makeBuilder(P.pressBuild, -97);
  if (fx) { toast('Paid. A contractor is on his way to install the tool press on the North field.', 'good'); sfx('buy'); for (let i = 0; i < 10; i++) puff(P.tpress[0] + rand(-1, 1), P.tpress[1] + rand(-.6, .6), '#d8d2c4'); save(); }
}
function finishPress(fx){
  S.lv3.press = 2;
  if (M.pressScaffold) { M.pressScaffold.removeFromParent(); M.pressScaffold = null; }
  if (!M.press) {
    M.press = put(A.tool_press.scene.clone(true), ...P.tpress, 0); M.press.userData.dyn = true;
    addCol([P.tpress[0] - 1.15, P.tpress[1] - .5, P.tpress[0] + 1.15, P.tpress[1] + .55], 'press');
    M.press.updateMatrixWorld(true);
    const op = M.press.getObjectByName('op_spot').getWorldPosition(new THREE.Vector3());
    P.top = [op.x, op.z];
    const out = findNode(M.press, 'tool_out'), ram = findNode(M.press, 'ram'), coil = findNode(M.press, 'tcoil');
    M.pressN = { coil, coilS:coil.scale.clone(), ram, ramY:ram.position.y, fly:findNode(M.press, 'flywheel'), out, outX:out.position.x, lamp:findNode(M.press, 'status_lamp'), beacon:findNode(M.press, 'beacon'), hit:false };
    out.visible = false;
    beacon(P.tpress[0] + .95, .95, P.tpress[1] - .5, () => !pressReady() ? 'idle' : toolBroken() || !circuitOn('tool') ? 'stop' : toolOn ? 'run' : 'idle');
    // its circuit: overhead from the hall's corner to a pole by the gate, down into the press cabinet
    line([[15.2, 3.2, -.2], [15.9, 3.2, -1.2], [17.6, 2.6, -3.95], [17.55, 1.4, -4.0]], () => circuitOn('tool'), { r:.025 });
    syncTFeed();
  }
  if (fx) { toast('The tool press is in. Hire an operator for it in the office, and keep the coil bay stocked.', 'gold'); sfx('level', .6); confetti(); for (let i = 0; i < 16; i++) spark(P.tpress[0] + rand(-1, 1), rand(.4, 1.6), P.tpress[1] + rand(-.5, .5)); checkCharter(); save(); }
  rebuildNav();
}
// spare parts: a machine repair uses one; with none on the shelf the mechanic makes do, slowly
function orderParts(){
  const [n, price] = PARTS_LOT, room = partsCap() - S.parts; if (S.level < 3 || room <= 0 || S.cash < price) return;
  S.cash -= price; S.parts += Math.min(n, room); syncParts(); sfx('buy'); toast(`${Math.min(n, room)} spare parts on the shelf by the tool press.`, 'good'); save(); renderOffice();
}
const needsPart = f => S.level >= 3 && !!FAULTS[f.kind].part;
// The trading licence (level 3). The Town tab shows the council's checklist with live ticks, so the owner can put the
// site in order first. After the application the inspector, Ada Hale, walks the site with her clipboard and checks
// each line where it lives. Every line passed: the licence is granted. Otherwise the report lists what to fix, and
// a re-inspection costs $40.  licence: 0 none, 1 applied (she is on her way), 3 inspecting, 4 failed, 2 granted
const REINSPECT_PRICE = 40;
const INSPECT = [
  { id:'fire',    text:'Wiring and switchboard in good order', fix:'Your mechanic services the wiring at the switchboard (it must be 50% or better); fix any open power fault', at:() => P.boardSpot,
    ok:() => S.cond.wiring >= 50 && !S.faults.some(f => FAULTS[f.kind].trade === 'electrician') },
  { id:'guards',  text:'Machines in working order', fix:'No jams or worn parts open on any machine', at:() => [P.sawFix[0] - .2, P.sawFix[1] + .3],
    ok:() => !S.faults.some(f => FAULTS[f.kind].trade === 'mechanic' && !FAULTS[f.kind].svc) },
  { id:'crew',    text:'A mechanic on the payroll', fix:'Hire one in the office (Staff)', at:() => P.mechHome, ok:() => hasRole('mechanic') },
  { id:'parts',   text:'Spare parts on the shelf', fix:'Buy spare parts (Stock)', at:() => [P.parts[0], P.parts[1] + .8], ok:() => S.parts >= 1 },
];
const licReady = () => INSPECT.every(c => c.ok());
let inspector = null;
function applyLicence(){
  if (S.level < 3 || ![0, 4].includes(S.lv3.licence || 0)) return;
  const price = S.lv3.licence === 4 ? REINSPECT_PRICE : LICENCE_PRICE; if (S.cash < price) return;
  S.cash -= price; S.lv3.licence = 1; S.lv3.licT = 0; S.lv3.check = {}; sfx('buy');
  toast(`${price === REINSPECT_PRICE ? 'Re-inspection booked' : 'Application sent to the council'}. Inspector Ada Hale arrives in about ${LICENCE_WAIT} s: put the checklist in order (Town).`, 'good'); save(); renderOffice();
}
function spawnInspector(){
  const c = makeChar('worker', ...P.frontOut, { parts:['clipboard', 'hair_pony'], cols:{ suit:'#4a4f57', shirt:'#e8e2d4', skin:'#c68c5f', hair:'#2a1f19', hat:'#4a4f57' } });
  c.st = { id:-2000, name:'Inspector', role:'inspector', lv:1, energy:100, focus:100 }; c.step = 0; c.state = 'walk'; c.wait = 0;
  goTo(c, ...INSPECT[0].at()); return c;
}
function updateInspector(dt){
  const L = S.lv3;
  if (L.licence === 1) { L.licT += dt; if (L.licT >= LICENCE_WAIT) { L.licence = 3; L.step = 0; L.check = {}; toast('Inspector Ada Hale is at the gate with her checklist. She walks the site now.', 'gold'); sfx('horn', .5); save(); } }
  if (L.licence !== 3) { if (inspector && inspector.state === 'leave') { if (walk(inspector, dt)) { inspector.o.removeFromParent(); mixers.splice(mixers.indexOf(inspector.mixer), 1); inspector = null; } else inspector.play('walk'); } return; }
  if (!inspector) { inspector = spawnInspector(); inspector.step = L.step || 0; goTo(inspector, ...INSPECT[inspector.step].at()); }
  const c = inspector, item = INSPECT[c.step];
  if (c.state === 'walk') { if (walk(c, dt)) { c.state = 'look'; c.wait = 2.6; c.say = { text:`Checking: ${item.text.toLowerCase()}`, until:T + 2.4 }; } else c.play('walk'); return; }
  if (c.state === 'look') { c.play('inspect'); c.wait -= dt; if (c.wait > 0) return;
    const ok = item.ok(); L.check[item.id] = ok; floatText(`${ok ? '✓' : '✗'} ${item.text}`, c.o.position.x, 2.3, c.o.position.z, ok ? 'info' : 'warn'); sfx(ok ? 'tick' : 'alarm', .5);
    c.step++; L.step = c.step;
    if (c.step < INSPECT.length) { c.state = 'walk'; goTo(c, ...INSPECT[c.step].at()); save(); return; }
    // the verdict
    const fails = INSPECT.filter(x => !L.check[x.id]);
    L.licence = fails.length ? 4 : 2; L.step = 0; c.state = 'leave'; goTo(c, ...P.frontOut);
    c.say = { text:fails.length ? `${fails.length} item${fails.length > 1 ? 's' : ''} to put right. I'll be back when you call.` : 'All in order. Congratulations.', until:T + 4 };
    story({ kind:'licence', pass:!fails.length });
    if (!fails.length) { sfx('level', .5); confetti(); }
    save(); checkCharter(); renderOffice(); }
}
function licenceHtml(){
  const L = S.lv3, pass = L.licence === 2, row = c => { const v = L.check ? L.check[c.id] : undefined;
    return `<li class="${v === true ? 'ok' : v === false ? 'bad' : ''}"><span class="box">${v === true ? '✓' : v === false ? '✗' : ''}</span><span>${c.text}${v === false ? `<small>${c.fix}</small>` : ''}</span></li>`; };
  return `<button class="skip" data-next type="button">CLOSE</button><div class="cert-h"><span>Valley Council</span><span>Trading Standards</span></div>
    <h3>${pass ? 'Certificate of Trade' : 'Inspection report'}</h3><p class="cert-s">Iron Valley Works, Mill Road · inspected by Ada Hale</p>
    <ul class="checks">${INSPECT.map(row).join('')}</ul>
    ${pass ? '<div class="stamp">Approved</div><p class="cert-s">The works may trade as a manufacturer in the valley.</p>' : `<div class="stamp fail">Not yet</div><p class="cert-s">Put the crossed items right, then book a re-inspection in the Town tab (${fmt(REINSPECT_PRICE)}).</p>`}
    <button class="btn primary" data-next type="button" style="width:100%;min-height:44px">${pass ? 'Frame it' : 'Back to work'}</button>`;
}
function updateLevel3(dt){
  if (S.level < 3) return;
  updateInspector(dt);
  runBuilder('pressBuilder', P.tpress, S.lv3, 'pressT', PRESS_BUILD, finishPress, dt);
}
async function startLevel(n){
  if (n !== S.level + 1 || n > MAX_LEVEL) return;
  await ensureModels(n);
  const w0 = calDay(); S.cal = S.cal || { off:0 }; S.cal.off = Math.max(LV_START[n] ?? w0, w0) - dayNo(); const w1 = calDay();
  S.level = n; S.levelUp = false; S.skillPts = (S.skillPts || 0) + 1;   // v2.0 18.5: a skill point with each level-up
  // each charter starts from a clean sheet: only the reputation line can be ticked straight away
  if (n === 2) { if (!S.restored.yard) applyRestore('yard', false);   // v2.0: the back yard is cleared in the two-week skip, ready for the coil bay
    S.lv2.e0 = S.earned; S.lv2.ot0 = S.ontime; S.lv2.ps0 = S.pshipped; buildLevel2(); applyUpgradeVisuals(); sfx('level', .7); toast('Level 2: Reopened Factory. Pay for the pipe machine at its pad beside the crate machine.', 'gold'); }
  if (n === 4) { S.lv4.e0 = S.earned; S.lv4.ot0 = S.ontime; S.lv4.forkMoved = 0; S.lv4.mixed = 0; buildLevel4(); applyUpgradeVisuals(); sfx('level', .7); toast('Level 4: Growing Enterprise. The wall to the yard is down: install the second crate machine there, and hire a forklift driver.', 'gold'); }
  if (n === 5 || n === 9) repaintSigns();
  if (n === 5) { const w = S.staff.find(s => s.role === 'loader' && s.name === 'Wilf') || S.staff.filter(s => s.role === 'loader').sort((a, b) => b.lv - a.lv)[0]; if (w) { w.chief = true; setTimeout(() => toast(`${w.name} ${w.sur || ''} becomes dock crew chief: he leads the loading on both docks, 10% quicker.`, 'gold'), 6000); } }
  if (n === 5) { Object.assign(S.l5, { e0:S.earned, ot0:S.ontime, t0:S.time, nextBill:1e12, rushAt:S.time + 900, pairs:0, d2done:0, dieselL:0, daysThisWeek:0, acc:null }); buildLevel5(); applyUpgradeVisuals(); sfx('level', .7);
    toast('Level 5: Regional Manufacturer. Snow on the yard and the new office block across Mill Road.', 'gold'); story({ kind:'eldon5' }); setTimeout(() => meet('priya'), 3500); }
  if (n === 6) { Object.assign(S.l6, { e0:S.earned, ot0:S.l5.onTime || 0 }); buildLevel6(); applyUpgradeVisuals(); sfx('level', .7);
    toast('Level 6: Industrial Company. Spring showers. Ada Finch\'s daughter June is at the office block about the clerk\'s job; tier 2 refits are in the Machines tab.', 'gold'); setTimeout(() => { if (!S.staff.some(x => x.role === 'clerk')) story({ kind:'june' }); }, 3500); }
  if (n === 7) { Object.assign(S.l7, { e0:S.earned, ot0:S.ontime, refillAt:S.time + 2 }); buildLevel7(); applyUpgradeVisuals(); sfx('level', .7);
    toast('Level 7: Major Manufacturer. October: fog in the mornings and leaves on the lanes. The phone gives way to the order board on the office wall: choose your work.', 'gold'); }
  if (n === 8) { Object.assign(S.l8, { e0:S.earned, scrap:12, ore:12 }); buildLevel8(); applyUpgradeVisuals(); sfx('level', .7);
    toast('Level 8: Steel Works. The siding is laid behind the North field, the furnace house and the 11 kV plinth are up. The first train is due at eight.', 'gold'); }
  if (n === 3) { S.lv3.e0 = S.earned; S.lv3.f0 = S.fixed; buildLevel3(); applyUpgradeVisuals(); sfx('level', .7); toast(plotOwned('north') ? 'Level 3: Local Manufacturer. Install the tool press on the North field.' : 'Level 3: Local Manufacturer. Buy the North field from Abel Thorne, then install the tool press on it.', 'gold'); }
  if (n === 3) toast('Valley Timber Co. has closed the free account. From now on you buy timber in the office (Stock), and the generator burns diesel your loaders fetch from the tank.', 'gold');
  placeFolk(); story({ kind:'skip', level:n, w0, w1 }); story({ kind:'courier', level:n }); setTimeout(() => { levelShot = yardShot(); }, 1500);
  if (CHOICE[n]) setTimeout(() => toast(`This level's choice: ${CHOICE[n]}`, ''), 2500);
  save(); renderOffice();
}
// the road ahead: every level of the plan, and what it opens, read straight from progression.js
const ROLE_WORD = { operator:'operator', loader:'loader', helper:'machine helper', mechanic:'mechanic', supervisor:'supervisor', forklift:'forklift driver', clerk:'office clerk', foreman:'foreman', dispatcher:'dispatcher', manager:'plant manager', guard:'security guard', driver:'test driver', technician:'technician', engineer:'engineer', electrician:'electrician', cleaner:'cleaner' };
function levelOpens(n){
  const out = [];
  for (const r of Object.keys(PG.ROLE_CAPS)) { if (r === 'electrician' || r === 'cleaner') continue; const d = PG.roleCap(r, n) - (n > 1 ? PG.roleCap(r, n - 1) : 0); if (d > 0 && n > 1) out.push(`+${d} ${ROLE_WORD[r]}${d > 1 ? 's' : ''}`); }
  if (n > 1) out.push(`workers train to level ${PG.workerLvCap(n)}`);
  // only the upgrades this game really sells (Bible: no welfare, diesel or electrician kit), at the level they really open
  for (const u of UPGRADES) { const lv0 = u.lv || 1; let k = 0, first = false;
    for (const [lv, add] of u.tiers) { const at = Math.max(lv, lv0); if (at === n) { k += add; if (at === lv0 && lv === u.tiers[0][0]) first = true; } }
    if (k) out.push(first ? `new: ${u.name}` : `${u.name} +${k}`); }
  return out;
}
function roadAhead(){
  let h = `<div class="dept"><div class="dept-h"><span class="ic">${icon('star')}</span><div><b>The road ahead</b><small>16 levels in four acts · what each one opens</small></div></div><div class="road">`;
  for (let n = 1; n <= PG.LAST_LEVEL; n++) { const L = PG.levelRow(n), cls = n < S.level ? 'done' : n === S.level ? 'now' : n <= MAX_LEVEL ? '' : 'plan';
    h += `<div class="rl ${cls}"><div class="rn">${String(n).padStart(2, '0')}</div><div><b>${L.title}</b><small>${L.system} · ${L.product}${L.goal ? ` · goal ${fmt(L.goal)}` : ''}${n > MAX_LEVEL ? ' · planned' : ''}</small><p>${levelOpens(n).join(' · ')}</p></div></div>`; }
  return h + '</div></div>';
}
function setLamp(m, col, k = 3){ if (!m) return; m.traverse(x => { if (!x.isMesh) return; if (!x.userData.own) { x.material = x.material.clone(); x.userData.own = true; } x.material.emissive.set(col); x.material.emissiveIntensity = k; }); }

/* =====================================================================
   GENERATOR, FUEL, WEAR AND FAULTS
   ===================================================================== */
const wear = c => 1 + 3 * Math.pow(1 - c / 100, 2);
function updateGenerator(dt){
  const fw = M.gen.getObjectByName('flywheel'), run = genActive();
  if (suppliesFree()) S.power.fuel = 100;   // levels 1-2: the generator is a power capacity; from level 3 loaders fetch diesel for it
  const fan = M.gen.userData.fan ||= M.gen.getObjectByName('fan');
  if (run) { fw.rotation.x += dt * 9; if (fan) fan.rotation.y += dt * 16; if (M.gen2N) M.gen2N.fan.rotation.y += dt * 14;
    // a diesel set at work: a steady shudder, a breath of exhaust every second or so, heavier under load
    M.gen.position.z = P.gen[1] + Math.sin(T * 61) * .004; M.gen.rotation.z = Math.sin(T * 47) * .0025;
    if (Math.random() < dt * (.8 + 1.6 * load() / genKW())) sprite(pick(['#6a6866', '#7d7a76', '#5a5856']), P.exhaust[0], P.exhaust[1] + .1, P.exhaust[2], rand(-.1, .1), rand(.6, 1), rand(-.1, .1), 2.4, .22);
    const kw = load(); S.power.fuel = Math.max(0, S.power.fuel - dt * (.22 + .4 * kw / genKW()) * PG.cut(.25, S.up.fuel));
    S.cond.engine = Math.max(0, S.cond.engine - dt * .16 * PG.cut(.3, S.up.gen));
    if (powerOn()) S.cond.wiring = Math.max(0, S.cond.wiring - dt * .1 * (.3 + kw / genKW()) * PG.cut(.3, S.up.surge) * (S.restored.lights ? .8 : 1));
    if (S.power.fuel <= 0) { toast('The generator ran out of diesel. A loader will bring some.', 'bad'); sfx('alarm'); }
  }
  const gl = mainsUp() ? LAMP_IDLE : powerOn() ? (overloaded() ? LAMP_IDLE : LAMP_RUN()) : LAMP_STOP; setLamp(M.gen.getObjectByName('status_lamp'), ...gl); if (M.gen2N) setLamp(M.gen2N.lamp, ...gl);
  const eng = S.faults.some(f => f.kind === 'engine'), alt = S.faults.some(f => f.kind === 'alternator');
  M.gen.position.x = P.gen[0] + (eng ? Math.sin(T * 50) * .006 : 0);
  if (alt && Math.random() < dt * 8) spark(P.gen[0] + rand(.4, .9), rand(.5, 1.2), P.gen[1] + rand(-.2, .4));
  if (eng && Math.random() < dt * 3) sprite('#3a3835', P.exhaust[0], P.exhaust[1], P.exhaust[2], .1, .5, 0, 2.2, .35);
}
function updateFaults(dt){
  for (const f of S.faults) { f.t += dt; if (f.diag) f.diagT += dt; }
  // Level Bible: no breakdowns in levels 1 and 2 (only the old generator's stalls); from level 3 a jam, a worn
  // part or a power cut about every 3 minutes, never during the guided order or a story card
  scheduleIssue(dt);
}
function addFault(kind, opt = {}){ if (FAULTS[kind] && FAULTS[kind].trade === 'mechanic') { sfx('clank', .8); noiseS(.6, 3500, .03, 'highpass'); }
  const def = FAULTS[kind]; if (kind === 'breaker' && !S.power.breakers[opt.circuit]) return;
  // issues are known the moment they happen (Master Design Doc): the card names the trade that fixes it
  const f = { id:++S.faultSeq, kind, where:def.where, circuit:opt.circuit || null, diag:true, prog:0, by:null, supBy:null, t:0, diagT:0, contractor:false, guided:!!opt.guided };
  S.faults.push(f); S.lastFault = S.time;
  if (kind === 'breaker') S.power.breakers[f.circuit] = false;
  const who = fixerOf(def.trade)[0], art = def.trade === 'electrician' ? 'an electrician' : 'a mechanic';
  sfx('alarm'); floatText(def.name, ...WHERE[f.where].mark, 'warn');
  toast(f.guided ? `${def.name}! Stand in the red ring by it to fix it by hand.` : kind === 'powercut' ? `Power cut: machines on the back-up line at half speed. ${who ? `${who.st.name} is on it.` : 'It passes by itself in 30 s.'}`
    : `${def.name}: ${who ? `${who.st.name} is on it.` : `a job for ${art}. Fix it yourself in the red ring (half speed) or hire one.`}`, 'bad'); save();
}
const faultById = id => S.faults.find(f => f.id === id);
// who fixes a trade's faults: there is no electrician on the payroll (Bible 4.1), so the mechanic takes the power jobs too
const fixerOf = tr => { const a = staffOf(tr); return a.length || tr !== 'electrician' ? a : staffOf('mechanic'); };
const fixerOn = tr => fixerOf(tr).length > 0;
const myTrade = (c, tr) => tr === c.st.role || (c.st.role === 'mechanic' && tr === 'electrician' && !hasRole('electrician'));
function faultSymptom(f){
  if (f.kind === 'breaker') return f.circuit === 'saw' ? 'The saw lost power' : f.circuit === 'pipe' ? 'The pipe mill lost power' : f.circuit === 'tool' ? 'The tool press lost power' : f.circuit === 'lights' ? 'The lights went out' : 'The office went dark';
  if (f.where === 'pipe') return 'The pipe mill stopped';
  if (f.where === 'tool') return 'The tool press stopped';
  if (f.where === 'gen' || f.kind === 'junction') return f.kind === 'junction' ? 'The saw lost power' : 'All power is off';
  return 'The saw stopped';
}
function diagnose(f, by){
  if (f.diag) return; f.diag = true; f.diagT = 0; const def = FAULTS[f.kind];
  const who = fixerOf(def.trade)[0];
  floatText(def.name, ...WHERE[f.where].mark, 'info'); sfx('tap');
  const art = def.trade === 'electrician' ? 'an electrician' : 'a mechanic';
  toast(who ? `${def.name}${f.circuit ? ` (${CIRCUITS[f.circuit].name})` : ''}. ${who.st.name} the ${def.trade} is on it.` : `${def.name}: a job for ${art}. You have none. Hire one in the office.`, who ? 'gold' : 'bad');
  if (by && by !== owner) giveXp(by.st, 8);
  save();
}
function clearFault(f, by, passed){ if (!passed && FAULTS[f.kind] && FAULTS[f.kind].trade === 'mechanic') { noiseS(.25, 250, .05); setTimeout(() => tone(70, .6, 'sawtooth', .02, 0, 140), 250); const mk = WHERE[f.where].mark; for (let i = 0; i < 6; i++) sprite('#4a4946', mk[0] + rand(-.3, .3), mk[1] - .4, mk[2], rand(-.2, .2), rand(.4, .8), rand(-.2, .2), 1.2, .25, -.02); }
  S.faults = S.faults.filter(x => x !== f);
  if (passed) { floatText('Power back', ...WHERE[f.where].mark, 'info'); sfx('clank', .5); save(); return; }   // a power cut that ran its course is not a fix
  if (f.kind === 'breaker') S.power.breakers[f.circuit] = true;
  if (f.where === 'saw') S.cond.saw = 100; else if (f.where === 'pipe') S.cond.pipe = 100; else if (f.where === 'tool') S.cond.tool = 100; else if (f.kind === 'engine') S.cond.engine = 100; else S.cond.wiring = Math.min(100, S.cond.wiring + 45);
  S.fixed++; sfx('fix'); floatText(f.where === 'gen' || f.kind === 'junction' ? 'Power restored' : 'Fixed', ...WHERE[f.where].mark, 'info');
  if (by && by.st && by.st.id > 0) giveXp(by.st, 25);
  save();
}

/* =====================================================================
   TRUCK + ORDERS
   ===================================================================== */
const truck = { state:'away', t:0, s:0, path:null };
function bez(p0, c, p1, t){ const u = 1 - t; return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]; }
function samplePath(segs){
  const pts = []; for (const s of segs) { const N = s.bez ? 24 : 2; for (let i = 0; i <= N; i++) { const t = i / N; const p = s.bez ? bez(s.p[0], s.p[1], s.p[2], t) : [lerp(s.p[0][0], s.p[1][0], t), lerp(s.p[0][1], s.p[1][1], t)]; pts.push({ x:p[0], z:p[1], rev:!!s.rev }); } }
  let L = 0; pts.forEach((p, i) => { if (i) L += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.d = L; }); return { pts, len:L };
}
function pathAt(path, d){
  const pts = path.pts; d = clamp(d, 0, path.len); let i = 1; while (i < pts.length - 1 && pts[i].d < d) i++;
  const a = pts[i - 1], b = pts[i], t = (d - a.d) / Math.max(1e-6, b.d - a.d); const x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
  let hx = b.x - a.x, hz = b.z - a.z; if (b.rev) { hx = -hx; hz = -hz; } return { x, z, yaw:Math.atan2(-hz, hx) };
}
const ARRIVE = samplePath([{ p:[[-70, ROAD_Z - .9], [P.truck[0] + 6.5, ROAD_Z - .9]] }, { bez:true, rev:true, p:[[P.truck[0] + 6.5, ROAD_Z - .9], [P.truck[0], ROAD_Z - .9], P.truck] }]);
const LEAVE = samplePath([{ bez:true, p:[P.truck, [P.truck[0], ROAD_Z - .9], [P.truck[0] + 5, ROAD_Z - .9]] }, { p:[[P.truck[0] + 5, ROAD_Z - .9], [80, ROAD_Z - .9]] }]);   // keep left: out of the bay and into the near lane, eastbound
// Orders come in by phone. The owner takes the call in the office; the manager
// (or, without one, the owner) briefs the operator; only then is anything cut.
let callT = 0, ringT = 0;
// what the next caller wants. Level 2 orders mix crates and pipes and lean toward what the charter still needs.
function nextOrderSpec(){
  const cq = ORDER_QTY[Math.min(S.orderSeq, ORDER_QTY.length - 1)];
  if (S.level < 2 || !millReady()) return { qty:cq, pq:0, l2:false };
  const k = S.lv2.seq; let kind = k === 0 ? 'pipe' : L2_MIX[(k - 1) % L2_MIX.length];
  const pLine = S.level === 2 && CHARTER2.find(c => c.id === 'pipes'), needC = S.shipped < 60, needP = pLine ? pLine.get(S) < pLine.need : S.pshipped < 20;   // lean toward the charter's pipes while they are short
  if (kind === 'pipe' && !needP && needC) kind = 'mix'; if (kind === 'crate' && !needC && needP) kind = 'pipe';
  const pq = PIPE_QTY[Math.min(k, PIPE_QTY.length - 1)];
  if (S.level >= 4 && pressReady()) {   // level 4 (Level Bible): the guided 40 crates, 20 pipes, 10 tools, then mostly mixed orders
    const j = S.lv4.seq, tq = TOOL_QTY[Math.min(j + 3, TOOL_QTY.length - 1)], cq4 = ORDER_QTY[ORDER_QTY.length - 1], pq4 = PIPE_QTY[Math.min(j + 2, PIPE_QTY.length - 1)];
    if (j === 0) return { qty:40, pq:20, tq:10, exact:true, guided4:true, l4:true };
    const k4 = L4_MIX[(j - 1) % L4_MIX.length];
    const spec = k4 === 'mix3' ? { qty:Math.round(cq4 * .6), pq:Math.round(pq4 * .5), tq:Math.round(tq * .6) } : k4 === 'mix' ? { qty:Math.round(cq4 * .7), pq:Math.round(pq4 * .6), tq:0 }
      : k4 === 'tool' ? { qty:0, pq:0, tq } : k4 === 'pipe' ? { qty:0, pq:pq4, tq:0 } : { qty:cq4, pq:0, tq:0 };
    return Object.assign(spec, { l4:true }); }
  if (S.level >= 3 && pressReady()) {   // level 3: the guided tool order first, then a mix of all three products
    const j = S.lv3.seq, tq = TOOL_QTY[Math.min(j, TOOL_QTY.length - 1)]; let k3 = j === 0 ? 'tool' : L3_MIX[(j - 1) % L3_MIX.length];
    if (k3 === 'crate' && S.tshipped < 50 && j % 2) k3 = 'mix3';
    const spec = k3 === 'tool' ? { qty:0, pq:0, tq } : k3 === 'mix3' ? { qty:Math.max(3, Math.round(cq * .4)), pq:Math.max(2, Math.round(pq * .4)), tq:Math.max(3, Math.round(tq * .6)) }
      : k3 === 'pipe' ? { qty:0, pq, tq:0 } : k3 === 'crate' ? { qty:cq, pq:0, tq:0 } : { qty:Math.max(4, Math.round(cq * .6)), pq:Math.max(2, Math.round(pq * .5)), tq:0 };
    return Object.assign(spec, { l2:false, l3:true, guided:j === 0 && !S.lv3.jam }); }
  return Object.assign(kind === 'pipe' ? { qty:0, pq } : kind === 'crate' ? { qty:cq, pq:0 } : { qty:Math.max(4, Math.round(cq * .6)), pq:Math.max(2, Math.round(pq * .5)) }, { l2:true });
}
const L1_ORDERS = [[20, 240], [40, 480], [50, 600], [60, 720]];
function newCall(){
  // build 0.19: an order agreed on a sales call needs no phone call: it starts as soon as the yard is free
  if (S.book && S.book.length && S.orderSeq > 0) { const o = S.book.shift(); o.place0 = true; S.call = o; toast(`${o.client}: the order you agreed on your visit starts now.`, 'gold'); acceptCall(); return; }
  if (S.orderSeq > 0 && S.tutDone) { const cs = callerSpec(); if (cs) { S.call = cs; toast(`The office phone is ringing: ${cs.client} (your regular account).`, 'gold'); save(); return; } }
  if (S.level === 1 && S.orderSeq < L1_ORDERS.length) { const [q, pay] = L1_ORDERS[S.orderSeq];
    S.call = { qty:q, pq:0, tq:0, l2:false, l3:false, l4:false, guided4:false, guided:false, nodl:S.orderSeq === 0, pay, client:CLIENTS[(S.orderSeq + 1) % CLIENTS.length], deadline:Math.max(180, q * 4 + 60) };
    toast(`The office phone is ringing: ${S.call.client}.`, 'gold'); save(); return; }
  if (S.level === 1) { const q = [40, 50, 60][S.orderSeq % 3], pay = Math.round(q * 12 * (0.9 + S.rep / 500) * bandPay());
    S.call = { qty:q, pq:0, tq:0, l2:false, l3:false, l4:false, guided4:false, guided:false, nodl:false, pay, client:CLIENTS[(S.orderSeq + 1) % CLIENTS.length], deadline:Math.max(180, q * 4 + 60) };
    toast(`The office phone is ringing: ${S.call.client}.`, 'gold'); save(); return; }
  // reputation bands (Master Design Doc): shaky gets small orders, trusted and up get large ones, renowned pays 10% more
  const sp = nextOrderSpec(), e = PG.econ(S.level), k = S.orderSeq === 0 ? 1 : bandSize(), sz = (n, g = e.qty) => n ? (sp.exact ? n : Math.max(2, Math.round(n * g * k))) : 0, gS = 1 + (e.qty - 1) / 2;   // steel goods grow half as fast: strip comes by the coil
  const q = sz(sp.qty), pq = sz(sp.pq, gS), tq = sz(sp.tq || 0, gS);
  S.call = { qty:q, pq, tq, l2:sp.l2, l3:!!sp.l3, l4:!!sp.l4, guided4:!!sp.guided4, guided:!!sp.guided, nodl:S.orderSeq === 0 || !!sp.guided4, pay:Math.round((q * CRATE_PRICE + pq * PIPE_PRICE + tq * TOOL_PRICE) * e.price * (0.9 + S.rep / 500) * bandPay()), client:CLIENTS[(S.orderSeq + 1) % CLIENTS.length], deadline:Math.max(180, Math.round(60 + q * 10 + pq * 11 + tq * 9)) };
  toast(`The office phone is ringing: ${S.call.client}.`, 'gold'); save();
}
// build 0.19: a caller offers the same goods three ways. Rush pays 30% more against a short deadline, and the rush lorry
// will not wait: late and not loaded, it leaves without the goods. Bulk is twice the goods at 10% under the rate.
const termsOk = c => c && !c.dock && !c.nodl && !c.guided && !c.guided4 && !c.place0 && !c.board;   // Bible v2.0 5.1: every phone call offers regular, rush or bulk
function withTerms(c, terms){
  if (terms === 'rush') return Object.assign({}, c, { terms, pay:Math.round(c.pay * 1.3), deadline:Math.max(90, Math.round(c.deadline * .55)) });
  if (terms === 'bulk') return Object.assign({}, c, { terms, qty:c.qty * 2, pq:(c.pq || 0) * 2, tq:(c.tq || 0) * 2, pay:Math.round(c.pay * 1.8), deadline:Math.round(c.deadline * 1.7) });
  return c;
}
function acceptCall(terms){
  if (!S.call) return; if (terms && terms !== 'regular' && termsOk(S.call)) S.call = withTerms(S.call, terms); const c = S.call; S.call = null; if (c.dock === 2) { acceptCall2(c); return; }
  S.order = Object.assign(c, { id:++S.orderSeq, time:0, ready:false, briefed:false, met:false, cut:0, pcut:0, tcut:0, pq:c.pq || 0, tq:c.tq || 0 }); if (c.l2) S.lv2.seq++; if (c.l3) S.lv3.seq++; if (c.l4) S.lv4.seq++;
  if (c.guided4 && !hasRole('supervisor')) toast('A big mixed order: 40 crates, 20 pipes and 10 tools. Too much to watch alone: promote a worker to supervisor (office, Staff).', 'gold');
  truck.t = 0; sfx('buy'); owner.say = { text:`${c.client}: ${describe(c)}. Done.`, until:T + 2.4 }; if (!c.guided4) lateRoll(S.order);
  const sup = supervisor(), op = orderOp(S.order), where = op && op.st.mach === 'pipe' ? 'pipe mill' : op && op.st.mach === 'tool' ? 'tool press' : 'saw';
  // nobody to brief: the owner knows the order already and works it by hand
  if (!sup && !op) { briefOrder(null); toast(`Order taken${S.order.nodl ? ', no deadline on the first one' : ''}. Stand at the crate machine to make it yourself.`, 'good'); }
  else toast(sup ? `${sup.st.name} is coming to take the order from you.` : `Order taken. Now brief ${op.st.name} at the ${where}.`, 'good');
  save(); renderOffice();
}
function declineCall(){ if (!S.call) return; S.call = null; callT = 0; repChange(-2); toast('Order declined. Reputation −2.', 'bad'); save(); renderOffice(); }
function briefOrder(by){
  const o = S.order; if (!o || o.briefed) return; o.briefed = true; o.met = true; o.tb = Math.round(o.time);
  if (by) { by.say = { text:`${describe(o)} for ${o.client}. Start now.`, until:T + 2.6 }; by.play('point'); by.lock = .9; }
  // both operators hear it: the saw for crates, the mill for pipes
  for (const op of [o.qty ? sawOp() : null, o.pq ? pipeOp() : null, o.tq ? pressOp() : null]) if (op) op.say = { text:'Right away!', until:T + 2.2 };
  sfx('tap'); save();
}
function orderTimber(qty){
  const lot = timberLots().find(l => l[0] === qty); if (!lot || S.delivery) return;
  if (S.store + qty > storeCap()) { toast('Not enough room in the stock room for that much timber.', 'bad'); return; }
  const price = Math.round(lot[1] * supplyK()); if (S.cash >= price) S.cash -= price; else { S.bills += price; toast(`On account: ${fmt(price)} comes off your next delivery.`, 'gold'); }
  S.delivery = { qty, left:qty, onLorry:qty }; S.timberBought += qty; sup.state = 'away'; sup.t = 0;
  sfx('buy'); toast(`Ordered ${qty} planks. The timber lorry unloads at goods-in by bay 2; the loaders take them to the stock room.`, 'good'); save(); renderOffice();
}
const sup = { state:'away', t:0, s:0, path:null };
const TRUCK_BOX = [P.truck[0] - 1.15, P.truck[1] - 2.45, P.truck[0] + 1.15, P.truck[1] + 2.75], SUP_BOX = [P.supPark[0] - 1.15, P.supPark[1] - 2.45, P.supPark[0] + 1.15, P.supPark[1] + 2.75];
const SUP_ARRIVE = samplePath([{ p:[[-80, ROAD_Z - .9], [P.supPark[0] + 6.5, ROAD_Z - .9]] }, { bez:true, rev:true, p:[[P.supPark[0] + 6.5, ROAD_Z - .9], [P.supPark[0], ROAD_Z - .9], P.supPark] }]);
const SUP_LEAVE = samplePath([{ bez:true, p:[P.supPark, [P.supPark[0], ROAD_Z - .9], [P.supPark[0] + 5, ROAD_Z - .9]] }, { p:[[P.supPark[0] + 5, ROAD_Z - .9], [90, ROAD_Z - .9]] }]);
// shared driving: speed profile, wheel spin and steering, lamps, reverse beeper
function truckNodes(Tr){ return Tr.userData.n || (Tr.userData.n = { wheel_fl:findNode(Tr, 'wheel_fl'), wheel_fr:findNode(Tr, 'wheel_fr'), wheel_rl:findNode(Tr, 'wheel_rl'), wheel_rr:findNode(Tr, 'wheel_rr'), rev:findNode(Tr, 'lamp_rev'), brake:findNode(Tr, 'lamp_brake'), head:findNode(Tr, 'lamp_head') }); }
function drive(V, Tr, dt, revStart, arriving){
  const N = truckNodes(Tr);
  const p = V.path, left = p.len - V.s, rev = arriving && V.s > revStart - .01;
  // a lorry gives way to anybody in its way, on the road (and at the main gate's mouth) and in the yard, backing in too
  if (roadYield(Tr.position, p, V.s, rev ? 5 : 6.5, V)) { setLamp(N.brake, '#ff2a1a', 2.6); return false; }   // looks past its own bumper (3.3 m from the middle)
  const sp = (arriving ? (rev ? clamp(left * 1.2, .9, 3.0) : clamp((revStart - V.s) * .9 + .5, 2.5, 10)) : clamp(V.s * 1.5 + 1.2, 1.2, 10)) * vehSnowK();   // snow and ice slow the lorries (v2.0 17.3)
  const v = sp * dt * (V === sup ? 1 : dockK()); V.s += v; const q = pathAt(p, V.s), ahead = pathAt(p, V.s + 1.8);
  Tr.position.set(q.x, 0, q.z); Tr.rotation.y = q.yaw;
  let d = ahead.yaw - q.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  for (const n of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) { const w = N[n]; w.rotation.z -= (rev ? -1 : 1) * v / .43; if (n[6] === 'f') w.rotation.y = clamp(d * 1.4, -.5, .5) * (rev ? -1 : 1); }
  setLamp(N.rev, '#ffffff', rev ? 2.5 : 0);
  setLamp(N.brake, '#ff2a1a', rev || left < 5 ? 2.6 : .5);
  setLamp(N.head, '#fff2c8', 1.6);
  if (rev) { V.beep = (V.beep || 0) - dt; if (V.beep <= 0) { V.beep = .55; sfxAt('beep', Tr.position.x, Tr.position.z); } }
  return V.s >= p.len;
}
function parkedLamps(Tr){ const N = truckNodes(Tr); setLamp(N.rev, '#ffffff', 0); setLamp(N.brake, '#ff2a1a', .5); setLamp(N.head, '#fff2c8', 0); }
function updateTruck(dt){
  const Tr = M.truck, tg = findNode(Tr, 'tailgate');
  if (truck.state === 'arrive' || truck.state === 'leave') {
    const done = drive(truck, Tr, dt, ARRIVE.pts.find(q => q.rev).d, truck.state === 'arrive');
    if (done) { if (truck.state === 'arrive') { truck.state = 'docked'; sfxAt('horn', ...P.truck); addCol([P.truck[0] - 1.15, P.truck[1] - 2.45, P.truck[0] + 1.15, P.truck[1] + 2.75], 'truck'); repathAround(); parkedLamps(Tr); } else { truck.state = 'away'; truck.t = 0; callT = 0; S.bed = 0; S.pbed = 0; S.tbed = 0; syncBed(); syncPBed(); syncTBed(); } }
  } else if (truck.state === 'away') { truck.t += dt; Tr.position.set(ROAD_X, 0, -45);
    if (S.order && !closingTime() && truck.t > 9 / dockK() + (S.order.lateBy || 0) + wxLorryLate() && !(trip && M.car.visible && M.car.position.x > 12.4 && M.car.position.z > 8.4 && M.car.position.z < 18) && !['arrive', 'leave'].includes(sup.state) && !(truckB.state === 'arrive' && truckB.s < 30)) { truck.state = 'arrive'; truck.s = 0; truck.path = ARRIVE; repathAround(); S.bed = 0; S.pbed = 0; S.tbed = 0; syncTBed(); syncBed(); syncPBed(); } }
  if (tg) tg.rotation.z = lerp(tg.rotation.z, truck.state === 'docked' ? Math.PI / 2 * .96 : 0, Math.min(1, dt * 4));
  if (S.order) S.order.time += dt;
  if (S.order && S.order.terms === 'rush' && !S.order.ready && S.order.time > S.order.deadline && truck.state !== 'arrive' && truck.state !== 'leave') {
    const o = S.order; unloadBed();
    S.order = null; repChange(-4); toast(`The rush lorry for ${o.client} would not wait: order lost, reputation −4. What was loaded is back on the pallet.`, 'bad');
    if (truck.state === 'docked') { truck.state = 'leave'; truck.s = 0; truck.path = LEAVE; COL.delete('truck'); sfx('horn'); } save(); }
  // the phone rings when there is no order and the truck has gone
  // level 5 opens on the first wage bill (Level Bible: no order until Priya has shown the owner the Finance page)
  // customers ring in office hours only: not after the knocking-off whistle, not in the last twenty minutes (no lorry could
  // come today), not while the crew is at Gus's farewell; a caller still on the line at the whistle rings back tomorrow
  if (S.call && !officeHours() && !S.call.place0) { const c = S.call; S.call = null; callT = 0; if (!c.board) toast(`${c.client} hangs up: the works is closed. They will ring back in the morning.`, ''); if (typeof renderOffice === 'function') renderOffice(); }
  if (!S.order && !S.call && truck.state === 'away' && S.letter && officeHours() && !(S.level >= 5 && !S.l5.paid && S.time - S.l5.t0 < 150)) { callT += dt; if (callT > (S.orderSeq === 0 ? 1.5 : S.book && S.book.length ? 2 : callGap())) newCall(); }
  if (S.call) { ringT -= dt; if (ringT <= 0) { ringT = 2.4; sfx('ring'); try { if (!officeOpen && navigator.vibrate) navigator.vibrate([60, 60, 60]); } catch(e){} } }
}
function updateSupplier(dt){
  const Tr = M.flat;
  if (sup.state === 'away') { Tr.position.set(ROAD_X, 0, -60); sup.t += dt;
    if (S.retryTimber && dayNo() >= S.retryTimber.day && !S.delivery && !closingTime() && S.store + S.retryTimber.qty <= storeCap()) { const q = S.retryTimber.qty; S.retryTimber = null; S.delivery = { qty:q, left:q, onLorry:q, wrong:false }; sup.t = 0; toast('Valley Timber Co. sends the right planks this morning.', 'good'); }
    if (S.delivery && S.delivery.left <= 0) S.delivery = null;   // goods-in cleared
    // goods-in must never hold up the next lorry: planks or coils that cannot go in because returns filled the room are
    // stacked in the aisle after a minute (the stock room runs over its count until the line draws it down)
    if (S.delivery && onLorry() <= 0 && goodsIn() > 0) { const d = S.delivery, steel = d.kind === 'steel', full = steel ? S.coils + coilsInHands() >= coilCap() : S.store + carriedTimber() >= storeCap();
      d.stuckT = full ? (d.stuckT || 0) + dt : 0;
      if (d.stuckT > 60) { const n = goodsIn(); if (steel) { S.coils += n; syncCoilBay(); } else { S.store += n; syncStore(); } d.left -= n; syncGoodsIn(); S.delivery = null;
        toast(`The lads stack the last ${n} ${steel ? 'coil' : 'plank'}${n === 1 ? '' : 's'} from goods-in in the ${steel ? 'coil bay' : 'stock-room'} aisle: goods-in is clear for the next lorry.`, ''); } }
    if (S.delivery && onLorry() > 0 && sup.t > 4 && !closingTime() && !['arrive', 'leave'].includes(truck.state) && !(trip && M.car.visible && M.car.position.x > 12.4 && M.car.position.z > 8.4 && M.car.position.z < 18)) { sup.state = 'arrive'; sup.s = 0; sup.path = SUP_ARRIVE; syncBundles(); repathAround(); } return; }
  if (sup.state === 'arrive' || sup.state === 'leave') {
    if (drive(sup, Tr, dt, SUP_ARRIVE.pts.find(q => q.rev).d, sup.state === 'arrive')) {
      if (sup.state === 'arrive') { sup.state = 'parked'; sfxAt('horn', ...P.supPark); addCol([P.supPark[0] - 1.15, P.supPark[1] - 2.45, P.supPark[0] + 1.15, P.supPark[1] + 2.75], 'supply'); repathAround(); parkedLamps(Tr); toast(S.delivery && S.delivery.kind === 'steel' ? 'Steel coils delivered. Loaders take them to the coil bay.' : 'Timber delivery at the stock room.', 'good'); }
      else { sup.state = 'away'; if (S.delivery && S.delivery.left <= 0) S.delivery = null; syncBundles(); save(); } }
    return; }
  if (sup.state === 'parked' && S.delivery && S.delivery.kind !== 'steel' && S.level >= 3 && S.delivery.wrong === undefined) { const d = S.delivery, scripted = S.level === 3 && weekday() === 3 && !S.lv3.wrongDone;
    d.wrong = scripted || (S.level >= 3 && Math.random() < .12 && !(S.lastWrong >= dayNo() - 2)); if (d.wrong) { S.lv3.wrongDone = true; S.lastWrong = dayNo(); story({ kind:'wrongtimber' }); } }
  if (sup.state === 'parked' && S.delivery && S.delivery.wrong && cardOpen) return;
  if (sup.state === 'parked' && S.delivery && onLorry() > 0) { sup.unT = (sup.unT || 0) + dt;
    if (sup.unT > .3) { sup.unT = 0; S.delivery.onLorry = onLorry() - 1;
      if (!loadersHired() || !M.goodsIn) { S.delivery.left--; if (S.delivery.kind === 'steel') { S.coils++; syncCoilBay(); } else { S.store++; syncStore(); } }   // no loader: the driver takes it to the stores
      syncBundles(); syncGoodsIn(); sfxAt('pick', ...P.supPark, .4); } }
  if (sup.state === 'parked' && S.delivery && onLorry() <= 0) { sup.wait = (sup.wait || 0) + dt; if (sup.wait > 1.2) { sup.wait = 0; sup.state = 'leave'; sup.s = 0; sup.path = SUP_LEAVE; COL.delete('supply'); } }
}
function loadCrate(ch){
  if (truck.state !== 'docked' || !S.order || S.order.ready || ch.carryType !== 'crate') return false;
  const ok = giveTo(ch, 'bed', M.truck, bedPos, () => syncBed()); if (!ok) return false;
  S.bed++; S.shipped++; sfxAt('drop', ch.o.position.x, ch.o.position.z); giveXp(ch.st, 5); checkLoaded();
  return true;
}
function loadPipe(ch){
  if (truck.state !== 'docked' || !S.order || S.order.ready || ch.carryType !== 'pipe') return false;
  const ok = giveTo(ch, 'bed', M.truck, pipeBedPos, () => syncPBed()); if (!ok) return false;
  S.pbed++; S.pshipped++; sfxAt('drop', ch.o.position.x, ch.o.position.z); giveXp(ch.st, 5); checkLoaded(); return true;
}
function checkLoaded(){
  const o = S.order; if (!o || o.ready || S.bed < o.qty || S.pbed < (o.pq || 0) || S.tbed < (o.tq || 0)) return;
  o.ready = true; o.tr = Math.round(o.time); toast(hasRole('supervisor') ? 'Truck loaded. Your supervisor will sign it off.' : 'Truck loaded. Sign the delivery note at the dock.', 'gold');
}
function signOrder(by){
  const o = S.order; if (!o || !o.ready) return; if (by === owner) { buzz([25, 60, 25]); signFlourish(o); }
  const late = !o.nodl && o.time > o.deadline, early = !o.nodl && o.time < o.deadline / 2, gross = late ? Math.round(o.pay * .5) : o.pay;
  let net = gross - S.bills, paid = S.bills; if (net < 0) { S.bills = -net; paid += net; net = 0; } else S.bills = 0; S.billsPaid += paid;
  S.cashPile += net; S.delivered++; l5Delivered(1); l7Delivered(o, late); if (!late) S.ontime++; if (S.level >= 4 && o.qty && o.pq && o.tq) S.lv4.mixed3++; if (S.level >= 4 && [o.qty, o.pq, o.tq].filter(n => n > 0).length >= 2) S.lv4.mixed = (S.lv4.mixed || 0) + 1; repChange(late ? -3 : early ? 3 : 2);
  S.history.unshift({ id:o.id, qty:o.qty, pq:o.pq || 0, tq:o.tq || 0, net, late, dl:o.deadline, t:Math.round(o.time), tb:o.tb, t1:o.t1, tc:o.tc, tr:o.tr }); S.history = S.history.slice(0, 8);
  S.order = null; truck.state = 'leave'; truck.s = 0; truck.path = LEAVE; COL.delete('truck');
  syncPile(); sfx('horn'); floatText(`+${fmt(net)}`, P.cash[0], 1.4, P.cash[1]); gusCheer();
  toast(`${by === owner ? 'You signed' : `${by.st.name} signed`} the delivery${late ? ' (late: half pay, reputation −3)' : early ? ' early: reputation +3' : ': reputation +2'}. ${fmt(net)}${paid ? ` after ${fmt(paid)} of bills` : ''}.`, late ? 'bad' : 'good');
  if (by && by !== owner) giveXp(by.st, 6);
  save(); checkCharter();
}

/* =====================================================================
   INPUT
   ===================================================================== */
const joy = { on:false, id:null, sx:0, sy:0, x:0, y:0 }, keys = new Set();
const JR = 52;
cv.addEventListener('pointerdown', e => { if (joy.on) return; joy.on = true; joy.id = e.pointerId; joy.sx = e.clientX; joy.sy = e.clientY; joy.x = joy.y = 0; cv.setPointerCapture(e.pointerId);
  $('joy').hidden = false; $('joy').style.transform = `translate(${e.clientX}px,${e.clientY}px)`; $('knob').style.transform = ''; audioOn(); });
cv.addEventListener('pointermove', e => { if (!joy.on || e.pointerId !== joy.id) return; let dx = e.clientX - joy.sx, dy = e.clientY - joy.sy; const d = Math.hypot(dx, dy); if (d > JR) { dx *= JR / d; dy *= JR / d; }
  joy.x = dx / JR; joy.y = dy / JR; $('knob').style.transform = `translate(${dx}px,${dy}px)`; });
const endJoy = e => { if (e.pointerId !== joy.id) return; joy.on = false; joy.x = joy.y = 0; $('joy').hidden = true; };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
addEventListener('keydown', e => { if ($('office').hidden && $('levelup').hidden) keys.add(e.key.toLowerCase()); audioOn();
  if (e.key === 'Escape') { closeOffice(); if (cardOpen) { const nx = $('storyBody').querySelector('[data-next]'); if (nx) nx.click(); } }
  if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { const b = !$('levelup').hidden ? $('luOk') : cardOpen ? $('storyBody').querySelector('.btn.primary:not([disabled])') : null; if (b) { e.preventDefault(); b.click(); } } });   // v2.0 20.5
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
function inputDir(){
  let x = joy.x, z = joy.y;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1; if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) z -= 1; if (keys.has('s') || keys.has('arrowdown')) z += 1;
  const m = Math.hypot(x, z); if (m < .15) return [0, 0, 0]; const k = Math.min(1, m); return [x / m * k, z / m * k, k];
}
const near = (o, xz, r) => Math.hypot(o.position.x - xz[0], o.position.z - xz[1]) < r;
const dist2 = (o, xz) => Math.hypot(o.position.x - xz[0], o.position.z - xz[1]);

/* =====================================================================
   OWNER: walks, inspects, signs, collects, pays. Works by hand only where nobody on the crew does the job.
   ===================================================================== */
const MACHINES = [
  { id:'saw', at:() => P.saw, r:1.75 }, { id:'gen', at:() => P.gen, r:1.6 }, { id:'board', at:() => P.boardSpot, r:1.0 },
  { id:'rack', at:() => P.timber, r:1.3 }, { id:'store', at:() => P.storeSpot, r:1.3 }, { id:'tank', at:() => P.tank, r:1.7 }, { id:'jbox', at:() => P.jboxSpot, r:.8 }, { id:'dock', at:() => P.drop, r:1.1 },
  { id:'wc', at:() => P.wcZone, r:1.6 }, { id:'cooler', at:() => P.coolerSpot, r:1.0 },
  { id:'pipe', at:() => P.pmill, r:1.75, ok:() => S.level >= 2 }, { id:'coils', at:() => P.coilSpot, r:1.4, ok:() => !!M.coilBay }, { id:'prack', at:() => P.prackSpot, r:1.0, ok:() => !!M.prack },
  { id:'mill2', at:() => P.mill2, r:1.75, ok:() => S.level >= 5 && !!M.mill2 }, { id:'dock2', at:() => P.drop2, r:1.1, ok:() => S.level >= 5 && !!M.dock2 },
  { id:'press', at:() => P.tpress, r:1.75, ok:() => S.level >= 3 && S.lv3.field }, { id:'parts', at:() => [P.parts[0], P.parts[1] + .7], r:1.1, ok:() => !!M.partsShelf },
];
let actT = 0, inDesk = false, signT = 0, dwell = { key:null, t:0 }, target = null;
function ownerTarget(){
  const o = owner.o; let best = null, bd = 1e9;
  for (const c of [...staffObj.values(), ...temps]) { if (!c.o.visible) continue; const d = dist2(o, [c.o.position.x, c.o.position.z]); if (d < 1.35 && d < bd) { bd = d; best = { type:'staff', c, key:'s' + c.st.id }; } }
  if (best) return best;
  for (const f of S.faults) { const sp = WHERE[f.where].spot(), mk = WHERE[f.where].mark, d = Math.min(dist2(o, sp), dist2(o, [mk[0], mk[2]]) - .3);
    if (d < 1.5 && d < bd) { bd = d; best = { type:'fault', f, key:'f' + f.id }; } }
  if (best) return best;
  for (const m of MACHINES) { if (m.ok && !m.ok()) continue; const d = dist2(o, m.at()); if (d < m.r && d < bd) { bd = d; best = { type:'machine', id:m.id, key:'m' + m.id }; } }
  return best;
}
function inspectStaff(c){
  const st = c.st; S.checked[st.role] = true;
  if (st.role === 'operator' && S.order && !S.order.briefed) { briefOrder(owner); return; }
  if (c.state !== 'slack' && (c.idleT || 0) > 2.5 && !(c.talkCD > 0) && st.role !== 'supervisor') { startTalk(owner, c); return; }
  if (c.state === 'slack') { endSlack(c, 100); owner.play('point'); owner.lock = .9; owner.faceTo([c.o.position.x, c.o.position.z]); floatText('Back to work!', c.o.position.x, 1.7, c.o.position.z, 'info'); sfx('tap'); }
  else if ((st.focus ?? 100) < 70) { st.focus = 100; floatText('Checked', c.o.position.x, 1.7, c.o.position.z, 'info'); }
}
function updateOwner(dt){
  const [dx, dz, k] = inputDir(), o = owner.o, load = owner.cart ? (owner.cart.n || owner.stack.length ? .9 : .95) : owner.stack.length ? (owner.carryType === 'pipe' ? .92 : .95) : 1;
  const sp = 3.4 * (1 + .12 * S.up.boots) * (1 + .1 * (S.skills.walk || 0)) * load * (typeof walkSnowK === 'function' ? walkSnowK() : 1);   // empty 100%, crates 95%, pipes 92%, a loaded trolley 90%, snow a further -10%
  if (owner.lock > 0) owner.lock -= dt;
  if (k > 0 && !(owner.lock > 0)) { const n = Math.max(1, Math.ceil(sp * dt / .07)); for (let i = 0; i < n; i++) { o.position.x += dx * sp * dt / n; o.position.z += dz * sp * dt / n; collide(o.position); }   // short steps: never through a thin kerb or fence on a slow frame
    owner.face(dx, dz, dt); S.moved = true; owner.stepTo = null; owner.autoPath = null; owner.inputAt = T; }
  else if (!owner.stepTo && owner.autoPath && owner.autoPath.length && !(owner.lock > 0)) owner.stepTo = owner.autoPath.shift();   // a route: the next point of it
  if (!(k > 0) && owner.stepTo && !(owner.lock > 0)) { const ddx = owner.stepTo[0] - o.position.x, ddz = owner.stepTo[1] - o.position.z, d = Math.hypot(ddx, ddz);   // stepping out of the car and clear of it
    if (d < .05) owner.stepTo = null; else { const st = Math.min(d, (owner.autoPath ? 2.6 : 1.6) * dt); o.position.x += ddx / d * st; o.position.z += ddz / d * st; collide(o.position); owner.face(ddx, ddz, dt); owner.play('walk'); } }
  target = ownerTarget();
  if (!target || target.key !== dwell.key) dwell = { key:target && target.key, t:0 }; else dwell.t += dt;
  if (target && target.type === 'staff' && target.c.st.id > 0 && dwell.t > .45 && !dwell.done) { dwell.done = true; inspectStaff(target.c); }
  if (target && target.type === 'fault' && !target.f.diag && dwell.t > .9) diagnose(target.f, owner);
  // the owner's own hands: goods on and off his back, a machine nobody runs, a fault nobody is fixing yet
  ownerHands(dt);
  const handFix = ownerStill() && S.faults.find(f => near(o, WHERE[f.where].spot(), .6) && !(f.by && staffObj.has(f.by) && staffObj.get(f.by).state === 'fixing') && !f.contractor);
  if (handFix) { if (!handFix.diag) diagnose(handFix, owner);
    if (needsPart(handFix) && handFix.part === undefined) { handFix.part = S.parts > 0; if (handFix.part) { S.parts--; syncParts(); } }
    handFix.prog += dt * .5 / FAULTS[handFix.kind].time * (needsPart(handFix) && handFix.part === false ? .35 : 1); handFix.workT = T;
    if (Math.random() < dt * 2.5) sfx('clank', .4);
    if (handFix.prog >= 1 && FAULTS[handFix.kind].svc) svcDone(handFix, owner); else if (handFix.prog >= 1) { clearFault(handFix, owner); toast(handFix.guided ? 'Fixed by hand. A mechanic does that twice as fast: hire one in the office.' : 'Fixed it yourself.', 'good'); } }
  const working = owner.working && T - owner.working < .2;
  if (owner.lock > 0) {} else if (k > 0) owner.play(owner.stack.length || owner.cart ? 'carry' : 'walk', (.6 + k * .65) * (1 + .12 * S.up.boots));
  else if (working) { owner.play('work'); if (owner.workAt) owner.faceTo(owner.workAt, dt); }
  else if (handFix) { owner.play(FAULTS[handFix.kind].anim); owner.faceTo(jobFace(handFix), dt); }
  else if (owner.stack.length) owner.play('carry', 0);
  else if (target) { owner.play('inspect'); const p = target.type === 'staff' ? [target.c.o.position.x, target.c.o.position.z] : target.type === 'fault' ? [WHERE[target.f.where].mark[0], WHERE[target.f.where].mark[2]] : MACHINES.find(m => m.id === target.id).at(); owner.faceTo(p, dt); }
  else owner.play('idle');
  // people of the valley and land for sale: walk up to them
  if (!cardOpen && S.letter) {
    for (const [id, c] of folk) if (!S.met[id] && near(o, c.home, 1.3)) meet(id);
    let atPlot = null; for (const id of Object.keys(PLOTS)) if (S.tutDone && plotSt(id) === 0 && S.level >= PLOTS[id].lv && near(o, PLOTS[id].ring, .6)) atPlot = id;
    if (atPlot && atPlot !== owner.atPlot) openDeal(atPlot); owner.atPlot = atPlot;
  }
  // office desk
  const atDesk = near(o, P.deskRing, .6), billFirst = S.level >= 5 && S.l5.bill && (!S.l5.paid || S.l5.bill.late || S.l5.bill.due - S.time < 60 || !S.call);
  if (atDesk && !inDesk) openOffice(billFirst ? 'finance' : S.call ? 'orders' : undefined); inDesk = atDesk;
  ownerL5(dt);
  // sign the delivery note
  const dr = M.rings.drop; dr.g.visible = truck.state === 'docked';
  if (S.order && S.order.ready && near(o, P.drop, .75)) { signT += dt; dr.prog.visible = true; setArc(dr, signT / 1.0); if (signT >= 1.0) { signT = 0; signOrder(owner); } }
  else { signT = Math.max(0, signT - dt * 2); dr.prog.visible = signT > 0; setArc(dr, signT); }
  actT -= dt; if (actT > 0) return;
  // cash
  if (near(o, P.cash, .85) && S.cashPile > 0) {   // build 0.21g: step on the circle and take the lot, every bundle at once
    const amt = S.cashPile; S.cashPile = 0; S.cash += amt; S.earned += amt;
    pile.splice(0).forEach((b, i) => fly(b, o, new THREE.Vector3(0, 1.1, 0), .22 + i * .025, () => b.removeFromParent(), .35 + (i % 3) * .12));
    floatText(`+${fmt(amt)}`, o.position.x, 2.1, o.position.z); sfx('coin'); setTimeout(() => sfx('coin'), 110); setTimeout(() => sfx('coin'), 230); actT = .4; checkCharter(); return; }
  // pads
  for (const p of visiblePads()) { if (!near(o, p.at, .7) || S.cash <= 0) continue; const paid = S.padPaid[p.id] || 0, step = Math.max(1, Math.ceil(p.price / 30)), d = Math.min(step, p.price - paid, S.cash);
    S.cash -= d; S.padPaid[p.id] = paid + d; if (S.padPaid[p.id] >= p.price) { if (p.id === 'mill') startMillBuild(true); else if (p.id === 'wh') startWhBuild(true); else if (p.id === 'press') startPressBuild(true); else if (p.id === 'saw2') startSaw2Build(true); else if (p.id === 'mill2') startMill2Build(true); else { applyRestore(p.id, true); toast(`${p.label}: done.`, 'good'); save(); checkCharter(); } } else sfx('tick'); actT = .045; return; }
}
function setArc(r, f){ f = clamp(f, 0, 1); if (r.prog.userData.f === f) return; r.prog.userData.f = f; r.prog.geometry.dispose(); r.prog.geometry = new THREE.RingGeometry(r.r + .02, r.r + .14, 48, 1, Math.PI / 2, Math.max(.001, f * Math.PI * 2)); }
function visiblePads(){ return S.tutDone ? PADS.filter(p => !S.restored[p.id] && p.after(S) && !(p.id === 'mill' && S.lv2.mill > 0) && !(p.id === 'wh' && S.lv2.wh > 0) && !(p.id === 'press' && S.lv3.press > 0) && !(p.id === 'saw2' && S.lv4.saw2 > 0) && !(p.id === 'mill2' && S.l5.mill2 > 0)).sort((a, b) => (b.lv || 0) - (a.lv || 0)).slice(0, 3) : []; }
const padObjs = {};
function syncPads(){
  const vis = visiblePads().map(p => p.id);
  for (const p of PADS) {
    if (!padObjs[p.id] && vis.includes(p.id)) { const g = new THREE.Group(); g.position.set(p.at[0], .025, p.at[1]); world.add(g);
      const base = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map:padTex(p.icon), transparent:true, depthWrite:false })); base.rotation.x = -Math.PI / 2; g.add(base);
      const fg = new THREE.PlaneGeometry(1.06, 1.06); fg.translate(0, .53, 0);
      const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color:'#e8ab2c', transparent:true, opacity:.5, depthWrite:false })); fill.rotation.x = -Math.PI / 2; fill.position.set(0, .004, .53); g.add(fill);
      padObjs[p.id] = { g, fill }; }
    const o = padObjs[p.id]; if (!o) continue;
    if (S.restored[p.id]) { o.g.removeFromParent(); delete padObjs[p.id]; continue; }
    o.g.visible = vis.includes(p.id); o.fill.scale.y = p.price ? Math.max(.001, (S.padPaid[p.id] || 0) / p.price) : .001;
  }
}
// fault rings on the floor where someone has to stand
const faultRings = new Map();
function syncFaultRings(){
  for (const f of S.faults) if (!faultRings.has(f.id)) { const sp = WHERE[f.where].spot(); faultRings.set(f.id, M.ring('f' + f.id, sp[0], sp[1], FAULTS[f.kind].svc ? '#e8ab2c' : '#d2493a', .62)); }
  for (const [id, r] of faultRings) { const f = faultById(id); if (!f) { r.g.removeFromParent(); faultRings.delete(id); delete M.rings['f' + id]; continue; }
    const k = f.diag ? f.prog : (dwell.key === 'f' + id ? dwell.t / .9 : 0); r.prog.visible = k > 0; setArc(r, k); r.m.material.color.set(f.diag ? '#e8ab2c' : '#d2493a'); }
}

/* =====================================================================
   STAFF AI
   ===================================================================== */
function goTo(c, x, z){ c.path = findPath(c.o.position.x, c.o.position.z, x, z); c.goal = [x, z]; c.wd = null; }
function walk(c, dt){
  if (!c.path || !c.path.length) return true;
  if (c.path.cut && c.path.length === 1 && segBlocked(c.o.position.x, c.o.position.z, c.path[0][0], c.path[0][1], .05)) {   // no way through yet (a lorry in the bay, a stopped vehicle): wait here and ask again
    c.play('idle'); if (!(c.cutT > T)) { c.cutT = T + 2; const g = c.path[0]; c.path = findPath(c.o.position.x, c.o.position.z, g[0], g[1]); } return false; }
  const [tx, tz] = c.path[0], dx = tx - c.o.position.x, dz = tz - c.o.position.z, d = Math.hypot(dx, dz);
  const sp = 2.2 * crewSpeed(c) * (c.stack.length ? .92 * (c.st && c.st.role === 'loader' ? 1 + .1 * S.up.truck2 : 1) : 1), last = c.path.length === 1;
  // arrival tolerance grows with the step size: at a low frame rate one step (and one crowd push) can be
  // larger than a fixed 6 cm, and the walker would circle the spot for ever (build 0.7: Walt stuck at 8 cm
  // from the saw while the owner stood beside it). The last waypoint snaps so the work spot is exact.
  if (d < Math.max(.06, sp * dt * (last ? 1.6 : 1))) { if (last) c.o.position.set(tx, groundY(tx, tz), tz); c.path.shift(); c.wd = null; return !c.path.length; }
  // watchdog: no headway on this waypoint for 2.5 s (someone standing in the way, a crowd push) -> re-path,
  // and after two re-paths step over the gap. Counted in S.unstuck so the soak test can see it.
  const wd = c.wd && c.wd.wp === c.path[0] ? c.wd : (c.wd = { wp:c.path[0], best:d, t:0, n:c.wd ? c.wd.n : 0 });
  if (d < wd.best - .12) { wd.best = d; wd.t = 0; } else if ((wd.t += dt) > 2.5) {
    S.unstuck = (S.unstuck || 0) + 1; wd.n++; (S.unstuckLog || (S.unstuckLog = [])).push(`${c.st ? c.st.name : '?'}:${c.state} at ${c.o.position.x.toFixed(1)},${c.o.position.z.toFixed(1)} to ${tx.toFixed(1)},${tz.toFixed(1)}`); if (S.unstuckLog.length > 8) S.unstuckLog.shift();
    if (d < .3) { c.o.position.set(tx, groundY(tx, tz), tz); c.path.shift(); c.wd = null; return !c.path.length; }
    if (wd.n > 2 && !segBlocked(c.o.position.x, c.o.position.z, c.o.position.x + dx * .3 / d, c.o.position.z + dz * .3 / d, .02)) { const k = .3 / d; c.o.position.x += dx * k; c.o.position.z += dz * k; wd.best = d - .3; wd.t = 0; return false; }   // squeeze past a person, 30 cm at a time, never through a wall
    const g = c.goal || c.path[c.path.length - 1]; c.path = findPath(c.o.position.x, c.o.position.z, g[0], g[1]); c.wd = { wp:c.path[0], best:Infinity, t:0, n:wd.n }; return !c.path.length;
  }
  const s = Math.min(d, sp * dt);
  // nobody walks into a vehicle: a moving one (the forklift, a lorry, the flatbed, the car) is waited for; a stopped forklift
  // is walked round (it is waiting for somebody in front of it, so standing still would never end)
  const vw = vehInWay(c, c.o.position.x + dx / d * s, c.o.position.z + dz / d * s);
  if (vw === 'wait') { wd.t = 0; c.play('idle'); c.face(dx, dz, dt); return false; }
  if (vw && vw.round) { c.rnd = (c.rnd || 0) + dt; wd.t = 0;
    if (!(c.roundT > T)) { c.roundT = T + 1.5; const g = c.goal || c.path[c.path.length - 1]; COL.set('vehTmp', vw.round); c.path = findPath(c.o.position.x, c.o.position.z, g[0], g[1]); COL.delete('vehTmp'); c.wd = null; }
    else if (c.rnd > .8) { const e = stepAside(c, vw.m); if (e) { c.path.unshift(e); c.rnd = 0; } }   // no way round: step out of its way and let it pass
    c.play('idle'); c.face(dx, dz, dt); return false; }
  c.rnd = 0;
  c.o.position.x += dx / d * s; c.o.position.z += dz / d * s; c.face(dx, dz, dt);
  c.play(c.trolley || c.cart || (c.stack.length && c.carryType !== 'fuel') ? 'carry' : 'walk', crewSpeed(c)); return false;
}
// is (x, z) inside a vehicle's footprint (forward is the model's +X): half-lengths back/front and half-width, people's radius added
function inFoot(m, x, z, back, front, half){ const o = m.position, a = m.rotation.y, fx = Math.cos(a), fz = -Math.sin(a), px = x - o.x, pz = z - o.z;
  const along = px * fx + pz * fz, side = -px * fz + pz * fx; return along > -back && along < front && Math.abs(side) < half; }
// 1.4 m out to the side of a vehicle's line (the side the person is on, else the other, else back along it), clear of walls
function stepAside(c, m){
  const o = m.position, a = m.rotation.y, fx = Math.cos(a), fz = -Math.sin(a), nx = -fz, nz = fx, p = c.o.position, side = (p.x - o.x) * nx + (p.z - o.z) * nz, sg = side >= 0 ? 1 : -1;
  for (const [ux, uz] of [[nx * sg, nz * sg], [-nx * sg, -nz * sg], [(nx * sg - fx) * .7, (nz * sg - fz) * .7], [(-nx * sg - fx) * .7, (-nz * sg - fz) * .7]]) {
    const e = [p.x + ux * 1.8, p.z + uz * 1.8]; if (!segBlocked(p.x, p.z, e[0], e[1], .15)) return e; }
  return null;
}
// the box round a vehicle's footprint (axis-aligned), for walking round it while it stands
function footBox(m, len, half, pad){ const o = m.position, a = m.rotation.y, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), hx = len * c + half * s + pad, hz = len * s + half * c + pad; return [o.x - hx, o.z - hz, o.x + hx, o.z + hz]; }
// a vehicle that is driving is waited for; one standing (parked at work, or stopped for somebody in front of it) is walked round
function vehInWay(c, x, z){
  if (c.seated || (c === owner && trip)) return null;
  const cur = [c.o.position.x, c.o.position.z], fresh = V => !(V.yieldT > T - .25);
  const list = [];
  if (typeof fork !== 'undefined' && fork.o && fork.state !== 'park') { const drv = /^to/.test(fork.state) && !fork.blockBy; list.push(drv ? [fork.o, true, 1.6, 1.9, 1.0, 1.3, .6] : [fork.o, false, 1.3, 1.5, .62, 1.3, .6]); }   // moving: a margin round it; standing: its own outline
  list.push([M.truck, ['arrive', 'leave'].includes(truck.state) && fresh(truck), 3.5, 3.5, 1.65, 3.3, 1.2], [M.flat, ['arrive', 'leave'].includes(sup.state) && fresh(sup), 3.5, 3.5, 1.65, 3.3, 1.2],
    [M.car, !!trip && ['out', 'back', 'park'].includes(trip.phase) && fresh(CAR), 2.2, 2.2, 1.05, 2.0, .9]);
  for (const [m, driving, back, front, half, len, wid] of list) {
    if (!m || !m.visible || !inFoot(m, x, z, back, front, half)) continue;
    if (inFoot(m, ...cur, back, front, half)) {   // already inside its margin (it set off beside them): only a step out of its way is taken
      if (!driving) continue; const a = m.rotation.y, fx = Math.cos(a), fz = -Math.sin(a), sd = (px, pz) => Math.abs(-(px - m.position.x) * fz + (pz - m.position.z) * fx);
      if (sd(x, z) >= sd(...cur) - 1e-4) continue; return 'wait'; }
    if (driving) return 'wait';
    if (Math.hypot(x - m.position.x, z - m.position.z) > Math.hypot(cur[0] - m.position.x, cur[1] - m.position.z)) continue;   // stepping away from it
    if (m === fork.o || ['arrive', 'leave'].includes(m === M.truck ? truck.state : m === M.flat ? sup.state : '') || (m === M.car && trip)) return { round:footBox(m, len, wid, .3), m };
  }
  return null;
}
function seatFree(c){ for (let i = 0; i < P.seats.length; i++) { const taken = [...staffObj.values()].some(o => o !== c && o.seat === i); if (!taken) return i; } return -1; }
function breakDue(c){ return false &&  c.st.energy <= 0 && c.state !== 'break' && c.state !== 'toBreak'; }
function startBreak(c){ const jf = c.job && faultById(c.job); if (jf) jf.by = null; c.seat = seatFree(c); const s = c.seat >= 0 ? P.seats[c.seat] : [P.seats[1][0], P.seats[1][1] + .6]; goTo(c, s[0], s[1] - .05); c.state = 'toBreak'; c.job = null; }
function updateBreak(c, dt){
  if (c.state === 'toBreak') { if (walk(c, dt)) { c.state = 'break'; c.faceNow(Math.PI); if (c.seat >= 0) c.o.position.set(P.seats[c.seat][0], 0, P.seats[c.seat][1] - .05); } return true; }
  if (c.state === 'break') { c.play(c.seat >= 0 ? 'sit' : 'idle'); const fast = S.restored.coffee && circuitOn('office');
    c.st.energy = Math.min(100, c.st.energy + dt * (100 / (fast ? 6 : 12))); c.st.focus = 100;
    if (c.st.energy >= 100) { c.state = 'idle'; c.seat = undefined; } return true; }
  return false;
}
// slacking: operators and loaders lose focus over time; the owner or a supervisor nearby brings it back
function slacking(c, dt){
  if (c.state !== 'slack') return false;
  c.play('phone'); c.face(Math.sin(c.st.id) * .4, 1, dt * 2); c.slackT -= dt; if (c.slackT <= 0) endSlack(c, 45); return true;
}
function maybeSlack(c, dt){
  if (S.level < 4 || !S.tutDone || c.stack.length || c.trolley || c.zone) return false;   // Level Bible: slacking arrives with the supervisor at level 4
  if (c.st.focus < 25 && Math.random() < dt / 3) { c.state = 'slack'; c.slackT = rand(9, 13); c.path = null; c.task = null; S.slackSeen = true; return true; }
  return false;
}
function endSlack(c, focus){ c.st.focus = focus; c.state = 'idle'; }
function updateFocus(c, dt){
  const sup = supervisor();
  c.zone = zoneCentres().some(zc => dist2(c.o, zc) < zoneR());
  if (c.zone) { c.st.focus = 100; if (c.state === 'slack') endSlack(c, 100); return; }
  if (S.level < 4) { c.st.focus = 100; return; }
  if (S.tutDone && c.state !== 'break' && c.state !== 'toBreak' && c.state !== 'slack') c.st.focus = Math.max(0, (c.st.focus ?? 100) - dt * (100 / 90) * (1 + (100 - c.st.energy) / 200) * (c.st.role === 'operator' ? PG.cut(.15, S.up.ppe) : 1) * needsDrain(c));
}
// operators: one per machine. The saw and the pipe mill share the same routine through this table.
const OPS = {
  saw:  { spot:() => P.op, center:() => P.saw, fix:() => P.sawFix, cond:'saw', name:'Saw', running:c => sawOn && sawBy === c, on:() => sawOn, phase:() => sawT,
          hasWork:() => (orderLeft() > 0 || stockLeftC() > 0) && S.feed > 0 },
  pipe: { spot:() => P.pop, center:() => P.pmill, fix:() => P.pfix, cond:'pipe', name:'Mill', running:c => pipeOn && pipeBy === c, on:() => pipeOn, phase:() => pipeT,
          hasWork:() => (pipeLeft() > 0 || stockLeftP() > 0) && (S.coilLeft > 0 || S.coilFeed > 0) },
  tool: { spot:() => P.top, center:() => P.tpress, fix:() => P.tfix, cond:'tool', name:'Press', running:c => toolOn && toolBy === c, on:() => toolOn, phase:() => toolT,
          hasWork:() => toolWork() && (S.tcoil > 0 || S.tfeed > 0) },
  pipe2:{ spot:() => P.pop2, center:() => P.mill2, fix:() => P.mill2Fix, cond:'pipe', name:'Mill', running:c => mill2On && mill2By === c, on:() => mill2On, phase:() => mill2T,
          hasWork:() => S.l5.rack2 < RACK2_CAP && (S.l5.coilLeft2 > 0 || S.l5.coil2 > 0) },
  saw2: { spot:() => P.op2, center:() => P.saw2, fix:() => P.saw2Fix, cond:'saw', name:'Saw', running:c => saw2On && saw2By === c, on:() => saw2On, phase:() => saw2T,
          hasWork:() => (orderLeft() > 0 || stockLeftC() > 0) && S.lv4.feed2 > 0 },
};
const opsOf = c => OPS[c.st.mach === 'pipe' ? 'pipe' : c.st.mach === 'tool' ? 'tool' : c.st.mach === 'saw2' ? 'saw2' : c.st.mach === 'pipe2' ? 'pipe2' : 'saw'];
function updateOperator(c, dt){
  updateFocus(c, dt);
  if (updateBreak(c, dt)) return;
  if (c.state === 'arrive') { if (walk(c, dt)) c.state = 'idle'; return; }
  const m = opsOf(c);
  // a pipe-mill operator hired before the mill is finished waits beside the bay
  if (m === OPS.tool && !pressReady()) { if (c.state !== 'bay') { goTo(c, 17.6, .3); c.state = 'bay'; } if (walk(c, dt)) { c.play('idle'); c.faceTo([18.0, -3], dt); } return; }
  if (m === OPS.pipe2 && !mill2Ready()) { if (c.state !== 'bay') { goTo(c, 13.3, 15.9); c.state = 'bay'; } if (walk(c, dt)) { c.play('idle'); c.faceTo(P.mill2, dt); } return; }
  if (m === OPS.pipe && !millReady()) { if (c.state !== 'bay') { goTo(c, 12.9, 5.0); c.state = 'bay'; } if (walk(c, dt)) { c.play('idle'); c.faceTo(P.pmill, dt); } return; }
  if (slacking(c, dt)) return;
  if (breakDue(c) && (!m.on() || m.phase() < .15)) { startBreak(c); return; }
  if (c.state === 'toClean') { if (walk(c, dt)) { c.state = 'cleaning'; c.wait = 5; } return; }
  if (c.state === 'cleaning') { const ctr = m.center(); c.faceTo(ctr, dt); c.play('fix'); c.wait -= dt; if (Math.random() < dt * 3) puff(ctr[0] + rand(-.4, .4), ctr[1] + .3, '#c9b48a');
    if (c.wait <= 0 || m.hasWork()) { S.cond[m.cond] = Math.min(100, S.cond[m.cond] + 20); floatText(`${m.name} cleaned`, ctr[0], 1.6, ctr[1], 'info'); giveXp(c.st, 6); c.state = 'idle'; } return; }
  if (c.state !== 'work' && c.state !== 'toWork') { goTo(c, ...m.spot()); c.state = 'toWork'; }
  if (c.state === 'toWork') { if (walk(c, dt)) { c.state = 'work'; c.faceNow(Math.PI); } return; }
  const sp = m.spot(); c.o.position.set(sp[0], 0, sp[1]); c.faceNow(Math.PI);
  if (maybeSlack(c, dt)) return;
  c.busy = m.running(c) ? .8 : Math.max(0, (c.busy || 0) - dt);
  c.play(c.busy > 0 ? 'work' : 'idle', c.busy > 0 ? crewSpeed(c) : 1);
}
function loaderTask(c){
  if (c.st.role === 'helper') { const mach = helperOf(c);   // v2.0 12.6: one helper per machine, keeping its in-feed full
    if (mach === 'mill') return S.coilFeed + coilsFor('mill') < 2 && S.coils > 0 ? 'coils' : 'helperWait';
    if (mach === 'press') return S.tfeed + coilsFor('press') < 2 && S.coils > 0 ? 'coilsPress' : 'helperWait';
    if (mach === 'mill2') return S.l5.coil2 + coilsFor('mill2') < 2 && S.coils > 0 ? 'coils2' : 'helperWait';
    if (S.feed < 6 && S.timber > 0) return 'planks'; if (S.timber <= 5 && S.store > 0 && !trolleyBy) return 'restock';
    if (S.up.autofeed >= 1 && millReady() && !coilHelper('mill') && S.coilFeed + coilsFor('mill') < 2 && S.coils > 0 && S.feed >= 4) return 'coils';   // auto-feed: one helper keeps two neighbouring machines fed
    return 'helperWait'; }
  const others = staffOf('loader').filter(o => o !== c).map(o => o.task);
  if (c.forced) { const f = c.forced; c.forced = null;
    if (f === 'restock' && S.store > 0 && !trolleyBy && S.timber < LINE_CAP) return 'restock';
    if (f === 'planks' && S.timber > 0 && S.feed < 6) return 'planks';
    if (f === 'sweep') return 'sweep';
    if (f === 'coils' && S.coils > 0 && millReady()) return 'coils';
    if (f === 'coilsPress' && S.coils > 0 && pressReady()) return 'coilsPress'; }
  if (S.power.fuel < 40 && !others.some(t => t === 'fuel' || t === 'deliverFuel')) return 'fuel';
  const rem1 = S.order ? S.order.deadline - S.order.time : 1e9, rem2 = S.order2 ? S.order2.deadline - S.order2.time : 1e9;   // goods go to the order due first
  if (rem2 < rem1 && S.level >= 5 && mill2Ready() && truckB.state === 'docked' && S.order2 && !S.order2.ready && need2('p') - pipes2Out() > 0 && S.l5.rack2 > 0 && others.filter(t => t === 'pipes2').length < 2) return 'pipes2';
  if (truck.state === 'docked' && S.pallet > 0 && S.order && !S.order.ready && S.bed + truckCrates() < S.order.qty) return 'crates';
  if (truck.state === 'docked' && S.pipes > 0 && S.order && !S.order.ready && S.pbed + truckPipes() < (S.order.pq || 0) && !others.includes('pipes')) return 'pipes';
  if (truck.state === 'docked' && S.tools > 0 && S.order && !S.order.ready && S.tbed + truckTools() < (S.order.tq || 0) && !others.includes('tools')) return 'tools';
  // Level 5: dock 2's pipes go up its ramp by hand from the second mill's rack (v2.0, Ada's corner plot)
  if (S.level >= 5 && mill2Ready() && truckB.state === 'docked' && S.order2 && !S.order2.ready && need2('p') - pipes2Out() > 0 && S.l5.rack2 > 0 && others.filter(t => t === 'pipes2').length < 2) return 'pipes2';
  // the line cannot cover the truck: ship from the warehouse
  if (whReady() && truck.state === 'docked' && S.order && !S.order.ready) {
    if (S.wh.c > 0 && S.bed + truckCrates() + S.pallet < S.order.qty && !(fork.o && forkDriver() && S.level >= 4)) return 'whCrates';   // from Level 4 the forklift does this by the pallet
    if (S.wh.p > 0 && S.pbed + truckPipes() + S.pipes < (S.order.pq || 0)) return 'whPipes';
    if (S.wh.t > 0 && S.tbed + truckTools() + S.tools < (S.order.tq || 0)) return 'whTools'; }
  if (millReady() && !coilHelper('mill') && S.coilFeed + coilsFor('mill') < 2 && S.coils > 0 && !others.includes('coils') && (pipeLeft() > 0 || stockLeftP() > 0 || S.coilFeed === 0)) return 'coils';
  if (pressReady() && !coilHelper('press') && S.tfeed + coilsFor('press') < 2 && S.coils > 0 && !others.includes('coilsPress') && (toolWork() || S.tfeed === 0)) return 'coilsPress';
  if (S.level >= 5 && mill2Ready() && !coilHelper('mill2') && S.l5.coil2 + coilsFor('mill2') < 2 && S.coils > 0 && !others.includes('coils2') && (S.l5.rack2 < RACK2_CAP || S.l5.coil2 === 0)) return 'coils2';
  if (!helperOn() && S.feed < 2 && S.timber > 0 && !others.includes('planks')) return 'planks';
  if (goodsIn() > 0 && (S.delivery.kind === 'steel' ? S.coils + coilsInHands() < coilCap() : S.store + carriedTimber() < storeCap()) && others.filter(t => t === 'unload' || t === 'deliverTimber' || t === 'deliverCoilBay').length < 2) return 'unload';
  if (whReady()) {  // clear the pallet and the pipe rack of stock so the machines never wait for space
    if (surplusC() > 0 && S.wh.c + whBound('crate') < whCapC() && (S.pallet >= palletCap() - 2 || !others.includes('stockC'))) return 'stockC';
    if (surplusP() > 0 && S.wh.p + whBound('pipe') < whCapP() && !others.includes('stockP')) return 'stockP';
    if (surplusT() > 0 && S.wh.t + whBound('toolbox') < whCapT() && !others.includes('stockT')) return 'stockT'; }
  if (!helperOn() && S.timber <= 5 && S.store > 0 && !trolleyBy && !others.includes('restock')) return 'restock';
  if (!helperOn() && S.feed < 4 && S.timber > 0 && !(others.includes('planks') && S.feed >= 2)) return 'planks';
  if (!hasRole('cleaner') && facilityJob(c, true)) return 'facility';
  if ((S.pallet > 0 || S.pipes > 0 || S.tools > 0) && truck.state !== 'docked' && !whReady()) return 'waitDock';
  return 'idle';
}
let trolleyBy = null;
// the trolley's claim lasts only while its man is on the trolley job: lunch, knocking-off, the pay queue, training or a
// forced job release it, the planks on it go back on the stock-room count and the trolley is parked (or the line starves)
const TROLLEY_ST = ['toTrolley', 'toLoadT', 'loadT', 'pushT', 'unloadT', 'returnT'];
function trolleyWatch(){ if (trolleyBy == null) return; const c = staffObj.get(trolleyBy); if (c && TROLLEY_ST.includes(c.state)) return;
  if (c && c.tplanks && c.tplanks.length) { S.store += c.tplanks.length; c.tplanks.forEach(m => m.removeFromParent()); c.tplanks = []; syncStore(); }
  if (c && c.trolley && M.trolley) { fly(M.trolley, world, new THREE.Vector3(P.trolleyPark[0], 0, P.trolleyPark[1]), .3, () => M.trolley.rotation.set(0, Math.PI, 0), 0); c.trolley = null; }
  trolleyBy = null; }
const SWEEP = P.sweep;
function makeBroom(){ const g = new THREE.Group(), h = new THREE.Mesh(CY(.018, 1.15, 6), std('#a8794a')), head = new THREE.Mesh(BX(.36, .07, .1), std('#2c2f33'));
  h.position.set(0, .55, .45); h.rotation.x = .5; head.position.set(0, .04, .72); g.add(h, head); g.position.x = -.12; return g; }
function carriedTimber(){ let n = 0; for (const o of staffObj.values()) if (o.carryType === 'timber') n += o.stack.length; return n; }
function timberInHands(){ let n = 0; for (const o of staffObj.values()) { if (o.carryType === 'timber' || o.carryType === 'plank') n += o.stack.length; if (o.tplanks) n += o.tplanks.length; } return n; }
function countCrates(){ let n = 0; for (const o of carriers()) if (o.carryType === 'crate' && truckBound(o)) n += o.stack.length; return n; }
// carried towards the truck (not to the warehouse), and carried to the warehouse
// with loaders on the payroll the owner's arms do not count as on their way to the truck (the loaders bring the order)
const truckBound = o => o !== owner || !loadersHired();
const truckCrates = () => { let n = 0; for (const o of carriers()) if (o.carryType === 'crate' && o.dest !== 'wh' && truckBound(o)) n += o.stack.length; return n; };
const truckPipes = () => { let n = 0; for (const o of carriers()) if (o.carryType === 'pipe' && o.dest !== 'wh' && truckBound(o)) n += o.stack.length; return n; };
const truckTools = () => { let n = 0; for (const o of carriers()) if (o.carryType === 'toolbox' && o.dest !== 'wh' && truckBound(o)) n += o.stack.length; return n; };
const whBound = t => { let n = 0; for (const o of carriers()) if (o.carryType === t && o.dest === 'wh') n += o.stack.length; return n; };
// what the pallet and pipe rack hold beyond what the truck still needs from them: that is warehouse stock
const surplusC = () => S.pallet - Math.max(0, needCrates() - truckCrates());
const surplusP = () => S.pipes - Math.max(0, needPipes() - truckPipes());
const surplusT = () => S.tools - Math.max(0, needTools() - truckTools());
function updateLoader(c, dt){
  updateFocus(c, dt);
  if (updateBreak(c, dt)) return;
  if (c.state === 'arrive') { if (walk(c, dt)) c.state = 'idle'; return; }
  if (slacking(c, dt)) return;
  if (cleanTask(c, dt)) return;
  const cap = (S.level === 1 ? 4 : 2) + Math.floor((c.st.lv - 1) / 2) + S.up.back, ccap = c.cart ? cap : Math.min(cap, HAND_CRATES);   // crates: two by hand
  c.wait = Math.max(0, (c.wait || 0) - dt * multiK());
  if (c.state === 'idle' || c.state === 'waiting') {
    if (breakDue(c)) { startBreak(c); return; }
    if (maybeSlack(c, dt)) return;
    if (!c.stack.length) c.dest = null;
    const task = c.stack.length ? (c.dest === 'wh' ? 'deliverWh' : c.carryType === 'plank' ? (S.feed + c.stack.length > 6 && S.timber + c.stack.length <= LINE_CAP ? 'returnPlanks' : 'deliverPlanks') : c.carryType === 'timber' ? 'deliverTimber' : c.carryType === 'coil' ? (c.coilDest === 'bay' ? 'deliverCoilBay' : c.coilDest === 'press' ? 'deliverCoilPress' : c.coilDest === 'mill2' ? 'deliverCoilMill2' : 'deliverCoilMill') : c.carryType === 'fuel' ? 'deliverFuel' : 'deliverCrates') : loaderTask(c); c.task = task;
    // a crate run of more than two: fetch a trolley from the bay first; an empty trolley goes back before any other job
    const crateRun = ['crates', 'stockC', 'whCrates'].includes(task) && cap >= CART_FROM;
    if (!c.stack.length && !c.cart && !c.cartFor && crateRun) { const k = freeCart(); if (k) { k.by = c; c.cartFor = k; goTo(c, ...cartSpot(k.slot)); c.state = 'toCart'; return; } }
    if (!c.stack.length && c.cart && !crateRun) { cartBack(c); c.state = 'toCartBack'; return; }
    if (task === 'fuel') { goTo(c, ...P.pump); c.state = 'toPump'; }
    else if (task === 'crates') { goTo(c, P.pallet[0] + .55, P.pallet[1] + .5); c.state = 'toPallet'; }
    else if (task === 'planks') { goTo(c, P.timberRing[0], P.timberRing[1]); c.state = 'toRack'; }
    else if (task === 'deliverPlanks') { goTo(c, P.feedRing[0] + .2, P.feedRing[1]); c.state = 'toFeed'; }
    else if (task === 'returnPlanks') { goTo(c, P.timberRing[0], P.timberRing[1]); c.state = 'toRackBack'; }  // the in-feed filled up while he carried: put them back
    else if (task === 'deliverCrates') { goTo(c, P.drop[0] - .3, P.drop[1] + .35); c.state = 'toTruck'; }
    else if (task === 'facility') { startFacilityJob(c, facilityJob(c, true)); }
    else if (task === 'pipes') { goTo(c, ...P.prackSpot); c.state = 'toPRack'; }
    else if (task === 'pipes2') { goTo(c, ...P.rack2Spot); c.state = 'toRack2'; }
    else if (task === 'stockC') { goTo(c, P.pallet[0] + .55, P.pallet[1] + .5); c.state = 'toPalletWh'; }
    else if (task === 'stockP') { goTo(c, ...P.prackSpot); c.state = 'toPRackWh'; }
    else if (task === 'stockT') { goTo(c, ...P.trackSpot); c.state = 'toTRackWh'; }
    else if (task === 'deliverWh') { goTo(c, ...(c.carryType === 'pipe' ? P.whSpotP : c.carryType === 'toolbox' ? P.whSpotT : P.whSpotC)); c.state = 'toWh'; }
    else if (task === 'whCrates' || task === 'whPipes' || task === 'whTools') { c.whType = task === 'whPipes' ? 'pipe' : task === 'whTools' ? 'toolbox' : 'crate'; goTo(c, ...(c.whType === 'pipe' ? P.whSpotP : c.whType === 'toolbox' ? P.whSpotT : P.whSpotC)); c.state = 'toWhTake'; }
    else if (task === 'coils' || task === 'coilsPress' || task === 'coils2') { c.coilFor = task === 'coilsPress' ? 'press' : task === 'coils2' ? 'mill2' : 'mill'; goTo(c, ...P.coilSpot); c.state = 'toCoilBay'; }
    else if (task === 'deliverCoilMill2') { goTo(c, ...P.coil2Ring); c.state = 'toPFeed2'; }
    else if (task === 'deliverCoilPress') { goTo(c, ...P.tfeedRing); c.state = 'toTFeed'; }
    else if (task === 'tools') { goTo(c, ...P.trackSpot); c.state = 'toTRack'; }
    else if (task === 'deliverCoilMill') { goTo(c, ...P.pfeedRing); c.state = 'toPFeed'; }
    else if (task === 'deliverCoilBay') { goTo(c, ...P.coilSpot); c.state = 'toCoilDrop'; }
    else if (task === 'deliverFuel') { goTo(c, ...P.filler); c.state = 'toFiller'; }
    else if (task === 'unload') { goTo(c, ...P.unload); c.state = 'toUnload'; }
    else if (task === 'deliverTimber') { goTo(c, ...P.storeSpot); c.state = 'toStore'; }
    else if (task === 'sweep') { c.sweep = 3; c.state = 'toSweep'; const sp = pick(SWEEP); goTo(c, ...sp); }
    else if (task === 'restock') { trolleyBy = c.st.id; goTo(c, P.trolleyPark[0] + .95, P.trolleyPark[1]); c.state = 'toTrolley'; }
    else { if (c.state !== 'waiting') { const w = task === 'helperWait' ? helperWaitAt(c) : task === 'waitDock' ? P.dockWait : [P.loaderWait[0] + (c.st.id % 2) * .7, P.loaderWait[1]]; goTo(c, ...w); c.state = 'waiting'; } if (walk(c, dt)) c.play('idle'); }
    return;
  }
  if (c.state === 'toCart') { if (walk(c, dt)) { c.faceNow(0); if (c.cartFor) takeCart(c, c.cartFor); c.cartFor = null; c.state = 'idle'; } return; }
  if (c.state === 'toCartBack') { if (walk(c, dt) && cartArrive(c)) c.state = 'idle'; return; }
  if (c.state === 'toPump') { if (walk(c, dt)) { c.state = 'fill'; c.wait = 1.4; } return; }
  if (c.state === 'toSweep') { if (walk(c, dt)) { c.state = 'sweeping'; c.wait = 2.6; if (!c.broom) { c.broom = makeBroom(); c.o.add(c.broom); } } return; }
  if (c.state === 'sweeping') { c.play('work', .7); c.broom.rotation.y = Math.sin(T * 6) * .35; c.wait -= dt; if (Math.random() < dt * 4) puff(c.o.position.x + rand(-.3, .3), c.o.position.z + .5, '#c9c2b4');
    if (c.wait <= 0) { c.sweep--; if (c.sweep > 0) { goTo(c, ...pick(SWEEP)); c.state = 'toSweep'; } else { c.broom.removeFromParent(); c.broom = null; c.state = 'idle'; c.task = null; giveXp(c.st, 4); } } return; }
  // level 2: steel coils (apron bay -> beside the mill) and finished pipes (rack -> truck)
  if (c.state === 'toCoilBay') { if (walk(c, dt)) c.state = 'takeCoil'; return; }
  if (c.state === 'takeCoil') { c.faceTo(P.coilBay, dt); c.play('idle'); if (c.wait > 0) return;
    if (c.stack.length || S.coils <= 0) { c.state = 'idle'; return; } if (takeFrom('bay', c, 'coil')) { S.coils--; c.coilDest = c.coilFor || 'mill'; c.wait = .4; sfxAt('pick', c.o.position.x, c.o.position.z, .6); syncCoilBay(); } else { syncCoilBay(); c.wait = .3; } return; }   // count and coils out of step: lay the bay out again
  if (c.state === 'toPFeed') { if (walk(c, dt)) c.state = 'dropPFeed'; return; }
  if (c.state === 'dropPFeed') { c.faceTo(P.pfeed, dt); c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length) { c.state = 'idle'; c.task = null; return; }
    if (S.coilFeed >= 2) { c.wait = .6; return; } if (giveTo(c, 'feed', world, coilFeedPos, () => syncCoilFeed())) { S.coilFeed++; giveXp(c.st, 6); c.wait = .3; c.st.energy = Math.max(0, c.st.energy - 3); c.coilDest = null; } return; }
  if (c.state === 'toPFeed2') { if (walk(c, dt)) c.state = 'dropPFeed2'; return; }
  if (c.state === 'dropPFeed2') { c.faceTo(P.coil2, dt); c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length) { c.state = 'idle'; c.task = null; return; }
    if (S.l5.coil2 >= 2) { c.wait = .6; return; } if (giveTo(c, 'feed2', world, coil2Pos, () => syncCoil2())) { S.l5.coil2++; giveXp(c.st, 6); c.wait = .3; c.st.energy = Math.max(0, c.st.energy - 3); c.coilDest = null; } return; }
  if (c.state === 'toTFeed') { if (walk(c, dt)) c.state = 'dropTFeed'; return; }
  if (c.state === 'dropTFeed') { c.faceTo(P.tfeed, dt); c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length) { c.state = 'idle'; c.task = null; return; }
    if (S.tfeed >= 2) { c.wait = .6; return; } if (giveTo(c, 'tfeed', world, tfeedPos, () => syncTFeed())) { S.tfeed++; giveXp(c.st, 6); c.wait = .3; c.st.energy = Math.max(0, c.st.energy - 3); c.coilDest = null; } return; }
  // level 3: tool boxes from the rack by the press to the truck
  if (c.state === 'toTRack') { if (walk(c, dt)) c.state = 'takeTools'; return; }
  if (c.state === 'takeTools') { c.faceTo(P.track, dt); c.play('idle'); if (c.wait > 0) return; const need = S.order && !S.order.ready ? (S.order.tq || 0) - S.tbed - truckTools() : 0;
    if (c.stack.length >= cap + 1 || S.tools === 0 || need <= 0 || (c.stack.length && c.carryType !== 'toolbox')) { c.state = 'idle'; return; } if (takeFrom('rack', c, 'toolbox')) { S.tools--; syncTools(); c.wait = .25; } return; }
  if (c.state === 'returnTools') { if (!walk(c, dt)) return; while (c.stack.length && giveTo(c, 'rack', world, toolRackPos, () => syncTools())) S.tools++; c.state = 'idle'; return; }
  if (c.state === 'toCoilDrop') { if (walk(c, dt)) c.state = 'dropCoil'; return; }
  if (c.state === 'dropCoil') { c.faceTo(P.coilBay, dt); c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length || S.coils >= coilCap()) { c.state = 'idle'; return; }
    if (giveTo(c, 'bay', world, coilBayPos, () => syncCoilBay())) { S.coils++; giveXp(c.st, 4); c.wait = .3; c.coilDest = null; } return; }
  if (c.state === 'toPRack') { if (walk(c, dt)) c.state = 'takePipes'; return; }
  // dock 2 (Level 5): rack 2 -> up dock 2's ramp -> over the white lorry's side boards
  if (c.state === 'toRack2') { if (walk(c, dt)) c.state = 'takeRack2'; return; }
  if (c.state === 'takeRack2') { c.faceTo(P.rack2, dt); c.play('idle'); if (c.wait > 0) return; const need = need2('p') - pipes2Out(c);
    if (c.stack.length >= cap || S.l5.rack2 === 0 || need <= 0) { if (c.stack.length) { goTo(c, ...P.drop2); c.state = 'toTruck2'; } else c.state = 'idle'; return; }
    if (takeFrom('rack2', c, 'pipe')) { S.l5.rack2--; syncRack2(); c.wait = .3; } return; }
  if (c.state === 'toTruck2') { if (walk(c, dt)) c.state = 'dropTruck2'; return; }
  if (c.state === 'dropTruck2') { c.faceTo(P.truck2, dt); c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length) { c.state = 'idle'; return; }
    const o2 = S.order2; if (truckB.state !== 'docked' || !o2 || o2.ready || o2.l.p >= (o2.pq || 0)) { goTo(c, ...P.rack2Spot); c.state = 'returnPipes2'; return; }
    if (giveTo(c, 'bed2', M.truck2, pipeBedPos, () => syncBed2())) { o2.l.p++; S.pshipped++; sfxAt('drop', c.o.position.x, c.o.position.z); giveXp(c.st, 5); checkLoaded2(); c.wait = .3; } return; }
  if (c.state === 'returnPipes2') { if (!walk(c, dt)) return; while (c.stack.length && giveTo(c, 'rack2', world, rack2Pos, () => syncRack2())) S.l5.rack2++; c.state = 'idle'; return; }
  if (c.state === 'takePipes') { c.faceTo(P.prack, dt); c.play('idle'); if (c.wait > 0) return; const need = S.order && !S.order.ready ? (S.order.pq || 0) - S.pbed - truckPipes() : 0;
    if (c.stack.length >= cap || S.pipes === 0 || need <= 0) { c.state = 'idle'; return; } if (takeFrom('rack', c, 'pipe')) { S.pipes--; syncPipes(); c.wait = .3; } return; }
  // warehouse: stock goes in from the pallet and the pipe rack, and out to the truck when the line is short
  if (c.state === 'toPalletWh') { if (walk(c, dt)) c.state = 'takePalletWh'; return; }
  if (c.state === 'takePalletWh') { c.play('idle'); if (c.wait > 0) return; const room = whCapC() - S.wh.c - whBound('crate');
    if (c.stack.length >= ccap || surplusC() <= 0 || room <= 0 || (c.stack.length && c.carryType !== 'crate')) { c.state = 'idle'; return; }
    if (takeFrom('pallet', c, 'crate')) { S.pallet--; c.dest = 'wh'; c.wait = .3; } return; }
  if (c.state === 'toPRackWh') { if (walk(c, dt)) c.state = 'takePRackWh'; return; }
  if (c.state === 'takePRackWh') { c.faceTo(P.prack, dt); c.play('idle'); if (c.wait > 0) return; const room = whCapP() - S.wh.p - whBound('pipe');
    if (c.stack.length >= cap || surplusP() <= 0 || room <= 0 || (c.stack.length && c.carryType !== 'pipe')) { c.state = 'idle'; return; }
    if (takeFrom('rack', c, 'pipe')) { S.pipes--; syncPipes(); c.dest = 'wh'; c.wait = .3; } return; }
  if (c.state === 'toTRackWh') { if (walk(c, dt)) c.state = 'takeTRackWh'; return; }
  if (c.state === 'takeTRackWh') { c.faceTo(P.track, dt); c.play('idle'); if (c.wait > 0) return; const room = whCapT() - S.wh.t - whBound('toolbox');
    if (c.stack.length >= cap + 1 || surplusT() <= 0 || room <= 0 || (c.stack.length && c.carryType !== 'toolbox')) { c.state = 'idle'; return; }
    if (takeFrom('rack', c, 'toolbox')) { S.tools--; syncTools(); c.dest = 'wh'; c.wait = .25; } return; }
  if (c.state === 'toWh') { if (walk(c, dt)) c.state = 'dropWh'; return; }
  if (c.state === 'dropWh') { c.faceTo(P.wh, dt); c.play('carry', 0); if (c.wait > 0) return; const kind = c.carryType === 'pipe' ? 'p' : c.carryType === 'toolbox' ? 't' : 'c';
    if (!c.stack.length) { c.dest = null; c.state = 'idle'; c.task = null; giveXp(c.st, 4); return; }
    if (S.wh[kind] >= { c:whCapC, p:whCapP, t:whCapT }[kind]()) { c.dest = null; c.state = 'idle'; return; }   // full: back to the line
    if (giveTo(c, 'wh', world, { c:whCratePos, p:whPipePos, t:whToolPos }[kind], () => syncWh())) { S.wh[kind]++; c.wait = .25; } return; }
  if (c.state === 'toWhTake') { if (walk(c, dt)) c.state = 'takeWh'; return; }
  if (c.state === 'takeWh') { c.faceTo(P.wh, dt); c.play('idle'); if (c.wait > 0) return; const kind = c.whType === 'pipe' ? 'p' : c.whType === 'toolbox' ? 't' : 'c';
    const need = !S.order || S.order.ready || truck.state !== 'docked' ? 0 : kind === 'p' ? (S.order.pq || 0) - S.pbed - truckPipes() - S.pipes : kind === 't' ? (S.order.tq || 0) - S.tbed - truckTools() - S.tools : S.order.qty - S.bed - truckCrates() - S.pallet;
    if (c.stack.length >= (kind === 'c' ? ccap : cap + (kind === 't' ? 1 : 0)) || need <= 0 || S.wh[kind] <= 0 || (c.stack.length && c.carryType !== c.whType)) { c.state = 'idle'; return; }
    if (takeFrom('wh', c, c.whType)) { S.wh[kind]--; c.dest = null; c.wait = .3; sfxAt('pick', c.o.position.x, c.o.position.z, .5); } return; }
  if (c.state === 'returnPipes') { if (!walk(c, dt)) return; while (c.stack.length && giveTo(c, 'rack', world, pipeRackPos, () => syncPipes())) S.pipes++; c.state = 'idle'; return; }
  // timber lorry -> stock room
  const tcap = 4 + 2 * Math.floor((c.st.lv - 1) / 2);
  if (c.state === 'toUnload') { if (walk(c, dt)) c.state = 'takeLorry'; return; }
  if (c.state === 'takeLorry') { c.faceTo(P.goodsIn, dt); c.play('idle'); if (c.wait > 0) return;
    if (!S.delivery || goodsIn() <= 0 || c.stack.length >= tcap || (S.delivery.kind === 'steel' ? S.coils + coilsInHands() >= coilCap() : S.store + carriedTimber() >= storeCap())) { c.state = 'idle'; return; }
    const steel = S.delivery.kind === 'steel'; if (steel && c.stack.length >= 1) { c.state = 'idle'; return; }
    const m = steel ? coilMesh() : plankMesh(.6), b = goodsInArr.at(-1); world.add(m); m.position.copy(b ? b.position : new THREE.Vector3(P.goodsIn[0], .3, P.goodsIn[1]));
    c.carryType = steel ? 'coil' : 'timber'; if (steel) c.coilDest = 'bay'; c.stack.push(m); fly(m, c.o, carriedPos(c.carryType, c.stack.length - 1, c.stack.length, !!c.cart), .25, () => layoutCarry(c));
    S.delivery.left--; syncGoodsIn(); c.wait = .28; sfxAt('pick', c.o.position.x, c.o.position.z, .5); return; }
  if (c.state === 'toStore') { if (walk(c, dt)) c.state = 'dropStore'; return; }
  if (c.state === 'dropStore') { c.faceTo([P.storeRack[0], P.storeRack[1]], dt); c.play('carry', 0); if (c.wait > 0) return;
    if (!c.stack.length || S.store >= storeCap()) { c.state = 'idle'; return; }
    if (giveTo(c, 'store', world, storePos, () => syncStore())) { S.store++; giveXp(c.st, 3); c.wait = .25; } return; }
  // stock room -> line rack on the trolley
  if (c.state === 'toTrolley') { if (walk(c, dt)) { c.trolley = M.trolley; c.tplanks = []; fly(M.trolley, c.o, new THREE.Vector3(0, 0, .85), .35, () => { M.trolley.rotation.set(0, -Math.PI / 2, 0); }, 0); M.trolley.rotation.set(0, -Math.PI / 2, 0); goTo(c, ...P.storeSpot); c.state = 'toLoadT'; } return; }
  if (c.state === 'toLoadT') { if (walk(c, dt)) c.state = 'loadT'; return; }
  if (c.state === 'loadT') { c.faceTo([P.storeRack[0], P.storeRack[1]], dt); c.play('work'); if (c.wait > 0) return;
    const want = Math.min(trolleyCap(), LINE_CAP - S.timber);
    if (S.store <= 0 || c.tplanks.length >= want) { goTo(c, P.timberRing[0], P.timberRing[1] + .2); c.state = 'pushT'; return; }
    const m = planks.store.pop(); S.store--; c.tplanks.push(m); fly(m, M.trolley, trolleyPos(c.tplanks.length - 1), .22, null, .35); c.wait = .2; return; }
  if (c.state === 'pushT') { if (walk(c, dt)) c.state = 'unloadT'; return; }
  if (c.state === 'unloadT') { c.faceTo(P.timber, dt); c.play('work'); if (c.wait > 0) return;
    if (!c.tplanks.length || S.timber >= LINE_CAP) { if (c.tplanks.length) { S.store += c.tplanks.length; c.tplanks.forEach(m => m.removeFromParent()); c.tplanks = []; syncStore(); } goTo(c, ...P.storeSpot); c.state = 'returnT'; giveXp(c.st, 8); return; }
    const m = c.tplanks.pop(); planks.rack.push(m); fly(m, world, rackPos(planks.rack.length - 1), .22, null, .35); S.timber++; c.wait = .18; return; }
  if (c.state === 'returnT') { if (walk(c, dt)) { const park = new THREE.Vector3(P.trolleyPark[0], 0, P.trolleyPark[1]); fly(M.trolley, world, park, .3, () => M.trolley.rotation.set(0, Math.PI, 0), 0); c.trolley = null; trolleyBy = null; c.state = 'idle'; c.task = null; } return; }
  if (c.state === 'fill') { c.faceTo([P.pump[0], P.pump[1] - 1], dt); c.play('work'); if (c.wait > 0) return;
    const can = M.jerry.clone(true), hand = c.o.getObjectByName('forearmL'); c.stack.push(can); c.carryType = 'fuel';
    if (hand) { hand.add(can); can.position.set(0, .5, -.02); can.rotation.set(Math.PI, 0, 0); can.scale.setScalar(.8); } else { c.o.add(can); layoutCarry(c); }
    sfxAt('pick', c.o.position.x, c.o.position.z, .6); c.state = 'idle'; return; }
  if (c.state === 'toFiller') { if (walk(c, dt)) { c.state = 'pour'; c.wait = 1.8; } return; }
  if (c.state === 'pour') { c.faceTo([P.gen[0], P.filler[1]], dt); c.play('work'); if (c.wait > 0) return;
    const can = c.stack.pop(); can && can.removeFromParent(); c.carryType = null; const was = S.power.fuel;
    S.power.fuel = Math.min(100, S.power.fuel + 55); S.bills += 8; giveXp(c.st, 6); c.task = null;
    floatText('Diesel +55%', P.gen[0], 1.9, P.gen[1], 'info'); if (was <= 0) { toast('Diesel in. The generator is running again.', 'good'); sfx('fix'); } c.state = 'idle'; return; }
  if (c.state === 'toRack') { if (walk(c, dt)) c.state = 'takeRack'; return; }
  if (c.state === 'takeRack') { c.play('idle'); if (c.wait > 0) return; if (c.stack.length >= cap || S.timber === 0 || S.feed + c.stack.length >= 6) { c.state = 'idle'; return; } if (takeFrom('rack', c, 'plank')) { S.timber--; c.wait = .3; sfxAt('pick', c.o.position.x, c.o.position.z, .5); } return; }
  if (c.state === 'toFeed') { if (walk(c, dt)) c.state = 'dropFeed'; return; }
  if (c.state === 'toRackBack') { if (walk(c, dt)) c.state = 'dropRack'; return; }
  if (c.state === 'dropRack') { c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length || S.timber >= LINE_CAP) { c.state = 'idle'; return; }
    const m = c.stack.pop(); planks.rack.push(m); m.scale.set(1, 1, 1); fly(m, world, rackPos(planks.rack.length - 1), .22, null); if (!c.stack.length) c.carryType = null; S.timber++; c.wait = .25; return; }
  if (c.state === 'dropFeed') { c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length) { c.state = 'idle'; return; } if (S.feed >= 6) { c.state = 'waiting'; return; } if (giveTo(c, 'feed', world, feedPos, () => syncFeed())) { S.feed++; S.fedPlanks++; giveXp(c.st, 5); c.wait = .3; c.st.energy = Math.max(0, c.st.energy - 1.2); } return; }
  if (c.state === 'toPallet') { if (walk(c, dt)) c.state = 'takePallet'; return; }
  if (c.state === 'takePallet') { c.play('idle'); if (c.wait > 0) return; const need = S.order && !S.order.ready ? S.order.qty - S.bed - truckCrates() : 0;
    if (c.stack.length >= ccap || S.pallet === 0 || need <= 0) { c.state = 'idle'; return; } if (takeFrom('pallet', c, 'crate')) { S.pallet--; c.wait = .3; } return; }
  if (c.state === 'toTruck') { if (walk(c, dt)) c.state = 'dropTruck'; return; }
  if (c.state === 'dropTruck') { c.play('carry', 0); if (c.wait > 0) return; if (!c.stack.length) { c.state = 'idle'; c.st.energy = Math.max(0, c.st.energy - 3); return; }
    if (truck.state !== 'docked' || !S.order || S.order.ready) { if (S.order && S.order.ready || truck.state === 'leave' || truck.state === 'away') { if (c.carryType === 'pipe') { c.state = 'returnPipes'; goTo(c, ...P.prackSpot); } else if (c.carryType === 'toolbox') { c.state = 'returnTools'; goTo(c, ...P.trackSpot); } else { c.state = 'returnCrates'; goTo(c, P.pallet[0] + .55, P.pallet[1] + .5); } } return; }
    if (c.carryType === 'pipe' ? loadPipe(c) : c.carryType === 'toolbox' ? loadTool(c) : loadCrate(c)) c.wait = .3; return; }
  if (c.state === 'returnCrates') { if (!walk(c, dt)) return; while (c.stack.length && giveTo(c, 'pallet', world, palletPos, () => syncPallet())) S.pallet++; c.state = 'idle'; return; }
}
// specialists: their own trade's faults first, then servicing, then the bench
function serviceTarget(c){
  if (c.forcedService) { c.forcedService = false;
    if (c.st.role === 'mechanic') { const opts = [{ spot:P.sawFix, face:P.saw, what:'saw' }, { spot:P.genFix, face:P.gen, what:'engine' }, ...(pressReady() ? [{ spot:P.tfix, face:P.tpress, what:'tool' }] : []), ...(millReady() ? [{ spot:P.pfix, face:P.pmill, what:'pipe' }] : []), { spot:P.boardSpot, face:[P.board[0], -1], what:'wiring' }];
      return opts.sort((a, b) => S.cond[a.what] - S.cond[b.what])[0]; }
    return { spot:P.boardSpot, face:[P.board[0], -1], what:'wiring' }; }
  if (c.st.role === 'mechanic') {   // the most worn first (a machine only between runs); the wiring counts too, it has no electrician
    const old = S.level < 6, due = [old && S.cond.saw < 75 && !sawOn && { spot:P.sawFix, face:P.saw, what:'saw' }, S.cond.engine < 75 && { spot:P.genFix, face:P.gen, what:'engine' },
      old && millReady() && S.cond.pipe < 75 && !pipeOn && { spot:P.pfix, face:P.pmill, what:'pipe' }, old && pressReady() && S.cond.tool < 75 && !toolOn && { spot:P.tfix, face:P.tpress, what:'tool' },
      S.cond.wiring < 75 && { spot:P.boardSpot, face:[P.board[0], -1], what:'wiring' }].filter(Boolean);
    return due.sort((a, b) => S.cond[a.what] - S.cond[b.what])[0] || null; }
  else if (S.cond.wiring < 75) return { spot:P.boardSpot, face:[P.board[0], -1], what:'wiring' };
  return null;
}
function jobFace(f){ const w = WHERE[f.where]; return w.face !== null ? [w.spot()[0], w.spot()[1] - 1] : f.where === 'gen' ? P.gen : f.where === 'pipe' ? P.pmill : f.where === 'tool' ? P.tpress : P.saw; }
function updateSpecialist(c, dt){
  if (updateBreak(c, dt)) return;
  if (c.state === 'arrive') { if (walk(c, dt)) c.state = 'idle'; return; }
  const trade = c.st.role;
  if (c.job && !faultById(c.job)) { c.job = null; if (c.state === 'toJob' || c.state === 'fixing') c.state = 'idle'; }
  if (!c.job && c.state !== 'fixing') { const free = f => f.diag && myTrade(c, FAULTS[f.kind].trade) && !f.by && !f.contractor, f = S.faults.find(f => free(f) && !FAULTS[f.kind].svc) || S.faults.find(f => free(f) && FAULTS[f.kind].svc && (f.booked || S.up.schedule));
    if (f) { f.by = c.st.id; c.job = f.id; goTo(c, ...WHERE[f.where].spot()); c.state = 'toJob'; } }
  if (c.state === 'toJob') { if (walk(c, dt)) { c.state = 'fixing'; const f = faultById(c.job); if (f && needsPart(f) && f.part === undefined) { f.part = S.parts > 0; if (f.part) { S.parts--; syncParts(); floatText('Spare part fitted', ...WHERE[f.where].mark, 'info'); } else floatText('No spare part: making do', ...WHERE[f.where].mark, 'warn'); } } return; }
  if (c.state === 'fixing') { const f = faultById(c.job); if (!f) { c.state = 'idle'; return; }
    const sp = WHERE[f.where].spot(); c.o.position.set(sp[0], 0, sp[1]); c.faceTo(jobFace(f), dt); c.play(FAULTS[f.kind].anim, 1.1);
    f.prog += dt * repairSpeed(c) / FAULTS[f.kind].time * (needsPart(f) && f.part === false ? .35 : 1); f.workT = T; c.st.energy = Math.max(0, c.st.energy - dt * .6);
    if (Math.random() < dt * 3) { if (FAULTS[f.kind].trade === 'electrician') spark(WHERE[f.where].mark[0], WHERE[f.where].mark[1] - .7, WHERE[f.where].mark[2] + .3); else sfx('clank', .5); }
    if (f.prog >= 1) { if (FAULTS[f.kind].svc) svcDone(f, c); else clearFault(f, c); c.job = null; c.state = 'idle'; } return; }
  if (breakDue(c)) { startBreak(c); return; }
  if (c.state === 'toService') { if (walk(c, dt)) { c.state = 'service'; c.wait = 4.5; } return; }
  if (c.state === 'service') { c.faceTo(c.svc.face, dt); c.play(c.svc.what === 'wiring' ? 'work' : 'fix'); c.wait -= dt * repairSpeed(c); c.st.energy = Math.max(0, c.st.energy - dt * .5);
    if (c.wait <= 0) { S.cond[c.svc.what] = 100; giveXp(c.st, 10); floatText('Serviced', c.o.position.x, 1.7, c.o.position.z, 'info'); c.state = 'idle'; } return; }
  if (c.state === 'idle' || c.state === 'home' || c.state === 'toHome') {
    const sv = serviceTarget(c); if (sv) { c.svc = sv; goTo(c, ...sv.spot); c.state = 'toService'; return; }
    const home = trade === 'mechanic' ? P.mechHome : P.elecHome;
    if (c.state === 'idle') { goTo(c, ...home); c.state = 'toHome'; }
    if (c.state === 'toHome') { if (walk(c, dt)) c.state = 'home'; return; }
    if (c.state === 'home') { c.faceNow(Math.PI); c.play('work', .45); }
  }
}
function updateSupervisor(c, dt){
  if (c.state === 'follow') { updateFollow(c, dt); return; }
  if (updateBreak(c, dt)) return;
  if (c.state === 'arrive') { if (walk(c, dt)) c.state = 'idle'; return; }
  if (c.state === 'talking') { c.play('point'); if (!c.talking) c.state = 'idle'; return; }
  const free = ['idle', 'toPatrol', 'patrolWait'].includes(c.state);
  if (free && S.order && !S.order.met && !S.order.briefed) { c.state = 'toMeet'; c.meetAt = null; }
  if (c.state === 'toMeet') { c.rp -= dt; if (!S.order || S.order.briefed) { c.state = 'idle'; return; }
    const op = owner.o.position, d = dist2(c.o, [op.x, op.z]);
    if (d < 1.4) { c.state = 'meet'; c.wait = 2.6; c.path = null; S.meets = (S.meets || 0) + 1; owner.say = { text:`${S.order.client}: ${describe(S.order)}, due ${dueAt(S.order.deadline - S.order.time)}.`, until:T + 2.6 }; c.say = { text:'Got it, boss. I\'ll brief the crew.', until:T + 2.8 }; return; }
    if (!c.meetAt || Math.hypot(c.meetAt[0] - op.x, c.meetAt[1] - op.z) > 1) { c.meetAt = [op.x, op.z]; goTo(c, op.x + .8, op.z + .3); }
    if (walk(c, dt)) goTo(c, op.x, op.z); return; }
  if (c.state === 'meet') { c.play('inspect'); c.faceTo([owner.o.position.x, owner.o.position.z], dt); c.wait -= dt;
    if (dist2(c.o, [owner.o.position.x, owner.o.position.z]) > 2.2) { c.state = 'toMeet'; return; }
    if (c.wait <= 0) { if (S.order) S.order.met = true; const op = orderOp(S.order); if (op) { goTo(c, op.o.position.x + .8, op.o.position.z + .5); c.state = 'toBrief'; } else c.state = 'idle'; } return; }
  if (c.state === 'toBrief') { if (walk(c, dt)) { c.state = 'brief'; c.wait = 1.6; } return; }
  if (c.state === 'brief') { const op = orderOp(S.order); if (op) c.faceTo([op.o.position.x, op.o.position.z], dt); c.play('point'); c.wait -= dt;
    if (c.wait <= 0) { briefOrder(c); c.play('inspect'); const ld = staffOf('loader').sort((a, b) => dist2(c.o, [a.o.position.x, a.o.position.z]) - dist2(c.o, [b.o.position.x, b.o.position.z]))[0];
      if (ld) { c.briefL = ld.st.id; goTo(c, ld.o.position.x + .7, ld.o.position.z + .4); c.state = 'toBriefL'; } else c.state = 'idle'; } return; }
  if (c.state === 'toBriefL') { if (walk(c, dt)) { c.state = 'briefL'; c.wait = 1.2; const ld = staffObj.get(c.briefL); c.say = { text:`Truck's coming for ${S.order ? describe(S.order) : 'the order'}.`, until:T + 1.8 }; if (ld) ld.say = { text:'On it.', until:T + 1.6 }; } return; }
  if (c.state === 'briefL') { const ld = staffObj.get(c.briefL); if (ld) c.faceTo([ld.o.position.x, ld.o.position.z], dt); c.play('point'); c.wait -= dt; if (c.wait <= 0) c.state = 'idle'; return; }
  if (free) {
    // with a post (level 4) she keeps to her zone: slackers and idlers outside it are not hers to chase
    const post = S.level >= 4 && (c.st.post || (c === supervisor() && S.lv4.post)), mine = o => !post || dist2(o.o, post) < zoneR() + 1;
    const f = S.faults.find(f => !f.diag && !f.supBy), slack = [...staffObj.values()].find(o => o.state === 'slack' && mine(o));
    if (f) { f.supBy = c.st.id; const sp = WHERE[f.where].spot(); c.tgt = { type:'fault', id:f.id, at:[sp[0] + .7, sp[1] + .2] }; }
    else if (S.order && S.order.ready) c.tgt = { type:'sign', at:[P.drop[0] - .2, P.drop[1] + .2] };
    else if (S.level >= 5 && S.order2 && S.order2.ready && truckB.state === 'docked') c.tgt = { type:'sign2', at:[P.drop2[0] - .2, P.drop2[1] + .3] };
    else if (slack) c.tgt = { type:'slack', id:slack.st.id, at:[slack.o.position.x + .7, slack.o.position.z + .5] };
    else { const idler = [...staffObj.values()].find(o => o !== c && (o.idleT || 0) > 6 && !(o.talkCD > 0) && !o.talk && o.st.role !== 'supervisor' && dist2(c.o, [o.o.position.x, o.o.position.z]) < 9 && mine(o));
      c.tgt = idler ? { type:'idle', id:idler.st.id, at:[idler.o.position.x + .7, idler.o.position.z + .4] } : null; }
    if (c.tgt) { goTo(c, ...c.tgt.at); c.state = 'toTarget'; }
  }
  if (c.state === 'toTarget') { if (walk(c, dt)) { c.state = 'check'; c.wait = 1.1; } return; }
  if (c.state === 'check') { c.play('inspect'); c.wait -= dt; const t = c.tgt;
    if (t.type === 'fault') { const f = faultById(t.id); if (f) c.faceTo([WHERE[f.where].mark[0], WHERE[f.where].mark[2]], dt); }
    if (c.wait > 0) return;
    if (t.type === 'fault') { const f = faultById(t.id); if (f) diagnose(f, c); }
    if (t.type === 'sign' && S.order && S.order.ready && truck.state === 'docked') signOrder(c);
    if (t.type === 'sign2') signOrder2(c);
    // a new order always goes through the owner first: the meeting outranks a chat with an idle worker
    if (t.type === 'idle' && !(S.order && !S.order.met && !S.order.briefed)) { const w = staffObj.get(t.id); if (w && !w.talk) { startTalk(c, w); c.state = 'talking'; return; } }
    c.state = 'idle'; c.st.energy = Math.max(0, c.st.energy - 2); if (breakDue(c)) startBreak(c); return; }
  // the round takes in the North field once the tool press is running, so its operator sees the supervisor too
  if (c.state === 'idle') { const myPost = c.st.post || (c === supervisor() && S.lv4.post), route = myPost ? [myPost] : pressReady() ? [...P.patrol, [17.4, -2.4]] : P.patrol; c.pi = ((c.pi ?? -1) + 1) % route.length; goTo(c, ...route[c.pi]); c.state = 'toPatrol'; }
  if (c.state === 'toPatrol') { if (walk(c, dt)) { c.state = 'patrolWait'; c.wait = 3.2; } return; }
  if (c.state === 'patrolWait') { c.play('inspect'); c.wait -= dt; const crew = [...staffObj.values()].filter(o => o !== c);
    let nb = null, nd = 9; for (const o of crew) { const d = dist2(c.o, [o.o.position.x, o.o.position.z]); if (d < nd) { nd = d; nb = o; } } if (nb) c.faceTo([nb.o.position.x, nb.o.position.z], dt);
    if (c.wait <= 0) { c.state = 'idle'; c.st.energy = Math.max(0, c.st.energy - 3); if (breakDue(c)) startBreak(c); } }
}
function idleJob(w, boss){
  const r = w.st.role;
  if (r === 'loader') {
    if (S.store > 0 && S.timber < LINE_CAP - 1 && !trolleyBy) return { why:'Nothing to carry right now, boss.', go:'Then top up the line rack from the stock room.', job:'restock' };
    if (S.timber > 0 && S.feed < 6) return { why:'Just waiting for the next job.', go:'Fill up the saw\'s in-feed.', job:'planks' };
    return { why:'The rack\'s full and the truck isn\'t here yet.', go:'Then sweep the floor. Keep the place tidy.', job:'sweep' };
  }
  if (r === 'operator' && w.st.mach === 'tool') {
    if (S.order && !S.order.briefed && boss === owner) return { why:'Nobody told me about an order.', go:`${describe(S.order)} for ${S.order.client}. Get going.`, job:'brief' };
    if (toolLeft() > 0 && S.tcoil <= 0 && S.tfeed <= 0) return { why:'No steel strip in the press.', go:S.coils > 0 ? 'I\'ll send a loader with a coil.' : 'I\'ll order more steel.', job:'coilpress' };
    if (S.tools >= toolCap()) return { why:'The tool rack is full.', go:'Clean the press while the truck takes this lot.', job:'clean' };
    return { why:S.order && S.order.tq ? 'These tools are all stamped.' : 'No tools to stamp right now.', go:'Then clean and oil the press while you wait.', job:'clean' };
  }
  if (r === 'operator' && w.st.mach === 'pipe') {
    if (S.order && !S.order.briefed && boss === owner) return { why:'Nobody told me about an order.', go:`${describe(S.order)} for ${S.order.client}. Get going.`, job:'brief' };
    if (pipeLeft() > 0 && S.coilLeft <= 0 && S.coilFeed <= 0) return { why:'No steel on the uncoiler.', go:S.coils > 0 ? 'I\'ll send a loader with a coil.' : 'I\'ll order more steel.', job:'coilfeed' };
    if (S.pipes >= pipeCap()) return { why:'The pipe rack is full.', go:'Clean the mill while the truck takes this lot.', job:'clean' };
    return { why:S.order && S.order.pq ? 'These pipes are all formed.' : 'No pipes to form right now.', go:'Then clean and oil the mill while you wait.', job:'clean' };
  }
  if (r === 'operator') {
    if (S.order && !S.order.briefed && boss === owner) return { why:'Nobody told me about an order.', go:`${describe(S.order)} for ${S.order.client}. Get cutting.`, job:'brief' };
    if (orderLeft() > 0 && S.feed === 0) return { why:'There are no planks in the in-feed.', go:'I\'ll send a loader with timber.', job:'feed' };
    if (orderLeft() > 0 && S.pallet >= palletCap()) return { why:'The pallet is full. Nowhere to put the next crate.', go:'Clean the saw while the truck takes this lot.', job:'clean' };
    if (S.order && !S.order.briefed) return { why:'There\'s an order, but nobody briefed me yet.', go:'The supervisor is on his way. Clean the saw till then.', job:'clean' };
    return { why:S.order ? 'This order is all cut.' : 'No order to cut yet.', go:'Then clean and oil the saw while you wait.', job:'clean' };
  }
  return { why:'Everything is running fine.', go:'Do a safety round on the kit anyway.', job:'service' };
}
function startTalk(boss, w){
  if (w.talk || boss.talking || w.lunch || w.leaving || w.gone || lunchTime() || closingTime()) return;   // nobody is told off over their sandwiches or on the way home
  S.talks = (S.talks || 0) + 1;
  w.talk = { boss, j:idleJob(w, boss), t:0, step:0, q:boss === owner ? 'Why are you standing around?' : `${w.st.name}, why are you idle?` }; boss.talking = w; w.idleT = 0; w.path = null;
}
function applyJob(w, j, boss){
  if (j.job === 'brief') { briefOrder(boss); return; }
  if (j.job === 'feed') { const ld = staffOf('loader').filter(l => !l.stack.length && !l.talk).sort((a, b) => dist2(a.o, P.timberRing) - dist2(b.o, P.timberRing))[0]; if (ld) { ld.forced = 'planks'; ld.say = { text:'Bringing timber!', until:T + 1.6 }; if (['waiting', 'idle'].includes(ld.state)) ld.state = 'idle'; } return; }
  if (j.job === 'clean') { if (w.lunch || w.leaving || lunchTime() || closingTime()) return; goTo(w, ...opsOf(w).fix()); w.state = 'toClean'; return; }
  if (j.job === 'coilpress') { const ld = staffOf('loader').filter(l => !l.stack.length && !l.talk)[0]; if (ld && S.coils > 0) { ld.forced = 'coilsPress'; ld.say = { text:'Bringing a coil!', until:T + 1.6 }; if (['waiting', 'idle'].includes(ld.state)) ld.state = 'idle'; } }
  if (j.job === 'coilfeed') { const ld = staffOf('loader').filter(l => !l.stack.length && !l.talk)[0]; if (ld && S.coils > 0) { ld.forced = 'coils'; ld.say = { text:'Bringing a coil!', until:T + 1.6 }; if (['waiting', 'idle'].includes(ld.state)) ld.state = 'idle'; } return; }
  if (j.job === 'service') { w.forcedService = true; if (w.state === 'home' || w.state === 'toHome') w.state = 'idle'; return; }
  w.forced = j.job; if (['waiting', 'idle'].includes(w.state)) w.state = 'idle';
}
function updateTalks(dt){
  for (const w of staffObj.values()) { const tk = w.talk; if (!tk) continue; tk.t += dt; const b = tk.boss;
    w.faceTo([b.o.position.x, b.o.position.z], dt); w.play('idle'); if (b !== owner) b.faceTo([w.o.position.x, w.o.position.z], dt);
    if (tk.step === 0) { b.say = { text:tk.q, until:T + 1.4 }; tk.step = 1; tk.t = 0; }
    else if (tk.step === 1 && tk.t > 1.2) { w.say = { text:tk.j.why, until:T + 1.7 }; tk.step = 2; tk.t = 0; }
    else if (tk.step === 2 && tk.t > 1.5) { b.say = { text:tk.j.go, until:T + 1.9 }; b.play('point'); if (b === owner) owner.lock = 1; tk.step = 3; tk.t = 0; }
    else if (tk.step === 3 && tk.t > 1.5) { w.say = { text:'Right away!', until:T + 1.2 }; w.talk = null; b.talking = null; w.talkCD = 45; applyJob(w, tk.j, b); sfx('tap'); }
  }
}
const PINNED = new Set(['work', 'lunch', 'fixing', 'break', 'service', 'fill', 'pour', 'slack', 'cleaning', 'sweeping']);
// who the crowd push leaves alone: the owner (the player steers him), anyone at a work spot, and anyone in
// the last half metre of a walk, so a body standing beside a work spot can never hold a worker off it
function held(c){
  if (c === owner || PINNED.has(c.state) || (c.need && ['enter', 'inside', 'exit', 'drink', 'washing'].includes(c.need.stage)) || c.state === 'cleanWC' || c.state === 'swap') return true;
  const p = c.path; if (!p || p.length !== 1) return false;
  return Math.hypot(p[0][0] - c.o.position.x, p[0][1] - c.o.position.z) < .55;
}
function separate(dt){
  const all = [...staffObj.values(), ...temps, owner];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j], dx = b.o.position.x - a.o.position.x, dz = b.o.position.z - a.o.position.z, d = Math.hypot(dx, dz);
    if (d > .52 || d < 1e-4) continue;
    const pa = held(a) ? 0 : 1, pb = held(b) ? 0 : 1; if (!pa && !pb) continue;
    const push = Math.min(.52 - d, dt * 1.6) / (pa + pb), nx = dx / d, nz = dz / d;
    if (pa) { a.o.position.x -= nx * push; a.o.position.z -= nz * push; collide(a.o.position, a === owner); }
    if (pb) { b.o.position.x += nx * push; b.o.position.z += nz * push; collide(b.o.position, b === owner); }
  }
}
// a worker whose routine throws is put back on its feet: needs and jobs released, back to idle. The error is
// reported once, the rest of the factory keeps running.
function recoverChar(c, e){
  try { if (c.need) endNeed(c); } catch(_){}
  c.need = null; c.fjob = null; c.path = null; c.o.visible = true; c.state = 'idle'; c.lock = 0; releaseCart(c);
  S.recovered = (S.recovered || 0) + 1; guard('staff', () => { throw e; });
}
function leadStep(c, dt){
  const o = owner.o.position, d = Math.hypot(c.o.position.x - o.x, c.o.position.z - o.z), st = c.st;
  const post = st.role === 'operator' ? P.op : P.pallet;
  const first = st.role === 'loader' && S.staff.some(x => x.loyal && x.role === 'operator' && !x.posted) && !S.tutDone;   // in the tutorial: the operator first
  if (!c.follow && d < 1.3 && !first) { c.follow = true; c.say = { text:'Right behind you, boss.', until:T + 2 }; sfx('pick', .6); }
  if (!c.follow) { c.play('idle'); if (c.path && walk(c, dt)) c.path = null; return; }
  if (Math.hypot(o.x - post[0], o.z - post[1]) < (st.role === 'operator' ? 1.3 : 1.8)) {
    st.posted = true; c.follow = false; c.state = 'idle'; c.path = null;
    toast(st.role === 'operator' ? `${st.name} takes the crate machine.` : `${st.name} takes the loading: pallet to truck.`, 'good'); sfx('hire'); save(); checkCharter(); return; }
  if (d > 1.25) { if (!c.path || T - (c.repath || 0) > .45) { goTo(c, o.x, o.z); c.repath = T; } walk(c, dt); } else { c.path = null; c.play('idle'); c.faceTo([o.x, o.z], dt); }
}
function updateStaff(dt){
  updateTalks(dt);
  for (const c of staffObj.values()) { const r = c.st.role;
    c.talkCD = Math.max(0, (c.talkCD || 0) - dt);
    if (c.talk) continue;
    if (c.party) { try { partyStep(c, dt); } catch(e) { c.party = null; } continue; }
    if (c.st.posted === false) { try { leadStep(c, dt); } catch(e) { recoverChar(c, e); } continue; }
    try {
      if (r === 'forklift' && c !== forkDriver() && S.level >= 8) { fork8Driver(c, dt); continue; }   // the second driver runs the beam forklift
      if (r === 'forklift') { updateForkDriver(c, dt); continue; }
      if (updateNeeds(c, dt)) { c.idleT = 0; continue; }
      if (c.st.trainUntil) { if (S.time < c.st.trainUntil && !(S.day && S.day.closing)) { if (c.state !== 'training' && c.state !== 'toTraining') { releaseCart(c); goTo(c, P.wsDoor[0], P.wsDoor[1] + .2); c.state = 'toTraining'; c.task = null; }
          if (c.state === 'toTraining') { if (walk(c, dt)) { c.state = 'training'; c.o.visible = false; } } c.idleT = 0; continue; }
        c.st.trainUntil = 0; c.o.visible = true; c.state = 'idle'; c.path = null; c.say = { text:'Learnt a thing or two, boss.', until:T + 2.2 }; }
      if (c.hideTillClear) { if (carAtGate()) { c.play('idle'); continue; } c.hideTillClear = false; c.o.visible = true; }
      if (c.holdUntil) { if (T < c.holdUntil || gateSwinging()) { c.play('idle'); c.faceTo(P.frontIn, dt); continue; } c.holdUntil = 0; }   // the gate leaves are still swinging open
      if (closingStep(c, dt)) { c.idleT = 0; continue; }
      if (lunchStep(c, dt)) { c.idleT = 0; continue; }
      if (payStep(c, dt)) { c.idleT = 0; continue; }
      if (r !== 'clerk' && typeof hailShelter === 'function' && hailShelter() && !['fixing', 'arrive'].includes(c.state) && !c.stack.length) { c.play('idle'); continue; }   // hail: everyone outdoors stands in under cover for 15 s
      if (r === 'clerk') { updateClerk(c, dt); continue; }
      if (r === 'operator' && c.st.mach === 'furnace') { updateFurnOp(c, dt, furnOps().indexOf(c)); continue; }
      if (r === 'foreman') { updateForeman(c, dt); continue; }
      if (r === 'cleaner') updateCleaner(c, dt); else if (r === 'operator') updateOperator(c, dt); else if (r === 'loader' || r === 'helper') updateLoader(c, dt); else if (r === 'supervisor') updateSupervisor(c, dt); else updateSpecialist(c, dt);
    } catch(e) { recoverChar(c, e); continue; }
    const idle = (r === 'loader' && c.state === 'waiting') || (r === 'operator' && c.state === 'work' && !opsOf(c).running(c)) || ((r === 'mechanic' || r === 'electrician') && c.state === 'home');
    c.idleT = idle ? (c.idleT || 0) + dt : 0; }
  separate(dt);
}
// contractors: when a diagnosed fault waits too long with nobody of that trade on staff
function updateContractors(dt){
  // nobody of that trade on the payroll: a contractor from town after a minute (Master Design Doc), never for the guided jam
  for (const f of S.faults) if (f.diag && !f.contractor && !f.guided && f.kind !== 'powercut' && !FAULTS[f.kind].svc && !fixerOn(FAULTS[f.kind].trade) && f.diagT > 60) {
    f.contractor = true; const trade = FAULTS[f.kind].trade;
    const c = makeChar('worker', ...P.frontOut, { parts:newLook(trade).parts, cols:Object.assign({ skin:pick(SKINS), hair:pick(HAIRS) }, ROLE[trade].col) });
    c.st = { id:-f.id, name:'Contractor', role:trade, lv:1, energy:100, focus:100 }; c.fault = f.id; c.state = 'toJob'; goTo(c, ...WHERE[f.where].spot()); temps.push(c);
    toast(`A ${trade} from town is coming. Callout: $45 on your bills.`, 'gold'); S.bills += 45;
  }
  for (let i = temps.length - 1; i >= 0; i--) { const c = temps[i];
    if (c.state === 'toJob') { if (walk(c, dt)) c.state = 'fixing'; if (!faultById(c.fault)) { c.state = 'leave'; goTo(c, ...P.frontOut); } continue; }
    if (c.state === 'fixing') { const f = faultById(c.fault); if (!f) { c.state = 'leave'; goTo(c, ...P.frontOut); continue; }
      c.faceTo(jobFace(f), dt); c.play(FAULTS[f.kind].anim); f.prog += dt * .75 / FAULTS[f.kind].time; if (f.prog >= 1) { clearFault(f, c); c.state = 'leave'; goTo(c, ...P.frontOut); } continue; }
    if (c.state === 'leave') { if (walk(c, dt)) { c.o.removeFromParent(); mixers.splice(mixers.indexOf(c.mixer), 1); temps.splice(i, 1); } }
  }
}
function statusOf(c){
  const r = c.st.role;
  if (r === 'forklift') return c.seated ? ['truck', { park:'Parked', idle:'Ready', toPark:'Parking', toPallet2:'Fetching crates', loadPallet2:'Loading crates', toDrop:fork.dest === 'wh' ? 'Crates to the warehouse' : 'Crates to the truck', drop:'Unloading', toStore:'Fetching timber', loadStore:'Loading timber', toFeed2:'Timber to the saw', dropFeed2:'Feeding the saw' }[fork.state] || 'Driving'] : ['walk', 'Walking to the forklift'];
  if (c.state === 'break') return ['zzz', 'On break'];
  if (c.state === 'toBreak') return ['cup', 'Going on break'];
  if (c.state === 'slack') return ['phone', 'Slacking'];
  if (c.state === 'arrive') return ['walk', 'Arriving'];
  if (c.need) { const n = c.need; if (n.kind === 'drink') return n.stage === 'drink' ? ['drop', 'Having a drink'] : n.stage === 'qwait' ? ['wait', 'Waiting at the cooler'] : ['drop', 'Getting water'];
    return n.stage === 'queue' ? ['wait', 'Queueing for the toilet'] : n.stage === 'washing' ? ['drop', 'Washing hands'] : ['enter', 'inside', 'exit'].includes(n.stage) ? ['wc', 'In the toilet'] : ['wc', 'Off to the toilet']; }
  if (c.fjob === 'bottle') return ['drop', 'Swapping the water bottle'];
  if (c.fjob === 'wc') return ['broom', 'Cleaning the washroom'];
  if (c.st.role === 'cleaner') return ['broom', 'Waiting for the next job'];
  if (c.st.id < 0) return c.state === 'fixing' ? ['wrench', 'Repairing'] : ['walk', c.state === 'leave' ? 'Leaving' : 'Coming to fix it'];
  if (c.talk) return ['clip', 'Getting instructions'];
  if (r === 'operator') return c.st.mach === 'pipe' ? pipeReason().op : c.st.mach === 'tool' ? toolReason().op : sawReason().op;
  if (r === 'helper') return c.carryType === 'plank' || ['toRack', 'takeRack', 'toFeed', 'dropFeed'].includes(c.state) ? ['box', 'Feeding the crate machine'] : ['toTrolley', 'trolley'].some(k => (c.state || '').startsWith(k)) || c.trolley ? ['box', 'Restocking the line rack'] : ['wait', S.feed >= 6 ? 'In-feed full' : 'Rack empty'];
  if (r === 'loader') { if (['toPump', 'fill', 'toFiller', 'pour'].includes(c.state)) return ['drop', 'Fetching diesel'];
    if (c.carryType === 'coil' || ['toCoilBay', 'takeCoil', 'toPFeed', 'dropPFeed', 'toCoilDrop', 'dropCoil', 'toTFeed', 'dropTFeed'].includes(c.state)) return ['box', 'Moving a steel coil'];
    if (c.carryType === 'toolbox' || ['toTRack', 'takeTools', 'returnTools'].includes(c.state)) return ['box', 'Loading tools'];
    if (c.dest === 'wh' || ['toPalletWh', 'takePalletWh', 'toPRackWh', 'takePRackWh', 'toTRackWh', 'takeTRackWh', 'toWh', 'dropWh'].includes(c.state)) return ['box', 'Stocking the warehouse'];
    if (['toWhTake', 'takeWh'].includes(c.state)) return ['box', 'Fetching stock for the truck'];
    if (c.carryType === 'pipe' || ['toPRack', 'takePipes', 'returnPipes'].includes(c.state)) return ['box', 'Loading pipes'];
    if (['toUnload', 'takeLorry', 'toStore', 'dropStore'].includes(c.state)) return ['box', 'Unloading timber'];
    if (c.trolley || c.state === 'toTrolley') return ['box', 'Moving timber on the trolley'];
    if (c.state === 'toSweep' || c.state === 'sweeping') return ['wait', 'Sweeping the floor'];
    if (c.stack.length) return ['box', c.carryType === 'plank' ? 'Carrying timber' : 'Loading the truck'];
    if (c.state === 'waiting') return ['wait', truck.state === 'docked' ? 'Waiting' : 'Waiting for the truck']; return ['walk', 'Fetching']; }
  if (r === 'supervisor' && c.state === 'talking') return ['clip', 'Giving instructions'];
  if (r === 'supervisor' && ['toMeet', 'meet'].includes(c.state)) return ['clip', 'Taking the order from you'];
  if (r === 'supervisor' && ['toBrief', 'brief', 'toBriefL', 'briefL'].includes(c.state)) return ['clip', 'Briefing the crew'];
  if (r === 'supervisor') return c.state === 'check' ? ['clip', c.tgt && c.tgt.type === 'sign' ? 'Signing the delivery' : 'Checking'] : c.state === 'toTarget' ? ['walk', 'On the way'] : ['clip', 'Patrolling'];
  if (c.state === 'toJob') return ['walk', 'Going to a fault'];
  if (c.state === 'fixing') return ['wrench', 'Repairing'];
  if (c.state === 'toService' || c.state === 'service') return ['gear', 'Servicing'];
  return ['wait', 'At the bench'];
}

/* =====================================================================
   HIRING, TRAINING, UPGRADES
   ===================================================================== */
const hireCost = role => { if (S.freeHires > 0) return 0; const have = S.staff.filter(s => s.role === role).length; if (role === 'clerk' && !have && S.perks.freeClerk) return 0; return ROLE[role].cost[have] ?? PG.hirePrice(role, have, S.level); };
// one operator per machine actually on site; every other cap comes from the level table
// one operator per machine: the saw, the pipe mill from level 2, the tool press from level 3
// build 0.19: levels 1 and 2 are a small works: one loader at level 1 (no machine helper: the owner and Gus feed the
// saw), a second loader and the helper once the pipe machine runs at level 2
// Bible v2.0 12.2: the staffing matrix sets the posts of each role at each level, and a post exists only with its machine:
// one helper per machine (crate machine, then pipe mill, then tool press; the forklift feeds the second crate machine), and
// the second loader and the helper come at Level 2 once the pipe machine runs (12.6)
const helperMachines = () => ['saw', millReady() ? 'mill' : null, pressReady() ? 'press' : null, S.level >= 5 && typeof mill2Ready === 'function' && mill2Ready() ? 'mill2' : null].filter(Boolean);
const capOf = role => { if (role === 'electrician' || role === 'cleaner') return 0; const m = PG.roleCap(role, S.level);
  if (role === 'helper') return S.level === 1 || (S.level === 2 && !millReady()) ? 0 : Math.min(m, helperMachines().length);
  if (role === 'loader' && S.level === 2) return millReady() ? m : 1;
  return capOf0(role); };   // Bible 4.1: neither electricians nor cleaners are in the canonical list
const capOf0 = role => role === 'operator' ? Math.min(PG.roleCap('operator', S.level), 1 + (S.level >= 2 ? 1 : 0) + (S.level >= 3 ? 1 : 0) + (S.level >= 4 && S.lv4.saw2 >= 2 ? 1 : 0) + (S.level >= 5 && S.l5.mill2 >= 2 ? 1 : 0) + (S.level >= 8 && S.l8 && S.l8.lit ? 2 : 0)) : role === 'forklift' ? (S.level >= 8 && S.l8 && S.l8.pad ? 2 : S.level >= 4 ? 1 : 0) : PG.roleCap(role, S.level);
const nextOpMachine = () => S.level >= 8 && S.l8 && S.l8.lit && staffOf('operator').filter(c => c.st.mach === 'furnace').length < 2 ? 'furnace' : !sawOp() ? 'saw' : !pipeOp() ? 'pipe' : S.level >= 3 && !pressOp() ? 'tool' : S.level >= 4 && saw2Ready() && !saw2Op() ? 'saw2' : S.level >= 5 && mill2Ready() && !pipe2Op() ? 'pipe2' : 'saw';
function hire(role){
  if (role === 'supervisor' && S.level >= 4) return;   // Level Bible: from level 4 the supervisor is promoted from the crew
  const cost = hireCost(role); if (cost === undefined || S.cash < cost || S.staff.filter(s => s.role === role).length >= capOf(role)) return;
  S.cash -= cost; if (S.freeHires > 0 && cost === 0) { S.freeHires--; toast('One of Abel Thorne\'s nephews: no hiring fee.', 'gold'); } const [name, sur] = crewName(role); (S.castHired ||= {})[name] = true;
  const st = { id:S.nextId++, name, sur, role, lv:1, xp:0, energy:100, focus:100, look:newLook(role, FEM.has(name)) }; if (S.level === 1 && (role === 'operator' || role === 'loader')) { st.posted = false; st.loyal = true; } if (role === 'operator') { const m = nextOpMachine(); if (m !== 'saw') st.mach = m; } S.staff.push(st);
  const k = [...staffObj.values()].filter(o => o.state === 'arrive').length;   // hired together: they come in one behind another, from the pavement at the gate
  const c = spawnStaff(st, P.frontOut[0] + (k % 2 ? .45 : -.45), P.frontOut[1]); goTo(c, ...P.frontIn); c.state = 'arrive'; if (k) c.holdUntil = T + k * .8;
  if (carAtGate()) { c.o.visible = false; c.hideTillClear = true; }   // the car is passing the gate: they step out onto the verge once it has gone by
  sfx('hire'); toast(st.posted === false ? `${name} joins as your ${ROLE[role].title.toLowerCase()}. Meet ${name} at the gate and walk them to their post.` : `${name} joins as your ${ROLE[role].title.toLowerCase()}.`, 'good'); save(); checkCharter(); renderOffice();
}
function train(id){
  const st = S.staff.find(s => s.id === id); if (!st || !xpReady(st)) return; const cost = PG.trainCost(st.lv); if (S.cash < cost) return;
  S.cash -= cost; st.xp -= PG.xpNext(st.lv); st.lv++; sfx('levelup', .6); toast(`${st.name} is now level ${st.lv}: ${Math.round(lvSpeed(st) * 100)}% speed.`, 'gold');
  const c = staffObj.get(id); if (c) floatText(`Level ${st.lv}`, c.o.position.x, 1.6, c.o.position.z, 'info');
  if (S.level >= 3 && c && st.role !== 'supervisor' && st.role !== 'clerk') { st.trainUntil = S.time + 30; toast(`${st.name} goes to the training bench in the workshop for half an hour.`, ''); }   // v2.0 12.4: off his post for 30 game minutes
  save(); renderOffice();
}
function buyUpgrade(id){
  const u = UPGRADES.find(x => x.id === id), step = S.up[id] || 0; if (!u || !upgVisible(u) || step >= upSteps(u)) return; const cost = PG.stepCost(u, step); if (S.cash < cost) return;
  S.cash -= cost; S.up[id] = step + 1; sfx('buy'); toast(`${u.name} ${PG.roman(S.up[id])} installed.`, 'good');
  if (id === 'gen2' && step === 0) { noiseS(.5, 300, .06); setTimeout(() => { tone(55, 1.4, 'sawtooth', .03, 0, 110); noiseS(1.2, 600, .04); }, 600); for (const w of M.windows || []) w.material.emissiveIntensity = 1.4; toast('Old Faithful coughs out, the new set roars into life and every lamp brightens.', 'gold'); }
  if (id === 'stack') syncPallet(); if (id === 'radio' || id === 'reach') showZone(6); if (id === 'changeover') applyRestore('changeover', false); if (id === 'docklamps') buildDockLamps(); if (id === 'board4' && S.l7) S.l7.refillAt = S.time; applyUpgradeVisuals(); const at = (UPG_AT[id] || (() => P.desk))();   // every upgrade sparks where it is fitted; the office desk for anything without a place showUpg = { at, until:T + 5, name:u.name };
  for (let i = 0; i < 14; i++) spark(at[0] + rand(-.5, .5), rand(.6, 1.8), at[1] + rand(-.5, .5)); floatText(`${u.name} ${PG.roman(S.up[id])}`, at[0], 2.2, at[1], 'info');
  save(); checkCharter(); renderOffice();
}

/* =====================================================================
   CHARTER + LEVEL UP
   ===================================================================== */
const lineText = c => { const v = lineVal(c); return c.detail && !lineDone(c) ? c.detail(S) : c.money ? `${fmt(v)} / ${fmt(c.need)}` : c.pct ? `${v}% / ${c.need}%` : `${v} / ${c.need}`; };
const charterDone = () => charter().filter(lineDone).length;
function checkCharter(){
  if (S.levelUp || charterDone() < charter().length) return;
  S.levelUp = true; save(); owner.play('cheer'); owner.lock = 1.6; for (const c of staffObj.values()) if (c.state !== 'break') c.play('cheer');
  sfx('level'); confetti();
  setTimeout(showLevelUp, 1400);
}
let levelShot = null;
function yardShot(){ try { renderer.render(scene, cam); return renderer.domElement.toDataURL('image/jpeg', .55); } catch(e){ return null; } }
function showLevelUp(){ buzz(300); const now = yardShot();
  const n = S.level + 1, L = LEVELS[S.level], built = n <= MAX_LEVEL;
  $('luNum').textContent = String(n).padStart(2, '0'); $('luT').textContent = L.next;
  $('luP').textContent = { 2:'The crew runs itself, power flows and the orders keep coming. Your factory is back in business.', 3:'Two machines, two products and a generator that keeps up. Iron Valley is a real manufacturer now.', 4:'Three products, your own field and a licence from the council. The valley knows your name now.', 5:'Four machines, a forklift yard and a supervisor on the floor. Act I is done: the works is back on its feet.', 6:'Two docks, the weekly accounts paid and Gus\'s send-off in the snow. Iron Valley Manufacturing is a regional name.', 7:'A clerk, refitted machines and a service book. An industrial company in every sense.', 8:'Orders on the board, two supervisors and a siding approved. The valley\'s biggest employer.', 9:'Steel by rail and beams from the furnace. Act II is done: steel flows again in Iron Valley.' }[n] || '';
  const unl = { 2:[['gear', 'Pipe mill', 'Steel pipes'], ['bolt', 'Power limit', 'Generator Mk II'], ['people', 'Loaders', 'and the helper']], 3:[['gear', 'Tool press', 'Basic tools'], ['wrench', 'Issues', 'and repairs'], ['bolt', 'Mains power', 'Valley Electricity Board']],
    4:[['people', 'Supervisor zone', '+15% speed'], ['truck', 'Forklift', 'Marked lanes'], ['boxes', 'Mixed orders', 'Three products']], 5:[['coins', 'Pay day', 'The weekly accounts'], ['truck', 'Dock 2', 'Two orders at once'], ['gear', 'Second pipe mill', 'Ada\'s corner plot']],
    6:[['clip', 'June Finch', 'The clerk'], ['gear', 'Tier 2', 'Refits +25%'], ['wrench', 'Service book', 'Healthy or due']], 7:[['clip', 'Order board', 'Choose from three'], ['people', 'Second zone', 'Two supervisors'], ['truck', 'Siding', 'Survey with Cyrus Bell']],
    8:[['truck', 'Rail supplies', 'Valley Belle'], ['bolt', 'Furnace', 'Steel beams'], ['people', 'Foreman', 'Joe Brennan']] }[n] || [];
  $('luUnl').innerHTML = (levelShot && now ? `<div style="grid-column:1/-1;display:flex;gap:6px"><figure style="flex:1;margin:0"><img alt="The yard when the level began" src="${levelShot}" style="width:100%;border-radius:6px"><figcaption style="font-size:12px">Before</figcaption></figure><figure style="flex:1;margin:0"><img alt="The yard now" src="${now}" style="width:100%;border-radius:6px"><figcaption style="font-size:12px">After</figcaption></figure></div>` : '') + unl.map(([i, a, b]) => `<div>${icon(i)}<b style="color:var(--chalk)">${a}</b><br>${b}</div>`).join('');
  $('luNote').textContent = built ? 'Everything you own carries over: cash, crew, machines and upgrades.' : n === 9 ? 'Act II is complete: steel flows again in Iron Valley. Act III, Run the Plant, is coming soon. The works keeps running and everything you earn carries over.' : `Level ${n} opens in the next build. Keep the orders moving: everything you earn carries over.`;
  if (!built && n === 9 && !S.actEnd2) { S.actEnd2 = true; story({ kind:'courier', level:9 }); save(); }
  $('luOk').textContent = built ? `Open level ${n}` : 'Keep playing'; $('levelup').hidden = false;
}
// v2.0 3.4: a level opens on its own date. With the charter done the knocking-off whistle goes early; after the day book
// the office calendar loses its pages to the new level's date, the Courier prints, and the gates open on day one.
$('luOk').addEventListener('click', () => { $('levelup').hidden = true; if (!(S.levelUp && S.level < MAX_LEVEL)) return;
  if (!S.tutDone || !S.day) { startLevel(S.level + 1); return; }
  S.nextLevel = S.level + 1; save();
  if (!S.day.closing) { toast(`Charter done. The whistle goes early: Level ${S.nextLevel} opens in the morning.`, 'gold'); knockOff(dayNo() + 1); } });

/* =====================================================================
   OFFICE
   ===================================================================== */
let tab = 'staff', officeOpen = false;
function officeDot(){ $('officeDot').hidden = !S.staff.some(xpReady); }
function openOffice(t){ if (t) tab = t; officeOpen = true; animSheet(); S.officeSeen = true; keys.clear(); joy.on = false; $('joy').hidden = true; renderOffice(); $('office').hidden = false; sfx('tap'); }
function closeOffice(){ if (!officeOpen) return; officeOpen = false; $('office').hidden = true; if (showUpg) showUpg.until = T + 5; }
$('offClose').addEventListener('click', closeOffice);
$('office').addEventListener('click', e => { if (e.target.id === 'office') closeOffice(); });
$('officeBtn').addEventListener('click', () => openOffice());
$('lvl').addEventListener('click', () => S.levelUp && S.level < MAX_LEVEL ? showLevelUp() : openOffice('charter'));
$('ticket').addEventListener('click', () => openOffice('orders')); $('ticket2').addEventListener('click', () => openOffice('orders'));
// the owner can answer a ringing phone anywhere: the office line forwards to his mobile
function answerCall(){ if (!S.call) return; owner.say = { text:'Iron Valley Works, hello?', until:T + 1.8 }; S.answeredRemote = (S.answeredRemote || 0) + 1; openOffice('orders'); }
$('callc').addEventListener('click', answerCall);
$('callc').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answerCall(); } });
const TAB_IC = { orders:'clip', finance:'coins', staff:'people', stock:'boxes', plant:'gear', lines:'saw', upgrades:'bulb', town:'back', charter:'star' };
function pageTurn(){ const B = $('offBody'); B.scrollTop = 0; B.classList.remove('turn'); void B.offsetWidth; B.classList.add('turn'); }
function animSheet(){ const sh = document.querySelector('#office .sheet'); if (!sh) return; sh.classList.remove('anim'); void sh.offsetWidth; sh.classList.add('anim'); clearTimeout(animSheet.t); animSheet.t = setTimeout(() => sh.classList.remove('anim'), 700); }
const TABS = [['orders', 'Orders'], ['finance', 'Finance'], ['staff', 'Staff'], ['stock', 'Stock'], ['plant', 'Machines'], ['lines', 'Plant'], ['upgrades', 'Upgrades'], ['town', 'Town'], ['charter', 'Charter']];
let lastSig = '';
function officeSig(){ return [tab, S.mains.st, S.mains.st && S.mains.st < 3 ? Math.ceil(S.mains.t) : 0, armed.key && T < armed.until ? armed.key : '', Math.floor(S.cash / 5), !!S.call, S.store, S.timber, S.delivery && S.delivery.left, sup.state, S.order && S.order.briefed, S.rep | 0, S.bed, S.order && S.order.id, S.order && S.order.ready, JSON.stringify(S.up), S.delivered, S.bills, Math.floor(S.power.fuel / 5),
  JSON.stringify(S.power.breakers), S.faults.map(f => f.id + ':' + f.diag + ':' + Math.floor(f.prog * 10) + ':' + f.contractor).join(','), Math.floor(S.cond.saw / 5), Math.floor(S.cond.engine / 5), Math.floor(S.cond.wiring / 5),
  S.level, S.water, Math.floor(S.cooler / 3), Math.floor(S.wcClean / 10), S.lv2.mill, S.coils, S.coilFeed, S.pipes, S.pbed, S.pshipped, Math.floor(S.cond.pipe / 5), S.staff.map(s => s.id + ':' + s.lv + ':' + xpReady(s) + ':' + Math.floor(s.xp / 25) + ':' + Math.floor(s.energy / 25) + ':' + Math.floor((s.focus ?? 100) / 25)).join(','), S.levelUp, charterDone(), S.lv2.wh, S.wh.c, S.wh.p, S.wh.make, S.lv3.field, S.lv3.press, S.lv3.licence, S.parts, S.tools, S.tbed, S.tshipped, Math.floor(S.cond.tool / 5), S.level >= 5 ? JSON.stringify([S.l5.bill && S.l5.bill.id, S.l5.bill && S.l5.bill.late, Math.floor(((S.l5.bill ? S.l5.bill.due : S.l5.nextBill) - S.time) / 5), S.l5.account, S.l5.loan, S.order2 && S.order2.l, S.order2 && S.order2.ready, truckB.state, S.order && S.order.lateBy, S.order2 && S.order2.lateBy, S.l5.mill2, S.l5.rack2, S.wh.c, S.wh.p, S.wh.t]) : ''].join('|'); }
const bar = (v, cls = '') => `<span class="mini ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></span>`;
function faultStatus(f){
  const def = FAULTS[f.kind], fixer = f.by && staffObj.get(f.by);
  if (!f.diag) return hasRole('supervisor') ? 'Your supervisor is going to look' : 'Not inspected yet: walk over to it';
  if (fixer) return `${fixer.st.name} is ${fixer.state === 'fixing' ? `fixing it (${Math.floor(f.prog * 100)}%)` : 'on the way'}`;
  if (f.contractor) return `Contractor from town ${f.prog > 0 ? `fixing (${Math.floor(f.prog * 100)}%)` : 'on the way'}`;
  if (f.kind === 'powercut' && !fixerOn('electrician')) return `Half speed. Passes by itself in ${Math.max(0, Math.ceil(30 - f.t))} s`;
  if (f.guided) return `Fix it yourself: stand in the ring (${Math.floor(f.prog * 100)}%)`;
  if (!hasRole(def.trade)) return `Fix it yourself in the ring, or a contractor comes in ${Math.max(0, Math.ceil(60 - f.diagT))} s ($45)`;
  return `Waiting for the ${def.trade}`;
}
// a button that needs a second tap within 4 s (the viewer never shows confirm dialogs); the armed state lives here,
// not on the element, so the office re-rendering between the taps cannot lose it
let armed = { key:null, until:0 };
const armedBtn = (k, label, sure) => armed.key === k && T < armed.until ? `<button class="btn primary" data-armed="${k}" type="button">${sure}</button>` : `<button class="btn" data-armed="${k}" type="button">${label}</button>`;
function renderOffice(){
  if (!officeOpen) return;
  lastSig = officeSig();
  $('offSub').textContent = `${fmt(S.cash)} cash · ${S.staff.length} staff · reputation ${Math.round(S.rep)}%`;
  baroDraw();
  const tabKey = tab + '|' + S.level + '|' + S.staff.some(xpReady); const tabsChanged = tabKey !== renderOffice.tabKey; renderOffice.tabKey = tabKey;
  if (tabsChanged) $('tabs').innerHTML = TABS.filter(([k]) => k !== 'finance' || S.level >= 5).map(([k, n]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${icon(TAB_IC[k] || 'box')}<span>${n}</span>${k === 'staff' && S.staff.some(xpReady) ? '<i class="dot"></i>' : k === 'plant' && S.faults.length ? '<i class="dot bad"></i>' : k === 'orders' && S.call ? '<i class="dot bad"></i>' : k === 'finance' && S.level >= 5 && S.l5.bill ? '<i class="dot bad"></i>' : k === 'stock' && timberLow() ? '<i class="dot"></i>' : ''}</button>`).join('');
  if (tabsChanged) $('tabs').classList.toggle('nine', $('tabs').children.length > 8);   // nine tabs from Level 5: two rows of five, not a lone third row
  if (tabsChanged) $('tabs').querySelectorAll('.tab').forEach(b => b.onclick = () => { if (tab === b.dataset.tab) return; tab = b.dataset.tab; pageTurn(); renderOffice(); sfx('tap', .5); });
  const B = $('offBody'); let h = '';
  if (tab === 'staff') {
    h += S.letter ? gusCard() : '';
    h += S.staff.length ? `<p class="note">Everyone works in their own trade. Machines nobody works, you can run yourself; once the crew is on them you only instruct. Train people here to make them faster.</p>`
      : `<p class="note">It is just you for now: stand at the saw to cut, carry crates to the truck, fill the generator. Each hire takes a job off your hands.</p>`;
    for (const [key, title, sub, ic, roles0, open0] of DEPTS) { if (key === 'facilities' && !WELFARE) continue;
      const shut = roles0 && roles0.every(r => capOf(r) === 0), roles = shut ? null : roles0;
      const openAt = shut ? Array.from({ length:PG.LAST_LEVEL }, (_, i) => i + 1).find(l => roles0.some(r => PG.roleCap(r, l) > 0)) : open0;
      if (!roles) { h += `<div class="dept locked"><div class="dept-h"><span class="ic">${icon(ic)}</span><div><b>${title}</b><small>${sub}</small></div><span class="cap">${icon('lock').replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px"')} Level ${openAt}</span></div></div>`; continue; }
      const n = S.staff.filter(s => roles.includes(s.role)).length, cap = roles.reduce((a, r) => a + capOf(r), 0);
      h += `<div class="dept"><div class="dept-h"><span class="ic">${icon(ic)}</span><div><b>${title}</b><small>${sub}</small></div><span class="cap">${n} / ${cap}</span></div>`;
      for (const role of roles) {
        for (const st of S.staff.filter(s => s.role === role)) { const c = staffObj.get(st.id), [, sl] = c ? statusOf(c) : ['', '']; const next = PG.xpNext(st.lv) || 1, ready = xpReady(st), cost = PG.trainCost(st.lv), col = ROLE[role].col.suit;
          h += `<div class="staff"><div class="av" style="border-color:${col};background:${col}55">${icon(ROLE[role].icon, '#ece6d9', 2)}</div>
            <div class="nm">${st.name} <span class="role">${ROLE[role].title}${st.mach === 'pipe' ? ' · mill' : st.mach === 'tool' ? ' · press' : st.mach === 'saw2' ? ' · saw 2' : st.mach === 'pipe2' ? ' · mill 2' : S.level >= 2 && role === 'operator' ? ' · saw' : ''}</span><span class="lv">LV ${st.lv}</span></div>
            ${st.lv >= maxLv() ? `<span class="note">Top level for now${S.level < PG.LAST_LEVEL ? ` (level ${S.level + 1} raises it to ${PG.workerLvCap(S.level + 1)})` : ''}</span>` : `<button class="btn ${ready ? 'go' : ''}" data-train="${st.id}" ${ready && S.cash >= cost ? '' : 'disabled'}>Train<small>${ready ? fmt(cost) : `${Math.floor(st.xp)}/${next} XP`}</small></button>`}
            <div class="meta"><span>${sl}</span><span>Rating ${ratingOf(st)}%</span><span>Skill${bar(ratingOf(st))}</span>${['operator', 'loader'].includes(role) && S.level >= 4 ? `<span>Focus${bar(st.focus ?? 100, 'focus')}</span>` : ''}</div>${S.level >= 4 && staffOf('supervisor').length < Math.max(1, capOf('supervisor')) && role === 'operator' && st.lv < 5 ? '<small class="note">Supervisor from worker level 5</small>' : ''}${canPromote(st) ? `<button class="btn go promo" data-promote="${st.id}" type="button" ${S.cash >= promoteCost() ? '' : 'disabled'}>Promote to supervisor<small>${fmt(promoteCost())} raise</small></button>` : ''}${role === 'supervisor' && S.level >= 4 ? `<button class="btn promo" data-movepost="${st.id}" type="button">${st.post || (st.id === (supervisor() || { st:{} }).st.id && S.lv4.post) ? 'Move the post' : 'Lead to a post'}<small>${st.name} follows you</small></button>` : ''}</div>`; }
        const have = S.staff.filter(s => s.role === role).length, cost = hireCost(role);
        if (have < capOf(role)) h += `<div class="hire"><p><b style="color:var(--chalk)">${role === 'operator' ? { saw:'Saw operator', pipe:'Pipe mill operator', tool:'Tool press operator', saw2:'Second saw operator', pipe2:'Second pipe mill operator' }[nextOpMachine()] : ROLE[role].title}.</b> ${role === 'operator' ? { saw:'Runs the saw so you don\'t have to: cuts every crate the orders need.', pipe:'Runs the pipe mill: threads the steel coils and forms the pipes.', tool:'Runs the tool press on the North field: threads the steel coils and stamps the tools.', saw2:'Runs the second crate machine in the forklift yard.', pipe2:'Runs the second pipe mill on the road frontage: its pipes go out from dock 2.' }[nextOpMachine()] : ROLE[role].job}${S.freeHires > 0 ? ' <b style="color:var(--cash)">No fee: one of Abel Thorne\'s nephews.</b>' : ''}</p><button class="btn primary" data-hire="${role}" ${S.cash >= cost ? '' : 'disabled'}>Hire<small>${fmt(cost)}</small></button></div>`;
        else if (role === 'supervisor' && S.level >= 4 && !have) h += `<div class="hire"><p><b style="color:var(--chalk)">Supervisor.</b> Promoted from your own crew, not hired: pick an operator or a loader above (${fmt(promoteCost())} raise), then lead them to their post. Everyone in the blue ring works 15% faster and nobody slacks.</p></div>`;
        else if (role === 'operator' && S.level < 3) h += `<div class="hire"><p>One operator per machine. ${S.level < 2 ? 'The pipe mill and its operator arrive at Level 2.' : 'The tool press and its operator arrive at Level 3.'}</p></div>`;
      }
      h += `</div>`;
    }
  }
  if (tab === 'plant') {
    const kwL = load(), cap = supplyKW();
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('saw')}</span><div><b>Machines</b><small>Ratings run from 10% (as found) to 100% (the best in the whole game): upgrades raise them</small></div></div>
      <div class="kv"><span>Crate machine ${bar(sawRating())}</span><span>${sawRating()}% · ${Math.round(60 / (SAW_CYCLE / sawK()))} crates/min</span>
      <span>Generator load ${bar(kwL / cap * 100, kwL > cap ? 'low' : '')}</span><span>${kwL.toFixed(1)} of ${cap} kW</span></div></div>`;
    const kw = load(), run = genRunning();
    h += mainsHtml(); if (S.level >= 8 && M.l8Built) h += l8Html();
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('bolt')}</span><div><b>Power</b><small>${mainsUp() ? 'Mains transformer' : S.up.gen2 ? 'Generator Mk II' : 'Diesel generator'} → switchboard → ${pressReady() ? 'five' : millReady() ? 'four' : 'three'} circuits</small></div><span class="cap ${powerOn() ? 'ok' : 'badt'}">${powerOn() ? 'ON' : 'OFF'}</span></div>
      <div class="kv"><span>Generator</span><span>${mainsUp() ? 'Standby: starts by itself in a power cut' : !run ? (S.power.fuel <= 0 ? 'Out of diesel' : 'Engine stalled') : powerOn() ? (mainsLive() ? 'Running as the backup' : 'Running') : 'No output'}</span>
      ${!suppliesFree() ? `<span>Diesel ${bar(S.power.fuel, S.power.fuel < 25 ? 'low' : '')}</span><span>${Math.round(S.power.fuel)}%</span>` : ''}
      <span>Load ${bar(kw / supplyKW() * 100, 'xp')}</span><span>${kw.toFixed(1)} / ${supplyKW()} kW${kw > supplyKW() ? ' · overloaded' : ''}</span>
      ${Object.entries(CIRCUITS).filter(([k]) => circuitShown(k)).map(([k, c]) => `<span>${c.name}</span><span class="${circuitOn(k) ? 'ok' : 'badt'}">${!S.power.breakers[k] ? 'Breaker tripped' : circuitOn(k) ? 'On' : 'Off'}</span>`).join('')}</div></div>`;
    if (S.level < 3) h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Breakdowns</b><small>None at this stage</small></div><span class="cap ok">ALL RUNNING</span></div><div class="kv"><span>Jams, worn parts and power cuts</span><span>From level 3</span><span>Mechanic and repairs</span><span>From level 3</span></div></div>`;
    else {
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Condition</b><small>Worn kit breaks more often. Idle specialists service it.</small></div></div>
      <div class="kv"><span>Crate machine ${bar(S.cond.saw)}</span><span>Mechanic</span><span>Generator engine ${bar(S.cond.engine)}</span><span>Mechanic</span><span>Wiring and switchboard ${bar(S.cond.wiring)}</span><span>Mechanic</span>${millReady() ? `<span>Pipe mill ${bar(S.cond.pipe)}</span><span>Mechanic</span>` : ''}${pressReady() ? `<span>Tool press ${bar(S.cond.tool)}</span><span>Mechanic</span>` : ''}</div></div>`;
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('alert')}</span><div><b>Faults</b><small>Inspect a fault to find out whose trade it is</small></div><span class="cap">${S.faults.length} open · ${S.fixed} fixed</span></div>`;
    h += S.faults.length ? S.faults.map(f => `<div class="flt"><b>${f.diag ? FAULTS[f.kind].name : 'Unknown fault'}</b><small>${f.diag ? `${ROLE[FAULTS[f.kind].trade].title}'s job · ` : ''}${faultSymptom(f)} at the ${WHERE[f.where].name}</small><span>${faultStatus(f)}</span></div>`).join('') : `<div class="kv"><span>Everything is running.</span><span></span></div>`;
    h += `</div><div class="dept"><div class="dept-h"><span class="ic">${icon('coins')}</span><div><b>Running costs</b><small>Paid from the next delivery</small></div></div><div class="kv"><span>Bills due (diesel, callouts)</span><span>${fmt(S.bills)}</span><span>Paid so far</span><span>${fmt(S.billsPaid)}</span></div></div>`; }
  }
  if (tab === 'upgrades') {
    let g = null;
    h += `<div class="dept">`;
    for (const u of [...UPGRADES].filter(upgVisible).sort((a, b) => (b.lv || 1) - (a.lv || 1))) { const st = S.up[u.id] || 0, cost = PG.stepCost(u, st), mx = upSteps(u), nextLv = PG.nextTierLevel(u, st);
      if (u.group !== g) { if (g) h += `</div><div class="dept">`; g = u.group; h += `<div class="dept-h"><div><b>${g}</b></div></div>`; }
      h += `<div class="up"><span class="ic">${icon(u.icon)}</span><div><b>${u.name}${u.lv > 1 ? ' <span class="lvtag">L' + u.lv + '</span>' : ''}</b><span class="pips">${Array.from({ length:Math.min(mx, 10) }, (_, i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</span></div>
        ${st >= mx ? `<span class="note">${nextLv ? `More at level ${nextLv}` : 'Maxed'}</span>` : `<button class="btn primary" data-up="${u.id}" ${S.cash >= cost ? '' : 'disabled'}>${fmt(cost)}</button>`}<p>${u.desc} Step ${st} of ${mx}${nextLv && nextLv > S.level ? ` (more steps open at level ${nextLv})` : ''}.</p></div>`; }
    h += `</div><p class="note">Workshop repairs (lights, windows, floor, coffee, the back yard) are bought on the yellow pads around the site.</p>`;
  }
  if (tab === 'charter') {
    const L = LEVELS[S.level]; h += skillsHtml() + trophiesHtml() + settingsHtml();
    h += `<p class="note">To become a <b style="color:var(--chalk)">${L.next}</b> (Level ${S.level + 1}), tick every line. A ticked line stays ticked.</p>${CHOICE[S.level] ? `<p class="note"><b style="color:var(--chalk)">This level's choice:</b> ${CHOICE[S.level]}</p>` : ''}<div class="dept">`;
    for (const c of charter()) { const done = lineDone(c);
      h += `<div class="line ${done ? 'done' : ''}"><span class="tick"></span><span><span class="k">${c.k}</span>${c.text}</span><span class="v">${lineText(c)}</span></div>`; }
    const brings = rows => `</div><div class="dept"><div class="dept-h"><div><b>Level ${S.level + 1} brings</b><small>${L.next}</small></div></div><div class="kv">${rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</div></div>`;
    h += S.level === 1 ? brings([['Pipe mill and steel pipes', `${fmt(MILL_PRICE)} machine · ${fmt(PIPE_PRICE)} a pipe`], ['Second operator', 'Opens'], ['Generator Mk II', 'No more stalls'], ['Warehouse in the back yard', 'Make to stock'], ['North field for sale', 'Vera Lind, estate agent']])
      : S.level === 2 ? brings([['Tool press and basic tools', `${fmt(PRESS_PRICE)} machine · ${fmt(TOOL_PRICE)} a tool`], ['Electrician and mechanic', 'Open'], ['Jams, worn parts, power cuts', 'About one every 3 minutes'], ['Scrapyard next door for sale', 'Rusty Pike'], ['Trading licence', `${fmt(LICENCE_PRICE)} at the Town tab`]])
      : S.level === 3 ? brings([['Second crate machine', `${fmt(SAW2_PRICE)}, or free with Rusty's sweetener`], ['Forklift and driver', 'Crates and timber to and from the yard'], ['Supervisor', 'Promoted from your crew: +15% in the zone'], ['Generator Mk III', '+6 kW a step'], ['Road frontage for sale', 'Valley Council'] ])
      : S.level === 4 ? brings([['Second dock and white truck', 'On the road frontage: two orders at once'], ['Wages and power bills', 'Every 6 minutes'], ['The Valley Bank', 'Eldon Graves: an account and loans'], ['Second pipe mill', `${fmt(MILL2_PRICE)} on the frontage`], ['Rush orders and late trucks', 'Once a day, and now and then']])
      : brings([['Office clerk', 'Pays the bills for you'], ['A bigger office', 'On the corner shop plot'], ['Engineering shop', 'Planned']]);
    h += roadAhead();
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('back')}</span><div><b>Start a new game</b><small>Back to level 1: the letter, $400 and nobody on the payroll. This game's progress is lost.</small></div></div>
      <div class="call-b">${armedBtn('newgame', 'Start over from level 1', 'Tap again to start over<small>this game is lost</small>')}</div></div>`;
  }
  if (tab === 'town') {
    h += `<p class="note">The valley around the works: land for sale through Vera Lind, the people you have met and the council's papers.</p><div class="dept"><div class="dept-h"><span class="ic">${icon('sign')}</span><div><b>Land</b><small>Each level buys the plot the next one builds on</small></div></div>`;
    for (const [id, pl] of Object.entries(PLOTS)) { const st = plotSt(id), p = S.plots[id];
      h += `<div class="up"><span class="ic">${icon('sign')}</span><div><b>${pl.name}</b><span class="note">${PEOPLE[pl.seller].name} · ${fmt(pl.price)} + 5%</span></div>${st === 0 && S.level >= pl.lv ? `<button class="btn primary" data-deal="${id}" type="button">Offers</button>` : `<span class="note">${st === 3 ? (id === 'scrap' && S.level < 4 ? 'Owned · yard opens at level 4' : 'Owned') : st === 2 ? 'Site work' : st === 1 ? `Permit ${Math.max(0, Math.ceil(p.permit - p.t))} s` : `Level ${pl.lv}`}</span>`}
        <p>${pl.adds}.</p></div>`; }
    h += `</div><div class="dept"><div class="dept-h"><span class="ic">${icon('star')}</span><div><b>People</b><small>${Object.keys(S.met).length} met</small></div></div><div class="kv">${Object.entries(PEOPLE).map(([id, p]) => `<span>${S.met[id] ? p.name : '?'}</span><span>${S.met[id] ? p.role : 'Not met yet'}</span>`).join('')}</div></div>`;
    if (S.level >= 3) { const L = S.lv3, st = L.licence || 0, live = st === 3 || st === 2 || st === 4;
      h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>Trading licence</b><small>The council's checklist. Inspector Ada Hale checks each line on site</small></div><span class="cap ${st === 2 ? 'ok' : st === 4 ? 'badt' : ''}">${['NONE', 'BOOKED', 'GRANTED', 'INSPECTING', 'NOT YET'][st]}</span></div>
        <ul class="checks">${INSPECT.map(c => { const v = live && L.check ? L.check[c.id] : undefined, now = c.ok();
          return `<li class="${v === true || (v === undefined && now) ? 'ok' : v === false || (v === undefined && st !== 3) ? 'bad' : ''}"><span class="box">${v === true || (v === undefined && now) ? '✓' : v === false ? '✗' : ''}</span><span>${c.text}${!now && st !== 2 ? `<small>${c.fix}</small>` : ''}</span></li>`; }).join('')}</ul>
        ${st === 2 ? '<div class="kv"><span>Status</span><span>Granted: certificate on the office wall</span></div>'
          : st === 3 ? `<div class="kv"><span>Status</span><span>Inspecting: ${Object.keys(L.check || {}).length} of ${INSPECT.length} checked</span></div>`
          : st === 1 ? `<div class="kv"><span>Status</span><span>Inspector arrives in ${Math.max(0, Math.ceil(LICENCE_WAIT - L.licT))} s</span></div>`
          : `<div class="up"><span class="ic">${icon('clip')}</span><div><b>${st === 4 ? 'Re-inspection' : 'Apply'}</b><span class="note">${licReady() ? 'Every line is ticked: you should pass' : `${INSPECT.filter(c => !c.ok()).length} line(s) not ready yet`}</span></div><button class="btn primary" data-licence="1" ${S.cash >= (st === 4 ? REINSPECT_PRICE : LICENCE_PRICE) ? '' : 'disabled'}>${fmt(st === 4 ? REINSPECT_PRICE : LICENCE_PRICE)}</button><p>The inspector comes about ${LICENCE_WAIT} s later and walks the site. Anything not ready on the day fails.</p></div>`}</div>`;
    } else h += `<div class="dept locked"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>Trading licence</b><small>The council issues it from level 3 (${fmt(LICENCE_PRICE)})</small></div></div></div>`;
  }
  if (tab === 'finance' && S.level >= 5) h += financeHtml() + ledgerHtml();
  if (tab === 'orders') {
    const o = S.order; if (boardOn()) h += boardHtml();
    if (S.call) { const c = S.call; h += `<div class="call"><div class="call-h">${icon('phone')}<div><b>Phone: ${c.client}${c.rush ? ' · RUSH' : ''}</b><small>${c.dock === 2 ? (c.rush ? 'Rush order for dock 2: from stock, short deadline, pays 50% more' : 'For dock 2: ships from stock (warehouse and the second mill\'s rack)') : 'New order on the line'}</small></div></div>
      <div class="kv">${S.level >= 3 ? `<span>Estimated profit</span><span class="${c.pay - cardCost(c) > 0 ? 'ok' : 'badt'}">${fmt(c.pay - cardCost(c))} (estimate: materials, wages, power)</span><span>Machine hours</span><span>${cardHours(c).toFixed(1)} h</span><span>This week</span><span>${({ fits:'Fits this week', tight:'Tight', next:'Will not fit before Friday' })[cardFits(c)]}</span>` : ''}${c.qty ? `<span>Wooden crates</span><span>${c.qty}</span>` : ''}${c.pq ? `<span>Steel pipes</span><span>${c.pq}</span>` : ''}${c.tq ? `<span>Basic tools</span><span>${c.tq}</span>` : ''}<span>Pays</span><span>${fmt(c.pay)}</span><span>Deadline after you accept</span><span>${c.nodl ? 'None on the first order' : c.deadline + ' s'}</span>${c.dock === 2 ? `<span>In stock now</span><span>${S.wh.c} crates · ${S.wh.p + S.l5.rack2} pipes · ${S.wh.t} tools</span>` : c.qty && !timberFree() ? `<span>Timber needed</span><span>${c.qty} planks (you have ${S.store + S.timber + S.feed})</span>` : ''}${c.pq ? `<span>Steel needed</span><span>${Math.ceil(c.pq / COIL_PIPES)} coils (you have ${steelPipes()} pipes' worth)</span>` : ''}${c.tq ? `<span>Steel for tools</span><span>${Math.ceil(c.tq / COIL_TOOLS)} coils</span>` : ''}</div>
      ${termsOk(c) ? `<div class="terms">${['regular', 'rush', 'bulk'].map(k => { const v = withTerms(c, k), what = [v.qty ? `${v.qty} crates` : '', v.pq ? `${v.pq} pipes` : ''].filter(Boolean).join(', ');
        return `<button class="btn ${k === 'regular' ? 'primary' : ''}" data-accept="${k}" type="button"><b>${k === 'regular' ? 'Regular' : k === 'rush' ? 'Rush' : 'Bulk'}</b><small>${what} · ${fmt(v.pay)} · due ${dueAt(v.deadline)}${k === 'rush' ? ' · lorry won\'t wait' : ''}</small></button>`; }).join('')}</div>
      <div class="call-b"><button class="btn" data-decline>Decline<small>reputation −2</small></button></div></div>`
      : `<div class="call-b"><button class="btn primary" data-accept>Accept the order</button><button class="btn" data-decline>Decline<small>reputation −2</small></button></div></div>`}`; }
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>Current order</b><small>${o ? o.client : S.call ? 'Take the call above' : 'No order right now'}</small></div></div>`;
    h += o ? `<div class="kv">${o.qty ? `<span>Crates loaded</span><span>${S.bed} / ${o.qty}</span><span>Cut so far</span><span>${o.cut} / ${o.qty}</span>` : ''}${o.pq ? `<span>Pipes loaded</span><span>${S.pbed} / ${o.pq}</span><span>Formed so far</span><span>${o.pcut || 0} / ${o.pq}</span>` : ''}${o.tq ? `<span>Tools loaded</span><span>${S.tbed} / ${o.tq}</span><span>Stamped so far</span><span>${o.tcut || 0} / ${o.tq}</span>` : ''}<span>Crew briefed</span><span>${o.briefed ? 'Yes' : hasRole('supervisor') ? 'Supervisor on the way' : `No: brief ${(orderOp(o) || { st:{ name:'the operator' } }).st.name}`}</span><span>Payment</span><span>${fmt(o.pay)}</span><span>Bills due</span><span>-${fmt(S.bills)}</span><span>Time left</span><span>${o.nodl ? 'No deadline' : o.time > o.deadline ? 'Late: half pay' : Math.ceil(o.deadline - o.time) + ' s'}</span><span>Delivery note</span><span>${o.ready ? 'Ready to sign' : 'Loading'}</span>${S.level >= 5 ? `<span>Truck</span><span>${truckText(truck, o, 1)}</span>` : ''}</div>${haulierBtn(o, 1)}${o.ready ? '' : `<div class="call-b">${armedBtn('giveup', 'Give up this order<small>reputation −6</small>', 'Tap again to give up<small>reputation −6</small>')}</div>`}` : (S.call ? '' : `<div class="kv"><span>Waiting for the phone to ring.</span><span></span></div>`);
    if (S.level >= 5 && M.l5Built) { const o2 = S.order2;
      h += `</div><div class="dept"><div class="dept-h"><span class="ic">${icon('truck')}</span><div><b>Dock 2${o2 && o2.rush ? ' · RUSH' : ''}</b><small>${o2 ? `${o2.client} · ships from stock` : 'No order: the next call may be for dock 2'}</small></div></div>`;
      if (o2) h += `<div class="kv">${o2.qty ? `<span>Crates loaded</span><span>${o2.l.c} / ${o2.qty}</span>` : ''}${o2.pq ? `<span>Pipes loaded</span><span>${o2.l.p} / ${o2.pq}</span>` : ''}${o2.tq ? `<span>Tools loaded</span><span>${o2.l.t} / ${o2.tq}</span>` : ''}<span>Payment</span><span>${fmt(o2.pay)}</span><span>Time left</span><span>${o2.time > o2.deadline ? 'Late: half pay' : Math.ceil(o2.deadline - o2.time) + ' s'}</span><span>White truck</span><span>${truckText(truckB, o2, 2)}</span>${short2() ? `<span>Short of stock</span><span>${short2()}</span>` : ''}</div>${haulierBtn(o2, 2)}`; }
    h += `</div><div class="dept"><div class="dept-h"><span class="ic">${icon('star')}</span><div><b>Reputation ${Math.round(S.rep)}% · ${repBand()[1]}</b><small>On time +2 · early +3 · late −3 · given up −6 · declined −2</small></div></div>
      <div class="kv"><span>Delivered</span><span>${S.delivered}</span><span>On time</span><span>${S.ontime}</span><span>Crates shipped</span><span>${S.shipped}</span>${S.level >= 2 ? `<span>Pipes shipped</span><span>${S.pshipped}</span>` : ''}${S.level >= 3 ? `<span>Tools shipped</span><span>${S.tshipped}</span>` : ''}</div>
      ${S.history.length ? `<div class="hist">${S.history.map(x => `<i class="${x.late ? 'late' : ''}">#${x.id} ${x.late ? 'LATE' : 'ON TIME'} ${fmt(x.net)}</i>`).join('')}</div>` : ''}</div>`;
  }
  if (tab === 'lines') h += linesHtml();
  if (tab === 'stock') {
    const d = S.delivery, room = storeCap() - S.store; h += coverHtml();
    if (timberFree()) h += `<p class="note">Timber is on Valley Timber Co.'s standing account: their lorry keeps the stock room and the line rack full, so the crate machine never waits for planks. One plank makes one crate.</p>
      <div class="dept"><div class="dept-h"><span class="ic">${icon('box')}</span><div><b>Timber</b><small>Free on account for levels 1 and 2</small></div><span class="cap ok">ALWAYS STOCKED</span></div>
      <div class="kv"><span>Stock room</span><span>Full</span><span>Line rack by the machine</span><span>Full</span><span>Machine in-feed</span><span>Full</span><span>You pay for timber and diesel</span><span>From level 3</span></div></div>`;
    else {
    h += `<p class="note">You buy the timber. The supplier's lorry delivers it to the stock room beside the dock; loaders unload it and take it to the saw on the trolley. One plank makes one crate.</p>`;
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('box')}</span><div><b>Timber</b><small>Stock room, line rack by the saw, in-feed</small></div><span class="cap ${timberLow() ? 'badt' : ''}">${S.store + S.timber + S.feed} planks</span></div>
      <div class="kv"><span>Stock room ${bar(S.store / storeCap() * 100)}</span><span>${S.store} / ${storeCap()}</span><span>Line rack ${bar(S.timber / LINE_CAP * 100)}</span><span>${S.timber} / ${LINE_CAP}</span><span>Saw in-feed</span><span>${S.feed} / 6</span>
      <span>On order</span><span>${d && d.kind !== 'steel' ? `${d.left} planks · ${sup.state === 'parked' ? 'unloading' : sup.state === 'arrive' ? 'lorry arriving' : 'lorry on its way'}` : 'Nothing'}</span>${S.order ? `<span>Current order still needs</span><span>${Math.max(0, S.order.qty - S.order.cut)} planks</span>` : ''}</div></div>`;
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('truck')}</span><div><b>Order timber</b><small>Valley Timber Co. · delivered in about a minute</small></div></div>`;
    for (const [q, price] of timberLots()) { const fits = q <= room;
      h += `<div class="up"><span class="ic">${icon('box')}</span><div><b>${q} planks</b><span class="note">${fmt(price / q)} a plank</span></div><button class="btn primary" data-timber="${q}" ${d || !fits ? 'disabled' : ''}>${fmt(price)}${S.cash < price ? '<small>on account</small>' : ''}</button>
        <p>${d ? 'Wait for the current delivery.' : fits ? (S.cash >= price ? 'Paid now.' : 'Not enough cash: the supplier invoices it against your next delivery.') : `Only ${room} planks of room in the stock room.`}</p></div>`; }
    h += `</div>`; }
    if (S.level === 2 && suppliesFree()) h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Steel coils</b><small>Free on account for level 2 · ${COIL_PIPES} pipes a coil</small></div><span class="cap ok">ALWAYS STOCKED</span></div><div class="kv"><span>Coil bay</span><span>Full</span><span>Beside the pipe machine</span><span>${S.coilFeed} / 2 (loaders bring them)</span><span>You pay for steel</span><span>From level 3</span></div></div>`;
    if (S.level >= 2 && !suppliesFree()) { const room = coilCap() - S.coils - coilsInHands();
      h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Steel coils</b><small>Coil bay on the dock apron · ${COIL_PIPES} pipes a coil</small></div><span class="cap ${steelPipes() < 4 ? 'badt' : ''}">${steelPipes()} pipes' worth</span></div>
        <div class="kv"><span>Coil bay ${bar(S.coils / coilCap() * 100)}</span><span>${S.coils} / ${coilCap()}</span><span>Beside the mill</span><span>${S.coilFeed} / 2</span><span>On the uncoiler</span><span>${S.coilLeft} pipes left</span>
        <span>On order</span><span>${d && d.kind === 'steel' ? `${d.left} coils · ${sup.state === 'parked' ? 'unloading' : 'flatbed on its way'}` : 'Nothing'}</span>${S.order && S.order.pq ? `<span>Current order still needs</span><span>${Math.max(0, pipeLeft())} pipes</span>` : ''}</div></div>`;
      h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('truck')}</span><div><b>Order steel</b><small>Dunmore Steel · same flatbed as the timber</small></div></div>`;
      for (const [q, price] of steelLots()) { const fits = q <= room;
        h += `<div class="up"><span class="ic">${icon('gear')}</span><div><b>${q} coils</b><span class="note">${q * COIL_PIPES} pipes · ${fmt(price / (q * COIL_PIPES))} a pipe</span></div><button class="btn primary" data-steel="${q}" ${d || !fits ? 'disabled' : ''}>${fmt(price)}${S.cash < price ? '<small>on account</small>' : ''}</button>
          <p>${d ? 'The flatbed is out on a delivery. Wait for it.' : fits ? (S.cash >= price ? 'Paid now.' : 'Not enough cash: invoiced against your next delivery.') : `Only ${room} coils of room in the bay.`}</p></div>`; }
      h += `</div>`; }
    if (S.level >= 2) {
      if (S.lv2.wh >= 2) h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('box')}</span><div><b>Warehouse</b><small>Finished goods in the back yard. Orders ship from stock first.</small></div><span class="cap">${S.wh.c + S.wh.p + S.wh.t} in stock</span></div>
        <div class="kv"><span>Crates ${bar(S.wh.c / whCapC() * 100)}</span><span>${S.wh.c} / ${whCapC()}</span><span>Pipes ${bar(S.wh.p / whCapP() * 100)}</span><span>${S.wh.p} / ${whCapP()}</span>${whCapT() ? `<span>Tools ${bar(S.wh.t / whCapT() * 100)}</span><span>${S.wh.t} / ${whCapT()}</span>` : S.level >= 3 ? '<span>Tools</span><span>Rack goes in at level 3</span>' : ''}</div>
        <div class="up"><span class="ic">${icon('gear')}</span><div><b>Make to stock</b><span class="note">${S.wh.make ? `On: the saw, the mill${whCapT() ? ' and the press' : ''} keep working between orders until the warehouse is full` : 'Off: machines make only what the open order needs'}</span></div><button class="btn ${S.wh.make ? 'go' : 'primary'}" data-whmake="1">${S.wh.make ? 'Turn off' : 'Turn on'}</button>
        <p>Stock costs timber, steel and diesel now and pays back as orders that are ready the moment the truck docks.</p></div></div>`;
      else h += `<div class="dept locked"><div class="dept-h"><span class="ic">${icon('box')}</span><div><b>Warehouse</b><small>${S.lv2.wh === 1 ? 'Being built' : whUnlocked(S) ? `Ready to build: stand on the pad in the back yard (${fmt(WH_PRICE)})` : `Opens once the pipe mill is running and ${WH_PIPES} pipes have shipped (${Math.min(S.pshipped, WH_PIPES)}/${WH_PIPES})${S.restored.yard ? '' : ', with the back yard cleared'}`}</small></div></div></div>`;
    }
    if (S.level >= 3) { const room = partsCap() - S.parts;
      h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('wrench')}</span><div><b>Spare parts</b><small>Shelf on the North field · a machine repair uses one</small></div><span class="cap ${S.parts === 0 ? 'badt' : ''}">${S.parts} / ${partsCap()}</span></div>
        <div class="kv"><span>With a spare part</span><span>Normal repair</span><span>Without one</span><span>The mechanic makes do: about three times as slow</span></div>
        <div class="up"><span class="ic">${icon('wrench')}</span><div><b>${PARTS_LOT[0]} spare parts</b><span class="note">${S.lv3.field ? 'Delivered straight to the shelf' : 'The shelf goes up with the North field'}</span></div><button class="btn primary" data-parts="1" ${S.lv3.field && room > 0 && S.cash >= PARTS_LOT[1] ? '' : 'disabled'}>${fmt(PARTS_LOT[1])}</button><p>${room > 0 ? `Room for ${room} more.` : 'The shelf is full.'}</p></div></div>`; }
    const wroom = WATER_CAP - S.water; if (WELFARE) {
    h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('drop')}</span><div><b>Drinking water</b><small>Cooler by the break area · ${coolerCap()} cups a bottle</small></div><span class="cap ${S.water === 0 && S.cooler < 6 ? 'badt' : ''}">${S.water} spare</span></div>
      <div class="kv"><span>In the cooler ${bar(S.cooler / coolerCap() * 100)}</span><span>${S.cooler} / ${coolerCap()} cups</span><span>Spare bottles on the rack</span><span>${S.water} / ${WATER_CAP}</span><span>Drinks so far</span><span>${S.drinks}</span></div>
      <div class="up"><span class="ic">${icon('drop')}</span><div><b>${WATER_LOT[0]} bottles of water</b><span class="note">${WATER_LOT[0] * coolerCap()} drinks</span></div><button class="btn primary" data-water="1" ${wroom >= WATER_LOT[0] && S.cash >= WATER_LOT[1] ? '' : 'disabled'}>${fmt(WATER_LOT[1])}</button>
        <p>${wroom >= WATER_LOT[0] ? 'Delivered straight to the rack. A cleaner (or a loader) swaps the bottle when the cooler runs low.' : 'The rack is full.'}</p></div></div>`;
    }
  }
  B.innerHTML = needsYouHtml(tab !== 'orders') + h;   // in full on the Orders page; one line on the others
  B.querySelectorAll('.dept-h .cap').forEach(c => { if (c.textContent.trim().length > 9) c.classList.add('below'); });
  B.querySelectorAll('[data-showme]').forEach(b => b.onclick = () => closeOffice());
  B.querySelectorAll('[data-reorder]').forEach(b => b.onclick = () => { S.reorderT = clamp((S.reorderT ?? 12) + +b.dataset.reorder, 0, 96); save(); renderOffice(); });
  B.querySelectorAll('[data-set]').forEach(b => b.oninput = () => { S[b.dataset.set] = +b.value / 100; save(); });
  B.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { const k = b.dataset.toggle; if (k === 'reduced') { S.reduced = !(S.reduced ?? REDUCED); REDUCED = S.reduced; } else S[k] = !S[k]; if (k === 'haptics' && S.haptics) buzz(20); save(); renderOffice(); });
  B.querySelectorAll('[data-water]').forEach(b => b.onclick = orderWater);
  B.querySelectorAll('[data-mains]').forEach(b => b.onclick = applyMains);
  B.querySelectorAll('[data-paybill],[data-payacc]').forEach(b => b.onclick = () => { payAccounts(); });
  B.querySelectorAll('[data-refit]').forEach(b => b.onclick = () => orderRefit(b.dataset.refit));
  B.querySelectorAll('[data-skill]').forEach(b => b.onclick = () => learnSkill(b.dataset.skill));
  B.querySelectorAll('[data-card]').forEach(b => b.onclick = () => takeCard(+b.dataset.card));
  B.querySelectorAll('[data-spot]').forEach(b => b.onclick = buyRaw);
  B.querySelectorAll('[data-zone]').forEach(b => b.onclick = () => chooseStore(b.dataset.zone));
  B.querySelectorAll('[data-book]').forEach(b => b.onclick = () => bookService(b.dataset.book));
  B.querySelectorAll('[data-loan]').forEach(b => b.onclick = () => takeLoan(+b.dataset.loan));
  B.querySelectorAll('[data-repay]').forEach(b => b.onclick = repayLoan);
  B.querySelectorAll('[data-haulier]').forEach(b => b.onclick = () => rushHaulier(+b.dataset.haulier));
  B.querySelectorAll('[data-promote]').forEach(b => b.onclick = () => promote(+b.dataset.promote));
  B.querySelectorAll('[data-movepost]').forEach(b => b.onclick = () => movePost(+b.dataset.movepost));
  B.querySelectorAll('[data-armed]').forEach(b => b.onclick = () => { const k = b.dataset.armed;
    if (armed.key === k && T < armed.until) { armed.key = null; if (k === 'newgame') newGame(); else if (k === 'giveup') giveUpOrder(); return; }
    armed = { key:k, until:T + 4 }; sfx('tap'); renderOffice(); });
  B.querySelectorAll('[data-deal]').forEach(b => b.onclick = () => { closeOffice(); openDeal(b.dataset.deal); });
  B.querySelectorAll('[data-licence]').forEach(b => b.onclick = applyLicence);
  B.querySelectorAll('[data-parts]').forEach(b => b.onclick = orderParts);
  B.querySelectorAll('[data-whmake]').forEach(b => b.onclick = () => { S.wh.make = !S.wh.make; sfx('tick'); save(); renderOffice(); });
  B.querySelectorAll('[data-steel]').forEach(b => b.onclick = () => orderSteel(+b.dataset.steel));
  B.querySelectorAll('[data-accept]').forEach(b => b.onclick = () => acceptCall(b.dataset.accept));
  B.querySelectorAll('[data-decline]').forEach(b => b.onclick = () => declineCall());
  B.querySelectorAll('[data-timber]').forEach(b => b.onclick = () => orderTimber(+b.dataset.timber));
  B.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => hire(b.dataset.hire));
  B.querySelectorAll('[data-train]').forEach(b => b.onclick = () => train(+b.dataset.train));
  B.querySelectorAll('[data-up]').forEach(b => b.onclick = () => buyUpgrade(b.dataset.up));
}

/* =====================================================================
   THE VALLEY: people, story cards, land deals, the owner's own hands, reputation rules
   (Master Design Doc and Level Bible, build 0.13)
   ===================================================================== */
// --- the owner works by hand until the crew takes over (Level Bible, level 1) ---------------------------
const OWNER_ST = { id:-500, name:'You', role:'owner', lv:1, xp:0, energy:100, focus:100 };
const OWNER_CARRY = 5;
const ownerStill = () => inputDir()[2] === 0 && !officeOpen;
// the owner runs a machine by standing at its operator spot while no operator is working it
const ownerOn = spot => !!(owner && spot && ownerStill() && near(owner.o, spot, .6));
const carriers = () => { const a = [...staffObj.values()]; if (owner) a.push(owner); const g = folk.get('gus'); if (g && g.stack.length) a.push(g); return a; };
const loadersHired = () => S.staff.some(s => s.role === 'loader' && s.posted !== false);   // a loader still waiting at the gate is not carrying yet
let handT = 0, fuelT = 0, feedT = 0;
function ownerHands(dt){
  handT -= dt; if (handT > 0 || !ownerStill()) return;
  const o = owner.o, n = owner.stack.length, t = owner.carryType, docked = truck.state === 'docked';
  // load the truck from the owner's arms
  if (n && docked && near(o, P.drop, .85)) { if (t === 'crate' ? loadCrate(owner) : t === 'pipe' ? loadPipe(owner) : t === 'toolbox' ? loadTool(owner) : false) { handT = .2; return; } }
  // goods jump onto the owner's back at their stack, up to the carry limit, while the truck still needs them
  const picks = [
    ['crate', () => near(o, P.pallet, 1.0), () => S.pallet, () => needCrates() - truckCrates(), () => { if (takeFrom('pallet', owner, 'crate')) { S.pallet--; syncPallet(); return true; } }, () => { if (giveTo(owner, 'pallet', world, palletPos, () => syncPallet())) { S.pallet++; return true; } }],
    ['pipe', () => !!M.prack && near(o, P.prackSpot, .8), () => S.pipes, () => needPipes() - truckPipes(), () => { if (takeFrom('rack', owner, 'pipe')) { S.pipes--; syncPipes(); return true; } }, () => { if (giveTo(owner, 'rack', world, pipeRackPos, () => syncPipes())) { S.pipes++; return true; } }],
    ['toolbox', () => !!M.trackRack && near(o, P.trackSpot, .8), () => S.tools, () => needTools() - truckTools(), () => { if (takeFrom('rack', owner, 'toolbox')) { S.tools--; syncTools(); return true; } }, () => { if (giveTo(owner, 'rack', world, toolRackPos, () => syncTools())) { S.tools++; return true; } }],
    // the warehouse stock: what the racks and the pallet cannot cover (a gate customer, or the lorry) comes from here
    ...[['crate', 'c', P.whSpotC, whCratePos, () => needCrates() - truckCrates() - S.pallet, whCapC], ['pipe', 'p', P.whSpotP, whPipePos, () => needPipes() - truckPipes() - S.pipes, whCapP], ['toolbox', 't', P.whSpotT, whToolPos, () => needTools() - truckTools() - S.tools, whCapT]]
      .map(([type, k, spot, pos, need, cap]) => [type, () => whReady() && !!spot && near(o, spot, .8), () => S.wh[k], need, () => { if (takeFrom('wh', owner, type)) { S.wh[k]--; syncWh(); return true; } }, () => { if (S.wh[k] < cap() && giveTo(owner, 'wh', world, pos, () => syncWh())) { S.wh[k]++; return true; } }]),
  ];
  for (const [type, at, have, need, take, back] of picks) {
    if (!at()) continue;
    const gate = walkWant(type) - (t === type ? n : 0);   // a walk-in customer at the gate waiting for these
    // what the lorry still needs not counting the owner's own load (with loaders on, their loads count but his did not)
    const held = t === type ? n : 0, excl = need() + (truckBound(owner) ? held : 0);
    if (!closingTime() && (!t || t === type) && n < (type === 'crate' && !owner.cart ? HAND_CRATES : ownerCarry()) && have() > 0 && (excl - held > 0 || gate > 0) && take()) { handT = .16; sfx('pick', .5); return; }   // build 0.19: you lend a hand loading, loaders or not
    if (held && n > walkWant(type) + Math.max(0, excl) && back()) { handT = .16; return; }   // more than the lorry and the gate want: back where it came from
  }
  // the trolley bay: take a free trolley by standing at its handle; park yours the same way once it is empty
  if (!owner.cart) { const k = carts.find(k => !k.by && near(o, cartSpot(k.slot), .55)); if (k && owner.cartArm !== false) { takeCart(owner, k); owner.cartArm = false; handT = .3; toast('You have a trolley: load up to ' + ownerCarry() + ' crates. Park it back in the bay when you are done.', 'good'); return; } }
  else if (!n && owner.cartArm) { const i = BAY.findIndex((b, i) => slotFree(i, owner.cartRec) && near(o, cartSpot(i), .55)); if (i >= 0) { parkCart(owner, i); owner.cartArm = false; handT = .3; return; } }   // any empty space in the bay
  if (owner.cartArm === false && !BAY.some((b, i) => near(o, cartSpot(i), .6))) owner.cartArm = true;   // one step off the handle and you can take or park again
  // refuel the generator from the yard tank's can while nobody else does it (diesel goes on the bills)
  if (!loadersHired() && near(o, P.genFix, .9) && S.power.fuel < 98) { const add = Math.min(98 - S.power.fuel, 14 * .25); S.power.fuel += add; S.bills += add * .32; fuelT += .25; handT = .25; if (fuelT > 1) { fuelT = 0; sfx('pour', .5); } }
}
const ownerCarry = () => OWNER_CARRY + [0, 3, 7, 11][S.skills.arms || 0];
// with no loaders, the owner keeps the saw fed himself: planks go from the stock room to the line rack to the in-feed
// who feeds the crate machine: the helper; without one the loaders when they have a minute; with neither, the
// operator (or the owner, or Gus) reaches for the planks himself between cuts and the machine runs 30% slower
const helperOn = () => staffOf('helper').some(c => c.st.posted !== false && c.state !== 'arrive' && helperOf(c) === 'saw');
// helpers in hiring order take the crate machine, then the pipe mill, then the tool press
function helperOf(c){ const hs = staffOf('helper').filter(o => o.st.posted !== false).sort((a, b) => a.st.id - b.st.id), ms = helperMachines(); return ms[hs.indexOf(c)] || 'saw'; }
const coilHelper = mach => staffOf('helper').some(c => c.st.posted !== false && c.state !== 'arrive' && helperOf(c) === mach);
function helperWaitAt(c){ const m = helperOf(c); return m === 'mill2' ? [P.coil2Ring[0] + .7, P.coil2Ring[1]] : m === 'mill' ? [P.pfeedRing[0] - .2, P.pfeedRing[1] + .7] : m === 'press' ? [P.tfeedRing[0], P.tfeedRing[1] + .8] : [P.feedRing[0] + .9, P.feedRing[1] + .2]; }
// the owner standing at the in-feed hands the operator the planks: the crate machine runs a quarter faster
const ownerFeeds = () => !!owner && owner.o.visible && sawBy && sawBy !== owner && ownerOn(P.feedRing);
const feedK = () => ownerFeeds() ? 1.25 : helperOn() || loadersHired() ? 1 : .7;
function selfFeed(dt){
  // build 0.19: the owner at the in-feed hands the planks over (quickly); with no helper, when the in-feed runs dry and
  // the loader is busy, the operator (or the owner, or Gus) reaches for a plank himself
  const hand = ownerFeeds(), dry = !helperOn() && S.feed === 0 && !!sawBy;
  if (helperOn() || (loadersHired() && !hand && !dry)) return; feedT -= dt; if (feedT > 0) return; feedT = hand ? .5 : 1;
  if (S.feed < (hand ? 6 : 3) && S.timber > 0) { S.timber--; S.feed++; syncRack(); syncFeed(); }
  if (S.timber < 4 && S.store > 0) { const k = Math.min(4, S.store); S.store -= k; S.timber += k; syncStore(); syncRack(); }
}
let coilSelfT = 0;
function coilSelfFeed(dt){ if (loadersHired() || !millReady() || !pipeOn && !(pipeBy) ) return; coilSelfT += dt; if (coilSelfT < 8) return; coilSelfT = 0; if (S.coilFeed < 2 && S.coils > 0) { S.coils--; S.coilFeed++; syncCoilBay(); syncCoilFeed(); } }   // no loader: the man at the mill rolls a coil over himself now and then
// --- the old generator stalls until it is tuned (levels 1 and 2; Generator Mk II never stalls) ------------
const STALL_EVERY = [40, 60, 90, Infinity];
let stallLeft = 0;
const stalled = () => stallLeft > 0;
function updateStall(dt){
  if (stallLeft > 0) { stallLeft -= dt; if (stallLeft <= 0) { floatText('Generator running', P.gen[0], 2.4, P.gen[1], 'info'); sfx('clank', .5); } return; }
  return;   // Gameplay Bible 4.5: no issues before level 3, so the old generator never stalls
  // eslint-disable-next-line no-unreachable
  S.stallT = (S.stallT || 0) + dt;
  if (S.stallT >= STALL_EVERY[Math.min(3, S.up.gen)]) { S.stallT = 0; stallLeft = 3; sfx('alarm', .5); floatText('Generator stalled', P.gen[0], 2.4, P.gen[1], 'warn');
    if (!S.stallSeen) { S.stallSeen = true; toast('The old generator stalls now and then. It restarts by itself; a tune-up (Upgrades) stops it.', 'gold'); } }
}
// --- reputation (Master Design Doc): bands and their effects --------------------------------------------
const BANDS = [[90, 'Renowned', '#9bd26f'], [80, 'Respected', '#6fbf4a'], [65, 'Trusted', '#e8ab2c'], [50, 'Known', '#aab0b7'], [0, 'Shaky', '#d2493a']];
const repBand = () => BANDS.find(b => S.rep >= b[0]);
const bandSize = () => S.rep < 50 ? .75 : S.rep < 65 ? 1 : 1.25;               // shaky: small orders only; trusted: large ones
const bandPay = () => S.rep >= 90 ? 1.1 : 1;                                    // renowned: every payment 10% higher
const permitK = () => S.rep >= 80 ? .5 : S.rep >= 65 ? .75 : 1;                 // trusted and respected: faster permits
function repChange(d, why){
  if (d < 0) d *= [1, .8, .65, .5][S.skills.name || 0];                         // Good name skill
  S.rep = clamp(S.rep + d, 0, 100); if (why) floatText(`Reputation ${d > 0 ? '+' : ''}${+d.toFixed(1)}`, owner.o.position.x, 2.4, owner.o.position.z, d > 0 ? 'info' : 'warn');
}
// a lorry that leaves without its load: what was on the bed goes back to its stack, and it no longer counts as shipped
function unloadBed(){
  S.pallet += S.bed; S.pipes += S.pbed; S.tools += S.tbed; S.shipped -= S.bed; S.pshipped -= S.pbed; S.tshipped -= S.tbed;
  S.bed = 0; S.pbed = 0; S.tbed = 0; syncBed(); syncPBed(); syncTBed(); syncPallet(); syncPipes(); syncTools();
}
function giveUpOrder(){
  const o = S.order; if (!o) return;
  // anything already on the truck comes back to its stack; the truck leaves empty
  unloadBed();
  S.order = null; repChange(-6); if (truck.state === 'docked' || truck.state === 'arrive') { truck.state = 'leave'; truck.s = 0; truck.path = LEAVE; COL.delete('truck'); }
  sfx('alarm', .5); toast('Order given up. Reputation −6. The next call comes soon.', 'bad'); save(); renderOffice();
}
// --- people of the valley -------------------------------------------------------------------------------
const PEOPLE = {
  gus:   { name:'Gus Mallory', role:'Old foreman', line:'Kept the works for your grandfather. Still has the keys.', skin:'#e0ac85', hair:'#d6d1c6', hat:'#5b4a3a', shirt:'#7a5a3a', stache:true, bg:'#c8a96a',
           look:{ parts:['hat_cap', 'stache', 'hair_short'], cols:{ suit:'#5b4a3a', hat:'#5b4a3a', shirt:'#c9b28a', skin:'#e0ac85', hair:'#d6d1c6', stache:'#d6d1c6' } } },
  tom:   { name:'Big Tom Okafor', role:'Building contractor', line:'Steady work for his crew, and he keeps to his timers.', skin:'#7a5236', hair:'#1a1a1a', hat:'#f2c230', shirt:'#e5772b', beard:true, bg:'#d9b26a',
           look:{ parts:['hat_hard', 'beard', 'vest', 'clipboard'], cols:{ suit:'#4a4038', hat:'#f2c230', shirt:'#e5772b', vest:'#f07a22', skin:'#7a5236', hair:'#1a1a1a', stache:'#1a1a1a' } } },
  vera:  { name:'Vera Lind', role:'Estate agent', line:'Takes her 5% and always knows who is ready to sell.', skin:'#f1c9a5', hair:'#a8522a', shirt:'#2f5d8a', bg:'#9fb6c9',
           look:{ parts:['hair_pony', 'clipboard'], cols:{ suit:'#2f5d8a', shirt:'#e8e2d4', skin:'#f1c9a5', hair:'#a8522a' } } },
  abel:  { name:'Abel Thorne', role:'Farmer, North field', line:'Wants his fence line kept and a fair price.', skin:'#c68c5f', hair:'#b8b2a6', hat:'#b8954a', shirt:'#5d6b3a', beard:true, bg:'#a9b77e',
           look:{ parts:['hat_cap', 'beard', 'hair_short'], cols:{ suit:'#5d6b3a', hat:'#b8954a', shirt:'#c9b28a', skin:'#c68c5f', hair:'#b8b2a6', stache:'#b8b2a6' } } },
  priya: { name:'Priya Nair', role:'Accountant', line:'Keeps the books, and keeps you honest about them.', skin:'#9b6a43', hair:'#1a1a1a', shirt:'#6a3a5a', bg:'#c9a2c0',
           look:{ parts:['hair_pony', 'clipboard'], cols:{ suit:'#4a3a52', shirt:'#efe6ea', skin:'#9b6a43', hair:'#1a1a1a' } } },
  eldon: { name:'Eldon Graves', role:'Bank manager, Valley Bank', line:'Lends to works that pay their bills on time.', skin:'#f1c9a5', hair:'#b8b2a6', shirt:'#2c2f33', stache:true, bg:'#9fb39f',
           look:{ parts:['hair_short', 'stache'], cols:{ suit:'#2c2f33', shirt:'#e8e2d4', skin:'#f1c9a5', hair:'#b8b2a6', stache:'#b8b2a6' } } },
  ada:   { name:'Ada Finch', role:'Retired shopkeeper', line:'Wants her daughter June looked after.', skin:'#e0ac85', hair:'#d6d1c6', shirt:'#2f7a4a', bg:'#a9c9a2',
           look:{ parts:['hair_pony'], cols:{ suit:'#2f5a3a', shirt:'#e8dcc0', skin:'#e0ac85', hair:'#d6d1c6' } } },
  council:{ name:'Valley Council', role:'Permit office', line:'Every plan in the valley gets its stamp here.', crest:true, bg:'#2f5d8a', skin:'#e0ac85', hair:'#3a2a20', shirt:'#2f5d8a' },
  june:  { name:'June Finch', role:'Clerk, Ada Finch\'s daughter', line:'Pays the bills, collects the takings, and never pays silently.', skin:'#f1c9a5', hair:'#6b3a20', shirt:'#556b3a', bg:'#b9c9a2',
           look:{ parts:['hair_pony', 'clipboard'], cols:{ suit:'#556b3a', shirt:'#efe6da', skin:'#f1c9a5', hair:'#6b3a20' } } },
  hollins:{ name:'Mr Hollins', role:'Factory inspector', line:'Guards, lanes, the service book, the wiring.', skin:'#e0ac85', hair:'#8a8378', hat:'#3c4148', shirt:'#3c4148', stache:true, bg:'#a9b2bb',
           look:{ parts:['hat_cap', 'stache', 'hair_short', 'clipboard'], cols:{ suit:'#3c4148', hat:'#3c4148', shirt:'#e8e2d4', skin:'#e0ac85', hair:'#8a8378', stache:'#8a8378' } } },
  hollis:{ name:'Hollis Reed', role:'Wholesaler, Reed Brothers', line:'Bulk work for three warehouses; loyal to suppliers who deliver.', skin:'#e0ac85', hair:'#4b3424', shirt:'#6a4a2a', stache:true, bg:'#c9b28a',
           look:{ parts:['hat_cap', 'stache', 'hair_short'], cols:{ suit:'#6a4a2a', hat:'#3a2a1c', shirt:'#e8dcc0', skin:'#e0ac85', hair:'#4b3424', stache:'#4b3424' } } },
  tommy: { name:'Tommy Pryce', role:'Operator, Alf Pryce\'s lad', line:'Nineteen, keen, and his dad\'s hands on a machine.', skin:'#f1c9a5', hair:'#a8522a', shirt:'#3f6c94', bg:'#9fb6c9',
           look:{ parts:['hair_short'], cols:{ suit:'#3f6c94', shirt:'#d8d2c2', skin:'#f1c9a5', hair:'#a8522a' } } },
  cyrus: { name:'Cyrus Bell', role:'Stationmaster, Valley station', line:'Knows every yard of track in the valley.', skin:'#c68c5f', hair:'#b8b2a6', hat:'#1f2a44', shirt:'#1f2a44', stache:true, bg:'#9fb6c9',
           look:{ parts:['hat_cap', 'stache', 'clipboard', 'hair_short'], cols:{ suit:'#1f2a44', hat:'#1f2a44', shirt:'#e8e2d4', skin:'#c68c5f', hair:'#b8b2a6', stache:'#b8b2a6' } } },
  joe:   { name:'Joe Brennan', role:'Foreman, thirty years at Ashcombe steelworks', line:'Fills empty posts and keeps the yard running.', skin:'#c68c5f', hair:'#8a8378', hat:'#f4f1ea', shirt:'#3a3d41', stache:true, bg:'#b9b2a6',
           look:{ parts:['hat_hard', 'stache', 'vest', 'clipboard'], cols:{ suit:'#3a3d41', hat:'#f4f1ea', shirt:'#d8d2c2', vest:'#e8ab2c', skin:'#c68c5f', hair:'#8a8378', stache:'#8a8378' } } },
  krane: { name:'Victor Krane', role:'Rival yard owner, across the river', line:'Wants the dairy plot to box you in.', skin:'#f1c9a5', hair:'#1a1a1a', shirt:'#2c2f33', bg:'#8a7a8a',
           look:{ parts:['hair_short'], cols:{ suit:'#2c2f33', shirt:'#e8e2d4', skin:'#f1c9a5', hair:'#1a1a1a' } } },
  dolores:{ name:'Dolores Marsh', role:'Raw-material supplier', line:'Scrap and ore by rail; fixed prices for steady buyers.', skin:'#9b6a43', hair:'#2a1f19', shirt:'#6a3a5a', bg:'#c9a2c0',
           look:{ parts:['hair_pony', 'clipboard'], cols:{ suit:'#4a3a52', shirt:'#efe6ea', skin:'#9b6a43', hair:'#2a1f19' } } },
  rusty: { name:'Rusty Pike', role:'Scrap dealer', line:'Wants to stay in business next door.', skin:'#e0ac85', hair:'#a8522a', hat:'#2c2f33', shirt:'#8a4b2a', stache:true, bg:'#b98a6a',
           look:{ parts:['hat_cap', 'stache', 'hair_short', 'toolbelt'], cols:{ suit:'#6b3f2a', hat:'#2c2f33', shirt:'#b8a58a', skin:'#e0ac85', hair:'#a8522a', stache:'#a8522a' } } },
};
const portraits = {};
function portrait(id){
  if (portraits[id]) return portraits[id];
  const p = PEOPLE[id], cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = p.bg; g.fillRect(0, 0, 128, 128);
  if (p.crest) { g.fillStyle = '#ece6d6'; g.beginPath(); g.moveTo(34, 24); g.lineTo(94, 24); g.lineTo(94, 70); g.quadraticCurveTo(94, 98, 64, 110); g.quadraticCurveTo(34, 98, 34, 70); g.closePath(); g.fill();
    g.fillStyle = '#2f5d8a'; g.fillRect(40, 30, 48, 18); g.fillStyle = '#e8ab2c'; g.beginPath(); g.moveTo(46, 92); g.lineTo(58, 62); g.lineTo(66, 76); g.lineTo(74, 58); g.lineTo(84, 88); g.closePath(); g.fill();
    g.fillStyle = '#ece6d6'; g.font = '700 13px Oswald, Arial'; g.textAlign = 'center'; g.fillText('VALLEY', 64, 44); return portraits[id] = cv.toDataURL(); }
  g.fillStyle = p.shirt; g.beginPath(); g.ellipse(64, 136, 54, 40, 0, Math.PI, 0); g.fill();
  g.fillStyle = p.skin; g.fillRect(55, 84, 18, 16); g.beginPath(); g.ellipse(64, 62, 25, 29, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(39, 64, 4, 7, 0, 0, Math.PI * 2); g.ellipse(89, 64, 4, 7, 0, 0, Math.PI * 2); g.fill();   // ears
  if (p.hat) { g.fillStyle = p.hat; g.beginPath(); g.ellipse(64, 42, 28, 17, 0, Math.PI, 0); g.fill(); g.fillRect(36, 40, 56, 6); g.fillRect(56, 43, 40, 5); }
  else { g.fillStyle = p.hair; g.beginPath(); g.ellipse(64, 46, 27, 20, 0, Math.PI, 0); g.fill(); g.fillRect(38, 46, 7, 30); g.fillRect(83, 46, 7, 30); }
  g.fillStyle = '#2a211b'; g.beginPath(); g.arc(54, 63, 2.8, 0, 7); g.arc(74, 63, 2.8, 0, 7); g.fill();
  g.strokeStyle = p.hat ? p.hair : '#3a2a20'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(48, 56); g.lineTo(58, 55); g.moveTo(70, 55); g.lineTo(80, 56); g.stroke();
  if (p.beard) { g.fillStyle = p.hair; g.beginPath(); g.ellipse(64, 80, 21, 13, 0, 0, Math.PI); g.fill(); }
  if (p.stache || p.beard) { g.fillStyle = p.hair; g.fillRect(53, 74, 22, 5); }
  g.strokeStyle = '#7a3b2a'; g.lineWidth = 2; g.beginPath(); g.arc(64, 77, 6, .25, Math.PI - .25); g.stroke();
  return portraits[id] = cv.toDataURL();
}
const SCENES = {
  gus:   ['You came. I\'m Gus Mallory: I kept this place for your grandfather.', 'It\'s just you now. The saw still runs: stand at it and she cuts.', 'Hear that? The office phone. First order in years.'],
  tom:   ['Big Tom Okafor. You pay, my crew builds.', 'Scaffold up, machine in, gone before you know it.'],
  vera:  ['Vera Lind, Valley Estates. I\'ve just pinned my land board up by your gate: a growing works needs room.', 'Abel Thorne will sell the North field behind your back fence when you\'re ready to grow (Level 3). Stand at a plot\'s sign and I\'ll bring the papers.'],
  abel:  ['Abel Thorne. That\'s my North field behind your dock.', 'Too much for me now. Vera Lind has the papers: keep my fence line and it\'s yours.'],
  council:['Valley Council, permit office. You\'ll be wanting the road frontage.', 'Pay at the counter, the permit follows. Fix our road and the town will remember it.'],
  priya: ['Priya Nair, accountant. A payroll this size means bills: wages and power, every six minutes.', 'The first one is on your desk. Pay it at the office desk and I\'ll show you the Finance page. Pay on time and the crew stays happy.'],
  hollis:['Hollis Reed, Reed Brothers wholesale. Three warehouses down the valley, and I buy by the lorry.', 'My work goes on your board from today. Deliver three on time in a row and I\'ll make you a regular: twenty per cent on top.'],
  cyrus: ['Cyrus Bell, stationmaster. Mind your hat in this wind.', 'A siding behind your North field would bring steel to your door by the trainload. Let\'s walk the line.'],
  joe:   ['Joe Brennan. Thirty years on the Ashcombe furnaces, till they shut.', 'Put me on as foreman and I\'ll keep every post manned and every service booked. You\'ll have time to think.'],
  krane: ['Victor Krane. My yard\'s across the river; I\'ve bid on the dairy plot next to yours.', 'Five minutes, the agent says. You\'d better be quick, neighbour.'],
  eldon: ['Eldon Graves, Valley Bank. A works your size should bank with us.', 'Your account is open. When cash runs short we lend up to 30% of what the works aims to earn this level, repaid on the next five Friday accounts.'],
  ada:   ['Ada Finch. Forty years I kept the corner shop behind your new dock.', 'My knees say it\'s time. Vera has the papers at my sign: give my niece June a job and I\'ll sleep easy.'],
  rusty: ['Rusty Pike. I run the scrapyard next door.', 'Business is slow. The yard is for sale: Vera has the papers at my sign.'],
};
// a person met in the world: stands at a fixed spot, wears a badge while they have something for the owner
const folk = new Map();
function spawnFolk(id, at, face = 0){
  if (folk.has(id)) { const c = folk.get(id); c.o.position.set(at[0], 0, at[1]); c.home = at; c.faceNow(face); return c; } const p = PEOPLE[id]; if (!p.look) return null;
  const c = makeChar('worker', at[0], at[1], { parts:p.look.parts, cols:p.look.cols }); c.st = { id:-(1000 + Object.keys(PEOPLE).indexOf(id)), name:p.name, role:'folk', lv:1, energy:100, focus:100 };
  c.folk = id; c.faceNow(face); c.play('idle'); c.home = at; folk.set(id, c); return c;
}
function despawnFolk(id){ const c = folk.get(id); if (!c) return; c.o.removeFromParent(); mixers.splice(mixers.indexOf(c.mixer), 1); folk.delete(id); }
// who stands where at this level
function placeFolk(){
  if (S.level === 1 && !S.tutDone) spawnFolk('gus', P.gus, Math.PI * .8); else if (!S.gus.retired) { const g = spawnFolk('gus', P.gus2, Math.PI * .7); if (g) { g.old = true; g.job = null; } } else despawnFolk('gus');
  if (S.level >= 2 && S.plots.north.st === 0) { if (!veraWalk) despawnFolk('vera'); if (!M.veraBoard) { M.veraBoard = put(inst('env_sale_sign'), P.veraL2[0] - 1.6, P.veraL2[1] - .05, 0); M.veraBoard.userData.dyn = true; } } else if (S.level >= 3 && S.plots.scrap.st === 0) spawnFolk('vera', [-6.6, 10.3], -Math.PI / 2); else despawnFolk('vera');
  if (S.level >= 3 && S.plots.scrap.st === 0) spawnFolk('rusty', [-6.9, 8.6], -Math.PI / 2); else if (S.level >= 4 && M.stall) spawnFolk('rusty', [P.stall[0], P.stall[1] + .72], Math.PI); else despawnFolk('rusty');
  if (M.veraBoard) M.veraBoard.visible = S.level >= 2 && S.plots.north.st === 0;
  if (S.level === 2 && whUnlocked(S) && !(S.lv2.wh >= 1)) spawnFolk('tom', P.tomL2, .3); else despawnFolk('tom');
  if (S.level >= 2 && S.plots.north.st === 0) spawnFolk('abel', P.abelL2, .2); else despawnFolk('abel');
  if (S.level >= 5 && M.l5Built) { spawnFolk('priya', P.priya, Math.PI * .75); if (weekday() === 3 && S.level === 5) spawnFolk('eldon', [2.4, 26.4], Math.PI * .9); else despawnFolk('eldon');   // Thursday: Eldon calls at the office with his offer
    if (S.plots.shop.st === 0) { spawnFolk('ada', [19.6, 19.6], Math.PI); spawnFolk('vera', [17.5, 19.7], Math.PI * .9); } else { despawnFolk('ada'); despawnFolk('vera'); } }
}
// --- story cards: full screen, pause the game, one tap to skip --------------------------------------------
let cardOpen = false, cardQueue = [];
// The Valley Courier's front page as each level closes (v2.0 2.7): printed on the morning the next level opens
const HEADLINES = {
  2:['Old Ashford works opens its gates again', 'The gates at the end of Mill Road stood shut since Walter Ashford died last year. This month his grandchild opened them, the old foreman Gus Mallory was seen at the saw, and a lorry left loaded with crates.'],
  3:['Pipes roll out of Mill Road', 'A pipe machine bolted together by Big Tom Okafor\'s men, a second generator and a warehouse in the back yard: the works Walter Ashford founded in 1921 is making steel pipe again.'],
  4:['Valley works wins its trading licence', 'Mains power on the pole, a mechanic on the payroll and a tool press in Abel Thorne\'s old North field. The council has granted the Ashford works its trading licence.'],
  6:['Gus Mallory hangs up his cap after 52 years', 'Snow fell on Mill Road as the old foreman walked out of the gates for the last time. Fifty-two years, from a boy with a broom to the man who kept the Ashford works alive. The crew threw him a party he will not forget.'],
  7:['New office, new clerk, new machines at Mill Road', 'June Finch keeps the books now, a crane swung three refitted machines into place, and the inspector left smiling. The Ashford works runs like a proper company.'],
  8:['Valley works hires its 20th hand', 'Orders pinned to a board, a second supervisor on the floor and a railway siding approved: Iron Valley Manufacturing is one of the valley\'s big employers again.'],
  9:['Steel flows again in Iron Valley', 'The furnace is lit, the first train has tipped its wagons and beams leave the works by the hundred. Walter Ashford always meant to make steel here.'],
  5:['Valley works back on its feet', 'A forklift, a second crate line and a supervisor on the floor. Four months after the gates reopened, the works on Mill Road is back on its feet, and the valley is proud of it.'],
};
// what the time skip between two levels built (v2.0 3.4, the level specs' "Skip" lines)
const SKIP_BUILT = {
  2:'Two weeks while Big Tom\'s men poured the pipe machine\'s pad.',
  3:'Seven weeks while Abel Thorne made up his mind to sell the North field.',
  4:'Eight weeks while Rusty Pike\'s scrapyard was cleared to gravel.',
  5:'Five months: the office block went up across Mill Road, and the winter fuel crisis doubled the price of diesel.',
  6:'Three months: the snow melted and the books were balanced.',
  7:'Six months: summer came and went, and the order book filled.',
  8:'Six months: the siding was laid along the railway strip behind the works.',
};
// the wall calendar in the office: one page torn off for every week the skip covers, faster for a long skip
function skipHtml(c){
  const weeks = Math.max(0, Math.floor(c.w1 / 5) - Math.floor(c.w0 / 5)), d1 = calDate(c.w1), n = Math.min(12, weeks), dur = weeks > 6 ? .22 : .42;
  const pages = []; for (let k = 0; k < n; k++) { const w = c.w0 + Math.round((c.w1 - c.w0) * k / Math.max(1, n)), d = calDate(w);
    pages.push(`<div class="calpg tear" style="z-index:${40 - k};animation-delay:${.5 + k * dur}s"><b>${MONTHS[d.getUTCMonth()].slice(0, 3).toUpperCase()}</b><span>${d.getUTCDate()}</span><i>${d.getUTCFullYear()}</i></div>`); }
  const season = seasonOf(c.w1);
  return `<div class="note" style="letter-spacing:.2em;text-transform:uppercase">The office calendar · ${weeks} week${weeks === 1 ? '' : 's'} on</div>
    <div class="calwall">${pages.join('')}<div class="calpg"><b>${MONTHS[d1.getUTCMonth()].slice(0, 3).toUpperCase()}</b><span>${d1.getUTCDate()}</span><i>${d1.getUTCFullYear()}</i></div></div>
    <h3 style="text-align:center;margin:.3em 0">${dateOf(c.w1)}</h3><div class="db-s" style="text-align:center">${season[0].toUpperCase() + season.slice(1)} · Level ${c.level}: ${(LEVELS[c.level] || {}).name || ''}</div>
    ${SKIP_BUILT[c.level] ? `<p style="text-align:center">${SKIP_BUILT[c.level]}</p>` : ''}
    <button class="btn primary" data-next type="button" style="width:100%;margin-top:8px;min-height:46px">Read the Courier</button>`;
}
function story(card){ beat('card'); cardQueue.push(card); if (!cardOpen) nextCard(); }
function nextCard(){
  let c = cardQueue.shift(); while (c && c.kind === 'person' && !SCENES[c.id]) { S.met[c.id] = true; c = cardQueue.shift(); }   // a person without a written scene is met quietly
  const el = $('story'), B = $('storyBody');
  if (!c) { el.hidden = true; cardOpen = false; clock.getDelta(); return; }
  cardOpen = true; el.hidden = false; B.className = 'sheet story ' + c.kind;
  const skip = `<button class="skip" data-next type="button">SKIP</button>`;
  if (c.kind === 'letter') B.innerHTML = `${skip}<div class="note" style="letter-spacing:.14em;text-transform:uppercase;color:#6b5d47">Found with the keys in the office desk</div><p>My dear,</p><p>The works is yours now. Mind the old generator, trust Gus, and never ship a crate you wouldn't buy yourself.</p><p>Iron Valley Workshop has stood on Mill Road since 1921. The saw still cuts and the lorry still comes. Gus will show you the rest.</p><div class="sig">Grandad<br><small>Walter Ashford</small></div><button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:46px">Open the gates</button>`;
  else if (c.kind === 'skip') B.innerHTML = skipHtml(c);
  else if (c.kind === 'away') { S.away = null; nextCard(); return; }   // an envelope queued by an older build: dropped
  else if (c.kind === 'login') B.innerHTML = loginHtml();
  else if (c.kind === 'courier') { const [h, p] = HEADLINES[c.level]; B.innerHTML = `${skip}<div class="mast">The Valley Courier</div><div class="date"><span>${dateOf(calDay()).split(' ').slice(1).join(' ')}</span><span>Iron Valley</span><span>Price 5c</span></div><h3>${h}</h3><p>${p}</p><button class="btn primary" data-next type="button" style="width:100%;min-height:46px">Read on</button>`; }
  else if (c.kind === 'person') { const p = PEOPLE[c.id];
    B.innerHTML = `${skip}<div class="who"><img alt="" src="${portrait(c.id)}"><div><b>${p.name}</b><small>${p.role} · ${p.line}</small></div></div>${SCENES[c.id].map((t, i) => `<div class="say" style="animation-delay:${i * .45}s">${t}</div>`).join('')}<button class="btn primary" data-next type="button" style="width:100%;margin-top:8px;min-height:44px">Continue</button>`;
    S.met[c.id] = true; }
  else if (c.kind === 'gusnews') { B.innerHTML = `<div class="who"><img alt="" src="${portrait('gus')}"><div><b>Gus Mallory</b><small>Old foreman · 52 years at the gates</small></div></div>
      <div class="say">Boss, a word. Your grandad gave me a broom in this yard when I was fourteen.</div><div class="say" style="animation-delay:.45s">Fifty-two years. The place is in good hands now: yours. Friday is my last day.</div><div class="say" style="animation-delay:.9s">No fuss, mind. Well... maybe a little fuss.</div>
      <button class="btn primary" data-party type="button" style="width:100%;margin-top:8px;min-height:44px">Throw him a farewell party</button>`;
    B.querySelector('[data-party]').onclick = () => { sfx('tap'); S.gus.partyDue = true; toast('The farewell party is set for Friday afternoon, at the knocking-off whistle.', 'gold'); save(); nextCard(); }; S.met.gus = true; }   // v2.0 Level 5: the party is on Friday
  else if (c.kind === 'farewell') { const cost = k => GIFTS[k].cost;
    B.innerHTML = S.gus.gift ? `<div class="who"><img alt="" src="${portrait('gus')}"><div><b>Gus's gift to the works</b><small>Wrapped in an old flour sack</small></div></div>
      <div class="say">"This was your grandad's toolbox. Every spanner in it has fixed something in this yard. Now it's yours."</div>
      <div class="kv"><span>Grandad's toolbox</span><span>Repairs 15% faster, for good</span><span>Gus's pension</span><span>$35 a week on the Friday accounts</span><span>Your gift</span><span>${GIFTS[S.gus.gift].name}</span></div>
      <button class="btn primary" data-bye type="button" style="width:100%;margin-top:10px;min-height:44px">See him to the gate</button>`
      : `<div class="note" style="letter-spacing:.2em;text-transform:uppercase">Farewell party · in front of the workshop</div><div class="who"><img alt="" src="${portrait('gus')}"><div><b>Gus Mallory retires</b><small>The crew signed a card. What do you give him?</small></div></div>
      ${Object.entries(GIFTS).map(([k, G]) => `<div class="offer"><b>${G.name}</b><button class="btn ${S.cash >= G.cost ? 'primary' : ''}" data-gift="${k}" type="button" ${S.cash >= G.cost ? '' : 'disabled'}>${G.cost ? fmt(G.cost) : 'Free'}</button><p>${G.txt}</p></div>`).join('')}`;
    B.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => { giveGift(b.dataset.gift); cardQueue.unshift(c); nextCard(); });
    const bye = B.querySelector('[data-bye]'); if (bye) bye.onclick = () => { sfx('tap'); nextCard(); gusFarewellDone(); }; }
  else if (c.kind === 'licence') B.innerHTML = licenceHtml();
  else if (c.kind === 'inspect6') B.innerHTML = inspect6Html(c);
  else if (c.kind === 'siding') B.innerHTML = sidingHtml(c);
  else if (c.kind === 'eldon5') B.innerHTML = `<div class="note" style="letter-spacing:.14em;text-transform:uppercase;color:#6b5d47">The Valley Bank · Mill Road branch · 14 January 1974</div><p>Dear Ashford,</p><p>Probate on your grandfather's estate is complete, and the estate account is now closed. From this Friday the wages are yours to pay, in cash, at 16:30.</p><p>You will also find diesel has doubled since the autumn: the fuel crisis. Should cash run short, the bank will lend against the works.</p><p style="text-align:right">Eldon Graves, Manager</p><button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:44px">Understood</button>`;
  else if (c.kind === 'letter2') B.innerHTML = `<div class="note" style="letter-spacing:.14em;text-transform:uppercase;color:#6b5d47">Found in the old safe, by furnace light</div><p>"I always meant to make steel here. If you're reading this by furnace light, you've done what I never could."</p><p style="text-align:right">Walter Ashford, 1958</p><button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:44px">Fold it away</button>`;
  else if (c.kind === 'late8') { B.innerHTML = `<div class="who"><img alt="" src="${portrait('dolores')}"><div><b>Dolores Marsh</b><small>Raw-material supplier · on the telephone</small></div></div><div class="say">"Friday's train is held at Ashcombe: about two and a half hours late. My lorry can bring ten tonnes now, at the spot price."</div>
      <button class="btn primary" data-spotnow type="button" style="width:100%;margin-top:10px;min-height:44px" ${S.cash >= 10 * SPOT_UNIT ? '' : 'disabled'}>Pay the spot price: 10 t (${fmt(10 * SPOT_UNIT)})</button><button class="btn" data-next type="button" style="width:100%;margin-top:6px">Wait for the train</button>`;
    const b = B.querySelector('[data-spotnow]'); if (b) b.onclick = () => { buyRaw(); nextCard(); }; }
  else if (c.kind === 'dolores') { B.innerHTML = `<div class="who"><img alt="" src="${portrait('dolores')}"><div><b>Dolores Marsh</b><small>Raw-material supplier</small></div></div><div class="say">"A works your size wants a fixed price. Sign my contract: every train at ${fmt(44)} a tonne, not the market's ${fmt(55)}, for as long as you take a train a day."</div>
      <button class="btn primary" data-contract type="button" style="width:100%;margin-top:10px;min-height:44px">Sign the fixed-price contract</button><button class="btn" data-next type="button" style="width:100%;margin-top:6px">Keep buying on the market (and the spot price)</button>`;
    const b = B.querySelector('[data-contract]'); if (b) b.onclick = () => { S.l8.contract = true; ledger8('Dolores Marsh: fixed-price contract', 0); toast('Signed: every train at the contract price from now on.', 'good'); nextCard(); }; }
  else if (c.kind === 'tommy') { B.innerHTML = `<div class="who"><img alt="" src="${portrait('tommy')}"><div><b>Tommy Pryce</b><small>Alf Pryce's lad · nineteen, two years at the Co-op dairy</small></div></div>
      <div class="say">"Dad says the works is hiring. I've watched him on that crate machine since I was eight. I'll not let you down, boss."</div>
      <button class="btn primary" data-tommy type="button" style="width:100%;margin-top:10px;min-height:44px">Take Tommy on as an operator (no fee)</button><button class="btn" data-next type="button" style="width:100%;margin-top:6px">Not now</button>`;
    const tb = B.querySelector('[data-tommy]'); if (tb) tb.onclick = () => { nextCard(); hireTommy(); }; }
  else if (c.kind === 'june') { const cost = hireCost('clerk'); B.innerHTML = `<div class="who"><img alt="" src="${portrait('june')}"><div><b>June Finch</b><small>Ada Finch's daughter · bookkeeper, twelve years at the Co-op</small></div></div>
      <div class="say">"Mum says you need someone at the clerk's window. I keep a straight ledger: takings in, bills out, every line in ink."</div><div class="say" style="animation-delay:.45s">"I'll fetch the takings from the dock, hand out the packets on Friday and pay the accounts. If the cash is short, I hold the bill and tell you. I never pay silently."</div>
      <div class="kv"><span>Hiring fee</span><span>${cost ? fmt(cost) : 'Nothing: the promise to Ada'}</span><span>Wage</span><span>${fmt(WAGES.clerk)} a week</span></div>
      <button class="btn primary" data-junehire type="button" style="width:100%;margin-top:10px;min-height:44px" ${S.cash >= cost ? '' : 'disabled'}>Take June on as clerk</button><button class="btn" data-next type="button" style="width:100%;margin-top:6px">Later (Staff tab)</button>`;
    S.met.june = true; const jb = B.querySelector('[data-junehire]'); if (jb) jb.onclick = () => { hire('clerk'); nextCard(); }; }
  else if (c.kind === 'cartip') { B.innerHTML = `<div class="who"><img alt="" src="${portrait('gus')}"><div><b>Gus Mallory</b><small>Old foreman · a word about finding work</small></div></div>${CAR_TIP.map((t, i) => `<div class="say" style="animation-delay:${i * .45}s">${t}</div>`).join('')}<button class="btn primary" data-next type="button" style="width:100%;margin-top:8px;min-height:44px">Show me the car</button>`; B.classList.add('person'); }
  else if (c.kind === 'town') { B.innerHTML = townHtml(); B.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const [kind, k] = b.dataset.go.split(':'); sfx('tap');
      if (kind === 'ad' && ADS[k].forever) { cardQueue.unshift({ kind:'advert', key:k, here:true }); nextCard(); } else { nextCard(); startTrip(kind, k); } }); }
  else if (c.kind === 'stray') { B.innerHTML = strayHtml(); B.classList.add('deal'); B.querySelectorAll('[data-feed]').forEach(b => b.onclick = () => { sfx('tap'); nextCard(); }); }
  else if (c.kind === 'wrongtimber') { B.innerHTML = wrongTimberCard(); B.classList.add('deal'); B.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => { sfx('tap'); wrongTimberPick(b.dataset.wt); nextCard(); }); }
  else if (c.kind === 'rival') { B.innerHTML = rivalHtml(c.key); B.classList.add('deal'); B.querySelectorAll('[data-rival]').forEach(b => b.onclick = () => { sfx('tap'); rivalPick(c.key, b.dataset.rival); nextCard(); }); }
  else if (c.kind === 'visit') { B.innerHTML = visitHtml(c.key); B.classList.add('deal'); B.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { sfx('tap'); if (b.dataset.pick !== 'none') pickOffer(c.key, b.dataset.pick); nextCard(); leaveScene(); }); }
  else if (c.kind === 'advert') { B.innerHTML = adHtml(c.key); B.classList.add('deal'); const buy = B.querySelector('[data-ad]'); if (buy) buy.onclick = () => { buyAd(c.key); cardQueue.unshift(c); nextCard(); };
    B.querySelector('[data-pick]').onclick = () => { sfx('tap'); nextCard(); if (!c.here) leaveScene(); }; }
  else if (c.kind === 'day') { B.innerHTML = dayCardHtml(c.d); B.querySelector('[data-next]').removeAttribute('data-next'); const bs = B.querySelectorAll('.btn.primary'), go = bs[bs.length - 1]; go.onclick = () => { sfx('tap'); nextCard(); };
    B.querySelectorAll('[data-payacc]').forEach(b => b.onclick = () => { if (payAccounts()) { const box = b.closest('.db-acc'); if (box) box.innerHTML = '<div class="db-h"><span>Friday</span><span>The week\'s accounts</span></div>' + accountsHtml(S.l5.acc, false); } }); }
  else if (c.kind === 'deal') { B.innerHTML = dealHtml(c.id); B.querySelectorAll('[data-offer]').forEach(b => b.onclick = () => { makeOffer(c.id, b.dataset.offer); nextCard(); });
    B.querySelectorAll('[data-dealloan]').forEach(b => b.onclick = () => { takeLoan(+b.dataset.dealloan); cardQueue.unshift(c); nextCard(); }); }
  if (B.querySelector('.who')) B.classList.add('person');   // every card with a person on it gets the speech-bubble style
  B.querySelectorAll('[data-next]').forEach(b => b.onclick = () => { sfx('tap'); nextCard(); });
  sfx('tap');
}
function meet(id){ if (!S.met[id]) story({ kind:'person', id }); }
/* =====================================================================
   GUS MALLORY, THE OLD FOREMAN (Bible Addendum, build 0.17)
   He kept the works for the owner's grandfather. After day one he pitches in: he runs the crate machine
   while nobody is posted on it, carries crates while there is no loader, and otherwise keeps an eye on the
   line (crew within 5 m of him work 10% faster). He works at three quarters of a new hand's pace: he is 66.
   At level 5 he retires: a farewell party, gifts both ways, then $150 a month on Priya's wage bill.
   ===================================================================== */
const GUS_WATCH = () => P.gus2, GUS_PACE = .75, GUS_LIFT = 5, PENSION = 150;
const GUS_LINES = ['Your grandad cut the first crate here in 1931. Same saw, new blade.', 'Keep the floor swept and the saw sings. He used to say that.', 'Easy with that pallet. Lift with the knees.',
  'I\'ve seen this yard empty. I like it better full.', 'Tea\'s in my flask if anyone wants it.', 'That truck driver\'s father drove for us too.', 'Steady hands make square crates.', 'Listen to her run. That\'s a happy machine.'];
const GUS_CHEERS = ['That\'s the way!', 'Your grandad would be grinning.', 'Another one out the gate!', 'Ha! Paid on the nail.'];
const GUS_MILES = [[50, '50 crates shipped. Gus: "Your grandad\'s best week was 90."'], [100, '100 crates shipped. Gus: "There. You beat your grandad\'s record."'], [250, '250 crates shipped. Gus: "The valley is talking about this yard again."'], [500, '500 crates shipped. Gus: "I never thought I\'d see the day."'], [1000, '1,000 crates shipped. Gus has tears in his eyes.']];
function gusChar(){ const g = folk.get('gus'); return g && S.tutDone && !(S.gus.retired && g.job !== 'leave' && g.job !== 'visit') ? g : null; }
function gusLift(c){ if (!c.st || c.st.id <= 0) return false; const g = folk.get('gus'); return !!(g && g.job === 'watch' && !S.gus.retired && dist2(c.o, [g.o.position.x, g.o.position.z]) < GUS_LIFT); }
function gusWants(g){
  if (S.gus.party) return 'party';
  if (!sawOp() && circuitOn('saw') && !(ownerOn(P.op) && g.job !== 'saw') && (orderLeft() > 0 || stockLeftC() > 0 || g.job === 'saw' && S.order)) return 'saw';
  if (!loadersHired() && truck.state === 'docked' && S.order && !S.order.ready && (g.stack.length || (S.pallet > 0 && needCrates() - truckCrates() > 0))) return 'carry';
  return 'watch';
}
function gusSay(g, text, k = 3.4){ g.say = { text, until:T + k }; }
function gusStart(g, job){
  g.job = job; g.path = null; g.wait = 0;
  if (job === 'saw') { g.gs = 'toSaw'; goTo(g, ...P.op); if (!S.gus.sawTold) { S.gus.sawTold = true; gusSay(g, 'I\'ll mind the machine till you post an operator.'); } }
  else if (job === 'carry') { g.gs = g.stack.length ? 'toTruck' : 'toPallet'; if (g.stack.length) goTo(g, P.drop[0] - .3, P.drop[1] + .35); else goTo(g, P.pallet[0] + .55, P.pallet[1] + .5); if (!S.gus.carryTold) { S.gus.carryTold = true; gusSay(g, 'No loader yet? These old arms can manage two at a time.'); } }
  else if (job === 'watch') { g.gs = 'toWatch'; goTo(g, ...GUS_WATCH()); }
}
// ---- level 2 ground works (build 0.17): the pipe machine's pad, the loading lane to the dock, bay 2, the warehouse plot
// build 0.21h: nothing paints itself. The pipe machine's pad is pegged out when it is paid for; the loading lane and the
// bays are marked when the owner buys the paint (a pad, like the floor lines at level 1); the warehouse plot is pegged
// out with cones once the warehouse can be built, and Big Tom waits there for the job then, not before
function l2Ground(){
  if (M.l2Ground) return; M.l2Ground = true;
  const pad = paintMat('#e3b23c'), lane = paintMat('#f2efe6', .9), grab = () => { const n0 = world.children.length; return () => world.children.slice(n0); };
  M.l2Mill = new THREE.Group(); M.l2Mill.userData.dyn = true; world.add(M.l2Mill);
  M.l2Lane = new THREE.Group(); M.l2Lane.userData.dyn = true; world.add(M.l2Lane);
  let got = grab();
  dashRect(P.pmill[0] - 2.5, P.pmill[1] - 1.5, P.prack[0] + 1.15, P.prack[1] + .95, pad, .55, .35, .1);
  groundLabel('PIPE MACHINE', P.pmill[0] - .6, P.prack[1] + .45, 2.6);
  for (const m of got()) if (m !== M.l2Mill && m !== M.l2Lane) M.l2Mill.attach(m);
  got = grab();
  for (const z of [P.dock[1] - 2.05, P.dock[1] - .35]) paintStrip((2.6 + 9.9) / 2, z, 9.9 - 2.6, .1, 'x', lane);
  groundLabel('LOADING LANE', 6.0, P.dock[1] - 1.2, 2.8, 0, '#f2efe6');
  paintStrip(P.bay2[0] + 1.55, P.bay2[1] + .2, 6.0, .16, 'z', pad);
  for (let k = 0; k < 6; k++) paintStrip(P.bay2[0] - 1.25 + k * .5, P.bay2[1] - 2.75, .5, .16, 'x', paintMat(k % 2 ? '#1b1b1b' : '#e3b23c'));
  groundLabel('BAY 1', P.truck[0], P.truck[1] + 2.6, 1.6); groundLabel('BAY 2', P.bay2[0], P.bay2[1] + 2.6, 1.6);
  for (const m of got()) M.l2Lane.attach(m);
  // the warehouse plot: pegged out with cones until the warehouse goes up
  M.whPlot = new THREE.Group(); M.whPlot.userData.dyn = true; world.add(M.whPlot);
  const d0 = M.dashes.length; dashRect(P.wh[0] - 3.7, P.wh[1] - 2.9, P.wh[0] + 3.7, P.wh[1] + 3.3, paintMat('#f2efe6', .8), .45, .3, .08); M.dashes.slice(d0).forEach(m => M.whPlot.attach(m));
  M.whPlot.attach(groundLabel('WAREHOUSE PLOT', P.wh[0], P.wh[1] + .2, 3.2, 0, '#f2efe6'));
  const cone = new THREE.ConeGeometry(.16, .5, 10), coneM = std('#e5772b', .7);
  for (const [dx, dz] of [[-3.7, -2.9], [3.7, -2.9], [-3.7, 3.3], [3.7, 3.3], [0, 3.3]]) { const c = new THREE.Mesh(cone, coneM); c.position.set(P.wh[0] + dx, .25, P.wh[1] + dz); c.castShadow = true; M.whPlot.add(c); }
  syncL2Marks();
}
let whOpenSeen = false;
function syncL2Marks(){
  if (!M.l2Ground) return;
  M.l2Mill.visible = S.lv2.mill >= 1; M.l2Lane.visible = !!S.restored.lanes;
  const whOpen = S.level === 2 && whUnlocked(S) && !(S.lv2.wh >= 1); M.whPlot.visible = whOpen;
  if (whOpen !== whOpenSeen) { whOpenSeen = whOpen; if (whOpen) spawnFolk('tom', P.tomL2, .3); else despawnFolk('tom'); if (whOpen && S.tutDone) toast('Big Tom has pegged out the warehouse plot in the back yard. Pay at its pad when you are ready to build.', 'gold'); }
}
// test hook: the level 2 layout on a level 1 game, for map shots
async function previewL2Layout(){ await loadModels(['pipe_machine', 'level2']); A.level2.scene.traverse(o => { if (/^l2_/.test(o.name) && !o.isMesh && !PROTO[o.name]) PROTO[o.name] = o; });
  if (!S.restored.yard) applyRestore('yard', false); const lv = S.level; S.level = 2; buildLevel2(); finishMill(false); placeFolk(); S.level = lv; return true; }
// ---- the loading dock: who stands on it, the dock lamp ---------------------------------------------------------------
const LDOCK = { deck:null, ramp:null, fork:null, H:.95, more:[] };
function groundY(x, z){
  for (const D of LDOCK.more) { const d = D.deck, r = D.ramp; if (x > d[0] && x < d[2] && z > d[1] && z < d[3]) return LDOCK.H; if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return LDOCK.H * (x - r[0]) / (r[2] - r[0]); }   // dock 2 (Level 5)
  const d = LDOCK.deck; if (!d) return 0;
  if (x > d[0] && x < d[2] && z > d[1] && z < d[3]) return LDOCK.H;
  const r = LDOCK.ramp; if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) return LDOCK.H * (x - r[0]) / (r[2] - r[0]);   // up the slope
  const f = LDOCK.fork; if (f && x > f[0] && x < f[2] && z > f[1] && z < f[3]) return LDOCK.H * (z - f[1]) / (f[3] - f[1]);   // the forklift ramp, rising south onto the deck
  return 0;
}
const _gd = new THREE.Vector3();
// A platform trolley is rigid: its rear wheels (0.38 m ahead of the pusher's feet) and front wheels (0.92 m) each stand on the
// concrete under them, so it pitches by the difference and lifts by the rear wheels' height: flat in the yard, kinked at the
// foot of the ramp with the front wheels already climbing, along the slope, and onto the deck. Its load rides on its bed.
const CART_REAR = .38, CART_FRONT = .92, CART_STEP = .14;   // more than the ramp gives over the wheelbase is an edge (the deck's face): the trolley stays level, it never hangs over
function cartOnGround(c){ const k = c.cart, p = c.o.position, ry = c.o.rotation.y, d = _gd.set(Math.sin(ry), 0, Math.cos(ry));   // the facing now, not the last drawn frame's
  const hr = groundY(p.x + d.x * CART_REAR, p.z + d.z * CART_REAR), hf0 = groundY(p.x + d.x * CART_FRONT, p.z + d.z * CART_FRONT), hf = Math.abs(hf0 - hr) > CART_STEP ? hr : hf0, sz = (hf - hr) / (CART_FRONT - CART_REAR), a = Math.atan(sz);
  k.rotation.x = -a; k.position.y = (hr - p.y) - CART_REAR * Math.sin(a);
  for (const m of c.stack) if (!m.userData.flying && m.parent === c.o) k.add(m); }   // a load handed over by a flight lands on the bed, not in mid-air
function updateDock(dt){
  // everybody stands on the surface under their feet: the yard, the dock ramp's slope, the deck. Exact, every frame, so a
  // walker climbs the ramp step by step and nobody sinks into it when a work spot or a waypoint sets them down
  for (const c of [owner, ...staffObj.values(), ...folk.values(), ...temps, ...(walker ? [walker.c] : []), ...(bolt.o ? [bolt] : [])]) { if (!c || !c.o) continue; const p = c.o.position; p.y = groundY(p.x, p.z);
    // a trolley being pushed lies on the slope: pitched with the ground along the way it points, wheels on the concrete
    if (c.cart) cartOnGround(c); }
  if (M.dockLamp) setLamp(M.dockLamp, '#ffd28a', truck.state === 'docked' ? 2.4 : 0);
}
// ---- the mains: apply, the council permit, the board's crew fits the transformer, then the generator stands by -------
function applyMains(){ if (S.level < 3 || S.mains.st || S.cash < MAINS_PRICE) return; S.cash -= MAINS_PRICE; S.mains = { st:1, t:0 }; sfx('buy'); toast('Application sent to the Valley Electricity Board. The permit takes under a minute.', 'good'); save(); renderOffice(); }
function updateMains(dt){
  const m = S.mains;
  if (M.xfTank) M.xfTank.visible = m.st >= 3 || (m.st === 2 && m.t > MAINS_FIT * .45);
  if (M.xfLamp) setLamp(M.xfLamp, ...(m.st < 3 ? ['#101010', 0] : mainsUp() ? LAMP_RUN() : LAMP_STOP));
  if (m.st === 1) { m.t += dt; if (m.t >= MAINS_PERMIT) { m.st = 2; m.t = 0; toast('Permit granted. The board\'s linesmen are fitting the transformer on the pole.', 'gold'); save(); } }
  else if (m.st === 2) { m.t += dt; if (Math.random() < dt * 3) spark(P.xfmr[0] + rand(-.6, .6), 4.6 + rand(0, 1.6), P.xfmr[1]);
    if (m.t >= MAINS_FIT) { m.st = 3; m.t = 0; sfx('levelup'); floatText('Mains live', P.xfmr[0], 3, P.xfmr[1], 'info'); toast('Mains live! The works runs on the mains now; the generator stands by and starts by itself in a power cut.', 'gold'); save(); renderOffice(); } }
}
function mainsHtml(){
  const m = S.mains, left = m.st === 1 ? MAINS_PERMIT - m.t : m.st === 2 ? MAINS_FIT - m.t : 0;
  const head = `<div class="dept"><div class="dept-h"><span class="ic">${icon('bolt')}</span><div><b>Mains supply</b><small>Valley Electricity Board · pole transformer outside the east fence</small></div><span class="cap ${m.st >= 3 ? 'ok' : ''}">${['NOT CONNECTED', 'PERMIT', 'FITTING', 'LIVE'][Math.min(3, m.st)]}</span></div>`;
  if (m.st >= 3) return head + `<div class="kv"><span>Supply</span><span>${mainsUp() ? 'Mains, ' + MAINS_KW + ' kW' : 'Power cut: the backup generator is running'}</span><span>Generator</span><span>Backup only: starts by itself in a power cut</span><span>Diesel</span><span>Burnt only while the backup runs</span><span>Power bill</span><span>30% less than running on diesel</span></div></div>`;
  if (!m.st && S.level < 3) return head.replace('NOT CONNECTED', 'LEVEL 3') + `<div class="kv"><span>Mains connection</span><span>The board connects works from level 3. Until then the generator's limit is yours to manage.</span></div></div>`;
  if (m.st) return head + `<div class="kv"><span>${m.st === 1 ? 'Council permit' : 'Linesmen fitting the transformer'}</span><span>${Math.max(0, Math.ceil(left))} s</span></div></div>`;
  return head + `<div class="up"><span class="ic">${icon('bolt')}</span><div><b>Apply for a mains connection</b><span class="note">${MAINS_KW} kW from the mains, the generator kept as the backup</span></div><button class="btn primary" data-mains="1" type="button" ${S.cash >= MAINS_PRICE ? '' : 'disabled'}>${fmt(MAINS_PRICE)}</button>
    <p>The board fits a transformer on its pole outside the east fence (permit ${MAINS_PERMIT} s, fitting ${MAINS_FIT} s). Then the works runs on the mains: ${MAINS_KW} kW instead of the generator's ${genKW()}, no diesel burnt, and a cheaper power bill. In a power cut the generator starts by itself.</p></div></div>`;
}
// where Gus puts down what is in his arms: crates on the pallet, pipes on the pipe rack, tools on the tool rack
function gusPutBack(g){
  const t = g.carryType;
  if (t === 'pipe' && M.prack) return { at:P.prackSpot, give:() => giveTo(g, 'rack', world, pipeRackPos, () => syncPipes()) && (S.pipes++, true) };
  if (t === 'toolbox' && M.trackRack) return { at:P.trackSpot, give:() => giveTo(g, 'rack', world, toolRackPos, () => syncTools()) && (S.tools++, true) };
  return { at:[P.pallet[0] + .55, P.pallet[1] + .5], give:() => giveTo(g, 'pallet', world, palletPos, () => syncPallet()) && (S.pallet++, true) };
}
function updateGus(dt){
  gusVisitTick(); const g = folk.get('gus'); if (!g || !S.tutDone) return;
  g.old = true; g.wait = Math.max(0, (g.wait || 0) - dt);
  if (S.gus.retired) { gusVisit(g, dt); return; }
  if (S.level >= 5 && S.gus.partyDue && !S.gus.retired && !S.gus.party && isFriday() && dayMin() >= 578 && !(S.day && S.day.closing) && !cardOpen) { S.gus.party = 1; toast('Friday, the last afternoon: the crew downs tools for Gus Mallory\'s farewell.', 'gold'); }
  if (S.level >= 5 && !S.gus.told && !cardOpen && S.time - (S.l5.t0 || 0) > 40) { S.gus.told = true; story({ kind:'gusnews' }); return; }
  if (S.gus.party) { gusParty(g, dt); return; }
  // milestones he is proud of
  for (const [n, msg] of GUS_MILES) if (S.gus.shipped < n && S.shipped >= n) { S.gus.shipped = n; toast(msg, 'gold'); milestonePhoto(`${n} crates shipped`); gusSay(g, pick(GUS_CHEERS)); g.play('cheer'); g.lock = 1.6; }
  if (g.lock > 0) { g.lock -= dt; return; }
  if (g.holdUntil) { if (T < g.holdUntil || gateSwinging()) { g.play('idle'); return; } g.holdUntil = 0; }   // waiting on the road for the gates to open
  // knocking-off: Gus walks out with the crew (after putting down anything in his arms)
  if (S.day && S.day.closing && !g.stack.length) {
    if (g.gone) return;
    if (g.job !== 'home') { if (g.job === 'lunch' && g.gs === 'eat') standUp(g); g.job = 'home'; g.lunchI = undefined; goTo(g, P.frontOut[0] + .45, P.frontOut[1] - .1); gusSay(g, pick(['Night, boss. Lock up behind me.', 'Good day\'s work. Night.', 'My missus will have the tea on. Night!'])); }
    if (walk(g, dt)) { g.gone = true; g.o.visible = false; } return; }
  // lunch (build 0.18): Gus sits down with the crew, once anything in his arms is put down
  if (lunchTime() && !g.stack.length) {
    if (g.job !== 'lunch') { g.job = 'lunch'; g.lunchI = lunchSpot(g); const s = LUNCH_SPOTS[g.lunchI]; goTo(g, s[0], s[1]); g.gs = 'go'; }
    if (g.gs === 'go') { if (walk(g, dt)) { g.gs = 'eat'; sitDown(g, g.lunchI); } return; }
    const s = LUNCH_SPOTS[g.lunchI]; g.play(s[2] ? 'sit' : 'idle'); if (!s[2]) g.faceTo([-9.7, -1.8], dt); return; }
  if (g.job === 'lunch') { if (g.gs === 'eat') standUp(g); g.job = null; g.lunchI = undefined; }
  if (trip && !S.gus.retired && gusMind(g, dt)) return;
  const want = gusWants(g);
  if (g.job !== want && g.job !== 'back' && !(g.job === 'carry' && g.stack.length && truck.state === 'docked' && S.order && !S.order.ready)) {
    if (g.stack.length) { g.job = 'back'; g.gs = 'toPallet'; goTo(g, ...gusPutBack(g).at); }   // the truck (or the gate customer) left with goods in his arms: put them back where they came from
    else gusStart(g, want); }
  if (g.job === 'back') { if (g.gs === 'toPallet') { if (walk(g, dt)) g.gs = 'put'; return; }
    g.play('idle'); if (g.wait > 0) return; if (g.stack.length && gusPutBack(g).give()) { g.wait = .3; return; } if (!g.stack.length) g.job = null; return; }
  if (g.job === 'saw') {
    if (g.gs === 'toSaw') { if (walk(g, dt)) { g.gs = 'at'; g.o.position.set(P.op[0], 0, P.op[1]); g.faceNow(Math.PI); } return; }
    g.faceNow(Math.PI); g.play(sawBy === g ? 'work' : 'idle'); return; }
  if (g.job === 'carry') {
    if (g.gs === 'toPallet') { if (walk(g, dt)) { g.gs = 'take'; g.wait = .3; } return; }
    if (g.gs === 'take') { g.play('idle'); if (g.wait > 0) return;
      if (g.stack.length < 2 && S.pallet > 0 && needCrates() - truckCrates() > 0 && takeFrom('pallet', g, 'crate')) { S.pallet--; syncPallet(); sfxAt('pick', g.o.position.x, g.o.position.z, .5); g.wait = .35; return; }
      if (g.stack.length) { g.gs = 'toTruck'; goTo(g, P.drop[0] - .3, P.drop[1] + .35); } else g.job = null; return; }
    if (g.gs === 'toTruck') { if (walk(g, dt)) { g.gs = 'give'; g.wait = .3; } return; }
    if (g.gs === 'give') { g.play('idle'); if (g.wait > 0) return; if (g.stack.length && loadCrate(g)) { g.wait = .35; return; } if (!g.stack.length) g.job = null; return; } }
  if (g.job === 'watch') {
    if (g.gs === 'toWatch') { if (walk(g, dt)) g.gs = 'at'; return; }
    g.faceTo(P.saw, dt); g.play('idle');
    g.lineT = (g.lineT ?? 25) - dt; if (g.lineT <= 0) { g.lineT = 35 + Math.random() * 25; gusSay(g, pick(GUS_LINES), 4.2); if (Math.random() < .5) { g.play('point'); g.lock = 1; } } }
}
function gusCheer(){ const g = gusChar(); if (!g || S.gus.party) return; gusSay(g, pick(GUS_CHEERS), 2.6); g.play('cheer'); g.lock = 1.6;
  for (let i = 0; i < 14; i++) sprite(pick(['#e8ab2c', '#d9534f', '#3f8fd0', '#f4efe2']), g.o.position.x + rand(-.3, .3), 1.9, g.o.position.z + rand(-.3, .3), rand(-.8, .8), rand(1, 2.2), rand(-.8, .8), 1.3, .07, 3); }
// --- the farewell party (level 5) ---------------------------------------------------------------------
const partySpot = () => [P.wsDoor[0], P.wsDoor[1] + 2.4];
let partyT = 0;
function partyDecor(on){
  if (!on) { if (M.party) { M.party.removeFromParent(); M.party = null; } return; }
  if (M.party) return; const g = new THREE.Group(), [x, z] = partySpot();
  const post = (px) => { const m = new THREE.Mesh(CY(.035, 2.6, 6), std('#6b5136')); m.position.set(px, 1.3, z - 1.1); g.add(m); };
  post(x - 2.6); post(x + 2.6);
  const cols = ['#d9534f', '#e8ab2c', '#3f8fd0', '#f4efe2', '#4f9a5a'];
  for (let i = 0; i < 17; i++) { const t = i / 16, fx = x - 2.5 + t * 5, fy = 2.45 - Math.sin(t * Math.PI) * .35;
    const f = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 3), std(cols[i % cols.length], .9)); f.rotation.z = Math.PI; f.position.set(fx, fy - .1, z - 1.1); g.add(f); }
  const top = new THREE.Mesh(BX(1.5, .06, .7), std('#8a6a44')); top.position.set(x + 2.0, .78, z + .1); g.add(top);
  for (const [dx, dz] of [[-.65, -.28], [.65, -.28], [-.65, .28], [.65, .28]]) { const l = new THREE.Mesh(BX(.06, .76, .06), std('#6b5136')); l.position.set(x + 2.0 + dx, .38, z + .1 + dz); g.add(l); }
  const cloth = new THREE.Mesh(BX(1.56, .02, .76), std('#f2ede0', .95)); cloth.position.set(x + 2.0, .82, z + .1); g.add(cloth);
  const cake = new THREE.Mesh(CY(.2, .18, 18), std('#f6efe4', .7)); cake.position.set(x + 1.8, .92, z + .1); g.add(cake);
  const icing = new THREE.Mesh(CY(.205, .04, 18), std('#d97a8a', .6)); icing.position.set(x + 1.8, 1.02, z + .1); g.add(icing);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(CY(.035, .24, 8), std('#3d5a2e', .3)); b.position.set(x + 2.35 + (i % 2) * .12, .95, z + (i < 2 ? -.12 : .1)); g.add(b); }
  world.add(g); M.party = g;
}
function partySlots(n){ const [x, z] = partySpot(), out = []; for (let i = 0; i < n; i++) { const a = n === 1 ? 0 : -1.1 + 2.2 * i / (n - 1); out.push([x + Math.sin(a) * 1.7, z + Math.cos(a) * 1.7]); } return out; }
function gusParty(g, dt){
  const [x, z] = partySpot();
  if (S.gus.party === 1) { S.gus.party = 2; partyT = 0; partyDecor(true); gusStart(g, null); goTo(g, x, z); g.gs = 'toParty';
    const crew = [...staffObj.values()]; partySlots(crew.length).forEach((sp, i) => { const c = crew[i]; c.party = { at:sp, gs:'go' }; c.path = null; goTo(c, ...sp); });
    toast('Everyone downs tools: Gus Mallory\'s farewell, in front of the workshop.', 'gold'); }
  partyT += dt;
  if (g.gs === 'toParty') { if (walk(g, dt)) { g.gs = 'at'; g.faceNow(0); } } else { g.play(partyT % 6 < 1.6 ? 'cheer' : 'idle'); }
  if (Math.random() < dt * 6) sprite(pick(['#e8ab2c', '#d9534f', '#3f8fd0', '#f4efe2', '#4f9a5a']), x + rand(-2.4, 2.4), 2.6, z + rand(-1.2, .6), rand(-.3, .3), rand(-.2, .4), rand(-.3, .3), 2.4, .06, 1.2);
  if (partyT > 1 && !g.sang) { g.sang = true; partyTune(); }
  if (partyT > 3 && partyT < 14 && Math.random() < dt * 1.2) { tone(2600 + Math.random() * 600, .08, 'sine', .015); tone(3300, .06, 'sine', .01, .03); }   // bottles of ale clink
  if (partyT > 5 && !g.toast1) { g.toast1 = true; gusSay(g, 'Fifty-two years. I was fourteen when your grandad gave me a broom.', 5); }
  if (partyT > 11 && !g.toast2) { g.toast2 = true; const c = [...staffObj.values()][0]; if (c) c.say = { text:'Speech! Speech!', until:T + 2.5 }; }
  if (partyT > 16 && S.gus.party === 2) { S.gus.party = 3; story({ kind:'farewell' }); }
  else if (S.gus.party === 3 && !cardOpen && !cardQueue.some(c => c.kind === 'farewell')) { if (S.gus.gift) gusFarewellDone(); else story({ kind:'farewell' }); }   // the card was put away: a chosen gift sees him off; no gift yet, the card comes back (the clock is free)
}
function partyStep(c, dt){   // a crew member at the party: walk to a place in the ring, face Gus, cheer now and then
  const pa = c.party, [x, z] = partySpot();
  if (pa.gs === 'go') { if (walk(c, dt)) pa.gs = 'at'; return; }
  c.faceTo([x, z], dt); c.play((partyT + c.st.id) % 5 < 1.3 ? 'cheer' : 'idle');
}
function partyTune(){ if (!AC) return; const n = [392, 392, 440, 392, 523, 494, 392, 392, 440, 392, 587, 523]; n.forEach((f, i) => tone(f, .26, 'triangle', .05, i * .3)); }
const GIFTS = {
  watch:{ name:'An engraved gold watch', cost:1200, txt:'"For fifty-two years at the gates." The whole valley hears about it: reputation +6.' },
  rod:{ name:'A fishing rod and a week at Lake Tarn', cost:500, txt:'He always talked about the lake. The crew is in high spirits: everyone works 10% faster for 5 minutes.' },
  clock:{ name:'The old brass clock from the workshop', cost:0, txt:'It hung over his bench for half a century. It costs nothing and means everything: reputation +2.' },
};
function giveGift(k){ const G = GIFTS[k]; if (!G || S.gus.gift || S.cash < G.cost) return; S.cash -= G.cost; S.gus.gift = k;
  if (k === 'watch') repChange(6); else if (k === 'clock') repChange(2); else S.gus.cheerUntil = S.time + 300; sfx('buy'); save(); }
function gusFarewellDone(){
  const g = folk.get('gus'); S.gus.retired = true; S.gus.party = 0; S.gus.toolbox = true; S.gus.visitAt = S.time + 480;
  for (const c of staffObj.values()) if (c.party) { c.party = null; c.path = null; c.state = 'idle'; }
  if (g) { g.job = 'leave'; g.gs = 'go'; goTo(g, ...P.frontOut); gusSay(g, 'Look after her. She\'ll look after you.', 4); }
  setTimeout(() => partyDecor(false), 12000);
  toast('Gus has retired. His pension, $150 a month, is on Priya\'s wage bill from now on.', 'gold'); save(); renderOffice();
}
// after he retires: he walks out of the gate, and drops by now and then to see how the yard is doing
function gusVisit(g, dt){
  if (g.job === 'leave') { if (walk(g, dt)) { despawnFolk('gus'); } return; }
  if (g.job === 'visit') {
    if (g.gs === 'in') { if (walk(g, dt)) { g.gs = 'stay'; g.wait = 18; gusSay(g, S.l8 && S.l8.whistleSay ? (S.l8.whistleSay = false, 'Here, Joe. Grandad\'s whistle. Blow it like you mean it.') : S.l6 && S.l6.pensionSay ? (S.l6.pensionSay = false, 'Pension came through. Thank you, boss.') : pick(['Just passing. Couldn\'t keep away.', 'Pension came through. Thank you, boss.', 'The fish aren\'t biting. Thought I\'d see the saw.']), 4); g.play('cheer'); } return; }
    if (g.gs === 'stay') { g.faceTo(P.saw, dt); if (g.wait <= 0) { g.gs = 'out'; goTo(g, ...P.frontOut); } return; }
    if (g.gs === 'out') { if (walk(g, dt)) despawnFolk('gus'); return; } }
}
function gusVisitTick(){
  if (!S.gus.retired || folk.has('gus') || S.time < S.gus.visitAt || cardOpen) return;
  S.gus.visitAt = S.time + 480 + Math.random() * 240; const g = spawnFolk('gus', P.frontOut, Math.PI); if (!g) return;
  g.old = true; g.job = 'visit'; g.gs = 'in'; goTo(g, ...GUS_WATCH()); toast('Gus Mallory has dropped by to see the yard.', 'info');
}
function gusDoing(){ const g = folk.get('gus');
  if (S.gus.retired) return ['RETIRED', 'Retired · pension $35 a week on the Friday accounts'];
  if (!S.tutDone) return ['DAY ONE', 'Showing you the ropes'];
  if (!g) return ['ON SITE', 'Around the yard'];
  return g.job === 'saw' ? ['ON THE MACHINE', 'Running the crate machine until you post an operator'] : g.job === 'carry' || g.job === 'back' ? ['CARRYING', 'Carrying crates to the truck until you post a loader'] : ['KEEPING AN EYE', `Watching the line: crew within ${GUS_LIFT} m of him work 10% faster`]; }
function gusCard(){ const [cap, now] = gusDoing();
  return `<div class="dept"><div class="dept-h"><span class="ic">${icon('star')}</span><div><b>Gus Mallory · Old foreman</b><small>Kept the works for your grandfather · free${S.gus.retired ? '' : ' until he retires at level 5'}</small></div><span class="cap ok">${cap}</span></div>
    <div class="kv"><span>Now</span><span>${now}</span>${S.gus.retired ? `<span>His gift to the works</span><span>Grandad's toolbox: repairs 15% faster</span>${S.gus.gift ? `<span>Your gift to him</span><span>${GIFTS[S.gus.gift].name}</span>` : ''}` : `<span>Fills in</span><span>The crate machine while nobody is posted on it, then the crates while there is no loader</span><span>Pace</span><span>${Math.round(GUS_PACE * 100)}% of a new hand: he is 66</span>`}</div></div>`; }

// --- land: listing, three offers, council permit, site work, connection (Master Design Doc) -------------
const PLOTS = {
  north:{ name:'North field', lv:3, seller:'abel', price:3000, adds:'Tool machine pad and a parts store (level 3)', sign:[13.8, -11.3], ring:[13.8, -10.4],
          sweet:'His two nephews want work: your next two hires cost nothing', quote:'Keep my fence line straight and it\'s yours.' },
  road:{ name:'Road frontage', lv:4, seller:'council', price:6000, adds:'Second dock and a truck park (level 5)', sign:[8.8, 12.0], ring:[8.8, 10.9], sweetCost:500,
          sweet:'Pay for the road repair as well ($500): +5 reputation in the valley', quote:'The council sells the frontage to whoever keeps the road fit for lorries.' },
  shop:{ name:'Ada Finch\'s corner plot', lv:5, seller:'ada', price:14000, adds:'The second pipe mill and dock 2 (this level)', sign:[19.6, 18.75], ring:[19.6, 18.45],
          sweet:'Give her daughter June a job when the office needs a clerk: the clerk\'s hire at level 6 costs nothing', quote:'Forty years behind that counter. Treat my June right and the plot is yours.' },
  scrap:{ name:'Scrapyard next door', lv:3, seller:'rusty', price:3600, adds:'Forklift yard and a machine pad (level 4)', sign:[-8.6, 6.05], ring:[-8.6, 5.0],
          sweet:'He leaves a working crate machine in the yard: your second crate machine at level 4 is free', quote:'The heaps go, the price stays. Fair\'s fair.' },
};
const ACT_TIMERS = { permit:30, site:60 };   // Act I (levels 1 to 4): council permit 30 s, site work 1 minute
const plotSt = id => S.plots[id].st;          // 0 for sale, 1 permit, 2 site work, 3 owned
const plotOwned = id => S.plots[id].st >= 3;
const negotiateDisc = () => clamp(Math.floor((S.rep - 50) / 2.5), 0, 20) / 100;
function offerPrice(id, kind){ const P0 = PLOTS[id].price * (1 - .05 * (S.skills.deals || 0)); return Math.round((kind === 'neg' ? P0 * (1 - negotiateDisc()) : P0) * 1.05) + (kind === 'sweet' ? PLOTS[id].sweetCost || 0 : 0); }
function dealHtml(id){
  const pl = PLOTS[id], sel = PEOPLE[pl.seller], can = k => S.cash >= offerPrice(id, k), d = Math.round(negotiateDisc() * 100);
  const offer = (k, title, txt) => `<div class="offer"><b>${title}</b><button class="btn ${can(k) ? 'primary' : ''}" data-offer="${k}" type="button" ${can(k) ? '' : 'disabled'}>${fmt(offerPrice(id, k))}</button><p>${txt}</p></div>`;
  return `<button class="skip" data-next type="button">CLOSE</button><div class="note" style="letter-spacing:.2em;text-transform:uppercase">Land for sale · Valley Estates</div>
    <div class="who"><img alt="" src="${portrait(pl.seller)}"><div><b>${pl.name}</b><small>${sel.name}, ${sel.role.toLowerCase()}</small></div></div><p class="quote">"${pl.quote}"</p>
    <div class="kv"><span>Asking price</span><span>${fmt(pl.price)} + 5% fee</span><span>What it adds</span><span>${pl.adds}</span><span>Council permit</span><span>${Math.round(ACT_TIMERS.permit * permitK())} s</span><span>Site work</span><span>${ACT_TIMERS.site} s, Big Tom's crew</span>${pl.seller === 'council' ? '<span>Sold by</span><span>The council\'s permit office, direct</span>' : ''}</div>
    ${offer('pay', 'Pay the asking price', 'The deal closes at once and the permit starts.')}
    ${offer('neg', `Negotiate${d ? ` (${d}% off)` : ''}`, d ? `Your reputation earns ${d}% off. The permit takes twice as long.` : 'Your reputation is too low to earn a discount (1% for every 2.5 points over 50%).')}
    ${offer('sweet', 'Take the sweetener', `${pl.sweetCost ? 'Asking price plus the extra' : 'Full price'}. ${pl.sweet}.`)}
    ${S.cash < offerPrice(id, 'neg') ? (S.level >= 5 && loanRoom() >= 5000 ? `<div class="offer"><b>Borrow from the Valley Bank</b><button class="btn" data-dealloan="${Math.min(loanRoom(), Math.ceil((offerPrice(id, 'pay') - S.cash) / 5000) * 5000)}" type="button">${fmt(Math.min(loanRoom(), Math.ceil((offerPrice(id, 'pay') - S.cash) / 5000) * 5000))}</button><p>Eldon Graves lends against your bills: repaid with 10% interest over the next 4 bills.</p></div>` : `<p class="note">You need more cash for any offer.${S.level >= 5 ? (S.l5.account ? '' : ' The Valley Bank across the road lends once you open an account.') : ''} Earn it and come back to the sign.</p>`) : ''}`;
}
function openDeal(id){ if (plotSt(id) !== 0 || S.level < PLOTS[id].lv) return; if (PLOTS[id].seller !== 'council') meet('vera'); meet(PLOTS[id].seller); story({ kind:'deal', id }); }
function makeOffer(id, kind){
  const price = offerPrice(id, kind); if (S.cash < price || plotSt(id) !== 0) return;
  const sg = id === 'north' ? M.fieldSign : id === 'road' ? M.roadSign : id === 'shop' ? M.shopSign : M.scrapSign; if (sg) sg.userData.sold.visible = true;
  S.cash -= price; Object.assign(S.plots[id], { st:1, t:0, offer:kind, paid:price, permit:Math.round(ACT_TIMERS.permit * permitK() * (kind === 'neg' ? 2 : 1)) });
  if (kind === 'sweet') { if (id === 'north') S.freeHires = (S.freeHires || 0) + 2; if (id === 'scrap') S.perks.freeCrateMachine = true; if (id === 'road') repChange(5, true); if (id === 'shop') S.perks.freeClerk = true; }
  sfx('buy'); confetti(); toast(`${PLOTS[id].name} bought for ${fmt(price)}. The council permit takes ${S.plots[id].permit} s, then Big Tom's crew does the site work.`, 'gold');
  placeFolk(); save(); checkCharter(); renderOffice();
}
function updatePlots(dt){
  if (S.level === 2) syncL2Marks();
  for (const id of Object.keys(PLOTS)) { const p = S.plots[id];
    if (p.st === 1) { p.t += dt; if (p.t >= p.permit) { p.st = 2; p.t = 0; toast(`Council permit approved for the ${PLOTS[id].name}. Big Tom's crew starts the site work.`, 'good'); if (!M['site_' + id]) M['site_' + id] = makeBuilder(PLOTS[id].ring, -96 - Object.keys(PLOTS).indexOf(id)); save(); } }
    if (p.st === 2) { if (!M['site_' + id]) M['site_' + id] = makeBuilder(PLOTS[id].ring, -96 - Object.keys(PLOTS).indexOf(id)); runBuilder('site_' + id, PLOTS[id].sign, p, 't', ACT_TIMERS.site, () => finishPlot(id, true), dt); }
    else if (M['site_' + id] && M['site_' + id].state === 'leave') runBuilder('site_' + id, PLOTS[id].sign, p, 't', ACT_TIMERS.site, () => {}, dt);
  }
}
// The scrapyard joins the site: the gate panel comes out of the west fence, the heaps are gone, gravel goes down and
// a board says what it becomes. Its machines (the forklift yard) arrive at level 4; Rusty's crate machine waits under a tarp.
function openScrapyard(fx){
  if (M.scrapOpen) return; M.scrapOpen = true;
  if (M.scrapSign) M.scrapSign.visible = false;
  for (const f of M.scrapGate || []) f.visible = false; COL.delete('scrapGate');   // the gate panel in the west fence comes out
  for (const j of M.scrapJunk || []) j.visible = false; for (let i = 1; i <= 4; i++) COL.delete('junk' + i); COL.delete('wreck');
  // build 0.21: the whole scrapyard (x -26 to -14, z -4 to 13) is gravelled; a board by the road says what it becomes
  const pad = plane(11.6, 16.6, decal(std('#ffffff', 1, 0, { map:TX.gravel }), 1), -20.0, 4.5, .006); pad.userData.dyn = true;
  const board = put(inst('env_sale_sign'), -16.2, 12.2, 0); board.userData.dyn = true;
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .7), new THREE.MeshBasicMaterial({ map:signTex('Forklift yard', S.level >= 4 ? 'Second crate machine' : 'Opens at level 4', '#2f5d8a', 'IRON VALLEY') })); bm.position.set(0, 1.3, .08); board.add(bm); M.scrapBoardFace = bm;
  if (S.perks.freeCrateMachine && !(S.lv4.saw2 >= 1)) { M.rustyMachine = put(inst('env_tarp_machine'), ...P.saw2, .3); M.rustyMachine.userData.dyn = true; addCol([P.saw2[0] - 1.1, P.saw2[1] - .8, P.saw2[0] + 1.1, P.saw2[1] + .8], 'rustyMachine'); }
  M.scrapBoard = board;
  if (M.l4Built) buildForkYard();
  rebuildNav();
  if (fx) toast(S.level >= 4 ? 'The forklift yard is clear and gravelled: the forklift and the second crate machine go in there.' : 'The scrapyard is part of the works now. Its forklift yard opens at level 4.', 'gold');
}
// the frontage is gravelled and marked out for level 5's second dock; the fence moves out to the road at level 5
function openFrontage(fx){
  if (M.roadOpen) return; M.roadOpen = true; if (M.roadSign) M.roadSign.visible = false;
  const board = put(inst('env_sale_sign'), ...PLOTS.road.sign, 0); board.userData.dyn = true; M.roadBoard = board; if (S.level >= 5) board.visible = false;
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .7), new THREE.MeshBasicMaterial({ map:signTex('Second dock', 'Building starts at level 5', '#2f5d8a', 'IRON VALLEY') })); bm.position.set(0, 1.3, .08); board.add(bm);
  if (fx) toast('The road frontage is yours and the council permit is on the wall. The second dock goes up there at level 5.', 'gold');
}
function finishPlot(id, fx){
  const p = S.plots[id]; p.st = 3;
  if (id === 'north') { S.lv3.field = true; buyField(fx); }
  if (id === 'scrap') openScrapyard(fx);
  if (id === 'road') openFrontage(fx);
  if (id === 'shop') openShopPlot(fx);
  if (fx) { toast(`The ${PLOTS[id].name} is connected and fenced into the site.`, 'gold'); sfx('level', .5); save(); renderOffice(); }
}
// fenced plots with a For-sale sign are visible from the start (Master Design Doc); bought plots join the site
function signTex(title, sub, col, head = 'FOR SALE'){ return tex(512, 256, (g, w, h) => { g.fillStyle = '#ece6d6'; g.fillRect(0, 0, w, h); g.fillStyle = col; g.fillRect(0, 0, w, 70); g.fillStyle = '#ece6d6'; g.font = '700 50px Oswald, Arial'; g.textAlign = 'center'; g.fillText(head, w / 2, 52);
  g.fillStyle = '#2c2621'; g.font = '600 40px Oswald, Arial'; g.fillText(title, w / 2, 140); g.font = '500 28px Barlow, Arial'; g.fillText(sub, w / 2, 196); }); }
function plotSign(at, title, sub, col){
  const s = put(inst('env_sale_sign'), at[0], at[1], 0); s.userData.dyn = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .7), new THREE.MeshBasicMaterial({ map:signTex(title, sub, col) })); m.position.set(0, 1.3, .08); s.add(m);
  const sold = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .2), new THREE.MeshBasicMaterial({ color:'#c23b2a' })); sold.position.set(0, 1.42, .1); sold.rotation.z = .25; sold.visible = false; s.add(sold); s.userData.sold = sold; return s;
}
function buildPlots(){
  // the North field: the farmer's fence, a gate panel across the gap, bales of straw, his sign by the apron
  const fenceLine = (x0, z0, x1, z1, dyn, name) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.4)), ry = Math.atan2(-(z1 - z0), x1 - x0), out = [];
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; const f = put(inst('env_fence_panel'), lerp(x0, x1, t), lerp(z0, z1, t), ry); if (dyn) f.userData.dyn = true; out.push(f); }
    addCol([Math.min(x0, x1) - .1, Math.min(z0, z1) - .1, Math.max(x0, x1) + .1, Math.max(z0, z1) + .1], name); return out; };
  // build 0.16: the field lies north of the yard, between the fence and the railway; its gate is a panel run of the yard's north fence
  fenceLine(3, SITE.z0, 3, -21); fenceLine(3, -21, 23, -21); fenceLine(23, -21, 23, SITE.z0);
  M.gatePanels = M.northGate;
  const straw = new THREE.MeshLambertMaterial({ color:'#c9a24a' }), bale = new THREE.CylinderGeometry(.55, .55, 1.1, 18); bale.rotateZ(Math.PI / 2);
  M.bales = [[8.5, -16.0, .3], [14.4, -18.2, 1.4], [18.6, -15.2, 2.6], [6.2, -18.8, .9]].map(([x, z, r]) => { const b = new THREE.Mesh(bale, straw); b.position.set(x, .55, z); b.rotation.y = r; b.castShadow = true; b.userData.dyn = true; world.add(b); return b; });
  M.fieldSign = plotSign(PLOTS.north.sign, 'North field', 'Abel Thorne · Valley Estates', '#5b7a3a');
  // the scrapyard next door, west of the back yard: heaps, a wreck, drums, its own fence and Rusty's sign
  fenceLine(-26, -4, SITE.x0, -4); fenceLine(-26, 13, SITE.x0, 13); fenceLine(-26, -4, -26, 13);
  // the road frontage south of the front fence, between the gate and the road (sold by the council at level 4)
  // build 0.21c: the plot lies across the road (south of it), fenced on all four sides; nothing crosses the road
  const RS = ROAD_Z + 3.0, RB = RS + 4.5;   // off the road's far edge, on the verge; 4.5 m deep
  M.cornerFence = [...fenceLine(13.5, RS, 28.2, RS, true, 'cornerN'), ...fenceLine(13.5, RS, 13.5, RB, true, 'cornerW'), ...fenceLine(13.5, RB, 28.2, RB, true, 'cornerS')]; M.frontEast = fenceLine(28.2, RS, 28.2, RB, true, 'frontEast');
  M.roadSign = plotSign(PLOTS.road.sign, 'Road frontage', 'Valley Council · permit office', '#2f5d8a');
  // Rusty's junk is cleared by Big Tom's crew once the yard is bought, so it stays out of the static batch
  M.scrapJunk = [];
  for (const [x, z, r, sc] of [[-16.5, 0.6, .4, 1.2], [-22.0, 4.8, 2.1, 1.35], [-16.0, 9.8, 1.2, 1.1], [-22.6, 10.6, .2, 1]]) { const j = inst('env_junk_pile'); j.position.set(x, 0, z); j.rotation.y = r; j.scale.setScalar(sc); j.userData.dyn = true; world.add(j); M.scrapJunk.push(j); addCol([x - .9 * sc, z - .9 * sc, x + .9 * sc, z + .9 * sc], 'junk' + M.scrapJunk.length); }
  const car = put(inst('env_car'), -19.4, 6.6, 2.6, 0, .85); car.userData.dyn = true; car.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color && m.material.color.multiplyScalar(.55); } }); M.scrapJunk.push(car); addCol([-20.7, 5.7, -18.1, 7.5], 'wreck');
  for (const [x, z, k] of [[-14.7, 1.6, 'red'], [-15.2, 2.1, 'blue'], [-14.6, 2.6, 'olive']]) { const d = put(inst('prop_drum_' + k), x, z, Math.random() * 3); d.userData.dyn = true; M.scrapJunk.push(d); }
  M.scrapSign = plotSign(PLOTS.scrap.sign, 'Scrapyard', 'Rusty Pike · Valley Estates', '#8a4b2a');
  if (plotSt('scrap') >= 1) M.scrapSign.userData.sold.visible = true; if (plotSt('north') >= 1) M.fieldSign.userData.sold.visible = true; if (plotSt('road') >= 1) M.roadSign.userData.sold.visible = true;
  M.ring('north', ...PLOTS.north.ring, '#6fa6d6', .55); M.ring('scrap', ...PLOTS.scrap.ring, '#6fa6d6', .55); M.ring('road', ...PLOTS.road.ring, '#6fa6d6', .55);
}
function syncPlotRings(){
  for (const id of Object.keys(PLOTS)) { const r = M.rings[id]; if (!r) continue; r.g.visible = plotSt(id) === 0 && S.level >= PLOTS[id].lv && S.tutDone; }
}
// --- level 3 issues on a schedule (Master Design Doc): jam, worn part, power cut, about one every 3 minutes
const ISSUE_EVERY = 180;
let sessionT = 0;
function scheduleIssue(dt){
  sessionT += dt;
  for (const f of S.faults) if (!f.repHit && f.t > 120 && !FAULTS[f.kind].svc) { f.repHit = true; repChange(-1, true); }          // an issue left open over 2 minutes
  for (const f of [...S.faults]) if (f.kind === 'powercut' && f.t > 30) clearFault(f, null, true);           // a power cut passes in 30 s
  if (S.level < 3) return;
  const o = S.order;
  // the guided tool order: the press jams halfway, the owner fixes it by hand, then hires a mechanic
  if (o && o.guided && o.tq && !S.lv3.jam && (o.tcut || 0) >= Math.ceil(o.tq / 2) && toolOn) { S.lv3.jam = true; addFault('die', { guided:true }); return; }
  if (sessionT < 60 || cardOpen || (o && o.guided) || S.faults.filter(f => !FAULTS[f.kind].svc).length >= staffOf('mechanic').length + 2) return;
  S.nextIssue ??= S.time + ISSUE_EVERY * rand(.8, 1.2);
  if (S.time < S.nextIssue) return;
  S.nextIssue = S.time + ISSUE_EVERY * rand(.8, 1.2);
  const surgeK = [1, .8, .65, .5][Math.min(3, S.up.surge)], sturdyK = [1, .85, .7, .5][Math.min(3, S.up.sturdy)];
  const running = [['saw', sawOn, 'blade', 'belt'], ['pipe', pipeOn, 'roller', 'bearing'], ['tool', toolOn, 'die', 'spring']].filter(m => m[1]);
  if (Math.random() < Math.min(.75, .25 * surgeK * (stormOn() && !S.restored.conductor ? 3 : 1)) || !running.length) { if (powerOn()) addFault('powercut'); return; }   // the lightning conductor (L6) takes the storm's extra cuts away
  // v2.0 13.4: a machine due for its service is three times as likely to be the one that faults
  const wts = running.map(m => typeof svcDue === 'function' && svcDue(m[0]) ? 3 : 1); let r = Math.random() * wts.reduce((a, b) => a + b, 0), m = running[0]; for (let i = 0; i < running.length; i++) { r -= wts[i]; if (r <= 0) { m = running[i]; break; } }
  if (Math.random() > sturdyK && !(typeof svcDue === 'function' && svcDue(m[0]))) return;                    // sturdier parts: this one never happened
  addFault(Math.random() < .55 ? m[2] : m[3]);
}

/* =====================================================================
   LEVEL 4: Growing Enterprise (Level Bible). The scrapyard becomes a forklift yard with a second crate machine,
   a forklift and its driver move its crates and timber, the first supervisor is promoted from the crew and
   placed by the owner (operators in the blue ring work 15% faster), Generator Mk III, the road frontage deal.
   ===================================================================== */
const SAW2_PRICE = 3000, SAW2_BUILD = 24, PALLET2_CAP = 24, FEED2_CAP = 12, FORK_LOAD = 12;
// build 0.21: level 4 on the wide yard (plans/level4_plan.png). The forklift yard is the old scrapyard west of the stock
// room; the second crate machine stands in it, the forklift parks at its back, Rusty keeps a parts stall by the road.
P.saw2 = [-19.0, 3.0]; P.feed2 = [-21.1, 3.25]; P.feed2Ring = [-21.1, 4.6]; P.saw2Fix = [-18.2, 4.4];
P.forkPark = [-23.4, 10.2]; P.forkHome = [-22.0, 11.7]; P.stall = [-19.5, 11.7]; P.stallRing = [-19.5, 10.6];
P.forkDock = [15.03, 5.75]; P.forkHold = [13.4, 1.75]; P.forkStore = [-13.35, 4.0]; P.forkWh = [18.2, -4.45]; P.forkFeed2 = [-21.1, 1.55];   // the in-feed from its north side, clear of the operator
// the marked forklift lane: from pallet 2 in the forklift yard, along the front of the workshop, round the coil bay and up
// the forklift ramp onto the north end of the dock; a branch runs up to the warehouse. People have right of way on it.
// build 0.21b: the east end runs north of the coil bay (the gap between the pipe mill and the coil bay is the crew's walkway)
const LANE4 = { pts:[[-15.0, 5.1], [-15.0, -0.45], [8.0, -0.45], [8.0, -4.45], [13.4, -4.45], [13.4, 1.75], [15.03, 1.75], [15.03, 4.6], [15.03, 5.75], [18.2, -4.45]],
  links:[[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [4, 9]] };
const FORK_RAMP = [14.5, 1.6, 15.6, 4.85];   // x0 z0 x1 z1: up to the deck's north end, between the dock's kerb and the canopy rail
// a good post: between the saw's and the pipe mill's operators, so both stand in the ring
const zoneHint = () => P.pop ? [+((P.op[0] + P.pop[0]) / 2).toFixed(2), +((P.op[1] + P.pop[1]) / 2 + .6).toFixed(2)] : [P.op[0] + 1.2, P.op[1] + 1.2];
const saw2Ready = () => S.lv4.saw2 >= 2 && !!M.saw2;
const saw2Op = () => staffOf('operator').find(c => c.st.mach === 'saw2');
const zoneR = () => 3 + [0, .5, 1, 2][Math.min(3, S.up.radio || 0)] + Math.max(0, (S.up.radio || 0) - 3) * .5 + [0, 1.5, 2.5, 3.5][Math.min(3, S.up.reach || 0)];
const sawSpeedK = () => 1 + .2 * S.up.saw;
const autoFeedK = () => 1 + .05 * (S.up.autofeed || 0);
// --- the second crate machine in the forklift yard -------------------------------------------------------
let saw2T = 0, saw2On = false, saw2By = null;
crates.pallet2 = []; planks.feed2 = [];
function pallet2Pos(i){ const layer = Math.floor(i / 9), k = i % 9; return new THREE.Vector3(P.pallet2[0] - .3 + (k % 3) * .3, .145 + layer * .3, P.pallet2[1] - .3 + Math.floor(k / 3) * .3); }
function feed2Pos(i){ const layer = Math.floor(i / 3), k = i % 3; return new THREE.Vector3(P.feed2[0] - .21 + k * .21, .62 + layer * .065, P.feed2[1]); }
const syncPallet2 = () => { if (M.saw2) syncStack(crates.pallet2, S.lv4.pallet2, crateMesh, pallet2Pos); };
const syncFeed2 = () => { if (M.saw2 || M.saw2Scaffold) syncStack(planks.feed2, S.lv4.feed2, () => plankMesh(.6), feed2Pos, Math.PI / 2); };
function startSaw2Build(fx){
  S.lv4.saw2 = Math.max(1, S.lv4.saw2);
  if (M.rustyMachine) { M.rustyMachine.visible = false; COL.delete('rustyMachine'); }
  if (!M.saw2Scaffold) { M.saw2Scaffold = put(inst('l2_scaffold'), ...P.saw2, 0); M.saw2Scaffold.userData.dyn = true; }
  if (!M.saw2Builder) M.saw2Builder = makeBuilder([P.saw2[0] + .4, P.saw2[1] + 1.4], -95);
  if (fx) { toast(S.perks.freeCrateMachine ? 'Big Tom\'s crew is refitting Rusty\'s old crate machine for you: no charge.' : 'Paid. Big Tom\'s crew is installing the second crate machine in the forklift yard.', 'good'); sfx('buy'); save(); }
}
function finishSaw2(fx){
  S.lv4.saw2 = 2;
  if (M.saw2Scaffold) { M.saw2Scaffold.removeFromParent(); M.saw2Scaffold = null; }
  if (!M.saw2) {
    M.saw2 = put(A.saw_bench.scene.clone(true), ...P.saw2); M.saw2.userData.dyn = true; addCol([P.saw2[0] - 1.02, P.saw2[1] - .62, P.saw2[0] + 1.02, P.saw2[1] + .62], 'saw2');
    const op = M.saw2.getObjectByName('op_spot').getWorldPosition(new THREE.Vector3()), out = M.saw2.getObjectByName('out_spot').getWorldPosition(new THREE.Vector3());
    P.op2 = [op.x, op.z]; P.pallet2 = [out.x + .15, out.z - .1]; P.fork2 = [P.pallet2[0] + 1.6, P.pallet2[1] + .1];
    const pl = put(inst('prop_pallet'), ...P.pallet2); pl.userData.dyn = true;
    const tw = std('#9a7a52'), tl = std('#5a4a3a');
    const tb = box(.75, .06, .95, tw, P.feed2[0], .57, P.feed2[1]); tb.userData.dyn = true;
    for (const dx of [-.32, .32]) for (const dz of [-.4, .4]) box(.06, .56, .06, tl, P.feed2[0] + dx, .28, P.feed2[1] + dz).userData.dyn = true;
    addCol([P.feed2[0] - .4, P.feed2[1] - .5, P.feed2[0] + .4, P.feed2[1] + .5], 'feed2');
    syncPallet2(); syncFeed2(); rebuildNav();
  }
  if (fx) { toast('The second crate machine is running in the forklift yard. Hire its operator, and a forklift driver to bring timber and take the crates away.', 'gold'); sfx('level', .5); confetti(); save(); renderOffice(); }
}
function saw2Worker(){ if (!saw2Ready() || !powerOn()) return null; return handOn(saw2Op(), P.op2, P.saw2); }
function updateSaw2(dt){
  if (S.level < 4) return;
  runBuilder('saw2Builder', P.saw2, S.lv4, 'saw2T', SAW2_BUILD, finishSaw2, dt);
  if (!saw2Ready()) { saw2On = false; return; }
  const by = saw2Worker(), canRun = by && S.lv4.feed2 > 0 && S.lv4.pallet2 < PALLET2_CAP && (orderLeft() > 0 || stockLeftC() > 0);
  saw2On = !!canRun && l6Run('saw2'); saw2By = by;
  const blade = M.saw2.getObjectByName('blade'), plank = M.saw2.getObjectByName('plank');
  if (canRun) {
    saw2T += dt * sawSpeedK() * tierK('saw2') * autoFeedK() * crewSpeed(by) * pf(); animLine(M.saw2, saw2T / SAW_CYCLE, true, dt);
    by.st.energy = Math.max(0, by.st.energy - dt * (100 / 90));
    if (saw2T >= SAW_CYCLE) { saw2T = 0; S.lv4.feed2--; S.lv4.pallet2++; S.made++; S.lv4.made2 = (S.lv4.made2 || 0) + 1; machCycle('saw2'); syncOrderCounts(); syncFeed2(); syncPallet2(); sfxAt('saw', ...P.saw2, .6); giveXp(by.st, 10); }
  } else animLine(M.saw2, 0, false, dt, true, S.lv4.feed2 > 0);
  setLamp(M.saw2.getObjectByName('status_lamp'), ...(!powerOn() ? LAMP_STOP : saw2On ? LAMP_RUN() : LAMP_IDLE));
}
function saw2Reason(){
  const oc = saw2Op(), R = (cls, title, sub) => ({ label:[cls, title, sub] });
  if (!saw2Ready()) return R('warn', 'Not installed', S.lv4.saw2 ? 'Big Tom\'s crew is installing it' : 'Pay in at the pad');
  if (!powerOn()) return R('bad', 'No power', 'Generator is off');
  if (saw2On) return R('', 'Cutting', `${S.lv4.pallet2}/${PALLET2_CAP} crates for the forklift`);
  if (!oc) return R('warn', 'Stopped', 'No operator: hire one');
  if (oc.state !== 'work') return R('warn', 'Starting', 'Operator walking to the machine');
  if (S.lv4.pallet2 >= PALLET2_CAP) return R('warn', 'Pallet full', hasRole('forklift') ? 'Forklift on its way' : 'Hire a forklift driver');
  if (S.lv4.feed2 === 0) return R('warn', 'Needs planks', !hasRole('forklift') ? 'Hire a forklift driver' : S.store + forkPlanks() < 4 ? 'Stock room empty: order timber' : 'Forklift bringing timber');
  if (orderLeft() <= 0 && stockLeftC() <= 0) return R('warn', 'Idle', S.order ? 'Order covered' : 'No order yet');
  return R('warn', 'Starting', 'Next crate');
}
// --- the forklift: the only way crates and timber get to and from the yard ---------------------------------
const fork = { o:null, forks:null, seat:null, stack:[], carryType:null, path:null, state:'park', wait:0, task:null, lift:0, liftTo:0 };
// v2.0 L3 and L4: heavy plant comes on a low-loader along Mill Road. The tool press is skidded off and round to the North
// field by Big Tom's crew; the forklift drives down the low-loader's ramps and in through the forklift yard's road gate.
const lowLoaders = [];
function lowLoader(load, x, unload){ const o = A.truck.scene.getObjectByName('truck_flatbed').clone(true); o.userData.dyn = true; o.add(blob(5.2, 2.4)); world.add(o); load.position.set(-1.1, 1.18, 0); o.add(load);
  const L = { o, load, x, unload, st:'in', d:-70, t:0 }; o.position.set(-70, 0, ROAD_Z - .9); lowLoaders.push(L); sfx('horn', .3); return L; }
function updateLowLoaders(dt){ for (const L of [...lowLoaders]) { const o = L.o;
  if (L.st === 'in') { const blocked = [owner, ...staffObj.values()].some(c => c.o.visible && Math.abs(c.o.position.z - (ROAD_Z - .9)) < 1.4 && c.o.position.x - o.position.x > 0 && c.o.position.x - o.position.x < 5); if (!blocked) o.position.x = Math.min(L.x, o.position.x + dt * (L.x - o.position.x < 8 ? 2 : 7)); if (o.position.x >= L.x) { L.st = 'unload'; L.t = 0; } }
  else if (L.st === 'unload') { L.t += dt; if (L.unload(L, dt)) { L.st = 'out'; } }
  else { o.position.x += dt * 7; if (o.position.x > 80) { o.removeFromParent(); lowLoaders.splice(lowLoaders.indexOf(L), 1); } } } }
function pressLowLoader(){ if (S.lv3.pressLL) return; S.lv3.pressLL = true; const m = A.tool_press.scene.clone(true); m.scale.setScalar(.8); lowLoader(m, 12.5, (L) => { if (L.t > 2 && L.load.parent) { L.load.removeFromParent(); toast('The tool press comes off the low-loader; Big Tom\'s crew skid it round to the North field on rollers.', ''); } return L.t > 4; }); toast('The tool press arrives on a low-loader along Mill Road.', 'gold'); }
const FORK_ROAD_GATE = [-25.4, -22.8];
function forkLowLoader(){ fork.o.visible = false; const m = inst('l4_forklift'); m.rotation.y = Math.PI; const bedX = (FORK_ROAD_GATE[0] + FORK_ROAD_GATE[1]) / 2 + 1.1;
  const ramps = new THREE.Group(); for (const dz of [-.45, .45]) { const r = new THREE.Mesh(BX(1.6, .05, .3), std('#5a5f63', .5, .5)); r.position.set(-3.4, .6, dz); r.rotation.z = .65; ramps.add(r); } ramps.visible = false;
  const L = lowLoader(m, bedX, (L, dt) => { ramps.visible = L.t > 1; if (L.t < 1.5) return false;
      const fx = fork.ride ||= { x:-1.1, y:1.18, i:0 }; const pts = [[-4.6, 0], [-4.6, 0]]; if (fx.i === 0) { fx.x -= dt * 1.2; fx.y = Math.max(0, 1.18 - Math.max(0, -2.6 - fx.x) * .75); L.load.position.set(fx.x, fx.y, 0); if (fx.x <= -4.4) { fx.i = 1; L.load.removeFromParent(); const w = L.o.localToWorld(new THREE.Vector3(-4.4, 0, 0)); fork.o.position.set(w.x, 0, w.z); fork.o.rotation.y = Math.PI; fork.o.visible = true; sfxAt('horn', w.x, w.z, .5); toast('Reggie\'s forklift rolls down the low-loader\'s ramps. Toot toot.', 'gold'); } return false; }
      const route = [[FORK_ROAD_GATE[0] + 1.3, ROAD_Z - .9], [FORK_ROAD_GATE[0] + 1.3, 12.0], P.forkPark]; fx.j ??= 0; const tg = route[fx.j], p = fork.o.position, ddx = tg[0] - p.x, ddz = tg[1] - p.z, d = Math.hypot(ddx, ddz);
      if (d < .05) { fx.j++; if (fx.j >= route.length) { fork.o.rotation.y = Math.PI / 2; S.lv4.forkIn = true; fork.ride = null; return true; } return false; }
      const st = Math.min(d, dt * 2.2); p.x += ddx / d * st; p.z += ddz / d * st; fork.o.rotation.y = Math.atan2(-ddz, ddx); return false; });
  L.o.add(ramps); }
function buildForklift(){
  if (fork.o || !PROTO.l4_forklift || !M.scrapOpen) return;
  fork.o = put(inst('l4_forklift'), ...P.forkPark, Math.PI / 2); fork.o.userData.dyn = true; if (!M.forkRoadGate) { M.forkRoadGate = true; openGap(...FORK_ROAD_GATE, 13); rebuildNav(); }   // the forklift yard's road gate
  if (S.level === 4 && !S.lv4.forkIn && S.tutDone && S.lv4.forkMoved === 0 && !window.__noLL) forkLowLoader(); else S.lv4.forkIn = true;
  fork.forks = fork.o.getObjectByName('forks'); fork.forkY = fork.forks.position.y; fork.seat = fork.o.getObjectByName('seat_spot');
}
const forkSpeed = () => 3.0 * (1 + [0, .15, .3, .5][Math.min(3, S.up.fork || 0)]) * vehSnowK();
const forkDriver = () => staffOf('forklift')[0];
function forkLoadPos(i){ const t = fork.carryType; if (t === 'plank') return new THREE.Vector3(.5, .1 + Math.floor(i / 3) * .065, -.21 + (i % 3) * .21);
  if (t === 'pipe') return new THREE.Vector3(.55, .12 + Math.floor(i / 6) * .09, -.25 + (i % 6) * .1);
  if (t === 'toolbox') { const layer = Math.floor(i / 6), k = i % 6; return new THREE.Vector3(.3 + (k % 3) * .25, .17 + layer * .17, -.17 + Math.floor(k / 3) * .34); }
  const layer = Math.floor(i / 4), k = i % 4; return new THREE.Vector3(.32 + (k % 2) * .34, .2 + layer * .3, -.17 + Math.floor(k / 2) * .34); }
function forkGo(to, state){ fork.path = findPath(fork.o.position.x, fork.o.position.z, to[0], to[1]); fork.goal = to; fork.state = state; }
function forkDrive(dt){
  if (!fork.path || !fork.path.length) { fork.v = 0; return true; }
  const o = fork.o.position, [tx, tz] = fork.path[0], dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz), sp = forkSpeed() * crewSpeed(forkDriver() || { st:{ lv:1, focus:100 } });
  if (forkYield(dx / (d || 1), dz / (d || 1), d + .6)) { fork.v = Math.max(0, (fork.v || 0) - 6 * dt); forkGiveWay(dx, dz, dt); return false; }   // brakes for somebody in front
  const onRamp = groundY(o.x, o.z) > .02, back = onRamp && dz < -.05, want = back ? Math.atan2(dz, -dx) : Math.atan2(-dz, dx);   // down the ramp in reverse, forks to the lorry
  const a = ((want - fork.o.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  if (Math.abs(a) > .25 && forkSwingClear(a)) { fork.v = 0; forkGiveWay(dx, dz, dt); return false; }   // somebody within the swing: wait
  fork.heldBy = null; fork.heldT = 0;
  // build 0.21g: it drives like a truck: speeds up and brakes, slows for corners and the ramp, crawls round a tight turn
  let target = sp * (onRamp ? .5 : 1) * clamp(1 - Math.abs(a) / 1.1, .12, 1);
  if (fork.path.length === 1) target = Math.min(target, Math.sqrt(2 * 2.2 * d) + .15);   // easing in to where it stops
  fork.v = (fork.v || 0) + clamp(target - (fork.v || 0), -3.5 * dt, 1.6 * dt);
  const turn = clamp(a, -1.9 * dt, 1.9 * dt); fork.o.rotation.y += turn;                    // a steady turning rate
  const step = Math.min(d, fork.v * dt);
  if (d < .06 || d <= step) { o.x = tx; o.z = tz; fork.path.shift(); forkLevel(dt); if (!fork.path.length) { fork.v = 0; return true; } return false; }
  o.x += dx / d * step; o.z += dz / d * step; forkLevel(dt);
  return false;
}
// height on the ramp or the deck, nose up the slope (forks along +X, so the pitch is about the forklift's own Z)
function forkLevel(dt = 1){ const o = fork.o, a = o.rotation.y, fx = Math.cos(a), fz = -Math.sin(a);
  const front = groundY(o.position.x + fx * .75, o.position.z + fz * .75), rear = groundY(o.position.x - fx * .75, o.position.z - fz * .75);
  o.position.y = (front + rear) / 2;   // sits on its wheels, front and rear axles 1.5 m apart
  const pitch = Math.atan2(front - rear, 1.5); o.rotation.z += (pitch - o.rotation.z) * Math.min(1, dt * 10); }
// the driver waits and toots; after 3 s the person in the way steps 1.8 m out of its line (as a yard hand would) and lets it by
function forkGiveWay(dx, dz, dt){ const c = fork.blockBy; if (!c) return; if (fork.heldBy !== c) { fork.heldBy = c; fork.heldT = 0; } fork.heldT += dt;
  if (c === bolt) { if (fork.heldT > 2.5) { bolt.ignore = T + 5; fork.heldT = 0; } return; }   // a dog never holds the works up: after a toot the forklift creeps on and he trots aside
  if (fork.heldT < 3 || c === owner || !c.path || c.giveWayT > T) return;
  const e = stepAside(c, { position:fork.o.position, rotation:{ y:Math.atan2(-dz, dx) } }); if (!e) return;
  c.path.unshift(e); c.giveWayT = T + 4; c.wd = null; fork.heldT = 0; }
// people have right of way: the forklift waits (and gives a toot) while anybody stands in the next 2.4 m of its way
function forkYield(ux, uz, reach = 2.6){
  const o = fork.o.position, drv = forkDriver(), people = [...staffObj.values(), ...folk.values(), owner, ...(walker ? [walker.c] : []), ...(bolt.on && bolt.o && bolt.o.visible && !(bolt.ignore > T) ? [bolt] : [])];
  for (const c of people) { if (!c || c === drv || !c.o.visible || c.gone || c.seated) continue; const px = c.o.position.x - o.x, pz = c.o.position.z - o.z, ahead = px * ux + pz * uz, t = clamp(ahead, .4, Math.min(2.6, reach));
    if (Math.hypot(px - ux * t, pz - uz * t) < .8 && ahead > .3 && ahead < Math.min(2.6, reach) + .8) { if (!fork.honk || T - fork.honk > 4) { fork.honk = T; sfxAt('horn', o.x, o.z, .18); } fork.waitT = (fork.waitT || 0) + 1; fork.blockBy = c; return true; } }
  fork.blockBy = null;
  return false;
}
// anybody inside the circle the forklift sweeps when it turns on the spot (forks 1.45 m ahead, tail 1.2 m behind)
// only somebody inside the arc the forks (ahead) or the tail (behind) will actually sweep through this turn holds it up
function forkSwingClear(a){ const o = fork.o.position, yaw = fork.o.rotation.y, drv = forkDriver(), wrap = v => ((v + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  const inArc = (d, from, to) => { const lo = Math.min(from, to) - .35, hi = Math.max(from, to) + .35; return d >= lo && d <= hi; };
  for (const c of [...staffObj.values(), ...folk.values(), owner, ...(walker ? [walker.c] : [])]) { if (!c || c === drv || !c.o.visible || c.gone || c.seated) continue;
    const px = c.o.position.x - o.x, pz = c.o.position.z - o.z, r = Math.hypot(px, pz); if (r > 1.6) continue;
    const d = wrap(Math.atan2(-pz, px) - yaw);   // where the person stands, seen from the driver's seat (0 = dead ahead)
    if (inArc(d, 0, a) || inArc(wrap(d - Math.PI), 0, a)) { fork.blockBy = c; return true; } }
  return false; }
function forkFace(xz, dt){ const want = Math.atan2(-(xz[1] - fork.o.position.z), xz[0] - fork.o.position.x); let a = ((want - fork.o.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; fork.o.rotation.y += a * Math.min(1, dt * 6); }
function forkTake(arr, type, posMesh){ const m = arr.pop(); if (!m) return false; fork.carryType = type; fork.stack.push(m); fly(m, fork.forks, forkLoadPos(fork.stack.length - 1), .25, () => { m.rotation.set(0, type === 'plank' ? 0 : 0, 0); }); m.rotation.set(0, 0, 0); return true; }
function forkGive(arr, parent, posFn, done){ const m = fork.stack.pop(); if (!m) return false; arr.push(m); fly(m, parent, posFn(arr.length - 1), .28, done); if (!fork.stack.length) fork.carryType = null; return true; }
const forkCrates = () => fork.carryType === 'crate' ? fork.stack.length : 0;
const forkPlanks = () => fork.carryType === 'plank' ? fork.stack.length : 0;
// what the forklift should do next
function forkTask(){
  const d2 = forkDock2Task(); if (d2) return d2;
  const o = S.order, need = o && !o.ready && truck.state === 'docked' ? Math.max(0, (o.qty || 0) - S.bed - truckCrates() - S.pallet) : 0;
  if (S.lv4.pallet2 > 0 && need > 0) return 'cratesTruck';
  if (S.lv4.pallet2 >= 6 && whReady() && S.wh.c + whBound('crate') < whCapC() - 2) return 'cratesWh';
  if (need > 0 && whReady() && S.wh.c > 0) return 'whTruck';   // the line cannot cover the lorry: the forklift brings a pallet of stock crates out of the warehouse
  if (S.lv4.feed2 <= 4 && S.store >= 4) return 'planks';
  if (S.lv4.pallet2 >= PALLET2_CAP - 2 && need === 0 && !whReady()) return 'wait';
  return null;
}
function updateForklift(dt){
  if (!fork.o) return;
  // the tines go up to carry and down to pick up or set down
  fork.lift += (fork.liftTo - fork.lift) * Math.min(1, dt * 5); fork.forks.position.y = fork.forkY + fork.lift;
  const drv = forkDriver(), c = drv && drv.seated ? drv : null;
  if (c) { const w = fork.seat.getWorldPosition(new THREE.Vector3()); c.o.position.set(w.x, w.y, w.z); c.o.rotation.y = fork.o.rotation.y + Math.PI / 2; c.play('sit'); }
  if (!c) return;
  fork.wait -= dt * multiK(); if (fork.wait > 0) return;
  if (fork.state === 'park' || fork.state === 'idle') { const t = forkTask(); fork.task = t;
    if (t && t.startsWith('dock2:')) { const k = t.slice(6); fork.task = 'dock2'; fork.k2 = k; fork.liftTo = 0; if (k === 'p' && S.l5.rack2 > 0) forkRoute(P.forkRack2, 'toRack2'); else forkRoute(P.forkWh, 'toWh2'); return; }
    if (t === 'cratesTruck' || t === 'cratesWh') { forkRoute(P.fork2, 'toPallet2'); fork.liftTo = 0; }
    else if (t === 'whTruck') { forkRoute(P.forkWh, 'toWhLoad'); fork.liftTo = 0; }
    else if (t === 'planks') { forkRoute(P.forkStore, 'toStore'); fork.liftTo = 0; }
    else if (fork.state !== 'park') { forkRoute(P.forkPark, 'toPark'); fork.liftTo = 0; }
    return; }
  if (fork.state === 'toPark') { if (forkDrive(dt)) { fork.state = 'park'; fork.wait = 1.5; } return; }
  if (updateForkDock2(dt, drv)) return;
  if (fork.state === 'toPallet2') { if (!forkDrive(dt)) return; fork.state = 'loadPallet2'; return; }
  if (fork.state === 'loadPallet2') { forkFace(P.pallet2, dt);
    if (fork.stack.length < FORK_LOAD && S.lv4.pallet2 > 0) { if (forkTake(crates.pallet2, 'crate')) { S.lv4.pallet2--; fork.wait = .18; sfx('pick', .4); } return; }
    fork.liftTo = .35; const dest = fork.task === 'cratesTruck' && truck.state === 'docked' && S.order && !S.order.ready ? 'truck' : whReady() ? 'wh' : 'truck';
    fork.dest = dest; forkRoute(dest === 'truck' ? P.forkDock : P.forkWh, 'toDrop'); return; }
  if (fork.state === 'toWhLoad') { if (!forkDrive(dt)) return; fork.state = 'whLoad'; return; }
  if (fork.state === 'whLoad') { forkFace(P.wh, dt); const o = S.order, short = o && !o.ready && truck.state === 'docked' ? o.qty - S.bed - truckCrates() - S.pallet - fork.stack.length : 0;
    if (fork.stack.length < FORK_LOAD && short > 0 && S.wh.c > 0) { if (forkTake(crates.wh, 'crate')) { S.wh.c--; syncWh(); fork.wait = .18; sfx('pick', .4); } return; }
    if (!fork.stack.length) { fork.state = 'idle'; return; } fork.liftTo = .35; fork.dest = 'truck'; forkRoute(P.forkDock, 'toDrop'); return; }
  if (fork.state === 'toDrop') { if (!forkDrive(dt)) return; fork.state = 'drop'; fork.liftTo = .1; return; }
  if (fork.state === 'drop') {
    if (!fork.stack.length) { fork.state = 'idle'; fork.liftTo = 0; S.lv4.trips = (S.lv4.trips || 0) + 1; if (drv) giveXp(drv.st, 8); return; }
    if (fork.dest === 'truck') { if (groundY(fork.o.position.x, fork.o.position.z) < .5) forkFace([P.truck[0], P.truck[1]], dt);   // on the deck it stays square to the lorry's side, no room to turn
      const o = S.order; if (truck.state !== 'docked' || !o || o.ready || S.bed >= o.qty) { fork.dest = whReady() ? 'wh' : 'truck'; if (fork.dest === 'wh') forkRoute(P.forkWh, 'toDrop'); else forkRoute(P.forkHold, 'toHold'); return; }   // nothing to load into: off the deck, not parked across the loaders' way
      if (forkGive(crates.bed, M.truck, bedPos, () => syncBed())) { S.bed++; S.shipped++; S.lv4.forkMoved = (S.lv4.forkMoved || 0) + 1; sfx('drop', .5); checkLoaded(); fork.wait = .16; } return; }
    forkFace(P.wh, dt);
    if (S.wh.c >= whCapC()) { fork.dest = 'truck'; forkRoute(P.forkDock, 'toDrop'); fork.wait = 2; return; }
    if (forkGive(crates.wh, world, whCratePos, () => syncWh())) { S.wh.c++; S.lv4.forkMoved = (S.lv4.forkMoved || 0) + 1; fork.wait = .16; } return; }
  if (fork.state === 'toHold') { if (forkDrive(dt)) { fork.state = 'hold'; fork.wait = 1; } return; }
  if (fork.state === 'hold') { const o = S.order; fork.wait = 1;   // at the foot of the ramp with its load, until a lorry can take it (or the warehouse can)
    if (truck.state === 'docked' && o && !o.ready && S.bed < o.qty) { fork.dest = 'truck'; forkRoute(P.forkDock, 'toDrop'); } else if (whReady() && S.wh.c < whCapC()) { fork.dest = 'wh'; forkRoute(P.forkWh, 'toDrop'); } return; }
  if (fork.state === 'toStore') { if (!forkDrive(dt)) return; fork.state = 'loadStore'; return; }
  if (fork.state === 'loadStore') { forkFace(P.storeRack, dt);
    if (fork.stack.length < FORK_LOAD && S.store > 0 && S.lv4.feed2 + fork.stack.length < FEED2_CAP) { if (forkTake(planks.store, 'plank')) { S.store--; syncStore(); fork.wait = .14; } return; }
    fork.liftTo = .3; forkRoute(P.forkFeed2, 'toFeed2'); return; }
  if (fork.state === 'toFeed2') { if (!forkDrive(dt)) return; fork.state = 'dropFeed2'; fork.liftTo = .45; return; }
  if (fork.state === 'dropFeed2') { forkFace(P.feed2, dt);
    if (fork.stack.length && S.lv4.feed2 < FEED2_CAP) { if (forkGive(planks.feed2, world, feed2Pos, () => syncFeed2())) { S.lv4.feed2++; fork.wait = .14; } return; }
    while (fork.stack.length) { fork.stack.pop().removeFromParent(); S.store++; } fork.carryType = null; syncStore();
    fork.state = 'idle'; fork.liftTo = 0; return; }
}
function updateForkDriver(c, dt){
  c.st.energy = 100; c.st.focus = 100; if (fork.o && !S.lv4.forkIn) { c.play('idle'); return; }   // the forklift is still on its low-loader
  if (!fork.o) { if (c.state !== 'home') { goTo(c, ...P.forkHome); c.state = 'toHome'; } if (c.state === 'toHome' && walk(c, dt)) c.state = 'home'; return; }
  if (c.seated) return;
  if (c.state !== 'toFork') { const w = fork.seat.getWorldPosition(new THREE.Vector3()); goTo(c, w.x, w.z); c.state = 'toFork'; }
  if (walk(c, dt)) { c.seated = true; c.state = 'driving'; fork.state = 'idle'; c.say = { text:'Forklift\'s running, boss.', until:T + 2 }; }
}
// --- the supervisor: promoted from the crew, led to a post by the owner ------------------------------------
const promoteCost = () => 150;
// v2.0 12.4: supervisors come from operators at worker level 5 or more (Alf Pryce first)
const canPromote = st => S.level >= 4 && st.role === 'operator' && st.lv >= 5 && staffOf('supervisor').length < Math.max(1, capOf('supervisor'));
function promote(id){
  const st = S.staff.find(s => s.id === id); if (!st || !canPromote(st) || S.cash < promoteCost()) return;
  S.cash -= promoteCost(); const old = staffObj.get(id), at = old ? [old.o.position.x, old.o.position.z] : P.frontIn;
  if (old) { old.o.removeFromParent(); mixers.splice(mixers.indexOf(old.mixer), 1); staffObj.delete(id); }
  st.role = 'supervisor'; delete st.mach; st.look = Object.assign({}, st.look, { parts:[...new Set([...(st.look.parts || []).filter(p => !['earmuffs', 'hat_cap', 'vest'].includes(p)), 'hat_hard', 'vest', 'clipboard'])] });
  const c = spawnStaff(st, ...at); c.state = 'follow'; S.lv4.promoted = true; st.post = null; if (c === supervisor()) S.lv4.post = null;
  c.say = { text:'Supervisor? I won\'t let you down. Show me where you want me.', until:T + 3.5 };
  sfx('levelup', .6); confetti(); toast(`${st.name} is your supervisor. Walk to where the crew needs watching, and stand still: ${st.name} takes post there.`, 'gold'); save(); checkCharter(); renderOffice();
}
function movePost(id){ const c = (id && staffObj.get(id)) || supervisor(); if (!c) return; c.state = 'follow'; c.st.post = null; if (c === supervisor()) S.lv4.post = null; c.say = { text:'Where to, boss?', until:T + 2 }; closeOffice(); }
let stillT = 0;
function updateFollow(c, dt){
  const op = owner.o.position, d = dist2(c.o, [op.x, op.z]);
  if (d > 1.3) { if (!c.path || !c.path.length || !c.meetAt || Math.hypot(c.meetAt[0] - op.x, c.meetAt[1] - op.z) > .8) { c.meetAt = [op.x, op.z]; goTo(c, op.x + .7, op.z + .4); } walk(c, dt); }
  else c.play('idle');
  stillT = inputDir()[2] === 0 && d < 1.8 && !officeOpen ? stillT + dt : 0;
  if (stillT > 1.6 && !near(owner.o, P.deskRing, 2.5)) { stillT = 0; const post = [+op.x.toFixed(2), +op.z.toFixed(2)]; c.st.post = post; if (c === supervisor()) S.lv4.post = post;
    goTo(c, ...post); c.state = 'toPatrol'; c.say = { text:'I\'ll keep the crew moving from here.', until:T + 3 }; owner.say = { text:'This is your post.', until:T + 2 }; owner.play('point'); owner.lock = .8;
    sfx('tap'); toast(`${c.st.name} takes post here. Everyone inside the blue ring works 15% faster and nobody slacks. Move the post any time from the office (Staff).`, 'gold'); showZone(6); save(); checkCharter(); }
}
// The zone belongs to the post, not to the supervisor's feet: it stays put while she signs a truck or has a
// word with someone, and it is live while she is on duty near it (not on a break, a need or following the
// owner to a new post). Build 0.14 drew the 6 m ring under the supervisor wherever she walked, so a big blue
// circle travelled round the site with her; now the ring is drawn at the post only for a few seconds after
// it is set, then fades out (and again for a moment when the Wider zone upgrade grows it).
function zoneCentre(){
  const sup = supervisor(), post = S.lv4 && S.lv4.post; if (!sup || !post || S.level < 4) return null;
  if (['break', 'toBreak', 'follow'].includes(sup.state) || sup.need) return null;
  return dist2(sup.o, post) < zoneR() + 2.5 ? post : null;
}
// every supervisor on duty near their post makes a zone (two from level 7)
function zoneCentres(){ if (S.level < 4) return []; return staffOf('supervisor').map(sup => { const post = sup.st.post || (sup === supervisor() ? S.lv4.post : null); if (!post || ['break', 'toBreak', 'follow'].includes(sup.state) || sup.need) return null; return dist2(sup.o, post) < zoneR() + 2.5 ? post : null; }).filter(Boolean); }
let zoneRing = null, zoneShowT = 0, zoneRing2 = null;
function showZone(secs = 5){ zoneShowT = Math.max(zoneShowT, secs); }
function updateZoneRing(dt = 0){
  zoneShowT = Math.max(0, zoneShowT - dt);
  const c = supervisor(), post = S.lv4 && S.lv4.post, peek = zoneShowT > 0, show = S.level >= 4 && c && post && peek;
  if (!zoneRing) { const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color:'#5aa8ff', transparent:true, opacity:.55, depthWrite:false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 64), mat); ring.rotation.x = -Math.PI / 2; g.add(ring);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(.96, 48), new THREE.MeshBasicMaterial({ color:'#5aa8ff', transparent:true, opacity:.08, depthWrite:false })); fill.rotation.x = -Math.PI / 2; g.add(fill);
    g.position.y = .02; g.renderOrder = 3; scene.add(g); zoneRing = g; }
  zoneRing.visible = !!show; if (!show) return;
  const a = zoneShowT > 0 ? Math.min(1, zoneShowT / 1.5) : 1; zoneRing.children[0].material.opacity = .55 * a; zoneRing.children[1].material.opacity = .08 * a;
  zoneRing.position.x = post[0]; zoneRing.position.z = post[1]; zoneRing.scale.setScalar(zoneR());
  const c2 = staffOf('supervisor')[1], p2 = c2 && c2.st.post; if (p2 && !zoneRing2) { zoneRing2 = zoneRing.clone(true); zoneRing2.children.forEach(m => m.material = m.material.clone()); scene.add(zoneRing2); }
  if (zoneRing2) { zoneRing2.visible = !!p2; if (p2) { zoneRing2.position.set(p2[0], .02, p2[1]); zoneRing2.scale.setScalar(zoneR()); zoneRing2.children[0].material.opacity = .55 * a; zoneRing2.children[1].material.opacity = .08 * a; } }
}
// --- Rusty's stall by the gate: spare parts, cheaper than the office ---------------------------------------
const RUSTY_PART = 30;
let stallT = 0;
function updateStall4(dt){
  if (!M.stall || cardOpen) return;
  stallT -= dt; if (stallT > 0 || !near(owner.o, P.stallRing, .6) || !ownerStill()) return;
  stallT = 1.2;
  if (S.parts >= partsCap()) { floatText('Shelf is full', P.stall[0], 2, P.stall[1], 'info'); stallT = 3; return; }
  if (S.cash < RUSTY_PART) return;
  S.cash -= RUSTY_PART; S.parts++; syncParts(); sfx('coin'); floatText(`Spare part ${fmt(RUSTY_PART)}`, P.stall[0], 2.1, P.stall[1], 'info');
  const r = folk.get('rusty'); if (r) r.say = { text:pick(['Good as new, near enough.', 'Off a Dunmore press, that one.', 'Pleasure doing business.']), until:T + 2 };
}
// --- level 4 world -----------------------------------------------------------------------------------------
function buildLevel4(){
  if (M.l4Built) return; M.l4Built = true;
  // the wall between the yards comes down (Level Bible level-up): the west fence beside the stock room goes, and the
  // crate bin by the workshop corner is moved out so the forklift lane can run along the front of the workshop
  for (const f of [...(M.westGap || []), ...(M.westFence || []), ...(M.scrapGate || [])]) f.visible = false; for (const k of ['westGap', 'westFenceA', 'scrapGate']) COL.delete(k);
  for (const z of [-4.0, SITE.z1]) { const g = put(inst('env_gate_post'), SITE.x0, z, Math.PI / 2); g.userData.dyn = true; addCol([SITE.x0 - .22, z - .22, SITE.x0 + .22, z + .22]); }
  if (M.northBin) { for (const m of M.northBin.m) m.visible = false; COL.delete(M.northBin.k); }
  buildForkLane();
  if (plotOwned('scrap')) { openScrapyard(false); buildForkYard(); }
  if (M.scrapBoardFace) M.scrapBoardFace.material = new THREE.MeshBasicMaterial({ map:signTex('Forklift yard', 'Second crate machine', '#2f5d8a', 'IRON VALLEY') });
  if (S.lv4.saw2 >= 2) finishSaw2(false); else if (S.lv4.saw2 === 1) startSaw2Build(false);
  rebuildNav();
}
// what stands in the forklift yard once it is cleared: Rusty's parts stall by the road, the forklift's park and gas cage
function buildForkYard(){
  if (M.stall) return;
  M.stall = put(inst('l4_stall'), ...P.stall, 0); M.stall.userData.dyn = true; addCol([P.stall[0] - .95, P.stall[1] - .45, P.stall[0] + .95, P.stall[1] + .45], 'stall');
  M.ring('stall', ...P.stallRing, '#e8ab2c', .5);
  // the forklift runs on bottled gas: a mesh cage of cylinders beside its park
  const cage = new THREE.Group(), mesh = std('#4a4f55', .6, .4), gas = std('#c23b2a', .5, .2);
  for (const [w, h, d, x, y, z] of [[1.2, .05, .7, 0, 1.4, 0], [.05, 1.4, .7, -.6, .7, 0], [.05, 1.4, .7, .6, .7, 0], [1.2, 1.4, .04, 0, .7, -.35]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mesh); b.position.set(x, y, z); cage.add(b); }
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, 1.0, 12), gas); c.position.set(-.42 + i * .28, .5, 0); c.castShadow = true; cage.add(c); }
  cage.position.set(-25.1, 0, 11.7); cage.userData.dyn = true; world.add(cage); addCol([-25.75, 11.3, -24.45, 12.1], 'gasCage');
  const hz = paintMat('#e3b23c'); dashRect(P.forkPark[0] - .8, P.forkPark[1] - 1.45, P.forkPark[0] + .8, P.forkPark[1] + 1.45, hz);   // the forklift's bay
  buildForklift(); placeFolk();
}
// the painted lane (two yellow edge lines) and the forklift ramp up onto the dock's north end
function buildForkLane(){
  if (M.forkLane) return; M.forkLane = true;
  const ln = paintMat('#e3b23c'), L = LANE4.pts, W = .72;
  for (const [i, j] of LANE4.links) { const a = L[i], b = L[j]; if (groundY(a[0], a[1]) > .02 || groundY(b[0], b[1]) > .02 || (a[0] > 15 && a[1] > 4) || (b[0] > 15 && b[1] > 4)) continue;
    if (Math.abs(a[1] - b[1]) < .01) { const x0 = Math.min(a[0], b[0]) - W, x1 = Math.max(a[0], b[0]) + W, len = x1 - x0; for (const o of [-W, W]) paintStrip((x0 + x1) / 2, a[1] + o, len, .07, 'x', ln); }
    else { const z0 = Math.min(a[1], b[1]) - W, z1 = Math.max(a[1], b[1]) + W, len = z1 - z0; for (const o of [-W, W]) paintStrip(a[0] + o, (z0 + z1) / 2, len, .07, 'z', ln); } }
  // the ramp: a concrete slope from the yard up to deck height, kerbed on the west (the canopy rail is its east side)
  const [x0, z0, x1, z1] = FORK_RAMP, len = Math.hypot(z1 - z0, LDOCK.H), ang = Math.atan2(LDOCK.H, z1 - z0);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .16, len), std('#9a958a', .95)); slab.position.set((x0 + x1) / 2, LDOCK.H / 2 - .06, (z0 + z1) / 2); slab.rotation.x = -ang; slab.castShadow = slab.receiveShadow = true; slab.userData.dyn = true; world.add(slab);
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(.1, .2, len), std('#e3b23c', .8)); kerb.position.set(x0 - .05, LDOCK.H / 2 + .06, (z0 + z1) / 2); kerb.rotation.x = -ang; kerb.userData.dyn = true; world.add(kerb);
  LDOCK.fork = FORK_RAMP; addCol([x0 - .12, z0 + .7, x0, z1], 'forkKerb');
  addCol([x0, z0 + .5, x1, z1 - .1], 'forkRamp');   // a forklift ramp, not a walkway: people use the steps at the back of the dock
  // the dock's north end opens where the ramp lands; the rest of it keeps its edge
  COL.delete('dockN'); addCol([x1, LDOCK.deck[1] - .08, LDOCK.deck[2], LDOCK.deck[1] + .08], 'dockN');
}

/* =====================================================================
   LEVEL 5: Regional Manufacturer (Level Bible). The road frontage is paved into a second dock with a white
   second truck. A second order line runs from stock (the warehouse and the second pipe mill's rack) and the
   forklift loads it, so two orders are open at once; one call a "day" is a rush order. Wages and power come
   due every six minutes: Priya Nair, the accountant, walks the owner through the first bill; Eldon Graves
   opens a bank account across the road and lends against the bills. Trucks can run late. Ada Finch sells her
   corner shop, the plot for level 6.
   ===================================================================== */
const BILL_EVERY = 360, BILL_DUE = 150, LATE_FEE = .1;   // the old six-minute bills (kept for old saves' fields); v2.0's weekly accounts below
const WAGES = { foreman:320, clerk:200, helper:100, operator:160, loader:120, electrician:180, mechanic:180, supervisor:240, forklift:160, cleaner:100 };
const POWER_RATE = 14;                       // dollars per kW of generator capacity, on every bill
const MILL2_PRICE = 18000, MILL2_BUILD = 60, RACK2_CAP = 12, RUSH_EVERY = 300, HAULIER = 60;
const RUSH_CLIENTS = ['County Hospital', 'Dunmore Docks', 'Valley Rail', 'Ashby Bottling'];
// Bible v2.0 Level 5 on the approved map (plans/level5_plan.png): across Mill Road, the office block opposite the main gate
// and Ada Finch's corner plot with the second pipe mill and dock 2. Dock 2 is the same raised side dock as dock 1, with its
// ramp; the white lorry comes along the westbound lane, reverses through the plot's road gate and stands cab-north beside it.
const DK2 = [24.0, 22.8], CORNER = [13.5, 19.2, 28.2, 26.6];
P.dock2 = DK2; P.truck2 = [DK2[0] + 2.25, DK2[1] + .05]; P.drop2 = [DK2[0] + .57, DK2[1] - 1.15]; P.forkDock2 = [DK2[0] - .5, DK2[1] - 1.2];
P.mill2 = [15.5, 20.9]; P.coil2 = [14.25, 22.85]; P.coil2Ring = [14.3, 24.4]; P.mill2Fix = [15.5, 22.25];
P.rack2 = [17.35, 24.25]; P.rack2Spot = [17.35, 23.2]; P.forkRack2 = P.rack2Spot;
P.office = [.5, 22.0]; P.officeDoor = [.5, 25.45]; P.priya = [-1.4, 26.4]; P.crossN = [5.0, 13.9]; P.crossS = [5.0, 18.5];
const ARRIVE2 = samplePath([{ p:[[74, ROAD_Z + .9], [P.truck2[0] - 3.0, ROAD_Z + .9]] }, { bez:true, rev:true, p:[[P.truck2[0] - 3.0, ROAD_Z + .9], [P.truck2[0], ROAD_Z + 1.1], P.truck2] }]);
const LEAVE2 = samplePath([{ bez:true, p:[P.truck2, [P.truck2[0], ROAD_Z - .2], [P.truck2[0] + 4.5, ROAD_Z - .9]] }, { p:[[P.truck2[0] + 4.5, ROAD_Z - .9], [80, ROAD_Z - .9]] }]);
const truckB = { state:'away', t:0, s:0, path:null };   // the white truck at dock 2 (S.up.truck2 is an unrelated upgrade)
crates.bed2 = []; pipesArr.bed2 = []; pipesArr.rack2 = []; toolsArr.bed2 = []; coilsArr.feed2 = [];
const dock2Ready = () => S.level >= 5 && !!M.dock2;
const mill2Ready = () => S.l5.mill2 >= 2 && !!M.mill2;
const pipe2Op = () => staffOf('operator').find(c => c.st.mach === 'pipe2');
const multiK = () => 1 + .25 * (S.up.multi || 0);
const dockK = () => 1 + [0, .15, .3, .5][Math.min(3, S.up.dock || 0)] + Math.max(0, (S.up.dock || 0) - 3) * .1;
const TYPE2 = { c:'crate', p:'pipe', t:'toolbox' };
const want2 = (o, k) => ({ c:o.qty || 0, p:o.pq || 0, t:o.tq || 0 })[k];

// --- the second phone line: dock 2's orders ship from stock ----------------------------------------------
let call2T = 0;
function dock2Spec(){
  const e = PG.econ(S.level), k = bandSize(), rush = S.time >= S.l5.rushAt, pq = Math.max(4, Math.round((rush ? 8 : [12, 9, 14, 10][(S.l5.seq2 || 0) % 4]) * e.qty * k));
  const pay = Math.round(pq * PIPE_PRICE * e.price * (0.9 + S.rep / 500) * bandPay() * (rush ? 1.3 : 1));   // v2.0 5.1: a rush pays 30% more against deadline x 0.55
  const dl = Math.max(180, Math.round((60 + pq * PIPE_CYCLE * 2) * (rush ? .55 : 1)));
  return { qty:0, pq, tq:0, dock:2, rush, pay, client:rush ? pick(RUSH_CLIENTS) : pick(['Kerr & Sons', 'Hartley Hardware', 'Dunmore Docks', 'Haines Farm']), deadline:dl };
}
function acceptCall2(c){
  const o = S.order2 = Object.assign(c, { id:++S.orderSeq, time:0, ready:false, l:{ c:0, p:0, t:0 } }); S.l5.seq2 = (S.l5.seq2 || 0) + 1;
  if (c.rush) S.l5.rushAt = S.time + RUSH_EVERY;
  truckB.t = 0; sfx('buy'); owner.say = { text:`${c.client}: ${describe(c)} from stock, dock 2.`, until:T + 2.4 };
  toast('Dock 2 order taken: the second pipe mill makes the pipes; the dock crew carry them up dock 2\'s ramp onto the white lorry.', 'good');
  lateRoll(o); save(); renderOffice();
}
// the late truck (Level Bible issue): about one truck in five is held up on the county road. The client's clock
// waits for it, and a rush haulier from the office brings it at once.
function lateRoll(o){
  const first = S.level === 5 && !S.l5.firstLate && calDay() % 5 === 3; if (!first && (S.level < 5 || S.delivered < 3 || Math.random() > .2)) return; if (first) S.l5.firstLate = true;
  o.lateBy = 30; o.deadline += o.lateBy; S.l5.lateTrucks = (S.l5.lateTrucks || 0) + 1;
  setTimeout(() => toast(`The haulier rang: the ${o.dock === 2 ? 'white truck for dock 2' : 'truck'} is held up on the county road, about 30 minutes late. The client's clock waits; a rush haulier (office, Orders) comes now.`, 'bad'), 900);
}
function rushHaulier(d){
  const o = d === 2 ? S.order2 : S.order, tr = d === 2 ? truckB : truck; if (!o || !o.lateBy || tr.state !== 'away' || S.cash < HAULIER) return;
  S.cash -= HAULIER; o.lateBy = 0; sfx('buy'); toast(`Rush haulier booked (${fmt(HAULIER)}): the truck is on its way now.`, 'good'); save(); renderOffice();
}
const truckWait = (tr, o) => Math.max(0, Math.ceil(9 / dockK() + (o && o.lateBy || 0) - tr.t));
function truckText(tr, o, d){ return tr.state === 'docked' ? `At dock ${d}` : tr.state === 'arrive' ? 'Arriving' : tr.state === 'leave' ? 'Leaving' : o && o.lateBy ? `Held up: ${truckWait(tr, o)} s` : `On its way: ${truckWait(tr, o)} s`; }
const haulierBtn = (o, d) => o && o.lateBy && (d === 2 ? truckB : truck).state === 'away' ? `<div class="call-b"><button class="btn primary" data-haulier="${d}" type="button" ${S.cash >= HAULIER ? '' : 'disabled'}>Book a rush haulier<small>${fmt(HAULIER)}: the truck comes now</small></button></div>` : '';

// --- the white truck ----------------------------------------------------------------------------------------
function syncBed2(){
  if (!M.truck2) return; const o = S.order2, L = o && truckB.state !== 'away' ? o.l : { c:0, p:0, t:0 };
  const sync = (arr, n, make, pos) => { while (arr.length < n) { const m = make(); M.truck2.add(m); arr.push(m); } while (arr.length > n) arr.pop().removeFromParent(); arr.forEach((m, i) => { if (m.userData.flying) return; m.position.copy(pos(i)); m.rotation.set(0, 0, 0); }); };
  sync(crates.bed2, L.c, crateMesh, bedPos); sync(pipesArr.bed2, L.p, pipeMesh, pipeBedPos); sync(toolsArr.bed2, L.t, toolMesh, toolBedPos);
}
function updateTruckB(dt){
  const Tr = M.truck2; if (!Tr) return; const tg = findNode(Tr, 'tailgate'), o = S.order2;
  if (truckB.state === 'arrive' || truckB.state === 'leave') {
    if (drive(truckB, Tr, dt, ARRIVE2.pts.find(q => q.rev).d, truckB.state === 'arrive')) {
      if (truckB.state === 'arrive') { truckB.state = 'docked'; sfxAt('horn', ...P.truck2); addCol(truck2Box(), 'truck2'); repathAround(); parkedLamps(Tr); syncBed2(); if (M.dock2Lamp) setLamp(M.dock2Lamp, '#ffd88a', 2.5); }
      else { truckB.state = 'away'; truckB.t = 0; call2T = 0; Tr.visible = false; syncBed2(); if (M.dock2Lamp) setLamp(M.dock2Lamp, '#101010', 0); } }
  } else if (truckB.state === 'away') { truckB.t += dt; Tr.position.set(80, 0, ROAD_Z + .9); Tr.visible = false;
    // never two lorries on the same stretch of road: wait while the other truck is still driving in
    if (o && !closingTime() && truckB.t > 9 / dockK() + (o.lateBy || 0) + wxLorryLate() && !(trip && ['out', 'back'].includes(trip.phase))) { truckB.state = 'arrive'; truckB.s = 0; truckB.path = ARRIVE2; Tr.visible = true; } }
  if (tg) tg.rotation.z = lerp(tg.rotation.z, truckB.state === 'docked' ? Math.PI / 2 * .96 : 0, Math.min(1, dt * 4));
}
function checkLoaded2(){ const o = S.order2; if (!o || o.ready || ['c', 'p', 't'].some(k => o.l[k] < want2(o, k))) return;
  o.ready = true; toast(hasRole('supervisor') ? 'Dock 2 is loaded. Your supervisor will sign it off.' : 'Dock 2 is loaded: sign the note at the second dock.', 'gold'); }
function signOrder2(by){
  const o = S.order2; if (!o || !o.ready || truckB.state !== 'docked') return;
  const late = o.time > o.deadline, early = o.time < o.deadline / 2, gross = late ? Math.round(o.pay * .5) : o.pay;
  S.cashPile += gross; S.delivered++; l7Delivered(o, late); if (!late) S.ontime++; if (o.qty && o.pq && o.tq) S.lv4.mixed3++; if ([o.qty, o.pq, o.tq].filter(n => n > 0).length >= 2) S.lv4.mixed = (S.lv4.mixed || 0) + 1; if (o.rush && !late) S.l5.rushDone = (S.l5.rushDone || 0) + 1;
  repChange(late ? -3 : early || o.rush ? 3 : 2);
  S.history.unshift({ id:o.id, qty:o.qty, pq:o.pq || 0, tq:o.tq || 0, net:gross, late, dl:o.deadline, t:Math.round(o.time), dock:2, rush:!!o.rush }); S.history = S.history.slice(0, 8);
  S.order2 = null; truckB.state = 'leave'; truckB.s = 0; truckB.path = LEAVE2; COL.delete('truck2'); repathAround(); l5Delivered(2);
  syncPile(); sfx('horn'); floatText(`+${fmt(gross)}`, P.drop2[0], 1.4, P.drop2[1]);
  toast(`${by === owner ? 'You signed' : `${by.st.name} signed`} dock 2's delivery${late ? ' (late: half pay, reputation −3)' : o.rush ? ': rush order on time, reputation +3' : early ? ' early: reputation +3' : ': reputation +2'}. ${fmt(gross)} to collect.`, late ? 'bad' : 'good');
  if (by && by !== owner) giveXp(by.st, 6);
  save(); checkCharter();
}
// what dock 2 still needs of a kind, not counting what is on the forks already
function need2(k){ const o = S.order2; if (!o || o.ready || truckB.state !== 'docked') return 0;
  return Math.max(0, want2(o, k) - o.l[k] - (fork.task === 'dock2' && fork.carryType === TYPE2[k] ? fork.stack.length : 0)); }
const avail2 = k => k === 'p' ? S.l5.rack2 : 0;   // v2.0 Level 5: dock 2 ships the second mill's pipes
const pipes2Out = ex => [...staffObj.values()].filter(o => o !== ex && o.carryType === 'pipe' && ['toTruck2', 'dropTruck2', 'takeRack2'].includes(o.state)).reduce((a, o) => a + o.stack.length, 0);
// short of stock for dock 2: the ticket names it so the owner knows which machine to watch
function short2(){ const o = S.order2; if (!o) return ''; const out = [];
  for (const k of ['c', 'p', 't']) { const n = want2(o, k) - o.l[k] - avail2(k) - (fork.carryType === TYPE2[k] && fork.task === 'dock2' ? fork.stack.length : 0); if (n > 0) out.push(`${n} ${{ c:'crates', p:'pipes', t:'tools' }[k]}`); }
  return out.join(', '); }

// --- the forklift's road to the frontage: round the warehouse, down the back yard, along the truck park ----
const LANE5 = [[-6.9, 7.6], [-7.2, 12.5], [-1.4, 12.9], [6.0, 12.5], [11.4, 12.2], [13.5, 14.0], [13.7, 15.6]];
const onFront = p => p[1] > 13.9 && p[0] > 11.5;
function laneRoute(from, to){
  const L = LANE4.pts, near0 = q => { let b = 0, bd = 1e9; L.forEach((n, i) => { const d = Math.hypot(n[0] - q[0], n[1] - q[1]); if (d < bd) { bd = d; b = i; } }); return b; };
  const a = near0(from), b = near0(to);
  if (a === b || (Math.hypot(to[0] - from[0], to[1] - from[1]) < 5 && groundY(...from) < .02 && groundY(...to) < .02)) return findPath(from[0], from[1], to[0], to[1]);   // off the deck it keeps to the ramp
  const dist = L.map(() => 1e9), prev = L.map(() => -1), open = new Set(L.map((_, i) => i)); dist[a] = 0;
  while (open.size) { let u = -1; for (const i of open) if (u < 0 || dist[i] < dist[u]) u = i; open.delete(u); if (u === b) break;
    for (const [i, j] of LANE4.links) { const v = i === u ? j : j === u ? i : -1; if (v < 0 || !open.has(v)) continue; const d = dist[u] + Math.hypot(L[v][0] - L[u][0], L[v][1] - L[u][1]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } } }
  const chain = []; for (let k = b; k >= 0; k = prev[k]) chain.unshift(L[k]);
  const onLane = Math.hypot(from[0] - L[a][0], from[1] - L[a][1]) < .3;
  return [...(onLane ? [] : findPath(from[0], from[1], L[a][0], L[a][1]).slice(0, -1)), ...chain, ...(Math.hypot(to[0] - L[b][0], to[1] - L[b][1]) < .3 ? [] : findPath(L[b][0], L[b][1], to[0], to[1]))];
}
function forkRoute(to, state){
  const from = [fork.o.position.x, fork.o.position.z];
  if (S.level >= 4) { fork.path = laneRoute(from, to); while (fork.path.length > 1 && Math.hypot(fork.path[0][0] - from[0], fork.path[0][1] - from[1]) < .6) fork.path.shift();   // it is already there: no nosing forward first
    fork.goal = to; fork.state = state; return; }
  if (S.level < 5 || onFront(from) === onFront(to)) return forkGo(to, state);
  const lane = onFront(to) ? LANE5 : [...LANE5].reverse(), last = lane[lane.length - 1];
  const head = onFront(from) ? [] : findPath(from[0], from[1], lane[0][0], lane[0][1]), tail = onFront(to) ? [to] : findPath(last[0], last[1], to[0], to[1]);
  fork.path = [...head, ...lane.slice(onFront(from) ? 0 : 1), ...tail]; fork.goal = to; fork.state = state;
}
function forkDock2Task(){
  if (true || !S.order2 || truckB.state !== 'docked' || S.order2.ready) return null;
  for (const k of ['p', 'c', 't']) if (need2(k) > 0 && avail2(k) > 0) return 'dock2:' + k;
  return null;
}
// dock 2 states; returns true when it handled the forklift this frame
function updateForkDock2(dt, drv){
  const st = fork.state;
  if (st === 'toRack2') { if (forkDrive(dt)) fork.state = 'loadRack2'; return true; }
  if (st === 'loadRack2') { forkFace(P.rack2, dt);
    if (fork.stack.length < FORK_LOAD && S.l5.rack2 > 0 && need2('p') > 0) { if (forkTake(pipesArr.rack2, 'pipe')) { S.l5.rack2--; fork.wait = .16; sfx('pick', .4); } return true; }
    if (!fork.stack.length) { fork.state = 'idle'; fork.task = null; return true; }
    fork.liftTo = .35; forkRoute(P.forkDock2, 'toDock2'); return true; }
  if (st === 'toWh2') { if (forkDrive(dt)) fork.state = 'loadWh2'; return true; }
  if (st === 'loadWh2') { forkFace(P.wh, dt); const k = fork.k2, arr = k === 'c' ? crates.wh : k === 'p' ? pipesArr.wh : toolsArr.wh;
    if (fork.stack.length < FORK_LOAD && S.wh[k] > 0 && need2(k) > 0) { if (forkTake(arr, TYPE2[k])) { S.wh[k]--; fork.wait = .16; sfx('pick', .4); } return true; }
    if (!fork.stack.length) { fork.state = 'idle'; fork.task = null; return true; }
    fork.liftTo = .35; forkRoute(P.forkDock2, 'toDock2'); return true; }
  if (st === 'toDock2') { if (forkDrive(dt)) { fork.state = 'drop2'; fork.liftTo = .1; } return true; }
  if (st === 'drop2') { forkFace(P.truck2, dt); const k = fork.carryType === 'pipe' ? 'p' : fork.carryType === 'toolbox' ? 't' : 'c', o = S.order2;
    if (!fork.stack.length) { fork.state = 'idle'; fork.task = null; fork.liftTo = 0; S.l5.trips2 = (S.l5.trips2 || 0) + 1; if (drv) giveXp(drv.st, 8); return true; }
    if (!o || o.ready || truckB.state !== 'docked' || o.l[k] >= want2(o, k)) { fork.liftTo = .35; forkRoute(P.forkWh, 'toWhBack'); return true; }
    if (forkGive(k === 'c' ? crates.bed2 : k === 'p' ? pipesArr.bed2 : toolsArr.bed2, M.truck2, k === 'c' ? bedPos : k === 'p' ? pipeBedPos : toolBedPos, () => syncBed2())) {
      o.l[k]++; if (k === 'c') S.shipped++; else if (k === 'p') S.pshipped++; else S.tshipped++; sfx('drop', .5); checkLoaded2(); fork.wait = .16; }
    return true; }
  // the truck left (or the order was covered) with goods still on the forks: they go back into the warehouse
  if (st === 'toWhBack') { if (forkDrive(dt)) fork.state = 'whBack'; return true; }
  if (st === 'whBack') { forkFace(P.wh, dt); if (!fork.stack.length) { fork.state = 'idle'; fork.task = null; fork.liftTo = 0; return true; }
    const k = fork.carryType === 'pipe' ? 'p' : fork.carryType === 'toolbox' ? 't' : 'c';
    if (forkGive(k === 'c' ? crates.wh : k === 'p' ? pipesArr.wh : toolsArr.wh, world, { c:whCratePos, p:whPipePos, t:whToolPos }[k], () => syncWh())) { S.wh[k]++; fork.wait = .14; } return true; }
  return false;
}

// --- the second pipe mill on the frontage: its pipes go out from dock 2 ------------------------------------
let mill2T = 0, mill2On = false, mill2By = null;
const coil2Pos = i => new THREE.Vector3(P.coil2[0], 0, P.coil2[1] + i * .42);
function rack2Pos(i){ const t = Math.floor(i / 6), k = i % 6; return new THREE.Vector3(P.rack2[0], [.35, .75, 1.15, 1.42][Math.min(t, 3)] + .025, P.rack2[1] + [-.5, -.36, -.22, .22, .36, .5][k]); }
const syncCoil2 = () => { if (M.mill2 || M.mill2Scaffold) syncStack(coilsArr.feed2, S.l5.coil2, coilMesh, coil2Pos); };
const syncRack2 = () => { if (M.rack2) syncStack(pipesArr.rack2, S.l5.rack2, pipeMesh, rack2Pos); };
function startMill2Build(fx){
  S.l5.mill2 = Math.max(1, S.l5.mill2);
  if (!M.mill2Scaffold) { M.mill2Scaffold = put(inst('l2_scaffold'), ...P.mill2, 0); M.mill2Scaffold.userData.dyn = true; }
  if (!M.mill2Builder) M.mill2Builder = makeBuilder([P.mill2[0] - .4, P.mill2[1] - 1.1], -94);
  if (fx) { toast('Paid. Big Tom\'s crew is installing the second pipe mill on the frontage.', 'good'); sfx('buy'); save(); }
}
function finishMill2(fx){
  S.l5.mill2 = 2;
  if (M.mill2Scaffold) { M.mill2Scaffold.removeFromParent(); M.mill2Scaffold = null; }
  if (!M.mill2) {
    M.mill2 = put(A.pipe_machine.scene.clone(true), ...P.mill2, 0); M.mill2.userData.dyn = true; addCol([P.mill2[0] - 1.15, P.mill2[1] - .55, P.mill2[0] + 1.15, P.mill2[1] + .55], 'mill2');
    M.mill2.updateMatrixWorld(true);
    const op = M.mill2.getObjectByName('op_spot').getWorldPosition(new THREE.Vector3()); P.pop2 = [op.x, op.z];
    const pipe = findNode(M.mill2, 'pipe_out');
    M.mill2N = { coilS:findNode(M.mill2, 'coil').scale.clone(), coil:findNode(M.mill2, 'coil'), rollers:[1, 2, 3].map(i => findNode(M.mill2, 'roller_' + i)), pipe, pipeX:pipe.position.x, lamp:findNode(M.mill2, 'status_lamp'), beacon:findNode(M.mill2, 'beacon') };
    pipe.visible = false;
    M.rack2 = put(inst('l2_pipe_rack'), ...P.rack2, 0); M.rack2.userData.dyn = true; addCol([P.rack2[0] - .82, P.rack2[1] - .62, P.rack2[0] + .82, P.rack2[1] + .62], 'rack2');
    syncCoil2(); syncRack2(); rebuildNav();
  }
  if (fx) { toast('The second pipe mill is running on the frontage. Hire its operator; loaders bring it steel from the coil bay.', 'gold'); sfx('level', .6); confetti(); save(); renderOffice(); }
}
function updateMill2(dt){
  if (!mill2Ready()) { mill2On = false; return; }
  const by = handOn(pipe2Op(), P.pop2, P.mill2), room = S.l5.rack2 < RACK2_CAP;
  if (by && S.l5.coilLeft2 <= 0 && S.l5.coil2 > 0 && room) { S.l5.coil2--; S.l5.coilLeft2 = COIL_PIPES; syncCoil2(); sfx('clank', .6); floatText('New coil', P.mill2[0] - .5, 1.6, P.mill2[1], 'info'); }
  const canRun = by && S.l5.coilLeft2 > 0 && room && circuitOn('pipe');
  mill2On = !!canRun && l6Run('mill2'); mill2By = by;
  const N = M.mill2N;
  if (canRun) {
    mill2T += dt * (1 + .2 * S.up.pipe) * tierK('mill2') * autoFeedK() * crewSpeed(by) * pf();
    N.coil.rotation.z -= dt * 2.2; for (const r of N.rollers) r.rotation.z -= dt * 9; N.pipe.visible = true; N.pipe.position.x = N.pipeX - .55 + (mill2T / PIPE_CYCLE) * .55;
    if (Math.random() < dt * 3) spark(P.mill2[0] + rand(-.3, .3), .75, P.mill2[1] + rand(-.1, .1));
    by.st.energy = Math.max(0, by.st.energy - dt * (100 / 90));
    if (mill2T >= PIPE_CYCLE) { mill2T = 0; S.l5.coilLeft2--; S.l5.rack2++; S.pmade++; S.l5.made2 = (S.l5.made2 || 0) + 1; machCycle('mill2'); syncRack2(); sfx('clank'); giveXp(by.st, 10); }
  } else N.pipe.visible = false;
  N.coil.visible = S.l5.coilLeft2 > 0; const f = .5 + .5 * S.l5.coilLeft2 / COIL_PIPES; N.coil.scale.set(N.coilS.x * f, N.coilS.y * f, N.coilS.z);
  const lampState = !circuitOn('pipe') ? LAMP_STOP : mill2On ? LAMP_RUN() : LAMP_IDLE; setLamp(N.lamp, ...lampState); setLamp(N.beacon, ...lampState);
}
function mill2Reason(){
  const oc = pipe2Op(), R = (cls, title, sub) => ({ label:[cls, title, sub] });
  if (!mill2Ready()) return R('warn', S.l5.mill2 ? 'Installing' : 'Not installed', S.l5.mill2 ? `Big Tom's crew: ${Math.floor(S.l5.mill2T / MILL2_BUILD * 100)}%` : 'Pay in at the pad');
  if (!powerOn() || !circuitOn('pipe')) return R('bad', 'No power', 'Check the generator');
  if (mill2On) return R('', 'Forming', `${S.l5.rack2}/${RACK2_CAP} pipes for dock 2`);
  if (!oc) return R('warn', 'Stopped', 'No operator: hire one');
  if (oc.state !== 'work') return R('warn', 'Starting', 'Operator walking to the mill');
  if (S.l5.rack2 >= RACK2_CAP) return R('warn', 'Rack full', 'Waiting for a dock 2 order');
  if (S.l5.coilLeft2 <= 0 && S.l5.coil2 <= 0) return R('warn', 'Needs steel', S.coils > 0 ? 'Loader bringing a coil' : 'No coils: order steel');
  return R('warn', 'Starting', 'Next pipe');
}

// v2.0 Level 5 charter: two orders delivered on the same day (one from each dock), counted as pairs each day
function l5Delivered(dock){ if (S.level < 5) return; const A = S.l5, n = dayNo(); if (!A.dd || A.dd.n !== n) A.dd = { n, d1:0, d2:0, pairs:0 };
  A.dd['d' + dock]++; const p = Math.min(A.dd.d1, A.dd.d2); if (p > A.dd.pairs) { A.pairs = (A.pairs || 0) + p - A.dd.pairs; A.dd.pairs = p; toast('Both docks have shipped today: two orders out on the same day.', 'good'); } if (dock === 2) A.d2done = (A.d2done || 0) + 1; }
// --- Bible v2.0 18.2: the weekly accounts (from Level 5) ----------------------------------------------------
// Friday 16:30 the owner pays each pay packet from cash at the wages hatch (June Finch from Level 6). After the knocking-off
// whistle the Friday card shows the week's accounts: power (30% less on the mains), the diesel the generator burnt, Gus's
// pension ($35 a week) and the loan instalment. One week of grace, then -2 reputation for each unpaid week; unpaid
// accounts never close the works. Nothing accrues while paused. Loans: one at a time, up to 30% of the level goal, repaid
// at 110% over the next five Fridays; a missed instalment costs 3 reputation.
const POWER_WEEK = 160, SIDING_LEASE = 600;   /* v2.0 18.2: leases from Level 8 (the railway strip, from the railway; VERIFY) */                       // dollars per kW of supply a working week (VERIFY: about 10% of a well-run week's takings with diesel)
const DIESEL_CAN = () => Math.round((S.level >= 5 ? 16 : 8) * (S.fuelK || 1));   // the winter fuel crisis doubles the price of diesel from Level 5 (v2.0 3.5, 15.1)
const PENSION_WEEK = 35, LOAN_RATE = .1, LOAN_WEEKS = 5;
const loanMax = () => Math.round((GOAL_OF[S.level] || 120000) * .3 / 1000) * 1000;
const LOAN_STEPS = () => [.1, .2, .3].map(k => Math.round((GOAL_OF[S.level] || 120000) * k / 1000) * 1000);
const accountsOn = () => S.level >= 5;
function weekAccounts(){
  const A = S.l5, w = {}; for (const st of S.staff) w[st.role] = (w[st.role] || 0) + 1;
  const wages = Object.entries(w).reduce((a, [r, n]) => a + n * (WAGES[r] || 120), 0);
  const power = Math.round(supplyKW() * POWER_WEEK * (mainsLive() ? .7 : 1) * Math.max(.5, 1 - .05 * (S.up.tariff || 0)) / 5 * Math.min(5, A.daysThisWeek || 5));
  const diesel = Math.round((A.dieselL || 0) / 20 * DIESEL_CAN()), L = A.loan, loan = L && L.n > 0 ? Math.min(L.inst, L.left) : 0, pension = S.gus.retired ? PENSION_WEEK : 0, lease = S.level >= 8 ? SIDING_LEASE : 0;
  return { w, wages, owedWages:A.owedWages || 0, power, diesel, pension, loan, lease, total:power + diesel + pension + loan + lease + (A.owedWages || 0) };
}
// the generator's diesel, counted in litres while it runs (a 10 kW set burns about 3 litres an hour at full load)
function meterDiesel(dt){ if (!accountsOn() || !genActive()) return; const kw = load(); S.l5.dieselL = (S.l5.dieselL || 0) + dt / 60 * (.8 + 2.7 * kw / Math.max(1, genKW())) * PG.cut(.25, S.up.fuel); }
// Friday after the whistle: the week's accounts are made up and the card offers to pay them
function closeWeek(){
  if (!accountsOn()) return null; const A = S.l5, a = weekAccounts(), wk = Math.floor(calDay() / 5);
  if (A.lastWeek === wk) return A.acc; A.lastWeek = wk;
  if (A.acc && !A.acc.paid) { A.acc.missed = (A.acc.missed || 0) + 1; if (A.acc.missed >= 2) { repChange(-2); toast('Last week\'s accounts are still unpaid: reputation -2. Pay them in the office (Finance).', 'bad'); } if (A.acc.loan) { repChange(-3); toast('A loan instalment was missed: reputation -3.', 'bad'); } }
  const carry = A.acc && !A.acc.paid ? A.acc.total : 0;
  A.acc = { wk, power:a.power, diesel:a.diesel, pension:a.pension, loan:a.loan, lease:a.lease, owedWages:a.owedWages, carry, total:a.total + carry, paid:false, missed:A.acc && !A.acc.paid ? A.acc.missed : 0, wages:A.wagesPaid || 0 };
  A.dieselL = 0; A.owedWages = 0; A.wagesPaid = 0; A.daysThisWeek = 0; return A.acc;
}
function payAccounts(){
  const A = S.l5, acc = A.acc; if (!acc || acc.paid || S.cash < acc.total) return false;
  S.cash -= acc.total; acc.paid = true; A.paid++; if (!acc.missed) A.onTime++; A.spent += acc.total;
  const L = A.loan; if (acc.loan && L) { L.left = Math.max(0, L.left - acc.loan); L.n = Math.max(0, L.n - 1); if (!L.n || L.left <= 0) { L.left = 0; L.n = 0; } }
  sfx('coin'); toast(`The week's accounts are paid: ${fmt(acc.total)}.`, 'good'); const pr = folk.get('priya'); if (pr) pr.say = { text:acc.missed ? 'Squared away at last.' : pick(['Books balanced.', 'Paid on the nail.', 'Another clean page in the ledger.']), until:T + 2.6 };
  save(); checkCharter(); renderOffice(); return true;
}
// the pay packets at 16:30 come out of the owner's cash from Level 5; a packet the cash cannot cover is owed on the accounts
function payPacket(st){ if (estatePays()) return; const w = WAGES[st.role] || 120, A = S.l5; if (S.cash >= w) { S.cash -= w; A.wagesPaid = (A.wagesPaid || 0) + w; } else { A.owedWages = (A.owedWages || 0) + w; } }
const loanRoom = () => loanMax() - (S.l5.loan ? S.l5.loan.left : 0);
function takeLoan(amt){
  if (amt > loanRoom() || (S.l5.loan && S.l5.loan.left > 0)) return; const L = S.l5.loan = { left:0, inst:0, n:0 };
  const owe = Math.round(amt * (1 + LOAN_RATE)); L.left = owe; L.n = LOAN_WEEKS; L.inst = Math.ceil(owe / LOAN_WEEKS); S.cash += amt; S.l5.borrowed = (S.l5.borrowed || 0) + amt;
  sfx('coin'); meet('eldon'); toast(`Eldon Graves lends you ${fmt(amt)}. ${fmt(owe)} comes back in ${LOAN_WEEKS} instalments of ${fmt(L.inst)} on the Friday accounts.`, 'gold'); save(); renderOffice();
}
function repayLoan(){ const L = S.l5.loan; if (!L || !L.left || S.cash < L.left) return; S.cash -= L.left; L.left = 0; L.n = 0; L.inst = 0; sfx('coin'); toast('Loan repaid in full. Eldon Graves tips his hat.', 'good'); save(); renderOffice(); }
function accountsHtml(acc, withPay = true){ const row = (k, v) => `<span>${k}</span><span>${fmt(v)}</span>`;
  return `${acc.june ? `<div class="db-s" style="margin-bottom:6px">${acc.june}</div>` : ''}<div class="kv db">${acc.wages ? `<span>Pay packets (paid at 16:30)</span><span>${fmt(acc.wages)}</span>` : ''}${row('Power' + (mainsLive() ? ' (mains, 30% less)' : ''), acc.power)}${row('Diesel', acc.diesel)}${acc.pension ? row('Gus Mallory\'s pension', acc.pension) : ''}${acc.loan ? row('Loan instalment', acc.loan) : ''}${acc.lease ? row('Siding lease (the railway)', acc.lease) : ''}${acc.owedWages ? row('Wages owed', acc.owedWages) : ''}${acc.carry ? row('Unpaid from last week', acc.carry) : ''}
    <span class="db-t">To pay</span><span class="db-t">${fmt(acc.total)}</span></div>${acc.paid ? '<div class="stamp db-st">Paid</div>' : withPay ? `<button class="btn primary" data-payacc type="button" style="width:100%;margin-top:8px;min-height:44px" ${S.cash >= acc.total ? '' : 'disabled'}>Pay the accounts · ${fmt(acc.total)}</button>${S.cash < acc.total ? '<div class="db-s">Not enough cash: one week\'s grace, or borrow from Eldon (Finance).</div>' : ''}` : ''}`; }
function financeHtml(){
  const A = S.l5, acc = A.acc, nb = weekAccounts(), L = A.loan || { left:0, n:0, inst:0 };
  let h = `<p class="note">Friday 16:30: the pay packets, from your cash. After the whistle: the week's accounts. One week's grace, then the valley hears of it. Unpaid accounts never close the works.</p>`;
  if (acc && !acc.paid) h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('coins')}</span><div><b>This week's accounts</b><small>${acc.missed ? 'Overdue' : 'Due'}</small></div></div>${accountsHtml(acc)}</div>`;
  h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>Priya's preview</b><small>What Friday will cost, so far this week</small></div></div><div class="kv">${Object.entries(nb.w).map(([r, n]) => `<span>${n} ${(ROLE[r] || { title:r }).title.toLowerCase()}${n > 1 ? 's' : ''} × ${fmt(WAGES[r] || 120)}</span><span>${fmt(n * (WAGES[r] || 120))}</span>`).join('')}<span>Pay packets</span><span>${fmt(nb.wages)}</span><span>Power so far</span><span>${fmt(nb.power)}</span><span>Diesel so far</span><span>${fmt(nb.diesel)}</span>${nb.pension ? `<span>Gus's pension</span><span>${fmt(nb.pension)}</span>` : ''}${nb.loan ? `<span>Loan instalment</span><span>${fmt(nb.loan)}</span>` : ''}</div></div>`;
  h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('coins')}</span><div><b>Eldon Graves, the Valley Bank</b><small>One loan at a time, up to ${fmt(loanMax())}</small></div></div><div class="kv"><span>Loan outstanding</span><span>${fmt(L.left)}${L.n ? ` · ${L.n} × ${fmt(L.inst)} on the Friday accounts` : ''}</span></div>`;
  if (!L.left) for (const a of LOAN_STEPS()) if (a <= loanRoom()) h += `<div class="up"><span class="ic">${icon('coins')}</span><div><b>Borrow ${fmt(a)}</b><span class="note">Repay ${fmt(Math.round(a * (1 + LOAN_RATE)))} over the next ${LOAN_WEEKS} Fridays</span></div><button class="btn primary" data-loan="${a}" type="button">Borrow</button></div>`;
  if (L.left) h += `<div class="call-b" style="padding:0 11px 11px"><button class="btn" data-repay type="button" ${S.cash >= L.left ? '' : 'disabled'}>Repay ${fmt(L.left)} now</button></div>`;
  h += `</div><div class="dept"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>Ledger</b><small>Priya Nair keeps the books</small></div></div><div class="kv"><span>Weeks paid on time</span><span>${A.onTime}</span><span>Paid late</span><span>${A.paid - A.onTime}</span><span>Paid so far</span><span>${fmt(A.spent)}</span></div></div>`;
  return h;
}

// --- the owner on the frontage and across the road ------------------------------------------------------
let sign2T = 0;
function ownerL5(dt){
  if (S.level < 5 || !M.l5Built) return; const o = owner.o, r2 = M.rings.drop2;
  if (r2) { r2.g.visible = truckB.state === 'docked';
    if (S.order2 && S.order2.ready && near(o, P.drop2, .75)) { sign2T += dt; r2.prog.visible = true; setArc(r2, sign2T); if (sign2T >= 1) { sign2T = 0; signOrder2(owner); } }
    else { sign2T = Math.max(0, sign2T - dt * 2); r2.prog.visible = sign2T > 0; setArc(r2, sign2T); } }
  // the office block's door: stand in its ring and the office opens (the desk inside, Priya at hers)
  const atDoor = near(o, P.officeDoor, .6);
  if (atDoor && !owner.atDoor && !cardOpen && !officeOpen) { if (!S.met.priya) meet('priya'); openOffice(S.level >= 5 ? 'finance' : null); }
  owner.atDoor = atDoor;
}

// --- the frontage, the bank and the corner shop ---------------------------------------------------------
function fenceRun(x0, z0, x1, z1){ const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.4)), ry = Math.atan2(-(z1 - z0), x1 - x0);
  const k = len / n / 2.45;   // a short run (a stub beside a gate) gets a cut-down panel, not a full one sticking into the gateway
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, f = put(inst('env_fence_panel'), lerp(x0, x1, t), lerp(z0, z1, t), ry); f.userData.dyn = true; if (k < .9) { f.scale.x *= k; if (window.__ivLint) { const L = window.__ivLint[window.__ivLint.length - 1]; f.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(f); L.box = [bb.min.x, bb.min.z, bb.max.x, bb.max.z].map(v => +v.toFixed(2)); } } } }
function boardMesh(w, h, title, sub, col, head){ return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:head ? signTex(title, sub, col, head) : tex(512, 128, g => { g.fillStyle = col; g.fillRect(0, 0, 512, 128); g.fillStyle = '#ece6d9'; g.font = '700 74px Oswald, Arial'; const w = g.measureText(title).width; if (w > 470) g.font = `700 ${Math.floor(74 * 470 / w)}px Oswald, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(title, 256, 66); }) })); }
function paintTruck(Tr, hex){
  const c = new THREE.Color(hex);
  Tr.traverse(m => { if (!m.isMesh || !m.geometry.attributes.color) return; const g = m.geometry = m.geometry.clone(), a = g.attributes.color;
    for (let i = 0; i < a.count; i++) { const r = a.getX(i), gg = a.getY(i), b = a.getZ(i); if (b > .06 && b > r * 2.2 && b > gg * 1.5) { const k = Math.min(1.15, b / .25); a.setXYZ(i, c.r * k, c.g * k, c.b * k); } }
    a.needsUpdate = true; });
}
function buildLevel5(){
  if (M.l5Built) return; M.l5Built = true;
  const [cx0, cz0, cx1, cz1] = CORNER;
  // --- Ada Finch's corner plot: the old fence comes down; a new one round the whole plot, with a road gate for the lorry
  // and a wicket for the crew on the pavement side (the plot is deeper now: a lorry stands in it end to end)
  for (const f of [...(M.cornerFence || []), ...(M.frontEast || [])]) f.visible = false; if (M.cornerTree) M.cornerTree.visible = false; for (const k of ['cornerN', 'cornerW', 'cornerS', 'frontEast']) COL.delete(k);
  const run = (x0, z0, x1, z1, k) => { fenceRun(x0, z0, x1, z1); addCol([Math.min(x0, x1) - .1, Math.min(z0, z1) - .1, Math.max(x0, x1) + .1, Math.max(z0, z1) + .1], k); };
  const GW = [14.05, 15.15], GL = [24.75, 27.85];   // the crew's wicket and the lorry gate in the north fence
  run(cx0, cz0, GW[0], cz0, 'c5n1'); run(GW[1], cz0, GL[0], cz0, 'c5n2'); run(GL[1], cz0, cx1, cz0, 'c5n3'); run(cx0, cz0, cx0, cz1, 'c5w'); run(cx0, cz1, cx1, cz1, 'c5s'); run(cx1, cz0, cx1, cz1, 'c5e');
  for (const x of [GW[0], GW[1], GL[0], GL[1]]) { put(inst('env_gate_post'), x, cz0, 0).userData.dyn = true; addCol([x - .2, cz0 - .2, x + .2, cz0 + .2]); }
  const gravel = plane(cx1 - cx0 - .3, cz1 - cz0 - .3, decal(std('#ffffff', 1, 0, { map:TX.asphalt }), 1), (cx0 + cx1) / 2, (cz0 + cz1) / 2, .006); gravel.userData.dyn = true;
  const paint = decal(new THREE.MeshLambertMaterial({ color:'#d9a12e' }), 2);
  for (const x of [GL[0] + .1, GL[1] - .1]) plane(.12, cz1 - cz0 - .4, paint, x, (cz0 + cz1) / 2, .02).userData.dyn = true;   // the lorry bay's lines
  // --- dock 2: the same raised side dock as dock 1, its ramp down the west side, the lorry on its east face
  M.dock2 = put(inst('site_loading_dock'), DK2[0], DK2[1], Math.PI / 2); M.dock2.userData.dyn = true; M.dock2Lamp = findNode(M.dock2, 'dock_lamp');
  const deck = [DK2[0] - 1.0, DK2[1] - 2.5, DK2[0] + 1.0, DK2[1] + 2.5], ramp = [DK2[0] - 5.5, DK2[1] - 2.0, DK2[0] - 1.0, DK2[1] - .4]; LDOCK.more = [{ deck, ramp }];
  { const [x0, z0, x1, z1] = deck, [rx0, rz0, , rz1] = ramp;
    addCol([x1 - .12, z0, x1 + .04, z1], 'dock2E'); addCol([x0, z0 - .08, x1, z0 + .08], 'dock2N'); addCol([x0, z1 - .08, x1, z1 + .08], 'dock2S');
    addCol([x0 - .06, z0, x0 + .06, rz0 - .02], 'dock2W1'); addCol([x0 - .06, rz1 + .02, x0 + .06, z1], 'dock2W2');
    addCol([rx0 + .05, rz0 - .3, x0, rz0 - .02], 'dock2kerbN'); addCol([rx0 + .05, rz1 + .02, x0, rz1 + .3], 'dock2kerbS'); }
  const db = boardMesh(1.3, .32, 'DOCK 2', '', '#2f5d8a'); db.position.set(DK2[0] + 1.06, 2.2, DK2[1] + 2.56); db.userData.dyn = true; world.add(db);
  M.ring('drop2', ...P.drop2, '#e8ab2c', .72).g.position.y = LDOCK.H + .02; M.rings.drop2.g.visible = false;
  // --- the white lorry and its driver
  M.truck2 = put(A.truck.scene.getObjectByName('truck_lorry').clone(true), 74, ROAD_Z + .9, 0); M.truck2.userData.dyn = true; M.truck2.add(blob(5.2, 2.4)); M.truck2.visible = false;
  for (const n of ['wheel_fl', 'wheel_fr']) findNode(M.truck2, n).rotation.order = 'YXZ';
  paintTruck(M.truck2, '#eceae4');
  const d = makeChar('worker', 0, 0, { parts:['hat_cap', 'hair_short'], cols:{ suit:'#4a4f57', hat:'#b3261e', skin:pick(SKINS), hair:pick(HAIRS), shirt:pick(SHIRTS) } });
  d.o.children.filter(x => x.isMesh && x.geometry.type === 'PlaneGeometry').forEach(x => x.removeFromParent()); M.truck2.add(d.o); d.o.position.set(1.42, .56, .42); d.faceNow(Math.PI / 2); d.play('sit'); parkedLamps(M.truck2);
  // --- the office block across Mill Road, its door and windows facing the yard's camera; the zebra crossing to it
  buildOfficeBlock(); buildZebra();
  if (M.roadBoard) M.roadBoard.visible = false;   // the 'second dock' board comes down: dock 2 is built
  M.shopSign = plotSign(PLOTS.shop.sign, 'Corner plot', 'Ada Finch · Valley Estates', '#2f5a3a'); if (plotSt('shop') >= 1) M.shopSign.userData.sold.visible = true; M.ring('shop', ...PLOTS.shop.ring, '#6fa6d6', .55);
  M.ring('office', ...P.officeDoor, '#6fa6d6', .6);
  // walkers keep to the crossing: the road is no place to walk, except on the zebra
  NAVOUT.length = 1; NAVOUT.push([-70, 14.05, 4.15, 18.35], [5.85, 14.05, 80, 18.35]);
  if (S.l5.mill2 >= 2) finishMill2(false); else if (S.l5.mill2 === 1) startMill2Build(false);
  if (S.order2) { truckB.state = 'docked'; const q = pathAt(ARRIVE2, ARRIVE2.len); M.truck2.position.set(q.x, 0, q.z); M.truck2.rotation.y = q.yaw; M.truck2.visible = true; addCol(truck2Box(), 'truck2'); }
  syncBed2(); rebuildNav();
}
const truck2Box = () => [P.truck2[0] - 1.15, P.truck2[1] - 3.2, P.truck2[0] + 1.15, P.truck2[1] + 3.2];
// The works' new office block (built in the time skip before Level 5): two storeys of brown brick, a flat roof behind a
// parapet, steel windows in rows, a porch over the door. Its face is to the south, towards the yard's camera.
function buildOfficeBlock(){
  if (M.officeBlock) return; const [ox, oz] = P.office, W = 8.0, D = 5.4, H = 6.3, g = new THREE.Group(); g.position.set(ox, 0, oz); g.userData.dyn = true; world.add(g);
  const brickT = tex(256, 256, (c, w, h) => { c.fillStyle = '#7d4a33'; c.fillRect(0, 0, w, h); for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const o = y % 2 ? 16 : 0; c.fillStyle = `hsl(${14 + Math.random() * 8}, ${38 + Math.random() * 12}%, ${28 + Math.random() * 9}%)`; c.fillRect(x * 32 + o + 1, y * 16 + 1, 30, 14); } }, true);
  brickT.wrapS = brickT.wrapT = THREE.RepeatWrapping; brickT.repeat.set(4, 3);
  const brick = new THREE.MeshStandardMaterial({ map:brickT, roughness:.92 }), stone = std('#c9c0aa', .9), dark = std('#2b2f33', .5, .2), glass = new THREE.MeshStandardMaterial({ color:'#5d7584', roughness:.15, metalness:.4, emissive:'#1e2a33', emissiveIntensity:.3 }), frame = std('#e8e0c8', .7);
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  box(W + .3, .35, D + .3, stone, 0, .175, 0);                               // the plinth
  box(W, H - .35, D, brick, 0, .35 + (H - .35) / 2, 0);                      // the brick body
  box(W + .2, .18, D + .2, stone, 0, 3.32, 0);                               // the string course between the floors
  box(W + .25, .45, D + .25, stone, 0, H + .1, 0); box(W - .3, .1, D - .3, dark, 0, H + .3, 0);   // parapet coping, the felt roof
  for (const [y, n] of [[1.75, 6], [4.75, 6]]) for (let i = 0; i < n; i++) { const x = -W / 2 + .85 + i * (W - 1.7) / (n - 1); if (y < 3 && Math.abs(x) < .8) continue;
    box(1.0, 1.25, .06, frame, x, y, D / 2 + .02); box(.86, 1.11, .05, glass, x, y, D / 2 + .05); box(.04, 1.11, .04, frame, x, y, D / 2 + .08); box(1.12, .08, .16, stone, x, y - .7, D / 2 + .08);
    box(1.0, 1.25, .06, frame, x, y, -D / 2 - .02); box(.86, 1.11, .05, glass, x, y, -D / 2 - .05); }
  box(1.3, 2.3, .08, std('#3a2a1c', .7), 0, 1.5, D / 2 + .03); box(.06, 2.1, .02, std('#c9a24a', .3, .8), 0, 1.5, D / 2 + .08);   // the double door
  box(2.1, .12, 1.3, stone, 0, 2.85, D / 2 + .65); for (const x of [-.95, .95]) box(.1, 2.6, .1, dark, x, 1.5, D / 2 + 1.25);     // the porch
  box(2.4, .15, .9, stone, 0, .1, D / 2 + .5);                                // the step
  const sign = board(textTex([[signName().toUpperCase() + ' · OFFICES', 54, 46], ['EST. 1921 · MILL ROAD', 26, 92, 500]], 1024, 120, { bg:'#2f3a22', fg:'#ece2c6', border:'#c9a24a', bw:8 }), 5.4, .64); sign.position.set(0, 3.0, D / 2 + .14); g.add(sign); M.officeSign = sign;
  M.officeBlock = g; addCol([ox - W / 2 - .2, oz - D / 2 - .2, ox + W / 2 + .2, oz + D / 2 + .2], 'officeBlock');
  fadeGroup(g, [], [ox - W / 2, oz - D / 2, ox + W / 2, oz + D / 2]);
}
// The zebra crossing from the main gate to the office block: black and white bars across Mill Road and a Belisha beacon
// (a flashing amber globe on a striped pole) at each kerb. Vehicles stop for anybody on it (the right-of-way rules).
function buildZebra(){
  if (M.zebra) return; const g = new THREE.Group(); g.userData.dyn = true; world.add(g);
  const white = decal(new THREE.MeshLambertMaterial({ color:'#efeae0' }), 3), [x0, x1] = [P.crossN[0] - .8, P.crossN[0] + .8];
  for (let z = ROAD_Z - 1.75; z < ROAD_Z + 1.75; z += .5) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, .28), white); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, .012, z + .14); m.renderOrder = 3; g.add(m); }
  M.beacons = [];
  for (const [x, z] of [[x0 - 1.45, ROAD_Z - 2.1], [x1 + .45, ROAD_Z + 2.1]]) /* the north beacon stands west of the works gate's mouth, clear of the lorries */ { const pole = new THREE.Group(); pole.position.set(x, 0, z); g.add(pole);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(CY(.05, .4, 10), std(i % 2 ? '#efeae0' : '#1c1c1c', .6)); s.position.y = .2 + i * .4; s.castShadow = true; pole.add(s); }
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), new THREE.MeshStandardMaterial({ color:'#f0a03a', emissive:'#ff9a1a', emissiveIntensity:1.2, roughness:.3 })); globe.position.y = 2.55; pole.add(globe); M.beacons.push(globe);
    addCol([x - .1, z - .1, x + .1, z + .1]); }
  M.zebra = g;
}
function openShopPlot(fx){
  if (M.shopSign) M.shopSign.userData.sold.visible = true;
  if (fx) toast('The corner shop plot is yours. Ada moves to the bench by the gate when level 6 builds the new office there.', 'gold');
}
function updateLevel5(dt){
  if (S.level < 5 || !M.l5Built) return;
  if (M.beacons) for (const b of M.beacons) b.material.emissiveIntensity = (T % 1.1) < .6 ? 1.4 : .15;
  runBuilder('mill2Builder', P.mill2, S.l5, 'mill2T', MILL2_BUILD, finishMill2, dt);
  meterDiesel(dt); updateTruckB(dt); updateMill2(dt);
  if (S.order2) S.order2.time += dt;
  // dock 2's phone line opens once the first bill is behind the owner (or two minutes in)
  if (!S.order2 && !S.call && truckB.state === 'away' && officeHours() && (S.l5.paid > 0 || S.time - S.l5.t0 > 120) && !cardOpen) { call2T += dt;
    if (call2T > 7) { call2T = 0; S.call = dock2Spec(); toast(`${S.call.rush ? 'A rush order on the line' : 'The office phone is ringing'}: ${S.call.client}, for dock 2.`, S.call.rush ? 'bad' : 'gold'); save(); } }
}

/* =====================================================================
   LEVEL 6: Industrial Company (Bible v2.0 section 8, Level 6; plans/level6_plan.png). Tue 16 - Fri 19 April 1974.
   June Finch takes the clerk's window: she walks to the dock for the takings, hands out Friday's packets and pays the
   weekly accounts, and every payment goes in her ledger (she never pays silently: short of cash, she holds the bill and
   says so). Tier 2 refits make a machine 25% faster: the crate machine is swapped whole by a mobile crane hired from
   town (grandad's machine goes under a tarpaulin in the back corner); the others are refitted in place by Big Tom's
   crew. The service book: every machine counts its cycles; at about 200 an amber tag hangs on its guard (Service due:
   normal speed, three times the fault chance). A service takes the mechanic 8 s or the owner 16 s and one spare part.
   Thursday: the factory inspector walks the yard (guards, lanes, the service book, the wiring). Purchases: lightning
   conductor, works canteen, automatic changeover. Hail in the spring showers stops the crane.
   ===================================================================== */
const REFIT = {
  saw:  { name:'Crate machine', price:6000, crane:true, has:() => true, at:() => P.saw, fix:() => P.sawFix },
  saw2: { name:'Second crate machine', price:5000, has:() => S.lv4.saw2 >= 2 && !!M.saw2, at:() => P.saw2, fix:() => P.saw2Fix },
  pipe: { name:'Pipe mill', price:7500, has:() => millReady(), at:() => P.pmill, fix:() => P.pfix },
  mill2:{ name:'Second pipe mill', price:7500, has:() => S.l5.mill2 >= 2 && !!M.mill2, at:() => P.mill2, fix:() => P.mill2Fix },
  tool: { name:'Tool press', price:9000, has:() => pressReady(), at:() => P.tpress, fix:() => P.tfix },
};
const REFIT_T = 24, SVC_AT = { saw:80, saw2:80, pipe:60, mill2:60, tool:60 }, SVC_KIND = { saw:'svcSaw', saw2:'svcSaw2', pipe:'svcPipe', mill2:'svcMill2', tool:'svcTool' };
Object.assign(FAULTS, Object.fromEntries(Object.entries(SVC_KIND).map(([k, kind]) => [kind, { trade:'mechanic', name:'Service due', where:k, time:8, anim:'fix', part:true, svc:k }])));
WHERE.saw2 = { name:'second crate machine', mark:[P.saw2[0], 2.4, P.saw2[1]], spot:() => P.saw2Fix, face:null };
WHERE.mill2 = { name:'second pipe mill', mark:[P.mill2[0], 1.9, P.mill2[1]], spot:() => P.mill2Fix, face:null };
const realFault = f => !FAULTS[f.kind].svc;
const L6 = () => S.l6;
const tierOf = k => (S.l6 && S.l6.tier[k]) || 1;
const tierK = k => tierOf(k) >= 2 ? 1.25 : 1;
const svcOn = () => S.level >= 6;
const svcAt = k => Math.round(SVC_AT[k] * [1, 1, 1.25, 1.5][Math.min(3, S.up.schedule || 0)]);
const svcDue = k => svcOn() && (S.l6.cyc[k] || 0) >= svcAt(k);
// a machine stands still while it is refitted, swapped by the crane, or opened up for its service
const l6Run = k => !(S.l6 && S.l6.refit && S.l6.refit.k === k && S.l6.refit.st !== 'book') && !S.faults.some(f => FAULTS[f.kind].svc === k && f.workT && T - f.workT < .4);
function machCycle(k){ if (!S.l6) return; S.l6.cyc[k] = (S.l6.cyc[k] || 0) + 1; if (svcDue(k)) svcPost(k); }
function svcPost(k){
  if (S.faults.some(f => FAULTS[f.kind].svc === k)) return;
  S.faults.push({ id:++S.faultSeq, kind:SVC_KIND[k], where:k, diag:true, prog:0, by:null, supBy:null, t:0, diagT:0, contractor:false, booked:!!S.up.schedule });
  floatText('Service due', ...WHERE[k].mark, 'warn'); sfx('tap');
  if (!S.l6.svcTold) { S.l6.svcTold = true; toast(`Service due on the ${REFIT[k].name.toLowerCase()}: an amber tag hangs on its guard. It runs on, but three times as likely to fault. ${hasRole('mechanic') ? 'Book the mechanic in its card (Machines), or service it yourself in the amber ring (16 s).' : 'Service it yourself in the amber ring (16 s), or hire a mechanic.'}`, 'gold'); }
  save();
}
function bookService(k){ const f = S.faults.find(f => FAULTS[f.kind].svc === k); if (!f || f.booked) return; f.booked = true; sfx('tap'); toast(`${hasRole('mechanic') ? staffOf('mechanic')[0].st.name : 'The mechanic'} will service the ${REFIT[k].name.toLowerCase()} when free.`, 'good'); save(); renderOffice(); }
function svcDone(f, by){
  const k = FAULTS[f.kind].svc; S.faults = S.faults.filter(x => x !== f); S.l6.cyc[k] = 0; S.l6.svc = (S.l6.svc || 0) + 1;
  if (k === 'saw' || k === 'pipe' || k === 'tool') S.cond[k] = 100;
  (S.l6.book ||= []).unshift({ d:dateOf(calDay()).split(' ').slice(0, 3).join(' '), t:clockStr(), k, by:by === owner ? 'You' : by && by.st ? by.st.name : 'Mechanic', part:f.part !== false }); S.l6.book.length = Math.min(S.l6.book.length, 30);
  if (by && by.st && by.st.id > 0) giveXp(by.st, 15);
  sfx('fix'); floatText('Serviced', ...WHERE[k].mark, 'info'); toast(`The ${REFIT[k].name.toLowerCase()} is serviced${f.part === false ? ' (no spare part: made do)' : ''}. Healthy again, in the service book.`, 'good'); save(); checkCharter(); renderOffice();
}
const clockStr = () => { const m = Math.floor(dayMin()); return `${String(7 + Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
// the amber tag and the oil can on every machine that is due
function syncSvcTags(){
  if (!M.svcTags) M.svcTags = {};
  for (const k of Object.keys(REFIT)) { const want = svcDue(k) && REFIT[k].has(); let t = M.svcTags[k];
    if (want && !t) { const g = new THREE.Group(), [x, z] = REFIT[k].at(), m = WHERE[k] ? WHERE[k].mark : [x, 2, z];
      const tag = new THREE.Mesh(BX(.2, .26, .02), std('#e8ab2c', .5, 0, { emissive:'#a8670c', emissiveIntensity:.35 })); tag.position.set(0, -.35, 0); g.add(tag);
      const str = new THREE.Mesh(CY(.008, .3, 4), std('#2b2a24')); str.position.set(0, -.08, 0); g.add(str);
      const can = new THREE.Group(); const body = new THREE.Mesh(CY(.08, .16, 12), std('#b3261e', .5, .3)); body.position.y = .08; can.add(body); const spout = new THREE.Mesh(CY(.012, .2, 6), std('#7a7f83', .4, .6)); spout.position.set(.08, .18, 0); spout.rotation.z = -.9; can.add(spout);
      can.position.set(.55, -m[1] + .02, .45); g.add(can); g.position.set(m[0] + .3, Math.min(1.5, m[1] - .2), m[2] + .55); g.userData.dyn = true; world.add(g); t = M.svcTags[k] = g; }
    if (t) { t.visible = want; if (want) t.children[0].rotation.z = Math.sin(T * 2.3 + k.length) * .12; } }
}
// ---- tier 2 refits ---------------------------------------------------------------------------------------------------
function orderRefit(k){
  const R = REFIT[k]; if (S.level < 6 || tierOf(k) >= 2 || !R.has() || S.l6.refit || S.cash < R.price) return;
  S.cash -= R.price; ledger(`Tier 2 refit: ${R.name}`, -R.price, 'You');
  if (R.crane) { const m = dayMin(), at = m < 450 ? S.time + 50 : dayNo() * DAY_S + DAY_S + 70;   // the crane is hired from town: within the hour, or first thing tomorrow
    S.l6.refit = { k, st:'book', at }; toast(`Ordered: a tier 2 crate machine from the makers, and the mobile crane from Valley Plant Hire to swap it in. ${m < 450 ? 'The crane is on its way.' : 'The crane comes first thing tomorrow.'}`, 'gold'); }
  else { S.l6.refit = { k, st:'fit', t:0 }; startRefitFit(k); toast(`Paid. Big Tom's crew is refitting the ${R.name.toLowerCase()} to tier 2 (it stands for about ${REFIT_T} s).`, 'good'); }
  sfx('buy'); save(); renderOffice();
}
function startRefitFit(k){ const [x, z] = REFIT[k].at(), [fx, fz] = REFIT[k].fix();
  if (!M.refitScaffold) { M.refitScaffold = put(inst('l2_scaffold'), x, z, 0); M.refitScaffold.userData.dyn = true; }
  if (!M.refitBuilder) M.refitBuilder = makeBuilder([fx, fz], -97); }
function finishRefit(k, fx = true){
  S.l6.tier[k] = 2; if (k === 'saw') S.l6.tarp = 1; S.l6.cyc[k] = 0; S.l6.refits = Object.values(S.l6.tier).filter(t => t >= 2).length; if (S.l6.refit && S.l6.refit.k === k) S.l6.refit = null;
  const f = S.faults.find(f => FAULTS[f.kind].svc === k); if (f) S.faults = S.faults.filter(x => x !== f);
  if (M.refitScaffold) { M.refitScaffold.removeFromParent(); M.refitScaffold = null; }
  tierBadge(k);
  if (fx) { const [x, z] = REFIT[k].at(); for (let i = 0; i < 16; i++) spark(x + rand(-.8, .8), rand(.5, 1.6), z + rand(-.5, .5)); floatText('Tier 2: +25%', x, 2.2, z, 'info'); sfx('level', .5);
    toast(`The ${REFIT[k].name.toLowerCase()} is tier 2: 25% faster, with its own service schedule.`, 'gold'); save(); checkCharter(); renderOffice(); }
}
// what a tier 2 machine looks like: a new blue drive motor, a yellow guard rail and the maker's brass plate
function tierBadge(k, host = k === 'saw' ? M.saw : null){
  M.tier2 ||= {}; if (M.tier2[k] || !REFIT[k].has()) return; const [x, z] = REFIT[k].at(), g = new THREE.Group(); g.position.set(x, 0, z); g.userData.dyn = true;
  const plate = board(textTex([['TIER 2', 40, 30], ['VALLEY MACHINE CO. 1974', 15, 58, 500]], 256, 80, { bg:'#c9a24a', fg:'#2b2418', border:'#7a5a22', bw:5 }), .44, .14); plate.position.set(.1, .98, .62); g.add(plate);
  const motor = new THREE.Mesh(CY(.17, .42, 16), std('#2f5d8a', .45, .4)); motor.rotation.z = Math.PI / 2; motor.position.set(-.75, .42, -.28); motor.castShadow = true; g.add(motor);
  const fan = new THREE.Mesh(CY(.13, .05, 12), std('#22262b', .6, .3)); fan.rotation.z = Math.PI / 2; fan.position.set(-.99, .42, -.28); g.add(fan);
  for (const s of [-1, 1]) { const rail = new THREE.Mesh(BX(.9, .05, .05), std('#e8ab2c', .5, .2)); rail.position.set(.2, .78, s * .5); g.add(rail); }
  if (host) { host.add(g); g.position.set(0, 0, 0); g.scale.setScalar(1 / (host.scale.x || 1)); }
  else world.add(g);
  M.tier2[k] = g;
}
// ---- the mobile crane: in through the main gate, outriggers down, three lifts, out again -----------------------------
// It stands nose-north in the gateway (the lane canopy's roof is too low to drive under), its slewing ring just behind
// the cab. Lift 1: the old machine off its pad onto a clear patch beside it. Lift 2: the tier 2 machine off the deck
// onto the pad. Lift 3: grandad's machine onto the deck. Hail stops it; so does the whistle.
const CRANE_AT = [5.0, 10.8], CRANE_SET = [7.95, 10.05], SET_ROT = Math.PI / 2, /* grandad's machine waits end-on between the lamp post and the car */ FLAT_AT = [9.5, ROAD_Z + .9], FLAT_Y = 1.18;
// the crane comes in along the near lane and turns into the gateway, square between the open gate leaves (2.4 m clear)
const CRANE_IN = samplePath([{ p:[[-70, ROAD_Z - .9], [-2.0, ROAD_Z - .9]] }, { bez:true, p:[[-2.0, ROAD_Z - .9], [CRANE_AT[0], ROAD_Z - .9], [CRANE_AT[0], 12.6]] }, { p:[[CRANE_AT[0], 12.6], CRANE_AT] }]);
// out: it backs out of the gateway, its tail swinging west into the near lane, and drives off east (keep left)
const CRANE_OUT = samplePath([{ bez:true, rev:true, p:[CRANE_AT, [CRANE_AT[0], ROAD_Z - .9], [CRANE_AT[0] - 3.6, ROAD_Z - .9]] }, { p:[[CRANE_AT[0] - 3.6, ROAD_Z - .9], [80, ROAD_Z - .9]] }]);
// the makers' flatbed waits in the far lane of Mill Road with the new machine on its bed (the road is coned off)
const FLAT_IN = samplePath([{ p:[[80, ROAD_Z + .9], FLAT_AT] }]), FLAT_OUT = samplePath([{ p:[FLAT_AT, [-80, ROAD_Z + .9]] }]);
let crane = null;
function buildCrane(){
  const g = new THREE.Group(), yel = std('#e3a52a', .55, .2), dark = std('#2b2f33', .7, .3), steel = std('#7a8085', .45, .6), glass = std('#3d4f5c', .2, .5), red = std('#b3261e', .5, .2);
  const box = (w, h, d, m, x, y, z, p = g) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; p.add(b); return b; };
  box(6.4, .32, 1.1, dark, 0, .72, 0);                                                          // the chassis rails
  box(3.6, .14, 2.2, std('#5a5f63', .7, .3), -1.4, 1.02, 0);                                    // the deck: outrigger pads and slings
  for (const s of [-1, 1]) box(3.6, .2, .08, yel, -1.4, 1.14, s * 1.07);
  for (let i = 0; i < 3; i++) box(.5, .06, .5, std('#6b5a3a', .9), -2.6 + i * .6, 1.13, -.5);
  box(1.35, 1.55, 2.2, yel, 2.5, 1.58, 0); box(.05, .7, 1.9, glass, 3.19, 1.95, 0); for (const s of [-1, 1]) box(.8, .55, .04, glass, 2.55, 1.98, s * 1.11);   // the cab and its glass
  box(.08, .3, 2.2, dark, 3.2, .95, 0); for (const s of [-1, 1]) box(.06, .12, .2, std('#f4efe2', .3, 0, { emissive:'#ffe9a8', emissiveIntensity:.6 }), 3.23, 1.05, s * .85);
  for (const x of [2.35, -.5, -1.8]) for (const s of [-1, 1]) { const w = new THREE.Mesh(CY(.48, .34, 16), std('#1d1f22', .9)); w.rotation.x = Math.PI / 2; w.position.set(x, .48, s * .93); w.castShadow = true; g.add(w); }
  for (let i = 0; i < 5; i++) box(.04, .5, 2.2 / 5, std(i % 2 ? '#1d1f22' : '#e8ab2c', .6), -3.18, .9, -1.1 + 2.2 / 10 + i * 2.2 / 5);   // the striped tail board
  const outs = []; for (const x of [1.6, -2.8]) for (const s of [-1, 1]) { const o = new THREE.Group(); o.position.set(x, .55, s * .55); g.add(o); box(.22, .18, 1.0, yel, 0, 0, s * .5, o); const leg = box(.12, .5, .12, steel, 0, -.25, s * .95, o); const pad = box(.5, .05, .5, std('#6b5a3a', .9), 0, -.52, s * .95, o); outs.push({ o, s, leg, pad }); }
  const slew = new THREE.Group(); slew.position.set(.75, 1.25, 0); g.add(slew);
  box(1.1, .5, 1.6, yel, 0, .25, 0, slew); box(.6, .5, .6, red, -.45, .7, .5, slew);           // the turret and the operator's box
  const luff = new THREE.Group(); luff.position.set(.1, .75, 0); slew.add(luff);
  box(5.0, .42, .46, yel, 2.5, 0, 0, luff); const fly = box(5.4, .3, .32, std('#d9c25a', .5, .2), 2.8, 0, 0, luff);
  const ram = box(1.6, .14, .14, steel, .9, -.35, 0, luff); ram.rotation.z = .5;
  const tip = new THREE.Object3D(); luff.add(tip);
  const hook = new THREE.Group(); const hb = new THREE.Mesh(BX(.28, .34, .2), red); hb.castShadow = true; hook.add(hb); const hk = new THREE.Mesh(new THREE.TorusGeometry(.09, .025, 6, 12, Math.PI * 1.4), steel); hk.position.y = -.25; hook.add(hk); scene.add(hook);
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 2 * 6), 3)); const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color:'#1b1b1b' })); lines.frustumCulled = false; scene.add(lines);
  const beacon = box(.16, .12, .16, std('#ff9a1a', .3, 0, { emissive:'#ff7a00', emissiveIntensity:1.5 }), 2.5, 2.42, .7);
  world.add(g); g.userData.dyn = true; g.traverse(o => { if (o.isMesh) o.userData.noSnow = true; });
  return { g, outs, slew, luff, fly, tip, hook, lines, beacon, ext:0, ang:.18, yaw:Math.PI, hookY:2.6, out:0 };
}
function makeNewSaw(){ const m = A.saw_bench.scene.clone(true); m.scale.setScalar(SAW_S); m.userData.dyn = true; world.add(m); return m; }
const bedWorld = c => new THREE.Vector3(-1.1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.flat.rotation.y).add(c.flat.position);
function startCrane(){
  const R = S.l6.refit; if (!R || crane) return;
  crane = buildCrane(); const c = crane; c.st = 'flatIn'; c.d = 0; c.fd = 0; c.wait = 0; c.lift = 0; c.load = null; c.sway = 0;
  c.flat = A.truck.scene.getObjectByName('truck_flatbed').clone(true); c.flat.userData.dyn = true; c.flat.add(blob(5.2, 2.4)); world.add(c.flat); for (const n of ['wheel_fl', 'wheel_fr']) { const w = findNode(c.flat, n); if (w) w.rotation.order = 'YXZ'; }
  c.newSaw = makeNewSaw(); M.tier2 ||= {}; M.tier2.saw = null; tierBadge('saw', c.newSaw);
  const q = pathAt(CRANE_IN, 0); c.g.position.set(q.x, 0, q.z); c.g.rotation.y = q.yaw; c.g.visible = false; c.hook.visible = false; c.lines.visible = false;
  const f = pathAt(FLAT_IN, 0); c.flat.position.set(f.x, 0, f.z); c.flat.rotation.y = f.yaw; onBed(c, c.newSaw);
  toast('The makers\' flatbed pulls up in Mill Road with the tier 2 crate machine on its bed; the mobile crane from Valley Plant Hire is right behind.', 'gold'); sfx('horn', .4);
}
function onBed(c, m){ const p = bedWorld(c); m.position.set(p.x, FLAT_Y, p.z); m.rotation.y = c.flat.rotation.y; }
function craneTipWorld(c){ c.g.updateMatrixWorld(true); const v = new THREE.Vector3(); c.tip.getWorldPosition(v); return v; }
// boom geometry: aim the slew at a point, telescope and luff to put the tip over it at a height
function craneAim(c, x, z, h, dt, rate = 1){
  const t = new THREE.Vector3(); c.slew.getWorldPosition(t); const dx = x - t.x, dz = z - t.z, r = Math.max(2.4, Math.hypot(dx, dz)), want = Math.atan2(-dz, dx) - c.g.rotation.y;
  const dy = ((want - c.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; c.yaw += clamp(dy, -dt * .42 * rate, dt * .42 * rate);
  const L = Math.hypot(r - .1, h - 2.0), a = Math.atan2(h - 2.0, r - .1); c.ang += clamp(a - c.ang, -dt * .35 * rate, dt * .35 * rate);
  const e = clamp(L - 5.6, 0, 4.8); c.ext += clamp(e - c.ext, -dt * 1.1 * rate, dt * 1.1 * rate);
  return Math.abs(dy) < .004 && Math.abs(a - c.ang) < .006 && Math.abs(e - c.ext) < .02;
}
function craneHookTo(c, y, dt){ const s = clamp(y - c.hookY, -dt * .9, dt * .9); c.hookY += s; return Math.abs(y - c.hookY) < .01; }
function craneDraw(c){
  c.slew.rotation.y = c.yaw; c.luff.rotation.z = c.ang; c.fly.position.x = 2.8 + c.ext; c.tip.position.set(5.5 + c.ext, 0, 0);
  for (const o of c.outs) { o.o.children[0].position.z = o.s * (.5 + c.out * .6); o.leg.position.z = o.pad.position.z = o.s * (.95 + c.out * 1.1); o.leg.scale.y = .2 + c.out * .8; o.leg.position.y = -.25 * (.2 + c.out * .8); o.pad.visible = c.out > .9; }
  c.beacon.material.emissiveIntensity = (T % .8) < .4 ? 2 : .2;
  const tp = craneTipWorld(c), hx = tp.x + Math.sin(T * 1.7) * c.sway * .25, hz = tp.z + Math.cos(T * 1.3) * c.sway * .2; c.sway = Math.max(0, c.sway - .004);
  const hy = Math.min(c.hookY, tp.y - .4); c.hook.position.set(hx, hy, hz); c.hook.visible = c.out > 0;
  const a = c.lines.geometry.attributes.position.array; let i = 0; const seg = (p, q) => { a[i++] = p[0]; a[i++] = p[1]; a[i++] = p[2]; a[i++] = q[0]; a[i++] = q[1]; a[i++] = q[2]; };
  seg([tp.x, tp.y, tp.z], [hx, hy + .17, hz]);
  if (c.load) { const L = c.load, top = hy - .3; L.position.set(hx, top - 1.25, hz);
    for (const [dx, dz] of [[-1.4, -.5], [1.4, -.5], [-1.4, .4], [1.4, .4]]) { const v = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), L.rotation.y); seg([hx, hy - .25, hz], [hx + v.x, top - .32, hz + v.z]); } }
  while (i < a.length) a[i++] = 0; c.lines.geometry.attributes.position.needsUpdate = true; c.lines.visible = c.hook.visible;
}
let quake = 0;
function craneThud(x, z){ quake = .6; sfxAt('thunk', x, z, 1); sfx('clank', .6); for (let i = 0; i < 18; i++) sprite(pick(['#9a8f7f', '#b3a892', '#857a6a']), x + rand(-1.6, 1.6), .1, z + rand(-.6, .6), rand(-.8, .8), rand(.3, .9), rand(-.8, .8), 1.2, .18, -.4);
  floatText('Thud', x, 1.8, z, 'info'); }
const craneHail = () => wxK('hail') > .25;
function updateCrane(dt){
  const R = S.l6 && S.l6.refit;
  if (!crane) { if (!R || R.k !== 'saw') return; if (R.st === 'book' && S.time >= R.at && !(S.day && S.day.closing) && dayMin() < 470 && !cardOpen) { R.st = 'crane'; startCrane(); save(); } if (!crane) return; }
  const c = crane; quake = Math.max(0, quake - dt * 1.6);
  // hail stops the lift (and on its first lift at Level 6 the forecast hail arrives on cue)
  if (['lift1', 'lift2', 'lift3'].includes(c.st) && !S.l6.hailCue && S.level === 6) { S.l6.hailCue = true; c.cueAt = T + 9; }
  if (c.cueAt && T > c.cueAt) { c.cueAt = 0; wxForce = 'hail'; wxForceT = 50; }
  if (craneHail() && c.st.startsWith('lift')) { if (!c.hailTold) { c.hailTold = true; toast('Hail! The crane driver stops the lift and waits for it to pass.', 'bad'); } craneDraw(c); return; }
  if (c.hailTold && !craneHail()) { c.hailTold = false; toast('The hail has passed. The lift goes on.', ''); }
  if (c.st === 'flatIn') { c.fd = Math.min(FLAT_IN.len, c.fd + dt * (c.fd > FLAT_IN.len - 10 ? 2.2 : 6) * vehSnowK()); const f = pathAt(FLAT_IN, c.fd); c.flat.position.set(f.x, 0, f.z); c.flat.rotation.y = f.yaw; onBed(c, c.newSaw);
    if (c.fd >= FLAT_IN.len) { c.st = 'in'; c.g.visible = true; addCol([FLAT_AT[0] - 2.8, FLAT_AT[1] - 1.2, FLAT_AT[0] + 2.8, FLAT_AT[1] + 1.2], 'flatbed'); } }
  else if (c.st === 'in') { if (craneBlocked(c, 1)) { if (Math.random() < dt * .6) sfxAt('horn', c.g.position.x, c.g.position.z, .4); } else c.d = Math.min(CRANE_IN.len, c.d + dt * (c.d > CRANE_IN.len - 8 ? 1.6 : 4.5) * vehSnowK());
    const q = pathAt(CRANE_IN, c.d); c.g.position.set(q.x, 0, q.z); c.g.rotation.y = q.yaw;
    if (c.d >= CRANE_IN.len) { c.st = 'rig'; addCol([CRANE_AT[0] - 1.2, CRANE_AT[1] - 3.25, CRANE_AT[0] + 1.2, CRANE_AT[1] + 3.2], 'crane'); rebuildNav(); sfx('clank', .5);
      toast('The crane stands in the gateway, the road coned off. Outriggers down; the crate machine stops for the swap.', ''); } }
  else if (c.st === 'rig') { c.out = Math.min(1, c.out + dt * .5); if (c.out >= 1) { c.st = 'lift1'; c.lift = 0; } }
  else if (c.st.startsWith('lift')) craneLift(c, dt);
  else if (c.st === 'stow') { const done = craneAim(c, CRANE_AT[0], CRANE_AT[1] + 3.0, 2.3, dt, 1.4) && craneHookTo(c, 2.4, dt); if (done) { c.out = Math.max(0, c.out - dt * .5); if (c.out <= 0) { c.st = 'out'; c.d = 0; c.fd = 0; COL.delete('crane'); COL.delete('flatbed'); rebuildNav(); } } }
  else if (c.st === 'out') { if (craneBlocked(c, -1)) { if (Math.random() < dt * .6) sfxAt('horn', c.g.position.x, c.g.position.z, .4); } else c.d = Math.min(CRANE_OUT.len, c.d + dt * (c.d < 9 ? 1.4 : 5)); const q = pathAt(CRANE_OUT, c.d); c.g.position.set(q.x, 0, q.z); c.g.rotation.y = q.yaw;
    c.fd = Math.min(FLAT_OUT.len, c.fd + dt * (c.fd < 8 ? 2 : 6)); const f = pathAt(FLAT_OUT, c.fd); c.flat.position.set(f.x, 0, f.z); c.flat.rotation.y = f.yaw; if (c.old) onBed(c, c.old);
    if (c.d >= CRANE_OUT.len && c.fd >= FLAT_OUT.len) { craneGone(); return; } }
  craneDraw(c);
}
// the three lifts, each: aim over the load, hook down, sling it, up clear, swing, down, thud, unhook.
// 1: grandad's machine off its pad onto the clear patch inside the front fence; 2: the tier 2 machine off the flatbed onto
// the pad; 3: grandad's machine onto the flatbed, which takes it round to the back gate
function craneLift(c, dt){
  const n = +c.st.slice(4), bed = bedWorld(c), src = n === 1 ? P.saw : n === 2 ? [bed.x, bed.z] : CRANE_SET, dst = n === 1 ? CRANE_SET : n === 2 ? P.saw : [bed.x, bed.z];
  const [sx, sz] = src, [dx, dz] = dst, baseY = n === 2 ? FLAT_Y : 0, endY = n === 3 ? FLAT_Y : 0, clearY = 4.8;
  if (c.lift === 0) { if (craneAim(c, sx, sz, 6.2, dt)) c.lift = 1; }
  else if (c.lift === 1) { if (craneHookTo(c, baseY + 1.55, dt)) { c.lift = 2; c.wait = 1.4; sfx('clank', .4); } }
  else if (c.lift === 2) { c.wait -= dt; if (c.wait <= 0) { c.load = n === 2 ? c.newSaw : n === 1 ? M.saw : c.old; c.lift = 3; if (n === 1) toast('Chains on grandad\'s crate machine. The chains tighten, and it comes up off its pad after fifty years.', 'gold'); } }
  else if (c.lift === 3) { if (craneHookTo(c, clearY + 1.55, dt)) { c.lift = 4; c.sway = 1; } }
  else if (c.lift === 4) { if (craneAim(c, dx, dz, 7.0, dt, .8)) c.lift = 5; }
  else if (c.lift === 5) { if (craneHookTo(c, endY + 1.55, dt * .8)) { c.lift = 6; c.wait = 1.2; craneThud(dx, dz); c.sway = 0;
      c.load.position.set(dx, endY, dz); c.load.rotation.y = n === 3 ? c.flat.rotation.y : n === 1 ? SET_ROT : 0;   // set down square on its spot
      if (n === 1) { c.old = c.load; addCol([CRANE_SET[0] - 1.1, CRANE_SET[1] - 2.3, CRANE_SET[0] + 1.1, CRANE_SET[1] + 2.25], 'craneSet'); rebuildNav(); }
      if (n === 2) { M.sawOld = M.saw; M.saw = c.newSaw; toast('Down on the pad with a thud that shakes the pallet beside it. The tier 2 crate machine is in.', 'gold'); }
      if (n === 3) { COL.delete('craneSet'); rebuildNav(); } c.load = null; } }
  else if (c.lift === 6) { c.wait -= dt; if (c.wait <= 0 && craneHookTo(c, clearY, dt)) { c.lift = 0; c.st = n === 3 ? 'stow' : 'lift' + (n + 1); if (n === 2) finishRefit('saw', true); } }
  if (c.load && c.lift >= 3 && c.lift <= 5) { const want = n === 3 ? c.flat.rotation.y : n === 1 ? SET_ROT : 0, d = ((want - c.load.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; c.load.rotation.y += clamp(d, -dt * .5, dt * .5) + Math.sin(T * .9) * .002 * c.sway; }
}
// anyone in front of the crane (or behind it, reversing) stops it: it never drives into people
function craneBlocked(c, dir){ const f = new THREE.Vector3(dir * 4.2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.g.rotation.y).add(c.g.position);
  for (const o of [owner, ...staffObj.values(), ...folk.values()]) if (o && o.o.visible && Math.hypot(o.o.position.x - f.x, o.o.position.z - f.z) < 1.9) return true; return false; }
function craneGone(){ const c = crane; if (!c) return; for (const o of [c.g, c.hook, c.lines, c.flat, c.old]) if (o) o.removeFromParent(); crane = null; M.sawOld = null; COL.delete('crane'); COL.delete('flatbed'); COL.delete('craneSet'); rebuildNav();
  if (S.l6.refit && S.l6.refit.k === 'saw') S.l6.refit = null; buildTarp(); toast('The flatbed takes grandad\'s machine round to the back gate; the crew roll it into the corner by the warehouse and sheet it over. Kept, never scrapped.', ''); save(); }
// grandad's crate machine under its tarpaulin in the back corner: kept, never scrapped
const TARP = [22.9, -10.75];   // the yard's back-right corner, beside the warehouse (the plan's spot is inside the shed's racking)
function buildTarp(){
  if (M.tarp6 || !S.l6 || !S.l6.tarp) return; const g = new THREE.Group(); g.position.set(TARP[0], 0, TARP[1]); g.userData.dyn = true;
  const t = tex(128, 128, (c, w, h) => { c.fillStyle = '#4f5d3a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${30 + Math.random() * 30},${40 + Math.random() * 30},20,.35)`; c.fillRect(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 3); } });
  const geo = new THREE.BoxGeometry(1.7, 1.15, 1.25, 6, 3, 4), pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > 0) { pos.setX(i, pos.getX(i) * .93); pos.setZ(i, pos.getZ(i) * .9); pos.setY(i, y + Math.sin(pos.getX(i) * 5) * .03); } }
  geo.computeVertexNormals(); const cl = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map:t, roughness:.95 })); cl.position.y = .6; cl.castShadow = true; cl.receiveShadow = true; g.add(cl);
  for (const x of [-.55, .55]) { const r = new THREE.Mesh(BX(.03, 1.2, 1.3), std('#c9b28a', .9)); r.position.set(x, .6, 0); g.add(r); }
  const lab = board(textTex([['GRANDAD\'S', 26, 26], ['1921', 22, 54, 500]], 128, 72, { bg:'#ece6d9', fg:'#2b2a24', border:'#55613a', bw:4 }), .36, .2); lab.position.set(.2, .7, .66); g.add(lab);
  if (M.plotSign) M.plotSign.visible = false; world.add(g); M.tarp6 = g; addCol([TARP[0] - .9, TARP[1] - .7, TARP[0] + .9, TARP[1] + .7], 'tarp6'); rebuildNav();
}
// ---- the contractor refits (in place) --------------------------------------------------------------------------------
function updateRefits(dt){
  const R = S.l6 && S.l6.refit; if (!R || R.k === 'saw') return;
  if (R.st === 'fit') { if (!M.refitBuilder) startRefitFit(R.k); R.t ??= 0; runBuilder('refitBuilder', REFIT[R.k].at(), R, 't', REFIT_T, () => finishRefit(R.k, true), dt); }
}
// ---- June Finch at the clerk's window --------------------------------------------------------------------------------
// the clerk's kiosk: a glazed timber box against the office front, east of the porch; its door on the east side
const BOOTH = [1.95, 24.7, 3.85, 25.95], P_JUNE = [2.9, 25.3], P_BOOTHDOOR = [4.4, 25.45];
function buildBooth(){
  if (M.booth) return; const [x0, z0, x1, z1] = BOOTH, g = new THREE.Group(); g.userData.dyn = true;
  const wood = std('#55613a', .75), cream = std('#ece2c6', .7), glass = new THREE.MeshStandardMaterial({ color:'#c9dde6', roughness:.05, metalness:.1, transparent:true, opacity:.22, depthWrite:false });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.castShadow = m !== glass; b.receiveShadow = true; g.add(b); return b; };
  const cx = (x0 + x1) / 2, w = x1 - x0, d = z1 - z0;
  box(w, .9, .08, wood, cx, .45, z1 - .04); box(.08, .9, d, wood, x0 + .04, .45, (z0 + z1) / 2); box(.08, .9, .35, wood, x1 - .04, .45, z0 + .17);   // the panelled base, door gap on the east
  box(w + .1, .07, .45, cream, cx, .94, z1 - .1);                                                                   // the counter ledge
  box(w - .1, 1.2, .03, glass, cx, 1.6, z1 - .04); box(.03, 1.2, d - .1, glass, x0 + .04, 1.6, (z0 + z1) / 2);
  for (const x of [x0 + .04, cx, x1 - .04]) box(.06, 1.3, .06, cream, x, 1.6, z1 - .04); box(w, .06, .06, cream, cx, 2.24, z1 - .04); box(.06, 1.3, .06, cream, x0 + .04, 1.6, z0 + .1);
  const rf = box(w + .2, .05, .5, std('#55613a', .7, .1), cx, 2.32, z1 + .1); rf.rotation.x = .18;   // a narrow canopy over the counter only: from the yard's camera you see June at her desk
  const sign = board(textTex([['CLERK', 40, 32], ['WAGES · ACCOUNTS', 18, 62, 500]], 256, 80, { bg:'#2f3a22', fg:'#ece2c6', border:'#c9a24a', bw:5 }), 1.0, .3); sign.position.set(cx, 2.45, z1 + .08); g.add(sign);
  // the trophy cabinet against the office wall, its cups catching the light (Friday)
  const cab = new THREE.Group(); cab.position.set(x0 + .3, 0, z0 + .2); g.add(cab); M.trophy = cab; cab.visible = !!(S.l6 && S.l6.trophy);
  const cb = new THREE.Mesh(BX(.42, 1.7, .32), wood); cb.position.y = .85; cab.add(cb); const cg = new THREE.Mesh(BX(.36, 1.4, .02), glass); cg.position.set(0, 1.0, .17); cab.add(cg);
  const gold = std('#d9b245', .25, .85); for (let i = 0; i < Math.max(1, (S.level || 6) - 1); i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.05, .03, .1, 10), gold); cup.position.set(-.1 + (i % 3) * .1, .5 + Math.floor(i / 3) * .4, .05); cab.add(cup); const st = new THREE.Mesh(CY(.03, .03, 8), gold); st.position.set(cup.position.x, cup.position.y - .07, .05); cab.add(st); }
  world.add(g); M.booth = g;
  addCol([x0 - .05, z0 + .1, x0 + .1, z1 + .05], 'boothW'); addCol([x0 - .05, z1 - .1, x1 + .05, z1 + .05], 'boothS'); addCol([x1 - .1, z0 + .1, x1 + .05, z0 + .4], 'boothE'); rebuildNav();
}
const clerkChar = () => [...staffObj.values()].find(c => c.st.role === 'clerk') || null;
const clerkOn = () => !!clerkChar() && S.level >= 6;
const clerkAtHatch = () => { const c = clerkChar(); return !!c && c.state === 'hatch' && near(c.o, PAY_AT, .7); };
function ledger(what, amt, by){ if (!S.l6) return; (S.l6.ledger ||= []).unshift({ d:dateOf(calDay()).split(' ').slice(0, 3).join(' '), t:clockStr(), what, amt, by }); S.l6.ledger.length = Math.min(S.l6.ledger.length, 40); }
function updateClerk(c, dt){
  if (c.st.posted === false) c.st.posted = true;
  const home = () => { c.path = [[P_BOOTHDOOR[0] - .55, P_BOOTHDOOR[1]], [P_JUNE[0] + .3, P_JUNE[1] + .1], P_JUNE]; c.state = 'enter'; };
  const out = next => { if (near(c.o, P_JUNE, .8) || c.state === 'desk') { c.path = [[P_JUNE[0] + .5, P_JUNE[1] + .1], [P_BOOTHDOOR[0] - .55, P_BOOTHDOOR[1]], P_BOOTHDOOR]; c.state = 'exit'; c.next = next; } else { c.next = null; next(); } };
  if (c.state === 'arrive' || c.state === 'idle' || !c.state) { buildBooth(); goTo(c, ...P_BOOTHDOOR); c.state = 'toBooth'; }
  if (c.state === 'toBooth') { if (walk(c, dt)) home(); return; }
  if (c.state === 'enter') { if (walk(c, dt)) { c.state = 'desk'; c.faceNow(0); } return; }
  if (c.state === 'exit') { if (walk(c, dt)) { const n = c.next; c.next = null; if (n) n(); else home(); } return; }
  if (c.state === 'desk') { c.play((T + c.st.id) % 9 < 3 ? 'work' : 'idle', .5); c.faceNow(0);
    // Friday 16:30: she opens the wages hatch on the workshop front and hands out the packets
    const pd = payDay(); if (isFriday() && S.restored.hatch && dayMin() >= PAY_MIN - 6 && !(S.day && S.day.closing) && !(pd && payNeeded().every(st => pd.paid[st.id] || st.id === c.st.id))) { out(() => { goTo(c, ...PAY_AT); c.state = 'toHatch'; }); return; }   // she sets off a few minutes early, to be at the hatch when it opens
    // the dock takings: she walks over for them when there is a fair sum, or before the whistle
    if (S.cashPile >= (S.up.ledger >= 3 ? 200 : 400) || (S.cashPile > 0 && dayMin() > 505)) { if (!(S.day && S.day.closing)) out(() => { goTo(c, ...P.cash); c.state = 'toCash'; }); }
    return; }
  if (c.state === 'toHatch') { if (walk(c, dt)) { c.state = 'hatch'; c.faceNow(0); if (!S.l6.hatchTold) { S.l6.hatchTold = true; toast('June Finch opens the wages hatch and hands out the packets. Every one goes in her ledger.', 'gold'); } } return; }
  if (c.state === 'hatch') { c.o.position.set(PAY_AT[0], 0, PAY_AT[1]); const pd = payDay(); if (!(S.day && S.day.closing) && dayMin() < PAY_MIN + 1 && !pd) { c.play('idle'); c.faceNow(0); return; }
    if (!pd || !payTime() || payNeeded().every(st => pd.paid[st.id] || st.id === c.st.id || st.role === 'forklift')) { if (pd && !pd.paid[c.st.id]) { pd.paid[c.st.id] = true; payPacket(c.st); }
      if (pd && !pd.ledgered) { pd.ledgered = true; ledger(`Pay packets (${Object.keys(pd.paid).length})`, -(S.l5.wagesPaid || 0), 'June Finch'); } goTo(c, ...P_BOOTHDOOR); c.state = 'toBooth'; } else c.play('idle'); return; }
  if (c.state === 'toCash') { if (walk(c, dt)) { const amt = S.cashPile; if (amt > 0) { S.cashPile = 0; S.cash += amt; S.earned += amt; syncPile(); ledger('Dock takings collected', amt, 'June Finch'); floatText(`+${fmt(amt)}`, c.o.position.x, 1.9, c.o.position.z, 'info'); sfx('coin'); c.say = { text:pick(['Into the ledger it goes.', 'Counted twice, boss.', 'Takings to the office.']), until:T + 2.2 }; checkCharter(); }
      goTo(c, ...P_BOOTHDOOR); c.state = 'toBooth'; } return; }
  if (c.path) walk(c, dt); else c.state = 'idle';
}
// Friday after the whistle: June pays the accounts if the cash covers them, or holds them and says so (never silently)
function juneSettle(acc){
  if (!clerkOn() || !acc || acc.paid) return; const short = acc.total - S.cash;
  if (short <= 0) { payAccounts(); acc.by = 'June Finch'; ledger('The week\'s accounts', -acc.total, 'June Finch'); acc.june = `June Finch paid them from the cash at 17:00 and entered every line in her ledger.`; }
  else { acc.held = true; acc.june = `June Finch held the accounts: ${fmt(short)} short. Pay them in the office (Finance) when the cash comes in, or borrow from Eldon.`; ledger(`Accounts held: ${fmt(short)} short`, 0, 'June Finch'); toast(`June Finch held the week's accounts: the cash is ${fmt(short)} short. She will not pay what the works cannot cover.`, 'bad'); }
}
// Thursday with the ledger alerts: she warns a day ahead if Friday's bill will be more than the cash
function juneAlerts(){
  if (!clerkOn() || !S.up.ledger || !S.l5 || S.l6.alertDay === dayNo() || dayMin() < 420) return; const wd = calDay() % 5;
  if (wd !== 3) { if (S.up.ledger >= 2 && S.cash < weekAccounts().total + weekAccounts().wages * .5) { S.l6.alertDay = dayNo(); toast(`June Finch's ledger alert: the cash (${fmt(S.cash)}) is running below what Friday will need.`, 'bad'); } return; }
  S.l6.alertDay = dayNo(); const a = weekAccounts(), need = a.total + a.wages; if (need > S.cash) toast(`June Finch's ledger alert: Friday's packets and accounts come to about ${fmt(need)}; the cash is ${fmt(S.cash)}.`, 'bad'); else toast(`June Finch's ledger: Friday is covered (${fmt(need)} of ${fmt(S.cash)}).`, 'good');
}
// ---- the factory inspector (Thursday) --------------------------------------------------------------------------------
const INSPECT6 = [
  { id:'guards', text:'Machine guards on; nothing broken', fix:'Clear every open jam and worn part', at:() => [P.sawFix[0] - .3, P.sawFix[1] + .4], ok:() => !S.faults.some(f => realFault(f) && FAULTS[f.kind].trade === 'mechanic') },
  { id:'lanes', text:'Lanes and gangways clear', fix:'No pallet or rack overflowing onto the lanes', at:() => [6.2, 4.6], ok:() => !(S.pallet >= palletCap() && whReady() && S.wh.c < whCapC()) && !(S.pipes >= pipeCap() && whReady() && S.wh.p < whCapP()) },   // a full pallet or rack the loaders could have cleared into the warehouse
  { id:'service', text:'Service book kept', fix:'No machine long overdue for its service', at:() => [P_BOOTHDOOR[0] + .4, P_BOOTHDOOR[1] + .3], ok:() => Object.keys(REFIT).filter(k => REFIT[k].has()).every(k => (S.l6.cyc[k] || 0) < svcAt(k) * 2) },   // long overdue: twice the interval
  { id:'wiring', text:'Wiring and switchboard sound', fix:'Wiring 50% or better; no open power fault', at:() => [P.boardSpot[0] + .5, P.boardSpot[1] + .4], ok:() => S.cond.wiring >= 50 && !S.faults.some(f => realFault(f) && FAULTS[f.kind].trade === 'electrician') },
];
let insp6 = null;
function updateInspector6(dt){
  const L = S.l6; if (!L || S.level < 6) return;
  if (L.insp === 0 && calDay() % 5 === 3 && dayMin() >= 180 && dayMin() < 420 && !cardOpen && !(S.day && S.day.closing)) { L.insp = 1; L.inspStep = 0; L.inspRes = {}; toast('The factory inspector, Mr Hollins, is at the gate with his clipboard: guards, lanes, the service book and the wiring.', 'gold'); }
  if (L.insp === 4 && dayMin() >= 120 && dayMin() < 420 && L.inspDay !== dayNo() && !cardOpen) { L.insp = 1; L.inspStep = 0; L.inspRes = {}; toast('Mr Hollins is back for his re-inspection.', ''); }
  if (L.insp !== 1) { if (insp6 && insp6.state === 'leave') { if (walk(insp6, dt)) { insp6.o.removeFromParent(); mixers.splice(mixers.indexOf(insp6.mixer), 1); insp6 = null; } else insp6.play('walk'); } return; }
  if (!insp6) { insp6 = makeChar('worker', ...P.frontOut, { parts:['clipboard', 'hat_cap', 'stache', 'hair_short'], cols:{ suit:'#3c4148', shirt:'#e8e2d4', skin:'#e0ac85', hair:'#8a8378', hat:'#3c4148', stache:'#8a8378' } });
    insp6.st = { id:-2100, name:'Mr Hollins', role:'inspector', lv:1, energy:100, focus:100 }; insp6.state = 'walk'; goTo(insp6, ...INSPECT6[L.inspStep].at()); }
  const c = insp6, chk = INSPECT6[L.inspStep];
  if (c.state === 'walk') { c.play('walk'); if (walk(c, dt)) { c.state = 'look'; c.wait = 3.2; } return; }
  if (c.state === 'look') { c.play('inspect'); c.wait -= dt; if (c.wait > 0) return; const ok = chk.ok(); L.inspRes[chk.id] = ok; floatText(ok ? `✓ ${chk.text}` : `✗ ${chk.text}`, c.o.position.x, 2.1, c.o.position.z, ok ? 'info' : 'warn'); sfx(ok ? 'tick' : 'tap');
    L.inspStep++; if (L.inspStep < INSPECT6.length) { c.state = 'walk'; goTo(c, ...INSPECT6[L.inspStep].at()); return; }
    const pass = INSPECT6.every(k => L.inspRes[k.id]); L.insp = pass ? 3 : 4; L.inspDay = dayNo(); if (pass) repChange(2); c.state = 'leave'; goTo(c, ...P.frontOut);
    story({ kind:'inspect6', pass, res:{ ...L.inspRes } }); save(); checkCharter(); }
}
function inspect6Html(c){ return `<div class="who"><img alt="" src="${portrait('hollins')}"><div><b>Mr Hollins</b><small>Factory inspector · the county's Factories Act office</small></div></div>
  <div class="say">${c.pass ? '"A well-kept works. Guards on, lanes clear, a service book I can read. I\'ll say so in my report."' : '"Not today, I\'m afraid. I\'ll be back tomorrow morning: put these right."'}</div>
  <div class="kv">${INSPECT6.map(k => `<span>${k.text}</span><span class="${c.res[k.id] ? 'ok' : 'badt'}">${c.res[k.id] ? 'Passed' : k.fix}</span>`).join('')}</div>
  ${c.pass ? '<div class="stamp">Passed · reputation +2</div>' : ''}<button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:44px">${c.pass ? 'Thank you, Mr Hollins' : 'We\'ll have it right'}</button>`; }
// ---- the works canteen, the lightning conductor ---------------------------------------------------------------------
const CANTEEN = [-12.0, 19.2, -6.0, 24.4];
function buildCanteen(){
  if (M.canteen) return; const [x0, z0, x1, z1] = CANTEEN, g = new THREE.Group(), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0; g.userData.dyn = true;
  const brick = std('#8a5a3e', .9), cream = std('#ece2c6', .8), roof = std('#6f747a', .75, .15), glass = new THREE.MeshStandardMaterial({ color:'#ffe0a0', emissive:'#ffc060', emissiveIntensity:.25, roughness:.3 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  box(W - .4, 2.9, D - .6, brick, cx, 1.45, cz); box(W, .12, D, roof, cx, 3.0, cz); box(W - .2, .25, .12, cream, cx, 3.12, z1 - .05); box(W - .2, .25, .12, cream, cx, 3.12, z0 + .05); box(W - .2, .5, .1, cream, cx, 2.55, z1 - .29);
  for (let i = 0; i < 4; i++) { const x = x0 + .9 + i * (W - 1.8) / 3; if (Math.abs(x - cx) < .6) continue; box(.9, .9, .05, glass, x, 1.5, z1 - .3); box(1.0, .08, .14, cream, x, 1.0, z1 - .26); }
  box(1.1, 2.1, .08, std('#2f5a3a', .7), cx, 1.05, z1 - .28); box(1.6, .1, .8, cream, cx, 2.3, z1 + .05);
  const ch = box(.5, 1.2, .5, brick, x0 + 1.0, 3.6, z0 + 1.0); M.canteenSmoke = [ch.position.x, 4.3, ch.position.z];
  const sign = board(textTex([['WORKS CANTEEN', 46, 40], ['HOT DINNERS 12 TILL HALF PAST', 18, 72, 500]], 512, 96, { bg:'#2f3a22', fg:'#ece2c6', border:'#c9a24a', bw:6 }), 3.6, .68); sign.position.set(cx, 2.56, z1 - .23); g.add(sign);
  for (const s of [-1, 1]) { const t = new THREE.Group(); t.position.set(cx + s * 2.1, 0, z1 + .9); g.add(t); const top = new THREE.Mesh(BX(1.2, .05, .6), std('#8a6a44', .8)); top.position.y = .74; t.add(top); for (const dx of [-.5, .5]) { const l = new THREE.Mesh(BX(.05, .74, .5), std('#3a3d41', .6)); l.position.set(dx, .37, 0); t.add(l); } }
  world.add(g); M.canteen = g; addCol([x0 + .15, z0 + .25, x1 - .15, z1 - .25], 'canteen'); for (const s of [-1, 1]) addCol([cx + s * 2.1 - .65, z1 + .55, cx + s * 2.1 + .65, z1 + 1.25], 'canteenT' + s); rebuildNav();
}
const canteenK = () => S.restored.canteen && dayMin() >= 330 ? 1.03 : 1;    // crew +3% for the afternoon
function buildConductor(){
  if (M.conductor) return; const g = new THREE.Group(), cu = std('#b8733a', .35, .85), x = P.workshop[0] - 4.6, z = P.workshop[1] - 3.15; g.userData.dyn = true;
  const rod = new THREE.Mesh(CY(.025, 1.3, 6), cu); rod.position.set(x, 9.3, z); g.add(rod); const tip = new THREE.Mesh(new THREE.ConeGeometry(.05, .14, 6), cu); tip.position.set(x, 10.0, z); g.add(tip);
  const strip = new THREE.Mesh(BX(.04, 8.7, .02), cu); strip.position.set(x + .46, 4.35, z - .02); g.add(strip); const earth = new THREE.Mesh(BX(.25, .05, .25), std('#3a3d41', .7)); earth.position.set(x + .46, .03, z - .1); g.add(earth);
  world.add(g); M.conductor = g;
}
// ---- hail (spring, Level 6+): white pellets bounce and settle for a minute; everyone outdoors shelters for 15 s ------
const HAIL_N = 700; let hailFx = null, hailVel = null;
function updateHail(dt){
  const k = wxK('hail'), W = S.wx ||= {};
  W.hailLying = clamp((W.hailLying || 0) + (k > .3 ? dt * k / 25 : -dt / 60), 0, .55);
  if (k > .3 && !W.hailNow) { W.hailNow = true; W.shelterUntil = T + 15; for (const c of staffObj.values()) if (!c.stack.length) c.say = { text:pick(['Hail! Get under cover!', 'Ow! Hailstones!', 'In the doorway, quick!']), until:T + 2.4 }; }
  if (k < .1) W.hailNow = false;
  if (k > .3 && Math.random() < dt * 9) noiseS(.09, 3800 + Math.random() * 2400, .012 * k, 'highpass');   // the clatter on roofs and the car
  if (k > .02 && !hailFx) { const g = new THREE.BufferGeometry(), pos = new Float32Array(HAIL_N * 3); hailVel = new Float32Array(HAIL_N); for (let i = 0; i < HAIL_N; i++) { pos[i * 3] = camPos.x + rand(-14, 14); pos[i * 3 + 1] = rand(0, 10); pos[i * 3 + 2] = camPos.z + rand(-18, 10); hailVel[i] = -rand(7, 10); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); hailFx = new THREE.Points(g, new THREE.PointsMaterial({ map:TX.dot, color:'#f4f8fb', size:3, sizeAttenuation:false, transparent:true, opacity:0, depthWrite:false })); hailFx.frustumCulled = false; hailFx.renderOrder = 6; hailFx.userData.noSnow = true; scene.add(hailFx); }
  if (hailFx) { hailFx.visible = k > .02; hailFx.material.opacity = Math.min(.95, k * 1.2); if (hailFx.visible) { const a = hailFx.geometry.attributes.position.array;
    for (let i = 0; i < HAIL_N; i++) { hailVel[i] -= dt * 14; a[i * 3 + 1] += hailVel[i] * dt; if (a[i * 3 + 1] < 0) { if (hailVel[i] < -3) { a[i * 3 + 1] = 0; hailVel[i] = -hailVel[i] * .28; } else { a[i * 3] = camPos.x + rand(-14, 14); a[i * 3 + 1] = rand(8, 11); a[i * 3 + 2] = camPos.z + rand(-18, 10); hailVel[i] = -rand(7, 10); } } }
    hailFx.geometry.attributes.position.needsUpdate = true; } }
}
const hailShelter = () => !!(S.wx && S.wx.shelterUntil && T < S.wx.shelterUntil && wxK('hail') > .2);
// ---- Level 6 build, the day's events and the per-frame update -------------------------------------------------------
function buildLevel6(){
  if (M.l6Built) return; M.l6Built = true; buildBooth(); if (S.restored.canteen) buildCanteen(); if (S.restored.conductor) buildConductor(); if (!crane) buildTarp();
  for (const k of Object.keys(REFIT)) if (tierOf(k) >= 2) tierBadge(k);
  if (S.l6.refit && S.l6.refit.k !== 'saw' && S.l6.refit.st === 'fit') startRefitFit(S.l6.refit.k);
  if (S.l6.refit && S.l6.refit.k === 'saw' && S.l6.refit.st !== 'book') { S.l6.refit.st = 'book'; S.l6.refit.at = S.time + 5; delete S.l6.refit.phase; }   // a reload mid-lift: the crane comes back and starts again
}
function updateLevel6(dt){
  if (S.level < 6 || !M.l6Built) return;
  updateCrane(dt); updateRefits(dt); syncSvcTags(); updateInspector6(dt); juneAlerts(); updateHail(dt);
  if (M.canteen && M.canteenSmoke && lunchTime() && Math.random() < dt * 3) sprite('#e8e6e2', ...M.canteenSmoke, rand(-.1, .1), rand(.4, .7), rand(-.1, .1), 3, .35, -.02);
  // Friday: Gus calls in about his pension; the trophy cabinet goes up in the office
  if (isFriday() && !S.l6.gusPension && dayMin() > 120 && dayMin() < 300 && S.gus.retired && !cardOpen && !folk.has('gus')) { S.l6.gusPension = true; S.l6.pensionSay = true; S.gus.visitAt = S.time; }
  if (isFriday() && !S.l6.trophy && dayMin() > 60) { S.l6.trophy = true; if (M.trophy) M.trophy.visible = true; toast('The trophy cabinet is up in the clerk\'s window: a cup for every level the works has passed.', 'gold'); save(); }
}
// the Machines tab: tier 2 refits and the service book
function refitHtml(){
  if (S.level < 6) return ''; const R = S.l6.refit;
  let h = `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Tier 2 refits</b><small>+25% each · which three first is your choice · one job at a time</small></div><span class="cap">${S.l6.refits || 0} refitted</span></div>`;
  for (const [k, r] of Object.entries(REFIT)) { if (!r.has()) continue; const t2 = tierOf(k) >= 2, busy = R && R.k === k;
    h += `<div class="up"><span class="ic">${icon(k.startsWith('saw') ? 'saw' : 'gear')}</span><div><b>${r.name}</b><span class="note">${t2 ? 'Tier 2: 25% faster' : busy ? (r.crane ? (R.st === 'book' ? 'The crane is booked' : 'The crane is lifting') : 'Big Tom\'s crew is fitting it') : r.crane ? 'Swapped whole by a mobile crane; grandad\'s machine is kept' : 'Refitted in place by Big Tom\'s crew'}</span></div>
      ${t2 ? '<span class="note">Done</span>' : busy ? '<span class="note">Under way</span>' : `<button class="btn primary" data-refit="${k}" type="button" ${S.cash >= r.price && !R ? '' : 'disabled'}>${fmt(r.price)}</button>`}</div>`; }
  h += `</div><div class="dept"><div class="dept-h"><span class="ic">${icon('wrench')}</span><div><b>Service book</b><small>About 200 cycles between services · the mechanic 8 s, you 16 s, one spare part · ${S.up.schedule ? 'the mechanic books them himself' : 'book each one, or buy the service schedule (Upgrades)'}</small></div><span class="cap">${S.l6.svc || 0} services</span></div><div class="kv">`;
  for (const [k, r] of Object.entries(REFIT)) { if (!r.has()) continue; const n = S.l6.cyc[k] || 0, due = svcDue(k), f = S.faults.find(f => FAULTS[f.kind].svc === k);
    h += `<span>${r.name} ${bar(Math.min(100, n / svcAt(k) * 100), due ? 'low' : '')}</span><span class="${due ? 'badt' : 'ok'}">${due ? (f && (f.booked || S.up.schedule) ? 'Service booked' : `Service due · <button class="btn" data-book="${k}" type="button" ${hasRole('mechanic') ? '' : 'disabled'}>Book</button>`) : `Healthy · ${n}/${svcAt(k)}`}</span>`; }
  h += `</div>${(S.l6.book || []).length ? `<div class="kv">${S.l6.book.slice(0, 6).map(b => `<span>${b.d} ${b.t} · ${REFIT[b.k].name}</span><span>${b.by}${b.part ? '' : ' · no part'}</span>`).join('')}</div>` : ''}</div>`;
  return h;
}
function ledgerHtml(){
  if (S.level < 6) return ''; const L = (S.l6.ledger || []).slice(0, 14);
  return `<div class="dept"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>June Finch's ledger</b><small>${clerkOn() ? 'Every payment in and out, by whom: nothing paid silently' : 'Hire June as the clerk (Staff): she collects the takings and pays the bills'}</small></div></div>
    ${L.length ? `<div class="kv">${L.map(e => `<span>${e.d} ${e.t} · ${e.what}</span><span class="${e.amt < 0 ? 'badt' : e.amt > 0 ? 'ok' : ''}">${e.amt ? (e.amt > 0 ? '+' : '−') + fmt(Math.abs(e.amt)) : 'held'} · ${e.by}</span>`).join('')}</div>` : '<p class="note">Nothing in the ledger yet.</p>'}</div>`;
}

/* =====================================================================
   LEVEL 7: Major Manufacturer (Bible v2.0 section 8, Level 7; plans/level7_plan.png). Mon 7 - Fri 11 October 1974.
   The order board replaces the ringing phone: three cards pinned on the office block's front wall (four with the
   upgrade), each with client, goods, pay, deadline, an estimated profit (materials, wages and power, and it says it is
   an estimate), machine hours and whether it fits this week. Take one when its dock is free; the card comes off with the
   snap of a drawing pin and a fresh one is pinned a few seconds later. Hollis Reed brings bulk wholesale work: three of
   his delivered on time in a row and he is a regular (+20%). A second supervisor zone. Thursday, in a gale, Cyrus Bell
   the stationmaster pegs out a railway siding behind the North field; the application goes in and is approved the next
   day. Tommy Pryce joins as an operator. Autumn: leaves on the lanes (Bolt jumps in the piles), morning fog, the gale.
   ===================================================================== */
const BOARD_AT = [-2.65, 24.78], BOARD_RING = [-2.65, 26.05];
const HOLLIS = 'Hollis Reed Wholesale', boardN = () => 3 + (S.up.board4 ? 1 : 0), cardLife = () => (S.up.board4 >= 2 ? 1350 : 900), cardPayK = () => (S.up.board4 >= 3 ? 1.05 : 1);
const boardOn = () => S.level >= 7 && !!S.l7;
// what a card's goods cost to make: materials, the crew's wages for the machine hours, the power; an estimate
function cardCost(c){
  const mat = (c.qty || 0) * 10 + (c.pq || 0) * 16 + (c.tq || 0) * 11;
  const hrs = cardHours(c), wages = hrs * (WAGES.operator + WAGES.loader) / 50, power = hrs * 6 * POWER_WEEK / 50 / 10;
  return Math.round(mat + wages + power);
}
// machine hours: each product on its own machines at their real rates (tier 2, upgrades), one game minute a second
function cardHours(c){
  const crateM = (S.lv4.saw2 >= 2 ? 2 : 1), pipeM = (S.l5.mill2 >= 2 ? 2 : 1);
  const cs = (c.qty || 0) * SAW_CYCLE / ((1 + .2 * S.up.saw) * tierK('saw')) / crateM, ps = (c.pq || 0) * PIPE_CYCLE / ((1 + .2 * S.up.pipe) * tierK('pipe')) / pipeM, ts = (c.tq || 0) * TOOL_CYCLE / ((1 + .2 * S.up.press) * tierK('tool'));
  return Math.max(cs, ps, ts) / 60;
}
// minutes of work left before Friday's whistle
const weekLeft = () => (4 - calDay() % 5) * 600 + Math.max(0, SHIFT_MIN - dayMin());
function cardFits(c){ const need = cardHours(c) * 60 + 40, busy = (S.order ? cardHours(S.order) * 60 * .5 : 0); return need + busy < weekLeft() ? (need + busy < weekLeft() * .5 ? 'fits' : 'tight') : 'next'; }
function makeCard(kind){
  const L = S.l7; let c;
  if (kind === 'dock2' && S.l5.mill2 >= 2) c = dock2Spec();
  else if (kind === 'rep') { const ks = Object.keys(PLACES); c = placeSpec(pick(ks)); c.rep = true; }
  else { const sp = nextOrderSpec(), e = PG.econ(S.level), k = bandSize(), big = kind === 'hollis' ? (L.bigFri === 1 ? 3 : 1.8) : 1, sz = n => n ? Math.max(2, Math.round(n * e.qty * k * big)) : 0;
    const q = sz(sp.qty), pq = sz(sp.pq), tq = sz(sp.tq || 0), hk = kind === 'hollis' && L.hollis.regular ? 1.2 : 1;
    c = { qty:q, pq, tq, l4:!!sp.l4, pay:Math.round((q * CRATE_PRICE + pq * PIPE_PRICE + tq * TOOL_PRICE) * e.price * (0.9 + S.rep / 500) * bandPay() * hk), client:kind === 'hollis' ? HOLLIS : CLIENTS[(L.bseq + 3) % CLIENTS.length], deadline:Math.max(240, Math.round((60 + q * 10 + pq * 11 + tq * 9) * (kind === 'hollis' ? 1.1 : 1))) };
    if (kind === 'hollis') { c.hollis = true; if (L.bigFri === 1) { c.big = true; L.bigFri = 2; c.deadline = Math.max(c.deadline, 520); } } }
  if (!c) return null;
  c.board = true; c.cid = ++L.bseq; c.pinned = S.time; c.exp = S.time + cardLife(); c.pay = Math.round(c.pay * cardPayK()); c.dock = c.dock || 1; c.est = c.pay - cardCost(c); c.hrs = cardHours(c);
  return c;
}
// refill: keep the board full; dock 2's pipe work and Hollis's wholesale work each keep one place once they are on
function refillBoard(){
  const L = S.l7; if (L.board.length >= boardN()) return;
  const has = k => L.board.some(c => k === 'dock2' ? c.dock === 2 : k === 'hollis' ? c.hollis : false);
  let kind = 'std'; if (S.l5.mill2 >= 2 && !has('dock2')) kind = 'dock2'; else if (L.hollis.met && !has('hollis')) kind = 'hollis'; else if (S.up.salesrep && L.repDue) { kind = 'rep'; L.repDue = false; }
  const c = makeCard(kind); if (c) { L.board.push(c); pinSound(); boardTex(); }
}
function pinSound(){ tone(1600, .03, 'square', .02); noiseS(.04, 3000, .03, 'highpass'); }
function snapSound(){ tone(900, .02, 'square', .03); noiseS(.06, 2200, .05, 'bandpass'); }
const dockFree = c => c.dock === 2 ? !S.order2 && truckB.state === 'away' && !!M.dock2 : !S.order && truck.state === 'away';
function takeCard(cid){
  const L = S.l7, i = L.board.findIndex(c => c.cid === cid); if (i < 0) return; const c = L.board[i]; if (!dockFree(c) || S.call) return;
  L.board.splice(i, 1); snapSound(); L.refillAt = S.time + (S.up.board4 >= 2 ? 2 : 4); boardTex();
  S.call = c; acceptCall(); if (c.hollis) toast(`${HOLLIS}: bulk work for the wholesaler's warehouses.${L.hollis.regular ? ' A regular account now: 20% on top.' : ` ${L.hollis.streak} of 3 on time in a row so far.`}`, 'gold');
  save(); renderOffice();
}
// a delivery off the board: the count for the charter, and Hollis Reed's run of on-time orders
function l7Delivered(o, late){
  if (!boardOn() || !o || !o.board) return; const L = S.l7; L.bDone++;
  if (o.hollis) { if (late) { L.hollis.streak = 0; toast('Hollis Reed\'s order was late: his run of three starts again.', 'bad'); }
    else { L.hollis.streak++; if (L.hollis.streak >= 3 && !L.hollis.regular) { L.hollis.regular = true; repChange(2); sfx('level', .5); toast('Hollis Reed makes you a regular supplier: his work pays 20% more from now on.', 'gold'); for (const c of L.board) if (c.hollis) { c.pay = Math.round(c.pay * 1.2); c.est = c.pay - cardCost(c); } boardTex(); } } }
  checkCharter();
}
// the board on the wall: cork, a frame, the cards with a red drawing pin each; the texts are redrawn when it changes
function buildBoard(){
  if (M.board7) return; const g = new THREE.Group(); g.position.set(BOARD_AT[0], 0, BOARD_AT[1]); g.userData.dyn = true;
  const cork = new THREE.Mesh(BX(1.5, 1.05, .05), std('#a8784a', .95)); cork.position.y = 1.78; g.add(cork);
  const fr = std('#3a2a1c', .7); for (const [w, h, x, y] of [[1.6, .06, 0, 2.33], [1.6, .06, 0, 1.23], [.06, 1.1, -.78, 1.78], [.06, 1.1, .78, 1.78]]) { const b = new THREE.Mesh(BX(w, h, .07), fr); b.position.set(x, y, .01); g.add(b); }
  const head = board(textTex([['ORDERS', 34, 30]], 256, 44, { bg:'#2f3a22', fg:'#ece2c6', border:'#c9a24a', bw:3 }), .6, .1); head.position.set(0, 2.42, .05); g.add(head);
  M.boardCards = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.34, .44), new THREE.MeshBasicMaterial({ color:'#ffffff' })); m.position.set(-.54 + i * .36, 1.78 + (i % 2 ? -.03 : .03), .035); m.rotation.z = (i % 2 ? .04 : -.03); g.add(m);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), std('#c23b2a', .4)); pin.position.set(0, .18, .02); m.add(pin); M.boardCards.push(m); }
  world.add(g); M.board7 = g; M.ring('board7', ...BOARD_RING, '#e8ab2c', .55); boardTex();
}
function boardTex(){
  if (!M.boardCards || !S.l7) return; const B = S.l7.board;
  M.boardCards.forEach((m, i) => { const c = B[i]; m.visible = !!c; if (!c) return; if (m.userData.cid === c.cid && m.userData.pay === c.pay) return; m.userData.cid = c.cid; m.userData.pay = c.pay;
    const t = tex(136, 176, (g, w, h) => { g.fillStyle = c.hollis ? '#efe3c4' : c.dock === 2 ? '#dfe8ee' : '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2a24'; g.font = '700 15px Georgia'; g.fillText(c.client.slice(0, 15), 8, 26);
      g.font = '13px Georgia'; let y = 50; for (const [n, k] of [[c.qty, 'crates'], [c.pq, 'pipes'], [c.tq, 'tools']]) if (n) { g.fillText(`${n} ${k}`, 8, y); y += 18; }
      g.fillStyle = '#2f5a3a'; g.font = '700 18px Georgia'; g.fillText(fmt(c.pay), 8, 140); g.fillStyle = '#6b5d47'; g.font = '12px Georgia'; g.fillText(c.dock === 2 ? 'DOCK 2' : 'DOCK 1', 8, 164); });
    m.material.map = t; m.material.needsUpdate = true; });
}
function updateBoard(dt){
  if (!boardOn()) return; const L = S.l7; if (!M.board7) buildBoard();
  for (const c of [...L.board]) if (S.time > c.exp && L.board.length > 1) { L.board.splice(L.board.indexOf(c), 1); L.refillAt = Math.min(L.refillAt || 1e12, S.time + 3); boardTex(); }   // a card nobody took for a day and a half is withdrawn
  if (L.board.length < boardN() && S.time >= (L.refillAt || 0) && !(S.day && S.day.closing)) { L.refillAt = S.time + 2; refillBoard(); }
  // the sales representative: out on the road while the owner works, a fresh contact every eight minutes or so
  if (S.up.salesrep && !L.repDue) { L.repT = (L.repT || 0) + dt; if (L.repT > [480, 480, 360, 240][Math.min(3, S.up.salesrep)]) { L.repT = 0; L.repDue = true; if (L.board.length >= boardN()) { const old = L.board.filter(c => !c.hollis && c.dock !== 2).sort((a, b) => a.pinned - b.pinned)[0]; if (old) { L.board.splice(L.board.indexOf(old), 1); } } toast('Your sales representative phones in a new contact: a card for the board.', ''); } }
  // the ring in front of the board opens the orders
  if (near(owner.o, BOARD_RING, .6) && ownerStill() && !cardOpen && !officeOpen) { L.ringT = (L.ringT || 0) + dt; if (L.ringT > .5) { L.ringT = -3; openOffice('orders'); } } else if (L.ringT > 0) L.ringT = 0; else L.ringT = Math.min(0, (L.ringT || 0) + dt);
}
function boardHtml(){
  const L = S.l7; let h = `<div class="dept"><div class="dept-h"><span class="ic">${icon('clip')}</span><div><b>The order board</b><small>Pick the work: profit is an estimate (materials, wages, power) · ${L.bDone} delivered off the board</small></div><span class="cap">${L.board.length} pinned</span></div>`;
  for (const c of L.board) { const fit = cardFits(c), free = dockFree(c);
    h += `<div class="offer board-card${c.hollis ? ' hollis' : ''}"><b>${c.client}${c.hollis && L.hollis.regular ? ' · regular +20%' : ''}${c.big ? ' · the big one' : ''}${c.rep ? ' · rep\'s contact' : ''}${c.krane ? ` · Krane wants it: ${Math.max(0, Math.ceil(c.krane - S.time))} s` : ''}</b><button class="btn ${free ? 'primary' : ''}" data-card="${c.cid}" type="button" ${free && !S.call ? '' : 'disabled'}>${free ? 'Take' : `Dock ${c.dock} busy`}</button>
      <div class="kv"><span>Goods</span><span>${[c.qty ? `${c.qty} crates` : '', c.pq ? `${c.pq} pipes` : '', c.tq ? `${c.tq} tools` : ''].filter(Boolean).join(', ')} · dock ${c.dock}</span><span>Pays</span><span>${fmt(c.pay)}</span><span>Deadline</span><span>${Math.round(c.deadline / 60 * 10) / 10} h after you take it</span>
      <span>Estimated profit</span><span class="${c.est > 0 ? 'ok' : 'badt'}">${fmt(c.est)} (estimate)</span><span>Machine hours</span><span>${c.hrs.toFixed(1)} h</span><span>This week</span><span class="${fit === 'next' ? 'badt' : fit === 'tight' ? '' : 'ok'}">${fit === 'fits' ? 'Fits this week' : fit === 'tight' ? 'Tight: fits if the yard runs well' : 'Will not fit before Friday'}</span></div></div>`; }
  return h + '</div>';
}
// ---- Hollis Reed (Tuesday), Tommy Pryce (Monday), the big Friday order ----------------------------------------------
function updateL7People(){
  const L = S.l7, wd = calDay() % 5, m = dayMin();
  if (!L.tommy && m > 20 && !cardOpen) { L.tommy = true; story({ kind:'tommy' }); }
  if (L.tommyWait && S.staff.filter(s => s.role === 'operator').length < capOf('operator') && !cardOpen) hireTommy();
  if (!L.hollis.met && wd >= 1 && m > 90 && !cardOpen && !(S.day && S.day.closing)) { L.hollis.met = true; story({ kind:'person', id:'hollis' }); toast('Hollis Reed pins his bulk work on the order board himself.', 'gold');
    const old = L.board.filter(c => c.dock !== 2).sort((a, b) => a.pinned - b.pinned)[0]; if (old && L.board.length >= boardN()) L.board.splice(L.board.indexOf(old), 1); refillBoard(); }
  if (wd === 4 && !L.bigFri && m > 30 && L.hollis.met && !cardOpen) { L.bigFri = 1; const old = L.board.findIndex(c => c.hollis); if (old >= 0) L.board.splice(old, 1); refillBoard(); toast('Friday: Hollis Reed pins the big one on the board. It needs both supervisor zones running.', 'gold'); }
}
// one operator a machine: with every machine manned, Tommy starts the moment an operator's post opens (a promotion to the
// second supervisor's post, say)
function hireTommy(){ const n = S.staff.filter(s => s.role === 'operator').length; if (n >= capOf('operator')) { S.l7.tommyWait = true; toast('Every machine has its operator: Tommy Pryce starts the moment a post opens (promote an operator to supervisor, say).', ''); return; } S.l7.tommyWait = false; S.freeHires = (S.freeHires || 0) + 1; hire('operator'); }
// ---- the second supervisor zone -------------------------------------------------------------------------------------
const sups = () => staffOf('supervisor');
const postOf = c => c && (c.st.post || (c === supervisor() ? S.lv4.post : null));
const zonesLive = () => sups().filter(c => postOf(c) && !['break', 'toBreak', 'follow'].includes(c.state) && !c.need && dist2(c.o, postOf(c)) < zoneR() + 2.5).length;
// ---- the siding survey (Thursday, in a gale) -------------------------------------------------------------------------
const SURVEY_RING = [6.0, -20.2], PEGS = [[6.0, -22.2], [-2.0, -22.2], [-10.0, -22.2], [-18.0, -22.2], [-26.0, -22.2], [-34.0, -22.2]];
let cyrus = null;
function updateSiding(dt){
  const L = S.l7, wd = calDay() % 5;
  if (L.siding === 0 && wd >= 3 && dayMin() >= 150 && dayMin() < 420 && !cardOpen && !(S.day && S.day.closing)) { L.siding = 1; L.peg = 0;
    cyrus = makeChar('worker', 9.5, -22.4, { parts:['hat_cap', 'stache', 'clipboard', 'hair_short'], cols:{ suit:'#1f2a44', hat:'#1f2a44', shirt:'#e8e2d4', skin:'#c68c5f', hair:'#b8b2a6', stache:'#b8b2a6' } }); cyrus.st = { id:-2200, name:'Cyrus Bell', role:'folk', lv:1, energy:100, focus:100 }; cyrus.state = 'wait'; cyrus.faceNow(Math.PI);
    M.ring('survey', ...SURVEY_RING, '#e8ab2c', .6); toast('Cyrus Bell, the stationmaster, is at the North field\'s back fence to walk the siding with you. Meet him there (the gate in the back fence).', 'gold'); }
  if (L.siding === 1) { if (!cyrus) { cyrus = makeChar('worker', 9.5, -22.4, { parts:['hat_cap', 'stache', 'clipboard', 'hair_short'], cols:{ suit:'#1f2a44', hat:'#1f2a44', shirt:'#e8e2d4', skin:'#c68c5f', hair:'#b8b2a6', stache:'#b8b2a6' } }); cyrus.st = { id:-2200, name:'Cyrus Bell', role:'folk', lv:1, energy:100, focus:100 }; cyrus.state = 'wait'; M.ring('survey', ...SURVEY_RING, '#e8ab2c', .6); }
    const c = cyrus;
    if (c.state === 'wait') { c.play('idle'); c.faceTo([owner.o.position.x, owner.o.position.z], dt); if (near(owner.o, SURVEY_RING, .7) && ownerStill()) { c.state = 'walk'; c.path = [PEGS[0]]; if (M.rings.survey) M.rings.survey.g.visible = false; meet('cyrus'); toast('Cyrus Bell walks the line behind the back fence, hammering in a peg every few yards. You walk it with him along the fence.', ''); } return; }
    if (c.state === 'walk') { c.play('walk'); if (walk(c, dt * .8)) { c.state = 'peg'; c.wait = 1.6; } return; }
    if (c.state === 'peg') { c.play('work'); c.wait -= dt; if (Math.random() < dt * 3) sfx('clank', .25); if (c.wait > 0) return; pegAt(PEGS[L.peg]); L.peg++;
      if (L.peg < PEGS.length) { c.state = 'walk'; c.path = [PEGS[L.peg]]; } else { L.siding = 2; L.sidingAt = dayNo() * DAY_S + DAY_S + 240; c.state = 'leave'; c.path = [[-46, -22.2]]; story({ kind:'siding', step:'applied' }); save(); checkCharter(); } } }
  if (cyrus && cyrus.state === 'leave') { cyrus.play('walk'); if (walk(cyrus, dt)) { cyrus.o.removeFromParent(); mixers.splice(mixers.indexOf(cyrus.mixer), 1); cyrus = null; } }
  if (L.siding === 2 && S.time >= L.sidingAt && !cardOpen && !(S.day && S.day.closing)) { L.siding = 3; repChange(2); story({ kind:'siding', step:'approved' }); save(); checkCharter(); }
}
function pegAt(p){ M.pegs ||= []; const g = new THREE.Group(); g.position.set(p[0], 0, p[1]); const st = new THREE.Mesh(BX(.05, .5, .05), std('#c9a26a', .8)); st.position.y = .25; g.add(st);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(.2, .12), new THREE.MeshStandardMaterial({ color:'#d9534f', side:THREE.DoubleSide })); fl.position.set(.1, .44, 0); g.add(fl); g.userData.flag = fl; g.userData.dyn = true; world.add(g); M.pegs.push(g); sfx('thunk', .4); }
function buildPegs(){ if (!S.l7 || !S.l7.peg || (M.pegs && M.pegs.length)) return; for (let i = 0; i < Math.min(S.l7.peg, PEGS.length); i++) pegAt(PEGS[i]); }
function sidingHtml(c){ return c.step === 'applied' ? `<div class="who"><img alt="" src="${portrait('cyrus')}"><div><b>Cyrus Bell</b><small>Stationmaster, Valley station</small></div></div>
  <div class="say">"Six pegs, and the wind nearly had my hat. A siding off the up line, in behind your North field, a buffer stop by your back gate."</div><div class="say" style="animation-delay:.45s">"The application goes to the Railway Board tonight. They'll answer tomorrow."</div><button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:44px">Thank you, Mr Bell</button>`
  : `<div class="note" style="letter-spacing:.14em;text-transform:uppercase;color:#6b5d47">By hand, from the Railway Board</div><h3 style="margin:6px 0">Siding approved</h3><p>Your application for a private siding at the Iron Valley works is approved. Construction is put in hand for the spring; Valley Belle trains will serve it.</p><div class="stamp">Approved · reputation +2</div><button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:44px">Splendid</button>`; }
// ---- the works clock tower on the office block ----------------------------------------------------------------------
function buildClockTower(){
  if (M.clockTower) return; const [ox, oz] = P.office, g = new THREE.Group(); g.position.set(ox, 6.3, oz + .4); g.userData.dyn = true;
  const brick = std('#7d4a33', .9), stone = std('#c9c0aa', .9), roof = std('#3f5a4a', .5, .4);
  const b = new THREE.Mesh(BX(1.5, 2.4, 1.5), brick); b.position.y = 1.2; b.castShadow = true; g.add(b); const cap = new THREE.Mesh(BX(1.7, .15, 1.7), stone); cap.position.y = 2.45; g.add(cap);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.4, 4), roof); sp.rotation.y = Math.PI / 4; sp.position.y = 3.2; sp.castShadow = true; g.add(sp);
  const vane = new THREE.Mesh(BX(.4, .05, .02), std('#c9a24a', .3, .8)); vane.position.y = 4.05; g.add(vane); M.clockVane = vane;
  const face = new THREE.Mesh(new THREE.CircleGeometry(.52, 32), std('#f2ecdc', .6)); face.position.set(0, 1.4, .77); g.add(face); const rim = new THREE.Mesh(new THREE.RingGeometry(.52, .58, 32), std('#c9a24a', .3, .8)); rim.position.set(0, 1.4, .771); g.add(rim);
  for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(BX(.03, .08, .01), std('#2b2a24')); const a = i / 12 * Math.PI * 2; t.position.set(Math.sin(a) * .44, 1.4 + Math.cos(a) * .44, .775); t.rotation.z = -a; g.add(t); }
  const hand = (len, w) => { const p = new THREE.Group(); p.position.set(0, 1.4, .78); const m = new THREE.Mesh(BX(w, len, .01), std('#1d1b17')); m.position.y = len / 2; p.add(m); g.add(p); return p; };
  M.clockH = hand(.26, .045); M.clockM = hand(.4, .03);
  world.add(g); M.clockTower = g;
}
function updateClock(){ if (!M.clockTower) return; const m = 7 * 60 + dayMin(); M.clockM.rotation.z = -(m % 60) / 60 * Math.PI * 2; M.clockH.rotation.z = -((m / 60) % 12) / 12 * Math.PI * 2; if (M.clockVane) M.clockVane.rotation.y = wx.kind === 'gale' ? Math.sin(T * 3) * .3 + 1.2 : Math.sin(T * .3) * .4; }
// ---- autumn: leaves blow across the lanes and gather in piles; Bolt jumps in them --------------------------------
const LEAF_PILES = [[-7.5, 9.6], [11.0, 4.4], [1.5, -10.8], [20.5, 10.4]];
let leafFx = null;
function updateLeaves(dt){
  const autumn = seasonOf() === 'autumn' && S.level >= 7, gale = wxK('gale');
  if (autumn && !M.leafPiles) { M.leafPiles = LEAF_PILES.map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); for (let i = 0; i < 26; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.14, .1), std(pick(['#b5562a', '#d4892e', '#8a4a22', '#c9a23a']), .9)); l.rotation.set(-Math.PI / 2 + rand(-.4, .4), 0, rand(0, 6)); const r = Math.sqrt(Math.random()) * .55; const a = rand(0, 6.3); l.position.set(Math.cos(a) * r, .02 + (.55 - r) * .25 * Math.random(), Math.sin(a) * r); g.add(l); } g.userData.dyn = true; world.add(g); return g; }); }
  if (!autumn) return;
  if (Math.random() < dt * (2 + gale * 14)) { const c = pick(['#b5562a', '#d4892e', '#8a4a22', '#c9a23a']); sprite(c, camPos.x + rand(-12, 8), rand(1.5, 4), camPos.z + rand(-12, 8), 1.2 + gale * 4, rand(-.4, -.1), rand(-.4, .4), 5, .1, -.15); }
  // Bolt and the leaf piles (Wednesday onward): a bound into the nearest pile, leaves everywhere
  if (typeof bolt === 'object' && bolt && bolt.o && Math.random() < dt * .02) { const b = bolt.o.position, p = LEAF_PILES.find(([x, z]) => Math.hypot(b.x - x, b.z - z) < 2.5); if (p) { for (let i = 0; i < 16; i++) sprite(pick(['#b5562a', '#d4892e', '#c9a23a']), p[0] + rand(-.3, .3), .2, p[1] + rand(-.3, .3), rand(-1.2, 1.2), rand(1, 2.4), rand(-1.2, 1.2), 1.6, .12, -2.2); if (!S.l7.boltLeaves) { S.l7.boltLeaves = true; toast('Bolt dives into the leaf pile. Leaves everywhere; the crew laugh.', ''); } } }
}
// ---- Level 7 build and update -----------------------------------------------------------------------------------
function buildLevel7(){ if (M.l7Built) return; M.l7Built = true; buildBoard(); if (S.restored.clock) buildClockTower(); buildPegs(); if (S.up.docklamps) buildDockLamps(); }
function updateLevel7(dt){
  if (S.level < 7 || !M.l7Built) return;
  updateBoard(dt); updateL7People(); updateSiding(dt); updateClock(); updateLeaves(dt);
  if (M.pegs && wxK('gale') > .3) for (const p of M.pegs) p.userData.flag.rotation.y = Math.sin(T * 9 + p.position.x) * .5;
}
// loading lamps on both docks (upgrade): the crew loads at full speed at dusk and in fog
function buildDockLamps(){ if (M.dockLamps) return; M.dockLamps = []; for (const [x, z] of [[P.dock[0] + 1.2, P.dock[1] - 2.6], ...(M.dock2 ? [[DK2[0] + 1.2, DK2[1] - 2.6]] : [])]) { const g = new THREE.Group(); g.position.set(x, 0, z); const p = new THREE.Mesh(CY(.05, 3.2, 8), std('#3a3d41', .6, .4)); p.position.y = 1.6; g.add(p);
  const h = new THREE.Mesh(BX(.3, .18, .3), std('#2b2f33', .5, .4)); h.position.set(-.15, 3.2, 0); g.add(h); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), std('#ffe9a8', .3, 0, { emissive:'#ffd27a', emissiveIntensity:1.6 })); bulb.position.set(-.15, 3.08, 0); g.add(bulb); g.userData.dyn = true; world.add(g); M.dockLamps.push(g); addCol([x - .1, z - .1, x + .1, z + .1], 'dlamp' + x.toFixed(0)); } rebuildNav(); }

/* =====================================================================
   LEVEL 8: Steel Works (Bible v2.0 section 8, Level 8; plans/level8_plan.png). Mon 7 - Fri 11 April 1975. The siding
   is laid behind the North field. Shunter No. 7 "Valley Belle" pushes wagons of scrap and ore in on the timetable; the
   owner signs for them at the back gate and each wagon is shunted over its bay and tipped (each bay's limit is painted
   on its wall: a wagon that cannot empty goes back part-full, an overflow). A belt conveyor charges the furnace; the
   heavy-duty supply (a second transformer on a fenced 11 kV plinth) feeds it. Two operators run it: a beam every 12 s
   slides out glowing onto the cooling bed and greys as it cools. The second forklift carries beams to the beam store
   (its pad chosen from three build zones), and every train takes the beams away. Joe Brennan, foreman. Victor Krane
   bids for the old dairy plot next door (a countdown on the sign). Dolores Marsh: the spot price, always on offer, and
   her fixed-price contract. Act II ends.
   ===================================================================== */
const SIDING_Z = -21.9, BUFFER_X = 2.0, TIP_Z = -19.2;
const BAYS = { scrap:[-12.0, -20.4, -7.2, -17.0], ore:[-6.8, -20.4, -2.0, -17.0] };
const FURN = [-25.0, -17.5, -15.5, -8.5], FURN_DOOR = [-20.2, -8.5], BED = [-22.2, -8.15, -18.2, -6.6], PLINTH = [-29.5, -15.0, -26.3, -11.0];
const BACK_GATE = [-13.9, -12.2], FORK_GATE = [-21.6, -18.6], SIGN_RING = [-9.6, -15.6];
const PADS8 = { A:[-9.0, -14.3], B:[-22.9, 0.5], C:[-31.0, -5.2] };   // the beam store's three build zones (C stands west of the furnace house, outside the field fences)
const FURN_OPS = [[-21.4, -9.3], [-19.0, -9.3]], BEAM_PRICE = () => Math.round(1150 * PG.econ(S.level).price), RAW_UNIT = () => S.l8.contract ? 44 - 4 * Math.min(3, S.up.fixedprice || 0) : 55, SPOT_UNIT = 82;
const rawCap = () => 40 + 20 * Math.min(3, S.up.rawstore || 0), bedCap = 12, storeCap8 = 80, FURN_T = 12, WAGONS = () => 4 + Math.min(3, S.up.sidingx || 0);
const furnK = () => 1 + .2 * (S.up.heat || 0);
const l8On = () => S.level >= 8 && !!S.l8;
const rawLeft = () => S.l8.scrap + S.l8.ore;
// the timetable: the train's minute after 07:00 each weekday (Friday's is late unless the spot price is paid)
const TIMETABLE = [60, 180, 90, 200, 60];
function ttToday(){ const wd = calDay() % 5; return TIMETABLE[wd] + (wd === 4 && S.level === 8 && !S.l8.spotFri ? 150 : 0); }
// ---- geometry ------------------------------------------------------------------------------------------------------
function openGap(x0, x1, z){   // a gateway in a fence line: its panels come down and its collision boxes are split round the gap
  for (const o of [...world.children]) { const n = o.name || (o.children[0] && o.children[0].name) || ''; if (!/fence/.test(n)) continue; if (Math.abs(o.position.z - z) < .35 && o.position.x > x0 - .3 && o.position.x < x1 + .3) o.visible = false; }
  for (const [k, b] of [...COL]) { if (b[1] > z + .35 || b[3] < z - .35 || b[3] - b[1] > .8 || b[0] >= x1 || b[2] <= x0) continue; COL.delete(k); if (b[0] < x0) addCol([b[0], b[1], x0, b[3]], k + 'L'); if (b[2] > x1) addCol([x1, b[1], b[2], b[3]], k + 'R'); }
  for (const x of [x0, x1]) { put(inst('env_gate_post'), x, z, 0).userData.dyn = true; addCol([x - .2, z - .2, x + .2, z + .2]); }
}
function buildLevel8(){
  if (M.l8Built) return; M.l8Built = true; const g = new THREE.Group(); g.userData.dyn = true; world.add(g); M.l8 = g;
  const box = (w, h, d, m, x, y, z, p = g) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; p.add(b); return b; };
  const conc = std('#a7a198', .95), brick = std('#6e3f2c', .9), steel = std('#5a5f63', .55, .5), dark = std('#2b2f33', .7, .3), rust = std('#7a4a2e', .85, .3);
  // the siding: from the main line's turnout in the west to a buffer stop by the back gate
  for (let x = -46; x < BUFFER_X; x += .7) box(.18, .1, 2.0, std('#4a3a2a', .9), x, .05, SIDING_Z);
  for (const dz of [-.72, .72]) box(BUFFER_X + 46, .12, .08, steel, (BUFFER_X - 46) / 2, .16, SIDING_Z + dz);
  for (let i = 0; i < 10; i++) { const t = i / 9, x = -52 + t * 6, z = RAIL_Z + (SIDING_Z - RAIL_Z) * (t * t * (3 - 2 * t)); box(.7, .12, .08, steel, x, .16, z - .72).rotation.y = -.25; box(.7, .12, .08, steel, x, .16, z + .72).rotation.y = -.25; }
  const buf = box(.5, .9, 2.0, std('#b3261e', .6), BUFFER_X + .3, .45, SIDING_Z); for (const dz of [-.6, .6]) { const p = box(.12, .12, .3, steel, BUFFER_X - .05, .7, SIDING_Z + dz); p.rotation.x = Math.PI / 2; }
  // the raw-store bays beside the siding, the limit painted on each back wall
  for (const [k, [x0, z0, x1, z1]] of Object.entries(BAYS)) { const cx = (x0 + x1) / 2; box(x1 - x0, .08, z1 - z0, conc, cx, .04, (z0 + z1) / 2); box(x1 - x0, 1.2, .25, conc, cx, .6, z1); for (const x of [x0, x1]) box(.25, 1.2, z1 - z0, conc, x, .6, (z0 + z1) / 2);
    const lab = board(textTex([[k === 'scrap' ? 'SCRAP' : 'ORE', 40, 34], [`LIMIT ${rawCap()} T`, 22, 66, 500]], 256, 84, { bg:'#2f3a22', fg:'#ece2c6', border:'#e8ab2c', bw:5 }), 1.4, .46); lab.position.set(cx, .85, z1 + .14); g.add(lab);
    const heap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1, 7), std(k === 'scrap' ? '#6b6f73' : '#7a3f2a', .95, k === 'scrap' ? .4 : 0)); heap.position.set(cx, 0, (z0 + z1) / 2 - .2); heap.scale.set(1, .01, .7); g.add(heap); M['heap_' + k] = heap;
    addCol([x0 - .12, z1 - .13, x1 + .12, z1 + .13], 'bay' + k + 'S'); addCol([x0 - .13, z0, x0 + .13, z1], 'bay' + k + 'W'); addCol([x1 - .13, z0, x1 + .13, z1], 'bay' + k + 'E'); }
  // the furnace house: brick, a tall stack, the charging conveyor in its east wall, the door to the cooling bed
  const [fx0, fz0, fx1, fz1] = FURN, fcx = (fx0 + fx1) / 2, fcz = (fz0 + fz1) / 2;
  box(fx1 - fx0, 5.2, fz1 - fz0, brick, fcx, 2.6, fcz); box(fx1 - fx0 + .3, .3, fz1 - fz0 + .3, dark, fcx, 5.35, fcz);
  const stack = new THREE.Mesh(CY(.6, 9, 16), brick); stack.position.set(fx0 + 1.6, 8.0, fz0 + 1.6); stack.castShadow = true; g.add(stack); M.stackTop = [fx0 + 1.6, 12.6, fz0 + 1.6];
  M.furnDoor = box(2.4, 2.6, .12, std('#3a3d41', .5, .5), FURN_DOOR[0], 1.3, fz1 + .07); M.furnGlow = box(2.2, 2.4, .05, new THREE.MeshBasicMaterial({ color:'#ff7a1a' }), FURN_DOOR[0], 1.25, fz1 + .02); M.furnGlow.visible = false;
  const sign = board(textTex([['FURNACE HOUSE', 40, 34], ['IRON VALLEY STEEL · 1975', 18, 66, 500]], 512, 84, { bg:'#2b2f33', fg:'#ece2c6', border:'#b3261e', bw:6 }), 3.0, .5); sign.position.set(fcx, 3.6, fz1 + .1); g.add(sign);
  addCol([fx0, fz0, fx1, fz1], 'furnace');
  // the belt conveyor from the bays up into the furnace house
  const cv = new THREE.Group(); g.add(cv); const ax = -12.6, az = -18.6, bx = fx1 + .1, bz = -14.0, L = Math.hypot(bx - ax, bz - az); cv.position.set((ax + bx) / 2, 0, (az + bz) / 2); cv.rotation.y = -Math.atan2(bz - az, bx - ax);
  const belt = new THREE.Mesh(BX(L, .12, .7), dark); belt.position.y = 1.6; belt.rotation.z = Math.atan2(3.0 - .5, L) * (ax > bx ? 1 : -1); cv.add(belt); for (let i = 0; i < 4; i++) { const leg = new THREE.Mesh(BX(.1, 1.2 + i * .5, .1), steel); leg.position.set(-L / 2 + .8 + i * (L - 1.6) / 3, (1.2 + i * .5) / 2, 0); cv.add(leg); }
  M.conveyor = cv;
  // the cooling bed outside the furnace door, the water spray rail over it
  const [bx0, bz0, bx1, bz1] = BED; box(bx1 - bx0, .35, bz1 - bz0, steel, (bx0 + bx1) / 2, .17, (bz0 + bz1) / 2); for (const x of [bx0 + .2, bx1 - .2]) box(.08, 1.6, .08, steel, x, .8, bz0 + .1); box(bx1 - bx0, .06, .06, steel, (bx0 + bx1) / 2, 1.6, bz0 + .1);
  addCol([bx0, bz0, bx1, bz1], 'coolbed');
  // the 11 kV plinth: a fenced concrete plinth for the second transformer (live from the heavy-duty supply)
  const [px0, pz0, px1, pz1] = PLINTH; box(px1 - px0, .3, pz1 - pz0, conc, (px0 + px1) / 2, .15, (pz0 + pz1) / 2); for (const [x, z, w, d] of [[(px0 + px1) / 2, pz0, px1 - px0, .05], [(px0 + px1) / 2, pz1, px1 - px0, .05], [px0, (pz0 + pz1) / 2, .05, pz1 - pz0], [px1, (pz0 + pz1) / 2, .05, pz1 - pz0]]) box(w, 1.8, d, std('#8a9095', .5, .6), x, .9, z);
  M.xfmr8 = box(1.6, 1.8, 1.2, std('#55613a', .6, .3), (px0 + px1) / 2, 1.2, (pz0 + pz1) / 2); M.xfmr8.visible = !!S.l8.hd; addCol([px0, pz0, px1, pz1], 'plinth');
  openGap(...BACK_GATE, SITE.z0); openGap(...FORK_GATE, -4);
  // trees standing where the works now is are felled (the furnace house, the bays, the plinth, the siding, the build zones)
  const clear = [FURN, PLINTH, BAYS.scrap, BAYS.ore, [-46, SIDING_Z - 1.6, BUFFER_X + 1, SIDING_Z + 1.4], [-13, -19, -14.8, -13.5], ...Object.values(PADS8).map(([x, z]) => [x - 2.2, z - 1.6, x + 2.2, z + 1.6]), [BED[0] - 1, BED[1] - 1, BED[2] + 1, -3.5]];
  for (const t of M.trees || []) { const { x, z } = t.position; if (clear.some(([a, b, c, d]) => x > Math.min(a, c) - 1.8 && x < Math.max(a, c) + 1.8 && z > Math.min(b, d) - 1.8 && z < Math.max(b, d) + 1.8)) t.visible = false; }
  M.beams = []; M.raw = []; syncHeaps(); buildTrain(); if (S.l8.pad) buildStore(true);
  M.ring('sign8', ...SIGN_RING, '#e8ab2c', .6); M.rings.sign8.g.visible = false;
  { const tb = new THREE.Group(); tb.position.set(-11.4, 0, -16.6); for (const dx of [-.55, .55]) { const p = new THREE.Mesh(BX(.08, 1.9, .08), steel); p.position.set(dx, .95, 0); tb.add(p); } const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .8), new THREE.MeshBasicMaterial({ color:'#ffffff' })); face.position.set(0, 1.55, .05); tb.add(face); g.add(tb); M.ttFace = face; ttBoard(); }   // v2.0 15.3: the timetable board at the siding
  rebuildNav();
}
function ttBoard(){ if (!M.ttFace) return; const wd = calDay() % 5, t = ttToday(), next = rail && rail.st !== 'away' ? 'IN THE SIDING' : S.l8.trainDay === dayNo() ? `TOMORROW ${hhmm(TIMETABLE[(wd + 1) % 5])}` : hhmm(t), k = `${next}|${WAGONS()}`; if (M.ttFace.userData.k === k) return; M.ttFace.userData.k = k;
  M.ttFace.material.map = textTex([['VALLEY BELLE', 28, 30], [`NEXT: ${next}`, 26, 66, 500], [`${WAGONS()} WAGONS · ${WAGONS() * 10} T SCRAP & ORE`, 18, 100, 500]], 320, 120, { bg:'#1d2a22', fg:'#ece2c6', border:'#e8ab2c', bw:5 }); M.ttFace.material.needsUpdate = true; }
function syncHeaps(){ for (const k of ['scrap', 'ore']) { const h = M['heap_' + k]; if (h) { const f = S.l8[k] / rawCap(); h.scale.y = Math.max(.01, f * 1.1); h.position.y = f * .55; h.visible = S.l8[k] > 0; } } }
// ---- the train ----------------------------------------------------------------------------------------------------
let rail = null;
function buildTrain(){
  const t = new THREE.Group(), green = std('#2f5a3a', .6, .3), black = std('#1d1f22', .7, .3), rust = std('#7a4a2e', .85, .25);
  const loco = new THREE.Group(); t.add(loco); const lb = new THREE.Mesh(BX(5.0, 1.6, 2.3), green); lb.position.y = 1.4; loco.add(lb); const cab = new THREE.Mesh(BX(1.8, 1.2, 2.3), green); cab.position.set(-1.4, 2.8, 0); loco.add(cab);
  const plate = board(textTex([['No. 7', 26, 28], ['VALLEY BELLE', 20, 56, 500]], 256, 72, { bg:'#c9a24a', fg:'#2b2418', border:'#7a5a22', bw:4 }), .9, .26); plate.position.set(.4, 1.5, 1.17); loco.add(plate);
  const fun = new THREE.Mesh(CY(.18, .8, 10), black); fun.position.set(1.6, 2.6, 0); loco.add(fun); M.trainFunnel = fun;
  for (const x of [-1.6, 0, 1.6]) for (const s of [-1, 1]) { const w = new THREE.Mesh(CY(.45, .2, 14), black); w.rotation.x = Math.PI / 2; w.position.set(x, .45, s * .75); loco.add(w); }
  const wag = []; for (let i = 0; i < 7; i++) { const w = new THREE.Group(); w.position.x = 5.0 + i * 4.6; t.add(w); const base = new THREE.Mesh(BX(4.2, .3, 2.2), black); base.position.y = .7; w.add(base);
    const body = new THREE.Group(); body.position.set(0, .85, .95); w.add(body); const tub = new THREE.Mesh(BX(4.0, 1.3, 2.1), rust); tub.position.set(0, .65, -.95); body.add(tub);
    const load = new THREE.Mesh(BX(3.8, .3, 1.9), std(i % 2 ? '#7a3f2a' : '#6b6f73', .95)); load.position.set(0, 1.25, -.95); body.add(load);
    const beams = new THREE.Mesh(BX(3.9, .3, 1.6), std('#8a8f94', .45, .6)); beams.position.set(0, 1.0, -.95); beams.visible = false; body.add(beams);
    for (const x of [-1.4, 1.4]) for (const s of [-1, 1]) { const wh = new THREE.Mesh(CY(.4, .18, 12), black); wh.rotation.x = Math.PI / 2; wh.position.set(x, .4, s * .75); w.add(wh); }
    wag.push({ g:w, body, load, beams, kind:i % 2 ? 'ore' : 'scrap', units:10 }); }
  t.position.set(-80, 0, RAIL_Z); t.userData.dyn = true; t.visible = false; world.add(t); t.traverse(o => { if (o.isMesh) o.userData.noSnow = true; });
  rail = { g:t, wag, st:'away', x:-80, z:RAIL_Z, tip:0, t:0 };
}
// the train's lead position: in from the west on the main line, across on the turnout, along the siding to a stop
function trainPlace(x){ const z = x < -52 ? RAIL_Z : x < -46 ? RAIL_Z + (SIDING_Z - RAIL_Z) * ((t => t * t * (3 - 2 * t))((x + 52) / 6)) : SIDING_Z; rail.g.position.set(x, 0, z); rail.x = x;
  for (const w of rail.wag) w.g.visible = rail.wag.indexOf(w) < WAGONS(); }
// wagon i (pushed ahead of the shunter, eastward) over its bay: the lead x that puts it there
const wagonX = i => 5.0 + i * 4.6, bayCx = k => (BAYS[k][0] + BAYS[k][2]) / 2;
function updateTrain(dt){
  const L = S.l8, tr = rail; if (!tr) return; const m = dayMin(), wd = calDay() % 5;
  if (tr.st === 'away') { if (L.trainDay !== dayNo() && m >= ttToday() && m < 470 && !(S.day && S.day.closing)) { L.trainDay = dayNo(); tr.st = 'in'; tr.g.visible = true; tr.wag.forEach((w, i) => { w.units = 10; w.load.visible = true; w.beams.visible = false; w.body.rotation.x = 0; w.kind = i % 2 ? 'ore' : 'scrap'; }); trainPlace(-80); whistleTrain(); toast('A long whistle down the line: No. 7 "Valley Belle" pushes the wagons of scrap and ore into the siding.', 'gold'); }
    else if (wd === 4 && S.level === 8 && !L.spotFri && m >= TIMETABLE[4] && L.trainDay !== dayNo() && !L.lateTold) { L.lateTold = true; story({ kind:'late8' }); } return; }
  if (tr.st === 'in') { const stop = BUFFER_X - .4 - wagonX(WAGONS() - 1) - 2.1; trainPlace(Math.min(stop, tr.x + dt * (tr.x > stop - 10 ? 1.2 : 5)));
    if (Math.random() < dt * 2) sprite('#dcd8d0', tr.g.position.x + 1.6, 3.2, tr.g.position.z, rand(-.2, .2), rand(.6, 1), 0, 2.5, .3, -.05);
    if (Math.random() < dt * 1.5) sfxAt('clank', tr.g.position.x + 8, tr.g.position.z, .3);
    if (tr.x >= stop) { tr.st = 'sign'; M.rings.sign8.g.visible = true; toast('The wagons are in. Sign for them at the back gate (the amber ring by the bays).', 'gold'); } return; }
  if (tr.st === 'sign') { const joe = staffOf('foreman')[0]; if (joe && !(near(owner.o, SIGN_RING, .65))) { tr.joeT = (tr.joeT || 0) + dt; if (tr.joeT > 6) { tr.joeT = 0; tr.signT = 2; joe.say = { text:'Signed for, boss. Tip them.', until:T + 2.4 }; } }   // v2.0 15.3: the owner or the foreman signs
    if ((near(owner.o, SIGN_RING, .65) && ownerStill()) || tr.signT >= 2) { tr.signT = (tr.signT || 0) + dt; if (tr.signT > 1) { M.rings.sign8.g.visible = false; tr.st = 'shunt'; tr.tip = 0; const cost = WAGONS() * 10 * RAW_UNIT(); S.cash -= cost; ledger8(`Train: ${WAGONS() * 10} t of scrap and ore`, -cost); owner.play('point'); owner.lock = .6; sfx('tap'); toast(`Signed for ${WAGONS()} wagons (${fmt(cost)}${L.contract ? ', Dolores\'s contract price' : ''}). The shunter takes them over the bays one by one.`, 'good'); } } else tr.signT = 0; return; }
  if (tr.st === 'shunt') { if (!tr.clanked) { tr.clanked = true; for (let i = 0; i < WAGONS(); i++) setTimeout(() => sfxAt('clank', tr.g.position.x + 5 + i * 4.6, SIDING_Z, .5), i * 140); } const w = tr.wag[tr.tip], want = bayCx(w.kind) - wagonX(tr.tip); const d = want - tr.x; trainPlace(tr.x + clamp(d, -dt * 1.4, dt * 1.4)); if (Math.abs(d) < .02) { tr.st = 'tip'; tr.t = 0; noiseS(1.2, 180, .05); } return; }
  if (tr.st === 'tip') { const w = tr.wag[tr.tip]; tr.t += dt; w.body.rotation.x = Math.min(1.0, tr.t * .6) * (tr.t < 3 ? 1 : Math.max(0, 1 - (tr.t - 3) * .6));
    if (tr.t > 1.6 && w.units > 0) { const room = rawCap() - L[w.kind], n = Math.min(room, w.units); L[w.kind] += n; w.units -= n; syncHeaps(); if (n) for (let i = 0; i < 14; i++) sprite(w.kind === 'ore' ? '#7a3f2a' : '#6b6f73', w.g.getWorldPosition(new THREE.Vector3()).x + rand(-1.5, 1.5), .9, TIP_Z - rand(0, 1), rand(-.4, .4), rand(-.2, .4), rand(.4, 1.2), 1, .16, -3);
      if (w.units > 0) { L.dayOver = true; if (!w.over) { w.over = true; toast(`The ${w.kind} bay is at its limit (${rawCap()} t): the wagon goes back with ${w.units} t still in it. An overflow.`, 'bad'); } } w.load.visible = w.units > 0; }
    if (tr.t > 4.8) { w.body.rotation.x = 0; tr.tip++; tr.clanked = false; if (tr.tip >= WAGONS()) { tr.st = 'load'; tr.t = 0; } else tr.st = 'shunt'; } return; }
  if (tr.st === 'load') { tr.t += dt; if (tr.t < 2.5) return; const n = Math.min(WAGONS() * 20, L.store + L.bed); if (n > 0) { const fromS = Math.min(L.store, n); L.store -= fromS; L.bed -= n - fromS; syncBeams(); const pay = n * BEAM_PRICE(); S.cash += pay; S.earned += pay; L.shipped += n; ledger8(`${n} beams away by rail`, pay); toast(`${n} beams loaded onto the empty wagons and away: ${fmt(pay)}.`, 'gold'); sfx('coin'); }
    tr.wag.forEach((w, i) => { if (i < WAGONS()) w.beams.visible = n > i * 20; }); L.trains++; tr.st = 'out'; whistleTrain(); checkCharter(); save(); return; }
  if (tr.st === 'out') { trainPlace(tr.x - dt * (tr.x < -30 ? 6 : 2)); if (tr.x < -80) { tr.st = 'away'; tr.g.visible = false; } }
}
function whistleTrain(){ tone(587, .5, 'sawtooth', .025); tone(740, .5, 'sawtooth', .02, .05); tone(587, .9, 'sawtooth', .02, .6); }
function ledger8(what, amt){ if (typeof ledger === 'function') ledger(what, amt, clerkOn() ? 'June Finch' : 'You'); }
// ---- the furnace --------------------------------------------------------------------------------------------------
let furnT = 0, furnOn = false;
const furnOps = () => staffOf('operator').filter(c => c.st.mach === 'furnace');
function updateFurnace(dt){
  const L = S.l8; if (!L.lit) { furnOn = false; return; }
  const ops = furnOps().filter(c => c.state === 'furnace' && near(c.o, FURN_OPS[0], 3)), can = ops.length >= 2 && rawLeft() > 0 && L.bed < bedCap && powerOn();
  furnOn = can; if (M.furnGlow) M.furnGlow.visible = furnOn && (furnT / FURN_T) % 1 > .8;
  if (!M.furnLight) { M.furnLight = new THREE.PointLight('#ff8a30', 0, 14, 1.6); M.furnLight.position.set(FURN_DOOR[0], 1.6, FURN_DOOR[1] + 1.2); scene.add(M.furnLight); }
  M.furnLight.intensity += ((M.furnGlow && M.furnGlow.visible ? 26 : 0) - M.furnLight.intensity) * Math.min(1, dt * 8);   // the door opens: orange light across the yard
  if (L.lit && !can && rawLeft() === 0 && ops.length >= 2 && !(S.day && S.day.closing)) { if (!L.dayStock) { L.dayStock = true; toast('The furnace is starved: no scrap or ore in the bays. Wait for the train, or buy at Dolores\'s spot price (Stock).', 'bad'); } }
  if (Math.random() < dt * (furnOn ? 3 : .6)) sprite(pick(['#6b6a66', '#8a8782', '#4a4946']), M.stackTop[0] + rand(-.2, .2), M.stackTop[1], M.stackTop[2] + rand(-.2, .2), rand(.1, .4), rand(.8, 1.4), rand(-.1, .1), 6, .7, -.02);
  if (wxRain() > .4 && Math.random() < dt * 6) sprite('#e8e6e2', (FURN[0] + FURN[2]) / 2 + rand(-4, 4), 5.4, (FURN[1] + FURN[3]) / 2 + rand(-4, 4), 0, rand(.4, .8), 0, 3, .5, -.02);   // steam off the roof in the rain
  if (!furnOn) return;
  furnT += dt * furnK() * pf();
  if (furnT >= FURN_T) { furnT = 0; if (L.scrap > 0) L.scrap--; else L.ore--; syncHeaps(); L.bed++; L.made++; syncBeams(); sfxAt('thunk', ...FURN_DOOR, .6); noiseS(.8, 4000, .03, 'highpass');
    if (!L.firstBeam) { L.firstBeam = true; toast('The first beam slides out of the furnace door, glowing orange, and greys as the spray hisses over it.', 'gold'); } checkCharter(); }
}
// beams on the cooling bed glow and grey; the store's stack
function syncBeams(){
  const L = S.l8; M.beams ||= []; while (M.beams.length < L.bed) { const b = new THREE.Mesh(BX(3.6, .18, .22), new THREE.MeshStandardMaterial({ color:'#8a8f94', roughness:.45, metalness:.6, emissive:'#ff6a10', emissiveIntensity:1.4 })); b.userData.t = T; world.add(b); M.beams.push(b); }
  while (M.beams.length > L.bed) M.beams.shift().removeFromParent();
  M.beams.forEach((b, i) => b.position.set((BED[0] + BED[2]) / 2, .45 + Math.floor(i / 6) * .2, BED[1] + .25 + (i % 6) * .25));
  if (M.store8) { const s = M.store8.userData.stack; s.scale.y = Math.max(.01, L.store / storeCap8); s.position.y = .3 + s.scale.y * .6; s.visible = L.store > 0; }
}
function coolBeams(){ for (const b of M.beams || []) { const k = clamp((T - b.userData.t) / 15, 0, 1); b.material.emissiveIntensity = 1.4 * (1 - k); if (k < 1 && Math.random() < .02) sprite('#f2f2f2', b.position.x + rand(-1.5, 1.5), .7, b.position.z, 0, .8, 0, 1.2, .25, -.05); } }
function updateFurnOp(c, dt, i){
  const sp = FURN_OPS[i % 2]; if (c.state !== 'furnace' && c.state !== 'toFurnace') { goTo(c, sp[0], sp[1] + 1.2); c.state = 'toFurnace'; }
  if (c.state === 'toFurnace') { if (walk(c, dt)) { c.state = 'furnace'; c.o.position.set(sp[0], 0, sp[1]); } return; }
  c.faceNow(Math.PI); c.play(furnOn ? 'work' : 'idle');
}
// ---- the beam store: three build zones to choose from (Thursday), then Big Tom builds it -------------------------------
function chooseStore(k){ const L = S.l8; if (L.pad || S.cash < 15000) return; S.cash -= 15000; L.pad = k; L.padT = 0; ledger8(`Beam store, build zone ${k}`, -15000); if (!M.storeBuilder) M.storeBuilder = makeBuilder([PADS8[k][0], PADS8[k][1] + 1.6], -96); sfx('buy'); toast(`Build zone ${k}: Big Tom's crew is putting up the beam store.`, 'good'); save(); renderOffice(); }
function buildStore(done){ const k = S.l8.pad; if (!k || M.store8) return; const [x, z] = PADS8[k], g = new THREE.Group(); g.position.set(x, 0, z); g.userData.dyn = true;
  const steel = std('#5d6b74', .5, .5); for (const dx of [-1.6, 1.6]) for (const dz of [-.9, .9]) { const p = new THREE.Mesh(BX(.15, 3.0, .15), steel); p.position.set(dx, 1.5, dz); g.add(p); }
  const r = new THREE.Mesh(BX(3.6, .1, 2.2), std('#8d9396', .55, .5)); r.position.y = 3.05; g.add(r); const stack = new THREE.Mesh(BX(3.4, 1.2, 1.6), std('#8a8f94', .45, .6)); stack.position.y = .9; g.add(stack); g.userData.stack = stack;
  const lab = board(textTex([['BEAM STORE', 30, 30]], 256, 44, { bg:'#2b2f33', fg:'#ece2c6', border:'#e8ab2c', bw:3 }), 1.4, .24); lab.position.set(0, 2.7, 1.12); g.add(lab);
  world.add(g); M.store8 = g; addCol([x - 1.75, z - 1.05, x + 1.75, z + 1.05], 'store8'); rebuildNav(); syncBeams(); }
// the second forklift carries beams from the cooling bed to the store, two at a time
const fork8 = { o:null, state:'park', path:null, load:0, d:0 };
function fork8Route(){ const k = S.l8.pad, a = [(BED[0] + BED[2]) / 2, BED[3] + .9];
  if (k === 'B') return [a, [-20.1, -3.2], [-21.0, -.6], [PADS8.B[0] + 2.4, PADS8.B[1]]];
  if (k === 'A') return [a, [-14.8, -7.4], [-14.8, -13.2], [PADS8.A[0] - 2.6, PADS8.A[1]]];
  return [a, [-26.0, -7.4], [-29.0, -6.8], [PADS8.C[0] + 2.4, PADS8.C[1]]]; }
function fork8Driver(c, dt){
  if (!fork8.o) { c.play('idle'); return; }
  if (!c.seated8) { if (c.state !== 'toFork8') { goTo(c, fork8.o.position.x + .9, fork8.o.position.z); c.state = 'toFork8'; } if (walk(c, dt)) { c.seated8 = true; c.state = 'driving8'; c.say = { text:'Beam truck\'s running, boss.', until:T + 2 }; } return; }
  c.o.position.set(fork8.o.position.x, .45, fork8.o.position.z); c.o.rotation.y = fork8.o.rotation.y + Math.PI / 2; c.play('sit');
}
function updateFork8(dt){
  const L = S.l8, drv = staffOf('forklift').find(c => c.seated8); if (L.pad && M.store8 && !fork8.o) { fork8.o = put(inst('l4_forklift'), ...fork8Route()[0], 0); fork8.o.userData.dyn = true; fork8.state = 'park'; }
  if (!L.pad || !M.store8 || !drv) return;
  const route = fork8Route(), spd = 2.6 * (1 + [0, .15, .3, .5][Math.min(3, S.up.fork || 0)]);
  if (fork8.state === 'park') { if (L.bed >= 2 && L.store < storeCap8) { fork8.load = Math.min(2, L.bed); L.bed -= fork8.load; syncBeams(); fork8.state = 'go'; fork8.i = 1; sfx('clank', .3); } return; }
  const dir = fork8.state === 'go' ? 1 : -1, tgt = route[fork8.i], p = fork8.o.position, dx = tgt[0] - p.x, dz = tgt[1] - p.z, d = Math.hypot(dx, dz);
  if (d < .05) { fork8.i += dir; if (fork8.i >= route.length) { L.store += fork8.load; fork8.load = 0; syncBeams(); fork8.state = 'back'; fork8.i = route.length - 2; } else if (fork8.i < 0) { fork8.state = 'park'; } return; }
  const ux = dx / d, uz = dz / d, inLine = o => { const rx = o.o.position.x - p.x, rz = o.o.position.z - p.z, f = rx * ux + rz * uz, side = Math.abs(rx * uz - rz * ux); return f > .4 && f < 2.4 && side < .95; };
  const blocker = [owner, ...staffObj.values()].find(o => o && !o.seated8 && o.o.visible && inLine(o));
  if (blocker) { fork8.hold = (fork8.hold || 0) + dt; if (fork8.hold > 1.2 && !fork8.tooted) { fork8.tooted = true; sfxAt('horn', p.x, p.z, .4); }   // people first: stop and toot (4.4 rules 1, 10)
    if (fork8.hold > 3 && blocker !== owner) { const sx = -uz, sz = ux; blocker.o.position.x += sx * 1.8; blocker.o.position.z += sz * 1.8; collide(blocker.o.position); blocker.path = null; fork8.hold = 0; fork8.tooted = false; } return; }
  fork8.hold = 0; fork8.tooted = false;
  const s = Math.min(d, dt * spd); p.x += dx / d * s; p.z += dz / d * s; fork8.o.rotation.y = Math.atan2(-dz, dx) + (dir < 0 ? Math.PI : 0) - Math.PI / 2;
}
// ---- Joe Brennan (foreman), Victor Krane's bid, Dolores Marsh -------------------------------------------------------
const DAIRY = [24.6, -5.5, 38.0, 12.0], DAIRY_PAD = [22.9, 3.0], DAIRY_PRICE = 150000;
function updateL8Events(dt){
  const L = S.l8, wd = calDay() % 5, m = dayMin();
  if (wd >= 2 && !L.joeAsked && m > 40 && !cardOpen) { L.joeAsked = true; story({ kind:'person', id:'joe' }); toast('Joe Brennan, thirty years at the Ashcombe steelworks, is in the office about the foreman\'s job (Staff).', 'gold'); }
  if (hasRole('foreman') && !L.whistle && S.gus.retired && !cardOpen) { L.whistle = true; S.gus.visitAt = S.time; S.l8.whistleSay = true; toast('Gus drops by and hands Joe Brennan his old brass whistle: "She\'s yours now. Blow it like you mean it."', 'gold'); }
  // the foreman fills empty posts: anyone not yet led to a post is posted, and due services are booked
  if (hasRole('foreman')) { for (const st of S.staff) if (st.posted === false) st.posted = true; for (const f of S.faults) if (FAULTS[f.kind].svc) f.booked = true;
    // an operator idle a minute at a machine with no work goes to a machine with nobody on it
    const empty = [['saw', () => !sawOp()], ['pipe', () => millReady() && !pipeOp()], ['tool', () => pressReady() && !pressOp()], ['saw2', () => saw2Ready() && !saw2Op()], ['pipe2', () => mill2Ready() && !pipe2Op()], ['furnace', () => L.lit && furnOps().length < 2]].find(([, f]) => f());
    if (empty) { const idle = staffOf('operator').find(c => (c.idleT || 0) > 60 && c.st.mach !== empty[0]); if (idle) { idle.st.mach = empty[0]; idle.state = 'idle'; idle.path = null; idle.idleT = 0; const joe = staffOf('foreman')[0]; if (joe) joe.say = { text:`${idle.st.name}, over to the ${empty[0] === 'pipe2' ? 'second mill' : empty[0] === 'saw2' ? 'second saw' : empty[0]}!`, until:T + 2.5 }; toast(`Joe Brennan sends ${idle.st.name} to an empty post.`, ''); } } }
  // Victor Krane bids for the old dairy plot next door (Thursday): a countdown on the sign
  const K = L.krane; if (K.st === 0 && wd >= 3 && m > 60 && !cardOpen) { K.st = 1; K.end = S.time + 300; K.price = Math.round(DAIRY_PRICE * (1 - negotiateDisc()) * 1.05 * 1.1); /* Vera Lind's 5% fee, the reputation discount, +10% to counter Krane */ story({ kind:'person', id:'krane' }); toast(`Victor Krane has bid for the old dairy plot next door. Vera Lind will take your counter-offer at +10%: ${fmt(K.price)} at the pad by the east fence. Five minutes on the clock.`, 'bad'); }
  // Krane also bids on the oldest unclaimed card on the order board: a countdown, then he takes it
  if (S.l7 && S.l7.board.length && !cardOpen) { const old = S.l7.board.filter(c => S.time - c.pinned > 600).sort((a, b) => a.pinned - b.pinned)[0]; if (old && !old.krane) { old.krane = S.time + 120; toast(`Victor Krane is after ${old.client}'s order on your board: take it within two minutes or he will.`, 'bad'); }
    for (const c of [...S.l7.board]) if (c.krane && S.time > c.krane) { S.l7.board.splice(S.l7.board.indexOf(c), 1); S.l7.refillAt = S.time + 3; boardTex(); toast(`Victor Krane took ${c.client}'s order. Another card goes up.`, ''); } }
  if (K.st === 1 && S.time > K.end) { K.st = 2; K.back = S.time + 300; toast('Victor Krane has the dairy plot... for now. His bank has doubts: it comes back in five minutes at 20% more.', 'bad'); }
  if (K.st === 2 && S.time > K.back) { K.st = 1; K.price = Math.round(K.price / 1.1 * 1.2); K.end = S.time + 300; toast(`The dairy plot is for sale again: ${fmt(K.price)}. Five minutes.`, 'gold'); }
  if (K.st === 1 && near(owner.o, DAIRY_PAD, .6) && ownerStill() && S.cash >= K.price && !cardOpen) { K.t = (K.t || 0) + dt; if (K.t > 1) { S.cash -= K.price; ledger8('The old dairy plot', -K.price); K.st = 3; L.plot = true; sfx('level', .5); toast('The old dairy plot is yours. Victor Krane drives off without a word.', 'gold'); if (M.dairySign) M.dairySign.userData.sold = true; checkCharter(); save(); } } else if (K.t) K.t = 0;
  if (!M.dairySign && K.st >= 1) { M.dairySign = put(inst('env_sale_sign'), DAIRY[0] + .8, 3.0, -Math.PI / 2); M.dairySign.userData.dyn = true; M.ring('dairy', ...DAIRY_PAD, '#e8ab2c', .6); }
  if (M.rings && M.rings.dairy) M.rings.dairy.g.visible = K.st === 1;
  // the build zones go up on Thursday
  if (wd >= 3 && !L.zonesShown) { L.zonesShown = true; for (const [k, [x, z]] of Object.entries(PADS8)) M.ring('zone' + k, x, z, '#5aa8ff', 1.1); toast('Build zones are marked out: choose the beam store\'s pad (A, B or C) in the office (Machines) or stand in a blue ring.', 'gold'); }
  if (L.zonesShown && !L.pad) for (const [k, [x, z]] of Object.entries(PADS8)) if (near(owner.o, [x, z], 1.0) && ownerStill() && !cardOpen && !officeOpen) { L.zoneT = (L.zoneT || 0) + dt; if (L.zoneT > 1.2) { L.zoneT = 0; openOffice('plant'); } }
  if (L.pad && M.rings) for (const k of Object.keys(PADS8)) if (M.rings['zone' + k]) M.rings['zone' + k].g.visible = false;
  if (M.storeBuilder && !M.store8) runBuilder('storeBuilder', PADS8[L.pad], L, 'padT', 24, () => buildStore(true), dt);
  // Friday: Dolores offers her fixed-price contract
  if (wd === 4 && !L.doloresAsked && m > 20 && !cardOpen) { L.doloresAsked = true; story({ kind:'dolores' }); }
  // the second letter, found in the old safe when the furnace is lit
  if (L.lit && !L.letter && !cardOpen) { L.letter = true; story({ kind:'letter2' }); }
}
function buyRaw(){ const L = S.l8, k = L.scrap <= L.ore ? 'scrap' : 'ore', n = Math.min(10, rawCap() - L[k]), cost = n * SPOT_UNIT; if (n <= 0 || S.cash < cost) return; S.cash -= cost; L[k] += n; syncHeaps(); ledger8(`Spot ${k}: ${n} t from Dolores`, -cost); sfx('buy'); toast(`Dolores Marsh's lorry tips ${n} t of ${k} into the bay at the spot price (${fmt(cost)}).`, 'good'); save(); renderOffice(); }
function updateZonePreview(){ const L = S.l8, show = L.zonesShown && !L.pad; if (!M.zonePrev && show) { M.zonePrev = Object.entries(PADS8).map(([k, [x, z]]) => { const g = new THREE.Group(); g.position.set(x, .03, z);
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.2), new THREE.MeshBasicMaterial({ color:'#5aa8ff', transparent:true, opacity:.18, depthWrite:false })); fp.rotation.x = -Math.PI / 2; g.add(fp);
    const lab = board(textTex([[`ZONE ${k}`, 34, 30], [`IN: BEAMS FROM THE BED · OUT: ${k === 'A' ? 'THE SIDING, 9 M' : k === 'B' ? 'THE DOCKS' : 'THE SIDING, 30 M'}`, 15, 60, 500]], 384, 76, { bg:'#1d3a56', fg:'#ece6d9', border:'#5aa8ff', bw:4 }), 1.8, .36); lab.position.set(0, 1.3, 1.15); g.add(lab);
    world.add(g); return g; }); }
  if (M.zonePrev) for (const g of M.zonePrev) g.visible = !!show; }
// ---- the heavy-duty supply and lighting the furnace ------------------------------------------------------------------
function goLiveHD(fx){ S.l8.hd = 1; if (M.xfmr8) M.xfmr8.visible = true; if (fx) toast('The heavy-duty supply is live: a second transformer hums on the 11 kV plinth.', 'gold'); }
function lightFurnace(fx){ if (!S.l8.hd) return; S.l8.lit = true; if (fx) { sfx('level', .6); toast('The furnace is lit. Two operators run it: hire them in the office (Staff).', 'gold'); } checkCharter(); }
// ---- hurry the clock (v2.0 3.2): hold the office clock to run the day at x2 while the foreman has everything in hand ----
let hurry = false;
const linesManned = () => !!sawOp() && (!millReady() || !!pipeOp()) && (!pressReady() || !!pressOp()) && (!saw2Ready() || !!saw2Op()) && (!mill2Ready() || !!pipe2Op()) && (!S.l8 || !S.l8.lit || furnOps().length >= 2);
const hurryOk = () => S.level >= 8 && hasRole('foreman') && linesManned() && !cardOpen && !S.call && !S.faults.length && !(S.day && S.day.closing) && !(rail && ['in', 'sign'].includes(rail.st)) && !(S.order && S.order.ready) && !(S.order2 && S.order2.ready);
function updateHurry(){ const want = hurry && hurryOk(); SPEED = want ? 2 : 1; const el = $('clockPill') || $('clock'); if (el) el.classList.toggle('hurry', want); }
// ---- update ------------------------------------------------------------------------------------------------------
function updateLevel8(dt){
  if (S.level < 8 || !M.l8Built) return;
  updateTrain(dt); updateFurnace(dt); coolBeams(); updateFork8(dt); updateL8Events(dt); updateHurry(); ttBoard(); updateZonePreview();
  if (dayMin() < 1 && S.l8.dayMark !== dayNo()) { S.l8.dayMark = dayNo(); S.l8.dayStock = false; S.l8.dayOver = false; }
}
// at the whistle: a full day of furnace work with no stockout and no overflow counts for the charter
function l8DayEnd(){ if (!l8On() || !S.l8.lit) return; const L = S.l8, ended = S.day && S.day.n != null ? S.day.n : dayNo() - 1; if (!L.dayStock && !L.dayOver && L.trainDay === ended) L.cleanDays = (L.cleanDays || 0) + 1; L.dayStock = false; L.dayOver = false; }
function l8Html(){
  const L = S.l8; let h = `<div class="dept"><div class="dept-h"><span class="ic">${icon('truck')}</span><div><b>Raw store and the railway</b><small>Bays' limits are painted on their walls · ${L.contract ? 'Dolores\'s fixed price' : 'market price'} ${fmt(RAW_UNIT())}/t · spot ${fmt(SPOT_UNIT)}/t, always on offer</small></div></div>
    <div class="kv"><span>Scrap bay</span><span>${L.scrap} / ${rawCap()} t</span><span>Ore bay</span><span>${L.ore} / ${rawCap()} t</span><span>Beams on the cooling bed</span><span>${L.bed} / ${bedCap}</span><span>Beam store</span><span>${L.pad ? `${L.store} / ${storeCap8} (zone ${L.pad})` : 'Not built'}</span><span>Beams shipped</span><span>${L.shipped}</span><span>Trains unloaded</span><span>${L.trains}</span></div>
    <div class="kv">${TIMETABLE.map((t, i) => `<span>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]} train</span><span>${hhmm(t + (i === 4 && S.level === 8 && !L.spotFri ? 150 : 0))}${i === 4 && !L.spotFri ? ' (late)' : ''}</span>`).join('')}</div>
    <div class="call-b" style="padding:0 11px 11px"><button class="btn primary" data-spot type="button" ${S.cash >= 10 * SPOT_UNIT ? '' : 'disabled'}>Spot purchase: 10 t (${fmt(10 * SPOT_UNIT)})</button></div></div>`;
  if (L.zonesShown && !L.pad) h += `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Beam store: choose its build zone</b><small>$15,000 · the second forklift carries beams to it from the cooling bed</small></div></div>${Object.keys(PADS8).map(k => `<div class="up"><span class="ic">${icon('box')}</span><div><b>Zone ${k}</b><span class="note">${k === 'A' ? 'Behind the back fence, beside the raw store and the siding' : k === 'B' ? 'In the forklift yard, near the docks' : 'West of the furnace house, by the 11 kV plinth'}</span></div><button class="btn primary" data-zone="${k}" type="button" ${S.cash >= 15000 ? '' : 'disabled'}>Build here</button></div>`).join('')}</div>`;
  return h;
}

// Joe Brennan walks the yard between the machines with his clipboard (and Gus's whistle)
function updateForeman(c, dt){ if (!c.route || !c.path || !c.path.length) { const pts = [P.sawFix, P.pfix, [P.drop[0] - 1.5, P.drop[1]], FURN_OPS ? [FURN_OPS[0][0] + 1, FURN_OPS[0][1] + 2.2] : P.op]; c.ri = ((c.ri ?? -1) + 1) % pts.length; goTo(c, ...pts[c.ri]); c.route = true; c.wait = 0; }
  if (c.wait > 0) { c.wait -= dt; c.play('inspect'); return; } if (walk(c, dt)) { c.wait = 4; c.path = null; if (Math.random() < .3) c.say = { text:pick(['Look lively, lads.', 'Every post manned, boss.', 'Furnace\'s drawing well.']), until:T + 2.2 }; } else c.play('walk'); }
/* =====================================================================
   BIBLE v2.0 GAP AUDIT (plans/gap_audit_v2.md): what the yard shows and the small joys the level chapters leave to the
   general sections: Gus's lunch stories, the lamps dimming on an overloaded generator, the crew shovelling snow (and
   the owner's shovel), breath in the cold, sledging on Ironhill, the lunchtime snowman, an empty hard hat on the hook
   of an unmanned machine, the crew dressing for the weather, headlights in the murk, the gale, icicles, puddle splashes,
   the milestone photo, the goods-in tally board, order tags, the office pegs (L4) and the framed licence (L3).
   ===================================================================== */
// ---- Gus's stories at lunch (Levels 1-5): three lines a day, one after another ----------------------------------------
const GUS_TALES = [
  ['Winter of \'47 your grandad cleared this yard himself.', 'Shovel in one hand, tea in the other.', 'Never missed a lorry. Not one.'],
  ['First crate he ever sold went to Haines Farm.', 'Old Haines paid in eggs, two dozen.', 'Your grandad framed the receipt.'],
  ['The saw jammed on the King\'s birthday, \'53.', 'He fixed it with a hairpin from the canteen.', 'Still runs, doesn\'t she?'],
  ['He hired me at fourteen to sweep up.', 'Said a clean floor is a safe floor.', 'Fifty-two years, and I still sweep it.'],
];
function updateGusTale(dt){
  const g = folk.get('gus'); if (!g || S.gus.retired || !lunchTime() || g.job !== 'lunch' || g.gs !== 'eat') return;
  const T0 = S.gusTale ||= { day:-1, i:0, t:0 }; if (T0.day !== dayNo()) { T0.day = dayNo(); T0.i = 0; T0.t = 2; T0.tale = GUS_TALES[dayNo() % GUS_TALES.length]; }
  if (T0.i >= 3) return; T0.t -= dt; if (T0.t > 0) return; gusSay(g, T0.tale[T0.i], 4.2); T0.i++; T0.t = 5;
  if (T0.i === 3) for (const c of staffObj.values()) if (c.lunch === 'eat' && Math.random() < .5) c.say = { text:pick(['Ha! Good old Walter.', 'Tell the one about the bell!', 'Every word true, I bet.']), until:T + 2.5 };
}
// ---- an overloaded generator: the lamps dim and Old Faithful's note drops (Level 2) ----------------------------------
function updateDim(){ const over = !mainsUp() && powerOn() && overloaded(); for (const w of M.windows || []) if (w.material && w.material.emissiveIntensity !== undefined) w.material.emissiveIntensity = over ? .4 : .9;
  if (over && !S.dimTold && S.level <= 3) { S.dimTold = true; toast('Both machines running: the generator is short. The newest machine drops to half speed, the lamps dim and Old Faithful labours.', 'bad'); } }
// ---- snow: the crew shovel the lanes on a snowy morning; the owner can take a shovel by the workshop door -------------
const SHOVEL_AT = [-6.6, -1.5];
function shovelMesh(){ const g = new THREE.Group(); const h = new THREE.Mesh(CY(.025, 1.1, 6), std('#8a6a44', .8)); h.position.y = .55; g.add(h); const b = new THREE.Mesh(BX(.28, .03, .3), std('#5a5f63', .5, .6)); b.position.set(0, 0, .1); b.rotation.x = -.4; g.add(b); g.userData.noSnow = true; return g; }
const shovelTime = () => snowLying() > .35 && dayMin() < 150 && !(S.day && S.day.closing);
function updateShovels(dt){
  const on = shovelTime(); if (!M.shovelRack && on) { M.shovelRack = shovelMesh(); M.shovelRack.position.set(SHOVEL_AT[0] - .3, 0, SHOVEL_AT[1] - .5); M.shovelRack.rotation.z = .25; world.add(M.shovelRack); M.ring('shovel', ...SHOVEL_AT, '#9fd0e6', .5); }
  if (M.rings && M.rings.shovel) M.rings.shovel.g.visible = on && !owner.shovel; if (M.shovelRack) M.shovelRack.visible = on && !owner.shovel;
  if (on && !owner.shovel && !owner.stack.length && !owner.cart && near(owner.o, SHOVEL_AT, .55) && ownerStill()) { owner.shovel = shovelMesh(); owner.o.add(owner.shovel); owner.shovel.position.set(.25, .3, .35); owner.shovel.rotation.x = .9; toast('You take a shovel and pitch in with the crew.', 'good'); }
  if (owner.shovel && (!on || owner.stack.length || owner.cart)) { owner.shovel.removeFromParent(); owner.shovel = null; }
  if (owner.shovel && inputDir()[2] > 0) { S.wx.cleared = Math.min(1, (S.wx.cleared || 0) + dt / 90); if (Math.random() < dt * 8) sprite('#f4f8fb', owner.o.position.x + rand(-.3, .3), .2, owner.o.position.z + rand(-.3, .3), rand(-.6, .6), rand(.6, 1.2), rand(-.6, .6), .8, .1, -3); if (Math.random() < dt * 2) noiseS(.12, 1800, .02, 'bandpass'); }
  // the crew with nothing in their hands shovel where they stand
  for (const c of staffObj.values()) { const can = on && ['loader', 'helper'].includes(c.st.role) && ['waiting', 'helperWait', 'idle'].includes(c.state) && !c.stack.length;
    if (can && !c.shovel) { c.shovel = shovelMesh(); c.o.add(c.shovel); c.shovel.position.set(.25, .3, .35); c.shovel.rotation.x = .9; } if (!can && c.shovel) { c.shovel.removeFromParent(); c.shovel = null; }
    if (c.shovel) { c.play('work', .8); if (Math.random() < dt * 4) sprite('#f4f8fb', c.o.position.x + rand(-.3, .3), .2, c.o.position.z + .4, rand(-.4, .4), rand(.5, 1), rand(0, .6), .8, .1, -3); } }
}
// ---- breath in the cold, crunching steps ---------------------------------------------------------------------------
function updateBreath(dt){ if (!(seasonOf() === 'winter' || icy())) return; const all = [owner, ...staffObj.values()]; if (Math.random() < dt * 3) { const c = pick(all); if (c && c.o.visible) { const p = c.o.position; sprite('#f2f4f6', p.x + Math.sin(c.o.rotation.y) * .2, 1.55, p.z + Math.cos(c.o.rotation.y) * .2, rand(-.05, .05), .25, rand(-.05, .05), 1.4, .14, -.02); } } }
// ---- children sledging on Ironhill (Level 5, winter) ------------------------------------------------------------------
function updateSledge(dt){
  const on = seasonOf() === 'winter' && snowLying() > .3; if (!on) { if (M.sledges) M.sledges.forEach(s => s.g.visible = false); return; }
  if (!M.sledges) M.sledges = [0, 1, 2].map(i => { const g = new THREE.Group(); const sl = new THREE.Mesh(BX(.5, .08, .22), std('#b3261e', .6)); sl.position.y = .08; g.add(sl); const kid = new THREE.Mesh(BX(.18, .3, .16), std(pick(['#2f5d8a', '#d9772b', '#3f8f4a']), .8)); kid.position.set(-.05, .28, 0); g.add(kid); const hd = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), std('#f1c9a5', .8)); hd.position.set(-.05, .5, 0); g.add(hd); world.add(g); return { g, t:i * .33 }; });
  for (const s of M.sledges) { s.g.visible = true; s.t = (s.t + dt / 9) % 1; const x = 6 + s.t * 16, z = -36 + s.t * 5.5, y = Math.max(0, 3.2 - s.t * 3.4); s.g.position.set(x, y, z); s.g.rotation.y = -Math.atan2(5.5, 16); }
}
// ---- the lunchtime snowman; Bolt steals its carrot ----------------------------------------------------------------
const SNOWMAN_AT = [-7.4, 6.2];   // open ground inside the front fence, clear of the stacks and the lunch bench
function updateSnowman(dt){
  if (!(snowLying() > .3 && S.level >= 5)) { if (M.snowman) { M.snowman.removeFromParent(); M.snowman = null; COL.delete('snowman'); rebuildNav(); } return; }
  if (lunchTime() && !M.snowman) { const g = new THREE.Group(), w = std('#f4f6f8', .9); g.position.set(...SNOWMAN_AT.slice(0, 1), 0, SNOWMAN_AT[1]); g.position.set(SNOWMAN_AT[0], 0, SNOWMAN_AT[1]);
    for (const [r, y] of [[.42, .4], [.3, 1.0], [.2, 1.45]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), w); b.position.y = y; b.castShadow = true; g.add(b); }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.04, .18, 6), std('#e5772b', .6)); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.47, .22); g.add(nose); g.userData.nose = nose;
    for (const dx of [-.07, .07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), std('#1d1f22')); e.position.set(dx, 1.53, .18); g.add(e); }
    g.scale.setScalar(.01); g.userData.grow = 0; g.userData.dyn = true; world.add(g); M.snowman = g; addCol([SNOWMAN_AT[0] - .45, SNOWMAN_AT[1] - .45, SNOWMAN_AT[0] + .45, SNOWMAN_AT[1] + .45], 'snowman'); rebuildNav(); toast('The crew build a snowman in the yard at lunch.', ''); }
  const g = M.snowman; if (!g) return; g.visible = true; if (g.userData.grow < 1) { g.userData.grow = Math.min(1, g.userData.grow + dt / 20); g.scale.setScalar(.01 + .99 * g.userData.grow); }
  if (!lunchTime() && g.userData.nose.visible && g.userData.grow >= 1 && boltHere() && !S.carrotGone) { S.carrotGone = true; g.userData.nose.visible = false; for (let i = 0; i < 8; i++) sprite('#f4f8fb', SNOWMAN_AT[0], 1.4, SNOWMAN_AT[1], rand(-1, 1), rand(.5, 1.4), rand(-1, 1), .9, .1, -3); toast('Bolt has run off with the snowman\'s carrot. The crew cheer him on.', 'gold'); }
}
// ---- an empty post: an empty hard hat on its hook by the machine, until somebody runs it ---------------------------
const away = c => !c || (c.st.trainUntil > S.time);   // nobody on the post, or its operator is away at the training bench
const HAT_POSTS = [['saw', () => P.op, () => away(sawOp()) && S.tutDone], ['pipe', () => P.pop || [P.pmill[0] - 1.6, P.pmill[1] + 1.0], () => millReady() && away(pipeOp())], ['tool', () => [P.tfeed[0] + 1, P.tfeed[1] + 1.1], () => pressReady() && away(pressOp())], ['saw2', () => P.op2 || P.saw2, () => saw2Ready() && away(saw2Op())], ['pipe2', () => P.pop2 || P.mill2Fix, () => mill2Ready() && away(pipe2Op())]];
function syncHats(){ M.hats ||= {}; for (const [k, at, empty] of HAT_POSTS) { let h = M.hats[k]; const want = !!empty() && S.level >= 2;
  if (want && !h) { h = new THREE.Group(); const post = new THREE.Mesh(BX(.06, 1.5, .06), std('#5a5f63', .5, .5)); post.position.y = .75; h.add(post); const hook = new THREE.Mesh(BX(.18, .03, .03), std('#5a5f63', .5, .5)); hook.position.set(.09, 1.42, 0); h.add(hook);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#e8ab2c', .5)); hat.position.set(.16, 1.32, 0); hat.rotation.z = .5; h.add(hat); const [x, z] = at(); h.position.set(x + .7, 0, z + .5); h.userData.dyn = true; world.add(h); M.hats[k] = h; }
  if (h) h.visible = want; } }
// ---- the crew dress for the weather: donkey jackets in the cold, oilskins in the rain, shirtsleeves in the heat ---------
let dressK = '';
function dressFor(){ const k = seasonOf() === 'winter' || icy() ? 'cold' : wxRain() > .5 ? 'wet' : heatOn() ? 'hot' : ''; if (k === dressK) return; dressK = k;
  for (const c of staffObj.values()) { if (!c.mat) continue; const cols = lookCols(c.st); if (k === 'cold') { cols.suit = '#2b2f36'; cols.hat = cols.hat ? '#3a3328' : cols.hat; } else if (k === 'wet') cols.suit = '#d9b23a'; else if (k === 'hot') cols.suit = cols.shirt || '#d8d2c2'; c.mat.map = paletteTex(cols); c.mat.needsUpdate = true; } }
// ---- headlights and wipers in rain, fog and snow; spray from tyres ------------------------------------------------------
function updateHeadlights(){ const murk = wxRain() > .3 || wxFog() > .3 || snowFall() > .3; for (const [v, len] of [[M.truck, 2.6], [M.truck2, 2.6], [M.car, 1.9], [M.flat, 2.6]]) { if (!v) continue; let hl = v.userData.hl;
  if (!hl) { hl = new THREE.Group(); for (const s of [-.75, .75]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color:'#fff3c4' })); b.position.set(len, .75, s); hl.add(b); } v.add(hl); v.userData.hl = hl; }
  hl.visible = murk && v.visible; if (v !== M.car) { wipe(v, (wxRain() > .3 || snowFall() > .3) && v.visible); snowChains(v); }
  if (murk && v.visible && wxRain() > .3 && Math.random() < .3) { const p = v.position; sprite('#c9d3da', p.x + rand(-1, 1), .15, p.z + rand(-1, 1), rand(-.5, .5), .4, rand(-.5, .5), .5, .12, -2); } } }
// two wiper blades on the windscreen sweep in rain and falling snow; chains go on the tyres once bought and the snow lies
// windscreen bottoms from blender/assets/truck.py (Blender x, z -> three x, y): the lorry's split screen, the flatbed's raked one
const WIPER_AT = { lorry:[1.41, 1.38, [-.42, .42], .4], flat:[2.27, 1.46, [-.42, .38], .5] };
function wipe(v, on){ let w = v.userData.wipers; if (!w && !on) return;
  if (!w) { const [x, y, zs, len] = WIPER_AT[v === M.flat ? 'flat' : 'lorry']; w = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color:'#1b1b1b', roughness:.6 });
    for (const z of zs) { const pv = new THREE.Group(); pv.position.set(x, y, z); const arm = new THREE.Mesh(new THREE.BoxGeometry(.025, len, .03), m); arm.position.y = len / 2; pv.add(arm); w.add(pv); }
    v.add(w); v.userData.wipers = w; }
  w.visible = on; if (on) { const a = Math.sin(T * 3.4) * .75; for (const pv of w.children) pv.rotation.x = a; } }
function snowChains(v){ const on = !!S.restored.chains && v.visible && (snowLying() > .3 || (wx.kind === 'heavysnow' && wx.k > .4)); if (!on && !v.userData.chains) return;
  if (!v.userData.chains) { const m = new THREE.MeshStandardMaterial({ color:'#b8bec4', roughness:.3, metalness:.85 }), list = [];
    for (const n of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) { const wh = findNode(v, n); if (!wh) continue; const r = new THREE.Mesh(new THREE.TorusGeometry(1.0, .07, 6, 20), m); r.userData.fx = true; wh.add(r);
      for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(.09, .08, .8), m); const a = i / 8 * Math.PI * 2; c.position.set(Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0);   // wheel nodes are scaled to the 0.43 m radius: local units are wheel radii
        c.rotation.z = a; c.userData.fx = true; r.add(c); } list.push(r); }
    v.userData.chains = list; }
  for (const r of v.userData.chains) r.visible = on; }
// ---- the gale: trees bend, papers fly, tarpaulins flap, the windsock stands straight out -------------------------------
function updateGale(dt){ const k = wxK('gale');
  for (const t of M.trees || []) { if (!t.visible) continue; t.rotation.z = k * (.12 + Math.sin(T * 2.3 + t.position.x) * .05); }
  if (k > .3 && Math.random() < dt * 4 * k) sprite('#f4efe2', camPos.x + rand(-12, 4), rand(.5, 2.5), camPos.z + rand(-10, 8), 4 * k, rand(.2, .6), rand(-.5, .5), 3, .14, -.1);
  if (M.tarp6) M.tarp6.children[0].rotation.z = k * Math.sin(T * 7) * .03;
  if (!M.windsock) { const g = new THREE.Group(); g.position.set(-13.6, 0, 12.0); const pole = new THREE.Mesh(CY(.04, 4, 6), std('#c9c0aa', .6)); pole.position.y = 2; g.add(pole); const sock = new THREE.Mesh(new THREE.ConeGeometry(.22, 1.1, 10, 1, true), std('#e5772b', .6, 0, { side:THREE.DoubleSide })); sock.rotation.z = Math.PI / 2; sock.position.set(.55, 3.9, 0); const piv = new THREE.Group(); piv.position.y = 0; piv.add(sock); g.add(piv); g.userData.sock = piv; g.userData.dyn = true; world.add(g); M.windsock = g; }
  const sk = M.windsock.userData.sock; sk.rotation.z = -(1 - Math.max(k, .15)) * .9 + Math.sin(T * 5) * .05 * k; sk.rotation.y = Math.sin(T * .4) * .3 * (1 - k); }
// ---- icicles on the workshop gutter on frosty mornings ----------------------------------------------------------------
function updateIcicles(){ const on = icy() || (wxK('ice') > .3 && dayMin() < 200); if (on && !M.icicles) { const g = new THREE.Group(); for (let x = -11.5; x < 1.5; x += .45) { const l = .15 + Math.random() * .3; const c = new THREE.Mesh(new THREE.ConeGeometry(.035, l, 5), new THREE.MeshStandardMaterial({ color:'#e8f4fb', roughness:.1, transparent:true, opacity:.85 })); c.rotation.x = Math.PI; c.position.set(x, 4.25 - l / 2, -2.35); g.add(c); } g.userData.noSnow = true; world.add(g); M.icicles = g; } if (M.icicles) M.icicles.visible = on; }
// ---- puddles splash when the owner runs through the wet yard --------------------------------------------------------
function updateSplash(dt){ if (!(wxRain() > .3 || (S.wx && S.wx.wet > .3)) || inputDir()[2] < .5) return; if (Math.random() < dt * 5) { const p = owner.o.position; for (let i = 0; i < 4; i++) sprite('#b9c6cf', p.x + rand(-.15, .15), .08, p.z + rand(-.15, .15), rand(-.8, .8), rand(.6, 1.2), rand(-.8, .8), .5, .07, -6); if (Math.random() < .4) noiseS(.06, 2400, .015, 'bandpass'); } }
// ---- the milestone photo: at a crate milestone the crew lines up by the workshop; stand with them -----------------------
const PHOTO_AT = [-3.4, -1.0];
function milestonePhoto(what){ if (S.photo && S.photo.until > S.time) return; S.photo = { what, until:S.time + 40 }; M.ring('photo', ...PHOTO_AT, '#e8ab2c', .55); toast(`${what}: the crew lines up by the workshop door for a photograph. Join them in the ring.`, 'gold'); }
function updatePhoto(dt){ const ph = S.photo; if (!ph || ph.until < S.time) { if (M.rings && M.rings.photo) M.rings.photo.g.visible = false; return; } if (M.rings.photo) M.rings.photo.g.visible = !ph.done;
  if (!ph.done && near(owner.o, PHOTO_AT, .55) && ownerStill()) { ph.done = true; ph.until = S.time + 3; S.photos = (S.photos || 0) + 1; tone(1800, .05, 'square', .03); if (scene.userData.flash === undefined) scene.userData.flash = 0; const L = new THREE.PointLight('#ffffff', 40, 14); L.position.set(PHOTO_AT[0], 3, PHOTO_AT[1] + 3); scene.add(L); setTimeout(() => L.removeFromParent(), 140);
    for (const c of staffObj.values()) { c.say = { text:'Cheese!', until:T + 1.5 }; c.play('cheer'); c.lock = 1.2; } confetti(); toast(`The photograph goes up in the office: ${ph.what}.`, 'good'); save(); } }
// ---- the chalk tally board at goods-in: each material and its days of cover (Level 3+) ------------------------------
function updateTally(){ if (S.level < 3 || !P.goodsIn) return; if (!M.tally) { const g = new THREE.Group(); g.position.set(P.goodsIn[0] + 1.25, 0, P.goodsIn[1] - 1.3); for (const dx of [-.4, .4]) { const p = new THREE.Mesh(BX(.06, 1.6, .06), std('#5a3b24', .8)); p.position.set(dx, .8, 0); g.add(p); }
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.95, .6), new THREE.MeshBasicMaterial({ color:'#ffffff' })); f.position.set(0, 1.35, .04); g.add(f); g.userData.face = f; g.userData.dyn = true; world.add(g); M.tally = g; }
  const use = Math.max(1, S.l5 && S.l5.useT ? S.l5.useT : 60), daysT = (S.store + S.timber) / use, daysC = S.coils / Math.max(1, use / 8), k = `${S.store + S.timber}|${S.coils}|${Math.floor(daysT * 2)}`; const f = M.tally.userData.face; if (f.userData.k === k) return; f.userData.k = k;
  f.material.map = textTex([['GOODS IN', 24, 26], [`TIMBER ${S.store + S.timber} · ${daysT < 1 ? 'UNDER A DAY' : Math.floor(daysT) + ' DAYS'}`, 18, 56, 500], [`COILS ${S.coils} · ${daysC < 1 ? 'UNDER A DAY' : Math.floor(daysC) + ' DAYS'}`, 18, 84, 500]], 256, 100, { bg:'#2b2f2b', fg:'#ece6d9', border:'#8a6a44', bw:5 }); f.material.needsUpdate = true; }
// ---- goods kept for an order wear a red tag with its number --------------------------------------------------------
function updateOrderTags(){ for (const [k, at, have] of [['pal', () => P.pallet, () => S.order && S.order.qty && S.pallet > 0], ['rack', () => P.prack, () => S.order && S.order.pq && S.pipes > 0]]) { M.otags ||= {}; let t = M.otags[k];
  if (!t) { t = new THREE.Group(); const tag = new THREE.Mesh(BX(.2, .26, .02), std('#b3261e', .5)); t.add(tag); t.userData.dyn = true; world.add(t); M.otags[k] = t; }
  const on = !!(have() && at()); t.visible = on; if (on) { const [x, z] = at(); t.position.set(x + .55, 1.15, z + .55); t.rotation.z = Math.sin(T * 2) * .1; if (t.userData.id !== S.order.id) { t.userData.id = S.order.id; const b = board(textTex([[`No. ${S.order.id}`, 30, 40]], 128, 64, { bg:'#b3261e', fg:'#ece6d9' }), .2, .1); b.position.set(0, 0, .012); while (t.children.length > 1) t.children.pop().removeFromParent(); t.add(b); } } } }
// ---- Level 4 Friday: Big Tom's crew pegs out the new office block across Mill Road ---------------------------------
function updateOfficePegs(){ if (S.level !== 4 || M.officePegs || !isFriday()) return; const g = new THREE.Group(), [x0, z0, x1, z1] = [-3.6, 19.2, 4.6, 24.8], st = std('#c9a26a', .8);
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { const p = new THREE.Mesh(BX(.06, .6, .06), st); p.position.set(x, .3, z); g.add(p); }
  const ln = new THREE.LineBasicMaterial({ color:'#f4efe2' }), pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, .5, z)); g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ln));
  g.userData.dyn = true; world.add(g); M.officePegs = g; toast('Big Tom\'s contractors peg out the new office block across Mill Road.', 'gold'); }
// ---- the trading licence, framed on the workshop wall (Level 3) ------------------------------------------------------
function syncLicence(){ if (M.licFrame || !(S.lv3 && S.lv3.licence === 2)) return; const g = new THREE.Group(); g.position.set(-3.75, 1.85, -2.42); const fr = new THREE.Mesh(BX(.62, .46, .04), std('#6b4a2a', .6)); g.add(fr);
  const c = board(textTex([['TRADING LICENCE', 22, 26], ['VALLEY COUNCIL · 1973', 14, 52, 500]], 256, 72, { bg:'#f2ecdc', fg:'#2b2a24', border:'#c9a24a', bw:4 }), .54, .38); c.position.z = .025; g.add(c); g.userData.dyn = true; world.add(g); M.licFrame = g; }
function syncFaultTags(){ M.ftags ||= new Map(); for (const f of S.faults) { if (FAULTS[f.kind].svc || f.where === 'gen' || f.where === 'board' || f.where === 'jbox') continue; if (!M.ftags.has(f.id)) { const g = new THREE.Group(), mk = WHERE[f.where].mark; const t = new THREE.Mesh(BX(.2, .26, .02), std('#c23b2a', .5, 0, { emissive:'#7a1a10', emissiveIntensity:.4 })); t.position.y = -.2; g.add(t); const str = new THREE.Mesh(CY(.008, .2, 4), std('#2b2a24')); str.position.y = -.03; g.add(str); g.position.set(mk[0] - .35, Math.min(1.5, mk[1] - .3), mk[2] + .55); g.userData.dyn = true; world.add(g); M.ftags.set(f.id, g); } M.ftags.get(f.id).children[0].rotation.z = Math.sin(T * 3 + f.id) * .25; }
  for (const [id, g] of [...M.ftags]) if (!S.faults.some(f => f.id === id)) { g.removeFromParent(); M.ftags.delete(id); } }
// the owner's thumb draws the signature on the delivery note (v2.0 L1 feel)
function signFlourish(o){ const el = document.createElement('div'); el.className = 'sign-note'; el.style.cssText = 'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) rotate(-3deg);background:#f4efe2;color:#2b2a24;padding:10px 14px;border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,.35);font:600 13px "Special Elite","Roboto Mono",monospace;pointer-events:none;z-index:30;opacity:0;transition:opacity .2s';
  el.innerHTML = `DELIVERY NOTE · No. ${o.id}<br>${o.client}<svg width="180" height="44" viewBox="0 0 180 44" style="display:block;margin-top:4px"><path d="M6 30 C 20 6, 28 40, 40 22 S 60 8, 70 28 S 92 40, 104 18 S 130 10, 140 30 L 172 24" fill="none" stroke="#1d3a56" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="320" stroke-dashoffset="320" style="transition:stroke-dashoffset ${REDUCED ? .05 : .6}s ease-out"/></svg>`;
  document.body.appendChild(el); requestAnimationFrame(() => { el.style.opacity = 1; const pth = el.querySelector('path'); requestAnimationFrame(() => pth.style.strokeDashoffset = 0); }); for (let i = 0; i < 5; i++) setTimeout(() => noiseS(.05, 4000, .01, 'highpass'), i * 110); setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 250); }, 1300); }
// ---- the beat sheet (v2.0 19.3, QA-14): something new at least every 90 s of a working day. Every card, event toast,
// arrival, purchase and joy is a beat; when the yard has been quiet for 70 s a small joy fills the gap
const beats = [];
function beat(k){ if (typeof S === 'undefined' || !S || !S.tutDone) return; beats.push(S.time); if (beats.length > 400) beats.splice(0, 200); }
const lastBeat = () => beats.length ? beats[beats.length - 1] : -1e9;
const JOYS = [
  () => { const c = pick([...staffObj.values()].filter(c => c.o.visible)); if (!c) return false; c.say = { text:pick(['Did you see the match Saturday?', 'Mind your toes!', 'Nearly Friday, lads.', 'Who\'s pinched my tea?']), until:T + 3 }; c.play('cheer'); c.lock = 1; return true; },
  () => { if (!boltHere() || !bolt.o) return false; for (let i = 0; i < 6; i++) sprite('#c9b28a', bolt.o.position.x + rand(-.2, .2), .3, bolt.o.position.z + rand(-.2, .2), rand(-.6, .6), rand(.4, .9), rand(-.6, .6), .9, .08, -2); tone(620, .08, 'square', .02); tone(560, .1, 'square', .02, .12); floatText('Woof!', bolt.o.position.x, 1.1, bolt.o.position.z, 'info'); return true; },
  () => { const x = rand(-6, 18); for (let i = 0; i < 5; i++) sprite('#3a3530', x + i * .3, 6 + rand(-.3, .3), -14 + rand(-1, 1), 3, rand(-.1, .1), 0, 6, .12); tone(2400, .05, 'sine', .01); return true; },
  () => { const g = gusChar(); if (!g || S.gus.retired) return false; gusSay(g, pick(GUS_LINES), 3.5); return true; },
];
function updateBeats(){ if (!S.tutDone || cardOpen || (S.day && S.day.closing) || lunchTime()) return; if (S.time - lastBeat() < 70) return; for (const j of [...JOYS].sort(() => Math.random() - .5)) if (j()) { beat('joy'); return; } beat('quiet'); }
// ---- the stock ledger (v2.0 0.5, 16.3, QA-02): every crate, pipe and tool made is somewhere: on its stack, in the
// warehouse, in somebody's hands or on a trolley, loaded (shipped), or sold at the gate. made - accounted never drifts
function stockLedger(){
  const held = t => { let n = 0; for (const o of [owner, ...staffObj.values(), ...folk.values(), ...temps]) if (o && o !== (walker && walker.c) && o.carryType === t) n += o.stack.length; if (fork.carryType === t) n += fork.stack.length; return n; };
  const W = S.walk.u || {}, gate = t => (W[t] || 0) + (walker && walker.def.want === t && walker.state !== 'out' && !walker.paid ? walker.got || 0 : 0);
  const crate = { made:S.made, at:S.pallet + (S.lv4.pallet2 || 0) + (S.wh.c || 0) + held('crate') + S.shipped + gate('crate') };
  const pipe = { made:S.pmade, at:S.pipes + (S.l5.rack2 || 0) + (S.wh.p || 0) + held('pipe') + S.pshipped + gate('pipe') };
  const tool = { made:S.tmade || 0, at:(S.tools || 0) + (S.wh.t || 0) + held('toolbox') + held('tool') + (S.tshipped || 0) + gate('tool') };
  return { crate, pipe, tool, drift:{ crate:crate.made - crate.at, pipe:pipe.made - pipe.at, tool:tool.made - tool.at } };
}
// v2.0 13.3: a machine's tag names its state in words (never by colour alone): Idle, Starved, Producing, Blocked,
// Under-powered, Service due or Broken, with the reason under it
function stateWord(k, r){ const t = (r[1] || '').toLowerCase(), sub = (r[2] || '').toLowerCase(); if (k && S.faults.some(f => f.where === k && !FAULTS[f.kind].svc)) return 'Broken';
  if (/no power|overload|half speed/.test(t + sub) && !/fault|jam|worn/.test(sub)) return 'Under-powered'; if (/jam|worn|broken|fault/.test(t + ' ' + sub)) return 'Broken';   /* 'Stopped: no operator' is Idle, not Broken */
  if (/needs|no coil|no plank|starved|feed|empty/.test(t + ' ' + sub)) return 'Starved'; if (/full/.test(t + ' ' + sub) && !/order/.test(sub)) return 'Blocked';
  if (/cutting|forming|stamping|running|making|producing/.test(t)) return k && svcDue(k) ? 'Service due' : 'Producing'; return 'Idle'; }
const mtag = (k, r) => `<div class="mtag ${r[0]}"><b>${stateWord(k, r)}</b>${r[1]}${r[2] ? ' · ' + r[2] : ''}</div>`;
// ---- haptics (v2.0 19.2), off unless switched on in the settings ------------------------------------------------------
function buzz(p){ try { if (S.haptics && navigator.vibrate) navigator.vibrate(p); } catch(e){} }
// footsteps change with the ground: concrete, gravel, the wet yard, snow, the steel dock deck (v2.0 19.1)
let stepT = 0;
function updateFootsteps(dt){ const k = inputDir()[2]; if (k <= 0 || !owner.o.visible) { stepT = 0; return; } stepT -= dt * (1.6 + k * 1.4); if (stepT > 0) return; stepT = 1;
  const p = owner.o.position, onDeck = typeof groundY === 'function' && groundY(p.x, p.z) > .5, inYard = p.x > SITE.x0 && p.x < SITE.x1 && p.z > SITE.z0 && p.z < SITE.z1;
  if (onDeck) tone(330 + Math.random() * 40, .04, 'triangle', .012); else if (snowLying() > .3 && !(inYard && (S.wx.cleared || 0) > .6)) noiseS(.07, 900, .02); else if (wxRain() > .3) noiseS(.05, 2400, .012, 'bandpass'); else if (!inYard) noiseS(.04, 3200, .01, 'bandpass'); else noiseS(.03, 600, .008); }
function updatePolish(dt){ syncFaultTags(); updateBeats(); if (S.reduced !== undefined) REDUCED = S.reduced; updateFootsteps(dt); if (!levelShot && frames > 90 && !cardOpen) levelShot = yardShot();
  updateGusTale(dt); updateDim(); updateShovels(dt); updateBreath(dt); updateSledge(dt); updateSnowman(dt); syncHats(); dressFor(); updateHeadlights(); updateGale(dt); updateIcicles(); updateSplash(dt); updatePhoto(dt); updateTally(); updateOrderTags(); updateOfficePegs(); syncLicence();
}

// ---- office: the "Needs you" card, the Plant tab's line table, the Stock tab's cover and tied-up cash, settings --------
function needsYouHtml(mini){ const ob = objective(); if (!ob || !ob.t || !ob.alert) return ''; if (mini) return `<div class="needsmini"><span class="t"><b>Needs you:</b> ${ob.t}</span>${ob.at ? '<button class="btn primary" data-showme type="button">Show me</button>' : ''}</div>`; return `<div class="call needs"><div class="call-h">${icon('alert')}<div><b>Needs you</b><small>${ob.t}</small></div></div>${ob.at ? '<div class="call-b"><button class="btn primary" data-showme type="button">Show me</button></div>' : ''}</div>`; }
function linesHtml(){ const lines = [['Crate machine', SAW_CYCLE, () => (1 + .2 * S.up.saw) * tierK('saw'), () => sawOn, () => sawReason()], ...(millReady() ? [['Pipe mill', PIPE_CYCLE, () => (1 + .2 * S.up.pipe) * tierK('pipe'), () => pipeOn, () => pipeReason()]] : []), ...(pressReady() ? [['Tool press', TOOL_CYCLE, () => (1 + .2 * S.up.press) * tierK('tool'), () => toolOn, () => toolReason()]] : []), ...(saw2Ready() ? [['Second crate machine', SAW_CYCLE, () => sawSpeedK() * tierK('saw2'), () => saw2On, () => saw2Reason()]] : []), ...(mill2Ready() ? [['Second pipe mill', PIPE_CYCLE, () => (1 + .2 * S.up.pipe) * tierK('mill2'), () => mill2On, () => mill2Reason()]] : []), ...(S.l8 && S.l8.lit ? [['Furnace', 12, () => furnK(), () => furnOn, () => ({ label:['', furnOn ? 'Running' : rawLeft() === 0 ? 'Starved' : furnOps().length < 2 ? 'Idle' : 'Blocked', furnOn ? 'beams' : rawLeft() === 0 ? 'no scrap or ore' : furnOps().length < 2 ? 'needs two operators' : 'cooling bed full'] })]] : [])];
  return `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Lines</b><small>Rate now, best rate and the cause</small></div></div><div class="kv">${lines.map(([n, cyc, k, on, why]) => { const best = 60 / (cyc / k()), now = on() ? best * pf() : 0, r = why(); return `<span>${n}</span><span class="${on() ? 'ok' : 'badt'}">${now.toFixed(0)} / ${best.toFixed(0)} a min · ${on() ? 'running' : `${r.label[1]}: ${r.label[2]}`}</span>`; }).join('')}</div></div>`; }
function coverHtml(){ if (S.level < 3) return ''; const use = 60, stockVal = S.store * 11 + S.timber * 11 + S.coils * 65 + S.pallet * 10 + S.pipes * 16 + (S.tools || 0) * 11, kept = S.order ? Math.min(S.pallet, S.order.qty || 0) + Math.min(S.pipes, S.order.pq || 0) : 0;
  return `<div class="dept"><div class="dept-h"><span class="ic">${icon('boxes')}</span><div><b>Stock at a glance</b><small>On hand, kept for orders, on the way, days of cover, cash tied up</small></div></div><div class="kv"><span>Timber on hand</span><span>${S.store + S.timber} planks · ${((S.store + S.timber) / use).toFixed(1)} days</span><span>Coils on hand</span><span>${S.coils}</span><span>Goods kept for the order</span><span>${kept}</span><span>On the way</span><span>${S.delivery ? `${S.delivery.left ?? ''} ${S.delivery.kind === 'steel' ? 'coils' : 'planks'} on the flatbed` : 'Nothing'}</span><span>Cash tied up in stock</span><span>${fmt(stockVal)}</span>
    <span>Reorder warning below (planks)</span><span class="stepper"><button class="btn" data-reorder="-6" type="button" aria-label="Six planks fewer">−</button><b>${S.reorderT ?? 12}</b><button class="btn" data-reorder="6" type="button" aria-label="Six planks more">+</button></span>${S.l8 && S.l8.contract ? '<span>Scrap and ore</span><span class="note">Dolores reorders by herself</span>' : ''}</div></div>`; }
function updateReorder(){ if (S.level < 3 || timberFree()) return; const t = S.reorderT ?? 12, have = S.store + S.timber; if (have >= t) { S.reorderWarned = false; return; }
  if (S.l8 && S.l8.contract && !S.delivery) { orderTimber(24); toast('Dolores Marsh\'s contract: 24 planks reordered at the fixed price.', ''); return; }
  if (!S.reorderWarned) { S.reorderWarned = true; toast(`Timber is below your reorder line (${t} planks). Order more in the office (Stock).`, 'bad'); } }
function settingsHtml(){ return `<div class="dept"><div class="dept-h"><span class="ic">${icon('gear')}</span><div><b>Settings</b><small>Sound, haptics and motion</small></div></div><div class="kv">
  <span>Effects</span><span><input type="range" min="0" max="100" value="${Math.round((S.fxVol ?? 1) * 100)}" data-set="fxVol" aria-label="Effects volume"></span>
  <span>Music</span><span><input type="range" min="0" max="100" value="${Math.round((S.musicVol ?? 1) * 100)}" data-set="musicVol" aria-label="Music volume"></span>
  <span>Haptics</span><span><button class="btn" data-toggle="haptics" type="button">${S.haptics ? 'On' : 'Off'}</button></span>
  <span>Reduced motion</span><span><button class="btn" data-toggle="reduced" type="button">${S.reduced ?? REDUCED ? 'On' : 'Off'}</button></span></div></div>`; }
/* =====================================================================
   TUTORIAL + OBJECTIVES
   ===================================================================== */
const posOf = role => { const c = staffOf(role)[0]; return c ? [c.o.position.x, c.o.position.z] : null; };
const posOfC = c => c ? [c.o.position.x, c.o.position.z] : null;
// Level Bible, level 1: the owner alone. Gus Mallory walks him through the first order by hand, then the first
// two hires take the saw and the carrying off his hands.
const ownerCrates = () => owner && owner.carryType === 'crate' ? owner.stack.length : 0;
const TUT = [   // day one (Gameplay Bible, level 1): the owner and old Gus open the gates; the owner works the first order, then hires and posts the crew
  { t:'The phone is ringing in the workshop office. Take the order', at:() => P.deskRing, alert:true, done:() => !!S.order || S.delivered > 0,
    text:() => S.call ? 'The phone is ringing in the workshop office. Take the order' : 'Wait for the phone to ring', gus:'That\'s the telephone in the office. Go on, answer it.' },
  { t:'Stand at the crate machine: you run it yourself', at:() => P.op, done:() => (S.order && S.order.cut >= S.order.qty) || S.delivered > 0,
    text:() => sawBy === owner ? `Making crates: ${S.order ? S.order.cut : 0} / ${S.order ? S.order.qty : 0}. Stay at the machine` : 'Stand on the white spot at the crate machine: you run it yourself', gus:'Stand at the machine and she runs. Your grandfather did it the same way.' },
  { t:'Pick up the crates at the output pallet', at:() => P.pallet, done:() => ownerCrates() > 0 || S.bed > 0 || S.delivered > 0, gus:'Grab the crates off the pallet. Two in your arms, or fetch a trolley from the bay and take five.' },
  { t:'Carry the crates to the truck', at:() => P.drop, done:() => (S.order && S.order.ready) || S.delivered > 0,
    text:() => truck.state !== 'docked' ? 'The customer\'s truck is on its way. Wait in the loading bay' : ownerCrates() ? `Load the truck: stand beside it at the yellow ring (${S.bed} / ${S.order ? S.order.qty : 0})` : `Fetch more crates from the pallet (${S.bed} / ${S.order ? S.order.qty : 0} on the truck)`,
    atFn:() => truck.state === 'docked' && !ownerCrates() && S.pallet > 0 ? P.pallet : P.drop, gus:'Stand by the truck and they go on the bed.' },
  { t:'Sign the delivery note at the truck', at:() => P.drop, done:() => S.delivered > 0, gus:'Sign the note and the money\'s yours.' },
  { t:'Collect the payment', at:() => P.cash, done:() => S.cashPile === 0 && S.delivered > 0, gus:'Pick up the cash before the wind does.' },
  { t:'Hire an operator in the office', at:() => P.deskRing, done:() => hasRole('operator'), gus:'You can\'t do it all yourself. Hire an operator for the machine.' },
  { t:'Walk your operator to the crate machine', atFn:() => leadTarget('operator'), done:() => S.staff.some(x => x.role === 'operator' && x.posted !== false),
    text:() => leadText('operator', 'the crate machine'), gus:'Show the new hand the machine. Walk over and they\'ll follow you.' },
  { t:'Hire a loader in the office', at:() => P.deskRing, done:() => hasRole('loader'), gus:'And a loader to carry the crates to the truck.' },
  { t:'Walk your loader to the output pallet', atFn:() => leadTarget('loader'), done:() => S.staff.some(x => x.role === 'loader' && x.posted !== false),
    text:() => leadText('loader', 'the output pallet'), gus:'There. Now you run the business and they run the yard.' },
];
function leadTarget(role){ const st = S.staff.find(x => x.role === role && x.posted === false), c = st && staffObj.get(st.id); return !c ? P.deskRing : c.follow ? (role === 'operator' ? P.op : P.pallet) : [c.o.position.x, c.o.position.z]; }
function leadText(role, where){ const st = S.staff.find(x => x.role === role && x.posted === false), c = st && staffObj.get(st.id); return !c ? `Walk your ${role} to ${where}` : c.follow ? `${st.name} is following you. Lead them to ${where}` : `Walk up to ${st.name} at the gate: they follow you to ${where}`; }
let tutWait = 0, gusT = 0;
function updateTutorial(dt){
  if (S.tutDone) return;
  const s = TUT[Math.min(S.tut, TUT.length - 1)], gus = folk.get('gus');
  gusT -= dt; if (gus && gusT <= 0 && s.gus) { gusT = 7; gus.say = { text:s.gus, until:T + 4.5 }; gus.play('point'); }
  if (s.done()) { S.tut++; gusT = .8; tutWait = 0;
    if (S.tut >= TUT.length) { S.tutDone = true; placeFolk(); toast('The crew does the work now. You take the calls, sign the notes and run the business.', 'gold'); if (gus) gus.say = { text:'Your grandad would be proud. Now finish the charter.', until:T + 5 }; }
    save(); }
}
const timberLow = () => !timberFree() && !S.delivery && S.store + S.timber + S.feed < 12;
let showUpg = null;
// a land deal's next step for the objective line: the sign to stand at, the permit, the site work
function plotBeat(id){
  const p = S.plots[id], pl = PLOTS[id], who = PEOPLE[pl.seller].name;
  if (S.level < pl.lv || p.st >= 3) return null;
  if (p.st === 1) return { t:`Council permit for the ${pl.name}: ${Math.max(0, Math.ceil(p.permit - p.t))} s`, at:null };
  if (p.st === 2) return { t:`Big Tom's crew is preparing the ${pl.name}: ${Math.floor(p.t / ACT_TIMERS.site * 100)}%`, at:pl.sign };
  if (S.cash < offerPrice(id, 'neg')) return null;
  return { t:`${who} is selling the ${pl.name}. Stand at the sign to see the offers`, at:pl.ring, alert:S.cash >= offerPrice(id, 'pay') };
}
function objective(){
  if (showUpg && T < showUpg.until && !officeOpen) return { t:`New: ${showUpg.name}. Take a look`, at:showUpg.at };
  if (trip && trip.kind === 'night') return { t:trip.phase === 'back' || trip.phase === 'park' ? '07:00: driving in to open up the works' : trip.phase === 'away' ? 'Night: you have gone home. Bolt keeps watch' : '17:00: driving home for the night', at:null };
  if (trip) { const d = trip.kind === 'ad' ? ADS[trip.key] : PLACES[trip.key], left = Math.max(0, Math.ceil(trip.min * .8 - trip.t));
    return { t:trip.phase === 'wait' ? 'Waiting for the lorry to clear the gateway' : trip.phase === 'away' ? `On the road to ${d.name} (${left} s). Gus is minding the yard` : trip.phase === 'home' ? `Driving back from ${d.name} (${left} s)` : trip.phase === 'out' ? `Driving out to ${d.name}` : 'Back at the works: parking the car', at:null }; }
  if (S.tutDone && S.day && S.day.closing) { const N = S.day.closing.night || {}; return { t:S.day.closing.shut ? (N.kind === 'office' ? 'Night: you sleep in the office. Bolt keeps watch' : 'Night: you have gone home. Bolt keeps watch') : N.st === 'walk' || N.st === 'cart' ? (N.kind === 'office' ? '17:00: off to the office to sleep' : '17:00: off home in the car') : '17:00: the crew is clocking off. Finish what is in your hands: no new work after the whistle', at:null }; }
  if (!S.tutDone) { const s = TUT[Math.min(S.tut, TUT.length - 1)]; return { t:s.text ? s.text() : s.t, at:s.atFn ? s.atFn() : s.at && s.at(), alert:s.alert }; }
  const und = S.faults.find(f => !f.diag);
  const guided = S.faults.find(f => f.guided);
  if (guided) return { t:`${FAULTS[guided.kind].name}! Stand in the red ring to fix it by hand (${Math.round(guided.prog * 100)}%)`, at:WHERE[guided.where].spot(), alert:true };
  if (und && !hasRole('supervisor')) return { t:`${faultSymptom(und)}. Go and inspect the ${WHERE[und.where].name}`, at:WHERE[und.where].spot(), alert:true };
  const orphan = S.faults.find(f => f.diag && !fixerOn(FAULTS[f.kind].trade) && !f.contractor);
  if (orphan && orphan.kind !== 'powercut') { const tr = FAULTS[orphan.kind].trade, cost = hireCost(tr); return { t:S.cash >= cost && capOf(tr) > 0 ? `${FAULTS[orphan.kind].name}: fix it yourself in the red ring, or hire ${tr === 'electrician' ? 'an electrician' : 'a mechanic'} in the office` : `${FAULTS[orphan.kind].name}: fix it yourself in the red ring, or a contractor comes in ${Math.max(0, Math.ceil(60 - orphan.diagT))} s`, at:WHERE[orphan.where].spot(), alert:true }; }
  if (S.power.fuel <= 0) return { t:'Out of diesel: your loader is fetching some', at:null, alert:true };
  if (S.call) return { t:`The office phone is ringing: ${S.call.client}. Take the order`, at:P.deskRing, alert:true };
  const wb = walkBeat(); if (wb) return wb;
  const sp = ownerSurplus(); if (sp) return sp;
  if (S.blade && owner.o.visible) return { t:`The crate machine's blade is blunt (60% speed). Stand at the side of the machine to fit a new one (${fmt(BLADE_COST)})`, at:P.sawFix, alert:true };
  if (!owner.cart && ownerCrates() >= HAND_CRATES && S.pallet > 0 && freeCart() && near(owner.o, P.pallet, 1.6) && ((!loadersHired() && needCrates() - truckCrates() > 0) || walkWant('crate') > HAND_CRATES)) { const k = freeCart(); return { t:'Two crates is all you can carry by hand. Take a trolley from the trolley bay for more', at:cartSpot(k.slot) }; }
  if (S.order && !S.order.briefed) { const sp = supervisor(), op = orderOp(S.order); return sp ? { t:`${sp.st.name} is coming to take the order from you`, at:null } : op ? { t:`Brief ${op.st.name} at the ${op.st.mach === 'pipe' ? 'pipe mill' : op.st.mach === 'tool' ? 'tool press' : 'saw'} about the new order`, at:posOfC(op) } : { t:'Stand at the saw to start the order', at:P.op }; }
  if (S.store + S.timber + S.feed === 0 && !S.delivery) return { t:'Out of timber! Order more in the office (Stock)', at:P.deskRing, alert:true };
  if (timberLow()) return { t:`Timber is running low (${S.store + S.timber + S.feed} planks). Order more in the office`, at:P.deskRing };
  if (S.order && S.order.ready && !hasRole('supervisor')) return { t:'Truck loaded. Sign the delivery note at the dock', at:P.drop };
  const slack = [...staffObj.values()].find(c => c.state === 'slack');
  if (slack && !hasRole('supervisor')) return { t:`${slack.st.name} is slacking. Go and check on them`, at:[slack.o.position.x, slack.o.position.z], alert:true };
  if (S.levelUp) return S.level < MAX_LEVEL ? { t:`Charter complete! Tap the level card to open level ${S.level + 1}`, at:null, alert:true } : { t:`Level ${S.level + 1} opens in the next build. Keep the orders moving.`, at:null };
  // level 5 beats (Bible v2.0 8): Ada's corner plot, the second pipe mill, dock 2 and the white lorry, the Friday accounts
  if (S.level >= 8 && M.l8Built) { const L = S.l8;
    if (rail && rail.st === 'sign') return { t:'The train is in: sign for the wagons at the back gate', at:SIGN_RING, alert:true };
    if (!L.hd) return { t:'Make the heavy-duty supply live: its pad in the forklift yard', at:[-25.0, -3.0], alert:S.cash >= 25000 };
    if (!L.lit) return { t:'Light the furnace: its pad in the forklift yard', at:[-19.0, -2.9], alert:true };
    if (furnOps().length < 2 && staffOf('operator').length < capOf('operator')) return { t:'Hire two operators for the furnace (Staff)', at:P.deskRing, alert:true };
    if (L.krane.st === 1) return { t:`Victor Krane is bidding for the dairy plot: buy it at the pad by the east fence (${Math.max(0, Math.ceil((L.krane.end - S.time) / 60))} min left)`, at:DAIRY_PAD, alert:true };
    if (rawLeft() === 0) return { t:'The furnace is starved: buy at the spot price (Machines) or wait for the train', at:P.deskRing, alert:true };
    if (L.zonesShown && !L.pad) return { t:'Choose the beam store\'s build zone: A, B or C (Machines)', at:P.deskRing }; }
  if (S.level >= 7 && M.l7Built) { const L = S.l7;
    if (L.siding === 1 && cyrus && cyrus.state === 'wait') return { t:'Cyrus Bell is waiting at the North field\'s back fence to walk the siding', at:SURVEY_RING, alert:true };
    if (L.siding === 1) return { t:'Cyrus Bell is pegging out the siding behind the back fence', at:null };
    if (!S.order && !S.call && truck.state === 'away' && L.board.some(c => c.dock === 1)) return { t:'Dock 1 is free: pick an order off the board on the office wall', at:BOARD_RING, alert:true };
    if (staffOf('supervisor').length < capOf('supervisor') && S.level >= 7 && staffOf('supervisor').length >= 1) return { t:'Promote a second supervisor (Staff) and lead them to a post: two zones', at:P.deskRing };
    const s2 = staffOf('supervisor')[1]; if (s2 && !s2.st.post && s2.state === 'follow') return { t:`Walk to where the second zone should be and stand still: ${s2.st.name} takes post there`, at:null }; }
  if (S.level >= 6 && M.l6Built) { const L = S.l6, R = L.refit;
    if (!S.staff.some(x => x.role === 'clerk') && capOf('clerk') > 0) return { t:`Take June Finch on as your clerk (Staff${hireCost('clerk') ? ', ' + fmt(hireCost('clerk')) : ', no fee'})`, at:P.deskRing, alert:S.cash >= hireCost('clerk') };
    if (R && R.k === 'saw' && crane) return { t:crane.st === 'in' ? 'The mobile crane is turning in at the main gate' : craneHail() ? 'Hail: the crane waits for it to pass' : 'The crane is swapping in the tier 2 crate machine', at:CRANE_AT };
    if (R && R.k === 'saw' && R.st === 'book') return { t:'The crane is booked from Valley Plant Hire', at:null };
    if (R && R.st === 'fit') return { t:`Big Tom's crew is refitting the ${REFIT[R.k].name.toLowerCase()}: ${Math.floor((R.t || 0) / REFIT_T * 100)}%`, at:REFIT[R.k].at() };
    const due = Object.keys(REFIT).find(k => REFIT[k].has() && svcDue(k)); if (due && !hasRole('mechanic')) return { t:`Service due on the ${REFIT[due].name.toLowerCase()}: stand in its amber ring (16 s, one spare part)`, at:REFIT[due].fix() };
    if ((L.refits || 0) < 3 && !R) { const k = Object.keys(REFIT).find(k => REFIT[k].has() && tierOf(k) < 2); if (k && S.cash >= REFIT[k].price) return { t:'Choose a machine for its tier 2 refit (office, Machines)', at:P.deskRing, alert:true }; }
    if (L.insp === 1) return { t:'Mr Hollins, the factory inspector, is walking the yard', at:insp6 ? [insp6.o.position.x, insp6.o.position.z] : null }; }
  if (S.level >= 5 && M.l5Built) { const o2 = S.order2, A = S.l5;
    if (A.acc && !A.acc.paid && S.cash >= A.acc.total) return { t:`Pay the week's accounts (${fmt(A.acc.total)}) at the office block`, at:P.officeDoor, alert:!!A.acc.missed };
    if (o2 && o2.ready && truckB.state === 'docked' && !hasRole('supervisor')) return { t:'Dock 2 is loaded: sign the note on its deck', at:P.drop2 };
    if (S.plots.shop.st === 0) { const ps = plotBeat('shop'); if (ps) return ps; }
    if (S.plots.shop.st >= 1 && !A.mill2) return { t:`Install the second pipe mill on Ada's corner plot: stand on its pad (${fmt(MILL2_PRICE)})`, at:[15.5, 22.4], alert:S.cash >= MILL2_PRICE };
    if (A.mill2 === 1) return { t:`Big Tom's crew is installing the second pipe mill: ${Math.floor(A.mill2T / MILL2_BUILD * 100)}%`, at:P.mill2 };
    if (mill2Ready() && !pipe2Op()) return { t:`Hire an operator for the second pipe mill (${fmt(hireCost('operator'))})`, at:P.deskRing, alert:S.cash >= hireCost('operator') };
    if (o2 && truckB.state === 'docked' && S.l5.rack2 === 0 && !mill2On) return { t:'Dock 2 is waiting for pipes: keep the second mill running', at:P.mill2 };
  }
  // level 4 beats (Level Bible): the second crate machine and the forklift, the promoted supervisor and the post,
  // Generator Mk III when four machines overload Mk II, the road frontage permit
  if (S.level >= 4) {
    const sup = supervisor();
    if (sup && sup.state === 'follow') return { t:`${sup.st.name} follows you: walk to where the crew needs watching (between the machines) and stand still`, at:zoneHint(), alert:true };
    if (S.order && S.order.guided4 && !hasRole('supervisor')) return { t:'A 70-piece order: promote a worker to supervisor in the office (Staff)', at:P.deskRing, alert:true };
    if (S.plots.scrap.st < 3) { const ps = plotBeat('scrap'); if (ps) return ps; }
    if (!S.lv4.saw2 && S.plots.scrap.st >= 3) { const free = S.perks.freeCrateMachine; return { t:`Install the second crate machine in the forklift yard: stand on the pad (${free ? 'free: Rusty\'s old machine' : fmt(SAW2_PRICE)})`, at:PADS.find(p => p.id === 'saw2').at, alert:free || S.cash >= SAW2_PRICE }; }
    if (S.lv4.saw2 === 1) return { t:`Big Tom's crew is installing the second crate machine: ${Math.floor(S.lv4.saw2T / SAW2_BUILD * 100)}%`, at:P.saw2 };
    if (saw2Ready() && !saw2Op()) return { t:`Hire an operator for the second crate machine (${fmt(hireCost('operator'))})`, at:P.deskRing, alert:S.cash >= hireCost('operator') };
    if (saw2Ready() && !hasRole('forklift')) return { t:`Hire a forklift driver (${fmt(hireCost('forklift'))}): the yard's crates and timber go by forklift`, at:P.deskRing, alert:S.cash >= hireCost('forklift') };
    if (overloaded() && (S.up.gen3 || 0) < upSteps(UPGRADES.find(u => u.id === 'gen3'))) return { t:`Four machines overload the generator (${load().toFixed(1)} / ${genKW()} kW): buy Generator Mk III (Upgrades)`, at:P.gen, alert:true };
    if (!hasRole('supervisor') && S.staff.length >= 5) return { t:'Promote your best worker to supervisor (office, Staff)', at:P.deskRing };
    const pr = plotBeat('road'); if (pr) return pr;
  }
  // level 3 beats: buy the field, install the press, staff it, give it steel, keep spare parts, get the licence
  if (S.level >= 3) {
    const pn = plotBeat('north'); if (pn) return pn;
    if (S.lv3.press === 0) return { t:`Install the tool press on the North field: stand on the pad (${fmt(PRESS_PRICE)})`, at:[14.0, -13.5], alert:S.cash >= PRESS_PRICE };
    if (S.lv3.press === 1) return { t:`Big Tom's crew is installing the tool press: ${Math.floor(S.lv3.pressT / PRESS_BUILD * 100)}%`, at:P.tpress };
    if (S.lv3.jam && !hasRole('mechanic')) return { t:`Hire a mechanic in the office (${fmt(hireCost('mechanic'))}): jams and worn parts are their trade`, at:P.deskRing, alert:true };
    if (S.order && S.order.tq && !pressOp() && toolLeft() > 0) return { t:'Stand at the tool press to stamp the tools yourself, or hire an operator', at:P.top, alert:!ownerOn(P.top) };
    if (!pressOp() && S.lv3.jam) return { t:`Hire an operator for the tool press in the office (${fmt(hireCost('operator'))})`, at:P.deskRing, alert:S.cash >= hireCost('operator') };
    if (S.order && S.order.tq && steelTools() < toolLeft() && !S.delivery) return { t:'Not enough steel for these tools: order coils in the office (Stock)', at:P.deskRing, alert:true };
    if (S.parts === 0 && S.cash >= PARTS_LOT[1] + 100) return { t:'No spare parts on the shelf: repairs will crawl. Buy some in the office (Stock)', at:P.deskRing };
    if (S.lv3.licence === 3 && inspector) return { t:`Inspector Ada Hale is checking the site (${Object.keys(S.lv3.check || {}).length}/${INSPECT.length})`, at:[inspector.o.position.x, inspector.o.position.z] };
    if (S.lv3.licence === 1 && !licReady()) { const c = INSPECT.find(x => !x.ok()); return { t:`Inspector due in ${Math.max(0, Math.ceil(LICENCE_WAIT - S.lv3.licT))} s. Not ready: ${c.text.toLowerCase()}. ${c.fix}`, at:c.at(), alert:true }; }
    if (S.lv3.licence === 4) { const c = INSPECT.find(x => !x.ok()); return c ? { t:`Licence failed. Fix: ${c.text.toLowerCase()} (${c.fix})${c.id === 'fire' ? ` · wiring now ${Math.round(S.cond.wiring)}%${hasRole('mechanic') ? '' : ': hire a mechanic'}` : ''}`, at:c.at(), alert:true } : { t:`Everything is ready: book a re-inspection in the office (Town, ${fmt(REINSPECT_PRICE)})`, at:P.deskRing, alert:true }; }
    if (!S.lv3.licence && S.cash >= LICENCE_PRICE + 200) return { t:`Trading licence: check the council's list and apply in the office (Town, ${fmt(LICENCE_PRICE)})`, at:P.deskRing };
    const ps = plotBeat('scrap'); if (ps) return ps;
  }
  // level 2 beats: install the mill, staff it, feed it steel, then fix the power limit
  if (S.level >= 2) {
    if (S.lv2.mill === 0) return { t:`Level 2: install the pipe machine. Stand on its pad beside the crate machine (${fmt(MILL_PRICE)})`, at:PADS.find(p => p.id === 'mill').at, alert:S.cash >= MILL_PRICE };
    if (S.lv2.mill === 1) return { t:`The contractor is installing the pipe mill: ${Math.floor(S.lv2.buildT / MILL_BUILD * 100)}%`, at:P.pmill };
    if (!pipeOp()) return { t:`Hire an operator for the pipe mill in the office (${fmt(hireCost('operator'))})`, at:P.deskRing, alert:S.cash >= hireCost('operator') };
    if (steelPipes() === 0 && !S.delivery) return { t:'No steel for the pipe mill. Order coils in the office (Stock)', at:P.deskRing, alert:true };
    if (S.order && S.order.pq && steelPipes() < pipeLeft() && !S.delivery) return { t:`Not enough steel for this order: order coils in the office (Stock)`, at:P.deskRing, alert:true };
    if (S.lv2.wh === 1) return { t:`The contractor is building the warehouse: ${Math.floor(S.lv2.whT / WH_BUILD * 100)}%`, at:P.wh };
    if (!S.up.gen2 && overloaded()) return { t:`The generator is overloaded (${load().toFixed(1)} / ${genKW()} kW). Buy Generator Mk II in the office`, at:P.gen, alert:true };
    const pn = plotBeat('north'); if (pn) return pn;
  }
  if (S.cashPile > 0 && !(typeof clerkOn === 'function' && clerkOn())) return { t:`Collect ${fmt(S.cashPile)} by the dock`, at:P.cash };
  if (S.tutDone && !S.order && !S.call && !(S.book && S.book.length) && S.level <= 2 && M.car) return { t:sales().trips ? 'No work on the books: drive into town and find some (stand by grandad\'s car)' : 'Nobody knows the works is open: take grandad\'s car into town and find work (stand by the car)', at:P.carDoor, alert:!sales().trips };
  if (WELFARE && S.tutDone && S.water === 0 && S.cooler <= 5) return { t:'The water is running out: buy bottles in the office (Stock)', at:P.deskRing, alert:true };
  if (WELFARE && S.tutDone && S.wcClean < 30 && !hasRole('cleaner') && S.cash >= hireCost('cleaner')) return { t:`The washroom is filthy. Hire a cleaner in the office (${fmt(hireCost('cleaner'))})`, at:P.deskRing, alert:true };
  if (WELFARE && S.tutDone && PG.stallsNeeded(S.staff.length) > stallCount() && S.up.wc < upSteps(UPGRADES.find(u => u.id === 'wc'))) return { t:'Your crew has outgrown the washroom: buy another stall (Upgrades)', at:P.deskRing };
  const ready = S.staff.find(xpReady); if (ready && S.cash >= PG.trainCost(ready.lv)) return { t:`${ready.name} can be trained. Visit the office.`, at:P.deskRing };
  for (const r of ['mechanic', 'electrician', 'supervisor']) if (!hasRole(r) && capOf(r) > 0 && S.cash >= hireCost(r) && (r !== 'mechanic' || S.mechIntro || S.delivered >= 2)) return { t:`Hire a ${ROLE[r].title.toLowerCase()} in the office (${fmt(hireCost(r))})`, at:P.deskRing };
  const loaders = S.staff.filter(s => s.role === 'loader').length;
  if (loaders < capOf('loader') && (loaders < 2 || millReady()) && S.cash >= hireCost('loader') + 50) return { t:`Hire ${loaders === 0 ? 'a' : loaders === 1 ? 'a second' : 'a third'} loader in the office`, at:P.deskRing };
  const pad = visiblePads().find(p => S.cash >= Math.min(p.price, 40)); if (pad && (pad.id === 'yard' || S.cash >= pad.price * .6)) return { t:`Stand on the pad: ${pad.label}`, at:pad.at };
  const line = charter().find(c => !lineDone(c)); if (line) return { t:`Charter: ${line.text} (${lineText(line)})`, at:null };
  if (S.order && !S.order.ready && orderLeft() > 0 && sawOn && !ownerFeeds() && S.level <= 2) return { t:'Lend a hand: feed planks at the crate machine (+25% speed), or wheel crates to the lorry', at:P.feedRing };
  return { t:'Keep the orders moving', at:null };
}

/* =====================================================================
   GUIDE ARROW
   ===================================================================== */
let guide, guideFoot;
function buildGuide(){
  const shape = new THREE.Shape(); shape.moveTo(-.22, .25); shape.lineTo(.22, .25); shape.lineTo(.22, 0); shape.lineTo(.42, 0); shape.lineTo(0, -.42); shape.lineTo(-.42, 0); shape.lineTo(-.22, 0); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth:.12, bevelEnabled:false }); g.translate(0, 0, -.06);
  guide = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color:'#e2b54a', roughness:.35, metalness:.55, emissive:'#5a4210', emissiveIntensity:.35 })); guide.position.y = 2; scene.add(guide);
  const fs = new THREE.Shape(); fs.moveTo(0, .5); fs.lineTo(.26, .1); fs.lineTo(.1, .14); fs.lineTo(.1, -.1); fs.lineTo(-.1, -.1); fs.lineTo(-.1, .14); fs.lineTo(-.26, .1); fs.closePath();
  guideFoot = new THREE.Mesh(new THREE.ShapeGeometry(fs), new THREE.MeshBasicMaterial({ color:'#e8ab2c', transparent:true, opacity:.85, depthWrite:false })); guideFoot.rotation.x = -Math.PI / 2; guideFoot.renderOrder = 4; scene.add(guideFoot);
}
// the cash box's bottom edge, read at most twice a second (a read each frame forced a layout each frame)
let mbY = 0, mbT = -9; function moneyBottom(){ if (T - mbT > .5 || T < mbT) { mbT = T; mbY = $('money').getBoundingClientRect().bottom; } return mbY; }
// The way to the next job (reference: an arcade-idle guide). A dashed orange trail on the ground follows the real walking
// route from the owner to the target and flows towards it; a ring pulses at the target and the arrow bobs over it; when the
// target is off the screen a round arrow at the edge of the screen points the way. Red for an alert, orange otherwise.
const TRAIL_N = 70, TRAIL_GAP = .62; let trail = null, trailPath = null, trailKey = '', trailT = 0, guideRing = null;
function buildTrail(){
  const g = new THREE.PlaneGeometry(.34, .13); g.rotateX(-Math.PI / 2);
  trail = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color:'#f08a24', transparent:true, opacity:.92, depthWrite:false, toneMapped:false }), TRAIL_N); trail.frustumCulled = false; trail.renderOrder = 5; trail.count = 0; scene.add(trail);
  guideRing = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 40), new THREE.MeshBasicMaterial({ color:'#f08a24', transparent:true, depthWrite:false, toneMapped:false })); guideRing.rotation.x = -Math.PI / 2; guideRing.renderOrder = 5; scene.add(guideRing);
}
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _ts = new THREE.Vector3(1, 1, 1), _tp = new THREE.Vector3(), _ty = new THREE.Vector3(0, 1, 0);
let guideHere = false;
function updateGuide(o){
  if (!trail) buildTrail();
  // the arrow is for events in the yard only (sign a lorry, brief a new order, a gate customer, land for sale, a new pad or
  // unlock, a sales trip): never for office work such as hiring or training, and no line on the ground, just the arrow
  const ev = o && o.at && !(o.at === P.deskRing || (Math.abs(o.at[0] - P.deskRing[0]) < .01 && Math.abs(o.at[1] - P.deskRing[1]) < .01)) && !/office|train/i.test(o.t || '');
  const at = ev ? o.at : null, show = !!at && !officeOpen && !cardOpen && !trip && owner && owner.o.visible, col = o && o.alert ? '#b3412e' : '#e2b54a';
  guide.visible = !!at && !officeOpen; guideFoot.visible = false; trail.visible = false; guideRing.visible = show; const edge = $('guideEdge');
  if (!at) { if (edge) edge.hidden = true; return; }
  // the owner is already on the spot and doing it: no arrow, no pulsing ring; step off and they come back (a little
  // hysteresis so standing on the ring's edge does not make them flicker)
  { const op0 = owner.o.position, dh = Math.hypot(at[0] - op0.x, at[1] - op0.z); guideHere = dh < (guideHere ? .95 : .6);
    if (guideHere) { guide.visible = false; guideRing.visible = false; if (edge) edge.hidden = true; return; } }
  guide.position.set(at[0], groundY(at[0], at[1]) + 2.1 + Math.sin(T * 4) * .15, at[1]); guide.rotation.set(-.5, 0, 0); guide.material.color.set(col);
  trail.material.color.set(col); guideRing.material.color.set(col);
  const k = (T * 1.1) % 1; guideRing.position.set(at[0], groundY(at[0], at[1]) + .035, at[1]); guideRing.scale.setScalar(.75 + k * .55); guideRing.material.opacity = .9 * (1 - k);
  // the route: the people's paths from the owner to the target, worked out again every half second or when the target changes
  const op = owner.o.position, key = at[0].toFixed(1) + ',' + at[1].toFixed(1), d0 = Math.hypot(at[0] - op.x, at[1] - op.z);
  if (key !== trailKey || T - trailT > .5) { trailKey = key; trailT = T; const p = findPath(op.x, op.z, at[0], at[1]); trailPath = [[op.x, op.z], ...p]; }
  else if (trailPath) trailPath[0] = [op.x, op.z];
  let n = 0; if (false && show && d0 > 1.3 && trailPath) { const off = (T * 1.6) % TRAIL_GAP; let carry = TRAIL_GAP - off + .5;   // starts half a metre ahead of the owner, flows towards the target
    for (let i = 1; i < trailPath.length && n < TRAIL_N; i++) { const a = trailPath[i - 1], b = trailPath[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-3) continue; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
      _tq.setFromAxisAngle(_ty, Math.atan2(-uz, ux));
      for (let s = carry; s < L && n < TRAIL_N; s += TRAIL_GAP) { const x = a[0] + ux * s, z = a[1] + uz * s; if (Math.hypot(at[0] - x, at[1] - z) < .7) { s = L; break; }
        _tp.set(x, groundY(x, z) + .03, z); _tm.compose(_tp, _tq, _ts); trail.setMatrixAt(n++, _tm); }
      carry = ((carry - L) % TRAIL_GAP + TRAIL_GAP) % TRAIL_GAP; } }
  trail.count = n; trail.instanceMatrix.needsUpdate = true;
  // off the screen: a round arrow at the edge, pointing the way (clear of the board at the top and the plates at the bottom)
  if (!edge) return; v3.set(at[0], groundY(at[0], at[1]) + .5, at[1]).project(cam); const W = innerWidth, H = innerHeight, sx = (v3.x + 1) / 2 * W, sy = (1 - v3.y) / 2 * H;
  const top = Math.min(H * .45, moneyBottom() + 70), bot = H - 120, l = 34, r = W - 34, off = sx < l || sx > r || sy < top || sy > bot;
  edge.hidden = !show || !off; if (edge.hidden) return; const cx = W / 2, cy = (top + bot) / 2, dx = sx - cx, dy = sy - cy;
  let t = Infinity; if (dx) t = Math.min(t, ((dx > 0 ? r : l) - cx) / dx); if (dy) t = Math.min(t, ((dy > 0 ? bot : top) - cy) / dy);
  edge.style.transform = `translate(${cx + dx * t}px, ${cy + dy * t}px)`; edge.firstElementChild.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`; edge.classList.toggle('alert', !!o.alert);
}

/* =====================================================================
   EFFECTS
   ===================================================================== */
const sprites = [], spritePool = [];
function sprite(col, x, y, z, vx, vy, vz, life, size, grav = 0, add = false){
  if (sprites.length > 160) return;
  let m = spritePool.pop();
  if (!m) { m = new THREE.Sprite(new THREE.SpriteMaterial({ map:TX.dot, transparent:true, depthWrite:false })); m.userData.v = new THREE.Vector3(); scene.add(m); }
  m.visible = true; m.material.color.set(col); m.material.blending = add ? THREE.AdditiveBlending : THREE.NormalBlending;
  m.position.set(x, y, z); m.scale.setScalar(size); Object.assign(m.userData, { life, t:0, size, grav }); m.userData.v.set(vx, vy, vz); sprites.push(m);
}
function puff(x, z, col = '#d8d2c4'){ for (let i = 0; i < 3; i++) sprite(col, x + rand(-.2, .2), .3, z + rand(-.2, .2), rand(-.4, .4), rand(.6, 1.2), rand(-.4, .4), .8, .5); }
function dustBurst(m = M.saw){ const d = (m.userData.dust ||= m.getObjectByName('dust_spot').getWorldPosition(new THREE.Vector3())); sprite(pick(['#d6b07a', '#c49a62', '#e2c595']), d.x + rand(-.12, .12), d.y, d.z + rand(-.05, .05), rand(-.7, .7), rand(.3, 1.1), rand(.3, 1.0), .8, .1, -2.5); }
function spark(x, y, z){ sprite('#ffd060', x + rand(-.1, .1), y, z + rand(-.1, .1), rand(-1.5, 1.5), rand(.5, 2), rand(-1.5, 1.5), .4, .12, -6, true); }
function confetti(){ const c = owner.o.position; for (let i = 0; i < 70; i++) sprite(pick(['#e8ab2c', '#9bd26f', '#6fa6d6', '#d2493a', '#ece6d9']), c.x + rand(-1, 1), 2.2, c.z + rand(-1, 1), rand(-2.5, 2.5), rand(2, 5), rand(-2.5, 2.5), 2.2, .14, -5); }
let smokeT = 0;
const deskRings = [];
function updateDeskRing(){
  if (!deskRings.length) for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color:'#7fb6ec', transparent:true, depthWrite:false, side:THREE.DoubleSide, toneMapped:false }));
    m.rotation.x = -Math.PI / 2; m.position.set(P.desk[0] + .3, .9, P.desk[1]); m.renderOrder = 6; m.userData.dyn = true; world.add(m); deskRings.push(m); }
  for (let i = 0; i < deskRings.length; i++) { const m = deskRings[i], k = ((T * .9 + i / 3) % 1); m.visible = !!S.call; m.scale.setScalar(.15 + k * .75); m.material.opacity = (1 - k) * .8; }
}
function updateFx(dt){
  updateDeskRing();
  smokeT -= dt; if (smokeT <= 0 && genActive()) { smokeT = .5; sprite('#8a8780', P.exhaust[0], P.exhaust[1], P.exhaust[2], .15, .55, 0, 2.6, .25); }
  if (S.faults.some(f => f.kind === 'junction') && Math.random() < dt * 6) spark(P.jbox[0], 1.5, .2);
  for (let i = sprites.length - 1; i >= 0; i--) { const s = sprites[i], u = s.userData; u.t += dt; u.v.y += u.grav * dt; s.position.addScaledVector(u.v, dt);
    if (s.position.y < .03 && u.grav) { s.position.y = .03; u.v.set(0, 0, 0); }
    const k = u.t / u.life; s.material.opacity = Math.max(0, 1 - k) * (u.grav ? 1 : .55); if (!u.grav) s.scale.setScalar(u.size * (1 + k * 2.4));
    if (u.t > u.life) { s.visible = false; sprites.splice(i, 1); spritePool.push(s); } }
  const lit = circuitOn('lights'), p = powerOn();
  hemi.intensity = (lit ? (S.restored.lights ? 1.15 : 1.0) : .82) * (p ? 1 : .9); sun.intensity = lit ? (S.restored.lights ? 2.15 : 1.9) : 1.6;
  if (wx.light) { const L = wx.light; hemi.intensity *= L.hemi; sun.intensity *= L.sun; sun.color.copy(SUN_COL).multiply(L.tint); renderer.toneMappingExposure = 1.12 * L.exp; hemi.intensity += wx.flash * 1.6; }   // v2.0 17: the weather's light, and the lightning flash
  const pos = M.dust.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) + dt * .05, x = pos.getX(i) + Math.sin(T * .3 + i) * dt * .05; if (y > 3.3) y = .3; pos.setXY(i, x, y); } pos.needsUpdate = true;
  for (const [k, r] of Object.entries(M.rings)) { if (k.startsWith('f')) { r.m.material.opacity = .7 + Math.sin(T * 7) * .25; r.f.material.opacity = .15; continue; }
    const want = k === 'drop' ? !!(S.order && S.order.ready) : k === 'cash' ? S.cashPile > 0 : true; r.m.material.opacity = want ? .75 + Math.sin(T * 6) * .2 : .3; r.f.material.opacity = want ? .16 : .05; }
  syncPads(); syncFaultRings(); updatePowerFx(); updateBeacons();
}

/* =====================================================================
   AUDIO (synthesised)
   ===================================================================== */
let AC = null;
// Playables: YouTube's mute wins over everything, and nothing plays while the game is paused
let ytMuted = false;
try { if (yt) ytMuted = !yt.system.isAudioEnabled(); } catch(e){}
let pageHidden = false;   // another app in front or the screen off (phone copy and preview; Playables pauses through the SDK)
const audioAllowed = () => !ytMuted && !hold && !pageHidden;
function setYtAudio(on){ ytMuted = !on; if (!AC) return; if (audioAllowed()) AC.resume().catch(() => {}); else AC.suspend().catch(() => {}); }
window.__ivAudio = () => AC ? AC.state : null;   // test hook: the audio state
function audioOn(){ if (!audioAllowed()) return; if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return; } try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
function tone(f, d, type = 'square', v = .04, delay = 0, slide){ if (!AC || !audioAllowed()) return; const t0 = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d); o.connect(g).connect(OUT || master()); o.start(t0); o.stop(t0 + d + .02); }
function noiseS(d, f, v, type = 'lowpass'){ if (!AC || !audioAllowed()) return; const n = Math.floor(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = b; fl.type = type; fl.frequency.value = f; g.gain.value = v; s.connect(fl).connect(g).connect(OUT || master()); s.start(); }
function sfx(n, vol = 1){ if (!AC || paused) return; ({ pick:() => { tone(520, .06, 'triangle', .05 * vol); buzz(12); }, drop:() => tone(190, .08, 'square', .035 * vol), coin:() => tone(1180 + Math.random() * 80, .06, 'square', .022),
  tick:() => tone(880, .03, 'square', .012), buy:() => { tone(523, .1, 'triangle', .07); tone(659, .1, 'triangle', .07, .09); tone(784, .2, 'triangle', .07, .18); },
  horn:() => { tone(220, .25, 'sawtooth', .03); tone(277, .25, 'sawtooth', .03, .02); }, saw:() => noiseS(.22, 3200, .03, 'bandpass'), clank:() => { noiseS(.05, 2600, .1 * vol); tone(160, .08, 'square', .03 * vol); },
  alarm:() => { tone(660, .16, 'square', .05); tone(520, .16, 'square', .05, .2); tone(660, .16, 'square', .05, .4); }, fix:() => { tone(392, .08, 'triangle', .08); tone(784, .18, 'triangle', .08, .08); },
  hire:() => { tone(523, .08, 'triangle', .07); tone(659, .08, 'triangle', .07, .08); tone(784, .16, 'triangle', .07, .16); }, tap:() => tone(320, .04, 'square', .02), bark:() => { tone(300 + Math.random() * 40, .08, 'sawtooth', .045 * vol, 0, 170); noiseS(.07, 1100, .045 * vol, 'bandpass'); },
  ring:() => { for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) tone(i % 2 ? 1180 : 1320, .06, 'square', .05, r * .62 + i * .075); }, beep:() => tone(1050, .14, 'square', .02),
  nail:() => { noiseS(.035, 5200, .07 * vol, 'highpass'); tone(115, .06, 'square', .035 * vol); }, thunk:() => { noiseS(.09, 420, .12 * vol); tone(70, .1, 'sine', .07 * vol); },
  levelup:() => { tone(523, .1, 'triangle', .06); tone(784, .2, 'triangle', .06, .1); }, level:() => [262, 330, 392, 523].forEach((f, i) => tone(f, .45, 'sawtooth', .035, i * .12)) })[n]?.(); }

/* Positional sound (build 0.17): every machine, engine and lorry in the yard is a sound source. You hear it
   as the owner walks up to it and lose it as he walks away; it sits left or right of you as it does on screen,
   and distance dulls the top end the way air does. Engines and motors are continuous voices; a cut, a nail or a
   reversing beeper is a one-shot heard from where it happens. */
let OUT = null, MASTER = null, NOISE = null;
function master(){ if (!MASTER) { MASTER = AC.createGain(); MASTER.gain.value = 1; MASTER.connect(AC.destination); } return MASTER; }
function noiseBuf(){ if (!NOISE) { const n = AC.sampleRate * 2; NOISE = AC.createBuffer(1, n, AC.sampleRate); const x = NOISE.getChannelData(0); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1; } return NOISE; }
const earV = new THREE.Vector3();
function earOf(x, z, near = 2.2, far = 15){
  const o = owner.o.position, dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), k = clamp((d - near) / (far - near), 0, 1);
  earV.setFromMatrixColumn(cam.matrixWorld, 0); const side = dx * earV.x + dz * earV.z;
  return { g:(1 - k) * (1 - k), pan:clamp(side / 9, -.8, .8), k };
}
function sfxAt(n, x, z, vol = 1){
  if (!AC || paused) return; if (!owner) return sfx(n, vol);
  const e = earOf(x, z, 2, 16); if (e.g < .015) return;
  const g = AC.createGain(); g.gain.value = e.g; const pn = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pn) { pn.pan.value = e.pan; g.connect(pn).connect(master()); } else g.connect(master());
  OUT = g; try { sfx(n, vol); } finally { OUT = null; }
}
// a diesel engine: a sawtooth at the firing rate and a sub at half, through a low-pass, plus a clatter that pulses with the firing
function engineVoice(out, f0, rough){
  const o = AC.createOscillator(), sub = AC.createOscillator(), lp = AC.createBiquadFilter(), sg = AC.createGain(), n = AC.createBufferSource(), nb = AC.createBiquadFilter(), ng = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = f0; sub.type = 'square'; sub.frequency.value = f0 / 2; sg.gain.value = .3;
  lp.type = 'lowpass'; lp.frequency.value = f0 * 5; lp.Q.value = 2.5;
  n.buffer = noiseBuf(); n.loop = true; nb.type = 'bandpass'; nb.frequency.value = 850; nb.Q.value = .8; ng.gain.value = rough;
  lfo.type = 'square'; lfo.frequency.value = f0 / 4; lg.gain.value = rough * .85; lfo.connect(lg).connect(ng.gain);
  o.connect(lp); sub.connect(sg).connect(lp); lp.connect(out); n.connect(nb).connect(ng).connect(out);
  [o, sub, n, lfo].forEach(x => x.start());
  return { f(hz, tau = .35){ const t = AC.currentTime; o.frequency.setTargetAtTime(hz, t, tau); sub.frequency.setTargetAtTime(hz / 2, t, tau); lfo.frequency.setTargetAtTime(hz / 4, t, tau); lp.frequency.setTargetAtTime(hz * 5, t, tau); } };
}
// an electric machine: the motor's whine rising with its speed, mains hum, and a blade or belt hiss while it cuts
function motorVoice(out, top = 120, hiss = 2600){
  const o = AC.createOscillator(), lp = AC.createBiquadFilter(), hum = AC.createOscillator(), hg = AC.createGain(), mg = AC.createGain(), n = AC.createBufferSource(), bp = AC.createBiquadFilter(), ng = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = 15; lp.type = 'lowpass'; lp.frequency.value = 650; hum.type = 'sine'; hum.frequency.value = 100; hg.gain.value = .45; mg.gain.value = 0;
  n.buffer = noiseBuf(); n.loop = true; bp.type = 'bandpass'; bp.frequency.value = hiss; bp.Q.value = 2.2; ng.gain.value = 0;
  o.connect(lp).connect(mg); hum.connect(hg).connect(mg); mg.connect(out); n.connect(bp).connect(ng).connect(out);
  [o, hum, n].forEach(x => x.start());
  return { set(spin, cut){ const t = AC.currentTime; o.frequency.setTargetAtTime(15 + spin * (top - 15), t, .45); mg.gain.setTargetAtTime(spin * .85, t, .45); ng.gain.setTargetAtTime(cut * .8, t, .07); bp.frequency.setTargetAtTime(hiss * (.7 + .3 * spin), t, .45); } };
}
// each source: where it is, how loud it is right now (0..1) and what its voice is doing
const SOUNDS = [
  { id:'gen', vol:.075, voice:out => engineVoice(out, 50, .55), at:() => P.gen,
    tick(v){ const run = genActive(), kw = load() / Math.max(1, genKW()); v.f(run ? 50 - 3 * kw : 14, run ? .35 : 1.2); return run ? .75 + .25 * kw : 0; } },
  { id:'saw', vol:.07, voice:out => motorVoice(out, 120, 2600), at:() => P.saw,
    tick(v){ const spin = clamp((M.saw.userData.spin || 0) / 34, 0, 1); v.set(spin, sawOn && (sawT / SAW_CYCLE) % 1 > .2 && (sawT / SAW_CYCLE) % 1 < .5 ? 1 : 0); return spin > .02 ? 1 : 0; } },
  { id:'truck', vol:.08, voice:out => engineVoice(out, 30, .75), at:() => [M.truck.position.x, M.truck.position.z], tick(v, s){ return lorryTick(v, s, truck, 30); } },
  { id:'flat', vol:.07, voice:out => engineVoice(out, 34, .7), at:() => [M.flat.position.x, M.flat.position.z], tick(v, s){ return lorryTick(v, s, sup, 34); } },
  { id:'mill', vol:.065, voice:out => motorVoice(out, 95, 1700), at:() => P.pmill, tick(v){ if (!M.mill) return 0; v.set(pipeOn ? 1 : 0, pipeOn ? .6 : 0); return pipeOn ? 1 : .001; } },
  { id:'press', vol:.065, voice:out => motorVoice(out, 80, 1200), at:() => P.tpress, tick(v){ if (!M.press) return 0; v.set(toolOn ? 1 : 0, toolOn ? .4 : 0); return toolOn ? 1 : .001; } },
];
// a lorry: engine off while it waits off the map, ticking over while it stands at the dock, revving with its speed on the road
function lorryTick(v, s, V, f0){
  if (V.state === 'away') return 0;
  const Tr = V === truck ? M.truck : M.flat, p = Tr.position, sp = s.last ? Math.hypot(p.x - s.last[0], p.z - s.last[1]) / Math.max(.001, s.dt) : 0; s.last = [p.x, p.z];
  s.sp = lerp(s.sp || 0, Math.min(sp, 12), .15); v.f(f0 + s.sp * 5, .25);
  // parked at a dock: the engine ticks over a few seconds and the driver switches off while he is loaded; after the
  // knocking-off whistle it stays off (the lorry stands at the dock overnight and finishes loading in the morning)
  if (V.state === 'docked' || V.state === 'parked') { s.dockT = (s.dockT || 0) + (s.dt || 0); return closingTime() ? 0 : Math.max(0, .55 * (1 - s.dockT / 6)); }
  s.dockT = 0; return .7 + .3 * Math.min(1, s.sp / 8);
}
const _snd = new Map();
function updateAudio(dt){
  if (!AC || AC.state !== 'running' || !owner) return;
  const quiet = paused || cardOpen || hold, t = AC.currentTime;
  for (const src of SOUNDS) { let s = _snd.get(src.id);
    if (!s) { const out = AC.createGain(), lp = AC.createBiquadFilter(), pn = AC.createStereoPanner ? AC.createStereoPanner() : null; out.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 8000;
      out.connect(lp); if (pn) lp.connect(pn).connect(master()); else lp.connect(master());
      s = { out, lp, pn, v:null, dt }; _snd.set(src.id, s); }
    s.dt = dt; let lvl = 0, at = null;
    try { at = src.at(); if (at) { if (!s.v) s.v = src.voice(s.out); lvl = src.tick(s.v, s); } } catch(e) { lvl = 0; }
    let g = 0;
    if (at && lvl > 0 && !quiet) { const e = earOf(at[0], at[1]); g = src.vol * lvl * e.g; s.lp.frequency.setTargetAtTime(600 + 7400 * (1 - e.k) * (1 - e.k), t, .1); if (s.pn) s.pn.pan.setTargetAtTime(e.pan, t, .1); }
    s.out.gain.setTargetAtTime(g, t, quiet ? .05 : .15); }
}
window.__ivSound = () => Object.fromEntries([..._snd].map(([k, s]) => [k, +s.out.gain.value.toFixed(4)]));   // test hook: what each source is playing at

/* =====================================================================
   HUD, LABELS, INSPECTION CARD, TOASTS
   ===================================================================== */
const labs = new Map(), v3 = new THREE.Vector3();
function lab(key, html, x, y, z){
  let e = labs.get(key); if (!e) { e = document.createElement('div'); e.className = 'lab'; e.appendChild(document.createElement('div')); $('labels').appendChild(e); labs.set(key, e); }
  if (e._h !== html) { e.firstChild.outerHTML = html; e._h = html; }
  v3.set(x, y, z).project(cam); e.style.transform = `translate(${((v3.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - v3.y) / 2 * innerHeight).toFixed(1)}px)`; e._seen = true;
}
const STATUS_COL = { zzz:'#6fa6d6', cup:'#6fa6d6', bolt:'#ff8f80', phone:'#ffffff', wrench:'#e8ab2c', drop:'#9bd26f' };
function updateLabels(){
  for (const e of labs.values()) e._seen = false;
  if (!officeOpen) {
    if (walker) { const w = walker, c = w.c; if (w.state !== 'out') lab('walkin', `<div class="tagw ${walkPatience() - w.t < 30 && w.state === 'wait' ? 'bad' : ''}"><span class="lv" style="background:#9bd26f;color:#1b1408">CASH</span><span>${w.def.name} · ${w.n - w.got} ${w.def.want}${w.n - w.got === 1 ? '' : 's'} · ${fmt(walkPrice(w))}${w.state === 'wait' ? ` · ${Math.max(0, Math.ceil(walkPatience() - w.t))} s` : ''}</span></div>`, c.o.position.x, 1.72 + carryTop(c), c.o.position.z); }
    for (const c of [owner, ...staffObj.values(), ...temps, ...folk.values(), ...(inspector ? [inspector] : []), ...(walker ? [walker.c] : [])]) if (c.say && T < c.say.until && c.o.visible) lab('b' + (c.st ? c.st.id : 'o'), `<div class="bubble">${c.say.text}</div>`, c.o.position.x, 2.25, c.o.position.z);
    if (S.level >= 4) {
      if (M.saw2 || S.lv4.saw2) { const r = saw2Reason().label; lab('saw2', mtag('saw2', r), P.saw2[0], 1.75, P.saw2[1]); }
      if (fork.o) { const d = forkDriver(), [, txt] = d ? statusOf(d) : ['', '']; lab('fork', `<div class="tagw"><span class="lv" style="background:#e8ab2c;color:#1b1408">FORK</span><span>${d ? `${d.st.name} · ${txt}` : 'No driver: hire one'}</span></div>`, fork.o.position.x, 2.45, fork.o.position.z); }
      if (M.stall) lab('stall', `<div class="pad"><b>Rusty's stall</b>Spare parts ${fmt(RUSTY_PART)} · stand here</div>`, P.stallRing[0], .35, P.stallRing[1] + .5);
    }
    if (S.level >= 5 && M.l5Built) {
      if (M.mill2 || S.l5.mill2) { const r = mill2Reason().label; lab('mill2', mtag('mill2', r), P.mill2[0], 1.85, P.mill2[1]); }
      if (M.rack2) lab('rack2', `<div class="mtag"><b>Dock 2 pipes ${S.l5.rack2}/${RACK2_CAP}</b>for the white truck</div>`, P.rack2[0], 1.75, P.rack2[1]);
      if (M.officeBlock) lab('office', `<div class="mtag"><b>Office block</b>Priya Nair · the accounts · stand at the door</div>`, P.officeDoor[0], 1.2, P.officeDoor[1] + .3);
      if (S.order2 && S.order2.ready && truckB.state === 'docked') lab('sign2', `<div class="pad">${icon('sign', '#e8ab2c')}<b>Sign</b>${hasRole('supervisor') ? 'Supervisor signs' : 'Dock 2 · stand here'}</div>`, P.drop2[0], .5, P.drop2[1] - .4);
      else if (S.order2 && truckB.state === 'docked') lab('dock2', `<div class="mtag"><b>Dock 2: loading</b>${['c', 'p', 't'].filter(k => want2(S.order2, k)).map(k => `${S.order2.l[k]}/${want2(S.order2, k)} ${{ c:'crates', p:'pipes', t:'tools' }[k]}`).join(' · ')}</div>`, P.dock2[0], 3.4, P.dock2[1]);
    }
    if (M.scrapOpen && S.level < 4) lab('scrapyard', `<div class="mtag"><b>Forklift yard</b>Bought · opens at level 4</div>`, -10.4, 2.4, 8.3);
    if (inspector) lab('inspector', `<div class="tagw"><span class="lv" style="background:#4a4f57;color:#ece6d9">COUNCIL</span><span>Ada Hale · ${Object.keys(S.lv3.check || {}).length}/${INSPECT.length}</span></div>`, inspector.o.position.x, 1.72, inspector.o.position.z);
    // people of the valley wear their name; a "!" while they have something to say
    for (const [id, c] of folk) if (c.o.visible) lab('folk' + id, `<div class="tagw"><span class="lv" style="background:${PEOPLE[id].bg};color:#1b1408">${S.met[id] ? PEOPLE[id].name.split(' ')[0] : '!'}</span><span>${PEOPLE[id].role}</span></div>`, c.o.position.x, 1.72, c.o.position.z);
    for (const id of Object.keys(PLOTS)) { const p = S.plots[id], pl = PLOTS[id];
      if (p.st === 1 || p.st === 2) lab('plot' + id, `<div class="mtag"><b>${pl.name}: ${p.st === 1 ? 'council permit' : 'site work'}</b>${p.st === 1 ? `${Math.max(0, Math.ceil(p.permit - p.t))} s` : `${Math.floor(p.t / ACT_TIMERS.site * 100)}%`}</div>`, pl.sign[0], 2.3, pl.sign[1]);
      else if (p.st === 0 && S.level >= pl.lv && S.tutDone) lab('plot' + id, `<div class="pad"><b>For sale</b>${fmt(pl.price)} · stand here</div>`, pl.ring[0], .35, pl.ring[1] + .5); }
    for (const c of [...staffObj.values(), ...temps]) { if (!c.o.visible) continue; const [i] = statusOf(c), st = c.st, ready = st.id > 0 && xpReady(st);
      lab('s' + st.id, `<div class="tagw ${c.state === 'slack' ? 'bad' : ''}"><span class="lv ${ready ? 'ready' : ''}"${ready ? '' : ` style="background:${ROLE[st.role].col.suit};color:#ece6d9"`}>${st.id > 0 ? 'LV' + st.lv : 'HIRE'}</span>${icon(i, STATUS_COL[i] || '#e8ab2c')}<span>${st.name}</span>${c.zone ? '<span class="zone">+15%</span>' : ''}</div>`,
        c.o.position.x, 1.62 + carryTop(c), c.o.position.z); }
    if (M.car && S.tutDone && !trip && M.car.visible) lab('car', `<div class="pad"><b>Grandad's car</b>Find work in town · stand here</div>`, P.carDoor[0], .35, P.carDoor[1] - .3);
    if (S.blade) lab('blade', `<div class="fault diag">${icon('wrench', '#1b1408', 2.4)}<span><b>Blunt blade</b>Fit a new one here · ${fmt(BLADE_COST)}</span></div>`, P.sawFix[0], 1.6, P.sawFix[1]);
    const sawState = sawReason().label;
    lab('saw', mtag('saw', sawState), P.saw[0], 1.75, P.saw[1]);
    if (S.level >= 2) { if (millReady()) { const pr = pipeReason().label; lab('pipe', mtag('pipe', pr), P.pmill[0], 1.85, P.pmill[1]); }
      else if (S.lv2.mill === 1) lab('pipe', `<div class="mtag"><b>Installing the pipe mill</b>${Math.floor(S.lv2.buildT / MILL_BUILD * 100)}%</div>`, P.pmill[0], 2.5, P.pmill[1]);
      if (M.coilBay) lab('coils', `<div class="mtag ${S.coils === 0 && steelPipes() < pipeLeft() ? 'warn' : ''}"><b>Steel coils ${Math.min(S.coils, coilCap())}/${coilCap()}${S.coils > coilCap() ? ` +${S.coils - coilCap()} in the aisle` : ''}</b>${S.delivery && S.delivery.kind === 'steel' ? `${S.delivery.left} on the way` : 'Order steel in the office'}</div>`, P.coilBay[0], 1.0, P.coilBay[1]);
      if (M.wh) lab('wh', `<div class="mtag ${S.wh.c + S.wh.p + S.wh.t === 0 ? '' : 'ok'}"><b>Warehouse</b>${S.wh.c}/${whCapC()} crates · ${S.wh.p}/${whCapP()} pipes${whCapT() ? ` · ${S.wh.t}/${whCapT()} tools` : ''}${S.wh.make ? '' : ' · stock off'}</div>`, P.wh[0], .3, P.wh[1] + 2.0);
      if (S.level >= 3) { if (pressReady()) { const tr = toolReason().label; lab('press', mtag('tool', tr), P.tpress[0], 2.35, P.tpress[1]); }
        else if (S.lv3.press === 1) lab('press', `<div class="mtag"><b>Installing the tool press</b>${Math.floor(S.lv3.pressT / PRESS_BUILD * 100)}%</div>`, P.tpress[0], 2.4, P.tpress[1]);
        if (M.trackRack && pressReady()) lab('track', `<div class="mtag"><b>Tool rack ${S.tools}/${toolCap()}</b>for the truck</div>`, P.track[0], 1.85, P.track[1]);
        if (M.partsShelf) lab('parts', `<div class="mtag ${S.parts === 0 ? 'warn' : ''}"><b>Spare parts ${S.parts}/${partsCap()}</b>${S.parts === 0 ? 'Buy in the office' : 'for machine repairs'}</div>`, P.parts[0], 1.95, P.parts[1]); }
      if (M.prack && millReady()) lab('prack', `<div class="mtag"><b>Pipe rack ${S.pipes}/${pipeCap()}</b>for the truck</div>`, P.prack[0], 1.75, P.prack[1]); }
    if (WELFARE && M.wc && M.wc.length) { const k = stallCount(), inUse = stallBy.filter((c, i) => c && i < k).length; lab('wc', `<div class="mtag ${S.wcClean < 35 ? 'warn' : ''}"><b>Washroom ${inUse}/${k}</b>${S.wcClean < 35 ? 'Dirty: needs cleaning' : `${Math.round(S.wcClean)}% clean`}</div>`, WC_BLOCKS[0][0], 2.95, WC_BLOCKS[0][1]); }
    if (M.cooler) lab('cooler', `<div class="mtag ${S.cooler <= 3 ? 'warn' : ''}"><b>Water ${S.cooler}/${coolerCap()}</b>${S.water} spare bottle${S.water === 1 ? '' : 's'}</div>`, P.cooler[0], 1.75, P.cooler[1]);
    if (!timberFree()) lab('rack', `<div class="mtag ${S.timber === 0 ? 'warn' : ''}"><b>Line rack ${S.timber}/${LINE_CAP}</b>from the stock room</div>`, P.timber[0], 1.65, P.timber[1]);
    if (!timberFree()) lab('store', `<div class="mtag ${timberLow() ? 'warn' : ''}"><b>Stock room ${S.store}/${storeCap()}</b>${S.delivery ? `${S.delivery.left} planks on order` : 'Order timber in the office'}</div>`, P.storeSpot[0], .25, P.storeSpot[1] + .3);
    if (sup.state === 'parked' && S.delivery) lab('lorry', `<div class="mtag"><b>${S.delivery.kind === 'steel' ? 'Steel' : 'Timber'} delivery</b>${onLorry()} still on the lorry</div>`, M.flat.position.x - .6, 2.5, M.flat.position.z);
    if (M.goodsIn && goodsIn() > 0) lab('goodsin', `<div class="mtag"><b>Goods in: ${goodsIn()} ${S.delivery.kind === 'steel' ? 'coils' : 'planks'}</b>Loaders take them to the ${S.delivery.kind === 'steel' ? 'coil bay' : 'stock room'}</div>`, P.goodsIn[0], 1.5, P.goodsIn[1]);
    lab('gen', `<div class="mtag ${stalled() ? 'warn' : !powerOn() ? 'bad' : S.power.fuel < 25 ? 'warn' : ''}"><b>${stalled() ? 'Stalled' : powerOn() ? 'Generator' : 'Power off'}</b>${stalled() ? 'Restarting by itself' : S.level < 8 ? `${load().toFixed(1)} of ${genKW()} kW in use` : `Diesel ${Math.round(S.power.fuel)}%${!loadersHired() && S.power.fuel < 60 ? ' · stand here to refuel' : ''}`}</div>`, P.gen[0], 2.5, P.gen[1]);
    if (S.lv2.mill === 0 && S.level >= 2) lab('tarp', `<div class="mtag"><b>${S.level >= 2 ? 'Pipe machine' : 'Level 2'}</b>${S.level >= 2 ? 'Pay in at the pad' : 'Pipe machine'}</div>`, P.pmill[0], 1.0, P.tarp[1]);
    if (S.cashPile > 0) lab('cash', `<div class="pad"><b>${fmt(S.cashPile)}</b>Collect</div>`, P.cash[0], .9, P.cash[1]);
    const bill = S.level >= 5 && S.l5.bill;
    lab('desk', S.call ? `<div class="fault ring">${icon('phone', '#fff', 2.4)}<span><b>Phone ringing</b>${S.call.client}</span></div>` : bill ? `<div class="fault ${bill.late ? '' : 'diag'}">${icon('coins', bill.late ? '#fff' : '#1b1408', 2.4)}<span><b>${bill.late ? 'Bill overdue' : 'Bill due'}</b>${fmt(bill.total)} · ${bill.late ? 'pay now' : Math.ceil(bill.due - S.time) + ' s'}</span></div>` : `<div class="mtag"><b>Office</b>Orders · staff · stock</div>`, P.desk[0], 1.55, P.desk[1]);
    if (S.order && S.order.ready && truck.state === 'docked') lab('sign', `<div class="pad">${icon('sign', '#e8ab2c')}<b>Sign</b>${hasRole('supervisor') ? 'Supervisor signs' : 'Stand here'}</div>`, P.drop[0], LDOCK.H + .5, P.drop[1] - .4);
    for (const f of S.faults) { const mk = WHERE[f.where].mark, def = FAULTS[f.kind];
      lab('f' + f.id, f.diag ? `<div class="fault diag">${icon(ROLE[def.trade].icon, '#1b1408', 2.4)}<span><b>${def.name}</b>${faultStatus(f)}</span></div>` : `<div class="fault">${icon('help', '#fff', 2.6)}<span><b>Fault</b>Inspect it</span></div>`, mk[0], mk[1], mk[2]); }
    syncPlotRings();
    for (const p of visiblePads()) { const left = p.price - (S.padPaid[p.id] || 0); lab('p' + p.id, `<div class="pad">${p.label}<b>${p.price ? fmt(left) : 'Free'}</b>${p.note ? `<small>${p.note}</small>` : ''}</div>`, p.at[0], .35, p.at[1] - .6); }
  }
  for (const [k, e] of labs) if (!e._seen) { e.remove(); labs.delete(k); }
  updateCallEdge();
}
// when the office is off screen, a ringing phone badge sits on the screen edge pointing at it
function updateCallEdge(){
  const el = $('callEdge'); if (!S.call || officeOpen) { el.hidden = true; return; }
  v3.set(P.desk[0], 1.0, P.desk[1]).project(cam); const W = innerWidth, H = innerHeight;
  let x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H; const top = moneyBottom() + 30, m = 34;
  if (x > m && x < W - m && y > top && y < H - 90) { el.hidden = true; return; }
  const cx = W / 2, cy = (top + H - 90) / 2, dx = x - cx, dy = y - cy, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), ((H - 90 - top) / 2) / Math.abs(dy || 1e-6));
  x = cx + dx * k; y = cy + dy * k; el.hidden = false; el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`; el.firstChild.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
}
let floatN = 0;
function floatText(t, x, y, z, cls = ''){ const e = document.createElement('div'); e.className = 'flab'; e.innerHTML = `<div><div class="float ${cls}">${t}</div></div>`; $('labels').appendChild(e);
  v3.set(x, y, z).project(cam); e.style.transform = `translate(${((v3.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - v3.y) / 2 * innerHeight).toFixed(1)}px)`;
  requestAnimationFrame(() => requestAnimationFrame(() => { e.querySelector('.float').style.transform = 'translateY(-50px)'; e.querySelector('.float').style.opacity = 0; })); setTimeout(() => e.remove(), 1100); floatN++; }
// messages stack just under the objective banner, its left edge and width (top left, where the player already reads)
function placeToasts(){ const box = $('toasts'), ob = $('obj'); if (!box) return; const par = (box.offsetParent || document.body).getBoundingClientRect(), r = ob && ob.offsetParent !== null ? ob.getBoundingClientRect() : null;
  if (!(r && r.height)) return; let right = innerWidth - 12;   // never under the cards down the right (the incoming call, the order slips)
  for (const id of ['callc', 'ticket', 'ticket2']) { const e = $(id); if (e && !e.hidden && e.offsetParent !== null) { const q = e.getBoundingClientRect(); if (q.width) right = Math.min(right, q.left - 8); } }
  box.style.top = (r.bottom - par.top + 6) + 'px'; box.style.left = (r.left - par.left) + 'px'; box.style.maxWidth = Math.max(150, Math.min(Math.max(r.width, 200), right - r.left)) + 'px'; }
function toast(t, cls = ''){ if (cls === 'gold' || cls === 'good' || cls === 'bad') beat('toast'); const e = document.createElement('div'); e.className = 'toast ' + cls; e.textContent = t; placeToasts(); $('toasts').appendChild(e); while ($('toasts').children.length > 2) $('toasts').firstChild.remove();
  setTimeout(() => { e.style.opacity = 0; setTimeout(() => e.remove(), 450); }, 3600); }
// the inspection card: what the owner is looking at right now
const row = (k, v, pct, cls = '') => `<div class="cr"><span>${k}</span>${pct !== undefined ? bar(pct, cls) : ''}<b>${v}</b></div>`;
function cardHtml(t){
  if (t.type === 'machine' && t.id === 'wc') { const k = stallCount(), inUse = stallBy.filter((c, i) => c && i < k).length, crew = S.staff.length, need = PG.stallsNeeded(crew), q = [...staffObj.values()].filter(o => o.need && o.need.stage === 'queue').length;
    return `<div class="ch"><span class="cic">${icon('wc', '#ece6d9')}</span><div><b>Washroom</b><small>${k} stall${k > 1 ? 's' : ''} · one per four people</small></div></div>${row('In use', `${inUse} / ${k}${q ? ` · ${q} queueing` : ''}`)}${row('Clean', `${Math.round(S.wcClean)}%`, S.wcClean, S.wcClean < 35 ? 'low' : '')}${row('Crew', `${crew} people, needs ${need} stall${need > 1 ? 's' : ''}`)}<p>${S.wcClean < 35 ? 'Filthy: everyone who uses it loses focus. ' : ''}${need > k ? 'Your crew has outgrown it: buy another stall in Upgrades. ' : ''}${hasRole('cleaner') ? 'The cleaner keeps it clean.' : 'No cleaner: loaders clean it when it gets bad.'}</p>`; }
  if (t.type === 'machine' && t.id === 'cooler') return `<div class="ch"><span class="cic">${icon('drop', '#ece6d9')}</span><div><b>Water cooler</b><small>Thirsty people lose focus fast</small></div></div>${row('Water', `${S.cooler} / ${coolerCap()} cups`, S.cooler / coolerCap() * 100, S.cooler < 5 ? 'low' : '')}${row('Spare bottles', `${S.water} / ${WATER_CAP}`)}${row('Drinks today', S.drinks)}<p>${S.water === 0 ? 'No spare bottles: buy some in the office (Stock). ' : ''}${hasRole('cleaner') ? 'The cleaner swaps the bottle.' : 'A loader swaps the bottle when it runs dry.'}</p>`;
  if (t.type === 'machine' && t.id === 'pipe') { const r = pipeReason();
    if (!millReady()) return `<div class="ch"><span class="cic">${icon('gear', '#ece6d9')}</span><div><b>Pipe bay</b><small>${S.lv2.mill === 1 ? 'The contractor is installing the mill' : 'Pay in at the pad to install the pipe mill'}</small></div></div>${S.lv2.mill === 1 ? row('Installed', `${Math.floor(S.lv2.buildT / MILL_BUILD * 100)}%`, S.lv2.buildT / MILL_BUILD * 100, 'xp') : row('Price', fmt(MILL_PRICE))}<p>Steel strip in, pipes out. Each coil makes ${COIL_PIPES} pipes; a pipe sells for ${fmt(PIPE_PRICE)}.</p>`;
    const L = S.pipeLog || {}, tot = Object.values(L).reduce((a, b) => a + b, 0), use = tot ? (L.Cutting || 0) / tot * 100 : 0;
    return `<div class="ch"><span class="cic">${icon('gear', '#ece6d9')}</span><div><b>Pipe mill</b><small>Coil in, pipes out · ${(PIPE_CYCLE / (1 + .2 * S.up.pipe)).toFixed(1)} s a pipe</small></div></div>${row('Now', `${r.label[1]}: ${r.label[2]}`)}${row('Condition', `${Math.round(S.cond.pipe)}%`, S.cond.pipe, S.cond.pipe < 40 ? 'low' : '')}${row('Coil on the mill', `${S.coilLeft} / ${COIL_PIPES} pipes left`)}${row('Spare coils by the mill', `${S.coilFeed} / 2`)}${row('Power', !circuitOn('pipe') ? 'Off' : overloaded() ? `Overloaded: ${Math.round(pf() * 100)}% speed` : 'On')}${row('Pipes made', S.pmade)}${tot > 20 ? row('Busy on orders', `${Math.round(use)}%`, use, use < 60 ? 'low' : 'xp') : ''}<p>Only its operator runs it. Big draw: with Generator Mk I it slows both machines when they run together.</p>`; }
  if (t.type === 'machine' && t.id === 'press') { const r = toolReason();
    if (!pressReady()) return `<div class="ch"><span class="cic">${icon('gear', '#ece6d9')}</span><div><b>North field</b><small>${S.lv3.press === 1 ? 'The contractor is installing the tool press' : 'Pay in at the pad to install the tool press'}</small></div></div>`;
    return `<div class="ch"><span class="cic">${icon('gear', '#ece6d9')}</span><div><b>Tool press</b><small>Coil in, tools out · ${(TOOL_CYCLE / (1 + .2 * S.up.press)).toFixed(1)} s a tool</small></div></div>${row('Now', `${r.label[1]}: ${r.label[2]}`)}${row('Condition', `${Math.round(S.cond.tool)}%`, S.cond.tool, S.cond.tool < 40 ? 'low' : '')}${row('Coil in the press', `${S.tcoil} / ${COIL_TOOLS} tools left`)}${row('Spare coils by the press', `${S.tfeed} / 2`)}${row('Power', !circuitOn('tool') ? 'Off' : overloaded() ? `Overloaded: ${Math.round(pf() * 100)}% speed` : 'On')}${row('Tools made', S.tmade)}<p>Only its operator runs it. It shares the coil bay with the pipe mill, so keep steel coming.</p>`; }
  if (t.type === 'machine' && t.id === 'mill2') { const r = mill2Reason(); return `<div class="ch"><span class="cic">${icon('gear', '#ece6d9')}</span><div><b>Second pipe mill</b><small>Its pipes go out from dock 2</small></div></div>${row('Now', `${r.label[1]}: ${r.label[2]}`)}${row('Pipes on its rack', `${S.l5.rack2} / ${RACK2_CAP}`, S.l5.rack2 / RACK2_CAP * 100)}${row('Coil on the mill', `${S.l5.coilLeft2} / ${COIL_PIPES} pipes left`)}${row('Spare coils', `${S.l5.coil2} / 2`)}<p>Loaders bring its coils from the coil bay; the forklift takes its pipes to the white truck.</p>`; }
  if (t.type === 'machine' && t.id === 'dock2') { const o = S.order2; return `<div class="ch"><span class="cic">${icon('truck', '#ece6d9')}</span><div><b>Dock 2</b><small>${o ? `${o.client}${o.rush ? ' · RUSH' : ''}` : 'No order'}</small></div><span class="cst">${truckText(truckB, o, 2)}</span></div>${o ? ['c', 'p', 't'].filter(k => want2(o, k)).map(k => row({ c:'Crates', p:'Pipes', t:'Tools' }[k], `${o.l[k]} / ${want2(o, k)}`, o.l[k] / want2(o, k) * 100, 'xp')).join('') + row('Due', o.time > o.deadline ? 'Late' : dueAt(o.deadline - o.time)) : ''}<p>${o && o.ready ? 'Ready. Stand in the ring to sign the delivery note.' : 'Ships from stock: the forklift brings it from the warehouse and the second mill\'s rack.'}</p>`; }
  if (t.type === 'machine' && t.id === 'parts') return `<div class="ch"><span class="cic">${icon('wrench', '#ece6d9')}</span><div><b>Spare-parts shelf</b><small>A machine repair uses one part</small></div></div>${row('On the shelf', `${S.parts} / ${partsCap()}`)}<p>With no part the mechanic makes do, about three times as slow. Buy parts in the office (Stock).</p>`;
  if (t.type === 'machine' && t.id === 'coils') return `<div class="ch"><span class="cic">${icon('box', '#ece6d9')}</span><div><b>Steel coil bay</b><small>Steel strip from the supplier, ${COIL_PIPES} pipes a coil</small></div></div>${row('Coils', `${S.coils} / ${coilCap()}`, S.coils / coilCap() * 100)}${row('Pipes this steel makes', steelPipes())}<p>Order steel in the office (Stock). Loaders carry one coil at a time to the mill.</p>`;
  if (t.type === 'machine' && t.id === 'prack') return `<div class="ch"><span class="cic">${icon('truck', '#ece6d9')}</span><div><b>Pipe rack</b><small>Finished pipes waiting for the truck</small></div></div>${row('Pipes', `${S.pipes} / ${pipeCap()}`, S.pipes / pipeCap() * 100)}${row('Shipped so far', S.pshipped)}<p>Loaders carry pipes from here to the truck at the dock.</p>`;
  if (t.type === 'staff') { const c = t.c, st = c.st, R = ROLE[st.role], [i, sl] = statusOf(c);
    let h = `<div class="ch"><span class="cic" style="background:${R.col.suit}">${icon(R.icon, '#ece6d9')}</span><div><b>${st.name}</b><small>${st.id > 0 ? `${R.title}${st.mach === 'pipe' ? ' (pipe mill)' : st.role === 'operator' && S.level >= 2 ? ' (saw)' : ''} · level ${st.lv}` : `${R.title} from town`}</small></div><span class="cst ${i === 'phone' || i === 'bolt' ? 'bad' : ''}">${sl}</span></div>`;
    if (st.id < 0) return h + `<p>Paid per callout. Hire your own ${st.role} to fix faults faster and for free.</p>`;
    h += row('Rating', `${ratingOf(st)}%`, ratingOf(st));
    if (['operator', 'loader'].includes(st.role)) h += row('Focus', c.zone ? 'Supervised' : `${Math.round(st.focus)}%`, st.focus, st.focus < 30 ? 'low' : 'focus');
    if (st.id > 0 && st.thirst !== undefined) h += row('Thirst', `${Math.round(st.thirst)}%`, st.thirst, st.thirst < 30 ? 'low' : '') + row('Toilet', `${Math.round(st.bladder)}%`, st.bladder, st.bladder < 30 ? 'low' : '');
    if (st.lv < maxLv()) h += row('Experience', `${Math.floor(st.xp)} / ${PG.xpNext(st.lv)}`, st.xp / PG.xpNext(st.lv) * 100, 'xp');
    return h + `<p>${c.state === 'slack' ? 'Caught on the phone. Standing here gets them back to work.' : R.job}</p>`; }
  if (t.type === 'fault') { const f = t.f, def = FAULTS[f.kind];
    if (!f.diag) { const k = dwell.key === t.key ? dwell.t / .9 : 0; return `<div class="ch"><span class="cic bad">${icon('help', '#fff')}</span><div><b>Something is wrong</b><small>${faultSymptom(f)}</small></div></div>${row('Inspecting', `${Math.round(clamp(k, 0, 1) * 100)}%`, k * 100, 'xp')}<p>Stay here to find out what broke and whose trade it is.</p>`; }
    return `<div class="ch"><span class="cic" style="background:${ROLE[def.trade].col.suit}">${icon(ROLE[def.trade].icon, '#ece6d9')}</span><div><b>${def.name}</b><small>${ROLE[def.trade].title}'s job${f.circuit ? ` · ${CIRCUITS[f.circuit].name} circuit` : ''}</small></div></div>${row('Repair', `${Math.floor(f.prog * 100)}%`, f.prog * 100, 'xp')}<p>${faultStatus(f)}.</p>`; }
  const id = t.id;
  if (id === 'saw') return `<div class="ch"><span class="cic">${icon('saw', '#ece6d9')}</span><div><b>Crate machine</b><small>Planks in, crates out · ${SAW_CYCLE / (1 + .2 * S.up.saw)} s a crate</small></div></div>${row('Condition', `${Math.round(S.cond.saw)}%`, S.cond.saw, S.cond.saw < 40 ? 'low' : '')}${row('Power', circuitOn('saw') ? 'On' : 'Off')}${row('Now', `${sawReason().label[1]}: ${sawReason().label[2]}`)}${row('In-feed', `${S.feed} / 6`)}${row('Crates made', S.made)}${sawUse()}<p>${hasRole('operator') ? 'Your operator runs it. When nobody is on it, stand at the saw and run it yourself.' : 'Nobody on the payroll yet: stand at the saw and it cuts. An operator takes it off your hands.'}</p>`;
  if (id === 'gen') return `<div class="ch"><span class="cic">${icon('bolt', '#ece6d9')}</span><div><b>Diesel generator</b><small>Powers the whole site through the switchboard</small></div><span class="cst ${powerOn() ? '' : 'bad'}">${powerOn() ? 'Running' : 'Stopped'}</span></div>${row('Diesel', `${Math.round(S.power.fuel)}%`, S.power.fuel, S.power.fuel < 25 ? 'low' : '')}${row('Load', `${load().toFixed(1)} / ${genKW()} kW`, load() / genKW() * 100, 'xp')}${row('Engine', `${Math.round(S.cond.engine)}%`, S.cond.engine)}<p>Loaders refill it from the diesel tank outside the side door. Engine: mechanic. Alternator: electrician.</p>`;
  if (id === 'board') return `<div class="ch"><span class="cic">${icon('bolt', '#ece6d9')}</span><div><b>Switchboard</b><small>Generator in, three circuits out</small></div></div>${Object.entries(CIRCUITS).map(([k, c]) => row(c.name, !S.power.breakers[k] ? 'Tripped' : circuitOn(k) ? 'On' : 'Off')).join('')}${row('Wiring', `${Math.round(S.cond.wiring)}%`, S.cond.wiring, S.cond.wiring < 40 ? 'low' : '')}<p>Follow the glowing cables: up the wall, along the tray, down to the saw, the lamps and the office.</p>`;
  if (id === 'rack') return `<div class="ch"><span class="cic">${icon('box', '#ece6d9')}</span><div><b>Line rack</b><small>Timber waiting beside the saw</small></div></div>${row('Planks', `${S.timber} / ${LINE_CAP}`, S.timber / LINE_CAP * 100)}${row('Stock room', `${S.store} / ${storeCap()}`)}<p>Loaders refill it from the stock room on the trolley, then feed the saw from here.</p>`;
  if (id === 'store') return `<div class="ch"><span class="cic">${icon('box', '#ece6d9')}</span><div><b>Stock room</b><small>Where the timber lorry delivers</small></div></div>${row('Planks', `${S.store} / ${storeCap()}`, S.store / storeCap() * 100, timberLow() ? 'low' : '')}${row('On order', S.delivery ? `${S.delivery.left}` : 'None')}<p>You order timber in the office (Stock tab). Loaders unload the lorry here.</p>`;
  if (id === 'tank') return `<div class="ch"><span class="cic">${icon('drop', '#ece6d9')}</span><div><b>Diesel tank</b><small>${fmt(DIESEL_CAN())} a can, paid from the next delivery</small></div></div>${row('Generator diesel', `${Math.round(S.power.fuel)}%`, S.power.fuel, S.power.fuel < 25 ? 'low' : '')}<p>When the generator drops below 40%, a loader fills a can here and pours it in.</p>`;
  if (id === 'jbox') return `<div class="ch"><span class="cic">${icon('bolt', '#ece6d9')}</span><div><b>Junction box</b><small>Saw circuit: tray to the machine isolator</small></div></div>${row('Saw circuit', circuitOn('saw') ? 'Live' : 'Dead')}<p>Electricians only.</p>`;
  if (id === 'dock') { const o = S.order; return `<div class="ch"><span class="cic">${icon('truck', '#ece6d9')}</span><div><b>Loading dock</b><small>${o ? o.client : 'No truck'}</small></div></div>${o ? row('Loaded', `${S.bed} / ${o.qty}`, S.bed / o.qty * 100, 'xp') + row('Due', o.nodl ? 'No deadline' : o.time > o.deadline ? 'Late' : dueAt(o.deadline - o.time)) : ''}<p>${o && o.ready ? 'Ready. Stand in the ring to sign the delivery note.' : loadersHired() ? 'Loaders fill the truck. You or a supervisor sign it off.' : 'Carry crates from the pallet and stand by the tailgate: they go on the truck.'}</p>`; }
  return '';
}
/* =====================================================================
   THE WORKING DAY (build 0.18). The works keeps 1973 hours: the shift whistle at 07:00, the lunch whistle at 12:00
   (the crew downs tools for half an hour on the bench by the workshop), the knocking-off whistle at 17:00. Then
   the day book comes up: what was made and shipped, the gate trade, the takings, the best day so far. The night is
   skipped: the next card opens the gates on the next working day (Monday to Friday, from Monday 2 April 1973).
   ===================================================================== */
const DAY_S = 600;                                        // Bible v2.0 3.1: one game minute is one second of play, so 07:00 to 17:00 is ten minutes
const SHIFT_MIN = 600, LUNCH = [300, 330];                // minutes after 07:00: lunch from 12:00 to 12:30 (30 s of play)
const PAY_MIN = 570;                                      // Friday 16:30: pay packets at the pay hatch (v2.0 3.3)
const dayNo = () => Math.floor(S.time / DAY_S);
const dayMin = () => (S.time % DAY_S) / DAY_S * SHIFT_MIN;
const lunchTime = () => !!(S.day && S.day.lunch === dayNo() && dayMin() >= LUNCH[0] && dayMin() < LUNCH[1]);
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// The calendar (v2.0 3.1-3.5): working days are counted from Monday 2 April 1973, five to a week. Each level opens on its
// own date (6.1); between levels the time skip tears pages off the office calendar. S.cal.off turns the play-day index into
// the calendar's working day, so the date never runs backwards and a long level simply carries on into the next week.
const CAL0 = Date.UTC(1973, 3, 2);
const wdOf = (y, m, d) => { const k = Math.round((Date.UTC(y, m, d) - CAL0) / 864e5); return Math.floor(k / 7) * 5 + Math.min(4, k % 7); };
const LV_START = { 1:wdOf(1973, 3, 2), 2:wdOf(1973, 3, 18), 3:wdOf(1973, 5, 5), 4:wdOf(1973, 7, 7), 5:wdOf(1974, 0, 14), 6:wdOf(1974, 3, 16), 7:wdOf(1974, 9, 7), 8:wdOf(1975, 3, 7), 9:wdOf(1975, 8, 8) };
const calDay = (i = dayNo()) => i + ((S.cal && S.cal.off) || 0);
const calDate = w => new Date(CAL0 + (Math.floor(w / 5) * 7 + w % 5) * 864e5);   // working day -> real date
const weekday = (i = dayNo()) => calDay(i) % 5;          // 0 Monday .. 4 Friday
const isFriday = (i = dayNo()) => weekday(i) === 4;
function dateOf(w){ const d = calDate(w); return `${WEEKDAYS[w % 5]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
function dayDate(i){ return dateOf(calDay(i)); }
// the season of a calendar day (v2.0 17): spring Mar-May, summer Jun-Aug, autumn Sep-Nov, winter Dec-Feb
function seasonOf(w = calDay()){ const m = calDate(w).getUTCMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
function hhmm(min){ const m = 7 * 60 + Math.floor(min); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
// a deadline in game seconds of the working day from now, as the weekday and clock time it falls on ("Wed 12:00")
function dueAt(secsLeft){ let m = dayMin() + Math.max(0, secsLeft) * SHIFT_MIN / DAY_S, i = dayNo(); while (m > SHIFT_MIN) { m -= SHIFT_MIN; i++; } return `${WEEKDAYS[weekday(i)].slice(0, 3)} ${hhmm(m)}`; }
// game seconds of working time as hours and minutes on the clock ("3 h 20 min")
const hrsOf = sec => { const m = Math.round(sec * SHIFT_MIN / DAY_S), h = Math.floor(m / 60); return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`; };
function dayClock(){ const w = calDay(), dt0 = calDate(w), wd = `${WEEKDAYS[weekday()].slice(0, 3)} ${dt0.getUTCDate()} ${MONTHS[dt0.getUTCMonth()].slice(0, 3)}`; return S.day && S.day.closing ? `${wd} · 17:00 · CLOSING` : `${wd} · ${hhmm(dayMin())}${lunchTime() ? ' · LUNCH' : payTime() ? ' · PAY DAY' : ''}`; }
function daySnap(){ return { won:(S.sales && S.sales.won) || 0, made:S.made, pmade:S.pmade, tmade:S.tmade, shipped:S.shipped, pshipped:S.pshipped, tshipped:S.tshipped, fixed:S.fixed, fork:S.lv4.forkMoved || 0, mixed:S.lv4.mixed || 0, delivered:S.delivered, ontime:S.ontime, earned:S.earned, rep:S.rep, ws:S.walk.served, wl:S.walk.lost, wc:S.walk.cash }; }
// a factory whistle: a steam chord that rises as the valve opens, held, then dies away
// a factory steam whistle: three pipes in a chord. The valve opens (the pitch rises into tune), the note is held
// for 'len' seconds over a steam hiss, then the valve shuts and the note sags as the pressure drops.
function whistle(len = 1.2, vol = 1){
  if (!AC || !audioAllowed() || paused) return; if (AC.state === 'suspended') AC.resume().catch(() => {});
  const t0 = AC.currentTime + .02, t1 = t0 + len, out = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  out.gain.setValueAtTime(.0001, t0); out.gain.exponentialRampToValueAtTime(.2 * vol, t0 + .14); out.gain.setValueAtTime(.2 * vol, t1); out.gain.exponentialRampToValueAtTime(.0001, t1 + .5);
  lp.connect(out).connect(master());
  for (const [f, k] of [[392, .34], [494, .27], [587, .2]]) { const o = AC.createOscillator(), g = AC.createGain(), vib = AC.createOscillator(), vg = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .88, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + .22); o.frequency.setValueAtTime(f, t1); o.frequency.exponentialRampToValueAtTime(f * .9, t1 + .5);
    vib.frequency.value = 5.5; vg.gain.value = f * .004; vib.connect(vg).connect(o.frequency); g.gain.value = k; o.connect(g).connect(lp);
    o.start(t0); vib.start(t0); o.stop(t1 + .55); vib.stop(t1 + .55); }
  const n = AC.createBufferSource(), bp = AC.createBiquadFilter(), ng = AC.createGain(); n.buffer = noiseBuf(); n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = .8;
  ng.gain.setValueAtTime(.0001, t0); ng.gain.exponentialRampToValueAtTime(.05 * vol, t0 + .08); ng.gain.setValueAtTime(.05 * vol, t1); ng.gain.exponentialRampToValueAtTime(.0001, t1 + .6);
  n.connect(bp).connect(ng).connect(master()); n.start(t0); n.stop(t1 + .65);
}
// the main gate's two timber leaves: shut from when the yard is empty at 17:00 until the morning whistle. While shut a
// bar across the gateway keeps everyone in (or out); the leaves swing over about a second and a half.
const gateShut = () => !!(S.day && S.day.closing && S.day.closing.shut);
const closingTime = () => !!(S.day && S.day.closing);
const officeHours = () => !closingTime() && !(S.gus && S.gus.party) && (!S.tutDone || dayMin() < SHIFT_MIN - 20);   // 07:00 to 16:40   // after the knocking-off whistle no lorry comes in
const gateSwinging = () => !!M.gateLeaves && M.gateLeaves.some(L => Math.abs(L.g.rotation.y - (gateShut() ? L.shut : L.open)) > .02);
function updateGates(dt){
  if (!M.gateLeaves) return; const want = gateShut();
  for (const L of M.gateLeaves) { const to = want ? L.shut : L.open, d = to - L.g.rotation.y; if (Math.abs(d) < .002) { L.g.rotation.y = to; continue; } L.g.rotation.y += Math.sign(d) * Math.min(Math.abs(d), dt * 1.0); }
  if (want && !COL.has('gateShut')) addCol([3.0, SITE.z1 - .12, 7.0, SITE.z1 + .12], 'gateShut'); else if (!want && COL.has('gateShut')) COL.delete('gateShut');
}
function updateDay(dt){
  if (!S.day) S.day = { n:dayNo(), at:daySnap(), lunch:-1, back:-1, best:null, book:[] };
  const D = S.day; updateGates(dt);
  // after the knocking-off whistle the clock holds at 17:00 (no order clock runs) while the crew clocks off;
  // the day book opens once the yard is empty, or after 40 s if somebody is still finishing a job
  if (D.closing && D.closing.card && !cardOpen) { morning(); return; }   // the day book was closed: next morning
  if (D.closing) { S.time = D.closing.at; if (S.order) S.order.time = Math.max(0, S.order.time - dt); D.closing.t += dt;
    // nobody holds the day for ever: after a minute anyone still walking out goes by the wicket door (a lorry in the gateway
    // and the crew walking round it could otherwise wait on each other); after two the gates shut whatever is still moving
    nightRoutine(dt);
    if (D.closing.t > 60 && !D.closing.wicket) { D.closing.wicket = true; for (const c of staffObj.values()) if (c.leaving && !c.gone) { c.gone = true; c.leaving = false; c.o.visible = false; } }
    if (D.closing.t > 120 && !D.closing.shut) { nightNow(); for (const c of staffObj.values()) if (!c.gone && c.st.role !== 'forklift' && c.st.posted !== false) { c.gone = true; c.leaving = false; c.o.visible = false; } D.closing.shut = true; D.closing.st = 0; }
    if (!D.closing.shut && ((D.closing.t > 4 && yardEmpty()) || (D.closing.t > 40 && (!trip || (nightTrip() && trip.phase === 'away')) && ownerOff() && !lorryMoving() && ![...staffObj.values()].some(c => c.leaving && !c.gone)))) { /* never shut on somebody walking out */ D.closing.shut = true; D.closing.st = 0; sfxAt('clank', 5, SITE.z1); toast('The gates are shut for the night.', ''); }
    if (D.closing.shut) { D.closing.st = (D.closing.st || 0) + dt; if (D.closing.st > .9 && !D.closing.lock) { D.closing.lock = true; sfxAt('clank', 5, SITE.z1); sfx('drop'); } }   // the leaves meet, the bolt drops
    if (D.closing.shut && D.closing.st > 2.2 && !D.closing.card && !cardOpen) { D.closing.card = true; endOfDay(D.n); }
    return; }
  const n = dayNo(), m = dayMin();
  if (n > D.n && S.gus.party && S.tutDone) { S.time = n * DAY_S - .01; return; }   // Gus's farewell runs on: the clock waits at 16:59 until the goodbye
  if (n > D.n) { if (S.tutDone && !resetting && !S.gus.party) knockOff(n); else { D.n = n; D.at = daySnap(); toast(`${dayDate(n)}. 07:00: the gates are open.`, 'gold'); whistle(); } save(); return; }
  if (!S.tutDone || S.gus.party) return;
  if (m >= LUNCH[0] && m < LUNCH[1] && D.lunch !== n) { D.lunch = n; whistle(1.0); toast('12:00, the lunch whistle. The crew sits down for half an hour: the machines are yours till 12:30.', 'gold');
    const g = gusChar(); if (g && !S.gus.retired) gusSay(g, pick(['Lunch! Your grandad never missed his at noon.', 'Sandwiches out. Half an hour, lads.', 'Kettle\'s on. Sit down, boss, if you can.'])); }
  if (m >= LUNCH[1] && D.lunch === n && D.back !== n) { D.back = n; whistle(.7); toast('12:30. Back to work.', ''); }
  updatePay(dt);
}
// 17:00: the day book. Everything counted since the morning whistle, against the best day so far.
function endOfDay(i){
  const a = S.day.at || daySnap(), d = {
    i, made:S.made - a.made, pmade:S.pmade - a.pmade, tmade:S.tmade - (a.tmade ?? S.tmade), shipped:S.shipped - a.shipped, pshipped:S.pshipped - a.pshipped, tshipped:S.tshipped - (a.tshipped ?? S.tshipped),
    lorries:S.delivered - a.delivered, late:(S.delivered - a.delivered) - (S.ontime - a.ontime), takings:Math.round(S.earned - a.earned),
    ws:S.walk.served - (a.ws || 0), wl:S.walk.lost - (a.wl || 0), wc:Math.round(S.walk.cash - (a.wc || 0)), rep0:Math.round(a.rep), rep1:Math.round(S.rep) };
  d.date = dayDate(i); d.wd = calDay(i); d.fri = isFriday(i); if (accountsOn()) S.l5.daysThisWeek = (S.l5.daysThisWeek || 0) + 1; if (d.fri && accountsOn()) { d.acc = !!closeWeek(); if (S.level >= 6) juneSettle(S.l5.acc); } const pd = payDay(); if (pd) d.pay = { n:Object.keys(pd.paid).length, sum:pd.sum, estate:pd.est, gate:pd.gate || 0 }; if (d.fri) d.week = weekTotals(d);
  const best = S.day.best; d.first = !best; d.record = !!(best && d.takings > best.takings); d.prev = best ? Object.assign({}, best) : null;
  if (d.first || d.record) S.day.best = { takings:d.takings, made:d.made + d.pmade, i, date:d.date };
  const t = S.day.target; d.tgt = !chalkOn() && t ? { txt:TARGETS[t.kind].txt(t.need), done:t.done, bonus:t.bonus } : null;
  const ck = chalkProg(); if (chalkOn() && ck) d.chalk = { done:ck[0], of:ck[1] };
  d.wxNext = wxSummary(calDay(i) + 1); S.day.target = newTarget(d); d.next = chalkOn() ? 'three new jobs on the chalkboard' : TARGETS[S.day.target.kind].txt(S.day.target.need) + ` (bonus ${fmt(S.day.target.bonus)})`;
  S.day.book = [d, ...(S.day.book || [])].slice(0, 5); S.day.at = daySnap();
  sfx('tap'); story({ kind:'day', d });
}
// Friday's page closes the week (v2.0 3.1, the Saturday card): the week's totals from this week's pages of the book
function weekTotals(d){ const wk = Math.floor(d.wd / 5), pages = [d, ...((S.day && S.day.book) || []).filter(b => b.wd !== undefined && Math.floor(b.wd / 5) === wk && b.wd !== d.wd)];
  const sum = k => pages.reduce((a, b) => a + (b[k] || 0), 0);
  return { days:pages.length, goods:sum('made') + sum('pmade') + sum('tmade'), loaded:sum('shipped') + sum('pshipped'), lorries:sum('lorries'), late:sum('late'), gate:sum('ws'), takings:sum('takings'), pay:d.pay || null, from:dateOf(wk * 5).split(' ').slice(1, 3).join(' '), to:dateOf(wk * 5 + 4).split(' ').slice(1).join(' ') }; }
function weekHtml(w){ const row = (k, v, cls = '') => `<span>${k}</span><span class="${cls}">${v}</span>`;
  return `<div class="db-week"><div class="db-h"><span>Saturday</span><span>The week, ${w.from} to ${w.to}</span></div><div class="kv db">
    ${row('Days worked', w.days)}${row('Goods made', w.goods)}${row('Lorries signed off', `${w.lorries}${w.late ? ` (${w.late} late)` : ''}`, w.late ? 'badt' : '')}${row('Gate customers', w.gate)}
    ${w.pay ? row('Pay packets', `${w.pay.n} · ${fmt(w.pay.sum)} ${w.pay.estate ? 'from grandad\'s estate' : 'paid'}`) : ''}
    <span class="db-t">The week's takings</span><span class="db-t">${fmt(w.takings)}</span></div>
    <div class="db-s">The yard stands quiet over the weekend. Monday: new orders ring in.</div></div>`; }
function dayCardHtml(d){
  const g = folk.get('gus'), gusHere = g && !S.gus.retired, goods = d.made + d.pmade;
  const gl = !gusHere ? '' : d.first ? 'First page of the book. Your grandad wrote one of these every night for forty years.' : d.record ? 'Best day this yard has had since your grandad. Go home and sleep.' : d.wl > 0 && d.ws === 0 ? 'Folk came to the gate and went away empty-handed. Your grandad always served the gate first.'
    : d.late > 0 ? 'A late lorry costs more than the half pay. The drivers talk.' : d.lorries === 0 ? 'No lorry out today. Tomorrow we fill one.' : goods >= 40 ? 'She ran sweet all day. Good timber, good crew.' : 'Steady day. Steady days pay the bills.';
  const row = (k, v, cls = '') => `<span>${k}</span><span class="${cls}">${v}</span>`;
  return `<div class="db-h"><span>Iron Valley Works</span><span>Day book</span></div>
    <h3>${d.date || dayDate(d.i)}</h3><div class="db-s">Knocking-off whistle, 17:00 · day ${d.i + 1}</div>
    <div class="kv db">
      ${row('Crates made', d.made)}${S.level >= 2 || d.pmade ? row('Pipes made', d.pmade) : ''}${S.level >= 3 || d.tmade ? row('Tools made', d.tmade || 0) : ''}
      ${row('Lorries signed off', d.lorries ? `${d.lorries}${d.late ? ` (${d.late} late)` : ''}` : 'none', d.late ? 'badt' : '')}
      ${row('Gate trade', d.ws || d.wl ? `${d.ws} served${d.wl ? `, ${d.wl} walked off` : ''} · ${fmt(d.wc)}` : 'nobody called', d.wl > d.ws ? 'badt' : d.ws ? 'ok' : '')}
      ${row('Reputation', `${d.rep0}% → ${d.rep1}%`, d.rep1 > d.rep0 ? 'ok' : d.rep1 < d.rep0 ? 'badt' : '')}
      ${d.tgt ? row('Target: ' + d.tgt.txt.toLowerCase(), d.tgt.done ? `met · +${fmt(d.tgt.bonus)}` : 'missed', d.tgt.done ? 'ok' : 'badt') : ''}${d.chalk ? row('Chalkboard', `${d.chalk.done} of ${d.chalk.of} jobs`, d.chalk.done === d.chalk.of ? 'ok' : '') : ''}
      <span class="db-t">Takings</span><span class="db-t">${fmt(d.takings)}</span>
    </div>
    ${d.record ? `<div class="stamp db-st">Best day yet</div>` : d.first ? `<div class="db-s">The first day in the book: tomorrow's takings have ${fmt(d.takings)} to beat.</div>` : d.prev ? `<div class="db-s">Best day so far: ${fmt(d.prev.takings)} on ${(d.prev.date || dayDate(d.prev.i)).split(' ').slice(0, 3).join(' ')}</div>` : ''}
    ${d.next ? `<div class="db-s">Tomorrow: ${d.next.toLowerCase()}</div>` : ''}${d.wxNext && !d.fri ? `<div class="db-s">Weather tomorrow: ${d.wxNext.toLowerCase()}</div>` : ''}
    ${gl ? `<div class="who db-g"><img alt="" src="${portrait('gus')}"><div class="say" style="opacity:1;transform:none">${gl}</div></div>` : ''}
    ${d.week ? weekHtml(d.week) : ''}${d.acc && S.l5.acc ? `<div class="db-acc db-week"><div class="db-h"><span>Friday</span><span>The week's accounts</span></div>${accountsHtml(S.l5.acc)}</div>` : ''}
    <button class="btn primary" data-next type="button" style="width:100%;margin-top:10px;min-height:46px">${S.nextLevel ? `Level ${S.nextLevel}: turn the calendar` : `Open the gates · ${WEEKDAYS[(d.wd + 1) % 5]}`}</button>`;
}
// 17:00: the knocking-off whistle. Everyone finishes what is in their hands, says goodnight and walks out of the main gate.
const GOODNIGHT = ['Night, boss.', 'See you tomorrow.', 'That\'s me done. Night!', 'Same time tomorrow, boss.', 'Off home for my tea.'];
function knockOff(n){
  if (typeof l8DayEnd === 'function') l8DayEnd();
  S.day.closing = { at:n * DAY_S - .01, t:0, card:false }; S.time = S.day.closing.at; payAtGate();
  if (trip && trip.phase === 'wait') { endTrip(); toast('Too late to go out now: the car stays parked.', ''); }   // still waiting at the spot for a lorry: the owner gets out
  whistle(2.2); toast('17:00, the knocking-off whistle. The crew finishes up and goes home.', 'gold');
}
const nightTrip = () => !!(trip && trip.kind === 'night');
const ownerOff = () => !(S.day && S.day.closing && S.tutDone) || ['asleep', 'gone'].includes((S.day.closing.night || {}).st) || (nightTrip() && trip.phase === 'away');   // gone home or asleep in the office
const yardEmpty = () => [...staffObj.values()].every(c => c.gone || c.st.role === 'forklift' || c.st.posted === false) && !(folk.get('gus') && gusChar() && !S.gus.retired && !folk.get('gus').gone) && !walker && (!trip || (nightTrip() && trip.phase === 'away')) && ownerOff() && !lorryMoving() && !['arrive', 'leave'].includes(truckB.state);   // the car is parked and no lorry is in the gateway before the gates shut
// ---- the evening (the user's call, build 0.33): after the whistle the owner finishes only what is in hand, parks a
// trolley, then drives home in grandad's car, or sleeps in the office when the roads are bad (heavy snow, a storm) or the
// car is not there. Bolt keeps watch over the yard through the night. In the morning the owner comes out of the office,
// or drives in through the gates and parks, and the crew follows.
const SLEEP_AT = () => P.deskRing;   // the office couch by the desk, inside the workshop
function nightKind(){ const bad = (wx.kind === 'heavysnow' && wx.k > .5) || (typeof stormOn === 'function' && stormOn()) || snowLying() > .75; return !M.car || !M.car.visible || bad ? 'office' : 'home'; }
function ownerRoute(to){ const o = owner.o.position; owner.autoPath = findPath(o.x, o.z, to[0], to[1]); owner.stepTo = null; }
function nightRoutine(dt){
  const C = S.day.closing; if (!owner || !S.tutDone || C.card || C.shut && (C.night || {}).st !== 'walk') return; const N = C.night ||= { st:'work' };
  const idle = T - (owner.inputAt || -9) > 3, crewGone = [...staffObj.values()].every(c => c.gone || c.leaving || c.st.role === 'forklift' || c.st.posted === false);
  if (N.st === 'work') {
    if (owner.stack.length && C.t > 45) returnHeld();   // still holding goods: they go back on the stack for the morning
    if (owner.stack.length || trip || !(crewGone || C.t > 25)) return;
    N.kind = nightKind();
    if (owner.cart) { const i = parkSlotNear(owner); N.slot = i >= 0 ? i : owner.cartRec.slot; N.st = 'cart'; ownerRoute(cartSpot(N.slot)); return; }
    N.st = 'walk'; ownerRoute(N.kind === 'home' ? P.carDoor : SLEEP_AT()); toast(N.kind === 'home' ? 'The crew have gone. Time to lock up and drive home.' : 'The roads are no place for grandad\'s car tonight: you bed down on the office couch.', ''); return; }
  if (N.st === 'cart') { const sp = cartSpot(N.slot); if (near(owner.o, sp, .55) && owner.cart) { parkCart(owner, N.slot); owner.cartArm = false; N.st = 'walk'; ownerRoute(N.kind === 'home' ? P.carDoor : SLEEP_AT()); }
    else if (!owner.cart) { N.st = 'walk'; ownerRoute(N.kind === 'home' ? P.carDoor : SLEEP_AT()); } else if (idle && !owner.stepTo && !(owner.autoPath && owner.autoPath.length)) ownerRoute(sp); return; }
  if (N.st === 'walk') { const to = N.kind === 'home' ? P.carDoor : SLEEP_AT();
    if (near(owner.o, to, .6)) { owner.autoPath = null; owner.stepTo = null;
      if (N.kind === 'home' && M.car && !trip) { trip = { kind:'night', key:null, phase:'wait', t:0, min:0 }; CAR.s = 0; CAR.v = 0; COL.delete('car'); owner.o.visible = false; owner.o.position.set(...P.carDoor); sfxAt('drop', ...P.carSpot, .6); N.st = 'gone'; }
      else { owner.o.visible = false; N.st = 'asleep'; sfx('drop', .3); } save(); return; }
    if (idle && !owner.stepTo && !(owner.autoPath && owner.autoPath.length)) ownerRoute(to); }
}
// goods still in the owner's hands at the end of the evening go back where they came from (the pallet, the racks)
function returnHeld(){ const t = owner.carryType, n = owner.stack.length; if (!n) return; while (owner.stack.length) owner.stack.pop().removeFromParent(); owner.carryType = null;
  if (t === 'crate') { S.pallet += n; syncPallet(); } else if (t === 'pipe') { S.pipes += n; syncPipes(); } else if (t === 'toolbox') { S.tools = (S.tools || 0) + n; if (typeof syncTools === 'function') syncTools(); }
  if (owner.cart) layoutCarry(owner); toast(`You put the ${n} ${t === 'toolbox' ? 'tool' : t}${n === 1 ? '' : 's'} back on the stack for the morning.`, ''); }
// the two-minute fail-safe: the owner is off for the night at once (into the office, or the car gone up the road)
function nightNow(){ const C = S.day.closing, N = C.night ||= { st:'work' }; if (['asleep', 'gone'].includes(N.st)) return; returnHeld(); if (owner.cart) parkCart(owner, parkSlotNear(owner)); owner.autoPath = null; owner.stepTo = null;
  N.kind = N.kind || nightKind(); owner.o.visible = false; if (N.kind === 'home' && M.car && !trip) { trip = { kind:'night', key:null, phase:'away', t:0, min:0 }; COL.delete('car'); M.car.visible = false; N.st = 'gone'; } else N.st = 'asleep'; }
// a game opened in the middle of the night: the owner is still asleep in the office, or home with the car
function restoreNight(){ const N = S.day && S.day.closing && S.day.closing.night; if (!N || !owner) return;
  if (N.st === 'asleep') owner.o.visible = false;
  else if (N.st === 'gone' && M.car) { owner.o.visible = false; trip = { kind:'night', key:null, phase:'away', t:0, min:0 }; COL.delete('car'); M.car.visible = false; } }
// 07:00: out of the office, or in through the gates in the car
function nightMorning(N){
  if (!N) return; if (N.kind === 'home' && nightTrip()) { trip.phase = 'back'; CAR.s = 0; CAR.v = 8; M.car.visible = true; return; }   // the drive in: back, park, out of the driver's door
  if (nightTrip()) { trip = null; M.car.visible = true; }
  const d = SLEEP_AT(); owner.o.position.set(d[0], 0, d[1]); owner.o.visible = true; owner.autoPath = null; owner.stepTo = [d[0] + .2, d[1] + 1.2];
  if (N.kind === 'office') toast('07:00: you fold the blanket on the office couch. The kettle is on.', '');
  else if (N.kind === 'home') { M.car.position.set(P.carSpot[0], 0, P.carSpot[1]); M.car.visible = true; colOf(M.car, .05, 'car'); }
}
function closingStep(c, dt){
  if (!(S.day && S.day.closing)) return false;
  if (c.gone) return true;
  if (!c.leaving) {
    if (c.st.role === 'forklift' || c.stack.length || c.trolley || (c.tplanks && c.tplanks.length) || c.state === 'fixing') return false;   // finish what is in hand first
    if (c.lunch) { if (c.lunch === 'eat') standUp(c); c.lunch = null; c.lunchI = undefined; }
    releaseCart(c); c.state = 'leave'; if (cartHome(c, dt)) return true;
    if (S.day.closing.shut) { c.gone = true; c.o.visible = false; return true; }   // done after the gates were shut: out by the wicket door, the day book is already open
    const k = [...staffObj.values()].filter(o => o.leaving || o.gone).length; c.leaving = true; c.state = 'leave'; c.task = null; c.path = null; goTo(c, P.frontOut[0] + (k % 2 ? .45 : -.45), P.frontOut[1] - .1); /* out through the middle of the gateway, two abreast, off along the pavement: never past the posts, never onto the road */ c.say = { text:pick(GOODNIGHT), until:T + 2.6 }; }
  if (walk(c, dt)) { c.gone = true; c.leaving = false; c.o.visible = false; }
  return true;
}
// people waiting on the road to come in at the main gate stand in two files inside the gateway's width, so walking
// straight in they never cross the swung-open gate leaves (x 3.1-3.8 and 6.2-6.9)
const gateQueue = k => [P.frontOut[0] + (k % 2 ? .45 : -.45), 0, P.frontOut[1] + .6 + Math.floor(k / 2) * .75];   // the first pair stands 2.5 m from the hinges: clear of the leaves' swing
// 07:00: the clock moves on to the next working day and the crew clock in through the main gate, a step apart
function clockIn(){
  const D = S.day; if (!D || !D.closing) return; const night = D.closing.night;
  D.n = Math.round((D.closing.at + .01) / DAY_S); S.time = D.n * DAY_S + .01; D.closing = null; D.at = daySnap();
  let k = 0;
  for (const c of staffObj.values()) { c.leaving = false; if (!c.gone) continue; c.gone = false; c.o.visible = true;
    c.o.position.set(...gateQueue(k)); c.holdUntil = T + 1.7 + k * .45; k++; c.path = null; c.task = null; c.state = 'arrive'; goTo(c, P.frontIn[0], P.frontIn[1]); }
  const g = folk.get('gus'); if (g && g.gone) { g.gone = false; g.o.visible = true; g.o.position.set(...gateQueue(k)); g.job = null; g.gs = null; g.path = null; g.holdUntil = T + 1.7 + k * .45; }
  if (night && ['asleep', 'gone'].includes(night.st)) nightMorning(night); else if (!owner.o.visible && !trip) owner.o.visible = true;
  save();
}
// build 0.19: a target for each working day, set from how the day before went, with a cash bonus and +2 reputation
const TARGETS = {
  ship:   { txt:n => `Load ${n} crates and pipes onto lorries`, short:n => `${n} loaded`, got:a => S.shipped + S.pshipped - a.shipped - a.pshipped },
  takings:{ txt:n => `Take ${fmt(n)} in the day`, short:n => fmt(n), got:a => S.earned - a.earned },
  gate:   { txt:n => `Serve ${n} customers at the gate`, short:n => `${n} at the gate`, got:a => S.walk.served - (a.ws || 0) },
  acct:   { txt:() => 'Win an order or an account on a sales trip', short:() => '1 sale', got:a => sales().won - (a.won || 0) },
};
function newTarget(prev){
  const i = dayNo(), L1 = S.level === 1, kinds = ['ship', 'takings', 'gate', 'acct'], kind = !prev ? 'ship' : kinds[i % kinds.length];
  const need = kind === 'ship' ? Math.max(L1 ? 16 : 12, Math.round(((prev ? prev.shipped + prev.pshipped : 0) * 1.15) / 2) * 2)
    : kind === 'takings' ? Math.max(L1 ? 300 : 450, Math.round(((prev && prev.takings) || 0) * 1.15 / 10) * 10) : kind === 'gate' ? 2 + Math.min(3, Math.floor(i / 3)) : 1;
  const bonus = kind === 'ship' ? need * (L1 ? 3 : 8) : kind === 'takings' ? Math.round(need * .1 / 5) * 5 : kind === 'gate' ? 40 : 60;
  return { kind, need, bonus, done:false };
}
// No offline earnings (the user's call, build 0.30): the works does nothing while the game is closed, and nobody hands
// the owner an envelope on return. The calendar never moves while closed.
// v2.0 18.6: the login calendar from Level 3. Seven real days of rising rewards; a missed day pauses it, never resets it.
const LOGIN_K = [0, .01, .015, .02, .025, .03, .04, .06];
function loginCalendar(){
  if (S.level < 3 || !S.tutDone) return; const L = S.login ||= { day:0, last:'' }, today = new Date().toDateString(); if (L.last === today) return;
  L.day = L.day % 7 + 1; L.last = today; const pay = Math.round((GOAL_OF[S.level] || 24000) * LOGIN_K[L.day] / 10) * 10; S.cash += pay; S.earned += pay; if (L.day === 7) repChange(2);
  L.pay = pay; story({ kind:'login' }); save(); }
function loginHtml(){ const L = S.login; let cells = ''; for (let i = 1; i <= 7; i++) cells += `<div class="lgc ${i < L.day ? 'got' : i === L.day ? 'now' : ''}"><b>${i}</b><span>${fmt(Math.round((GOAL_OF[S.level] || 24000) * LOGIN_K[i] / 10) * 10)}${i === 7 ? ' +2%' : ''}</span></div>`;
  return `<div class="note" style="letter-spacing:.2em;text-transform:uppercase">The works calendar · day ${L.day} of 7</div><div class="lgrid">${cells}</div>
    <p style="text-align:center">${fmt(L.pay)} in the cash box for coming in today${L.day === 7 ? ', and the valley notices: reputation +2' : ''}. A missed day only pauses the calendar.</p>
    <button class="btn primary" data-next type="button" style="width:100%;margin-top:6px;min-height:44px">Open the gates</button>`; }
// v2.0 6.2: each level's one strategic choice, named at the start and in the charter
const CHOICE = { 1:'The tea urn (the crew 5% faster) or the trade counter (better gate trade) first?', 2:'Generator Mk II or the warehouse first?', 3:'Mains now ($500), or stay on Old Faithful with the fuel saver?', 4:'Where do you place the supervisor\'s ring?' };

// v2.0 18.6 (D-04): from Level 3 the foreman's chalkboard replaces the daily target: three jobs a day, drawn only from
// systems the works already has. Each job chalked off pays a bonus; all three in a day add 2 reputation.
const CHALK = {
  crates:{ ok:() => true,                txt:n => `Ship ${n} crates`, got:a => S.shipped - a.shipped, need:() => 40 + 10 * Math.floor(Math.random() * 3) },
  pipes: { ok:() => millReady(),         txt:n => `Ship ${n} pipes`, got:a => S.pshipped - a.pshipped, need:() => 20 + 5 * Math.floor(Math.random() * 3) },
  tools: { ok:() => pressReady(),        txt:n => `Ship ${n} tools`, got:a => S.tshipped - (a.tshipped ?? S.tshipped), need:() => 10 + 5 * Math.floor(Math.random() * 2) },
  fix:   { ok:() => S.level >= 3,        txt:n => `Fix ${n} issues`, got:a => S.fixed - (a.fixed ?? S.fixed), need:() => 2 },
  gate:  { ok:() => true,                txt:n => `Serve ${n} customers at the gate`, got:a => S.walk.served - (a.ws || 0), need:() => 3 + Math.floor(Math.random() * 2) },
  ontime:{ ok:() => true,                txt:n => `Send ${n} lorries out on time`, got:a => S.ontime - a.ontime, need:() => 2 },
  sale:  { ok:() => true,                txt:() => 'Win an order or an account on a sales trip', got:a => sales().won - (a.won || 0), need:() => 1 },
  fork:  { ok:() => S.level >= 4 && hasRole('forklift'), txt:n => `The forklift moves ${n} crates`, got:a => (S.lv4.forkMoved || 0) - (a.fork ?? 0), need:() => 30 },
  mixed: { ok:() => S.level >= 4,        txt:() => 'Deliver a mixed order', got:a => (S.lv4.mixed || 0) - (a.mixed ?? 0), need:() => 1 },
};
const chalkOn = () => S.level >= 3;
const chalkBonus = () => Math.round((GOAL_OF[S.level] || 24000) * .006 / 10) * 10;
function newChalk(){ const ks = Object.keys(CHALK).filter(k => CHALK[k].ok()), out = [];
  while (out.length < 3 && ks.length) { const k = ks.splice(Math.floor(Math.random() * ks.length), 1)[0]; out.push({ k, need:CHALK[k].need(), done:false }); }
  return { n:dayNo(), jobs:out, all:false }; }
function updateChalk(){
  const D = S.day; if (!D || !S.tutDone || D.closing || !chalkOn()) return; if (!D.chalk || D.chalk.n !== dayNo()) { D.chalk = newChalk(); if (!S.lv3.chalkSeen) { S.lv3.chalkSeen = true; toast('The foreman\'s chalkboard is up on the workshop wall: three jobs for the day.', 'gold'); } }
  const a = D.at || daySnap(); for (const j of D.chalk.jobs) { if (j.done || !CHALK[j.k]) continue; if (CHALK[j.k].got(a) >= j.need) { j.done = true; const b = chalkBonus(); S.cash += b; S.earned += b; sfx('coin'); floatText(`Chalked off +${fmt(b)}`, owner.o.position.x, 2.2, owner.o.position.z); toast(`Chalkboard: ${CHALK[j.k].txt(j.need).toLowerCase()}. Bonus ${fmt(b)}.`, 'good'); syncChalkBoard(); save(); } }
  if (!D.chalk.all && D.chalk.jobs.length && D.chalk.jobs.every(j => j.done)) { D.chalk.all = true; repChange(2); toast('All three jobs on the chalkboard done today: reputation +2.', 'gold'); const g = gusChar(); if (g && !S.gus.retired) gusSay(g, 'Board\'s clean, boss. Three for three.'); }
}
const chalkProg = () => { const c = S.day && S.day.chalk; return c && c.n === dayNo() ? [c.jobs.filter(j => j.done).length, c.jobs.length, c] : null; };
// the board itself, on the workshop front between the window and the door: the day's jobs in chalk, ticked as they go
function syncChalkBoard(){
  if (!chalkOn()) { if (M.chalk) M.chalk.visible = false; return; }
  if (!M.chalk) { const g = new THREE.Group(); g.position.set(-7.35, 0, -2.47); g.userData.dyn = true; world.add(g);
    const fr = new THREE.Mesh(BX(.98, .74, .05), std('#6b4a2a', .85)); fr.position.y = 1.62; fr.castShadow = true; g.add(fr);
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(.88, .64), new THREE.MeshBasicMaterial({ color:'#ffffff' })); bd.position.set(0, 1.62, .03); g.add(bd); M.chalk = g; M.chalkBd = bd; M.chalkKey = ''; }
  M.chalk.visible = true; const c = S.day && S.day.chalk, key = c ? c.n + ':' + c.jobs.map(j => j.k + j.need + j.done).join(',') : '';
  if (key === M.chalkKey) return; M.chalkKey = key;
  const t = tex(512, 372, (g, w, h) => { g.fillStyle = '#2c3a30'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 60, 3);
    g.fillStyle = '#ece6d9'; g.font = '700 40px "Special Elite", Georgia, serif'; g.textAlign = 'center'; g.fillText(c ? WEEKDAYS[weekday()].toUpperCase() + '\'S JOBS' : 'JOBS', w / 2, 52);
    g.textAlign = 'left'; g.font = '30px "Special Elite", Georgia, serif';
    (c ? c.jobs : []).forEach((j, i) => { const y = 120 + i * 82, txt = CHALK[j.k] ? CHALK[j.k].txt(j.need) : ''; g.fillStyle = j.done ? '#9bd26f' : '#ece6d9'; g.fillText((j.done ? '✓ ' : '· ') + txt, 26, y, w - 40);
      if (j.done) { g.strokeStyle = 'rgba(236,230,217,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(60, y - 10); g.lineTo(Math.min(w - 20, 70 + g.measureText(txt).width), y - 12); g.stroke(); } }); });
  M.chalkBd.material.map && M.chalkBd.material.map.dispose(); M.chalkBd.material.map = t; M.chalkBd.material.needsUpdate = true;
}
function updateTarget(){
  updateChalk(); if (chalkOn()) { if (T - (syncChalkBoard.t || 0) > 1) { syncChalkBoard.t = T; syncChalkBoard(); } return; }
  const D = S.day; if (!D || !S.tutDone || D.closing) return; if (!D.target) D.target = newTarget(null);
  const t = D.target; if (t.done) return; const got = TARGETS[t.kind].got(D.at || daySnap());
  if (got >= t.need) { t.done = true; S.cash += t.bonus; S.earned += t.bonus; repChange(2); sfx('coin'); floatText(`Target met +${fmt(t.bonus)}`, owner.o.position.x, 2.2, owner.o.position.z);
    toast(`Today's target met: ${TARGETS[t.kind].txt(t.need).toLowerCase()}. Bonus ${fmt(t.bonus)}, reputation +2.`, 'good'); const g = gusChar(); if (g && !S.gus.retired) gusSay(g, 'That\'s the target, boss. Your grandad would have bought a round.'); save(); }
}
const targetProg = () => { if (chalkOn()) return null; const D = S.day, t = D && D.target; if (!t) return null; return [Math.min(t.need, Math.max(0, TARGETS[t.kind].got(D.at || daySnap()))), t.need, t]; };
function morning(){ clockIn(); if (S.nextLevel && S.levelUp && S.nextLevel === S.level + 1) { const n = S.nextLevel; S.nextLevel = 0; startLevel(n).then(() => { whistle(); sfxAt('clank', 5, SITE.z1); toast(`${dayDate(dayNo())}. 07:00: the first morning of Level ${n}.`, 'gold'); }); return; } S.nextLevel = 0; whistle(); sfxAt('clank', 5, SITE.z1); toast(`${dayDate(dayNo())}. 07:00: the shift whistle. The gates swing open.`, 'gold'); wxForecastToast(); const g = gusChar(); if (g && !S.gus.retired) gusSay(g, pick(['Morning, boss. Kettle\'s on.', 'Another day, another lorry.', 'Frost on the timber. She\'ll cut fine.', 'Morning. The radio says rain later.'])); }

/* =====================================================================
   BOLT (Bible v2.0 2.1, 7 Level 2, 17.5). A stray dog wanders in at lunch on Level 2's Thursday; the owner shares a
   sandwich and Bolt stays for good. He trots after the owner, sits when the owner stands still, naps by Old Faithful,
   barks at lorries, lies in the shade in a heat wave and shakes himself dry next to the owner after a shower. He keeps
   out of every vehicle's way, never walks up the forklift ramp (he uses the people's paths) and never counts as crew.
   ===================================================================== */
const bolt = { o:null, on:false, path:null, mode:'follow', t:0, sp:0, anim:0, bark:0, shake:0, lastTruck:null, gone:false, seated:false, napAt:null };
function buildBolt(){
  // a rough-coated valley mongrel: tan with a darker saddle, white chest and socks, one ear up and one flopped, a red collar
  const g = new THREE.Group(), fur = std('#9a6a3c', .95), furD = std('#6a4325', .95), pale = std('#efe4cf', .95), dark = std('#1d1611', .55), collar = std('#a8231c', .5), tongue = std('#c9636a', .6);
  const SPH = new THREE.SphereGeometry(1, 14, 10);
  const mesh = (geo, m, x, y, z, par, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; par.add(o); return o; };
  const body = new THREE.Group(); body.position.y = .36; g.add(body);
  mesh(new THREE.CapsuleGeometry(.1, .28, 6, 12), fur, 0, 0, 0, body).rotation.z = Math.PI / 2;   // the barrel, nose to tail along +x
  mesh(SPH, fur, -.16, .01, 0, body, .12, .115, .105);      // haunches
  mesh(SPH, pale, .13, -.035, 0, body, .115, .1, .092);     // white chest
  mesh(SPH, furD, -.03, .065, 0, body, .19, .05, .085);     // the darker saddle
  const neck = mesh(new THREE.CylinderGeometry(.055, .072, .15, 10), fur, .2, .075, 0, body); neck.rotation.z = -.85;
  mesh(new THREE.TorusGeometry(.064, .013, 6, 16), collar, 0, -.01, 0, neck).rotation.x = Math.PI / 2;
  const head = new THREE.Group(); head.position.set(.29, .15, 0); body.add(head);
  mesh(SPH, fur, 0, 0, 0, head, .082, .078, .072);           // skull
  mesh(new THREE.CylinderGeometry(.03, .043, .11, 10), pale, .085, -.026, 0, head).rotation.z = -Math.PI / 2;   // muzzle
  mesh(SPH, dark, .143, -.014, 0, head, .021, .017, .022);  // nose
  for (const z of [-.038, .038]) mesh(SPH, dark, .058, .026, z, head, .012, .014, .012);   // eyes
  const ears = []; for (const z of [-.05, .05]) { const e = new THREE.Group(); e.position.set(-.012, .055, z); head.add(e); const m = mesh(new THREE.ConeGeometry(.034, .085, 4), furD, 0, .038, 0, e, 1, 1, .4); m.rotation.y = Math.PI / 4; ears.push(e); }
  ears[0].rotation.x = -.25; ears[1].rotation.set(.9, 0, -.6);   // one up, one flopped
  const tg = mesh(new THREE.BoxGeometry(.05, .012, .03), tongue, .11, -.06, 0, head); tg.visible = false;
  const tail = new THREE.Group(); tail.position.set(-.25, .05, 0); body.add(tail);
  mesh(new THREE.CylinderGeometry(.017, .028, .13, 8), fur, -.055, .035, 0, tail).rotation.z = 1.0;
  mesh(new THREE.CylinderGeometry(.009, .017, .1, 8), pale, -.12, .1, 0, tail).rotation.z = .45;   // white tip
  const legs = []; for (const [x, z, front] of [[.155, .062, 1], [.155, -.062, 1], [-.16, .062, 0], [-.16, -.062, 0]]) { const L = new THREE.Group(); L.position.set(x, .3, z); g.add(L);
    mesh(new THREE.CylinderGeometry(.028, .04, .17, 8), fur, 0, -.07, 0, L); mesh(new THREE.CylinderGeometry(.02, .027, .15, 8), front ? pale : fur, front ? .008 : -.018, -.21, 0, L); mesh(SPH, pale, front ? .02 : -.006, -.284, 0, L, .036, .021, .03); legs.push(L); }
  g.add(blob(.7, .4)); g.userData.dyn = true; g.visible = false; world.add(g);
  bolt.o = g; bolt.body = body; bolt.head = head; bolt.tail = tail; bolt.legs = legs; bolt.tongue = tg; return g;
}
// his own place: a kennel Gus knocks up from offcuts in the warm corner by Old Faithful, his blanket and his water bowl
const KENNEL = [3.15, -8.2];
function buildKennel(){ if (M.kennel) return M.kennel; const g = new THREE.Group(); g.position.set(KENNEL[0], 0, KENNEL[1]); g.userData.dyn = true;
  const wood = std('#8d6a45', .85), plank = std('#a07a50', .85), roof = std('#5b3428', .8), dark = std('#120d09', .95), rug = std('#8e2d2a', .9), rugL = std('#c9a24a', .9), steel = std('#9aa3aa', .35, .7), water = std('#5b86a8', .2);
  const box = (w, h, d, m, x, y, z, rx = 0, rz = 0) => { const b = new THREE.Mesh(BX(w, h, d), m); b.position.set(x, y, z); b.rotation.set(rx, 0, rz); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  box(.56, .4, .5, wood, 0, .22, 0); for (let k = 0; k < 4; k++) box(.565, .012, .505, plank, 0, .07 + k * .1, 0);   // weatherboard walls
  box(.6, .03, .34, roof, 0, .52, -.13, -.62); box(.6, .03, .34, roof, 0, .52, .13, .62); box(.04, .07, .5, wood, -.24, .45, 0); box(.04, .07, .5, wood, .24, .45, 0);   // pitched roof
  box(.2, .22, .01, dark, 0, .14, .252); const arch = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .01, 14, 1, false, 0, Math.PI), dark); arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2; arch.position.set(0, .25, .252); g.add(arch);   // the arched doorway
  const plate = board(textTex([['BOLT', 40, 34]], 128, 48, { bg:'#ece6d9', fg:'#3a2a20', border:'#6b4a2a', bw:4 }), .18, .07); plate.position.set(0, .4, .257); g.add(plate);
  box(.5, .02, .38, rug, 0, .012, .5); for (const x of [-.12, .12]) box(.025, .022, .38, rugL, x, .013, .5); box(.5, .022, .025, rugL, 0, .013, .5);   // his tartan blanket
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.075, .06, .05, 14), steel); bowl.position.set(.38, .025, .38); g.add(bowl); const w = new THREE.Mesh(new THREE.CircleGeometry(.065, 14), water); w.rotation.x = -Math.PI / 2; w.position.set(.38, .046, .38); g.add(w);
  world.add(g); M.kennel = g; addCol([KENNEL[0] - .3, KENNEL[1] - .27, KENNEL[0] + .3, KENNEL[1] + .27], 'kennel'); rebuildNav(); return g; }
const boltHere = () => !!(S.bolt && S.bolt.joined);
function boltGo(x, z){ const p = bolt.o.position; bolt.path = findPath(p.x, p.z, x, z); bolt.goal = [x, z]; }
// one step along his path; false while still going
// a point a dog's body fits at: clear of every collider by his radius, inside the bounds unless he is still a stray outside
function boltFree(x, z, inside = true){ for (const [k, [x0, z0, x1, z1]] of COL) { if (k === 'truck' || k === 'supply') continue; if (x > x0 - RAD && x < x1 + RAD && z > z0 - RAD && z < z1 + RAD) return false; }
  if (inside) { const b = siteBounds(); if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return false; } return true; }
// the dog moves like an animal: he speeds up and slows down (no instant full speed), turns at a natural rate and slows for
// a sharp turn; when something holds him back (a pillar, the car, a fence corner) he first plans a new way, and if that is
// blocked too he steps aside into open ground and tries again, so he never stands pressing against an obstacle
function boltStep(dt, sp){
  if (!bolt.path || !bolt.path.length) { bolt.v = Math.max(0, (bolt.v || 0) - dt * 9); bolt.sp = bolt.v; return true; }
  const outside = ['arrive', 'stray', 'meet', 'eat'].includes(bolt.mode), p = bolt.o.position, [tx, tz] = bolt.path[0], dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  const want = Math.atan2(-dz, dx); let da = want - bolt.o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
  bolt.o.rotation.y += Math.sign(da) * Math.min(Math.abs(da), dt * 7.5);   // at most about 430 degrees a second
  const turnK = Math.max(.25, Math.cos(Math.min(Math.abs(da), 1.5)));     // a sharp turn: he slows into it
  const last = bolt.path.length === 1, brake = last ? Math.min(1, d / .9) : 1;   // eases in on the last point
  const target = sp * turnK * Math.max(.35, brake); bolt.v = bolt.v || 0; bolt.v += Math.max(-dt * 9, Math.min(dt * 6.5, target - bolt.v));
  if (d < Math.max(.08, bolt.v * dt * 1.5)) { const ox = p.x, oz = p.z; p.x = tx; p.z = tz; collide(p, !outside); if (Math.hypot(p.x - tx, p.z - tz) > .2) { p.x = ox; p.z = oz; }   // onto the point, unless that is inside something
    if (bolt.trail && bolt.trail[0] && bolt.trail[0][0] === tx && bolt.trail[0][1] === tz && bolt.trail.length > 1) bolt.trail.shift(); bolt.path.shift(); bolt.stuckT = 0; return !bolt.path.length; }
  const st = Math.min(d, bolt.v * dt), mx = dx / d, mz = dz / d, nx = p.x + mx * st, nz = p.z + mz * st;
  if (vehInWay(bolt, nx, nz)) { bolt.v = 0; bolt.sp = 0; bolt.blocked = (bolt.blocked || 0) + dt; if (bolt.blocked > 1.5) { bolt.blocked = 0; bolt.path = null; } return false; }   // a vehicle in the way: he waits, then thinks again
  bolt.blocked = 0; const ox = p.x, oz = p.z; p.x = nx; p.z = nz; collide(p, !outside); bolt.sp = bolt.v;
  // progress check: less than a third of the step made good, for 0.6 s together, means he is held up
  const made = (p.x - ox) * mx + (p.z - oz) * mz; if (st > .002 && made < st * .33) bolt.stuckT = (bolt.stuckT || 0) + dt; else bolt.stuckT = Math.max(0, (bolt.stuckT || 0) - dt * 2);
  if (bolt.stuckT > .6) { bolt.stuckT = 0; bolt.stuckN = (T - (bolt.stuckAt || -9) < 4 ? (bolt.stuckN || 0) : 0) + 1; bolt.stuckAt = T; const goal = bolt.path[bolt.path.length - 1];
    if (bolt.stuckN === 1) { const np = findPath(p.x, p.z, goal[0], goal[1]); bolt.path = np.length ? np : [goal]; }   // a new way round
    else { let best = null, bs = -1e9; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; for (const r of [.7, 1.2]) { const qx = p.x + Math.cos(a) * r, qz = p.z + Math.sin(a) * r;
        if (!boltFree(qx, qz, !outside) || segBlocked(p.x, p.z, qx, qz, RAD * .8)) continue; const sc = -Math.hypot(goal[0] - qx, goal[1] - qz) + r * .3; if (sc > bs) { bs = sc; best = [qx, qz]; } } }
      if (best) { const np = findPath(best[0], best[1], goal[0], goal[1]); bolt.path = [best, ...(np.length ? np : [goal])]; } bolt.stuckN = 0; } }   // step aside into the open, then on
  return false;
}
function boltAnim(dt){
  const run = bolt.sp > .2, k = run ? bolt.sp / 3 : 0; bolt.anim += dt * (run ? 13 * Math.min(1.4, .6 + k) : 0);
  const sit = ['sit', 'beg', 'stray', 'meet'].includes(bolt.mode), lie = ['nap', 'shade', 'down'].includes(bolt.mode), eat = bolt.mode === 'eat', sniff = ['sniff', 'sniffing', 'patrolSniff'].includes(bolt.mode);
  bolt.legs.forEach((L, i) => { const tgt = lie ? (i < 2 ? -1.35 : 1.35) : sit && i >= 2 ? .9 : run ? Math.sin(bolt.anim + (i === 0 || i === 3 ? 0 : Math.PI)) * .55 : 0; L.rotation.z += (tgt - L.rotation.z) * Math.min(1, dt * 12); });
  const by = lie ? .16 : sit ? .33 : .36 + (run ? Math.abs(Math.sin(bolt.anim)) * .03 : 0), br = sit ? .42 : lie ? 0 : 0;
  bolt.body.position.y += (by - bolt.body.position.y) * Math.min(1, dt * 10); bolt.body.rotation.z += (br - bolt.body.rotation.z) * Math.min(1, dt * 10);
  bolt.tail.rotation.y = Math.sin(T * (bolt.mode === 'beg' || eat || run ? 16 : bolt.mode === 'stray' ? 3 : 5)) * (lie ? .1 : bolt.mode === 'stray' ? .25 : .6);
  bolt.tail.rotation.z = bolt.mode === 'stray' ? -.7 : 0;   // a stray's tail low and tucked, a happy dog's up
  bolt.head.rotation.z = bolt.bark > 0 ? Math.sin(bolt.bark * 30) * .25 : eat ? -.75 + Math.abs(Math.sin(T * 9)) * .2 : sniff ? -.62 + Math.sin(T * 11) * .05 : lie ? -.25 : 0; bolt.bark = Math.max(0, bolt.bark - dt);
  if (bolt.tongue) bolt.tongue.visible = (run && bolt.sp > 2.4) || (heatOn() && !lie);   // panting
  if (bolt.shake > 0) { bolt.shake -= dt; bolt.body.rotation.x = Math.sin(bolt.shake * 40) * .35; if (Math.random() < dt * 30) sprite('#cfe0ee', bolt.o.position.x + rand(-.3, .3), .45, bolt.o.position.z + rand(-.3, .3), rand(-1.5, 1.5), rand(.5, 1.5), rand(-1.5, 1.5), .5, .05, -6); } else bolt.body.rotation.x = 0;
}
// a moving vehicle with Bolt in or near its line: he steps sideways out of it at once (never along it), so nobody waits for anybody
function boltDodge(dt){
  const b = bolt.o.position, list = [[fork.o, fork.o && /^to/.test(fork.state), 1.3, .8], [M.truck, ['arrive', 'leave'].includes(truck.state), 4.2, 1.35], [M.flat, ['arrive', 'leave'].includes(sup.state), 4.2, 1.35], [M.car, !!trip && ['out', 'back', 'park'].includes(trip.phase), 2.6, 1.0]];
  for (const [m, on, half, hw] of list) { if (!on || !m || !m.visible) continue; const a = m.rotation.y, fx = Math.cos(a), fz = -Math.sin(a), rx = b.x - m.position.x, rz = b.z - m.position.z, along = rx * fx + rz * fz, side = -rx * fz + rz * fx;
    if (Math.abs(along) > half + 1.8 || Math.abs(side) > hw + .9) continue;
    // the clear side first (his own side if both are open); with walls both ways, back along the vehicle's line, away from it
    const free = sg => !segBlocked(b.x, b.z, b.x - fz * sg * 1.2, b.z + fx * sg * 1.2, .12), s0 = side >= 0 ? 1 : -1, sg = free(s0) ? s0 : free(-s0) ? -s0 : 0, st = 3.2 * dt;
    if (sg) { b.x += -fz * sg * st; b.z += fx * sg * st; } else { const ag = along >= 0 ? 1 : -1; b.x += fx * ag * st; b.z += fz * ag * st; }
    collide(b);
    bolt.sp = 3.2; bolt.path = null; bolt.mode = 'follow'; bolt.o.rotation.y = sg ? Math.atan2(-(fx * sg), -fz * sg) : Math.atan2(-fz * (along >= 0 ? 1 : -1), fx * (along >= 0 ? 1 : -1)); return true; }
  return false;
}
function boltBark(n = 2){ bolt.bark = .6; for (let i = 0; i < n; i++) setTimeout(() => sfxAt('bark', bolt.o.position.x, bolt.o.position.z, .8), i * 260); }
const BOLT_NAP = [3.15, -7.58], BOLT_SHADE = [-12.6, -2.35];   // on his blanket at the kennel door (the warm pocket between the workshop wall and Old Faithful, off every lane); in the workshop's shadow
const STRAY_AT = [4.3, 13.15], STRAY_RING = [4.3, 11.95], STRAY_ASIDE = [2.2, 11.85];   // the stray sits on the pavement in the open gateway (the gate leaves swing out over the pavement, so he comes along the kerb); the owner crouches just inside; a vehicle coming: he ducks inside the fence by the west post, off the lorry's line
// he follows the owner's own footsteps (the same gate, round the same corners), a dog's length behind: the owner's trail
// is a line of points 30 cm apart; far behind, or with no trail yet, he finds his own way to its start
function boltTrail(){ const o = owner.o.position, t = bolt.trail ||= []; const L = t[t.length - 1]; if (!L || Math.hypot(o.x - L[0], o.z - L[1]) > .3) { t.push([o.x, o.z]); if (t.length > 90) t.shift(); } }
function boltFollow(dt, dO, flee){
  const t = bolt.trail ||= [], b = bolt.o.position, o = owner.o.position;
  while (t.length > 1 && Math.hypot(t[0][0] - b.x, t[0][1] - b.z) < .22) t.shift();
  let ahead = t.length ? Math.hypot(t[0][0] - b.x, t[0][1] - b.z) : dO; for (let i = 1; i < t.length; i++) ahead += Math.hypot(t[i][0] - t[i - 1][0], t[i][1] - t[i - 1][1]);
  if (t.length) ahead += Math.hypot(o.x - t[t.length - 1][0], o.z - t[t.length - 1][1]);
  if (ahead < 1.5 && dO < 2 && !flee) return false;   // close behind the owner: stop
  // the next footprint straight ahead if nothing stands between; otherwise (or far behind) he finds his way round to it
  if (!t.length || Math.hypot(t[0][0] - b.x, t[0][1] - b.z) > 2.5 || segBlocked(b.x, b.z, t[0][0], t[0][1], RAD)) { if (T - (bolt.rp || 0) > .6 || !bolt.path || !bolt.path.length) { bolt.rp = T; boltGo(t.length ? t[0][0] : o.x, t.length ? t[0][1] : o.z);
      if (!bolt.path || !bolt.path.length) { if (t.length > 1) t.shift(); bolt.path = [t.length ? t[0] : [o.x, o.z]]; } } }   // no way found from right beside an obstacle: straight on, and past that footprint
  else bolt.path = [t[0]];
  boltStep(dt, Math.min(4.4, 1.3 + ahead * .8)); return true;
}
// beside an owner who is standing still: he sits, then has a sniff round (a couple of metres, nose down, never out of
// sight), comes back, and after a while lies down at the owner's feet; the owner moving off ends it all at once
function boltIdle(dt, o, b, dO, idle){
  const face = (x, z, k = 6) => { let da = Math.atan2(-(z - b.z), x - b.x) - bolt.o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); bolt.o.rotation.y += da * Math.min(1, dt * k); };
  if (idle < 1.2) { bolt.mode = 'follow'; bolt.path = null; boltStep(dt, 0); face(o.x, o.z); return; }
  if (bolt.mode === 'sniff') { if (dO > 4.5) { bolt.mode = 'follow'; bolt.path = null; return; } if (boltStep(dt, 1.0)) { bolt.mode = 'sniffing'; bolt.t = 1.5 + Math.random() * 1.6; } return; }
  if (bolt.mode === 'sniffing') { bolt.t -= dt; bolt.v = 0; bolt.sp = 0; bolt.o.rotation.y += Math.sin(T * 2.3) * dt * .8; if (bolt.t <= 0) { bolt.mode = 'sit'; bolt.sitT = T; } return; }
  boltStep(dt, 0); bolt.path = null;
  if ((idle > 20 && (bolt.sniffs || 0) >= 2) || idle > 28) { bolt.mode = 'down'; face(o.x, o.z, 2); return; }   // lies down by the owner
  bolt.mode = 'sit'; face(o.x, o.z);
  if (idle > 6 && (bolt.sniffs || 0) < 2 && T - (bolt.sitT || 0) > 3 + Math.random() * 3) {   // off for a sniff somewhere close and open
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 1.3 + Math.random() * 1.4, qx = o.x + Math.cos(a) * r, qz = o.z + Math.sin(a) * r;
      if (!boltFree(qx, qz) || segBlocked(b.x, b.z, qx, qz, RAD)) continue; bolt.path = [[qx, qz]]; bolt.mode = 'sniff'; bolt.sniffs = (bolt.sniffs || 0) + 1; return; }
    bolt.sitT = T; }
}
// night watch: a slow round of the yard (the gate, the dock, the back yard, Old Faithful, the stock room, the trolley bay),
// a sniff at every stop and a bark at the gate; with the morning whistle he runs back to the owner
const NIGHT_ROUND = () => [P.frontIn, P.patrol[3], [16.5, -3.0], P.filler, P.storeSpot, P.patrol[0]];
function boltPatrol(dt){ const R = NIGHT_ROUND(), b = bolt.o.position; bolt.pi = bolt.pi || 0; const at = R[bolt.pi % R.length];
  if (bolt.mode === 'patrolSniff') { bolt.t -= dt; bolt.v = 0; bolt.sp = 0; bolt.o.rotation.y += Math.sin(T * 2.1) * dt * .7; if (bolt.t <= 0) { bolt.pi++; bolt.mode = 'patrol'; bolt.path = null; } return; }
  if (bolt.mode !== 'patrol') { bolt.mode = 'patrol'; bolt.path = null; }
  if (!bolt.path || !bolt.path.length) { if (Math.hypot(b.x - at[0], b.z - at[1]) < .4) { bolt.mode = 'patrolSniff'; bolt.t = 2 + Math.random() * 2.5; if (bolt.pi % R.length === 0) boltBark(2); return; } const np = findPath(b.x, b.z, at[0], at[1]); bolt.path = np.length ? np : [at]; }
  boltStep(dt, 1.35); }
// the shared sandwich: half of it on the ground in front of him, the owner crouched beside him
function boltFeed(){ bolt.mode = 'eat'; bolt.t = 0; const b = bolt.o.position, f = bolt.o.rotation.y, x = b.x + Math.cos(f) * .32, z = b.z - Math.sin(f) * .32;
  const s = new THREE.Group(); const bread = std('#e2c48a', .9), fill = std('#b8443a', .8); for (const y of [.012, .05]) { const m = new THREE.Mesh(BX(.13, .025, .1), bread); m.position.y = y; m.castShadow = true; s.add(m); }
  const f2 = new THREE.Mesh(BX(.135, .018, .105), fill); f2.position.y = .031; s.add(f2); s.position.set(x, 0, z); s.rotation.y = f + .4; s.userData.dyn = true; world.add(s); bolt.sandwich = s;
  owner.faceNow && owner.faceNow(Math.atan2(-(b.z - owner.o.position.z), b.x - owner.o.position.x)); sfx('tap'); }
function strayHtml(){ return `<div class="who"><img alt="" src="${portrait('gus')}"><div><b>A stray at the gate</b><small>Thursday dinner time · the main gate</small></div></div>
  <p class="quote">A thin brown dog with one ear up and one ear down, ribs showing, sitting very politely on the verge. His eyes have not left your sandwich since you came out of the gate.</p>
  <p class="quote">"No collar, no tag. He's been round the back of the bakery all week." · Gus</p>
  <div class="offer"><b>Share your sandwich</b><button class="btn primary" data-feed type="button">Crouch down and share it</button><p>Half your cheese and pickle on the ground for him. A dog fed is a dog that stays.</p></div>`; }
function updateBolt(dt){
  S.bolt ||= { joined:false };
  if (S.bolt.joined && owner && owner.o.visible && !trip) boltTrail();
  if (!bolt.o) buildBolt();
  // the arrival (Bible v2.0 2.1, 7 L2 Thursday): at lunch a thin stray trots up the verge and sits outside the gate watching the
  // sandwiches. The owner goes out to him; a card, a shared sandwich on the ground, and he follows the owner in: Bolt stays for good
  if (!S.bolt.joined) { bolt.o.visible = bolt.on;
    const ring = () => M.rings && M.rings.stray;
    if (!bolt.on && S.level >= 2 && S.tutDone && lunchTime() && (S.level > 2 || weekday() >= 3) && !cardOpen && !closingTime()) { bolt.on = true; bolt.o.visible = true; bolt.o.position.set(STRAY_AT[0] - 10, 0, 14.65); bolt.mode = 'arrive'; bolt.path = [[STRAY_AT[0], 14.65], STRAY_AT];
      toast('A thin stray dog trots up the pavement and sits in the open gateway, watching the crew\'s sandwiches. Go to the gate.', 'gold'); }
    if (bolt.on) {
      if (bolt.mode === 'arrive') { if (boltStep(dt, 1.5)) { bolt.mode = 'stray'; bolt.sp = 0; if (!ring()) M.ring('stray', ...STRAY_RING, '#e8ab2c', .5); ring().g.visible = true; } }
      else if (bolt.mode === 'stray') { const traffic = ['arrive', 'leave'].includes(truck.state) || ['arrive', 'leave'].includes(sup.state) || !!(trip && M.car && M.car.visible) || (truckB && ['arrive', 'leave'].includes(truckB.state));
        const spot = traffic ? STRAY_ASIDE : STRAY_AT, dS = Math.hypot(bolt.o.position.x - spot[0], bolt.o.position.z - spot[1]);
        if (bolt.aside !== traffic) { bolt.aside = traffic; bolt.path = [[STRAY_AT[0], 12.0], spot]; bolt.stuckT = 0; bolt.lastD = 1e9; }
        if (dS > .1 && (bolt.stuckT || 0) < 1.5) { bolt.stuckT = dS > (bolt.lastD ?? 1e9) - .002 ? (bolt.stuckT || 0) + dt : 0; bolt.lastD = dS; boltStep(dt, 2.6); boltAnim(dt); return; }   // out of the gateway while anything drives through; a shut gate in his way: he settles where he is
        bolt.sp = 0; const o = owner.o.position, b = bolt.o.position; let da = Math.atan2(-(o.z - b.z), o.x - b.x) - bolt.o.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); bolt.o.rotation.y += da * Math.min(1, dt * 4);
        if (Math.random() < dt * .25) sfxAt('bark', b.x, b.z, .25);   // a small whine
        if (ring()) ring().g.visible = true;
        if (!traffic && near(owner.o, STRAY_RING, .6) && ownerStill() && !cardOpen) { bolt.mode = 'meet'; story({ kind:'stray' }); } }
      else if (bolt.mode === 'meet') { if (!cardOpen) boltFeed(); }   // the card's button (or its skip): the sandwich
      else if (bolt.mode === 'eat') { bolt.t += dt; bolt.sp = 0; owner.lock = Math.max(owner.lock || 0, .2); owner.play('work');
        if (bolt.sandwich) { const k = Math.max(0, 1 - bolt.t / 3.6); bolt.sandwich.scale.setScalar(.35 + k * .65); if (Math.random() < dt * 5) sprite('#e9d8a8', bolt.sandwich.position.x, .05, bolt.sandwich.position.z, rand(-.3, .3), rand(.2, .5), rand(-.3, .3), .5, .05, -2); }
        if (bolt.t > 4.2) { if (bolt.sandwich) { bolt.sandwich.removeFromParent(); bolt.sandwich = null; } if (ring()) ring().g.visible = false;
          S.bolt.joined = true; S.bolt.at = S.time; bolt.mode = 'beg'; bolt.t = 0; bolt.trail = []; sfx('hire'); buildKennel();
          toast('He wolfs down half your sandwich and licks your hand. He is yours now: the crew call him Bolt, and Gus knocks up a kennel from offcuts in the warm corner by Old Faithful.', 'gold');
          const g = gusChar(); if (g && !S.gus.retired) gusSay(g, 'Look who\'s come for his dinner. He\'ll keep the rats off the timber.'); save(); } }
      boltAnim(dt); }
    return; }
  if (!M.kennel) buildKennel();   // an older save with Bolt already in the yard
  bolt.on = true; bolt.o.visible = true;   // in the yard day and night: at night he keeps watch
  const o = owner.o.position, b = bolt.o.position, dO = Math.hypot(o.x - b.x, o.z - b.z);
  if (owner.stepTo || (owner.lastPos && Math.hypot(o.x - owner.lastPos[0], o.z - owner.lastPos[1]) > .01)) bolt.lastMove = T; owner.lastPos = [o.x, o.z];
  const ownerIdle = T - (bolt.lastMove || 0);
  // lorries arriving get barked at
  if (truck.state === 'arrive' && bolt.lastTruck !== 'arrive' && Math.hypot(M.truck.position.x - b.x, M.truck.position.z - b.z) < 18) boltBark(2); bolt.lastTruck = truck.state;
  // a shower has just passed: a good shake next to the owner
  if (wx.from === 'shower' && wx.kind !== 'shower' && wx.k > .3 && wx.k < .5 && !bolt.shook && dO < 4) { bolt.shook = true; bolt.shake = 1.1; } if (wx.kind === 'shower') bolt.shook = false;
  // anything moving close by: he trots to the owner's side
  let flee = false; for (const [m, on] of [[fork.o, fork.o && /^to/.test(fork.state)], [M.truck, ['arrive', 'leave'].includes(truck.state)], [M.flat, ['arrive', 'leave'].includes(sup.state)], [M.car, !!trip]]) if (on && m && Math.hypot(m.position.x - b.x, m.position.z - b.z) < 3.2) flee = true;
  if (boltDodge(dt)) { boltAnim(dt); return; }
  const closing = S.day && S.day.closing, trip_ = !!trip;
  let want = closing ? (ownerOff() ? 'patrol' : 'follow') : trip_ ? 'nap' : heatOn() && ownerIdle > 6 ? 'shade' : lunchTime() && dO > 3 && ownerIdle > 4 ? 'nap' : ownerIdle > 28 && dO > 5 ? 'nap' : 'follow';
  if (flee) want = 'follow';
  if (want === 'follow') { if (bolt.mode === 'nap' && dO > 4 && ownerIdle > 2 && !flee) want = 'nap';   // asleep: he stays asleep unless the owner comes by or moves off
    else if (!['sniff', 'sniffing'].includes(bolt.mode) && boltFollow(dt, dO, flee)) { bolt.mode = 'follow'; bolt.sniffs = 0; }
    else boltIdle(dt, o, b, dO, ownerIdle); }
  if (want !== 'follow') bolt.trail = [];   // asleep or away: the trail starts again from where the owner is when he wakes
  if (want === 'patrol') { boltPatrol(dt); boltAnim(dt); return; }
  if (want === 'nap' || want === 'shade') { const at = want === 'shade' ? BOLT_SHADE : BOLT_NAP;
    if (Math.hypot(b.x - at[0], b.z - at[1]) > .3) { if (!bolt.path || !bolt.goal || bolt.goal[0] !== at[0]) boltGo(...at); if (boltStep(dt, 1.8)) bolt.sp = 0; bolt.mode = 'go'; }
    else { bolt.sp = 0; bolt.mode = want; bolt.o.rotation.y = -Math.PI / 2; } }   // lying on his blanket facing out of the kennel door (or out of the shade)
  boltAnim(dt);
}

/* =====================================================================
   VERA LIND'S VISIT (Bible v2.0 2.1, 14.5). Level 2: the estate agent walks up the verge to her land board left of the main
   gate, pins up her notice, then comes in through the gate to find the owner wherever they are and introduces herself.
   She does not stand at the roadside waiting to be found. Introduced, she walks back out and on to town. Land itself
   opens at Level 3; from then on she comes with the papers to the plot's sign.
   ===================================================================== */
let veraWalk = null;
const VERA_FROM = [-19.5, 13.9], VERA_PIN = [-6.9, 13.9];
function updateVeraVisit(dt){
  const w = veraWalk;
  if (!w) { if (S.level !== 2 || S.met.vera || !S.tutDone || cardOpen || closingTime() || (S.gus && S.gus.party) || dayMin() < 90 || dayMin() > SHIFT_MIN - 90) return;
    const c = spawnFolk('vera', VERA_FROM, 0); if (!c) return; c.path = [VERA_PIN]; veraWalk = { c, st:'verge', t:0 }; return; }
  const c = w.c; c.home = [c.o.position.x, c.o.position.z]; w.t += dt;   // the badge and the meeting go wherever she is
  if (w.st === 'verge') { if (walk(c, dt)) { w.st = 'pin'; w.t = 0; c.faceNow(Math.PI / 2); c.play('work'); } else c.play('walk'); return; }
  if (w.st === 'pin') { c.play('work'); if (w.t > 2.2) { w.st = 'in'; w.t = 0; c.path = [P.frontOut]; sfxAt('tap', c.o.position.x, c.o.position.z, .4); } return; }
  if (w.st === 'in') { if (walk(c, dt)) { w.st = 'seek'; w.t = 0; c.rp = 0; } else c.play('walk'); return; }
  if (w.st === 'seek') {   // to the owner: re-aimed every second; with the owner away in the car she waits by the gate counter
    if (S.met.vera) { w.st = 'out'; c.say = { text:'I\'ll leave you to it. Good luck with the works.', until:T + 3 }; goTo(c, ...P.frontOut); return; }
    const o = owner.o.position, away = !!trip || !owner.o.visible, d = Math.hypot(o.x - c.o.position.x, o.z - c.o.position.z);
    if (!away && d < 1.5) { c.play('idle'); c.faceTo([o.x, o.z], dt); if (!cardOpen) meet('vera'); return; }
    if (T - (c.rp || 0) > 1) { c.rp = T; const at = away ? TRADE : [o.x + (o.x > c.o.position.x ? -.9 : .9), o.z]; goTo(c, ...at); if (!w.hi && !away) { w.hi = true; c.say = { text:'Hello! Have you a minute?', until:T + 3 }; } }
    if (walk(c, dt)) c.play('idle'); else c.play('walk'); return; }
  if (w.st === 'out') { if (walk(c, dt)) { if (!w.back) { w.back = true; c.path = [VERA_PIN, VERA_FROM]; } else { despawnFolk('vera'); veraWalk = null; } } else c.play('walk'); }
}

/* =====================================================================
   PAY DAY (Bible v2.0 3.3, 4.2, 5.7, 18.2). Friday 16:30: the wages hatch on the workshop front opens. The crew come to it
   when their hands are free, three in the queue at a time, and the owner, standing at the hatch, hands each one his
   packet: envelope over, cap tipped, back to work. On Levels 1-4 grandad's estate pays the wages, so the packets cost
   the owner nothing. Anybody not paid by the knocking-off whistle gets his packet at the gate on the way out.
   ===================================================================== */
const PAY_AT = [-2.6, -1.85], PAY_Q = [[-1.8, -1.8], [-1.0, -1.8], [-0.2, -1.8], [0.6, -1.8], [1.4, -1.8]];   // a longer line for a bigger crew
const payTime = () => !!(S.tutDone && S.day && !S.day.closing && isFriday() && dayMin() >= PAY_MIN && !(S.gus && S.gus.party));
const payDay = () => S.day && S.day.pay && S.day.pay.n === dayNo() ? S.day.pay : null;
const estatePays = () => S.level <= 4;   // v2.0 18.2: the weekly accounts start at Level 5
const payNeeded = () => S.staff.filter(st => st.posted !== false);
const ownerAtHatch = () => !!owner && near(owner.o, PAY_AT, .62) && !trip;
function buildHatch(){
  if (M.hatch) return M.hatch; const g = new THREE.Group(); g.userData.dyn = true; g.position.set(PAY_AT[0], 0, -2.5); world.add(g);
  const olive = new THREE.MeshStandardMaterial({ color:'#55613a', roughness:.8 }), dark = new THREE.MeshStandardMaterial({ color:'#2b2a24', roughness:.9 }), wood = new THREE.MeshStandardMaterial({ color:'#8a6a44', roughness:.85 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  box(.96, .07, .1, olive, 0, 1.78, .05); box(.07, .76, .1, olive, -.45, 1.42, .05); box(.07, .76, .1, olive, .45, 1.42, .05);   // the frame round the hatch
  box(.84, .66, .02, dark, 0, 1.42, .015);                                                                                  // the dark office behind it
  box(.98, .05, .26, wood, 0, 1.03, .13); box(.06, .2, .06, wood, -.4, .92, .2); box(.06, .2, .06, wood, .4, .92, .2);       // the sill and its brackets
  const sh = new THREE.Group(); sh.position.set(0, 1.79, .1); g.add(sh); const lid = new THREE.Mesh(new THREE.BoxGeometry(.86, .68, .035), olive); lid.position.set(0, -.34, 0); lid.castShadow = true; sh.add(lid);   // the shutter, hinged at the top
  const tin = new THREE.Group(); tin.position.set(.22, 1.09, .14); g.add(tin); const tb = new THREE.Mesh(new THREE.BoxGeometry(.22, .08, .15), new THREE.MeshStandardMaterial({ color:'#7a2a22', roughness:.5, metalness:.3 })); tin.add(tb);
  for (let i = 0; i < 4; i++) { const e = new THREE.Mesh(new THREE.BoxGeometry(.13, .012, .08), new THREE.MeshStandardMaterial({ color:'#c9ab72', roughness:.9 })); e.position.set(-.2 - (i % 2) * .02, 1.065 + i * .013, .12); g.add(e); }   // the pile of packets
  const sign = board(textTex([['WAGES', 46, 30], ['FRIDAY 4.30', 22, 64, 500]], 256, 84, { bg:'#ece6d9', fg:'#2b2a24', border:'#55613a', bw:6 }), .62, .2); sign.position.set(0, 1.95, .1); g.add(sign);
  M.hatch = { g, sh, tin, open:0 }; return M.hatch;
}
let payRing = null;
function updatePay(dt){
  const hatch = !!S.restored.hatch;
  if (!hatch) { if (payTime() && !payDay()) { const sum = payNeeded().reduce((a, st) => a + (WAGES[st.role] || 120), 0); S.day.pay = { n:dayNo(), paid:{}, seq:0, sum, est:estatePays(), told:true, noHatch:true };
      if (payNeeded().length) toast(`16:30, pay day. ${S.level >= 2 ? 'No wages hatch yet: the packets go out at the gate at five. Build the hatch on the workshop front to hand them out yourself.' : 'The packets go out at the gate at five.'}`, 'gold'); } return; }
  const H = buildHatch(), want = payTime() ? 1 : 0; H.open += clamp(want - H.open, -dt * 1.5, dt * 1.5); H.sh.rotation.x = -H.open * 1.45; H.tin.visible = H.open > .5;
  if (M.ring && !payRing) { payRing = M.ring('pay', ...PAY_AT, '#e2a72c', .55); payRing.g.visible = false; }
  if (payRing) payRing.g.visible = want > 0 && !!payDay() && payNeeded().some(st => !payDay().paid[st.id]);
  if (!payTime()) return;
  if (!payDay()) { const sum = payNeeded().reduce((a, st) => a + (WAGES[st.role] || 120), 0);
    S.day.pay = { n:dayNo(), paid:{}, seq:0, sum, est:estatePays(), told:false }; if (!payNeeded().length) return;
    whistle(.5, .6); sfxAt('clank', ...PAY_AT); toast(`16:30, pay day. Stand at the wages hatch by the workshop door to hand out the packets${estatePays() ? ' (grandad\'s estate pays them)' : ''}.`, 'gold');
    const g = gusChar(); if (g && !S.gus.retired) gusSay(g, pick(['Pay day, boss! Hatch is open.', 'Packets are ready. The lads will be along.', 'Friday at last. Your grandad paid every man by hand.'])); }
  const pd = payDay(); if (!pd.told && dayMin() > PAY_MIN + 16 && !ownerAtHatch() && payNeeded().some(st => !pd.paid[st.id])) { pd.told = true; toast('The crew are waiting at the wages hatch for their packets.', ''); }
}
// one worker's part in pay day; true while he is busy with it
function payStep(c, dt){
  const pd = payDay(), st = c.st;
  if (!pd || !S.restored.hatch || !payTime() || pd.paid[st.id] || st.role === 'forklift' || st.role === 'clerk') { if (c.pay) { c.pay = null; c.state = 'idle'; c.path = null; c.task = null; } return false; }
  if (!c.pay) { if (c.stack.length || c.trolley || (c.tplanks && c.tplanks.length) || c.lunch || ['fixing', 'arrive', 'pour', 'fill', 'servicing'].includes(c.state)) return false;
    if ([...staffObj.values()].filter(o => o.pay).length >= PAY_Q.length) return false;
    releaseCart(c); c.state = 'pay'; if (cartHome(c, dt)) return true;
    c.pay = { seq:++pd.seq, t:0, slot:-1 }; c.task = null; }
  const line = [...staffObj.values()].filter(o => o.pay).sort((a, b) => a.pay.seq - b.pay.seq), k = line.indexOf(c), spot = PAY_Q[Math.min(k, PAY_Q.length - 1)];
  if (c.pay.slot !== k) { c.pay.slot = k; goTo(c, ...spot); c.state = 'pay'; }
  if (c.path && c.path.length) { walk(c, dt); return true; }
  c.play('idle'); c.faceTo(k === 0 ? PAY_AT : line[k - 1] ? [line[k - 1].o.position.x, line[k - 1].o.position.z] : PAY_AT, dt);
  const giver = ownerAtHatch() ? owner : clerkAtHatch() ? clerkChar() : null;
  if (k === 0 && giver) { c.pay.t += dt; giver.faceTo([c.o.position.x, c.o.position.z], dt);
    if (c.pay.t > .7 && !c.pay.given) { c.pay.given = true; giver.play('point'); giver.lock = .5; const e = new THREE.Mesh(new THREE.BoxGeometry(.13, .02, .08), new THREE.MeshStandardMaterial({ color:'#c9ab72' })); e.position.set(PAY_AT[0] + .2, 1.1, -2.4); scene.add(e);
      fly(e, c.o, new THREE.Vector3(0, 1.05, .25), .35, () => e.removeFromParent(), .3); sfx('pick'); }
    if (c.pay.t > 1.25) { pd.paid[st.id] = true; payPacket(st); c.pay = null; c.state = 'idle'; c.path = null; c.task = null; c.play('cheer'); c.say = { text:pick(['Thanks, boss!', 'Ta very much.', 'Cheers, boss. See you Monday.', 'That\'s the rent paid.']), until:T + 2.2 };
      floatText('Paid', c.o.position.x, 1.9, c.o.position.z, 'info'); sfx('coin');
      if (payNeeded().every(x => pd.paid[x.id] || x.role === 'forklift' || x.role === 'clerk')) { for (const x of payNeeded()) if (!pd.paid[x.id]) { pd.paid[x.id] = true; payPacket(x); } pd.byHand = true; toast('Every packet handed out. Caps tipped all round.', 'good'); sfx('buy'); save(); } } }
  return true;
}
// 17:00: whoever was not paid at the hatch gets his packet at the gate
function payAtGate(){ const pd = payDay(); if (!pd) return; const left = payNeeded().filter(st => !pd.paid[st.id]); if (!left.length) return;
  for (const st of left) { pd.paid[st.id] = true; payPacket(st); } pd.gate = left.length; if (typeof clerkOn === 'function' && clerkOn() && !pd.ledgered) { pd.ledgered = true; ledger(`Pay packets (${Object.keys(pd.paid).length}, ${left.length} at the gate)`, -(S.l5.wagesPaid || 0), 'June Finch'); } toast(`${left.length} pay packet${left.length > 1 ? 's' : ''} handed out at the gate on the way home.`, ''); }

// The crew at lunch: operators and loaders put down what they are doing (a loader finishes his carry first) and
// sit on the bench by the workshop; the ones who find no seat stand with them. The fitters stay on call.
// [x, z, seated]: a seated hand walks to the front of the bench, then sits back onto it facing the yard
// standing at lunch: at the bench's ends, close to the wall (level 4 runs the forklift lane along the workshop front)
const LUNCH_SPOTS = [...P.seats.map(s => [s[0], s[1] - .05, true]), [-11.3, -1.85], [-7.75, -1.85], [-11.9, -2.1], [-7.15, -2.05], [-12.5, -1.75], [-6.6, -1.75]];
function lunchSpot(c){ const taken = new Set([...staffObj.values(), ...folk.values()].filter(o => o !== c && o.lunchI !== undefined).map(o => o.lunchI)); for (let i = 0; i < LUNCH_SPOTS.length; i++) if (!taken.has(i)) return i; return LUNCH_SPOTS.length - 1; }
const SEAT_BACK = .2;   // from the front of the bench to over its seat
function sitDown(c, i){ const s = LUNCH_SPOTS[i]; c.o.position.set(s[0], 0, s[2] ? s[1] - SEAT_BACK : s[1]); if (s[2]) c.faceNow(0); }
function standUp(c){ const s = c.lunchI !== undefined && LUNCH_SPOTS[c.lunchI]; if (s && s[2]) c.o.position.set(s[0], 0, s[1]); }   // off the bench before walking, never through it
function lunchStep(c, dt){
  if (!lunchTime()) { if (c.lunch) { if (c.lunch === 'eat') standUp(c); c.lunch = null; c.lunchI = undefined; c.state = 'idle'; c.path = null; c.task = null; c.say = { text:pick(['Right, back to it.', 'Back to work.', 'That hit the spot.']), until:T + 2 }; } return false; }
  if (!c.lunch) { const r = c.st.role;
    if (!['operator', 'loader', 'helper'].includes(r) || c.st.posted === false || c.stack.length || c.trolley || (c.tplanks && c.tplanks.length) || ['arrive', 'pour', 'fill', 'cleaning'].includes(c.state)) return false;
    releaseCart(c); c.state = 'lunch'; if (cartHome(c, dt)) return true;
    c.lunch = 'go'; c.lunchI = lunchSpot(c); const s = LUNCH_SPOTS[c.lunchI]; goTo(c, s[0], s[1]); c.state = 'lunch'; c.task = null; }
  if (c.lunch === 'go') { if (walk(c, dt)) { c.lunch = 'eat'; sitDown(c, c.lunchI); } return true; }
  const s = LUNCH_SPOTS[c.lunchI]; c.play(s[2] ? 'sit' : 'idle'); if (!s[2]) c.faceTo([-9.7, -1.8], dt); return true;
}

/* =====================================================================
   WALK-IN TRADE AT THE GATE (build 0.18). Now and then somebody from the valley walks in off Mill Road and waits
   by the main gate for a few crates (or, once the pipe machine runs, a few pipes) for cash. The owner fetches them
   from the pallet or the pipe rack himself and hands them over: the crew stays on the lorry orders. Gate trade pays
   a quarter over the order rate, a tip for quick service; a customer left waiting walks off and the valley hears it.
   ===================================================================== */
const TRADE = P.trade;   // just inside the main gate, beside the west gate post: clear of the gate, the lorry path and the lane
const WALKERS = [
  { name:'Mrs Doyle', role:'Doyle\'s Bakery', want:'crate', n:[2, 3], parts:['hair_pony'], cols:{ suit:'#7a4a5a', shirt:'#efe6da', hair:'#4b3424' }, hi:'Morning! Crates for the bread rounds, love. Cash.', bye:'Lovely. Tell your grandad\'s ghost Mrs Doyle said hello.' },
  { name:'Len Hobbs', role:'Greengrocer, Mill Road', want:'crate', n:[3, 4], parts:['hat_cap', 'stache'], cols:{ suit:'#3f5a3a', hat:'#5a4a3a', shirt:'#d8d2c2', stache:'#6b4a2a' }, hi:'Apple boxes, son. My old ones fell apart.', bye:'Proper crates. Nailed square, these.' },
  { name:'Roy Haines', role:'Haines Farm', want:'crate', n:[4, 5], parts:['hat_cap', 'beard'], cols:{ suit:'#5d6b3a', hat:'#8a6a3e', shirt:'#c9b28a', stache:'#8a7a6a', hair:'#8a7a6a' }, hi:'Potato crates. Harvest won\'t wait.', bye:'That\'ll see me through the week.' },
  { name:'Father Quinn', role:'St Anne\'s jumble sale', want:'crate', n:[2, 2], parts:['hair_short'], cols:{ suit:'#1f1f22', shirt:'#1f1f22', hair:'#b8b2a6' }, hi:'Two crates for the jumble sale, if you can spare them.', bye:'Bless you. Come by on Saturday.' },
  { name:'Joe Pruitt', role:'Pruitt Removals', want:'crate', n:[3, 5], parts:['hat_cap', 'hair_short'], cols:{ suit:'#2f4a6a', hat:'#2f4a6a', shirt:'#e8e2d4' }, hi:'Packing crates. Family moving to the coast.', bye:'Cheers. Van\'s on the road.' },
  { name:'Sid Barker', role:'Plumber', want:'pipe', n:[2, 3], lv:2, parts:['hat_cap', 'toolbelt'], cols:{ suit:'#2c3a52', hat:'#c03a2a', shirt:'#d8d2c2' }, hi:'Couple of lengths of pipe. Burst main on Elm Street.', bye:'You\'ve saved a street from a cold bath.' },
  { name:'Nell Ward', role:'Ward\'s Hardware', want:'pipe', n:[2, 4], lv:2, parts:['hair_pony', 'clipboard'], cols:{ suit:'#6a4a2a', shirt:'#e8dcc0', hair:'#a8522a' }, hi:'Pipe for the shop. Customers keep asking.', bye:'I\'ll send folk your way.' },
  { name:'Marty Cole', role:'Builder', want:'pipe', n:[3, 4], lv:2, parts:['hat_hard', 'vest'], cols:{ suit:'#6b4a2a', hat:'#f2c230', vest:'#e5772b', shirt:'#d8d2c2' }, hi:'Scaffold\'s waiting on drain pipe. Cash in hand.', bye:'Same time next week, maybe.' },
];
const WALK_TIP_S = 35, walkPatience = () => S.restored.bell ? 160 : S.restored.counter ? 130 : 90;   // v2.0 5.2, 18.4: counter 130 s, bell 160 s
let walker = null, walkT = 0, walkNext = 45;
const walkWaiting = () => !!(walker && (walker.state === 'in' || walker.state === 'wait'));
const walkWant = type => walkWaiting() && walker.def.want === type ? walker.n - walker.got : 0;
// build 0.20: a gate customer is served from the pallet or the pipe rack, and when that is empty, from the warehouse
function gateSrc(type){
  const k = type === 'pipe' ? 'p' : 'c', near0 = type === 'pipe' ? S.pipes : S.pallet;
  if (near0 > 0 || !whReady() || !(S.wh[k] > 0)) return { at:type === 'pipe' ? P.prackSpot : P.pallet, have:near0, name:type === 'pipe' ? 'pipe rack' : 'pallet', wh:false,
    take:ch => type === 'pipe' ? takeFrom('rack', ch, 'pipe') && (S.pipes--, syncPipes(), true) : takeFrom('pallet', ch, 'crate') && (S.pallet--, syncPallet(), true) };
  return { at:type === 'pipe' ? P.whSpotP : P.whSpotC, have:S.wh[k], name:'warehouse', wh:true, take:ch => takeFrom('wh', ch, type) && (S.wh[k]--, syncWh(), true) };
}
function walkUnit(type){ const k = (0.9 + S.rep / 500) * bandPay(); return type === 'pipe' ? PIPE_PRICE * PG.econ(Math.max(2, S.level)).price * k : S.level === 1 ? 12 * k : CRATE_PRICE * PG.econ(S.level).price * k; }
const walkPrice = w => Math.round(w.n * walkUnit(w.def.want) * 1.25 * (S.restored.counter ? 1.1 : 1));
function spawnWalker(force){
  const pipes = S.level >= 2 && millReady() && !!M.prack, pool = WALKERS.filter(w => (w.want === 'crate' || pipes) && (!walker || walker.def !== w) && w.name !== (S.walk.last || ''));
  const def = pipes && Math.random() < .4 ? pick(pool.filter(w => w.want === 'pipe')) || pick(pool) : pick(pool.filter(w => w.want === 'crate'));
  if (!def) return null;
  const c = makeChar('worker', ...P.frontOut, { parts:def.parts, cols:Object.assign({ skin:pick(SKINS), hair:pick(HAIRS) }, def.cols) });
  c.st = { id:-(3000 + (S.walk.seq = (S.walk.seq || 0) + 1)), name:def.name, role:'walkin', lv:1, energy:100, focus:100 };
  if (def.want === 'crate') { c.cart = makeCart('#4f6b3a'); c.o.add(c.cart); }   // their own barrow, pushed in empty and out loaded
  const n = def.n[0] + Math.floor(Math.random() * (def.n[1] - def.n[0] + 1));
  walker = { def, n, got:0, t:0, wt:0, state:'in', c, force:!!force }; S.walk.last = def.name; goTo(c, ...TRADE);
  toast(`${def.name} (${def.role}) is walking in at the gate for ${n} ${def.want}s, cash.`, 'gold'); sfx('tap'); return walker;
}
function walkerGone(){ if (!walker) return; const c = walker.c; c.o.removeFromParent(); const i = mixers.indexOf(c.mixer); if (i >= 0) mixers.splice(i, 1); walker = null; walkT = 0; walkNext = S.restored.window ? rand(45, 90) : rand(70, 130); }   // v2.0 18.4: the shop window brings them every 45-90 s
function walkerLeave(){ const w = walker; w.state = 'out'; goTo(w.c, ...P.frontOut); }
function updateWalkin(dt){
  if (!walker) {
    if (!S.tutDone || S.gus.party || cardOpen || dayMin() > SHIFT_MIN - (S.restored.lamps ? 10 : 30) || (S.day && S.day.closing) || noWalkIns()) return;   // nobody walks in during the last half hour, or in the wet (the awning keeps light-rain trade going)
    walkT += dt; if (walkT > walkNext && !carAtGate()) spawnWalker(); return; }
  const w = walker, c = w.c;
  if (S.day && S.day.closing && w.state !== 'out') {   // knocking-off: they pay for anything already handed over, and go
    if (w.got > 0) { const part = Math.round(w.got * walkUnit(w.def.want) * 1.25); S.cash += part; S.earned += part; S.walk.cash += part; S.walk.served++; (S.walk.u ||= {})[w.def.want] = (S.walk.u[w.def.want] || 0) + w.got; floatText(`+${fmt(part)}`, c.o.position.x, 2.0, c.o.position.z); sfx('coin');
      c.say = { text:'Closing up? I\'ll pay for these and take them.', until:T + 3 }; toast(`${w.def.name} paid ${fmt(part)} for the ${w.got} ${w.def.want}${w.got === 1 ? '' : 's'} handed over before closing.`, ''); }
    else c.say = { text:'Closing up? I\'ll come back tomorrow.', until:T + 3 };
    walkerLeave(); return; }
  if (w.state === 'in') { if (c.cart) c.play('carry', 1); if (walk(c, dt)) { w.state = 'wait'; c.o.position.set(TRADE[0], 0, TRADE[1]); c.faceNow(Math.PI); } return; }
  if (w.state === 'out') { if (walk(c, dt)) walkerGone(); else if (c.stack.length || c.cart) c.play('carry', 1); return; }
  // waiting by the gate
  w.wt += dt; w.t += dt; c.play('idle'); c.faceTo([owner.o.position.x, owner.o.position.z], dt);
  const d = dist2(owner.o, TRADE);
  if (!w.greeted && d < 1.8) { w.greeted = true; c.say = { text:w.def.hi, until:T + 3.2 }; }
  if (!w.nag && walkPatience() - w.t < 30) { w.nag = true; c.say = { text:pick(['Is anybody serving?', 'I haven\'t got all day.', 'Hello? Anyone?']), until:T + 3 }; }
  // the owner hands the goods over, one at a time
  const gg = trip ? folk.get('gus') : null, srv = d < 1.25 && owner.o.visible ? owner : gg && dist2(gg.o, TRADE) < 1.25 ? gg : null;
  if (srv && srv.carryType === w.def.want && srv.stack.length && w.got < w.n && !(srv.stack[srv.stack.length - 1].userData.flying)) {
    w.hand = (w.hand || 0) - dt; if (w.hand <= 0) { w.hand = .22; const m = srv.stack.pop(); if (!srv.stack.length) srv.carryType = null; c.stack.push(m); c.carryType = w.def.want; w.got++;
      fly(m, c.o, carriedPos(w.def.want, c.stack.length - 1, c.stack.length, !!c.cart), .24, () => layoutCarry(c)); sfx('pick', .6); srv.faceTo([c.o.position.x, c.o.position.z]); } }
  if (w.got >= w.n) {   // paid cash in hand
    const price = walkPrice(w), tip = w.t <= WALK_TIP_S ? Math.max(2, Math.round(price * .08)) : 0, total = price + tip;
    S.cash += total; S.earned += total; S.walk.served++; (S.walk.u ||= {})[w.def.want] = (S.walk.u[w.def.want] || 0) + w.got; S.walk.cash += total; repChange(1);
    floatText(`+${fmt(total)}`, c.o.position.x, 2.0, c.o.position.z); sfx('coin'); setTimeout(() => sfx('coin'), 90);
    c.say = { text:tip ? `${w.def.bye} Keep the change.` : w.def.bye, until:T + 3.2 };
    toast(`${w.def.name} paid ${fmt(price)} cash${tip ? ` and ${fmt(tip)} for quick service` : ''}. Reputation +1.`, 'good');
    const g = gusChar(); if (g && !S.gus.retired && Math.random() < .5) gusSay(g, pick(['Never turn the gate away. That\'s how your grandad built the name.', 'Cash trade. The best kind.', 'She\'ll tell the whole bakery queue.']), 3);
    walkerLeave(); save(); checkCharter(); return; }
  if (w.t >= walkPatience()) {   // nobody came: they walk off, and the valley hears about it. Half served: they pay for what they have.
    if (w.got > 0) { const part = Math.round(w.got * walkUnit(w.def.want) * 1.25); S.cash += part; S.earned += part; S.walk.cash += part; S.walk.served++; (S.walk.u ||= {})[w.def.want] = (S.walk.u[w.def.want] || 0) + w.got;
      floatText(`+${fmt(part)}`, c.o.position.x, 2.0, c.o.position.z); sfx('coin'); c.say = { text:'I\'ll take these and go. Too slow, son.', until:T + 3 };
      toast(`${w.def.name} gave up waiting and paid ${fmt(part)} for the ${w.got} ${w.def.want}${w.got === 1 ? '' : 's'} already handed over.`, ''); }
    else { S.walk.lost++; repChange(-1); c.say = { text:pick(['I\'ll try Hendry\'s yard in town.', 'Forget it. I\'ll go elsewhere.']), until:T + 3 };
      toast(`${w.def.name} got tired of waiting and walked off. Reputation −1.`, 'bad'); }
    walkerLeave(); save(); }
}
// the objective line while someone waits at the gate
// the owner is holding goods that neither the lorry nor a gate customer wants: say where they go back
function ownerSurplus(){
  const t = owner.carryType, n = owner.stack.length; if (!n || !['crate', 'pipe', 'toolbox'].includes(t) || trip) return null;
  const need = t === 'crate' ? needCrates() - truckCrates() : t === 'pipe' ? needPipes() - truckPipes() : needTools() - truckTools();
  const excl = need + (truckBound(owner) ? n : 0); if (n <= walkWant(t) + Math.max(0, excl)) return null;
  const name = t === 'crate' ? 'crates' : t === 'pipe' ? 'pipes' : 'tools', at = t === 'crate' ? P.pallet : t === 'pipe' ? P.prackSpot : P.trackSpot;
  return { t:`Nobody needs the ${n} ${name} you are holding${S.order && !S.order.ready ? ' (the lorry has enough)' : ''}: put them back on the ${t === 'crate' ? 'pallet' : t === 'pipe' ? 'pipe rack' : 'tool rack'}${whReady() ? ' or in the warehouse' : ''}`, at };
}
function walkBeat(){
  if (!walkWaiting() || walker.state !== 'wait') return null;
  const w = walker, left = w.n - w.got, type = w.def.want, what = `${left} ${type}${left === 1 ? '' : 's'}`, price = fmt(walkPrice(w)), urgent = walkPatience() - w.t < 30;
  const holding = owner.carryType === type ? owner.stack.length : 0, g = gateSrc(type), have = g.have;
  if (holding >= left || (holding && have === 0)) return { t:`Hand ${w.def.name} the ${type}s at the gate (${price} cash)`, at:TRADE, alert:urgent };
  if (have === 0 && !holding) return { t:`${w.def.name} wants ${what} at the gate, but the ${type === 'pipe' ? 'pipe rack' : 'pallet'}${whReady() ? ' and the warehouse are' : ' is'} empty. ${type === 'pipe' ? 'The mill' : 'The saw'} is making more`, at:type === 'pipe' ? P.pmill : P.saw, alert:urgent };
  return { t:`${w.def.name} is at the gate for ${what} (${price}, cash). Fetch them from the ${g.name}${g.wh ? ' stock' : ''}`, at:g.at, alert:urgent };
}

/* =====================================================================
   SALES TRIPS AND ADVERTISING (build 0.19). Nobody in the valley knows the works has reopened, so the phone rarely
   rings by itself. The owner drives grandad's car out of the lorry gateway to call on buyers in town (an order now, a
   bigger one against a tight deadline, or a regular account who phones again) and pays for adverts that make the
   phone ring more often. While he is out, Gus minds the yard: he answers the office phone and briefs the operator,
   signs the lorry off and serves the gate.
   ===================================================================== */
const PLACES = {
  farm:    { n:'1', name:'Haines Farm', buyer:'Roy Haines', min:10, mix:'crate', size:.8, say:'Potatoes don\'t wait for anybody. Can you do me crates by the end of the week?', x:700, y:1080 },
  grocer:  { n:'2', name:'Valley Grocers', buyer:'Mr Pell, manager', min:15, mix:'crate', size:1, say:'We buy crates every week from a yard in Dunmore. They\'re late more often than not.', x:600, y:690 },
  bakery:  { n:'3', name:'Doyle\'s Bakery', buyer:'Mrs Doyle', min:15, mix:'crate', size:.5, say:'Oh, it\'s you! Small lots, mind, but every week for the bread rounds.', x:455, y:680 },
  hardware:{ n:'4', name:'Hartley Hardware', buyer:'Ted Hartley', min:20, mix:'mix', size:1, say:'Crates for the stockroom, and once your pipe mill runs I\'ll take pipe too.', x:470, y:500 },
  docks:   { n:'5', name:'Dunmore Docks', buyer:'the shipping clerk', min:40, mix:'crate', size:2, say:'Export packing. Big lots, and the ship sails when it sails.', x:250, y:700 },
  bottling:{ n:'6', name:'Ashby Bottling', buyer:'Miss Ashby', min:25, mix:'crate', size:1.3, say:'Bottle crates. When a lorry\'s waiting, I need them yesterday.', x:760, y:380 },
  kerr:    { n:'7', name:'Kerr & Sons', buyer:'Angus Kerr', min:30, mix:'pipe', size:1, lv:2, say:'Builders\' merchant. Drain pipe, every size you can roll, and spanners once you make them.', x:980, y:360 },
  hollis:  { n:'9', name:'Hollis Reed\'s warehouse', buyer:'Hollis Reed', min:25, mix:'mix', size:2.2, lv:7, say:'Bulk of everything: crates, pipe and tools for three warehouses down the valley.', x:330, y:880 },
  garage:  { n:'8', name:'Valley Garage', buyer:'Stan Moss, mechanic', min:20, mix:'tool', size:1, lv:3, say:'Spanners and wrenches. Mine keep walking off with the customers.', x:780, y:580 },
};
const ADS = {
  courier: { n:'A', name:'Valley Courier advert', min:15, cost:90, days:4, boost:.8, say:'A quarter page in Thursday\'s Courier. The whole valley reads it.', x:600, y:500 },
  poster:  { n:'B', name:'Station noticeboard poster', min:20, cost:30, days:2, boost:.4, say:'Pinned by the ticket window. Every commuter sees it twice a day.', x:430, y:330 },
  show:    { n:'C', name:'County Show stall', min:35, cost:250, days:3, boost:1.6, friday:true, say:'Friday is show day. Farmers, grocers and the docks men all walk past your stall.', x:180, y:840 },
  sign:    { n:'D', name:'Painted sign on Mill Road', min:0, cost:150, boost:.3, forever:true, say:'A big painted board at the gate: IRON VALLEY WORKSHOP, EST. 1921.', x:1010, y:1128 },
};
for (const [k, p] of Object.entries(PLACES)) Object.assign(PEOPLE, { ['buyer_' + k]:{ name:p.buyer, role:p.name, line:'', skin:pick(SKINS), hair:pick(HAIRS), shirt:pick(SHIRTS), bg:'#c8b48a', hat:k === 'farm' ? '#8a6a3e' : null, stache:k === 'kerr' || k === 'grocer' } });
const sales = () => S.sales || (S.sales = { acc:{}, visited:{}, ads:{}, trips:0, won:0 });
const adOn = k => { const a = sales().ads[k]; return k === 'sign' ? !!a : a != null && dayNo() <= a; };
const accounts = () => Object.keys(sales().acc).filter(k => PLACES[k]);
// how much the valley talks about the works: word of mouth, accounts, adverts and reputation make the phone ring
function interest(){ let i = .3 + .35 * accounts().length + Math.max(0, (S.rep - 50) / 100) + (S.restored.car ? .2 : 0) + (S.restored.clock ? .1 : 0); for (const k of Object.keys(ADS)) if (adOn(k)) i += ADS[k].boost; return i; }
const callGap = () => clamp(90 / interest(), 20, 240);
// an order from a place: its usual goods, at the order rate; a big order is bigger, pays a fifth more, and is due sooner
function placeSpec(k, kind = 'now'){
  const pl = PLACES[k], big = kind === 'big' ? 1.8 : 1, pipes = S.level >= 2 && millReady(), tools = S.level >= 3 && pressReady(), L1 = S.level === 1, base = L1 ? 24 : 12;
  let q = 0, pq = 0, tq = 0;
  if (pl.mix === 'tool') { if (tools) tq = Math.max(4, Math.round(8 * pl.size * big)); else q = Math.max(4, Math.round(base * .6)); }
  else if (tools && (k === 'hardware' || k === 'kerr')) tq = Math.max(2, Math.round(5 * pl.size * big));
  if (pl.mix === 'tool') {}
  else if (pl.mix === 'pipe' && pipes) pq = Math.max(4, Math.round(8 * pl.size * big));
  else if (pl.mix === 'mix' && pipes) { q = Math.max(4, Math.round(base * pl.size * big * .6)); pq = Math.max(2, Math.round(6 * pl.size * big * .5)); }
  else q = Math.max(4, Math.round(base * pl.size * big / 2) * 2);
  const cut = sales().acc[k] && sales().acc[k].cut >= dayNo() ? .9 : 1;
  const pay = Math.round((q * walkUnit('crate') + pq * walkUnit('pipe') + tq * TOOL_PRICE * PG.econ(S.level).price * (0.9 + S.rep / 500) * bandPay()) * (kind === 'big' ? 1.2 : 1) * cut);
  const dl = Math.round((L1 ? Math.max(180, q * 4 + 60) : Math.max(180, 60 + q * 10 + pq * 11 + tq * 9)) * (kind === 'big' ? .75 : 1));
  return { qty:q, pq, tq, l2:false, l3:false, l4:false, guided4:false, guided:false, nodl:false, pay, client:pl.name, deadline:dl, place:k };
}
// who rings: one of your accounts (twice as likely), or someone who heard of you
function callerSpec(){ const acc = accounts(); if (acc.length && Math.random() < acc.length * 2 / (acc.length * 2 + 1)) return placeSpec(pick(acc)); return null; }

// ---- grandad's car: parked nose-in by the front fence; out by the lorry gateway, back the same way and reversed in
// the car lives in the lane between the front fence (12.4) and the dock and a docked lorry's tail (10.15), facing the
// lorry gateway. Out: along the lane and right out of the gateway, then west. Back: east along the road past the
// gateway, then reversed in like the lorries and back along the lane into its space (build 0.19b; every route is swept
// against every collision box with a lorry docked: tools/car_sweep.mjs)
const LANE_Z = P.carSpot[1];
const CAR_OUT = samplePath([{ p:[P.carSpot, [14.4, LANE_Z]] }, { bez:true, p:[[14.4, LANE_Z], [17.6, LANE_Z], [17.6, 13.9]] }, { bez:true, p:[[17.6, 13.9], [17.6, ROAD_Z + 1.15], [14.6, ROAD_Z + 1.15]] }, { p:[[14.6, ROAD_Z + 1.15], [-62, ROAD_Z + 1.15]] }]);   // the far lane, westbound: clear of a lorry in the near lane
const CAR_BACK = samplePath([{ p:[[-62, ROAD_Z - .9], [21.6, ROAD_Z - .9]] }]);
const CAR_REV = samplePath([{ bez:true, rev:true, p:[[21.6, ROAD_Z - .9], [18.6, ROAD_Z - .9], [18.6, 13.4]] }, { bez:true, rev:true, p:[[18.6, 13.4], [18.0, LANE_Z], [14.0, LANE_Z]] }, { rev:true, p:[[14.0, LANE_Z], P.carSpot] }]);   // swings wide: 18 cm clear of a lorry in bay 1, clear of the gate post
let trip = null;
const CAR = { s:0, v:0 };
function carDrive(path, dt, vmax){
  const left = path.len - CAR.s, want = Math.min(vmax, Math.sqrt(5 * Math.max(0, left)) + .25);
  CAR.v += clamp(want - CAR.v, -5 * dt, 2.6 * dt); CAR.s += Math.max(0, CAR.v) * dt;
  const q = pathAt(path, CAR.s); M.car.position.set(q.x, 0, q.z); M.car.rotation.y = q.yaw; return CAR.s >= path.len - .03;
}
// the car is on the road by the main gate (where people step in and out): nobody appears there till it has passed
const carAtGate = () => !!(trip && M.car && M.car.visible && Math.abs(M.car.position.x - P.frontOut[0]) < 4.5 && M.car.position.z > 13)
  || [M.truck, M.flat].some(m => m && m.visible && Math.abs(m.position.x - P.frontOut[0]) < 6.5 && m.position.z > 13.4);
// the car stops for anybody in its way (a gate customer on the verge, a worker crossing the lane) and goes on once
// they have passed: it looks along the next 3 m of its path, 0.9 m either side
const carYield = path => roadYield(M.car.position, path, CAR.s, path === CAR_REV ? 3.8 : 4, CAR);   // past its own bumper (2 m from the middle), backing in too
// the lorry gateway (both bays' mouths, the gate and the road in front of it) holds one moving vehicle at a time: the car,
// a lorry or the flatbed. The others wait outside it, on the road or in their bay; whoever holds it goes on, so two
// vehicles can never meet in it or wait for each other (build 0.21f)
const GATE_ZONE = [14.3, 10.3, 25.6, 16.9];
let gateHolder = null;
const inGateZone = (x, z) => x > GATE_ZONE[0] && x < GATE_ZONE[2] && z > GATE_ZONE[1] && z < GATE_ZONE[3];
function gateFree(V, path, s, look){
  if (gateHolder === V) return true;
  const own = V === CAR ? 2.2 : 3.4; let enters = false;
  for (let k = 0; k <= 4; k++) { const q = pathAt(path, Math.min(path.len, s + (own + 1.2) * k / 4)); if (inGateZone(q.x, q.z)) { enters = true; break; } }
  if (!enters) return true;
  if (gateHolder && gateHolderBusy()) return false;
  gateHolder = V; return true;
}
// the holder still in or near the gateway and on the move
function gateHolderBusy(){
  const V = gateHolder, m = V === CAR ? M.car : V === truck ? M.truck : V === sup ? M.flat : null;
  if (!m || !m.visible) return false;
  const moving = V === CAR ? !!trip && ['out', 'back', 'park'].includes(trip.phase) : ['arrive', 'leave'].includes(V.state);
  if (!moving) return false;
  const p = m.position, r = V === CAR ? 2.2 : 3.4;
  return p.x > GATE_ZONE[0] - r && p.x < GATE_ZONE[2] + r && p.z > GATE_ZONE[1] - r && p.z < GATE_ZONE[3] + r;
}
// the other vehicles on the move (a parked lorry is in its bay, clear of every path): [state object, mesh, back, front, half-width]
function otherVehicles(V){ const out = [];
  if (V !== CAR && trip && ['out', 'back', 'park'].includes(trip.phase) && M.car && M.car.visible) out.push([CAR, M.car, 2.0, 2.0, .85]);   // waiting at its spot it is parked: a lorry coming in does not stop for it (the two used to wait on each other)
  if (V !== truck && M.truck && M.truck.visible && ['arrive', 'leave'].includes(truck.state)) out.push([truck, M.truck, 3.3, 3.3, 1.15]);
  if (V !== sup && M.flat && M.flat.visible && ['arrive', 'leave'].includes(sup.state)) out.push([sup, M.flat, 3.3, 3.3, 1.15]);
  if (typeof truckB !== 'undefined' && V !== truckB && M.truckB && M.truckB.visible && ['arrive', 'leave'].includes(truckB.state)) out.push([truckB, M.truckB, 3.3, 3.3, 1.15]);
  return out;
}
// a vehicle at a on its path at distance s: true if it must wait. It looks along the next `look` metres, 0.9 m either
// side (1.4 m for a lorry), and, coming along the road towards the main gate's mouth, waits short of it while anybody
// is there (people step in and out of the yard at that spot)
function roadYield(a, path, s, look, V){
  if (!gateFree(V, path, s, look)) { V.yieldT = T; V.queueFor = 'gate'; return true; }
  const ahead = pathAt(path, Math.min(path.len, s + look)), bx = ahead.x - a.x, bz = ahead.z - a.z, L2 = bx * bx + bz * bz || 1, half = V === CAR ? .9 : 1.2;   // half its width; a person's width is added below
  const people = [...staffObj.values(), ...folk.values(), ...(walker ? [walker.c] : []), ...(V !== CAR && owner && owner.o.visible ? [owner] : [])];   // Bolt keeps out of the lorries' and the car's way himself (boltDodge)
  const east = bx > 0, front = a.x + (east ? 1 : -1) * (V === CAR ? 2.2 : 4.2);
  const nearGate = a.z > 13.4 && (east ? front > -3 && front < 2.6 : front < 13 && front > 7.4);
  if (nearGate && people.some(c => c.o.visible && !c.gone && c.o.position.x > 2.2 && c.o.position.x < 7.8 && c.o.position.z > 13.4 && c.o.position.z < 16.6)) { V.yieldT = T; return true; }
  // another vehicle in the way along its path (the car stopped at the gate, a lorry in front): stop behind it
  const own = V === CAR ? 2.0 : 3.3, ownHalf = V === CAR ? .85 : 1.15;   // a vehicle in the other lane, going the other way, passes
  for (const [W, m, back, front, wh] of otherVehicles(V)) { const still = W.queueFor === 'gate' && gateHolder === V, pad = still ? .15 : .8;   // waiting for us to clear the gateway: it will not move
    for (let k = 1; k <= 6; k++) { const q = pathAt(path, Math.min(path.len, s + own * Math.sign(look) + (look - own) * k / 6));
      if (inFoot(m, q.x, q.z, back + pad, front + pad, wh + ownHalf - (still ? .2 : 0))) { V.yieldT = T; V.queueFor = W; return true; } } }
  V.queueFor = null;
  for (const c of people) { if (!c.o.visible || c.gone) continue; const px = c.o.position.x - a.x, pz = c.o.position.z - a.z, t = clamp((px * bx + pz * bz) / L2, 0, 1);
    if (Math.hypot(px - bx * t, pz - bz * t) < half + .25) { V.yieldT = T; if (!V.honk || T - V.honk > 4) { V.honk = T; sfxAt('horn', a.x, a.z, .25); } return true; } }
  return false;
}
const lorryMoving = () => truck.state === 'arrive' || truck.state === 'leave' || sup.state === 'arrive' || sup.state === 'leave';
const canDrive = () => S.tutDone && !trip && !owner.stack.length && !owner.cart && !S.gus.party && !(S.day && S.day.closing) && !!M.car;
function startTrip(kind, key){
  if (!canDrive()) return; const d = kind === 'ad' ? ADS[key] : PLACES[key]; if (tooLate(d)) { toast(`Too late for ${d.name} today: you would not be back by 17:00.`, ''); return; }
  trip = { kind, key, phase:'wait', t:0, min:d.min }; CAR.s = 0; CAR.v = 0; COL.delete('car');
  owner.o.visible = false; owner.o.position.set(...P.carDoor); sfxAt('drop', ...P.carSpot, .6); sales().trips++;
  toast(`Off to ${d.name}. Gus is minding the yard.`, 'gold'); const g = gusChar(); if (g && !S.gus.retired) gusSay(g, pick(['Go on, I\'ll mind the phone.', 'Bring us back some work, boss.', 'I\'ll keep the kettle and the phone warm.']));
}
function endTrip(){
  M.car.position.set(P.carSpot[0], 0, P.carSpot[1]); M.car.rotation.y = 0; M.car.visible = true; colOf(M.car, .05, 'car');
  owner.o.position.set(P.carDoor[0], 0, 10.15); owner.stepTo = P.carDoor.slice(); owner.o.visible = true; owner.carDoorArm = false; trip = null; save();   // out of the driver's door, then a step away from the car
}
function updateTrip(dt){
  if (!trip) return; const T_ = trip; T_.t += dt;
  if (T_.phase === 'wait') { if (!lorryMoving()) { T_.phase = 'out'; CAR.s = 0; } return; }
  if (T_.phase === 'out') { const road = M.car.position.z > 14; 
    if (carYield(CAR_OUT)) { CAR.v = 0; return; }
    if (carDrive(CAR_OUT, dt, road ? 9 : 3)) { T_.phase = 'away'; T_.t = 0; M.car.visible = false; }
    if (M.car.position.x > -14) owner.o.position.set(M.car.position.x, 0, M.car.position.z); else owner.o.position.set(...P.carDoor); return; }
  const carK = S.restored.car ? .8 : 1;
  if (T_.phase === 'away') { if (T_.kind === 'night') return; if (T_.t >= T_.min * .8 * carK) { T_.phase = 'there'; tripScene(); } return; }   // the night drive: home until the morning
  if (T_.phase === 'there') return;   // the scene card is open
  if (T_.phase === 'home') { if (T_.t >= T_.min * .8 * carK) { if (lorryMoving()) return; T_.phase = 'back'; CAR.s = 0; CAR.v = 8; M.car.visible = true; } return; }
  if (T_.phase === 'back') { const road = M.car.position.z > 14; 
    if (M.car.position.x > -14) owner.o.position.set(M.car.position.x, 0, M.car.position.z);
    if (carYield(CAR_BACK)) { CAR.v = 0; return; }
    if (carDrive(CAR_BACK, dt, road ? 9 : 3)) { T_.phase = 'park'; CAR.s = 0; CAR.v = 0; } return; }
  if (T_.phase === 'park') { owner.o.position.set(M.car.position.x, 0, M.car.position.z); if (carYield(CAR_REV)) { CAR.v = 0; return; } if (carDrive(CAR_REV, dt, 1.6)) { const night = T_.kind === 'night'; endTrip(); toast(night ? 'In through the gates and parked: another day at the works.' : 'Back at the works.', ''); } }
}
// the visit itself: a scene card; the drive home starts when it is closed
function tripScene(){ story({ kind:trip.kind === 'ad' ? 'advert' : 'visit', key:trip.key }); }
function leaveScene(){ if (trip) { trip.phase = 'home'; trip.t = 0; } }
function visitHtml(k){
  const pl = PLACES[k], acc = !!sales().acc[k], booked = (S.book || []).some(o => o.place === k) || (S.order && S.order.place === k), now = placeSpec(k), big = placeSpec(k, 'big');
  const desc = o => [o.qty ? `${o.qty} crates` : '', o.pq ? `${o.pq} pipes` : '', o.tq ? `${o.tq} tools` : ''].filter(Boolean).join(' and ');
  const offers = booked ? '' : `<div class="offer"><b>Take an order now</b><button class="btn primary" data-pick="now" type="button">${fmt(now.pay)}</button><p>${desc(now)}, due ${hrsOf(now.deadline)} after it starts.</p></div>
    <div class="offer"><b>A big order, tight deadline</b><button class="btn primary" data-pick="big" type="button">${fmt(big.pay)}</button><p>${desc(big)} at a fifth over the rate, due ${hrsOf(big.deadline)} after it starts. Late pays half.</p></div>`;
  const accOffer = acc ? `<div class="offer"><b>Regular account</b><span class="badge">open</span><p>${pl.buyer.split(',')[0]} phones you for orders already.</p></div>`
    : S.rep >= 55 ? `<div class="offer"><b>Open a regular account</b><button class="btn" data-pick="acc" type="button">Shake on it</button><p>No order today, but they phone you with orders from now on.</p></div>`
    : `<div class="offer"><b>A regular account</b><p>Not yet: they want to see a reputation of 55% first (you have ${Math.round(S.rep)}%).</p></div>`;
  return `<div class="who"><img alt="" src="${portrait('buyer_' + k)}"><div><b>${pl.buyer}</b><small>${pl.name} · ${pl.min} min from the works</small></div></div>
    <p class="quote">"${booked ? 'We\'ll take the lot you\'re making for us first, then we\'ll talk again.' : pl.say}"</p>${offers}${accOffer}
    <button class="btn" data-pick="none" type="button" style="width:100%;margin-top:8px;min-height:44px">Thank them and drive back</button>`;
}
function adHtml(k){ const a = ADS[k], on = adOn(k), fri = !a.friday || isFriday();
  return `<div class="who"><img alt="" src="${portrait('council')}"><div><b>${a.name}</b><small>${a.forever ? 'At the works' : a.min + ' min from the works'}</small></div></div><p class="quote">"${a.say}"</p>
    ${on ? `<div class="offer"><b>Already running</b><p>${a.forever ? 'The sign is up.' : `Runs until ${dayDate(sales().ads[k]).split(' ').slice(0, 3).join(' ')}.`}</p></div>`
      : !fri ? `<div class="offer"><b>Not a show day</b><p>The County Show is on Fridays.</p></div>`
      : `<div class="offer"><b>${a.forever ? 'Paint the sign' : `Run it for ${a.days} days`}</b><button class="btn primary" data-ad="1" type="button" ${S.cash >= a.cost ? '' : 'disabled'}>${fmt(a.cost)}</button><p>The phone rings more often${a.forever ? ', for good' : ' while it runs'}.</p></div>`}
    <button class="btn" data-pick="none" type="button" style="width:100%;margin-top:8px;min-height:44px">${a.forever ? 'Close' : 'Drive back'}</button>`; }
function pickOffer(k, what){
  const pl = PLACES[k]; sales().visited[k] = dayNo();
  if (what === 'now' || what === 'big') { (S.book ||= []).push(placeSpec(k, what)); sales().won++; sfx('buy'); toast(`${pl.name}: order agreed. It starts as soon as the yard is free.`, 'good'); }
  else if (what === 'acc') { sales().acc[k] = { since:dayNo() }; sfx('hire'); toast(`${pl.name} is a regular account now: they will phone you for orders.`, 'good'); }
  save();
}
function buyAd(k){ const a = ADS[k]; if (S.cash < a.cost || adOn(k)) return; S.cash -= a.cost; sales().ads[k] = a.forever ? true : dayNo() + a.days - 1; sfx('buy');
  toast(`${a.name}: paid. The phone will ring more often.`, 'good'); if (k === 'sign') putSign(); save(); }
function putSign(){ if (M.millSign) return; const sb = put(inst('env_sale_sign'), 8.2, SITE.z1 + 1.3, 0, 0, 1.4); sb.userData.dyn = true;
  const m = board(textTex([[signName().toUpperCase(), 46, 50], ['EST. 1921 · MILL ROAD', 30, 98, 500]], 512, 140, { bg:'#2f5d8a', fg:'#efe1bd', border:'#1d3a56', bw:10 }), 1.5, .41); m.position.set(0, 1.3, .1); sb.add(m); M.millSign = sb; }
// the town map card: a small map of the valley and a row for every place you can drive to
const TOWN_SVG = () => { const pin = (d, col) => `<g transform="translate(${d.x} ${d.y})"><circle r="30" fill="${col}" stroke="#fff" stroke-width="5"/><text y="11" text-anchor="middle" font-size="30" font-weight="700" fill="#2a1d14">${d.n}</text></g>`;
  return `<svg viewBox="40 130 1020 1040" style="width:100%;height:auto;display:block;border-radius:8px;background:#e8dfbf;border:2px solid #3a2a1e" font-family="Arial">
  <path d="M0 520 Q140 560 230 640 T330 900 T260 1160" fill="none" stroke="#7fa6c4" stroke-width="44"/><path d="M0 300 L1080 300" stroke="#3a2a1e" stroke-width="6" stroke-dasharray="16 10"/>
  <path d="M380 470 L640 450 L690 610 L600 760 L420 750 L360 610Z" fill="#e2c9a5" stroke="#8a6a4e" stroke-width="4"/>
  <g fill="none" stroke="#6b4a2a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><path d="M960 1010 L780 980 L640 900 L560 760 L520 620 L470 470 L430 330"/><path d="M520 620 L360 640 L250 700"/><path d="M640 900 L700 1080"/><path d="M470 470 L760 380 L980 360"/></g>
  <rect x="930" y="975" width="110" height="80" rx="8" fill="#8a3b1b" stroke="#2a1d14" stroke-width="5"/><text x="985" y="1090" text-anchor="middle" font-size="30" font-weight="700" fill="#2a1d14">YOU</text>
  ${Object.values(PLACES).filter(p => !p.lv || S.level >= p.lv).map(p => pin(p, '#e2a72c')).join('')}${Object.values(ADS).map(a => pin(a, '#6fa6d6')).join('')}</svg>`; };
// a round trip in clock minutes: there and back (the away time is one game minute a minute) plus the drive through the yard
const tripMin = d => 2 * d.min * (S.restored.car ? .8 : 1) + 25;
const tooLate = d => !!d.min && dayMin() + tripMin(d) > SHIFT_MIN;
function townHtml(){
  const s = sales(), row = (k, d, ad) => { const acc = !ad && s.acc[k], seen = !ad && s.visited[k] === dayNo(), on = ad && adOn(k), fri = !ad || !d.friday || isFriday(), lock = !ad && d.lv && S.level < d.lv, late = !lock && tooLate(d);
    const note = lock ? `opens at level ${d.lv}` : late ? 'back after 17:00' : ad ? (on ? 'running' : !fri ? 'Fridays only' : fmt(d.cost)) : acc ? 'account ★' : seen ? 'visited today' : (d.mix === 'tool' ? 'tools' : d.mix === 'pipe' ? (S.level >= 3 && k === 'kerr' ? 'pipes, tools' : 'pipes') : d.mix === 'mix' ? (S.level >= 3 ? 'crates, pipes, tools' : 'crates, pipes') : 'crates');
    return `<button class="trow ${ad ? 'ad' : ''}" data-go="${ad ? 'ad' : 'visit'}:${k}" type="button" ${lock || late || seen || (ad && (on || !fri)) ? 'disabled' : ''}><i>${d.n}</i><b>${d.name}</b><span>${d.min ? d.min + ' min' : 'here'}</span><small>${note}</small></button>`; };
  return `<div class="note" style="letter-spacing:.2em;text-transform:uppercase">Grandad's car · the valley</div><h3 style="margin:4px 0 8px;font:700 22px Georgia,serif">Where to, boss?</h3>${TOWN_SVG()}
    <div class="tlist">${Object.entries(PLACES).map(([k, d]) => row(k, d)).join('')}${Object.entries(ADS).map(([k, d]) => row(k, d, true)).join('')}</div>
    <p class="note" style="margin:8px 0">Times are one way. While you are out, Gus answers the phone, starts the orders, signs the lorry off and serves the gate. Phone interest: ${interest().toFixed(1)} (a call about every ${Math.round(callGap())} s when the yard is free).</p>
    <button class="btn" data-next type="button" style="width:100%;min-height:44px">Stay at the works</button>`;
}
// the first time the yard runs out of work after day one, Gus explains: nobody knows the works is open, so go and sell
function carTip(){
  if (!S.tutDone || sales().told || cardOpen || S.order || S.call || (S.book && S.book.length) || S.delivered < 1 || truck.state !== 'away' || trip || (S.day && S.day.closing)) return;
  sales().told = true; story({ kind:'cartip' }); save();
}
const CAR_TIP = ['Quiet, isn\'t it? Nobody in the valley knows we\'re open again. The phone won\'t ring by itself.', 'Your grandad never waited for work. He took that car round every shop and farm in the valley.',
  'It\'s parked by the front fence. Stand by it and pick where to go: a buyer for an order, or the Courier for an advert. I\'ll mind the phone.'];
// stand at the driver's door: the town map; step away and back to open it again
function updateCarDoor(){
  if (M.rings && M.rings.car) M.rings.car.g.visible = !!M.car && !trip && S.tutDone && !(S.day && S.day.closing);
  if (!M.car || trip || cardOpen || officeOpen) return;
  const at = near(owner.o, P.carDoor, .6);
  if (!at) { if (!owner.stepTo) owner.carDoorArm = true; return; }   // stepping out of the car does not count as walking up to it
  if (!owner.carDoorArm || !ownerStill()) return; owner.carDoorArm = false;
  if (!S.tutDone) { toast('Finish the first day\'s work first: Gus will show you round.', ''); return; }
  if (owner.stack.length || owner.cart) { toast('Put down what you are carrying (and park the trolley) before you drive off.', ''); return; }
  story({ kind:'town' });
}
// ---- Gus minds the yard while the owner is out: the lorry first, then the gate, then the phone
function gusMind(g, dt){
  const go = (job, at) => { if (g.job !== job) { g.job = job; g.gs = 'go'; goTo(g, ...at); } return g.gs === 'go' ? (walk(g, dt) ? (g.gs = 'at', true) : false) : true; };
  if (S.order && S.order.ready && truck.state === 'docked') { if (go('sign', P.drop)) { g.play('inspect'); g.faceTo(P.truck, dt); g.signT = (g.signT || 0) + dt; if (g.signT > 1.4) { g.signT = 0; signOrder(g); g.job = null; } } return true; }
  const w = walker; if (w && w.state === 'wait') { const type = w.def.want, left = w.n - w.got;
    const gs = gateSrc(type);
    if (g.carryType === type && g.stack.length && (g.stack.length >= Math.min(2, left) || gs.have === 0)) { if (go('gateHand', [TRADE[0], TRADE[1] - .9])) { g.play('carry', 0); g.faceTo(TRADE, dt); } return true; }
    const src = gs.wh || type === 'pipe' ? gs.at : [P.pallet[0] + .55, P.pallet[1] + .5];
    if (gs.have > 0 && (!g.stack.length || g.carryType === type)) { if (go(gs.wh ? 'gateFetchWh' : 'gateFetch', src)) { g.play('idle'); if (g.wait <= 0 && g.stack.length < Math.min(2, left) && gs.take(g)) g.wait = .4; } return true; } }
  if (go('office', P.deskRing)) { g.play('idle'); g.faceTo(P.desk, dt);
    if (S.call) { g.ansT = (g.ansT || 0) + dt; if (g.ansT > 1.6) { g.ansT = 0; gusSay(g, 'Iron Valley Works, Gus speaking.', 2.4); S.answeredGus = (S.answeredGus || 0) + 1; acceptCall(); if (S.order && !S.order.briefed) briefOrder(g); } } }
  return true;
}

/* =====================================================================
   SMALL EVENTS (build 0.19): every few minutes something happens in the valley. The crate machine's blade goes
   blunt (it cuts at 60% until the owner fits a new one); a shower soaks the yard (the crew goes carefully and
   nobody walks in); a rival yard tries to take one of your accounts with a cheaper price.
   ===================================================================== */
let evT = 0, evNext = 200, rain = null;
const BLADE_COST = 15;
function updateEvents(dt){
  tickRain(dt); updateBlade(dt);
  if (!S.tutDone || cardOpen || (S.day && S.day.closing) || S.gus.party) return;
  // v2.0 7, Level 3 Thursday: the blunt saw blade turns up as one of the level's issues
  if (S.level >= 3 && S.level === 3 && weekday() === 3 && !S.lv3.bladeDone && dayMin() > 150 && !S.blade && sawOn && !(S.order && S.order.guided)) { S.lv3.bladeDone = true; bluntBlade(); }
  evT += dt; if (evT < evNext) return; evT = 0; evNext = rand(170, 280);
  // Bible 4.5: no issues of any kind on levels 1 and 2, so the blunt blade is not one of their events (build 0.20)
  const opts = []; if (accounts().length && !(S.sales.rivalDay >= dayNo() - 2)) opts.push('rival'); if (S.level === 2 && isFriday() && accounts().length && !S.l2rival) { S.l2rival = true; opts.length = 0; opts.push('rival'); } if (S.level >= 3 && !S.blade && sawOn && sessionT > 60) opts.push('blade'); if (S.level >= 5 && !(S.fuelDay >= dayNo() - 3)) opts.push('fuel');
  const e = opts.length ? pick(opts) : null;
  if (e === 'blade') bluntBlade();
  if (e === 'bladeOld') { S.blade = { at:dayNo() }; toast('The crate machine\'s blade has gone blunt: it cuts at 60%. Fit a new one at the side of the machine ($' + BLADE_COST + ').', 'bad'); const g = gusChar(); if (g && !S.gus.retired) gusSay(g, 'Hear that? Blade\'s blunt. There\'s new ones on the bench.'); save(); }
  if (e === 'rain') startRain();
  if (e === 'fuel') { S.fuelDay = dayNo(); const k = pick([.85, .9, 1.1, 1.2]); S.fuelK = k; toast(`Fuel price notice from the depot: diesel ${k < 1 ? 'down' : 'up'} ${Math.round(Math.abs(1 - k) * 100)}% on the next delivery (${fmt(DIESEL_CAN())} a can).`, k < 1 ? 'good' : 'bad'); save(); return; }
  if (e === 'rival') { const k = pick(accounts()); S.sales.rivalDay = dayNo(); story({ kind:'rival', key:k }); }
}
function bluntBlade(){ S.blade = { at:dayNo() }; toast('The crate machine\'s blade has gone blunt: it cuts at 60%. Fit a new one at the side of the machine ($' + BLADE_COST + ').', 'bad'); const g = gusChar(); if (g && !S.gus.retired) gusSay(g, 'Hear that? Blade\'s blunt. There\'s new ones on the bench.'); save(); }
// the blunt blade: stand at the side of the crate machine for three seconds to fit a new one
let bladeT = 0;
function updateBlade(dt){
  if (!S.blade || !owner || !owner.o.visible) { bladeT = 0; return; }
  if (ownerStill() && near(owner.o, P.sawFix, .6)) { bladeT += dt; owner.working = T; owner.workAt = P.saw; if (Math.random() < dt * 3) sfx('clank', .4);
    if (bladeT >= 3) { bladeT = 0; S.blade = null; S.cash -= BLADE_COST; sfx('buy'); floatText('New blade fitted', P.saw[0], 1.8, P.saw[1], 'info'); toast(`New blade fitted (${fmt(BLADE_COST)}). The crate machine cuts at full speed again.`, 'good'); save(); } }
  else bladeT = Math.max(0, bladeT - dt);
}
const bladeK = () => S.blade ? .6 : 1;
// the wrong timber: soft deal planks for a hardwood order. Planks of it in the stock count against the next cuts at 80% speed
const wrongK = () => (S.wrongTimber || 0) > 0 ? .8 : 1;
function wrongTimberCard(){ return `<div class="who"><img alt="" src="${portrait('gus')}"><div><b>The wrong timber</b><small>Valley Timber Co. · the flatbed at goods-in</small></div></div>
  <p class="quote">"That's soft deal, not the hardwood we ordered. It'll cut, but slow, and the saw won't thank you." · Gus</p>
  <div class="offer"><b>Send it back</b><button class="btn primary" data-wt="back" type="button">Send back</button><p>The flatbed leaves with it. The right timber comes tomorrow morning: a day's wait.</p></div>
  <div class="offer"><b>Use it</b><button class="btn" data-wt="use" type="button">Unload</button><p>Unload it now. The crate machine runs at 80% until these ${S.delivery ? S.delivery.qty : ''} planks are used.</p></div>`; }
function wrongTimberPick(what){ const d = S.delivery; if (!d) return;
  if (what === 'back') { S.retryTimber = { qty:d.qty, day:dayNo() + 1 }; S.delivery = null; sup.state = 'leave'; sup.s = 0; sup.path = SUP_LEAVE; COL.delete('supply'); toast('The flatbed takes the wrong timber back. The right planks come tomorrow morning.', ''); }
  else { S.wrongTimber = (S.wrongTimber || 0) + d.qty; toast(`Unloading the soft deal: the crate machine runs at 80% for the next ${d.qty} crates.`, ''); }
  save(); }
// the shower: rain streaks over the screen, a darker sky, a patter; the crew walks 10% slower and nobody walks in
function startRain(secs = 55){ wxForce = 'shower'; wxForceT = secs; }   // a shower now (tests): the weather system draws and times it
let wxForceT = 0;
// build 0.21e: real rain. Streaks fall through the scene around the camera's view (one line batch, wind-slanted, a little
// longer the nearer they are to the camera), and drops burst into small rings on the yard; the old screen overlay of
// painted stripes is gone (it read as lines, and on phones the blended overlay cost frames)
const RAIN_N = 900, SPLASH_N = 70, rainFx = { mesh:null, pos:null, d:null, splash:null, sp:[] };
// each drop is a thin streak (a quad 2.5 cm wide, facing the camera: GL lines are one pixel, too faint on a phone screen)
function buildRainFx(){
  if (rainFx.mesh) return;
  const g = new THREE.BufferGeometry(), pos = new Float32Array(RAIN_N * 12), idx = new Uint32Array(RAIN_N * 6), al = new Float32Array(RAIN_N * 4);
  for (let i = 0; i < RAIN_N; i++) { idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6); al.set([0, 0, 1, 1], i * 4); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('a', new THREE.BufferAttribute(al, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, uniforms:{ k:{ value:0 } },
    vertexShader:'attribute float a; varying float va; void main(){ va = a; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:'uniform float k; varying float va; void main(){ gl_FragColor = vec4(.84, .88, .93, k * (.15 + .55 * va)); }' });   // fainter at the tail, like a falling drop
  const R = new THREE.Mesh(g, mat); R.frustumCulled = false; R.renderOrder = 6; scene.add(R);
  rainFx.mesh = R; rainFx.pos = pos; rainFx.d = [];
  for (let i = 0; i < RAIN_N; i++) { rainFx.d.push({ x:0, y:0, z:0, v:rand(10, 13), len:.4 }); rainDrop(i, rand(0, 13)); }
  const ring = new THREE.RingGeometry(.05, .085, 14); ring.rotateX(-Math.PI / 2);
  const sm = new THREE.MeshBasicMaterial({ color:'#e3ebf2', transparent:true, opacity:0, depthWrite:false });
  const I = new THREE.InstancedMesh(ring, sm, SPLASH_N); I.frustumCulled = false; I.renderOrder = 6; scene.add(I); rainFx.splash = I;
  for (let i = 0; i < SPLASH_N; i++) rainFx.sp.push({ x:0, z:0, t:rand(0, .4), y:0 });
}
// a drop somewhere over the part of the yard the camera sees (the view is a box round camPos, deeper away from the camera)
function rainDrop(i, y){ const d = rainFx.d[i]; d.x = camPos.x + rand(-16, 16); d.z = camPos.z + rand(-20, 12); d.y = y; d.len = rand(.35, .6); }
function rainQuad(i){ const d = rainFx.d[i], p = rainFx.pos, j = i * 12, w = .0125, tx = d.x - .08 * d.len;
  p[j] = d.x - w; p[j + 1] = d.y; p[j + 2] = d.z; p[j + 3] = d.x + w; p[j + 4] = d.y; p[j + 5] = d.z;
  p[j + 6] = tx - w; p[j + 7] = d.y + d.len; p[j + 8] = d.z; p[j + 9] = tx + w; p[j + 10] = d.y + d.len; p[j + 11] = d.z; }
const _rm = new THREE.Matrix4();
function rainFxTick(dt, k){
  if (!rainFx.mesh) return;
  rainFx.mesh.material.uniforms.k.value = k; rainFx.splash.material.opacity = .45 * k; rainFx.mesh.visible = rainFx.splash.visible = k > .01;
  if (k <= .01) return;
  for (let i = 0; i < RAIN_N; i++) { const d = rainFx.d[i]; d.y -= d.v * dt; d.x += .9 * dt; d.z += .35 * dt;   // a light wind from the west
    if (d.y < groundY(d.x, d.z)) rainDrop(i, rand(11, 14)); rainQuad(i); }
  rainFx.mesh.geometry.attributes.position.needsUpdate = true;
  for (let i = 0; i < SPLASH_N; i++) { const sp = rainFx.sp[i]; sp.t += dt;
    if (sp.t > .35) { sp.t = 0; sp.x = camPos.x + rand(-14, 14); sp.z = camPos.z + rand(-14, 10); sp.y = groundY(sp.x, sp.z) + .02; }
    const sc = .3 + sp.t / .35 * 1.7; _rm.makeScale(sc, 1, sc).setPosition(sp.x, sp.y, sp.z); rainFx.splash.setMatrixAt(i, _rm); }
  rainFx.splash.instanceMatrix.needsUpdate = true;
}
function tickRain(dt){
  if (wxForce && (wxForceT -= dt) <= 0) wxForce = null;
  updateWeather(dt);
  const k = clamp(wxRain(), 0, 1.2); if (!rain) return; if (Math.random() < dt * 2.5 * Math.min(1, k + .3)) noiseS(.5, 4200, .006 * k, 'highpass');
  rainFxTick(dt, Math.min(1, k));
}
const rainK = c => showerOn() && !(c && S.restored.canopy && c.st && (c.st.role === 'loader' || c.st.role === 'helper')) ? (wxRain() > 1.1 && c && c.st && c.st.role === 'loader' ? .85 : .9) : 1;   // a downpour (L5+): loaders in the open 15% slower   // the lane canopy keeps the loaders dry   // v2.0 17.3: in a shower people hurry and go carefully
/* =====================================================================
   WEATHER AND SEASONS (Bible v2.0 17, Act I). The calendar's date sets the season and the likely weather; each working
   day has a plan of at most three spells (so the weather changes at most twice a day), blended over 20-40 s, never in a
   snap. The level specs' set pieces are written in: Tuesday's first shower (Level 1), Thursday's shower and rainbow as
   Bolt arrives (Level 2), the fog lifting off the North field as the tool press comes (Level 3), Thursday's heat wave
   and the thunderstorm that breaks it (Level 4). Weather only delays: it never destroys anything or blocks a charter
   line. It is seeded per game and saved; it stops on pause and does not run offline. The 07:00 wireless reads a
   forecast, the barometer on the office wall shows the trend, and the day book carries tomorrow's weather.
   ===================================================================== */
const WX = {
  clear:   { name:'Clear',        say:'Fine and clear',               hemi:1.06, sun:1.08, exp:1.0,  rain:0,   fog:0,   tint:'#fff5e6', bar:.82 },
  overcast:{ name:'Overcast',     say:'Grey and overcast',            hemi:1.0,  sun:.8,   exp:.98,  rain:0,   fog:0,   tint:'#f1f1f0', bar:.5 },
  drizzle: { name:'Drizzle',      say:'Grey, with drizzle',           hemi:.86,  sun:.42,  exp:.96,  rain:.38, fog:.15, tint:'#e8ebee', bar:.34 },
  shower:  { name:'Rain shower',  say:'Showers',                      hemi:.76,  sun:.32,  exp:.95,  rain:1,   fog:.2,  tint:'#e2e7ec', bar:.22 },
  fog:     { name:'Valley fog',   say:'Fog in the valley, lifting by ten', hemi:.9, sun:.38, exp:1.0, rain:0, fog:1,   tint:'#eeeeec', bar:.45 },
  heat:    { name:'Heat wave',    say:'Hot: a heat wave',             hemi:1.12, sun:1.22, exp:1.03, rain:0,   fog:0,   tint:'#ffeacc', bar:.95, big:true },
  snow:    { name:'Light snow',   say:'Light snow',                   hemi:.94,  sun:.45,  exp:1.02, rain:0,   fog:.2,  tint:'#eef2f6', bar:.3, snow:.55 },
  heavysnow:{ name:'Heavy snow',  say:'Heavy snow',                   hemi:.9,   sun:.3,   exp:1.03, rain:0,   fog:.45, tint:'#e9eef4', bar:.15, snow:1, big:true },
  frost:   { name:'Frost',        say:'A hard frost, clearing later', hemi:1.0,  sun:.85,  exp:1.0,  rain:0,   fog:.1,  tint:'#f2f6fb', bar:.7, ice:1 },
  hail:    { name:'Hail',         say:'Showers, with hail',           hemi:.72,  sun:.3,   exp:.95,  rain:.55, fog:.15, tint:'#dfe5ec', bar:.18, hail:1 },
  gale:    { name:'Gale',         say:'A gale blowing',               hemi:.9,   sun:.55,  exp:.97,  rain:.15, fog:.05, tint:'#e8ecef', bar:.12, gale:1, big:true },
  downpour:{ name:'Downpour',    say:'A downpour',                   hemi:.7,   sun:.25,  exp:.94,  rain:1.3, fog:.3,  tint:'#dde2e8', bar:.1 },
  storm:   { name:'Thunderstorm', say:'Thunderstorms',                hemi:.6,   sun:.18,  exp:.92,  rain:1.2, fog:.25, tint:'#d8dde6', bar:.08, big:true },
};
const wxRng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
// the plan for one working day: [[minute after 07:00, kind, extra], ...]
function wxPlan(wd = calDay()){
  const lv = S.level, d = wd - (LV_START[lv] ?? wd), set = {
    1:[[[0, 'overcast']], [[0, 'overcast'], [210, 'shower'], [262, 'overcast']], [[0, 'clear'], [330, 'overcast']]],
    2:[[[0, 'clear', 'blossom']], [[0, 'overcast'], [372, 'shower'], [418, 'clear', 'rainbow']], [[0, 'clear', 'blossom'], [300, 'overcast']]],
    3:[[[0, 'clear']], [[0, 'fog'], [180, 'clear']], [[0, 'overcast'], [240, 'clear']], [[0, 'clear']]],
    4:[[[0, 'clear']], [[0, 'clear'], [300, 'overcast']], [[0, 'heat', 'icecream']], [[0, 'heat'], [360, 'storm'], [405, 'overcast']]],
    8:[[[0, 'overcast'], [210, 'drizzle'], [280, 'overcast']], [[0, 'clear']], [[0, 'overcast'], [110, 'downpour'], [300, 'overcast']], [[0, 'clear', 'blossom'], [360, 'overcast']], [[0, 'overcast'], [200, 'clear', 'rainbow']]],
    7:[[[0, 'fog'], [170, 'clear']], [[0, 'overcast'], [260, 'clear']], [[0, 'fog'], [150, 'overcast']], [[0, 'overcast'], [100, 'gale'], [430, 'overcast']], [[0, 'fog'], [190, 'clear'], [470, 'overcast']]],
    6:[[[0, 'overcast'], [150, 'shower'], [190, 'clear', 'blossom']], [[0, 'overcast'], [380, 'hail'], [440, 'clear', 'rainbow']], [[0, 'clear', 'blossom'], [330, 'overcast']], [[0, 'overcast'], [140, 'shower'], [185, 'clear', 'rainbow']]],
    5:[[[0, 'heavysnow'], [240, 'snow']], [[0, 'frost'], [200, 'overcast']], [[0, 'frost'], [180, 'clear']], [[0, 'overcast'], [330, 'snow']], [[0, 'overcast'], [520, 'snow']]],
  }[lv];
  if (set && d >= 0 && d < set.length) return set[d];
  // beyond the level's days: the season's likely weather, from the game's seed (17.4)
  const r = wxRng(((S.wx && S.wx.seed) || 7) ^ (wd * 2654435761)), season = seasonOf(wd), x = r();
  if (season === 'winter') { const w = x < .35 ? 'frost' : x < .65 ? 'overcast' : x < .9 ? 'snow' : 'clear'; return w === 'frost' ? [[0, 'frost'], [200, 'overcast']] : [[0, w]]; }
  const pickK = season === 'summer' ? (x < .55 ? 'clear' : x < .85 ? 'overcast' : 'shower') : season === 'spring' ? (x < .3 ? 'clear' : x < .65 ? 'overcast' : x < .82 ? 'drizzle' : 'shower') : (x < .25 ? 'clear' : x < .6 ? 'overcast' : x < .8 ? 'drizzle' : 'shower');
  const plan = [[0, pickK === 'shower' ? 'overcast' : pickK, season === 'spring' && r() < .5 ? 'blossom' : null]];
  if (pickK === 'shower') { const at = Math.round(90 + r() * 360); plan.push([at, 'shower'], [at + 35 + Math.round(r() * 30), r() < .5 ? 'clear' : 'overcast', at > 300 && r() < .5 ? 'rainbow' : null]); }
  else if (season !== 'summer' && lv >= 3 && r() < .25) plan[0][1] = 'fog', plan.push([150 + Math.round(r() * 60), pickK === 'fog' ? 'overcast' : pickK]);
  return plan;
}
const wxAt = (wd, m) => { const p = wxPlan(wd); let k = p[0]; for (const q of p) if (q[0] <= m) k = q; return k; };
// the day's headline weather for the wireless and the day book: the biggest spell of the day
function wxSummary(wd){ const p = wxPlan(wd), ks = p.map(q => q[1]), big = ks.find(k => WX[k].big), wet = ks.includes('shower') ? 'shower' : ks.includes('drizzle') ? 'drizzle' : null;
  const hail = p.find(q => q[1] === 'hail');
  if (hail) return `${WX[ks[0]].say}, with hail ${hail[0] < 300 ? 'in the morning' : 'in the afternoon'}`;
  if (wet && ks[0] === wet) return ks.length === 1 ? WX[wet].say : `${WX[wet].say}, clearing ${p[1][0] < 300 ? 'by midday' : 'in the afternoon'}`;
  return big ? (big === 'storm' ? 'Hot, with thunderstorms in the afternoon' : big === 'heat' ? 'Hot all day: a heat wave' : `${WX[big].say}${p.find(q => q[1] === big)[0] < 300 ? ' in the morning' : ' later'}`) : ks[0] === 'fog' ? 'Fog in the valley first thing, lifting by ten' : wet ? `${WX[ks[0]].say}, with ${wet === 'shower' ? 'a shower' : 'drizzle'} ${p.find(q => q[1] === wet)[0] < 300 ? 'in the morning' : 'in the afternoon'}` : WX[ks[0]].say; }
var wx = { kind:'overcast', from:'overcast', k:1, dur:30, extra:null, flashT:0, flash:0, thunder:[], rainbow:0, petal:0, said:'' };
let wxInit = false;
function updateWeather(dt){
  S.wx ||= { seed:Math.floor(Math.random() * 1e9) };
  if (!S.tutDone && S.level === 1) { if (!wxInit) { wxInit = true; wx.kind = wx.from = 'overcast'; wx.k = 1; } applyWeather(dt); return; }   // the guided Monday: grey and still
  const closing = S.day && S.day.closing, m = closing ? SHIFT_MIN : dayMin(), [, kind, extra] = wxAt(calDay(), m);
  let want = kind; if (WX[want].big && sessionT < 60) want = 'overcast';   // big weather never in the first minute of a session
  if (wxForce) want = wxForce;
  if (!wxInit) { wxInit = true; wx.kind = wx.from = want; wx.k = 1; }
  if (want !== wx.kind) { wx.from = wx.kind; wx.kind = want; wx.k = 0; wx.dur = rand(20, 40); wx.extra = extra;
    if (S.tutDone && !closing) wxNews(want, extra); }
  wx.k = Math.min(1, wx.k + dt / wx.dur);
  if (wx.extra === 'rainbow' && wx.k > .4 && !wx.rbDone) { wx.rbDone = true; wx.rainbow = 1; const g = gusChar(); if (g && !S.gus.retired) gusSay(g, 'Look at that, boss. A rainbow over the hills.'); for (const c of staffObj.values()) if (!c.stack.length && c.state !== 'fixing') c.say = { text:pick(['Look at that!', 'A rainbow!', 'Pot of gold up the valley.']), until:T + 2.4 }; }
  if (wx.extra === 'icecream' && wx.k > .6 && !wx.icDone && !closing && dayMin() > 120 && dayMin() < 420) { wx.icDone = true; iceCreamVan(); }
  applyWeather(dt); updateIce(dt); updateYardLamps(dt); updateSnow(dt); if (S.wx && S.wx.hailLying) SNOW_U.value = Math.max(SNOW_U.value, S.wx.hailLying * .8);
}
let wxForce = null;
function wxNews(kind, extra){
  const g = gusChar(), gus = (t) => { if (g && !S.gus.retired) gusSay(g, t); };
  if (kind === 'shower') { toast('A shower over the valley: the yard is wet and the crew goes carefully (10% slower). Nobody walks in from the road.', ''); gus(pick(['Here it comes. Mind the timber.', 'Rain! The farmers will be happy.'])); }
  else if (kind === 'drizzle') toast(`Drizzle. ${S.restored.awning ? 'The gate awning keeps the walk-in trade coming.' : 'Walk-in trade stays at home in the wet.'}`, '');
  else if (kind === 'storm') { toast('A thunderstorm breaks over the valley. Lightning trips supplies: power cuts are three times as likely while it lasts.', 'bad'); gus('That\'s the heat breaking. Count the seconds after the flash.'); }
  else if (kind === 'heat') { toast(`A heat wave. Old Faithful loses 10% in the heat${mainsUp() ? ' (the mains does not care)' : ''}.`, 'gold'); gus('Hot enough to fry an egg on the dock plate.'); }
  else if (kind === 'fog') toast('Fog lies on the valley floor. Lorries feel their way in: about 15 minutes late.', '');
  else if (kind === 'heavysnow') { toast(`Heavy snow. The crew shovels the lanes; ${S.restored.chains ? 'with chains on, the lorries and the forklift keep their speed' : 'lorries and the forklift crawl at 70% on the uncleared lanes'}.`, 'gold'); gus('Get the shovels out, lads. Your grandad cleared this yard himself in \'47.'); }
  else if (kind === 'gale') { toast('A gale gets up: leaves and papers fly, the tarpaulins flap and the flags stand out straight.', 'bad'); gus('Hold onto your hat, boss!'); }
  else if (kind === 'hail') { toast(`Hail! White pellets bounce off the yard; everybody outdoors takes cover for a few seconds.${crane ? ' The crane stops its lift.' : ''}`, 'bad'); gus('Hailstones the size of peas!'); }
  else if (kind === 'snow') toast('Snow is falling. Everybody walks a little slower on it.', '');
  else if (kind === 'frost') toast(`A hard frost. ${S.restored.grit ? 'The lanes were gritted at seven.' : 'The forklift goes 15% slower on the ice until ten.'}`, '');
  else if ((wx.from === 'shower' || wx.from === 'storm' || wx.from === 'drizzle') && !wx.rain) toast('The rain has passed.', '');
  else if (wx.from === 'fog') toast('The fog lifts off the valley.', '');
}
// what the weather does to work (17.3)
const wxK = n => { const a = WX[wx.from][n] || 0, b = WX[wx.kind][n] || 0; return a + (b - a) * wx.k; };
const wxRain = () => wxK('rain');
const showerOn = () => wxRain() > .55;   // a downpour (L8) counts as a shower                              // a proper shower: the crew goes carefully, nobody walks in
const drizzleOn = () => !showerOn() && wxRain() > .18;
const wxFog = () => wxK('fog');
const heatOn = () => wx.kind === 'heat' && wx.k > .5 || (wx.from === 'heat' && wx.k < .5);
const stormOn = () => wx.kind === 'storm' && wx.k > .3;
const wxGenK = () => heatOn() ? .9 : 1;                             // engines lose power in heat
const snowFall = () => wxK('snow');                                  // flakes falling (0..1)
const snowLying = () => (S.wx && S.wx.lying) || 0;                   // snow on the ground (builds while it snows, thaws slowly)
const icy = () => wxK('ice') > .5 && dayMin() < 180 && !(S.restored.grit && S.wx && S.wx.gritted === dayNo());   // frost until ten, unless the lanes were gritted at seven
const walkSnowK = () => snowFall() > .3 || snowLying() > .5 ? .9 : 1;   // walking 10% slower in snow (grip)
const vehRainK = () => wxRain() > 1.1 ? .85 : 1;   // a downpour: vehicles slower on the yard
const vehSnowK = () => vehRainK() * ((wx.kind === 'heavysnow' && wx.k > .4 || snowLying() > .7) && !S.restored.chains ? .7 : icy() ? .85 : 1);   // uncleared lanes: lorries and the forklift 30% slower, 15% on ice
const wxLorryLate = () => wxFog() > .6 && !S.up.docklamps ? 15 : 0;   // loading lamps (L7) light the bays: drivers back in through the fog                     // drivers need to see: 15 game minutes late
const noWalkIns = () => showerOn() || (drizzleOn() && !S.restored.awning) || !!(S.l6 && S.l6.refit && S.l6.refit.st === 'crane');   // nobody walks in past a crane in the gateway
function applyWeather(dt){
  const tint = new THREE.Color(WX[wx.from].tint).lerp(new THREE.Color(WX[wx.kind].tint), wx.k);
  wx.light = { hemi:wxK('hemi'), sun:wxK('sun'), exp:wxK('exp'), tint };
  const r = wxRain(); if (r > .02 && !rain) { rain = { wx:true }; buildRainFx(); } if (rain && rain.wx && r <= .02) { rain = null; rainFxTick(dt, 0); }
  // fog: the scene's own fog, tinted by the time of day, thick at the far side of the view
  const f = wxFog(); if (f > .02) { if (!scene.fog) scene.fog = new THREE.Fog('#bfc3c2', 40, 120); scene.fog.color.set(tint).multiplyScalar(.82); scene.fog.near = 52 - 26 * f; scene.fog.far = 118 - 52 * f; } else if (scene.fog) scene.fog = null;
  // lightning: a brief light flash (never over three a second, dimmed with reduced motion), thunder delayed by distance
  if (stormOn() && !paused) { wx.flashT -= dt; if (wx.flashT <= 0) { wx.flashT = rand(5, 14); const km = rand(.6, 5); wx.flash = REDUCED ? .35 : 1; wx.thunder.push({ at:T + km * 3, km }); } }
  wx.flash = Math.max(0, wx.flash - dt * 6);
  for (let i = wx.thunder.length - 1; i >= 0; i--) if (T >= wx.thunder[i].at) { const km = wx.thunder[i].km; wx.thunder.splice(i, 1); noiseS(2.4 + km * .3, 160 + 200 / km, .09 / Math.max(.8, km * .6)); noiseS(.6, 900, .02 / km); }
  // spring blossom on the wind, petals from the town's trees
  if (wx.extra === 'blossom' || (seasonOf() === 'spring' && wx.kind === 'clear')) { wx.petal += dt * 6; while (wx.petal > 1) { wx.petal--; sprite(pick(['#f6d9e4', '#f2e6ee', '#ffffff']), camPos.x + rand(-14, 10), rand(2.5, 5), camPos.z + rand(-14, 8), rand(.6, 1.4), rand(-.3, -.1), rand(.1, .4), 6, .07, -.05); } }
  // the rainbow over the hills behind the works, after an afternoon shower
  if (wx.rainbow > 0) { wx.rainbow = Math.max(0, wx.rainbow - dt / 75); showRainbow(Math.min(1, wx.rainbow * 4, (1 - wx.rainbow) * 6)); } else if (M.rainbow) M.rainbow.visible = false;
}
// Snow (v2.0 17.2, 17.6): it lies white on every upward face (roofs, the yard, the fields) through one shader value, not
// new models; the yard itself is shovelled clear by the crew each snowy morning; flakes fall in the 3D scene round the view.
const SNOW_U = { value:0 }, SNOW_YARD = { value:0 };
// roofs keep the snow off what is under them: every roof in the scene (an elevated, flat-ish slab at least a metre each
// way: the workshop, the warehouse, the sheds and canopies, the office block, the canteen, the furnace house...) is a
// rectangle with its eave height; a surface under one, below the eave, stays clear. Trees, signs, wires and anything
// that moves (lorries, the car, the forklifts, the crane, the train) never count. Found again when buildings change.
const ROOF_MAX = 48, ROOF_R = { value:Array.from({ length:ROOF_MAX }, () => new THREE.Vector4(0, 0, 0, 0)) }, ROOF_Y = { value:new Float32Array(ROOF_MAX) }, ROOF_N = { value:0 };
let roofKey = '';
// the up-facing area of a mesh in world space (its top, seen from above), cached on the mesh while it does not move
const _ua = new THREE.Vector3(), _ub = new THREE.Vector3(), _uc = new THREE.Vector3();
function upArea(o){ o.updateWorldMatrix(true, false); const key = o.matrixWorld.elements.join(','); if (o.userData.upKey === key) return o.userData.upA;
  const g = o.geometry, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count, mw = o.matrixWorld; let a = 0;
  for (let i = 0; i + 2 < n; i += 3) { const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    _ua.fromBufferAttribute(pos, i0).applyMatrix4(mw); _ub.fromBufferAttribute(pos, i1).applyMatrix4(mw); _uc.fromBufferAttribute(pos, i2).applyMatrix4(mw);
    const cy = (_ub.z - _ua.z) * (_uc.x - _ua.x) - (_ub.x - _ua.x) * (_uc.z - _ua.z); a += Math.abs(cy) / 2 * (cy > 0 ? 1 : 0); }
  o.userData.upKey = key; o.userData.upA = a; return a; }
function findRoofs(){
  const fadeNodes = new Set(); for (const f of M.fade || []) for (const n of f.nodes) fadeNodes.add(n);   // a roof faded away while the owner is under it is still a roof
  const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible && !fadeNodes.has(p)) return false; return true; };   // not yet built (hidden) is not
  let nMesh = 0; world.traverse(o => { if (o.isMesh && shown(o)) nMesh++; }); const key = nMesh + '|' + S.level; if (key === roofKey) return; roofKey = key;
  const moving = new Set([M.truck, M.truck2, M.flat, M.car, fork.o, fork8.o, rail && rail.g, crane && crane.g, crane && crane.flat, owner && owner.o, bolt.o].filter(Boolean));
  const skip = o => { for (let p = o; p; p = p.parent) { if (moving.has(p) || p.userData.char || /tree|pine|bush|hedge|lamp|sign|board|wire|pole|flag|sock/i.test(p.name || '')) return true; } return false; };
  const bb = new THREE.Box3(), out = [];
  const sc = new THREE.Vector3();
  world.traverse(o => { if (o.userData.roof && shown(o)) { const [rw, rd, ry] = o.userData.roof, q = o.getWorldPosition(sc); out.push([q.x - rw / 2, q.z - rd / 2, q.x + rw / 2, q.z + rd / 2, ry]); }   // a cutaway building names the roof it stands for
    if (!o.isMesh || o.isInstancedMesh || !shown(o) || o.userData.noSnow) return; bb.setFromObject(o); const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z, h = bb.max.y - bb.min.y;
    if (bb.min.y < 1.6 || h > 2.6 || w < .9 || d < .9 || w * d < 1.5 || w * d > 400) return; if (skip(o)) return;
    const g = o.geometry; if (!g) return; if (!g.boundingBox) g.computeBoundingBox(); o.getWorldScale(sc); const gb = g.boundingBox, ld = [(gb.max.x - gb.min.x) * Math.abs(sc.x), (gb.max.y - gb.min.y) * Math.abs(sc.y), (gb.max.z - gb.min.z) * Math.abs(sc.z)].sort((a, b) => b - a);
    if (ld[1] < .8) return;   // a cable or a beam running on the diagonal: long, but thin both other ways
    if (upArea(o) < .45 * w * d) return;   // a roof's top fills its footprint; cables, merged small fittings and frames do not
    out.push([bb.min.x + .08, bb.min.z + .08, bb.max.x - .08, bb.max.z - .08, bb.min.y - .05, o.name || (o.parent && o.parent.name) || '?']); });
  out.sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]));   // the biggest first, if there are ever more than the shader holds
  M.roofList = out; ROOF_N.value = Math.min(ROOF_MAX, out.length); for (let i = 0; i < ROOF_N.value; i++) { const r = out[i]; ROOF_R.value[i].set(r[0], r[1], r[2], r[3]); ROOF_Y.value[i] = r[4]; }
}
function snowPatch(){
  const site = [SITE.x0 - .5, SITE.z0 - .5, SITE.x1 + .5, SITE.z1 + .5], bb = new THREE.Box3();
  scene.traverse(o => { if (!o.isMesh || o.userData.noSnow) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) { if (!m || m.userData.snow || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial) || m.transparent && m.opacity < .9) continue;
      bb.setFromObject(o); const yard = bb.max.y < .08 && bb.min.x > site[0] - 30 && (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) > 3 && (bb.min.x + bb.max.x) / 2 > site[0] && (bb.min.x + bb.max.x) / 2 < site[2] && (bb.min.z + bb.max.z) / 2 > site[1] && (bb.min.z + bb.max.z) / 2 < site[3];
      m.userData.snow = yard ? 'y' : 'a'; const U = yard ? SNOW_YARD : SNOW_U;
      m.onBeforeCompile = sh => { sh.uniforms.uSnow = U; sh.uniforms.uRoofR = ROOF_R; sh.uniforms.uRoofY = ROOF_Y; sh.uniforms.uRoofN = ROOF_N;
        sh.vertexShader = 'varying vec3 vSnowW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  { vec4 sw = vec4(transformed, 1.0);\n  #ifdef USE_INSTANCING\n  sw = instanceMatrix * sw;\n  #endif\n  vSnowW = (modelMatrix * sw).xyz; }');
        sh.fragmentShader = 'uniform float uSnow;\nuniform vec4 uRoofR[' + ROOF_MAX + '];\nuniform float uRoofY[' + ROOF_MAX + '];\nuniform int uRoofN;\nvarying vec3 vSnowW;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  { vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); float k = uSnow * smoothstep(0.42, 0.8, dot(normal, upV));\n    for (int i = 0; i < ' + ROOF_MAX + '; i++) { if (i >= uRoofN) break; vec4 r = uRoofR[i]; if (vSnowW.x > r.x && vSnowW.x < r.z && vSnowW.z > r.y && vSnowW.z < r.w && vSnowW.y < uRoofY[i]) { k = 0.0; break; } }\n    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.96), k); }'); };
      m.customProgramCacheKey = () => 'snow2-' + m.userData.snow; m.needsUpdate = true; } });
}
const SNOW_N = 1100; let snowFx = null, snowPatchT = -9;
function updateSnow(dt){
  const W = S.wx ||= {}, fall = snowFall(), winter = seasonOf() === 'winter';
  W.lying = clamp((W.lying || 0) + (fall > .2 ? dt * fall / 90 : -dt / (winter ? 2400 : 300)), 0, 1);
  // the crew shovel the yard from seven on a snowy morning; fresh snow covers it again
  if (dayMin() < 2) W.cleared = 0; if (S.tutDone && !(S.day && S.day.closing) && S.staff.length) W.cleared = clamp((W.cleared || 0) + dt / 140 - (fall > .6 ? dt / 300 : 0), 0, 1);
  if ((W.lying > .02 || (W.hailLying || 0) > .02) && T - snowPatchT > 3) { snowPatchT = T; findRoofs(); snowPatch(); }
  SNOW_U.value = W.lying * .95; SNOW_YARD.value = W.lying * .9 * (1 - (W.cleared || 0) * .85);
  // the morning grit: the grit bin's lanes are done at seven on an icy day
  if (S.restored.grit && wxK('ice') > .5 && W.gritted !== dayNo() && dayMin() < 30) { W.gritted = dayNo(); toast('Icy morning: the crew grits the lanes from the grit bin.', ''); }
  // falling flakes: one points cloud round the camera's view, drifting
  if (fall > .02 && !snowFx) { const g = new THREE.BufferGeometry(), pos = new Float32Array(SNOW_N * 3); for (let i = 0; i < SNOW_N; i++) { pos[i * 3] = camPos.x + rand(-16, 16); pos[i * 3 + 1] = rand(0, 12); pos[i * 3 + 2] = camPos.z + rand(-20, 12); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); snowFx = new THREE.Points(g, new THREE.PointsMaterial({ map:TX.dot, color:'#ffffff', size:5, sizeAttenuation:false, transparent:true, opacity:0, depthWrite:false })); snowFx.frustumCulled = false; snowFx.renderOrder = 6; snowFx.userData.noSnow = true; scene.add(snowFx); }
  if (snowFx) { snowFx.material.opacity = Math.min(.9, fall * 1.1); snowFx.visible = fall > .02; if (snowFx.visible) { const p = snowFx.geometry.attributes.position, a = p.array;
    for (let i = 0; i < SNOW_N; i++) { a[i * 3 + 1] -= dt * (.9 + (i % 7) * .08); a[i * 3] += Math.sin(T * .8 + i) * dt * .35 + dt * .25; if (a[i * 3 + 1] < 0) { a[i * 3] = camPos.x + rand(-16, 16); a[i * 3 + 1] = rand(10, 13); a[i * 3 + 2] = camPos.z + rand(-20, 12); } }
    p.needsUpdate = true; } }
}
let REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// the camera never sees the sky, so the rainbow is drawn where the hills would be: a faint arc across the top of the view,
// in the scene (it moves with the camera, behind the HUD), coloured light, never a flat painted stripe
function showRainbow(k){
  if (!M.rainbow) { const g = new THREE.Group(), cols = ['#ff5a4a', '#ff9a3a', '#ffe14a', '#6fd46a', '#4aa8ff', '#6a5aff', '#b25aff'];
    cols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(10.6 - i * .26, 10.86 - i * .26, 96, 1, .18, Math.PI - .36), new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:0, depthTest:false, depthWrite:false, fog:false, blending:THREE.AdditiveBlending })); m.renderOrder = 9; g.add(m); });
    scene.add(g); M.rainbow = g; }
  const R = M.rainbow; R.visible = k > .01; if (!R.visible) return;
  R.quaternion.copy(cam.quaternion); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion), fw = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  R.position.copy(cam.position).addScaledVector(fw, 20).addScaledVector(up, -7.5 * camZoom); R.scale.setScalar(camZoom);
  R.children.forEach(m => m.material.opacity = .16 * k); }
// the barometer: brass rim, the old words round the dial, the needle on today's pressure; a tap swings it to tomorrow's
let baroTap = 0;
function baroDraw(tomorrow = false){ const el = $('offBaro'); if (!el) return; const w = tomorrow ? WX[wxAt(calDay() + 1, 240)[1]] : WX[wx.kind], a = -110 + 220 * w.bar;
  el.title = `Barometer: ${tomorrow ? 'tomorrow' : 'now'} ${w.name.toLowerCase()}`;
  el.innerHTML = `<svg viewBox="0 0 64 64"><circle cx="32" cy="34" r="27" fill="#3b2f22" stroke="#b8913e" stroke-width="3"/><circle cx="32" cy="34" r="22" fill="#efe6cf"/>
    <text x="13" y="47" font-size="6.5" fill="#6b3a2a" font-family="Georgia">RAIN</text><text x="23" y="21" font-size="6.5" fill="#3b3a35" font-family="Georgia">CHANGE</text><text x="42" y="47" font-size="6.5" fill="#2f5a3a" font-family="Georgia">FAIR</text>
    <g class="ndl" style="transform:rotate(${a}deg)"><line x1="32" y1="34" x2="32" y2="15" stroke="#1d1a16" stroke-width="1.8"/><circle cx="32" cy="34" r="2.6" fill="#b8913e"/></g></svg>`; }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#offBaro')) { baroTap = T; baroDraw(true); sfx('tick'); toast(`The barometer swings: tomorrow, ${wxSummary(calDay() + 1).toLowerCase()}.`, ''); setTimeout(() => { if (T - baroTap >= 2.5) baroDraw(); }, 3000); } });
// the 07:00 wireless: one line of forecast, and for the day book a line about tomorrow (big weather is always forecast)
function wxForecastToast(){ const t = wxSummary(calDay()); toast(`The wireless at seven: "${t}."`, ''); }
// heat wave joy (17.5): the ice-cream van stops at the gate; buy the crew ice creams for $10 and they work 5% faster today
function iceCreamVan(){ S.day.ice = { n:dayNo(), bought:false }; toast('The ice-cream van stops at the gate, chimes playing. Buy the crew a round ($10): 5% faster for the rest of the day. Stand at the van.', 'gold');
  for (const [i, f] of [[0, 659], [1, 784], [2, 880], [3, 784], [4, 659]]) tone(f, .16, 'triangle', .03, i * .18); }
// the van stands on the far verge across Mill Road with its chimes; the owner buys at the ring inside the gate
const ICE_AT = [6.3, 11.55];
function updateIce(dt){
  const ic = S.day && S.day.ice && S.day.ice.n === dayNo() ? S.day.ice : null, show = !!ic && !ic.bought && !(S.day && S.day.closing) && dayMin() < 520;
  if (show && !M.iceVan) buildIceVan(); if (M.iceVan) M.iceVan.visible = show; if (M.rings && M.rings.ice) M.rings.ice.g.visible = show;
  if (!show) return; if (Math.random() < dt * .03) for (const [i, f] of [[0, 659], [1, 784], [2, 880]]) tone(f, .14, 'triangle', .02, i * .17);
  if (near(owner.o, ICE_AT, .6) && ownerStill() && S.cash >= 10) { ic.t = (ic.t || 0) + dt; setArc(M.rings.ice, ic.t / .8);
    if (ic.t > .8) { ic.bought = true; S.cash -= 10; sfx('buy'); toast('Ice creams all round ($10). The crew works 5% faster for the rest of the day.', 'good'); for (const c of staffObj.values()) c.say = { text:pick(['Cheers, boss!', 'Lovely.', 'Strawberry for me!']), until:T + 2.4 }; save(); } }
  else if (ic.t) { ic.t = 0; setArc(M.rings.ice, 0); }
}
function buildIceVan(){
  const g = new THREE.Group(), cream = new THREE.MeshStandardMaterial({ color:'#f1e8d2', roughness:.6 }), pink = new THREE.MeshStandardMaterial({ color:'#d9798f', roughness:.6 }), dark = new THREE.MeshStandardMaterial({ color:'#22252a', roughness:.8 }), glass = new THREE.MeshStandardMaterial({ color:'#5a7080', roughness:.2, metalness:.3 });
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  box(3.2, 1.55, 1.75, cream, -.3, 1.25, 0); box(1.0, 1.0, 1.7, cream, 1.75, .98, 0); box(.05, .45, 1.5, glass, 2.26, 1.25, 0);   // body, cab, windscreen
  box(3.25, .22, 1.78, pink, -.3, .62, 0); box(4.2, .1, 1.8, dark, .2, .48, 0); box(1.6, .7, .04, dark, -.4, 1.45, .9);            // the stripe, the sill, the serving hatch
  for (const [x, z] of [[-1.3, .78], [-1.3, -.78], [1.6, .78], [1.6, -.78]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .22, 14), dark); w.rotation.x = Math.PI / 2; w.position.set(x, .34, z); g.add(w); }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.22, .6, 12), new THREE.MeshStandardMaterial({ color:'#d8a85a' })); cone.rotation.x = Math.PI; cone.position.set(-.3, 2.35, 0); g.add(cone);
  const scoop = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 10), pink); scoop.position.set(-.3, 2.7, 0); g.add(scoop);
  g.position.set(9.6, 0, ROAD_Z + 3.9); g.rotation.y = Math.PI; g.userData.dyn = true; world.add(g); M.iceVan = g;
  if (!M.rings.ice) M.ring('ice', ...ICE_AT, '#f2a3b8', .55); }
const iceK = () => S.day && S.day.ice && S.day.ice.bought && S.day.ice.n === dayNo() ? 1.05 : 1;

function rivalHtml(k){ const pl = PLACES[k];
  return `<div class="who"><img alt="" src="${portrait('buyer_' + k)}"><div><b>${pl.buyer}</b><small>${pl.name} · on the telephone</small></div></div>
    <p class="quote">"${S.level >= 8 ? 'Victor Krane came round from across the river' : 'Hendry\'s yard in Dunmore came round'}. They'll do it 10% cheaper. I'd rather stay with you, but money's money."</p>
    <div class="offer"><b>Match their price</b><button class="btn primary" data-rival="match" type="button">Match</button><p>Orders from ${pl.name} pay 10% less for three days. They stay your account.</p></div>
    <div class="offer"><b>Stand firm</b><button class="btn" data-rival="refuse" type="button">Refuse</button><p>They go to Hendry's. Win them back with a visit later.</p></div>`; }
function rivalPick(k, what){ const a = sales().acc[k]; if (!a) return;
  if (what === 'match') { a.cut = dayNo() + 2; toast(`${PLACES[k].name} stays with you at 10% less for three days.`, 'good'); }
  else { delete sales().acc[k]; toast(`${PLACES[k].name} has gone to ${S.level >= 8 ? 'Victor Krane' : 'Hendry\'s yard'}. A visit might win them back.`, 'bad'); }
  save(); }

let cashShown = 0, hudT = 0, cardKey = '';
// a drum counter: one rolling drum per digit, the punctuation printed between them; rebuilt only when the length changes
function drums(el, str){ if (!el) return; if (el._s === str) return; const old = el._s || '';
  if (!el._d || old.length !== str.length || old.replace(/\d/g, '0') !== str.replace(/\d/g, '0')) { el.innerHTML = [...str].map(ch => /\d/.test(ch) ? `<span class="drum"><span class="strip">${'0123456789'.split('').map(d => `<i>${d}</i>`).join('')}</span></span>` : `<span class="dsep">${ch}</span>`).join(''); el._d = [...el.querySelectorAll('.strip')]; el.setAttribute('aria-label', str); }
  let k = 0; for (const ch of str) if (/\d/.test(ch)) { el._d[k].style.transform = `translateY(${-+ch * 10}%)`; k++; }
  el._s = str; el.setAttribute('aria-label', str); }
// the reputation dial: a needle over the bands (shaky, known, trusted, respected, renowned)
function repDial(el, r){ if (!el) return; const a = -90 + 180 * clamp(r, 0, 100) / 100;
  if (!el._n) { el.innerHTML = `<svg viewBox="0 0 48 28" class="dial" aria-hidden="true"><path d="M4 26 A20 20 0 0 1 44 26" fill="none" stroke="#2a2416" stroke-width="6"/>
      <path d="M4 26 A20 20 0 0 1 24 6" fill="none" stroke="#b3291e" stroke-width="4"/><path d="M24 6 A20 20 0 0 1 37.4 11.1" fill="none" stroke="#e2a72c" stroke-width="4"/><path d="M37.4 11.1 A20 20 0 0 1 44 26" fill="none" stroke="#7fae4a" stroke-width="4"/>
      <g class="ndl"><line x1="24" y1="26" x2="24" y2="8" stroke="#ece2c6" stroke-width="2.2" stroke-linecap="round"/></g><circle cx="24" cy="26" r="3" fill="#c9a24a"/></svg>`; el._n = el.querySelector('.ndl'); }
  el._n.style.transform = `rotate(${a}deg)`; }

/* build 0.16: the concept HUD. A management bar along the bottom opens the office at the right page from anywhere;
   chips show the day, the crew and open issues; the objectives panel ticks off the charter with a hint underneath. */
const DOCK = [['orders', 'Orders', 'clip'], ['staff', 'Workers', 'people'], ['plant', 'Machines', 'gear'], ['charter', 'More', 'boxes']];   // Bible 9.1: four bottom buttons
function buildDock(){
  $('dock').innerHTML = DOCK.map(([t, l, ic], i) => `<button type="button" data-i="${i}" aria-label="${l}">${icon(ic)}<span>${l}</span><i class="bd" hidden></i></button>`).join('');
  $('dock').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; openOffice(DOCK[+b.dataset.i][0]); });
}
let hudSig = '';
function updateHud2(){
  const ch = charter(), done = ch.filter(lineDone).length;
  const badges = [S.call ? 1 : 0, S.staff.filter(xpReady).length, S.faults.length, 0];
  const sig = [dayClock(), JSON.stringify(targetProg() && targetProg().slice(0, 2)), JSON.stringify(chalkProg() && chalkProg().slice(0, 2)), S.day && S.day.target && S.day.target.done, S.staff.length, S.faults.length, done, ch.map(c => lineVal(c)).join(','), badges.join(','), S.level].join('|');
  if (sig === hudSig) return; hudSig = sig;
  $('clock').hidden = false; $('clock').classList.toggle('lunch', lunchTime()); $('clock').classList.toggle('hurry', SPEED > 1); if (!$('clock').dataset.hurry) { $('clock').dataset.hurry = 1; const on = e => { if (S.level >= 8 && hasRole('foreman')) { hurry = true; e.preventDefault(); } }, off = () => { hurry = false; }; $('clock').addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('clock').addEventListener(ev, off); $('clock').title = 'Hold to hurry the clock (Level 8, with a foreman)'; } $('clock').innerHTML = `${icon('wait', lunchTime() ? '#9bd26f' : '#e8ab2c')}<span>${dayClock()}</span>`; $('issC').hidden = S.level < 3;
  $('crewC').innerHTML = `${icon('people', '#9bd26f')}<span>${S.staff.length}</span>`;
  const tp = targetProg(), ck = chalkProg(); $('tgtC').hidden = !(tp || ck) || !S.tutDone; if (ck) { $('tgtC').classList.toggle('ok', ck[0] === ck[1]); $('tgtC').innerHTML = `${icon('clip', ck[0] === ck[1] ? '#9bd26f' : '#e8ab2c')}<span>Jobs ${ck[0]} / ${ck[1]}</span>`; $('tgtC').title = 'The foreman\'s chalkboard: ' + ck[2].jobs.map(j => (j.done ? '✓ ' : '') + CHALK[j.k].txt(j.need)).join(' · '); }
  if (tp) { $('tgtC').classList.toggle('ok', tp[2].done); $('tgtC').innerHTML = `${icon('star', tp[2].done ? '#9bd26f' : '#e8ab2c')}<span>${tp[2].kind === 'takings' ? `${fmt(tp[0])} / ${fmt(tp[1])}` : `${tp[0]} / ${tp[1]}`}</span>`; $('tgtC').title = `Today's target: ${TARGETS[tp[2].kind].txt(tp[1])}`; }
  $('issC').innerHTML = `${icon('alert', S.faults.length ? '#ff8f80' : '#8d939a')}<span>${S.faults.length}</span>`; $('issC').classList.toggle('bad', S.faults.length > 0);
  [...$('dock').children].forEach((b, i) => { const bd = b.querySelector('.bd'), n = badges[i]; bd.hidden = !n; bd.textContent = i === 0 ? '!' : n; bd.classList.toggle('g', i === 1); });
}
function updateHud(dt){
  cashShown += (S.cash - cashShown) * Math.min(1, dt * 6); if (Math.abs(S.cash - cashShown) < 1) cashShown = S.cash; drums($('cash'), fmt(Math.round(cashShown)));
  hudT -= dt; if (hudT > 0) return; hudT = .15; updateHud2();
  const band = repBand(); $('rep').textContent = Math.round(S.rep) + '%'; $('repBox').title = `Reputation: ${band[1]}`; repDial($('repDial'), S.rep); $('repBand').textContent = band[1].toUpperCase(); $('repBand').style.color = band[2];
  const done = charterDone(), ch = charter(), money = ch.find(c => c.money); $('lvFill').style.width = (S.levelUp ? 100 : done / ch.length * 100) + '%';
  $('lvProg').textContent = S.levelUp ? 'Charter complete' : `Charter ${done} of ${ch.length}${money ? ` · ${fmt(lineVal(money))} / ${fmt(money.need)}` : ''}`;
  const L = LEVELS[S.level]; if ($('lvName')._l !== S.level) { $('lvName')._l = S.level; $('lvN').textContent = 'LEVEL ' + String(S.level).padStart(2, '0'); $('lvName').textContent = L.name; $('lvNext').textContent = 'Next: ' + L.next; }
  const o = objective(); $('objT').textContent = o.t; $('obj').classList.toggle('alert', !!o.alert); curObj = o;
  const tk = $('ticket'), od = S.order;
  if (od) { tk.hidden = false; const left = od.deadline - od.time, late = !od.nodl && left < 0; tk.classList.toggle('late', late);
    // the ticket names what is holding the order up right now, so a stall is never a mystery
    const short = od.qty - od.cut - (S.store + S.timber + S.feed + timberInHands()) - (S.delivery && S.delivery.kind !== 'steel' ? S.delivery.left : 0);
    const shortP = (od.pq || 0) - (od.pcut || 0) - steelPipes();
    const hold = od.ready ? (truck.state === 'docked' ? 'Ready: sign at the dock' : 'Truck arriving')
      : !od.briefed ? (hasRole('supervisor') ? 'Supervisor taking the order' : orderOp(od) ? `Brief ${orderOp(od).st.name}` : 'Stand at the saw')
      : short > 0 ? `Short of timber: order ${short} more planks`
      : shortP > 0 ? `Short of steel: order ${Math.ceil(shortP / COIL_PIPES)} more coils`
      : od.cut < od.qty && !sawOn ? `Saw: ${sawReason().label[2].toLowerCase()}`
      : (od.pcut || 0) < (od.pq || 0) && !pipeOn ? `Mill: ${pipeReason().label[2].toLowerCase()}`
      : (od.tcut || 0) < (od.tq || 0) && !toolOn ? `Press: ${toolReason().label[2].toLowerCase()}`
      : od.cut < od.qty || (od.pcut || 0) < (od.pq || 0) || (od.tcut || 0) < (od.tq || 0) ? (overloaded() ? 'Making: slowed by the generator' : 'Making') : truck.state !== 'docked' ? (S.lv2.wh >= 2 ? 'Covered: waiting for the truck' : 'Waiting for the truck') : [...staffObj.values()].some(c => c.state === 'toWhTake' || c.state === 'takeWh') ? 'Loading from the warehouse' : 'Loading the truck';
    const made = [od.qty ? `Cut ${od.cut}/${od.qty}` : '', od.pq ? `Pipes ${od.pcut || 0}/${od.pq}` : '', od.tq ? `Tools ${od.tcut || 0}/${od.tq}` : ''].filter(Boolean).join(' · ');
    tk.innerHTML = `<div class="h"><span>${od.terms === 'rush' ? '<b class="rush">RUSH</b> ' : od.terms === 'bulk' ? 'BULK · ' : ''}ORDER #${od.id}</span><span>${od.nodl ? 'NO DEADLINE' : late ? 'LATE' : 'DUE ' + dueAt(left).toUpperCase()}</span></div><div class="q">${[od.qty ? `${S.bed} / ${od.qty} crates` : '', od.pq ? `${S.pbed} / ${od.pq} pipes` : '', od.tq ? `${S.tbed} / ${od.tq} tools` : ''].filter(Boolean).join('<br>')}</div><div class="pay">${fmt(od.pay)}${late ? ' · half pay' : ''}</div><div class="st">${made} · ${hold}</div><div class="tb"><i style="width:${clamp(left / od.deadline, 0, 1) * 100}%"></i></div>`;
    tk.style.top = (moneyBottom() + 8) + 'px';
  } else tk.hidden = true;
  const tk2 = $('ticket2'), o2 = S.level >= 5 ? S.order2 : null;
  if (o2) { tk2.hidden = false; const left = o2.deadline - o2.time, late = left < 0, sh = short2(); tk2.classList.toggle('late', late);
    const hold = o2.ready ? (hasRole('supervisor') ? 'Ready: supervisor signs' : 'Ready: sign at dock 2') : truckB.state !== 'docked' ? (o2.lateBy && truckB.state === 'away' ? `Truck held up: ${truckWait(truckB, o2)} s` : 'Truck on its way') : !hasRole('forklift') ? 'Hire a forklift driver' : sh ? `Waiting for stock: ${sh}` : 'Forklift loading';
    tk2.innerHTML = `<div class="h"><span>${o2.rush ? '<b class="rush">RUSH</b> ' : ''}DOCK 2 · #${o2.id}</span><span>${late ? 'LATE' : 'DUE ' + dueAt(left).toUpperCase()}</span></div><div class="q">${[o2.qty ? `${o2.l.c}/${o2.qty} crates` : '', o2.pq ? `${o2.l.p}/${o2.pq} pipes` : '', o2.tq ? `${o2.l.t}/${o2.tq} tools` : ''].filter(Boolean).join(' · ')}</div><div class="pay">${fmt(o2.pay)}${late ? ' · half pay' : ''}</div><div class="st">From stock · ${hold}</div><div class="tb"><i style="width:${clamp(left / o2.deadline, 0, 1) * 100}%"></i></div>`;
    if (!(T - (tk2._t || -9) < .5)) { tk2._t = T; tk2.style.top = ((tk.hidden ? moneyBottom() : tk.getBoundingClientRect().bottom) + 8) + 'px'; }
  } else tk2.hidden = true;
  const cc = $('callc');
  if (S.call && !officeOpen) { const c = S.call, h = `<div class="ch">${icon('phone', '#fff')}<div><span class="k">INCOMING CALL</span><b>${c.client}</b></div></div><div class="d">${c.dock === 2 ? (c.rush ? 'RUSH · dock 2 · ' : 'Dock 2 · ') : ''}${describe(c)} · ${fmt(c.pay)} · due ${dueAt(c.deadline)}</div><div class="go">Tap to answer</div>`;
    if (cc._h !== h) { cc.innerHTML = h; cc._h = h; } cc.hidden = false;
    // where the slip sits is measured twice a second, not every frame: measuring right after the HUD's writes forced a full layout each frame (the stutter when the phone rang)
    if (!(T - (cc._t || -9) < .5) || cc._wasHidden) { cc._t = T; cc.style.top = (Math.max($('money').getBoundingClientRect().bottom, tk.hidden ? 0 : tk.getBoundingClientRect().bottom, $('ticket2').hidden ? 0 : $('ticket2').getBoundingClientRect().bottom) + 8) + 'px'; } cc._wasHidden = false; }
  else { cc.hidden = true; cc._wasHidden = true; }
  // power strip under the cash box
  const pw = $('pw'), pwh = `${icon('bolt', powerOn() ? '#e8ab2c' : '#ff8f80')}<span>${powerOn() ? (mainsUp() ? `Mains ${Math.round(load() / supplyKW() * 100)}%` : suppliesFree() ? `${Math.round(load() / genKW() * 100)}% load` : `${Math.round(S.power.fuel)}%`) : 'OFF'}</span>${S.faults.length ? `<i class="fdot">${S.faults.length}</i>` : ''}`;
  if (pw._h !== pwh) { pw._h = pwh; pw.className = 'panel' + (powerOn() ? '' : ' off'); pw.innerHTML = pwh; }
  // inspection card
  const card = $('card'); if (false && target && !officeOpen) { const h = cardHtml(target); if (h !== cardKey) { card.innerHTML = h; cardKey = h; } card.hidden = false; } else { card.hidden = true; cardKey = ''; }
  const p = $('prompt'); let msg = '';
  if (near(owner.o, P.drop, .75) && S.order && S.order.ready) msg = 'Signing the delivery note';
  else if (S.level >= 5 && near(owner.o, P.drop2, .75) && S.order2 && S.order2.ready) msg = 'Signing dock 2\'s delivery note';
  else for (const pd of visiblePads()) if (near(owner.o, pd.at, .7) && S.cash <= 0) msg = 'You need cash to pay in';
  p.hidden = !msg || !card.hidden; p.textContent = msg;
  officeDot(); if (officeOpen && T - (renderOffice.t || 0) > .5) { const sig = officeSig(); if (sig !== lastSig) { renderOffice.t = T; const B = $('offBody'), y = B.scrollTop; renderOffice(); B.scrollTop = y; } }
}
let curObj = { t:'', at:null };

/* =====================================================================
   CAMERA
   ===================================================================== */
const camPos = new THREE.Vector3();
const SUN_Z = SUN_OFF.clone().normalize(), SUN_X = new THREE.Vector3(0, 1, 0).cross(SUN_Z).normalize(), SUN_Y = SUN_Z.clone().cross(SUN_X), snapV = new THREE.Vector3();
function snapShadow(x, z){
  const texel = (SH * 2) / sun.shadow.mapSize.x; snapV.set(x, 0, z);
  const u = snapV.dot(SUN_X), v = snapV.dot(SUN_Y);
  return snapV.addScaledVector(SUN_X, Math.round(u / texel) * texel - u).addScaledVector(SUN_Y, Math.round(v / texel) * texel - v);
}
let camLock = null, camZoom = 1;  // test hooks: pin the camera (flicker scan), pull back for overview shots
function placeCam(dt){
  const w = innerWidth, h = innerHeight, aspect = w / h;
  const viewW = (aspect < 1 ? VIEW_W : VIEW_H * aspect) * camZoom, viewH = (aspect < 1 ? VIEW_W / aspect : VIEW_H) * camZoom;
  const reach = viewH / 2 / Math.sin(CAM_EL) * Math.cos(CAM_EL) + viewH / 2 * Math.cos(CAM_EL) + 12;   // ground plus the tallest chimney
  Object.assign(cam, { left:-viewW / 2, right:viewW / 2, top:viewH / 2, bottom:-viewH / 2, near:Math.max(1, CAM_DIST - reach), far:CAM_DIST + reach }); cam.updateProjectionMatrix();
  if (!placeCam.hud || T - placeCam.hudT > 1) { placeCam.hudT = T; const ob = $('obj').getBoundingClientRect(), db = $('dock').getBoundingClientRect(); placeCam.hud = [clamp(ob.bottom / h, 0, .45), clamp(1 - db.top / h, 0, .2)]; if ($('toasts').children.length) placeToasts(); }   // the banner's height changes with its text
  const D = viewH / Math.sin(CAM_EL), span = (lo, hi, v, half) => { const a = lo + half, b = hi - half; return a > b ? (a + b) / 2 : clamp(v, a, b); };
  const sb = siteBounds(); if (S.l8 && S.l8.zonesShown && !S.l8.pad) sb[0] = Math.min(sb[0], PADS8.C[0] - 2);   // choosing the beam store's zone: all three in view
  const tx = span(Math.min(M.scrapOpen ? -27 : SITE.x0 - 1.5, sb[0] - 1.5), Math.max(SITE.x1 + 3, sb[1] + 3), S.gus.party >= 2 ? partySpot()[0] : owner.o.position.x, viewW / 2), tz = span(Math.min(S.lv3.field ? -22.5 : SITE.z0 - 2.5, sb[2] - 2.5) - placeCam.hud[0] * D, Math.max(ROAD_Z + 2.6, sb[3] + 2.5) + placeCam.hud[1] * D, (S.gus.party >= 2 ? partySpot()[1] : owner.o.position.z) - (aspect < 1 ? 1.1 : .6), D / 2);   // the farewell party holds the camera   // the North field extends the site northwards
  if (camLock) { camPos.x = camLock[0]; camPos.z = camLock[1]; } else { camPos.x += (tx - camPos.x) * Math.min(1, dt * 5); camPos.z += (tz - camPos.z) * Math.min(1, dt * 5); }
  const qk = typeof quake === 'number' && quake > 0 && !REDUCED ? quake : 0, qx = qk ? Math.sin(T * 47) * qk * .05 : 0, qz = qk ? Math.cos(T * 53) * qk * .04 : 0;   // the crane's thud shakes the view a little
  cam.position.set(camPos.x + qx, Math.sin(CAM_EL) * CAM_DIST, camPos.z + qz + Math.cos(CAM_EL) * CAM_DIST); cam.lookAt(camPos.x + qx, 0, camPos.z + qz);
  const tgt = snapShadow(camPos.x, camPos.z);
  sun.target.position.copy(tgt); sun.position.copy(tgt).add(SUN_OFF);
}

/* =====================================================================
   LOOP + BOOT
   ===================================================================== */
const clock = new THREE.Clock(); let paused = false, hold = false, T = 0, saveT = 0, SPEED = 1, frames = 0;
function frame(){
  // YouTube paused the game: no simulation, no rendering, no audio until onResume
  if (hold || pageHidden) { requestAnimationFrame(frame); return; }   /* hidden page: the game stands still */
  // the next frame is booked first and each phase is guarded: one faulty card or label can never freeze the
  // whole game again (build 0.9: the generator's card threw every frame and the game stopped)
  requestAnimationFrame(frame);
  frames++;
  const raw = Math.min(.05, clock.getDelta());
  guard('sim', () => { for (let k = 0; k < SPEED; k++) step(raw); });
  // any change to the drawing buffer happens here, right before the render: resizing a canvas clears it, and
  // a resize after the render showed one blank frame (the "blink" while walking, when the frame rate dipped
  // and the quality governor changed resolution, or when a phone's address bar moved)
  guard('view', () => { adaptQuality(raw); if (needResize) { needResize = false; resize(); } placeCam(raw); updateFade(); updateGuide(curObj); renderer.render(scene, cam); });
  guard('labels', updateLabels); guard('hud', () => updateHud(raw)); guard('audio', () => updateAudio(raw)); fpsMeter();
}
// development FPS meter (preview builds): frames a second, the slowest frame of the last second, and hitches
// (frames over 100 ms) in the last 10 seconds, so a stutter on a phone can be seen and reported
const FPS = { n:0, t0:performance.now(), last:performance.now(), worst:0, hitch:[], el:null };
function fpsMeter(){
  if (!PREVIEW || typeof __PLAYABLES__ !== 'undefined') return;   // v2.0 22.3: never in the Playables build
  const now = performance.now(), d = now - FPS.last; FPS.last = now; FPS.n++; FPS.worst = Math.max(FPS.worst, d); if (d > 100) FPS.hitch.push(now);
  if (now - FPS.t0 < 500) return;
  const fps = FPS.n * 1000 / (now - FPS.t0); FPS.hitch = FPS.hitch.filter(t => now - t < 10000);
  const el = FPS.el ||= $('fps'); if (!el) return;
  el.textContent = `FPS ${Math.round(fps)}  ·  slowest ${Math.round(FPS.worst)} ms\nhitches (10 s) ${FPS.hitch.length}  ·  ${Math.round(innerWidth * dpr)}×${Math.round(innerHeight * dpr)}`;
  el.className = fps < 25 || FPS.hitch.length > 2 ? 'bad' : fps < 45 ? 'warn' : '';
  FPS.n = 0; FPS.t0 = now; FPS.worst = 0;
}
const errSeen = new Set();
function guard(where, fn){
  try { fn(); } catch(e) {
    const k = where + ':' + e.message; if (errSeen.has(k)) return; errSeen.add(k);   // report each distinct error once
    S.errors = (S.errors || 0) + 1; console.error(`[iv] ${where}: ${e.message}`, e);
    try { yt && yt.health.logError(); } catch(_){}
  }
}
function step(dt){
  if (paused || cardOpen) return;
  T += dt; S.time += dt;
  for (const m of mixers) m.update(dt);
  if (!officeOpen && !trip) { updateOwner(dt); updateCarDoor(); } else target = null;
  healthCheck(dt); trolleyWatch(); updateFacilities(dt); updateSupplier(dt); updateGenerator(dt); updateFaults(dt); updateStall(dt); selfFeed(dt); coilSelfFeed(dt); updatePlots(dt); updateSaw(dt); updateSaw2(dt); updateForklift(dt); updateStall4(dt); updatePipeMill(dt); updateToolPress(dt); updateBuilder(dt); updateLevel3(dt); updateLevel5(dt); updateLevel6(dt); updateLevel7(dt); updateLevel8(dt); updatePolish(dt); updateReorder(); updateLowLoaders(dt); if (AC && MASTER) MASTER.gain.value = S.fxVol ?? 1; updateTruck(dt); updateTrip(dt); carTip(); updateDay(dt); updateTarget(); updateEvents(dt); updateWalkin(dt); updateStaff(dt); updateGus(dt); updateBolt(dt); updateVeraVisit(dt); updateMains(dt); updateDock(dt); updateZoneRing(dt); updateContractors(dt); updateFlights(dt); syncCarry(); updateTutorial(dt); updateFx(dt);
  saveT += dt; if (saveT > 8) { saveT = 0; save(); }
}
const MAX_DPR = Math.min(2, devicePixelRatio || 1); let dpr = MAX_DPR, perfT = 0, perfN = 0, perfGood = 0, perfBad = 0, lastDpr = 0, dprSettled = false, needResize = false;
let rsW = 0, rsH = 0;
function resize(){ const w = innerWidth, h = innerHeight; if (w === rsW && h === rsH && renderer.getPixelRatio() === dpr) return; rsW = w; rsH = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); }
// quality governor: keep the frame rate up on slower phones by lowering the render resolution a step at a
// time. It needs two slow 2-second windows in a row to step down and six fast ones to step up, and once it
// has stepped down after stepping up it stays put, so it can never see-saw (each change costs a reallocation).
function adaptQuality(raw){
  perfT += raw; perfN++; if (perfT < 2) return;
  const fps = perfN / perfT; perfT = perfN = 0;
  if (fps < 42 && dpr > 1) { perfGood = 0; if (++perfBad >= 2) { perfBad = 0; if (lastDpr > 0) dprSettled = true; dpr = Math.max(1, +(dpr - .25).toFixed(2)); lastDpr = -1; needResize = true; } return; }
  perfBad = 0;
  if (fps > 57 && !dprSettled && dpr < MAX_DPR) { if (++perfGood >= 6) { perfGood = 0; dpr = Math.min(MAX_DPR, dpr + .25); lastDpr = 1; needResize = true; } } else perfGood = 0;
}
addEventListener('resize', () => { needResize = true; placeToasts(); });
function homeOf(st, i){ return st.role === 'forklift' ? P.forkHome : st.role === 'operator' ? (st.mach === 'pipe' ? (P.pop || [12.9, 5.0]) : st.mach === 'tool' ? (P.top || [17.6, .3]) : st.mach === 'saw2' ? (P.op2 || P.forkHome) : st.mach === 'pipe2' ? (P.pop2 || [13.3, 15.9]) : P.op) : st.role === 'loader' ? [P.loaderHome[0] + i * .7, P.loaderHome[1]] : st.role === 'helper' ? [P.feedRing[0] + .9, P.feedRing[1] + .2] : st.role === 'mechanic' ? P.mechHome : st.role === 'electrician' ? P.elecHome : P.patrol[0]; }
async function boot(){
  try { yt && yt.game.firstFrameReady(); } catch(e){}
  const prog = (p, t) => { try { window.ivLoad && window.ivLoad(p, t); } catch(e){} };
  prog(30, 'Lighting the furnace'); makeTextures(); prog(38, 'Reading the ledger'); await loadSave(); prog(46, 'Unloading the machines'); await ensureModels(S.level);
  prog(64, 'Building the works'); buildWorld(); buildCartBay(); if (adOn('sign')) putSign(); buildPlots(); buildBeacons(); buildNav(); buildGuide(); buildDock(); prog(80, 'Calling the crew');
  const batch = bakeStatic(); console.info(`[iv] static meshes ${batch.before} -> ${batch.after} draw calls`);
  if (S.level >= 2) buildLevel2();
  if (S.level >= 3) buildLevel3();
  if (S.level >= 4) buildLevel4();
  if (S.level >= 5) buildLevel5();
  if (S.level >= 6) buildLevel6();
  if (S.level >= 7) buildLevel7();
  if (S.level >= 8) buildLevel8();
  for (const id of Object.keys(S.restored)) if (S.restored[id]) applyRestore(id, false);
  for (const id of Object.keys(PLOTS)) if (plotOwned(id)) finishPlot(id, false);
  owner = makeChar('owner', S.owner[0], S.owner[1], { parts:['clipboard'] }); owner.play('idle'); owner.faceNow(Math.PI * .85); owner.st = OWNER_ST;
  placeFolk();
  if (S.gus.party > 1) S.gus.party = 1;   // a reload mid-party starts the party again
  S.staff.forEach((st, i) => { st.focus ??= 100; const h = st.posted === false ? P.wait[st.role === 'operator' ? 0 : 1] : homeOf(st, i), c = spawnStaff(st, h[0], h[1]); if (st.role === 'operator' && (st.mach === 'pipe' ? millReady() : st.mach === 'tool' ? pressReady() : st.mach === 'saw2' ? saw2Ready() : st.mach === 'pipe2' ? mill2Ready() : true)) { c.state = 'work'; c.faceNow(Math.PI); } });
  syncRack(); syncStore(); syncFeed(); syncPallet(); syncPile(); syncCoilBay(); syncCoilFeed(); syncPipes(); syncTFeed(); syncTools(); syncParts();
  // a driver in each cab
  for (const Tr of [M.truck, M.flat]) { const d = makeChar('worker', 0, 0, { parts:['hat_cap', 'hair_short'], cols:{ suit:'#4a4f57', hat:Tr === M.truck ? '#2f5d8a' : '#3e6b45', skin:pick(SKINS), hair:pick(HAIRS), shirt:pick(SHIRTS) } });
    d.o.children.filter(x => x.isMesh && x.geometry.type === 'PlaneGeometry').forEach(x => x.removeFromParent()); Tr.add(d.o); d.o.position.set(1.42, .56, .42); d.faceNow(Math.PI / 2); d.play('sit'); }
  parkedLamps(M.truck); parkedLamps(M.flat);
  applyUpgradeVisuals();
  if (S.order) { truck.state = 'docked'; const q = pathAt(ARRIVE, ARRIVE.len); M.truck.position.set(q.x, 0, q.z); M.truck.rotation.y = q.yaw; addCol([P.truck[0] - 1.15, P.truck[1] - 2.45, P.truck[0] + 1.15, P.truck[1] + 2.75], 'truck'); syncBed(); syncPBed(); syncTBed(); }
  camPos.set(owner.o.position.x, 0, owner.o.position.z); cashShown = S.cash; resize();
  requestAnimationFrame(frame);
  // Playables lifecycle: pause everything on onPause, resume only on onResume, respect YouTube's mute.
  // The Page Visibility API is not allowed inside Playables, so it is only used when running outside YouTube.
  try { if (yt) { yt.system.onPause(() => { paused = true; hold = true; save(); if (AC) AC.suspend().catch(() => {}); }); yt.system.onResume(() => { paused = false; hold = false; clock.getDelta(); if (AC && audioAllowed()) AC.resume().catch(() => {}); });
    yt.system.onAudioEnabledChange(on => setYtAudio(on)); } } catch(e){}
  // __PLAYABLES__ is defined by tools/package.mjs, so the Playables bundle does not contain this code at all
  if ((typeof __PLAYABLES__ === 'undefined' || !__PLAYABLES__) && !yt) document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });   // the phone copy builds with __PLAYABLES__ false and keeps this
  // build 0.18c: in another app or with the screen off nothing is drawn, but the machine sounds kept playing at their last
  // volume. The audio is suspended while the page is hidden and resumed when it comes back.
  const bgAudio = () => { pageHidden = document.hidden; if (pageHidden) { save(); if (AC) AC.suspend().catch(() => {}); return; } clock.getDelta(); if (AC && audioAllowed()) AC.resume().catch(() => {}); };   // hidden: every sound off (no sound effect may wake the audio: audioAllowed) and the clock does not count the time away
  if ((typeof __PLAYABLES__ === 'undefined' || !__PLAYABLES__) && !yt) { document.addEventListener('visibilitychange', bgAudio); addEventListener('pagehide', () => { pageHidden = true; save(); if (AC) AC.suspend().catch(() => {}); }); addEventListener('pageshow', bgAudio); }   // v2.0 21: never the Page Visibility API inside Playables
  // gameReady only once the loading screen is gone and the player can act
  prog(100, 'Ready');
  const ld = $('loading'); setTimeout(() => { ld.style.opacity = 0; setTimeout(() => { ld.remove(); try { yt && yt.game.gameReady(); } catch(e){} }, 600); }, 350);
  // a new game opens on the grandfather's letter, then Gus at the gates
  if (!S.letter) { S.letter = true; story({ kind:'letter' }); meet('gus'); save(); }
  else { loginCalendar(); restoreNight(); }
  window.__iv = { get CARs(){ return CAR; }, get nightState(){ return S.day && S.day.closing && S.day.closing.night; }, ownerOff, nightKind, NIGHT_ROUND, TABS, findRoofs, ROOF_N, ROOF_R, ROOF_Y, get roofKey(){ return roofKey; }, set roofKey(v){ roofKey = v; }, siteBounds, updateGuide, get guideHere(){ return guideHere; }, get guideShown(){ return !!(guide && guide.visible); }, get guideRingShown(){ return !!(guideRing && guideRing.visible); }, get pageHidden(){ return pageHidden; }, audioAllowed, toast, placeToasts, segBlocked, STRAY_RING, SITE, stateWord, VERA_FROM, STRAY_AT, KENNEL, buildKennel, boltFeed, slotFree, parkSlotNear, officeHours, get veraWalk(){ return veraWalk; }, svcAt, FAULTS, upgVisible, upCost, lineText, applyMains, stockLedger, get beats(){ return beats; }, learnSkill, canPromote, staffOf, linesHtml, coverHtml, settingsHtml, SHOVEL_AT, PHOTO_AT, milestonePhoto, repaintSigns, COLKEYS:() => [...COL.keys()], get rail(){ return rail; }, buyRaw, chooseStore, goLiveHD, lightFurnace, l8DayEnd, get furnOn(){ return furnOn; }, get fork8(){ return fork8; }, PADS8, SIGN_RING, DAIRY_PAD, hurryOk, set hurry(v){ hurry = v; }, openGap, takeCard, makeCard, refillBoard, boardHtml, cardFits, l7Delivered, zoneCentres, zonesLive, get cyrus(){ return cyrus; }, PEGS, SURVEY_RING, BOARD_RING, hireTommy, buildClockTower, buildDockLamps, REFIT, orderRefit, finishRefit, bookService, svcDue, svcPost, tierOf, get crane(){ return crane; }, craneGone, INSPECT6, get insp6(){ return insp6; }, clerkChar, clerkOn, juneSettle, ledger, buildCanteen, hailShelter, updateCrane, cutDark, buildLevel6, acceptCall2, finishPlot, rainK, noWalkIns, wxLorryLate, stormOn, helperOf, walkPatience, PAY_Q, ICE_AT, BOLT_NAP, BOLT_SHADE, setWx:k => { wxForce = k; wxForceT = 1e9; wx.from = wx.kind = k; wx.k = 1; }, wxFlash:() => { wx.flash = 1; }, rainbowNow:() => { wx.rainbow = .7; }, get wx(){ return wx; }, bolt, chalkProg, CHALK, loginCalendar, wxPlan, wxSummary, migrate, DAY_S, PAY_MIN, PAY_AT, LV_START, calDay, weekday, isFriday, dateOf, dueAt, seasonOf, payTime, payDay, payStep, ownerAtHatch, payNeeded, knockOff, get M_hatch(){ return M.hatch; }, get gateHolder(){ return gateHolder === CAR ? 'car' : gateHolder === truck ? 'lorry' : gateHolder === sup ? 'flatbed' : gateHolder ? '?' : null; }, samplePath, syncParts, syncStore, inFoot, vehInWay, LANE4, laneRoute, openScrapyard, groundY, saw2Reason, syncCoilBay, syncWh, objective, applyRestore, Box3:THREE.Box3, poolOf, step, set hold(v){ hold = v; }, carriers, palletCap, get sawBy(){ return sawBy; }, CAR, unloadBed, gateSrc, tooLate, loadModels, buildLevel3, finishMill, visiblePads, goodsIn, onLorry, buildGoodsIn, gateSwinging, carTip, pathAt, startRain, get rain(){ return rain; }, bladeK, rivalPick, accounts, targetProg, newTarget, withTerms, termsOk, set evNext(v){ evNext = v; }, ownerFeeds, get trip(){ return trip; }, startTrip, interest, callGap, placeSpec, PLACES, ADS, buyAd, pickOffer, sales, CAR_OUT, CAR_BACK, CAR_REV, carts, freeCart, takeCart, parkCart, cartSpot, BAY, giveCarry:(ch, type, n) => { while (ch.stack.length) ch.stack.pop().removeFromParent(); ch.carryType = n ? type : null; for (let i = 0; i < n; i++) { const m = type === 'pipe' ? inst('prop_pipe') : crateMesh(); ch.o.add(m); ch.stack.push(m); } layoutCarry(ch); }, carriedPos, CART_FROM, gateShut, get gateRot(){ return M.gateLeaves.map(L => +L.g.rotation.y.toFixed(2)); }, gateLeft, whistle, get audio(){ return AC && AC.state; }, yardEmpty, clockIn, get walker(){ return walker; }, syncPallet, syncPipes, spawnWalker, walkPrice, lunchTime, dayMin, dayNo, endOfDay, dayDate, morning, LUNCH_SPOTS, LDOCK, previewL2Layout, feedK, PADS, folkMap:folk, gusChar, gusDoing, giveGift, gusFarewellDone, get partyT(){ return partyT; }, get truckB(){ return truckB; }, payAccounts, closeWeek, weekAccounts, takeLoan, repayLoan, signOrder2, need2, short2, mill2Ready, startMill2Build, finishMill2, rushHaulier, dock2Spec, buildLevel5, get mill2On(){ return mill2On; }, mill2Reason, zoneHint, zoneCentre, get zoneRing(){ return zoneRing; }, showZone, promote, movePost, fork, saw2Ready, startSaw2Build, finishSaw2, get saw2On(){ return saw2On; }, zoneR, supervisor, plotOwned, whCapT, story, INSPECT, licReady, get inspector(){ return inspector; }, newGame, WHERE, PLOTS, offerPrice, openDeal, makeOffer, giveUpOrder, nextCard, get cardOpen(){ return cardOpen; }, ownerOn, plotSt, folk, repBand, get stalled(){ return stalled(); }, handOn, pressReady, pressOp, toolReason, toolLeft, buyField, startPressBuild, finishPress, applyLicence, orderParts, get toolOn(){ return toolOn; }, whReady, whMaking, whCapC, whCapP, startWhBuild, finishWh, whUnlocked, siteCrates, sitePipes, orderLeft, stockLeftC, stockLeftP,  TX, set speed(v){ SPEED = v; }, set paused(v){ paused = v; }, set camLock(v){ camLock = v; }, set camZoom(v){ camZoom = v; }, cam, scene, get frames(){ return frames; }, S, get owner(){ return owner; }, truck, M, P, staffObj, temps, hire, train, buyUpgrade, openOffice, closeOffice, save, capOf, maxLv, upSteps, UPGRADES, stallCount, orderWater, acceptCall, declineCall, orderTimber, orderSteel, startLevel, showLevelUp, startMillBuild, pipeReason, sawReason, get pipeOn(){ return pipeOn; }, get sawOn(){ return sawOn; }, pf, load, genKW, charter, lineDone, briefOrder, sup, startTalk, renderer, get dpr(){ return dpr; }, get trolleyBy(){ return trolleyBy; },
    COL, NAV, findPath, addFault, diagnose, project:(x, y, z) => { v3.set(x, y, z).project(cam); return [(v3.x + 1) / 2 * innerWidth, (1 - v3.y) / 2 * innerHeight]; }, faultById, get target(){ return target; }, powerOn, circuitOn, signOrder };
}
boot().catch(e => { $('loading').innerHTML = `<div style="padding:24px;color:#aab0b7">The workshop could not load: ${e.message}</div>`; console.error(e); });
