// AUTO-GENERATED A-class scripts (scripts/generate.js --write). Review B/C/D in reports/effect_candidates.json.
export const AUTO_SCRIPTS = {
 "OP01-006": {
  "onPlay": {
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-007": {
  "onKO": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxPower": 4000,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-009": {
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP01-016": {
  "onPlay": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "match": {
      "hasType": "Straw Hat Crew"
     },
     "take": {
      "upTo": 1
     },
     "restTo": "bottom"
    }
   ]
  },
  "generated": true
 },
 "OP01-017": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxPower": 3000,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-022": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 2
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-025": {
  "keywords": [
   "Rush"
  ],
  "generated": true
 },
 "OP01-027": {
  "mainEvent": {
   "ops": [
    {
     "op": "powerMod",
     "amount": -10000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-028": {
  "counterEvent": {
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-029": {
  "counterEvent": {
   "ops": [
    {
     "op": "powerMod",
     "amount": 2000,
     "duration": "battle",
     "upTo": true,
     "target": {
      "owner": "self",
      "zone": "leaderOrChar",
      "count": 1
     }
    },
    {
     "op": "powerMod",
     "amount": 2000,
     "duration": "battle",
     "if": {
      "maxOwnLife": 2
     },
     "upTo": true,
     "target": {
      "owner": "self",
      "zone": "leaderOrChar",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-030": {
  "mainEvent": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "match": {
      "hasType": "Straw Hat Crew"
     },
     "take": {
      "upTo": 1
     },
     "restTo": "bottom"
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "match": {
      "hasType": "Straw Hat Crew"
     },
     "take": {
      "upTo": 1
     },
     "restTo": "bottom"
    }
   ]
  },
  "generated": true
 },
 "OP01-033": {
  "onPlay": {
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-034": {
  "whenAttacking": {
   "requiresDon": 2,
   "ops": [
    {
     "op": "setDonActive",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP01-035": {
  "whenAttacking": {
   "requiresDon": 1,
   "oncePerTurn": true,
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 5,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-037": {
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP01-048": {
  "onPlay": {
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 3,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-054": {
  "onPlay": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "restedOnly": true,
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-056": {
  "mainEvent": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "restedOnly": true,
      "maxCost": 5,
      "count": 2
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-073": {
  "keywords": [
   "Blocker"
  ],
  "onPlay": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "take": {
      "upTo": 0
     },
     "restTo": "top"
    }
   ]
  },
  "generated": true
 },
 "OP01-077": {
  "onPlay": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "take": {
      "upTo": 0
     },
     "restTo": "top"
    }
   ]
  },
  "generated": true
 },
 "OP01-082": {
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP01-090": {
  "mainEvent": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "match": {
      "hasType": "Baroque Works"
     },
     "take": {
      "upTo": 1
     },
     "restTo": "bottom"
    }
   ]
  },
  "generated": true
 },
 "OP01-100": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP01-104": {
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP01-108": {
  "onKO": {
   "cost": {
    "returnDon": 1
   },
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxCost": 5,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP01-117": {
  "mainEvent": {
   "cost": {
    "returnDon": 1
   },
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 6,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-011": {
  "onPlay": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxPower": 3000,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-012": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP02-017": {
  "whenAttacking": {
   "requiresDon": 2,
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxPower": 2000,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-029": {
  "endOfYourTurn": {
   "ops": [
    {
     "op": "setDonActive",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP02-034": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 2,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-038": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP02-047": {
  "mainEvent": {
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "restedOnly": true,
      "maxCost": 3,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-067": {
  "mainEvent": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-076": {
  "onPlay": {
   "cost": {
    "returnDon": 1
   },
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxCost": 1,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-079": {
  "onPlay": {
   "cost": {
    "returnDon": 1
   },
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP02-081": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP02-104": {
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP02-108": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP02-119": {
  "mainEvent": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxCost": 1,
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "draw",
     "count": 2
    },
    {
     "op": "discardFromHand",
     "owner": "self",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP03-010": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP03-011": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP03-015": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP03-029": {
  "onPlay": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "restedOnly": true,
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP03-031": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP03-034": {
  "onPlay": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "restedOnly": true,
      "maxCost": 2,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP03-038": {
  "mainEvent": {
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 2,
      "count": 2
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 5,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP03-044": {
  "onPlay": {
   "ops": [
    {
     "op": "draw",
     "count": 2
    },
    {
     "op": "discardFromHand",
     "owner": "self",
     "count": 2
    }
   ]
  },
  "generated": true
 },
 "OP03-056": {
  "mainEvent": {
   "ops": [
    {
     "op": "draw",
     "count": 2
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "draw",
     "count": 2
    }
   ]
  },
  "generated": true
 },
 "OP03-060": {
  "whenAttacking": {
   "cost": {
    "returnDon": 1
   },
   "ops": [
    {
     "op": "draw",
     "count": 2
    },
    {
     "op": "discardFromHand",
     "owner": "self",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP03-065": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP03-071": {
  "whenAttacking": {
   "cost": {
    "returnDon": 1
   },
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 5,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP03-107": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP03-116": {
  "onPlay": {
   "ops": [
    {
     "op": "draw",
     "count": 3
    },
    {
     "op": "discardFromHand",
     "owner": "self",
     "count": 2
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "OP04-013": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxPower": 4000,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP04-015": {
  "onPlay": {
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP04-019": {
  "endOfYourTurn": {
   "ops": [
    {
     "op": "setDonActive",
     "count": 2
    }
   ]
  },
  "generated": true
 },
 "OP04-029": {
  "endOfYourTurn": {
   "ops": [
    {
     "op": "setDonActive",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP04-045": {
  "onPlay": {
   "ops": [
    {
     "op": "draw",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP04-049": {
  "onKO": {
   "ops": [
    {
     "op": "draw",
     "count": 1
    }
   ]
  },
  "generated": true
 },
 "OP04-089": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP05-010": {
  "onPlay": {
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "maxPower": 1000,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP05-013": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP05-014": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "powerMod",
     "amount": -2000,
     "duration": "turn",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP05-023": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "ko",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "restedOnly": true,
      "maxCost": 3,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP05-036": {
  "keywords": [
   "Blocker"
  ],
  "onBlock": {
   "ops": [
    {
     "op": "restTarget",
     "upTo": true,
     "target": {
      "owner": "opp",
      "zone": "chars",
      "activeOnly": true,
      "maxCost": 4,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "OP05-052": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "OP05-055": {
  "keywords": [
   "Blocker"
  ],
  "onPlay": {
   "ops": [
    {
     "op": "searchTop",
     "count": 5,
     "take": {
      "upTo": 0
     },
     "restTo": "top"
    }
   ]
  },
  "generated": true
 },
 "OP05-113": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "ST03-005": {
  "whenAttacking": {
   "requiresDon": 1,
   "ops": [
    {
     "op": "draw",
     "count": 2
    },
    {
     "op": "discardFromHand",
     "owner": "self",
     "count": 2
    }
   ]
  },
  "generated": true
 },
 "ST03-008": {
  "keywords": [
   "Blocker"
  ],
  "generated": true
 },
 "ST03-009": {
  "onPlay": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 7,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "ST03-010": {
  "onPlay": {
   "ops": [
    {
     "op": "searchTop",
     "count": 3,
     "take": {
      "upTo": 0
     },
     "restTo": "top"
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "ST03-013": {
  "keywords": [
   "Blocker"
  ],
  "trigger": {
   "ops": [
    {
     "op": "playSelf"
    }
   ]
  },
  "generated": true
 },
 "ST03-014": {
  "onPlay": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 3,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "ST03-015": {
  "mainEvent": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 7,
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 7,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "ST03-016": {
  "counterEvent": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 3,
      "count": 1
     }
    }
   ]
  },
  "trigger": {
   "ops": [
    {
     "op": "returnToHand",
     "upTo": true,
     "target": {
      "owner": "any",
      "zone": "chars",
      "maxCost": 3,
      "count": 1
     }
    }
   ]
  },
  "generated": true
 },
 "ST03-017": {
  "counterEvent": {
   "ops": [
    {
     "op": "powerMod",
     "amount": 4000,
     "duration": "battle",
     "upTo": true,
     "target": {
      "owner": "self",
      "zone": "leaderOrChar",
      "count": 1
     }
    },
    {
     "op": "draw",
     "count": 1,
     "if": {
      "maxOwnHand": 3
     }
    }
   ]
  },
  "generated": true
 }
};
