// ST-04 / ST-05 scripts. Effect-level "DON!! -N:" costs use cost.returnDon (paid-if-affordable).
export const ST0405_SCRIPTS = {
  // ---- ST-04 (Purple / Animal Kingdom) ----
  "ST04-001": { activateMain: { oncePerTurn: true, cost: { returnDon: 7 }, ops: [ { op: "trashOppLife", count: 1 } ] } },
  "ST04-002": { onPlay: { cost: { returnDon: 1 }, ops: [ { op: "playFromHand", named: "Page One", maxCost: 4 } ] } },
  "ST04-003": { onPlay: { cost: { returnDon: 5 }, ops: [
      { op: "ko", upTo: true, target: { owner: "opp", zone: "chars", maxCost: 6, count: 1 } },
      { op: "grantKeywordTurn", keyword: "Rush" } ] } },
  "ST04-004": { onPlay: { cost: { returnDon: 1 }, ops: [
      { op: "ko", upTo: true, target: { owner: "opp", zone: "chars", maxCost: 4, count: 1 } } ] } },
  "ST04-005": { keywords: ["Blocker"], onPlay: { cost: { returnDon: 1 }, ops: [
      { op: "draw", count: 2 }, { op: "discardFromHand", owner: "self", count: 1 } ] } },
  "ST04-006": { onPlay: { cost: { returnDon: 1 }, ops: [ { op: "draw", count: 1 } ] } },
  "ST04-008": { onPlay: { cost: { trashFromHand: 1 }, ops: [ { op: "addDon", count: 1, rested: false } ] } },
  "ST04-010": { onPlay: { cost: { returnDon: 1 }, ops: [
      { op: "ko", upTo: true, target: { owner: "opp", zone: "chars", maxCost: 3, count: 1 } } ] },
    trigger: { ops: [ { op: "playSelf" } ] } },
  "ST04-011": { keywords: ["Blocker"] },
  "ST04-014": { mainEvent: { ops: [ { op: "draw", count: 1 }, { op: "addDon", count: 1, rested: false } ] },
    trigger: { ops: [ { op: "draw", count: 1 }, { op: "addDon", count: 1, rested: false } ] } },
  "ST04-015": { mainEvent: { ops: [
      { op: "ko", upTo: true, target: { owner: "opp", zone: "chars", maxCost: 6, count: 1 } },
      { op: "addDon", count: 1, rested: false } ] },
    trigger: { ops: [ { op: "addDon", count: 1, rested: false } ] } },
  "ST04-016": { counterEvent: { cost: { returnDon: 1 }, ops: [
      { op: "powerMod", amount: 4000, duration: "battle", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", count: 1 } } ] } },
  "ST04-017": { activateMain: { cost: { restSelf: true }, leaderTypeRequired: "Animal Kingdom Pirates",
      ops: [ { op: "addDon", count: 1, rested: true } ] } },
  // ---- ST-05 (Purple / FILM) ----
  "ST05-001": { activateMain: { oncePerTurn: true, cost: { returnDon: 3 }, ops: [
      { op: "powerMod", amount: 2000, duration: "turn",
        target: { owner: "self", zone: "chars", hasType: "FILM", all: true } } ] } },
  "ST05-002": { onPlay: { ops: [ { op: "addDon", count: 1, rested: true } ] } },
  "ST05-003": { keywords: ["Blocker"] },
  "ST05-004": { keywords: ["Blocker"], onBlock: { cost: { returnDon: 1 }, ops: [
      { op: "restTarget", upTo: true, target: { owner: "opp", zone: "chars", activeOnly: true, maxCost: 5, count: 1 } } ] } },
  "ST05-005": { partial: "trash-cost is type-agnostic (FILM filter on cost pending typed-cost support)",
    activateMain: { oncePerTurn: true, cost: { restSelf: true, trashFromHand: 1 }, ops: [
      { op: "addDon", count: 2, rested: true, if: { oppMoreDon: true } } ] } },
  "ST05-006": { whenAttacking: { cost: { returnDon: 2 }, ops: [ { op: "draw", count: 2 } ] } },
  "ST05-008": { koImmuneBattleIf: { minOwnDonField: 8 } },
  "ST05-009": { trigger: { ops: [ { op: "playSelf" } ] } },
  "ST05-010": { auras: [ { powerPlus: 3000, vsAttribute: "Strike" } ],
    activateMain: { oncePerTurn: true, cost: { returnDon: 1 }, ops: [
      { op: "powerMod", amount: 2000, duration: "turn", target: { owner: "self", zone: "chars", count: 1 } } ] } },
  "ST05-011": { activateMain: { oncePerTurn: true, cost: { returnDon: 4 }, ops: [
      { op: "restTarget", upTo: true, target: { owner: "opp", zone: "chars", activeOnly: true, maxCost: 6, count: 2 } },
      { op: "grantKeywordTurn", keyword: "Double Attack" } ] } },
  "ST05-014": { onPlay: { ops: [
      { op: "searchTop", count: 5, match: { hasType: "FILM" }, take: { upTo: 1 }, restTo: "bottom" } ] } },
  "ST05-016": { mainEvent: { cost: { returnDon: 2 }, ops: [
      { op: "ko", upTo: true, target: { owner: "opp", zone: "chars", maxCost: 5, count: 1 } } ] },
    trigger: { ops: [ { op: "addDon", count: 1, rested: false } ] } },
  "ST05-017": { counterEvent: { ops: [
      { op: "powerMod", amount: 4000, duration: "battle", upTo: true,
        target: { owner: "self", zone: "leaderOrChar", hasType: "FILM", count: 1 } },
      { op: "grantFlag", flag: "koImmuneTurn", duration: "turn", upTo: true,
        target: { owner: "self", zone: "chars", hasType: "FILM", count: 1 } } ] },
    trigger: { ops: [ { op: "addDon", count: 1, rested: false } ] } },
};
