# Automation Scoreboard (M9)
Corpus: 85 cards / 5 sets, 100% supported. Tests 57/57. Stress 1,000 games × 5 decks: 0 crashes · 0 anomalies · 0/100 replay divergence.

## Clause performance (measured usage across corpus)
| Clause | Introduced | Cards generated/expressed | Sets |
|---|---|---|---|
| bounce(cost≤N) | M8 | 6 | ST03 (5×), ST03 leader |
| counter +N power (+riders) | M1/M5 | 8 | all 5 |
| ko(filters) | M1→M8 | 8 | ST01-05 |
| draw / draw+trash / cond-draw | M3→M8 | 8 | ST03-05 |
| addDon(rested/active) | **M9** | **8** | ST04 (5×), ST05 (3×) |
| effect-cost DON−N plumbing | **M9** | **12** | ST04 (7×), ST05 (5×) |
| searchTop / scry | M2→M8 | 4 | ST01,02,03,05 |
| trigger=main/counter copy | M5/M8 | 4 | ST01,03,04,05 |
| keywords (Blocker/Rush/DA/Banish) | M1/M3 | 14 | all |
| setActive / restTarget family | M2 | 7 | ST02,05 |
| playSelf trigger | M1 | 5 | ST01-05 |

## M9 batch economics (ST-04+ST-05, 34 cards)
Pattern ranking before implementation: DON−N cost 12× → addDon 8× → KO-immunity riders 3× → team-buff 2× → named-play 1×.
Implemented in that order. Engine additions: payEffectCost (timing-level optional costs), addDon, trashOppLife, playFromHand, grantKeywordTurn, all-targets, koImmuneTurn/koImmuneBattleIf, vsAttribute battle auras, oppMoreDon condition.

## Manual-card justification (current corpus)
| Card | Why not auto | Nearest clause | Promotion candidate |
|---|---|---|---|
| ST05-005 Carina | typed trash-cost + comparative-DON condition | trashFromHand cost | Y (typed costs recur in OP02+) — flagged partial |
| ST04-001 Kaido L | life-trash op (1st occurrence) | trashOppLife now exists | Y once 3+ occurrences |
| ST05-008/010/017 | new aura/immunity primitives (1st occurrence) | now exist as constructs | auto-expressible from next occurrence |
