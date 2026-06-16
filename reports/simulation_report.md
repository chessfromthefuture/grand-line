# AI Stress-Test Report (M6)
1,000 games · ST01/ST02 all pairings · seeds 1–1000 · rule-valid greedy AI both seats.

| Metric | Result |
|---|---|
| Crashes | **0** |
| Games without a winner (loops/stalls) | **0** |
| DON conservation violations | **0** |
| Board-limit violations | **0** |
| Replay divergence (100-game bit-exact re-simulation sample) | **0/100** |
| Avg actions/game | 130 |
| Max turns observed | 31 |
| Speed | 7.2 ms/game (≈139 games/sec, single thread) |

Engine throughput supports server-side authoritative play and MCTS-class AI search budgets.
