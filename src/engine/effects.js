// Effect DSL interpreter. Ops execute sequentially; when an op needs the player to
// choose targets, execution suspends into state.pending = {kind:'CHOOSE', ...} and
// resumes via the CHOOSE action (resumeChoice).
import { card, script, hasKeyword } from "./cards.js";
import { shuffle } from "./rng.js";
import { resolveRef, effPower, effCost, addMod, attachedDonOf } from "./power.js";

export function log(state, msg) { state.log.push({ t: state.turn, msg }); }
// execution telemetry for confidence auditing (scripts/fuzz.js consumes this)
export const TELEMETRY = { ops: {}, cards: new Set() };
export function telemetryCard(code) { TELEMETRY.cards.add(code); }

// ---- target queries ----------------------------------------------------
export function queryTargets(state, spec, ctx) {
  const seats = spec.owner === "any" ? [ctx.seat, 1 - ctx.seat]
    : [spec.owner === "opp" ? 1 - ctx.seat : ctx.seat];
  const out = [];
  for (const seat of seats) {
  const p = state.players[seat];
  const consider = (ref, code, attached) => {
    const c = card(code);
    if (spec.maxPower != null && effPower(state, ref) > spec.maxPower) return;
    if (spec.maxCost != null && (ref.id === "leader" ? (c.cost || 0) : effCost(state, ref)) > spec.maxCost) return;
    if (spec.hasType && !c.types.includes(spec.hasType)) return;
    if (spec.hasTypeAny && !spec.hasTypeAny.some(t => c.types.includes(t))) return;
    if (spec.hasKeyword && !hasKeyword(code, spec.hasKeyword, attached)) return;
    if (spec.restedOnly && !refRested(state, ref)) return;
    if (spec.activeOnly && refRested(state, ref)) return;
    if (spec.excludeSource && ctx.sourceRef && ref.seat === ctx.sourceRef.seat && ref.id === ctx.sourceRef.id) return;
    out.push(ref);
  };
  if (spec.zone === "leaderOrChar" || spec.zone === "leader")
    consider({ seat, id: "leader" }, p.leaderCode, p.leaderDon);
  if (spec.zone === "leaderOrChar" || spec.zone === "chars")
    for (const ch of p.chars) consider({ seat, id: ch.iid }, ch.code, ch.attachedDon);
  }
  return out;
}

// ---- op execution -------------------------------------------------------
// Runs ops from index i. Returns true if finished, false if suspended on a choice.
function refRested(state, ref) {
  const r = resolveRef(state, ref);
  return r ? (r.kind === "leader" ? r.obj.leaderRested : r.obj.rested) : false;
}

// optional effect-level cost ("DON!! -N: ..."): pay if affordable, else skip the ops.
export function payEffectCost(state, seat, cost) {
  if (!cost) return true;
  const p = state.players[seat];
  if (cost.returnDon) {
    if (p.donActive + p.donRested < cost.returnDon) return false;
    let n = cost.returnDon;
    const a = Math.min(n, p.donActive); p.donActive -= a; n -= a;
    p.donRested -= n;
    p.donDeck += cost.returnDon;
    log(state, `P${seat} returns ${cost.returnDon} DON!! to the DON!! deck`);
  }
  if (cost.trashFromHand) { // forced-cheapest deterministic default when paid by engine flow
    if (p.hand.length < cost.trashFromHand) return false;
    for (let n = 0; n < cost.trashFromHand; n++) p.trash.push(p.hand.shift());
    log(state, `P${seat} trashes ${cost.trashFromHand} from hand (cost)`);
  }
  return true;
}

export function runOps(state, ops, ctx, i = 0) {
  for (; i < ops.length; i++) {
    const op = ops[i];
    if (op.op === "searchTop") { // deck-search needs its own option shape
      const p = state.players[ctx.seat];
      const top = p.deck.slice(0, op.count);
      const matches = top.map((code, idx) => ({ code, idx }))
        .filter(x => !op.match?.hasType || card(x.code).types.includes(op.match.hasType));
      log(state, `P${ctx.seat} looks at the top ${top.length} cards of their deck`);
      const takeMax = op.take?.upTo ?? 1;
      if (matches.length === 0 || takeMax === 0) { searchFinish(state, ctx.seat, op, []); continue; }
      state.pending = { kind: "CHOOSE", seat: ctx.seat, op,
        options: matches.map(m => ({ seat: ctx.seat, id: `deck:${m.idx}` })),
        min: 0, max: op.take?.upTo ?? 1, remaining: ops.slice(i + 1), ctx };
      return false;
    }
    if (op.op === "trashToHand") { // options drawn from own trash → hand
      const p = state.players[ctx.seat];
      const opts = p.trash.map((code, idx) => ({ code, idx })).filter(x => {
        const c = card(x.code);
        if (op.maxCost != null && (c.cost || 0) > op.maxCost) return false;
        if (op.hasType && !c.types.includes(op.hasType)) return false;
        if (op.category && c.category !== op.category) return false;
        return true;
      });
      if (opts.length === 0) continue;
      state.pending = { kind: "CHOOSE", seat: ctx.seat, op,
        options: opts.map(o => ({ seat: ctx.seat, id: `trash:${o.idx}` })),
        min: op.upTo ? 0 : Math.min(1, opts.length), max: op.count ?? 1,
        remaining: ops.slice(i + 1), ctx };
      return false;
    }
    if (op.op === "playFromTrash") { // options drawn from own trash
      const p = state.players[ctx.seat];
      const opts = p.trash.map((code, idx) => ({ code, idx })).filter(x => {
        const c = card(x.code);
        if (c.category !== "Character") return false;
        if (op.maxCost != null && (c.cost || 0) > op.maxCost) return false;
        if (op.hasType && !c.types.includes(op.hasType)) return false;
        return p.chars.length < 5;
      });
      if (opts.length === 0) continue;
      state.pending = { kind: "CHOOSE", seat: ctx.seat, op,
        options: opts.map(o => ({ seat: ctx.seat, id: `trash:${o.idx}` })),
        min: op.upTo ? 0 : Math.min(1, opts.length), max: op.count ?? 1,
        remaining: ops.slice(i + 1), ctx };
      return false;
    }
    if (op.op === "discardFromHand") { // chooser = the hand's owner
      const seat = op.owner === "opp" ? 1 - ctx.seat : ctx.seat;
      const hand = state.players[seat].hand;
      if (hand.length === 0) continue;
      if (hand.length <= op.count) { // forced full discard — no decision
        applyOp(state, op, hand.map((_, idx) => ({ seat, id: `hand:${idx}` })), { ...ctx, discardSeat: seat });
        continue;
      }
      state.pending = { kind: "CHOOSE", seat, op,
        options: hand.map((_, idx) => ({ seat, id: `hand:${idx}` })),
        min: op.count, max: op.count, remaining: ops.slice(i + 1),
        ctx: { ...ctx, discardSeat: seat } };
      return false;
    }
    if (op.target) {
      const options = queryTargets(state, op.target, ctx);
      if (op.target.all) { applyOp(state, op, options, ctx); continue; }
      const max = op.target.count ?? 1;
      const min = op.upTo ? 0 : Math.min(max, options.length);
      if (options.length === 0) { continue; } // nothing to affect — skip ("up to" semantics)
      // auto-resolve only when there is no real decision (forced, single option)
      if (!op.upTo && options.length === 1 && max >= 1) {
        applyOp(state, op, [options[0]], ctx);
        continue;
      }
      state.pending = { kind: "CHOOSE", seat: ctx.seat, op, options, min, max,
                        remaining: ops.slice(i + 1), ctx };
      return false;
    }
    applyOp(state, op, [], ctx);
    if (state.pending?.kind === "REPLACE" && !state.pending.cont) {
      state.pending.cont = { remaining: ops.slice(i + 1), ctx };
      return false; // KO replacement window interrupted the op stream
    }
  }
  return true;
}

export function resumeChoice(state, selection) {
  const { op, remaining, ctx, options, min, max } = state.pending;
  const valid = selection.every(s => options.some(o => o.seat === s.seat && o.id === s.id));
  if (!valid || selection.length < min || selection.length > max)
    throw new Error("Illegal selection");
  state.pending = null;
  applyOp(state, op, selection, ctx);
  return runOps(state, remaining, ctx, 0);
}

function searchFinish(state, seat, op, takenIdx) {
  const p = state.players[seat];
  const top = p.deck.slice(0, op.count);
  const taken = takenIdx.map(i => top[i]);
  const rest = top.filter((_, i) => !takenIdx.includes(i));
  p.deck = p.deck.slice(top.length);
  for (const code of taken) { p.hand.push(code); log(state, `P${seat} adds ${card(code).name} to hand`); }
  if (op.restTo === "bottom") p.deck.push(...rest); else p.deck.unshift(...rest);
}

// generic op-level conditions: {maxOwnLife, minOwnLife, minOwnChars, minOppChars, minOwnTrash, maxOwnHand}
function condMet(state, cond, seat) {
  if (!cond) return true;
  const p = state.players[seat], o = state.players[1 - seat];
  if (cond.maxOwnHand != null && p.hand.length > cond.maxOwnHand) return false;
  if (cond.maxOwnLife != null && p.life.length > cond.maxOwnLife) return false;
  if (cond.minOwnLife != null && p.life.length < cond.minOwnLife) return false;
  if (cond.minOwnChars != null && p.chars.length < cond.minOwnChars) return false;
  if (cond.minOppChars != null && o.chars.length < cond.minOppChars) return false;
  if (cond.minOwnTrash != null && p.trash.length < cond.minOwnTrash) return false;
  if (cond.oppMoreDon && !((10 - o.donDeck) > (10 - p.donDeck))) return false;
  return true;
}

function applyOp(state, op, targets, ctx) {
  TELEMETRY.ops[op.op] = (TELEMETRY.ops[op.op] || 0) + 1;
  if (ctx.sourceRef) { const r = resolveRef(state, ctx.sourceRef); if (r) TELEMETRY.cards.add(r.code); }
  if (ctx.triggerCard) TELEMETRY.cards.add(ctx.triggerCard);
  if (ctx.srcCode) TELEMETRY.cards.add(ctx.srcCode);
  const p = state.players[ctx.seat];
  if (op.if && !condMet(state, op.if, ctx.seat)) return;
  switch (op.op) {
    case "trashToHand": { // selection ids 'trash:<idx>' — recover from trash to hand
      const idxs = targets.map(t => +String(t.id).split(":")[1]).sort((a, b) => b - a);
      for (const idx of idxs) {
        const code = p.trash.splice(idx, 1)[0];
        if (code != null) { p.hand.push(code); log(state, `P${ctx.seat} returns ${card(code).name} from trash to hand`); }
      }
      break;
    }
    case "searchTop": // resumed from CHOOSE: selection ids are 'deck:<idx>'
      searchFinish(state, ctx.seat, op, targets.map(t => +String(t.id).split(":")[1]));
      break;
    case "playFromTrash": { // selection ids are 'trash:<idx>'
      const idxs = targets.map(t => +String(t.id).split(":")[1]).sort((a, b) => b - a);
      for (const idx of idxs) {
        const code = p.trash[idx];
        if (code == null || p.chars.length >= 5) continue;
        p.trash.splice(idx, 1);
        const ch = makeChar(state, code);
        if (op.rested) ch.rested = true;
        p.chars.push(ch);
        log(state, `P${ctx.seat} plays ${card(code).name} from the trash${op.rested ? " (rested)" : ""}`);
      }
      break;
    }
    case "discardFromHand": { // selection ids are 'hand:<idx>'
      const seat = ctx.discardSeat ?? ctx.seat;
      const ph = state.players[seat];
      const idxs = targets.map(t => +String(t.id).split(":")[1]).sort((a, b) => b - a);
      for (const idx of idxs) {
        const code = ph.hand.splice(idx, 1)[0];
        if (code != null) { ph.trash.push(code); log(state, `P${seat} discards ${card(code).name}`); }
      }
      break;
    }
    case "draw": {
      for (let n = 0; n < op.count; n++) {
        if (p.deck.length === 0) { state.winner = 1 - ctx.seat; log(state, "Deck out!"); return; }
        p.hand.push(p.deck.shift());
      }
      log(state, `P${ctx.seat} draws ${op.count}`);
      break;
    }
    case "costMod": // board-side cost modification (expires per duration)
      for (const t of targets) {
        const r = resolveRef(state, t);
        if (r?.kind === "char") {
          r.obj.mods.push({ amount: op.amount, until: op.duration, kind: "cost" });
          log(state, `${nameOf(state, t)} cost ${op.amount > 0 ? "+" : ""}${op.amount} (${op.duration})`);
        }
      }
      break;
    case "lifeToHand": { // take your own top life card(s) into hand
      for (let n = 0; n < op.count && p.life.length > 0; n++) {
        p.hand.push(p.life.shift());
      }
      log(state, `P${ctx.seat} adds ${op.count} life card(s) to hand`);
      break;
    }
    case "lifeFromDeck": { // heal: top of deck → top of life, face down
      for (let n = 0; n < op.count && p.deck.length > 0; n++) p.life.unshift(p.deck.shift());
      log(state, `P${ctx.seat} adds ${op.count} card(s) to their Life`);
      break;
    }
    case "addDon": { // add DON!! from DON!! deck to cost area (ramp)
      const n = Math.min(op.count, p.donDeck);
      p.donDeck -= n;
      if (op.rested) p.donRested += n; else p.donActive += n;
      if (n) log(state, `P${ctx.seat} adds ${n} DON!! (${op.rested ? "rested" : "active"})`);
      break;
    }
    case "trashOppLife": { // e.g. ST04-001 Kaido leader
      const o = state.players[1 - ctx.seat];
      for (let n = 0; n < op.count && o.life.length > 0; n++) {
        o.trash.push(o.life.shift());
        log(state, `P${1 - ctx.seat} trashes a Life card (${o.life.length} left)`);
      }
      break;
    }
    case "playFromHand": { // play a named/filtered card from hand without paying its cost
      const idx = p.hand.findIndex(code => {
        const c = card(code);
        return c.category === "Character" && (!op.named || c.name === op.named)
          && (op.maxCost == null || (c.cost || 0) <= op.maxCost);
      });
      if (idx === -1 || p.chars.length >= 5) break;
      const code = p.hand.splice(idx, 1)[0];
      p.chars.push(makeChar(state, code));
      log(state, `P${ctx.seat} plays ${card(code).name} from hand`);
      break;
    }
    case "grantKeywordTurn": { // e.g. "gains [Rush]/[Double Attack] during this turn"
      const r = resolveRef(state, ctx.sourceRef);
      if (r && r.kind === "char") r.obj.flags["kw" + op.keyword.replace(/\s/g, "")] = true;
      log(state, `${nameOf(state, ctx.sourceRef)} gains [${op.keyword}] this turn`);
      break;
    }
    case "schedule": // delayed effect — fires at end of the current turn
      state.delayed.push({ seat: ctx.seat, at: op.at || "endOfTurn", ops: op.ops });
      log(state, `Delayed effect scheduled (${op.at || "endOfTurn"})`);
      break;
    case "setActive":
      for (const t of targets) {
        const r = resolveRef(state, t);
        if (r.kind === "leader") r.obj.leaderRested = false; else r.obj.rested = false;
        log(state, `${nameOf(state, t)} is set as active`);
      }
      break;
    case "setActiveSource": {
      const r = resolveRef(state, ctx.sourceRef);
      if (r) { if (r.kind === "leader") r.obj.leaderRested = false; else r.obj.rested = false;
        log(state, `${nameOf(state, ctx.sourceRef)} is set as active`); }
      break;
    }
    case "restTarget":
      for (const t of targets) {
        const r = resolveRef(state, t);
        if (r.kind === "leader") r.obj.leaderRested = true; else r.obj.rested = true;
        log(state, `${nameOf(state, t)} is rested`);
      }
      break;
    case "restOppDon": { // rest DON in the opponent's cost area (fungible → no choice)
      const o = state.players[1 - ctx.seat];
      const n = Math.min(op.count, o.donActive);
      o.donActive -= n; o.donRested += n;
      if (n) log(state, `${n} of P${1 - ctx.seat}'s DON!! rested`);
      break;
    }
    case "setDonActive": { // set own rested DON as active (fungible → no choice)
      const n = Math.min(op.count, p.donRested);
      p.donRested -= n; p.donActive += n;
      if (n) log(state, `P${ctx.seat} sets ${n} DON!! as active`);
      break;
    }
    case "powerMod":
      for (const t of targets) {
        addMod(state, t, op.amount, op.duration);
        log(state, `${nameOf(state, t)} gets ${op.amount > 0 ? "+" : ""}${op.amount} (${op.duration})`);
      }
      break;
    case "giveDon": { // move rested DON from cost area onto a leader/char
      const t = targets[0];
      if (!t) break;
      const n = Math.min(op.count, p.donRested);
      if (n <= 0) break;
      p.donRested -= n;
      const r = resolveRef(state, t);
      if (r.kind === "leader") r.obj.leaderDon += n; else r.obj.attachedDon += n;
      log(state, `${n} DON!! given to ${nameOf(state, t)}`);
      break;
    }
    case "ko":
      for (let k = 0; k < targets.length; k++) {
        koCharacter(state, targets[k]);
        if (state.pending?.kind === "REPLACE") { // stash un-KO'd remainder
          state.pending.koRemaining = targets.slice(k + 1);
          break;
        }
      }
      break;
    case "toBottomDeck": // place character at the bottom of its owner's deck
      for (const t of targets) {
        const r = resolveRef(state, t);
        if (r?.kind !== "char") continue;
        const owner = state.players[t.seat];
        owner.donRested += r.obj.attachedDon;
        owner.deck.push(r.obj.code);
        owner.chars = owner.chars.filter(c => c.iid !== r.obj.iid);
        log(state, `${card(r.obj.code).name} is placed at the bottom of the deck`);
        if (state.battle) {
          const b = state.battle;
          const gone = q => q && q.id !== "leader" && !state.players[q.seat].chars.some(c => c.iid === q.id);
          if (gone(b.attacker) || gone(b.target)) b.aborted = true;
        }
      }
      break;
    case "playFromDeck": { // search deck for a named/filtered character, play it, shuffle
      const matches = p.deck.map((code, idx) => ({ code, idx })).filter(x => {
        const c = card(x.code);
        if (c.category !== "Character" || p.chars.length >= 5) return false;
        if (op.named && c.name !== op.named) return false;
        if (op.maxCost != null && (c.cost || 0) > op.maxCost) return false;
        return true;
      }).slice(0, 1); // deterministic: first matching copy (copies are identical)
      for (const m of matches) {
        p.deck.splice(m.idx, 1);
        p.chars.push(makeChar(state, m.code));
        log(state, `P${ctx.seat} plays ${card(m.code).name} from the deck`);
      }
      const [shuffled, r] = shuffle(p.deck, state.rng);
      p.deck = shuffled; state.rng = r;
      log(state, `P${ctx.seat} shuffles their deck`);
      break;
    }
    case "returnToHand":
      for (const t of targets) {
        const r = resolveRef(state, t);
        if (r?.kind !== "char") continue;
        const owner = state.players[t.seat];
        owner.donRested += r.obj.attachedDon; // attached DON return rested
        owner.hand.push(r.obj.code);
        owner.chars = owner.chars.filter(c => c.iid !== r.obj.iid);
        log(state, `${card(r.obj.code).name} returns to hand`);
        if (state.battle) {
          const b = state.battle;
          const gone = q => q && q.id !== "leader" && !state.players[q.seat].chars.some(c => c.iid === q.id);
          if (gone(b.attacker) || gone(b.target)) b.aborted = true;
        }
      }
      break;
    case "custom": { // escape hatch: vetted deterministic functions, no eval
      const fn = CUSTOM_REGISTRY[op.fn];
      if (!fn) throw new Error(`Unknown custom fn: ${op.fn}`);
      fn(state, ctx, op.args || {});
      break;
    }
    case "battleFlag":
      if (state.battle) state.battle.flags[op.flag] = true;
      break;
    case "grantFlag": {
      for (const t of targets) {
        const r = resolveRef(state, t);
        if (r.kind === "leader") r.obj.leaderFlags[op.flag] = true;
        else r.obj.flags[op.flag] = true;
        log(state, `${nameOf(state, t)}: ${op.flag} (${op.duration})`);
      }
      break;
    }
    case "playSelf": { // Trigger: Play this card (e.g. ST01-002 Usopp)
      if (p.chars.length < 5) {
        const ch = makeChar(state, ctx.triggerCard);
        ch.playedTurn = state.turn;
        p.chars.push(ch);
        log(state, `${card(ctx.triggerCard).name} played from Trigger!`);
        ctx.triggerConsumed = true;
      }
      break;
    }
    default: throw new Error(`Unknown op: ${op.op}`);
  }
}

export function koCharacter(state, ref) {
  const r = resolveRef(state, ref);
  if (!r || r.kind !== "char") return;
  if (r.obj.flags?.koImmuneTurn) { log(state, `${card(r.obj.code).name} cannot be K.O.'d this turn`); return; }
  const p = state.players[ref.seat];
  const s = script(r.obj.code);
  if (s.onWouldKO && !r.obj.koPreventUsed
      && r.obj.attachedDon >= (s.onWouldKO.requiresDon || 0)) {
    if (s.onWouldKO.choice) {
      // player-choice replacement: open a REPLACE window (owner decides, may pay a cost)
      const cost = s.onWouldKO.cost || {};
      const payable = !cost.trashFromHand || p.hand.length >= cost.trashFromHand;
      if (payable) {
        state.pending = { kind: "REPLACE", seat: ref.seat, ref, cont: null };
        return; // resolution continues via the REPLACE action
      }
    } else {
      // auto replacement (no decision)
      r.obj.koPreventUsed = true;
      log(state, `${card(r.obj.code).name} avoids being K.O.'d!`);
      runOps(state, s.onWouldKO.ops, { seat: ref.seat, sourceRef: ref });
      return;
    }
  }
  finalizeKO(state, ref);
}

export function finalizeKO(state, ref) {
  const r = resolveRef(state, ref);
  if (!r || r.kind !== "char") return;
  const p = state.players[ref.seat];
  const s = script(r.obj.code);
  // attached DON return to owner's cost area rested
  p.donRested += r.obj.attachedDon;
  p.trash.push(r.obj.code);
  p.chars = p.chars.filter(c => c.iid !== r.obj.iid);
  log(state, `${card(r.obj.code).name} is K.O.'d`);
  // [On K.O.] effects of the destroyed character (owner resolves them)
  if (s.onKO) runOps(state, s.onKO.ops, { seat: ref.seat, sourceRef: null });
  // interrupt battle if a battler left the field
  if (state.battle) {
    const b = state.battle;
    const gone = (q) => q && q.id !== "leader" && !state.players[q.seat].chars.some(c => c.iid === q.id);
    if (gone(b.attacker) || gone(b.target)) b.aborted = true;
  }
}

// Escape-hatch registry: the <2% of cards whose logic exceeds the declarative DSL
// register a reviewed, deterministic function here (capability = direct engine access,
// but code-reviewed and replay-safe by construction: pure state mutation, RNG via state.rng only).
export const CUSTOM_REGISTRY = {};
export function registerCustom(name, fn) { CUSTOM_REGISTRY[name] = fn; }

export function makeChar(state, code) {
  return { iid: "c" + (state.nextIid++), code, rested: false, attachedDon: 0,
           mods: [], flags: {}, playedTurn: state.turn, usedOnce: {} };
}
export function nameOf(state, ref) {
  const r = resolveRef(state, ref);
  return r ? card(r.code).name + (r.kind === "leader" ? " (Leader)" : "") : "?";
}
