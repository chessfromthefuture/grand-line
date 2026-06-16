# Fuzz Report (M10)
Method: uniform-random LEGAL actions (seeded), all 5 decks cross-paired, invariants checked after EVERY action: DON conservation (=10), card conservation (=50/player incl. window-limbo), board ≤5, non-negative pools.

Run 1 (10,000 games, 876k actions): **12 crashes** (all one root cause — audit #2), 7,372 false-positive conservation flags (instrumentation: TRIGGER-window limbo card — fixed in checker), 0 softlocks.
Run 2 after fixes (4,000 games, 624k actions): **0 crashes · 0 softlocks · 0 invariant violations · 0 replay divergence**. Max game length 417 actions.
Verdict: the random agent found a real bug the greedy AI never hit in 3,000+ games — random-walk coverage is now a permanent CI gate (`node scripts/fuzz.js`).
