#!/usr/bin/env node
// Effect-candidate auto-generator. For every registered card WITHOUT a script,
// parse its real text against the pattern library and classify:
//   A fully auto-generated (DSL emitted, safe to apply after CI)
//   B semi-auto (some clauses parsed — emitted as draft with UNPARSED markers)
//   C manual review (no reliable parse)
//   D escape-hatch likely (replacement/modal/complex markers)
// Also reports pattern frequency across ALL unscripted text so the highest-value
// patterns are implemented first (cards-per-engine-hour ranking).
// Output: reports/effect_candidates.json + console summary.
import fs from "node:fs";
import { allCards, script } from "../src/engine/cards.js";

const STRIP = [/\(After your opponent declares an attack.*?\)/g, /\(This card can attack on the turn.*?\)/g,
  /\(You may rest the specified number of DON!!.*?\)/g,
  /\(You may return the specified number of DON!!.*?\)/g, /This card has been officially errata'd\.?/g];

const KEYWORDS = { "[Blocker]": "Blocker", "[Rush]": "Rush", "[Double Attack]": "Double Attack", "[Banish]": "Banish" };

// clause parsers: each returns {dsl} or null. Patterns mirror official templating.
const CLAUSES = [
  { name: "ko_cost", rx: /^K\.O\. up to (\d) of your opponent's (rested )?Characters with a cost of (\d+) or less\.?$/,
    gen: m => ({ op: "ko", upTo: true, target: { owner: "opp", zone: "chars", ...(m[2] ? { restedOnly: true } : {}), maxCost: +m[3], count: +m[1] } }) },
  { name: "ko_power", rx: /^K\.O\. up to (\d) of your opponent's Characters with (\d+) power or less\.?$/,
    gen: m => ({ op: "ko", upTo: true, target: { owner: "opp", zone: "chars", maxPower: +m[2], count: +m[1] } }) },
  { name: "buff_battle", rx: /^Up to (\d) of your Leader or Character cards gains \+(\d+) power during this battle\.?$/,
    gen: m => ({ op: "powerMod", amount: +m[2], duration: "battle", upTo: true, target: { owner: "self", zone: "leaderOrChar", count: +m[1] } }) },
  { name: "buff_turn", rx: /^Up to (\d) of your Leader or Character cards gains \+(\d+) power during this turn\.?$/,
    gen: m => ({ op: "powerMod", amount: +m[2], duration: "turn", upTo: true, target: { owner: "self", zone: "leaderOrChar", count: +m[1] } }) },
  { name: "debuff_turn", rx: /^Give up to (\d) of your opponent's (?:Leader or Character cards?|Characters) -(\d+) power during this turn\.?$/,
    gen: m => ({ op: "powerMod", amount: -m[2], duration: "turn", upTo: true, target: { owner: "opp", zone: "chars", count: +m[1] } }) },
  { name: "draw", rx: /^Draw (\d)(?: cards?)?\.?$/, gen: m => ({ op: "draw", count: +m[1] }) },
  { name: "rest_char", rx: /^Rest up to (\d) of your opponent's Characters(?: with a cost of (\d+) or less)?\.?$/,
    gen: m => ({ op: "restTarget", upTo: true, target: { owner: "opp", zone: "chars", activeOnly: true, ...(m[2] ? { maxCost: +m[2] } : {}), count: +m[1] } }) },
  { name: "rest_don", rx: /^Rest up to (\d) of your opponent's DON!! cards\.?$/, gen: m => ({ op: "restOppDon", count: +m[1] }) },
  { name: "give_don", rx: /^Give (?:this Leader or 1 of your Characters|up to (\d) rested DON!! cards? to your Leader or 1 of your Characters) up to (\d+) rested DON!! cards?\.?$|^Give up to (\d) rested DON!! cards? to your Leader or 1 of your Characters\.?$/,
    gen: m => ({ op: "giveDon", from: "rested", count: +(m[1] || m[2] || m[3] || 1), upTo: true, target: { owner: "self", zone: "leaderOrChar" } }) },
  { name: "set_don_active", rx: /^Set up to (\d) of your DON!! cards as active\.?$/, gen: m => ({ op: "setDonActive", count: +m[1] }) },
  { name: "self_aura", rx: /^This (?:Character|card) gains \+(\d+) power\.?$/, gen: (m, ctx) => ({ AURA: { powerPlus: +m[1], requiresDon: ctx.donX || 0 } }) },
  { name: "play_self_trigger", rx: /^Play this card\.?$/, gen: () => ({ op: "playSelf" }) },
  // ---- expansion wave 2 (frequency-ranked from OP-01 measurements) ----
  { name: "no_block_power", rx: /^Your opponent cannot activate a \[?Blocker\]? Character that has (\d+) or more power during this battle\.?$/,
    gen: () => ({ op: "battleFlag", flag: "noBlock5000Plus" }) },
  { name: "no_block", rx: /^Your opponent cannot activate \[?Blocker\]? during this battle\.?$/,
    gen: () => ({ op: "battleFlag", flag: "noBlock" }) },
  { name: "search_typed", rx: /^Look at (\d) cards from the top of your deck; reveal up to (\d) "([^"]+)" type (?:Character )?cards? .*?and add it to your hand\. Then, place the rest at the bottom of your deck in any order\.?$/,
    gen: m => ({ op: "searchTop", count: +m[1], match: { hasType: m[3] }, take: { upTo: +m[2] }, restTo: "bottom" }) },
  { name: "scry", rx: /^Look at (\d) cards from the top of your deck and place them at the top or bottom of the deck in any order\.?$/,
    gen: m => ({ op: "searchTop", count: +m[1], take: { upTo: 0 }, restTo: "top" }) },
  { name: "ko_blocker_cost", rx: /^K\.O\. up to (\d) of your opponent's \[?Blocker\]? Characters with a cost of (\d+) or less\.?$/,
    gen: m => ({ op: "ko", upTo: true, target: { owner: "opp", zone: "chars", hasKeyword: "Blocker", maxCost: +m[2], count: +m[1] } }) },
  { name: "debuff_any", rx: /^Give up to (\d) of your opponent's (?:Leader or Character cards?|Characters) -(\d+) power during this (turn|battle)\.?$/,
    gen: m => ({ op: "powerMod", amount: -m[2], duration: m[3], upTo: true, target: { owner: "opp", zone: "chars", count: +m[1] } }) },
  { name: "draw_then", rx: /^(?:Then, )?[Dd]raw (\d)(?: cards?)?\.?$/, gen: m => ({ op: "draw", count: +m[1] }) },
  { name: "trash_to_hand", rx: /^Add up to (\d) (?:"([^"]+)" type )?(?:Character )?cards?(?: [^.]*?)? with a cost of (\d+) or less from your trash to your hand\.?$/,
    gen: m => ({ op: "trashToHand", upTo: true, count: +m[1], ...(m[2] ? { hasType: m[2] } : {}), maxCost: +m[3], category: "Character" }) },
  { name: "cond_extra_buff", rx: /^(?:Then, )?if you have (\d) or less Life cards?, (?:that card|this card|it) gains an additional \+(\d+) power(?: during this (battle|turn))?\.?$/,
    gen: m => ({ op: "powerMod", amount: +m[2], duration: m[3] || "battle", if: { maxOwnLife: +m[1] }, upTo: true,
      target: { owner: "self", zone: "leaderOrChar", count: 1 } }) },
  { name: "set_char_active", rx: /^Set up to (\d) of your (?:"([^"]+)"(?: or "([^"]+)")? type )?rested Characters?(?: with a cost of (\d+) or less)? as active\.?$/,
    gen: m => ({ op: "setActive", upTo: true, target: { owner: "self", zone: "chars", restedOnly: true,
      ...(m[2] ? { hasTypeAny: [m[2], ...(m[3] ? [m[3]] : [])] } : {}), ...(m[4] ? { maxCost: +m[4] } : {}), count: +m[1] } }) },
  { name: "set_self_active", rx: /^Set this (?:card|Leader|Character) as active\.?$/, gen: () => ({ op: "setActiveSource" }) },
  { name: "give_don_simple", rx: /^Give (?:this Leader or 1 of your Characters|your Leader or 1 of your Characters) up to (\d) rested DON!! cards?\.?$/,
    gen: m => ({ op: "giveDon", from: "rested", count: +m[1], upTo: true, target: { owner: "self", zone: "leaderOrChar" } }) },
  { name: "rest_opp_don_n", rx: /^Rest up to (\d) of your opponent's DON!! cards?\.?$/, gen: m => ({ op: "restOppDon", count: +m[1] }) },
  { name: "trigger_main", rx: /^Activate this card's \[?Main\]? effect\.?$/, gen: (m, ctx) => ({ TRIGGER_MAIN: true }) },
  // ---- expansion wave 3 (ST-03 promotion cycle, measured) ----
  { name: "bounce", rx: /^Return up to (\d) Characters? with a cost of (\d+) or less to the owner's hand\.?$/,
    gen: m => ({ op: "returnToHand", upTo: true, target: { owner: "any", zone: "chars", maxCost: +m[2], count: +m[1] } }) },
  { name: "draw_trash", rx: /^Draw (\d) cards? and trash (\d) cards? from your hand\.?$/,
    gen: m => [{ op: "draw", count: +m[1] }, { op: "discardFromHand", owner: "self", count: +m[2] }] },
  { name: "scry_return", rx: /^Look at (\d) cards from the top of your deck and (?:place|return) them (?:at|to) the top or bottom of the deck in any order\.?$/,
    gen: m => ({ op: "searchTop", count: +m[1], take: { upTo: 0 }, restTo: "top" }) },
  { name: "cond_draw", rx: /^(?:Then, )?draw (\d) cards? if you have (\d) or less cards? in your hand\.?$/,
    gen: m => ({ op: "draw", count: +m[1], if: { maxOwnHand: +m[2] } }) },
  { name: "trigger_counter", rx: /^Activate this card's \[?Counter\]? effect\.?$/, gen: () => ({ TRIGGER_COUNTER: true }) },
  // ---- DON-ramp (frequency-ranked gap after OP-02..05 ingest) ----
  { name: "ramp_rest", rx: /^(?:Then, )?[Aa]dd up to (\d) DON!! cards? from your DON!! deck and rest it\.?$/,
    gen: m => ({ op: "addDon", count: +m[1], rested: true }) },
  { name: "ramp_active", rx: /^(?:Then, )?[Aa]dd up to (\d) DON!! cards? from your DON!! deck and set it as active\.?$/,
    gen: m => ({ op: "addDon", count: +m[1], rested: false }) },
];
const D_MARKERS = /would be K\.O\.|instead|choose one|look at your opponent|reveal.*opponent's hand|place .* at the (top|bottom) of .* Life/i;

export function generateFor(card) {
  let text = card.text || "";
  for (const s of STRIP) text = text.replace(s, "");
  // official templating puts [DON!! xN] BEFORE the timing bracket — normalize order
  text = text.replace(/\[DON!! x(\d)\]\s*\[(When Attacking|On Block|Your Turn|Opponent's Turn|End of Your Turn|Once Per Turn)\]/g, "[$2] [DON!! x$1]");
  text = text.trim();
  const out = { code: card.code, class: null, script: {}, unparsed: [] };
  if (!text && !card.triggerText) { out.class = "A"; out.note = "vanilla"; return out; }
  if (D_MARKERS.test(text)) { out.class = "D"; out.note = "escape-hatch markers"; return out; }

  // keyword extraction — only standalone leading tokens, never mid-sentence mentions
  const kws = [];
  for (const [tok, kw] of Object.entries(KEYWORDS)) {
    const rx = new RegExp("(^|\\s)" + tok.replace(/[[\]!]/g, "\\$&") + "(?=\\s*(\\[|$|[A-Z(]))");
    if (rx.test(text) && !new RegExp("activate (a |an )?" + tok.replace(/[[\]!]/g, "\\$&")).test(card.text || "")) {
      kws.push(kw); text = text.replace(rx, "$1").trim();
    }
  }
  if (kws.length) out.script.keywords = kws;
  // standalone DON-aura clause without timing bracket (e.g. "[DON!! x1] This Character gains +1000 power.")
  const auraM = text.match(/\[DON!! x(\d)\]\s*This (?:Character|card) gains \+(\d+) power\.?/);
  if (auraM) {
    out.script.auras = [...(out.script.auras || []), { powerPlus: +auraM[2], requiresDon: +auraM[1] }];
    text = text.replace(auraM[0], "").trim();
  }

  // timing-block parsing: [Timing] [conds] body. | split on bracket groups
  const blocks = text.split(/(?=\[(?:On Play|Activate: Main|When Attacking|On Block|On K\.O\.|Main|Counter|End of Your Turn)\])/).filter(Boolean);
  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;
    const tm = block.match(/^\[(On Play|Activate: Main|When Attacking|On Block|On K\.O\.|Main|Counter|End of Your Turn)\]/);
    if (!tm) { if (block) out.unparsed.push(block); continue; }
    let rest = block.slice(tm[0].length).trim();
    const ctx = {};
    const don = rest.match(/^\[DON!! x(\d)\]\s*/); if (don) { ctx.donX = +don[1]; rest = rest.slice(don[0].length); }
    const once = rest.match(/^\[Once Per Turn\]\s*/); if (once) { ctx.once = true; rest = rest.slice(once[0].length); }
    // activate-ability cost prefix (reminder text already stripped above), before the ":"
    const cost = {};
    const retDon = rest.match(/^DON!! -(\d+)\s*:\s*/); // "DON!! -N : <effect>" → return N DON!! to deck
    if (retDon) { cost.returnDon = +retDon[1]; rest = rest.slice(retDon[0].length); }
    const restDon = rest.match(/^\((\d+)\)\s*:\s*/);   // "(N) : <effect>" → rest N DON!! in cost area
    if (restDon) { cost.restDon = +restDon[1]; rest = rest.slice(restDon[0].length); }
    const ops = [];
    let ok = true;
    // pass 1: multi-sentence clauses (e.g. search templates ending "...in any order.")
    const whole = CLAUSES.map(c => ({ c, m: rest.match(c.rx) })).find(x => x.m && x.m[0] === rest);
    const absorb = gen => {
      for (const g of Array.isArray(gen) ? gen : [gen]) {
        if (g.AURA) out.script.auras = [...(out.script.auras || []), g.AURA]; else ops.push(g);
      }
    };
    if (whole) { absorb(whole.c.gen(whole.m, ctx)); rest = ""; }
    for (const sentence of rest.split(/(?<=\.)(?<!K\.O\.)\s+/).map(x => x.trim()).filter(Boolean)) {
      const hit = CLAUSES.map(c => ({ c, m: sentence.match(c.rx) })).find(x => x.m);
      if (!hit) { ok = false; out.unparsed.push(sentence); continue; }
      absorb(hit.c.gen(hit.m, ctx));
    }
    const key = { "On Play": "onPlay", "Activate: Main": "activateMain", "When Attacking": "whenAttacking",
      "On Block": "onBlock", "On K.O.": "onKO", "Main": "mainEvent", "Counter": "counterEvent",
      "End of Your Turn": "endOfYourTurn" }[tm[1]];
    if (ops.length) out.script[key] = { ...(ctx.donX ? { requiresDon: ctx.donX } : {}),
      ...(ctx.once ? { oncePerTurn: true } : {}),
      ...(Object.keys(cost).length ? { cost } : {}), ops };
    else if (Object.keys(cost).length) { out.unparsed.push(rest || block); out.partial = true; }
    if (!ok) out.partial = true;
  }
  // trigger text
  if (card.triggerText) {
    const hit = CLAUSES.map(c => ({ c, m: card.triggerText.replace(/\.$/, ".").match(c.rx) })).find(x => x.m);
    const gen = hit && hit.c.gen(hit.m, {});
    if (gen?.TRIGGER_MAIN && out.script.mainEvent) out.script.trigger = { ops: out.script.mainEvent.ops };
    else if (gen?.TRIGGER_COUNTER && out.script.counterEvent) out.script.trigger = { ops: out.script.counterEvent.ops };
    else if (gen && !gen.TRIGGER_MAIN && !gen.TRIGGER_COUNTER) out.script.trigger = { ops: Array.isArray(gen) ? gen : [gen] };
    else { out.unparsed.push("[Trigger] " + card.triggerText); out.partial = true; }
  }
  const hasContent = Object.keys(out.script).length > 0;
  out.class = out.unparsed.length === 0 && hasContent ? "A" : hasContent || out.partial ? "B" : "C";
  return out;
}

// ---- run over registry (only when executed directly, not when imported by tests) ----
const isMain = process.argv[1]?.endsWith("generate.js");
if (isMain) {
const unscripted = allCards().filter(c => Object.keys(script(c.code)).length === 0 && (c.text || c.triggerText));
const vanilla = allCards().filter(c => !c.text && !c.triggerText && Object.keys(script(c.code)).length === 0);
const results = unscripted.map(generateFor);
const byClass = cls => results.filter(r => r.class === cls);
const freq = {};
for (const r of results) for (const u of r.unparsed) {
  const k = u.replace(/\d+/g, "N").replace(/"[^"]+"/g, "T").slice(0, 80);
  freq[k] = (freq[k] || 0) + 1;
}
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/effect_candidates.json", JSON.stringify({
  generated: new Date().toISOString(),
  counts: { A: byClass("A").length, B: byClass("B").length, C: byClass("C").length, D: byClass("D").length,
    vanillaAuto: vanilla.length },
  candidates: results,
  patternFrequency: Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([p, n]) => ({ pattern: p, cards: n })),
}, null, 2));
console.log(`Auto-generation over ${unscripted.length} unscripted cards (+${vanilla.length} vanilla = auto):`);
console.log(`  A fully-auto:   ${byClass("A").length}`);
console.log(`  B semi-auto:    ${byClass("B").length}`);
console.log(`  C manual:       ${byClass("C").length}`);
console.log(`  D escape-hatch: ${byClass("D").length}`);
console.log("Top unparsed patterns (implement these next):");
Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8)
  .forEach(([p, n]) => console.log(`  ${String(n).padStart(3)}× ${p}`));

// --write : promote every A-class script into src/data/auto.scripts.js.
// Existing auto scripts are preserved (those cards are already "scripted" so they
// don't appear in `unscripted`); hand-written scripts always win at registration.
if (process.argv.includes("--write")) {
  const { AUTO_SCRIPTS } = await import("../src/data/auto.scripts.js");
  const merged = { ...AUTO_SCRIPTS };
  let added = 0;
  for (const r of byClass("A")) {
    if (!merged[r.code]) added++;
    merged[r.code] = { ...r.script, generated: true };
  }
  const sorted = Object.fromEntries(Object.keys(merged).sort().map(k => [k, merged[k]]));
  const body = "// AUTO-GENERATED A-class scripts (scripts/generate.js --write). " +
    "Review B/C/D in reports/effect_candidates.json.\n" +
    "export const AUTO_SCRIPTS = " + JSON.stringify(sorted, null, 1) + ";\n";
  fs.writeFileSync("src/data/auto.scripts.js", body);
  console.log(`\n--write: auto.scripts.js now ${Object.keys(merged).length} scripts (+${added} new A-class).`);
}
} // end isMain
