// Registry integrity (ROADMAP.md §4.9 — silent data corruption on ingest).
// Regression guard for the cross-set clobber bug: set responses bundle promo/alt-art
// reprints carrying FOREIGN codes (e.g. ST01-012 inside the OP-03 response). If ingested,
// they overwrite the canonical earlier-set card in the registry. The golden suite caught
// it once; this test makes it structural.
import test from "node:test";
import assert from "node:assert/strict";
import { allCards, card } from "../src/engine/cards.js";

test("every card's code prefix matches its set (no cross-set clobbering)", () => {
  for (const c of allCards()) {
    const codePrefix = c.code.split("-")[0];            // e.g. "OP03", "ST01"
    const setPrefix = (c.set || "").replace("-", "");   // "OP-03" → "OP03"
    assert.equal(codePrefix, setPrefix,
      `${c.code} ("${c.name}") has set ${c.set} — foreign reprint leaked into the registry`);
  }
});

test("canonical cards are not overwritten by promo/alt-art reprints", () => {
  // ST01-012 is the card the clobber bug surfaced on — its canonical name has no art suffix.
  assert.equal(card("ST01-012").name, "Monkey.D.Luffy");
  assert.equal(card("ST01-012").set, "ST-01");
});
