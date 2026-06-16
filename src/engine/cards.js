import { ST01_CARDS } from "../data/st01.cards.js";
import { ST01_SCRIPTS } from "../data/st01.scripts.js";
import { ST02_CARDS } from "../data/st02.cards.js";
import { ST02_SCRIPTS } from "../data/st02.scripts.js";
import { ST03_CARDS } from "../data/st03.cards.js";
import { ST03_SCRIPTS } from "../data/st03.scripts.js";
import { ST04_CARDS, ST05_CARDS } from "../data/st0405.cards.js";
import { ST0405_SCRIPTS } from "../data/st0405.scripts.js";
import { OP01_CARDS } from "../data/op01.cards.js";
import { OP02_CARDS } from "../data/op02.cards.js";
import { OP03_CARDS } from "../data/op03.cards.js";
import { OP04_CARDS } from "../data/op04.cards.js";
import { OP05_CARDS } from "../data/op05.cards.js";
import { OP06_CARDS } from "../data/op06.cards.js";
import { OP07_CARDS } from "../data/op07.cards.js";
import { OP08_CARDS } from "../data/op08.cards.js";
import { OP09_CARDS } from "../data/op09.cards.js";
import { OP10_CARDS } from "../data/op10.cards.js";
import { OP11_CARDS } from "../data/op11.cards.js";
import { AUTO_SCRIPTS } from "../data/auto.scripts.js";

const REGISTRY = new Map();
const SCRIPTS = new Map();

export function registerSet(cards, scripts = {}) {
  for (const c of cards) REGISTRY.set(c.code, c);
  for (const [code, s] of Object.entries(scripts)) SCRIPTS.set(code, s);
}
registerSet(ST01_CARDS, ST01_SCRIPTS);
registerSet(ST02_CARDS, ST02_SCRIPTS);
registerSet(ST03_CARDS, ST03_SCRIPTS);
registerSet(ST04_CARDS, {});
registerSet(ST05_CARDS, {});
registerSet([], ST0405_SCRIPTS);
registerSet(OP01_CARDS, {});
registerSet(OP02_CARDS, {});
registerSet(OP03_CARDS, {});
registerSet(OP04_CARDS, {});
registerSet(OP05_CARDS, {});
registerSet(OP06_CARDS, {});
registerSet(OP07_CARDS, {});
registerSet(OP08_CARDS, {});
registerSet(OP09_CARDS, {});
registerSet(OP10_CARDS, {});
registerSet(OP11_CARDS, {});
// auto-generated A-class scripts fill remaining gaps; hand-written always wins
for (const [code, s] of Object.entries(AUTO_SCRIPTS))
  if (!SCRIPTS.has(code)) SCRIPTS.set(code, s);

export function card(code) {
  const c = REGISTRY.get(code);
  if (!c) throw new Error(`Unknown card: ${code}`);
  return c;
}
export function script(code) { return SCRIPTS.get(code) || {}; }
export function allCards() { return [...REGISTRY.values()]; }

export function hasKeyword(code, kw, attachedDon = 0) {
  const s = script(code);
  if ((s.keywords || []).includes(kw)) return true;
  for (const g of s.grants || []) {
    if (g.keyword === kw && attachedDon >= (g.requiresDon || 0)) return true;
  }
  return false;
}
// ST-01 deck list — verified against the deck bundled in OPTCGSim 1.40a resources.
export const ST01_DECK = {
  leader: "ST01-001",
  cards: [
    ...rep("ST01-002", 4), ...rep("ST01-003", 4), ...rep("ST01-004", 4),
    ...rep("ST01-005", 4), ...rep("ST01-006", 4), ...rep("ST01-007", 4),
    ...rep("ST01-008", 4), ...rep("ST01-009", 4), ...rep("ST01-010", 4),
    ...rep("ST01-011", 2), ...rep("ST01-012", 2), ...rep("ST01-013", 2),
    ...rep("ST01-014", 2), ...rep("ST01-015", 2), ...rep("ST01-016", 2),
    ...rep("ST01-017", 2),
  ],
};
function rep(code, n) { return Array(n).fill(code); }

// ST-02 deck list — verified against the deck bundled in OPTCGSim 1.40a resources.
export const ST02_DECK = {
  leader: "ST02-001",
  cards: [
    ...rep("ST02-002", 4), ...rep("ST02-003", 2), ...rep("ST02-004", 4),
    ...rep("ST02-005", 2), ...rep("ST02-006", 4), ...rep("ST02-007", 4),
    ...rep("ST02-008", 4), ...rep("ST02-009", 2), ...rep("ST02-010", 2),
    ...rep("ST02-011", 4), ...rep("ST02-012", 4), ...rep("ST02-013", 2),
    ...rep("ST02-014", 4), ...rep("ST02-015", 2), ...rep("ST02-016", 4),
    ...rep("ST02-017", 2),
  ],
};
// ST-03 deck list — verified against the deck bundled in OPTCGSim 1.40a resources.
export const ST03_DECK = {
  leader: "ST03-001",
  cards: [
    ...rep("ST03-002", 4), ...rep("ST03-003", 2), ...rep("ST03-004", 2),
    ...rep("ST03-005", 2), ...rep("ST03-006", 4), ...rep("ST03-007", 2),
    ...rep("ST03-008", 4), ...rep("ST03-009", 2), ...rep("ST03-010", 4),
    ...rep("ST03-011", 4), ...rep("ST03-012", 4), ...rep("ST03-013", 4),
    ...rep("ST03-014", 2), ...rep("ST03-015", 4), ...rep("ST03-016", 4),
    ...rep("ST03-017", 2),
  ],
};
// ST-04/ST-05 deck lists — verified against 1.40a embedded decks
export const ST04_DECK = { leader: "ST04-001", cards: [
  ...rep("ST04-002",4),...rep("ST04-003",2),...rep("ST04-004",2),...rep("ST04-005",2),
  ...rep("ST04-006",4),...rep("ST04-007",4),...rep("ST04-008",2),...rep("ST04-009",4),
  ...rep("ST04-010",2),...rep("ST04-011",4),...rep("ST04-012",4),...rep("ST04-013",4),
  ...rep("ST04-014",2),...rep("ST04-015",2),...rep("ST04-016",4),...rep("ST04-017",4)] };
export const ST05_DECK = { leader: "ST05-001", cards: [
  ...rep("ST05-002",4),...rep("ST05-003",4),...rep("ST05-004",2),...rep("ST05-005",2),
  ...rep("ST05-006",2),...rep("ST05-007",4),...rep("ST05-008",2),...rep("ST05-009",4),
  ...rep("ST05-010",2),...rep("ST05-011",2),...rep("ST05-012",4),...rep("ST05-013",4),
  ...rep("ST05-014",4),...rep("ST05-015",4),...rep("ST05-016",2),...rep("ST05-017",4)] };
// OP-01 Red "Straw Hat" aggro — legal sample build (OP01-001 Zoro leader).
// Composed from the OP-01 Red pool; not an official product list (boosters have no
// fixed decklist) — used to make OP-01 immediately playable vs AI.
export const OP01_RED_DECK = { leader: "OP01-001", cards: [
  ...rep("OP01-006",4),...rep("OP01-016",4),...rep("OP01-004",4),...rep("OP01-013",4),
  ...rep("OP01-024",4),...rep("OP01-017",4),...rep("OP01-023",4),...rep("OP01-025",4),
  ...rep("OP01-014",4),...rep("OP01-018",4),...rep("OP01-022",4),...rep("OP01-026",2),
  ...rep("OP01-029",2),...rep("OP01-120",2)] };
export const DECKS = { ST01: ST01_DECK, ST02: ST02_DECK, ST03: ST03_DECK, ST04: ST04_DECK, ST05: ST05_DECK, OP01R: OP01_RED_DECK };

// OPTCGSim .deck import: lines of "4xST01-002" (first line is the leader "1xST01-001").
export function importOptcgsimDeck(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let leader = null; const cards = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)x([A-Z0-9]+-\d+)$/i);
    if (!m) continue;
    const [, n, code] = m;
    if (!REGISTRY.has(code)) throw new Error(`Card not in database yet: ${code}`);
    if (card(code).category === "Leader") leader = code;
    else for (let i = 0; i < +n; i++) cards.push(code);
  }
  if (!leader) throw new Error("Deck has no leader");
  if (cards.length !== 50) throw new Error(`Deck must have 50 cards, got ${cards.length}`);
  return { leader, cards };
}
export function exportOptcgsimDeck(deck) {
  const counts = {};
  for (const c of deck.cards) counts[c] = (counts[c] || 0) + 1;
  return [`1x${deck.leader}`, ...Object.entries(counts).map(([c, n]) => `${n}x${c}`)].join("\n");
}
