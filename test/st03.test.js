import test from "node:test";
import assert from "node:assert/strict";
import { initGame, reduce } from "../src/engine/reducer.js";
import { ST01_DECK, ST02_DECK, ST03_DECK, script } from "../src/engine/cards.js";
import { playout } from "../src/ai/agent.js";

const keep = s => reduce(reduce(s, { type: "MULLIGAN", seat: 0, redraw: false }),
                         { type: "MULLIGAN", seat: 1, redraw: false });
const mk = (code, over = {}) => ({ iid: "z" + Math.random().toString(36).slice(2, 7), code,
  rested: false, attachedDon: 0, mods: [], flags: {}, playedTurn: 0, usedOnce: {}, ...over });

test("auto-generated bounce (ST03-014 Teach) returns an opposing character to hand", () => {
  assert.ok(script("ST03-014").generated, "ST03-014 script must come from auto-generation");
  let s = keep(initGame({ seed: 8, decks: [ST03_DECK, ST01_DECK] }));
  s.players[1].chars.push(mk("ST01-007")); // Nami c1
  s.players[0].hand = ["ST03-014"]; s.players[0].donActive = 4;
  const oppHand = s.players[1].hand.length;
  s = reduce(s, { type: "PLAY_CARD", seat: 0, handIndex: 0 });
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: s.pending.options.filter(o => o.seat === 1) });
  assert.equal(s.players[1].chars.length, 0);
  assert.equal(s.players[1].hand.length, oppHand + 1);
});

test("Crocodile leader: DON!! -4 cost returns DON to don deck, bounces cost<=5", () => {
  let s = keep(initGame({ seed: 8, decks: [ST03_DECK, ST01_DECK] }));
  s.players[0].donActive = 3; s.players[0].donRested = 2; s.players[0].donDeck = 5;
  s.players[1].chars.push(mk("ST01-013")); // Zoro c3
  s = reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: "leader" });
  s = reduce(s, { type: "CHOOSE", seat: 0, selection: s.pending.options.filter(o => o.seat === 1) });
  assert.equal(s.players[0].donDeck, 9);                       // 4 returned
  assert.equal(s.players[0].donActive + s.players[0].donRested, 1);
  assert.equal(s.players[1].chars.length, 0);
});

test("Sentomaru plays Pacifista from deck and shuffles deterministically", () => {
  let s = keep(initGame({ seed: 8, decks: [ST03_DECK, ST01_DECK] }));
  const sento = mk("ST03-007", { attachedDon: 1 });
  s.players[0].chars.push(sento);
  s.players[0].donActive = 2;
  const s1 = reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: sento.iid });
  const s2 = reduce(s, { type: "ACTIVATE_MAIN", seat: 0, sourceId: sento.iid });
  assert.equal(s1.players[0].chars.at(-1).code, "ST03-012");
  assert.deepEqual(s1.players[0].deck, s2.players[0].deck); // same rng state → same shuffle
});

test("ST03 AI games terminate + replay bit-exact (20 seeds, all 3 deck matchups)", () => {
  for (let seed = 300; seed < 320; seed++) {
    const decks = [[ST03_DECK, ST01_DECK], [ST03_DECK, ST02_DECK], [ST03_DECK, ST03_DECK]][seed % 3];
    const start = initGame({ seed, decks });
    const { finalState, actions } = playout(structuredClone(start));
    assert.notEqual(finalState.winner, null, `seed ${seed}`);
    let s = structuredClone(start);
    for (const a of actions) s = reduce(s, a);
    assert.deepEqual(s, finalState, `seed ${seed} replay`);
  }
});
