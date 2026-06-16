import test from "node:test";
import assert from "node:assert/strict";
import { initGame, reduce, legalActions } from "../src/engine/reducer.js";
import { ST01_DECK, importOptcgsimDeck, exportOptcgsimDeck, card } from "../src/engine/cards.js";
import { effPower } from "../src/engine/power.js";
import { playout, whoseMove } from "../src/ai/agent.js";

const newGame = (seed = 42) => initGame({ seed, decks: [ST01_DECK, ST01_DECK] });
const keepBoth = s => reduce(reduce(s, { type: "MULLIGAN", seat: 0, redraw: false }),
                             { type: "MULLIGAN", seat: 1, redraw: false });

test("setup: 5-card hands, 5 life, 40-card decks, deterministic shuffle", () => {
  const s = newGame(7);
  for (const p of s.players) {
    assert.equal(p.hand.length, 5);
    assert.equal(p.life.length, 5);
    assert.equal(p.deck.length, 40);
  }
  const s2 = newGame(7);
  assert.deepEqual(s.players[0].deck, s2.players[0].deck); // same seed = same shuffle
  const s3 = newGame(8);
  assert.notDeepEqual(s.players[0].deck, s3.players[0].deck);
});

test("mulligan reshuffles hand and life", () => {
  const s = newGame(7);
  const before = [...s.players[0].hand];
  const s1 = reduce(s, { type: "MULLIGAN", seat: 0, redraw: true });
  assert.equal(s1.players[0].hand.length, 5);
  assert.equal(s1.players[0].life.length, 5);
  assert.notDeepEqual(s1.players[0].hand, before);
});

test("turn 1: first player gets 1 DON and no draw; no attacks allowed", () => {
  const s = keepBoth(newGame(1));
  assert.equal(s.turn, 1);
  assert.equal(s.players[0].donActive, 1);
  assert.equal(s.players[0].hand.length, 5);
  const attacks = legalActions(s, 0).filter(a => a.type === "DECLARE_ATTACK");
  assert.equal(attacks.length, 0);
});

test("turn 2: draw + 2 DON; leader can attack opposing leader", () => {
  let s = keepBoth(newGame(1));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  assert.equal(s.turn, 2);
  assert.equal(s.players[1].donActive, 2);
  assert.equal(s.players[1].hand.length, 6);
  const atk = legalActions(s, 1).find(a => a.type === "DECLARE_ATTACK" && a.targetId === "leader");
  assert.ok(atk);
});

test("playing a character pays DON and respects 5-slot limit", () => {
  let s = keepBoth(newGame(3));
  // force a known hand
  s.players[0].hand = ["ST01-003", "ST01-003", "ST01-003", "ST01-003", "ST01-003"];
  s.players[0].donActive = 5;
  for (let i = 0; i < 5; i++) s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  assert.equal(s.players[0].chars.length, 5);
  assert.equal(s.players[0].donActive, 0);
  assert.equal(s.players[0].donRested, 5);
  s.players[0].hand = ["ST01-003"]; s.players[0].donActive = 1;
  assert.throws(() => reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 }), /full/);
});

test("DON attachment adds +1000 on own turn only; Zoro DON!!x1 aura is permanent", () => {
  let s = keepBoth(newGame(3));
  s.players[0].hand = ["ST01-013"]; s.players[0].donActive = 4;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  const iid = s.players[0].chars[0].iid;
  s = reduce(s, { type: "ATTACH_DON", seat: 0, targetId: iid });
  // own turn: 5000 base + 1000 don + 1000 aura
  assert.equal(effPower(s, { seat: 0, id: iid }), 7000);
  s = reduce(s, { type: "END_TURN", seat: 0 });
  // opponent's turn: don bonus gone, aura (DON!!x1 condition still met) stays
  assert.equal(effPower(s, { seat: 0, id: iid }), 6000);
});

test("refresh returns attached DON to cost area as active", () => {
  let s = keepBoth(newGame(3));
  s.players[0].hand = ["ST01-013"]; s.players[0].donActive = 4;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  const iid = s.players[0].chars[0].iid;
  s = reduce(s, { type: "ATTACH_DON", seat: 0, targetId: iid });
  s = reduce(s, { type: "END_TURN", seat: 0 });   // to P1
  s = reduce(s, { type: "END_TURN", seat: 1 });   // back to P0 → refresh
  assert.equal(s.players[0].chars[0].attachedDon, 0);
  assert.equal(s.players[0].donActive, 3 + 2 + 1); // 3 left + 1 returned + 2 new... (4-1 spent? see math below)
});

test("leader battle: damage reveals life; non-trigger card goes to hand", () => {
  let s = keepBoth(newGame(3));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  // make P1 leader hit guaranteed & deterministic: P0 has no blockers/counters in hand
  s.players[0].hand = [];
  s.players[0].life = ["ST01-003"]; // Karoo: no trigger
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: "leader" });
  assert.equal(s.pending?.kind, "COUNTER");
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.players[0].life.length, 0);
  assert.equal(s.players[0].hand.length, 1);
  assert.equal(s.battle, null);
});

test("lethal: attack on leader with 0 life wins the game", () => {
  let s = keepBoth(newGame(3));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  s.players[0].hand = []; s.players[0].life = [];
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: "leader" });
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.winner, 1);
});

test("counter card flips battle result", () => {
  let s = keepBoth(newGame(3));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  s.players[0].hand = ["ST01-011"]; // Brook: counter 2000
  s.players[0].life = ["ST01-003"];
  // 5000 vs 5000 would hit; +2000 counter → 5000 vs 7000 repelled
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: "leader" });
  s = reduce(s, { type: "COUNTER_PLAY", seat: 0, handIndex: 0 });
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.players[0].life.length, 1); // no damage
  assert.equal(s.players[0].trash.length, 1); // Brook discarded
});

test("Guard Point [Counter] event grants +3000 for the battle only", () => {
  let s = keepBoth(newGame(3));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  s.players[0].hand = ["ST01-014"]; s.players[0].donActive = 1;
  s.players[0].life = ["ST01-003"];
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: "leader" });
  s = reduce(s, { type: "COUNTER_EVENT", seat: 0, handIndex: 0 });
  // choice: up to 1 of your leader/chars gets +3000 → pick own leader
  assert.equal(s.pending?.kind, "CHOOSE");
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [{ seat: 0, id: "leader" }] });
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.players[0].life.length, 1);          // repelled
  assert.equal(effPower(s, { seat: 0, id: "leader" }), 5000); // battle mod expired
});

test("Blocker redirects the attack and gets KO'd by bigger power", () => {
  let s = keepBoth(newGame(3));
  s.players[0].hand = ["ST01-006"]; s.players[0].donActive = 1;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 }); // Chopper blocker
  s = reduce(s, { type: "END_TURN", seat: 0 });
  s.players[0].hand = []; // no counters
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: "leader", targetId: "leader" });
  assert.equal(s.pending?.kind, "BLOCK");
  const chopper = s.players[0].chars[0].iid;
  s = reduce(s, { type: "BLOCK", seat: 0, blockerId: chopper });
  s = reduce(s, { type: "COUNTER_PASS", seat: 0 });
  assert.equal(s.players[0].chars.length, 0);   // Chopper KO'd
  assert.equal(s.players[0].life.length, 5);    // leader untouched
  assert.equal(s.players[0].trash.at(-1), "ST01-006");
});

test("ST01-012 Luffy: Rush + DON!!x2 noBlock flag", () => {
  let s = keepBoth(newGame(3));
  s = reduce(s, { type: "END_TURN", seat: 0 });
  // give P1 the pieces
  s.players[1].hand = ["ST01-012"]; s.players[1].donActive = 7;
  s.players[0].hand = ["ST01-006"]; s.players[0].donActive = 1;
  // P0 needs a blocker on board: simulate prior play
  s.players[0].chars.push({ iid: "cB", code: "ST01-006", rested: false, attachedDon: 0, mods: [], flags: {}, playedTurn: 1, usedOnce: {} });
  s = reduce(s, { type: "PLAY_CARD", seat: 1, handIndex: 0 });
  const luffy = s.players[1].chars[0].iid;
  s = reduce(s, { type: "ATTACH_DON", seat: 1, targetId: luffy });
  s = reduce(s, { type: "ATTACH_DON", seat: 1, targetId: luffy });
  s.players[0].life = ["ST01-003"]; s.players[0].hand = [];
  s = reduce(s, { type: "DECLARE_ATTACK", seat: 1, attackerId: luffy, targetId: "leader" });
  // Rush let it attack; noBlock flag means NO block window → straight to counter
  assert.equal(s.pending?.kind, "COUNTER");
  assert.equal(s.battle.flags.noBlock, true);
});

test("Jet Pistol KOs a 6000-or-less character via CHOOSE", () => {
  let s = keepBoth(newGame(3));
  s.players[1].chars.push({ iid: "cT", code: "ST01-010", rested: true, attachedDon: 0, mods: [], flags: {}, playedTurn: 0, usedOnce: {} }); // Franky 6000
  s.players[0].hand = ["ST01-015"]; s.players[0].donActive = 4;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  assert.equal(s.pending?.kind, "CHOOSE");
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [{ seat: 1, id: "cT" }] });
  assert.equal(s.players[1].chars.length, 0);
  assert.equal(s.players[1].trash.at(-1), "ST01-010");
});

test("leader Activate:Main gives a rested DON (once per turn)", () => {
  let s = keepBoth(newGame(3));
  s.players[0].donActive = 1; s.players[0].donRested = 2;
  s = reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: "leader" });
  assert.equal(s.pending?.kind, "CHOOSE");
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: [{ seat: 0, id: "leader" }] });
  assert.equal(s.players[0].leaderDon, 1);
  assert.equal(s.players[0].donRested, 1);
  assert.throws(() => reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: "leader" }), /Already used/);
});

test("deck import/export roundtrip (OPTCGSim format)", () => {
  const txt = exportOptcgsimDeck(ST01_DECK);
  const d = importOptcgsimDeck("My Deck Name\n" + txt);
  assert.equal(d.leader, "ST01-001");
  assert.equal(d.cards.length, 50);
});

test("full AI vs AI game completes with a winner", () => {
  const { finalState, actions } = playout(newGame(99));
  assert.notEqual(finalState.winner, null);
  assert.ok(actions.length > 20);
});

test("REPLAY: re-running the action log reproduces the exact final state", () => {
  const start = newGame(1234);
  const { finalState, actions } = playout(start);
  let s = structuredClone(start);
  for (const a of actions) s = reduce(s, a);
  assert.deepEqual(s, finalState);
});

test("determinism: same seed + same policy = identical games", () => {
  const a = playout(newGame(777));
  const b = playout(newGame(777));
  assert.deepEqual(a.actions, b.actions);
  assert.deepEqual(a.finalState, b.finalState);
});

test("100 random-seed AI games all terminate legally", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const { finalState } = playout(newGame(seed));
    assert.notEqual(finalState.winner, null, `seed ${seed} did not finish`);
    // invariants
    for (const p of finalState.players) {
      const total = p.donDeck + p.donActive + p.donRested + p.leaderDon
        + p.chars.reduce((a, c) => a + c.attachedDon, 0);
      assert.equal(total, 10, `seed ${seed}: DON conservation violated`);
      assert.ok(p.chars.length <= 5);
    }
  }
});
