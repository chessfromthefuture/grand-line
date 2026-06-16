// Resolution-stack well-formedness — the structural guard for the whole OPTCGSim
// trigger-stack bug family (ROADMAP.md §0.6, §4.1–4.4). The five specific bug classes
// (Double Attack two-window, ORDER simultaneous sequencing, REPLACE/onWouldKO, On-KO,
// Banish) have dedicated scenario tests in engine.test.js / m4.test.js. THIS test asserts
// the invariant that makes that whole class structurally impossible: during arbitrary
// legal play, the pending window stack is always well-formed and the game never wedges.
import test from "node:test";
import assert from "node:assert/strict";
import { initGame, reduce, legalActions } from "../src/engine/reducer.js";
import { DECKS } from "../src/engine/cards.js";
import { whoseMove } from "../src/ai/agent.js";

const WINDOW_KINDS = new Set(["BLOCK", "COUNTER", "TRIGGER", "CHOOSE", "REPLACE", "ORDER"]);

test("pending window stack is always well-formed during random legal play", () => {
  const names = Object.keys(DECKS);
  let steps = 0;
  for (let g = 0; g < 120; g++) {
    const a = names[g % names.length], b = names[(g + 3) % names.length];
    let s = initGame({ seed: g + 1, decks: [DECKS[a], DECKS[b]] });
    for (let i = 0; i < 600 && s.winner == null; i++) {
      const seat = whoseMove(s);
      const acts = legalActions(s, seat);
      assert.ok(acts.length > 0,
        `softlock: no legal action (g${g} step${i}, pending=${s.pending?.kind ?? "null"})`);
      // pick deterministically-pseudorandomly to explore odd branches the greedy AI skips
      s = reduce(s, acts[(g * 31 + i * 17) % acts.length]);
      steps++;

      // (1) at most ONE window open, and it is a known kind addressed to a real seat
      if (s.pending) {
        assert.ok(WINDOW_KINDS.has(s.pending.kind),
          `unknown pending kind ${s.pending.kind} (g${g} step${i})`);
        assert.ok(s.pending.seat === 0 || s.pending.seat === 1,
          `pending has no valid seat (g${g} step${i})`);
      }
      // (2) a dangling battle must always be reachable through a window — never orphaned
      if (s.battle && !s.pending && s.winner == null) {
        const open = legalActions(s, whoseMove(s));
        assert.ok(open.length > 0, `battle open with no window and no actions (g${g} step${i})`);
      }
    }
  }
  assert.ok(steps > 1000, `expected substantial exploration, only ${steps} steps`);
});
