import { card, script } from "./cards.js";

// Resolve a target ref {seat, id} to its live object. id: 'leader' | 'stage' | char iid.
export function resolveRef(state, ref) {
  const p = state.players[ref.seat];
  if (ref.id === "leader") return { kind: "leader", obj: p, code: p.leaderCode, seat: ref.seat };
  if (ref.id === "stage") return p.stage ? { kind: "stage", obj: p.stage, code: p.stage.code, seat: ref.seat } : null;
  const ch = p.chars.find(c => c.iid === ref.id);
  return ch ? { kind: "char", obj: ch, code: ch.code, seat: ref.seat } : null;
}

// ---- aura conditions (shared by self + global auras) ----------------------
// {requiresDon, yourTurn, selfRested, minOwnChars}
function auraActive(state, holder, a) {
  const don = holder.kind === "leader" ? holder.obj.leaderDon : holder.obj.attachedDon;
  if ((a.requiresDon || 0) > don) return false;
  if (a.yourTurn && state.active !== holder.seat) return false;
  if (a.selfRested && !(holder.kind === "leader" ? holder.obj.leaderRested : holder.obj.rested)) return false;
  if (a.minOwnChars && state.players[holder.seat].chars.length < a.minOwnChars) return false;
  if (a.vsAttribute) { // battle-context aura (e.g. ST05-010 Zephyr vs Strike)
    const b = state.battle;
    if (!b) return false;
    const isBattler = q => q && q.seat === holder.seat && holder.kind === "char" && q.id === holder.obj.iid;
    const other = isBattler(b.attacker) ? b.target : isBattler(b.target) ? b.attacker : null;
    if (!other) return false;
    const oc = resolveRef(state, other);
    if (!oc || card(oc.code).attribute !== a.vsAttribute) return false;
  }
  return true;
}
function affectsRef(state, holder, affects, ref) {
  if (!affects) return holder.seat === ref.seat &&
    (holder.kind === "leader" ? ref.id === "leader" : holder.obj.iid === ref.id); // self-aura
  const wantSeat = affects.owner === "opp" ? 1 - holder.seat : holder.seat;
  if (ref.seat !== wantSeat) return false;
  const r = resolveRef(state, ref);
  if (!r || r.kind === "stage") return false;
  if (affects.zone === "chars" && r.kind !== "char") return false;
  if (affects.hasTypeAny && !affects.hasTypeAny.some(t => card(r.code).types.includes(t))) return false;
  return true;
}

// Effective power. Rules applied:
// - attached DON!! give +1000 each ONLY during the owner's turn
// - self auras ([DON!! xN] "+1000" etc.) honor their stated conditions
// - global auras (e.g. ST02-014 X.Drake) project power onto matching cards
// - temp mods carry duration 'turn' or 'battle'
export function effPower(state, ref) {
  const r = resolveRef(state, ref);
  if (!r || r.kind === "stage") return 0;
  const base = card(r.code).power || 0;
  const don = r.kind === "leader" ? r.obj.leaderDon : r.obj.attachedDon;
  const mods = (r.kind === "leader" ? r.obj.leaderMods : r.obj.mods)
    .filter(m => m.kind !== "cost").reduce((a, m) => a + m.amount, 0);
  const donBonus = ref.seat === state.active ? don * 1000 : 0;

  let aura = 0;
  for (let seat = 0; seat < 2; seat++) {
    const p = state.players[seat];
    const holders = [{ kind: "leader", obj: p, code: p.leaderCode, seat }];
    for (const ch of p.chars) holders.push({ kind: "char", obj: ch, code: ch.code, seat });
    for (const h of holders) {
      const s = script(h.code);
      for (const a of s.auras || [])
        if (auraActive(state, h, a) && affectsRef(state, h, null, ref)) aura += a.powerPlus || 0;
      for (const a of s.globalAuras || [])
        if (auraActive(state, h, a) && affectsRef(state, h, a.affects, ref)) aura += a.powerPlus || 0;
    }
  }
  return base + donBonus + aura + mods;
}

// Effective cost of a card ON THE BOARD (for KO-by-cost / target queries).
export function effCost(state, ref) {
  const r = resolveRef(state, ref);
  if (!r || r.kind !== "char") return card(r?.code)?.cost || 0;
  const costMods = r.obj.mods.filter(m => m.kind === "cost").reduce((a, m) => a + m.amount, 0);
  return Math.max(0, (card(r.code).cost || 0) + costMods);
}

// Cost to play a card FROM HAND (static script discounts, e.g. "costs 2 less if ...").
export function playCost(state, seat, code) {
  const c = card(code);
  let cost = c.cost || 0;
  const hc = script(code).handCost;
  if (hc) {
    let ok = true;
    if (hc.ifLeaderType) ok = card(state.players[seat].leaderCode).types.includes(hc.ifLeaderType);
    if (hc.minTrash) ok = ok && state.players[seat].trash.length >= hc.minTrash;
    if (ok) cost = Math.max(0, cost - hc.minus);
  }
  return cost;
}

export function isRested(state, ref) {
  const r = resolveRef(state, ref);
  if (!r) return false;
  return r.kind === "leader" ? r.obj.leaderRested : r.obj.rested;
}
export function setRested(state, ref, v) {
  const r = resolveRef(state, ref);
  if (!r) return;
  if (r.kind === "leader") r.obj.leaderRested = v; else r.obj.rested = v;
}
export function attachedDonOf(state, ref) {
  const r = resolveRef(state, ref);
  if (!r) return 0;
  return r.kind === "leader" ? r.obj.leaderDon : (r.obj.attachedDon || 0);
}
export function addMod(state, ref, amount, duration) {
  const r = resolveRef(state, ref);
  if (!r) return;
  const mods = r.kind === "leader" ? r.obj.leaderMods : r.obj.mods;
  mods.push({ amount, until: duration });
}
export function expireMods(state, duration) {
  for (const p of state.players) {
    p.leaderMods = p.leaderMods.filter(m => m.until !== duration);
    for (const c of p.chars) {
      c.mods = c.mods.filter(m => m.until !== duration);
      if (duration === "turn") c.flags = {};
    }
    if (duration === "turn") p.leaderFlags = {};
  }
}
