# Confidence Gaps (M10)
- Ops never exercised by any REAL card yet (unit-tested via fixtures only): playFromTrash, costMod, lifeToHand, lifeFromDeck, schedule, custom — all built ahead of OP01+ demand. Risk: medium until first real card lands on each.
- Effect-cost choice windows (audit #3) — queued engine item.
- Generated scripts verified by: classifier ground-truth agreement (18/18), runtime fuzz execution (9/9), but NOT yet by per-card scenario assertions — scenario matrix is the next validation layer.
- Scenario coverage: 61 unit/scenario tests + 624k fuzz actions ≠ exhaustive timing-window pairs; highest-risk untested pair: REPLACE × ORDER simultaneity (no real card combination yet exists in corpus).
