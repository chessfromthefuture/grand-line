// Deck legality — structural gate (ROADMAP.md P3 validation, pulled early).
// Every preset deck in DECKS must be a legal OPTCG deck. This catches the class of
// "54-card deck" bug the fuzzer flagged, at the source, with a clear message.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DECKS, card } from "../src/engine/cards.js";

for (const [name, deck] of Object.entries(DECKS)) {
  test(`deck ${name} is legal`, () => {
    // leader exists and is a Leader
    const leader = card(deck.leader);
    assert.equal(leader.category, "Leader", `${name}: leader ${deck.leader} is not a Leader`);

    // exactly 50 non-leader cards
    assert.equal(deck.cards.length, 50, `${name}: has ${deck.cards.length} cards, must be 50`);

    // ≤4 copies of any card; all codes known; no leaders in the 50
    const counts = {};
    for (const code of deck.cards) {
      const c = card(code); // throws if unknown
      assert.notEqual(c.category, "Leader", `${name}: ${code} is a Leader in the main deck`);
      counts[code] = (counts[code] || 0) + 1;
    }
    for (const [code, n] of Object.entries(counts))
      assert.ok(n <= 4, `${name}: ${n}× ${code} (max 4)`);

    // color legality: every card shares ≥1 color with the leader
    const lc = new Set(leader.colors);
    for (const code of Object.keys(counts)) {
      const shares = card(code).colors.some(col => lc.has(col));
      assert.ok(shares, `${name}: ${code} (${card(code).colors}) shares no color with leader (${leader.colors})`);
    }
  });
}
