// Card effect scripts — data, not code. One entry per card with non-vanilla behavior.
// Timings: onPlay | whenAttacking | activateMain | counterEvent | mainEvent | trigger | aura | keyword
// Ops are interpreted by src/engine/effects.js. New cards = new data entries, no engine changes.

export const ST01_SCRIPTS = {
  "ST01-001": { // Leader Luffy
    activateMain: { oncePerTurn: true, ops: [
      { op: "giveDon", from: "rested", count: 1, upTo: true,
        target: { owner: "self", zone: "leaderOrChar" } } ] },
  },
  "ST01-002": { // Usopp
    whenAttacking: { requiresDon: 2, ops: [ { op: "battleFlag", flag: "noBlock5000Plus" } ] },
    trigger: { ops: [ { op: "playSelf" } ] },
  },
  "ST01-004": { // Sanji
    grants: [ { keyword: "Rush", requiresDon: 2 } ],
  },
  "ST01-005": { // Jinbe
    whenAttacking: { requiresDon: 1, ops: [
      { op: "powerMod", amount: 1000, duration: "turn", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", excludeSource: true, count: 1 } } ] },
  },
  "ST01-006": { keywords: ["Blocker"] }, // Chopper
  "ST01-007": { // Nami
    activateMain: { oncePerTurn: true, ops: [
      { op: "giveDon", from: "rested", count: 1, upTo: true,
        target: { owner: "self", zone: "leaderOrChar" } } ] },
  },
  "ST01-011": { // Brook
    onPlay: { ops: [
      { op: "giveDon", from: "rested", count: 2, upTo: true,
        target: { owner: "self", zone: "leaderOrChar" } } ] },
  },
  "ST01-012": { // Luffy (character)
    keywords: ["Rush"],
    whenAttacking: { requiresDon: 2, ops: [ { op: "battleFlag", flag: "noBlock" } ] },
  },
  "ST01-013": { // Zoro
    auras: [ { powerPlus: 1000, requiresDon: 1 } ],
  },
  "ST01-014": { // Guard Point
    counterEvent: { ops: [
      { op: "powerMod", amount: 3000, duration: "battle", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", count: 1 } } ] },
    trigger: { ops: [
      { op: "powerMod", amount: 1000, duration: "turn", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", count: 1 } } ] },
  },
  "ST01-015": { // Gum-Gum Jet Pistol
    mainEvent: { ops: [
      { op: "ko", upTo: true,
        target: { owner: "opp", zone: "chars", maxPower: 6000, count: 1 } } ] },
    trigger: { ops: [
      { op: "ko", upTo: true,
        target: { owner: "opp", zone: "chars", maxPower: 6000, count: 1 } } ] },
  },
  "ST01-016": { // Diable Jambe
    mainEvent: { ops: [
      { op: "grantFlag", flag: "noBlockWhenAttacking", duration: "turn", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", hasType: "Straw Hat Crew", count: 1 } } ] },
    trigger: { ops: [
      { op: "ko", upTo: true,
        target: { owner: "opp", zone: "chars", hasKeyword: "Blocker", maxCost: 3, count: 1 } } ] },
  },
  "ST01-017": { // Thousand Sunny
    activateMain: { cost: { restSelf: true }, ops: [
      { op: "powerMod", amount: 1000, duration: "turn", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", hasType: "Straw Hat Crew", count: 1 } } ] },
  },
};
