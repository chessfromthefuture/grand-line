import test from "node:test";
import assert from "node:assert/strict";
import { initGame, reduce, legalActions } from "../src/engine/reducer.js";
import { ST01_DECK, ST02_DECK, card } from "../src/engine/cards.js";
import { effPower } from "../src/engine/power.js";
import { playout } from "../src/ai/agent.js";

const newGame = (seed = 42) => initGame({ seed, decks: [ST02_DECK, ST01_DECK] });
const keepBoth = s => reduce(reduce(s, { type: "MULLIGAN", seat: 0, redraw: false }),
                             { type: "MULLIGAN", seat: 1, redraw: false });
const mkChar = (s, code, over = {}) => ({ iid: "t" + Math.random().toString(36).slice(2, 7), code,
  rested: false, attachedDon: 0, mods: [], flags: {}, playedTurn: 0, usedOnce: {}, ...over });

test("ST02-001 Kid leader: pay 3 DON + trash 1 → leader set active (once per turn)", () => {
  let s = keepBoth(newGame(5));
  s.players[0].donActive = 4;
  s.players[0].leaderRested = true;
  s.players[0].hand = ["ST02-011", "ST02-012"];
  s = reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: "leader", trashHandIndex: 1 });
  assert.equal(s.players[0].leaderRested, false);
  assert.equal(s.players[0].donActive, 1);
  assert.equal(s.players[0].donRested, 3);
  assert.deepEqual(s.players[0].hand, ["ST02-011"]);
  assert.equal(s.players[0].trash.at(-1), "ST02-012");
  s.players[0].leaderRested = true; s.players[0].donActive = 4;
  assert.throws(() => reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: "leader", trashHandIndex: 0 }), /Already used/);
});

test("ST02-009 Law on-play sets a rested Supernova (cost<=5) active", () => {
  let s = keepBoth(newGame(5));
  s.players[0].chars.push(mkChar(s, "ST02-008", { rested: true })); // Apoo, Supernova c2
  s.players[0].chars.push(mkChar(s, "ST02-006", { rested: true })); // Koby, Navy c4 → NOT eligible
  s.players[0].hand = ["ST02-009"]; s.players[0].donActive = 5;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  assert.equal(s.pending?.kind, "CHOOSE");
  assert.equal(s.pending.options.length, 1); // only Apoo matches type filter
  const apoo = s.pending.options[0];
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [apoo] });
  assert.equal(s.players[0].chars.find(c => c.code === "ST02-008").rested, false);
});

test("ST02-005 Killer KOs only RESTED cost<=3 characters", () => {
  let s = keepBoth(newGame(5));
  s.players[1].chars.push(mkChar(s, "ST01-003", { rested: false })); // active → not targetable
  s.players[1].chars.push(mkChar(s, "ST01-002", { rested: true }));  // rested c2 → targetable
  s.players[0].hand = ["ST02-005"]; s.players[0].donActive = 3;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  assert.equal(s.pending?.kind, "CHOOSE");
  assert.equal(s.pending.options.length, 1);
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: s.pending.options });
  assert.equal(s.players[1].chars.length, 1);
  assert.equal(s.players[1].chars[0].code, "ST01-003");
});

test("ST02-008 Apoo when-attacking rests an opponent DON!!", () => {
  let s = keepBoth(newGame(5));
  s = reduce(s, { type: "END_TURN", seat: 0 }); // → P1 turn2
  s = reduce(s, { type: "END_TURN", seat: 1 }); // → P0 turn3
  s.players[0].chars.push(mkChar(s, "ST02-008", { attachedDon: 1, playedTurn: 1 }));
  s.players[1].donActive = 2; s.players[1].donRested = 0;
  s.players[1].hand = []; s.players[1].life = ["ST01-003"];
  const apoo = s.players[0].chars.at(-1).iid;
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 0, attackerId: apoo, targetId: "leader" });
  assert.equal(s.players[1].donActive, 1);
  assert.equal(s.players[1].donRested, 1);
});

test("ST02-014 X.Drake global aura: +1000 to Supernovas/Navy only while rested on your turn", () => {
  let s = keepBoth(newGame(5));
  const drake = mkChar(s, "ST02-014", { attachedDon: 1, rested: true });
  s.players[0].chars.push(drake);
  s.players[0].chars.push(mkChar(s, "ST02-012")); // Bepo: Heart Pirates/Minks → no aura
  // Kid leader is Supernova: 5000 + 1000 aura
  assert.equal(effPower(s, { seat: 0, id: "leader" }), 6000);
  assert.equal(effPower(s, { seat: 0, id: s.players[0].chars[1].iid }), 3000); // Bepo unaffected
  drake.rested = false; // condition drops
  assert.equal(effPower(s, { seat: 0, id: "leader" }), 5000);
  drake.rested = true;
  s = reduce(s, { type: "END_TURN", seat: 0 }); // not your turn anymore
  assert.equal(effPower(s, { seat: 0, id: "leader" }), 5000);
});

test("ST02-003 Urouge aura needs 3+ own characters", () => {
  let s = keepBoth(newGame(5));
  const u = mkChar(s, "ST02-003", { attachedDon: 1 });
  s.players[0].chars.push(u);
  assert.equal(effPower(s, { seat: 0, id: u.iid }), 3000 + 1000); // don bonus only (own turn)
  s.players[0].chars.push(mkChar(s, "ST02-011"), mkChar(s, "ST02-012"));
  assert.equal(effPower(s, { seat: 0, id: u.iid }), 3000 + 1000 + 2000);
});

test("ST02-013 Kid sets himself active at end of your turn (DON!!x1)", () => {
  let s = keepBoth(newGame(5));
  const kid = mkChar(s, "ST02-013", { attachedDon: 1, rested: true });
  s.players[0].chars.push(kid);
  s = reduce(s, { type: "END_TURN", seat: 0 });
  assert.equal(s.players[0].chars[0].rested, false);
});

test("ST02-015 Scalpel counter: +2000 then 1 DON set active; trigger sets 2 active", () => {
  let s = keepBoth(newGame(5));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  s.players[0].hand = ["ST02-015"]; s.players[0].donActive = 1; s.players[0].donRested = 2;
  s.players[0].life = ["ST01-003"];
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: "leader" });
  s = reduce(s, { type: "COUNTER_EVENT", seat: 0, handIndex: 0 }); // pays 1 DON
  assert.equal(s.pending?.kind, "CHOOSE");
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [{ seat: 0, id: "leader" }] });
  // after ops: powerMod applied; setDonActive returned 1 of the (2+1 paid) rested DON
  assert.equal(s.players[0].donActive, 1);
  assert.equal(s.pending?.kind, "COUNTER");
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.players[0].life.length, 1); // 5000 vs 7000 repelled
});

test("ST02-007 Bonney: pay 1 DON + rest self → search top 5 for a Supernova", () => {
  let s = keepBoth(newGame(5));
  const b = mkChar(s, "ST02-007");
  s.players[0].chars.push(b);
  s.players[0].donActive = 1;
  s.players[0].deck = ["ST02-012", "ST02-008", "ST02-011", "ST02-006", "ST02-012", "ST02-002"];
  s = reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: b.iid });
  assert.equal(s.pending?.kind, "CHOOSE");
  assert.equal(s.pending.options.length, 1); // only Apoo (ST02-008) is a Supernova in top 5
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: s.pending.options });
  assert.equal(s.players[0].hand.at(-1), "ST02-008");
  assert.equal(s.players[0].deck.length, 5); // 4 to bottom + ST02-002 untouched
  assert.deepEqual(s.players[0].deck, ["ST02-002", "ST02-012", "ST02-011", "ST02-006", "ST02-012"]);
  assert.equal(s.players[0].chars[0].rested, true);
  assert.equal(s.players[0].donRested, 1);
});

test("ST02-017 Straw Sword rests an active opposing character", () => {
  let s = keepBoth(newGame(5));
  s.players[1].chars.push(mkChar(s, "ST01-013"));
  s.players[0].hand = ["ST02-017"]; s.players[0].donActive = 2;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: s.pending.options });
  assert.equal(s.players[1].chars[0].rested, true);
});

test("ST02-010 Hawkins sets active after battling a character (once per turn)", () => {
  let s = keepBoth(newGame(5));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  s = reduce(s, { type: "END_TURN", seat: 1 });
  const h = mkChar(s, "ST02-010", { attachedDon: 1, playedTurn: 1 });
  s.players[0].chars.push(h);
  s.players[1].chars.push(mkChar(s, "ST01-007", { rested: true })); // Nami 1000, rested
  s.players[1].hand = [];
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 0, attackerId: h.iid, targetId: s.players[1].chars[0].iid });
  s = reduce(s, { type: "COUNTER_PASS", seat: 1 });
  assert.equal(s.players[1].chars.length, 0); // Nami KO'd
  assert.equal(s.players[0].chars[0].rested, false); // Hawkins back up
});

test("mirror + cross-deck AI games terminate with invariants (40 seeds)", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const decks = seed % 2 ? [ST02_DECK, ST01_DECK] : [ST02_DECK, ST02_DECK];
    const { finalState } = playout(initGame({ seed, decks }));
    assert.notEqual(finalState.winner, null, `seed ${seed} did not finish`);
    for (const p of finalState.players) {
      const total = p.donDeck + p.donActive + p.donRested + p.leaderDon
        + p.chars.reduce((a, c) => a + c.attachedDon, 0);
      assert.equal(total, 10, `seed ${seed}: DON conservation violated`);
    }
  }
});

test("replay compatibility: ST02 games re-simulate bit-perfect", () => {
  const start = initGame({ seed: 4242, decks: [ST02_DECK, ST01_DECK] });
  const { finalState, actions } = playout(start);
  let s = structuredClone(start);
  for (const a of actions) s = reduce(s, a);
  assert.deepEqual(s, finalState);
});
