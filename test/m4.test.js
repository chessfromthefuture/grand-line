// M4 final-engine tests: REPLACE windows, onOpponentAttack, ORDER queue,
// returnToHand, escape hatch. Fixtures registered test-process-only.
import test from "node:test";
import assert from "node:assert/strict";
import { initGame, reduce, legalActions } from "../src/engine/reducer.js";
import { ST01_DECK, ST02_DECK, registerSet } from "../src/engine/cards.js";
import { registerCustom } from "../src/engine/effects.js";
import { playout } from "../src/ai/agent.js";

const F = (code, over) => ({ code, name: code, category: "Character", colors: ["Red"], cost: 3,
  power: 5000, counter: 0, life: null, attribute: "Strike", types: ["Test"], rarity: "C",
  set: "TEST", text: "fixture", triggerText: null, image: null, i18n: {}, ...over });

registerSet([
  F("TST-RP"), // choice replacement w/ hand cost
  F("TST-OA", { power: 1000 }), // defender: on opponent attack +2000 to itself this turn
  F("TST-E1"), F("TST-E2"), // two end-of-turn effects → ORDER window
  F("TST-RH", { category: "Event", cost: 1, power: null }), // return to hand
  F("TST-CU", { category: "Event", cost: 1, power: null }), // custom escape hatch
], {
  "TST-RP": { onWouldKO: { choice: true, cost: { trashFromHand: 1 }, ops: [] } },
  "TST-OA": { onOpponentAttack: { ops: [{ op: "powerMod", amount: 2000, duration: "turn", upTo: true,
      target: { owner: "self", zone: "chars", count: 1 } }] } },
  "TST-E1": { endOfYourTurn: { ops: [{ op: "draw", count: 1 }] } },
  "TST-E2": { endOfYourTurn: { ops: [{ op: "setDonActive", count: 1 }] } },
  "TST-RH": { mainEvent: { ops: [{ op: "returnToHand", upTo: true,
      target: { owner: "opp", zone: "chars", count: 1 } }] } },
  "TST-CU": { mainEvent: { ops: [{ op: "custom", fn: "testMill", args: { n: 2 } }] } },
});
registerCustom("testMill", (state, ctx, args) => { // deterministic, reviewed escape hatch
  const p = state.players[ctx.seat];
  for (let i = 0; i < args.n && p.deck.length; i++) p.trash.push(p.deck.shift());
});

const mkChar = (code, over = {}) => ({ iid: "y" + Math.random().toString(36).slice(2, 7), code,
  rested: false, attachedDon: 0, mods: [], flags: {}, playedTurn: 0, usedOnce: {}, ...over });
const setup = (seed = 17) => {
  let s = initGame({ seed, decks: [ST01_DECK, ST01_DECK] });
  s = reduce(s, { type: "MULLIGAN", seat: 0, redraw: false });
  s = reduce(s, { type: "MULLIGAN", seat: 1, redraw: false });
  return reduce(s, { type: "END_TURN", seat: 0 });
};

test("REPLACE window: pay hand card to survive, or decline and die", () => {
  let s = setup();
  s.players[0].chars.push(mkChar("TST-RP", { rested: true }));
  s.players[0].hand = ["ST01-003", "ST01-004"];
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: s.players[0].chars[0].iid });
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.pending?.kind, "REPLACE");
  const acts = legalActions(s, 0);
  assert.ok(acts.some(a => a.type === "REPLACE" && a.use && a.trashHandIndex === 0));
  const sPay = reduce(s, { type: "REPLACE", seat: 0, use: true, trashHandIndex: 1 });
  assert.equal(sPay.players[0].chars.length, 1);          // survived
  assert.deepEqual(sPay.players[0].hand, ["ST01-003"]);   // paid Sanji
  assert.equal(sPay.battle, null);                        // battle finished cleanly
  const sNo = reduce(s, { type: "REPLACE", seat: 0, use: false });
  assert.equal(sNo.players[0].chars.length, 0);           // declined → KO
});

test("onOpponentAttack fires for the defender before the block step", () => {
  let s = setup();
  s.players[0].chars.push(mkChar("TST-OA", { rested: true }));
  s.players[0].hand = [];
  const oa = s.players[0].chars[0].iid;
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: oa });
  // defender effect needs its CHOOSE first (target = itself)
  assert.equal(s.pending?.kind, "CHOOSE");
  assert.equal(s.pending.seat, 0);
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [{ seat: 0, id: oa }] });
  assert.equal(s.pending?.kind, "COUNTER");
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  // window fired (asserted above); 3000 < 5000 so the KO itself still resolves
  assert.equal(s.players[0].chars.length, 0);
});

test("onOpponentAttack boost can save the defender when it flips the math", () => {
  let s = setup();
  s.players[0].chars.push(mkChar("TST-OA", { rested: true, mods: [{ amount: 2500, until: "turn" }] }));
  s.players[0].hand = [];
  const oa = s.players[0].chars[0].iid;
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: oa });
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [{ seat: 0, id: oa }] });
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.players[0].chars.length, 1); // 1000+2500+2000 = 5500 > 5000 → survives
});

test("ORDER window sequences multiple end-of-turn effects deterministically", () => {
  let s = setup();
  s = reduce(s, { type: "END_TURN", seat: 1 }); // P0's turn
  s.players[0].chars.push(mkChar("TST-E1"), mkChar("TST-E2"));
  s.players[0].donRested = 1;
  const hand = s.players[0].hand.length;
  s = reduce(s, { type: "END_TURN", seat: 0 });
  assert.equal(s.pending?.kind, "ORDER");
  assert.equal(s.pending.items.length, 2);
  s = reduce(s, { type: "ORDER", seat: 0, order: [1, 0] });
  assert.equal(s.players[0].hand.length, hand + 1); // E1 drew
  assert.equal(s.turn, 4);                          // turn advanced after ordering
  assert.equal(s.pending, null);
});

test("returnToHand bounces a character and returns its DON rested", () => {
  let s = setup();
  s = reduce(s, { type: "END_TURN", seat: 1 });
  s.players[1].chars.push(mkChar("ST01-013", { attachedDon: 2 }));
  s.players[1].donRested = 0;
  const oppHand = s.players[1].hand.length;
  s.players[0].hand = ["TST-RH"]; s.players[0].donActive = 1;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: s.pending.options });
  assert.equal(s.players[1].chars.length, 0);
  assert.equal(s.players[1].hand.length, oppHand + 1);
  assert.equal(s.players[1].donRested, 2);
});

test("escape hatch: registered custom fn runs deterministically through the DSL", () => {
  let s = setup();
  s = reduce(s, { type: "END_TURN", seat: 1 });
  s.players[0].hand = ["TST-CU"]; s.players[0].donActive = 1;
  const top2 = s.players[0].deck.slice(0, 2);
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  assert.deepEqual(s.players[0].trash.slice(-2), top2); // event lands in trash first, then mills 2
});

test("replay + regression: engine still bit-exact after M4", () => {
  const start = initGame({ seed: 60606, decks: [ST01_DECK, ST02_DECK] });
  const a = playout(structuredClone(start));
  assert.notEqual(a.finalState.winner, null);
  let s = structuredClone(start);
  for (const act of a.actions) s = reduce(s, act);
  assert.deepEqual(s, a.finalState);
});
