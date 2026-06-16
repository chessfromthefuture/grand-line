# Effect Pattern Frequency Report (M6)
Corpus: 155 cards with exact text (ST01 17, ST02 17, OP-01 121). Parameterized normalization (numbers→N, quoted types→T).

## Top parameterized patterns (measured occurrences)
| # | Pattern (normalized) | Count | Clause | Status |
|---|---|---|---|---|
| 1 | [On Play] <effect> | 40 | timing | ✅ |
| 2 | [DON!! xN] gate | 41 | requiresDon | ✅ |
| 3 | [When Attacking] <effect> | 27 | timing | ✅ |
| 4 | discard/play "from your hand" family | 21 | costs + ops | ✅ |
| 5 | [Blocker] | 21 | keyword | ✅ |
| 6 | [Once Per Turn] | 18 | flag | ✅ |
| 7 | [Trigger] <clause> | 17 | timing | ✅ |
| 8 | [Counter] +N power this battle (+conditional rider) | 15 | counterEvent (+op.if) | ✅ |
| 9 | "as active" re-stand family | 13 | setActive/setActiveSource/setDonActive | ✅ |
| 10 | Look at N (search/scry, typed reveal) | 12 | searchTop | ✅ |
| 11 | KO(target(cost≤N \| power≤N \| rested \| Blocker)) | 11 | ko | ✅ |
| 12 | [Your Turn]/[Opp's Turn] auras | 12 | aura conds | ✅ |
| 13 | power debuff -N this turn | 7 | powerMod | ✅ |
| 14 | Rush | 9 | keyword | ✅ |
| 15 | draw N | 9 | draw | ✅ |
| 16 | On K.O. | 7 | onKO | ✅ |
| 17 | Rest up to N (chars/DON, cost-filtered) | 7 | restTarget/restOppDon | ✅ |
| 18 | On Block | 5 | onBlock | ✅ |
| 19 | Banish / Double Attack | 7 | keywords | ✅ |
| 20 | trash→hand recovery (typed, cost≤N) | 3 | trashToHand | ✅ |

Generator clause count: **26** (12 → 26 this milestone). Top-500 listing across all sets requires full ingestion; `generate.js` emits the ranked `patternFrequency` table automatically per batch — the format above is produced continuously, not a one-off.
