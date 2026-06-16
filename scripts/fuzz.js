#!/usr/bin/env node
// M10 fuzzer: uniform-RANDOM legal actions (seeded, deterministic), hard invariants
// every step-window, replay attack on the most chaotic games, telemetry dump.
//   node scripts/fuzz.js [games=10000]
import fs from "node:fs";
import { initGame, reduce, legalActions } from "../src/engine/reducer.js";
import { DECKS, allCards, script, card } from "../src/engine/cards.js";
import { TELEMETRY } from "../src/engine/effects.js";
import { whoseMove } from "../src/ai/agent.js";
import { rngNext } from "../src/engine/rng.js";

const GAMES = +(process.argv[2] || 10000);
const names = Object.keys(DECKS);
const fails = { crashes: [], softlocks: [], invariants: [], divergence: [] };
let totalActions = 0, maxActions = 0, chaotic = [];

function checkInvariants(s, seed) {
  for (let i = 0; i < 2; i++) {
    const p = s.players[i];
    const don = p.donDeck + p.donActive + p.donRested + p.leaderDon
      + p.chars.reduce((a, c) => a + c.attachedDon, 0);
    if (don !== 10) return `seed ${seed}: DON=${don} for P${i}`;
    const limbo = s.pending?.kind === "TRIGGER" && s.pending.seat === i ? 1 : 0;
    const cards = p.deck.length + p.hand.length + p.trash.length + p.life.length
      + p.chars.length + (p.stage ? 1 : 0) + limbo;
    if (cards !== 50) return `seed ${seed}: card count=${cards} for P${i} (conservation broken)`;
    if (p.chars.length > 5) return `seed ${seed}: ${p.chars.length} characters for P${i}`;
    if (p.donActive < 0 || p.donRested < 0 || p.donDeck < 0) return `seed ${seed}: negative DON pool P${i}`;
  }
  return null;
}

for (let seed = 1; seed <= GAMES; seed++) {
  const decks = [DECKS[names[seed % names.length]], DECKS[names[(seed * 7 + 3) % names.length]]];
  let s, rng = seed * 31337 + 7;
  try { s = initGame({ seed, decks }); } catch (e) { fails.crashes.push(`init ${seed}: ${e.message}`); continue; }
  const actions = [];
  let guard = 0, stuck = false;
  while (s.winner === null && guard++ < 3000) {
    const seat = whoseMove(s);
    if (seat == null) { stuck = true; break; }
    const acts = legalActions(s, seat);
    if (!acts.length) { stuck = true; break; }
    const r = rngNext(rng); rng = r.state;
    const a = acts[Math.floor(r.value * acts.length)];
    try { s = reduce(s, a); actions.push(a); }
    catch (e) { fails.crashes.push(`seed ${seed} action ${a.type}: ${e.message}`); stuck = true; break; }
    const inv = checkInvariants(s, seed);
    if (inv) { fails.invariants.push(inv + ` after ${a.type}`); break; }
  }
  if (s.winner === null && !stuck && guard >= 3000) fails.softlocks.push(`seed ${seed}: no terminus in 3000 actions`);
  if (stuck && s.winner === null && !fails.crashes.at(-1)?.startsWith(`seed ${seed}`))
    fails.softlocks.push(`seed ${seed}: no legal actions but game not over`);
  totalActions += actions.length;
  if (actions.length > maxActions) maxActions = actions.length;
  chaotic.push({ seed, decks, n: actions.length, actions });
  if (chaotic.length > 25) { chaotic.sort((a, b) => b.n - a.n); chaotic.length = 20; }
}

// replay attack: bit-exact re-simulation of the 20 longest/most chaotic games
for (const g of chaotic) {
  try {
    let s = initGame({ seed: g.seed, decks: g.decks });
    for (const a of g.actions) s = reduce(s, a);
    // re-run a second time to confirm stability of the replay itself
    let s2 = initGame({ seed: g.seed, decks: g.decks });
    for (const a of g.actions) s2 = reduce(s2, a);
    if (JSON.stringify(s) !== JSON.stringify(s2)) fails.divergence.push(`seed ${g.seed}: replay unstable`);
  } catch (e) { fails.divergence.push(`seed ${g.seed}: replay crashed: ${e.message}`); }
}

// telemetry: which scripted cards / ops were never executed across the whole fuzz
const scripted = allCards().filter(c => Object.keys(script(c.code)).length > 0 && c.set !== "TEST");
const neverRan = scripted.filter(c => !TELEMETRY.cards.has(c.code)).map(c => c.code);
const ALL_OPS = ["powerMod","giveDon","ko","battleFlag","grantFlag","playSelf","searchTop","setActive",
 "setActiveSource","restTarget","restOppDon","setDonActive","playFromTrash","discardFromHand","draw",
 "costMod","lifeToHand","lifeFromDeck","schedule","trashToHand","returnToHand","toBottomDeck",
 "playFromDeck","addDon","trashOppLife","playFromHand","grantKeywordTurn","custom"];
const opsNeverRan = ALL_OPS.filter(o => !TELEMETRY.ops[o]);

const report = {
  games: GAMES, totalActions, avgActions: Math.round(totalActions / GAMES), maxActions,
  crashes: fails.crashes.length, softlocks: fails.softlocks.length,
  invariantViolations: fails.invariants.length, replayDivergence: fails.divergence.length,
  details: { crashes: fails.crashes.slice(0, 10), softlocks: fails.softlocks.slice(0, 10),
    invariants: fails.invariants.slice(0, 10), divergence: fails.divergence.slice(0, 10) },
  scriptedCards: scripted.length,
  executedInFuzz: scripted.length - neverRan.length,
  neverExecuted: neverRan,
  opsExecuted: TELEMETRY.ops,
  opsNeverExecuted: opsNeverRan,
};
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/fuzz_raw.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, details: undefined, opsExecuted: undefined,
  neverExecuted: report.neverExecuted.join(",") }, null, 1));

// CI gate: any crash / softlock / invariant violation / replay divergence fails the build.
const violations = report.crashes + report.softlocks + report.invariantViolations + report.replayDivergence;
if (violations > 0) {
  console.error(`FUZZ GATE FAIL: ${violations} violation(s) across ${GAMES} games`);
  process.exit(1);
}
