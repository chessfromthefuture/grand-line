# Promotion vs Manual — crossover analysis (M9)
Measured rule from 3 processed batches (ST03 solo; ST04+05 batch):
- Clause promotion cost ≈ 10–20 min (regex + test) → pays off at **≥3 occurrences** in the live corpus.
- Engine primitive cost ≈ 30–60 min → pays off at **≥5 occurrences** (DON−N: 12× in one batch → instant ROI).
- Manual scripting cost ≈ 5 min/card → correct choice for true singletons (e.g. Kaido leader's life-trash, FIRST occurrence).
**Crossover: 3 occurrences.** Below 3 → manual + log to frequency table; at 3+ → promote (auto-flagged in generate.js patternFrequency output).
Current corpus has 0 unsupported cards; the queue refills with each acquisition batch and the same rule applies.
