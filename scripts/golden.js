#!/usr/bin/env node
// Golden replay regression suite (see ROADMAP.md §3, P1 gate).
// A golden is a {seed, deckNames} game whose deterministic outcome is frozen.
// Default: re-simulate every golden and assert the FULL final state hashes identically
// (bit-exact determinism) AND the saved {seed,decks,actions} replay re-reduces to the
// same state. Any divergence exits non-zero → blocks merge.
//   node scripts/golden.js           verify against test/golden/goldens.json
//   node scripts/golden.js --update  re-record goldens (review the diff before commit!)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { initGame, reduce } from "../src/engine/reducer.js";
import { DECKS } from "../src/engine/cards.js";
import { playout } from "../src/ai/agent.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const GOLDEN_FILE = path.join(root, "test", "golden", "goldens.json");

// Matchup matrix — spans starters + the OP-01 booster deck + cross-set + mirrors.
const GAMES = [
  ["ST01", "ST01", 1], ["ST01", "ST02", 7], ["ST02", "ST03", 13], ["ST03", "ST04", 21],
  ["ST04", "ST05", 42], ["ST05", "ST01", 99], ["OP01R", "ST01", 3], ["OP01R", "ST03", 17],
  ["OP01R", "OP01R", 7], ["ST02", "OP01R", 256],
];

// Deterministic canonical stringify (sorted keys) → stable hash across runs/machines.
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  return JSON.stringify(v);
}
const hash = s => crypto.createHash("sha256").update(canon(s)).digest("hex").slice(0, 16);

function simulate([a, b, seed]) {
  const decks = [DECKS[a], DECKS[b]];
  const start = initGame({ seed, decks });
  const { finalState, actions } = playout(start);
  // replay re-reduction must reproduce the same state
  let r = initGame({ seed, decks });
  for (const act of actions) r = reduce(r, act);
  const replayOk = hash(r) === hash(finalState);
  return { id: `${a}-vs-${b}#${seed}`, a, b, seed,
    winner: finalState.winner, turns: finalState.turn, actions: actions.length,
    stateHash: hash(finalState), replayOk };
}

const results = GAMES.map(simulate);

if (process.argv.includes("--update")) {
  fs.mkdirSync(path.dirname(GOLDEN_FILE), { recursive: true });
  fs.writeFileSync(GOLDEN_FILE, JSON.stringify(results, null, 2) + "\n");
  console.log(`Recorded ${results.length} goldens → test/golden/goldens.json`);
  process.exit(0);
}

if (!fs.existsSync(GOLDEN_FILE)) {
  console.error("No goldens.json — run: npm run golden:update"); process.exit(2);
}
const expected = JSON.parse(fs.readFileSync(GOLDEN_FILE, "utf8"));
const byId = Object.fromEntries(expected.map(g => [g.id, g]));
let bad = 0;
for (const r of results) {
  const e = byId[r.id];
  if (!r.replayOk) { console.error(`✗ ${r.id}: REPLAY DIVERGENCE (state != replay)`); bad++; continue; }
  if (!e) { console.error(`✗ ${r.id}: no golden recorded`); bad++; continue; }
  if (e.stateHash !== r.stateHash || e.winner !== r.winner || e.turns !== r.turns) {
    console.error(`✗ ${r.id}: DIVERGED  expected[w${e.winner} t${e.turns} ${e.stateHash}] ` +
      `got[w${r.winner} t${r.turns} ${r.stateHash}]`); bad++;
  } else console.log(`✓ ${r.id}  w${r.winner} t${r.turns} ${r.actions}a`);
}
if (bad) { console.error(`\nGOLDEN FAIL: ${bad}/${results.length} diverged`); process.exit(1); }
console.log(`\nAll ${results.length} goldens reproduced bit-exact.`);
