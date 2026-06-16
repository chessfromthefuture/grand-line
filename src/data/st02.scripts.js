// ST-02 effect scripts — data entries against the real card text (see st02.cards.js).
// Engine default for "place the rest at the bottom in any order": original order
// (deterministic; order choice has no hidden-info impact for the chooser).

export const ST02_SCRIPTS = {
  "ST02-001": { // Eustass"Captain"Kid — Leader
    activateMain: { oncePerTurn: true, cost: { restDon: 3, trashFromHand: 1 },
      ops: [ { op: "setActiveSource" } ] },
  },
  "ST02-003": { // Urouge — conditional self aura (both turns; no [Your Turn] tag)
    auras: [ { powerPlus: 2000, requiresDon: 1, minOwnChars: 3 } ],
  },
  "ST02-004": { keywords: ["Blocker"] }, // Capone"Gang"Bege
  "ST02-005": { // Killer
    onPlay: { ops: [ { op: "ko", upTo: true,
      target: { owner: "opp", zone: "chars", restedOnly: true, maxCost: 3, count: 1 } } ] },
    trigger: { ops: [ { op: "playSelf" } ] },
  },
  "ST02-007": { // Jewelry Bonney
    activateMain: { cost: { restDon: 1, restSelf: true },
      ops: [ { op: "searchTop", count: 5, match: { hasType: "Supernovas" },
               take: { upTo: 1 }, restTo: "bottom" } ] },
  },
  "ST02-008": { // Scratchmen Apoo
    whenAttacking: { requiresDon: 1, ops: [ { op: "restOppDon", count: 1 } ] },
  },
  "ST02-009": { // Trafalgar Law
    onPlay: { ops: [ { op: "setActive", upTo: true,
      target: { owner: "self", zone: "chars", restedOnly: true, maxCost: 5,
                hasTypeAny: ["Supernovas", "Heart Pirates"], count: 1 } } ] },
  },
  "ST02-010": { // Basil Hawkins
    afterBattleVsChar: { requiresDon: 1, ops: [ { op: "setActiveSource" } ] },
  },
  "ST02-013": { // Eustass"Captain"Kid (character, errata'd text)
    keywords: ["Blocker"],
    endOfYourTurn: { requiresDon: 1, ops: [ { op: "setActiveSource" } ] },
  },
  "ST02-014": { // X.Drake — global aura while rested on your turn
    globalAuras: [ { powerPlus: 1000, requiresDon: 1, yourTurn: true, selfRested: true,
      affects: { owner: "self", zone: "leaderOrChar", hasTypeAny: ["Supernovas", "Navy"] } } ],
  },
  "ST02-015": { // Scalpel
    counterEvent: { ops: [
      { op: "powerMod", amount: 2000, duration: "battle", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", count: 1 } },
      { op: "setDonActive", count: 1 } ] },
    trigger: { ops: [ { op: "setDonActive", count: 2 } ] },
  },
  "ST02-016": { // Repel
    counterEvent: { ops: [
      { op: "powerMod", amount: 4000, duration: "battle", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", count: 1 } },
      { op: "setDonActive", count: 1 } ] },
  },
  "ST02-017": { // Straw Sword
    mainEvent: { ops: [ { op: "restTarget", upTo: true,
      target: { owner: "opp", zone: "chars", activeOnly: true, count: 1 } } ] },
  },
};
