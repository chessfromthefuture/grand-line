# Auto-Generation Report (M8)
- Corpus run: 51 cards → 9 A-class scripts generated & applied (`src/data/auto.scripts.js`), 0 B/C/D remaining.
- Validation: every generated script exercised by tests (ST03-014 bounce asserted to BE generated), full suite 57/57, 1,000-game tri-deck stress: 0 crashes · 0 stalls · 0/100 replay divergence · 6.5s total.
- Pipeline bugs found BY this run and fixed: (1) master.js re-runs wiped prior auto scripts → merge-preserve added; (2) zero-take scry opened an illegal choice window → auto-resolve added. Both now regression-covered.
