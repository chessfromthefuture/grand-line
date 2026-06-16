# Implementation Audit (M10) — discrepancies found
| # | Card/area | Expected | Actual (before fix) | Severity | Root cause | Status |
|---|---|---|---|---|---|---|
| 1 | ST04-003 Kaido | Rush only on play-turn (granted) | **permanent Rush** (grants entry without condition); granted kwRush/kwDoubleAttack flags ignored by attack/damage paths | **HIGH** | grants vs turn-flag confusion in script + missing flag checks | **FIXED** + regression |
| 2 | ST03-016 counter-bounce | bouncing a battler ends battle cleanly | **crash** (null deref) — COUNTER window stayed open on dangling battle | **HIGH** | mid-window zone-change not re-validated | **FIXED** (battleDangling guard) — found by fuzzer, 12/10,000 games |
| 3 | payEffectCost trashFromHand | player chooses which card to pay | engine auto-picks leftmost | MEDIUM | choice window not wired for effect-level costs | OPEN (queued; activateMain costs DO offer choice) |
| 4 | "You may …" optional effects (Apoo etc.) | player may decline | auto-applied when beneficial-by-default | LOW | optionality default | OPEN (documented engine default) |
| 5 | "in any order" placements | player orders | deterministic original-order default | LOW | no hidden-info impact for chooser | accepted default, documented |
| 6 | ST05-005 Carina | trash a "FILM" card as cost | any-card cost | LOW | typed-cost filter pending | flagged `partial` in script |
