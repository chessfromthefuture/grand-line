#!/usr/bin/env node
// CLI runner: AI vs AI with full action log, or replay verification.
//   node src/cli/play.js [seed]
//   node src/cli/play.js --replay <file.json>     (verify a saved replay)
//   node src/cli/play.js --save <file.json> [seed] (save a replay)
import { initGame, reduce } from "../engine/reducer.js";
import { DECKS, ST01_DECK, card } from "../engine/cards.js";
import { playout } from "../ai/agent.js";
import fs from "node:fs";

const args = process.argv.slice(2);
// deck selection: --decks ST01,ST02
const dIdx = args.indexOf("--decks");
const deckNames = dIdx !== -1 ? args[dIdx + 1].split(",") : ["ST01", "ST01"];
const chosen = deckNames.map(n => {
  if (!DECKS[n]) { console.error(`Unknown deck ${n}. Available: ${Object.keys(DECKS).join(", ")}`); process.exit(1); }
  return DECKS[n];
});

if (args[0] === "--replay") {
  const rep = JSON.parse(fs.readFileSync(args[1], "utf8"));
  let s = initGame({ seed: rep.seed, decks: rep.decks });
  for (const a of rep.actions) s = reduce(s, a);
  console.log(`Replay verified: ${rep.actions.length} actions, winner P${s.winner}`);
  process.exit(0);
}

const seed = parseInt(args.find(a => /^\d+$/.test(a)) ?? "42", 10);
const start = initGame({ seed, decks: chosen });
const t0 = performance.now();
const { finalState, actions } = playout(start);
const ms = (performance.now() - t0).toFixed(1);

for (const e of finalState.log) console.log(`[T${String(e.t).padStart(2)}] ${e.msg}`);
console.log(`\n=== P${finalState.winner} wins in ${finalState.turn} turns ` +
            `(${actions.length} actions, ${ms}ms, seed ${seed}) ===`);
console.log(`P0 life ${finalState.players[0].life.length} | P1 life ${finalState.players[1].life.length}`);

const saveIdx = args.indexOf("--save");
if (saveIdx !== -1) {
  const file = args[saveIdx + 1];
  fs.writeFileSync(file, JSON.stringify({ seed, decks: chosen, actions }));
  console.log(`Replay saved → ${file}`);
}
