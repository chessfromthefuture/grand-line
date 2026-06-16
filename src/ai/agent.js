// Phase-1 AI: rule-valid greedy agent. Picks from legalActions only → can never cheat.
// Heuristics: curve out > attach DON to attacker > use abilities > profitable attacks.
import { legalActions, reduce } from "../engine/reducer.js";
import { card } from "../engine/cards.js";
import { effPower } from "../engine/power.js";

export function chooseAction(state, seat) {
  const acts = legalActions(state, seat);
  if (acts.length === 0) return null;

  const byType = t => acts.filter(a => a.type === t);
  const p = state.players[seat];

  // mulligan: keep hands with >=2 playable early cards (cost<=3)
  const mull = byType("MULLIGAN");
  if (mull.length) {
    const early = p.hand.filter(c => (card(c).cost ?? 9) <= 3).length;
    return mull.find(a => a.redraw === (early < 2));
  }
  // trigger: always use
  const trig = byType("TRIGGER");
  if (trig.length) return trig.find(a => a.use);
  // choices: take the option that maximizes own power / removes biggest threat
  const choose = byType("CHOOSE");
  if (choose.length) {
    const withSel = choose.filter(a => a.selection.length > 0);
    return withSel[withSel.length - 1] || choose[0];
  }
  // block: block only if the blocker survives or the leader is at <=2 life
  const blocks = byType("BLOCK");
  if (blocks.length) {
    const atk = effPower(state, state.battle.attacker);
    const danger = p.life.length <= 2 && state.battle.target.id === "leader";
    for (const b of blocks) {
      if (b.blockerId == null) continue;
      const bp = effPower(state, { seat, id: b.blockerId });
      if (bp > atk || danger) return b;
    }
    return blocks.find(b => b.blockerId == null);
  }
  // counter: spend the cheapest sufficient counter only when it flips the result and life <= 3
  const counters = byType("COUNTER_PLAY").concat(byType("COUNTER_EVENT"));
  if (byType("COUNTER_PASS").length) {
    const b = state.battle;
    const atk = effPower(state, b.attacker), def = effPower(state, b.target);
    const deficit = atk - def;
    if (deficit >= 0 && p.life.length <= 3 && b.target.id === "leader") {
      const plays = byType("COUNTER_PLAY")
        .map(a => ({ a, v: card(p.hand[a.handIndex]).counter }))
        .filter(x => x.v > deficit)
        .sort((x, y) => x.v - y.v);
      if (plays[0]) return plays[0].a;
    }
    return byType("COUNTER_PASS")[0];
  }
  // main phase priority:
  // 1) activate free abilities (leader DON ramp, Nami, Sunny)
  const act = byType("ACTIVATE_MAIN");
  if (act.length && p.donRested > 0) return act[0];
  // 2) play the biggest affordable character
  const plays = byType("PLAY_CARD")
    .map(a => ({ a, c: card(p.hand[a.handIndex]) }))
    .sort((x, y) => (y.c.cost ?? 0) - (x.c.cost ?? 0));
  const charPlay = plays.find(x => x.c.category === "Character");
  if (charPlay) return charPlay.a;
  // 3) removal event if opponent has a board
  const evPlay = plays.find(x => x.c.category === "Event");
  if (evPlay && state.players[1 - seat].chars.length > 0) return evPlay.a;
  // 4) attacks: any attack we win on power; prefer KO of rested chars, then leader
  const attacks = byType("DECLARE_ATTACK").map(a => {
    const atk = effPower(state, { seat, id: a.attackerId });
    const def = effPower(state, { seat: 1 - seat, id: a.targetId });
    return { a, atk, def, isChar: a.targetId !== "leader" };
  }).filter(x => x.atk >= x.def);
  attacks.sort((x, y) => (y.isChar - x.isChar) || (y.def - x.def));
  if (attacks[0]) return attacks[0].a;
  // 5) attach leftover DON to the leader for next turn pressure
  const att = byType("ATTACH_DON").find(a => a.targetId === "leader");
  if (att && p.donActive > 0 && !attacks.length) {
    // only dump DON if nothing else productive remains
    const productive = plays.length > 0;
    if (!productive) return att;
  }
  return byType("END_TURN")[0] || acts[0];
}

// Drive a full AI-vs-AI game. Returns {finalState, actions} — `actions` IS the replay.
export function playout(state, maxSteps = 4000) {
  const actions = [];
  let s = state, guard = 0;
  while (s.winner === null && guard++ < maxSteps) {
    const seat = whoseMove(s);
    if (seat == null) break;
    const a = chooseAction(s, seat);
    if (!a) break;
    s = reduce(s, a);
    actions.push(a);
  }
  return { finalState: s, actions };
}
export function whoseMove(state) {
  if (state.winner !== null) return null;
  if (state.phase === "MULLIGAN") {
    const i = state.players.findIndex(p => !p.mulliganDecided);
    return i === -1 ? null : i;
  }
  if (state.pending) return state.pending.seat;
  return state.active;
}
