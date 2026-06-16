// ST-03 hand-written scripts — ONLY the cards auto-generation can't express (C/D class).
// All A-class ST-03 cards come from src/data/auto.scripts.js (generated, reviewed).
export const ST03_SCRIPTS = {
  "ST03-001": { // Crocodile leader — DON!! -4 cost, bounce ≤5
    activateMain: { oncePerTurn: true, cost: { returnDon: 4 }, ops: [
      { op: "returnToHand", upTo: true, target: { owner: "any", zone: "chars", maxCost: 5, count: 1 } } ] },
  },
  "ST03-003": { // Crocodile — Blocker; DON!!x1 On Block: bottom-deck a ≤2 char
    keywords: ["Blocker"],
    onBlock: { requiresDon: 1, ops: [
      { op: "toBottomDeck", upTo: true, target: { owner: "any", zone: "chars", maxCost: 2, count: 1 } } ] },
  },
  "ST03-004": { // Gecko Moria — typed trash recovery ("less than [Gecko Moria]" = cost ≤4, excl. itself)
    onPlay: { ops: [
      { op: "trashToHand", upTo: true, count: 1, maxCost: 4, category: "Character",
        hasType: "The Seven Warlords of the Sea" } ] },
  },
  "ST03-007": { // Sentomaru — DON!!x1 gate + rest-2 cost: play Pacifista ≤4 from deck
    activateMain: { oncePerTurn: true, requiresDon: 1, cost: { restDon: 2 }, ops: [
      { op: "playFromDeck", named: "Pacifista", maxCost: 4 } ] },
  },
};
