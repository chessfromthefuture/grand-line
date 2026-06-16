// Server-authoritative deterministic reducer.
// state' = reduce(state, action). Throws on illegal actions. No Math.random anywhere.
import { shuffle } from "./rng.js";
import { card, script, hasKeyword } from "./cards.js";
import { effPower, playCost, resolveRef, isRested, setRested, expireMods, attachedDonOf } from "./power.js";
import { runOps, resumeChoice, koCharacter, finalizeKO, makeChar, log, nameOf, payEffectCost, telemetryCard } from "./effects.js";

export function initGame({ seed, decks }) {
  let rng = seed | 0;
  const players = decks.map(d => {
    const [deck, r] = shuffle(d.cards, rng); rng = r;
    const life = card(d.leader).life;
    return {
      leaderCode: d.leader, leaderRested: false, leaderDon: 0, leaderMods: [], leaderFlags: {},
      chars: [], stage: null,
      deck: deck.slice(5 + life), hand: deck.slice(0, 5), life: deck.slice(5, 5 + life),
      trash: [],
      donDeck: 10, donActive: 0, donRested: 0,
      mulliganDecided: false, leaderUsedOnce: {},
    };
  });
  const state = { rng, turn: 0, active: 0, phase: "MULLIGAN", winner: null,
                  nextIid: 1, pending: null, battle: null, delayed: [], endingTurn: false,
                  log: [], players };
  log(state, "Game start — mulligan decisions");
  return state;
}

export function reduce(state0, action) {
  const state = structuredClone(state0);
  if (state.winner !== null && action.type !== "NOOP") throw new Error("Game over");
  const seat = action.seat;
  const p = () => state.players[seat];
  const opp = () => state.players[1 - seat];

  switch (action.type) {
    case "MULLIGAN": {
      need(state.phase === "MULLIGAN" && !p().mulliganDecided, "No mulligan now");
      if (action.redraw) {
        // return hand + life to deck, reshuffle, redraw 5, re-set life
        const lifeN = card(p().leaderCode).life;
        const all = [...p().hand, ...p().life, ...p().deck];
        const [deck, r] = shuffle(all, state.rng); state.rng = r;
        p().hand = deck.slice(0, 5);
        p().life = deck.slice(5, 5 + lifeN);
        p().deck = deck.slice(5 + lifeN);
        log(state, `P${seat} mulligans`);
      } else log(state, `P${seat} keeps their hand`);
      p().mulliganDecided = true;
      if (state.players.every(x => x.mulliganDecided)) beginTurn(state, 0);
      return state;
    }
    case "PLAY_CARD": {
      needMain(state, seat);
      const code = p().hand[action.handIndex];
      need(code, "No such card in hand");
      const c = card(code);
      const cost = playCost(state, seat, code); // honors static hand-cost discounts
      need(cost <= p().donActive, "Not enough active DON!!");
      if (c.category === "Character") {
        need(p().chars.length < 5, "Character area full");
        p().donActive -= cost; p().donRested += cost;
        p().hand.splice(action.handIndex, 1);
        const ch = makeChar(state, code);
        p().chars.push(ch);
        log(state, `P${seat} plays ${c.name}`);
        const s = script(code);
        if (s.onPlay && payEffectCost(state, seat, s.onPlay.cost)) runOps(state, s.onPlay.ops, { seat, sourceRef: { seat, id: ch.iid } });
      } else if (c.category === "Event") {
        const s = script(code);
        need(s.mainEvent, "This event has no [Main] timing");
        p().donActive -= cost; p().donRested += cost;
        p().hand.splice(action.handIndex, 1);
        p().trash.push(code);
        log(state, `P${seat} plays event ${c.name}`);
        if (payEffectCost(state, seat, s.mainEvent.cost)) runOps(state, s.mainEvent.ops, { seat, sourceRef: null, srcCode: code });
      } else if (c.category === "Stage") {
        p().donActive -= cost; p().donRested += cost;
        p().hand.splice(action.handIndex, 1);
        if (p().stage) p().trash.push(p().stage.code); // replace existing stage
        p().stage = { iid: "s" + (state.nextIid++), code, rested: false, usedOnce: {} };
        log(state, `P${seat} plays stage ${c.name}`);
      } else throw new Error("Cannot play this card type");
      return state;
    }
    case "ATTACH_DON": {
      needMain(state, seat);
      need(p().donActive >= 1, "No active DON!!");
      const r = resolveRef(state, { seat, id: action.targetId });
      need(r && (r.kind === "leader" || r.kind === "char"), "Bad DON!! target");
      p().donActive -= 1;
      if (r.kind === "leader") r.obj.leaderDon += 1; else r.obj.attachedDon += 1;
      log(state, `P${seat} attaches DON!! to ${nameOf(state, { seat, id: action.targetId })}`);
      return state;
    }
    case "ACTIVATE_MAIN": {
      needMain(state, seat);
      const ref = { seat, id: action.sourceId };
      const r = resolveRef(state, ref);
      need(r, "No such card");
      const s = script(r.code);
      need(s.activateMain, "No [Activate: Main] ability");
      const onceStore = r.kind === "leader" ? p().leaderUsedOnce : r.obj.usedOnce;
      if (s.activateMain.oncePerTurn) need(!onceStore.activateMain, "Already used this turn");
      const cost = s.activateMain.cost || {};
      if (cost.restSelf) {
        need(!isRested(state, ref) && !(r.kind === "stage" && r.obj.rested), "Already rested");
      }
      if (s.activateMain.requiresDon) need(attachedDonOf(state, ref) >= s.activateMain.requiresDon, "DON!! condition not met");
      if (cost.restDon) need(p().donActive >= cost.restDon, `Need ${cost.restDon} active DON!! to pay`);
      if (cost.returnDon) need(p().donActive + p().donRested >= cost.returnDon, `Need ${cost.returnDon} DON!! to return`);
      if (cost.trashFromHand) {
        need(Number.isInteger(action.trashHandIndex) && p().hand[action.trashHandIndex] != null,
             "Must choose a card from hand to trash");
      }
      // pay all costs atomically
      if (cost.restSelf) { if (r.kind === "stage") r.obj.rested = true; else setRested(state, ref, true); }
      if (cost.restDon) { p().donActive -= cost.restDon; p().donRested += cost.restDon; }
      if (cost.returnDon) { // DON!! -N: return from field to DON!! deck (active first)
        let n = cost.returnDon;
        const fromActive = Math.min(n, p().donActive); p().donActive -= fromActive; n -= fromActive;
        const fromRested = Math.min(n, p().donRested); p().donRested -= fromRested; n -= fromRested;
        p().donDeck += cost.returnDon;
        log(state, `P${seat} returns ${cost.returnDon} DON!! to the DON!! deck`);
      }
      if (cost.trashFromHand) {
        const trashed = p().hand.splice(action.trashHandIndex, 1)[0];
        p().trash.push(trashed);
        log(state, `P${seat} trashes ${card(trashed).name} from hand`);
      }
      onceStore.activateMain = true;
      log(state, `P${seat} activates ${card(r.code).name}`);
      runOps(state, s.activateMain.ops, { seat, sourceRef: ref });
      return state;
    }
    case "DECLARE_ATTACK": {
      needMain(state, seat);
      const aRef = { seat, id: action.attackerId };
      const a = resolveRef(state, aRef);
      need(a && (a.kind === "leader" || a.kind === "char"), "Bad attacker");
      need(!isRested(state, aRef), "Attacker is rested");
      if (a.kind === "char") {
        const rush = hasKeyword(a.code, "Rush", a.obj.attachedDon) || a.obj.flags.kwRush;
        need(a.obj.playedTurn < state.turn || rush, "Summoning sickness (no Rush)");
      }
      need(state.turn > 1 || state.active !== 0 || state.turn !== 1, "x"); // first turn attack allowed per rules? No:
      // Rule: the player going first cannot attack on turn 1 (no targets rested + leader attackable? Leaders CAN be attacked from turn 2 of the game).
      need(state.turn >= 2, "No attacks on the game's first turn");
      const tRef = { seat: 1 - seat, id: action.targetId };
      const t = resolveRef(state, tRef);
      need(t && (t.kind === "leader" || (t.kind === "char" && t.obj.rested)), "Target must be leader or rested character");
      setRested(state, aRef, true);
      state.battle = { attacker: aRef, target: tRef, flags: {}, step: "BLOCK",
                       targetWasChar: t.kind === "char" };
      log(state, `P${seat}: ${nameOf(state, aRef)} attacks ${nameOf(state, tRef)}`);
      // Diable Jambe-style flag on the attacker
      const aFlags = a.kind === "leader" ? p().leaderFlags : a.obj.flags;
      if (aFlags.noBlockWhenAttacking) state.battle.flags.noBlock = true;
      // [When Attacking] effects
      const s = script(a.code);
      if (s.whenAttacking && attachedDonOf(state, aRef) >= (s.whenAttacking.requiresDon || 0)
          && payEffectCost(state, seat, s.whenAttacking.cost)) {
        const done = runOps(state, s.whenAttacking.ops, { seat, sourceRef: aRef });
        if (!done) return state; // choice pending; block step comes after CHOOSE
      }
      // defender-side [On Your Opponent's Attack] timings (leader + characters)
      const dSeat = 1 - seat, d = state.players[dSeat];
      const oppAtkSources = [{ id: "leader", code: d.leaderCode, don: d.leaderDon },
        ...d.chars.map(c => ({ id: c.iid, code: c.code, don: c.attachedDon }))]
        .filter(x => { const sc = script(x.code);
          return sc.onOpponentAttack && x.don >= (sc.onOpponentAttack.requiresDon || 0); });
      for (const src of oppAtkSources) {
        const done = runOps(state, script(src.code).onOpponentAttack.ops,
          { seat: dSeat, sourceRef: { seat: dSeat, id: src.id } });
        if (!done) return state; // resumes via CHOOSE → advanceBattle (step is BLOCK)
      }
      advanceBattle(state);
      return state;
    }
    case "BLOCK": {
      needPending(state, "BLOCK", seat);
      state.pending = null;
      if (action.blockerId != null) {
        const bRef = { seat, id: action.blockerId };
        const b = resolveRef(state, bRef);
        need(b?.kind === "char" && !b.obj.rested && hasKeyword(b.code, "Blocker", b.obj.attachedDon), "Not a ready Blocker");
        need(!state.battle.flags.noBlock, "Blockers cannot be activated this battle");
        need(!(state.battle.flags.noBlock5000Plus && effPower(state, bRef) >= 5000), "5000+ Blockers are locked this battle");
        b.obj.rested = true;
        telemetryCard(b.code);
        state.battle.target = bRef;
        state.battle.targetWasChar = true; // blocker substitution = battling a character
        log(state, `${card(b.code).name} blocks!`);
        // [On Block] effects of the blocker
        const bs = script(b.code);
        if (bs.onBlock && b.obj.attachedDon >= (bs.onBlock.requiresDon || 0) && payEffectCost(state, seat, bs.onBlock.cost)) {
          const done = runOps(state, bs.onBlock.ops, { seat, sourceRef: bRef });
          if (!done) { state.battle.step = "COUNTER"; return state; } // CHOOSE → reopens COUNTER
        }
      }
      state.battle.step = "COUNTER";
      state.pending = { kind: "COUNTER", seat };
      return state;
    }
    case "COUNTER_PLAY": { // discard a counter-value card from hand → +power to battle target
      needPending(state, "COUNTER", seat);
      if (battleDangling(state)) { state.pending = null; finishBattle(state); return state; }
      const code = p().hand[action.handIndex];
      need(code, "No such card");
      const c = card(code);
      need(c.counter > 0, "Card has no counter value");
      p().hand.splice(action.handIndex, 1);
      p().trash.push(code);
      const t = resolveRef(state, state.battle.target);
      (t.kind === "leader" ? t.obj.leaderMods : t.obj.mods).push({ amount: c.counter, until: "battle" });
      log(state, `P${seat} counters with ${c.name} (+${c.counter})`);
      return state; // window stays open
    }
    case "COUNTER_EVENT": { // play an event with a [Counter] timing
      needPending(state, "COUNTER", seat);
      const code = p().hand[action.handIndex];
      need(code, "No such card");
      const s = script(code);
      need(s.counterEvent, "Not a [Counter] event");
      need(card(code).cost <= p().donActive, "Not enough active DON!!");
      p().donActive -= card(code).cost; p().donRested += card(code).cost;
      p().hand.splice(action.handIndex, 1);
      p().trash.push(code);
      log(state, `P${seat} plays [Counter] ${card(code).name}`);
      const done = payEffectCost(state, seat, s.counterEvent.cost)
        ? runOps(state, s.counterEvent.ops, { seat, sourceRef: null, srcCode: code }) : true;
      if (done) {
        if (battleDangling(state)) { state.pending = null; finishBattle(state); }
        else state.pending = { kind: "COUNTER", seat }; // reopen window
      } else state.pending.next = { kind: "COUNTER", seat };
      return state;
    }
    case "COUNTER_PASS": {
      needPending(state, "COUNTER", seat);
      state.pending = null;
      if (battleDangling(state)) { finishBattle(state); return state; }
      resolveDamage(state);
      return state;
    }
    case "TRIGGER": { // life card revealed with a trigger: use it or take to hand
      needPending(state, "TRIGGER", seat);
      const code = state.pending.card;
      state.pending = null;
      if (action.use) {
        const s = script(code);
        log(state, `P${seat} activates [Trigger] of ${card(code).name}`);
        const ctx = { seat, sourceRef: null, triggerCard: code, triggerConsumed: false };
        const done = runOps(state, s.trigger.ops, ctx);
        const isEvent = card(code).category === "Event";
        if (isEvent) p().trash.push(code);
        else if (!ctx.triggerConsumed) p().hand.push(code); // character trigger that couldn't deploy
        if (!done) return state;
      } else {
        p().hand.push(code);
        log(state, `P${seat} adds the life card to hand`);
      }
      // Double Attack: more damage may remain after this trigger resolves
      if (state.battle?.damageLeft > 0) dealLeaderDamage(state);
      else finishBattle(state);
      return state;
    }
    case "CHOOSE": {
      needPending(state, "CHOOSE", seat);
      const afterOrder = state.pending.afterOrder;
      const done = resumeChoice(state, action.selection);
      if (done && afterOrder && !state.pending) { // resume remaining ordered effects
        for (let k = 0; k < afterOrder.items.length; k++) {
          runOps(state, afterOrder.items[k].ops, afterOrder.items[k].ctx);
          if (state.pending) { state.pending.afterOrder = { items: afterOrder.items.slice(k + 1) }; return state; }
        }
      }
      if (done && !state.pending && state.endingTurn && !state.battle) { finishEndTurn(state); return state; }
      if (done && state.battle && !state.pending) {
        if (state.battle.step === "BLOCK") advanceBattle(state);
        else if (state.battle.step === "TRIGGER_DONE") finishBattle(state);
        else if (state.battle.step === "COUNTER") state.pending = { kind: "COUNTER", seat: state.battle.target.seat };
      }
      return state;
    }
    case "END_TURN": {
      needMain(state, seat);
      endTurn(state);
      return state;
    }
    case "REPLACE": { // player-choice KO replacement
      needPending(state, "REPLACE", seat);
      const pd = state.pending;
      const ref = pd.ref, cont = pd.cont, koRest = pd.koRemaining || [];
      state.pending = null;
      const r = resolveRef(state, ref);
      const s = r ? script(r.code) : null;
      if (action.use && r) {
        const cost = s.onWouldKO.cost || {};
        if (cost.trashFromHand) {
          need(Number.isInteger(action.trashHandIndex) && p().hand[action.trashHandIndex] != null,
               "Must pick a hand card to pay the replacement cost");
          const paid = p().hand.splice(action.trashHandIndex, 1)[0];
          p().trash.push(paid);
          log(state, `P${seat} pays ${card(paid).name} — ${card(r.code).name} avoids being K.O.'d!`);
        } else log(state, `${card(r.code).name} avoids being K.O.'d!`);
        r.obj.koPreventUsed = true;
        runOps(state, s.onWouldKO.ops, { seat, sourceRef: ref });
      } else if (r) finalizeKO(state, ref);
      // continue interrupted KO list, then interrupted op stream, then battle
      for (const t of koRest) { koCharacter(state, t); if (state.pending) return state; }
      if (cont && !state.pending) runOps(state, cont.remaining, cont.ctx);
      if (state.battle && !state.pending) {
        if (state.battle.damageLeft > 0) dealLeaderDamage(state); else finishBattle(state);
      }
      return state;
    }
    case "ORDER": { // active player orders simultaneous same-timing effects
      needPending(state, "ORDER", seat);
      const { items } = state.pending;
      need(Array.isArray(action.order) && action.order.length === items.length
        && [...action.order].sort().join() === items.map((_, i) => i).join(), "Invalid ordering");
      state.pending = null;
      for (const idx of action.order) {
        const it = items[idx];
        runOps(state, it.ops, it.ctx);
        if (state.pending) { // an ordered effect opened a window: requeue the rest
          state.pending.afterOrder = { items: action.order.slice(action.order.indexOf(idx) + 1).map(i => items[i]) };
          return state;
        }
      }
      finishEndTurn(state);
      return state;
    }
    case "CONCEDE": {
      state.winner = 1 - seat;
      log(state, `P${seat} concedes`);
      return state;
    }
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

// ---- internals -----------------------------------------------------------
function need(cond, msg) { if (!cond) throw new Error(msg); }
// a battle whose attacker or target left the field (bounce/bottom-deck mid-window)
function battleDangling(state) {
  const b = state.battle;
  if (!b) return true;
  return b.aborted || !resolveRef(state, b.attacker) || !resolveRef(state, b.target);
}
function needMain(state, seat) {
  need(state.phase === "MAIN" && state.active === seat && !state.pending && !state.battle, "Not your main phase");
}
function needPending(state, kind, seat) {
  need(state.pending?.kind === kind && state.pending.seat === seat, `No ${kind} window for you`);
}

function beginTurn(state, seatOverride) {
  state.turn += 1;
  if (seatOverride != null) state.active = seatOverride; else state.active = 1 - state.active;
  const p = state.players[state.active];
  // REFRESH: attached DON return active to cost area; unrest everything
  p.donActive += p.donRested + p.leaderDon; p.donRested = 0; p.leaderDon = 0;
  for (const c of p.chars) { p.donActive += c.attachedDon; c.attachedDon = 0; c.rested = false; }
  p.leaderRested = false;
  if (p.stage) p.stage.rested = false;
  expireMods(state, "turn");
  p.leaderUsedOnce = {}; for (const c of p.chars) c.usedOnce = {};
  if (p.stage) p.stage.usedOnce = {};
  // DRAW (skipped for the very first turn of the game)
  if (state.turn > 1) {
    if (p.deck.length === 0) { state.winner = 1 - state.active; log(state, "Deck out!"); return; }
    p.hand.push(p.deck.shift());
  }
  // DON: +2 (first player's first turn +1)
  const gain = state.turn === 1 ? 1 : 2;
  const real = Math.min(gain, p.donDeck);
  p.donDeck -= real; p.donActive += real;
  state.phase = "MAIN";
  log(state, `— Turn ${state.turn}, P${state.active} (+${real} DON!!) —`);
}

function endTurn(state) {
  state.endingTurn = true;
  // gather ALL same-timing end-of-turn effects; >1 → active player orders them (ORDER window)
  const p = state.players[state.active];
  const items = [];
  for (const c of p.chars) {
    const s = script(c.code);
    if (s.endOfYourTurn && c.attachedDon >= (s.endOfYourTurn.requiresDon || 0))
      items.push({ ops: s.endOfYourTurn.ops, ctx: { seat: state.active, sourceRef: { seat: state.active, id: c.iid } } });
  }
  const due = state.delayed.filter(d => d.at === "endOfTurn" || (d.at === "endOfYourTurn" && d.seat === state.active));
  state.delayed = state.delayed.filter(d => !due.includes(d));
  for (const d of due) items.push({ ops: d.ops, ctx: { seat: d.seat, sourceRef: null } });

  if (items.length > 1) {
    state.pending = { kind: "ORDER", seat: state.active, items };
    return; // resumes via ORDER action → finishEndTurn
  }
  if (items.length === 1) {
    const done = runOps(state, items[0].ops, items[0].ctx);
    if (!done || state.pending) return; // resumes via CHOOSE (endingTurn flag set)
  }
  finishEndTurn(state);
}
function finishEndTurn(state) {
  state.endingTurn = false;
  expireMods(state, "turn");
  beginTurn(state);
}

function advanceBattle(state) {
  // after declare + when-attacking: open block window if defender has usable blockers
  const b = state.battle;
  if (b.aborted) { finishBattle(state); return; }
  const dSeat = b.target.seat;
  const d = state.players[dSeat];
  const usable = d.chars.some(c => {
    if (c.rested || !hasKeyword(c.code, "Blocker", c.attachedDon)) return false;
    if (b.flags.noBlock) return false;
    if (b.flags.noBlock5000Plus && effPower(state, { seat: dSeat, id: c.iid }) >= 5000) return false;
    return true;
  });
  if (usable) { b.step = "BLOCK"; state.pending = { kind: "BLOCK", seat: dSeat }; }
  else { b.step = "COUNTER"; state.pending = { kind: "COUNTER", seat: dSeat }; }
}

function resolveDamage(state) {
  const b = state.battle;
  if (b.aborted) { finishBattle(state); return; }
  const atk = effPower(state, b.attacker);
  const def = effPower(state, b.target);
  const t = resolveRef(state, b.target);
  log(state, `Battle: ${atk} vs ${def}`);
  if (atk < def) { log(state, "Attack repelled"); finishBattle(state); return; }
  if (t.kind === "char") {
    const ts = script(t.code);
    const dp = state.players[b.target.seat];
    const donField = 10 - dp.donDeck;
    if (t.obj.flags.koImmuneTurn || t.obj.flags.kwKoImmuneTurn
        || (ts.koImmuneBattleIf && donField >= ts.koImmuneBattleIf.minOwnDonField)) {
      log(state, `${card(t.code).name} cannot be K.O.'d — attack resolved without K.O.`);
      finishBattle(state); return;
    }
    koCharacter(state, b.target);
    if (state.pending) { b.step = "TRIGGER_DONE"; return; } // On K.O. choice pending
    finishBattle(state); return;
  }
  // leader damage — [Double Attack] deals 2, [Banish] sends life to trash (no trigger)
  const a = resolveRef(state, b.attacker);
  const aDon = b.attacker.id === "leader" ? state.players[b.attacker.seat].leaderDon : a.obj.attachedDon;
  const aFlagsD = a.kind === "char" ? a.obj.flags : state.players[b.attacker.seat].leaderFlags;
  b.damageLeft = (hasKeyword(a.code, "Double Attack", aDon) || aFlagsD.kwDoubleAttack) ? 2 : 1;
  b.banish = hasKeyword(a.code, "Banish", aDon);
  dealLeaderDamage(state);
}

function dealLeaderDamage(state) {
  const b = state.battle;
  while (b.damageLeft > 0) {
    b.damageLeft--;
    const d = state.players[b.target.seat];
    if (d.life.length === 0) {
      state.winner = b.attacker.seat;
      log(state, `P${b.attacker.seat} wins the duel!`);
      return;
    }
    const lifeCard = d.life.shift();
    if (b.banish) {
      d.trash.push(lifeCard);
      log(state, `[Banish] P${b.target.seat}'s life card ${card(lifeCard).name} is trashed — no Trigger`);
      continue;
    }
    log(state, `P${b.target.seat} takes 1 damage — life card revealed: ${card(lifeCard).name}`);
    const s = script(lifeCard);
    if (s.trigger) {
      state.pending = { kind: "TRIGGER", seat: b.target.seat, card: lifeCard };
      b.step = "TRIGGER_DONE";
      return; // resumes via TRIGGER action → continueAfterTrigger
    }
    d.hand.push(lifeCard);
  }
  finishBattle(state);
}

function finishBattle(state) {
  const b = state.battle;
  // [Once Per Turn][Your Turn] after-battle-vs-character timings (e.g. ST02-010 Hawkins)
  if (b && b.targetWasChar && b.attacker.id !== "leader") {
    const a = resolveRef(state, b.attacker);
    if (a) {
      const s = script(a.code);
      if (s.afterBattleVsChar && !a.obj.usedOnce.afterBattleVsChar
          && a.obj.attachedDon >= (s.afterBattleVsChar.requiresDon || 0)
          && state.active === b.attacker.seat) {
        a.obj.usedOnce.afterBattleVsChar = true;
        runOps(state, s.afterBattleVsChar.ops, { seat: b.attacker.seat, sourceRef: b.attacker });
      }
    }
  }
  expireMods(state, "battle");
  state.battle = null;
  if (!state.pending) state.phase = "MAIN";
}

// ---- legal action enumeration (drives AI + UI affordances) ---------------
export function legalActions(state, seat) {
  const acts = [];
  if (state.winner !== null) return acts;
  const p = state.players[seat];
  if (state.phase === "MULLIGAN" && !p.mulliganDecided) {
    return [{ type: "MULLIGAN", seat, redraw: false }, { type: "MULLIGAN", seat, redraw: true }];
  }
  if (state.pending) {
    if (state.pending.seat !== seat) return acts;
    const pd = state.pending;
    if (pd.kind === "BLOCK") {
      acts.push({ type: "BLOCK", seat, blockerId: null });
      for (const c of p.chars) {
        if (!c.rested && hasKeyword(c.code, "Blocker", c.attachedDon)
            && !state.battle.flags.noBlock
            && !(state.battle.flags.noBlock5000Plus && effPower(state, { seat, id: c.iid }) >= 5000))
          acts.push({ type: "BLOCK", seat, blockerId: c.iid });
      }
    } else if (pd.kind === "COUNTER") {
      acts.push({ type: "COUNTER_PASS", seat });
      p.hand.forEach((code, i) => {
        if (card(code).counter > 0) acts.push({ type: "COUNTER_PLAY", seat, handIndex: i });
        if (script(code).counterEvent && card(code).cost <= p.donActive)
          acts.push({ type: "COUNTER_EVENT", seat, handIndex: i });
      });
    } else if (pd.kind === "TRIGGER") {
      acts.push({ type: "TRIGGER", seat, use: true }, { type: "TRIGGER", seat, use: false });
    } else if (pd.kind === "REPLACE") {
      const r = resolveRef(state, pd.ref);
      const cost = r ? (script(r.code).onWouldKO.cost || {}) : {};
      if (cost.trashFromHand) p.hand.forEach((_, i) =>
        acts.push({ type: "REPLACE", seat, use: true, trashHandIndex: i }));
      else acts.push({ type: "REPLACE", seat, use: true });
      acts.push({ type: "REPLACE", seat, use: false });
    } else if (pd.kind === "ORDER") {
      acts.push({ type: "ORDER", seat, order: pd.items.map((_, i) => i) });
    } else if (pd.kind === "CHOOSE") {
      if (pd.min === 0) acts.push({ type: "CHOOSE", seat, selection: [] });
      if (pd.max >= 1 && pd.min <= 1)
        for (const o of pd.options) acts.push({ type: "CHOOSE", seat, selection: [o] });
      // multi-target: offer the maximal legal selection too
      if (pd.max > 1 && pd.options.length >= pd.min)
        acts.push({ type: "CHOOSE", seat, selection: pd.options.slice(0, Math.min(pd.max, pd.options.length)) });
    }
    return acts;
  }
  if (state.phase !== "MAIN" || state.active !== seat || state.battle) return acts;
  acts.push({ type: "END_TURN", seat });
  p.hand.forEach((code, i) => {
    const c = card(code);
    if (c.cost == null || playCost(state, seat, code) > p.donActive) return;
    if (c.category === "Character" && p.chars.length < 5) acts.push({ type: "PLAY_CARD", seat, handIndex: i });
    if (c.category === "Event" && script(code).mainEvent) acts.push({ type: "PLAY_CARD", seat, handIndex: i });
    if (c.category === "Stage") acts.push({ type: "PLAY_CARD", seat, handIndex: i });
  });
  if (p.donActive >= 1) {
    acts.push({ type: "ATTACH_DON", seat, targetId: "leader" });
    for (const c of p.chars) acts.push({ type: "ATTACH_DON", seat, targetId: c.iid });
  }
  // activate-main abilities (cost-aware; trash-from-hand emits one action per hand card)
  const tryAct = (id, code, onceStore, restedNow) => {
    const s = script(code);
    if (!s.activateMain) return;
    if (s.activateMain.oncePerTurn && onceStore.activateMain) return;
    const cost = s.activateMain.cost || {};
    if (cost.restSelf && restedNow) return;
    if (cost.restDon && p.donActive < cost.restDon) return;
    if (cost.returnDon && p.donActive + p.donRested < cost.returnDon) return;
    if (s.activateMain.requiresDon) {
      const don = id === "leader" ? p.leaderDon : p.chars.find(c => c.iid === id)?.attachedDon || 0;
      if (don < s.activateMain.requiresDon) return;
    }
    if (cost.trashFromHand) {
      p.hand.forEach((_, i) => acts.push({ type: "ACTIVATE_MAIN", seat, sourceId: id, trashHandIndex: i }));
      return;
    }
    acts.push({ type: "ACTIVATE_MAIN", seat, sourceId: id });
  };
  tryAct("leader", p.leaderCode, p.leaderUsedOnce, p.leaderRested);
  for (const c of p.chars) tryAct(c.iid, c.code, c.usedOnce, c.rested);
  if (p.stage) tryAct("stage", p.stage.code, p.stage.usedOnce, p.stage.rested);
  // attacks
  if (state.turn >= 2) {
    const attackers = [];
    if (!p.leaderRested) attackers.push("leader");
    for (const c of p.chars)
      if (!c.rested && (c.playedTurn < state.turn || hasKeyword(c.code, "Rush", c.attachedDon) || c.flags.kwRush))
        attackers.push(c.iid);
    const o = state.players[1 - seat];
    for (const a of attackers) {
      acts.push({ type: "DECLARE_ATTACK", seat, attackerId: a, targetId: "leader" });
      for (const oc of o.chars) if (oc.rested)
        acts.push({ type: "DECLARE_ATTACK", seat, attackerId: a, targetId: oc.iid });
    }
  }
  return acts;
}
