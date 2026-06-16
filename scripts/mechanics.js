#!/usr/bin/env node
// Mechanic inventory analyzer. Runs the taxonomy over every ingested card's REAL text
// and emits reports/mechanic_inventory.json. Re-run after each set ingestion —
// the inventory grows automatically with the registry.
// External corpora measured but not yet ingested (e.g. OP-01 via API) are merged
// from MEASURED_EXTERNAL so the dashboard reflects everything analyzed so far.
import fs from "node:fs";
import { allCards, script } from "../src/engine/cards.js";

export const TAXONOMY = {
  // timing keywords (bracket syntax in official text)
  onPlay:        { rx: /\[On Play\]/, dsl: "onPlay" },
  activateMain:  { rx: /\[Activate: Main\]/, dsl: "activateMain" },
  whenAttacking: { rx: /\[When Attacking\]/, dsl: "whenAttacking" },
  onBlock:       { rx: /\[On Block\]/, dsl: "onBlock" },
  onKO:          { rx: /\[On K\.O\.\]/, dsl: "onKO" },
  trigger:       { rx: /\[Trigger\]/, dsl: "trigger", field: "triggerText" },
  counterEvent:  { rx: /\[Counter\]/, dsl: "counterEvent" },
  yourTurn:      { rx: /\[Your Turn\]/, dsl: "auras.yourTurn" },
  oppTurn:       { rx: /\[Opponent's Turn\]/, dsl: "auras.oppTurn" },
  endOfYourTurn: { rx: /\[End of Your Turn\]/, dsl: "endOfYourTurn" },
  oncePerTurn:   { rx: /\[Once Per Turn\]/, dsl: "oncePerTurn flags" },
  donX:          { rx: /\[DON!! x\d\]/, dsl: "requiresDon" },
  rush:          { rx: /\[Rush\]/, dsl: "keyword Rush" },
  blocker:       { rx: /\[Blocker\]/, dsl: "keyword Blocker" },
  doubleAttack:  { rx: /\[Double Attack\]/, dsl: "keyword Double Attack" },
  banish:        { rx: /\[Banish\]/, dsl: "keyword Banish" },
  // effect families (phrase syntax)
  koEffects:     { rx: /K\.O\. up to|K\.O\. all/, dsl: "op ko" },
  search:        { rx: /Look at \d/, dsl: "op searchTop" },
  fromTrash:     { rx: /from your trash/, dsl: "op playFromTrash / trashToHand" },
  restand:       { rx: /as active/, dsl: "op setActive / setDonActive" },
  resting:       { rx: /Rest up to/, dsl: "op restTarget / restOppDon" },
  powerMinus:    { rx: /-\d+000 power/, dsl: "op powerMod (negative)" },
  powerPlus:     { rx: /\+\d+000 power/, dsl: "op powerMod" },
  draw:          { rx: /[Dd]raw \d/, dsl: "op draw" },
  handDiscard:   { rx: /[Tt]rash \d (card|cards) from your hand|from (your|their) hand/, dsl: "op discardFromHand / cost trashFromHand" },
  oppHand:       { rx: /your opponent's hand/, dsl: "op discardFromHand(opp) / revealHand" },
  lifeManip:     { rx: /Life card|top of your Life|from your Life/, dsl: "op lifeToHand / lifeFromDeck" },
  costMod:       { rx: /costs? \d less|-\d cost|\+\d cost/, dsl: "op costMod / handCost" },
  attackLock:    { rx: /cannot attack/, dsl: "flag cannotAttack" },
  blockerLock:   { rx: /cannot activate/, dsl: "battleFlag noBlock*" },
  delayed:       { rx: /at the end of (this|that|your) turn/, dsl: "op schedule" },
  replacement:   { rx: /would be K\.O\.|instead/, dsl: "onWouldKO" },
};

// Measured 2026-06-10 against the full OP-01 API payload (121 cards, not yet ingested).
export const MEASURED_EXTERNAL = {
  "OP-01": { cards: 121, counts: {
    onPlay: 37, whenAttacking: 23, donX: 37, blocker: 17, counterEvent: 12, trigger: 15,
    oncePerTurn: 17, rush: 8, onKO: 7, onBlock: 5, doubleAttack: 3, banish: 4,
    yourTurn: 9, oppTurn: 3, search: 10, handDiscard: 19, fromTrash: 3, koEffects: 9,
    resting: 6, restand: 12, powerMinus: 6, draw: 8, attackLock: 3, blockerLock: 2,
    lifeManip: 2, oppHand: 2, costMod: 0, delayed: 0, replacement: 0,
  } },
};

const cards = allCards();
const inventory = {};
for (const [mech, def] of Object.entries(TAXONOMY)) {
  const hits = cards.filter(c => {
    const t = (def.field ? c[def.field] : `${c.text || ""} ${c.triggerText || ""}`) || "";
    return def.rx.test(t);
  });
  inventory[mech] = { dslMapping: def.dsl, ingestedCount: hits.length,
    examples: hits.slice(0, 3).map(c => c.code) };
}
for (const [set, m] of Object.entries(MEASURED_EXTERNAL))
  for (const [mech, n] of Object.entries(m.counts))
    if (inventory[mech]) inventory[mech].externalCounts = { ...(inventory[mech].externalCounts || {}), [set]: n };

const out = { generated: new Date().toISOString(),
  ingestedCards: cards.length, externalCorpora: Object.keys(MEASURED_EXTERNAL),
  mechanics: inventory };
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/mechanic_inventory.json", JSON.stringify(out, null, 2));
console.log(`mechanic_inventory.json: ${Object.keys(inventory).length} mechanics over ` +
  `${cards.length} ingested + ${Object.values(MEASURED_EXTERNAL).reduce((a, m) => a + m.cards, 0)} external cards`);
for (const [m, v] of Object.entries(inventory)) {
  const ext = Object.values(v.externalCounts || {}).reduce((a, b) => a + b, 0);
  console.log(`  ${m.padEnd(14)} ingested:${String(v.ingestedCount).padStart(3)}  external:${String(ext).padStart(3)}  → ${v.dslMapping}`);
}
