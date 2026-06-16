// Auto-generator clause tests (ROADMAP.md P1 — every DSL clause lands with a parser test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateFor } from "../scripts/generate.js";

// DON!! -N cost-return clause (highest measured frequency gap in OP-01).
test("parses [Activate: Main] DON!! -N cost-return into cost.returnDon", () => {
  const card = {
    code: "TST-001", category: "Character", colors: ["Blue"], cost: 5, power: 6000,
    text: "[Activate: Main] [Once Per Turn] DON!! -4 (You may return the specified number " +
      "of DON!! cards from your field to your DON!! deck.): Return up to 1 Character with a " +
      "cost of 5 or less to the owner's hand.",
    triggerText: null,
  };
  const r = generateFor(card);
  assert.ok(r.script.activateMain, "activateMain block produced");
  assert.equal(r.script.activateMain.oncePerTurn, true);
  assert.deepEqual(r.script.activateMain.cost, { returnDon: 4 }, "DON!! -4 → cost.returnDon=4");
  assert.equal(r.script.activateMain.ops[0].op, "returnToHand", "effect after ':' parsed");
  assert.equal(r.class, "A", "fully auto-classifiable");
});

// (N) rest-DON cost prefix.
test("parses (N) rest-DON cost prefix into cost.restDon", () => {
  const card = {
    code: "TST-002", category: "Character", colors: ["Blue"], cost: 3, power: 4000,
    text: "[Activate: Main] [Once Per Turn] (2) (You may rest the specified number of DON!! " +
      "cards in your cost area.): Rest up to 1 of your opponent's Characters.",
    triggerText: null,
  };
  const r = generateFor(card);
  assert.ok(r.script.activateMain, "activateMain block produced");
  assert.deepEqual(r.script.activateMain.cost, { restDon: 2 }, "(2) → cost.restDon=2");
});
